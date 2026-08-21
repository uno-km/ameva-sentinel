import type { CounterStore, CounterIncrementResult } from './types.js';

export type { CounterStore, CounterIncrementResult };

interface WindowBucket {
  count: number;
  expiresAt: number;
}

export interface MemoryCounterStoreOptions {
  maxKeys?: number;
}

/**
 * Fixed-Window Memory Counter Store with Bounded Memory
 */
export class MemoryFixedWindowCounterStore implements CounterStore {
  private store = new Map<string, WindowBucket>();
  private readonly maxKeys: number;

  constructor(options: MemoryCounterStoreOptions = {}) {
    this.maxKeys = options.maxKeys ?? 10000;
  }

  async increment(key: string, options: { windowMs: number; amount?: number }): Promise<CounterIncrementResult> {
    const now = Date.now();
    const amount = options.amount ?? 1;
    this.prune();

    const existing = this.store.get(key);

    if (!existing || existing.expiresAt <= now) {
      if (this.store.size >= this.maxKeys) {
        this.prune();
        if (this.store.size >= this.maxKeys) {
          // Evict oldest entry to protect memory
          const oldestKey = this.store.keys().next().value;
          if (oldestKey) this.store.delete(oldestKey);
        }
      }
      const resetAt = now + options.windowMs;
      this.store.set(key, { count: amount, expiresAt: resetAt });
      return { count: amount, resetAt };
    }

    existing.count += amount;
    return { count: existing.count, resetAt: existing.expiresAt };
  }

  async get(key: string): Promise<number> {
    const now = Date.now();
    const existing = this.store.get(key);
    if (!existing || existing.expiresAt <= now) {
      this.store.delete(key);
      return 0;
    }
    return existing.count;
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  private prune(): void {
    const now = Date.now();
    for (const [k, bucket] of this.store.entries()) {
      if (bucket.expiresAt <= now) {
        this.store.delete(k);
      }
    }
  }
}

// Backwards-compatible alias
export const MemoryCounterStore = MemoryFixedWindowCounterStore;
