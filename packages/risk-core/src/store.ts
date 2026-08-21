import { SentinelRiskReport } from './types.js';

export interface StoredRiskEvent extends SentinelRiskReport {
  schemaVersion: string;
  storedAt: string;
}

export interface RiskEventStoreOptions {
  key?: string;
  maxItems?: number;
  maxAgeMs?: number; // Default: 24 hours
}

export interface RiskEventStore {
  append(report: SentinelRiskReport): Promise<void>;
  list(options?: { limit?: number; includeExpired?: boolean }): Promise<SentinelRiskReport[]>;
  clear(): Promise<void>;
}

/**
 * In-Memory Event Store with Idempotency, FIFO Eviction, and TTL Pruning
 */
export class MemoryRiskEventStore implements RiskEventStore {
  private events: StoredRiskEvent[] = [];
  private readonly maxItems: number;
  private readonly maxAgeMs: number;

  constructor(options: RiskEventStoreOptions = {}) {
    this.maxItems = options.maxItems ?? 500;
    this.maxAgeMs = options.maxAgeMs ?? 24 * 60 * 60 * 1000;
  }

  async append(report: SentinelRiskReport): Promise<void> {
    if (!report || !report.traceId) return;

    const now = Date.now();
    const storedItem: StoredRiskEvent = {
      ...report,
      schemaVersion: '1.0',
      evaluatedAt: report.evaluatedAt || new Date(now).toISOString(),
      storedAt: new Date(now).toISOString()
    };

    // Idempotency: Remove existing item with same traceId if present
    this.events = this.events.filter(e => e.traceId !== report.traceId);

    // Add new item to front
    this.events.unshift(storedItem);

    // Prune Expired & FIFO Clamp
    this.prune(now);
  }

  async list(options: { limit?: number; includeExpired?: boolean } = {}): Promise<SentinelRiskReport[]> {
    const now = Date.now();
    if (!options.includeExpired) {
      this.prune(now);
    }
    const limit = options.limit ?? this.maxItems;
    return this.events.slice(0, limit);
  }

  async clear(): Promise<void> {
    this.events = [];
  }

  private prune(now: number): void {
    // 1. Evict expired
    this.events = this.events.filter(e => {
      const itemTime = new Date(e.evaluatedAt).getTime();
      return (now - itemTime) <= this.maxAgeMs;
    });

    // 2. FIFO Capacity limit
    if (this.events.length > this.maxItems) {
      this.events = this.events.slice(0, this.maxItems);
    }
  }
}

/**
 * Robust LocalStorage Event Store with Idempotency, Quota Recovery, and Cross-Tab Dispatch
 */
export class LocalStorageRiskEventStore implements RiskEventStore {
  private readonly key: string;
  private readonly maxItems: number;
  private readonly maxAgeMs: number;

  constructor(options: RiskEventStoreOptions = {}) {
    this.key = options.key || 'ameva:sentinel:risk-events';
    this.maxItems = options.maxItems ?? 500;
    this.maxAgeMs = options.maxAgeMs ?? 24 * 60 * 60 * 1000;
  }

  async append(report: SentinelRiskReport): Promise<void> {
    if (typeof localStorage === 'undefined' || !report || !report.traceId) return;

    const current = await this.list({ limit: this.maxItems, includeExpired: false });
    const now = Date.now();

    const storedItem: StoredRiskEvent = {
      ...report,
      schemaVersion: '1.0',
      evaluatedAt: report.evaluatedAt || new Date(now).toISOString(),
      storedAt: new Date(now).toISOString()
    };

    // Idempotency: Deduplicate by traceId
    const filtered = current.filter(e => e.traceId !== report.traceId);
    const next = [storedItem, ...filtered].slice(0, this.maxItems);

    try {
      localStorage.setItem(this.key, JSON.stringify(next));
      
      // Dispatch intra-tab event for reactive UI updates
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        try {
          window.dispatchEvent(new CustomEvent('sentinel:risk-event-appended', { detail: storedItem }));
        } catch (e) {}
      }
    } catch (err) {
      // Storage quota exceeded fallback: trim by half and retry
      try {
        const halved = next.slice(0, Math.floor(this.maxItems / 2));
        localStorage.setItem(this.key, JSON.stringify(halved));
      } catch (e) {}
    }
  }

  async list(options: { limit?: number; includeExpired?: boolean } = {}): Promise<SentinelRiskReport[]> {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(this.key);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      const now = Date.now();
      let valid = parsed;

      if (!options.includeExpired) {
        valid = parsed.filter((item: any) => {
          if (!item || !item.evaluatedAt) return false;
          const time = new Date(item.evaluatedAt).getTime();
          return (now - time) <= this.maxAgeMs;
        });
      }

      return valid.slice(0, options.limit ?? this.maxItems);
    } catch (e) {
      // Corrupt JSON recovery: clear corrupted state safely
      try { localStorage.removeItem(this.key); } catch (err) {}
      return [];
    }
  }

  async clear(): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(this.key);
    } catch (e) {}
  }
}
