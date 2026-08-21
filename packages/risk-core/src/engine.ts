import {
  SentinelAction,
  SentinelRiskReport,
  TelemetrySignals,
  EvidenceItem,
  EnforcementMode,
  createTraceId
} from './types.js';
import { calculateConfidence } from './confidence.js';
import { SentinelPolicy, defaultPolicy } from './policy.js';

export interface EvaluateOptions {
  policy?: SentinelPolicy;
  traceId?: string;
  enforcementMode?: EnforcementMode;
}

/**
 * Pure risk evaluation engine.
 * Evaluates telemetry signals against the configured SentinelPolicy.
 * Guaranteed input immutability and deterministic 0~100 score clamping.
 */
export function evaluate(
  signals: TelemetrySignals = {},
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
  let recommendedAction = SentinelAction.ALLOW;
  if (finalScore >= policy.thresholds.deny) {
    recommendedAction = SentinelAction.TEMPORARY_DENY;
  } else if (finalScore >= policy.thresholds.appVerification) {
    recommendedAction = SentinelAction.REQUIRE_APP_VERIFICATION;
  } else if (finalScore >= policy.thresholds.rateLimit) {
    recommendedAction = SentinelAction.RATE_LIMIT;
  } else if (finalScore > 20) {
    recommendedAction = SentinelAction.OBSERVE;
  }

  // In Shadow Mode, never enforce blocking actions directly
  let action = recommendedAction;
  if (enforcementMode === 'SHADOW') {
    action = recommendedAction === SentinelAction.ALLOW ? SentinelAction.ALLOW : SentinelAction.OBSERVE;
  }

  return {
    traceId: currentTraceId,
    score: finalScore,
    evidenceConfidence,
    action,
    recommendedAction,
    enforcementMode,
    policyVersion: policy.version,
    evidence,
    evaluatedAt: new Date().toISOString(),
    signals: safeSignals
  };
}
