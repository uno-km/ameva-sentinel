import {
  createSentinel,
  MemoryFixedWindowCounterStore,
  LocalStorageRiskEventStore,
  type SentinelRiskReport,
  type StoredRiskEventV1
} from '../packages/sentinel/dist/index.js';

import {
  evaluate,
  type TelemetrySignals,
  SentinelAction
} from '../packages/risk-core/dist/index.js';

import {
  createBrowserTelemetry,
  type BrowserTelemetryOptions,
  type BrowserTelemetrySnapshot,
  BrowserTelemetryCollector
} from '../packages/browser-sdk/dist/index.js';

const telemetry: BrowserTelemetryCollector = createBrowserTelemetry({ autoStart: false });
const rawSignals: BrowserTelemetrySnapshot = telemetry.snapshot();

const signals: TelemetrySignals = {
  telemetryObserved: rawSignals.telemetryObserved,
  sampleComplete: rawSignals.sampleComplete,
  observationDurationMs: rawSignals.observationDurationMs,
  webdriver: rawSignals.webdriverObserved,
  isTrustedEventsCount: rawSignals.trustedInputCount,
  touchMismatch: rawSignals.touchMismatch,
  suspiciousUA: rawSignals.suspiciousUA
};

const sentinel = createSentinel({
  mode: 'shadow',
  counterStore: new MemoryFixedWindowCounterStore(),
  eventStore: new LocalStorageRiskEventStore()
});

async function runTypeVerification(): Promise<void> {
  const report: SentinelRiskReport = await sentinel.score({ signals });
  const directEvaluation: SentinelRiskReport = evaluate({
    telemetryObserved: true,
    webdriver: false,
    isTrustedEventsCount: 10
  });

  if (report.action === SentinelAction.OBSERVE && directEvaluation.score >= 0) {
    console.log(`[TypeScript Gate] 100% Type resolution verified: traceId=${report.traceId}`);
  }
}

runTypeVerification();
