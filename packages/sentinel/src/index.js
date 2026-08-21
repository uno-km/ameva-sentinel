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
  /**
   * @param options.mode - 'shadow' | 'enforce' (default: 'shadow')
   * @param options.counterStore - Sliding window counter (MemoryCounterStore is local-only; for distributed environments, use Redis/Durable Objects)
   * @param options.eventStore - Risk event persistence store
   */
  constructor(options = {}) {
    this.policy = options.policy || defaultPolicy;
    this.mode = options.mode || 'shadow';
    this.counterStore = options.counterStore || new MemoryCounterStore();
    this.eventStore = options.eventStore || null;
  }

  /**
   * Evaluates HTTP request with stateful sliding-window rate tracking,
   * shadow mode semantics, and event store persistence.
   */
  async score(req) {
    const rawSignals = await this.collect(req);

    // v0.5 Local Prototype: Use explicit session or test client identifier
    const rateKey = this.deriveRateKey(req);
    const rate = await this.counterStore.increment(rateKey, { windowMs: 10000 });
    
    // Combine collected signals with sliding window counter
    const enrichedSignals = {
      ...rawSignals,
      burstCount10s: rate.count
    };

    const verified = await this.verify(enrichedSignals);
    const evaluated = evaluate(verified, {
      policy: this.policy,
      enforcementMode: this.mode === 'enforce' ? 'ENFORCE' : 'SHADOW'
    });

    // Sanitized Report for Storage (Strictly allowlisted minimal derived signals, zero PII / zero raw headers)
    const sanitizedReport = {
      ...evaluated,
      signals: this.sanitizeDerivedSignals(verified)
    };

    if (this.eventStore && typeof this.eventStore.append === 'function') {
      try {
        await this.eventStore.append(sanitizedReport);
      } catch (e) {}
    }

    return sanitizedReport;
  }

  /**
   * Derives rate limiting key for v0.5 local evaluation.
   * In a distributed server architecture, this will be replaced by a server-side subnet HMAC hash.
   */
  deriveRateKey(req) {
    if (!req) return 'anonymous-local-client';
    if (req.sessionId) return `sess_${req.sessionId}`;
    if (req.testClientId) return `test_${req.testClientId}`;
    return 'anonymous-local-client';
  }

  /**
   * Strict privacy filter: Allowlist only minimal derived numerical & boolean signals.
   * Strips all raw headers, tokens, cookies, and coordinates.
   */
  sanitizeDerivedSignals(signals = {}) {
    return {
      webdriver: !!signals.webdriver,
      telemetryObserved: !!signals.telemetryObserved,
      observationDurationMs: typeof signals.observationDurationMs === 'number' ? signals.observationDurationMs : 0,
      isTrustedEventsCount: typeof signals.isTrustedEventsCount === 'number' ? signals.isTrustedEventsCount : 0,
      burstCount10s: typeof signals.burstCount10s === 'number' ? signals.burstCount10s : 1,
      touchMismatch: !!signals.touchMismatch,
      suspiciousUA: !!signals.suspiciousUA
    };
  }

  async collect(req) {
    if (!req) return {};

    // Support direct signals bag
    if (req.signals && typeof req.signals === 'object') {
      return {
        webdriver: !!req.signals.webdriverObserved || !!req.signals.webdriver,
        telemetryObserved: !!req.signals.telemetryObserved,
        observationDurationMs: typeof req.signals.observationDurationMs === 'number' ? req.signals.observationDurationMs : 6000,
        isTrustedEventsCount: typeof req.signals.trustedInputCount === 'number' ? req.signals.trustedInputCount : (typeof req.signals.isTrustedEventsCount === 'number' ? req.signals.isTrustedEventsCount : 0),
        touchMismatch: !!req.signals.touchMismatch,
        suspiciousUA: !!req.signals.suspiciousUA,
        hasSignedToken: !!req.signals.hasSignedToken,
        tokenFreshnessMs: typeof req.signals.tokenFreshnessMs === 'number' ? req.signals.tokenFreshnessMs : 100
      };
    }

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
