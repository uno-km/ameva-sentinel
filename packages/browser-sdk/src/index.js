// Pure ESM for @ameva/sentinel-browser

export class SentinelBrowserCollector {
  constructor(options = {}) {
    this.startTime = Date.now();
    this.trustedEvents = 0;
    this.isListening = false;
    if (options.autoTrack !== false) {
      this.start();
    }
  }

  start() {
    if (this.isListening || typeof window === 'undefined') return;
    this.isListening = true;

    const onUserInteraction = (event) => {
      if (event.isTrusted === true) {
        this.trustedEvents++;
      }
    };

    window.addEventListener('pointermove', onUserInteraction, { passive: true });
    window.addEventListener('click', onUserInteraction, { passive: true });
    window.addEventListener('keydown', onUserInteraction, { passive: true });
    window.addEventListener('touchstart', onUserInteraction, { passive: true });
  }

  collectSignals() {
    const isBrowser = typeof window !== 'undefined' && typeof navigator !== 'undefined';
    if (!isBrowser) {
      return {
        webdriver: false,
        telemetryObserved: false,
        observationDurationMs: 0,
        isTrustedEventsCount: 0,
        touchMismatch: false,
        suspiciousUA: false,
        timestamp: Date.now()
      };
    }

    const nav = navigator;
    const isWebdriver = !!nav.webdriver;
    const hasTouch = 'ontouchstart' in window || (nav.maxTouchPoints || 0) > 0;
    const isMobileUA = /Android|iPhone|iPad|iPod/i.test(nav.userAgent || '');
    const isTouchMismatch = isMobileUA && !hasTouch;
    const isSuspiciousUA = !nav.userAgent || /HeadlessChrome|PhantomJS|Selenium|Playwright|curl|wget|python-requests/i.test(nav.userAgent);

    return {
      webdriver: isWebdriver,
      telemetryObserved: true,
      observationDurationMs: Date.now() - this.startTime,
      isTrustedEventsCount: this.trustedEvents,
      touchMismatch: isTouchMismatch,
      suspiciousUA: isSuspiciousUA,
      timestamp: Date.now()
    };
  }

  reset() {
    this.startTime = Date.now();
    this.trustedEvents = 0;
  }
}

export const sentinelBrowser = new SentinelBrowserCollector();
