# 🛡️ AMEVA-Sentinel — Comprehensive Test Suite & Execution Results Report

> **Generated At**: `2026-08-21T03:06:25.963Z`  
> **Repository**: [https://github.com/uno-km/ameva-sentinel.git](https://github.com/uno-km/ameva-sentinel.git)  
> **Monorepo Version**: `0.5.0-alpha.1`  
> **Execution Engine**: Node.js `v24.16.0` on `win32`

---

## 📊 0-Point Baseline Executive Scorecard

| Test Category | Tests Passed | Execution Time | Score Points | Status |
| :--- | :---: | :---: | :---: | :---: |
| **TypeScript Consumer API Contract** | `1 / 1` | `1456ms` | **15.0 / 15 pts** | 🟢 PASS |
| **Risk Engine Quality Gates** | `7 / 7` | `82ms` | **30.0 / 30 pts** | 🟢 PASS |
| **Facade & State Enforcement** | `3 / 3` | `87ms` | **25.0 / 25 pts** | 🟢 PASS |
| **Persistence & Deep Schema Bounds** | `7 / 7` | `77ms` | **15.0 / 15 pts** | 🟢 PASS |
| **Browser SDK Unit Verification** | `2 / 2` | `75ms` | **15.0 / 15 pts** | 🟢 PASS |
| **Playwright Cross-Browser E2E (9 Tests)** | `9 / 9` | `12598ms` | **E2E Verified** | 🟢 PASS |
| **TOTAL AUDIT SCORE** | **29 Passed / 0 Failed** | **—** | **100.0 / 100 pts (Grade A+)** | 🏆 100% PASS |

---

## 📑 Test Suites Index

- [1. TypeScript Consumer API Contract Gate](#types)
- [2. Risk Core Engine & Boundary Quality Gate Tests](#engine)
- [3. Sentinel Facade & Stateful Rate Enforcement Tests](#sentinel)
- [4. RiskEventStore Persistence & Deep Schema Validation Tests](#store)
- [5. @ameva/sentinel-browser Client Telemetry Unit Tests](#browser)
- [6. Playwright Real-Browser Cross-Browser Integration (Chromium, Firefox, WebKit)](#playwright)
- [6. Workspace Distribution & Packaging Verification (`npm pack --dry-run`)](#packaging)

---

<a id="types"></a>
## 1. TypeScript Consumer API Contract Gate

- **Test File Path**: [`tests/typecheck.ts`](../tests/typecheck.ts)
- **Execution Command**: `npm run test:types`
- **Execution Latency**: `1456 ms`
- **Results**: `1 Passed, 0 Failed`

### 📄 Test Source Code

```javascript
﻿import {
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

// 6. Facade Options & Instance Contract
const sentinelOptions: SentinelOptions = {
  mode: 'shadow',
  policy: customPolicy,
  counterStore,
  eventStore: memoryEventStore,
  rateKeyProvider: (req: any) => (req?.customUserId ? `user_${req.customUserId}` : null)
};

const sentinel: Sentinel = createSentinel(sentinelOptions);

// 7. Execution & Schema Validation Contract
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

```

### 🖥️ Actual Execution Output & Assertion Logs

```text
> ameva-sentinel-monorepo@0.5.0-alpha.1 test:types
> tsc --noEmit tests/typecheck.ts --target es2022 --module NodeNext --moduleResolution NodeNext
```

---

<a id="engine"></a>
## 2. Risk Core Engine & Boundary Quality Gate Tests

- **Test File Path**: [`tests/engine.test.js`](../tests/engine.test.js)
- **Execution Command**: `node tests/engine.test.js`
- **Execution Latency**: `82 ms`
- **Results**: `7 Passed, 0 Failed`

### 📄 Test Source Code

```javascript
/**
 * AMEVA Sentinel - Core Engine Quality Gate & Boundary Test Suite
 */
import assert from 'node:assert';
import { evaluate, calculateConfidence, createPolicy, rules, SentinelAction } from '../packages/risk-core/dist/index.js';

console.log('\n🧪 Running AMEVA Sentinel Quality Gate Test Suite...\n');

let passedTests = 0;
let failedTests = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failedTests++;
  }
}

// ==============================================================================
// 1. Clean Human Baseline (Synthetic Baseline)
// ==============================================================================
it('should classify clean synthetic baseline session as ALLOW with 0 score', () => {
  const signals = {
    webdriver: false,
    burstCount10s: 2,
    telemetryObserved: true,
    observationDurationMs: 10000,
    isTrustedEventsCount: 8,
    tokenVerified: true,
    tokenFreshnessMs: 500
  };

  const report = evaluate(signals, { enforcementMode: 'SHADOW' });
  
  assert.strictEqual(report.score, 0, 'Clean baseline session should have 0 score');
  assert.strictEqual(report.action, SentinelAction.ALLOW, 'Action should be ALLOW');
  assert.strictEqual(report.recommendedAction, SentinelAction.ALLOW);
  assert.strictEqual(report.evidence.length, 0, 'Evidence should be empty for clean user');
  assert.ok(report.evidenceConfidence >= 0.70, `Confidence should be high, got ${report.evidenceConfidence}`);
  assert.ok(report.traceId.startsWith('trc_'), 'TraceId should start with trc_');
});

// ==============================================================================
// 2. Guarded Telemetry Test (Absence of Telemetry != Zero Interaction)
// ==============================================================================
it('missing telemetry must not be treated as zero interaction (Guard against false positives)', () => {
  const report = evaluate({
    telemetryObserved: false, // Client telemetry uninitialized or reader just opened page
    isTrustedEventsCount: 0,
    burstCount10s: 1
  });

  const hasNoPhysicsRule = report.evidence.some(e => e.rule === 'interaction.trusted_input_absent');
  assert.strictEqual(hasNoPhysicsRule, false, 'Should not trigger trusted_input_absent when telemetry was never observed');
  assert.strictEqual(report.score, 0);
});

// ==============================================================================
// 3. Shadow Mode Semantics Test (Never Enforces Denial in Shadow Mode)
// ==============================================================================
it('shadow mode never enforces a denial action directly (returns OBSERVE with recommendation)', () => {
  const highRiskSignals = {
    webdriver: true,              // +25
    burstCount10s: 50,           // +30
    telemetryObserved: true,
    observationDurationMs: 10000,
    isTrustedEventsCount: 0,     // +20
    touchMismatch: true,         // +15
    tokenPresented: true,
    tokenVerified: false
  };

  // Shadow Mode (Default)
  const shadowReport = evaluate(highRiskSignals, { enforcementMode: 'SHADOW' });
  assert.strictEqual(shadowReport.score, 90);
  assert.strictEqual(shadowReport.action, SentinelAction.OBSERVE, 'In Shadow Mode, action must remain OBSERVE');
  assert.strictEqual(shadowReport.recommendedAction, SentinelAction.TEMPORARY_DENY, 'Recommended action should be TEMPORARY_DENY');
  assert.strictEqual(shadowReport.enforcementMode, 'SHADOW');

  // Enforce Mode
  const enforceReport = evaluate(highRiskSignals, { enforcementMode: 'ENFORCE' });
  assert.strictEqual(enforceReport.action, SentinelAction.TEMPORARY_DENY, 'In Enforce Mode, action must match recommendation');
  assert.strictEqual(enforceReport.enforcementMode, 'ENFORCE');
});

// ==============================================================================
// 4. Strict Clamping & Boundary Tests
// ==============================================================================
it('score must be clamped strictly to 100 on excessive cumulative rule weights', () => {
  const extremePolicy = createPolicy({
    rules: [
      rules.webdriver({ weight: 80 }),
      rules.burst({ weight: 70, threshold: 5 })
    ]
  });

  const report = evaluate({ webdriver: true, burstCount10s: 10 }, { policy: extremePolicy });
  assert.strictEqual(report.score, 100, 'Score 150 must be clamped to 100');
});

it('score must be clamped to 0 on negative weights or empty inputs', () => {
  const negativePolicy = createPolicy({
    rules: [
      {
        id: 'test.negative',
        weight: -50,
        evaluate: () => ({ triggered: true, score: -50, attributes: {}, message: 'Negative' })
      }
    ]
  });

  const report = evaluate({}, { policy: negativePolicy });
  assert.strictEqual(report.score, 0, 'Negative score must be clamped to 0');
});

// ==============================================================================
// 5. Input Immutability Test (Deep Object.freeze)
// ==============================================================================
it('evaluation does not mutate its inputs (Object.freeze guarantee)', () => {
  const rawSignals = {
    webdriver: true,
    burstCount10s: 42,
    customKey: 'original_val'
  };
  Object.freeze(rawSignals);

  // Must not throw mutation errors
  const report = evaluate(rawSignals);
  assert.strictEqual(report.score, 55);
  assert.strictEqual(rawSignals.customKey, 'original_val');
});

// ==============================================================================
// 6. Safe Baseline for Undefined / NaN / Null Inputs
// ==============================================================================
it('should gracefully handle undefined, null, and NaN signals without throwing', () => {
  const reportNull = evaluate(null);
  assert.strictEqual(reportNull.score, 0);
  assert.strictEqual(reportNull.action, SentinelAction.ALLOW);

  const reportNaN = evaluate({ burstCount10s: NaN, isTrustedEventsCount: undefined });
  assert.strictEqual(reportNaN.score, 0);
  assert.strictEqual(reportNaN.action, SentinelAction.ALLOW);
});

// ==============================================================================
// Summary & Non-Zero Exit Code Quality Gate
// ==============================================================================
console.log('\n------------------------------------------------');
console.log(`Total Engine Gate Tests: ${passedTests + failedTests}`);
console.log(`Passed:                  ${passedTests}`);
console.log(`Failed:                  ${failedTests}`);
console.log('------------------------------------------------\n');

if (failedTests > 0) {
  process.exitCode = 1;
  console.error(`🚨 QUALITY GATE FAILED: ${failedTests} test(s) did not pass.`);
  process.exit(1);
} else {
  console.log('🎉 ALL ENGINE QUALITY GATES PASSED!\n');
}

```

### 🖥️ Actual Execution Output & Assertion Logs

```text
🧪 Running AMEVA Sentinel Quality Gate Test Suite...

  ✅ PASS: should classify clean synthetic baseline session as ALLOW with 0 score
  ✅ PASS: missing telemetry must not be treated as zero interaction (Guard against false positives)
  ✅ PASS: shadow mode never enforces a denial action directly (returns OBSERVE with recommendation)
  ✅ PASS: score must be clamped strictly to 100 on excessive cumulative rule weights
  ✅ PASS: score must be clamped to 0 on negative weights or empty inputs
  ✅ PASS: evaluation does not mutate its inputs (Object.freeze guarantee)
  ✅ PASS: should gracefully handle undefined, null, and NaN signals without throwing

------------------------------------------------
Total Engine Gate Tests: 7
Passed:                  7
Failed:                  0
------------------------------------------------

🎉 ALL ENGINE QUALITY GATES PASSED!
```

---

<a id="sentinel"></a>
## 3. Sentinel Facade & Stateful Rate Enforcement Tests

- **Test File Path**: [`tests/sentinel.test.js`](../tests/sentinel.test.js)
- **Execution Command**: `node tests/sentinel.test.js`
- **Execution Latency**: `87 ms`
- **Results**: `3 Passed, 0 Failed`

### 📄 Test Source Code

```javascript
/**
 * AMEVA Sentinel - Facade & Stateful Rate Test Suite
 */
import assert from 'node:assert';
import {
  sentinel,
  createSentinel,
  SentinelAction,
  MemoryCounterStore,
  MemoryRiskEventStore
} from '../packages/sentinel/dist/index.js';
import { createBrowserTelemetry } from '../packages/browser-sdk/dist/index.js';

console.log('\n🧪 Running AMEVA Sentinel Facade & Integration Test Suite...\n');

let passedTests = 0;
let failedTests = 0;

function it(name, fn) {
  return (async () => {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passedTests++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failedTests++;
    }
  })();
}

async function run() {
  // 1. Ingest from browser-sdk snapshot
  await it('sentinel.score({ signals }) should score directly from browser-sdk snapshot', async () => {
    const telemetry = createBrowserTelemetry({ autoStart: false });
    const snapshot = telemetry.snapshot();

    const report = await sentinel.score({ signals: snapshot });

    assert.strictEqual(typeof report.score, 'number');
    assert.strictEqual(report.action, SentinelAction.ALLOW);
    assert.strictEqual(report.enforcementMode, 'SHADOW');
    assert.strictEqual(report.schemaVersion, undefined);
    assert.ok(report.signals !== undefined, 'Report must contain signals');
    assert.strictEqual(report.signals.webdriver, false);
  });

  // 2. Stateful Fixed-Window Request Burst Counter Test
  await it('should automatically track request rates and trigger burst rules on high frequency', async () => {
    const counterStore = new MemoryCounterStore();
    const rateSentinel = createSentinel({
      mode: 'shadow',
      counterStore
    });

    const attackerReq = {
      sessionId: 'attacker_test_session_99',
      headers: {
        'user-agent': 'python-requests/2.31.0'
      },
      body: {}
    };

    // Simulate 35 rapid requests in 1 second
    let lastReport;
    for (let i = 0; i < 35; i++) {
      lastReport = await rateSentinel.score(attackerReq);
    }

    // 35 requests exceeds threshold (30) -> triggers rate.burst_request (30) + suspicious_ua (15) = 45 score
    assert.ok(lastReport.score >= 45, `Expected score >= 45, got ${lastReport.score}`);
    assert.strictEqual(lastReport.recommendedAction, SentinelAction.OBSERVE);

    const rulesTriggered = lastReport.evidence.map(e => e.rule);
    assert.ok(rulesTriggered.includes('rate.burst_request'));
    assert.ok(rulesTriggered.includes('header.suspicious_ua'));
  });

  // 3. Genuine Enforce Mode Test: High-Risk Request triggers TEMPORARY_DENY
  await it('createSentinel({ mode: "enforce", eventStore }) should enforce TEMPORARY_DENY on high-risk payload', async () => {
    const eventStore = new MemoryRiskEventStore();
    const enforcingSentinel = createSentinel({
      mode: 'enforce',
      eventStore
    });

    const highRiskReq = {
      testClientId: 'high_risk_bot_client',
      headers: {
        'user-agent': 'HeadlessChrome/128.0',
        'sec-ch-ua-mobile': '?1'
      },
      body: {
        webdriver: true,
        telemetry_observed: true,
        observation_duration_ms: 10000,
        trusted_events: 0,
        is_touch: false
      }
    };

    // Send 35 requests to trigger burst (30) + webdriver (25) + suspicious_ua (15) + trusted_absent (20) = 90 score
    let risk;
    for (let i = 0; i < 35; i++) {
      risk = await enforcingSentinel.score(highRiskReq);
    }

    assert.strictEqual(risk.enforcementMode, 'ENFORCE');
    assert.ok(risk.score >= 85, `Score should be >= 85, got ${risk.score}`);
    assert.strictEqual(risk.recommendedAction, SentinelAction.TEMPORARY_DENY);
    assert.strictEqual(risk.action, SentinelAction.TEMPORARY_DENY, 'In ENFORCE mode, high-risk session must be directly blocked');

    const stored = await eventStore.list();
    assert.strictEqual(stored.length, 35);
    assert.strictEqual(stored[0].traceId, risk.traceId);
    assert.strictEqual(stored[0].action, SentinelAction.TEMPORARY_DENY);
  });

  console.log('\n------------------------------------------------');
  console.log(`Total Facade Tests: ${passedTests + failedTests}`);
  console.log(`Passed:             ${passedTests}`);
  console.log(`Failed:             ${failedTests}`);
  console.log('------------------------------------------------\n');

  if (failedTests > 0) {
    process.exitCode = 1;
    console.error(`🚨 QUALITY GATE FAILED: ${failedTests} test(s) did not pass.`);
    process.exit(1);
  }
}

run();

```

### 🖥️ Actual Execution Output & Assertion Logs

```text
🧪 Running AMEVA Sentinel Facade & Integration Test Suite...

  ✅ PASS: sentinel.score({ signals }) should score directly from browser-sdk snapshot
  ✅ PASS: should automatically track request rates and trigger burst rules on high frequency
  ✅ PASS: createSentinel({ mode: "enforce", eventStore }) should enforce TEMPORARY_DENY on high-risk payload

------------------------------------------------
Total Facade Tests: 3
Passed:             3
Failed:             0
------------------------------------------------
```

---

<a id="store"></a>
## 4. RiskEventStore Persistence & Deep Schema Validation Tests

- **Test File Path**: [`tests/store.test.js`](../tests/store.test.js)
- **Execution Command**: `node tests/store.test.js`
- **Execution Latency**: `77 ms`
- **Results**: `7 Passed, 0 Failed`

### 📄 Test Source Code

```javascript
/**
 * AMEVA Sentinel - RiskEventStore Unit & Deep Schema Validation Test Suite
 */
import assert from 'node:assert';
import {
  MemoryRiskEventStore,
  LocalStorageRiskEventStore,
  SentinelAction,
  evaluate,
  toStoredRiskEvent,
  isStoredRiskEventV1,
  hasPrimitiveAttributes,
  isIsoDate
} from '../packages/risk-core/dist/index.js';

console.log('\n🧪 Running AMEVA Sentinel RiskEventStore Test Suite...\n');

let passedTests = 0;
let failedTests = 0;

async function it(name, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Reason: ${err.message}`);
    failedTests++;
  }
}

async function run() {
  // 1. Schema v1.0 Structure Integrity
  await it('should append and list reports with schemaVersion 1.0', async () => {
    const store = new MemoryRiskEventStore();
    const report = evaluate({ webdriver: true, burstCount10s: 2 });

    await store.append(report);
    const list = await store.list();

    assert.strictEqual(list.length, 1);
    const item = list[0];
    assert.strictEqual(item.schemaVersion, '1.0');
    assert.strictEqual(item.traceId, report.traceId);
    assert.strictEqual(item.score, report.score);
    assert.strictEqual(typeof item.storedAt, 'string');
    assert.ok(isIsoDate(item.storedAt), 'storedAt must be valid ISO date string');
    assert.ok(isStoredRiskEventV1(item), 'Appended item must strictly satisfy isStoredRiskEventV1');
  });

  // 2. Trace ID Deduplication (Idempotency)
  await it('should be idempotent and deduplicate appends with identical traceId', async () => {
    const store = new MemoryRiskEventStore();
    const report = evaluate({ webdriver: false });

    await store.append(report);
    await store.append(report);
    await store.append(report);

    const list = await store.list();
    assert.strictEqual(list.length, 1, 'Duplicate traceId should update rather than append duplicate entries');
  });

  // 3. FIFO Capacity Eviction
  await it('should evict oldest items in FIFO order when exceeding maxItems', async () => {
    const store = new MemoryRiskEventStore({ maxItems: 3 });

    for (let i = 0; i < 5; i++) {
      const rep = evaluate({});
      rep.traceId = `trc_test_${i}`;
      await store.append(rep);
    }

    const list = await store.list();
    assert.strictEqual(list.length, 3, 'Store size must strictly remain capped at maxItems');
    assert.strictEqual(list[0].traceId, 'trc_test_4', 'Newest item should be at index 0');
    assert.strictEqual(list[2].traceId, 'trc_test_2', 'Oldest preserved item should be trc_test_2');
  });

  // 4. Time-to-Live (TTL) Pruning
  await it('should prune expired events beyond maxAgeMs', async () => {
    const store = new MemoryRiskEventStore({ maxAgeMs: 100 });
    const rep = evaluate({});
    rep.evaluatedAt = new Date(Date.now() - 500).toISOString(); // 500ms ago

    await store.append(rep);
    const unexpired = await store.list({ includeExpired: false });
    assert.strictEqual(unexpired.length, 0, 'Expired item should be filtered out during list()');

    const all = await store.list({ includeExpired: true });
    assert.strictEqual(all.length, 1, 'Explicit includeExpired: true must return expired events');
  });

  // 5. Schema Guard: Reject Out-of-Bounds Scores & Confidences
  await it('isStoredRiskEventV1 should reject out-of-bounds score and confidence numbers', () => {
    const valid = toStoredRiskEvent(evaluate({ webdriver: false }));

    assert.strictEqual(isStoredRiskEventV1(valid), true, 'Valid StoredRiskEventV1 must pass');
    assert.strictEqual(isStoredRiskEventV1({ ...valid, score: 101 }), false, 'Score > 100 must be rejected');
    assert.strictEqual(isStoredRiskEventV1({ ...valid, score: -1 }), false, 'Score < 0 must be rejected');
    assert.strictEqual(isStoredRiskEventV1({ ...valid, score: NaN }), false, 'NaN score must be rejected');
    assert.strictEqual(isStoredRiskEventV1({ ...valid, evidenceConfidence: 1.5 }), false, 'Confidence > 1 must be rejected');
    assert.strictEqual(isStoredRiskEventV1({ ...valid, evidenceConfidence: -0.1 }), false, 'Confidence < 0 must be rejected');
  });

  // 6. Schema Guard: Reject Invalid Actions, Modes, and Non-ISO Dates
  await it('isStoredRiskEventV1 should reject invalid actions, modes, and non-ISO dates', () => {
    const valid = toStoredRiskEvent(evaluate({ webdriver: false }));

    assert.strictEqual(isStoredRiskEventV1({ ...valid, action: 'INVALID_BLOCK' }), false, 'Unknown action must fail');
    assert.strictEqual(isStoredRiskEventV1({ ...valid, enforcementMode: 'ILLEGAL' }), false, 'Unknown mode must fail');
    assert.strictEqual(isStoredRiskEventV1({ ...valid, evaluatedAt: 'yesterday at 5pm' }), false, 'Non-ISO evaluatedAt must fail');
    assert.strictEqual(isStoredRiskEventV1({ ...valid, storedAt: 'not-a-date' }), false, 'Non-ISO storedAt must fail');
    assert.strictEqual(isStoredRiskEventV1({ ...valid, minimalDerivedSignals: null }), false, 'Null minimalDerivedSignals must fail');
  });

  // 7. Schema Guard: Reject Non-Primitive Attributes in Evidence
  await it('isStoredRiskEventV1 should reject nested objects or arrays inside evidence attributes', () => {
    const valid = toStoredRiskEvent(evaluate({ webdriver: true }));

    const poisonedEvidence = [
      {
        rule: 'test.poison',
        score: 10,
        message: 'nested exploit attempt',
        attributes: { nested: { inner: 'dangerous' }, arrayVal: [1, 2, 3] }
      }
    ];

    assert.strictEqual(isStoredRiskEventV1({ ...valid, evidence: poisonedEvidence }), false, 'Nested objects in attributes must be rejected');
  });
}

run();

```

### 🖥️ Actual Execution Output & Assertion Logs

```text
🧪 Running AMEVA Sentinel RiskEventStore Test Suite...

  ✅ PASS: should append and list reports with schemaVersion 1.0
  ✅ PASS: should be idempotent and deduplicate appends with identical traceId
  ✅ PASS: should evict oldest items in FIFO order when exceeding maxItems
  ✅ PASS: should prune expired events beyond maxAgeMs
  ✅ PASS: isStoredRiskEventV1 should reject out-of-bounds score and confidence numbers
  ✅ PASS: isStoredRiskEventV1 should reject invalid actions, modes, and non-ISO dates
  ✅ PASS: isStoredRiskEventV1 should reject nested objects or arrays inside evidence attributes
```

---

<a id="browser"></a>
## 5. @ameva/sentinel-browser Client Telemetry Unit Tests

- **Test File Path**: [`tests/browser.test.js`](../tests/browser.test.js)
- **Execution Command**: `node tests/browser.test.js`
- **Execution Latency**: `75 ms`
- **Results**: `2 Passed, 0 Failed`

### 📄 Test Source Code

```javascript
/**
 * @ameva/sentinel-browser Unit Test Suite
 */
import assert from 'node:assert';
import { createBrowserTelemetry } from '../packages/browser-sdk/dist/index.js';

console.log('\n🧪 Running @ameva/sentinel-browser Unit Test Suite...\n');

let passedTests = 0;
let failedTests = 0;

function it(name, fn) {
  return (async () => {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passedTests++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failedTests++;
    }
  })();
}

async function run() {
  // 1. Snapshot returns expected fields even in non-browser Node runtime
  await it('telemetry.snapshot() should return schema-compliant signals in Node fallback', async () => {
    const telemetry = createBrowserTelemetry({ autoStart: false });
    const snapshot = telemetry.snapshot();

    assert.strictEqual(typeof snapshot.telemetryObserved, 'boolean');
    assert.strictEqual(typeof snapshot.observationDurationMs, 'number');
    assert.strictEqual(typeof snapshot.trustedInputCount, 'number');
    assert.strictEqual(typeof snapshot.collectedAt, 'string');
  });

  // 2. Lifecycle management (start, reset, destroy)
  await it('telemetry lifecycle should manage start and destroy without throwing', async () => {
    const telemetry = createBrowserTelemetry({ maxEventsCap: 100 });
    telemetry.start();
    telemetry.start(); // Idempotent start

    telemetry.reset();
    const snapAfterReset = telemetry.snapshot();
    assert.strictEqual(snapAfterReset.trustedInputCount, 0);

    telemetry.destroy();
  });

  console.log('\n------------------------------------------------');
  console.log(`Total Browser Tests: ${passedTests + failedTests}`);
  console.log(`Passed:              ${passedTests}`);
  console.log(`Failed:              ${failedTests}`);
  console.log('------------------------------------------------\n');

  if (failedTests > 0) {
    process.exitCode = 1;
    console.error(`🚨 BROWSER SDK TEST SUITE FAILED: ${failedTests} test(s) failed.`);
    process.exit(1);
  }
}

run();

```

### 🖥️ Actual Execution Output & Assertion Logs

```text
🧪 Running @ameva/sentinel-browser Unit Test Suite...

  ✅ PASS: telemetry.snapshot() should return schema-compliant signals in Node fallback
  ✅ PASS: telemetry lifecycle should manage start and destroy without throwing

------------------------------------------------
Total Browser Tests: 2
Passed:              2
Failed:              0
------------------------------------------------
```

---

<a id="playwright"></a>
## 6. Playwright Real-Browser Cross-Browser Integration (Chromium, Firefox, WebKit)

- **Test File Path**: [`tests/browser-integration/dashboard.spec.js`](../tests/browser-integration/dashboard.spec.js)
- **Execution Command**: `npx playwright test`
- **Execution Latency**: `12598 ms`
- **Results**: `9 Passed, 0 Failed`

### 📄 Test Source Code

```javascript
/**
 * AMEVA Sentinel - Playwright Real-Browser Integration Test Suite
 * Validates:
 * 1. Stored report persistence and reload recovery
 * 2. Real-time multi-tab LocalStorage synchronization
 * 3. Telemetry collector lifecycle and listener destruction
 */
import { test, expect } from '@playwright/test';

test.describe('AMEVA Sentinel Real-Browser Integration', () => {

  test('stored report survives page reload with identical traceId', async ({ page }) => {
    await page.goto('/packages/dashboard/index.html');

    // Click "Evaluate Real Browser" button
    await page.getByRole('button', { name: /evaluate real browser/i }).click();

    // Read generated latest traceId
    const firstTraceId = await page.locator('[data-testid="latest-trace-id"]').textContent();
    expect(firstTraceId).toBeTruthy();

    // Reload page
    await page.reload();

    // Verify same report traceId is restored and visible
    await expect(page.locator(`[data-trace-id="${firstTraceId}"]`)).toBeVisible();
  });

  test('risk event is synchronized in real-time across tabs', async ({ browser }) => {
    const context = await browser.newContext();
    const producer = await context.newPage();
    const dashboard = await context.newPage();

    try {
      await producer.goto('/packages/dashboard/index.html');
      await dashboard.goto('/packages/dashboard/index.html');

      const before = Number(await dashboard.locator('[data-testid="event-count"]').textContent());

      // Generate event on producer tab
      await producer.getByRole('button', { name: /simulate headless bot/i }).click();

      // Verify dashboard tab updates count dynamically without reload
      await expect(dashboard.locator('[data-testid="event-count"]')).toHaveText(String(before + 1));
    } finally {
      await producer.close().catch(() => {});
      await dashboard.close().catch(() => {});
      await context.close().catch(() => {});
    }
  });

  test('destroy() stops active telemetry collection and listener observation', async ({ page }) => {
    await page.goto('/tests/fixtures/telemetry-test.html');

    const before = await page.evaluate(() => {
      window.testTelemetry.start();
      return window.testTelemetry.snapshot();
    });

    await page.mouse.move(100, 100);
    await page.mouse.move(300, 300);

    const during = await page.evaluate(() => {
      return window.testTelemetry.snapshot();
    });

    // Must strictly prove telemetry listener actually captured pointer events before destruction
    expect(during.pointerEventCount).toBeGreaterThan(before.pointerEventCount);

    // Destroy telemetry collector
    await page.evaluate(() => {
      window.testTelemetry.destroy();
    });

    const stoppedAt = await page.evaluate(() => {
      return window.testTelemetry.snapshot();
    });

    await page.mouse.move(500, 500);
    await page.mouse.move(700, 700);

    const after = await page.evaluate(() => {
      return window.testTelemetry.snapshot();
    });

    // Pointer event counter must not increase after destroy()
    expect(after.pointerEventCount).toBe(stoppedAt.pointerEventCount);
  });

});

```

### 🖥️ Actual Execution Output & Assertion Logs

```text
Running 9 tests using 1 worker

  ok 1 [chromium] › tests\browser-integration\dashboard.spec.js:12:3 › AMEVA Sentinel Real-Browser Integration › stored report survives page reload with identical traceId (567ms)
  ok 2 [chromium] › tests\browser-integration\dashboard.spec.js:29:3 › AMEVA Sentinel Real-Browser Integration › risk event is synchronized in real-time across tabs (499ms)
  ok 3 [chromium] › tests\browser-integration\dashboard.spec.js:52:3 › AMEVA Sentinel Real-Browser Integration › destroy() stops active telemetry collection and listener observation (159ms)
  ok 4 [firefox] › tests\browser-integration\dashboard.spec.js:12:3 › AMEVA Sentinel Real-Browser Integration › stored report survives page reload with identical traceId (1.6s)
  ok 5 [firefox] › tests\browser-integration\dashboard.spec.js:29:3 › AMEVA Sentinel Real-Browser Integration › risk event is synchronized in real-time across tabs (1.1s)
  ok 6 [firefox] › tests\browser-integration\dashboard.spec.js:52:3 › AMEVA Sentinel Real-Browser Integration › destroy() stops active telemetry collection and listener observation (337ms)
  ok 7 [webkit] › tests\browser-integration\dashboard.spec.js:12:3 › AMEVA Sentinel Real-Browser Integration › stored report survives page reload with identical traceId (750ms)
  ok 8 [webkit] › tests\browser-integration\dashboard.spec.js:29:3 › AMEVA Sentinel Real-Browser Integration › risk event is synchronized in real-time across tabs (775ms)
  ok 9 [webkit] › tests\browser-integration\dashboard.spec.js:52:3 › AMEVA Sentinel Real-Browser Integration › destroy() stops active telemetry collection and listener observation (290ms)

  9 passed (11.1s)
```

---

<a id="packaging"></a>
## 6. Workspace Distribution & Packaging Verification (`npm pack --dry-run`)

```text
ameva-sentinel-risk-core-0.5.0-alpha.1.tgz

---
ameva-sentinel-browser-0.5.0-alpha.1.tgz

---
ameva-sentinel-0.5.0-alpha.1.tgz
```
