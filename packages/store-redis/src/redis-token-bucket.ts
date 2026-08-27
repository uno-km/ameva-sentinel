import {
  BudgetStore,
  BudgetConsumeRequest,
  BudgetConsumeResult,
  BUDGET_SCOPES,
  BudgetScope,
  hashKeyIdentifier
} from '@ameva/sentinel-risk-core';
import { RedisClientLike } from './types.js';

export function computeSha1Hex(str: string): string {
  const utf8 = new TextEncoder().encode(str);
  const len = utf8.length;
  const bitLen = len * 8;
  const newLen = ((len + 8) >> 6) + 1;
  const words = new Uint32Array(newLen * 16);

  for (let i = 0; i < len; i++) {
    words[i >> 2] |= utf8[i] << (24 - (i % 4) * 8);
  }
  words[len >> 2] |= 0x80 << (24 - (len % 4) * 8);
  words[words.length - 1] = bitLen;

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  const rol = (num: number, cnt: number) => (num << cnt) | (num >>> (32 - cnt));
  const w = new Uint32Array(80);

  for (let i = 0; i < words.length; i += 16) {
    for (let j = 0; j < 16; j++) {
      w[j] = words[i + j];
    }
    for (let j = 16; j < 80; j++) {
      w[j] = rol(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let j = 0; j < 80; j++) {
      let f: number, k: number;
      if (j < 20) {
        f = (b & c) | ((~b) & d);
        k = 0x5a827999;
      } else if (j < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (j < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }

      const temp = (rol(a, 5) + f + e + k + w[j]) | 0;
      e = d;
      d = c;
      c = rol(b, 30);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
  }

  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return `${toHex(h0)}${toHex(h1)}${toHex(h2)}${toHex(h3)}${toHex(h4)}`;
}

export function isNoScriptError(err: unknown): boolean {
  if (!err) return false;
  const message = (typeof (err as any).message === 'string' ? (err as any).message : '') + ' ' + String(err);
  return message.includes('NOSCRIPT') || message.toLowerCase().includes('no matching script');
}



export const HIERARCHICAL_TOKEN_BUCKET_LUA = `
local cost = tonumber(ARGV[1])
if not cost or cost <= 0 or cost ~= cost or cost == math.huge then
    return redis.error_reply("INVALID_REQUEST_COST")
end

local all_keys = KEYS
local num_keys = #all_keys
local redis_time = redis.call('TIME')
local now = tonumber(redis_time[1]) + (tonumber(redis_time[2]) / 1000000)

local min_remaining = 1000000000
local max_retry_after = 0
local can_consume = true
local states = {}

-- Support Layout v2 (with idempotency) or Layout v1 (legacy)
local is_v2 = (#ARGV >= 5 and (#ARGV - 5) == (num_keys * 2))
local is_v1 = (#ARGV == (2 + (num_keys * 2)))

local ttl = is_v2 and tonumber(ARGV[2]) or (is_v1 and tonumber(ARGV[2]) or tonumber(ARGV[4] or 120))
local idemp_ttl = is_v2 and tonumber(ARGV[3] or 0) or 0
local idemp_fp = is_v2 and tostring(ARGV[4] or "") or ""
local idemp_key = is_v2 and tostring(ARGV[5] or "") or ""

-- 1. Idempotency Cache Check (Fast-path return without token re-deduction)
if idemp_ttl > 0 and idemp_key ~= "" then
    local cached = redis.call('HMGET', idemp_key, 'allowed', 'remaining', 'retry_after', 'fingerprint')
    if cached[1] and cached[4] then
        local saved_fp = tostring(cached[4])
        if saved_fp ~= idemp_fp then
            -- Idempotency Conflict: Same requestId replayed with different payload fingerprint!
            return { -1, 0, 0 }
        end
        return { tonumber(cached[1]), tonumber(cached[2]), tonumber(cached[3]) }
    end
end

-- 2. Pass 1: Balance Inspection across all active scope keys
for i, key in ipairs(all_keys) do
    local capacity, refill_rate
    if is_v2 then
        local cap_idx = 6 + ((i - 1) * 2)
        local refill_idx = cap_idx + 1
        capacity = tonumber(ARGV[cap_idx])
        refill_rate = tonumber(ARGV[refill_idx])
    elseif is_v1 then
        local cap_idx = 3 + ((i - 1) * 2)
        local refill_idx = cap_idx + 1
        capacity = tonumber(ARGV[cap_idx])
        refill_rate = tonumber(ARGV[refill_idx])
    else
        capacity = tonumber(ARGV[2])
        refill_rate = tonumber(ARGV[3])
    end

    if not capacity or capacity <= 0 then
        return redis.error_reply("INVALID_CAPACITY_FOR_KEY_" .. i)
    end
    if not refill_rate or refill_rate < 0 then
        return redis.error_reply("INVALID_REFILL_RATE_FOR_KEY_" .. i)
    end

    local data = redis.call('HMGET', key, 'tokens', 'last_updated')
    local tokens = tonumber(data[1])
    local last_updated = tonumber(data[2])

    if not tokens or not last_updated then
        tokens = capacity
        last_updated = now
    else
        local elapsed = math.max(0, now - last_updated)
        tokens = math.min(capacity, tokens + (elapsed * refill_rate))
        last_updated = now
    end

    if tokens < cost then
        can_consume = false
        local missing = cost - tokens
        local retry_sec = math.ceil(missing / math.max(0.001, refill_rate))
        if retry_sec > max_retry_after then
            max_retry_after = retry_sec
        end
    end

    if tokens < min_remaining then
        min_remaining = tokens
    end

    states[key] = { tokens = tokens, last_updated = last_updated }
end

-- 3. Pass 2: Commit or Reject with Idempotency Cache Recording
if can_consume then
    for i, key in ipairs(all_keys) do
        local new_tokens = states[key].tokens - cost
        redis.call('HMSET', key, 'tokens', new_tokens, 'last_updated', states[key].last_updated)
        redis.call('EXPIRE', key, ttl)
    end

    local remaining = math.floor(min_remaining - cost)
    if idemp_ttl > 0 and idemp_key ~= "" then
        redis.call('HMSET', idemp_key, 'allowed', 1, 'remaining', remaining, 'retry_after', 0, 'fingerprint', idemp_fp)
        redis.call('EXPIRE', idemp_key, idemp_ttl)
    end

    return { 1, remaining, 0 }
else
    local remaining = math.floor(min_remaining)
    if idemp_ttl > 0 and idemp_key ~= "" then
        redis.call('HMSET', idemp_key, 'allowed', 0, 'remaining', remaining, 'retry_after', max_retry_after, 'fingerprint', idemp_fp)
        redis.call('EXPIRE', idemp_key, idemp_ttl)
    end

    return { 0, remaining, max_retry_after }
end
`;

export class RedisTokenBucketStore implements BudgetStore {
  private readonly redis: RedisClientLike;
  private readonly prefix: string;
  private readonly defaultCapacity: number;
  private readonly defaultRefillRatePerSec: number;
  private readonly ttlSeconds: number;
  private readonly scriptSha: string;

  constructor(options: {
    redis: RedisClientLike;
    prefix?: string;
    defaultCapacity?: number;
    defaultRefillRatePerSec?: number;
    ttlSeconds?: number;
  }) {
    this.redis = options.redis;
    this.prefix = options.prefix || 'sentinel:budget';
    this.defaultCapacity = options.defaultCapacity || 100;
    this.defaultRefillRatePerSec = options.defaultRefillRatePerSec || 1.66;
    this.ttlSeconds = options.ttlSeconds || 120;
    this.scriptSha = computeSha1Hex(HIERARCHICAL_TOKEN_BUCKET_LUA);
  }

  public async consume(request: BudgetConsumeRequest): Promise<BudgetConsumeResult> {
    if (typeof request.cost !== 'number' || !Number.isFinite(request.cost) || request.cost <= 0) {
      return {
        allowed: false,
        remainingCost: 0,
        retryAfterSeconds: 0,
        degraded: false,
        store: 'redis',
        consistency: 'distributed-atomic',
        reason: 'INVALID_REQUEST'
      };
    }

    // Strict Scope SSOT: Reject unknown scope configurations immediately
    if (request.scopeBudgets) {
      for (const scopeName of Object.keys(request.scopeBudgets)) {
        if (!BUDGET_SCOPES.includes(scopeName as any)) {
          return {
            allowed: false,
            remainingCost: 0,
            retryAfterSeconds: 0,
            degraded: false,
            store: 'redis',
            consistency: 'distributed-atomic',
            reason: 'INVALID_REQUEST'
          };
        }
      }
    }

    // Explicit Budget Scope isolation avoiding unverified tenant hijacking
    const rawTag = request.tenantId
      ? `tenant:${request.tenantId}`
      : request.apiKeyId
        ? `auth:${request.apiKeyId}`
        : request.sessionId
          ? `session:${request.sessionId}`
          : `network:${request.networkKey || request.routeKey}`;
    const tenantTag = hashKeyIdentifier(rawTag);

    const keys: string[] = [];

    // Optional global scope (only included when explicitly configured)
    if (request.globalKey || request.scopeBudgets?.global) {
      keys.push(`${this.prefix}:{${tenantTag}}:global:${hashKeyIdentifier(request.globalKey || 'global')}`);
    }

    keys.push(`${this.prefix}:{${tenantTag}}:route:${hashKeyIdentifier(request.routeKey)}`);

    if (request.tenantId) {
      keys.push(`${this.prefix}:{${tenantTag}}:tenant:${hashKeyIdentifier(request.tenantId)}`);
    }
    if (request.accountId) {
      keys.push(`${this.prefix}:{${tenantTag}}:account:${hashKeyIdentifier(request.accountId)}`);
    }
    if (request.apiKeyId) {
      keys.push(`${this.prefix}:{${tenantTag}}:auth_key:${hashKeyIdentifier(request.apiKeyId)}`);
    }
    if (request.sessionId) {
      keys.push(`${this.prefix}:{${tenantTag}}:session:${hashKeyIdentifier(request.sessionId)}`);
    }
    if (request.networkKey) {
      keys.push(`${this.prefix}:{${tenantTag}}:net:${hashKeyIdentifier(request.networkKey)}`);
    }

    const tierCapacity = request.tier ? request.tier.capacity : this.defaultCapacity;
    const tierRefill = request.tier ? (request.tier.refill_tokens_per_minute || 60) / 60 : this.defaultRefillRatePerSec;

    // Per-key hierarchical quota resolution with explicit scope overrides
    const perKeyBudgets = keys.map((key) => {
      if (key.includes(':global:')) {
        return request.scopeBudgets?.global || {
          capacity: tierCapacity,
          refillRatePerSec: tierRefill
        };
      }
      if (key.includes(':route:')) {
        return request.scopeBudgets?.route || {
          capacity: tierCapacity,
          refillRatePerSec: tierRefill
        };
      }
      if (key.includes(':tenant:')) {
        return request.scopeBudgets?.tenant || {
          capacity: tierCapacity,
          refillRatePerSec: tierRefill
        };
      }
      if (key.includes(':account:')) {
        return request.scopeBudgets?.account || {
          capacity: tierCapacity,
          refillRatePerSec: tierRefill
        };
      }
      if (key.includes(':auth_key:')) {
        return request.scopeBudgets?.authKey || {
          capacity: tierCapacity,
          refillRatePerSec: tierRefill
        };
      }
      if (key.includes(':session:')) {
        return request.scopeBudgets?.session || {
          capacity: request.tier ? request.tier.capacity : 300,
          refillRatePerSec: request.tier ? (request.tier.refill_tokens_per_minute || 60) / 60 : 5.0
        };
      }
      if (key.includes(':net:')) {
        return request.scopeBudgets?.network || {
          capacity: request.tier ? request.tier.capacity : 100,
          refillRatePerSec: request.tier ? (request.tier.refill_tokens_per_minute || 60) / 60 : 1.66
        };
      }
      return {
        capacity: this.defaultCapacity,
        refillRatePerSec: this.defaultRefillRatePerSec
      };
    });

    // Validate requestId if provided
    if (request.requestId !== undefined) {
      if (typeof request.requestId !== 'string' || request.requestId.length === 0 || request.requestId.length > 256) {
        return {
          allowed: false,
          remainingCost: 0,
          retryAfterSeconds: 0,
          degraded: false,
          store: 'redis',
          consistency: 'distributed-atomic',
          reason: 'INVALID_REQUEST'
        };
      }
    }

    const idempTtl = request.requestId ? Math.min(3600, Math.max(1, request.idempotencyTtlSeconds || 60)) : 0;
    const idempKey = request.requestId
      ? `${this.prefix}:{${tenantTag}}:req:${hashKeyIdentifier(request.requestId)}`
      : '';
    const fpData = JSON.stringify({
      c: request.cost,
      k: keys,
      b: perKeyBudgets.map(b => [b.capacity, b.refillRatePerSec])
    });
    const idempFp = request.requestId ? computeSha1Hex(fpData) : '';

    const argv: Array<string | number> = [
      request.cost,
      this.ttlSeconds,
      idempTtl,
      idempFp,
      idempKey,
      ...perKeyBudgets.flatMap(({ capacity, refillRatePerSec }) => [capacity, refillRatePerSec])
    ];

    // Do NOT swallow Redis errors here: bubble up to Evaluator for emergency local fallback!
    let res: [number, number, number];
    try {
      if (this.scriptSha && typeof (this.redis as any).evalsha === 'function') {
        res = await (this.redis as any).evalsha(
          this.scriptSha,
          keys.length,
          ...keys,
          ...argv
        ) as [number, number, number];
      } else {
        res = await this.redis.eval(
          HIERARCHICAL_TOKEN_BUCKET_LUA,
          keys.length,
          ...keys,
          ...argv
        ) as [number, number, number];
      }
    } catch (err: unknown) {
      if (isNoScriptError(err)) {
        // Transparent recovery exclusively on confirmed NOSCRIPT errors
        res = await this.redis.eval(
          HIERARCHICAL_TOKEN_BUCKET_LUA,
          keys.length,
          ...keys,
          ...argv
        ) as [number, number, number];
      } else {
        // Non-NOSCRIPT errors (timeout, connection refused, network partition) bubble up immediately
        throw err;
      }
    }

    if (res[0] === -1) {
      // Idempotency conflict: same requestId called with different parameters
      return {
        status: 'idempotency-conflict',
        errorCode: 'IDEMPOTENCY_CONFLICT',
        allowed: false,
        remainingCost: 0,
        retryAfterSeconds: 0,
        degraded: false,
        store: 'redis',
        consistency: 'distributed-atomic',
        replayed: false,
        reason: 'INVALID_REQUEST'
      } as any;
    }

    const allowed = res[0] === 1;
    const remainingCost = Number(res[1]);
    const retryAfterSeconds = Number(res[2]);

    return {
      status: allowed ? 'consumed' : 'exhausted',
      allowed,
      remainingCost: Math.max(0, remainingCost),
      retryAfterSeconds: Math.max(0, retryAfterSeconds),
      degraded: false,
      store: 'redis',
      consistency: 'distributed-atomic',
      replayed: false,
      reason: allowed ? 'ALLOWED' : 'QUOTA_EXCEEDED'
    } as any;
  }
}


