import assert from 'node:assert';
import {
  evaluate,
  evaluateVerified,
  createPolicy,
  createSentinel,
  SentinelAction,
  createVerifiedCollectorContext
} from '../packages/sentinel/dist/index.js';

console.log('\n🧭 Running AMEVA Sentinel Target Mode & Decision Engine Quality Gate Tests...\n');

let passedTests = 0;
let failedTests = 0;

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
    failedTests++;
  }
}

async function main() {
  // 1. VERIFIED_PARTNERS_ONLY Mode
  await runTest('VERIFIED_PARTNERS_ONLY should deny unverified traffic and allow authentic verified context', async () => {
    const policy = createPolicy({
      botPolicy: { targetMode: 'VERIFIED_PARTNERS_ONLY' }
    });

    // Unverified UA Claiming Googlebot -> DENIED
    const unverified = evaluate({ userAgent: 'Googlebot/2.1' }, { policy, enforcementMode: 'ENFORCE' });
    assert.strictEqual(unverified.action, SentinelAction.TEMPORARY_DENY);
    assert.strictEqual(unverified.decision.reasonCode, 'TARGET_MODE_PARTNERS_UNVERIFIED');

    // Cryptographically Verified Partner Context -> ALLOWED
    const authenticCtx = createVerifiedCollectorContext({
      v: 1,
      kid: 'test-kid',
      iss: 'partner-corp',
      aud: 'sentinel',
      purpose: 'telemetry-collect',
      sessionRef: 'sess-1',
      iat: Date.now(),
      exp: Date.now() + 60000,
      nonce: 'nonce_partner_1'
    });

    const verified = evaluateVerified({ userAgent: 'PartnerBot/1.0' }, authenticCtx, { policy, enforcementMode: 'ENFORCE' });
    assert.strictEqual(verified.action, SentinelAction.ALLOW);
    assert.strictEqual(verified.decision.reasonCode, 'BOT_ALLOWLIST_PASSED');
  });

  // 2. HUMANS_ONLY Mode
  await runTest('HUMANS_ONLY should challenge/deny automated scrapers and allow human browsers', async () => {
    const policy = createPolicy({
      botPolicy: {
        targetMode: 'HUMANS_ONLY',
        denylist: ['AUTOMATED_TOOL']
      }
    });

    // Automated Scraper (curl) -> DENIED
    const botReq = evaluate({ userAgent: 'curl/7.88.1' }, { policy, enforcementMode: 'ENFORCE' });
    assert.strictEqual(botReq.action, SentinelAction.TEMPORARY_DENY);
    assert.strictEqual(botReq.decision.reasonCode, 'TARGET_MODE_HUMANS_ONLY_VIOLATION');

    // Clean Human Browser -> ALLOWED
    const humanReq = evaluate({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36',
      isTrustedEventsCount: 8,
      telemetryObserved: true
    }, { policy, enforcementMode: 'ENFORCE' });
    assert.strictEqual(humanReq.action, SentinelAction.ALLOW);
  });

  // 3. BOTS_ONLY Mode
  await runTest('BOTS_ONLY should redirect human interactive browser to BOT_GUIDANCE and allow bots', async () => {
    const policy = createPolicy({
      botPolicy: {
        targetMode: 'BOTS_ONLY',
        categoryRouting: {
          NONE: { action: SentinelAction.REDIRECT, destinationId: 'BOT_GUIDANCE', statusCode: 302 }
        }
      }
    });

    // Human user interacting with mouse/keyboard -> REDIRECT to guidance
    const human = evaluate({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0 Safari/537.36',
      isTrustedEventsCount: 12,
      telemetryObserved: true
    }, { policy, enforcementMode: 'ENFORCE' });

    assert.strictEqual(human.action, SentinelAction.REDIRECT);
    assert.strictEqual(human.redirectTo, 'BOT_GUIDANCE');
    assert.strictEqual(human.redirectStatusCode, 302);
    assert.strictEqual(human.decision.reasonCode, 'TARGET_MODE_BOTS_ONLY_VIOLATION');

    // Genuine search crawler -> ALLOWED
    const crawler = evaluate({ userAgent: 'Googlebot/2.1' }, { policy, enforcementMode: 'ENFORCE' });
    assert.strictEqual(crawler.action, SentinelAction.ALLOW);
  });

  // 4. Category Routing (AI_AGENT -> AI_FEED)
  await runTest('should execute closed-destination redirect for AI_AGENT category', async () => {
    const policy = createPolicy({
      botPolicy: {
        targetMode: 'ANY',
        categoryRouting: {
          AI_AGENT: { action: SentinelAction.REDIRECT, destinationId: 'AI_FEED', statusCode: 307 }
        }
      }
    });

    const gptReq = evaluate({ userAgent: 'Mozilla/5.0 GPTBot/1.2' }, { policy, enforcementMode: 'ENFORCE' });
    assert.strictEqual(gptReq.action, SentinelAction.REDIRECT);
    assert.strictEqual(gptReq.redirectTo, 'AI_FEED');
    assert.strictEqual(gptReq.redirectStatusCode, 307);
    assert.strictEqual(gptReq.decision.reasonCode, 'CATEGORY_ROUTING_REDIRECT');
  });

  // 5. Explicit Denylist Rule
  await runTest('should strictly trigger TEMPORARY_DENY on denylisted bot categories', async () => {
    const policy = createPolicy({
      botPolicy: {
        targetMode: 'ANY',
        denylist: ['AUTOMATED_TOOL']
      }
    });

    const scraper = evaluate({ userAgent: 'python-requests/2.31.0' }, { policy, enforcementMode: 'ENFORCE' });
    assert.strictEqual(scraper.action, SentinelAction.TEMPORARY_DENY);
    assert.strictEqual(scraper.decision.reasonCode, 'BOT_DENYLIST_TRIGGERED');
  });

  // 6. Sentinel Facade End-to-End Destination Resolution
  await runTest('Sentinel.score() should resolve destinationId against closed redirectRegistry', async () => {
    const policy = createPolicy({
      botPolicy: {
        targetMode: 'ANY',
        categoryRouting: {
          AI_AGENT: { action: SentinelAction.REDIRECT, destinationId: 'AI_FEED', statusCode: 302 }
        }
      }
    });

    const sentinel = createSentinel({
      policy,
      mode: 'enforce',
      redirectRegistry: {
        AI_FEED: 'https://example.com/llms-full.txt'
      }
    });

    const report = await sentinel.score({
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; ClaudeBot/1.0)' }
    });

    assert.strictEqual(report.action, SentinelAction.REDIRECT);
    assert.strictEqual(report.redirectTo, 'https://example.com/llms-full.txt');
    assert.strictEqual(report.redirectStatusCode, 302);
  });

  if (failedTests > 0) {
    process.exit(1);
  }
  console.log(`\n{"suite":"decision","passed":${passedTests},"failed":${failedTests},"total":${passedTests + failedTests}}`);
}

main();
