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
  SentinelAction,
  defaultPolicy,
  createPolicy,
  rules,
  evaluate,
  classifyBot,
  resolveDecision,
  createTraceId,
  toStoredRiskEvent,
  sanitizeSignals
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

// 2. Verified Collector Context Brand Contract
const sampleVerifiedContext: VerifiedCollectorContext = {
  isVerified: true,
  kid: 'collector-key-2026-a',
  issuer: 'ameva-auth',
  audience: 'ameva-sentinel-collector',
  sessionRef: 'sess_contract_001',
  issuedAt: Date.now(),
  expiresAt: Date.now() + 60000
};

// 3. Telemetry Signal Sanitization & Confidence Contract
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
  tokenVerified: true,
  verifiedContext: sampleVerifiedContext,
  tokenFreshnessMs: 50
};

const sanitizedMinimal: MinimalDerivedSignals = sanitizeSignals(signals);
const confidence: number = calculateConfidence(signals);

// 4. Evidence and Attributes Structural Contract
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

// 5. Bot Policy & Routing Rules Type Contract
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

// 6. Custom Policy & Rules Contract
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

// 7. Store Adapters Type Contract
const storeOptions: RiskEventStoreOptions = { maxItems: 50, maxAgeMs: 86400000 };
const counterStore: CounterStore = new MemoryFixedWindowCounterStore();
const altCounterStore: CounterStore = new MemoryCounterStore();
const memoryEventStore: RiskEventStore = new MemoryRiskEventStore(storeOptions);
const localEventStore: RiskEventStore = new LocalStorageRiskEventStore(storeOptions);

// 8. Facade Options & Instance Contract
const sentinelOptions: SentinelOptions = {
  mode: 'shadow',
  policy: customPolicy,
  counterStore,
  eventStore: memoryEventStore,
  rateKeyProvider: (req: any) => (req?.customUserId ? `user_${req.customUserId}` : null),
  redirectRegistry: {
    AI_FEED: 'https://example.com/llms.txt',
    BOT_GUIDANCE: '/guidance'
  }
};

const sentinel: Sentinel = createSentinel(sentinelOptions);

// 9. Execution & Schema Validation Contract
async function runFullTypeCheck(): Promise<void> {
  const reqMock = { signals, customUserId: 'dev-type-verifier' };
  const report: SentinelRiskReport = await sentinel.score(reqMock);

  const evalOptions: EvaluateOptions = {
    policy: defaultPolicy,
    enforcementMode: 'SHADOW' as EnforcementMode
  };
  const directEngineReport: SentinelRiskReport = evaluate(signals, evalOptions);

  // Pure Classifier execution
  const classification: BotClassificationResult = classifyBot(signals.userAgent, signals);
  if (!classification.isBotLikely || classification.category !== 'SEARCH_ENGINE') {
    throw new Error('BotClassifier contract violation');
  }

  // Pure Decision execution
  const decision: SentinelDecision = resolveDecision({
    score: report.score,
    recommendedScoreAction: report.recommendedAction,
    classification,
    signals,
    botPolicy: botPolicyConfig,
    enforcementMode: 'SHADOW'
  });

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
  void decision;

  console.log(`[TypeScript v0.6.0 Contract Gate] ALL 32+ SDK Types & Interfaces 100% Verified.`);
  console.log(`  - TraceId: ${report.traceId}`);
  console.log(`  - Decision Action: ${report.decision.action} (${report.decision.reasonCode})`);
  console.log(`  - Bot Classification: ${report.classification?.category} (${report.classification?.claimedName})`);
  console.log(`  - Redirect Destination: ${report.redirectTo || 'none'}`);
  console.log(`  - SessionId: ${sessionId}`);
  console.log(`  - Direct Score: ${directEngineReport.score}`);
}

runFullTypeCheck();
