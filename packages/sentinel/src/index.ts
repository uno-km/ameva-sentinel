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
  readJsonBodyLimited,
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
  VerificationOutcome,
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
  readJsonBodyLimited,
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
  VerificationOutcome,
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
      if (!this.allowedIssuers || this.allowedIssuers.length === 0) {
        throw new Error('Sentinel configuration error: non-empty allowedIssuers is mandatory when botPolicy.targetMode is "VERIFIED_PARTNERS_ONLY"');
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
      this.redirectRegistry[destId as RedirectDestinationId] = validation.sanitizedUrl;
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
        if (this.stateFailureMode === 'FAIL_CLOSED') {
          throw err;
        }
      }
    }

    const enrichedSignals: UntrustedTelemetrySignals = {
      ...rawSignals,
      burstCount10s
    };

    // Strict End-to-End Cryptographic Verification Pipeline
    const verificationOutcome = await this.verify(token);

    // Fail-closed enforcement on presented invalid token
    if (verificationOutcome.state === 'FAILED' && this.stateFailureMode === 'FAIL_CLOSED') {
      const errorMsg = verificationOutcome.error || 'Token verification failed';
      throw new Error(`Sentinel security violation: ${errorMsg}`);
    }

    const report = evaluateVerified(enrichedSignals, verificationOutcome.context, {
      policy: this.policy,
      enforcementMode: this.mode === 'enforce' ? 'ENFORCE' : 'SHADOW'
    });

    // Propagate exact verification outcome
    if (verificationOutcome.state === 'FAILED') {
      report.verification = {
        state: 'FAILED',
        error: String(verificationOutcome.error || 'INVALID_TOKEN')
      };
    }

    // Resolve Destination ID against validated closed server registry
    if (report.redirectTo && this.redirectRegistry[report.redirectTo]) {
      report.redirectTo = this.redirectRegistry[report.redirectTo];
    }

    if (this.eventStore && typeof this.eventStore.append === 'function') {
      try {
        await this.eventStore.append(report);
      } catch (err: any) {
        this.handleOperationalError(err, 'eventStore.append');
        if (this.stateFailureMode === 'FAIL_CLOSED') {
          throw err;
        }
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
   * Safe extraction of untrusted telemetry signals and presented token from HTTP/raw request.
   * Extracts headers and signals concurrently without mutually exclusive early returns.
   */
  async collect(req: any): Promise<{ signals: UntrustedTelemetrySignals; token: string | null }> {
    if (!req) return { signals: {}, token: null };

    const headers = req.headers || {};
    const getHeader = (name: string): string => {
      if (typeof headers.get === 'function') return headers.get(name) || '';
      return (
        headers[name] ||
        headers[name.toLowerCase()] ||
        headers[name.toUpperCase()] ||
        ''
      );
    };

    const ua = getHeader('user-agent');
    const secChUaMobile = getHeader('sec-ch-ua-mobile');

    // Extract auth token with priority: 1) Header Bearer -> 2) Custom Header -> 3) signals.token -> 4) body.token
    let token: string | null = null;
    const authHeader = getHeader('authorization');
    const bearerMatch = /^Bearer\s+(.+)$/i.exec(authHeader);
    if (bearerMatch) {
      token = bearerMatch[1].trim();
    } else {
      const customTokenHeader = getHeader('x-ameva-collector-token').trim();
      if (customTokenHeader) token = customTokenHeader;
    }

    const signalInput = req.signals && typeof req.signals === 'object' ? req.signals : {};
    if (!token && typeof signalInput.token === 'string' && signalInput.token.trim()) {
      token = signalInput.token.trim();
    }

    // Safe 64KB bounded body reader
    let body: any = {};
    try {
      body = await readJsonBodyLimited(req, 65536);
    } catch (err: any) {
      this.handleOperationalError(err, 'readJsonBodyLimited');
      if (this.stateFailureMode === 'FAIL_CLOSED') throw err;
    }

    if (!token && typeof body?.token === 'string' && body.token.trim()) {
      token = body.token.trim();
    }

    const isWebdriver =
      signalInput.webdriverObserved === true ||
      signalInput.webdriver === true ||
      body?.webdriver === true ||
      /HeadlessChrome|PhantomJS|Selenium|Playwright/i.test(ua);

    const isTouchMismatch =
      signalInput.touchMismatch === true ||
      (secChUaMobile === '?1' && body?.is_touch === false);

    const isSuspiciousUA =
      signalInput.suspiciousUA === true ||
      ua.length === 0 ||
      /python-requests|curl|wget|scrapy|aiohttp|HeadlessChrome|PhantomJS|Selenium|Playwright/i.test(ua);

    const observationDurationMs =
      typeof signalInput.observationDurationMs === 'number'
        ? signalInput.observationDurationMs
        : typeof body?.observation_duration_ms === 'number'
          ? body.observation_duration_ms
          : 6000;

    const isTrustedEventsCount =
      typeof signalInput.trustedInputCount === 'number'
        ? signalInput.trustedInputCount
        : typeof signalInput.isTrustedEventsCount === 'number'
          ? signalInput.isTrustedEventsCount
          : typeof body?.trusted_events === 'number'
            ? body.trusted_events
            : 0;

    const telemetryObserved =
      signalInput.telemetryObserved === true ||
      body?.telemetry_observed !== undefined
        ? !!body.telemetry_observed
        : (body?.trusted_events !== undefined);

    const sampleComplete =
      signalInput.sampleComplete === true ||
      body?.sample_complete !== undefined
        ? !!body.sample_complete
        : false;

    const userAgent =
      typeof signalInput.userAgent === 'string'
        ? signalInput.userAgent
        : ua || undefined;

    const claimedBot =
      typeof signalInput.claimedBot === 'string'
        ? signalInput.claimedBot
        : body?.claimed_bot || (ua && ua.includes('Bot') ? 'claimed_bot' : undefined);

    const tokenFreshnessMs =
      typeof signalInput.tokenFreshnessMs === 'number'
        ? signalInput.tokenFreshnessMs
        : body?.timestamp ? Date.now() - body.timestamp : 100;

    return {
      signals: {
        webdriver: isWebdriver,
        telemetryObserved,
        sampleComplete,
        observationDurationMs,
        isTrustedEventsCount,
        touchMismatch: isTouchMismatch,
        suspiciousUA: isSuspiciousUA,
        userAgent,
        claimedBot,
        tokenPresented: Boolean(token),
        tokenFreshnessMs
      },
      token
    };
  }

  /**
   * Cryptographically verifies the presented token against the configured KeyResolver and NonceStore
   */
  async verify(token: string | null | undefined): Promise<VerificationOutcome> {
    if (!token) {
      return { state: 'NONE', context: null };
    }

    if (!this.keyResolver || !this.expectedAudience) {
      if (this.policy.botPolicy?.targetMode === 'VERIFIED_PARTNERS_ONLY') {
        return {
          state: 'FAILED',
          context: null,
          error: 'KEY_RESOLVER_NOT_CONFIGURED'
        };
      }
      return { state: 'NONE', context: null };
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
      return { state: 'VERIFIED', context: verified };
    } catch (err: any) {
      this.handleOperationalError(err, 'verifyCollectorToken');
      return {
        state: 'FAILED',
        context: null,
        error: err.code || err.message
      };
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
