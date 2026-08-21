import {
  SentinelAction,
  defaultPolicy,
  evaluate,
  createPolicy,
  rules,
  classifyBot,
  resolveDecision,
  MemoryFixedWindowCounterStore,
  MemoryCounterStore,
  MemoryRiskEventStore,
  LocalStorageRiskEventStore,
  toStoredRiskEvent,
  sanitizeSignals,
  createTraceId
} from '@ameva/sentinel-risk-core';

import type {
  SentinelRiskReport,
  TelemetrySignals,
  SentinelPolicy,
  StoredRiskEventV1,
  CounterStore,
  RiskEventStore,
  TrafficTargetMode,
  BotCategory,
  BotIdentityState,
  BotClassificationResult,
  DecisionReasonCode,
  RedirectDestinationId,
  SentinelDecision,
  BotRoutingRule,
  BotPolicyConfig,
  VerifiedCollectorContext
} from '@ameva/sentinel-risk-core';

export {
  SentinelAction,
  defaultPolicy,
  createPolicy,
  rules,
  evaluate,
  classifyBot,
  resolveDecision,
  MemoryFixedWindowCounterStore,
  MemoryCounterStore,
  MemoryRiskEventStore,
  LocalStorageRiskEventStore,
  toStoredRiskEvent,
  sanitizeSignals,
  createTraceId
};

export type {
  SentinelRiskReport,
  TelemetrySignals,
  SentinelPolicy,
  StoredRiskEventV1,
  CounterStore,
  RiskEventStore,
  TrafficTargetMode,
  BotCategory,
  BotIdentityState,
  BotClassificationResult,
  DecisionReasonCode,
  RedirectDestinationId,
  SentinelDecision,
  BotRoutingRule,
  BotPolicyConfig,
  VerifiedCollectorContext
};

export interface SentinelOptions {
  policy?: SentinelPolicy;
  mode?: 'shadow' | 'enforce';
  counterStore?: CounterStore;
  eventStore?: RiskEventStore | null;
  rateKeyProvider?: (req: any) => string | null;
  redirectRegistry?: Record<string, string | URL>;
}

export class Sentinel {
  private policy: SentinelPolicy;
  private mode: 'shadow' | 'enforce';
  private counterStore: CounterStore;
  private eventStore: RiskEventStore | null;
  private rateKeyProvider?: (req: any) => string | null;
  private redirectRegistry: Record<string, string | URL>;

  constructor(options: SentinelOptions = {}) {
    this.policy = options.policy || defaultPolicy;
    this.mode = options.mode || 'shadow';
    this.counterStore = options.counterStore || new MemoryFixedWindowCounterStore();
    this.eventStore = options.eventStore || null;
    this.rateKeyProvider = options.rateKeyProvider;
    this.redirectRegistry = options.redirectRegistry || {
      AI_FEED: '/llms.txt',
      BOT_GUIDANCE: '/bot-guidance',
      DECOY_SERVICE: '/security/decoy'
    };
  }

  async score(req: any): Promise<SentinelRiskReport> {
    const rawSignals = await this.collect(req);

    let burstCount10s = rawSignals.burstCount10s ?? 1;
    const rateKey = this.deriveRateKey(req);
    if (rateKey) {
      try {
        const rate = await this.counterStore.increment(rateKey, { windowMs: 10000 });
        burstCount10s = rate.count;
      } catch (e) {}
    }

    const enrichedSignals: TelemetrySignals = {
      ...rawSignals,
      burstCount10s
    };

    const verified = await this.verify(enrichedSignals);
    const report = evaluate(verified, {
      policy: this.policy,
      enforcementMode: this.mode === 'enforce' ? 'ENFORCE' : 'SHADOW'
    });

    // Resolve Destination ID against closed server registry if available
    if (report.redirectTo && this.redirectRegistry[report.redirectTo]) {
      const resolved = this.redirectRegistry[report.redirectTo];
      report.redirectTo = typeof resolved === 'string' ? resolved : resolved.toString();
    }

    if (this.eventStore && typeof this.eventStore.append === 'function') {
      try {
        await this.eventStore.append(report);
      } catch (e) {}
    }

    return report;
  }

  deriveRateKey(req: any): string | null {
    if (this.rateKeyProvider) {
      return this.rateKeyProvider(req);
    }
    if (!req) return null;
    if (req.sessionId) return `sess_${req.sessionId}`;
    if (req.testClientId) return `test_${req.testClientId}`;
    if (typeof sessionStorage !== 'undefined') {
      try {
        const key = 'ameva:sentinel:session-id';
        const existing = sessionStorage.getItem(key);
        if (existing) return existing;
        const newId = 'sess_' + Math.random().toString(36).substring(2, 10);
        sessionStorage.setItem(key, newId);
        return newId;
      } catch (e) {}
    }
    return null;
  }

  async collect(req: any): Promise<TelemetrySignals> {
    if (!req) return {};

    if (req.signals && typeof req.signals === 'object') {
      const s = req.signals;
      return {
        webdriver: !!s.webdriverObserved || !!s.webdriver,
        telemetryObserved: !!s.telemetryObserved,
        sampleComplete: !!s.sampleComplete,
        observationDurationMs: typeof s.observationDurationMs === 'number' ? s.observationDurationMs : 6000,
        isTrustedEventsCount: typeof s.trustedInputCount === 'number' ? s.trustedInputCount : (typeof s.isTrustedEventsCount === 'number' ? s.isTrustedEventsCount : 0),
        touchMismatch: !!s.touchMismatch,
        suspiciousUA: !!s.suspiciousUA,
        userAgent: s.userAgent,
        claimedBot: s.claimedBot,
        verifiedBot: s.verifiedBot,
        tokenPresented: Boolean(s.token),
        tokenVerified: false,
        tokenFreshnessMs: typeof s.tokenFreshnessMs === 'number' ? s.tokenFreshnessMs : 100
      };
    }

    const headers = req.headers || {};
    const getHeader = (name: string): string => {
      if (typeof headers.get === 'function') return headers.get(name) || '';
      return headers[name.toLowerCase()] || headers[name] || '';
    };

    const ua = getHeader('user-agent');
    const secChUaMobile = getHeader('sec-ch-ua-mobile');

    let body: any = {};
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
      sampleComplete: body.sample_complete !== undefined ? !!body.sample_complete : false,
      observationDurationMs: typeof body.observation_duration_ms === 'number' ? body.observation_duration_ms : 6000,
      isTrustedEventsCount: typeof body.trusted_events === 'number' ? body.trusted_events : 0,
      touchMismatch: isTouchMismatch,
      suspiciousUA: isSuspiciousUA,
      userAgent: ua,
      claimedBot: body.claimed_bot || (ua.includes('Bot') ? 'claimed_bot' : undefined),
      tokenPresented: Boolean(body.token),
      tokenVerified: false,
      tokenFreshnessMs: body.timestamp ? Date.now() - body.timestamp : 100
    };
  }

  async verify(signals: TelemetrySignals): Promise<TelemetrySignals> {
    return signals;
  }
}

export function createSentinel(options: SentinelOptions = {}): Sentinel {
  return new Sentinel(options);
}

export const sentinel = new Sentinel();
