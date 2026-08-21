/**
 * AMEVA Sentinel - RiskEventStore Unit & Edge Case Test Suite
 */
import assert from 'node:assert';
import { MemoryRiskEventStore, SentinelAction } from '../packages/risk-core/src/index.js';

console.log('\n🧪 Running AMEVA Sentinel RiskEventStore Test Suite...\n');

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
  // 1. Basic Append and List Retrieval
  await it('should append and list reports with schemaVersion 1.0', async () => {
    const store = new MemoryRiskEventStore();
    const mockReport = {
      traceId: 'trc_001',
      score: 25,
      evidenceConfidence: 0.88,
      action: SentinelAction.OBSERVE,
      recommendedAction: SentinelAction.OBSERVE,
      enforcementMode: 'SHADOW',
      policyVersion: '2026-08-21.1',
      evidence: [],
      evaluatedAt: new Date().toISOString()
    };

    await store.append(mockReport);
    const list = await store.list();

    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].traceId, 'trc_001');
    assert.strictEqual(list[0].schemaVersion, '1.0');
  });

  // 2. Idempotency (Deduplication on identical traceId)
  await it('should be idempotent and deduplicate appends with identical traceId', async () => {
    const store = new MemoryRiskEventStore();
    const report = {
      traceId: 'trc_dup_999',
      score: 30,
      evidenceConfidence: 0.85,
      action: SentinelAction.OBSERVE,
      recommendedAction: SentinelAction.RATE_LIMIT,
      enforcementMode: 'SHADOW',
      policyVersion: '2026-08-21.1',
      evidence: [],
      evaluatedAt: new Date().toISOString()
    };

    await store.append(report);
    await store.append(report); // Duplicate append
    await store.append(report); // Duplicate append

    const list = await store.list();
    assert.strictEqual(list.length, 1, 'Store must contain exactly 1 entry for duplicate traceId');
  });

  // 3. FIFO Capacity Limit Eviction
  await it('should evict oldest items in FIFO order when exceeding maxItems', async () => {
    const store = new MemoryRiskEventStore({ maxItems: 3 });

    for (let i = 1; i <= 5; i++) {
      await store.append({
        traceId: `trc_${i}`,
        score: i * 10,
        evidenceConfidence: 0.9,
        action: SentinelAction.ALLOW,
        recommendedAction: SentinelAction.ALLOW,
        enforcementMode: 'SHADOW',
        policyVersion: '2026-08-21.1',
        evidence: [],
        evaluatedAt: new Date().toISOString()
      });
    }

    const list = await store.list();
    assert.strictEqual(list.length, 3, 'Store must clamp to maxItems (3)');
    assert.strictEqual(list[0].traceId, 'trc_5', 'Most recent item must be at index 0');
    assert.strictEqual(list[1].traceId, 'trc_4');
    assert.strictEqual(list[2].traceId, 'trc_3');
  });

  // 4. TTL Expired Event Pruning
  await it('should prune expired events beyond maxAgeMs', async () => {
    const store = new MemoryRiskEventStore({ maxAgeMs: 1000 }); // 1 second TTL

    const oldReport = {
      traceId: 'trc_old',
      score: 10,
      evidenceConfidence: 0.8,
      action: SentinelAction.ALLOW,
      recommendedAction: SentinelAction.ALLOW,
      enforcementMode: 'SHADOW',
      policyVersion: '2026-08-21.1',
      evidence: [],
      evaluatedAt: new Date(Date.now() - 5000).toISOString() // 5 seconds ago
    };

    await store.append(oldReport);

    const list = await store.list();
    assert.strictEqual(list.length, 0, 'Expired event must be pruned on list()');
  });

  console.log('\n------------------------------------------------');
  console.log(`Total Store Tests: ${passedTests + failedTests}`);
  console.log(`Passed:            ${passedTests}`);
  console.log(`Failed:            ${failedTests}`);
  console.log('------------------------------------------------\n');

  if (failedTests > 0) {
    process.exitCode = 1;
    console.error(`🚨 STORE TEST SUITE FAILED: ${failedTests} test(s) failed.`);
    process.exit(1);
  }
}

run();
