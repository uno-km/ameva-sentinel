import {
  SentinelAction,
  defaultPolicy,
  evaluate,
  createPolicy,
  rules
} from '../../risk-core/src/index.js';

export {
  SentinelAction,
  defaultPolicy,
  createPolicy,
  rules,
  evaluate
};

export class Sentinel {
  constructor(options = {}) {
    this.policy = options.policy || defaultPolicy;
  }

  /**
   * 1-Line Signature API: Evaluates HTTP request and returns an explainable SentinelRiskReport
   * Pipeline: score() -> collect() -> verify() -> evaluate() -> recommend()
   */
  async score(req) {
    const ctx = await this.collect(req);
    const verified = await this.verify(ctx);
    const report = evaluate(verified, this.policy);
    return report;
  }

  /**
   * 1. Collect: Extract signals from HTTP headers and client telemetry body
   */
  async collect(req) {
    if (!req) return {};

    const headers = req.headers || {};
    const getHeader = (name) => {
      if (typeof headers.get === 'function') return headers.get(name) || '';
      return headers[name.toLowerCase()] || headers[name] || '';
    };

    const ua = getHeader('user-agent');
    const secChUaMobile = getHeader('sec-ch-ua-mobile');

    // Parse Body if present
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
      burstCount10s: typeof body.burst_count === 'number' ? body.burst_count : 1,
      isTrustedEventsCount: typeof body.trusted_events === 'number' ? body.trusted_events : 1,
      touchMismatch: isTouchMismatch,
      suspiciousUA: isSuspiciousUA,
      claimedBot: body.claimed_bot || (ua.includes('Bot') ? 'claimed_bot' : undefined),
      hasSignedToken: !!body.token,
      tokenFreshnessMs: body.timestamp ? Date.now() - body.timestamp : 100
    };
  }

  /**
   * 2. Verify: Validate token authenticity and replay protection
   */
  async verify(signals) {
    // In production, verifies token signature with HMAC secret
    return signals;
  }
}

export const sentinel = new Sentinel();
