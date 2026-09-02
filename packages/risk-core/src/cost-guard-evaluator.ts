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
  RateLimitTier,
  RedisFailurePolicy,
  RouteCostPolicy,
  CostGuardAction,
  CostGuardReasonCode,
  PolicyIdentity,
  RequestInspection,
  BudgetConsumeRequest
} from './budget-types.js';
import { CostPolicyRegistry } from './policy-registry.js';
import { RequestShapeGuard } from './budget-guards.js';
import { LocalEmergencyBudgetStore, computeEmergencyCapacity } from './local-emergency-budget.js';

export interface CostGuardOptions {
  policyRegistry?: CostPolicyRegistry;
  budgetStore?: BudgetStore;
  emergencyStore?: LocalEmergencyBudgetStore;
  threatStore?: ThreatAggregateStore;
  enforceByDefault?: boolean;
  failurePolicy?: RedisFailurePolicy;
}

export interface CostGuardInspection {
  policy: RouteCostPolicy;
  policyIdentity: PolicyIdentity;
  requestedCost: number;
  recommendedAction: CostGuardAction;
  requestInspection: RequestInspection;
  consumeRequest: BudgetConsumeRequest;
  isShadow: boolean;
  violationDetected: boolean;
  reasonCode: CostGuardReasonCode;
  message?: string;
}

export class SentinelCostGuardEvaluator {
  private readonly registry: CostPolicyRegistry;
  private readonly budgetStore: BudgetStore;
  private readonly emergencyStore: LocalEmergencyBudgetStore;
  private readonly threatStore?: ThreatAggregateStore;
  private readonly enforceByDefault: boolean;
  private readonly failurePolicy: RedisFailurePolicy;

  constructor(options: CostGuardOptions = {}) {
    this.registry = options.policyRegistry || new CostPolicyRegistry();
    this.budgetStore = options.budgetStore || new LocalEmergencyBudgetStore();
    this.emergencyStore = options.emergencyStore || new LocalEmergencyBudgetStore(50, 1.0);
    this.threatStore = options.threatStore;
    this.enforceByDefault = options.enforceByDefault ?? false;
    this.failurePolicy = options.failurePolicy || { mode: 'local-emergency', emergencyRatio: 1.0, expectedReplicaCount: 1 };
  }

  public inspectCostRequest(context: RequestCostContext): CostGuardInspection {
    const policy = this.registry.getRoutePolicy(context.method, context.path);
    const policyIdentity: PolicyIdentity = {
      checksumSha256: this.registry.checksum,
      displayChecksum: this.registry.displayChecksum
    };
    const isShadow = !this.enforceByDefault ? (policy.shadow_mode ?? true) : false;

    // 0. Request Path Inspection
    const pathInspection = RequestShapeGuard.inspectPath(context.path);
    if (!pathInspection.acceptedByInspector) {
      return {
        policy,
        policyIdentity,
        requestedCost: policy.cost,
        recommendedAction: 'DENY',
        requestInspection: pathInspection,
        consumeRequest: { cost: policy.cost, routeKey: `${context.method.toUpperCase()}:${policy.path}`, policy },
        isShadow,
        violationDetected: true,
        reasonCode: 'REQUEST_SHAPE_EXCEEDED',
        message: pathInspection.findings[0]?.code
      };
    }

    // 1. Auth Inspection
    const principal = context.principal;
    const isAuthenticated = principal?.authenticated === true;
    if (policy.authentication === 'required' && !isAuthenticated) {
      return {
        policy,
        policyIdentity,
        requestedCost: policy.cost,
        recommendedAction: 'REQUIRE_AUTH',
        requestInspection: pathInspection,
        consumeRequest: { cost: policy.cost, routeKey: `${context.method.toUpperCase()}:${policy.path}`, policy },
        isShadow,
        violationDetected: true,
        reasonCode: 'AUTH_REQUIRED',
        message: 'Authentication credentials required and must be verified by upstream auth layer.'
      };
    }

    // 2. Page Size Inspection
    if (context.pageSize !== undefined) {
      const maxPage = policy.page_size_max ?? this.registry.config.defaults?.page_size_max ?? 1000;
      const pageValidation = RequestShapeGuard.validatePageSize(context.pageSize, maxPage);
      if (!pageValidation.valid) {
        return {
          policy,
          policyIdentity,
          requestedCost: policy.cost,
          recommendedAction: 'DENY',
          requestInspection: {
            acceptedByInspector: false,
            findings: [{ code: 'REQUEST_SHAPE_EXCEEDED', severity: 'high', message: pageValidation.message || 'Page size exceeded' }],
            normalizedValues: { pageSize: context.pageSize }
          },
          consumeRequest: { cost: policy.cost, routeKey: `${context.method.toUpperCase()}:${policy.path}`, policy },
          isShadow,
          violationDetected: true,
          reasonCode: 'REQUEST_SHAPE_EXCEEDED',
          message: pageValidation.message
        };
      }
    }

    // 3. Calculation Data Points Inspection
    if (context.seriesCount !== undefined || context.timeBuckets !== undefined) {
      const maxPoints = policy.max_data_points ?? this.registry.config.defaults?.max_data_points ?? 50000;
      const pointValidation = RequestShapeGuard.validateDataPointBudget(
        context.seriesCount,
        context.timeBuckets,
        maxPoints
      );
      if (!pointValidation.valid) {
        return {
          policy,
          policyIdentity,
          requestedCost: policy.cost,
          recommendedAction: 'DENY',
          requestInspection: {
            acceptedByInspector: false,
            findings: [{ code: 'REQUEST_SHAPE_EXCEEDED', severity: 'high', message: pointValidation.message || 'Data point budget exceeded' }],
            normalizedValues: { seriesCount: context.seriesCount, timeBuckets: context.timeBuckets }
          },
          consumeRequest: { cost: policy.cost, routeKey: `${context.method.toUpperCase()}:${policy.path}`, policy },
          isShadow,
          violationDetected: true,
          reasonCode: 'REQUEST_SHAPE_EXCEEDED',
          message: pointValidation.message
        };
      }
    }

    // 4. Body Payload Size Inspection
    if (context.bodyBytes !== undefined) {
      const maxBody = policy.max_request_body_bytes ?? this.registry.config.defaults?.max_request_body_bytes ?? 1048576;
      const bodyValidation = RequestShapeGuard.validateBodySize(context.bodyBytes, maxBody);
      if (!bodyValidation.valid) {
        return {
          policy,
          policyIdentity,
          requestedCost: policy.cost,
          recommendedAction: 'DENY',
          requestInspection: {
            acceptedByInspector: false,
            findings: [{ code: 'REQUEST_SHAPE_EXCEEDED', severity: 'high', message: bodyValidation.message || 'Body size exceeded' }],
            normalizedValues: { bodyBytes: context.bodyBytes }
          },
          consumeRequest: { cost: policy.cost, routeKey: `${context.method.toUpperCase()}:${policy.path}`, policy },
          isShadow,
          violationDetected: true,
          reasonCode: 'REQUEST_SHAPE_EXCEEDED',
          message: bodyValidation.message
        };
      }
    }

    const { name: tierName, tier: selectedTier } = this.resolveTier(context);
    const routeKey = `${context.method.toUpperCase()}:${policy.path}`;
    const consumeRequest: BudgetConsumeRequest = {
      cost: policy.cost,
      routeKey,
      tenantId: isAuthenticated ? principal?.tenantId : undefined,
      accountId: isAuthenticated ? principal?.accountId : undefined,
      apiKeyId: isAuthenticated ? principal?.apiKeyId : undefined,
      sessionId: context.sessionId,
      networkKey: context.pseudonymousKey,
      tier: { ...selectedTier, name: tierName },
      emergencyCapacity: selectedTier.emergency_local_capacity,
      policy
    };

    return {
      policy,
      policyIdentity,
      requestedCost: policy.cost,
      recommendedAction: 'ALLOW',
      requestInspection: pathInspection,
      consumeRequest,
      isShadow,
      violationDetected: false,
      reasonCode: 'WITHIN_BUDGET'
    };
  }

  private resolveTier(context: RequestCostContext): { name: string; tier: RateLimitTier } {
    const tiers = this.registry.config.rate_limit_tiers || {};
    const principal = context.principal;

    if (principal?.authenticated && principal.tier && tiers[principal.tier]) {
      return { name: principal.tier, tier: tiers[principal.tier] };
    }
    if (principal?.authenticated && tiers.authenticated_key) {
      return { name: 'authenticated_key', tier: tiers.authenticated_key };
    }
    if (principal?.authenticated) {
      return {
        name: 'authenticated_key',
        tier: { capacity: 2000, refill_tokens_per_minute: 2000, emergency_local_capacity: 200 }
      };
    }
    if (context.sessionId && tiers.session) {
      return { name: 'session', tier: tiers.session };
    }
    if (context.sessionId) {
      return {
        name: 'session',
        tier: { capacity: 300, refill_tokens_per_minute: 300, emergency_local_capacity: 50 }
      };
    }
    if (tiers.anonymous_network) {
      return { name: 'anonymous_network', tier: tiers.anonymous_network };
    }
    return {
      name: 'anonymous_network',
      tier: { capacity: 100, refill_tokens_per_minute: 100, emergency_local_capacity: 30 }
    };
  }

  public async evaluate(context: RequestCostContext): Promise<CostGuardDecision> {
    const inspection = this.inspectCostRequest(context);
    const { policy, policyIdentity, isShadow } = inspection;
    const policyVersion = this.registry.config.policy_version;
    const policyChecksum = policyIdentity.checksumSha256;
    const displayChecksum = policyIdentity.displayChecksum;

    if (inspection.violationDetected) {
      return {
        allowed: isShadow,
        action: isShadow ? 'OBSERVE' : inspection.recommendedAction,
        proposedAction: inspection.recommendedAction,
        enforcedAction: isShadow ? 'ALLOW' : inspection.recommendedAction,
        violationDetected: true,
        reasonCode: inspection.reasonCode,
        policyVersion,
        policyChecksum,
        displayChecksum,
        cost: policy.cost,
        degraded: false,
        enforced: !isShadow,
        message: inspection.message
      };
    }

    const routeKey = inspection.consumeRequest.routeKey;

    try {
      const consumeRes = await this.budgetStore.consume(inspection.consumeRequest);

      const isAllowed = 'status' in consumeRes
        ? (consumeRes.status === 'consumed' || consumeRes.allowed === true)
        : consumeRes.allowed;
      const remainingCost = 'remainingCost' in consumeRes ? consumeRes.remainingCost : 0;
      const retryAfter = 'retryAfterSeconds' in consumeRes ? consumeRes.retryAfterSeconds : 0;
      const isDegraded = 'degraded' in consumeRes ? consumeRes.degraded : false;

      if (!isAllowed) {
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
            remainingCost,
            retryAfterSeconds: retryAfter
          },
          degraded: isDegraded,
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
          remainingCost,
          retryAfterSeconds: 0
        },
        degraded: isDegraded,
        enforced: !isShadow
      };
    } catch (err: unknown) {
      // Redis or Primary Store Failure Handling
      const errMessage = err instanceof Error ? err.message : String(err);
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(`[ameva-sentinel] Distributed budget store unavailable: ${errMessage}. Applying failure policy: ${this.failurePolicy.mode}`);
      }
      const failureMode = this.failurePolicy.mode;

      if (policy.failure_mode === 'deny' || failureMode === 'fail-closed') {
        return {
          allowed: isShadow,
          action: isShadow ? 'OBSERVE' : 'DENY',
          proposedAction: 'DENY',
          enforcedAction: isShadow ? 'ALLOW' : 'DENY',
          violationDetected: true,
          reasonCode: 'FAIL_CLOSED',
          policyVersion,
          policyChecksum,
          displayChecksum,
          cost: policy.cost,
          degraded: true,
          enforced: !isShadow,
          message: 'Distributed budget store unavailable (failure_mode=fail-closed).'
        };
      }

      if (policy.failure_mode === 'allow' || failureMode === 'fail-open') {
        return {
          allowed: true,
          action: 'ALLOW',
          proposedAction: 'ALLOW',
          enforcedAction: 'ALLOW',
          violationDetected: false,
          reasonCode: 'FAIL_OPEN',
          policyVersion,
          policyChecksum,
          displayChecksum,
          cost: policy.cost,
          degraded: true,
          enforced: !isShadow,
          message: 'Distributed budget store unavailable (failure_mode=fail-open).'
        };
      }

      // Default: 'local-emergency' with bounded replicas
      const baseCap = inspection.consumeRequest.tier?.emergency_local_capacity ?? inspection.consumeRequest.tier?.capacity ?? 100;
      const boundedEmergencyCap = computeEmergencyCapacity(
        baseCap,
        this.failurePolicy.emergencyRatio ?? 0.5,
        this.failurePolicy.expectedReplicaCount ?? 1
      );

      const boundedRequest = {
        ...inspection.consumeRequest,
        emergencyCapacity: boundedEmergencyCap
      };

      const emRes = await this.emergencyStore.consume(boundedRequest);
      const emAllowed = 'status' in emRes ? (emRes.status === 'consumed' || emRes.allowed === true) : emRes.allowed;
      const emRemaining = emRes.remainingCost;
      const emRetryAfter = 'retryAfterSeconds' in emRes ? emRes.retryAfterSeconds : 0;

      if (!emAllowed) {
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
            remainingCost: emRemaining,
            retryAfterSeconds: emRetryAfter
          },
          degraded: true,
          enforced: !isShadow,
          message: `Emergency local capacity (${boundedEmergencyCap}) exceeded for route '${routeKey}'.`
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
          remainingCost: emRemaining,
          retryAfterSeconds: 0
        },
        degraded: true,
        enforced: !isShadow,
        message: 'Distributed budget store unavailable; operating under bounded emergency local cap.'
      };
    }
  }
}
