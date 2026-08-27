/**
 * @file local-emergency-budget.ts
 * In-Memory Emergency Local Budget Store (Token Bucket).
 * Safely isolates tier buckets, validates inputs strictly, and clamps token balance on capacity downgrade.
 */

import { BudgetStore, BudgetConsumeRequest, BudgetConsumeResult } from './budget-types.js';

export function computeEmergencyCapacity(
  normalCapacity: number,
  emergencyRatio = 0.5,
  expectedReplicaCount = 1
): number {
  if (typeof normalCapacity !== 'number' || !Number.isSafeInteger(normalCapacity) || normalCapacity < 0) {
    throw new TypeError('normalCapacity must be a non-negative safe integer');
  }
  if (typeof emergencyRatio !== 'number' || !Number.isFinite(emergencyRatio) || emergencyRatio <= 0 || emergencyRatio > 1) {
    throw new TypeError('emergencyRatio must be a number > 0 and <= 1');
  }
  if (typeof expectedReplicaCount !== 'number' || !Number.isSafeInteger(expectedReplicaCount) || expectedReplicaCount < 1) {
    throw new TypeError('expectedReplicaCount must be an integer >= 1');
  }
  if (normalCapacity === 0) {
    return 0;
  }
  return Math.max(1, Math.floor((normalCapacity * emergencyRatio) / expectedReplicaCount));
}

function assertValidConsumeRequest(request: BudgetConsumeRequest): void {
  if (!request || typeof request !== 'object') {
    throw new TypeError('request must be an object');
  }
  if (typeof request.cost !== 'number' || !Number.isSafeInteger(request.cost) || request.cost <= 0) {
    throw new TypeError('cost must be finite and greater than zero');
  }
  if (typeof request.routeKey !== 'string' || request.routeKey.length === 0 || request.routeKey.length > 512) {
    throw new TypeError('routeKey must be a non-empty bounded string');
  }

  const optionalFields: Array<keyof BudgetConsumeRequest> = [
    'tenantId',
    'accountId',
    'apiKeyId',
    'sessionId',
    'networkKey'
  ];
  for (const f of optionalFields) {
    const val = request[f];
    if (val !== undefined && (typeof val !== 'string' || val.length > 256)) {
      throw new TypeError(`${String(f)} must be a bounded string <= 256 chars`);
    }
  }
}

function assertValidBucketConfig(capacity: number, refillRate: number): void {
  if (typeof capacity !== 'number' || !Number.isSafeInteger(capacity) || capacity < 0) {
    throw new TypeError('capacity must be a non-negative safe integer');
  }
  if (typeof refillRate !== 'number' || !Number.isFinite(refillRate) || refillRate < 0) {
    throw new TypeError('refill rate must be finite and non-negative');
  }
}

export class LocalEmergencyBudgetStore implements BudgetStore {
  private readonly defaultCapacity: number;
  private readonly defaultRefillRatePerSec: number;
  private readonly buckets = new Map<string, { tokens: number; lastUpdated: number }>();

  constructor(defaultCapacity = 100, defaultRefillRatePerSec = 1.66) {
    assertValidBucketConfig(defaultCapacity, defaultRefillRatePerSec);
    this.defaultCapacity = defaultCapacity;
    this.defaultRefillRatePerSec = defaultRefillRatePerSec;
  }

  private resolveKey(request: BudgetConsumeRequest): string {
    const tenant = request.tenantId ? `tenant:${request.tenantId}:` : '';
    const tier = request.tier?.name ? `tier:${request.tier.name}:` : '';
    if (request.apiKeyId) return `${tenant}${tier}auth_key:${request.apiKeyId}`;
    if (request.accountId) return `${tenant}${tier}account:${request.accountId}`;
    if (request.sessionId) return `${tenant}${tier}session:${request.sessionId}`;
    if (request.networkKey) return `${tenant}${tier}net:${request.networkKey}`;
    return `${tenant}${tier}route:${request.routeKey}`;
  }

  public async consume(request: BudgetConsumeRequest): Promise<BudgetConsumeResult> {
    assertValidConsumeRequest(request);

    const now = Date.now() / 1000;
    const key = this.resolveKey(request);
    const cost = request.cost;

    const rawCap = request.emergencyCapacity ?? (request.tier?.emergency_local_capacity ?? this.defaultCapacity);
    const rawRefill = request.tier ? (request.tier.refill_tokens_per_minute / 60) : this.defaultRefillRatePerSec;

    assertValidBucketConfig(rawCap, rawRefill);
    const capacity = rawCap;
    const refillRate = rawRefill;

    const state = this.buckets.get(key) || { tokens: capacity, lastUpdated: now };
    const elapsed = Math.max(0, now - state.lastUpdated);
    
    // Safety clamp: if emergency capacity was reduced, clamp current balance to min(capacity, previous_tokens)
    const baseTokens = Math.min(state.tokens, capacity);
    state.tokens = Math.min(capacity, baseTokens + elapsed * refillRate);
    state.lastUpdated = now;

    if (state.tokens >= cost) {
      state.tokens -= cost;
      this.buckets.set(key, state);
      return {
        allowed: true,
        remainingCost: Math.floor(state.tokens),
        retryAfterSeconds: 0,
        degraded: true,
        store: 'local-emergency',
        consistency: 'process-local',
        reason: 'ALLOWED'
      };
    } else {
      const missing = cost - state.tokens;
      const retryAfterSeconds = refillRate === 0 ? 0 : Math.ceil(missing / refillRate);
      this.buckets.set(key, state);
      return {
        allowed: false,
        remainingCost: Math.floor(state.tokens),
        retryAfterSeconds,
        degraded: true,
        store: 'local-emergency',
        consistency: 'process-local',
        reason: 'QUOTA_EXCEEDED'
      };
    }
  }

  public reset(): void {
    this.buckets.clear();
  }
}
