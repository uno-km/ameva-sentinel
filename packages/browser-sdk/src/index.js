// Pure ESM Module for @ameva/sentinel-browser

export function getLocalSessionId() {
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
  constructor(options = {}) {
    this.startTime = Date.now();
    this.isListening = false;
    this.maxEventsCap = options.maxEventsCap ?? 500;
    this.pointerIntervalMs = options.pointerSampleIntervalMs ?? 100;
    this.lastPointerSampleAt = 0;
    this.abortController = null;

    this.trustedEvents = 0;
    this.pointerEvents = 0;
    this.touchEvents = 0;
    this.keyboardEvents = 0;

    if (options.autoStart !== false) {
      this.start();
    }
  }

  start() {
    if (this.isListening || typeof window === 'undefined') return;
    this.isListening = true;
    this.abortController = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const signal = this.abortController ? this.abortController.signal : undefined;

    const onPointer = (e) => {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (now - this.lastPointerSampleAt < this.pointerIntervalMs) {
        return;
      }
      this.lastPointerSampleAt = now;

      if (this.pointerEvents < this.maxEventsCap) this.pointerEvents++;
      if (e.isTrusted === true && this.trustedEvents < this.maxEventsCap) {
        this.trustedEvents++;
      }
    };

    const onTouch = (e) => {
      if (this.touchEvents < this.maxEventsCap) this.touchEvents++;
      if (e.isTrusted === true && this.trustedEvents < this.maxEventsCap) {
        this.trustedEvents++;
      }
    };

    const onKey = (e) => {
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

  snapshot() {
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

    const nav = navigator;
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

  reset() {
    this.startTime = Date.now();
    this.trustedEvents = 0;
    this.pointerEvents = 0;
    this.touchEvents = 0;
    this.keyboardEvents = 0;
    this.lastPointerSampleAt = 0;
  }

  destroy() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isListening = false;
  }
}

export function createBrowserTelemetry(options) {
  return new BrowserTelemetryCollector(options);
}

export const browserTelemetry = new BrowserTelemetryCollector();
