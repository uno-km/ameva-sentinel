import type {
  DistributedRiskEventStore,
  SentinelRiskReport,
  StoredRiskEvent,
  RiskEventStoreOptions
} from '@ameva/sentinel-risk-core';
import { toStoredRiskEvent, isStoredRiskEvent } from '@ameva/sentinel-risk-core';
import { type RedisClientLike, type RedisStoreBaseOptions, sanitizeRedisKeySegment } from './types.js';

export interface RedisRiskEventStoreOptions extends RedisStoreBaseOptions {
  clientType?: string;
  maxItems?: number;
  maxAgeMs?: number;
}

export class RedisRiskEventStore implements DistributedRiskEventStore {
  readonly clientType: string;
  private readonly redis: RedisClientLike;
  private readonly listKey: string;
  private readonly maxItems: number;

  constructor(options: RedisRiskEventStoreOptions) {
    if (!options.redis) {
      throw new Error('[RedisRiskEventStore] Redis client instance is required');
    }
    this.redis = options.redis;
    const prefix = options.keyPrefix ?? 'sentinel';
    this.listKey = `${prefix}:events:v2`;
    this.maxItems = options.maxItems ?? 1000;
    this.clientType = options.clientType ?? 'redis';
  }

  async append(report: SentinelRiskReport): Promise<void> {
    const stored = toStoredRiskEvent(report);
    if (!isStoredRiskEvent(stored)) return;

    const payload = JSON.stringify(stored);
    try {
      if (typeof this.redis.lpush === 'function') {
        await this.redis.lpush(this.listKey, payload);
        if (typeof this.redis.ltrim === 'function') {
          await this.redis.ltrim(this.listKey, 0, this.maxItems - 1);
        }
      }
    } catch (err: any) {
      throw new Error(`[RedisRiskEventStore] Failed to append event: ${err.message || String(err)}`);
    }
  }

  async list(options: { limit?: number; since?: number } = {}): Promise<StoredRiskEvent[]> {
    try {
      if (typeof this.redis.lrange !== 'function') return [];
      const limit = options.limit && options.limit > 0 ? options.limit : this.maxItems;
      const rawList = await this.redis.lrange(this.listKey, 0, limit - 1);
      if (!Array.isArray(rawList)) return [];

      const events: StoredRiskEvent[] = [];
      for (const item of rawList) {
        try {
          const parsed = JSON.parse(item);
          if (isStoredRiskEvent(parsed)) {
            if (options.since && Date.parse(parsed.evaluatedAt) < options.since) {
              continue;
            }
            events.push(parsed);
          }
        } catch (e) {}
      }
      return events;
    } catch (err: any) {
      return [];
    }
  }

  async clear(): Promise<void> {
    try {
      await this.redis.del(this.listKey);
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
