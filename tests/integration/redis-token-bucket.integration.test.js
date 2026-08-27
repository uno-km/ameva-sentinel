/**
 * @file redis-token-bucket.integration.test.js
 * Comprehensive Real Redis 7 Integration Test Suite for AMEVA-Sentinel.
 * Tests:
 * 1. SHA-1 Consistency & Production Lua Script Hash Parity (Node crypto & Redis SCRIPT LOAD)
 * 2. 6-Scope Distinct Sentinel Quota Deduction & Direct Redis Hash Verification
 * 3. Multi-Key Atomic All-or-Nothing Exact Hash Equality (assert.deepEqual on rejection)
 * 4. Multi-Client Concurrent Contention across 5 Independent Connections
 * 5. Cross-Tenant & Cross-Account Namespace Isolation
 * 6. SCRIPT FLUSH & NOSCRIPT Transparent Recovery with Exact Single-Cost Deduction
 * 7. Invalid Input Guard & Zero-Mutation Integrity
 * 8. Hard-Fail Verification when Redis is Unreachable (Zero Silent Mock Fallback)
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import Redis from 'ioredis';
import {
  RedisTokenBucketStore,
  HIERARCHICAL_TOKEN_BUCKET_LUA,
  computeSha1Hex,
  isNoScriptError
} from '../../packages/store-redis/dist/index.js';
import { hashKeyIdentifier } from '../../packages/risk-core/dist/index.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:16379';
const TEST_PREFIX = `sentinel:itest:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

console.log(`\n🚀 Starting Real Redis 7 Integration Test Suite against: ${REDIS_URL}`);
console.log(`🔑 Isolated Test Prefix: ${TEST_PREFIX}\n`);

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 1,
  connectTimeout: 3000,
  lazyConnect: false
});

const auxiliaryClients = [];

async function run() {
  try {
    const ping = await redis.ping();
    assert.equal(ping, 'PONG', 'Redis must respond with PONG');

    const info = await redis.info('server');
    const versionMatch = info.match(/redis_version:([0-9.]+)/);
    const redisVersion = versionMatch ? versionMatch[1] : 'Unknown';
    console.log(`  [SETUP] Connected to Redis Server Version: ${redisVersion}`);

    // =========================================================================
    // TEST 1: SHA-1 Consistency & Production Lua Parity (Node crypto & Redis SCRIPT LOAD)
    // =========================================================================
    console.log('  [TEST 1] Testing SHA-1 Consistency and Production Lua SCRIPT LOAD Parity...');
    const localSha = computeSha1Hex(HIERARCHICAL_TOKEN_BUCKET_LUA);
    const nodeCryptoSha = createHash('sha1').update(HIERARCHICAL_TOKEN_BUCKET_LUA, 'utf8').digest('hex');
    assert.equal(localSha, nodeCryptoSha, 'Local computeSha1Hex must strictly match Node crypto SHA-1');

    const redisLoadedSha = await redis.script('LOAD', HIERARCHICAL_TOKEN_BUCKET_LUA);
    assert.equal(localSha, redisLoadedSha, 'Local computeSha1Hex must strictly match Redis server SCRIPT LOAD SHA');

    // Test SHA-1 string length boundaries
    const boundaryStrings = [
      '',
      'a',
      'abc',
      'The quick brown fox jumps over the lazy dog',
      '안녕 세계 (UTF-8 Multi-byte)',
      'x'.repeat(55),
      'x'.repeat(56),
      'x'.repeat(63),
      'x'.repeat(64),
      'x'.repeat(65),
      'x'.repeat(1000)
    ];
    for (const testStr of boundaryStrings) {
      const actual = computeSha1Hex(testStr);
      const expected = createHash('sha1').update(testStr, 'utf8').digest('hex');
      assert.equal(actual, expected, `SHA-1 mismatch on boundary length ${testStr.length}`);
    }

    // Verify isNoScriptError behavior
    assert.equal(isNoScriptError(new Error('NOSCRIPT No matching script. Please use EVAL.')), true);
    assert.equal(isNoScriptError(new Error('Connection timeout')), false);
    assert.equal(isNoScriptError(new Error('ECONNREFUSED')), false);
    console.log('  ✅ PASS: SHA-1 algorithm matched Node crypto and Redis 7 SCRIPT LOAD with 100% parity.');

    const primaryStore = new RedisTokenBucketStore({
      redis,
      prefix: TEST_PREFIX,
      defaultCapacity: 100,
      defaultRefillRatePerSec: 1.0,
      ttlSeconds: 60
    });

    // =========================================================================
    // TEST 2: 6-Scope Distinct Sentinel Quota Deduction & Direct Redis Verification
    // =========================================================================
    console.log('  [TEST 2] Testing 6-Scope Distinct Sentinel Quota Deduction in Real Redis...');
    const test1Req = {
      cost: 15,
      routeKey: 'POST:/api/v1/payment/checkout',
      tenantId: 'corp-alpha',
      accountId: 'acc-prime-001',
      apiKeyId: 'ak-live-secret',
      sessionId: 'sess-secure-xyz',
      networkKey: '10.0.0.42',
      scopeBudgets: {
        route: { capacity: 100, refillRatePerSec: 0 },
        tenant: { capacity: 200, refillRatePerSec: 0 },
        account: { capacity: 300, refillRatePerSec: 0 },
        authKey: { capacity: 400, refillRatePerSec: 0 },
        session: { capacity: 500, refillRatePerSec: 0 },
        network: { capacity: 600, refillRatePerSec: 0 }
      }
    };

    const res1 = await primaryStore.consume(test1Req);
    assert.equal(res1.allowed, true, 'First 15-cost request must be allowed');
    assert.equal(res1.degraded, false, 'Must be handled via Redis without fallback');
    assert.equal(res1.remainingCost, 85, 'Remaining cost must reflect lowest balance (100 - 15 = 85)');

    // Verify directly in Redis storage for each individual scope key
    const tenantTag = hashKeyIdentifier('tenant:corp-alpha');
    const expectedKeyMap = [
      { name: 'route', key: `${TEST_PREFIX}:{${tenantTag}}:route:${hashKeyIdentifier('POST:/api/v1/payment/checkout')}`, expectedInitial: 100 },
      { name: 'tenant', key: `${TEST_PREFIX}:{${tenantTag}}:tenant:${hashKeyIdentifier('corp-alpha')}`, expectedInitial: 200 },
      { name: 'account', key: `${TEST_PREFIX}:{${tenantTag}}:account:${hashKeyIdentifier('acc-prime-001')}`, expectedInitial: 300 },
      { name: 'authKey', key: `${TEST_PREFIX}:{${tenantTag}}:auth_key:${hashKeyIdentifier('ak-live-secret')}`, expectedInitial: 400 },
      { name: 'session', key: `${TEST_PREFIX}:{${tenantTag}}:session:${hashKeyIdentifier('sess-secure-xyz')}`, expectedInitial: 500 },
      { name: 'network', key: `${TEST_PREFIX}:{${tenantTag}}:net:${hashKeyIdentifier('10.0.0.42')}`, expectedInitial: 600 }
    ];

    for (const item of expectedKeyMap) {
      const rawData = await redis.hmget(item.key, 'tokens', 'last_updated');
      const tokens = parseFloat(rawData[0]);
      assert.ok(tokens !== null && !isNaN(tokens), `Key ${item.name} must exist in Redis`);
      const expectedRemaining = item.expectedInitial - 15;
      assert.equal(tokens, expectedRemaining, `Key ${item.name} must have exact balance ${expectedRemaining}`);
    }
    console.log('  ✅ PASS: 6-Scope distinct quotas deducted accurately in Redis 7 storage.');

    // =========================================================================
    // TEST 3: Multi-Key Atomic All-or-Nothing Exact State Equality (Zero Mutation on Reject)
    // =========================================================================
    console.log('  [TEST 3] Testing Multi-Key Atomic All-or-Nothing Exact Hash State Equality...');
    // Read complete hash snapshot of all 6 keys in Redis
    const beforeHashSnapshots = await Promise.all(
      expectedKeyMap.map(item => redis.hgetall(item.key))
    );

    // Attempt a massive cost request (90 tokens) which exceeds route capacity (current 85 tokens)
    // but is well within tenant (185), account (285), etc.
    const allOrNothingReq = {
      ...test1Req,
      cost: 90
    };

    const res2 = await primaryStore.consume(allOrNothingReq);
    assert.equal(res2.allowed, false, '90-cost request must be REJECTED because route has insufficient tokens');
    assert.ok(res2.retryAfterSeconds > 0, 'Retry-after must be provided when rejected');

    // Read complete hash snapshot of all 6 keys in Redis after rejection
    const afterHashSnapshots = await Promise.all(
      expectedKeyMap.map(item => redis.hgetall(item.key))
    );

    // Assert exact, byte-for-byte deep equality across all 6 Redis hashes (Zero Mutation)
    assert.deepEqual(
      afterHashSnapshots,
      beforeHashSnapshots,
      'All 6 Redis hashes must be strictly identical before and after rejection (Zero Mutation guarantee)'
    );
    console.log('  ✅ PASS: Atomic All-or-Nothing verified. Complete deep equality confirmed across all 6 Redis hashes.');

    // =========================================================================
    // TEST 4: Multi-Client Concurrent Contention across 5 Independent Connections
    // =========================================================================
    console.log('  [TEST 4] Testing Multi-Client Concurrent Contention across 5 Independent Connections...');
    const c1 = new Redis(REDIS_URL, { maxRetriesPerRequest: 1 });
    const c2 = new Redis(REDIS_URL, { maxRetriesPerRequest: 1 });
    const c3 = new Redis(REDIS_URL, { maxRetriesPerRequest: 1 });
    const c4 = new Redis(REDIS_URL, { maxRetriesPerRequest: 1 });
    auxiliaryClients.push(c1, c2, c3, c4);

    const contentionClients = [redis, c1, c2, c3, c4];
    const contentionStores = contentionClients.map(client => new RedisTokenBucketStore({
      redis: client,
      prefix: TEST_PREFIX,
      defaultCapacity: 50,
      defaultRefillRatePerSec: 0, // zero refill to test pure atomic capacity depletion
      ttlSeconds: 60
    }));

    const contentionReq = {
      cost: 10,
      routeKey: 'POST:/api/v1/heavy/query',
      tenantId: 'tenant-contention-shared',
      scopeBudgets: {
        route: { capacity: 50, refillRatePerSec: 0 },
        tenant: { capacity: 50, refillRatePerSec: 0 }
      }
    };

    // Launch 15 concurrent requests of cost 10 against a capacity of 50
    // Total attempted cost = 150. Max allowed = 50 (exactly 5 requests).
    const promises = [];
    for (let i = 0; i < 15; i++) {
      const store = contentionStores[i % contentionStores.length];
      promises.push(store.consume(contentionReq));
    }

    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.allowed).length;
    const rejectCount = results.filter(r => !r.allowed).length;

    assert.equal(successCount, 5, `Exactly 5 requests must be allowed (5 * 10 = 50 tokens), found ${successCount}`);
    assert.equal(rejectCount, 10, `Exactly 10 requests must be rejected, found ${rejectCount}`);

    const sharedTenantTag = hashKeyIdentifier('tenant:tenant-contention-shared');
    const sharedTenantKey = `${TEST_PREFIX}:{${sharedTenantTag}}:tenant:${hashKeyIdentifier('tenant-contention-shared')}`;
    const finalData = await redis.hmget(sharedTenantKey, 'tokens');
    const finalTokens = parseFloat(finalData[0]);
    assert.equal(finalTokens, 0, `Final tokens must be exactly 0 (no negative balance or overshoot), found ${finalTokens}`);
    console.log('  ✅ PASS: 5 Independent connections concurrently contended without over-admission or negative balance.');

    // =========================================================================
    // TEST 5: Cross-Tenant & Cross-Account Namespace Isolation
    // =========================================================================
    console.log('  [TEST 5] Testing Cross-Tenant and Cross-Account Namespace Isolation...');
    // Tenant Alpha - Account 1
    const tA_acc1 = {
      cost: 30,
      routeKey: 'GET:/resource',
      tenantId: 'corp-x',
      accountId: 'acc-finance',
      scopeBudgets: {
        tenant: { capacity: 100, refillRatePerSec: 0 },
        account: { capacity: 100, refillRatePerSec: 0 }
      }
    };
    // Tenant Alpha - Account 2
    const tA_acc2 = {
      cost: 20,
      routeKey: 'GET:/resource',
      tenantId: 'corp-x',
      accountId: 'acc-marketing',
      scopeBudgets: {
        tenant: { capacity: 100, refillRatePerSec: 0 },
        account: { capacity: 100, refillRatePerSec: 0 }
      }
    };
    // Tenant Beta - Account 1
    const tB_acc1 = {
      cost: 10,
      routeKey: 'GET:/resource',
      tenantId: 'corp-y',
      accountId: 'acc-finance',
      scopeBudgets: {
        tenant: { capacity: 100, refillRatePerSec: 0 },
        account: { capacity: 100, refillRatePerSec: 0 }
      }
    };

    const resA1 = await primaryStore.consume(tA_acc1);
    const resA2 = await primaryStore.consume(tA_acc2);
    const resB1 = await primaryStore.consume(tB_acc1);

    assert.equal(resA1.allowed, true);
    assert.equal(resA2.allowed, true);
    assert.equal(resB1.allowed, true);

    const tagX = hashKeyIdentifier('tenant:corp-x');
    const keyTenantX = `${TEST_PREFIX}:{${tagX}}:tenant:${hashKeyIdentifier('corp-x')}`;
    const keyAccX_fin = `${TEST_PREFIX}:{${tagX}}:account:${hashKeyIdentifier('acc-finance')}`;
    const keyAccX_mkt = `${TEST_PREFIX}:{${tagX}}:account:${hashKeyIdentifier('acc-marketing')}`;

    const tagY = hashKeyIdentifier('tenant:corp-y');
    const keyTenantY = `${TEST_PREFIX}:{${tagY}}:tenant:${hashKeyIdentifier('corp-y')}`;
    const keyAccY_fin = `${TEST_PREFIX}:{${tagY}}:account:${hashKeyIdentifier('acc-finance')}`;

    const tX_tokens = parseFloat((await redis.hmget(keyTenantX, 'tokens'))[0]);
    const aX_fin_tokens = parseFloat((await redis.hmget(keyAccX_fin, 'tokens'))[0]);
    const aX_mkt_tokens = parseFloat((await redis.hmget(keyAccX_mkt, 'tokens'))[0]);

    const tY_tokens = parseFloat((await redis.hmget(keyTenantY, 'tokens'))[0]);
    const aY_fin_tokens = parseFloat((await redis.hmget(keyAccY_fin, 'tokens'))[0]);

    assert.equal(tX_tokens, 50, 'Tenant corp-x consumed 30 + 20 = 50 tokens (100 - 50 = 50)');
    assert.equal(aX_fin_tokens, 70, 'Account finance (corp-x) consumed 30 tokens (100 - 30 = 70)');
    assert.equal(aX_mkt_tokens, 80, 'Account marketing (corp-x) consumed 20 tokens (100 - 20 = 80)');

    assert.equal(tY_tokens, 90, 'Tenant corp-y consumed 10 tokens (100 - 10 = 90)');
    assert.equal(aY_fin_tokens, 90, 'Account finance (corp-y) consumed 10 tokens (100 - 10 = 90)');
    console.log('  ✅ PASS: Cross-Tenant and Cross-Account namespace sub-keys strictly isolated in Redis keyspace.');

    // =========================================================================
    // TEST 6: SCRIPT FLUSH & NOSCRIPT Transparent Recovery with Exact Single Deduction
    // =========================================================================
    console.log('  [TEST 6] Testing SCRIPT FLUSH & NOSCRIPT Transparent Recovery with Exact Single Deduction...');
    const targetScopeKey = `${TEST_PREFIX}:{${hashKeyIdentifier('tenant:tenant-script-cache')}}:route:${hashKeyIdentifier('POST:/api/v1/script-test')}`;
    const primeReq = {
      cost: 10,
      routeKey: 'POST:/api/v1/script-test',
      tenantId: 'tenant-script-cache',
      scopeBudgets: {
        route: { capacity: 100, refillRatePerSec: 0 },
        tenant: { capacity: 100, refillRatePerSec: 0 }
      }
    };

    // 1. Prime the script cache
    const primeRes = await primaryStore.consume(primeReq);
    assert.equal(primeRes.allowed, true);

    const beforeFlushTokens = parseFloat((await redis.hmget(targetScopeKey, 'tokens'))[0]);
    assert.equal(beforeFlushTokens, 90, 'Initial prime consume must leave exactly 90 tokens');

    // 2. Flush all Lua scripts from Redis server
    await redis.script('FLUSH');

    // 3. Immediately consume again: Redis returns NOSCRIPT on evalsha, store must transparently reload and deduct exactly 10
    const postFlushRes = await primaryStore.consume(primeReq);
    assert.equal(postFlushRes.allowed, true, 'Request must succeed transparently after SCRIPT FLUSH');
    assert.equal(postFlushRes.degraded, false);

    const afterFlushTokens = parseFloat((await redis.hmget(targetScopeKey, 'tokens'))[0]);
    assert.equal(afterFlushTokens, 80, 'Post-flush consume must deduct exactly 10 tokens once (90 -> 80), proving ZERO double deduction');
    assert.equal(beforeFlushTokens - afterFlushTokens, 10, 'Difference must equal exactly request cost (10)');
    console.log('  ✅ PASS: SCRIPT FLUSH / NOSCRIPT recovered transparently with exact single-cost deduction (Zero double deduction).');

    // =========================================================================
    // TEST 7: Invalid Input Guard & Zero-Mutation Integrity
    // =========================================================================
    console.log('  [TEST 7] Testing Invalid Input Guard & Zero-Mutation Integrity...');
    const invalidCosts = [0, -10, NaN, Infinity, -Infinity];
    for (const badCost of invalidCosts) {
      const badRes = await primaryStore.consume({
        cost: badCost,
        routeKey: 'GET:/bad-input',
        tenantId: 'tenant-bad-input'
      });
      assert.equal(badRes.allowed, false, `Bad cost ${badCost} must be rejected`);
    }

    const badTag = hashKeyIdentifier('tenant:tenant-bad-input');
    const badKey = `${TEST_PREFIX}:{${badTag}}:route:${hashKeyIdentifier('GET:/bad-input')}`;
    const badData = await redis.hmget(badKey, 'tokens');
    assert.equal(badData[0], null, 'No key should be created in Redis for invalid requests');
    console.log('  ✅ PASS: Invalid inputs strictly rejected without creating or mutating Redis state.');

    // =========================================================================
    // TEST 8: Hard-Fail Verification when Redis is Unreachable (Clean Error Propagation)
    // =========================================================================
    console.log('  [TEST 8] Testing Hard-Fail on Unreachable Redis (Clean Error Propagation)...');
    let emittedConnectionError = null;
    const deadRedis = new Redis('redis://127.0.0.1:16399', {
      maxRetriesPerRequest: 0,
      connectTimeout: 500,
      retryStrategy: () => null
    });
    deadRedis.on('error', (err) => {
      emittedConnectionError = err;
    });
    auxiliaryClients.push(deadRedis);

    const deadStore = new RedisTokenBucketStore({
      redis: deadRedis,
      prefix: TEST_PREFIX
    });

    let thrownError = null;
    try {
      await deadStore.consume({ cost: 10, routeKey: 'GET:/fail' });
    } catch (err) {
      thrownError = err;
    }
    assert.ok(thrownError, 'Store MUST throw on unreachable Redis rather than silently returning mock success');
    assert.match(
      String(thrownError?.message ?? thrownError),
      /ECONNREFUSED|connection|connect/i,
      'Thrown error must be a connection error'
    );
    assert.ok(emittedConnectionError, 'The Redis client must emit a connection error');
    deadRedis.removeAllListeners();
    console.log('  ✅ PASS: Unreachable Redis cleanly propagates typed ECONNREFUSED error with zero unhandled events.');

    // =========================================================================
    // TEST 9: Non-NOSCRIPT Errors Bubble Up Immediately (Zero Eval Fallback / No Double Deduction)
    // =========================================================================
    console.log('  [TEST 9] Testing Non-NOSCRIPT Error Isolation (Zero Eval Fallback on Timeout/Generic Error)...');
    let evalCallCount = 0;
    const timeoutError = new Error('Command timed out after 2000ms');
    const mockFailingRedis = {
      evalsha: async () => {
        throw timeoutError;
      },
      eval: async () => {
        evalCallCount++;
        throw new Error('FAIL: eval MUST NOT be called for non-NOSCRIPT errors');
      }
    };

    const storeWithFailingRedis = new RedisTokenBucketStore({
      redis: mockFailingRedis,
      prefix: TEST_PREFIX
    });

    await assert.rejects(
      () => storeWithFailingRedis.consume({ cost: 10, routeKey: 'GET:/api/timeout-test' }),
      (err) => err === timeoutError,
      'Store must bubble up original timeout error directly without retrying eval'
    );
    assert.equal(evalCallCount, 0, 'eval MUST NEVER be called on non-NOSCRIPT errors to prevent double deductions');
    console.log('  ✅ PASS: Non-NOSCRIPT errors bubble up immediately with zero eval fallback (No double deduction).');

    // =========================================================================
    // TEST 10: Scope SSOT, Unknown Scope Rejection, & Optional Global Scope Verification
    // =========================================================================
    console.log('  [TEST 10] Testing Scope SSOT, Unknown Scope Rejection, & Optional Global Scope...');
    // 10a. Legacy 6-scope without globalKey generates exactly 6 keys
    const legacyReq = {
      cost: 5,
      routeKey: 'GET:/api/legacy-scope',
      tenantId: 'tenant-legacy',
      accountId: 'acc-legacy',
      apiKeyId: 'key-legacy',
      sessionId: 'sess-legacy',
      networkKey: '192.168.1.0/24'
    };
    const legacyRes = await primaryStore.consume(legacyReq);
    assert.equal(legacyRes.allowed, true, 'Legacy 6-scope request must be allowed');
    const legacyTag = hashKeyIdentifier('tenant:tenant-legacy');
    const legacyCreatedKeys = await redis.keys(`${TEST_PREFIX}:{${legacyTag}}:*`);
    assert.equal(legacyCreatedKeys.length, 6, 'Legacy request must create exactly 6 keys without global key');
    assert.ok(!legacyCreatedKeys.some(k => k.includes(':global:')), 'No global key should be created for legacy request');

    // 10b. Optional global scope request generates 7 keys
    const globalReq = {
      cost: 5,
      globalKey: 'enterprise-shared-cluster',
      routeKey: 'GET:/api/global-scope',
      tenantId: 'tenant-global',
      accountId: 'acc-global',
      apiKeyId: 'key-global',
      sessionId: 'sess-global',
      networkKey: '10.0.0.0/24'
    };
    const globalRes = await primaryStore.consume(globalReq);
    assert.equal(globalRes.allowed, true, 'Global-scoped request must be allowed');
    const globalTag = hashKeyIdentifier('tenant:tenant-global');
    const globalCreatedKeys = await redis.keys(`${TEST_PREFIX}:{${globalTag}}:*`);
    assert.equal(globalCreatedKeys.length, 7, 'Global scope request must create exactly 7 keys');
    assert.ok(globalCreatedKeys.some(k => k.includes(':global:')), 'Global key must be present');

    // 10c. Unknown scope rejection
    const invalidScopeReq = {
      cost: 5,
      routeKey: 'GET:/api/bad-scope',
      tenantId: 'tenant-bad-scope',
      scopeBudgets: {
        unknown_scope_custom: { capacity: 100, refillRatePerSec: 10 }
      }
    };
    const invalidScopeRes = await primaryStore.consume(invalidScopeReq);
    assert.equal(invalidScopeRes.allowed, false, 'Unknown scope in scopeBudgets must be rejected');

    console.log('  ✅ PASS: Scope SSOT, legacy 6-scope backward compatibility, and optional global scope verified.');

    // =========================================================================
    // TEST 11: Replay-Safe Idempotent Quota Consumption & Conflict Detection
    // =========================================================================
    console.log('  [TEST 11] Testing Replay-Safe Idempotent Quota Consumption & Conflict Detection...');

    // 11a. Same requestId called sequentially twice deducts exactly once
    const idempReq1 = {
      requestId: 'client-req-uuid-12345',
      cost: 15,
      routeKey: 'POST:/api/v1/payment',
      tenantId: 'tenant-idemp-test',
      idempotencyTtlSeconds: 30
    };
    const idempRes1 = await primaryStore.consume(idempReq1);
    assert.equal(idempRes1.allowed, true, 'First idempotent call must be allowed');
    assert.equal(idempRes1.remainingCost, 85, 'First call: 100 - 15 = 85');

    const idempRes2 = await primaryStore.consume(idempReq1);
    assert.equal(idempRes2.allowed, true, 'Replayed call must be allowed from idempotency cache');
    assert.equal(idempRes2.remainingCost, 85, 'Replayed call must return original remaining cost (no second deduction)');

    // Verify raw Redis route hash has tokens = 85 (only 15 subtracted, not 30)
    const idempTag = hashKeyIdentifier('tenant:tenant-idemp-test');
    const routeData = await redis.hgetall(`${TEST_PREFIX}:{${idempTag}}:route:${hashKeyIdentifier('POST:/api/v1/payment')}`);
    assert.equal(Number(routeData.tokens), 85, 'Redis hash must have exactly 85 tokens (single deduction)');

    // 11b. 20 Concurrent clients with identical requestId deduct exactly once
    const concurrentReq = {
      requestId: 'concurrent-race-req-999',
      cost: 10,
      routeKey: 'POST:/api/v1/order',
      tenantId: 'tenant-concurrent-idemp'
    };
    const concurrentPromises = Array.from({ length: 20 }, () => primaryStore.consume({ ...concurrentReq }));
    const concurrentResults = await Promise.all(concurrentPromises);
    assert.ok(concurrentResults.every(r => r.allowed === true), 'All 20 concurrent requests must be allowed');
    assert.ok(concurrentResults.every(r => r.remainingCost === 90), 'All 20 concurrent requests must observe 90 remaining tokens');

    const concTag = hashKeyIdentifier('tenant:tenant-concurrent-idemp');
    const concRouteData = await redis.hgetall(`${TEST_PREFIX}:{${concTag}}:route:${hashKeyIdentifier('POST:/api/v1/order')}`);
    assert.equal(Number(concRouteData.tokens), 90, 'Redis must show exactly 90 tokens after 20 concurrent replays (single deduction)');

    // 11c. Same requestId with conflicting cost is rejected with zero mutation
    const conflictCostReq = {
      requestId: 'client-req-uuid-12345',
      cost: 50, // original was 15!
      routeKey: 'POST:/api/v1/payment',
      tenantId: 'tenant-idemp-test'
    };
    const conflictRes = await primaryStore.consume(conflictCostReq);
    assert.equal(conflictRes.allowed, false, 'Conflicting cost with same requestId must be rejected');
    assert.equal(conflictRes.reason, 'INVALID_REQUEST');

    // Quota remains 85
    const routeDataAfterConflict = await redis.hgetall(`${TEST_PREFIX}:{${idempTag}}:route:${hashKeyIdentifier('POST:/api/v1/payment')}`);
    assert.equal(Number(routeDataAfterConflict.tokens), 85, 'Conflicting request must cause ZERO mutation on Redis quota');

    // 11d. Raw requestId string is not present in Redis keys (hashed)
    const allIdempKeys = await redis.keys(`${TEST_PREFIX}:{${idempTag}}:*`);
    assert.ok(!allIdempKeys.some(k => k.includes('client-req-uuid-12345')), 'Raw requestId must not appear in Redis key names');

    console.log('  ✅ PASS: Replay-safe idempotency, concurrent single-deduction, and conflict detection verified.');

    console.log('\n🎉 ALL 11 REAL REDIS INTEGRATION & ERROR SAFETY TESTS PASSED CLEANLY!\n');
    process.exitCode = 0;
  } catch (err) {
    console.error('\n❌ REAL REDIS INTEGRATION TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    // =========================================================================
    // ROBUST CLEANUP: Clean all test keys and disconnect all Redis clients
    // =========================================================================
    try {
      const allCreatedKeys = await redis.keys(`${TEST_PREFIX}*`).catch(() => []);
      if (allCreatedKeys.length > 0) {
        await redis.del(...allCreatedKeys).catch(() => {});
      }
      console.log(`🧹 Cleaned up ${allCreatedKeys.length} test keys from Redis.`);
    } catch {}

    await Promise.allSettled(auxiliaryClients.map(c => c.quit().catch(() => {})));
    await redis.quit().catch(() => {});
  }
}

run();
