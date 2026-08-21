import { TelemetrySignals } from './types.js';

/**
 * Deterministic Mathematical Confidence Formula
 * Confidence = Q_signal * C_rules * F_freshness * S_completeness
 * Returns value between 0.00 and 1.00
 */
export function calculateConfidence(signals: TelemetrySignals): number {
  if (!signals || typeof signals !== 'object') {
    return 0.10;
  }

  // 1. Q_signal: Signal Quality (Signed token verified: 1.0, otherwise 0.5)
  const qSignal = signals.hasSignedToken ? 1.0 : 0.5;

  // 2. C_rules: Rule Coverage (Number of available testable properties / 5)
  const validKeys = ['webdriver', 'burstCount10s', 'isTrustedEventsCount', 'touchMismatch', 'suspiciousUA'];
  const presentCount = validKeys.filter(k => (signals as any)[k] !== undefined).length;
  const cRules = Math.min(1.0, Math.max(0.4, presentCount / 4));

  // 3. F_freshness: Data Freshness (Latency < 5s: 1.0, < 15s: 0.8, older: 0.6)
  const latency = typeof signals.tokenFreshnessMs === 'number' ? signals.tokenFreshnessMs : 0;
  let fFreshness = 1.0;
  if (latency > 30000) fFreshness = 0.5;
  else if (latency > 10000) fFreshness = 0.75;
  else if (latency > 5000) fFreshness = 0.9;

  // 4. S_completeness: Behavioral Sample Completeness (Interaction data present: 1.0, missing: 0.6)
  const sCompleteness = signals.isTrustedEventsCount !== undefined || signals.mousePhysicsVariance !== undefined ? 1.0 : 0.6;

  const rawConfidence = qSignal * cRules * fFreshness * sCompleteness;
  return Math.min(1.0, Math.max(0.05, Math.round(rawConfidence * 100) / 100));
}
