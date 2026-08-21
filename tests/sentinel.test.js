/**
 * AMEVA Sentinel - 1-Line Facade End-to-End Test Suite
 */
import assert from 'node:assert';
import { sentinel, createSentinel, SentinelAction, MemoryRiskEventStore } from '../packages/sentinel/src/index.js';

console.log('\n🧪 Running AMEVA Sentinel End-to-End Facade Test Suite...\n');

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
  // 1. Clean User HTTP Request in Default Shadow Mode
  await it('sentinel.score(req) in Shadow Mode should evaluate standard human as ALLOW', async () => {
    const mockReq = {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'sec-ch-ua-mobile': '?0'
      },
      body: {
        token: 'signed_jwt_token_123',
        trusted_events: 8,
        burst_count: 2,
        timestamp: Date.now() - 200
      }
    };

    const risk = await sentinel.score(mockReq);

    assert.strictEqual(risk.score, 0);
    assert.strictEqual(risk.action, SentinelAction.ALLOW);
    assert.strictEqual(risk.recommendedAction, SentinelAction.ALLOW);
    assert.strictEqual(risk.enforcementMode, 'SHADOW');
    assert.ok(risk.confidence >= 0.75);
    assert.ok(risk.traceId.startsWith('trc_'));
  });

  // 2. High-Burst Headless automation in Shadow Mode
  await it('sentinel.score(req) in Shadow Mode should return action=OBSERVE and recommendedAction=REQUIRE_APP_VERIFICATION', async () => {
    const mockReq = {
      headers: {
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/128.0.0.0 Safari/537.36'
      },
      body: {
        webdriver: true,
        burst_count: 55,
        trusted_events: 0,
        timestamp: Date.now()
      }
    };

    const risk = await sentinel.score(mockReq);

    assert.ok(risk.score >= 75, `Expected high risk >= 75, got ${risk.score}`);
    assert.strictEqual(risk.action, SentinelAction.OBSERVE, 'In Shadow Mode, action must remain OBSERVE');
    assert.strictEqual(risk.recommendedAction, SentinelAction.REQUIRE_APP_VERIFICATION);
    assert.strictEqual(risk.enforcementMode, 'SHADOW');
    assert.ok(risk.evidence.length >= 3);
  });

  // 3. Enforce Mode & Store Adapter Pipeline Test
  await it('createSentinel({ mode: "enforce", eventStore }) should enforce and persist to store', async () => {
    const store = new MemoryRiskEventStore();
    const enforcingSentinel = createSentinel({ mode: 'enforce', eventStore: store });

    const mockReq = {
      headers: {
        'user-agent': 'HeadlessChrome/128.0'
      },
      body: {
        webdriver: true,
        burst_count: 70,
        trusted_events: 0
      }
    };

    const risk = await enforcingSentinel.score(mockReq);

    assert.strictEqual(risk.enforcementMode, 'ENFORCE');
    assert.strictEqual(risk.action, SentinelAction.REQUIRE_APP_VERIFICATION);

    // Verify stored in memory store
    const stored = await store.list();
    assert.strictEqual(stored.length, 1);
    assert.strictEqual(stored[0].traceId, risk.traceId);
    assert.strictEqual(stored[0].score, risk.score);
  });

  console.log('\n------------------------------------------------');
  console.log(`Total End-to-End Tests: ${passedTests + failedTests}`);
  console.log(`Passed:                 ${passedTests}`);
  console.log(`Failed:                 ${failedTests}`);
  console.log('------------------------------------------------\n');

  if (failedTests > 0) process.exit(1);
}

run();
