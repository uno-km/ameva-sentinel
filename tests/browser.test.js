/**
 * @ameva/sentinel-browser Unit Test Suite
 */
import assert from 'node:assert';
import { createBrowserTelemetry } from '../packages/browser-sdk/src/index.js';

console.log('\n🧪 Running @ameva/sentinel-browser Unit Test Suite...\n');

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
  // 1. Snapshot returns expected fields even in non-browser Node runtime
  await it('telemetry.snapshot() should return schema-compliant signals in Node fallback', async () => {
    const telemetry = createBrowserTelemetry({ autoStart: false });
    const snapshot = telemetry.snapshot();

    assert.strictEqual(typeof snapshot.telemetryObserved, 'boolean');
    assert.strictEqual(typeof snapshot.observationDurationMs, 'number');
    assert.strictEqual(typeof snapshot.trustedInputCount, 'number');
    assert.strictEqual(typeof snapshot.collectedAt, 'string');
  });

  // 2. Lifecycle management (start, reset, destroy)
  await it('telemetry lifecycle should manage start and destroy without throwing', async () => {
    const telemetry = createBrowserTelemetry({ maxEventsCap: 100 });
    telemetry.start();
    telemetry.start(); // Idempotent start

    telemetry.reset();
    const snapAfterReset = telemetry.snapshot();
    assert.strictEqual(snapAfterReset.trustedInputCount, 0);

    telemetry.destroy();
  });

  console.log('\n------------------------------------------------');
  console.log(`Total Browser Tests: ${passedTests + failedTests}`);
  console.log(`Passed:              ${passedTests}`);
  console.log(`Failed:              ${failedTests}`);
  console.log('------------------------------------------------\n');

  if (failedTests > 0) {
    process.exitCode = 1;
    console.error(`🚨 BROWSER SDK TEST SUITE FAILED: ${failedTests} test(s) failed.`);
    process.exit(1);
  }
}

run();
