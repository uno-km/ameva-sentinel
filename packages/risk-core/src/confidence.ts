import { TelemetrySignals } from './types.js';

export function calculateConfidence(signals: TelemetrySignals): number {
  // Signal Quality (Token verified: 1.0, otherwise 0.5)
  const qSignal = signals.hasSignedToken ? 1.0 : 0.5;
  
  // Rule Coverage (Ratio of active testable signals)
  const testableCount = Object.keys(signals).filter(k => (signals as any)[k] !== undefined).length;
  const cRules = Math.min(1.0, Math.max(0.4, testableCount / 6));
  
  // Freshness (Under 5s: 1.0, delayed: degraded)
  const latency = signals.tokenFreshnessMs || 0;
  const fFreshness = latency < 5000 ? 1.0 : latency < 15000 ? 0.8 : 0.6;
  
  // Completeness (Behavioral signals present: 1.0, missing: 0.6)
  const sCompleteness = signals.isTrustedEventsCount !== undefined ? 1.0 : 0.6;

  const rawConfidence = qSignal * cRules * fFreshness * sCompleteness;
  return Math.round(rawConfidence * 100) / 100;
}
