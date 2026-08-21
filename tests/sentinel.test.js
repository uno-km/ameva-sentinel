/**
 * AMEVA Sentinel - Facade & Stateful Rate Tracking Test Suite
 */
import assert from 'node:assert';
import {
  sentinel,
  createSentinel,
  SentinelAction,
  MemoryCounterStore,
  MemoryRiskEventStore
} from '../packages/sentinel/src/index.js';

console.log('\n🧪 Running AMEVA Sentinel Facade & Stateful Rate Test Suite...\n');

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
  // 1. Single Clean Request in Default Shadow Mode
  await it('sentinel.score(req) should evaluate single human request as ALLOW', async () => {
    const mockReq = {
      headers: {
        'x-forwarded-for': '203.0.113.195',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36'
      },
      body: {
        token: 'signed_jwt_token_123',
        telemetry_observed: true,
        observation_duration_ms: 8000,
        trusted_events: 12,
        timestamp: Date.now() - 300
      }
    };

    const risk = await sentinel.score(mockReq);

    assert.strictEqual(risk.score, 0);
    assert.strictEqual(risk.action, SentinelAction.ALLOW);
    assert.strictEqual(risk.recommendedAction, SentinelAction.ALLOW);
    assert.strictEqual(risk.enforcementMode, 'SHADOW');
    assert.ok(risk.evidenceConfidence >= 0.75);
    assert.ok(risk.traceId.startsWith('trc_'));
  });

  // 2. Stateful Sliding-Window Request Burst Counter Test
  await it('should automatically track sliding-window request rates and trigger burst rules on high frequency', async () => {
    const counterStore = new MemoryCounterStore();
    const rateSentinel = createSentinel({
      mode: 'shadow',
      counterStore
    });

    const attackerReq = {
      headers: {
        'x-forwarded-for': '198.51.100.77',
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
    assert.strictEqual(lastReport.recommendedAction, SentinelAction.OBSERVE); // 45 is OBSERVE (21~49)

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
      headers: {
        'x-forwarded-for': '192.0.2.1',
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
    assert.strictEqual(risk.action, SentinelAction.OBSERVE); // 25 score is OBSERVE
    assert.strictEqual(risk.recommendedAction, SentinelAction.OBSERVE);

    const stored = await eventStore.list();
    assert.strictEqual(stored.length, 1);
    assert.strictEqual(stored[0].traceId, risk.traceId);
    assert.strictEqual(stored[0].score, risk.score);
  });

  console.log('\n------------------------------------------------');
  console.log(`Total Facade & Rate Tests: ${passedTests + failedTests}`);
  console.log(`Passed:                   ${passedTests}`);
  console.log(`Failed:                   ${failedTests}`);
  console.log('------------------------------------------------\n');

  if (failedTests > 0) {
    process.exitCode = 1;
    console.error(`🚨 QUALITY GATE FAILED: ${failedTests} test(s) did not pass.`);
    process.exit(1);
  }
}

run();
