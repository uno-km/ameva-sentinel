import { SentinelRiskReport } from './types.js';

export interface RiskEventStore {
  append(report: SentinelRiskReport): Promise<void>;
  list(options?: { limit?: number }): Promise<SentinelRiskReport[]>;
  clear(): Promise<void>;
}

/**
 * In-Memory Event Store (For Node.js / Unit Tests / SSR)
 */
export class MemoryRiskEventStore implements RiskEventStore {
  private events: SentinelRiskReport[] = [];

  constructor(private readonly maxItems = 500) {}

  async append(report: SentinelRiskReport): Promise<void> {
    this.events.unshift({
      ...report,
      evaluatedAt: report.evaluatedAt || new Date().toISOString()
    });
    if (this.events.length > this.maxItems) {
      this.events = this.events.slice(0, this.maxItems);
    }
  }

  async list(options: { limit?: number } = {}): Promise<SentinelRiskReport[]> {
    const limit = options.limit ?? this.maxItems;
    return this.events.slice(0, limit);
  }

  async clear(): Promise<void> {
    this.events = [];
  }
}

/**
 * LocalStorage Event Store (For Browser-Only Demo / Zero-DB Vertical Plumbing)
 */
export class LocalStorageRiskEventStore implements RiskEventStore {
  constructor(
    private readonly key = 'ameva:sentinel:risk-events',
    private readonly maxItems = 500
  ) {}

  async append(report: SentinelRiskReport): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    const current = await this.list({ limit: this.maxItems });
    const next = [
      {
        ...report,
        evaluatedAt: report.evaluatedAt || new Date().toISOString()
      },
      ...current
    ].slice(0, this.maxItems);

    try {
      localStorage.setItem(this.key, JSON.stringify(next));
    } catch (e) {}
  }

  async list(options: { limit?: number } = {}): Promise<SentinelRiskReport[]> {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(this.key);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.slice(0, options.limit ?? this.maxItems);
    } catch (e) {
      return [];
    }
  }

  async clear(): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.key);
  }
}
