import assert from 'node:assert';
import { SnapshotCache, SingleflightCoalescer, maskIpAddress } from '../packages/risk-core/dist/index.js';
import { sentinel } from '../packages/sentinel/dist/index.js';

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

async function main() {
  console.log('🧪 Running Snapshot Cache, Singleflight & IP Masking Test Suite...');

  await test('Gate 1: SnapshotCache in-memory TTL hit', async () => {
    const cache = new SnapshotCache({ ttlMs: 200 });
    let fetchCount = 0;
    const fetcher = async () => {
      fetchCount++;
      return { data: 'test_payload', count: fetchCount };
    };

    const res1 = await cache.getOrFetch('k1', fetcher);
    assert.strictEqual(res1.count, 1);
    assert.strictEqual(fetchCount, 1);

    const res2 = await cache.getOrFetch('k1', fetcher);
    assert.strictEqual(res2.count, 1);
    assert.strictEqual(fetchCount, 1, 'Fetcher must not be called during active TTL');
  });

  await test('Gate 2: Stale-While-Revalidate (SWR) asynchronous update', async () => {
    const cache = new SnapshotCache({ ttlMs: 50 });
    let fetchCount = 0;
    const fetcher = async () => {
      fetchCount++;
      return { version: fetchCount };
    };

    await cache.getOrFetch('k2', fetcher);
    assert.strictEqual(fetchCount, 1);

    await new Promise(r => setTimeout(r, 70));

    const stale = await cache.getOrFetch('k2', fetcher);
    assert.strictEqual(stale.version, 1);

    await new Promise(r => setTimeout(r, 50));

    const fresh = await cache.getOrFetch('k2', fetcher);
    assert.strictEqual(fresh.version, 2, 'Cache must reflect revalidated value');
  });

  await test('Gate 3: Singleflight coalesces 50 concurrent requests into 1 execution', async () => {
    const coalescer = new SingleflightCoalescer();
    let dbExecutions = 0;

    const heavyDbQuery = async () => {
      dbExecutions++;
      await new Promise(r => setTimeout(r, 50));
      return { status: 'ok', queryId: dbExecutions };
    };

    const requests = Array.from({ length: 50 }, () => coalescer.execute('heavy_query', heavyDbQuery));
    const results = await Promise.all(requests);

    assert.strictEqual(dbExecutions, 1, '50 concurrent requests must coalesce into exactly 1 underlying DB query');
    results.forEach(r => {
      assert.strictEqual(r.queryId, 1);
    });
  });

  await test('Gate 4: IPv4 address privacy masking', async () => {
    assert.strictEqual(maskIpAddress('125.132.13.175'), '125.132.***.***');
    assert.strictEqual(maskIpAddress('52.167.144.177'), '52.167.***.***');
    assert.strictEqual(maskIpAddress('57.141.0.51'), '57.141.***.***');
    assert.strictEqual(maskIpAddress('127.0.0.1'), '127.0.***.***');
  });

  await test('Gate 5: IPv6 address privacy masking', async () => {
    assert.strictEqual(maskIpAddress('2001:0db8:85a3:0000:0000:8a2e:0370:7334'), '2001:0db8:****:****');
    assert.strictEqual(maskIpAddress('2600:1f18:63fe::1'), '2600:1f18:****:****');
  });

  await test('Gate 6: Null and edge case IP robustness', async () => {
    assert.strictEqual(maskIpAddress(null), '***.***.***.***');
    assert.strictEqual(maskIpAddress(undefined), '***.***.***.***');
    assert.strictEqual(maskIpAddress(''), '***.***.***.***');
    assert.strictEqual(sentinel.maskIpAddress('192.168.1.100'), '192.168.***.***');
  });

  console.log('\n==================================================');
  console.log(`Results: ${passed} passed, ${failed} failed, total ${passed + failed}`);
  console.log(JSON.stringify({ suite: 'snapshot_cache', passed, failed, total: passed + failed }));

  if (failed > 0) process.exit(1);
}

main();
