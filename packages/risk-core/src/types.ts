export enum SentinelAction {
  ALLOW = 'ALLOW',
  DEGRADED_ALLOW = 'DEGRADED_ALLOW',
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

export interface DegradedReportOptions {
  traceId?: string;
  enforcementMode?: EnforcementMode;
  policyVersion?: string;
  reason?: string;
  signals?: TelemetrySignals;
  nowEpochMs?: number;
}

/**
 * Standard factory for generating transparent Fail-Open Degraded Risk Reports during engine or runtime exceptions.
 * Prevents False-Clean (score: 0 / ALLOW) telemetry masquerading by stamping DEGRADED_ALLOW and explicit system evidence.
 */
export function createDegradedReport(
  error: any,
  options?: DegradedReportOptions
): SentinelRiskReport {
  const errorMessage = error instanceof Error ? error.message : (typeof error === 'string' ? error : 'Internal Sentinel evaluation failure');
  const errorName = error instanceof Error ? error.name : 'EvaluationError';
  const evaluatedAt = options?.nowEpochMs ? new Date(options.nowEpochMs).toISOString() : new Date().toISOString();
  const traceId = options?.traceId || createTraceId();

  return {
    traceId,
    score: 0,
    riskScore: 0,
    evidenceConfidence: 0.0,
    confidence: 0.0,
    action: SentinelAction.DEGRADED_ALLOW,
    recommendedAction: SentinelAction.OBSERVE,
    enforcementMode: options?.enforcementMode || 'SHADOW',
    policyVersion: options?.policyVersion || 'degraded-fail-open-v1',
    evidence: [
      {
        rule: 'system.evaluation_failure',
        score: 0,
        attributes: {
          errorName,
          failOpen: true,
          degraded: true,
          reason: options?.reason || 'Evaluation engine encountered unhandled error; fail-open policy executed'
        },
        message: `Sentinel evaluation degraded (Fail-Open): ${errorMessage}`
      }
    ],
    evaluatedAt,
    signals: options?.signals
  };
}
