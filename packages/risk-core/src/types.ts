export enum SentinelAction {
  ALLOW = 'ALLOW',
  OBSERVE = 'OBSERVE',
  RATE_LIMIT = 'RATE_LIMIT',
  REQUIRE_APP_VERIFICATION = 'REQUIRE_APP_VERIFICATION',
  TEMPORARY_DENY = 'TEMPORARY_DENY'
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
  sampleComplete?: boolean;
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

export interface EvaluationContext {
  nowEpochMs: number;
  policyHash: string;
  runtimeVersion: string;
}

export interface Finding {
  code: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  attributes?: Record<string, unknown>;
}

export interface EvaluationProvenance {
  nowEpochMs: number;
  policyHash: string;
  runtimeVersion: string;
}

export interface RiskAssessment {
  riskScore: number;
  confidence: number;
  findings: readonly Finding[];
  recommendedAction: SentinelAction | 'ALLOW' | 'OBSERVE' | 'CHALLENGE' | 'RATE_LIMIT' | 'DENY';
  provenance: EvaluationProvenance;
  /** @deprecated Use recommendedAction */
  action?: SentinelAction;
  /** @deprecated Application decision must not be in core */
  enforcedAction?: SentinelAction;
}

export interface SentinelRiskReport {
  traceId: string;
  score: number;                       // 0 ~ 100 (Clamped)
  riskScore?: number;                  // Alias for score
  evidenceConfidence: number;          // 0.00 ~ 1.00 (Signal Completeness Index)
  confidence?: number;                 // Alias for evidenceConfidence
  action: SentinelAction;              // Actual action executed
  recommendedAction: SentinelAction;   // Evaluated policy recommendation
  enforcementMode: EnforcementMode;    // 'SHADOW' | 'ENFORCE'
  policyVersion: string;
  evidence: EvidenceItem[];
  findings?: readonly Finding[];
  provenance?: EvaluationProvenance;
  evaluatedAt: string;
  signals?: TelemetrySignals;
}

export function createTraceId(): string {
  const uuid = typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  return `trc_${uuid.replace(/-/g, '').slice(0, 16)}`;
}
