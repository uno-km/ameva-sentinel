import type { DistributedCounterStore, CounterIncrementResult } from '@ameva/sentinel-risk-core';
import { type RedisClientLike, type RedisStoreBaseOptions, sanitizeRedisKeySegment } from './types.js';

const ATOMIC_INCREMENT_LUA = `
local current = redis.call('INCR', KEYS[1])
local ttl = redis.call('TTL', KEYS[1])
if ttl < 0 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current
`;

export interface RedisCounterStoreOptions extends RedisStoreBaseOptions {
  clientType?: string;
  defaultWindowSeconds?: number;
}

export class RedisFixedWindowCounterStore implements DistributedCounterStore {
  readonly clientType: string;
  private readonly redis: RedisClientLike;
  private readonly prefix: string;
  private readonly defaultWindowSeconds: number;

  constructor(options: RedisCounterStoreOptions) {
    if (!options.redis) {
      throw new Error('[RedisFixedWindowCounterStore] Redis client instance is required');
    }
    this.redis = options.redis;
    this.prefix = options.keyPrefix ?? 'sentinel';
    this.clientType = options.clientType ?? 'redis';
    this.defaultWindowSeconds = options.defaultWindowSeconds ?? 60;
  }

  private formatKey(key: string, windowSeconds: number): { fullKey: string; windowStart: number } {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const sanitized = sanitizeRedisKeySegment(key);
    return {
      fullKey: `${this.prefix}:counter:${sanitized}:${windowStart}`,
      windowStart
    };
  }

  async increment(
    key: string,
    options: { windowMs: number; amount?: number } = { windowMs: 60000 }
  ): Promise<CounterIncrementResult> {
    const windowMs = options.windowMs ?? (this.defaultWindowSeconds * 1000);
    const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));

    const { fullKey, windowStart } = this.formatKey(key, windowSeconds);

    try {
      const rawCount = await this.redis.eval(ATOMIC_INCREMENT_LUA, 1, fullKey, windowSeconds);
      const count = Number(rawCount) || 1;
      const resetAt = windowStart + (windowSeconds * 1000);

      return {
        count,
        resetAt
      };
    } catch (err: any) {
      throw new Error(`[RedisFixedWindowCounterStore] Failed to increment counter: ${err.message || String(err)}`);
    }
  }

  async get(key: string, windowSeconds = this.defaultWindowSeconds): Promise<number> {
    const { fullKey } = this.formatKey(key, windowSeconds);
    try {
      const raw = await this.redis.get(fullKey);
      return raw ? Number(raw) || 0 : 0;
    } catch (err: any) {
      return 0;
    }
  }

  async reset(key: string, windowSeconds = this.defaultWindowSeconds): Promise<void> {
    const { fullKey } = this.formatKey(key, windowSeconds);
    try {
      await this.redis.del(fullKey);
    } catch (err: any) {}
  }

  async ping(): Promise<boolean> {
    try {
      if (typeof this.redis.ping === 'function') {
        const res = await this.redis.ping();
        return res === 'PONG' || res === 'pong';
      }
      return true;
    } catch (e) {
      return false;
    }
  }
}
