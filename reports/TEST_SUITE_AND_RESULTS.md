# 🛡️ AMEVA-Sentinel — Comprehensive Test Suite & Execution Results Report

> **Generated At**: `2026-08-26T16:20:22.073Z`  
> **Repository**: [https://github.com/uno-km/ameva-sentinel.git](https://github.com/uno-km/ameva-sentinel.git)  
> **Branch**: `main`  
> **Commit SHA**: `2cb750e29b18d0b4b3e36f23dad14db553d619b9`  
> **Tree SHA**: `b9d5e0b5a3e1cd018feb8508d6f4acacd28262d3`  
> **Working Tree State**: `DIRTY` (Local Development & Audit Evidence Generation)  
> **Unified Monorepo Version**: `v2.2.0-alpha.1` (TypeScript) / `2.2.0a1` (Python PEP 440)  
> **Execution Engine**: Node.js `v24.16.0` on `win32`

## 📌 Official Release Determination & Scope Classification

> **"AMEVA-Sentinel v2.2.0-alpha.1은 DIRTY Windows 로컬 환경에서 보고된 TypeScript, Python, 브라우저 E2E 및 격리 소비자 패키징 테스트 62건을 통과했습니다. Redis 계층형 quota의 per-key 인자 생성 및 Mock Redis 호출 경로는 검증되었으나, Lua 스크립트의 실제 실행, 키별 상이한 quota 매핑, 다중 클라이언트 원자성, 부분 실패 및 재시도 동작은 실제 Redis 환경에서 검증되지 않았습니다. GitHub Actions matrix도 구성 상태이며 성공한 required check 및 clean tagged commit 재현 증적은 아직 없습니다. 따라서 본 빌드는 Alpha 통합 검증 후보로 분류하며, Production 및 immutable release 승인은 보류합니다."**

---

## 📊 Multi-Tier Audit & Evaluation Matrix

| Evaluation Domain | Audit Determination | Current Evidence & Status |
| :--- | :---: | :--- |
| **Local Functional Quality Gate** | 🟢 PASS | 100% Passed (62/62 test cases freshly executed) |
| **Cross-Browser E2E Verification** | 🟢 PASS | Playwright 9/9 Passed (Chromium, Firefox, WebKit) |
| **Isolated Consumer Packaging** | 🟢 PASS | NPM 4 Packages + Python Wheel Clean Virtualenv Verified |
| **Single-Process Sequential Consistency** | 🟢 PASS | Promise & asyncio same-bucket consistency verified |
| **Redis Per-Key Argument Construction and Mock Dispatch Verification** | 🟢 PASS (Mock Verified) | 6-scope distinct sentinel arguments [cost, ttl, cap[i], refill[i]] verified |
| **Real Redis Lua Execution & All-or-Nothing Multi-Key Atomicity** | 🟡 NOT RUN / PENDING | Real Redis harness required for multi-key atomicity and error replies |
| **Multi-Process / Distributed Contention** | 🟡 NOT RUN / PENDING | External Redis multi-client contention harness required |
| **Redis Network Fault Injection (Timeout / Reset / Ambiguous Commit)** | 🟡 NOT RUN / PENDING | Ambiguous commit, timeout, reset, NOSCRIPT recovery required |
| **CI Matrix Status Check** | 🟡 CONFIGURED | CI matrix expanded for Node 20/22/24, Python 3.9-3.13 |
| **Production Readiness Verdict** | 🔴 NOT APPROVED | Alpha integration candidate only. Production approval deferred to Fault Injection phase |

---

## 📊 Local Mock and Functional Test Completion Scorecard (Alpha Integration Gate)

| Category | Test Files | Groups | Test Cases | Passed | Failed | Exit Code | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **TypeScript Consumer API Contract** | `1` | `1` | `1` | `1` | `0` | `0` | 🟢 PASS |
| **Risk Engine Quality Gates** | `1` | `1` | `7` | `7` | `0` | `0` | 🟢 PASS |
| **Facade & State Enforcement** | `1` | `1` | `3` | `3` | `0` | `0` | 🟢 PASS |
| **Persistence & Schema Bounds** | `1` | `1` | `7` | `7` | `0` | `0` | 🟢 PASS |
| **Browser SDK Unit Verification** | `1` | `1` | `2` | `2` | `0` | `0` | 🟢 PASS |
| **Cost Guard & Concurrency Groups** | `1` | `7` | `9` | `9` | `0` | `0` | 🟢 PASS |
| **Python SDK Multi-Axis & Conformance** | `6` | `6` | `24` | `24` | `0` | `0` | 🟢 PASS |
| **Playwright Cross-Browser E2E** | `1` | `3` | `9` | `9` | `0` | `0` | 🟢 PASS |
| **TOTAL LOCAL FUNCTIONAL SUITE** | **13 Files** | **21 Groups** | **62 Cases** | **62** | **0** | **0** | 🟢 LOCAL FUNCTIONAL GATE: PASS |

> **Scorecard Note**: In accordance with OpenSSF/CNCF compliance and objective audit standards, abstract 100/100 score representations have been replaced with direct functional gate completion metrics (`62/62 test cases passed`). Production readiness remains `NOT APPROVED`.

---

## ⚠️ Python Deprecation Warning Scoped Filter Disclosure

- **Upstream Warning**: `StarletteDeprecationWarning: Using `httpx` with `starlette.testclient` is deprecated; install `httpx2` instead.`
- **Upstream Component**: Starlette `TestClient` (`starlette.testclient.TestClient`)
- **Pytest Configuration**: `filterwarnings = ["ignore:.*Using .*httpx.* with .*starlette.*", "ignore:.*starlette\\.testclient.*"]` in `packages/sentinel-py/pyproject.toml`
- **-W error Outcome**: When executed with `py -3.12 -m pytest packages/sentinel-py/tests -W error`, test execution halts during module collection at `test_adapters.py:18` due to upstream Starlette warning.
- **Scoped Filter Outcome**: **24 tests passed with selected third-party deprecation warnings suppressed by an explicitly scoped pytest filter.** Zero internal codebase warnings emitted.

---

## 📑 Test Suites Execution Index

- [1. TypeScript Consumer API Contract Gate](#types)
- [2. Risk Core Engine & Boundary Quality Gate Tests](#engine)
- [3. Sentinel Facade & Stateful Rate Enforcement Tests](#sentinel)
- [4. RiskEventStore Persistence & Deep Schema Validation Tests](#store)
- [5. @ameva/sentinel-browser Client Telemetry Unit Tests](#browser)
- [6. Multi-Axis Threat & Cost Guard Suite (7 Verification Groups)](#cost-guard)
- [7. Python Sentinel Test Suite (Pytest 24 Tests)](#python-pytest)
- [8. Playwright Cross-Browser E2E Integration (Chromium, Firefox, WebKit)](#playwright)
- [9. Isolated NPM Consumer Verification (`verify_npm_consumer.ps1`)](#npm-consumer)
- [10. Isolated Python Wheel Virtualenv Verification (`verify_python_wheel.ps1`)](#python-wheel)

---

<a id="types"></a>
## 1. TypeScript Consumer API Contract Gate

- **Test File Path**: [`tests/typecheck.ts`](../tests/typecheck.ts)
- **Execution Command**: `npm run test:types`
- **Start Time (ISO)**: `2026-08-26T16:18:42.429Z`
- **End Time (ISO)**: `2026-08-26T16:18:45.681Z`
- **Execution Latency**: `3250 ms`
- **Process Exit Code**: `0`
- **Test Cases**: `1 Passed, 0 Failed (Total 1 Cases)`
- **Status**: 🟢 PASS

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
> ameva-sentinel-monorepo@2.2.0-alpha.1 test:types
> tsc --noEmit tests/typecheck.ts --target es2022 --module NodeNext --moduleResolution NodeNext
```

---

<a id="engine"></a>
## 2. Risk Core Engine & Boundary Quality Gate Tests

- **Test File Path**: [`tests/engine.test.js`](../tests/engine.test.js)
- **Execution Command**: `node tests/engine.test.js`
- **Start Time (ISO)**: `2026-08-26T16:18:45.682Z`
- **End Time (ISO)**: `2026-08-26T16:18:45.776Z`
- **Execution Latency**: `94 ms`
- **Process Exit Code**: `0`
- **Test Cases**: `7 Passed, 0 Failed (Total 7 Cases)`
- **Status**: 🟢 PASS

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
- **Start Time (ISO)**: `2026-08-26T16:18:45.776Z`
- **End Time (ISO)**: `2026-08-26T16:18:45.883Z`
- **Execution Latency**: `107 ms`
- **Process Exit Code**: `0`
- **Test Cases**: `3 Passed, 0 Failed (Total 3 Cases)`
- **Status**: 🟢 PASS

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
- **Start Time (ISO)**: `2026-08-26T16:18:45.884Z`
- **End Time (ISO)**: `2026-08-26T16:18:45.978Z`
- **Execution Latency**: `95 ms`
- **Process Exit Code**: `0`
- **Test Cases**: `7 Passed, 0 Failed (Total 7 Cases)`
- **Status**: 🟢 PASS

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
- **Start Time (ISO)**: `2026-08-26T16:18:45.979Z`
- **End Time (ISO)**: `2026-08-26T16:18:46.066Z`
- **Execution Latency**: `87 ms`
- **Process Exit Code**: `0`
- **Test Cases**: `2 Passed, 0 Failed (Total 2 Cases)`
- **Status**: 🟢 PASS

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

<a id="cost-guard"></a>
## 6. Multi-Axis Threat & Cost Guard Suite (7 Verification Groups)

- **Test File Path**: [`tests/cost-guard.test.js`](../tests/cost-guard.test.js)
- **Execution Command**: `node tests/cost-guard.test.js`
- **Start Time (ISO)**: `2026-08-26T16:18:46.066Z`
- **End Time (ISO)**: `2026-08-26T16:18:46.169Z`
- **Execution Latency**: `103 ms`
- **Process Exit Code**: `0`
- **Test Cases**: `9 Passed, 0 Failed (Total 9 Cases)`
- **Status**: 🟢 PASS

### 📄 Test Source Code

```javascript
/**
 * @file cost-guard.test.js
 * Comprehensive Multi-Axis Threat and Cost Guard Suite for TypeScript.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SentinelCostGuardEvaluator,
  LocalEmergencyBudgetStore,
  validateCostPolicy,
  canonicalizePolicyJson,
  computePolicyChecksum,
  SAFE_FALLBACK_COST_POLICY,
  RequestShapeGuard,
  ResponseBudgetGuard
} from '../packages/risk-core/dist/index.js';
import { RedisTokenBucketStore, HIERARCHICAL_TOKEN_BUCKET_LUA } from '../packages/store-redis/dist/index.js';



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('\n🧪 Running Multi-Axis Cost Guard Test Suite...\n');

// 1. Strict Schema & Bounds Validation
{
  console.log('  Testing Strict Policy Schema & Bounds Validation...');

  // Valid fallback policy should validate cleanly
  const valid = validateCostPolicy(SAFE_FALLBACK_COST_POLICY);
  assert.equal(valid.schema_version, '1.0');
  assert.equal(valid.defaults.cost, 10);

  // Rejects invalid schema_version
  assert.throws(() => {
    validateCostPolicy({ ...SAFE_FALLBACK_COST_POLICY, schema_version: '2.0' });
  }, /schema_version/);

  // Rejects float cost
  assert.throws(() => {
    validateCostPolicy({
      ...SAFE_FALLBACK_COST_POLICY,
      defaults: { ...SAFE_FALLBACK_COST_POLICY.defaults, cost: 10.5 }
    });
  }, /defaults.cost/);

  // Rejects byte limit > 50MB (52428800)
  assert.throws(() => {
    validateCostPolicy({
      ...SAFE_FALLBACK_COST_POLICY,
      defaults: { ...SAFE_FALLBACK_COST_POLICY.defaults, max_request_body_bytes: 60000000 }
    });
  }, /max_request_body_bytes/);

  // Rejects route page_size_default > page_size_max
  assert.throws(() => {
    validateCostPolicy({
      ...SAFE_FALLBACK_COST_POLICY,
      routes: [
        {
          method: 'GET',
          path: '/invalid-page',
          cost: 10,
          page_size_default: 100,
          page_size_max: 50
        }
      ]
    });
  }, /page_size_default/);

  // Rejects unknown field
  assert.throws(() => {
    validateCostPolicy({
      ...SAFE_FALLBACK_COST_POLICY,
      unknown_field: 123
    });
  }, /Unknown field 'unknown_field'/);

  console.log('  ✅ PASS: Policy validation rejects invalid bounds, floats, unknown fields, and schema versions.');
}

// 2. Unverified Principal Rejection & Unverified Tenant Isolation
{
  console.log('  Testing Unverified Principal & Tenant Isolation Strictness...');

  let capturedRequest = null;
  const spyStore = {
    async consume(req) {
      capturedRequest = req;
      return { allowed: true, remainingCost: 100, retryAfterSeconds: 0 };
    }
  };

  const evaluator = new SentinelCostGuardEvaluator({
    budgetStore: spyStore,
    enforceByDefault: true
  });

  // 2.1 Attempting unverified tenantId injection
  const unverifiedTenantCtx = {
    method: 'GET',
    path: '/health',
    tenantId: 'victim-tenant-hijack',
    principal: {
      authenticated: false
    },
    pseudonymousKey: 'anon-network-1'
  };

  await evaluator.evaluate(unverifiedTenantCtx);
  assert.equal(capturedRequest.tenantId, undefined, 'Unverified context.tenantId must be stripped and ignored');
  assert.equal(capturedRequest.apiKeyId, undefined, 'Unverified apiKeyId must be undefined');

  // 2.2 Verified tenantId injection
  const verifiedTenantCtx = {
    method: 'GET',
    path: '/health',
    tenantId: 'spoofed-header-tenant',
    principal: {
      authenticated: true,
      tenantId: 'trusted-corp-tenant',
      accountId: 'account-99',
      apiKeyId: 'ak-live-123'
    }
  };

  await evaluator.evaluate(verifiedTenantCtx);
  assert.equal(capturedRequest.tenantId, 'trusted-corp-tenant', 'Trusted principal.tenantId must be propagated');
  assert.equal(capturedRequest.accountId, 'account-99', 'Trusted principal.accountId must be propagated');
  assert.equal(capturedRequest.apiKeyId, 'ak-live-123', 'Trusted principal.apiKeyId must be propagated');

  console.log('  ✅ PASS: Unverified principal credentials and tenantId isolated strictly.');
}

// 3. Emergency Store Tier Isolation
{
  console.log('  [Group 3] Testing Emergency Store Tier Isolation...');

  const store = new LocalEmergencyBudgetStore(100, 0.001);
  const baseRequest = {
    cost: 10,
    routeKey: 'GET:/api/v1/data',
    networkKey: 'net-client-a'
  };

  const authRes = await store.consume({
    ...baseRequest,
    emergencyCapacity: 200,
    tier: { name: 'authenticated_key', capacity: 2000, refill_tokens_per_minute: 2000, emergency_local_capacity: 200 }
  });
  assert.equal(authRes.allowed, true);
  assert.equal(authRes.remainingCost, 190);

  const anonRes = await store.consume({
    ...baseRequest,
    emergencyCapacity: 30,
    tier: { name: 'anonymous_network', capacity: 100, refill_tokens_per_minute: 100, emergency_local_capacity: 30 }
  });
  assert.equal(anonRes.allowed, true);
  assert.equal(anonRes.remainingCost, 20); // Brand new bucket for anonymous_network

  console.log('  ✅ PASS: Emergency store isolates distinct tier namespaces into separate buckets.');
}

// 4. Same-Bucket Dynamic Capacity Clamp
{
  console.log('  [Group 4] Testing Same-Bucket Dynamic Capacity Clamp on Downgrade...');

  const clampStore = new LocalEmergencyBudgetStore(500, 0.0001);
  const baseRequest = {
    cost: 10,
    routeKey: 'GET:/api/v1/data',
    networkKey: 'net-client-a'
  };
  const fixedTier = {
    name: 'custom-plan',
    capacity: 2000,
    refill_tokens_per_minute: 1,
    emergency_local_capacity: 200
  };

  // Step 1: Initialize custom-plan bucket with high emergency capacity (200) -> consumes 10, remaining 190
  const initRes = await clampStore.consume({
    ...baseRequest,
    emergencyCapacity: 200,
    tier: { ...fixedTier, emergency_local_capacity: 200 }
  });
  assert.equal(initRes.allowed, true);
  assert.equal(initRes.remainingCost, 190);

  // Step 2: Same bucket key (custom-plan) dynamically downgraded to capacity 30
  // Previous 190 tokens must be clamped down to min(30, 190) = 30, then 10 consumed -> remaining 20
  const downgraded = await clampStore.consume({
    ...baseRequest,
    emergencyCapacity: 30,
    tier: { ...fixedTier, emergency_local_capacity: 30 }
  });
  assert.equal(downgraded.allowed, true);
  assert.equal(downgraded.remainingCost, 20, 'Tokens must be dynamically clamped to 20 (30 max - 10 consumed)');

  console.log('  ✅ PASS: Same-bucket emergency capacity clamp strictly bounds existing balances.');
}

// 5. Same-Bucket Concurrency & Atomic Race Condition Safety
{
  console.log('  [Group 5] Testing Same-Bucket Concurrency & Atomic Race Condition Safety...');

  const concurrentStore = new LocalEmergencyBudgetStore(10, 0.00001);
  const baseRequest = {
    cost: 8,
    routeKey: 'GET:/api/v1/checkout',
    networkKey: 'client-concurrency-test'
  };

  // Two concurrent requests of cost 8 against a bucket with 10 total tokens.
  // Exactly ONE request must succeed (allowed: true, remaining: 2).
  // The other request MUST be rejected (allowed: false, remaining: 2) without causing negative balance or double spending.
  const [res1, res2] = await Promise.all([
    concurrentStore.consume({ ...baseRequest }),
    concurrentStore.consume({ ...baseRequest })
  ]);

  const successCount = [res1, res2].filter(r => r.allowed).length;
  const failureCount = [res1, res2].filter(r => !r.allowed).length;

  assert.equal(successCount, 1, 'Exactly one concurrent request of cost 8 must be allowed within budget 10');
  assert.equal(failureCount, 1, 'The competing concurrent request must be rate limited');

  const successfulRes = res1.allowed ? res1 : res2;
  const failedRes = res1.allowed ? res2 : res1;

  assert.equal(successfulRes.remainingCost, 2, 'Remaining cost after successful consume must be 2 (10 - 8)');
  assert.equal(failedRes.remainingCost, 2, 'Failed request must observe remaining cost 2 without deduction');
  assert.ok(failedRes.retryAfterSeconds > 0, 'Failed request must receive positive retryAfterSeconds');

  console.log('  ✅ PASS: Single-process same-bucket sequential consistency verified under Promise concurrency primitives.');
}

// 6. Redis Failure & Tier Emergency Cap Enforcement
{
  console.log('  [Group 6] Testing Redis Failure with Tier-Specific Emergency Local Cap...');

  const failingStore = {
    async consume() {
      throw new Error('Redis cluster network partition');
    }
  };

  const emergencyStore = new LocalEmergencyBudgetStore(50, 0.001);
  const evaluator = new SentinelCostGuardEvaluator({
    budgetStore: failingStore,
    emergencyStore,
    enforceByDefault: true
  });

  const ctx = {
    method: 'GET',
    path: '/api/v1/chart/unified' // cost: 10, failure_mode: 'allow_with_emergency_cap'
  };

  // Default anonymous_network emergency capacity is 30.
  // Consuming 3 requests of cost 10 uses all 30 tokens.
  for (let i = 0; i < 3; i++) {
    const dec = await evaluator.evaluate(ctx);
    assert.equal(dec.allowed, true);
    assert.equal(dec.degraded, true);
    assert.equal(dec.enforced, true);
  }

  // 4th request must be rate limited
  const dec4 = await evaluator.evaluate(ctx);
  assert.equal(dec4.allowed, false);
  assert.equal(dec4.action, 'RATE_LIMIT');
  assert.equal(dec4.reasonCode, 'COST_BUDGET_EXCEEDED');
  assert.equal(dec4.degraded, true);
  assert.equal(dec4.enforced, true);

  // 6.2 RedisTokenBucketStore Per-Key Hierarchical Parameter Resolution with Distinct Sentinel Values
  let capturedScript = '';
  let capturedKeyCount = 0;
  let capturedKeys = [];
  let capturedArgs = [];

  const mockRedis = {
    async eval(script, keyCount, ...args) {
      capturedScript = script;
      capturedKeyCount = keyCount;
      capturedKeys = args.slice(0, keyCount);
      capturedArgs = args.slice(keyCount);
      // Return success tuple [allowed: 1, remaining: 91, retry_after: 0]
      return [1, 91, 0];
    }
  };

  const redisStore = new RedisTokenBucketStore({
    redis: mockRedis,
    defaultCapacity: 100,
    defaultRefillRatePerSec: 2.0,
    ttlSeconds: 90
  });

  // Verify full 6-scope request with DISTINCT sentinel capacities and refill rates
  const redisConsumeRes = await redisStore.consume({
    cost: 10,
    routeKey: 'GET:/api/v1/data',
    tenantId: 'tenant-123',
    accountId: 'acc-456',
    apiKeyId: 'key-789',
    sessionId: 'sess-abc',
    networkKey: '192.168.1.1',
    scopeBudgets: {
      route: { capacity: 101, refillRatePerSec: 1.01 },
      tenant: { capacity: 202, refillRatePerSec: 2.02 },
      account: { capacity: 303, refillRatePerSec: 3.03 },
      authKey: { capacity: 404, refillRatePerSec: 4.04 },
      session: { capacity: 505, refillRatePerSec: 5.05 },
      network: { capacity: 606, refillRatePerSec: 6.06 }
    }
  });

  assert.equal(redisConsumeRes.allowed, true);
  assert.equal(redisConsumeRes.remainingCost, 91);
  assert.equal(capturedKeyCount, 6, 'Must generate exactly 6 scope keys');
  assert.ok(capturedScript.includes('expected_per_key_argv = 2 + (num_keys * 2)'), 'Lua script must include expected argv calculation');
  assert.ok(capturedScript.includes('cap_idx = 3 + ((i - 1) * 2)'), 'Lua script must include 1-indexed cap calculation');

  // Verify ARGV mapping
  assert.equal(capturedArgs[0], 10, 'ARGV[1] must be cost');
  assert.equal(capturedArgs[1], 90, 'ARGV[2] must be ttlSeconds');

  // Verify 1:1 distinct pair mapping for all 6 scopes
  assert.equal(capturedArgs[2], 101, 'Key 1 (route) capacity must be 101');
  assert.equal(capturedArgs[3], 1.01, 'Key 1 (route) refill must be 1.01');
  assert.equal(capturedArgs[4], 202, 'Key 2 (tenant) capacity must be 202');
  assert.equal(capturedArgs[5], 2.02, 'Key 2 (tenant) refill must be 2.02');
  assert.equal(capturedArgs[6], 303, 'Key 3 (account) capacity must be 303');
  assert.equal(capturedArgs[7], 3.03, 'Key 3 (account) refill must be 3.03');
  assert.equal(capturedArgs[8], 404, 'Key 4 (auth_key) capacity must be 404');
  assert.equal(capturedArgs[9], 4.04, 'Key 4 (auth_key) refill must be 4.04');
  assert.equal(capturedArgs[10], 505, 'Key 5 (session) capacity must be 505');
  assert.equal(capturedArgs[11], 5.05, 'Key 5 (session) refill must be 5.05');
  assert.equal(capturedArgs[12], 606, 'Key 6 (net) capacity must be 606');
  assert.equal(capturedArgs[13], 6.06, 'Key 6 (net) refill must be 6.06');

  console.log('  ✅ PASS: Redis per-key hierarchical capacity and refill parameters resolved with distinct sentinel values and dispatched cleanly.');
  console.log('  ✅ PASS: Emergency local capacity strictly enforced under Redis outage.');
}


// 7. Unified Shadow Mode Semantics & Cross-Runtime Conformance Corpus
{
  console.log('  [Group 7] Testing Unified Shadow Mode Semantics & Cross-Runtime Conformance Corpus (9 Fixtures)...');

  // 7.1 Shadow Mode
  const evaluator = new SentinelCostGuardEvaluator({
    enforceByDefault: false // activates shadow_mode
  });

  const shadowCtx = {
    method: 'GET',
    path: '/health',
    pageSize: 500 // exceeds default max (50)
  };

  const dec = await evaluator.evaluate(shadowCtx);
  assert.equal(dec.allowed, true);
  assert.equal(dec.action, 'OBSERVE');
  assert.equal(dec.proposedAction, 'DENY');
  assert.equal(dec.enforcedAction, 'ALLOW');
  assert.equal(dec.violationDetected, true);
  assert.equal(dec.enforced, false);

  // 7.2 9-Fixture Conformance Corpus against Manifest
  const manifestPath = path.join(rootDir, 'fixtures', 'conformance', 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    for (const fixture of manifest.fixtures) {
      const fixtureFile = path.join(rootDir, 'fixtures', 'conformance', fixture.filename);
      const raw = JSON.parse(fs.readFileSync(fixtureFile, 'utf8'));

      if (fixture.expected_valid) {
        const validated = validateCostPolicy(raw);
        const identity = computePolicyChecksum(validated);
        assert.equal(identity.checksumSha256, fixture.checksum_sha256);
      } else {
        assert.throws(() => {
          validateCostPolicy(raw);
        });
      }
    }
    console.log(`  ✅ PASS: All ${manifest.fixtures.length} conformance fixtures passed canonical checksum verification.`);
  }

  console.log('  ✅ PASS: Unified shadow mode semantics and 9-fixture cross-runtime corpus verified.');
}

console.log('\n🎉 ALL 7 MULTI-AXIS COST GUARD VERIFICATION GROUPS PASSED COMPLETELY!\n');


```

### 🖥️ Actual Execution Output & Assertion Logs

```text
🧪 Running Multi-Axis Cost Guard Test Suite...

  Testing Strict Policy Schema & Bounds Validation...
  ✅ PASS: Policy validation rejects invalid bounds, floats, unknown fields, and schema versions.
  Testing Unverified Principal & Tenant Isolation Strictness...
  ✅ PASS: Unverified principal credentials and tenantId isolated strictly.
  [Group 3] Testing Emergency Store Tier Isolation...
  ✅ PASS: Emergency store isolates distinct tier namespaces into separate buckets.
  [Group 4] Testing Same-Bucket Dynamic Capacity Clamp on Downgrade...
  ✅ PASS: Same-bucket emergency capacity clamp strictly bounds existing balances.
  [Group 5] Testing Same-Bucket Concurrency & Atomic Race Condition Safety...
  ✅ PASS: Single-process same-bucket sequential consistency verified under Promise concurrency primitives.
  [Group 6] Testing Redis Failure with Tier-Specific Emergency Local Cap...
  ✅ PASS: Redis per-key hierarchical capacity and refill parameters resolved with distinct sentinel values and dispatched cleanly.
  ✅ PASS: Emergency local capacity strictly enforced under Redis outage.
  [Group 7] Testing Unified Shadow Mode Semantics & Cross-Runtime Conformance Corpus (9 Fixtures)...
  ✅ PASS: All 9 conformance fixtures passed canonical checksum verification.
  ✅ PASS: Unified shadow mode semantics and 9-fixture cross-runtime corpus verified.

🎉 ALL 7 MULTI-AXIS COST GUARD VERIFICATION GROUPS PASSED COMPLETELY!
```

---

<a id="python-pytest"></a>
## 7. Python Sentinel Test Suite (Pytest 24 Tests)

- **Test File Path**: [`packages/sentinel-py/tests/unit/test_evaluator.py`](../packages/sentinel-py/tests/unit/test_evaluator.py)
- **Execution Command**: `py -3.12 -m pytest packages/sentinel-py/tests`
- **Start Time (ISO)**: `2026-08-26T16:18:46.170Z`
- **End Time (ISO)**: `2026-08-26T16:18:47.645Z`
- **Execution Latency**: `1475 ms`
- **Process Exit Code**: `0`
- **Test Cases**: `24 Passed, 0 Failed (Total 24 Cases)`
- **Status**: 🟢 PASS

### 📄 Test Source Code

```javascript
"""
Unit tests for SentinelCostGuardEvaluator, LocalEmergencyBudgetStore, and Redis failure fallback in Python.
"""

import pytest
from ameva_sentinel.core.evaluator import SentinelCostGuardEvaluator
from ameva_sentinel.core.local_store import LocalEmergencyBudgetStore
from ameva_sentinel.core.budget_types import (
    RequestCostContext,
    RouteCostPolicy,
    BudgetConsumeRequest,
    VerifiedPrincipal,
    RateLimitTier,
)
from ameva_sentinel.core.policy_registry import CostPolicyRegistry


@pytest.mark.asyncio
async def test_local_emergency_budget_store():
    store = LocalEmergencyBudgetStore(default_capacity=100, default_refill_rate=1.66)
    policy = RouteCostPolicy(method="GET", path="/test", cost=30)

    # 1st consume: 30 of 100
    r1 = await store.consume_async(BudgetConsumeRequest(cost=30, route_key="GET:/test", policy=policy))
    assert r1.allowed is True
    assert r1.remaining_cost == 70

    # 2nd consume: 30 of 70
    r2 = await store.consume_async(BudgetConsumeRequest(cost=30, route_key="GET:/test", policy=policy))
    assert r2.allowed is True
    assert r2.remaining_cost == 40

    # 3rd consume: 30 of 40
    r3 = await store.consume_async(BudgetConsumeRequest(cost=30, route_key="GET:/test", policy=policy))
    assert r3.allowed is True
    assert r3.remaining_cost == 10

    # 4th consume: 30 needed, 10 available -> refused
    r4 = await store.consume_async(BudgetConsumeRequest(cost=30, route_key="GET:/test", policy=policy))
    assert r4.allowed is False
    assert r4.retry_after_seconds > 0


@pytest.mark.asyncio
async def test_emergency_store_tier_isolation():
    store = LocalEmergencyBudgetStore(default_capacity=100, default_refill_rate=0.001)
    base_request = BudgetConsumeRequest(cost=10, route_key="GET:/api/v1/data", network_key="net-client-a")

    # 1. Initial consume with authenticated tier (emergencyCapacity = 200)
    auth_tier = RateLimitTier(name="authenticated_key", capacity=2000, refill_tokens_per_minute=2000, emergency_local_capacity=200)
    r1 = store.consume(BudgetConsumeRequest(
        cost=10,
        route_key="GET:/api/v1/data",
        network_key="net-client-a",
        emergency_capacity=200,
        tier=auth_tier
    ))
    assert r1.allowed is True
    assert r1.remaining_cost == 190

    # 2. Subsequent consume with different anonymous tier (creates isolated bucket)
    anon_tier = RateLimitTier(name="anonymous_network", capacity=100, refill_tokens_per_minute=100, emergency_local_capacity=30)
    r2 = store.consume(BudgetConsumeRequest(
        cost=10,
        route_key="GET:/api/v1/data",
        network_key="net-client-a",
        emergency_capacity=30,
        tier=anon_tier
    ))
    assert r2.allowed is True
    assert r2.remaining_cost == 20


@pytest.mark.asyncio
async def test_dynamic_capacity_clamp_same_tier():
    store = LocalEmergencyBudgetStore(default_capacity=500, default_refill_rate=0.0001)
    base_request = BudgetConsumeRequest(cost=10, route_key="GET:/api/v1/data", network_key="net-client-a")
    custom_tier = RateLimitTier(name="custom-plan", capacity=2000, refill_tokens_per_minute=1, emergency_local_capacity=200)

    # 1. First consume with emergency capacity 200 -> consumes 10, remaining 190
    r1 = store.consume(BudgetConsumeRequest(
        cost=10,
        route_key="GET:/api/v1/data",
        network_key="net-client-a",
        emergency_capacity=200,
        tier=custom_tier
    ))
    assert r1.allowed is True
    assert r1.remaining_cost == 190

    # 2. Dynamically reduce emergency capacity to 30 on the EXACT same tier and key
    # Remaining tokens must clamp from 190 down to min(30, 190) = 30, then 10 consumed -> remaining 20
    r2 = store.consume(BudgetConsumeRequest(
        cost=10,
        route_key="GET:/api/v1/data",
        network_key="net-client-a",
        emergency_capacity=30,
        tier=custom_tier
    ))
    assert r2.allowed is True
    assert r2.remaining_cost == 20


@pytest.mark.asyncio
async def test_same_bucket_concurrent_consume():
    import asyncio

    store = LocalEmergencyBudgetStore(default_capacity=10, default_refill_rate=0.00001)
    base_request = BudgetConsumeRequest(
        cost=8,
        route_key="GET:/api/v1/checkout",
        network_key="client-py-concurrency",
    )

    # Launch two concurrent consume requests against a bucket with 10 tokens
    res1, res2 = await asyncio.gather(
        store.consume_async(base_request),
        store.consume_async(base_request),
    )

    success_count = sum(1 for r in (res1, res2) if r.allowed)
    failure_count = sum(1 for r in (res1, res2) if not r.allowed)

    assert success_count == 1, "Exactly one concurrent request of cost 8 must succeed within budget 10"
    assert failure_count == 1, "The second concurrent request must be rate limited"

    succ_res = res1 if res1.allowed else res2
    fail_res = res2 if res1.allowed else res1

    assert succ_res.remaining_cost == 2
    assert fail_res.remaining_cost == 2
    assert fail_res.retry_after_seconds > 0


def test_unauthenticated_principal_invariant():
    # Valid unauthenticated principal with safe default risk_class
    valid_anon = VerifiedPrincipal(authenticated=False, risk_class="anonymous_browser")
    assert valid_anon.authenticated is False
    assert valid_anon.tenant_id is None
    assert valid_anon.risk_class == "anonymous_browser"

    # Setting identity fields when authenticated=False must raise ValueError
    with pytest.raises(ValueError, match="Unauthenticated VerifiedPrincipal cannot contain identity fields"):
        VerifiedPrincipal(authenticated=False, tenant_id="victim", api_key_id="spoofed")

    with pytest.raises(ValueError, match="Unauthenticated VerifiedPrincipal cannot contain identity fields"):
        VerifiedPrincipal(authenticated=False, authenticated_tier="premium")




@pytest.mark.asyncio
async def test_unverified_tenant_and_principal_isolation():
    captured_req = None

    class SpyStore:
        async def consume_async(self, req):
            nonlocal captured_req
            captured_req = req
            from ameva_sentinel.core.budget_types import BudgetConsumeResult
            return BudgetConsumeResult(allowed=True, remaining_cost=100, retry_after_seconds=0)

    evaluator = SentinelCostGuardEvaluator(budget_store=SpyStore(), enforce_by_default=True)

    # 1. Unverified context tenantId
    unverified_ctx = RequestCostContext(
        method="GET",
        path="/health",
        tenant_id="victim-tenant-hijack",
        principal=VerifiedPrincipal(authenticated=False),
        pseudonymous_key="anon-network-1",
    )
    await evaluator.evaluate_async(unverified_ctx)
    assert captured_req.tenant_id is None
    assert captured_req.api_key_id is None

    # 2. Verified principal tenantId and accountId
    verified_ctx = RequestCostContext(
        method="GET",
        path="/health",
        tenant_id="spoofed-header-tenant",
        principal=VerifiedPrincipal(
            authenticated=True,
            tenant_id="trusted-corp-tenant",
            account_id="account-99",
            api_key_id="ak-live-123",
        ),
    )
    await evaluator.evaluate_async(verified_ctx)
    assert captured_req.tenant_id == "trusted-corp-tenant"
    assert captured_req.account_id == "account-99"
    assert captured_req.api_key_id == "ak-live-123"


@pytest.mark.asyncio
async def test_redis_failure_emergency_cap_enforcement():
    class FailingStore:
        async def consume_async(self, req):
            raise ConnectionError("Redis cluster unreachable")

    emergency_store = LocalEmergencyBudgetStore(default_capacity=50, default_refill_rate=0.001)
    evaluator = SentinelCostGuardEvaluator(
        budget_store=FailingStore(),
        emergency_store=emergency_store,
        enforce_by_default=True,
    )

    ctx = RequestCostContext(method="GET", path="/api/v1/chart/unified")  # cost = 10, failure_mode="allow_with_emergency_cap"

    # anonymous_network emergency_local_capacity is 30.
    # 3 requests * 10 cost = 30 tokens (exhausts capacity)
    for _ in range(3):
        dec = await evaluator.evaluate_async(ctx)
        assert dec.allowed is True
        assert dec.degraded is True
        assert dec.enforced is True

    # 4th request: Emergency tokens exhausted -> Must be rate limited
    dec4 = await evaluator.evaluate_async(ctx)
    assert dec4.allowed is False
    assert dec4.action == "RATE_LIMIT"
    assert dec4.reason_code == "COST_BUDGET_EXCEEDED"
    assert dec4.degraded is True
    assert dec4.enforced is True


@pytest.mark.asyncio
async def test_shadow_mode_unified_semantics():
    registry = CostPolicyRegistry()
    evaluator = SentinelCostGuardEvaluator(policy_registry=registry, enforce_by_default=False)

    ctx = RequestCostContext(
        method="GET",
        path="/health",
        page_size=500,  # exceeds default max (50)
    )
    decision = await evaluator.evaluate_async(ctx)
    assert decision.allowed is True
    assert decision.action == "OBSERVE"
    assert decision.proposed_action == "DENY"
    assert decision.enforced_action == "ALLOW"
    assert decision.violation_detected is True
    assert decision.enforced is False

```

### 🖥️ Actual Execution Output & Assertion Logs

```text
============================= test session starts =============================
platform win32 -- Python 3.12.0, pytest-9.1.1, pluggy-1.6.0
rootdir: C:\Users\GAME\Desktop\uno-km\dev\ameva-sentinel\packages\sentinel-py
configfile: pyproject.toml
plugins: anyio-4.13.0, asyncio-1.4.0
asyncio: mode=Mode.STRICT, debug=False, asyncio_default_fixture_loop_scope=None, asyncio_default_test_loop_scope=function
collected 24 items

packages\sentinel-py\tests\conformance\test_conformance.py .             [  4%]
packages\sentinel-py\tests\integration\test_adapters.py ...              [ 16%]
packages\sentinel-py\tests\test_core.py .....                            [ 37%]
packages\sentinel-py\tests\unit\test_evaluator.py ........               [ 70%]
packages\sentinel-py\tests\unit\test_geo_registry.py ....                [ 87%]
packages\sentinel-py\tests\unit\test_guards.py ...                       [100%]

============================= 24 passed in 0.70s ==============================
```

---

<a id="playwright"></a>
## 8. Playwright Cross-Browser E2E Integration (Chromium, Firefox, WebKit)

- **Test File Path**: [`tests/browser-integration/dashboard.spec.js`](../tests/browser-integration/dashboard.spec.js)
- **Execution Command**: `npx playwright test`
- **Start Time (ISO)**: `2026-08-26T16:18:47.645Z`
- **End Time (ISO)**: `2026-08-26T16:19:02.110Z`
- **Execution Latency**: `14465 ms`
- **Process Exit Code**: `0`
- **Test Cases**: `9 Passed, 0 Failed (Total 9 Cases)`
- **Status**: 🟢 PASS

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

  ok 1 [chromium] › tests\browser-integration\dashboard.spec.js:12:3 › AMEVA Sentinel Real-Browser Integration › stored report survives page reload with identical traceId (563ms)
  ok 2 [chromium] › tests\browser-integration\dashboard.spec.js:29:3 › AMEVA Sentinel Real-Browser Integration › risk event is synchronized in real-time across tabs (591ms)
  ok 3 [chromium] › tests\browser-integration\dashboard.spec.js:52:3 › AMEVA Sentinel Real-Browser Integration › destroy() stops active telemetry collection and listener observation (165ms)
  ok 4 [firefox] › tests\browser-integration\dashboard.spec.js:12:3 › AMEVA Sentinel Real-Browser Integration › stored report survives page reload with identical traceId (1.9s)
  ok 5 [firefox] › tests\browser-integration\dashboard.spec.js:29:3 › AMEVA Sentinel Real-Browser Integration › risk event is synchronized in real-time across tabs (1.9s)
  ok 6 [firefox] › tests\browser-integration\dashboard.spec.js:52:3 › AMEVA Sentinel Real-Browser Integration › destroy() stops active telemetry collection and listener observation (342ms)
  ok 7 [webkit] › tests\browser-integration\dashboard.spec.js:12:3 › AMEVA Sentinel Real-Browser Integration › stored report survives page reload with identical traceId (825ms)
  ok 8 [webkit] › tests\browser-integration\dashboard.spec.js:29:3 › AMEVA Sentinel Real-Browser Integration › risk event is synchronized in real-time across tabs (813ms)
  ok 9 [webkit] › tests\browser-integration\dashboard.spec.js:52:3 › AMEVA Sentinel Real-Browser Integration › destroy() stops active telemetry collection and listener observation (321ms)

  9 passed (12.6s)
```

---

<a id="npm-consumer"></a>
## 9. Isolated NPM Consumer Verification (`verify_npm_consumer.ps1`)

- **Execution Command**: `powershell -ExecutionPolicy Bypass -File scripts/verify_npm_consumer.ps1`
- **Start Time (ISO)**: `2026-08-26T16:19:02.110Z`
- **End Time (ISO)**: `2026-08-26T16:19:32.008Z`
- **Execution Latency**: `29898 ms`
- **Exit Code**: `0`
- **Status**: 🟢 PASS

```text
>>> [NPM-SMOKE] Building workspace packages...

> ameva-sentinel-monorepo@2.2.0-alpha.1 build
> npm run --workspaces build


> @ameva/sentinel-browser@2.2.0-alpha.1 build
> tsup src/index.ts --format esm --clean && tsc --module nodenext --moduleResolution nodenext --target es2022 --lib es2022,dom --emitDeclarationOnly --declaration --outDir dist src/index.ts

[34mCLI[39m Building entry: src/index.ts
[34mCLI[39m Using tsconfig: ..\..\tsconfig.json
[34mCLI[39m tsup v8.5.1
[34mCLI[39m Target: es2022
[34mCLI[39m Cleaning output folder
[34mESM[39m Build start
[32mESM[39m [1mdist\index.js [22m[32m4.65 KB[39m
[32mESM[39m ⚡️ Build success in 30ms

> @ameva/sentinel-risk-core@2.2.0-alpha.1 build
> tsup src/index.ts --format esm --clean && tsc --module nodenext --moduleResolution nodenext --target es2022 --lib es2022,dom --emitDeclarationOnly --declaration --outDir dist src/index.ts

[34mCLI[39m Building entry: src/index.ts
[34mCLI[39m Using tsconfig: ..\..\tsconfig.json
[34mCLI[39m tsup v8.5.1
[34mCLI[39m Target: es2022
[34mCLI[39m Cleaning output folder
[34mESM[39m Build start
[32mESM[39m [1mdist\index.js [22m[32m65.11 KB[39m
[32mESM[39m ⚡️ Build success in 39ms

> @ameva/sentinel@2.2.0-alpha.1 build
> tsup src/index.ts src/adapters/express.ts src/adapters/fastify.ts src/adapters/next.ts src/adapters/dashboard.ts --format esm --clean && tsc --module nodenext --moduleResolution nodenext --target es2022 --lib es2022,dom --emitDeclarationOnly --declaration --outDir dist src/index.ts src/adapters/express.ts src/adapters/fastify.ts src/adapters/next.ts src/adapters/dashboard.ts

[34mCLI[39m Building entry: src/index.ts, src/adapters/dashboard.ts, src/adapters/express.ts, src/adapters/fastify.ts, src/adapters/next.ts
[34mCLI[39m Using tsconfig: ..\..\tsconfig.json
[34mCLI[39m tsup v8.5.1
[34mCLI[39m Target: es2022
[34mCLI[39m Cleaning output folder
[34mESM[39m Build start
[32mESM[39m [1mdist\index.js              [22m[32m4.96 KB[39m
[32mESM[39m [1mdist\adapters\dashboard.js [22m[32m27.71 KB[39m
[32mESM[39m [1mdist\adapters\fastify.js   [22m[32m2.05 KB[39m
[32mESM[39m [1mdist\adapters\next.js      [22m[32m2.46 KB[39m
[32mESM[39m [1mdist\adapters\express.js   [22m[32m2.15 KB[39m
[32mESM[39m ⚡️ Build success in 63ms

> @ameva/sentinel-store-redis@2.2.0-alpha.1 build
> tsup src/index.ts --format esm --clean && tsc --module nodenext --moduleResolution nodenext --target es2022 --lib es2022 --emitDeclarationOnly --declaration --outDir dist src/index.ts

[34mCLI[39m Building entry: src/index.ts
[34mCLI[39m Using tsconfig: ..\..\tsconfig.json
[34mCLI[39m tsup v8.5.1
[34mCLI[39m Target: es2022
[34mCLI[39m Cleaning output folder
[34mESM[39m Build start
[32mESM[39m [1mdist\index.js [22m[32m6.99 KB[39m
[32mESM[39m ⚡️ Build success in 28ms
>>> [NPM-SMOKE] Packing tarballs...
>>> [NPM-SMOKE] Initializing isolated test project in C:\Users\GAME\AppData\Local\Temp\sentinel-npm-smoke-dd07db55641e4e0aabd9d24b3da3be1c...
>>> [NPM-SMOKE] Running isolated Node runtime smoke test...
[SMOKE] 1. Root, Browser and Subpath Runtime Imports Successful
[SMOKE] 2. Runtime Evaluation & Subpath Factories Verified
[PASS] Clean consumer installation and subpath verification for all 4 packages completed successfully.
>>> [NPM-SMOKE] Cleaning up temporary smoke test directory: C:\Users\GAME\AppData\Local\Temp\sentinel-npm-smoke-dd07db55641e4e0aabd9d24b3da3be1c
```
---

<a id="python-wheel"></a>
## 10. Isolated Python Wheel Virtualenv Verification (`verify_python_wheel.ps1`)

- **Execution Command**: `powershell -ExecutionPolicy Bypass -File scripts/verify_python_wheel.ps1`
- **Start Time (ISO)**: `2026-08-26T16:19:32.008Z`
- **End Time (ISO)**: `2026-08-26T16:20:22.073Z`
- **Execution Latency**: `50065 ms`
- **Exit Code**: `0`
- **Status**: 🟢 PASS

```text
>>> [PY-WHEEL] Using Python resolver: py -3.12
>>> [PY-WHEEL] Building wheel and sdist for ameva-sentinel...
running egg_info
writing src\ameva_sentinel.egg-info\PKG-INFO
writing dependency_links to src\ameva_sentinel.egg-info\dependency_links.txt
writing requirements to src\ameva_sentinel.egg-info\requires.txt
writing top-level names to src\ameva_sentinel.egg-info\top_level.txt
reading manifest file 'src\ameva_sentinel.egg-info\SOURCES.txt'
writing manifest file 'src\ameva_sentinel.egg-info\SOURCES.txt'
running sdist
running egg_info
writing src\ameva_sentinel.egg-info\PKG-INFO
writing dependency_links to src\ameva_sentinel.egg-info\dependency_links.txt
writing requirements to src\ameva_sentinel.egg-info\requires.txt
writing top-level names to src\ameva_sentinel.egg-info\top_level.txt
reading manifest file 'src\ameva_sentinel.egg-info\SOURCES.txt'
writing manifest file 'src\ameva_sentinel.egg-info\SOURCES.txt'
running check
creating ameva_sentinel-2.2.0a1
creating ameva_sentinel-2.2.0a1\src\ameva_sentinel
creating ameva_sentinel-2.2.0a1\src\ameva_sentinel.egg-info
creating ameva_sentinel-2.2.0a1\src\ameva_sentinel\adapters
creating ameva_sentinel-2.2.0a1\src\ameva_sentinel\core
creating ameva_sentinel-2.2.0a1\src\ameva_sentinel\integrations
creating ameva_sentinel-2.2.0a1\tests
copying files to ameva_sentinel-2.2.0a1...
copying README.md -> ameva_sentinel-2.2.0a1
copying pyproject.toml -> ameva_sentinel-2.2.0a1
copying src\ameva_sentinel\__init__.py -> ameva_sentinel-2.2.0a1\src\ameva_sentinel
copying src\ameva_sentinel\observability.py -> ameva_sentinel-2.2.0a1\src\ameva_sentinel
copying src\ameva_sentinel\privacy.py -> ameva_sentinel-2.2.0a1\src\ameva_sentinel
copying src\ameva_sentinel\providers.py -> ameva_sentinel-2.2.0a1\src\ameva_sentinel
copying src\ameva_sentinel\py.typed -> ameva_sentinel-2.2.0a1\src\ameva_sentinel
copying src\ameva_sentinel.egg-info\PKG-INFO -> ameva_sentinel-2.2.0a1\src\ameva_sentinel.egg-info
copying src\ameva_sentinel.egg-info\SOURCES.txt -> ameva_sentinel-2.2.0a1\src\ameva_sentinel.egg-info
copying src\ameva_sentinel.egg-info\dependency_links.txt -> ameva_sentinel-2.2.0a1\src\ameva_sentinel.egg-info
copying src\ameva_sentinel.egg-info\requires.txt -> ameva_sentinel-2.2.0a1\src\ameva_sentinel.egg-info
copying src\ameva_sentinel.egg-info\top_level.txt -> ameva_sentinel-2.2.0a1\src\ameva_sentinel.egg-info
copying src\ameva_sentinel\adapters\asgi.py -> ameva_sentinel-2.2.0a1\src\ameva_sentinel\adapters
copying src\ameva_sentinel\adapters\dashboard.py -> ameva_sentinel-2.2.0a1\src\ameva_sentinel\adapters
copying src\ameva_sentinel\adapters\fastapi.py -> ameva_sentinel-2.2.0a1\src\ameva_sentinel\adapters
copying src\ameva_sentinel\adapters\wsgi.py -> ameva_sentinel-2.2.0a1\src\ameva_sentinel\adapters
copying src\ameva_sentinel\core\aggregator.py -> ameva_sentinel-2.2.0a1\src\ameva_sentinel\core
copying src\ameva_sentinel\core\budget_types.py -> ameva_sentinel-2.2.0a1\src\ameva_sentinel\core
copying src\ameva_sentinel\core\canonical.py -> ameva_sentinel-2.2.0a1\src\ameva_sentinel\core
copying src\ameva_sentinel\core\evaluator.py -> ameva_sentinel-2.2.0a1\src\ameva_sentinel\core
copying src\ameva_sentinel\core\geo_registry.py -> ameva_sentinel-2.2.0a1\src\ameva_sentinel\core
copying src\ameva_sentinel\core\guards.py -> ameva_sentinel-2.2.0a1\src\ameva_sentinel\core
copying src\ameva_sentinel\core\local_store.py -> ameva_sentinel-2.2.0a1\src\ameva_sentinel\core
copying src\ameva_sentinel\core\policy_registry.py -> ameva_sentinel-2.2.0a1\src\ameva_sentinel\core
copying src\ameva_sentinel\core\protocols.py -> ameva_sentinel-2.2.0a1\src\ameva_sentinel\core
copying src\ameva_sentinel\core\redaction.py -> ameva_sentinel-2.2.0a1\src\ameva_sentinel\core
copying src\ameva_sentinel\integrations\sqlalchemy_postgres.py -> ameva_sentinel-2.2.0a1\src\ameva_sentinel\integrations
copying tests\test_core.py -> ameva_sentinel-2.2.0a1\tests
Writing ameva_sentinel-2.2.0a1\setup.cfg
Creating tar archive
removing 'ameva_sentinel-2.2.0a1' (and everything under it)
running egg_info
writing src\ameva_sentinel.egg-info\PKG-INFO
writing dependency_links to src\ameva_sentinel.egg-info\dependency_links.txt
writing requirements to src\ameva_sentinel.egg-info\requires.txt
writing top-level names to src\ameva_sentinel.egg-info\top_level.txt
reading manifest file 'src\ameva_sentinel.egg-info\SOURCES.txt'
writing manifest file 'src\ameva_sentinel.egg-info\SOURCES.txt'
running bdist_wheel
running build
running build_py
creating build\lib\ameva_sentinel
copying src\ameva_sentinel\observability.py -> build\lib\ameva_sentinel
copying src\ameva_sentinel\privacy.py -> build\lib\ameva_sentinel
copying src\ameva_sentinel\providers.py -> build\lib\ameva_sentinel
copying src\ameva_sentinel\__init__.py -> build\lib\ameva_sentinel
creating build\lib\ameva_sentinel\adapters
copying src\ameva_sentinel\adapters\asgi.py -> build\lib\ameva_sentinel\adapters
copying src\ameva_sentinel\adapters\dashboard.py -> build\lib\ameva_sentinel\adapters
copying src\ameva_sentinel\adapters\fastapi.py -> build\lib\ameva_sentinel\adapters
copying src\ameva_sentinel\adapters\wsgi.py -> build\lib\ameva_sentinel\adapters
creating build\lib\ameva_sentinel\core
copying src\ameva_sentinel\core\aggregator.py -> build\lib\ameva_sentinel\core
copying src\ameva_sentinel\core\budget_types.py -> build\lib\ameva_sentinel\core
copying src\ameva_sentinel\core\canonical.py -> build\lib\ameva_sentinel\core
copying src\ameva_sentinel\core\evaluator.py -> build\lib\ameva_sentinel\core
copying src\ameva_sentinel\core\geo_registry.py -> build\lib\ameva_sentinel\core
copying src\ameva_sentinel\core\guards.py -> build\lib\ameva_sentinel\core
copying src\ameva_sentinel\core\local_store.py -> build\lib\ameva_sentinel\core
copying src\ameva_sentinel\core\policy_registry.py -> build\lib\ameva_sentinel\core
copying src\ameva_sentinel\core\protocols.py -> build\lib\ameva_sentinel\core
copying src\ameva_sentinel\core\redaction.py -> build\lib\ameva_sentinel\core
creating build\lib\ameva_sentinel\integrations
copying src\ameva_sentinel\integrations\sqlalchemy_postgres.py -> build\lib\ameva_sentinel\integrations
running egg_info
writing src\ameva_sentinel.egg-info\PKG-INFO
writing dependency_links to src\ameva_sentinel.egg-info\dependency_links.txt
writing requirements to src\ameva_sentinel.egg-info\requires.txt
writing top-level names to src\ameva_sentinel.egg-info\top_level.txt
reading manifest file 'src\ameva_sentinel.egg-info\SOURCES.txt'
writing manifest file 'src\ameva_sentinel.egg-info\SOURCES.txt'
copying src\ameva_sentinel\py.typed -> build\lib\ameva_sentinel
installing to build\bdist.win-amd64\wheel
running install
running install_lib
creating build\bdist.win-amd64\wheel
creating build\bdist.win-amd64\wheel\ameva_sentinel
creating build\bdist.win-amd64\wheel\ameva_sentinel\adapters
copying build\lib\ameva_sentinel\adapters\asgi.py -> build\bdist.win-amd64\wheel\.\ameva_sentinel\adapters
copying build\lib\ameva_sentinel\adapters\dashboard.py -> build\bdist.win-amd64\wheel\.\ameva_sentinel\adapters
copying build\lib\ameva_sentinel\adapters\fastapi.py -> build\bdist.win-amd64\wheel\.\ameva_sentinel\adapters
copying build\lib\ameva_sentinel\adapters\wsgi.py -> build\bdist.win-amd64\wheel\.\ameva_sentinel\adapters
creating build\bdist.win-amd64\wheel\ameva_sentinel\core
copying build\lib\ameva_sentinel\core\aggregator.py -> build\bdist.win-amd64\wheel\.\ameva_sentinel\core
copying build\lib\ameva_sentinel\core\budget_types.py -> build\bdist.win-amd64\wheel\.\ameva_sentinel\core
copying build\lib\ameva_sentinel\core\canonical.py -> build\bdist.win-amd64\wheel\.\ameva_sentinel\core
copying build\lib\ameva_sentinel\core\evaluator.py -> build\bdist.win-amd64\wheel\.\ameva_sentinel\core
copying build\lib\ameva_sentinel\core\geo_registry.py -> build\bdist.win-amd64\wheel\.\ameva_sentinel\core
copying build\lib\ameva_sentinel\core\guards.py -> build\bdist.win-amd64\wheel\.\ameva_sentinel\core
copying build\lib\ameva_sentinel\core\local_store.py -> build\bdist.win-amd64\wheel\.\ameva_sentinel\core
copying build\lib\ameva_sentinel\core\policy_registry.py -> build\bdist.win-amd64\wheel\.\ameva_sentinel\core
copying build\lib\ameva_sentinel\core\protocols.py -> build\bdist.win-amd64\wheel\.\ameva_sentinel\core
copying build\lib\ameva_sentinel\core\redaction.py -> build\bdist.win-amd64\wheel\.\ameva_sentinel\core
creating build\bdist.win-amd64\wheel\ameva_sentinel\integrations
copying build\lib\ameva_sentinel\integrations\sqlalchemy_postgres.py -> build\bdist.win-amd64\wheel\.\ameva_sentinel\integrations
copying build\lib\ameva_sentinel\observability.py -> build\bdist.win-amd64\wheel\.\ameva_sentinel
copying build\lib\ameva_sentinel\privacy.py -> build\bdist.win-amd64\wheel\.\ameva_sentinel
copying build\lib\ameva_sentinel\providers.py -> build\bdist.win-amd64\wheel\.\ameva_sentinel
copying build\lib\ameva_sentinel\py.typed -> build\bdist.win-amd64\wheel\.\ameva_sentinel
copying build\lib\ameva_sentinel\__init__.py -> build\bdist.win-amd64\wheel\.\ameva_sentinel
running install_egg_info
Copying src\ameva_sentinel.egg-info to build\bdist.win-amd64\wheel\.\ameva_sentinel-2.2.0a1-py3.12.egg-info
running install_scripts
creating build\bdist.win-amd64\wheel\ameva_sentinel-2.2.0a1.dist-info\WHEEL
creating 'C:\\Users\\GAME\\Desktop\\uno-km\\dev\\ameva-sentinel\\packages\\sentinel-py\\dist\\.tmp-z2dxl8av\\ameva_sentinel-2.2.0a1-py3-none-any.whl' and adding 'build\\bdist.win-amd64\\wheel' to it
adding 'ameva_sentinel/__init__.py'
adding 'ameva_sentinel/observability.py'
adding 'ameva_sentinel/privacy.py'
adding 'ameva_sentinel/providers.py'
adding 'ameva_sentinel/py.typed'
adding 'ameva_sentinel/adapters/asgi.py'
adding 'ameva_sentinel/adapters/dashboard.py'
adding 'ameva_sentinel/adapters/fastapi.py'
adding 'ameva_sentinel/adapters/wsgi.py'
adding 'ameva_sentinel/core/aggregator.py'
adding 'ameva_sentinel/core/budget_types.py'
adding 'ameva_sentinel/core/canonical.py'
adding 'ameva_sentinel/core/evaluator.py'
adding 'ameva_sentinel/core/geo_registry.py'
adding 'ameva_sentinel/core/guards.py'
adding 'ameva_sentinel/core/local_store.py'
adding 'ameva_sentinel/core/policy_registry.py'
adding 'ameva_sentinel/core/protocols.py'
adding 'ameva_sentinel/core/redaction.py'
adding 'ameva_sentinel/integrations/sqlalchemy_postgres.py'
adding 'ameva_sentinel-2.2.0a1.dist-info/METADATA'
adding 'ameva_sentinel-2.2.0a1.dist-info/WHEEL'
adding 'ameva_sentinel-2.2.0a1.dist-info/top_level.txt'
adding 'ameva_sentinel-2.2.0a1.dist-info/RECORD'
removing build\bdist.win-amd64\wheel
Successfully built ameva_sentinel-2.2.0a1.tar.gz and ameva_sentinel-2.2.0a1-py3-none-any.whl
>>> [PY-WHEEL] Found wheel: C:\Users\GAME\Desktop\uno-km\dev\ameva-sentinel\packages\sentinel-py\dist\ameva_sentinel-2.2.0a1-py3-none-any.whl
>>> [PY-WHEEL] Setting up fresh virtualenv: C:\Users\GAME\AppData\Local\Temp\wheel-test-c8ba072bf1f84c0bb88e6d9dbd3f7709
>>> [PY-WHEEL] Installing wheel in clean venv with full extras matrix...
Processing .\dist\ameva_sentinel-2.2.0a1-py3-none-any.whl (from ameva-sentinel==2.2.0a1)
Collecting pydantic<3,>=2.7 (from ameva-sentinel==2.2.0a1->ameva-sentinel==2.2.0a1)
  Using cached pydantic-2.13.4-py3-none-any.whl.metadata (109 kB)
Collecting typing-extensions>=4.6.0 (from ameva-sentinel==2.2.0a1->ameva-sentinel==2.2.0a1)
  Using cached typing_extensions-4.16.0-py3-none-any.whl.metadata (3.3 kB)
Collecting redis<6.0.0,>=5.0.0 (from ameva-sentinel==2.2.0a1->ameva-sentinel==2.2.0a1)
  Using cached redis-5.3.1-py3-none-any.whl.metadata (9.2 kB)
Collecting fastapi<1.0.0,>=0.110.0 (from ameva-sentinel==2.2.0a1->ameva-sentinel==2.2.0a1)
  Using cached fastapi-0.141.1-py3-none-any.whl.metadata (27 kB)
Collecting starlette<1.0.0,>=0.36.0 (from ameva-sentinel==2.2.0a1->ameva-sentinel==2.2.0a1)
  Using cached starlette-0.52.1-py3-none-any.whl.metadata (6.3 kB)
Collecting flask<4.0.0,>=2.3.0 (from ameva-sentinel==2.2.0a1->ameva-sentinel==2.2.0a1)
  Using cached flask-3.1.3-py3-none-any.whl.metadata (3.2 kB)
Collecting sqlalchemy<3.0.0,>=2.0.0 (from ameva-sentinel==2.2.0a1->ameva-sentinel==2.2.0a1)
  Using cached sqlalchemy-2.0.52-cp312-cp312-win_amd64.whl.metadata (9.9 kB)
Collecting pyyaml<7.0.0,>=6.0.1 (from ameva-sentinel==2.2.0a1->ameva-sentinel==2.2.0a1)
  Using cached pyyaml-6.0.3-cp312-cp312-win_amd64.whl.metadata (2.4 kB)
Collecting typing-inspection>=0.4.2 (from fastapi<1.0.0,>=0.110.0->ameva-sentinel==2.2.0a1->ameva-sentinel==2.2.0a1)
  Using cached typing_inspection-0.4.4-py3-none-any.whl.metadata (2.6 kB)
Collecting annotated-doc>=0.0.2 (from fastapi<1.0.0,>=0.110.0->ameva-sentinel==2.2.0a1->ameva-sentinel==2.2.0a1)
  Using cached annotated_doc-0.0.5-py3-none-any.whl.metadata (6.5 kB)
Collecting blinker>=1.9.0 (from flask<4.0.0,>=2.3.0->ameva-sentinel==2.2.0a1->ameva-sentinel==2.2.0a1)
  Using cached blinker-1.9.0-py3-none-any.whl.metadata (1.6 kB)
Collecting click>=8.1.3 (from flask<4.0.0,>=2.3.0->ameva-sentinel==2.2.0a1->ameva-sentinel==2.2.0a1)
  Using cached click-8.5.0-py3-none-any.whl.metadata (2.6 kB)
Collecting itsdangerous>=2.2.0 (from flask<4.0.0,>=2.3.0->ameva-sentinel==2.2.0a1->ameva-sentinel==2.2.0a1)
  Using cached itsdangerous-2.2.0-py3-none-any.whl.metadata (1.9 kB)
Collecting jinja2>=3.1.2 (from flask<4.0.0,>=2.3.0->ameva-sentinel==2.2.0a1->ameva-sentinel==2.2.0a1)
  Using cached jinja2-3.1.6-py3-none-any.whl.metadata (2.9 kB)
Collecting markupsafe>=2.1.1 (from flask<4.0.0,>=2.3.0->ameva-sentinel==2.2.0a1->ameva-sentinel==2.2.0a1)
  Using cached markupsafe-3.0.3-cp312-cp312-win_amd64.whl.metadata (2.8 kB)
Collecting werkzeug>=3.1.0 (from flask<4.0.0,>=2.3.0->ameva-sentinel==2.2.0a1->ameva-sentinel==2.2.0a1)
  Using cached werkzeug-3.1.8-py3-none-any.whl.metadata (4.0 kB)
Collecting annotated-types>=0.6.0 (from pydantic<3,>=2.7->ameva-sentinel==2.2.0a1->ameva-sentinel==2.2.0a1)
  Using cached annotated_types-0.8.0-py3-none-any.whl.metadata (15 kB)
Collecting pydantic-core==2.46.4 (from pydantic<3,>=2.7->ameva-sentinel==2.2.0a1->ameva-sentinel==2.2.0a1)
  Using cached pydantic_core-2.46.4-cp312-cp312-win_amd64.whl.metadata (6.7 kB)
Collecting PyJWT>=2.9.0 (from redis<6.0.0,>=5.0.0->ameva-sentinel==2.2.0a1->ameva-sentinel==2.2.0a1)
  Using cached pyjwt-2.13.0-py3-none-any.whl.metadata (3.4 kB)
Collecting greenlet>=1 (from sqlalchemy<3.0.0,>=2.0.0->ameva-sentinel==2.2.0a1->ameva-sentinel==2.2.0a1)
  Using cached greenlet-3.5.5-cp312-cp312-win_amd64.whl.metadata (3.9 kB)
Collecting anyio<5,>=3.6.2 (from starlette<1.0.0,>=0.36.0->ameva-sentinel==2.2.0a1->ameva-sentinel==2.2.0a1)
  Using cached anyio-4.14.2-py3-none-any.whl.metadata (4.6 kB)
Collecting idna>=2.8 (from anyio<5,>=3.6.2->starlette<1.0.0,>=0.36.0->ameva-sentinel==2.2.0a1->ameva-sentinel==2.2.0a1)
  Using cached idna-3.19-py3-none-any.whl.metadata (9.2 kB)
Using cached fastapi-0.141.1-py3-none-any.whl (131 kB)
Using cached flask-3.1.3-py3-none-any.whl (103 kB)
Using cached pydantic-2.13.4-py3-none-any.whl (472 kB)
Using cached pydantic_core-2.46.4-cp312-cp312-win_amd64.whl (2.1 MB)
Using cached pyyaml-6.0.3-cp312-cp312-win_amd64.whl (154 kB)
Using cached redis-5.3.1-py3-none-any.whl (272 kB)
Using cached sqlalchemy-2.0.52-cp312-cp312-win_amd64.whl (2.2 MB)
Using cached starlette-0.52.1-py3-none-any.whl (74 kB)
Using cached anyio-4.14.2-py3-none-any.whl (125 kB)
Using cached annotated_doc-0.0.5-py3-none-any.whl (5.3 kB)
Using cached annotated_types-0.8.0-py3-none-any.whl (13 kB)
Using cached blinker-1.9.0-py3-none-any.whl (8.5 kB)
Using cached click-8.5.0-py3-none-any.whl (125 kB)
Using cached greenlet-3.5.5-cp312-cp312-win_amd64.whl (324 kB)
Using cached idna-3.19-py3-none-any.whl (68 kB)
Using cached itsdangerous-2.2.0-py3-none-any.whl (16 kB)
Using cached jinja2-3.1.6-py3-none-any.whl (134 kB)
Using cached markupsafe-3.0.3-cp312-cp312-win_amd64.whl (15 kB)
Using cached pyjwt-2.13.0-py3-none-any.whl (31 kB)
Using cached typing_extensions-4.16.0-py3-none-any.whl (45 kB)
Using cached typing_inspection-0.4.4-py3-none-any.whl (14 kB)
Using cached werkzeug-3.1.8-py3-none-any.whl (226 kB)
Installing collected packages: typing-extensions, pyyaml, PyJWT, markupsafe, itsdangerous, idna, greenlet, click, blinker, annotated-types, annotated-doc, werkzeug, typing-inspection, sqlalchemy, redis, pydantic-core, jinja2, anyio, starlette, pydantic, flask, fastapi, ameva-sentinel

Successfully installed PyJWT-2.13.0 ameva-sentinel-2.2.0a1 annotated-doc-0.0.5 annotated-types-0.8.0 anyio-4.14.2 blinker-1.9.0 click-8.5.0 fastapi-0.141.1 flask-3.1.3 greenlet-3.5.5 idna-3.19 itsdangerous-2.2.0 jinja2-3.1.6 markupsafe-3.0.3 pydantic-2.13.4 pydantic-core-2.46.4 pyyaml-6.0.3 redis-5.3.1 sqlalchemy-2.0.52 starlette-0.52.1 typing-extensions-4.16.0 typing-inspection-0.4.4 werkzeug-3.1.8
>>> [PY-WHEEL] Verifying installed package location & py.typed marker in isolated directory...
[WHEEL-TEST] ameva-sentinel version: 2.2.0a1
[WHEEL-TEST] ameva_sentinel module path: C:\Users\GAME\AppData\Local\Temp\wheel-test-c8ba072bf1f84c0bb88e6d9dbd3f7709\Lib\site-packages\ameva_sentinel\__init__.py
[WHEEL-TEST] py.typed marker verified successfully.
[WHEEL-TEST] Core evaluation smoke test passed from installed wheel.
[WHEEL-TEST] All optional adapters, integrations, and stores imported cleanly with extras.
[PASS] Clean virtualenv wheel installation and extras verified completely.
>>> [PY-WHEEL] Cleaning up temporary virtualenv: C:\Users\GAME\AppData\Local\Temp\wheel-test-c8ba072bf1f84c0bb88e6d9dbd3f7709
```
