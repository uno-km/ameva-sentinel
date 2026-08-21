import { SentinelAction, SentinelRiskReport, EnforcementMode, EvidenceItem } from './types.js';

export interface SanitizedEvidence {
  rule: string;
  score: number;
  attributes: Record<string, string | number | boolean | null>;
  message: string;
}

export interface MinimalDerivedSignals {
  webdriverObserved?: boolean;
  telemetryObserved?: boolean;
  sampleComplete?: boolean;
  observationDurationMs?: number;
  trustedInputCount?: number;
  burstCount10s?: number;
  touchMismatch?: boolean;
  suspiciousUA?: boolean;
}

/**
 * Strict Stored Event Schema (v1.0)
 * Strictly isolates runtime internal state from persistent browser storage.
 */
export interface StoredRiskEventV1 {
  schemaVersion: '1.0';
  traceId: string;
  evaluatedAt: string;
  score: number;
  evidenceConfidence: number;
  action: SentinelAction;
  recommendedAction: SentinelAction;
  enforcementMode: EnforcementMode;
  policyVersion: string;
  minimalDerivedSignals: MinimalDerivedSignals;
  evidence: SanitizedEvidence[];
  storedAt: string;
}

const VALID_ACTIONS = new Set<string>(Object.values(SentinelAction));
const VALID_MODES = new Set<string>(['SHADOW', 'ENFORCE']);

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return false;
  try {
    return new Date(time).toISOString() === value;
  } catch (e) {
    return false;
  }
}

export function hasPrimitiveAttributes(value: unknown): value is SanitizedEvidence['attributes'] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  return Object.values(value as Record<string, unknown>).every(item => {
    return (
      item === null ||
      typeof item === 'string' ||
      typeof item === 'number' ||
      typeof item === 'boolean'
    );
  });
}

export function isMinimalDerivedSignals(value: unknown): value is MinimalDerivedSignals {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const s = value as Record<string, unknown>;
  if (s.webdriverObserved !== undefined && typeof s.webdriverObserved !== 'boolean') return false;
  if (s.telemetryObserved !== undefined && typeof s.telemetryObserved !== 'boolean') return false;
  if (s.sampleComplete !== undefined && typeof s.sampleComplete !== 'boolean') return false;
  if (s.observationDurationMs !== undefined && typeof s.observationDurationMs !== 'number') return false;
  if (s.trustedInputCount !== undefined && typeof s.trustedInputCount !== 'number') return false;
  if (s.burstCount10s !== undefined && typeof s.burstCount10s !== 'number') return false;
  if (s.touchMismatch !== undefined && typeof s.touchMismatch !== 'boolean') return false;
  if (s.suspiciousUA !== undefined && typeof s.suspiciousUA !== 'boolean') return false;
  return true;
}

export function isValidEvidenceItem(item: unknown): item is SanitizedEvidence {
  if (item === null || typeof item !== 'object' || Array.isArray(item)) return false;
  const e = item as Record<string, unknown>;
  return (
    typeof e.rule === 'string' &&
    typeof e.score === 'number' &&
    Number.isFinite(e.score) &&
    typeof e.message === 'string' &&
    hasPrimitiveAttributes(e.attributes)
  );
}

/**
 * Comprehensive runtime type guard validating full structure, date formats, action enums, primitive attributes, and score bounds.
 */
export function isStoredRiskEventV1(value: unknown): value is StoredRiskEventV1 {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Record<string, any>;

  return (
    item.schemaVersion === '1.0' &&
    typeof item.traceId === 'string' &&
    item.traceId.length > 0 &&
    typeof item.score === 'number' &&
    Number.isFinite(item.score) &&
    item.score >= 0 &&
    item.score <= 100 &&
    typeof item.evidenceConfidence === 'number' &&
    Number.isFinite(item.evidenceConfidence) &&
    item.evidenceConfidence >= 0 &&
    item.evidenceConfidence <= 1 &&
    typeof item.action === 'string' &&
    VALID_ACTIONS.has(item.action) &&
    typeof item.recommendedAction === 'string' &&
    VALID_ACTIONS.has(item.recommendedAction) &&
    typeof item.enforcementMode === 'string' &&
    VALID_MODES.has(item.enforcementMode) &&
    typeof item.policyVersion === 'string' &&
    isIsoDate(item.evaluatedAt) &&
    isIsoDate(item.storedAt) &&
    isMinimalDerivedSignals(item.minimalDerivedSignals) &&
    Array.isArray(item.evidence) &&
    item.evidence.every(isValidEvidenceItem)
  );
}

export function sanitizeSignals(signals: any = {}): MinimalDerivedSignals {
  return {
    webdriverObserved: !!signals.webdriver || !!signals.webdriverObserved,
    telemetryObserved: !!signals.telemetryObserved,
    sampleComplete: !!signals.sampleComplete,
    observationDurationMs: typeof signals.observationDurationMs === 'number' ? signals.observationDurationMs : 0,
    trustedInputCount: typeof signals.isTrustedEventsCount === 'number' ? signals.isTrustedEventsCount : (typeof signals.trustedInputCount === 'number' ? signals.trustedInputCount : 0),
    burstCount10s: typeof signals.burstCount10s === 'number' ? signals.burstCount10s : 1,
    touchMismatch: !!signals.touchMismatch,
    suspiciousUA: !!signals.suspiciousUA
  };
}

export function sanitizeEvidence(item: EvidenceItem): SanitizedEvidence {
  const safeAttrs: Record<string, string | number | boolean | null> = {};
  if (item.attributes && typeof item.attributes === 'object' && !Array.isArray(item.attributes)) {
    for (const [k, v] of Object.entries(item.attributes)) {
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null) {
        safeAttrs[k] = v;
      }
    }
  }
  return {
    rule: String(item.rule || 'unknown'),
    score: Number(item.score || 0),
    attributes: safeAttrs,
    message: String(item.message || '')
  };
}

export function toStoredRiskEvent(report: SentinelRiskReport & { signals?: any }): StoredRiskEventV1 {
  const now = Date.now();
  return {
    schemaVersion: '1.0',
    traceId: report.traceId,
    evaluatedAt: report.evaluatedAt || new Date(now).toISOString(),
    score: report.score,
    evidenceConfidence: report.evidenceConfidence,
    action: report.action,
    recommendedAction: report.recommendedAction,
    enforcementMode: report.enforcementMode,
    policyVersion: report.policyVersion,
    minimalDerivedSignals: sanitizeSignals(report.signals),
    evidence: (report.evidence || []).map(sanitizeEvidence),
    storedAt: new Date(now).toISOString()
  };
}

export interface RiskEventStoreOptions {
  key?: string;
  maxItems?: number;
  maxAgeMs?: number; // Default: 24 hours
}

export interface RiskEventStore {
  append(report: SentinelRiskReport): Promise<void>;
  list(options?: { limit?: number; includeExpired?: boolean }): Promise<StoredRiskEventV1[]>;
  clear(): Promise<void>;
}

export class MemoryRiskEventStore implements RiskEventStore {
  private events: StoredRiskEventV1[] = [];
  private readonly maxItems: number;
  private readonly maxAgeMs: number;

  constructor(options: RiskEventStoreOptions = {}) {
    this.maxItems = options.maxItems ?? 500;
    this.maxAgeMs = options.maxAgeMs ?? 24 * 60 * 60 * 1000;
  }

  async append(report: SentinelRiskReport): Promise<void> {
    if (!report || !report.traceId) return;
    const storedItem = toStoredRiskEvent(report);

    this.events = this.events.filter(e => e.traceId !== report.traceId);
    this.events.unshift(storedItem);
    if (this.events.length > this.maxItems) {
      this.events = this.events.slice(0, this.maxItems);
    }
  }

  async list(options: { limit?: number; includeExpired?: boolean } = {}): Promise<StoredRiskEventV1[]> {
    const now = Date.now();
    const valid = this.events.filter(isStoredRiskEventV1);
    const unexpired = options.includeExpired
      ? valid
      : valid.filter(item => {
          const time = new Date(item.evaluatedAt).getTime();
          return (now - time) <= this.maxAgeMs;
        });
    const limit = options.limit ?? this.maxItems;
    return unexpired.slice(0, limit);
  }

  async clear(): Promise<void> {
    this.events = [];
  }
}

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
    const storedItem = toStoredRiskEvent(report);

    const filtered = current.filter(e => e.traceId !== report.traceId);
    const next = [storedItem, ...filtered].slice(0, this.maxItems);

    try {
      localStorage.setItem(this.key, JSON.stringify(next));
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        try {
          window.dispatchEvent(new CustomEvent('sentinel:risk-event-appended', { detail: storedItem }));
        } catch (e) {}
      }
    } catch (err) {
      try {
        const halved = next.slice(0, Math.floor(this.maxItems / 2));
        localStorage.setItem(this.key, JSON.stringify(halved));
      } catch (e) {}
    }
  }

  async list(options: { limit?: number; includeExpired?: boolean } = {}): Promise<StoredRiskEventV1[]> {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(this.key);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      const now = Date.now();
      const valid = parsed.filter(isStoredRiskEventV1);

      const unexpired = options.includeExpired
        ? valid
        : valid.filter(item => {
            const time = new Date(item.evaluatedAt).getTime();
            return (now - time) <= this.maxAgeMs;
          });

      return unexpired.slice(0, options.limit ?? this.maxItems);
    } catch (e) {
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
