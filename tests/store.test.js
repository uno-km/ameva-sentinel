import assert from 'node:assert';
import {
  MemoryRiskEventStore,
  toStoredRiskEvent,
  toStoredRiskEventV1,
  isStoredRiskEventV1,
  isStoredRiskEventV2,
  isStoredRiskEvent,
  SentinelAction
} from '../packages/risk-core/dist/index.js';

console.log('\n🧪 Running AMEVA Sentinel RiskEventStore V1 & V2 Test Suite...\n');

let passedTests = 0;
let failedTests = 0;

async function it(name, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failedTests++;
  }
}

function createDummyReport(traceId, score = 0) {
  return {
    traceId,
    score,
    evidenceConfidence: 0.85,
    action: SentinelAction.ALLOW,
    recommendedAction: SentinelAction.ALLOW,
    decision: {
      action: SentinelAction.ALLOW,
      reasonCode: 'BASELINE_CLEAN'
    },
    enforcementMode: 'SHADOW',
    policyVersion: '2026-08-21.v0.6',
    evidence: [
      {
        rule: 'test.rule',
        score: 0,
        attributes: { str: 'val', num: 123, bool: true, nil: null },
        message: 'Dummy evidence'
      }
    ],
    evaluatedAt: new Date().toISOString(),
    signals: { webdriver: false, burstCount10s: 1, isTrustedEventsCount: 5 }
  };
}

async function main() {
  // 1. StoredRiskEventV2 Serialization & Schema Validation
  await it('should create and validate StoredRiskEventV2 with schemaVersion 2.0', async () => {
    const report = createDummyReport('trc_test_v2_001', 15);
    const storedV2 = toStoredRiskEvent(report);

    assert.strictEqual(storedV2.schemaVersion, '2.0');
    assert.strictEqual(isStoredRiskEventV2(storedV2), true);
    assert.strictEqual(isStoredRiskEvent(storedV2), true);
  });

  // 2. Backward Compatible V1 Schema Support
  await it('should validate legacy StoredRiskEventV1 and support migration guard', async () => {
    const report = createDummyReport('trc_test_v1_001', 10);
    const storedV1 = toStoredRiskEventV1(report);

    assert.strictEqual(storedV1.schemaVersion, '1.0');
    assert.strictEqual(isStoredRiskEventV1(storedV1), true);
    assert.strictEqual(isStoredRiskEvent(storedV1), true);
  });

  // 3. FIFO Eviction Order
  await it('should evict oldest items in FIFO order when exceeding maxItems', async () => {
    const store = new MemoryRiskEventStore({ maxItems: 3 });
    await store.append(createDummyReport('trc_1'));
    await store.append(createDummyReport('trc_2'));
    await store.append(createDummyReport('trc_3'));
    await store.append(createDummyReport('trc_4'));

    const list = await store.list();
    assert.strictEqual(list.length, 3);
    const traceIds = list.map(e => e.traceId);
    assert.deepStrictEqual(traceIds, ['trc_4', 'trc_3', 'trc_2']);
  });

  // 4. Idempotency by Trace ID
  await it('should be idempotent and deduplicate appends with identical traceId', async () => {
    const store = new MemoryRiskEventStore();
    const report = createDummyReport('trc_dedup_1', 10);
    await store.append(report);

    const updatedReport = createDummyReport('trc_dedup_1', 85);
    await store.append(updatedReport);

    const list = await store.list();
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].score, 85);
  });

  // 5. Schema Guard: Reject Out-of-Bounds Score and Confidence Numbers
  await it('isStoredRiskEventV2 should reject out-of-bounds score and confidence numbers', async () => {
    const base = toStoredRiskEvent(createDummyReport('trc_bounds'));

    assert.strictEqual(isStoredRiskEventV2({ ...base, score: -1 }), false);
    assert.strictEqual(isStoredRiskEventV2({ ...base, score: 101 }), false);
    assert.strictEqual(isStoredRiskEventV2({ ...base, score: NaN }), false);
    assert.strictEqual(isStoredRiskEventV2({ ...base, score: Infinity }), false);
    assert.strictEqual(isStoredRiskEventV2({ ...base, evidenceConfidence: -0.1 }), false);
    assert.strictEqual(isStoredRiskEventV2({ ...base, evidenceConfidence: 1.1 }), false);
  });

  // 6. Schema Guard: Reject Invalid Actions and Non-ISO Dates
  await it('isStoredRiskEventV2 should reject invalid actions, modes, and non-ISO dates', async () => {
    const base = toStoredRiskEvent(createDummyReport('trc_invalid'));

    assert.strictEqual(isStoredRiskEventV2({ ...base, action: 'DESTROY_USER' }), false);
    assert.strictEqual(isStoredRiskEventV2({ ...base, evaluatedAt: 'yesterday' }), false);
    assert.strictEqual(isStoredRiskEventV2({ ...base, evaluatedAt: 1234567890 }), false);
  });

  // 7. Schema Guard: Reject Prototype Pollution / Nested Objects in Attributes
  await it('isStoredRiskEventV2 should reject nested objects or arrays inside evidence attributes', async () => {
    const base = toStoredRiskEvent(createDummyReport('trc_pollution'));
    const dirtyEvidence = [
      {
        rule: 'test.dirty',
        score: 10,
        attributes: {
          safe: 'val',
          nestedObject: { evil: true }
        },
        message: 'Dirty'
      }
    ];

    assert.strictEqual(isStoredRiskEventV2({ ...base, evidence: dirtyEvidence }), false);
  });

  // 8. Max Age Pruning (TTL)
  await it('should prune expired events beyond maxAgeMs', async () => {
    const store = new MemoryRiskEventStore({ maxAgeMs: 100 });
    const oldReport = createDummyReport('trc_old');
    oldReport.evaluatedAt = new Date(Date.now() - 200).toISOString();

    await store.append(oldReport);
    const list = await store.list();
    assert.strictEqual(list.length, 0);
  });

  if (failedTests > 0) {
    process.exit(1);
  }
  console.log(`\n{"suite":"store","passed":${passedTests},"failed":${failedTests},"total":${passedTests + failedTests}}`);
}

await main();
