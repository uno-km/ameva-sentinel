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
export declare function isStoredRiskEventV1(value: unknown): value is StoredRiskEventV1;
export declare function sanitizeSignals(signals?: any): MinimalDerivedSignals;
export declare function sanitizeEvidence(item: EvidenceItem): SanitizedEvidence;
export declare function toStoredRiskEvent(report: SentinelRiskReport & {
    signals?: any;
}): StoredRiskEventV1;
export interface RiskEventStoreOptions {
    key?: string;
    maxItems?: number;
    maxAgeMs?: number;
}
export interface RiskEventStore {
    append(report: SentinelRiskReport): Promise<void>;
    list(options?: {
        limit?: number;
        includeExpired?: boolean;
    }): Promise<StoredRiskEventV1[]>;
    clear(): Promise<void>;
}
export declare class MemoryRiskEventStore implements RiskEventStore {
    private events;
    private readonly maxItems;
    private readonly maxAgeMs;
    constructor(options?: RiskEventStoreOptions);
    append(report: SentinelRiskReport): Promise<void>;
    list(options?: {
        limit?: number;
        includeExpired?: boolean;
    }): Promise<StoredRiskEventV1[]>;
    clear(): Promise<void>;
    private prune;
}
export declare class LocalStorageRiskEventStore implements RiskEventStore {
    private readonly key;
    private readonly maxItems;
    private readonly maxAgeMs;
    constructor(options?: RiskEventStoreOptions);
    append(report: SentinelRiskReport): Promise<void>;
    list(options?: {
        limit?: number;
        includeExpired?: boolean;
    }): Promise<StoredRiskEventV1[]>;
    clear(): Promise<void>;
}
