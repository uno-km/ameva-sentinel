import { TelemetrySignals } from './types.js';

/**
 * Calculates Evidence Completeness Index (0.00 ~ 1.00)
 * Evaluates signal quality, rule coverage, freshness, and interaction presence.
 * 
 * Note: This index represents evidence completeness and rule coverage, NOT a calibrated Bayesian posterior probability.
 */
export function calculateConfidence(signals: TelemetrySignals = {}): number {
  if (!signals || typeof signals !== 'object') {
    return 0.10;
  }

  // 1. Signal Verification Factor (Verified partner token or observed telemetry)
  const qSignal = signals.verifiedBot === true ? 1.0 : (signals.telemetryObserved ? 1.0 : 0.6);

  // 2. Rule Coverage Factor (Number of evaluated signal attributes)
  const validSignalKeys: (keyof TelemetrySignals)[] = [
    'webdriver',
    'burstCount10s',
    'isTrustedEventsCount',
    'touchMismatch',
    'suspiciousUA'
  ];
  const presentCount = validSignalKeys.filter(k => signals[k] !== undefined).length;
  const cRules = Math.min(1.0, Math.max(0.4, presentCount / 4));

  // 3. Freshness Factor (Signal latency decay)
  const latency = typeof signals.tokenFreshnessMs === 'number' ? signals.tokenFreshnessMs : 0;
  let fFreshness = 1.0;
  if (latency > 30000) {
    fFreshness = 0.5;
  } else if (latency > 10000) {
    fFreshness = 0.75;
  } else if (latency > 5000) {
    fFreshness = 0.9;
  }

  // 4. Sample Completeness Factor (Active physical interaction observed)
  const sCompleteness = (signals.telemetryObserved === true && signals.isTrustedEventsCount !== undefined)
    ? 1.0
    : 0.6;

  const raw = qSignal * cRules * fFreshness * sCompleteness;
  return Math.min(1.0, Math.max(0.05, Math.round(raw * 100) / 100));
}
