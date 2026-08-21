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
