/**
 * AMEVA Sentinel - Facade & Stateful Rate Test Suite
 */
import assert from 'node:assert';
import {
  sentinel,
  createSentinel,
  SentinelAction,
  MemoryCounterStore,
  MemoryRiskEventStore,
  createSentinelToken,
  verifySentinelToken,
  createDegradedReport
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

  // 4. verify() 3-Tier Attestation & Sanity Bounds Clamping Test
  await it('verify() should clamp out-of-bounds telemetry and strictly validate token freshness & verifier', async () => {
    let customVerifierCalled = false;
    const sentinelWithVerifier = createSentinel({
      maxTokenAgeMs: 60000, // 1 minute max age
      tokenVerifier: async (token, signals) => {
        customVerifierCalled = true;
        return token === 'valid-cryptographic-token-123';
      }
    });

    // Test A: Out of bounds telemetry clamp
    const dirtySignals = {
      webdriver: 1, // falsy/truthy non-boolean
      observationDurationMs: -500, // negative duration
      isTrustedEventsCount: 4.8, // float
      burstCount10s: -10, // negative burst
      tokenFreshnessMs: 30000,
      tokenPresented: true
    };
    const verifiedA = await sentinelWithVerifier.verify(dirtySignals, 'valid-cryptographic-token-123');
    assert.strictEqual(verifiedA.webdriver, true);
    assert.strictEqual(verifiedA.observationDurationMs, 0);
    assert.strictEqual(verifiedA.isTrustedEventsCount, 4);
    assert.strictEqual(verifiedA.burstCount10s, 1);
    assert.strictEqual(verifiedA.tokenVerified, true);
    assert.strictEqual(customVerifierCalled, true);

    // Test B: Expired token freshness (beyond maxTokenAgeMs)
    const expiredSignals = {
      tokenFreshnessMs: 90000, // 90s > 60s max
      tokenPresented: true
    };
    const verifiedB = await sentinelWithVerifier.verify(expiredSignals, 'valid-cryptographic-token-123');
    assert.strictEqual(verifiedB.tokenVerified, false, 'Expired token must fail verification');

    // Test C: Invalid token payload rejected by tokenVerifier
    const invalidTokenSignals = {
      tokenFreshnessMs: 1000,
      tokenPresented: true
    };
    const verifiedC = await sentinelWithVerifier.verify(invalidTokenSignals, 'forged-token-xyz');
    assert.strictEqual(verifiedC.tokenVerified, false, 'Forged token must fail cryptographic verification');
  });

  // 5. Cryptographic HMAC-SHA256 Token Attestation & Tamper Defense Test
  await it('verify() should cryptographically authenticate HMAC-SHA256 tokens and reject forged signatures', async () => {
    const secretKey = 'super-secret-hmac-key-2026';
    const sentinelWithHMAC = createSentinel({
      secretKey,
      maxTokenAgeMs: 300000 // 5 minutes
    });

    const validToken = createSentinelToken({
      sessionId: 'test_session_abc',
      timestamp: Date.now() - 5000, // 5 seconds old
      signalsDigest: 'digest_123'
    }, secretKey);

    // Test A: Valid cryptographic token with authentic signature
    const validSignals = {
      webdriver: false,
      tokenPresented: true,
      observationDurationMs: 6000
    };
    const resultA = await sentinelWithHMAC.verify(validSignals, validToken);
    assert.strictEqual(resultA.tokenVerified, true, 'Authentic token must pass HMAC verification');
    assert.strictEqual(resultA.suspiciousUA, false);

    // Test B: Forged/Tampered token signature
    const forgedToken = validToken.substring(0, validToken.length - 8) + 'deadbeef';
    const resultB = await sentinelWithHMAC.verify(validSignals, forgedToken);
    assert.strictEqual(resultB.tokenVerified, false, 'Tampered token signature must fail verification');
    assert.strictEqual(resultB.suspiciousUA, true, 'Tampered signature must flag suspicious threat indicator');

    // Test C: Expired token timestamp (e.g. 10 minutes old)
    const expiredToken = createSentinelToken({
      sessionId: 'test_session_old',
      timestamp: Date.now() - 600000 // 10 minutes old
    }, secretKey);
    const resultC = await sentinelWithHMAC.verify(validSignals, expiredToken);
    assert.strictEqual(resultC.tokenVerified, false, 'Expired token must fail verification');
  });

  // 6. Fail-Open createDegradedReport() Official Factory & Defense against False-Clean Masking
  await it('createDegradedReport() should stamp DEGRADED_ALLOW, 0 confidence, and system evidence without score=0/ALLOW masquerading', async () => {
    const customErr = new Error('Database connection timeout during telemetry hydration');
    const degradedReport = createDegradedReport(customErr, {
      enforcementMode: 'SHADOW',
      reason: 'Neon connection pool exhausted'
    });

    assert.strictEqual(degradedReport.action, SentinelAction.DEGRADED_ALLOW, 'Action must be DEGRADED_ALLOW, never plain ALLOW');
    assert.strictEqual(degradedReport.recommendedAction, SentinelAction.OBSERVE);
    assert.strictEqual(degradedReport.evidenceConfidence, 0.0);
    assert.ok(degradedReport.traceId.startsWith('trc_'));
    assert.strictEqual(degradedReport.evidence.length, 1);
    assert.strictEqual(degradedReport.evidence[0].rule, 'system.evaluation_failure');
    assert.strictEqual(degradedReport.evidence[0].attributes.failOpen, true);
    assert.strictEqual(degradedReport.evidence[0].attributes.degraded, true);
    assert.strictEqual(degradedReport.evidence[0].attributes.errorName, 'Error');

    // Instance method test
    const instanceReport = sentinel.createDegradedReport('Unhandled runtime panic');
    assert.strictEqual(instanceReport.action, SentinelAction.DEGRADED_ALLOW);
    assert.strictEqual(instanceReport.evidenceConfidence, 0.0);
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
