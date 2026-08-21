import assert from 'node:assert';
import { createBrowserTelemetry, browserTelemetry } from '../packages/browser-sdk/dist/index.js';

console.log('\n🧪 Running @ameva/sentinel-browser Unit Test Suite...\n');

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

// 1. Node.js Fallback Snapshot
it('telemetry.snapshot() should return schema-compliant signals in Node fallback', () => {
  const telemetry = createBrowserTelemetry({ autoStart: false });
  const snapshot = telemetry.snapshot();

  assert.strictEqual(snapshot.webdriverObserved, false);
  assert.strictEqual(snapshot.telemetryObserved, false);
  assert.strictEqual(snapshot.sampleComplete, false);
  assert.strictEqual(snapshot.trustedInputCount, 0);
  assert.strictEqual(snapshot.touchMismatch, false);
  assert.strictEqual(typeof snapshot.observationDurationMs, 'number');
});

// 2. Lifecycle: start and destroy without throwing
it('telemetry lifecycle should manage start and destroy without throwing', () => {
  const telemetry = createBrowserTelemetry({ autoStart: true });
  telemetry.reset();
  telemetry.destroy();
  assert.ok(true);
});

if (failedTests > 0) {
  process.exit(1);
}
console.log(`\n{"suite":"browser","passed":${passedTests},"failed":${failedTests},"total":${passedTests + failedTests}}`);
