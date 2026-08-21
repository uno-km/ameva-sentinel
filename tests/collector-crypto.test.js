import assert from 'node:assert';
import {
  signCollectorToken,
  verifyCollectorToken,
  isVerifiedCollectorContext,
  MemoryNonceStore,
  StaticKeyResolver,
  constantTimeEqual,
  evaluateVerified,
  canonicalizeJsonSubset,
  computeHmacSha256,
  computeSha256,
  assertBase64UrlSegment,
  SentinelAction
} from '../packages/risk-core/dist/index.js';

console.log('\n🔐 Running AMEVA Sentinel Trust Boundary Collector & Crypto Quality Gate Tests...\n');

let passedTests = 0;
let failedTests = 0;

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
    failedTests++;
  }
}

async function main() {
  const secretKey = 'test-secret-key-for-collector-2026';
  const keyResolver = new StaticKeyResolver({
    'kid-2026-prod-a': secretKey
  });
  const nonceStore = new MemoryNonceStore();

  const basePayload = {
    v: 1,
    kid: 'kid-2026-prod-a',
    iss: 'ameva-authenticator',
    aud: 'ameva-sentinel-collector',
    purpose: 'telemetry-collect',
    iat: Date.now(),
    exp: Date.now() + 60000,
    nonce: 'nonce_test_001',
    sessionRef: 'sess_ref_123'
  };

  const defaultVerifyOpts = {
    expectedAudience: 'ameva-sentinel-collector',
    expectedPurpose: 'telemetry-collect',
    allowedIssuers: ['ameva-authenticator']
  };

  // 1. Valid Signature & VerifiedCollectorContext issuance
  await runTest('should verify valid sv1 token and issue authentic opaque context via verifier', async () => {
    const token = signCollectorToken(basePayload, secretKey);
    const ctx = await verifyCollectorToken(token, keyResolver, nonceStore, defaultVerifyOpts);

    assert.strictEqual(isVerifiedCollectorContext(ctx), true);
    assert.strictEqual(ctx.kid, 'kid-2026-prod-a');
    assert.strictEqual(ctx.issuer, 'ameva-authenticator');
    assert.strictEqual(ctx.sessionRef, 'sess_ref_123');
  });

  // 2. Reject Malformed Token (> 4096 bytes or bad format)
  await runTest('should reject malformed or oversized tokens', async () => {
    await assert.rejects(
      async () => verifyCollectorToken('invalid.token', keyResolver, nonceStore, defaultVerifyOpts),
      { name: 'CollectorVerificationError', code: 'MALFORMED_TOKEN' }
    );
    await assert.rejects(
      async () => verifyCollectorToken('sv1.' + 'a'.repeat(5000), keyResolver, nonceStore, defaultVerifyOpts),
      { name: 'CollectorVerificationError', code: 'MALFORMED_TOKEN' }
    );
  });

  // 3. Reject Unknown Key ID
  await runTest('should reject unknown kid with UNKNOWN_KEY_ID', async () => {
    const badKidPayload = { ...basePayload, kid: 'unknown-key-999', nonce: 'nonce_bad_kid' };
    const token = signCollectorToken(badKidPayload, secretKey);
    await assert.rejects(
      async () => verifyCollectorToken(token, keyResolver, nonceStore, defaultVerifyOpts),
      { name: 'CollectorVerificationError', code: 'UNKNOWN_KEY_ID' }
    );
  });

  // 4. Reject Tampered Signature / Corrupted HMAC
  await runTest('should reject tampered payload or signature with INVALID_SIGNATURE', async () => {
    const token = signCollectorToken({ ...basePayload, nonce: 'nonce_tamper_1' }, secretKey);
    const tampered = token.slice(0, -4) + 'zzzz';
    await assert.rejects(
      async () => verifyCollectorToken(tampered, keyResolver, nonceStore, defaultVerifyOpts),
      { name: 'CollectorVerificationError', code: 'INVALID_SIGNATURE' }
    );
  });

  // 5. Reject Expired Token
  await runTest('should reject expired tokens with TOKEN_EXPIRED', async () => {
    const expiredPayload = {
      ...basePayload,
      iat: Date.now() - 10000,
      exp: Date.now() - 1000,
      nonce: 'nonce_expired_1'
    };
    const token = signCollectorToken(expiredPayload, secretKey);
    await assert.rejects(
      async () => verifyCollectorToken(token, keyResolver, nonceStore, defaultVerifyOpts),
      { name: 'CollectorVerificationError', code: 'TOKEN_EXPIRED' }
    );
  });

  // 6. Reject Timestamp Skew outside Freshness Window (+- 30s)
  await runTest('should reject stale timestamp with INVALID_TIMESTAMP_FRESHNESS', async () => {
    const stalePayload = {
      ...basePayload,
      iat: Date.now() - 45000,
      exp: Date.now() + 60000,
      nonce: 'nonce_stale_1'
    };
    const token = signCollectorToken(stalePayload, secretKey);
    await assert.rejects(
      async () => verifyCollectorToken(token, keyResolver, nonceStore, defaultVerifyOpts),
      { name: 'CollectorVerificationError', code: 'INVALID_TIMESTAMP_FRESHNESS' }
    );
  });

  // 7. Audience, Purpose & Issuer Whitelist Validation
  await runTest('should reject audience, purpose, or unauthorized issuer mismatch', async () => {
    const token1 = signCollectorToken({ ...basePayload, nonce: 'nonce_aud_1' }, secretKey);
    await assert.rejects(
      async () => verifyCollectorToken(token1, keyResolver, nonceStore, { ...defaultVerifyOpts, expectedAudience: 'other-service' }),
      { name: 'CollectorVerificationError', code: 'AUDIENCE_MISMATCH' }
    );

    const token2 = signCollectorToken({ ...basePayload, nonce: 'nonce_aud_2' }, secretKey);
    await assert.rejects(
      async () => verifyCollectorToken(token2, keyResolver, nonceStore, { ...defaultVerifyOpts, expectedPurpose: 'other-purpose' }),
      { name: 'CollectorVerificationError', code: 'PURPOSE_MISMATCH' }
    );

    const token3 = signCollectorToken({ ...basePayload, nonce: 'nonce_aud_3', iss: 'rogue-issuer' }, secretKey);
    await assert.rejects(
      async () => verifyCollectorToken(token3, keyResolver, nonceStore, { ...defaultVerifyOpts, allowedIssuers: ['trusted-only'] }),
      { name: 'CollectorVerificationError', code: 'UNAUTHORIZED_ISSUER' }
    );
  });

  // 8. Replay Attack Defense (Multi-Tenant Atomic Nonce Consumption)
  await runTest('should block replay attacks with REPLAY_ATTACK_DETECTED on duplicate nonce', async () => {
    const replayPayload = { ...basePayload, nonce: 'nonce_replay_unique_1' };
    const token = signCollectorToken(replayPayload, secretKey);

    // 1st Consumption -> SUCCESS
    const ctx1 = await verifyCollectorToken(token, keyResolver, nonceStore, defaultVerifyOpts);
    assert.strictEqual(isVerifiedCollectorContext(ctx1), true);

    // 2nd Consumption -> REJECTED (HTTP 409)
    await assert.rejects(
      async () => verifyCollectorToken(token, keyResolver, nonceStore, defaultVerifyOpts),
      { name: 'CollectorVerificationError', code: 'REPLAY_ATTACK_DETECTED' }
    );
  });

  // 9. 100 Concurrent Nonce Consumption Race Test
  await runTest('concurrent 100-request nonce consumption race guarantees exactly 1 success and 99 replays', async () => {
    const racePayload = { ...basePayload, nonce: 'nonce_race_test_100' };
    const token = signCollectorToken(racePayload, secretKey);

    const results = await Promise.allSettled(
      Array.from({ length: 100 }, () =>
        verifyCollectorToken(token, keyResolver, nonceStore, defaultVerifyOpts)
      )
    );

    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    assert.strictEqual(fulfilled.length, 1, `Expected exactly 1 fulfilled request, got ${fulfilled.length}`);
    assert.strictEqual(rejected.length, 99, `Expected exactly 99 rejected requests, got ${rejected.length}`);
    assert.strictEqual(rejected[0].reason.code, 'REPLAY_ATTACK_DETECTED');
  });

  // 10. evaluateVerified Brand Security (Rejects Forged Plain Object)
  await runTest('evaluateVerified should reject structural forged objects and accept authentic verifier context', async () => {
    const token = signCollectorToken({ ...basePayload, nonce: 'nonce_eval_verified_1' }, secretKey);
    const authenticCtx = await verifyCollectorToken(token, keyResolver, nonceStore, defaultVerifyOpts);

    // Authentic Context -> VERIFIED
    const report1 = evaluateVerified({}, authenticCtx);
    assert.strictEqual(report1.verification?.state, 'VERIFIED');
    assert.strictEqual(report1.verification?.issuer, 'ameva-authenticator');

    // Forged Structural Object (Missing Internal Symbol) -> FAILED
    const forgedCtx = {
      isVerified: true,
      kid: 'hacker-kid',
      issuer: 'evil-corp'
    };
    const report2 = evaluateVerified({}, forgedCtx);
    assert.strictEqual(report2.verification?.state, 'FAILED');
  });

  // 11. Fail-Closed Configuration Guard
  await runTest('verifyCollectorToken should fail-closed on missing mandatory expectedAudience/Purpose', async () => {
    const token = signCollectorToken({ ...basePayload, nonce: 'nonce_cfg_1' }, secretKey);
    await assert.rejects(
      async () => verifyCollectorToken(token, keyResolver, nonceStore, {}),
      { name: 'CollectorVerificationError', code: 'CONFIGURATION_ERROR' }
    );
  });

  // 12. Canonical JSON Subset Robustness
  await runTest('canonicalizeJsonSubset should reject non-finite numbers and circular references', () => {
    assert.throws(() => canonicalizeJsonSubset({ num: NaN }), { code: 'MALFORMED_TOKEN' });
    assert.throws(() => canonicalizeJsonSubset({ num: Infinity }), { code: 'MALFORMED_TOKEN' });
    
    const circ = {};
    circ.self = circ;
    assert.throws(() => canonicalizeJsonSubset(circ), { code: 'MALFORMED_TOKEN' });
  });

  // 13. [P1-1 Regression] Reject Non-canonical JSON Payload Malleability
  await runTest('verifyCollectorToken should reject non-canonical payload representation', async () => {
    // Construct valid token with non-canonical whitespace in payload
    const nonCanonicalJson = '{\n  "aud": "ameva-sentinel-collector",  "exp": ' + (Date.now() + 60000) + ',\n  "iat": ' + Date.now() + ',\n  "iss": "ameva-authenticator",\n  "kid": "kid-2026-prod-a",\n  "nonce": "nonce_noncanon_1",\n  "purpose": "telemetry-collect",\n  "sessionRef": "sess_1",\n  "v": 1\n}';
    const nonCanonB64 = Buffer.from(nonCanonicalJson).toString('base64url');
    const signingInput = `sv1.${nonCanonB64}`;
    const sig = computeHmacSha256(secretKey, signingInput);
    const sigB64 = Buffer.from(sig).toString('base64url');
    const malleableToken = `sv1.${nonCanonB64}.${sigB64}`;

    await assert.rejects(
      async () => verifyCollectorToken(malleableToken, keyResolver, nonceStore, defaultVerifyOpts),
      { name: 'CollectorVerificationError', code: 'MALFORMED_TOKEN' }
    );
  });

  // 14. [P1-1 Regression] Strict Base64URL alphabet and padding check
  await runTest('assertBase64UrlSegment should reject invalid characters and illegal padding', () => {
    assert.throws(() => assertBase64UrlSegment('invalid+plus', 'test'), { code: 'MALFORMED_TOKEN' });
    assert.throws(() => assertBase64UrlSegment('invalid/slash', 'test'), { code: 'MALFORMED_TOKEN' });
    assert.throws(() => assertBase64UrlSegment('invalid=equals', 'test'), { code: 'MALFORMED_TOKEN' });
    assert.throws(() => assertBase64UrlSegment('a', 'test'), { code: 'MALFORMED_TOKEN' }); // length % 4 === 1
  });

  // 15. [RFC 4231 & NIST Test Vectors] Cryptographic Standard Vector Validation
  await runTest('computeHmacSha256 matches RFC 4231 official Test Case 2 vector', () => {
    // RFC 4231 Test Case 2: Key = "Jefe", Data = "what do ya want for nothing?"
    const key = 'Jefe';
    const data = 'what do ya want for nothing?';
    const digest = computeHmacSha256(key, data);
    const hex = Array.from(digest, b => b.toString(16).padStart(2, '0')).join('');
    
    assert.strictEqual(hex, '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843');
  });

  if (failedTests > 0) {
    process.exit(1);
  }
  console.log(`\n{"suite":"collector_crypto","passed":${passedTests},"failed":${failedTests},"total":${passedTests + failedTests}}`);
}

main();
