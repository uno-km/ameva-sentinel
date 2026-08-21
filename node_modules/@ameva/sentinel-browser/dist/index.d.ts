/**
 * @ameva/sentinel-browser
 * Privacy-first browser environment & user interaction telemetry collector
 *
 * Guarantees:
 * - Throttled pointermove sampling (100ms interval) to protect 60fps main-thread
 * - Discrete click/touch/keyboard interactions recorded un-throttled
 * - ZERO raw mouse coordinates collected
 * - ZERO keystroke contents or form values collected
 * - Non-persistent per-tab ephemeral session identifier
 * - Clean lifecycle management with start() and destroy()
 */
export interface BrowserTelemetryOptions {
    samplingWindowMs?: number;
    maxEventsCap?: number;
    pointerSampleIntervalMs?: number;
    autoStart?: boolean;
}
export interface BrowserTelemetrySnapshot {
    telemetryObserved: boolean;
    sampleComplete: boolean;
    observationDurationMs: number;
    webdriverObserved: boolean;
    trustedInputCount: number;
    pointerEventCount: number;
    touchEventCount: number;
    keyboardEventCount: number;
    touchMismatch: boolean;
    suspiciousUA: boolean;
    collectedAt: string;
}
export declare function getLocalSessionId(): string;
export declare class BrowserTelemetryCollector {
    private startTime;
    private isListening;
    private maxEventsCap;
    private pointerIntervalMs;
    private samplingWindowMs;
    private lastPointerSampleAt;
    private abortController;
    private trustedEvents;
    private pointerEvents;
    private touchEvents;
    private keyboardEvents;
    constructor(options?: BrowserTelemetryOptions);
    private recordInteraction;
    start(): void;
    snapshot(): BrowserTelemetrySnapshot;
    reset(): void;
    destroy(): void;
}
export declare function createBrowserTelemetry(options?: BrowserTelemetryOptions): BrowserTelemetryCollector;
export declare const browserTelemetry: BrowserTelemetryCollector;
