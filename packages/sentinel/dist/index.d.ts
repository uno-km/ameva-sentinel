import { SentinelAction, defaultPolicy, evaluate, createPolicy, rules, MemoryFixedWindowCounterStore, MemoryCounterStore, MemoryRiskEventStore, LocalStorageRiskEventStore, toStoredRiskEvent, sanitizeSignals, createTraceId } from '@ameva/sentinel-risk-core';
import type { SentinelRiskReport, TelemetrySignals, SentinelPolicy, StoredRiskEventV1, CounterStore, RiskEventStore } from '@ameva/sentinel-risk-core';
export { SentinelAction, defaultPolicy, createPolicy, rules, evaluate, MemoryFixedWindowCounterStore, MemoryCounterStore, MemoryRiskEventStore, LocalStorageRiskEventStore, toStoredRiskEvent, sanitizeSignals, createTraceId };
export type { SentinelRiskReport, TelemetrySignals, SentinelPolicy, StoredRiskEventV1, CounterStore, RiskEventStore };
export interface SentinelOptions {
    policy?: SentinelPolicy;
    mode?: 'shadow' | 'enforce';
    counterStore?: CounterStore;
    eventStore?: RiskEventStore | null;
    rateKeyProvider?: (req: any) => string | null;
}
export declare class Sentinel {
    private policy;
    private mode;
    private counterStore;
    private eventStore;
    private rateKeyProvider?;
    constructor(options?: SentinelOptions);
    score(req: any): Promise<SentinelRiskReport>;
    deriveRateKey(req: any): string | null;
    collect(req: any): Promise<TelemetrySignals>;
    verify(signals: TelemetrySignals): Promise<TelemetrySignals>;
}
export declare function createSentinel(options?: SentinelOptions): Sentinel;
export declare const sentinel: Sentinel;
