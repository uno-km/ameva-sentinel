import {
  createSentinel,
  Sentinel,
  type SentinelOptions,
  MemoryFixedWindowCounterStore,
  MemoryCounterStore,
  MemoryRiskEventStore,
  LocalStorageRiskEventStore,
  type SentinelRiskReport,
  type StoredRiskEventV1,
  type CounterStore,
  type RiskEventStore,
  type SentinelPolicy,
  type TelemetrySignals,
  SentinelAction,
  defaultPolicy,
  createPolicy,
  rules,
  evaluate,
  createTraceId,
  toStoredRiskEvent,
  sanitizeSignals,
  resolveGeoPayload,
  createSentinelToken,
  verifySentinelToken,
  timingSafeEqualHex,
  createDegradedReport,
  type GeoBaselineOptions,
  type GeoResolutionResult,
  type SentinelTokenPayload,
  type TokenVerificationResult,
  type DegradedReportOptions
} from '../packages/sentinel/dist/index.js';

import {
  calculateConfidence,
  isStoredRiskEventV1,
  type RuleAttributes,
  type EvidenceItem,
  type EnforcementMode,
  type EvaluateOptions,
  type RiskEventStoreOptions,
  type MinimalDerivedSignals,
  type SanitizedEvidence
} from '../packages/risk-core/dist/index.js';

import {
  createBrowserTelemetry,
  browserTelemetry,
  BrowserTelemetryCollector,
  type BrowserTelemetryOptions,
  type BrowserTelemetrySnapshot,
  getLocalSessionId
} from '../packages/browser-sdk/dist/index.js';

// 1. Browser SDK & Telemetry Collector Type Contract
const browserOptions: BrowserTelemetryOptions = {
  autoStart: false,
  maxEventsCap: 300,
  pointerSampleIntervalMs: 100,
  samplingWindowMs: 5000
};
const telemetryCollector: BrowserTelemetryCollector = createBrowserTelemetry(browserOptions);
const rawSnapshot: BrowserTelemetrySnapshot = telemetryCollector.snapshot();
const sessionId: string = getLocalSessionId();
const defaultBrowserCollector: BrowserTelemetryCollector = browserTelemetry;

// 2. Telemetry Signal Sanitization & Confidence Contract
const signals: TelemetrySignals = {
  telemetryObserved: rawSnapshot.telemetryObserved,
  sampleComplete: rawSnapshot.sampleComplete,
  observationDurationMs: rawSnapshot.observationDurationMs,
  webdriver: rawSnapshot.webdriverObserved,
  isTrustedEventsCount: rawSnapshot.trustedInputCount,
  touchMismatch: rawSnapshot.touchMismatch,
  suspiciousUA: rawSnapshot.suspiciousUA,
  burstCount10s: 3,
  tokenPresented: true,
  tokenVerified: false,
  tokenFreshnessMs: 50
};

const sanitizedMinimal: MinimalDerivedSignals = sanitizeSignals(signals);
const confidence: number = calculateConfidence(signals);

// 3. Evidence and Attributes Structural Contract
const sampleAttrs: RuleAttributes = {
  observed: true,
  count: 3,
  note: 'contract-test'
};

const sampleEvidence: EvidenceItem = {
  rule: 'contract.test_rule',
  score: 25,
  attributes: sampleAttrs,
  message: 'Contract verification item'
};

const sampleSanitizedEvidence: SanitizedEvidence = {
  rule: sampleEvidence.rule,
  score: sampleEvidence.score,
  attributes: {
    observed: true,
    count: 3,
    note: 'contract-test'
  },
  message: sampleEvidence.message
};

// 4. Custom Policy & Rules Contract
const customPolicy: SentinelPolicy = createPolicy({
  rules: [
    rules.webdriver({ weight: 30 }),
    rules.burst({ weight: 35, threshold: 20 }),
    rules.trustedInputAbsent({ weight: 20 }),
    rules.touchMismatch({ weight: 15 }),
    rules.suspiciousUA({ weight: 15 })
  ],
  version: '2026-08-21.typecheck-v1'
});

// 5. Store Adapters Type Contract
const storeOptions: RiskEventStoreOptions = { maxItems: 50, maxAgeMs: 86400000 };
const counterStore: CounterStore = new MemoryFixedWindowCounterStore();
const altCounterStore: CounterStore = new MemoryCounterStore();
const memoryEventStore: RiskEventStore = new MemoryRiskEventStore(storeOptions);
const localEventStore: RiskEventStore = new LocalStorageRiskEventStore(storeOptions);

// 6. Facade Options & Instance Contract with GEO Baseline & Token Verifier
const geoBaselineConfig: GeoBaselineOptions = {
  defaultBaselineBytes: 180000,
  routeBaselines: {
    '/': 210000,
    '/lib/stt/': 95000,
    '/robots.txt': 500
  }
};

const sentinelOptions: SentinelOptions = {
  mode: 'shadow',
  policy: customPolicy,
  counterStore,
  eventStore: memoryEventStore,
  rateKeyProvider: (req: any) => (req?.customUserId ? `user_${req.customUserId}` : null),
  geoBaseline: geoBaselineConfig,
  maxTokenAgeMs: 300000,
  tokenVerifier: async (token: string, sigs: TelemetrySignals) => token.length > 0 && !!sigs
};

const sentinel: Sentinel = createSentinel(sentinelOptions);

// 7. Execution & Schema Validation Contract
async function runFullTypeCheck(): Promise<void> {
  const reqMock = { signals, customUserId: 'dev-type-verifier' };
  const report: SentinelRiskReport = await sentinel.score(reqMock);

  // GEO resolution type contracts
  const crawlerReq = { headers: { 'user-agent': 'GPTBot/1.2' }, url: '/lib/stt/' };
  const geoResult: GeoResolutionResult | null = sentinel.resolveGeoPayload(crawlerReq);
  if (geoResult) {
    const p: string = geoResult.payload;
    const bName: string = geoResult.botName;
    const bVendor: string = geoResult.botVendor;
    const bCategory: string = geoResult.botCategory;
    const bServed: number = geoResult.bytesServed;
    const oBytes: number = geoResult.originalBytes;
    const bSaved: number = geoResult.bytesSaved;
    const sRatio: number = geoResult.savingsRatio;
    const isSaved: boolean = geoResult.isBandwidthSaved;
    const isBotMatch: boolean = geoResult.isBot;
    void p; void bName; void bVendor; void bCategory; void bServed; void oBytes; void bSaved; void sRatio; void isSaved; void isBotMatch;
  }

  const standaloneGeoResult: GeoResolutionResult | null = resolveGeoPayload(crawlerReq, geoBaselineConfig);
  void standaloneGeoResult;

  // Token Attestation Type Contracts
  const tokenPayload: SentinelTokenPayload = { sessionId: 'type-test-session', timestamp: Date.now() };
  const generatedToken: string = createSentinelToken(tokenPayload, 'test-secret-key');
  const verificationResult: TokenVerificationResult = verifySentinelToken(generatedToken, 'test-secret-key');
  const isTimingSafe: boolean = timingSafeEqualHex('abcd', 'abcd');
  void isTimingSafe;
  if (!verificationResult.valid) {
    throw new Error('Type validation failed: TokenVerificationResult contract check failed');
  }

  // Degraded Report Type Contracts
  const degOpts: DegradedReportOptions = { reason: 'type-test-reason', enforcementMode: 'SHADOW' };
  const degradedRep: SentinelRiskReport = createDegradedReport(new Error('test-err'), degOpts);
  const instanceDegradedRep: SentinelRiskReport = sentinel.createDegradedReport('instance-error', degOpts);
  void degradedRep; void instanceDegradedRep;

  const evalOptions: EvaluateOptions = {
    policy: defaultPolicy,
    enforcementMode: 'SHADOW' as EnforcementMode
  };
  const directEngineReport: SentinelRiskReport = evaluate(signals, evalOptions);

  const storedEvent: StoredRiskEventV1 = toStoredRiskEvent(report);
  const isValidSchema: boolean = isStoredRiskEventV1(storedEvent);

  if (!isValidSchema) {
    throw new Error('Type validation failed: StoredRiskEventV1 runtime guard returned false');
  }

  const generatedTraceId: string = createTraceId();
  if (!generatedTraceId.startsWith('trc_')) {
    throw new Error('TraceId format unexpected');
  }

  // Active method invocations on stores and collectors
  await altCounterStore.increment('contract_test_key', { windowMs: 10000 });
  await memoryEventStore.append(report);
  const listedEvents = await memoryEventStore.list({ limit: 10 });
  if (listedEvents.length === 0) {
    throw new Error('MemoryRiskEventStore append/list contract violation');
  }

  if (sampleSanitizedEvidence.score !== 25 || sampleEvidence.score !== 25) {
    throw new Error('Evidence structure contract violation');
  }

  void localEventStore;
  void defaultBrowserCollector;
  void sanitizedMinimal;

  console.log(`[TypeScript Contract Gate] ALL SDK Types & Interfaces 100% Verified.`);
  console.log(`  - TraceId: ${report.traceId}`);
  console.log(`  - Confidence: ${confidence}`);
  console.log(`  - Action: ${report.action} (Recommended: ${report.recommendedAction})`);
  console.log(`  - SessionId: ${sessionId}`);
  console.log(`  - Direct Score: ${directEngineReport.score}`);
}

runFullTypeCheck();
