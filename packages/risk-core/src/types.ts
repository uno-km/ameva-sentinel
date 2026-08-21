export enum SentinelAction {
  ALLOW = 'ALLOW',
  OBSERVE = 'OBSERVE',
  RATE_LIMIT = 'RATE_LIMIT',
  REQUIRE_APP_VERIFICATION = 'REQUIRE_APP_VERIFICATION',
  TEMPORARY_DENY = 'TEMPORARY_DENY',
  REDIRECT = 'REDIRECT'
}

export type EnforcementMode = 'SHADOW' | 'ENFORCE';

export type TrafficTargetMode =
  | 'ANY'
  | 'HUMANS_ONLY'
  | 'BOTS_ONLY'
  | 'VERIFIED_PARTNERS_ONLY';

export type BotCategory =
  | 'SEARCH_ENGINE'
  | 'AI_AGENT'
  | 'SOCIAL_PREVIEW'
  | 'MONITORING'
  | 'FEED_FETCHER'
  | 'AUTOMATED_TOOL'
  | 'UNKNOWN_BOT'
  | 'NONE';

export type BotIdentityState = 'NOT_BOT' | 'SUSPECTED' | 'CLAIMED' | 'VERIFIED';

export type DecisionReasonCode =
  | 'BASELINE_CLEAN'
  | 'AUTOMATION_SUSPECTED'
  | 'RATE_BURST_EXCEEDED'
  | 'HUMAN_INTERACTION_ABSENT'
  | 'TARGET_MODE_HUMANS_ONLY_VIOLATION'
  | 'TARGET_MODE_BOTS_ONLY_VIOLATION'
  | 'TARGET_MODE_PARTNERS_UNVERIFIED'
  | 'BOT_ALLOWLIST_PASSED'
  | 'BOT_DENYLIST_TRIGGERED'
  | 'CATEGORY_ROUTING_REDIRECT'
  | 'POLICY_SCORE_DENY'
  | 'POLICY_SCORE_APP_VERIFICATION'
  | 'POLICY_SCORE_RATE_LIMIT';

export type RedirectDestinationId =
  | 'AI_FEED'
  | 'BOT_GUIDANCE'
  | 'DECOY_SERVICE'
  | string;

export interface BotClassificationResult {
  isBotLikely: boolean;
  category: BotCategory;
  claimedName?: string;
  identityState: BotIdentityState;
  heuristicConfidence: number; // 0.00 ~ 1.00 (Signal Strength Index)
  evidenceCodes: readonly string[];
}

export interface SentinelDecision {
  action: SentinelAction;
  reasonCode: DecisionReasonCode | string;
  redirect?: {
    destinationId: RedirectDestinationId;
    statusCode: 302 | 307;
  };
}

export interface BotRoutingRule {
  action: SentinelAction;
  destinationId?: RedirectDestinationId;
  statusCode?: 302 | 307;
  reasonCode?: DecisionReasonCode | string;
}

export interface BotPolicyConfig {
  targetMode?: TrafficTargetMode;
  allowlist?: (BotCategory | string)[];
  denylist?: (BotCategory | string)[];
  categoryRouting?: Partial<Record<BotCategory, BotRoutingRule>>;
  unknownBotAction?: BotRoutingRule;
  heuristicClassification?: boolean;
}

export interface VerifiedCollectorContext {
  readonly isVerified: true;
  readonly kid: string;
  readonly issuer: string;
  readonly audience: string;
  readonly sessionRef: string;
  readonly issuedAt: number;
  readonly expiresAt: number;
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
  telemetryObserved?: boolean;
  sampleComplete?: boolean;
  observationDurationMs?: number;
  isTrustedEventsCount?: number;
  burstCount10s?: number;
  touchMismatch?: boolean;
  suspiciousUA?: boolean;
  claimedBot?: string;
  verifiedBot?: boolean;
  botCategory?: BotCategory;
  userAgent?: string;
  tokenPresented?: boolean;
  tokenVerified?: boolean;
  verifiedContext?: VerifiedCollectorContext;
  tokenFreshnessMs?: number;
  customSignals?: Record<string, any>;
}

export interface SentinelRiskReport {
  traceId: string;
  score: number;                       // 0 ~ 100 (Clamped)
  evidenceConfidence: number;          // 0.00 ~ 1.00 (Signal Completeness Index)
  action: SentinelAction;              // Actual action executed (OBSERVE in shadow mode)
  recommendedAction: SentinelAction;   // Evaluated policy recommendation
  decision: SentinelDecision;          // Structured 4-stage decision object
  classification?: BotClassificationResult; // Heuristic bot classification
  redirectTo?: string;                 // Resolved redirect URL or destination ID
  redirectStatusCode?: 302 | 307;
  enforcementMode: EnforcementMode;    // 'SHADOW' | 'ENFORCE'
  policyVersion: string;
  evidence: EvidenceItem[];
  evaluatedAt: string;
  signals?: TelemetrySignals;
}

export function createTraceId(): string {
  const uuid = typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  return `trc_${uuid.replace(/-/g, '').slice(0, 16)}`;
}
