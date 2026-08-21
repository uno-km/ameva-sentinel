import { SentinelAction, SentinelRiskReport, TelemetrySignals, EvidenceItem } from './types.js';
import { calculateConfidence } from './confidence.js';
import { SentinelPolicy, defaultPolicy } from './policy.js';

/**
 * Evaluates telemetry signals against a SentinelPolicy and produces an explainable SentinelRiskReport
 */
export function evaluate(
  signals: TelemetrySignals = {},
  policy: SentinelPolicy = defaultPolicy,
  traceId?: string
): SentinelRiskReport {
  const currentTraceId = traceId || 'trc_' + Math.random().toString(36).substring(2, 14);
  const evidence: EvidenceItem[] = [];
  let calculatedScore = 0;

  for (const rule of policy.rules) {
    const result = rule.evaluate(signals);
    if (result.triggered) {
      calculatedScore += result.score;
      evidence.push({
        rule: rule.id,
        score: result.score,
        attributes: result.attributes,
        message: result.message
      });
    }
  }

  // Cap score between 0 and 100
  const finalScore = Math.min(100, Math.max(0, calculatedScore));
  const confidence = calculateConfidence(signals);

  // Determine Action based on policy thresholds
  let action = SentinelAction.ALLOW;
  if (finalScore >= policy.thresholds.deny) {
    action = SentinelAction.TEMPORARY_DENY;
  } else if (finalScore >= policy.thresholds.appVerification) {
    action = SentinelAction.REQUIRE_APP_VERIFICATION;
  } else if (finalScore >= policy.thresholds.rateLimit) {
    action = SentinelAction.RATE_LIMIT;
  } else if (finalScore > 20) {
    action = SentinelAction.OBSERVE;
  }

  return {
    traceId: currentTraceId,
    score: finalScore,
    confidence,
    action,
    policyVersion: policy.version,
    evidence,
    evaluatedAt: new Date().toISOString()
  };
}
