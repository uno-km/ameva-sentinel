export declare enum SentinelAction {
    ALLOW = "ALLOW",
    OBSERVE = "OBSERVE",
    RATE_LIMIT = "RATE_LIMIT",
    REQUIRE_APP_VERIFICATION = "REQUIRE_APP_VERIFICATION",
    TEMPORARY_DENY = "TEMPORARY_DENY"
}
export type EnforcementMode = 'SHADOW' | 'ENFORCE';
export interface RuleAttributes {
    [key: string]: string | number | boolean | null | undefined;
}
export interface EvidenceItem {
    rule: string;
    score: number;
    attributes: RuleAttributes;
    message: string;
}
export interface TelemetrySignals {
    webdriver?: boolean;
    telemetryObserved?: boolean;
    observationDurationMs?: number;
    isTrustedEventsCount?: number;
    burstCount10s?: number;
    touchMismatch?: boolean;
    suspiciousUA?: boolean;
    claimedBot?: string;
    verifiedBot?: boolean;
    tokenPresented?: boolean;
    tokenVerified?: boolean;
    tokenFreshnessMs?: number;
    customSignals?: Record<string, any>;
}
export interface SentinelRiskReport {
    traceId: string;
    score: number;
    evidenceConfidence: number;
    action: SentinelAction;
    recommendedAction: SentinelAction;
    enforcementMode: EnforcementMode;
    policyVersion: string;
    evidence: EvidenceItem[];
    evaluatedAt: string;
    signals?: TelemetrySignals;
}
export declare function createTraceId(): string;
