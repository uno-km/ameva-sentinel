import assert from 'node:assert';
import {
  sentinel,
  createSentinel,
  SentinelAction,
  MemoryCounterStore,
  MemoryRiskEventStore,
  StaticKeyResolver,
  MemoryNonceStore,
  createPolicy,
  signCollectorToken,
  evaluate,
  readJsonBodyLimited
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
  const secretKey = 'partner-secret-key-2026';
  const keyResolver = new StaticKeyResolver({ 'partner-kid-1': secretKey });
  const nonceStore = new MemoryNonceStore();

  // 1. Ingest from browser-sdk snapshot
  await it('sentinel.score({ signals }) should score directly from browser-sdk snapshot', async () => {
    const telemetry = createBrowserTelemetry({ autoStart: false });
    const snapshot = telemetry.snapshot();

    const report = await sentinel.score({ signals: snapshot });

    assert.strictEqual(typeof report.score, 'number');
    assert.strictEqual(report.action, SentinelAction.ALLOW);
    assert.strictEqual(report.enforcementMode, 'SHADOW');
    assert.strictEqual(report.signals?.webdriver, false);
    assert.strictEqual(report.verification.state, 'NONE');
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
    assert.strictEqual(lastReport.action, SentinelAction.OBSERVE, 'In Shadow Mode, action must remain OBSERVE');
    assert.strictEqual(lastReport.recommendedAction, SentinelAction.RATE_LIMIT);

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

    const report = await enforcingSentinel.score(highRiskReq);

    // Rule matches: webdriver(25) + trusted_input_absent(20) + touch_mismatch(15) + suspicious_ua(15) = 75
    // Enforce mode -> TEMPORARY_DENY
    assert.ok(report.score >= 70, `Expected score >= 70, got ${report.score}`);
    assert.strictEqual(report.action, SentinelAction.TEMPORARY_DENY);
    assert.strictEqual(report.enforcementMode, 'ENFORCE');

    // Verify stored event in EventStore
    const storedList = await eventStore.list({ limit: 10 });
    assert.strictEqual(storedList.length, 1);
    assert.strictEqual(storedList[0].traceId, report.traceId);
    assert.strictEqual(storedList[0].action, SentinelAction.TEMPORARY_DENY);
  });

  // 4. [P0-1 Regression] Sentinel.score should verify Bearer token when headers and signals coexist
  await it('Sentinel.score should verify Bearer token when headers and signals coexist', async () => {
    const partnerPolicy = createPolicy({
      botPolicy: { targetMode: 'VERIFIED_PARTNERS_ONLY' }
    });

    const partnerSentinel = createSentinel({
      policy: partnerPolicy,
      mode: 'enforce',
      keyResolver,
      nonceStore,
      expectedAudience: 'sentinel-prod-api',
      allowedIssuers: ['partner-corp']
    });

    const validToken = signCollectorToken({
      v: 1,
      kid: 'partner-kid-1',
      iss: 'partner-corp',
      aud: 'sentinel-prod-api',
      purpose: 'telemetry-collect',
      sessionRef: 'sess-coexist-1',
      iat: Date.now(),
      exp: Date.now() + 60000,
      nonce: 'nonce_coexist_1'
    }, secretKey);

    const report = await partnerSentinel.score({
      headers: {
        authorization: `Bearer ${validToken}`,
        'user-agent': 'PartnerBot/1.0'
      },
      signals: {
        telemetryObserved: true,
        trustedInputCount: 2
      }
    });

    assert.strictEqual(report.verification?.state, 'VERIFIED');
    assert.strictEqual(report.action, SentinelAction.ALLOW);
    assert.strictEqual(report.decision.reasonCode, 'BOT_ALLOWLIST_PASSED');
  });

  // 5. [P0-2 Regression] Invalid presented token yields state: FAILED (not NONE)
  await it('invalid presented token yields verification.state: FAILED instead of NONE', async () => {
    const partnerPolicy = createPolicy({
      botPolicy: { targetMode: 'VERIFIED_PARTNERS_ONLY' }
    });

    const partnerSentinel = createSentinel({
      policy: partnerPolicy,
      mode: 'enforce',
      keyResolver,
      nonceStore,
      expectedAudience: 'sentinel-prod-api',
      allowedIssuers: ['partner-corp'],
      stateFailureMode: 'OBSERVE_ONLY'
    });

    const report = await partnerSentinel.score({
      headers: {
        authorization: 'Bearer sv1.invalid_forged_payload.invalid_sig',
        'user-agent': 'PartnerBot/1.0'
      }
    });

    assert.strictEqual(report.verification?.state, 'FAILED');
    assert.strictEqual(report.action, SentinelAction.TEMPORARY_DENY);
    assert.strictEqual(report.decision.reasonCode, 'TARGET_MODE_PARTNERS_UNVERIFIED');
  });

  // 6. [P0-2 Regression] stateFailureMode: FAIL_CLOSED throws on invalid token presentation
  await it('stateFailureMode: FAIL_CLOSED throws on invalid token presentation', async () => {
    const strictSentinel = createSentinel({
      mode: 'enforce',
      keyResolver,
      nonceStore,
      expectedAudience: 'sentinel-prod-api',
      allowedIssuers: ['partner-corp'],
      stateFailureMode: 'FAIL_CLOSED'
    });

    await assert.rejects(
      async () => strictSentinel.score({
        headers: {
          authorization: 'Bearer sv1.invalid.sig'
        }
      }),
      /Sentinel security violation/
    );
  });

  // 7. [P0-3 Regression] readJsonBodyLimited rejects 64KB+ body with 413
  await it('readJsonBodyLimited rejects body exceeding 64KB limit', async () => {
    const hugeBody = JSON.stringify({ data: 'a'.repeat(70000) });

    await assert.rejects(
      async () => readJsonBodyLimited({ body: hugeBody }, 65536),
      { name: 'CollectorVerificationError', httpStatus: 413 }
    );
  });

  // 8. [P0-3 Regression] Multi-byte UTF-8 64KB byte-level size limit enforcement
  await it('readJsonBodyLimited measures true byte length for multi-byte characters', async () => {
    // 25,000 Korean 3-byte characters = 75,000 bytes (> 64KB)
    const multiByteBody = JSON.stringify({ data: '한'.repeat(25000) });

    await assert.rejects(
      async () => readJsonBodyLimited({ body: multiByteBody }, 65536),
      { name: 'CollectorVerificationError', httpStatus: 413 }
    );
  });

  // 9. [P1-4 Regression] Public evaluate({ verifiedBot: true }) cannot bypass VERIFIED_PARTNERS_ONLY
  await it('public evaluate({ verifiedBot: true }) cannot bypass VERIFIED_PARTNERS_ONLY mode', () => {
    const partnerPolicy = createPolicy({
      botPolicy: { targetMode: 'VERIFIED_PARTNERS_ONLY' }
    });

    // Attempting to bypass verification via untrusted signals
    const report = evaluate({ verifiedBot: true, userAgent: 'RoguePartner/1.0' }, {
      policy: partnerPolicy,
      enforcementMode: 'ENFORCE'
    });

    assert.strictEqual(report.verification.state, 'NONE');
    assert.strictEqual(report.action, SentinelAction.TEMPORARY_DENY);
    assert.strictEqual(report.decision.reasonCode, 'TARGET_MODE_PARTNERS_UNVERIFIED');
  });

  // 10. [P0-1 Regression] Signals boolean values remain authoritative when body fields are absent
  await it('signals boolean values remain authoritative when body fields are absent', async () => {
    const s = createSentinel({ mode: 'shadow' });
    const report = await s.score({
      headers: {
        'user-agent': 'Mozilla/5.0'
      },
      signals: {
        telemetryObserved: true,
        sampleComplete: true,
        observationDurationMs: 7000,
        trustedInputCount: 3
      }
    });
    assert.strictEqual(report.signals?.telemetryObserved, true);
    assert.strictEqual(report.signals?.sampleComplete, true);
    assert.strictEqual(report.signals?.isTrustedEventsCount, 3);
  });

  // 11. [P0-3 Regression] Sentinel.score rejects oversized request regardless of stateFailureMode
  await it('Sentinel.score rejects oversized request regardless of stateFailureMode', async () => {
    const s = createSentinel({
      mode: 'shadow',
      stateFailureMode: 'OBSERVE_ONLY'
    });
    const hugeBody = JSON.stringify({
      data: '한'.repeat(25000)
    });
    await assert.rejects(
      () => s.score({ body: hugeBody }),
      {
        name: 'CollectorVerificationError',
        httpStatus: 413
      }
    );
  });

  // 12. [P1-3 Regression] Untrusted verifiedBot cannot elevate classification identityState or verification
  await it('untrusted verifiedBot cannot elevate classification identityState or verification state', () => {
    const report = evaluate({
      verifiedBot: true,
      userAgent: 'Googlebot/2.1'
    });
    assert.notStrictEqual(report.classification?.identityState, 'VERIFIED');
    assert.strictEqual(report.classification?.identityState, 'CLAIMED');
    assert.strictEqual(report.verification.state, 'NONE');
  });

  if (failedTests > 0) {
    process.exit(1);
  }
  console.log(`\n{"suite":"sentinel","passed":${passedTests},"failed":${failedTests},"total":${passedTests + failedTests}}`);
}

run();
