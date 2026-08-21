import { SentinelRiskReport, TelemetrySignals, EnforcementMode } from './types.js';
import { SentinelPolicy } from './policy.js';
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
export declare function evaluate(signals?: TelemetrySignals, optionsOrPolicy?: EvaluateOptions | SentinelPolicy): SentinelRiskReport;
