/**
 * @file cost-guard-evaluator.ts
 * Pure Core Orchestrator evaluating Policy Bounds, Request Shape, and Distributed Budgets.
 * Implements strict Shadow semantics, emergency fallback caps, and verified principal handling.
 */

import {
  RequestCostContext,
  CostGuardDecision,
  BudgetStore,
  ThreatAggregateStore,
  RateLimitTier
} from './budget-types.js';
import { CostPolicyRegistry } from './policy-registry.js';
import { RequestShapeGuard } from './budget-guards.js';
import { LocalEmergencyBudgetStore } from './local-emergency-budget.js';

export class SentinelCostGuardEvaluator {
  private readonly registry: CostPolicyRegistry;
  private readonly budgetStore: BudgetStore;
  private readonly emergencyStore: LocalEmergencyBudgetStore;
  private readonly threatStore?: ThreatAggregateStore;
  private readonly enforceByDefault: boolean;

  constructor(options: {
    policyRegistry?: CostPolicyRegistry;
    budgetStore?: BudgetStore;
    emergencyStore?: LocalEmergencyBudgetStore;
    threatStore?: ThreatAggregateStore;
    enforceByDefault?: boolean;
  } = {}) {
    this.registry = options.policyRegistry || new CostPolicyRegistry();
    this.budgetStore = options.budgetStore || new LocalEmergencyBudgetStore();
    this.emergencyStore = options.emergencyStore || new LocalEmergencyBudgetStore(50, 1.0);
    this.threatStore = options.threatStore;
    this.enforceByDefault = options.enforceByDefault ?? false;
  }

  private resolveTier(context: RequestCostContext): { name: string; tier: RateLimitTier } {
    const tiers = this.registry.config.rate_limit_tiers || {};
    const principal = context.principal;
    if (principal?.authenticated && principal.tier && tiers[principal.tier]) {
      return { name: principal.tier, tier: tiers[principal.tier] };
    }
    if (principal?.authenticated) {
      const tier = tiers.authenticated_key || { capacity: 2000, refill_tokens_per_minute: 2000, emergency_local_capacity: 200 };
      return { name: 'authenticated_key', tier };
    }
    if (context.sessionId) {
      const tier = tiers.session || { capacity: 300, refill_tokens_per_minute: 300, emergency_local_capacity: 50 };
      return { name: 'session', tier };
    }
    const tier = tiers.anonymous_network || { capacity: 100, refill_tokens_per_minute: 100, emergency_local_capacity: 30 };
    return { name: 'anonymous_network', tier };
  }

  public async evaluate(context: RequestCostContext): Promise<CostGuardDecision> {
    const policy = this.registry.getRoutePolicy(context.method, context.path);
    const policyVersion = this.registry.config.policy_version;
    const policyChecksum = this.registry.checksum;
    const displayChecksum = this.registry.displayChecksum;
    const isShadow = this.enforceByDefault ? false : (policy.shadow_mode ?? true);
    const { name: tierName, tier: selectedTier } = this.resolveTier(context);

    // 1. Upstream-Verified Authentication Check (Strictly require principal.authenticated === true)
    const principal = context.principal;
    const isAuthenticated = principal?.authenticated === true;
    const trustedTenantId = isAuthenticated ? principal.tenantId : undefined;
    const trustedAccountId = isAuthenticated ? principal.accountId : undefined;
    const trustedApiKeyId = isAuthenticated ? principal.apiKeyId : undefined;

    if (policy.authentication === 'required' && !isAuthenticated) {
      return {
        allowed: isShadow,
        action: isShadow ? 'OBSERVE' : 'REQUIRE_AUTH',
        proposedAction: 'REQUIRE_AUTH',
        enforcedAction: isShadow ? 'ALLOW' : 'REQUIRE_AUTH',
        violationDetected: true,
        reasonCode: 'AUTH_REQUIRED',
        policyVersion,
        policyChecksum,
        displayChecksum,
        cost: policy.cost,
        degraded: false,
        enforced: !isShadow,
        message: 'Authentication credentials required and must be verified by upstream auth layer.'
      };
    }

    // 2. Request Shape Guard (Page Size)
    if (context.pageSize !== undefined) {
      const pageValidation = RequestShapeGuard.validatePageSize(context.pageSize, policy);
      if (!pageValidation.valid) {
        return {
          allowed: isShadow,
          action: isShadow ? 'OBSERVE' : 'DENY',
          proposedAction: 'DENY',
          enforcedAction: isShadow ? 'ALLOW' : 'DENY',
          violationDetected: true,
          reasonCode: 'REQUEST_SHAPE_EXCEEDED',
          policyVersion,
          policyChecksum,
          displayChecksum,
          cost: policy.cost,
          degraded: false,
          enforced: !isShadow,
          message: pageValidation.message
        };
      }
    }

    // 3. Request Shape Guard (Calculation Data Points)
    if (context.seriesCount !== undefined || context.timeBuckets !== undefined) {
      const pointValidation = RequestShapeGuard.validateDataPointBudget(
        context.seriesCount,
        context.timeBuckets,
        policy
      );
      if (!pointValidation.valid) {
        return {
          allowed: isShadow,
          action: isShadow ? 'OBSERVE' : 'DENY',
          proposedAction: 'DENY',
          enforcedAction: isShadow ? 'ALLOW' : 'DENY',
          violationDetected: true,
          reasonCode: 'REQUEST_SHAPE_EXCEEDED',
          policyVersion,
          policyChecksum,
          displayChecksum,
          cost: policy.cost,
          degraded: false,
          enforced: !isShadow,
          message: pointValidation.message
        };
      }
    }

    // 4. Request Shape Guard (Body Payload Bytes)
    if (context.bodyBytes !== undefined) {
      const maxBody = policy.max_request_body_bytes || 1048576;
      const bodyValidation = RequestShapeGuard.validateBodySize(context.bodyBytes, maxBody);
      if (!bodyValidation.valid) {
        return {
          allowed: isShadow,
          action: isShadow ? 'OBSERVE' : 'DENY',
          proposedAction: 'DENY',
          enforcedAction: isShadow ? 'ALLOW' : 'DENY',
          violationDetected: true,
          reasonCode: 'REQUEST_SHAPE_EXCEEDED',
          policyVersion,
          policyChecksum,
          displayChecksum,
          cost: policy.cost,
          degraded: false,
          enforced: !isShadow,
          message: bodyValidation.message
        };
      }
    }

    const routeKey = `${context.method.toUpperCase()}:${policy.path}`;
    const consumeRequest = {
      cost: policy.cost,
      routeKey,
      tenantId: trustedTenantId,
      accountId: trustedAccountId,
      apiKeyId: trustedApiKeyId,
      sessionId: context.sessionId,
      networkKey: context.pseudonymousKey,
      tier: { ...selectedTier, name: tierName },
      emergencyCapacity: selectedTier.emergency_local_capacity,
      policy
    };

    // 5. Distributed & Emergency Budget Consumption
    try {
      const consumeRes = await this.budgetStore.consume(consumeRequest);

      if (!consumeRes.allowed) {
        return {
          allowed: isShadow,
          action: isShadow ? 'OBSERVE' : 'RATE_LIMIT',
          proposedAction: 'RATE_LIMIT',
          enforcedAction: isShadow ? 'ALLOW' : 'RATE_LIMIT',
          violationDetected: true,
          reasonCode: 'COST_BUDGET_EXCEEDED',
          policyVersion,
          policyChecksum,
          displayChecksum,
          cost: policy.cost,
          budget: {
            requestedCost: policy.cost,
            remainingCost: consumeRes.remainingCost,
            retryAfterSeconds: consumeRes.retryAfterSeconds
          },
          degraded: consumeRes.degraded,
          enforced: !isShadow,
          message: `Cost budget exceeded for route '${routeKey}'.`
        };
      }

      return {
        allowed: true,
        action: 'ALLOW',
        proposedAction: 'ALLOW',
        enforcedAction: 'ALLOW',
        violationDetected: false,
        reasonCode: 'WITHIN_BUDGET',
        policyVersion,
        policyChecksum,
        displayChecksum,
        cost: policy.cost,
        budget: {
          requestedCost: policy.cost,
          remainingCost: consumeRes.remainingCost,
          retryAfterSeconds: 0
        },
        degraded: consumeRes.degraded,
        enforced: !isShadow
      };
    } catch {
      // Redis or Primary Store Failure Handling
      if (policy.failure_mode === 'deny') {
        return {
          allowed: isShadow,
          action: isShadow ? 'OBSERVE' : 'DENY',
          proposedAction: 'DENY',
          enforcedAction: isShadow ? 'ALLOW' : 'DENY',
          violationDetected: true,
          reasonCode: 'LIMITER_UNAVAILABLE',
          policyVersion,
          policyChecksum,
          displayChecksum,
          cost: policy.cost,
          degraded: true,
          enforced: !isShadow,
          message: 'Distributed budget store unavailable (failure_mode=deny).'
        };
      }

      if (policy.failure_mode === 'allow_with_emergency_cap') {
        // Enforce Local Emergency Bucket with Tier Emergency Capacity
        const emRes = await this.emergencyStore.consume(consumeRequest);
        if (!emRes.allowed) {
          return {
            allowed: isShadow,
            action: isShadow ? 'OBSERVE' : 'RATE_LIMIT',
            proposedAction: 'RATE_LIMIT',
            enforcedAction: isShadow ? 'ALLOW' : 'RATE_LIMIT',
            violationDetected: true,
            reasonCode: 'COST_BUDGET_EXCEEDED',
            policyVersion,
            policyChecksum,
            displayChecksum,
            cost: policy.cost,
            budget: {
              requestedCost: policy.cost,
              remainingCost: emRes.remainingCost,
              retryAfterSeconds: emRes.retryAfterSeconds
            },
            degraded: true,
            enforced: !isShadow,
            message: `Emergency local capacity (${selectedTier.emergency_local_capacity}) exceeded for route '${routeKey}'.`
          };
        }

        return {
          allowed: true,
          action: 'ALLOW',
          proposedAction: 'ALLOW',
          enforcedAction: 'ALLOW',
          violationDetected: false,
          reasonCode: 'WITHIN_BUDGET',
          policyVersion,
          policyChecksum,
          displayChecksum,
          cost: policy.cost,
          budget: {
            requestedCost: policy.cost,
            remainingCost: emRes.remainingCost,
            retryAfterSeconds: 0
          },
          degraded: true,
          enforced: !isShadow,
          message: 'Distributed budget store unavailable; operating under emergency local cap.'
        };
      }

      return {
        allowed: true,
        action: 'ALLOW',
        proposedAction: 'ALLOW',
        enforcedAction: 'ALLOW',
        violationDetected: false,
        reasonCode: 'LIMITER_UNAVAILABLE',
        policyVersion,
        policyChecksum,
        displayChecksum,
        cost: policy.cost,
        degraded: true,
        enforced: false,
        message: 'Distributed budget store unavailable; allowed under emergency fallback.'
      };
    }
  }
}
