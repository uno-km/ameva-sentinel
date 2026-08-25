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
  normalizeAllowedHost,
  CollectorVerificationError,
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
  createTraceId,
  AsyncRingBufferSink,
  CompositeSink,
  NullSink,
  HeuristicProfileEngine,
  PathFlowAggregator,
  SnapshotCache,
  SingleflightCoalescer,
  maskIpAddress,
  GeoDeliveryEngine
} from '@ameva/sentinel-risk-core';

import type {
  GeoDeliveryConfig,
  GeoDeliveryResult,
  GeoDeliveryLogRecord,
  GeoAnalyticsSummary,
  SentinelRiskReport,
  TelemetrySignals,
  UntrustedTelemetrySignals,
  SentinelPolicy,
  StoredRiskEvent,
  StoredRiskEventV1,
  StoredRiskEventV2,
  CounterStore,
  RiskEventStore,
  EventSink,
  StreamRecord,
  RiskEventRecord,
  RingBufferStats,
  RingBufferOverflowPolicy,
  AsyncRingBufferOptions,
  CompositeSinkOptions,
  DistributedNonceStore,
  DistributedCounterStore,
  DistributedRiskEventStore,
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
  NonceStore,
  ForensicFootprint,
  VisitorPersona,
  HeuristicVerdict,
  PathFlowNode,
  PathFlowLink,
  PathFlowMatrix,
  TriageCategory,
  TriageAnalyticsBreakdown
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
  normalizeAllowedHost,
  CollectorVerificationError,
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
  createTraceId,
  AsyncRingBufferSink,
  CompositeSink,
  NullSink,
  HeuristicProfileEngine,
  PathFlowAggregator
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
  EventSink,
  StreamRecord,
  RiskEventRecord,
  RingBufferStats,
  RingBufferOverflowPolicy,
  AsyncRingBufferOptions,
  CompositeSinkOptions,
  DistributedNonceStore,
  DistributedCounterStore,
  DistributedRiskEventStore,
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
  NonceStore,
  ForensicFootprint,
  VisitorPersona,
  HeuristicVerdict,
  PathFlowNode,
  PathFlowLink,
  PathFlowMatrix,
  TriageCategory,
  TriageAnalyticsBreakdown
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
  allowRedirectSubdomains?: boolean;
  keyResolver?: KeyResolver;
  nonceStore?: NonceStore;
  expectedAudience?: string;
  expectedPurpose?: string;
  allowedIssuers?: string[];
  stateFailureMode?: StateFailureMode;
  onOperationalError?: (err: Error, context: string) => void;
  eventSink?: EventSink;
  geo?: GeoDeliveryConfig;
  timezone?: string;
  locale?: string;
}

export class Sentinel {
  private globalAnalyticsCache = new SnapshotCache<ForensicAnalyticsReport>({ ttlMs: 5000 });
  private policy: SentinelPolicy;
  private mode: 'shadow' | 'enforce';
  private counterStore: CounterStore;
  private eventStore: RiskEventStore | null;
  private eventSink?: EventSink;
  private rateKeyProvider?: (req: any) => string | null;
  private redirectRegistry: Record<string, string>;
  private allowedRedirectHosts?: string[];
  private allowRedirectSubdomains: boolean;
  private keyResolver?: KeyResolver;
  private nonceStore: NonceStore;
  private expectedAudience?: string;
  private expectedPurpose: string;
  private allowedIssuers?: string[];
  private stateFailureMode: StateFailureMode;
  private onOperationalError?: (err: Error, context: string) => void;
  public geoEngine: GeoDeliveryEngine;
  private timezone?: string;
  private locale?: string;

  constructor(options: SentinelOptions = {}) {
    this.policy = options.policy || defaultPolicy;
    this.mode = options.mode || 'shadow';
    this.counterStore = options.counterStore || new MemoryFixedWindowCounterStore();
    this.eventStore = options.eventStore || null;
    this.eventSink = options.eventSink;
    this.rateKeyProvider = options.rateKeyProvider;
    this.keyResolver = options.keyResolver;
    this.nonceStore = options.nonceStore || new MemoryNonceStore();
    this.expectedAudience = options.expectedAudience;
    this.expectedPurpose = options.expectedPurpose || 'telemetry-collect';
    this.allowedIssuers = options.allowedIssuers;
    this.stateFailureMode = options.stateFailureMode || 'OBSERVE_ONLY';
    this.onOperationalError = options.onOperationalError;
    this.allowedRedirectHosts = options.allowedRedirectHosts;
    this.allowRedirectSubdomains = options.allowRedirectSubdomains ?? true;
    this.geoEngine = new GeoDeliveryEngine(options.geo);
    this.timezone = options.timezone;
    this.locale = options.locale;

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
        allowSubdomains: this.allowRedirectSubdomains,
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
      enforcementMode: this.mode === 'enforce' ? 'ENFORCE' : 'SHADOW',
      timezone: this.timezone,
      locale: this.locale
    });

    // Synthesize server-side footprint even for pure HTTP non-JS requests
    const footprint = this.synthesizeFootprint(report, req);
    if (!report.signals) report.signals = enrichedSignals;
    report.signals.triageCategory = footprint.triageCategory;
    report.signals.vendorGroup = footprint.vendorGroup;
    report.signals.customSignals = {
      ...(report.signals.customSignals || {}),
      webglRenderer: footprint.webglRenderer,
      webglVendor: footprint.webglVendor,
      country: footprint.country,
      city: footprint.city,
      totalVisitCount: footprint.totalVisitCount,
      pastPathsHistory: footprint.pastPathsHistory
    };

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

    if (this.eventSink) {
      const stored = toStoredRiskEvent(report);
      const record: RiskEventRecord = {
        ...stored,
        kind: 'risk_event',
        id: stored.traceId,
        timestamp: stored.evaluatedAt
      };
      try {
        const emitRes = this.eventSink.emit(record);
        if (emitRes && typeof (emitRes as Promise<void>).catch === 'function') {
          (emitRes as Promise<void>).catch(err => {
            this.handleOperationalError(err, 'eventSink.emit');
          });
        }
      } catch (err: any) {
        this.handleOperationalError(err, 'eventSink.emit');
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

    // Safe 64KB bounded body reader - validation errors throw unconditionally
    let body: any = {};
    try {
      body = await readJsonBodyLimited(req, 65536);
    } catch (err: any) {
      this.handleOperationalError(err, 'readJsonBodyLimited');
      throw err;
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
      typeof signalInput.telemetryObserved === 'boolean'
        ? signalInput.telemetryObserved
        : typeof body?.telemetry_observed === 'boolean'
          ? body.telemetry_observed
          : (body?.trusted_events !== undefined);

    const sampleComplete =
      typeof signalInput.sampleComplete === 'boolean'
        ? signalInput.sampleComplete
        : typeof body?.sample_complete === 'boolean'
          ? body.sample_complete
          : false;

    const userAgent =
      typeof signalInput.userAgent === 'string'
        ? signalInput.userAgent
        : ua || undefined;

    const isHeadlessRenderer =
      signalInput.isHeadlessRenderer === true ||
      body?.is_headless_renderer === true;

    const headlessEvasionsDetected =
      signalInput.headlessEvasionsDetected === true ||
      body?.headless_evasions_detected === true;

    const webglRenderer =
      typeof signalInput.webglRenderer === 'string'
        ? signalInput.webglRenderer
        : body?.webgl_renderer || undefined;

    const webglVendor =
      typeof signalInput.webglVendor === 'string'
        ? signalInput.webglVendor
        : body?.webgl_vendor || undefined;

    // Detect missing standard browser headers when User-Agent claims to be a modern desktop browser
    const isBrowserUA = /Mozilla\/5\.0/i.test(ua) && /Chrome|Safari|Firefox|Edge|Edg/i.test(ua) && !/bot|crawler|spider|scraper|HeadlessChrome/i.test(ua);
    const isChromeLike = /Chrome\/\d+/i.test(ua) && !/bot|crawler|spider|scraper|HeadlessChrome/i.test(ua);
    const hasSecChUa = Boolean(getHeader('sec-ch-ua') || getHeader('sec-ch-ua-mobile') || getHeader('sec-ch-ua-platform'));
    const hasSecFetchDest = Boolean(getHeader('sec-fetch-dest'));
    const acceptLang = getHeader('accept-language');
    const isFakeAcceptLang = !acceptLang || acceptLang === '*';

    const isHttpMissingHeaders = isChromeLike ? (!hasSecChUa || isFakeAcceptLang) : (isBrowserUA && isFakeAcceptLang);

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
        isHeadlessRenderer,
        headlessEvasionsDetected,
        httpMissingHeaders: isHttpMissingHeaders,
        webglRenderer,
        webglVendor,
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
      return {
        state: 'FAILED',
        context: null,
        error: 'VERIFIER_CONFIGURATION_MISSING'
      };
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
      // If store capacity reached (503 Service Unavailable), rethrow directly to propagate HTTP 503
      if (err instanceof CollectorVerificationError && err.code === 'NONCE_STORE_CAPACITY_REACHED') {
        throw err;
      }
      return {
        state: 'FAILED',
        context: null,
        error: err.code || err.message
      };
    }
  }

  /**
   * Synthesize a server-side Forensic Footprint for requests even without client JavaScript.
   */
  synthesizeFootprint(report: SentinelRiskReport, req?: any): ForensicFootprint {
    const sig = report.signals || {};
    const ip = req?.ip || req?.headers?.['x-forwarded-for'] || req?.headers?.['x-real-ip'] || '127.0.0.1';
    const cleanIp = String(ip).split(',')[0].trim();
    const maskedIp = this.maskIpAddress(cleanIp);
    const visitorId = req?.sessionId || req?.testClientId || `anon_${maskedIp.replace(/[^a-zA-Z0-9]/g, '_')}`;

    return {
      visitorId,
      ipAddress: maskedIp,
      webglRenderer: sig.webglRenderer || (sig.telemetryObserved ? 'unknown' : 'server-http-client'),
      webglVendor: sig.webglVendor || (sig.telemetryObserved ? 'unknown' : 'server-http-client'),
      country: (req?.headers?.['cf-ipcountry'] as string) || (req?.headers?.['x-country-code'] as string) || 'GLOBAL',
      city: (req?.headers?.['cf-ipcity'] as string) || 'Edge',
      totalVisitCount: Number(sig.totalVisitCount || 1),
      pastPathsHistory: typeof req?.url === 'string' ? req.url : (sig.pastPathsHistory || '/'),
      triageCategory: report.classification?.triageCategory || 'HUMAN',
      vendorGroup: report.classification?.vendorGroup || 'HumanUser',
      capturedAt: report.evaluatedAt
    };
  }

  /**
   * Evaluate a single forensic footprint and generate natural language persona verdict.
   */
  profileFootprint(footprint: ForensicFootprint): HeuristicVerdict {
    return HeuristicProfileEngine.profileSession(footprint);
  }

  /**
   * Parse an array of raw path history strings and aggregate into a Sankey transition matrix.
   */
  aggregatePathFlows(paths: (string | null | undefined)[]): PathFlowMatrix {
    return PathFlowAggregator.aggregateFlows(paths);
  }

  /**
   * Mask IP address for privacy compliance (GDPR / CCPA).
   */
  maskIpAddress(ip: string | null | undefined): string {
    return maskIpAddress(ip);
  }

  /**
   * Evaluates incoming request and negotiates optimized Markdown for AI Agents (GEO).
   */
  resolveGeoPayload(req: any): GeoDeliveryResult {
    return this.geoEngine.resolveGeoPayload(req);
  }

  /**
   * Cached headless forensic analytics with in-memory SWR.
   */
  async getForensicAnalyticsCached(fetcher: () => Promise<ForensicAnalyticsReport>, cacheKey: string = 'global_analytics'): Promise<ForensicAnalyticsReport> {
    return this.globalAnalyticsCache.getOrFetch(cacheKey, fetcher);
  }

  /**
   * Headless Forensic Analytics Engine: transforms raw footprints and risk events into
   * executive persona verdicts, transition flow matrices, 3-category triage breakdowns, and overview KPI stats.
   */
  getForensicAnalytics(input: ForensicAnalyticsInput): ForensicAnalyticsReport {
    const rawFootprints: ForensicFootprint[] = [...(input.footprints || [])];

    // Map stored risk events to forensic footprints if provided
    if (input.events) {
      for (const ev of input.events) {
        if (!ev) continue;
        const sig = ev.signals || {};
        const classification = ev.classification || {};
        rawFootprints.push({
          visitorId: ev.sessionId || ev.traceId || 'anon_visitor',
          webglRenderer: (sig.webglRenderer as string) || (sig.customSignals?.webglRenderer as string) || (sig.customSignals?.gpuRenderer as string) || 'server-http-client',
          installedFonts: (sig.customSignals?.installedFonts as string) || '',
          country: (sig.customSignals?.country as string) || 'GLOBAL',
          city: (sig.customSignals?.city as string) || 'Edge',
          totalVisitCount: Number(sig.totalVisitCount || sig.customSignals?.totalVisitCount || 1),
          pastPathsHistory: (sig.pastPathsHistory as string) || (sig.customSignals?.pastPathsHistory as string) || '/',
          isCharging: Boolean(sig.customSignals?.isCharging),
          screenHz: Number(sig.customSignals?.screenHz || 60),
          triageCategory: classification.triageCategory || (classification.category === 'AI_AGENT' ? 'AI_AGENT' : classification.category === 'AUTOMATED_TOOL' || classification.category === 'SEARCH_ENGINE' ? 'CRAWLER_TOOL' : 'HUMAN'),
          vendorGroup: classification.vendorGroup || classification.claimedName || 'HumanUser',
          capturedAt: ev.timestamp ? new Date(ev.timestamp).toISOString() : (ev.evaluatedAt || new Date().toISOString())
        });
      }
    }

    const uniqueVisitorIds = new Set<string>();
    let botCount = 0;
    let engineerCount = 0;
    let powerUserCount = 0;
    let standardCount = 0;
    const verdicts: HeuristicVerdict[] = [];
    const pathStrings: string[] = [];

    const triageBreakdown: TriageAnalyticsBreakdown = {
      human: {
        total: 0,
        softwareEngineer: 0,
        powerUser: 0,
        desktopStandard: 0,
        mobileCasual: 0
      },
      aiAgent: {
        total: 0,
        openAi: 0,
        anthropic: 0,
        google: 0,
        perplexity: 0,
        byteDance: 0,
        commonCrawl: 0,
        cohere: 0,
        otherAi: 0,
        byVendor: {}
      },
      crawlerTool: {
        total: 0,
        searchEngine: 0,
        headlessDriver: 0,
        cliTool: 0,
        otherCrawler: 0,
        byTool: {}
      }
    };

    for (const fp of rawFootprints) {
      uniqueVisitorIds.add(fp.visitorId);
      const verdict = HeuristicProfileEngine.profileSession(fp);
      verdicts.push(verdict);

      const triageCat: TriageCategory = fp.triageCategory || (verdict.persona === 'CLOUD_AUTOMATION_BOT' || verdict.persona === 'HEADLESS_SCRAPER' ? 'CRAWLER_TOOL' : 'HUMAN');
      const vendor = fp.vendorGroup || 'Unknown';

      if (triageCat === 'HUMAN') {
        triageBreakdown.human.total++;
        if (verdict.persona === 'SOFTWARE_ENGINEER') {
          triageBreakdown.human.softwareEngineer++;
          engineerCount++;
        } else if (verdict.persona === 'POWER_USER') {
          triageBreakdown.human.powerUser++;
          powerUserCount++;
        } else if (verdict.persona === 'MOBILE_CASUAL') {
          triageBreakdown.human.mobileCasual++;
          standardCount++;
        } else {
          triageBreakdown.human.desktopStandard++;
          standardCount++;
        }
      } else if (triageCat === 'AI_AGENT') {
        triageBreakdown.aiAgent.total++;
        botCount++;
        triageBreakdown.aiAgent.byVendor[vendor] = (triageBreakdown.aiAgent.byVendor[vendor] || 0) + 1;
        const vLower = vendor.toLowerCase();
        if (vLower.includes('openai') || vLower.includes('gpt')) triageBreakdown.aiAgent.openAi++;
        else if (vLower.includes('anthropic') || vLower.includes('claude')) triageBreakdown.aiAgent.anthropic++;
        else if (vLower.includes('google')) triageBreakdown.aiAgent.google++;
        else if (vLower.includes('perplexity')) triageBreakdown.aiAgent.perplexity++;
        else if (vLower.includes('bytedance') || vLower.includes('bytespider')) triageBreakdown.aiAgent.byteDance++;
        else if (vLower.includes('commoncrawl') || vLower.includes('ccbot')) triageBreakdown.aiAgent.commonCrawl++;
        else if (vLower.includes('cohere')) triageBreakdown.aiAgent.cohere++;
        else triageBreakdown.aiAgent.otherAi++;
      } else {
        triageBreakdown.crawlerTool.total++;
        botCount++;
        triageBreakdown.crawlerTool.byTool[vendor] = (triageBreakdown.crawlerTool.byTool[vendor] || 0) + 1;
        const vLower = vendor.toLowerCase();
        if (vLower.includes('searchengine') || vLower.includes('googlebot') || vLower.includes('bingbot')) triageBreakdown.crawlerTool.searchEngine++;
        else if (vLower.includes('headlessdriver') || vLower.includes('playwright') || vLower.includes('puppeteer')) triageBreakdown.crawlerTool.headlessDriver++;
        else if (vLower.includes('clitool') || vLower.includes('curl') || vLower.includes('python')) triageBreakdown.crawlerTool.cliTool++;
        else triageBreakdown.crawlerTool.otherCrawler++;
      }

      if (fp.pastPathsHistory) {
        pathStrings.push(fp.pastPathsHistory);
      }
    }

    const flowMatrix = PathFlowAggregator.aggregateFlows(pathStrings);
    const geoDeliveryStats = GeoDeliveryEngine.aggregateGeoAnalytics(input.geoLogs || []);

    return {
      overview: {
        totalRecords: rawFootprints.length,
        totalUniqueVisitors: uniqueVisitorIds.size,
        botCount,
        engineerCount,
        powerUserCount,
        standardCount
      },
      triageBreakdown,
      geoDeliveryStats,
      verdicts,
      flowMatrix,
      generatedAt: new Date().toISOString()
    };
  }

  private handleOperationalError(err: Error, context: string): void {
    if (this.onOperationalError) {
      try {
        this.onOperationalError(err, context);
      } catch (e) {}
    }
  }
}

export interface ForensicAnalyticsInput {
  footprints?: ForensicFootprint[];
  events?: (StoredRiskEvent | any)[];
  geoLogs?: GeoDeliveryLogRecord[];
  topPathsCap?: number;
}

export interface ForensicAnalyticsReport {
  overview: {
    totalRecords: number;
    totalUniqueVisitors: number;
    botCount: number;
    engineerCount: number;
    powerUserCount: number;
    standardCount: number;
  };
  triageBreakdown?: TriageAnalyticsBreakdown;
  geoDeliveryStats?: GeoAnalyticsSummary;
  verdicts: HeuristicVerdict[];
  flowMatrix: PathFlowMatrix;
  generatedAt: string;
}

export function createSentinel(options: SentinelOptions = {}): Sentinel {
  return new Sentinel(options);
}

export const sentinel = new Sentinel();

export { maskIpAddress, SnapshotCache, SingleflightCoalescer };
