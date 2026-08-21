/**
 * AMEVA Sentinel - RiskEventStore Unit & Deep Schema Validation Test Suite
 */
import assert from 'node:assert';
import {
  MemoryRiskEventStore,
  LocalStorageRiskEventStore,
  SentinelAction,
  evaluate,
  toStoredRiskEvent,
  isStoredRiskEventV1,
  hasPrimitiveAttributes,
  isIsoDate
} from '../packages/risk-core/dist/index.js';

console.log('\n🧪 Running AMEVA Sentinel RiskEventStore Test Suite...\n');

let passedTests = 0;
let failedTests = 0;

async function it(name, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Reason: ${err.message}`);
    failedTests++;
  }
}

async function run() {
  // 1. Schema v1.0 Structure Integrity
  await it('should append and list reports with schemaVersion 1.0', async () => {
    const store = new MemoryRiskEventStore();
    const report = evaluate({ webdriver: true, burstCount10s: 2 });

    await store.append(report);
    const list = await store.list();

    assert.strictEqual(list.length, 1);
    const item = list[0];
    assert.strictEqual(item.schemaVersion, '1.0');
    assert.strictEqual(item.traceId, report.traceId);
    assert.strictEqual(item.score, report.score);
    assert.strictEqual(typeof item.storedAt, 'string');
    assert.ok(isIsoDate(item.storedAt), 'storedAt must be valid ISO date string');
    assert.ok(isStoredRiskEventV1(item), 'Appended item must strictly satisfy isStoredRiskEventV1');
  });

  // 2. Trace ID Deduplication (Idempotency)
  await it('should be idempotent and deduplicate appends with identical traceId', async () => {
    const store = new MemoryRiskEventStore();
    const report = evaluate({ webdriver: false });

    await store.append(report);
    await store.append(report);
    await store.append(report);

    const list = await store.list();
    assert.strictEqual(list.length, 1, 'Duplicate traceId should update rather than append duplicate entries');
  });

  // 3. FIFO Capacity Eviction
  await it('should evict oldest items in FIFO order when exceeding maxItems', async () => {
    const store = new MemoryRiskEventStore({ maxItems: 3 });

    for (let i = 0; i < 5; i++) {
      const rep = evaluate({});
      rep.traceId = `trc_test_${i}`;
      await store.append(rep);
    }

    const list = await store.list();
    assert.strictEqual(list.length, 3, 'Store size must strictly remain capped at maxItems');
    assert.strictEqual(list[0].traceId, 'trc_test_4', 'Newest item should be at index 0');
    assert.strictEqual(list[2].traceId, 'trc_test_2', 'Oldest preserved item should be trc_test_2');
  });

  // 4. Time-to-Live (TTL) Pruning
  await it('should prune expired events beyond maxAgeMs', async () => {
    const store = new MemoryRiskEventStore({ maxAgeMs: 100 });
    const rep = evaluate({});
    rep.evaluatedAt = new Date(Date.now() - 500).toISOString(); // 500ms ago

    await store.append(rep);
    const unexpired = await store.list({ includeExpired: false });
    assert.strictEqual(unexpired.length, 0, 'Expired item should be filtered out during list()');

    const all = await store.list({ includeExpired: true });
    assert.strictEqual(all.length, 1, 'Explicit includeExpired: true must return expired events');
  });

  // 5. Schema Guard: Reject Out-of-Bounds Scores & Confidences
  await it('isStoredRiskEventV1 should reject out-of-bounds score and confidence numbers', () => {
    const valid = toStoredRiskEvent(evaluate({ webdriver: false }));

    assert.strictEqual(isStoredRiskEventV1(valid), true, 'Valid StoredRiskEventV1 must pass');
    assert.strictEqual(isStoredRiskEventV1({ ...valid, score: 101 }), false, 'Score > 100 must be rejected');
    assert.strictEqual(isStoredRiskEventV1({ ...valid, score: -1 }), false, 'Score < 0 must be rejected');
    assert.strictEqual(isStoredRiskEventV1({ ...valid, score: NaN }), false, 'NaN score must be rejected');
    assert.strictEqual(isStoredRiskEventV1({ ...valid, evidenceConfidence: 1.5 }), false, 'Confidence > 1 must be rejected');
    assert.strictEqual(isStoredRiskEventV1({ ...valid, evidenceConfidence: -0.1 }), false, 'Confidence < 0 must be rejected');
  });

  // 6. Schema Guard: Reject Invalid Actions, Modes, and Non-ISO Dates
  await it('isStoredRiskEventV1 should reject invalid actions, modes, and non-ISO dates', () => {
    const valid = toStoredRiskEvent(evaluate({ webdriver: false }));

    assert.strictEqual(isStoredRiskEventV1({ ...valid, action: 'INVALID_BLOCK' }), false, 'Unknown action must fail');
    assert.strictEqual(isStoredRiskEventV1({ ...valid, enforcementMode: 'ILLEGAL' }), false, 'Unknown mode must fail');
    assert.strictEqual(isStoredRiskEventV1({ ...valid, evaluatedAt: 'yesterday at 5pm' }), false, 'Non-ISO evaluatedAt must fail');
    assert.strictEqual(isStoredRiskEventV1({ ...valid, storedAt: 'not-a-date' }), false, 'Non-ISO storedAt must fail');
    assert.strictEqual(isStoredRiskEventV1({ ...valid, minimalDerivedSignals: null }), false, 'Null minimalDerivedSignals must fail');
  });

  // 7. Schema Guard: Reject Non-Primitive Attributes in Evidence
  await it('isStoredRiskEventV1 should reject nested objects or arrays inside evidence attributes', () => {
    const valid = toStoredRiskEvent(evaluate({ webdriver: true }));

    const poisonedEvidence = [
      {
        rule: 'test.poison',
        score: 10,
        message: 'nested exploit attempt',
        attributes: { nested: { inner: 'dangerous' }, arrayVal: [1, 2, 3] }
      }
    ];

    assert.strictEqual(isStoredRiskEventV1({ ...valid, evidence: poisonedEvidence }), false, 'Nested objects in attributes must be rejected');
  });
}

run();
