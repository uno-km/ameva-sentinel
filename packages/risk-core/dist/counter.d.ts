export interface CounterIncrementResult {
    count: number;
    resetAt: number;
}
export interface CounterStore {
    increment(key: string, options: {
        windowMs: number;
        amount?: number;
    }): Promise<CounterIncrementResult>;
    get(key: string): Promise<number>;
    reset(key: string): Promise<void>;
}
/**
 * Fixed-Window Memory Counter Store
 *
 * Scope & Limitations:
 * - Fixed-window counter suitable for local development, testing, and single-instance Node runtimes.
 * - For multi-tenant, serverless, or distributed edge deployments, use an external atomic store (e.g. Redis / Cloudflare Durable Objects).
 */
export declare class MemoryFixedWindowCounterStore implements CounterStore {
    private store;
    increment(key: string, options: {
        windowMs: number;
        amount?: number;
    }): Promise<CounterIncrementResult>;
    get(key: string): Promise<number>;
    reset(key: string): Promise<void>;
}
export declare const MemoryCounterStore: typeof MemoryFixedWindowCounterStore;
