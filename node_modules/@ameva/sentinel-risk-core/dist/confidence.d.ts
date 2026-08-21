import { TelemetrySignals } from './types.js';
/**
 * Calculates Evidence Completeness Index (0.00 ~ 1.00)
 * Evaluates signal quality, rule coverage, freshness, and interaction presence.
 *
 * Note: This index represents evidence completeness and rule coverage, NOT a calibrated Bayesian posterior probability.
 */
export declare function calculateConfidence(signals?: TelemetrySignals): number;
