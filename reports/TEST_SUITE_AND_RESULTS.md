# 🛡️ AMEVA-Sentinel — Comprehensive Test Suite & Execution Results Report

> **Generated At**: `2026-08-21T01:37:08.999Z`  
> **Repository**: [https://github.com/uno-km/ameva-sentinel.git](https://github.com/uno-km/ameva-sentinel.git)  
> **Monorepo Version**: `0.5.0-alpha.1`  
> **Execution Engine**: Node.js `v24.16.0` on `win32`

---

## 📊 0-Point Baseline Executive Scorecard

| Test Category | Tests Passed | Execution Time | Score Points | Status |
| :--- | :---: | :---: | :---: | :---: |
| **Risk Engine Quality Gates** | `7 / 7` | `81ms` | **35.0 / 35 pts** | 🟢 PASS |
| **Facade & State Enforcement** | `3 / 3` | `98ms` | **30.0 / 30 pts** | 🟢 PASS |
| **Persistence & Schema Bounds** | `4 / 4` | `75ms` | **20.0 / 20 pts** | 🟢 PASS |
| **Browser SDK Unit Verification** | `2 / 2` | `82ms` | **15.0 / 15 pts** | 🟢 PASS |
| **Playwright Real-Browser E2E Spec** | `3 specs defined` | `N/A` | **Spec Defined** | 🔵 READY |
| **TOTAL AUDIT SCORE** | **16 Passed / 0 Failed** | **—** | **100.0 / 100 pts (Grade A+)** | 🏆 **100% PASS** |

---

## 📑 Test Suites Index

- [1. Risk Core Engine & Boundary Quality Gate Tests](#engine)
- [2. Sentinel Facade & Stateful Rate Enforcement Tests](#sentinel)
- [3. RiskEventStore Persistence & Strict Schema Validation Tests](#store)
- [4. @ameva/sentinel-browser Client Telemetry Unit Tests](#browser)
- [5. Playwright Real-Browser Integration E2E Spec](#playwright)

---

<a id="engine"></a>
## 1. Risk Core Engine & Boundary Quality Gate Tests

- **Test File Path**: [`tests/engine.test.js`](file:///C:/Users/GAME/Desktop/uno-km/dev/ameva-sentinel/tests/engine.test.js)
- **Execution Command**: `node tests/engine.test.js`
- **Execution Latency**: `81 ms`
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
## 2. Sentinel Facade & Stateful Rate Enforcement Tests

- **Test File Path**: [`tests/sentinel.test.js`](file:///C:/Users/GAME/Desktop/uno-km/dev/ameva-sentinel/tests/sentinel.test.js)
- **Execution Command**: `node tests/sentinel.test.js`
- **Execution Latency**: `98 ms`
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
## 3. RiskEventStore Persistence & Strict Schema Validation Tests

- **Test File Path**: [`tests/store.test.js`](file:///C:/Users/GAME/Desktop/uno-km/dev/ameva-sentinel/tests/store.test.js)
- **Execution Command**: `node tests/store.test.js`
- **Execution Latency**: `75 ms`
- **Results**: `4 Passed, 0 Failed`

### 📄 Test Source Code

```javascript
/**
 * AMEVA Sentinel - RiskEventStore Unit & Edge Case Test Suite
 */
import assert from 'node:assert';
import {
  MemoryRiskEventStore,
  LocalStorageRiskEventStore,
  SentinelAction,
  evaluate,
  toStoredRiskEvent
} from '../packages/risk-core/dist/index.js';

console.log('\n🧪 Running AMEVA Sentinel RiskEventStore Test Suite...\n');

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
  // 1. Basic Append and List Retrieval
  await it('should append and list reports with schemaVersion 1.0', async () => {
    const store = new MemoryRiskEventStore();
    const mockReport = {
      traceId: 'trc_001',
      score: 25,
      evidenceConfidence: 0.88,
      action: SentinelAction.OBSERVE,
      recommendedAction: SentinelAction.OBSERVE,
      enforcementMode: 'SHADOW',
      policyVersion: '2026-08-21.1',
      evidence: [],
      evaluatedAt: new Date().toISOString()
    };

    await store.append(mockReport);
    const list = await store.list();

    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].traceId, 'trc_001');
    assert.strictEqual(list[0].schemaVersion, '1.0');
  });

  // 2. Idempotency (Deduplication on identical traceId)
  await it('should be idempotent and deduplicate appends with identical traceId', async () => {
    const store = new MemoryRiskEventStore();
    const report = {
      traceId: 'trc_dup_999',
      score: 30,
      evidenceConfidence: 0.85,
      action: SentinelAction.OBSERVE,
      recommendedAction: SentinelAction.RATE_LIMIT,
      enforcementMode: 'SHADOW',
      policyVersion: '2026-08-21.1',
      evidence: [],
      evaluatedAt: new Date().toISOString()
    };

    await store.append(report);
    await store.append(report); // Duplicate append
    await store.append(report); // Duplicate append

    const list = await store.list();
    assert.strictEqual(list.length, 1, 'Store must contain exactly 1 entry for duplicate traceId');
  });

  // 3. FIFO Capacity Limit Eviction
  await it('should evict oldest items in FIFO order when exceeding maxItems', async () => {
    const store = new MemoryRiskEventStore({ maxItems: 3 });

    for (let i = 1; i <= 5; i++) {
      await store.append({
        traceId: `trc_${i}`,
        score: i * 10,
        evidenceConfidence: 0.9,
        action: SentinelAction.ALLOW,
        recommendedAction: SentinelAction.ALLOW,
        enforcementMode: 'SHADOW',
        policyVersion: '2026-08-21.1',
        evidence: [],
        evaluatedAt: new Date().toISOString()
      });
    }

    const list = await store.list();
    assert.strictEqual(list.length, 3, 'Store must clamp to maxItems (3)');
    assert.strictEqual(list[0].traceId, 'trc_5', 'Most recent item must be at index 0');
    assert.strictEqual(list[1].traceId, 'trc_4');
    assert.strictEqual(list[2].traceId, 'trc_3');
  });

  // 4. TTL Expired Event Pruning
  await it('should prune expired events beyond maxAgeMs', async () => {
    const store = new MemoryRiskEventStore({ maxAgeMs: 1000 }); // 1 second TTL

    const oldReport = {
      traceId: 'trc_old',
      score: 10,
      evidenceConfidence: 0.8,
      action: SentinelAction.ALLOW,
      recommendedAction: SentinelAction.ALLOW,
      enforcementMode: 'SHADOW',
      policyVersion: '2026-08-21.1',
      evidence: [],
      evaluatedAt: new Date(Date.now() - 5000).toISOString() // 5 seconds ago
    };

    await store.append(oldReport);

    const list = await store.list();
    assert.strictEqual(list.length, 0, 'Expired event must be pruned on list()');
  });

  console.log('\n------------------------------------------------');
  console.log(`Total Store Tests: ${passedTests + failedTests}`);
  console.log(`Passed:            ${passedTests}`);
  console.log(`Failed:            ${failedTests}`);
  console.log('------------------------------------------------\n');

  if (failedTests > 0) {
    process.exitCode = 1;
    console.error(`🚨 STORE TEST SUITE FAILED: ${failedTests} test(s) failed.`);
    process.exit(1);
  }
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

------------------------------------------------
Total Store Tests: 4
Passed:            4
Failed:            0
------------------------------------------------
```

---

<a id="browser"></a>
## 4. @ameva/sentinel-browser Client Telemetry Unit Tests

- **Test File Path**: [`tests/browser.test.js`](file:///C:/Users/GAME/Desktop/uno-km/dev/ameva-sentinel/tests/browser.test.js)
- **Execution Command**: `node tests/browser.test.js`
- **Execution Latency**: `82 ms`
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
## 5. Playwright Real-Browser Integration E2E Spec

- **Test File Path**: [`tests/browser-integration/dashboard.spec.js`](file:///C:/Users/GAME/Desktop/uno-km/dev/ameva-sentinel/tests/browser-integration/dashboard.spec.js)

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

  test('risk event is synchronized in real-time across tabs', async ({ context }) => {
    const producer = await context.newPage();
    const dashboard = await context.newPage();

    await producer.goto('/packages/dashboard/index.html');
    await dashboard.goto('/packages/dashboard/index.html');

    const before = Number(await dashboard.locator('[data-testid="event-count"]').textContent());

    // Generate event on producer tab
    await producer.getByRole('button', { name: /simulate headless bot/i }).click();

    // Verify dashboard tab updates count dynamically without reload
    await expect(dashboard.locator('[data-testid="event-count"]')).toHaveText(String(before + 1));
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

    expect(during.pointerEventCount).toBeGreaterThanOrEqual(before.pointerEventCount);

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
Spec file ready for Chromium, Firefox, and WebKit execution via `npm run test:e2e`
```

---
