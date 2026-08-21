/**
 * AMEVA Sentinel - Core Engine & Policy Verification Test Suite
 * Zero-dependency executable Node.js test runner
 */
import assert from 'node:assert';

// 1. Load compiled/source modules
import { evaluate, calculateConfidence, createPolicy, rules, SentinelAction } from '../packages/risk-core/src/index.js';

console.log('\n🧪 Running AMEVA Sentinel Test Suite...\n');

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
// 1. Clean Human User Test
// ==============================================================================
it('should classify clean human session as ALLOW with low score', () => {
  const signals = {
    webdriver: false,
    burstCount10s: 2,
    isTrustedEventsCount: 5,
    hasSignedToken: true,
    tokenFreshnessMs: 500
  };

  const report = evaluate(signals);
  
  assert.strictEqual(report.score, 0, 'Clean session should have 0 score');
  assert.strictEqual(report.action, SentinelAction.ALLOW, 'Action should be ALLOW');
  assert.strictEqual(report.evidence.length, 0, 'Evidence should be empty for clean user');
  assert.ok(report.confidence >= 0.70, `Confidence should be high, got ${report.confidence}`);
  assert.ok(report.traceId.startsWith('trc_'), 'TraceId should start with trc_');
});

// ==============================================================================
// 2. Headless WebDriver Test
// ==============================================================================
it('should trigger automation.webdriver rule when webdriver is active', () => {
  const signals = {
    webdriver: true,
    burstCount10s: 3,
    isTrustedEventsCount: 1,
    hasSignedToken: true
  };

  const report = evaluate(signals);

  assert.strictEqual(report.score, 25, 'Score should be exactly 25 for default webdriver rule');
  assert.strictEqual(report.action, SentinelAction.OBSERVE, 'Action should be OBSERVE (21~49)');
  assert.strictEqual(report.evidence.length, 1);
  assert.strictEqual(report.evidence[0].rule, 'automation.webdriver');
  assert.strictEqual(report.evidence[0].attributes.observed, true);
  assert.ok(report.evidence[0].message.includes('navigator.webdriver'));
});

// ==============================================================================
// 3. Rate Burst Attack Test
// ==============================================================================
it('should trigger rate.burst_request and recommend RATE_LIMIT on high frequency', () => {
  const signals = {
    webdriver: false,
    burstCount10s: 48,
    isTrustedEventsCount: 10,
    hasSignedToken: true
  };

  const report = evaluate(signals);

  assert.strictEqual(report.score, 30, 'Score should be 30 for burst');
  assert.strictEqual(report.evidence[0].rule, 'rate.burst_request');
  assert.strictEqual(report.evidence[0].attributes.count, 48);
  assert.strictEqual(report.evidence[0].attributes.threshold, 30);
});

// ==============================================================================
// 4. Multi-Signal Composite Attack Test
// ==============================================================================
it('should combine multiple rules (WebDriver + Burst + No Physics) into high risk', () => {
  const signals = {
    webdriver: true,              // +25
    burstCount10s: 50,           // +30
    isTrustedEventsCount: 0,     // +20 (no physics under burst)
    touchMismatch: true,         // +15
    hasSignedToken: true
  };

  const report = evaluate(signals);

  // Total: 25 + 30 + 20 + 15 = 90
  assert.strictEqual(report.score, 90, 'Score should sum up to 90');
  assert.strictEqual(report.action, SentinelAction.TEMPORARY_DENY, 'Action should be TEMPORARY_DENY (>=85)');
  assert.strictEqual(report.evidence.length, 4, 'Should have 4 evidence items');
  
  const rulesTriggered = report.evidence.map(e => e.rule);
  assert.ok(rulesTriggered.includes('automation.webdriver'));
  assert.ok(rulesTriggered.includes('rate.burst_request'));
  assert.ok(rulesTriggered.includes('interaction.no_physics'));
  assert.ok(rulesTriggered.includes('environment.touch_mismatch'));
});

// ==============================================================================
// 5. Policy-as-Code Custom Policy Test
// ==============================================================================
it('should allow custom Policy-as-Code configuration and threshold tuning', () => {
  const customPolicy = createPolicy({
    version: '2026-custom.1',
    thresholds: {
      rateLimit: 30,
      appVerification: 50,
      deny: 70
    },
    rules: [
      rules.webdriver({ weight: 40 }),
      rules.burst({ weight: 35, threshold: 20 })
    ]
  });

  const signals = {
    webdriver: true,
    burstCount10s: 25
  };

  const report = evaluate(signals, customPolicy);

  assert.strictEqual(report.policyVersion, '2026-custom.1');
  assert.strictEqual(report.score, 75, '40 + 35 = 75');
  assert.strictEqual(report.action, SentinelAction.TEMPORARY_DENY, '75 exceeds custom deny threshold (70)');
  assert.strictEqual(report.evidence[0].score, 40);
  assert.strictEqual(report.evidence[1].score, 35);
});

// ==============================================================================
// 6. Mathematical Confidence Formula Test
// ==============================================================================
it('should compute mathematical confidence accurately', () => {
  // High quality signals
  const highConf = calculateConfidence({
    hasSignedToken: true,
    burstCount10s: 10,
    webdriver: false,
    isTrustedEventsCount: 3,
    touchMismatch: false,
    tokenFreshnessMs: 300
  });
  assert.ok(highConf >= 0.85, `Expected high confidence >= 0.85, got ${highConf}`);

  // Degraded signals (missing token, latency, missing interaction)
  const lowConf = calculateConfidence({
    hasSignedToken: false,
    tokenFreshnessMs: 35000
  });
  assert.ok(lowConf <= 0.40, `Expected low confidence <= 0.40, got ${lowConf}`);
});

// ==============================================================================
// Summary
// ==============================================================================
console.log('\n------------------------------------------------');
console.log(`Total Tests: ${passedTests + failedTests}`);
console.log(`Passed:      ${passedTests}`);
console.log(`Failed:      ${failedTests}`);
console.log('------------------------------------------------\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL TESTS PASSED! AMEVA Sentinel risk engine is 100% operational!\n');
}
