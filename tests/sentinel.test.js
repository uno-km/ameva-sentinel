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
} from '../packages/sentinel/src/index.js';
import { createBrowserTelemetry } from '../packages/browser-sdk/src/index.js';

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
    assert.strictEqual(report.schemaVersion, undefined); // In return object
    assert.ok(report.signals !== undefined, 'Report must contain sanitized derived signals');
    assert.strictEqual(report.signals.webdriver, false);
  });

  // 2. Stateful Sliding-Window Request Burst Counter Test
  await it('should automatically track sliding-window request rates and trigger burst rules on high frequency', async () => {
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

  // 3. Enforce Mode & Event Store Vertical Plumbing Test
  await it('createSentinel({ mode: "enforce", eventStore }) should enforce and persist to store', async () => {
    const eventStore = new MemoryRiskEventStore();
    const enforcingSentinel = createSentinel({
      mode: 'enforce',
      eventStore
    });

    const mockReq = {
      testClientId: 'test_client_007',
      headers: {
        'user-agent': 'HeadlessChrome/128.0'
      },
      body: {
        webdriver: true,
        telemetry_observed: true,
        observation_duration_ms: 10000,
        trusted_events: 0
      }
    };

    const risk = await enforcingSentinel.score(mockReq);

    assert.strictEqual(risk.enforcementMode, 'ENFORCE');
    assert.strictEqual(risk.action, SentinelAction.OBSERVE);
    assert.strictEqual(risk.recommendedAction, SentinelAction.OBSERVE);

    const stored = await eventStore.list();
    assert.strictEqual(stored.length, 1);
    assert.strictEqual(stored[0].traceId, risk.traceId);
    assert.strictEqual(stored[0].score, risk.score);
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
