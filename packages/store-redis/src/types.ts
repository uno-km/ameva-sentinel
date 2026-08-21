export interface RedisClientLike {
  set(key: string, value: string, ...args: any[]): Promise<any>;
  get(key: string): Promise<string | null>;
  del(key: string | string[]): Promise<number>;
  eval(script: string, numKeys: number, ...args: (string | number)[]): Promise<any>;
  ping?(): Promise<string>;
  xadd?(stream: string, ...args: any[]): Promise<any>;
  xrange?(stream: string, start: string, end: string, ...args: any[]): Promise<any[]>;
  lpush?(key: string, ...values: string[]): Promise<number>;
  ltrim?(key: string, start: number, stop: number): Promise<string>;
  lrange?(key: string, start: number, stop: number): Promise<string[]>;
  pipeline?(): any;
}

export interface RedisStoreBaseOptions {
  redis: RedisClientLike;
  keyPrefix?: string;
}

export function sanitizeRedisKeySegment(segment: string): string {
  if (typeof segment !== 'string') return 'empty';
  // Strip dangerous redis command control characters and whitespace
  const sanitized = segment.replace(/[\r\n\s\0]/g, '_');
  return sanitized.length > 256 ? sanitized.slice(0, 256) : sanitized;
}
