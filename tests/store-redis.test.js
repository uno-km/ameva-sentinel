import assert from 'node:assert';
import {
  RedisNonceStore,
  RedisFixedWindowCounterStore,
  RedisRiskEventStore,
  RedisStreamSink
} from '../packages/store-redis/dist/index.js';
import {
  createSentinel,
  signCollectorToken,
  StaticKeyResolver,
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

console.log('🧪 Running Redis Distributed Storage & Stream Sink Test Suite...');

/**
 * 100% In-Memory Mock Redis Server Implementation for deterministic testing
 */
class MockRedisServer {
  constructor() {
    this.data = new Map();
    this.ttls = new Map();
    this.streams = new Map();
    this.lists = new Map();
  }

  async set(key, value, ...args) {
    const now = Date.now();
    let isNx = false;
    let exSeconds = null;

    for (let i = 0; i < args.length; i++) {
      const arg = String(args[i]).toUpperCase();
      if (arg === 'NX') isNx = true;
      if (arg === 'EX' && args[i + 1] !== undefined) {
        exSeconds = Number(args[i + 1]);
        i++;
      }
    }

    if (isNx) {
      if (this.data.has(key)) {
        const exp = this.ttls.get(key);
        if (!exp || exp > now) {
          return null; // Key exists, NX failed
        }
      }
    }

    this.data.set(key, String(value));
    if (exSeconds !== null) {
      this.ttls.set(key, now + (exSeconds * 1000));
    } else {
      this.ttls.delete(key);
    }
    return 'OK';
  }

  async get(key) {
    const now = Date.now();
    if (!this.data.has(key)) return null;
    const exp = this.ttls.get(key);
    if (exp && exp <= now) {
      this.data.delete(key);
      this.ttls.delete(key);
      return null;
    }
    return this.data.get(key);
  }

  async del(key) {
    const keys = Array.isArray(key) ? key : [key];
    let count = 0;
    for (const k of keys) {
      if (this.data.delete(k)) count++;
      this.ttls.delete(k);
      if (this.lists.delete(k)) count++;
      if (this.streams.delete(k)) count++;
    }
    return count;
  }

  async eval(script, numKeys, ...args) {
    const key = String(args[0]);
    const windowSec = Number(args[1]);
    const now = Date.now();

    // Execute atomic Lua simulation: INCR + TTL recovery
    let val = 0;
    const currentStr = await this.get(key);
    if (currentStr) {
      val = Number(currentStr) || 0;
    }
    val += 1;
    this.data.set(key, String(val));

    // Check TTL
    const exp = this.ttls.get(key);
    if (!exp || exp <= now) {
      this.ttls.set(key, now + (windowSec * 1000));
    }

    return val;
  }

  async lpush(key, ...values) {
    if (!this.lists.has(key)) {
      this.lists.set(key, []);
    }
    const list = this.lists.get(key);
    list.unshift(...values);
    return list.length;
  }

  async ltrim(key, start, stop) {
    if (!this.lists.has(key)) return 'OK';
    const list = this.lists.get(key);
    this.lists.set(key, list.slice(start, stop + 1));
    return 'OK';
  }

  async lrange(key, start, stop) {
    if (!this.lists.has(key)) return [];
    const list = this.lists.get(key);
    const end = stop < 0 ? list.length + stop + 1 : stop + 1;
    return list.slice(start, end);
  }

  async xadd(stream, ...args) {
    if (!this.streams.has(stream)) {
      this.streams.set(stream, []);
    }
    const entries = this.streams.get(stream);
    const id = `${Date.now()}-${entries.length}`;
    entries.push({ id, fields: args });
    return id;
  }

  async ping() {
    return 'PONG';
  }

  pipeline() {
    const commands = [];
    const self = this;
    return {
      xadd(stream, ...args) {
        commands.push(() => self.xadd(stream, ...args));
        return this;
      },
      lpush(key, val) {
        commands.push(() => self.lpush(key, val));
        return this;
      },
      ltrim(key, start, stop) {
        commands.push(() => self.ltrim(key, start, stop));
        return this;
      },
      async exec() {
        const results = [];
        for (const cmd of commands) {
          results.push([null, await cmd()]);
        }
        return results;
      }
    };
  }
}

async function main() {
  await test('Gate 1: RedisNonceStore atomic lock & 100-request concurrent replay prevention', async () => {
    const redis = new MockRedisServer();
    const nonceStore = new RedisNonceStore({ redis, keyPrefix: 'test_sentinel' });

    assert.strictEqual(nonceStore.clientType, 'redis');
    assert.strictEqual(await nonceStore.ping(), true);

    const namespace = { issuer: 'auth-server', kid: 'k1', nonce: 'nonce_unique_123' };
    const expiresAt = Date.now() + 60000;

    // First consume must succeed
    const firstAttempt = await nonceStore.consume(namespace, expiresAt);
    assert.strictEqual(firstAttempt, true);

    // 100 concurrent race attempts with same nonce must all fail
    const raceResults = await Promise.all(
      Array.from({ length: 100 }).map(() => nonceStore.consume(namespace, expiresAt))
    );
    assert(raceResults.every(res => res === false));
  });

  await test('Gate 2: RedisNonceStore key sanitization against command injection', async () => {
    const redis = new MockRedisServer();
    const nonceStore = new RedisNonceStore({ redis });

    const dangerousNamespace = {
      issuer: 'evil\r\nSET FLUSHALL 1\r\n',
      kid: 'kid 1',
      nonce: 'nonce\0dangerous'
    };

    const ok = await nonceStore.consume(dangerousNamespace, Date.now() + 10000);
    assert.strictEqual(ok, true);

    // Verify key was sanitized and no newlines/control chars exist
    const storedKeys = Array.from(redis.data.keys());
    assert(storedKeys.every(k => !k.includes('\r') && !k.includes('\n') && !k.includes(' ')));
  });

  await test('Gate 3: RedisFixedWindowCounterStore atomic Lua execution with TTL drift recovery', async () => {
    const redis = new MockRedisServer();
    const counterStore = new RedisFixedWindowCounterStore({ redis, keyPrefix: 'rate' });

    assert.strictEqual(await counterStore.ping(), true);

    // First increment in 60s window
    const r1 = await counterStore.increment('user:101', { windowMs: 60000 });
    assert.strictEqual(r1.count, 1);
    assert(r1.resetAt > Date.now());

    // Subsequent increments in same window
    const r2 = await counterStore.increment('user:101', { windowMs: 60000 });
    assert.strictEqual(r2.count, 2);

    const r3 = await counterStore.increment('user:101', { windowMs: 60000 });
    assert.strictEqual(r3.count, 3);

    // Verify get
    assert.strictEqual(await counterStore.get('user:101', 60), 3);

    // Verify reset
    await counterStore.reset('user:101', 60);
    assert.strictEqual(await counterStore.get('user:101', 60), 0);
  });

  await test('Gate 4: RedisRiskEventStore append, capped trim, listing, and query by since', async () => {
    const redis = new MockRedisServer();
    const eventStore = new RedisRiskEventStore({ redis, maxItems: 3 });

    const sampleReport1 = {
      traceId: 'trc_1',
      evaluatedAt: '2026-08-21T01:00:00.000Z',
      action: SentinelAction.ALLOW,
      decision: { action: SentinelAction.ALLOW, reasonCode: 'BASELINE_CLEAN' },
      score: 5,
      evidenceConfidence: 0.8,
      signals: {},
      evidence: []
    };
    const sampleReport2 = {
      traceId: 'trc_2',
      evaluatedAt: '2026-08-21T02:00:00.000Z',
      action: SentinelAction.REQUIRE_APP_VERIFICATION,
      decision: { action: SentinelAction.REQUIRE_APP_VERIFICATION, reasonCode: 'POLICY_SCORE_APP_VERIFICATION' },
      score: 65,
      evidenceConfidence: 0.8,
      signals: {},
      evidence: []
    };
    const sampleReport3 = {
      traceId: 'trc_3',
      evaluatedAt: '2026-08-21T03:00:00.000Z',
      action: SentinelAction.TEMPORARY_DENY,
      decision: { action: SentinelAction.TEMPORARY_DENY, reasonCode: 'POLICY_SCORE_DENY' },
      score: 95,
      evidenceConfidence: 0.8,
      signals: {},
      evidence: []
    };
    const sampleReport4 = {
      traceId: 'trc_4',
      evaluatedAt: '2026-08-21T04:00:00.000Z',
      action: SentinelAction.ALLOW,
      decision: { action: SentinelAction.ALLOW, reasonCode: 'BASELINE_CLEAN' },
      score: 10,
      evidenceConfidence: 0.8,
      signals: {},
      evidence: []
    };

    await eventStore.append(sampleReport1);
    await eventStore.append(sampleReport2);
    await eventStore.append(sampleReport3);
    await eventStore.append(sampleReport4);

    // Max items is 3, so oldest (sampleReport1) should be pruned
    const list = await eventStore.list();
    assert.strictEqual(list.length, 3);
    assert.strictEqual(list[0].traceId, 'trc_4');
    assert.strictEqual(list[2].traceId, 'trc_2');

    // Query since 03:00:00
    const sinceList = await eventStore.list({ since: Date.parse('2026-08-21T03:00:00.000Z') });
    assert.strictEqual(sinceList.length, 2);
  });

  await test('Gate 5: RedisStreamSink XADD MAXLEN~ streaming and pipeline batch execution', async () => {
    const redis = new MockRedisServer();
    const streamSink = new RedisStreamSink({
      redis,
      streamKey: 'risk-events',
      maxLen: 1000
    });

    const record1 = { kind: 'risk_event', id: 'stream_1', timestamp: new Date().toISOString() };
    const record2 = { kind: 'risk_event', id: 'stream_2', timestamp: new Date().toISOString() };

    await streamSink.emit(record1);
    await streamSink.emitBatch([record2]);

    const streamEntries = redis.streams.get('sentinel:risk-events');
    assert.strictEqual(streamEntries.length, 2);
  });

  await test('Gate 6: Sentinel end-to-end integration with RedisNonceStore & RedisFixedWindowCounterStore', async () => {
    const redis = new MockRedisServer();
    const nonceStore = new RedisNonceStore({ redis });
    const counterStore = new RedisFixedWindowCounterStore({ redis });

    const keySecret = 'test_secret_for_redis_sentinel_0123456789';
    const keyResolver = new StaticKeyResolver({
      test_key: keySecret
    });

    const sentinel = createSentinel({
      keyResolver,
      nonceStore,
      counterStore,
      expectedAudience: 'https://api.mycompany.com',
      expectedPurpose: 'telemetry-collect',
      allowedIssuers: ['trusted-issuer']
    });

    const token = await signCollectorToken(
      {
        v: 1,
        kid: 'test_key',
        iss: 'trusted-issuer',
        aud: 'https://api.mycompany.com',
        purpose: 'telemetry-collect',
        sessionRef: 'sess_123',
        iat: Date.now(),
        exp: Date.now() + 60000,
        nonce: 'distributed_nonce_abc'
      },
      keySecret
    );

    // 1. First score with verified token should pass
    const report1 = await sentinel.score({
      headers: { authorization: `Bearer ${token}` }
    });
    assert.strictEqual(report1.action, SentinelAction.ALLOW);
    assert.strictEqual(report1.verification.state, 'VERIFIED');

    // 2. Replayed token should be detected and marked FAILED
    const report2 = await sentinel.score({
      headers: { authorization: `Bearer ${token}` }
    });
    assert.strictEqual(report2.verification.state, 'FAILED');
    assert.strictEqual(report2.verification.error, 'REPLAY_ATTACK_DETECTED');
  });

  console.log(`\n==================================================`);
  console.log(`Results: ${passed} passed, ${failed} failed, total ${passed + failed}`);
  console.log(`{"suite": "store_redis", "passed": ${passed}, "failed": ${failed}, "total": ${passed + failed}}`);
  if (failed > 0) process.exit(1);
}

main();
