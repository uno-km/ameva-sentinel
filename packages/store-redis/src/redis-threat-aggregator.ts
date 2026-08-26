/**
 * @file redis-threat-aggregator.ts
 * Distributed Threat Telemetry Aggregator using Redis Hash Counters.
 */

import {
  ThreatAggregateStore,
  RedactedThreatEvent,
  ThreatAggregateRecord,
  hashKeyIdentifier
} from '@ameva/sentinel-risk-core';
import { RedisClientLike } from './types.js';

export class RedisThreatAggregatorStore implements ThreatAggregateStore {
  private readonly redis: RedisClientLike;
  private readonly prefix: string;
  private readonly ttlSeconds: number;

  constructor(options: {
    redis: RedisClientLike;
    prefix?: string;
    ttlSeconds?: number;
  }) {
    this.redis = options.redis;
    this.prefix = options.prefix || 'sentinel:threat';
    this.ttlSeconds = options.ttlSeconds || 3600;
  }

  public async increment(event: RedactedThreatEvent): Promise<void> {
    const windowStart = new Date(event.timestamp * 1000).toISOString().slice(0, 16);
    const tag = hashKeyIdentifier(windowStart);
    const key = `${this.prefix}:{${tag}}:${windowStart}`;
    const field = `${hashKeyIdentifier(event.signature)}:${hashKeyIdentifier(event.routeTemplate)}:${event.asn}`;

    if (this.redis.hincrby) {
      await this.redis.hincrby(key, field, 1);
      if (this.redis.expire) {
        await this.redis.expire(key, this.ttlSeconds);
      }
    }
  }

  public async flush(): Promise<ThreatAggregateRecord[]> {
    // Redis aggregate flush is handled via periodic batch read / TTL
    return [];
  }
}
