import type { EventSink, StreamRecord } from '@ameva/sentinel-risk-core';
import { type RedisClientLike, type RedisStoreBaseOptions, sanitizeRedisKeySegment } from './types.js';

export interface RedisStreamSinkOptions extends RedisStoreBaseOptions {
  streamKey?: string;
  maxLen?: number;
  approximateMaxLen?: boolean;
}

export class RedisStreamSink implements EventSink {
  readonly name = 'RedisStreamSink';
  private readonly redis: RedisClientLike;
  private readonly streamKey: string;
  private readonly maxLen: number;
  private readonly approximateMaxLen: boolean;

  constructor(options: RedisStreamSinkOptions) {
    if (!options.redis) {
      throw new Error('[RedisStreamSink] Redis client instance is required');
    }
    this.redis = options.redis;
    const prefix = options.keyPrefix ?? 'sentinel';
    const rawKey = options.streamKey ?? 'risk-events';
    this.streamKey = `${prefix}:${sanitizeRedisKeySegment(rawKey)}`;
    this.maxLen = options.maxLen ?? 1000000;
    this.approximateMaxLen = options.approximateMaxLen ?? true;
  }

  async emit(record: StreamRecord): Promise<void> {
    const payload = JSON.stringify(record);

    if (typeof this.redis.xadd === 'function') {
      if (this.approximateMaxLen) {
        await this.redis.xadd(this.streamKey, 'MAXLEN', '~', this.maxLen, '*', 'event', payload);
      } else {
        await this.redis.xadd(this.streamKey, 'MAXLEN', this.maxLen, '*', 'event', payload);
      }
    } else if (typeof this.redis.lpush === 'function') {
      await this.redis.lpush(this.streamKey, payload);
      if (typeof this.redis.ltrim === 'function') {
        await this.redis.ltrim(this.streamKey, 0, this.maxLen - 1);
      }
    }
  }

  async emitBatch(records: StreamRecord[]): Promise<void> {
    if (records.length === 0) return;

    if (typeof this.redis.pipeline === 'function') {
      const pipe = this.redis.pipeline();
      for (const record of records) {
        const payload = JSON.stringify(record);
        if (typeof pipe.xadd === 'function') {
          if (this.approximateMaxLen) {
            pipe.xadd(this.streamKey, 'MAXLEN', '~', this.maxLen, '*', 'event', payload);
          } else {
            pipe.xadd(this.streamKey, 'MAXLEN', this.maxLen, '*', 'event', payload);
          }
        } else if (typeof pipe.lpush === 'function') {
          pipe.lpush(this.streamKey, payload);
        }
      }
      if (typeof pipe.ltrim === 'function' && typeof this.redis.xadd !== 'function') {
        pipe.ltrim(this.streamKey, 0, this.maxLen - 1);
      }
      await pipe.exec();
    } else {
      for (const record of records) {
        await this.emit(record);
      }
    }
  }

  async flush(): Promise<void> {
    return Promise.resolve();
  }

  async close(): Promise<void> {
    return Promise.resolve();
  }
}
