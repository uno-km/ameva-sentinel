export enum SentinelAction {
  ALLOW = 'ALLOW',
  OBSERVE = 'OBSERVE',
  RATE_LIMIT = 'RATE_LIMIT',
  REQUIRE_APP_VERIFICATION = 'REQUIRE_APP_VERIFICATION',
  TEMPORARY_DENY = 'TEMPORARY_DENY'
}

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
  isTrustedEventsCount?: number;
  mousePhysicsVariance?: number;
  burstCount10s?: number;
  touchMismatch?: boolean;
  suspiciousUA?: boolean;
  claimedBot?: string;
  verifiedBot?: boolean;
  hasSignedToken?: boolean;
  tokenFreshnessMs?: number;
  customSignals?: Record<string, any>;
}

export interface SentinelRiskReport {
  traceId: string;
  score: number;           // 0 ~ 100
  confidence: number;      // 0.00 ~ 1.00
  action: SentinelAction;
  policyVersion: string;
  evidence: EvidenceItem[];
  evaluatedAt: string;
}
