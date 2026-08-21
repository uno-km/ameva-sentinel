// src/index.ts
function getLocalSessionId() {
  if (typeof sessionStorage === "undefined") return "ephemeral_local_session";
  const key = "ameva:sentinel:session-id";
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const newId = "sess_" + Math.random().toString(36).substring(2, 10) + "_" + Date.now().toString(36);
    sessionStorage.setItem(key, newId);
    return newId;
  } catch (e) {
    return "ephemeral_local_session";
  }
}
var BrowserTelemetryCollector = class {
  startTime = Date.now();
  isListening = false;
  maxEventsCap;
  pointerIntervalMs;
  samplingWindowMs;
  lastPointerSampleAt = 0;
  abortController = null;
  // Interaction Counters
  trustedEvents = 0;
  pointerEvents = 0;
  touchEvents = 0;
  keyboardEvents = 0;
  constructor(options = {}) {
    this.maxEventsCap = options.maxEventsCap ?? 500;
    this.pointerIntervalMs = options.pointerSampleIntervalMs ?? 100;
    this.samplingWindowMs = options.samplingWindowMs ?? 5e3;
    if (options.autoStart !== false) {
      this.start();
    }
  }
  recordInteraction(type, isTrusted) {
    if (type === "pointer" && this.pointerEvents < this.maxEventsCap) this.pointerEvents++;
    if (type === "touch" && this.touchEvents < this.maxEventsCap) this.touchEvents++;
    if (type === "keyboard" && this.keyboardEvents < this.maxEventsCap) this.keyboardEvents++;
    if (isTrusted && this.trustedEvents < this.maxEventsCap) {
      this.trustedEvents++;
    }
  }
  start() {
    if (this.isListening || typeof window === "undefined") return;
    this.isListening = true;
    this.abortController = new AbortController();
    const { signal } = this.abortController;
    const onPointerMove = (e) => {
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      if (now - this.lastPointerSampleAt < this.pointerIntervalMs) {
        return;
      }
      this.lastPointerSampleAt = now;
      this.recordInteraction("pointer", e.isTrusted === true);
    };
    const onClick = (e) => {
      this.recordInteraction("pointer", e.isTrusted === true);
    };
    const onTouch = (e) => {
      this.recordInteraction("touch", e.isTrusted === true);
    };
    const onKey = (e) => {
      this.recordInteraction("keyboard", e.isTrusted === true);
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true, signal });
    window.addEventListener("click", onClick, { passive: true, signal });
    window.addEventListener("touchstart", onTouch, { passive: true, signal });
    window.addEventListener("keydown", onKey, { passive: true, signal });
  }
  snapshot() {
    const isBrowser = typeof window !== "undefined" && typeof navigator !== "undefined";
    if (!isBrowser) {
      return {
        telemetryObserved: false,
        sampleComplete: false,
        observationDurationMs: 0,
        webdriverObserved: false,
        trustedInputCount: 0,
        pointerEventCount: 0,
        touchEventCount: 0,
        keyboardEventCount: 0,
        touchMismatch: false,
        suspiciousUA: false,
        collectedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    const elapsed = Math.max(0, Date.now() - this.startTime);
    const nav = navigator;
    const isWebdriver = !!nav.webdriver;
    const hasTouch = "ontouchstart" in window || (nav.maxTouchPoints || 0) > 0;
    const isMobileUA = /Android|iPhone|iPad|iPod/i.test(nav.userAgent || "");
    const isTouchMismatch = isMobileUA && !hasTouch;
    const isSuspiciousUA = !nav.userAgent || /HeadlessChrome|PhantomJS|Selenium|Playwright|curl|wget|python-requests/i.test(nav.userAgent);
    return {
      telemetryObserved: this.isListening,
      sampleComplete: elapsed >= this.samplingWindowMs,
      observationDurationMs: elapsed,
      webdriverObserved: isWebdriver,
      trustedInputCount: this.trustedEvents,
      pointerEventCount: this.pointerEvents,
      touchEventCount: this.touchEvents,
      keyboardEventCount: this.keyboardEvents,
      touchMismatch: isTouchMismatch,
      suspiciousUA: isSuspiciousUA,
      collectedAt: (/* @__PURE__ */ new Date()).toISOString()
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
};
function createBrowserTelemetry(options) {
  return new BrowserTelemetryCollector(options);
}
var browserTelemetry = new BrowserTelemetryCollector();
export {
  BrowserTelemetryCollector,
  browserTelemetry,
  createBrowserTelemetry,
  getLocalSessionId
};
