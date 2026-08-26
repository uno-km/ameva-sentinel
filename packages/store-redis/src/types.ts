/**
 * @file types.ts
 * Redis Store Type Definitions and Client Abstractions.
 */

export interface RedisClientLike {
  eval(script: string, numKeys: number, ...args: (string | number)[]): Promise<unknown>;
  hincrby?(key: string, field: string, increment: number): Promise<number>;
  expire?(key: string, seconds: number): Promise<number>;
  hgetall?(key: string): Promise<Record<string, string>>;
}
