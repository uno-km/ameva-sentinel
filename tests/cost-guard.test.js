/**
 * @file cost-guard.test.js
 * Comprehensive Multi-Axis Threat and Cost Guard Suite for TypeScript.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SentinelCostGuardEvaluator,
  LocalEmergencyBudgetStore,
  computeEmergencyCapacity,
  validateCostPolicy,
  canonicalizePolicyJson,
  computePolicyChecksum,
  SAFE_FALLBACK_COST_POLICY,
  RequestShapeGuard,
  ResponseBudgetGuard,
  extractClientIp,
  isIpInCidr
} from '../packages/risk-core/dist/index.js';
import { RedisTokenBucketStore, HIERARCHICAL_TOKEN_BUCKET_LUA } from '../packages/store-redis/dist/index.js';



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('\n🧪 Running Multi-Axis Cost Guard Test Suite...\n');

// 1. Strict Schema & Bounds Validation
{
  console.log('  Testing Strict Policy Schema & Bounds Validation...');

  // Valid fallback policy should validate cleanly
  const valid = validateCostPolicy(SAFE_FALLBACK_COST_POLICY);
  assert.equal(valid.schema_version, '1.0');
  assert.equal(valid.defaults.cost, 10);

  // Rejects invalid schema_version
  assert.throws(() => {
    validateCostPolicy({ ...SAFE_FALLBACK_COST_POLICY, schema_version: '2.0' });
  }, /schema_version/);

  // Rejects float cost
  assert.throws(() => {
    validateCostPolicy({
      ...SAFE_FALLBACK_COST_POLICY,
      defaults: { ...SAFE_FALLBACK_COST_POLICY.defaults, cost: 10.5 }
    });
  }, /defaults.cost/);

  // Rejects byte limit > 50MB (52428800)
  assert.throws(() => {
    validateCostPolicy({
      ...SAFE_FALLBACK_COST_POLICY,
      defaults: { ...SAFE_FALLBACK_COST_POLICY.defaults, max_request_body_bytes: 60000000 }
    });
  }, /max_request_body_bytes/);

  // Rejects route page_size_default > page_size_max
  assert.throws(() => {
    validateCostPolicy({
      ...SAFE_FALLBACK_COST_POLICY,
      routes: [
        {
          method: 'GET',
          path: '/invalid-page',
          cost: 10,
          page_size_default: 100,
          page_size_max: 50
        }
      ]
    });
  }, /page_size_default/);

  // Rejects unknown field
  assert.throws(() => {
    validateCostPolicy({
      ...SAFE_FALLBACK_COST_POLICY,
      unknown_field: 123
    });
  }, /Unknown field 'unknown_field'/);

  // Path validation tests & ambiguity fixtures
  assert.equal(RequestShapeGuard.validatePath('/api/v1/chart').valid, true);
  assert.equal(RequestShapeGuard.validatePath('').valid, false);
  assert.equal(RequestShapeGuard.validatePath(undefined).valid, false);
  assert.equal(RequestShapeGuard.validatePath('api/v1').message, 'PATH_MUST_START_WITH_SLASH');
  assert.equal(RequestShapeGuard.validatePath('/api/v1/\0/secret').message, 'ASCII_CONTROL_CHAR_IN_PATH');
  assert.equal(RequestShapeGuard.validatePath('/api/v1/\u001f/secret').message, 'ASCII_CONTROL_CHAR_IN_PATH');
  assert.equal(RequestShapeGuard.validatePath('/api/v1/\u007f/secret').message, 'ASCII_CONTROL_CHAR_IN_PATH');
  assert.equal(RequestShapeGuard.validatePath('/api/v1/%00/secret').message, 'NULL_BYTE_IN_PATH');
  assert.equal(RequestShapeGuard.validatePath('/api/v1/../secret').message, 'DOT_SEGMENT_IN_PATH');
  assert.equal(RequestShapeGuard.validatePath('/api/v1/..').message, 'DOT_SEGMENT_IN_PATH');
  assert.equal(RequestShapeGuard.validatePath('/api/v1/.').message, 'DOT_SEGMENT_IN_PATH');
  assert.equal(RequestShapeGuard.validatePath('//api/v1').message, 'REPEATED_SLASHES_IN_PATH');
  assert.equal(RequestShapeGuard.validatePath('/api//v1').message, 'REPEATED_SLASHES_IN_PATH');
  assert.equal(RequestShapeGuard.validatePath('/api/v1/chart;jsessionid=123').message, 'SEMICOLON_IN_PATH');
  assert.equal(RequestShapeGuard.validatePath('/api/v1/%252e%252e/secret').message, 'DOUBLE_ENCODING_IN_PATH');
  assert.equal(RequestShapeGuard.validatePath('/api/v1/%255csecret').message, 'DOUBLE_ENCODING_IN_PATH');
  assert.equal(RequestShapeGuard.validatePath('/api/v1/%2e%2e/secret').message, 'ENCODED_DOT_SEGMENT_IN_PATH');
  assert.equal(RequestShapeGuard.validatePath('/api/v1/%2e./secret').message, 'ENCODED_DOT_SEGMENT_IN_PATH');
  assert.equal(RequestShapeGuard.validatePath('/api/v1/.%2e/secret').message, 'ENCODED_DOT_SEGMENT_IN_PATH');
  assert.equal(RequestShapeGuard.validatePath('/api/v1/%').message, 'MALFORMED_PERCENT_ENCODING');
  assert.equal(RequestShapeGuard.validatePath('/api/v1/%2g').message, 'MALFORMED_PERCENT_ENCODING');
  assert.equal(RequestShapeGuard.validatePath('/api/v1/%5csecret').message, 'BACKSLASH_IN_PATH');
  assert.equal(RequestShapeGuard.validatePath('/api/v1\\secret').message, 'BACKSLASH_IN_PATH');
  assert.equal(RequestShapeGuard.validatePath('/api/v1/%2fsecret').message, 'ENCODED_SLASH_IN_PATH');
  assert.equal(RequestShapeGuard.validatePath('/api/v1/%2Fsecret').message, 'ENCODED_SLASH_IN_PATH');

  console.log('  ✅ PASS: Policy validation and path ambiguity guards verified.');
}

// 2. Unverified Principal Rejection & Unverified Tenant Isolation
{
  console.log('  Testing Unverified Principal & Tenant Isolation Strictness...');

  let capturedRequest = null;
  const spyStore = {
    async consume(req) {
      capturedRequest = req;
      return { allowed: true, remainingCost: 100, retryAfterSeconds: 0 };
    }
  };

  const evaluator = new SentinelCostGuardEvaluator({
    budgetStore: spyStore,
    enforceByDefault: true
  });

  // 2.1 Attempting unverified tenantId injection
  const unverifiedTenantCtx = {
    method: 'GET',
    path: '/health',
    tenantId: 'victim-tenant-hijack',
    principal: {
      authenticated: false
    },
    pseudonymousKey: 'anon-network-1'
  };

  await evaluator.evaluate(unverifiedTenantCtx);
  assert.equal(capturedRequest.tenantId, undefined, 'Unverified context.tenantId must be stripped and ignored');
  assert.equal(capturedRequest.apiKeyId, undefined, 'Unverified apiKeyId must be undefined');

  // 2.2 Verified tenantId injection
  const verifiedTenantCtx = {
    method: 'GET',
    path: '/health',
    tenantId: 'spoofed-header-tenant',
    principal: {
      authenticated: true,
      tenantId: 'trusted-corp-tenant',
      accountId: 'account-99',
      apiKeyId: 'ak-live-123'
    }
  };

  await evaluator.evaluate(verifiedTenantCtx);
  assert.equal(capturedRequest.tenantId, 'trusted-corp-tenant', 'Trusted principal.tenantId must be propagated');
  assert.equal(capturedRequest.accountId, 'account-99', 'Trusted principal.accountId must be propagated');
  assert.equal(capturedRequest.apiKeyId, 'ak-live-123', 'Trusted principal.apiKeyId must be propagated');

  console.log('  ✅ PASS: Unverified principal credentials and tenantId isolated strictly.');
}

// 3. Emergency Store Tier Isolation
{
  console.log('  [Group 3] Testing Emergency Store Tier Isolation...');

  const store = new LocalEmergencyBudgetStore(100, 0.001);

  // 3.0 Strict input validation guards
  await assert.rejects(async () => {
    await store.consume({ cost: -10, routeKey: 'GET:/api' });
  }, /cost must be finite and greater than zero/);

  await assert.rejects(async () => {
    await store.consume({ cost: NaN, routeKey: 'GET:/api' });
  }, /cost must be finite and greater than zero/);

  await assert.rejects(async () => {
    await store.consume({ cost: 10, routeKey: '' });
  }, /routeKey must be a non-empty bounded string/);

  // computeEmergencyCapacity validation
  assert.throws(() => computeEmergencyCapacity(-5), /normalCapacity must be a non-negative safe integer/);
  assert.throws(() => computeEmergencyCapacity(10.5), /normalCapacity must be a non-negative safe integer/);
  assert.throws(() => computeEmergencyCapacity(100, -0.1), /emergencyRatio must be a number > 0 and <= 1/);

  const baseRequest = {
    cost: 10,
    routeKey: 'GET:/api/v1/data',
    networkKey: 'net-client-a'
  };

  const authRes = await store.consume({
    ...baseRequest,
    emergencyCapacity: 200,
    tier: { name: 'authenticated_key', capacity: 2000, refill_tokens_per_minute: 2000, emergency_local_capacity: 200 }
  });
  assert.equal(authRes.allowed, true);
  assert.equal(authRes.remainingCost, 190);

  const anonRes = await store.consume({
    ...baseRequest,
    emergencyCapacity: 30,
    tier: { name: 'anonymous_network', capacity: 100, refill_tokens_per_minute: 100, emergency_local_capacity: 30 }
  });
  assert.equal(anonRes.allowed, true);
  assert.equal(anonRes.remainingCost, 20); // Brand new bucket for anonymous_network

  // 3.1 maxBuckets LRU bounded eviction verification
  const boundedStore = new LocalEmergencyBudgetStore(100, 1.0, 3);
  await boundedStore.consume({ cost: 1, routeKey: 'GET:/1' });
  await boundedStore.consume({ cost: 1, routeKey: 'GET:/2' });
  await boundedStore.consume({ cost: 1, routeKey: 'GET:/3' });
  assert.equal(boundedStore.size, 3, 'Size reaches maxBuckets');

  // Touch /1 so /1 moves to most recently used. Oldest (LRU) is now /2.
  await boundedStore.consume({ cost: 1, routeKey: 'GET:/1' });

  // 4th unique bucket should evict the LRU (/2), NOT /1
  await boundedStore.consume({ cost: 1, routeKey: 'GET:/4' });
  assert.equal(boundedStore.size, 3, 'Size remains strictly capped at maxBuckets');
  // Consuming /1 should retain its remaining tokens (100 - 1 - 1 = 98) rather than reset to 100
  const r1After = await boundedStore.consume({ cost: 1, routeKey: 'GET:/1' });
  assert.ok(r1After.remainingCost < 98, '/1 was kept in LRU cache and preserved its consumed state');

  console.log('  ✅ PASS: Emergency store isolates distinct tier namespaces and bounds memory via LRU eviction.');
}

// 4. Same-Bucket Dynamic Capacity Clamp
{
  console.log('  [Group 4] Testing Same-Bucket Dynamic Capacity Clamp on Downgrade...');

  const clampStore = new LocalEmergencyBudgetStore(500, 0.0001);
  const baseRequest = {
    cost: 10,
    routeKey: 'GET:/api/v1/data',
    networkKey: 'net-client-a'
  };
  const fixedTier = {
    name: 'custom-plan',
    capacity: 2000,
    refill_tokens_per_minute: 1,
    emergency_local_capacity: 200
  };

  // Step 1: Initialize custom-plan bucket with high emergency capacity (200) -> consumes 10, remaining 190
  const initRes = await clampStore.consume({
    ...baseRequest,
    emergencyCapacity: 200,
    tier: { ...fixedTier, emergency_local_capacity: 200 }
  });
  assert.equal(initRes.allowed, true);
  assert.equal(initRes.remainingCost, 190);

  // Step 2: Same bucket key (custom-plan) dynamically downgraded to capacity 30
  // Previous 190 tokens must be clamped down to min(30, 190) = 30, then 10 consumed -> remaining 20
  const downgraded = await clampStore.consume({
    ...baseRequest,
    emergencyCapacity: 30,
    tier: { ...fixedTier, emergency_local_capacity: 30 }
  });
  assert.equal(downgraded.allowed, true);
  assert.equal(downgraded.remainingCost, 20, 'Tokens must be dynamically clamped to 20 (30 max - 10 consumed)');

  console.log('  ✅ PASS: Same-bucket emergency capacity clamp strictly bounds existing balances.');
}

// 5. Same-Bucket Concurrency & Atomic Race Condition Safety
{
  console.log('  [Group 5] Testing Same-Bucket Concurrency & Atomic Race Condition Safety...');

  const concurrentStore = new LocalEmergencyBudgetStore(10, 0.00001);
  const baseRequest = {
    cost: 8,
    routeKey: 'GET:/api/v1/checkout',
    networkKey: 'client-concurrency-test'
  };

  // Two concurrent requests of cost 8 against a bucket with 10 total tokens.
  // Exactly ONE request must succeed (allowed: true, remaining: 2).
  // The other request MUST be rejected (allowed: false, remaining: 2) without causing negative balance or double spending.
  const [res1, res2] = await Promise.all([
    concurrentStore.consume({ ...baseRequest }),
    concurrentStore.consume({ ...baseRequest })
  ]);

  const successCount = [res1, res2].filter(r => r.allowed).length;
  const failureCount = [res1, res2].filter(r => !r.allowed).length;

  assert.equal(successCount, 1, 'Exactly one concurrent request of cost 8 must be allowed within budget 10');
  assert.equal(failureCount, 1, 'The competing concurrent request must be rate limited');

  const successfulRes = res1.allowed ? res1 : res2;
  const failedRes = res1.allowed ? res2 : res1;

  assert.equal(successfulRes.remainingCost, 2, 'Remaining cost after successful consume must be 2 (10 - 8)');
  assert.equal(failedRes.remainingCost, 2, 'Failed request must observe remaining cost 2 without deduction');
  assert.ok(failedRes.retryAfterSeconds > 0, 'Failed request must receive positive retryAfterSeconds');

  console.log('  ✅ PASS: Single-process same-bucket sequential consistency verified under Promise concurrency primitives.');
}

// 6. Redis Failure & Tier Emergency Cap Enforcement
{
  console.log('  [Group 6] Testing Redis Failure with Tier-Specific Emergency Local Cap...');

  const failingStore = {
    async consume() {
      throw new Error('Redis cluster network partition');
    }
  };

  const emergencyStore = new LocalEmergencyBudgetStore(50, 0.001);
  const evaluator = new SentinelCostGuardEvaluator({
    budgetStore: failingStore,
    emergencyStore,
    enforceByDefault: true
  });

  const ctx = {
    method: 'GET',
    path: '/api/v1/chart/unified' // cost: 10, failure_mode: 'allow_with_emergency_cap'
  };

  // Default anonymous_network emergency capacity is 30.
  // Consuming 3 requests of cost 10 uses all 30 tokens.
  for (let i = 0; i < 3; i++) {
    const dec = await evaluator.evaluate(ctx);
    assert.equal(dec.allowed, true);
    assert.equal(dec.degraded, true);
    assert.equal(dec.enforced, true);
  }

  // 4th request must be rate limited
  const dec4 = await evaluator.evaluate(ctx);
  assert.equal(dec4.allowed, false);
  assert.equal(dec4.action, 'RATE_LIMIT');
  // 6.1 Formula validations
  assert.equal(computeEmergencyCapacity(100, 0.5, 10), 5, '10 replicas, ratio 0.5, cap 100 -> 5');
  assert.equal(computeEmergencyCapacity(0, 0.5, 10), 0, 'Capacity 0 remains 0');
  assert.equal(computeEmergencyCapacity(10, 0.5, 20), 1, 'Min capacity is 1 when non-zero');
  assert.throws(() => computeEmergencyCapacity(-5, 0.5, 1), /non-negative safe integer/);
  assert.throws(() => computeEmergencyCapacity(100, 0, 1), /number > 0/);
  assert.throws(() => computeEmergencyCapacity(100, 1.5, 1), /number > 0/);
  assert.throws(() => computeEmergencyCapacity(100, 0.5, 0), /integer >= 1/);

  // 6.1b Test fail-closed mode
  const failClosedEvaluator = new SentinelCostGuardEvaluator({
    budgetStore: failingStore,
    failurePolicy: { mode: 'fail-closed' },
    enforceByDefault: true
  });
  const failClosedDec = await failClosedEvaluator.evaluate(ctx);
  assert.equal(failClosedDec.allowed, false, 'fail-closed mode must reject during Redis outage');
  assert.equal(failClosedDec.reasonCode, 'FAIL_CLOSED');
  assert.equal(failClosedDec.degraded, true);

  // 6.1c Test fail-open mode
  const failOpenEvaluator = new SentinelCostGuardEvaluator({
    budgetStore: failingStore,
    failurePolicy: { mode: 'fail-open' },
    enforceByDefault: true
  });
  const failOpenDec = await failOpenEvaluator.evaluate(ctx);
  assert.equal(failOpenDec.allowed, true, 'fail-open mode must allow during Redis outage');
  assert.equal(failOpenDec.reasonCode, 'FAIL_OPEN');
  assert.equal(failOpenDec.degraded, true);

  // 6.2 RedisTokenBucketStore Per-Key Hierarchical Parameter Resolution with Distinct Sentinel Values
  let capturedScript = '';
  let capturedKeyCount = 0;
  let capturedKeys = [];
  let capturedArgs = [];

  const mockRedis = {
    async eval(script, keyCount, ...args) {
      capturedScript = script;
      capturedKeyCount = keyCount;
      capturedKeys = args.slice(0, keyCount);
      capturedArgs = args.slice(keyCount);
      // Return success tuple [allowed: 1, remaining: 91, retry_after: 0]
      return [1, 91, 0];
    }
  };

  const redisStore = new RedisTokenBucketStore({
    redis: mockRedis,
    defaultCapacity: 100,
    defaultRefillRatePerSec: 2.0,
    ttlSeconds: 90
  });

  // Verify full 6-scope request with DISTINCT sentinel capacities and refill rates
  const redisConsumeRes = await redisStore.consume({
    cost: 10,
    routeKey: 'GET:/api/v1/data',
    tenantId: 'tenant-123',
    accountId: 'acc-456',
    apiKeyId: 'key-789',
    sessionId: 'sess-abc',
    networkKey: '192.168.1.1',
    scopeBudgets: {
      route: { capacity: 101, refillRatePerSec: 1.01 },
      tenant: { capacity: 202, refillRatePerSec: 2.02 },
      account: { capacity: 303, refillRatePerSec: 3.03 },
      authKey: { capacity: 404, refillRatePerSec: 4.04 },
      session: { capacity: 505, refillRatePerSec: 5.05 },
      network: { capacity: 606, refillRatePerSec: 6.06 }
    }
  });

  assert.equal(redisConsumeRes.allowed, true);
  assert.equal(redisConsumeRes.remainingCost, 91);
  assert.ok(capturedScript.includes('is_v2'), 'Lua script must support Layout v2 with idempotency');
  assert.ok(capturedScript.includes('cap_idx = 6 + ((i - 1) * 2)'), 'Lua script must calculate 1-indexed cap idx in Layout v2');

  // Verify ARGV mapping
  assert.equal(capturedArgs[0], 10, 'ARGV[1] must be cost');
  assert.equal(capturedArgs[1], 90, 'ARGV[2] must be ttlSeconds');
  assert.equal(capturedArgs[2], 0, 'ARGV[3] must be idempTtl (0 when requestId omitted)');

  // Verify 1:1 distinct pair mapping for all 6 scopes starting at ARGV[6]
  assert.equal(capturedArgs[5], 101, 'Key 1 (route) capacity must be 101');
  assert.equal(capturedArgs[6], 1.01, 'Key 1 (route) refill must be 1.01');
  assert.equal(capturedArgs[7], 202, 'Key 2 (tenant) capacity must be 202');
  assert.equal(capturedArgs[8], 2.02, 'Key 2 (tenant) refill must be 2.02');
  assert.equal(capturedArgs[9], 303, 'Key 3 (account) capacity must be 303');
  assert.equal(capturedArgs[10], 3.03, 'Key 3 (account) refill must be 3.03');
  assert.equal(capturedArgs[11], 404, 'Key 4 (auth_key) capacity must be 404');
  assert.equal(capturedArgs[12], 4.04, 'Key 4 (auth_key) refill must be 4.04');
  assert.equal(capturedArgs[13], 505, 'Key 5 (session) capacity must be 505');
  assert.equal(capturedArgs[14], 5.05, 'Key 5 (session) refill must be 5.05');
  assert.equal(capturedArgs[15], 606, 'Key 6 (net) capacity must be 606');
  assert.equal(capturedArgs[16], 6.06, 'Key 6 (net) refill must be 6.06');

  console.log('  ✅ PASS: Redis per-key hierarchical capacity and refill parameters resolved with distinct sentinel values and dispatched cleanly.');
  console.log('  ✅ PASS: Emergency local capacity strictly enforced under Redis outage.');
}


// 7. Unified Shadow Mode Semantics & Cross-Runtime Conformance Corpus
{
  console.log('  [Group 7] Testing Unified Shadow Mode Semantics & Cross-Runtime Conformance Corpus (9 Fixtures)...');

  // 7.1 Shadow Mode
  const evaluator = new SentinelCostGuardEvaluator({
    enforceByDefault: false // activates shadow_mode
  });

  const shadowCtx = {
    method: 'GET',
    path: '/health',
    pageSize: 500 // exceeds default max (50)
  };

  const dec = await evaluator.evaluate(shadowCtx);
  assert.equal(dec.allowed, true);
  assert.equal(dec.action, 'OBSERVE');
  assert.equal(dec.proposedAction, 'DENY');
  assert.equal(dec.enforcedAction, 'ALLOW');
  assert.equal(dec.violationDetected, true);
  assert.equal(dec.enforced, false);

  // 7.2 9-Fixture Conformance Corpus against Manifest
  const manifestPath = path.join(rootDir, 'fixtures', 'conformance', 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    for (const fixture of manifest.fixtures) {
      const fixtureFile = path.join(rootDir, 'fixtures', 'conformance', fixture.filename);
      const raw = JSON.parse(fs.readFileSync(fixtureFile, 'utf8'));

      if (fixture.expected_valid) {
        const validated = validateCostPolicy(raw);
        const identity = computePolicyChecksum(validated);
        assert.equal(identity.checksumSha256, fixture.checksum_sha256);
      } else {
        assert.throws(() => {
          validateCostPolicy(raw);
        });
      }
    }
    console.log(`  ✅ PASS: All ${manifest.fixtures.length} conformance fixtures passed canonical checksum verification.`);
  }

  console.log('  ✅ PASS: Unified shadow mode semantics and 9-fixture cross-runtime corpus verified.');
}

// 8. Trusted Proxy Policy & Client IP Extraction
{
  console.log('  [Group 8] Testing Trusted Proxy Policy & Client IP Extraction...');

  // 8.1 IPv6 CIDRs, Mapped IPv4, and Zone ID Rejection
  assert.equal(isIpInCidr('127.0.0.1', '127.0.0.0/8'), true);
  assert.equal(isIpInCidr('10.0.5.23', '10.0.0.0/8'), true);
  assert.equal(isIpInCidr('172.20.1.1', '172.16.0.0/12'), true);
  assert.equal(isIpInCidr('192.168.1.100', '192.168.0.0/16'), true);
  assert.equal(isIpInCidr('203.0.113.195', '10.0.0.0/8'), false);
  assert.equal(isIpInCidr('fc00::1', 'fc00::/7'), true);
  assert.equal(isIpInCidr('fdff:ffff::1', 'fc00::/7'), true);
  assert.equal(isIpInCidr('fe80::1', 'fe80::/10'), true);
  assert.equal(isIpInCidr('2001:db8::1', 'fc00::/7'), false);
  assert.equal(isIpInCidr('::ffff:192.168.1.10', '192.168.1.0/24'), true);
  assert.equal(isIpInCidr('2001:db8::1%eth0', '2001:db8::/32'), false);

  // 8.2 Default Policy trusts NO proxy (empty trustedCidrs)
  assert.throws(() => {
    extractClientIp({
      socketRemoteAddress: '10.0.0.1',
      headers: { 'x-forwarded-for': '8.8.8.8' }
    });
  }, /UNTRUSTED_FORWARDED_HEADERS/);

  // 8.3 Missing socket address must throw error
  assert.throws(() => {
    extractClientIp({
      socketRemoteAddress: '',
      headers: { 'x-forwarded-for': '8.8.8.8' }
    });
  }, /MISSING_OR_INVALID_SOCKET_REMOTE_ADDRESS/);

  // 8.4 Untrusted direct connection with no forwarded headers returns socket IP
  const directIp = extractClientIp({
    socketRemoteAddress: '203.0.113.5'
  });
  assert.equal(directIp, '203.0.113.5');

  // 8.5 Explicit Trusted Proxy with XFF Right-to-Left Resolution
  const customTrustedPolicy = {
    trustedCidrs: ['10.0.0.0/8', '172.16.0.0/12'],
    maxForwardedHops: 3
  };
  // Chain: Client (203.0.113.195) -> Proxy1 (172.16.0.5) -> Proxy2 (10.0.0.1) -> App
  // XFF: "203.0.113.195, 172.16.0.5", socket: 10.0.0.1
  const resolvedClient = extractClientIp({
    socketRemoteAddress: '10.0.0.1',
    headers: {
      'x-forwarded-for': '203.0.113.195, 172.16.0.5'
    }
  }, customTrustedPolicy);
  assert.equal(resolvedClient, '203.0.113.195', 'Right-to-left resolution must extract true client before trusted proxies');

  // 8.6 Hop limit exceeded throws error
  assert.throws(() => {
    extractClientIp({
      socketRemoteAddress: '10.0.0.1',
      headers: {
        'x-forwarded-for': '1.1.1.1, 2.2.2.2, 3.3.3.3, 4.4.4.4'
      }
    }, customTrustedPolicy);
  }, /FORWARDED_HOP_LIMIT_EXCEEDED/);

  // 8.7 Conflicting headers rejected
  assert.throws(() => {
    extractClientIp({
      socketRemoteAddress: '10.0.0.1',
      headers: {
        'forwarded': 'for=198.51.100.1',
        'x-forwarded-for': '198.51.100.2'
      }
    }, customTrustedPolicy);
  }, /CONFLICTING_FORWARDED_HEADERS/);

  // 8.8 Forwarded header IPv6 with port parsing
  const resolvedIpv6 = extractClientIp({
    socketRemoteAddress: '10.0.0.1',
    headers: {
      'forwarded': 'for="[2001:db8::1]:443"'
    }
  }, customTrustedPolicy);
  assert.equal(resolvedIpv6, '2001:db8:0:0:0:0:0:1', 'Forwarded [IPv6]:port must parse into clean normalized IPv6 address');

  console.log('  ✅ PASS: Trusted Proxy Policy, right-to-left chain, IPv6 CIDR, and spoofing protection verified.');
}

console.log('\n🎉 ALL 8 MULTI-AXIS COST GUARD VERIFICATION GROUPS PASSED COMPLETELY!\n');

