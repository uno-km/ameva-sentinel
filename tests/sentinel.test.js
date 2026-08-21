/**
 * AMEVA Sentinel - 1-Line Facade End-to-End Test Suite
 */
import assert from 'node:assert';
import { sentinel, SentinelAction } from '../packages/sentinel/src/index.js';

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
  // 1. Clean User HTTP Request (Standard Browser UA & Token)
  await it('sentinel.score(req) should evaluate standard human browser request as ALLOW', async () => {
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
    assert.ok(risk.confidence >= 0.75);
    assert.ok(risk.traceId.startsWith('trc_'));
  });

  // 2. Automated Python Requests Scraper (Suspicious UA, no token)
  await it('sentinel.score(req) should detect python-requests scraper', async () => {
    const mockReq = {
      headers: {
        'user-agent': 'python-requests/2.31.0'
      },
      body: {}
    };

    const risk = await sentinel.score(mockReq);

    assert.ok(risk.score >= 15, `Expected score >= 15, got ${risk.score}`);
    assert.strictEqual(risk.evidence[0].rule, 'header.suspicious_ua');
  });

  // 3. Headless Chrome Playwright Automated Login Attack
  await it('sentinel.score(req) should detect and RATE_LIMIT high-burst Headless automation', async () => {
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
    assert.strictEqual(risk.action, SentinelAction.REQUIRE_APP_VERIFICATION);
    assert.ok(risk.evidence.length >= 3);
  });

  console.log('\n------------------------------------------------');
  console.log(`Total End-to-End Tests: ${passedTests + failedTests}`);
  console.log(`Passed:                 ${passedTests}`);
  console.log(`Failed:                 ${failedTests}`);
  console.log('------------------------------------------------\n');

  if (failedTests > 0) process.exit(1);
}

run();
