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

// 3. Custom Policy & Rules Contract
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

// 4. Store Adapters Type Contract
const storeOptions: RiskEventStoreOptions = { maxItems: 50, maxAgeMs: 86400000 };
const counterStore: CounterStore = new MemoryFixedWindowCounterStore();
const memoryEventStore: RiskEventStore = new MemoryRiskEventStore(storeOptions);
const localEventStore: RiskEventStore = new LocalStorageRiskEventStore(storeOptions);

// 5. Facade Options & Instance Contract
const sentinelOptions: SentinelOptions = {
  mode: 'shadow',
  policy: customPolicy,
  counterStore,
  eventStore: memoryEventStore,
  rateKeyProvider: (req: any) => (req?.customUserId ? `user_${req.customUserId}` : null)
};

const sentinel: Sentinel = createSentinel(sentinelOptions);

// 6. Execution & Schema Validation Contract
async function runFullTypeCheck(): Promise<void> {
  const reqMock = { signals, customUserId: 'dev-type-verifier' };
  const report: SentinelRiskReport = await sentinel.score(reqMock);

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

  console.log(`[TypeScript Contract Gate] ALL SDK Types & Interfaces 100% Verified.`);
  console.log(`  - TraceId: ${report.traceId}`);
  console.log(`  - Confidence: ${confidence}`);
  console.log(`  - Action: ${report.action} (Recommended: ${report.recommendedAction})`);
  console.log(`  - SessionId: ${sessionId}`);
  console.log(`  - Direct Score: ${directEngineReport.score}`);
}

runFullTypeCheck();
