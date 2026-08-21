/**
 * @ameva/sentinel-browser
 * Privacy-first browser environment & user interaction telemetry collector
 * 
 * Guarantees:
 * - Throttled pointer sampling (100ms interval) to protect main-thread FPS
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

/**
 * Returns ephemeral per-tab session ID from sessionStorage.
 * Disposed automatically when the tab closes.
 */
export function getLocalSessionId(): string {
  if (typeof sessionStorage === 'undefined') return 'ephemeral_local_session';
  const key = 'ameva:sentinel:session-id';
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const newId = 'sess_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    sessionStorage.setItem(key, newId);
    return newId;
  } catch (e) {
    return 'ephemeral_local_session';
  }
}

export class BrowserTelemetryCollector {
  private startTime = Date.now();
  private isListening = false;
  private maxEventsCap: number;
  private pointerIntervalMs: number;
  private lastPointerSampleAt = 0;
  private abortController: AbortController | null = null;

  // Interaction Counters
  private trustedEvents = 0;
  private pointerEvents = 0;
  private touchEvents = 0;
  private keyboardEvents = 0;

  constructor(options: BrowserTelemetryOptions = {}) {
    this.maxEventsCap = options.maxEventsCap ?? 500;
    this.pointerIntervalMs = options.pointerSampleIntervalMs ?? 100;
    if (options.autoStart !== false) {
      this.start();
    }
  }

  start(): void {
    if (this.isListening || typeof window === 'undefined') return;
    this.isListening = true;
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    const onPointer = (e: Event) => {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (now - this.lastPointerSampleAt < this.pointerIntervalMs) {
        return; // Throttled to prevent main-thread overhead
      }
      this.lastPointerSampleAt = now;

      if (this.pointerEvents < this.maxEventsCap) this.pointerEvents++;
      if (e.isTrusted === true && this.trustedEvents < this.maxEventsCap) {
        this.trustedEvents++;
      }
    };

    const onTouch = (e: Event) => {
      if (this.touchEvents < this.maxEventsCap) this.touchEvents++;
      if (e.isTrusted === true && this.trustedEvents < this.maxEventsCap) {
        this.trustedEvents++;
      }
    };

    const onKey = (e: Event) => {
      if (this.keyboardEvents < this.maxEventsCap) this.keyboardEvents++;
      if (e.isTrusted === true && this.trustedEvents < this.maxEventsCap) {
        this.trustedEvents++;
      }
    };

    window.addEventListener('pointermove', onPointer, { passive: true, signal });
    window.addEventListener('click', onPointer, { passive: true, signal });
    window.addEventListener('touchstart', onTouch, { passive: true, signal });
    window.addEventListener('keydown', onKey, { passive: true, signal });
  }

  snapshot(): BrowserTelemetrySnapshot {
    const isBrowser = typeof window !== 'undefined' && typeof navigator !== 'undefined';
    if (!isBrowser) {
      return {
        telemetryObserved: false,
        observationDurationMs: 0,
        webdriverObserved: false,
        trustedInputCount: 0,
        pointerEventCount: 0,
        touchEventCount: 0,
        keyboardEventCount: 0,
        touchMismatch: false,
        suspiciousUA: false,
        collectedAt: new Date().toISOString()
      };
    }

    const nav = navigator as any;
    const isWebdriver = !!nav.webdriver;
    const hasTouch = 'ontouchstart' in window || (nav.maxTouchPoints || 0) > 0;
    const isMobileUA = /Android|iPhone|iPad|iPod/i.test(nav.userAgent || '');
    const isTouchMismatch = isMobileUA && !hasTouch;
    const isSuspiciousUA = !nav.userAgent || /HeadlessChrome|PhantomJS|Selenium|Playwright|curl|wget|python-requests/i.test(nav.userAgent);

    return {
      telemetryObserved: true,
      observationDurationMs: Math.max(0, Date.now() - this.startTime),
      webdriverObserved: isWebdriver,
      trustedInputCount: this.trustedEvents,
      pointerEventCount: this.pointerEvents,
      touchEventCount: this.touchEvents,
      keyboardEventCount: this.keyboardEvents,
      touchMismatch: isTouchMismatch,
      suspiciousUA: isSuspiciousUA,
      collectedAt: new Date().toISOString()
    };
  }

  reset(): void {
    this.startTime = Date.now();
    this.trustedEvents = 0;
    this.pointerEvents = 0;
    this.touchEvents = 0;
    this.keyboardEvents = 0;
    this.lastPointerSampleAt = 0;
  }

  destroy(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isListening = false;
  }
}

export function createBrowserTelemetry(options?: BrowserTelemetryOptions): BrowserTelemetryCollector {
  return new BrowserTelemetryCollector(options);
}

export const browserTelemetry = new BrowserTelemetryCollector();
