import {
  SentinelAction,
  defaultPolicy,
  evaluate,
  evaluateRiskNow,
  createPolicy,
  rules,
  MemoryFixedWindowCounterStore,
  MemoryCounterStore,
  MemoryRiskEventStore,
  LocalStorageRiskEventStore,
  toStoredRiskEvent,
  sanitizeSignals,
  createTraceId,
  resolveGeoPayloadCore,
  calculateBandwidthSavings,
  matchRouteBaseline,
  measureUtf8Bytes,
  matchBotPattern,
  AI_BOT_PATTERNS,
  createSentinelToken,
  verifySentinelToken,
  timingSafeEqualHex,
  createDegradedReport
} from '@ameva/sentinel-risk-core';

import type {
  SentinelRiskReport,
  TelemetrySignals,
  SentinelPolicy,
  StoredRiskEventV1,
  CounterStore,
  RiskEventStore,
  GeoBaselineOptions,
  GeoResolutionResult,
  GeoBotPattern,
  SentinelTokenPayload,
  TokenVerificationResult,
  DegradedReportOptions
} from '@ameva/sentinel-risk-core';

export {
  SentinelAction,
  defaultPolicy,
  createPolicy,
  rules,
  evaluate,
  evaluate as evaluateRisk,
  evaluateRiskNow,
  MemoryFixedWindowCounterStore,
  MemoryCounterStore,
  MemoryRiskEventStore,
  MemoryRiskEventStore as InMemoryRiskEventStore,
  LocalStorageRiskEventStore,
  toStoredRiskEvent,
  sanitizeSignals,
  createTraceId,
  resolveGeoPayloadCore,
  calculateBandwidthSavings,
  matchRouteBaseline,
  measureUtf8Bytes,
  matchBotPattern,
  AI_BOT_PATTERNS,
  createSentinelToken,
  verifySentinelToken,
  timingSafeEqualHex,
  createDegradedReport
};

export * from './adapters/express.js';
export * from './adapters/fastify.js';
export * from './adapters/next.js';
export * from './adapters/enforcement.js';


export type {
  SentinelRiskReport,
  TelemetrySignals,
  SentinelPolicy,
  StoredRiskEventV1,
  CounterStore,
  RiskEventStore,
  GeoBaselineOptions,
  GeoResolutionResult,
  GeoBotPattern,
  SentinelTokenPayload,
  TokenVerificationResult,
  DegradedReportOptions
};

export interface SentinelOptions {
  policy?: SentinelPolicy;
  mode?: 'shadow' | 'enforce';
  counterStore?: CounterStore;
  eventStore?: RiskEventStore | null;
  rateKeyProvider?: (req: any) => string | null;
  geoBaseline?: GeoBaselineOptions;
  secretKey?: string;
  tokenVerifier?: (token: string, signals: TelemetrySignals) => Promise<boolean> | boolean;
  maxTokenAgeMs?: number;
}

export class Sentinel {
  private policy: SentinelPolicy;
  private mode: 'shadow' | 'enforce';
  private counterStore: CounterStore;
  private eventStore: RiskEventStore | null;
  private rateKeyProvider?: (req: any) => string | null;
  private geoBaseline?: GeoBaselineOptions;
  private secretKey?: string;
  private tokenVerifier?: (token: string, signals: TelemetrySignals) => Promise<boolean> | boolean;
  private maxTokenAgeMs?: number;

  constructor(options: SentinelOptions = {}) {
    this.policy = options.policy || defaultPolicy;
    this.mode = options.mode || 'shadow';
    this.counterStore = options.counterStore || new MemoryFixedWindowCounterStore();
    this.eventStore = options.eventStore || null;
    this.rateKeyProvider = options.rateKeyProvider;
    this.geoBaseline = options.geoBaseline;
    this.secretKey = options.secretKey;
    this.tokenVerifier = options.tokenVerifier;
    this.maxTokenAgeMs = options.maxTokenAgeMs;
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

    const rawToken = typeof req?.token === 'string' ? req.token : ((req?.signals as any)?.token || (rawSignals as any)?._rawToken);
    const verified = await this.verify(enrichedSignals, rawToken);
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
      const resSignals: TelemetrySignals = {
        webdriver: !!s.webdriverObserved || !!s.webdriver,
        telemetryObserved: !!s.telemetryObserved,
        sampleComplete: !!s.sampleComplete,
        observationDurationMs: typeof s.observationDurationMs === 'number' ? s.observationDurationMs : 6000,
        isTrustedEventsCount: typeof s.trustedInputCount === 'number' ? s.trustedInputCount : (typeof s.isTrustedEventsCount === 'number' ? s.isTrustedEventsCount : 0),
        touchMismatch: !!s.touchMismatch,
        suspiciousUA: !!s.suspiciousUA,
        tokenPresented: Boolean(s.token || (typeof req.token === 'string' && req.token.length > 0)),
        tokenVerified: false,
        tokenFreshnessMs: typeof s.tokenFreshnessMs === 'number' ? s.tokenFreshnessMs : 100
      };
      if (s.token || req.token) {
        (resSignals as any)._rawToken = s.token || req.token;
      }
      return resSignals;
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
    const rawToken = body.token || req.token || getHeader('x-sentinel-token');

    const signals: TelemetrySignals = {
      webdriver: isWebdriver,
      telemetryObserved: body.telemetry_observed !== undefined ? !!body.telemetry_observed : (body.trusted_events !== undefined),
      sampleComplete: body.sample_complete !== undefined ? !!body.sample_complete : false,
      observationDurationMs: typeof body.observation_duration_ms === 'number' ? body.observation_duration_ms : 6000,
      isTrustedEventsCount: typeof body.trusted_events === 'number' ? body.trusted_events : 0,
      touchMismatch: isTouchMismatch,
      suspiciousUA: isSuspiciousUA,
      claimedBot: body.claimed_bot || (ua.includes('Bot') ? 'claimed_bot' : undefined),
      tokenPresented: Boolean(rawToken),
      tokenVerified: false,
      tokenFreshnessMs: body.timestamp ? Math.max(0, Date.now() - body.timestamp) : 100
    };

    if (rawToken) {
      (signals as any)._rawToken = rawToken;
    }

    return signals;
  }

  /**
   * 3-Tier Attestation Pipeline:
   * 1. Sanity & Out-of-Bounds Clamping
   * 2. Cryptographic Token HMAC-SHA256 Signature & Structure Verification
   * 3. Token Freshness Window Check & Custom Verifier Hook
   */
  async verify(signals: TelemetrySignals, rawToken?: string): Promise<TelemetrySignals> {
    if (!signals || typeof signals !== 'object') {
      return {};
    }

    const observationDurationMs = typeof signals.observationDurationMs === 'number' && !isNaN(signals.observationDurationMs)
      ? Math.max(0, Math.min(86400000, signals.observationDurationMs))
      : 6000;

    const isTrustedEventsCount = typeof signals.isTrustedEventsCount === 'number' && !isNaN(signals.isTrustedEventsCount)
      ? Math.max(0, Math.floor(signals.isTrustedEventsCount))
      : 0;

    const burstCount10s = typeof signals.burstCount10s === 'number' && !isNaN(signals.burstCount10s)
      ? Math.max(1, Math.floor(signals.burstCount10s))
      : 1;

    let tokenFreshnessMs = typeof signals.tokenFreshnessMs === 'number' && !isNaN(signals.tokenFreshnessMs)
      ? Math.max(0, signals.tokenFreshnessMs)
      : 0;

    const actualToken = rawToken || (signals as any)?._rawToken || (signals as any)?.token;
    const tokenPresented = Boolean(signals.tokenPresented || actualToken);
    let tokenVerified = false;
    let suspiciousUA = Boolean(signals.suspiciousUA);

    const maxAge = typeof this.maxTokenAgeMs === 'number' && this.maxTokenAgeMs > 0
      ? this.maxTokenAgeMs
      : 300000; // 5 minutes freshness window

    if (tokenPresented) {
      const isFresh = tokenFreshnessMs >= 0 && tokenFreshnessMs <= maxAge;

      if (typeof actualToken === 'string' && actualToken.length > 0) {
        if (actualToken.startsWith('v1.')) {
          // 1. Structured Sentinel Token Verification (HMAC / Format / Timestamp)
          const verification = verifySentinelToken(actualToken, this.secretKey, { maxAgeMs: maxAge });

          if (verification.valid) {
            tokenFreshnessMs = verification.ageMs !== undefined ? Math.max(0, verification.ageMs) : tokenFreshnessMs;

            if (this.tokenVerifier) {
              try {
                tokenVerified = Boolean(await this.tokenVerifier(actualToken, signals));
              } catch {
                tokenVerified = false;
              }
            } else {
              tokenVerified = true;
            }
          } else {
            tokenVerified = false;
            if (verification.reason === 'INVALID_SIGNATURE') {
              suspiciousUA = true; // Flag signature tampering
            }
          }
        } else if (this.tokenVerifier) {
          // 2. Custom Token Verifier hook with freshness constraint
          if (isFresh) {
            try {
              tokenVerified = Boolean(await this.tokenVerifier(actualToken, signals));
            } catch {
              tokenVerified = false;
            }
          } else {
            tokenVerified = false;
          }
        } else {
          // 3. Simple Token with freshness window
          tokenVerified = isFresh;
        }
      } else {
        if (this.tokenVerifier) {
          if (isFresh) {
            try {
              tokenVerified = Boolean(await this.tokenVerifier('', signals));
            } catch {
              tokenVerified = false;
            }
          } else {
            tokenVerified = false;
          }
        } else {
          tokenVerified = isFresh;
        }
      }
    }

    return {
      webdriver: Boolean(signals.webdriver),
      telemetryObserved: Boolean(signals.telemetryObserved),
      sampleComplete: Boolean(signals.sampleComplete),
      touchMismatch: Boolean(signals.touchMismatch),
      suspiciousUA,
      claimedBot: signals.claimedBot ? String(signals.claimedBot) : undefined,
      observationDurationMs,
      isTrustedEventsCount,
      burstCount10s,
      tokenPresented,
      tokenVerified,
      tokenFreshnessMs
    };
  }

  /**
   * Resolves AI crawler/agent requests to optimized GEO Markdown payloads with exact bandwidth savings calculation.
   * Returns null if the request does not match any recognized AI/search/social crawler.
   */
  resolveGeoPayload(req: any, options?: GeoBaselineOptions): GeoResolutionResult | null {
    const mergedOptions: GeoBaselineOptions = {
      defaultBaselineBytes: options?.defaultBaselineBytes !== undefined
        ? options.defaultBaselineBytes
        : this.geoBaseline?.defaultBaselineBytes,
      routeBaselines: {
        ...(this.geoBaseline?.routeBaselines || {}),
        ...(options?.routeBaselines || {})
      },
      payloadResolver: options?.payloadResolver || this.geoBaseline?.payloadResolver
    };
    return resolveGeoPayloadCore(req, mergedOptions);
  }

  /**
   * Standard factory to construct a transparent Fail-Open Degraded Risk Report during unhandled host/runtime errors.
   */
  createDegradedReport(error: any, options?: DegradedReportOptions): SentinelRiskReport {
    return createDegradedReport(error, {
      enforcementMode: this.mode === 'enforce' ? 'ENFORCE' : 'SHADOW',
      policyVersion: this.policy?.version,
      ...options
    });
  }
}

export function createSentinel(options: SentinelOptions = {}): Sentinel {
  return new Sentinel(options);
}

export const sentinel = new Sentinel();

/**
 * Standalone helper to resolve AI crawler GEO Markdown payloads and bandwidth savings directly.
 */
export function resolveGeoPayload(req: any, options?: GeoBaselineOptions): GeoResolutionResult | null {
  return resolveGeoPayloadCore(req, options);
}
