import {
  SentinelAction,
  SentinelRiskReport,
  EnforcementMode,
  EvidenceItem,
  StoredRiskEventV1,
  StoredRiskEventV2,
  StoredRiskEvent,
  SanitizedEvidence,
  RiskEventStore,
  RiskEventStoreOptions
} from './types.js';

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

export function isMinimalDerivedSignals(signals: unknown): signals is MinimalDerivedSignals {
  if (signals === null || typeof signals !== 'object' || Array.isArray(signals)) return false;
  const s = signals as Record<string, unknown>;
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
 * Strict Schema V1 Runtime Guard
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
    typeof item.enforcementMode === 'string' &&
    VALID_MODES.has(item.enforcementMode) &&
    typeof item.policyVersion === 'string' &&
    isIsoDate(item.evaluatedAt) &&
    Array.isArray(item.evidence) &&
    item.evidence.every(isValidEvidenceItem)
  );
}

/**
 * Strict Schema V2 Runtime Guard
 */
export function isStoredRiskEventV2(value: unknown): value is StoredRiskEventV2 {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Record<string, any>;

  const hasValidDecision =
    typeof item.decision === 'object' &&
    item.decision !== null &&
    typeof item.decision.action === 'string' &&
    VALID_ACTIONS.has(item.decision.action) &&
    typeof item.decision.reasonCode === 'string';

  return (
    item.schemaVersion === '2.0' &&
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
    hasValidDecision &&
    isIsoDate(item.evaluatedAt) &&
    Array.isArray(item.evidence) &&
    item.evidence.every(isValidEvidenceItem)
  );
}

/**
 * Universal Stored Event Guard (Supports both V1 and V2 for seamless migration)
 */
export function isStoredRiskEvent(value: unknown): value is StoredRiskEvent {
  return isStoredRiskEventV2(value) || isStoredRiskEventV1(value);
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

/**
 * Creates canonical StoredRiskEventV2
 */
export function toStoredRiskEvent(report: SentinelRiskReport & { signals?: any }): StoredRiskEventV2 {
  return {
    schemaVersion: '2.0',
    traceId: report.traceId,
    evaluatedAt: report.evaluatedAt,
    score: report.score,
    evidenceConfidence: report.evidenceConfidence,
    action: report.action,
    decision: report.decision || {
      action: report.action,
      reasonCode: 'BASELINE_CLEAN'
    },
    classification: report.classification ? {
      category: report.classification.category,
      identityState: report.classification.identityState,
      claimedName: report.classification.claimedName
    } : undefined,
    verification: report.verification,
    evidence: (report.evidence || []).map(sanitizeEvidence)
  };
}

/**
 * Creates legacy StoredRiskEventV1 for backward compatibility tests
 */
export function toStoredRiskEventV1(report: SentinelRiskReport & { signals?: any }): StoredRiskEventV1 {
  return {
    schemaVersion: '1.0',
    traceId: report.traceId,
    evaluatedAt: report.evaluatedAt,
    score: report.score,
    evidenceConfidence: report.evidenceConfidence,
    action: report.action,
    enforcementMode: report.enforcementMode,
    policyVersion: report.policyVersion,
    evidence: (report.evidence || []).map(sanitizeEvidence),
    derivedSignals: {
      webdriver: !!report.signals?.webdriver,
      burstCount10s: report.signals?.burstCount10s || 1,
      hasPhysics: (report.signals?.isTrustedEventsCount || 0) > 0
    }
  };
}

export class MemoryRiskEventStore implements RiskEventStore {
  private events: StoredRiskEvent[] = [];
  private maxItems: number;
  private maxAgeMs: number;

  constructor(options: RiskEventStoreOptions = {}) {
    this.maxItems = options.maxItems ?? 500;
    this.maxAgeMs = options.maxAgeMs ?? 86400000;
  }

  async append(report: SentinelRiskReport): Promise<void> {
    const stored = toStoredRiskEvent(report);
    if (!isStoredRiskEvent(stored)) {
      return;
    }
    const existingIndex = this.events.findIndex(e => e.traceId === stored.traceId);
    if (existingIndex >= 0) {
      this.events[existingIndex] = stored;
      return;
    }
    this.events.push(stored);
    this.prune();
  }

  async list(options: { limit?: number; since?: number } = {}): Promise<StoredRiskEvent[]> {
    this.prune();
    let res = [...this.events];
    if (options.since) {
      res = res.filter(e => Date.parse(e.evaluatedAt) >= options.since!);
    }
    if (options.limit && options.limit > 0) {
      res = res.slice(-options.limit);
    }
    return res.reverse();
  }

  async clear(): Promise<void> {
    this.events = [];
  }

  private prune(): void {
    const now = Date.now();
    this.events = this.events.filter(e => {
      const ts = Date.parse(e.evaluatedAt);
      return Number.isFinite(ts) && (now - ts) <= this.maxAgeMs;
    });
    if (this.events.length > this.maxItems) {
      this.events = this.events.slice(this.events.length - this.maxItems);
    }
  }
}

export class LocalStorageRiskEventStore implements RiskEventStore {
  private key = 'ameva:sentinel:risk_events_v2';
  private legacyKey = 'ameva:sentinel:risk_events_v1';
  private maxItems: number;
  private maxAgeMs: number;

  constructor(options: RiskEventStoreOptions = {}) {
    this.maxItems = options.maxItems ?? 500;
    this.maxAgeMs = options.maxAgeMs ?? 86400000;
  }

  async append(report: SentinelRiskReport): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    const stored = toStoredRiskEvent(report);
    if (!isStoredRiskEvent(stored)) return;

    const events = await this.readRaw();
    const existingIndex = events.findIndex(e => e.traceId === stored.traceId);
    if (existingIndex >= 0) {
      events[existingIndex] = stored;
    } else {
      events.push(stored);
    }
    this.writeRaw(this.prune(events));
  }

  async list(options: { limit?: number; since?: number } = {}): Promise<StoredRiskEvent[]> {
    if (typeof localStorage === 'undefined') return [];
    let events = this.prune(await this.readRaw());
    if (options.since) {
      events = events.filter(e => Date.parse(e.evaluatedAt) >= options.since!);
    }
    if (options.limit && options.limit > 0) {
      events = events.slice(-options.limit);
    }
    return events.reverse();
  }

  async clear(): Promise<void> {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.key);
      localStorage.removeItem(this.legacyKey);
    }
  }

  private async readRaw(): Promise<StoredRiskEvent[]> {
    try {
      const raw = localStorage.getItem(this.key) || localStorage.getItem(this.legacyKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(isStoredRiskEvent);
      }
    } catch (e) {}
    return [];
  }

  private writeRaw(events: StoredRiskEvent[]): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(events));
    } catch (e) {}
  }

  private prune(events: StoredRiskEvent[]): StoredRiskEvent[] {
    const now = Date.now();
    let valid = events.filter(e => {
      const ts = Date.parse(e.evaluatedAt);
      return Number.isFinite(ts) && (now - ts) <= this.maxAgeMs;
    });
    if (valid.length > this.maxItems) {
      valid = valid.slice(valid.length - this.maxItems);
    }
    return valid;
  }
}
