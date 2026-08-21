import {
  SentinelAction,
  defaultPolicy,
  evaluate,
  createPolicy,
  rules,
  MemoryRiskEventStore,
  LocalStorageRiskEventStore
} from '../../risk-core/src/index.js';

export {
  SentinelAction,
  defaultPolicy,
  createPolicy,
  rules,
  evaluate,
  MemoryRiskEventStore,
  LocalStorageRiskEventStore
};

export class Sentinel {
  constructor(options = {}) {
    this.policy = options.policy || defaultPolicy;
    this.mode = options.mode || 'shadow'; // 'shadow' | 'enforce'
    this.eventStore = options.eventStore || null;
  }

  /**
   * Evaluates HTTP request, handles shadow mode enforcement, and persists to store if provided.
   */
  async score(req) {
    const ctx = await this.collect(req);
    const verified = await this.verify(ctx);
    const evaluated = evaluate(verified, this.policy);

    // Apply Shadow Mode semantics
    const isShadow = this.mode === 'shadow';
    const report = {
      ...evaluated,
      action: isShadow && evaluated.action !== SentinelAction.ALLOW ? SentinelAction.OBSERVE : evaluated.action,
      recommendedAction: evaluated.action,
      enforcementMode: isShadow ? 'SHADOW' : 'ENFORCE'
    };

    // Store in event store if configured
    if (this.eventStore && typeof this.eventStore.append === 'function') {
      try {
        await this.eventStore.append(report);
      } catch (e) {}
    }

    return report;
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
      burstCount10s: typeof body.burst_count === 'number' ? body.burst_count : 1,
      isTrustedEventsCount: typeof body.trusted_events === 'number' ? body.trusted_events : 1,
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
