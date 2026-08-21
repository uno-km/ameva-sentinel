import { TelemetrySignals, RuleAttributes } from './types.js';
export interface RuleEvaluationResult {
    triggered: boolean;
    score: number;
    attributes: RuleAttributes;
    message: string;
}
export interface RuleDefinition {
    id: string;
    weight: number;
    evaluate: (signals: TelemetrySignals) => RuleEvaluationResult;
}
export declare const rules: {
    /**
     * Evaluates navigator.webdriver automation flag
     */
    webdriver: (options?: {
        weight?: number;
    }) => RuleDefinition;
    /**
     * Evaluates high frequency request burst within sliding window
     */
    burst: (options?: {
        weight?: number;
        threshold?: number;
        windowMs?: number;
    }) => RuleDefinition;
    /**
     * Evaluates absence of trusted human interaction ONLY when telemetry was genuinely observed
     * Guards against false positives when client telemetry is uninitialized or JS is disabled.
     */
    trustedInputAbsent: (options?: {
        weight?: number;
        minDurationMs?: number;
        minBurst?: number;
    }) => RuleDefinition;
    /**
     * Evaluates touch and mobile platform capability mismatch
     */
    touchMismatch: (options?: {
        weight?: number;
    }) => RuleDefinition;
    /**
     * Evaluates known automated bot signatures in User-Agent header
     */
    suspiciousUA: (options?: {
        weight?: number;
    }) => RuleDefinition;
};
