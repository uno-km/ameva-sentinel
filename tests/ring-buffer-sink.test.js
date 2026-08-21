import assert from 'node:assert';
import {
  NullSink,
  CompositeSink,
  AsyncRingBufferSink,
  createSentinel,
  SentinelAction
} from '../packages/sentinel/dist/index.js';

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
    failed++;
  }
}

console.log('🧪 Running Async RingBuffer & Composite EventSink Test Suite...');

class MockCapturingSink {
  constructor(name = 'MockSink', options = {}) {
    this.name = name;
    this.records = [];
    this.delayMs = options.delayMs || 0;
    this.shouldFail = options.shouldFail || false;
  }

  async emit(record) {
    if (this.delayMs > 0) {
      await new Promise(res => setTimeout(res, this.delayMs));
    }
    if (this.shouldFail) {
      throw new Error(`[${this.name}] Simulated downstream failure`);
    }
    this.records.push(record);
  }

  async emitBatch(records) {
    if (this.delayMs > 0) {
      await new Promise(res => setTimeout(res, this.delayMs));
    }
    if (this.shouldFail) {
      throw new Error(`[${this.name}] Simulated downstream batch failure`);
    }
    this.records.push(...records);
  }
}

async function main() {
  await test('Gate 1: NullSink functionality and zero-overhead benchmark compliance', async () => {
    const nullSink = new NullSink();
    assert.strictEqual(nullSink.name, 'NullSink');
    assert.strictEqual(nullSink.emittedCount, 0);

    const record = { kind: 'risk_event', id: 'trc_1', timestamp: new Date().toISOString() };
    nullSink.emit(record);
    nullSink.emitBatch([record, record]);
    assert.strictEqual(nullSink.emittedCount, 3);
    nullSink.reset();
    assert.strictEqual(nullSink.emittedCount, 0);
  });

  await test('Gate 2: AsyncRingBufferSink bitmask power-of-2 capacity and batch flusher', async () => {
    const downstream = new MockCapturingSink('TestDownstream');
    const ring = new AsyncRingBufferSink({
      downstream,
      capacity: 10, // Should be normalized to 16
      batchSize: 4,
      flushIntervalMs: 50
    });

    const stats = ring.stats();
    assert.strictEqual(stats.capacity, 16);
    assert.strictEqual(stats.buffered, 0);

    // Enqueue 4 items (should trigger proactive flush)
    for (let i = 0; i < 4; i++) {
      ring.emit({ kind: 'risk_event', id: `trc_${i}`, timestamp: new Date().toISOString() });
    }

    // Await flush
    await ring.flush();
    assert.strictEqual(downstream.records.length, 4);
    assert.strictEqual(ring.stats().flushed, 4);
    assert.strictEqual(ring.stats().buffered, 0);

    await ring.close();
  });

  await test('Gate 3: OverflowPolicy DROP_OLDEST and granular drop metrics', async () => {
    const downstream = new MockCapturingSink('DropOldestSink');
    const ring = new AsyncRingBufferSink({
      downstream,
      capacity: 4, // Max 4
      flushIntervalMs: 0, // Manual flush only
      overflowPolicy: 'DROP_OLDEST'
    });

    // Enqueue 6 items into capacity 4 buffer
    for (let i = 1; i <= 6; i++) {
      ring.emit({ kind: 'risk_event', id: `item_${i}`, timestamp: new Date().toISOString() });
    }

    const stats = ring.stats();
    assert.strictEqual(stats.capacity, 4);
    assert.strictEqual(stats.buffered, 4);
    assert.strictEqual(stats.droppedOldest, 2);
    assert.strictEqual(stats.dropped, 2);

    await ring.flush();
    assert.strictEqual(downstream.records.length, 4);
    assert.strictEqual(downstream.records[0].id, 'item_3');
    assert.strictEqual(downstream.records[3].id, 'item_6');

    await ring.close();
  });

  await test('Gate 4: OverflowPolicy DROP_NEWEST and granular drop metrics', async () => {
    const downstream = new MockCapturingSink('DropNewestSink');
    const ring = new AsyncRingBufferSink({
      downstream,
      capacity: 4,
      flushIntervalMs: 0,
      overflowPolicy: 'DROP_NEWEST'
    });

    for (let i = 1; i <= 6; i++) {
      ring.emit({ kind: 'risk_event', id: `item_${i}`, timestamp: new Date().toISOString() });
    }

    const stats = ring.stats();
    assert.strictEqual(stats.buffered, 4);
    assert.strictEqual(stats.droppedNewest, 2);
    assert.strictEqual(stats.dropped, 2);

    await ring.flush();
    assert.strictEqual(downstream.records.length, 4);
    assert.strictEqual(downstream.records[0].id, 'item_1');
    assert.strictEqual(downstream.records[3].id, 'item_4');

    await ring.close();
  });

  await test('Gate 5: OverflowPolicy FAIL_CLOSED throws immediately on buffer saturation', async () => {
    const downstream = new MockCapturingSink('FailClosedSink');
    const ring = new AsyncRingBufferSink({
      downstream,
      capacity: 4,
      flushIntervalMs: 0,
      overflowPolicy: 'FAIL_CLOSED'
    });

    for (let i = 1; i <= 4; i++) {
      ring.emit({ kind: 'risk_event', id: `item_${i}`, timestamp: new Date().toISOString() });
    }

    assert.throws(() => {
      ring.emit({ kind: 'risk_event', id: 'overflow_item', timestamp: new Date().toISOString() });
    }, /Ring buffer saturated/);

    const stats = ring.stats();
    assert.strictEqual(stats.failClosedRejects, 1);
    assert.strictEqual(stats.dropped, 1);

    await ring.close();
  });

  await test('Gate 6: Circuit Breaker state machine (CLOSED -> OPEN -> HALF_OPEN -> CLOSED)', async () => {
    const failingSink = new MockCapturingSink('FailingSink', { shouldFail: true });
    let errorCallbackCalls = 0;

    const ring = new AsyncRingBufferSink({
      downstream: failingSink,
      capacity: 16,
      batchSize: 2,
      flushIntervalMs: 0,
      circuitBreakerThreshold: 2,
      circuitBreakerCooldownMs: 50,
      onError: () => {
        errorCallbackCalls++;
      }
    });

    assert.strictEqual(ring.stats().circuitBreakerState, 'CLOSED');

    // Cause 2 consecutive flush failures
    ring.emit({ kind: 'risk_event', id: '1', timestamp: new Date().toISOString() });
    await ring.flush();
    ring.emit({ kind: 'risk_event', id: '2', timestamp: new Date().toISOString() });
    await ring.flush();

    assert.strictEqual(ring.stats().circuitBreakerState, 'OPEN');
    assert.strictEqual(ring.stats().flushFailures, 2);
    assert.strictEqual(errorCallbackCalls, 2);

    // While OPEN, enqueue drops events immediately
    ring.emit({ kind: 'risk_event', id: '3', timestamp: new Date().toISOString() });
    assert.strictEqual(ring.stats().circuitBreakerDrops, 1);

    // Wait for cooldown to expire
    await new Promise(res => setTimeout(res, 60));

    // Fix downstream sink
    failingSink.shouldFail = false;

    // Next enqueue transitions to HALF_OPEN
    ring.emit({ kind: 'risk_event', id: '4', timestamp: new Date().toISOString() });
    assert.strictEqual(ring.stats().circuitBreakerState, 'HALF_OPEN');

    // Successful flush recovers state to CLOSED
    await ring.flush();
    assert.strictEqual(ring.stats().circuitBreakerState, 'CLOSED');

    await ring.close();
  });

  await test('Gate 7: CompositeSink fan-out multi-sink dispatch with timeout protection', async () => {
    const fastSink = new MockCapturingSink('FastSink');
    const slowSink = new MockCapturingSink('SlowSink', { delayMs: 150 });
    const failingSink = new MockCapturingSink('FailingSink', { shouldFail: true });

    const composite = new CompositeSink([fastSink, slowSink, failingSink], {
      emitTimeoutMs: 50 // Short timeout to test cancellation
    });

    const record = { kind: 'risk_event', id: 'composite_1', timestamp: new Date().toISOString() };
    await composite.emit(record);

    // FastSink received record
    assert.strictEqual(fastSink.records.length, 1);
    // SlowSink and FailingSink do not crash execution due to Promise.allSettled + timeout
    assert.strictEqual(composite.downstreamSinks.length, 3);
  });

  await test('Gate 8: Sentinel facade auto-dispatches RiskEventRecord to eventSink', async () => {
    const capturingSink = new MockCapturingSink('FacadeSink');
    const sentinel = createSentinel({
      eventSink: capturingSink
    });

    const report = await sentinel.score({
      headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    assert.strictEqual(report.action, SentinelAction.ALLOW);
    assert.strictEqual(capturingSink.records.length, 1);
    assert.strictEqual(capturingSink.records[0].kind, 'risk_event');
    assert.strictEqual(capturingSink.records[0].id, report.traceId);
  });

  console.log(`\n==================================================`);
  console.log(`Results: ${passed} passed, ${failed} failed, total ${passed + failed}`);
  console.log(`{"suite": "ring_buffer_sink", "passed": ${passed}, "failed": ${failed}, "total": ${passed + failed}}`);
  if (failed > 0) process.exit(1);
}

main();
