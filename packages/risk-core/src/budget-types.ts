/**
 * @file budget-types.ts
 * Core Budget, Route Cost Policy, and Cost-Aware Rate Limiter Type Definitions.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | '*';
export type FailureMode = 'allow' | 'allow_with_emergency_cap' | 'deny';
export type AuthRequirement = 'optional' | 'required' | 'admin_only';
export type CostGuardAction = 'ALLOW' | 'OBSERVE' | 'RATE_LIMIT' | 'REQUIRE_AUTH' | 'DENY';
export type CostGuardReasonCode =
  | 'WITHIN_BUDGET'
  | 'REQUEST_SHAPE_EXCEEDED'
  | 'COST_BUDGET_EXCEEDED'
  | 'LIMITER_UNAVAILABLE'
  | 'POLICY_NOT_FOUND'
  | 'POLICY_INVALID'
  | 'AUTH_REQUIRED'
  | 'FAIL_CLOSED'
  | 'FAIL_OPEN';

export interface RouteCostPolicy {
  method: HttpMethod;
  path: string;
  cost: number;
  authentication?: AuthRequirement;
  page_size_default?: number;
  page_size_max?: number;
  query_timeout_ms?: number;
  lock_timeout_ms?: number;
  max_data_points?: number;
  max_request_body_bytes?: number;
  max_response_bytes?: number;
  failure_mode?: FailureMode;
  shadow_mode?: boolean;
}

export interface RateLimitTier {
  name?: string;
  capacity: number;
  refill_tokens_per_minute: number;
  emergency_local_capacity: number;
}

export interface CostPolicyDefaults {
  cost: number;
  authentication: AuthRequirement;
  page_size_default: number;
  page_size_max: number;
  query_timeout_ms: number;
  lock_timeout_ms: number;
  max_data_points: number;
  max_request_body_bytes: number;
  max_response_bytes: number;
  failure_mode: FailureMode;
  shadow_mode: boolean;
}

export interface CostPolicyConfig {
  schema_version: string;
  policy_version: string;
  defaults: CostPolicyDefaults;
  rate_limit_tiers?: Record<string, RateLimitTier>;
  routes?: RouteCostPolicy[];
}

export interface PolicyIdentity {
  checksumSha256: string;
  displayChecksum: string;
}

export type VerifiedPrincipal =
  | {
      authenticated: true;
      tenantId?: string;
      accountId?: string;
      apiKeyId?: string;
      role?: string;
      tier?: string;
      authenticatedTier?: string;
      riskClass?: string;
    }
  | {
      authenticated: false;
      tenantId?: undefined;
      accountId?: undefined;
      apiKeyId?: undefined;
      role?: undefined;
      tier?: undefined;
      authenticatedTier?: undefined;
      riskClass?: string;
    };


export interface RequestCostContext {
  method: string;
  path: string;
  bodyBytes?: number;
  pageSize?: number;
  seriesCount?: number;
  timeBuckets?: number;
  principal?: VerifiedPrincipal;
  sessionId?: string;
  pseudonymousKey?: string;
  asn?: number;
  tenantId?: string; // Raw/unverified request header/query context
}

export interface CostGuardDecision {
  allowed: boolean;
  action: CostGuardAction;
  proposedAction: CostGuardAction;
  enforcedAction: CostGuardAction;
  violationDetected: boolean;
  reasonCode: CostGuardReasonCode;
  policyVersion: string;
  policyChecksum: string;
  displayChecksum: string;
  cost: number;
  budget?: {
    requestedCost: number;
    remainingCost: number;
    retryAfterSeconds: number;
  };
  degraded?: boolean;
  enforced?: boolean;
  message?: string;
}

export const BUDGET_SCOPES = [
  'global',
  'route',
  'tenant',
  'account',
  'authKey',
  'session',
  'network',
] as const;

export type BudgetScope = typeof BUDGET_SCOPES[number];

export const LEGACY_DEFAULT_BUDGET_SCOPES = [
  'route',
  'tenant',
  'account',
  'authKey',
  'session',
  'network',
] as const;

export type LegacyBudgetScope = typeof LEGACY_DEFAULT_BUDGET_SCOPES[number];

export interface ScopeBudgetConfig {
  capacity: number;
  refillRatePerSec: number;
}

export interface BudgetConsumeRequest {
  cost: number;
  routeKey: string;
  requestId?: string;
  idempotencyTtlSeconds?: number;
  globalKey?: string;
  tenantId?: string;
  accountId?: string;
  apiKeyId?: string;
  sessionId?: string;
  networkKey?: string;
  tier?: RateLimitTier;
  emergencyCapacity?: number;
  policy?: RouteCostPolicy;
  scopeBudgets?: {
    global?: ScopeBudgetConfig;
    route?: ScopeBudgetConfig;
    tenant?: ScopeBudgetConfig;
    account?: ScopeBudgetConfig;
    authKey?: ScopeBudgetConfig;
    session?: ScopeBudgetConfig;
    network?: ScopeBudgetConfig;
  };
}


export type RedisFailureMode =
  | 'fail-closed'
  | 'fail-open'
  | 'local-emergency';

export interface RedisFailurePolicy {
  mode: RedisFailureMode;
  emergencyRatio?: number;
  expectedReplicaCount?: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export interface BudgetConsumeResult {
  allowed: boolean;
  remainingCost: number;
  retryAfterSeconds: number;
  degraded: boolean;
  store: 'redis' | 'local-emergency' | 'bypass';
  consistency: 'distributed-atomic' | 'process-local' | 'none';
  reason:
    | 'ALLOWED'
    | 'QUOTA_EXCEEDED'
    | 'REDIS_UNAVAILABLE'
    | 'FAIL_CLOSED'
    | 'FAIL_OPEN'
    | 'INVALID_REQUEST';
}

export interface BudgetStore {
  consume(request: BudgetConsumeRequest): Promise<BudgetConsumeResult>;
}

export interface RedactedThreatEvent {
  signature: string;
  routeTemplate: string;
  asn: number;
  statusCode?: number;
  evidenceCode?: string;
  timestamp: number;
}

export interface ThreatAggregateRecord {
  windowStart: string;
  windowSeconds: number;
  signature: string;
  routeTemplate: string;
  asn: number;
  count: number;
  samples: Array<{ timestamp: number; statusCode?: number; evidenceCode?: string }>;
}

export interface ThreatAggregateStore {
  increment(event: RedactedThreatEvent): Promise<void>;
  flush?(): Promise<ThreatAggregateRecord[]>;
}
