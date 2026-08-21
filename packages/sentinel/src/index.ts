import {
  SentinelAction,
  defaultPolicy,
  evaluate,
  evaluateVerified,
  createPolicy,
  rules,
  classifyBot,
  resolveDecision,
  verifyCollectorToken,
  signCollectorToken,
  isVerifiedCollectorContext,
  MemoryNonceStore,
  StaticKeyResolver,
  validateRedirectUrl,
  MemoryFixedWindowCounterStore,
  MemoryCounterStore,
  MemoryRiskEventStore,
  LocalStorageRiskEventStore,
  toStoredRiskEvent,
  toStoredRiskEventV1,
  isStoredRiskEvent,
  isStoredRiskEventV1,
  isStoredRiskEventV2,
  sanitizeSignals,
  createTraceId
} from '@ameva/sentinel-risk-core';

import type {
  SentinelRiskReport,
  TelemetrySignals,
  UntrustedTelemetrySignals,
  SentinelPolicy,
  StoredRiskEvent,
  StoredRiskEventV1,
  StoredRiskEventV2,
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
  VerifiedCollectorContext,
  KeyResolver,
  NonceStore
} from '@ameva/sentinel-risk-core';

export {
  SentinelAction,
  defaultPolicy,
  createPolicy,
  rules,
  evaluate,
  evaluateVerified,
  classifyBot,
  resolveDecision,
  verifyCollectorToken,
  signCollectorToken,
  isVerifiedCollectorContext,
  MemoryNonceStore,
  StaticKeyResolver,
  validateRedirectUrl,
  MemoryFixedWindowCounterStore,
  MemoryCounterStore,
  MemoryRiskEventStore,
  LocalStorageRiskEventStore,
  toStoredRiskEvent,
  toStoredRiskEventV1,
  isStoredRiskEvent,
  isStoredRiskEventV1,
  isStoredRiskEventV2,
  sanitizeSignals,
  createTraceId
};

export type {
  SentinelRiskReport,
  TelemetrySignals,
  UntrustedTelemetrySignals,
  SentinelPolicy,
  StoredRiskEvent,
  StoredRiskEventV1,
  StoredRiskEventV2,
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
  VerifiedCollectorContext,
  KeyResolver,
  NonceStore
};

export type StateFailureMode = 'FAIL_OPEN' | 'FAIL_CLOSED' | 'OBSERVE_ONLY';

export interface SentinelOptions {
  policy?: SentinelPolicy;
  mode?: 'shadow' | 'enforce';
  counterStore?: CounterStore;
  eventStore?: RiskEventStore | null;
  rateKeyProvider?: (req: any) => string | null;
  redirectRegistry?: Record<string, string | URL>;
  allowedRedirectHosts?: string[];
  keyResolver?: KeyResolver;
  nonceStore?: NonceStore;
  expectedAudience?: string;
  expectedPurpose?: string;
  allowedIssuers?: string[];
  stateFailureMode?: StateFailureMode;
  onOperationalError?: (err: Error, context: string) => void;
}

export class Sentinel {
  private policy: SentinelPolicy;
  private mode: 'shadow' | 'enforce';
  private counterStore: CounterStore;
  private eventStore: RiskEventStore | null;
  private rateKeyProvider?: (req: any) => string | null;
  private redirectRegistry: Record<string, string>;
  private allowedRedirectHosts?: string[];
  private keyResolver?: KeyResolver;
  private nonceStore: NonceStore;
  private expectedAudience?: string;
  private expectedPurpose: string;
  private allowedIssuers?: string[];
  private stateFailureMode: StateFailureMode;
  private onOperationalError?: (err: Error, context: string) => void;

  constructor(options: SentinelOptions = {}) {
    this.policy = options.policy || defaultPolicy;
    this.mode = options.mode || 'shadow';
    this.counterStore = options.counterStore || new MemoryFixedWindowCounterStore();
    this.eventStore = options.eventStore || null;
    this.rateKeyProvider = options.rateKeyProvider;
    this.keyResolver = options.keyResolver;
    this.nonceStore = options.nonceStore || new MemoryNonceStore();
    this.expectedAudience = options.expectedAudience;
    this.expectedPurpose = options.expectedPurpose || 'telemetry-collect';
    this.allowedIssuers = options.allowedIssuers;
    this.stateFailureMode = options.stateFailureMode || 'OBSERVE_ONLY';
    this.onOperationalError = options.onOperationalError;
    this.allowedRedirectHosts = options.allowedRedirectHosts;

    // Fail-fast constructor validation for VERIFIED_PARTNERS_ONLY
    if (this.policy.botPolicy?.targetMode === 'VERIFIED_PARTNERS_ONLY') {
      if (!this.keyResolver) {
        throw new Error('Sentinel configuration error: keyResolver is mandatory when botPolicy.targetMode is "VERIFIED_PARTNERS_ONLY"');
      }
      if (!this.expectedAudience) {
        throw new Error('Sentinel configuration error: expectedAudience is mandatory when botPolicy.targetMode is "VERIFIED_PARTNERS_ONLY"');
      }
    }

    // Fail-fast constructor validation of redirect registry
    const rawRegistry = options.redirectRegistry || {
      AI_FEED: '/llms.txt',
      BOT_GUIDANCE: '/bot-guidance',
      DECOY_SERVICE: '/security/decoy'
    };

    this.redirectRegistry = {};
    for (const [destId, target] of Object.entries(rawRegistry)) {
      const targetStr = typeof target === 'string' ? target : target.toString();
      const validation = validateRedirectUrl(targetStr, {
        allowedHosts: this.allowedRedirectHosts,
        allowRelative: true
      });
      if (!validation.valid || !validation.sanitizedUrl) {
        throw new Error(`Sentinel configuration error: Invalid redirectRegistry URL for "${destId}": ${validation.error}`);
      }
      this.redirectRegistry[destId] = validation.sanitizedUrl;
    }
  }

  async score(req: any): Promise<SentinelRiskReport> {
    const { signals: rawSignals, token } = await this.collect(req);

    let burstCount10s = rawSignals.burstCount10s ?? 1;
    const rateKey = this.deriveRateKey(req);
    if (rateKey) {
      try {
        const rate = await this.counterStore.increment(rateKey, { windowMs: 10000 });
        burstCount10s = rate.count;
      } catch (err: any) {
        this.handleOperationalError(err, 'counterStore.increment');
      }
    }

    const enrichedSignals: UntrustedTelemetrySignals = {
      ...rawSignals,
      burstCount10s
    };

    // Strict End-to-End Cryptographic Verification Pipeline
    const verifiedContext = await this.verify(token);

    const report = evaluateVerified(enrichedSignals, verifiedContext, {
      policy: this.policy,
      enforcementMode: this.mode === 'enforce' ? 'ENFORCE' : 'SHADOW'
    });

    // Resolve Destination ID against validated closed server registry
    if (report.redirectTo && this.redirectRegistry[report.redirectTo]) {
      report.redirectTo = this.redirectRegistry[report.redirectTo];
    }

    if (this.eventStore && typeof this.eventStore.append === 'function') {
      try {
        await this.eventStore.append(report);
      } catch (err: any) {
        this.handleOperationalError(err, 'eventStore.append');
      }
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

  /**
   * Safe extraction of untrusted telemetry signals and presented token from HTTP/raw request
   */
  async collect(req: any): Promise<{ signals: UntrustedTelemetrySignals; token: string | null }> {
    if (!req) return { signals: {}, token: null };

    let token: string | null = null;

    if (req.signals && typeof req.signals === 'object') {
      const s = req.signals;
      token = typeof s.token === 'string' ? s.token : null;
      return {
        signals: {
          webdriver: !!s.webdriverObserved || !!s.webdriver,
          telemetryObserved: !!s.telemetryObserved,
          sampleComplete: !!s.sampleComplete,
          observationDurationMs: typeof s.observationDurationMs === 'number' ? s.observationDurationMs : 6000,
          isTrustedEventsCount: typeof s.trustedInputCount === 'number' ? s.trustedInputCount : (typeof s.isTrustedEventsCount === 'number' ? s.isTrustedEventsCount : 0),
          touchMismatch: !!s.touchMismatch,
          suspiciousUA: !!s.suspiciousUA,
          userAgent: typeof s.userAgent === 'string' ? s.userAgent : undefined,
          claimedBot: typeof s.claimedBot === 'string' ? s.claimedBot : undefined,
          tokenPresented: Boolean(token),
          tokenFreshnessMs: typeof s.tokenFreshnessMs === 'number' ? s.tokenFreshnessMs : 100
        },
        token
      };
    }

    const headers = req.headers || {};
    const getHeader = (name: string): string => {
      if (typeof headers.get === 'function') return headers.get(name) || '';
      return headers[name.toLowerCase()] || headers[name] || '';
    };

    const ua = getHeader('user-agent');
    const secChUaMobile = getHeader('sec-ch-ua-mobile');

    // Extract auth/collector token
    const authHeader = getHeader('authorization');
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else {
      const customTokenHeader = getHeader('x-ameva-collector-token');
      if (customTokenHeader) token = customTokenHeader.trim();
    }

    let body: any = {};
    const maxBodyBytes = 65536; // 64KB Max Guard
    if (typeof req.json === 'function') {
      try { body = await req.json(); } catch (e) {}
    } else if (req.body) {
      if (typeof req.body === 'string') {
        if (req.body.length <= maxBodyBytes) {
          try { body = JSON.parse(req.body); } catch (e) {}
        }
      } else if (typeof req.body === 'object') {
        body = req.body;
      }
    }

    if (!token && typeof body.token === 'string') {
      token = body.token;
    }

    const isWebdriver = !!body.webdriver || /HeadlessChrome|PhantomJS|Selenium|Playwright/i.test(ua);
    const isTouchMismatch = secChUaMobile === '?1' && body.is_touch === false;
    const isSuspiciousUA = ua.length === 0 || /python-requests|curl|wget|scrapy|aiohttp|HeadlessChrome|PhantomJS|Selenium|Playwright/i.test(ua);

    return {
      signals: {
        webdriver: isWebdriver,
        telemetryObserved: body.telemetry_observed !== undefined ? !!body.telemetry_observed : (body.trusted_events !== undefined),
        sampleComplete: body.sample_complete !== undefined ? !!body.sample_complete : false,
        observationDurationMs: typeof body.observation_duration_ms === 'number' ? body.observation_duration_ms : 6000,
        isTrustedEventsCount: typeof body.trusted_events === 'number' ? body.trusted_events : 0,
        touchMismatch: isTouchMismatch,
        suspiciousUA: isSuspiciousUA,
        userAgent: ua,
        claimedBot: body.claimed_bot || (ua.includes('Bot') ? 'claimed_bot' : undefined),
        tokenPresented: Boolean(token),
        tokenFreshnessMs: body.timestamp ? Date.now() - body.timestamp : 100
      },
      token
    };
  }

  /**
   * Cryptographically verifies the presented token against the configured KeyResolver and NonceStore
   */
  async verify(token: string | null | undefined): Promise<VerifiedCollectorContext | null> {
    if (!token || !this.keyResolver || !this.expectedAudience) {
      return null;
    }

    try {
      const verified = await verifyCollectorToken(
        token,
        this.keyResolver,
        this.nonceStore,
        {
          expectedAudience: this.expectedAudience,
          expectedPurpose: this.expectedPurpose,
          allowedIssuers: this.allowedIssuers
        }
      );
      return verified;
    } catch (err: any) {
      this.handleOperationalError(err, 'verifyCollectorToken');
      return null;
    }
  }

  private handleOperationalError(err: Error, context: string): void {
    if (this.onOperationalError) {
      try {
        this.onOperationalError(err, context);
      } catch (e) {}
    }
  }
}

export function createSentinel(options: SentinelOptions = {}): Sentinel {
  return new Sentinel(options);
}

export const sentinel = new Sentinel();
