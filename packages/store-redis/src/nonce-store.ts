import type { DistributedNonceStore, NonceNamespace } from '@ameva/sentinel-risk-core';
import { type RedisClientLike, type RedisStoreBaseOptions, sanitizeRedisKeySegment } from './types.js';

export interface RedisNonceStoreOptions extends RedisStoreBaseOptions {
  clientType?: string;
}

export class RedisNonceStore implements DistributedNonceStore {
  readonly clientType: string;
  private readonly redis: RedisClientLike;
  private readonly prefix: string;

  constructor(options: RedisNonceStoreOptions) {
    if (!options.redis) {
      throw new Error('[RedisNonceStore] Redis client instance is required');
    }
    this.redis = options.redis;
    this.prefix = options.keyPrefix ?? 'sentinel';
    this.clientType = options.clientType ?? 'redis';
  }

  async consume(namespace: NonceNamespace, expiresAtEpochMs: number): Promise<boolean> {
    const iss = sanitizeRedisKeySegment(namespace.issuer);
    const kid = sanitizeRedisKeySegment(namespace.kid);
    const nonce = sanitizeRedisKeySegment(namespace.nonce);
    const key = `${this.prefix}:nonce:${iss}:${kid}:${nonce}`;

    const now = Date.now();
    const ttlSeconds = Math.max(1, Math.ceil((expiresAtEpochMs - now) / 1000));

    try {
      const res = await this.redis.set(key, String(now), 'EX', ttlSeconds, 'NX');
      return res === 'OK';
    } catch (err: any) {
      throw new Error(`[RedisNonceStore] Failed to acquire nonce lock: ${err.message || String(err)}`);
    }
  }

  async ping(): Promise<boolean> {
    try {
      if (typeof this.redis.ping === 'function') {
        const res = await this.redis.ping();
        return res === 'PONG' || res === 'pong';
      }
      const testKey = `${this.prefix}:ping_test`;
      await this.redis.set(testKey, '1', 'EX', 1);
      return true;
    } catch (e) {
      return false;
    }
  }
}
