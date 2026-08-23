/**
 * SnapshotCache & Singleflight Coalescer Engine
 */

export interface SnapshotCacheOptions {
  ttlMs?: number;
  maxStaleMs?: number;
}

export class SingleflightCoalescer<T> {
  private inFlightPromises = new Map<string, Promise<T>>();

  async execute(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.inFlightPromises.get(key);
    if (existing) {
      return existing;
    }

    const promise = (async () => {
      try {
        return await fn();
      } finally {
        this.inFlightPromises.delete(key);
      }
    })();

    this.inFlightPromises.set(key, promise);
    return promise;
  }

  get inFlightCount(): number {
    return this.inFlightPromises.size;
  }
}

export class SnapshotCache<T> {
  private cachedValue: T | null = null;
  private lastFetchedAt: number = 0;
  private isRefreshing: boolean = false;
  private coalescer = new SingleflightCoalescer<T>();
  private ttlMs: number;

  constructor(options: SnapshotCacheOptions = {}) {
    this.ttlMs = Math.max(10, options.ttlMs ?? 5000);
  }

  async getOrFetch(key: string, fetcher: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const isFresh = this.cachedValue !== null && (now - this.lastFetchedAt) < this.ttlMs;

    if (isFresh && this.cachedValue !== null) {
      return this.cachedValue;
    }

    if (this.cachedValue !== null) {
      if (!this.isRefreshing) {
        this.isRefreshing = true;
        this.coalescer.execute(key, async () => {
          try {
            const fresh = await fetcher();
            this.cachedValue = fresh;
            this.lastFetchedAt = Date.now();
            return fresh;
          } finally {
            this.isRefreshing = false;
          }
        }).catch(() => {});
      }
      return this.cachedValue;
    }

    const result = await this.coalescer.execute(key, async () => {
      const fresh = await fetcher();
      this.cachedValue = fresh;
      this.lastFetchedAt = Date.now();
      return fresh;
    });
    return result;
  }

  invalidate(): void {
    this.cachedValue = null;
    this.lastFetchedAt = 0;
  }

  get lastUpdated(): number {
    return this.lastFetchedAt;
  }
}

export function maskIpAddress(ip: string | null | undefined): string {
  if (!ip || typeof ip !== "string") return "***.***.***.***";
  const trimmed = ip.trim();
  if (trimmed === "127.0.0.1" || trimmed === "localhost") return "127.0.***.***";

  if (trimmed.includes(".")) {
    const parts = trimmed.split(".");
    if (parts.length === 4) {
      return parts[0] + "." + parts[1] + ".***.***";
    }
  }

  if (trimmed.includes(":")) {
    const parts = trimmed.split(":");
    if (parts.length >= 2) {
      return parts[0] + ":" + parts[1] + ":****:****";
    }
  }

  return "***.***.***.***";
}