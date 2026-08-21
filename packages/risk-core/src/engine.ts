import { SentinelAction, SentinelRiskReport, TelemetrySignals, EvidenceItem } from './types.js';
import { calculateConfidence } from './confidence.js';

export interface PolicyRule {
  id: string;
  weight: number;
  evaluate: (signals: TelemetrySignals) => { triggered: boolean; attributes: Record<string, any>; message: string };
}

export interface SentinelPolicy {
  version: string;
  thresholds: {
    rateLimit: number;
    appVerification: number;
    deny: number;
  };
  rules: PolicyRule[];
}

export const defaultPolicy: SentinelPolicy = {
  version: "2026-08-21.1",
  thresholds: {
    rateLimit: 50,
    appVerification: 70,
    deny: 85
  },
  rules: [
    {
      id: "automation.webdriver",
      weight: 25,
      evaluate: (s) => ({
        triggered: !!s.webdriver,
        attributes: { observed: !!s.webdriver, property: "navigator.webdriver" },
        message: "navigator.webdriver automation flag is active"
      })
    },
    {
      id: "rate.burst_request",
      weight: 30,
      evaluate: (s) => ({
        triggered: (s.burstCount10s || 0) >= 30,
        attributes: { window: "10s", count: s.burstCount10s || 0, threshold: 30 },
        message: `High frequency request burst (${s.burstCount10s || 0} req / 10s)`
      })
    },
    {
      id: "interaction.no_physics",
      weight: 20,
      evaluate: (s) => ({
        triggered: s.isTrustedEventsCount === 0 && (s.burstCount10s || 0) > 5,
        attributes: { trusted_events: s.isTrustedEventsCount || 0 },
        message: "Zero trusted user interaction physics observed under burst"
      })
    },
    {
      id: "environment.touch_mismatch",
      weight: 15,
      evaluate: (s) => ({
        triggered: !!s.touchMismatch,
        attributes: { mismatch: true },
        message: "Client-Hints platform and touch capability mismatch"
      })
    }
  ]
};

export function evaluateRisk(
  signals: TelemetrySignals,
  policy: SentinelPolicy = defaultPolicy,
  traceId: string = "trc_" + Math.random().toString(36).substring(2, 12)
): SentinelRiskReport {
  let totalScore = 0;
  const evidence: EvidenceItem[] = [];

  for (const rule of policy.rules) {
    const res = rule.evaluate(signals);
    if (res.triggered) {
      totalScore += rule.weight;
      evidence.push({
        rule: rule.id,
        score: rule.weight,
        attributes: res.attributes,
        message: res.message
      });
    }
  }

  // Cap at 100
  totalScore = Math.min(100, Math.max(0, totalScore));
  const confidence = calculateConfidence(signals);

  let action = SentinelAction.ALLOW;
  if (totalScore >= policy.thresholds.deny) {
    action = SentinelAction.TEMPORARY_DENY;
  } else if (totalScore >= policy.thresholds.appVerification) {
    action = SentinelAction.REQUIRE_APP_VERIFICATION;
  } else if (totalScore >= policy.thresholds.rateLimit) {
    action = SentinelAction.RATE_LIMIT;
  } else if (totalScore > 20) {
    action = SentinelAction.OBSERVE;
  }

  return {
    traceId,
    score: totalScore,
    confidence,
    action,
    policyVersion: policy.version,
    evidence,
    evaluatedAt: new Date().toISOString()
  };
}
