import {
  SentinelAction,
  defaultPolicy,
  evaluate,
  createPolicy,
  rules,
  MemoryCounterStore,
  MemoryRiskEventStore,
  LocalStorageRiskEventStore
} from '../../risk-core/src/index.js';

export {
  SentinelAction,
  defaultPolicy,
  createPolicy,
  rules,
  evaluate,
  MemoryCounterStore,
  MemoryRiskEventStore,
  LocalStorageRiskEventStore
};

export class Sentinel {
  constructor(options = {}) {
    this.policy = options.policy || defaultPolicy;
    this.mode = options.mode || 'shadow'; // 'shadow' | 'enforce'
    this.counterStore = options.counterStore || new MemoryCounterStore();
    this.eventStore = options.eventStore || null;
  }

  /**
   * Evaluates HTTP request with stateful sliding-window rate tracking,
   * shadow mode semantics, and event store persistence.
   */
  async score(req) {
    const rawSignals = await this.collect(req);

    // Track stateful sliding window request burst rate per network key
    const networkKey = this.deriveNetworkKey(req);
    const rate = await this.counterStore.increment(networkKey, { windowMs: 10000 });
    
    // Combine collected signals with server-side sliding window counter
    const enrichedSignals = {
      ...rawSignals,
      burstCount10s: rate.count
    };

    const verified = await this.verify(enrichedSignals);
    const report = evaluate(verified, {
      policy: this.policy,
      enforcementMode: this.mode === 'enforce' ? 'ENFORCE' : 'SHADOW'
    });

    if (this.eventStore && typeof this.eventStore.append === 'function') {
      try {
        await this.eventStore.append(report);
      } catch (e) {}
    }

    return report;
  }

  deriveNetworkKey(req) {
    if (!req) return 'anon_client';
    const headers = req.headers || {};
    const getHeader = (name) => {
      if (typeof headers.get === 'function') return headers.get(name) || '';
      return headers[name.toLowerCase()] || headers[name] || '';
    };

    const ip = getHeader('x-forwarded-for') || getHeader('cf-connecting-ip') || '127.0.0.1';
    const ua = getHeader('user-agent');
    return `${ip.split(',')[0].trim()}_${ua.slice(0, 30)}`;
  }

  async collect(req) {
    if (!req) return {};

    const headers = req.headers || {};
    const getHeader = (name) => {
      if (typeof headers.get === 'function') return headers.get(name) || '';
      return headers[name.toLowerCase()] || headers[name] || '';
    };

    const ua = getHeader('user-agent');
    const secChUaMobile = getHeader('sec-ch-ua-mobile');

    let body = {};
    if (typeof req.json === 'function') {
      try { body = await req.json(); } catch (e) {}
    } else if (req.body) {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    }

    const isWebdriver = !!body.webdriver || /HeadlessChrome|PhantomJS|Selenium|Playwright/i.test(ua);
    const isTouchMismatch = secChUaMobile === '?1' && body.is_touch === false;
    const isSuspiciousUA = ua.length === 0 || /python-requests|curl|wget|scrapy|aiohttp/i.test(ua);

    return {
      webdriver: isWebdriver,
      telemetryObserved: body.telemetry_observed !== undefined ? !!body.telemetry_observed : (body.trusted_events !== undefined),
      observationDurationMs: typeof body.observation_duration_ms === 'number' ? body.observation_duration_ms : 6000,
      isTrustedEventsCount: typeof body.trusted_events === 'number' ? body.trusted_events : 0,
      touchMismatch: isTouchMismatch,
      suspiciousUA: isSuspiciousUA,
      claimedBot: body.claimed_bot || (ua.includes('Bot') ? 'claimed_bot' : undefined),
      hasSignedToken: !!body.token,
      tokenFreshnessMs: body.timestamp ? Date.now() - body.timestamp : 100
    };
  }

  async verify(signals) {
    return signals;
  }
}

export function createSentinel(options = {}) {
  return new Sentinel(options);
}

export const sentinel = new Sentinel();
