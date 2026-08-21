import {
  SentinelAction,
  SentinelRiskReport,
  TelemetrySignals,
  UntrustedTelemetrySignals,
  EvidenceItem,
  EnforcementMode,
  VerifiedCollectorContext,
  InternalDecisionTrustState,
  createTraceId
} from './types.js';
import { calculateConfidence } from './confidence.js';
import { SentinelPolicy, defaultPolicy } from './policy.js';
import { classifyBot } from './bot-classifier.js';
import { resolveDecision } from './decision.js';
import { isVerifiedCollectorContext } from './collector-crypto.js';

export interface EvaluateOptions {
  policy?: SentinelPolicy;
  traceId?: string;
  enforcementMode?: EnforcementMode;
}

/**
 * Pure risk evaluation engine (4-Stage Pipeline).
 * 1. Classification -> 2. Scoring -> 3. Decision -> 4. Report Resolution
 * Always executes in unverified trust state (verification.state: 'NONE').
 */
export function evaluate(
  signals: UntrustedTelemetrySignals = {},
  optionsOrPolicy: EvaluateOptions | SentinelPolicy = defaultPolicy
): SentinelRiskReport {
  return evaluateWithTrust(signals, { isVerified: false }, optionsOrPolicy);
}

/**
 * Evaluates with cryptographically verified Server Context.
 * General user API cannot spoof verified context.
 */
export function evaluateVerified(
  signals: UntrustedTelemetrySignals = {},
  verifiedContext: VerifiedCollectorContext | null | undefined,
  optionsOrPolicy: EvaluateOptions | SentinelPolicy = defaultPolicy
): SentinelRiskReport {
  let isAuthentic = false;
  let verificationState: 'NONE' | 'FAILED' | 'VERIFIED' = 'NONE';
  let issuer: string | undefined;
  let kid: string | undefined;
  let error: string | undefined;

  if (verifiedContext) {
    if (isVerifiedCollectorContext(verifiedContext)) {
      isAuthentic = true;
      verificationState = 'VERIFIED';
      issuer = verifiedContext.issuer;
      kid = verifiedContext.kid;
    } else {
      verificationState = 'FAILED';
      error = 'AUTHENTICATION_FAILED';
    }
  }

  const report = evaluateWithTrust(
    signals,
    { isVerified: isAuthentic },
    optionsOrPolicy
  );

  report.verification = {
    state: verificationState,
    issuer,
    kid,
    error
  };

  return report;
}

/**
 * Internal 4-Stage Pipeline with explicit trustedState
 */
function evaluateWithTrust(
  signals: UntrustedTelemetrySignals = {},
  trustedState: InternalDecisionTrustState,
  optionsOrPolicy: EvaluateOptions | SentinelPolicy = defaultPolicy
): SentinelRiskReport {
  let policy: SentinelPolicy = defaultPolicy;
  let traceId: string | undefined;
  let enforcementMode: EnforcementMode = 'SHADOW';

  if ('rules' in optionsOrPolicy && Array.isArray(optionsOrPolicy.rules)) {
    policy = optionsOrPolicy;
  } else {
    const opts = optionsOrPolicy as EvaluateOptions;
    if (opts.policy) policy = opts.policy;
    if (opts.traceId) traceId = opts.traceId;
    if (opts.enforcementMode) enforcementMode = opts.enforcementMode;
  }

  const currentTraceId = traceId || createTraceId();
  const evidence: EvidenceItem[] = [];
  let calculatedScore = 0;

  // Defensive copy to guarantee input immutability
  const safeSignals: TelemetrySignals = { ...signals };

  // =========================================================================
  // Stage 1: Heuristic Bot Classification
  // =========================================================================
  const classification = classifyBot(safeSignals.userAgent, safeSignals);
  if (classification.isBotLikely && classification.category !== 'NONE') {
    safeSignals.botCategory = classification.category;
    if (classification.claimedName && !safeSignals.claimedBot) {
      safeSignals.claimedBot = classification.claimedName;
    }
  }

  // =========================================================================
  // Stage 2: Pure Rule Scoring & 0~100 Clamping
  // =========================================================================
  for (const rule of policy.rules) {
    const result = rule.evaluate(safeSignals);
    if (result.triggered) {
      calculatedScore += result.score;
      evidence.push({
        rule: rule.id,
        score: result.score,
        attributes: { ...result.attributes },
        message: result.message
      });
    }
  }

  // Strict Clamping: Must be finite and clamped strictly between 0 and 100
  const finalScore = Number.isFinite(calculatedScore)
    ? Math.min(100, Math.max(0, calculatedScore))
    : 0;

  const evidenceConfidence = calculateConfidence(safeSignals);

  // Determine Evaluated Recommendation based on Policy Thresholds
  let recommendedScoreAction = SentinelAction.ALLOW;
  if (finalScore >= policy.thresholds.deny) {
    recommendedScoreAction = SentinelAction.TEMPORARY_DENY;
  } else if (finalScore >= policy.thresholds.appVerification) {
    recommendedScoreAction = SentinelAction.REQUIRE_APP_VERIFICATION;
  } else if (finalScore >= policy.thresholds.rateLimit) {
    recommendedScoreAction = SentinelAction.RATE_LIMIT;
  } else if (finalScore > 20) {
    recommendedScoreAction = SentinelAction.OBSERVE;
  }

  // =========================================================================
  // Stage 3: Pure Decision Resolution (TargetMode & Policy Routing)
  // =========================================================================
  const decision = resolveDecision(
    {
      score: finalScore,
      recommendedScoreAction,
      classification,
      signals: safeSignals,
      botPolicy: policy.botPolicy,
      enforcementMode
    },
    trustedState
  );

  const recommendedAction = decision.action;

  // =========================================================================
  // Stage 4: Enforcement Mode Resolution
  // In Shadow Mode, never enforce blocking actions directly
  // =========================================================================
  let action = recommendedAction;
  if (enforcementMode === 'SHADOW') {
    if (recommendedAction === SentinelAction.ALLOW) {
      action = SentinelAction.ALLOW;
    } else {
      action = SentinelAction.OBSERVE;
    }
  }

  return {
    traceId: currentTraceId,
    score: finalScore,
    evidenceConfidence,
    action,
    recommendedAction,
    decision,
    classification,
    verification: {
      state: trustedState.isVerified ? 'VERIFIED' : 'NONE'
    },
    redirectTo: decision.redirect?.destinationId,
    redirectStatusCode: decision.redirect?.statusCode,
    enforcementMode,
    policyVersion: policy.version,
    evidence,
    evaluatedAt: new Date().toISOString(),
    signals: safeSignals
  };
}
