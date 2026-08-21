import assert from 'node:assert';
import {
  signCollectorToken,
  verifyCollectorToken,
  createVerifiedCollectorContext,
  isVerifiedCollectorContext,
  MemoryNonceStore,
  StaticKeyResolver,
  constantTimeEqual,
  evaluateVerified,
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

  // 1. Valid Signature & VerifiedCollectorContext issuance
  await runTest('should verify valid sv1 token and issue unforgeable branded context', async () => {
    const token = signCollectorToken(basePayload, secretKey);
    const ctx = await verifyCollectorToken(token, keyResolver, nonceStore, {
      expectedAudience: 'ameva-sentinel-collector',
      expectedPurpose: 'telemetry-collect'
    });

    assert.strictEqual(isVerifiedCollectorContext(ctx), true);
    assert.strictEqual(ctx.kid, 'kid-2026-prod-a');
    assert.strictEqual(ctx.issuer, 'ameva-authenticator');
    assert.strictEqual(ctx.sessionRef, 'sess_ref_123');
  });

  // 2. Reject Malformed Token (> 4096 bytes or bad format)
  await runTest('should reject malformed or oversized tokens', async () => {
    await assert.rejects(
      async () => verifyCollectorToken('invalid.token', keyResolver, nonceStore),
      { name: 'CollectorVerificationError', code: 'MALFORMED_TOKEN' }
    );
    await assert.rejects(
      async () => verifyCollectorToken('sv1.' + 'a'.repeat(5000), keyResolver, nonceStore),
      { name: 'CollectorVerificationError', code: 'MALFORMED_TOKEN' }
    );
  });

  // 3. Reject Unknown Key ID
  await runTest('should reject unknown kid with UNKNOWN_KEY_ID', async () => {
    const badKidPayload = { ...basePayload, kid: 'unknown-key-999', nonce: 'nonce_bad_kid' };
    const token = signCollectorToken(badKidPayload, secretKey);
    await assert.rejects(
      async () => verifyCollectorToken(token, keyResolver, nonceStore),
      { name: 'CollectorVerificationError', code: 'UNKNOWN_KEY_ID' }
    );
  });

  // 4. Reject Tampered Signature / Corrupted HMAC
  await runTest('should reject tampered payload or signature with INVALID_SIGNATURE', async () => {
    const token = signCollectorToken({ ...basePayload, nonce: 'nonce_tamper_1' }, secretKey);
    const tampered = token.slice(0, -4) + 'zzzz';
    await assert.rejects(
      async () => verifyCollectorToken(tampered, keyResolver, nonceStore),
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
      async () => verifyCollectorToken(token, keyResolver, nonceStore),
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
      async () => verifyCollectorToken(token, keyResolver, nonceStore),
      { name: 'CollectorVerificationError', code: 'INVALID_TIMESTAMP_FRESHNESS' }
    );
  });

  // 7. Audience & Purpose Validation
  await runTest('should reject audience or purpose mismatch', async () => {
    const token = signCollectorToken({ ...basePayload, nonce: 'nonce_aud_test' }, secretKey);
    await assert.rejects(
      async () => verifyCollectorToken(token, keyResolver, nonceStore, { expectedAudience: 'other-service' }),
      { name: 'CollectorVerificationError', code: 'AUDIENCE_MISMATCH' }
    );
  });

  // 8. Replay Attack Defense (Atomic Nonce Consumption)
  await runTest('should block replay attacks with REPLAY_ATTACK_DETECTED on duplicate nonce', async () => {
    const replayPayload = { ...basePayload, nonce: 'nonce_replay_unique_1' };
    const token = signCollectorToken(replayPayload, secretKey);

    // 1st Consumption -> SUCCESS
    const ctx1 = await verifyCollectorToken(token, keyResolver, nonceStore);
    assert.strictEqual(isVerifiedCollectorContext(ctx1), true);

    // 2nd Consumption -> REJECTED (HTTP 409)
    await assert.rejects(
      async () => verifyCollectorToken(token, keyResolver, nonceStore),
      { name: 'CollectorVerificationError', code: 'REPLAY_ATTACK_DETECTED' }
    );
  });

  // 9. evaluateVerified Brand Security
  await runTest('evaluateVerified should grant VERIFIED state only with authentic branded context', () => {
    const authenticCtx = createVerifiedCollectorContext({
      v: 1,
      kid: 'kid-2026-prod-a',
      iss: 'ameva-auth',
      aud: 'collector',
      purpose: 'telemetry-collect',
      iat: Date.now(),
      exp: Date.now() + 60000,
      nonce: 'nonce_eval_1',
      sessionRef: 'sess_1'
    });

    // Authentic Context -> VERIFIED
    const report1 = evaluateVerified({}, authenticCtx);
    assert.strictEqual(report1.verification?.state, 'VERIFIED');
    assert.strictEqual(report1.verification?.issuer, 'ameva-auth');

    // Forged Structural Object (Missing Brand Symbol) -> FAILED
    const forgedCtx = {
      isVerified: true,
      kid: 'hacker-kid',
      issuer: 'evil-corp'
    };
    const report2 = evaluateVerified({}, forgedCtx);
    assert.strictEqual(report2.verification?.state, 'FAILED');
  });

  // 10. Constant-Time Comparison Security
  await runTest('constantTimeEqual should reject mismatched lengths and verify exact buffers', () => {
    const b1 = new Uint8Array([1, 2, 3, 4]);
    const b2 = new Uint8Array([1, 2, 3, 4]);
    const b3 = new Uint8Array([1, 2, 3, 5]);
    const b4 = new Uint8Array([1, 2, 3]);

    assert.strictEqual(constantTimeEqual(b1, b2), true);
    assert.strictEqual(constantTimeEqual(b1, b3), false);
    assert.strictEqual(constantTimeEqual(b1, b4), false);
  });

  if (failedTests > 0) {
    process.exit(1);
  }
  console.log(`\n{"suite":"collector_crypto","passed":${passedTests},"failed":${failedTests},"total":${passedTests + failedTests}}`);
}

main();
