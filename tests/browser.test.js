/**
 * @ameva/sentinel-browser Unit Test Suite
 */
import assert from 'node:assert';
import { createBrowserTelemetry, browserTelemetry } from '../packages/browser-sdk/dist/index.js';

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
    const telemetry = createBrowserTelemetry();
    const snapshot = telemetry.snapshot();

    assert.strictEqual(snapshot.telemetryObserved, false); // autoStart is false by default
    assert.strictEqual(typeof snapshot.observationDurationMs, 'number');
    assert.strictEqual(typeof snapshot.trustedInputCount, 'number');
    assert.strictEqual(typeof snapshot.collectedAt, 'string');
  });

  // 2. Lifecycle management (start, stop, reset, destroy)
  await it('telemetry lifecycle should manage start, stop, and destroy cleanly without side-effects', async () => {
    const telemetry = createBrowserTelemetry({ maxEventsCap: 100 });
    assert.strictEqual(telemetry.snapshot().telemetryObserved, false);

    telemetry.start();
    telemetry.start(); // Idempotent start

    telemetry.reset();
    const snapAfterReset = telemetry.snapshot();
    assert.strictEqual(snapAfterReset.trustedInputCount, 0);

    telemetry.stop();
    telemetry.start(); // Restart works
    telemetry.destroy();
  });

  // 3. Singleton import has zero active listeners by default
  await it('browserTelemetry singleton has zero auto-start listeners on import', async () => {
    const snapshot = browserTelemetry.snapshot();
    assert.strictEqual(snapshot.telemetryObserved, false);
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
