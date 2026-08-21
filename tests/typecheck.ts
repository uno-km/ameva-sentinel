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
  type StoredRiskEventV2,
  type StoredRiskEvent,
  type CounterStore,
  type RiskEventStore,
  type SentinelPolicy,
  type TelemetrySignals,
  type UntrustedTelemetrySignals,
  type TrafficTargetMode,
  type BotCategory,
  type BotIdentityState,
  type BotClassificationResult,
  type DecisionReasonCode,
  type RedirectDestinationId,
  type SentinelDecision,
  type BotRoutingRule,
  type BotPolicyConfig,
  type VerifiedCollectorContext,
  type VerificationOutcome,
  type KeyResolver,
  type NonceStore,
  SentinelAction,
  defaultPolicy,
  createPolicy,
  rules,
  evaluate,
  evaluateVerified,
  classifyBot,
  resolveDecision,
  createTraceId,
  toStoredRiskEvent,
  toStoredRiskEventV1,
  isStoredRiskEvent,
  isStoredRiskEventV1,
  isStoredRiskEventV2,
  sanitizeSignals,
  signCollectorToken,
  verifyCollectorToken,
  isVerifiedCollectorContext,
  readJsonBodyLimited,
  MemoryNonceStore,
  StaticKeyResolver,
  validateRedirectUrl
} from '../packages/sentinel/dist/index.js';

import {
  calculateConfidence,
  type RuleAttributes,
  type EvidenceItem,
  type EnforcementMode,
  type EvaluateOptions,
  type RiskEventStoreOptions,
  type MinimalDerivedSignals,
  type SanitizedEvidence,
  type InternalDecisionTrustState
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
  userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1)',
  botCategory: 'SEARCH_ENGINE' as BotCategory,
  burstCount10s: 3,
  tokenPresented: true,
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

// 4. Bot Policy & Routing Rules Type Contract
const botRouting: BotRoutingRule = {
  action: SentinelAction.REDIRECT,
  destinationId: 'AI_FEED' as RedirectDestinationId,
  statusCode: 302,
  reasonCode: 'CATEGORY_ROUTING_REDIRECT' as DecisionReasonCode
};

const botPolicyConfig: BotPolicyConfig = {
  targetMode: 'ANY' as TrafficTargetMode,
  allowlist: ['SEARCH_ENGINE' as BotCategory, 'Googlebot'],
  denylist: ['AUTOMATED_TOOL' as BotCategory],
  categoryRouting: {
    AI_AGENT: botRouting
  },
  unknownBotAction: {
    action: SentinelAction.OBSERVE,
    reasonCode: 'BASELINE_CLEAN'
  },
  heuristicClassification: true
};

// 5. Custom Policy & Rules Contract
const customPolicy: SentinelPolicy = createPolicy({
  rules: [
    rules.webdriver({ weight: 30 }),
    rules.burst({ weight: 35, threshold: 20 }),
    rules.trustedInputAbsent({ weight: 20 }),
    rules.touchMismatch({ weight: 15 }),
    rules.suspiciousUA({ weight: 15 }),
    rules.botClassification({ weight: 30 })
  ],
  version: '2026-08-21.v0.6-typecheck',
  botPolicy: botPolicyConfig
});

// 6. Store Adapters Type Contract
const storeOptions: RiskEventStoreOptions = { maxItems: 50, maxAgeMs: 86400000 };
const counterStore: CounterStore = new MemoryFixedWindowCounterStore();
const altCounterStore: CounterStore = new MemoryCounterStore();
const memoryEventStore: RiskEventStore = new MemoryRiskEventStore(storeOptions);
const localEventStore: RiskEventStore = new LocalStorageRiskEventStore(storeOptions);

// 7. Crypto & Token Verifier Type Contract
const keyResolver: KeyResolver = new StaticKeyResolver({ 'collector-key-2026-a': 'test-secret' });
const nonceStore: NonceStore = new MemoryNonceStore();

// 8. Facade Options & Instance Contract
const sentinelOptions: SentinelOptions = {
  mode: 'shadow',
  policy: customPolicy,
  counterStore,
  eventStore: memoryEventStore,
  keyResolver,
  nonceStore,
  expectedAudience: 'sentinel-typecheck',
  expectedPurpose: 'telemetry-collect',
  allowedIssuers: ['ameva-auth'],
  rateKeyProvider: (req: any) => (req?.customUserId ? `user_${req.customUserId}` : null),
  redirectRegistry: {
    AI_FEED: 'https://example.com/llms.txt',
    BOT_GUIDANCE: '/guidance'
  },
  allowedRedirectHosts: ['example.com']
};

const sentinel: Sentinel = createSentinel(sentinelOptions);

async function runFullStaticTypeCheck(): Promise<void> {
  const reqMock = { signals, customUserId: 'dev-type-verifier' };
  const report: SentinelRiskReport = await sentinel.score(reqMock);

  const evalOptions: EvaluateOptions = {
    policy: defaultPolicy,
    enforcementMode: 'SHADOW' as EnforcementMode
  };

  const token = signCollectorToken({
    v: 1,
    kid: 'collector-key-2026-a',
    iss: 'ameva-auth',
    aud: 'sentinel-typecheck',
    purpose: 'telemetry-collect',
    sessionRef: 'sess_typecheck_1',
    iat: Date.now(),
    exp: Date.now() + 60000,
    nonce: 'nonce_typecheck_1'
  }, 'test-secret');

  const authenticContext: VerifiedCollectorContext = await verifyCollectorToken(token, keyResolver, nonceStore, {
    expectedAudience: 'sentinel-typecheck',
    expectedPurpose: 'telemetry-collect',
    allowedIssuers: ['ameva-auth']
  });

  const directEngineReport: SentinelRiskReport = evaluate(signals, evalOptions);
  const verifiedReport: SentinelRiskReport = evaluateVerified(signals, authenticContext, evalOptions);

  const classification: BotClassificationResult = classifyBot(signals.userAgent, signals);
  const decision: SentinelDecision = resolveDecision({
    score: report.score,
    recommendedScoreAction: report.recommendedAction,
    classification,
    signals,
    botPolicy: botPolicyConfig,
    enforcementMode: 'SHADOW'
  }, { isVerified: true });

  const storedV1: StoredRiskEventV1 = toStoredRiskEventV1(report);
  const storedV2: StoredRiskEventV2 = toStoredRiskEvent(report);
  const isV1: boolean = isStoredRiskEventV1(storedV1);
  const isV2: boolean = isStoredRiskEventV2(storedV2);
  const isUniversal: boolean = isStoredRiskEvent(storedV2);

  const urlCheck = validateRedirectUrl('/llms.txt', { allowRelative: true });
  const bodyCheck = await readJsonBodyLimited({ body: '{"ok":true}' });

  void isV1;
  void isV2;
  void isUniversal;
  void urlCheck;
  void bodyCheck;
  void decision;
  void verifiedReport;
  void directEngineReport;
  void altCounterStore;
  void localEventStore;
  void defaultBrowserCollector;
  void sanitizedMinimal;
  void confidence;
  void sampleSanitizedEvidence;
}

runFullStaticTypeCheck();
