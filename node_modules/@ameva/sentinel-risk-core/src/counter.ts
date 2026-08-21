export interface CounterIncrementResult {
  count: number;
  resetAt: number;
}

export interface CounterStore {
  increment(key: string, options: { windowMs: number; amount?: number }): Promise<CounterIncrementResult>;
  get(key: string): Promise<number>;
  reset(key: string): Promise<void>;
}

interface WindowBucket {
  count: number;
  expiresAt: number;
}

/**
 * Fixed-Window Memory Counter Store
 * 
 * Scope & Limitations:
 * - Fixed-window counter suitable for local development, testing, and single-instance Node runtimes.
 * - For multi-tenant, serverless, or distributed edge deployments, use an external atomic store (e.g. Redis / Cloudflare Durable Objects).
 */
export class MemoryFixedWindowCounterStore implements CounterStore {
  private store = new Map<string, WindowBucket>();

  async increment(key: string, options: { windowMs: number; amount?: number }): Promise<CounterIncrementResult> {
    const now = Date.now();
    const amount = options.amount ?? 1;
    const existing = this.store.get(key);

    if (!existing || existing.expiresAt <= now) {
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
}

// Backwards-compatible alias
export const MemoryCounterStore = MemoryFixedWindowCounterStore;
