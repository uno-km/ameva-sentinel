export interface SentinelBrowserConfig {
  collector: string;
  batchIntervalMs?: number;
  maxBatchSize?: number;
  debug?: boolean;
}

export class SentinelBrowser {
  private queue: any[] = [];
  private timer: any = null;
  private config: SentinelBrowserConfig;
  private isTrustedCount = 0;

  constructor(config: SentinelBrowserConfig) {
    this.config = {
      batchIntervalMs: 5000,
      maxBatchSize: 10,
      debug: false,
      ...config
    };
    this.initListeners();
  }

  private initListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('click', (e) => {
      if (e.isTrusted) this.isTrustedCount++;
      this.enqueue({ type: 'click', isTrusted: e.isTrusted, timestamp: Date.now() });
    }, { passive: true });

    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.flush();
    });

    window.addEventListener('beforeunload', () => this.flush());
  }

  enqueue(event: any) {
    this.queue.push(event);
    if (this.queue.length >= (this.config.maxBatchSize || 10)) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.config.batchIntervalMs);
    }
  }

  flush() {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0, this.queue.length);
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const payload = JSON.stringify({
      batch,
      trusted_events: this.isTrustedCount,
      webdriver: !!navigator.webdriver,
      timestamp: Date.now()
    });

    if (navigator.sendBeacon) {
      try {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(this.config.collector, blob);
        return;
      } catch (e) {}
    }

    try {
      fetch(this.config.collector, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
      }).catch(() => {});
    } catch(e) {}
  }
}

export function initSentinel(config: SentinelBrowserConfig) {
  return new SentinelBrowser(config);
}
