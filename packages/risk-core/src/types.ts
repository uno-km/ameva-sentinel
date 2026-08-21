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
  | 'DECOY_SERVICE';

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

declare const VERIFIED_COLLECTOR_BRAND: unique symbol;

/**
 * Opaque unforgeable cryptographic collector context.
 * Cannot be constructed directly by consumers; only produced by verifyCollectorToken().
 */
export interface VerifiedCollectorContext {
  readonly [VERIFIED_COLLECTOR_BRAND]: true;
  readonly kid: string;
  readonly issuer: string;
  readonly audience: string;
  readonly sessionRef: string;
  readonly issuedAtEpochMs: number;
  readonly expiresAtEpochMs: number;
}

export type VerificationOutcome =
  | { state: 'NONE'; context: null }
  | { state: 'VERIFIED'; context: VerifiedCollectorContext }
  | { state: 'FAILED'; context: null; error?: CollectorErrorCode | string };

export interface InternalDecisionTrustState {
  isVerified: boolean;
  verificationOutcome?: VerificationOutcome;
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

export interface SanitizedEvidence {
  rule: string;
  score: number;
  attributes: RuleAttributes;
  message: string;
}

/**
 * Untrusted raw input telemetry signals received from client or HTTP request.
 * Contains ZERO raw verifiedBot trust flags.
 */
export interface UntrustedTelemetrySignals {
  webdriver?: boolean;
  telemetryObserved?: boolean;
  sampleComplete?: boolean;
  observationDurationMs?: number;
  isTrustedEventsCount?: number;
  trustedInputCount?: number;
  burstCount10s?: number;
  touchMismatch?: boolean;
  suspiciousUA?: boolean;
  claimedBot?: string;
  userAgent?: string;
  token?: string;
  tokenPresented?: boolean;
  tokenFreshnessMs?: number;
  customSignals?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Internal signals used during 4-stage pipeline evaluation.
 */
export interface TelemetrySignals extends UntrustedTelemetrySignals {
  botCategory?: BotCategory;
}

export interface SentinelRiskReport {
  traceId: string;
  score: number;                       // 0 ~ 100 (Clamped)
  evidenceConfidence: number;          // 0.00 ~ 1.00 (Signal Completeness Index)
  action: SentinelAction;              // Actual action executed (OBSERVE in shadow mode)
  recommendedAction: SentinelAction;   // Evaluated policy recommendation
  decision: SentinelDecision;          // Structured 4-stage decision object
  classification?: BotClassificationResult; // Heuristic bot classification
  verification: {
    state: 'NONE' | 'FAILED' | 'VERIFIED';
    issuer?: string;
    kid?: string;
    error?: string;
  };
  redirectTo?: string;                 // Resolved redirect URL or destination ID
  redirectStatusCode?: 302 | 307;
  enforcementMode: EnforcementMode;    // 'SHADOW' | 'ENFORCE'
  policyVersion: string;
  evidence: EvidenceItem[];
  evaluatedAt: string;
  signals?: TelemetrySignals;
}

export interface StoredRiskEventV1 {
  schemaVersion: '1.0';
  traceId: string;
  evaluatedAt: string;
  score: number;
  evidenceConfidence: number;
  action: SentinelAction;
  enforcementMode: EnforcementMode;
  policyVersion: string;
  evidence: SanitizedEvidence[];
  derivedSignals: {
    webdriver: boolean;
    burstCount10s: number;
    hasPhysics: boolean;
  };
}

export interface StoredRiskEventV2 {
  schemaVersion: '2.0';
  traceId: string;
  evaluatedAt: string;
  score: number;
  evidenceConfidence: number;
  action: SentinelAction;
  decision: SentinelDecision;
  classification?: {
    category: BotCategory;
    identityState: BotIdentityState;
    claimedName?: string;
  };
  verification: {
    state: 'NONE' | 'FAILED' | 'VERIFIED';
    issuer?: string;
    kid?: string;
    error?: string;
  };
  evidence: SanitizedEvidence[];
}

export type StoredRiskEvent = StoredRiskEventV1 | StoredRiskEventV2;

export type CollectorErrorCode =
  | 'MALFORMED_TOKEN'
  | 'UNKNOWN_KEY_ID'
  | 'INVALID_SIGNATURE'
  | 'TOKEN_EXPIRED'
  | 'INVALID_TIMESTAMP_FRESHNESS'
  | 'AUDIENCE_MISMATCH'
  | 'PURPOSE_MISMATCH'
  | 'UNAUTHORIZED_ISSUER'
  | 'REPLAY_ATTACK_DETECTED'
  | 'CONFIGURATION_ERROR'
  | 'REQUEST_BODY_TOO_LARGE'
  | 'MALFORMED_REQUEST_BODY';

export interface CollectorTokenPayload {
  v: 1;
  kid: string;
  iss: string;
  aud: string;
  purpose: string;
  sessionRef: string;
  iat: number; // safe integer epoch ms
  exp: number; // safe integer epoch ms
  nonce: string;
}

export interface KeyResolver {
  resolveKey(kid: string): Promise<string | null>;
}

export interface NonceNamespace {
  issuer: string;
  kid: string;
  nonce: string;
}

export interface NonceStore {
  consume(namespace: NonceNamespace, expiresAtEpochMs: number): Promise<boolean>;
}

export function createTraceId(): string {
  const uuid = typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  return `trc_${uuid.replace(/-/g, '').slice(0, 16)}`;
}
