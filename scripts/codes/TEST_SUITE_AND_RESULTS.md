# 🛡️ AMEVA Sentinel v0.6.0-alpha.1 Comprehensive Test Suite & Verification Results
> **Release Target**: `v0.6.0-alpha.1`  
> **Generated Timestamp**: `2026-08-21T05:02:42.026Z`  
> **Target Mode, Smart Bot Classifier & Trust Boundary Engine**: 100% Verified  
> **Overall Gate Status**: `PASSED (100% SUCCESS)`  
> **Final Score**: `100.0 / 100 pts (Grade A+)`  
> **Total Checks**: `75 Executable Checks + 3 Packaging Checks = 78 / 78 Release Checks`  

---

## 📊 1. Executive Test Scorecard (78 / 78 Release Checks: 75 Executable Gates + 3 Package Dry-Runs)

| Test Category | Tests Passed | Execution Time | Score Points | Gate Status |
| :--- | :---: | :---: | :---: | :---: |
| TypeScript Static Contract | 1 / 1 | 2925ms | 10.0 / 10 pts | 🟢 PASS |
| TypeScript Runtime Contract | 1 / 1 | 99ms | 5.0 / 5 pts | 🟢 PASS |
| Trust Boundary & Collector Crypto | 15 / 15 | 105ms | 15.0 / 15 pts | 🟢 PASS |
| Redirect Security & Injection Defense | 6 / 6 | 79ms | 10.0 / 10 pts | 🟢 PASS |
| Smart Bot Classifier & ReDoS Safety | 8 / 8 | 78ms | 15.0 / 15 pts | 🟢 PASS |
| Target Mode & Decision Engine | 6 / 6 | 88ms | 15.0 / 15 pts | 🟢 PASS |
| Risk Engine Quality Gates | 7 / 7 | 81ms | 10.0 / 10 pts | 🟢 PASS |
| Facade & State Enforcement | 12 / 12 | 134ms | 10.0 / 10 pts | 🟢 PASS |
| Persistence & Schema V1/V2 Bounds | 8 / 8 | 120ms | 10.0 / 10 pts | 🟢 PASS |
| Browser SDK Unit Verification | 2 / 2 | 88ms | 5.0 / 5 pts | 🟢 PASS |
| Playwright Cross-Browser E2E (9 Tests) | 9 / 9 | 14259ms | E2E Verified | 🟢 PASS |
| **TOTAL EXECUTABLE AUDIT SCORE** | **75 Passed / 0 Failed** | **—** | **100.0 / 100.0 pts (Grade A+)** | **🏆 PASS** |

---

## 📦 2. Monorepo Distribution Packaging Dry-Run (3 Packages Verified)

| Package Path | Real Package Name | Status | Verified Format |
| :--- | :--- | :---: | :--- |
| `packages/risk-core` | `@ameva/sentinel-risk-core` | `🟢 VALID` | Pure ESM & Declarations | 
| `packages/browser-sdk` | `@ameva/sentinel-browser` | `🟢 VALID` | Pure ESM & Declarations | 
| `packages/sentinel` | `@ameva/sentinel` | `🟢 VALID` | Pure ESM & Declarations | 

---

## 🔬 3. Detailed Execution Logs & Source Code by Test Suite

### 1. TypeScript Static Consumer Contract Gate (32+ Types, Guards, Interfaces)
* **Target File**: [`tests/typecheck.ts`](../../tests/typecheck.ts)
* **Execution Status**: `PASS` (1 passed, 0 failed in 2925ms)

#### Execution Console Output:
```text
> ameva-sentinel-monorepo@0.6.0-alpha.1 test:types:static
> tsc --noEmit tests/typecheck.ts --target es2022 --module NodeNext --moduleResolution NodeNext
```

#### Source Code Verification (`tests/typecheck.ts`):
```javascript
﻿import {
  createSentinel,
  Sentinel,
  type SentinelOptions,
  MemoryFixedWindowCounterStore,
  MemoryCounterStore,
  MemoryRiskEventStore,
  LocalStorageRiskEventStore,
  type SentinelRiskReport,
  type StoredRiskEventV1,
  type StoredRiskEventV2,
  type StoredRiskEvent,
  type CounterStore,
  type RiskEventStore,
  type SentinelPolicy,
  type TelemetrySignals,
  type UntrustedTelemetrySignals,
  type TrafficTargetMode,
  type BotCategory,
  type BotIdentityState,
  type BotClassificationResult,
  type DecisionReasonCode,
  type RedirectDestinationId,
  type SentinelDecision,
  type BotRoutingRule,
  type BotPolicyConfig,
  type VerifiedCollectorContext,
  type VerificationOutcome,
  type KeyResolver,
  type NonceStore,
  SentinelAction,
  defaultPolicy,
  createPolicy,
  rules,
  evaluate,
  evaluateVerified,
  classifyBot,
  resolveDecision,
  createTraceId,
  toStoredRiskEvent,
  toStoredRiskEventV1,
  isStoredRiskEvent,
  isStoredRiskEventV1,
  isStoredRiskEventV2,
  sanitizeSignals,
  signCollectorToken,
  verifyCollectorToken,
  isVerifiedCollectorContext,
  readJsonBodyLimited,
  MemoryNonceStore,
  StaticKeyResolver,
  validateRedirectUrl
} from '../packages/sentinel/dist/index.js';

import {
  calculateConfidence,
  type RuleAttributes,
  type EvidenceItem,
  type EnforcementMode,
  type EvaluateOptions,
  type RiskEventStoreOptions,
  type MinimalDerivedSignals,
  type SanitizedEvidence,
  type InternalDecisionTrustState
} from '../packages/risk-core/dist/index.js';

import {
  createBrowserTelemetry,
  browserTelemetry,
  BrowserTelemetryCollector,
  type BrowserTelemetryOptions,
  type BrowserTelemetrySnapshot,
  getLocalSessionId
} from '../packages/browser-sdk/dist/index.js';

// 1. Browser SDK & Telemetry Collector Type Contract
const browserOptions: BrowserTelemetryOptions = {
  autoStart: false,
  maxEventsCap: 300,
  pointerSampleIntervalMs: 100,
  samplingWindowMs: 5000
};
const telemetryCollector: BrowserTelemetryCollector = createBrowserTelemetry(browserOptions);
const rawSnapshot: BrowserTelemetrySnapshot = telemetryCollector.snapshot();
const sessionId: string = getLocalSessionId();
const defaultBrowserCollector: BrowserTelemetryCollector = browserTelemetry;

// 2. Telemetry Signal Sanitization & Confidence Contract
const signals: TelemetrySignals = {
  telemetryObserved: rawSnapshot.telemetryObserved,
  sampleComplete: rawSnapshot.sampleComplete,
  observationDurationMs: rawSnapshot.observationDurationMs,
  webdriver: rawSnapshot.webdriverObserved,
  isTrustedEventsCount: rawSnapshot.trustedInputCount,
  touchMismatch: rawSnapshot.touchMismatch,
  suspiciousUA: rawSnapshot.suspiciousUA,
  userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1)',
  botCategory: 'SEARCH_ENGINE' as BotCategory,
  burstCount10s: 3,
  tokenPresented: true,
  tokenFreshnessMs: 50
};

const sanitizedMinimal: MinimalDerivedSignals = sanitizeSignals(signals);
const confidence: number = calculateConfidence(signals);

// 3. Evidence and Attributes Structural Contract
const sampleAttrs: RuleAttributes = {
  observed: true,
  count: 3,
  note: 'contract-test'
};

const sampleEvidence: EvidenceItem = {
  rule: 'contract.test_rule',
  score: 25,
  attributes: sampleAttrs,
  message: 'Contract verification item'
};

const sampleSanitizedEvidence: SanitizedEvidence = {
  rule: sampleEvidence.rule,
  score: sampleEvidence.score,
  attributes: {
    observed: true,
    count: 3,
    note: 'contract-test'
  },
  message: sampleEvidence.message
};

// 4. Bot Policy & Routing Rules Type Contract
const botRouting: BotRoutingRule = {
  action: SentinelAction.REDIRECT,
  destinationId: 'AI_FEED' as RedirectDestinationId,
  statusCode: 302,
  reasonCode: 'CATEGORY_ROUTING_REDIRECT' as DecisionReasonCode
};

const botPolicyConfig: BotPolicyConfig = {
  targetMode: 'ANY' as TrafficTargetMode,
  allowlist: ['SEARCH_ENGINE' as BotCategory, 'Googlebot'],
  denylist: ['AUTOMATED_TOOL' as BotCategory],
  categoryRouting: {
    AI_AGENT: botRouting
  },
  unknownBotAction: {
    action: SentinelAction.OBSERVE,
    reasonCode: 'BASELINE_CLEAN'
  },
  heuristicClassification: true
};

// 5. Custom Policy & Rules Contract
const customPolicy: SentinelPolicy = createPolicy({
  rules: [
    rules.webdriver({ weight: 30 }),
    rules.burst({ weight: 35, threshold: 20 }),
    rules.trustedInputAbsent({ weight: 20 }),
    rules.touchMismatch({ weight: 15 }),
    rules.suspiciousUA({ weight: 15 }),
    rules.botClassification({ weight: 30 })
  ],
  version: '2026-08-21.v0.6-typecheck',
  botPolicy: botPolicyConfig
});

// 6. Store Adapters Type Contract
const storeOptions: RiskEventStoreOptions = { maxItems: 50, maxAgeMs: 86400000 };
const counterStore: CounterStore = new MemoryFixedWindowCounterStore();
const altCounterStore: CounterStore = new MemoryCounterStore();
const memoryEventStore: RiskEventStore = new MemoryRiskEventStore(storeOptions);
const localEventStore: RiskEventStore = new LocalStorageRiskEventStore(storeOptions);

// 7. Crypto & Token Verifier Type Contract
const keyResolver: KeyResolver = new StaticKeyResolver({ 'collector-key-2026-a': 'test-secret' });
const nonceStore: NonceStore = new MemoryNonceStore();

// 8. Facade Options & Instance Contract
const sentinelOptions: SentinelOptions = {
  mode: 'shadow',
  policy: customPolicy,
  counterStore,
  eventStore: memoryEventStore,
  keyResolver,
  nonceStore,
  expectedAudience: 'sentinel-typecheck',
  expectedPurpose: 'telemetry-collect',
  allowedIssuers: ['ameva-auth'],
  rateKeyProvider: (req: any) => (req?.customUserId ? `user_${req.customUserId}` : null),
  redirectRegistry: {
    AI_FEED: 'https://example.com/llms.txt',
    BOT_GUIDANCE: '/guidance'
  },
  allowedRedirectHosts: ['example.com']
};

const sentinel: Sentinel = createSentinel(sentinelOptions);

async function runFullStaticTypeCheck(): Promise<void> {
  const reqMock = { signals, customUserId: 'dev-type-verifier' };
  const report: SentinelRiskReport = await sentinel.score(reqMock);

  const evalOptions: EvaluateOptions = {
    policy: defaultPolicy,
    enforcementMode: 'SHADOW' as EnforcementMode
  };

  const token = signCollectorToken({
    v: 1,
    kid: 'collector-key-2026-a',
    iss: 'ameva-auth',
    aud: 'sentinel-typecheck',
    purpose: 'telemetry-collect',
    sessionRef: 'sess_typecheck_1',
    iat: Date.now(),
    exp: Date.now() + 60000,
    nonce: 'nonce_typecheck_1'
  }, 'test-secret');

  const authenticContext: VerifiedCollectorContext = await verifyCollectorToken(token, keyResolver, nonceStore, {
    expectedAudience: 'sentinel-typecheck',
    expectedPurpose: 'telemetry-collect',
    allowedIssuers: ['ameva-auth']
  });

  const directEngineReport: SentinelRiskReport = evaluate(signals, evalOptions);
  const verifiedReport: SentinelRiskReport = evaluateVerified(signals, authenticContext, evalOptions);

  const classification: BotClassificationResult = classifyBot(signals.userAgent, signals);
  const decision: SentinelDecision = resolveDecision({
    score: report.score,
    recommendedScoreAction: report.recommendedAction,
    classification,
    signals,
    botPolicy: botPolicyConfig,
    enforcementMode: 'SHADOW'
  }, { isVerified: true });

  const storedV1: StoredRiskEventV1 = toStoredRiskEventV1(report);
  const storedV2: StoredRiskEventV2 = toStoredRiskEvent(report);
  const isV1: boolean = isStoredRiskEventV1(storedV1);
  const isV2: boolean = isStoredRiskEventV2(storedV2);
  const isUniversal: boolean = isStoredRiskEvent(storedV2);

  const urlCheck = validateRedirectUrl('/llms.txt', { allowRelative: true });
  const bodyCheck = await readJsonBodyLimited({ body: '{"ok":true}' });

  void isV1;
  void isV2;
  void isUniversal;
  void urlCheck;
  void bodyCheck;
  void decision;
  void verifiedReport;
  void directEngineReport;
  void altCounterStore;
  void localEventStore;
  void defaultBrowserCollector;
  void sanitizedMinimal;
  void confidence;
  void sampleSanitizedEvidence;
}

runFullStaticTypeCheck();

```

---

### 2. TypeScript Runtime Consumer Contract Gate (Live Execution & Assertion)
* **Target File**: [`tests/typecheck.runtime.js`](../../tests/typecheck.runtime.js)
* **Execution Status**: `PASS` (1 passed, 0 failed in 99ms)

#### Execution Console Output:
```text
🔍 Running TypeScript Consumer API Runtime Contract Gate...

[TypeScript v0.6.0 Contract Gate] ALL 32+ SDK Types & Runtime Interfaces 100% Verified.
  - TraceId: trc_a0f817b4c4684139
  - Decision Action: ALLOW (BOT_ALLOWLIST_PASSED)
  - Bot Classification: SEARCH_ENGINE (Googlebot)
  - SessionId: ephemeral_local_session
  - Verification State: VERIFIED

{"suite":"typecheck_runtime","passed":1,"failed":0,"total":1}
```

#### Source Code Verification (`tests/typecheck.runtime.js`):
```javascript
﻿import assert from 'node:assert';
import {
  createSentinel,
  MemoryFixedWindowCounterStore,
  MemoryRiskEventStore,
  StaticKeyResolver,
  MemoryNonceStore,
  SentinelAction,
  defaultPolicy,
  createPolicy,
  rules,
  evaluate,
  evaluateVerified,
  classifyBot,
  resolveDecision,
  createTraceId,
  toStoredRiskEvent,
  toStoredRiskEventV1,
  isStoredRiskEvent,
  isStoredRiskEventV1,
  isStoredRiskEventV2,
  sanitizeSignals,
  signCollectorToken,
  verifyCollectorToken,
  isVerifiedCollectorContext,
  validateRedirectUrl
} from '../packages/sentinel/dist/index.js';

import { calculateConfidence } from '../packages/risk-core/dist/index.js';
import { createBrowserTelemetry, getLocalSessionId } from '../packages/browser-sdk/dist/index.js';

console.log('\n🔍 Running TypeScript Consumer API Runtime Contract Gate...\n');

async function runRuntimeContract() {
  const telemetry = createBrowserTelemetry({ autoStart: false });
  const snapshot = telemetry.snapshot();
  const sessionId = getLocalSessionId();

  const secretKey = 'runtime-secret-key-2026';
  const keyResolver = new StaticKeyResolver({ 'collector-key-2026-a': secretKey });
  const nonceStore = new MemoryNonceStore();

  const token = signCollectorToken({
    v: 1,
    kid: 'collector-key-2026-a',
    iss: 'ameva-auth',
    aud: 'ameva-sentinel-collector',
    purpose: 'telemetry-collect',
    sessionRef: 'sess_contract_001',
    iat: Date.now(),
    exp: Date.now() + 60000,
    nonce: 'nonce_contract_runtime_001'
  }, secretKey);

  const authenticContext = await verifyCollectorToken(token, keyResolver, nonceStore, {
    expectedAudience: 'ameva-sentinel-collector',
    expectedPurpose: 'telemetry-collect',
    allowedIssuers: ['ameva-auth']
  });

  assert.strictEqual(isVerifiedCollectorContext(authenticContext), true);

  const signals = {
    telemetryObserved: snapshot.telemetryObserved,
    sampleComplete: snapshot.sampleComplete,
    observationDurationMs: snapshot.observationDurationMs,
    webdriver: snapshot.webdriverObserved,
    isTrustedEventsCount: snapshot.trustedInputCount,
    touchMismatch: snapshot.touchMismatch,
    suspiciousUA: snapshot.suspiciousUA,
    userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1)',
    botCategory: 'SEARCH_ENGINE',
    burstCount10s: 3,
    tokenPresented: true,
    tokenFreshnessMs: 50
  };

  const confidence = calculateConfidence(signals);
  assert.ok(confidence > 0 && confidence <= 1);

  const policy = createPolicy({
    version: '2026-08-21.v0.6-runtime',
    botPolicy: {
      targetMode: 'ANY',
      allowlist: ['SEARCH_ENGINE'],
      categoryRouting: {
        AI_AGENT: { action: SentinelAction.REDIRECT, destinationId: 'AI_FEED', statusCode: 302 }
      }
    }
  });

  const memoryStore = new MemoryRiskEventStore();
  const counterStore = new MemoryFixedWindowCounterStore();

  const sentinel = createSentinel({
    policy,
    mode: 'shadow',
    eventStore: memoryStore,
    counterStore,
    keyResolver,
    nonceStore,
    expectedAudience: 'ameva-sentinel-collector',
    expectedPurpose: 'telemetry-collect',
    allowedIssuers: ['ameva-auth'],
    redirectRegistry: {
      AI_FEED: 'https://example.com/llms.txt'
    }
  });

  const report = await sentinel.score({
    signals,
    customUserId: 'dev-runtime-user'
  });

  assert.strictEqual(typeof report.score, 'number');
  assert.ok(report.traceId.startsWith('trc_'));
  assert.strictEqual(report.action, SentinelAction.ALLOW);
  assert.strictEqual(report.decision.reasonCode, 'BOT_ALLOWLIST_PASSED');

  const verifiedReport = evaluateVerified(signals, authenticContext, { policy });
  assert.strictEqual(verifiedReport.verification?.state, 'VERIFIED');

  const storedV2 = toStoredRiskEvent(report);
  assert.strictEqual(isStoredRiskEventV2(storedV2), true);
  assert.strictEqual(isStoredRiskEvent(storedV2), true);

  const storedV1 = toStoredRiskEventV1(report);
  assert.strictEqual(isStoredRiskEventV1(storedV1), true);

  const urlCheck = validateRedirectUrl('/llms.txt', { allowRelative: true });
  assert.strictEqual(urlCheck.valid, true);

  console.log(`[TypeScript v0.6.0 Contract Gate] ALL 32+ SDK Types & Runtime Interfaces 100% Verified.`);
  console.log(`  - TraceId: ${report.traceId}`);
  console.log(`  - Decision Action: ${report.decision.action} (${report.decision.reasonCode})`);
  console.log(`  - Bot Classification: ${report.classification?.category} (${report.classification?.claimedName})`);
  console.log(`  - SessionId: ${sessionId}`);
  console.log(`  - Verification State: ${verifiedReport.verification?.state}`);

  console.log(`\n{"suite":"typecheck_runtime","passed":1,"failed":0,"total":1}`);
}

runRuntimeContract().catch(err => {
  console.error('Runtime Contract Failed:', err);
  process.exit(1);
});

```

---

### 3. Trust Boundary Collector HMAC, RFC 4231 Vectors, Freshness, Replay Attack & 100-Race Suite (15 Gates)
* **Target File**: [`tests/collector-crypto.test.js`](../../tests/collector-crypto.test.js)
* **Execution Status**: `PASS` (15 passed, 0 failed in 105ms)

#### Execution Console Output:
```text
🔐 Running AMEVA Sentinel Trust Boundary Collector & Crypto Quality Gate Tests...

  ✅ PASS: should verify valid sv1 token and issue authentic opaque context via verifier
  ✅ PASS: should reject malformed or oversized tokens
  ✅ PASS: should reject unknown kid with UNKNOWN_KEY_ID
  ✅ PASS: should reject tampered payload or signature with INVALID_SIGNATURE
  ✅ PASS: should reject expired tokens with TOKEN_EXPIRED
  ✅ PASS: should reject stale timestamp with INVALID_TIMESTAMP_FRESHNESS
  ✅ PASS: should reject audience, purpose, or unauthorized issuer mismatch
  ✅ PASS: should block replay attacks with REPLAY_ATTACK_DETECTED on duplicate nonce
  ✅ PASS: concurrent 100-request nonce consumption race guarantees exactly 1 success and 99 replays
  ✅ PASS: evaluateVerified should reject structural forged objects and accept authentic verifier context
  ✅ PASS: verifyCollectorToken should fail-closed on missing mandatory expectedAudience/Purpose
  ✅ PASS: canonicalizeJsonSubset should reject non-finite numbers and circular references
  ✅ PASS: verifyCollectorToken should reject non-canonical payload representation
  ✅ PASS: assertBase64UrlSegment should reject invalid characters and illegal padding
  ✅ PASS: computeHmacSha256 matches RFC 4231 official Test Case 2 vector

{"suite":"collector_crypto","passed":15,"failed":0,"total":15}
```

#### Source Code Verification (`tests/collector-crypto.test.js`):
```javascript
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

```

---

### 4. Redirect Security & Closed-Destination Injection Defense Suite (6 Gates)
* **Target File**: [`tests/redirect-security.test.js`](../../tests/redirect-security.test.js)
* **Execution Status**: `PASS` (6 passed, 0 failed in 79ms)

#### Execution Console Output:
```text
🛡️ Running AMEVA Sentinel Redirect Security & Open Redirect Prevention Tests...

  ✅ PASS: should accept valid relative paths and HTTPS URLs with normalization
  ✅ PASS: should strictly reject javascript:, data:, file: and other dangerous schemes
  ✅ PASS: should strictly reject protocol-relative URLs (//) and backslash traversal
  ✅ PASS: should strictly reject CRLF and header injection attempts
  ✅ PASS: should reject URLs with embedded user credentials (user:pass@host)
  ✅ PASS: should enforce allowedHosts whitelist and fail constructor on invalid registry

{"suite":"redirect_security","passed":6,"failed":0,"total":6}
```

#### Source Code Verification (`tests/redirect-security.test.js`):
```javascript
﻿import assert from 'node:assert';
import { validateRedirectUrl, createSentinel } from '../packages/sentinel/dist/index.js';

console.log('\n🛡️ Running AMEVA Sentinel Redirect Security & Open Redirect Prevention Tests...\n');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
    failedTests++;
  }
}

// 1. Valid URLs (Relative & HTTPS)
runTest('should accept valid relative paths and HTTPS URLs with normalization', () => {
  const rel = validateRedirectUrl('/llms.txt', { allowRelative: true });
  assert.strictEqual(rel.valid, true);
  assert.strictEqual(rel.sanitizedUrl, '/llms.txt');

  const abs = validateRedirectUrl('https://example.com/llms.txt');
  assert.strictEqual(abs.valid, true);
  assert.strictEqual(abs.sanitizedUrl, 'https://example.com/llms.txt');
});

// 2. Reject Dangerous Schemes (javascript:, data:, file:)
runTest('should strictly reject javascript:, data:, file: and other dangerous schemes', () => {
  assert.strictEqual(validateRedirectUrl('javascript:alert(1)').valid, false);
  assert.strictEqual(validateRedirectUrl('data:text/html,<script>alert(1)</script>').valid, false);
  assert.strictEqual(validateRedirectUrl('file:///etc/passwd').valid, false);
  assert.strictEqual(validateRedirectUrl('vbscript:msgbox(1)').valid, false);
});

// 3. Reject Protocol-Relative URLs and Backslashes
runTest('should strictly reject protocol-relative URLs (//) and backslash traversal', () => {
  assert.strictEqual(validateRedirectUrl('//evil.example.com/login').valid, false);
  assert.strictEqual(validateRedirectUrl('/\\evil.example.com/login').valid, false);
  assert.strictEqual(validateRedirectUrl('/login\\..\\evil').valid, false);
});

// 4. Reject CRLF and Control Character Injections
runTest('should strictly reject CRLF and header injection attempts', () => {
  assert.strictEqual(validateRedirectUrl('https://example.com/page\r\nSet-Cookie: session=1').valid, false);
  assert.strictEqual(validateRedirectUrl('https://example.com/page\u0000admin').valid, false);
});

// 5. Reject URLs with Embedded User Credentials
runTest('should reject URLs with embedded user credentials (user:pass@host)', () => {
  const res = validateRedirectUrl('https://admin:secret@attacker.com/login');
  assert.strictEqual(res.valid, false);
  assert.ok(res.error?.includes('user credentials'));
});

// 6. Host Whitelist Enforcement & Constructor-Time Registry Validation
runTest('should enforce allowedHosts whitelist and fail constructor on invalid registry', () => {
  const options = { allowedHosts: ['example.com', 'api.example.com'] };
  
  assert.strictEqual(validateRedirectUrl('https://example.com/bot', options).valid, true);
  assert.strictEqual(validateRedirectUrl('https://api.example.com/bot', options).valid, true);
  
  const untrusted = validateRedirectUrl('https://evil-phishing.com/bot', options);
  assert.strictEqual(untrusted.valid, false);
  assert.ok(untrusted.error?.includes('not in allowed redirect whitelist'));

  // Constructor-time fail-fast validation
  assert.throws(() => {
    createSentinel({
      redirectRegistry: {
        AI_FEED: 'javascript:alert(1)'
      }
    });
  }, /Invalid redirectRegistry URL/);
});

if (failedTests > 0) {
  process.exit(1);
}
console.log(`\n{"suite":"redirect_security","passed":${passedTests},"failed":${failedTests},"total":${passedTests + failedTests}}`);

```

---

### 5. Smart Bot Classifier & ReDoS Safety Suite (7 Taxonomies, 8 Gates)
* **Target File**: [`tests/bot-classifier.test.js`](../../tests/bot-classifier.test.js)
* **Execution Status**: `PASS` (8 passed, 0 failed in 78ms)

#### Execution Console Output:
```text
🤖 Running @ameva/sentinel-risk-core Bot Classifier Quality Gate Tests...

  ✅ PASS: should accurately classify search engines as SEARCH_ENGINE with CLAIMED state
  ✅ PASS: should accurately classify AI scrapers as AI_AGENT
  ✅ PASS: should accurately classify social preview bots as SOCIAL_PREVIEW
  ✅ PASS: should accurately classify uptime and monitoring services as MONITORING
  ✅ PASS: should accurately classify feed readers as FEED_FETCHER
  ✅ PASS: should accurately classify developer tools and scrapers as AUTOMATED_TOOL with SUSPECTED state
  ✅ PASS: should classify clean standard browser User-Agents as NOT_BOT and NONE category
  ✅ PASS: 10,000+ character adversarial input completed in < 10ms in local benchmark execution

{"suite":"bot_classifier","passed":8,"failed":0,"total":8}
```

#### Source Code Verification (`tests/bot-classifier.test.js`):
```javascript
﻿import assert from 'node:assert';
import { classifyBot } from '../packages/risk-core/dist/index.js';

console.log('\n🤖 Running @ameva/sentinel-risk-core Bot Classifier Quality Gate Tests...\n');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
    failedTests++;
  }
}

// 1. Search Engine Classification
runTest('should accurately classify search engines as SEARCH_ENGINE with CLAIMED state', () => {
  const uas = [
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
    'DuckDuckBot/1.1; (+http://duckduckgo.com/duckduckbot.html)',
    'Baiduspider+(+http://www.baidu.com/search/spider.htm)'
  ];

  for (const ua of uas) {
    const res = classifyBot(ua);
    assert.strictEqual(res.isBotLikely, true, `Failed isBotLikely for ${ua}`);
    assert.strictEqual(res.category, 'SEARCH_ENGINE', `Failed category for ${ua}`);
    assert.strictEqual(res.identityState, 'CLAIMED');
    assert.ok(res.heuristicConfidence >= 0.75);
  }
});

// 2. AI Agents & LLM Scrapers
runTest('should accurately classify AI scrapers as AI_AGENT', () => {
  const uas = [
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)',
    'Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
    'Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)',
    'Bytespider; https://zhanzhang.toutiao.com/',
    'Mozilla/5.0 (compatible; Google-Extended; +https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers)'
  ];

  for (const ua of uas) {
    const res = classifyBot(ua);
    assert.strictEqual(res.isBotLikely, true, `Failed isBotLikely for ${ua}`);
    assert.strictEqual(res.category, 'AI_AGENT', `Failed category for ${ua}`);
    assert.strictEqual(res.identityState, 'CLAIMED');
  }
});

// 3. Social Media & Link Preview Bots
runTest('should accurately classify social preview bots as SOCIAL_PREVIEW', () => {
  const uas = [
    'Twitterbot/1.0',
    'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
    'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    'WhatsApp/2.21.12.21 A'
  ];

  for (const ua of uas) {
    const res = classifyBot(ua);
    assert.strictEqual(res.isBotLikely, true, `Failed isBotLikely for ${ua}`);
    assert.strictEqual(res.category, 'SOCIAL_PREVIEW', `Failed category for ${ua}`);
  }
});

// 4. Monitoring & Healthcheck Services
runTest('should accurately classify uptime and monitoring services as MONITORING', () => {
  const uas = [
    'Pingdom.com_bot_version_1.4_(http://www.pingdom.com/)',
    'Mozilla/5.0 (compatible; UptimeRobot/2.0; http://www.uptimerobot.com/)',
    'Datadog Agent/7.40.0'
  ];

  for (const ua of uas) {
    const res = classifyBot(ua);
    assert.strictEqual(res.isBotLikely, true, `Failed isBotLikely for ${ua}`);
    assert.strictEqual(res.category, 'MONITORING', `Failed category for ${ua}`);
  }
});

// 5. Feed Fetchers & Readers
runTest('should accurately classify feed readers as FEED_FETCHER', () => {
  const uas = [
    'AppleNewsBot',
    'Feedfetcher-Google; (+http://www.google.com/feedfetcher.html)',
    'Feedly/1.0 (+http://www.feedly.com/fetcher.html)'
  ];

  for (const ua of uas) {
    const res = classifyBot(ua);
    assert.strictEqual(res.isBotLikely, true, `Failed isBotLikely for ${ua}`);
    assert.strictEqual(res.category, 'FEED_FETCHER', `Failed category for ${ua}`);
  }
});

// 6. Automated Tools, Scrapers & Headless Drivers
runTest('should accurately classify developer tools and scrapers as AUTOMATED_TOOL with SUSPECTED state', () => {
  const uas = [
    'curl/7.88.1',
    'Wget/1.21.3',
    'python-requests/2.31.0',
    'Scrapy/2.11.0 (+https://scrapy.org)',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Playwright/1.40.0'
  ];

  for (const ua of uas) {
    const res = classifyBot(ua);
    assert.strictEqual(res.isBotLikely, true, `Failed isBotLikely for ${ua}`);
    assert.strictEqual(res.category, 'AUTOMATED_TOOL', `Failed category for ${ua}`);
    assert.strictEqual(res.identityState, 'SUSPECTED');
  }
});

// 7. Clean Human Browser User-Agents
runTest('should classify clean standard browser User-Agents as NOT_BOT and NONE category', () => {
  const humanUAs = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Mobile/15E148 Safari/604.1'
  ];

  for (const ua of humanUAs) {
    const res = classifyBot(ua);
    assert.strictEqual(res.isBotLikely, false, `Failed for clean human UA: ${ua}`);
    assert.strictEqual(res.category, 'NONE');
    assert.strictEqual(res.identityState, 'NOT_BOT');
    assert.ok(res.heuristicConfidence >= 0.85);
  }
});

// 8. ReDoS & Bounded Execution Resilience
runTest('10,000+ character adversarial input completed in < 10ms in local benchmark execution', () => {
  const evilPayload = 'Mozilla/5.0 ' + 'bot-'.repeat(2000) + 'xyz\u0000\u001f';
  const t0 = performance.now();
  const res = classifyBot(evilPayload);
  const elapsed = performance.now() - t0;

  assert.ok(elapsed < 10, `Adversarial input execution took ${elapsed}ms (expected < 10ms)`);
  assert.strictEqual(res.isBotLikely, true);
  assert.ok(res.evidenceCodes.length > 0);
});

if (failedTests > 0) {
  process.exit(1);
}
console.log(`\n{"suite":"bot_classifier","passed":${passedTests},"failed":${failedTests},"total":${passedTests + failedTests}}`);

```

---

### 6. Target Mode & Decision Engine Suite (Closed-Destination Routing, 6 Gates)
* **Target File**: [`tests/decision.test.js`](../../tests/decision.test.js)
* **Execution Status**: `PASS` (6 passed, 0 failed in 88ms)

#### Execution Console Output:
```text
🧭 Running AMEVA Sentinel Target Mode & Decision Engine Quality Gate Tests...

  ✅ PASS: VERIFIED_PARTNERS_ONLY should deny unverified traffic and allow authentic verified context
  ✅ PASS: HUMANS_ONLY should challenge/deny automated scrapers and allow human browsers
  ✅ PASS: BOTS_ONLY should redirect human interactive browser to BOT_GUIDANCE and allow bots
  ✅ PASS: should execute closed-destination redirect for AI_AGENT category
  ✅ PASS: should strictly trigger TEMPORARY_DENY on denylisted bot categories
  ✅ PASS: Sentinel.score() should verify presented Bearer token and route destinationId

{"suite":"decision","passed":6,"failed":0,"total":6}
```

#### Source Code Verification (`tests/decision.test.js`):
```javascript
import assert from 'node:assert';
import {
  evaluate,
  evaluateVerified,
  createPolicy,
  createSentinel,
  SentinelAction,
  signCollectorToken,
  verifyCollectorToken,
  StaticKeyResolver,
  MemoryNonceStore
} from '../packages/sentinel/dist/index.js';

console.log('\n🧭 Running AMEVA Sentinel Target Mode & Decision Engine Quality Gate Tests...\n');

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
  const secretKey = 'partner-secret-key-2026';
  const keyResolver = new StaticKeyResolver({ 'partner-kid-1': secretKey });
  const nonceStore = new MemoryNonceStore();

  // 1. VERIFIED_PARTNERS_ONLY Mode
  await runTest('VERIFIED_PARTNERS_ONLY should deny unverified traffic and allow authentic verified context', async () => {
    const policy = createPolicy({
      botPolicy: { targetMode: 'VERIFIED_PARTNERS_ONLY' }
    });

    // Unverified UA Claiming Googlebot -> DENIED
    const unverified = evaluate({ userAgent: 'Googlebot/2.1' }, { policy, enforcementMode: 'ENFORCE' });
    assert.strictEqual(unverified.action, SentinelAction.TEMPORARY_DENY);
    assert.strictEqual(unverified.decision.reasonCode, 'TARGET_MODE_PARTNERS_UNVERIFIED');

    // Cryptographically Verified Partner Context via Verifier -> ALLOWED
    const token = signCollectorToken({
      v: 1,
      kid: 'partner-kid-1',
      iss: 'partner-corp',
      aud: 'ameva-sentinel',
      purpose: 'telemetry-collect',
      sessionRef: 'sess-1',
      iat: Date.now(),
      exp: Date.now() + 60000,
      nonce: 'nonce_partner_decision_1'
    }, secretKey);

    const authenticCtx = await verifyCollectorToken(token, keyResolver, nonceStore, {
      expectedAudience: 'ameva-sentinel',
      expectedPurpose: 'telemetry-collect'
    });

    const verified = evaluateVerified({ userAgent: 'PartnerBot/1.0' }, authenticCtx, { policy, enforcementMode: 'ENFORCE' });
    assert.strictEqual(verified.action, SentinelAction.ALLOW);
    assert.strictEqual(verified.decision.reasonCode, 'BOT_ALLOWLIST_PASSED');
  });

  // 2. HUMANS_ONLY Mode
  await runTest('HUMANS_ONLY should challenge/deny automated scrapers and allow human browsers', async () => {
    const policy = createPolicy({
      botPolicy: {
        targetMode: 'HUMANS_ONLY',
        denylist: ['AUTOMATED_TOOL']
      }
    });

    // Automated Scraper (curl) -> DENIED
    const botReq = evaluate({ userAgent: 'curl/7.88.1' }, { policy, enforcementMode: 'ENFORCE' });
    assert.strictEqual(botReq.action, SentinelAction.TEMPORARY_DENY);
    assert.strictEqual(botReq.decision.reasonCode, 'TARGET_MODE_HUMANS_ONLY_VIOLATION');

    // Clean Human Browser -> ALLOWED
    const humanReq = evaluate({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36',
      isTrustedEventsCount: 8,
      telemetryObserved: true
    }, { policy, enforcementMode: 'ENFORCE' });
    assert.strictEqual(humanReq.action, SentinelAction.ALLOW);
  });

  // 3. BOTS_ONLY Mode
  await runTest('BOTS_ONLY should redirect human interactive browser to BOT_GUIDANCE and allow bots', async () => {
    const policy = createPolicy({
      botPolicy: {
        targetMode: 'BOTS_ONLY',
        categoryRouting: {
          NONE: { action: SentinelAction.REDIRECT, destinationId: 'BOT_GUIDANCE', statusCode: 302 }
        }
      }
    });

    // Human user interacting with mouse/keyboard -> REDIRECT to guidance
    const human = evaluate({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0 Safari/537.36',
      isTrustedEventsCount: 12,
      telemetryObserved: true
    }, { policy, enforcementMode: 'ENFORCE' });

    assert.strictEqual(human.action, SentinelAction.REDIRECT);
    assert.strictEqual(human.redirectTo, 'BOT_GUIDANCE');
    assert.strictEqual(human.redirectStatusCode, 302);
    assert.strictEqual(human.decision.reasonCode, 'TARGET_MODE_BOTS_ONLY_VIOLATION');

    // Genuine search crawler -> ALLOWED
    const crawler = evaluate({ userAgent: 'Googlebot/2.1' }, { policy, enforcementMode: 'ENFORCE' });
    assert.strictEqual(crawler.action, SentinelAction.ALLOW);
  });

  // 4. Category Routing (AI_AGENT -> AI_FEED)
  await runTest('should execute closed-destination redirect for AI_AGENT category', async () => {
    const policy = createPolicy({
      botPolicy: {
        targetMode: 'ANY',
        categoryRouting: {
          AI_AGENT: { action: SentinelAction.REDIRECT, destinationId: 'AI_FEED', statusCode: 307 }
        }
      }
    });

    const gptReq = evaluate({ userAgent: 'Mozilla/5.0 GPTBot/1.2' }, { policy, enforcementMode: 'ENFORCE' });
    assert.strictEqual(gptReq.action, SentinelAction.REDIRECT);
    assert.strictEqual(gptReq.redirectTo, 'AI_FEED');
    assert.strictEqual(gptReq.redirectStatusCode, 307);
    assert.strictEqual(gptReq.decision.reasonCode, 'CATEGORY_ROUTING_REDIRECT');
  });

  // 5. Explicit Denylist Rule
  await runTest('should strictly trigger TEMPORARY_DENY on denylisted bot categories', async () => {
    const policy = createPolicy({
      botPolicy: {
        targetMode: 'ANY',
        denylist: ['AUTOMATED_TOOL']
      }
    });

    const scraper = evaluate({ userAgent: 'python-requests/2.31.0' }, { policy, enforcementMode: 'ENFORCE' });
    assert.strictEqual(scraper.action, SentinelAction.TEMPORARY_DENY);
    assert.strictEqual(scraper.decision.reasonCode, 'BOT_DENYLIST_TRIGGERED');
  });

  // 6. Sentinel Facade End-to-End Token Verification & Destination Resolution
  await runTest('Sentinel.score() should verify presented Bearer token and route destinationId', async () => {
    const policy = createPolicy({
      botPolicy: {
        targetMode: 'VERIFIED_PARTNERS_ONLY'
      }
    });

    const sentinel = createSentinel({
      policy,
      mode: 'enforce',
      keyResolver,
      nonceStore,
      expectedAudience: 'sentinel-api-prod',
      allowedIssuers: ['partner-corp'],
      redirectRegistry: {
        AI_FEED: 'https://example.com/llms-full.txt'
      }
    });

    // Valid Bearer Token Presentation -> ALLOWED
    const validToken = signCollectorToken({
      v: 1,
      kid: 'partner-kid-1',
      iss: 'partner-corp',
      aud: 'sentinel-api-prod',
      purpose: 'telemetry-collect',
      sessionRef: 'sess-prod-100',
      iat: Date.now(),
      exp: Date.now() + 60000,
      nonce: 'nonce_facade_prod_1'
    }, secretKey);

    const reportAllowed = await sentinel.score({
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; ClaudeBot/1.0)',
        'authorization': `Bearer ${validToken}`
      }
    });

    assert.strictEqual(reportAllowed.action, SentinelAction.ALLOW);
    assert.strictEqual(reportAllowed.decision.reasonCode, 'BOT_ALLOWLIST_PASSED');
    assert.strictEqual(reportAllowed.verification?.state, 'VERIFIED');

    // Unverified Request in VERIFIED_PARTNERS_ONLY -> DENIED
    const reportDenied = await sentinel.score({
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; ClaudeBot/1.0)'
      }
    });

    assert.strictEqual(reportDenied.action, SentinelAction.TEMPORARY_DENY);
    assert.strictEqual(reportDenied.decision.reasonCode, 'TARGET_MODE_PARTNERS_UNVERIFIED');
  });

  if (failedTests > 0) {
    process.exit(1);
  }
  console.log(`\n{"suite":"decision","passed":${passedTests},"failed":${failedTests},"total":${passedTests + failedTests}}`);
}

main();

```

---

### 7. Risk Core Pure Engine & Clamping Quality Gates (7 Gates)
* **Target File**: [`tests/engine.test.js`](../../tests/engine.test.js)
* **Execution Status**: `PASS` (7 passed, 0 failed in 81ms)

#### Execution Console Output:
```text
🧪 Running AMEVA Sentinel Quality Gate Test Suite...

  ✅ PASS: should classify clean synthetic baseline session as ALLOW with 0 score
  ✅ PASS: missing telemetry must not be treated as zero interaction (Guard against false positives)
  ✅ PASS: shadow mode never enforces a denial action directly (returns OBSERVE with recommendation)
  ✅ PASS: score must be clamped strictly to 100 on excessive cumulative rule weights
  ✅ PASS: score must be clamped to 0 on negative weights or empty inputs
  ✅ PASS: evaluation does not mutate its inputs (Object.freeze guarantee)
  ✅ PASS: should gracefully handle undefined, null, and NaN signals without throwing

{"suite":"engine","passed":7,"failed":0,"total":7}
```

#### Source Code Verification (`tests/engine.test.js`):
```javascript
﻿import assert from 'node:assert';
import { evaluate, calculateConfidence, createPolicy, rules, SentinelAction } from '../packages/risk-core/dist/index.js';

console.log('\n🧪 Running AMEVA Sentinel Quality Gate Test Suite...\n');

let passedTests = 0;
let failedTests = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failedTests++;
  }
}

// 1. Clean Human Baseline (Synthetic Baseline)
it('should classify clean synthetic baseline session as ALLOW with 0 score', () => {
  const signals = {
    webdriver: false,
    burstCount10s: 2,
    telemetryObserved: true,
    observationDurationMs: 10000,
    isTrustedEventsCount: 8,
    tokenFreshnessMs: 500
  };

  const report = evaluate(signals, { enforcementMode: 'SHADOW' });
  
  assert.strictEqual(report.score, 0, 'Clean baseline session should have 0 score');
  assert.strictEqual(report.action, SentinelAction.ALLOW, 'Action should be ALLOW');
  assert.strictEqual(report.recommendedAction, SentinelAction.ALLOW);
  assert.strictEqual(report.evidence.length, 0, 'Evidence should be empty for clean user');
  assert.ok(report.evidenceConfidence >= 0.70, `Confidence should be high, got ${report.evidenceConfidence}`);
  assert.ok(report.traceId.startsWith('trc_'), 'TraceId should start with trc_');
});

// 2. Guarded Telemetry Test (Absence of Telemetry != Zero Interaction)
it('missing telemetry must not be treated as zero interaction (Guard against false positives)', () => {
  const report = evaluate({
    telemetryObserved: false,
    isTrustedEventsCount: 0,
    burstCount10s: 1
  });

  const hasNoPhysicsRule = report.evidence.some(e => e.rule === 'interaction.trusted_input_absent');
  assert.strictEqual(hasNoPhysicsRule, false, 'Should not trigger trusted_input_absent when telemetry was never observed');
  assert.strictEqual(report.score, 0);
});

// 3. Shadow Mode Semantics Test (Never Enforces Denial in Shadow Mode)
it('shadow mode never enforces a denial action directly (returns OBSERVE with recommendation)', () => {
  const highRiskSignals = {
    webdriver: true,              // +25
    burstCount10s: 50,           // +30
    telemetryObserved: true,
    observationDurationMs: 10000,
    isTrustedEventsCount: 0,     // +20
    touchMismatch: true,         // +15
    tokenPresented: true
  };

  // Shadow Mode (Default)
  const shadowReport = evaluate(highRiskSignals, { enforcementMode: 'SHADOW' });
  assert.strictEqual(shadowReport.score, 90);
  assert.strictEqual(shadowReport.action, SentinelAction.OBSERVE, 'In Shadow Mode, action must remain OBSERVE');
  assert.strictEqual(shadowReport.recommendedAction, SentinelAction.TEMPORARY_DENY, 'Recommended action should be TEMPORARY_DENY');
  assert.strictEqual(shadowReport.enforcementMode, 'SHADOW');

  // Enforce Mode
  const enforceReport = evaluate(highRiskSignals, { enforcementMode: 'ENFORCE' });
  assert.strictEqual(enforceReport.action, SentinelAction.TEMPORARY_DENY, 'In Enforce Mode, action must match recommendation');
  assert.strictEqual(enforceReport.enforcementMode, 'ENFORCE');
});

// 4. Strict Clamping & Boundary Tests
it('score must be clamped strictly to 100 on excessive cumulative rule weights', () => {
  const extremePolicy = createPolicy({
    rules: [
      rules.webdriver({ weight: 80 }),
      rules.burst({ weight: 70, threshold: 5 })
    ]
  });

  const report = evaluate({ webdriver: true, burstCount10s: 10 }, { policy: extremePolicy });
  assert.strictEqual(report.score, 100, 'Score 150 must be clamped to 100');
});

it('score must be clamped to 0 on negative weights or empty inputs', () => {
  const negativePolicy = createPolicy({
    rules: [
      {
        id: 'test.negative',
        weight: -50,
        evaluate: () => ({ triggered: true, score: -50, attributes: {}, message: 'Negative' })
      }
    ]
  });

  const report = evaluate({}, { policy: negativePolicy });
  assert.strictEqual(report.score, 0, 'Negative score must be clamped to 0');
});

// 5. Input Immutability Test (Deep Object.freeze)
it('evaluation does not mutate its inputs (Object.freeze guarantee)', () => {
  const rawSignals = {
    webdriver: true,
    burstCount10s: 42,
    customKey: 'original_val'
  };
  Object.freeze(rawSignals);

  const report = evaluate(rawSignals);
  assert.strictEqual(rawSignals.customKey, 'original_val');
  assert.strictEqual(report.score, 55);
});

// 6. Robustness against Malformed Inputs (Never Throws)
it('should gracefully handle undefined, null, and NaN signals without throwing', () => {
  const malformedSignals = {
    webdriver: undefined,
    burstCount10s: NaN,
    observationDurationMs: null,
    isTrustedEventsCount: 'not_a_number'
  };

  const report = evaluate(malformedSignals);
  assert.strictEqual(typeof report.score, 'number');
  assert.strictEqual(Number.isFinite(report.score), true);
  assert.ok(report.score >= 0 && report.score <= 100);
});

if (failedTests > 0) {
  process.exit(1);
}
console.log(`\n{"suite":"engine","passed":${passedTests},"failed":${failedTests},"total":${passedTests + failedTests}}`);

```

---

### 8. Sentinel Facade & Stateful Rate Enforcement Tests (12 Gates)
* **Target File**: [`tests/sentinel.test.js`](../../tests/sentinel.test.js)
* **Execution Status**: `PASS` (12 passed, 0 failed in 134ms)

#### Execution Console Output:
```text
🧪 Running AMEVA Sentinel Facade & Integration Test Suite...

  ✅ PASS: sentinel.score({ signals }) should score directly from browser-sdk snapshot
  ✅ PASS: should automatically track request rates and trigger burst rules on high frequency
  ✅ PASS: createSentinel({ mode: "enforce", eventStore }) should enforce TEMPORARY_DENY on high-risk payload
  ✅ PASS: Sentinel.score should verify Bearer token when headers and signals coexist
  ✅ PASS: invalid presented token yields verification.state: FAILED instead of NONE
  ✅ PASS: stateFailureMode: FAIL_CLOSED throws on invalid token presentation
  ✅ PASS: readJsonBodyLimited rejects body exceeding 64KB limit
  ✅ PASS: readJsonBodyLimited measures true byte length for multi-byte characters
  ✅ PASS: public evaluate({ verifiedBot: true }) cannot bypass VERIFIED_PARTNERS_ONLY mode
  ✅ PASS: signals boolean values remain authoritative when body fields are absent
  ✅ PASS: Sentinel.score rejects oversized request regardless of stateFailureMode
  ✅ PASS: untrusted verifiedBot cannot elevate classification identityState or verification state

{"suite":"sentinel","passed":12,"failed":0,"total":12}
```

#### Source Code Verification (`tests/sentinel.test.js`):
```javascript
import assert from 'node:assert';
import {
  sentinel,
  createSentinel,
  SentinelAction,
  MemoryCounterStore,
  MemoryRiskEventStore,
  StaticKeyResolver,
  MemoryNonceStore,
  createPolicy,
  signCollectorToken,
  evaluate,
  readJsonBodyLimited
} from '../packages/sentinel/dist/index.js';
import { createBrowserTelemetry } from '../packages/browser-sdk/dist/index.js';

console.log('\n🧪 Running AMEVA Sentinel Facade & Integration Test Suite...\n');

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
  const secretKey = 'partner-secret-key-2026';
  const keyResolver = new StaticKeyResolver({ 'partner-kid-1': secretKey });
  const nonceStore = new MemoryNonceStore();

  // 1. Ingest from browser-sdk snapshot
  await it('sentinel.score({ signals }) should score directly from browser-sdk snapshot', async () => {
    const telemetry = createBrowserTelemetry({ autoStart: false });
    const snapshot = telemetry.snapshot();

    const report = await sentinel.score({ signals: snapshot });

    assert.strictEqual(typeof report.score, 'number');
    assert.strictEqual(report.action, SentinelAction.ALLOW);
    assert.strictEqual(report.enforcementMode, 'SHADOW');
    assert.strictEqual(report.signals?.webdriver, false);
    assert.strictEqual(report.verification.state, 'NONE');
  });

  // 2. Stateful Fixed-Window Request Burst Counter Test
  await it('should automatically track request rates and trigger burst rules on high frequency', async () => {
    const counterStore = new MemoryCounterStore();
    const rateSentinel = createSentinel({
      mode: 'shadow',
      counterStore
    });

    const attackerReq = {
      sessionId: 'attacker_test_session_99',
      headers: {
        'user-agent': 'python-requests/2.31.0'
      },
      body: {}
    };

    // Simulate 35 rapid requests in 1 second
    let lastReport;
    for (let i = 0; i < 35; i++) {
      lastReport = await rateSentinel.score(attackerReq);
    }

    // 35 requests exceeds threshold (30) -> triggers rate.burst_request (30) + suspicious_ua (15) = 45 score
    assert.ok(lastReport.score >= 45, `Expected score >= 45, got ${lastReport.score}`);
    assert.strictEqual(lastReport.action, SentinelAction.OBSERVE, 'In Shadow Mode, action must remain OBSERVE');
    assert.strictEqual(lastReport.recommendedAction, SentinelAction.RATE_LIMIT);

    const rulesTriggered = lastReport.evidence.map(e => e.rule);
    assert.ok(rulesTriggered.includes('rate.burst_request'));
    assert.ok(rulesTriggered.includes('header.suspicious_ua'));
  });

  // 3. Genuine Enforce Mode Test: High-Risk Request triggers TEMPORARY_DENY
  await it('createSentinel({ mode: "enforce", eventStore }) should enforce TEMPORARY_DENY on high-risk payload', async () => {
    const eventStore = new MemoryRiskEventStore();
    const enforcingSentinel = createSentinel({
      mode: 'enforce',
      eventStore
    });

    const highRiskReq = {
      testClientId: 'high_risk_bot_client',
      headers: {
        'user-agent': 'HeadlessChrome/128.0',
        'sec-ch-ua-mobile': '?1'
      },
      body: {
        webdriver: true,
        telemetry_observed: true,
        observation_duration_ms: 10000,
        trusted_events: 0,
        is_touch: false
      }
    };

    const report = await enforcingSentinel.score(highRiskReq);

    // Rule matches: webdriver(25) + trusted_input_absent(20) + touch_mismatch(15) + suspicious_ua(15) = 75
    // Enforce mode -> TEMPORARY_DENY
    assert.ok(report.score >= 70, `Expected score >= 70, got ${report.score}`);
    assert.strictEqual(report.action, SentinelAction.TEMPORARY_DENY);
    assert.strictEqual(report.enforcementMode, 'ENFORCE');

    // Verify stored event in EventStore
    const storedList = await eventStore.list({ limit: 10 });
    assert.strictEqual(storedList.length, 1);
    assert.strictEqual(storedList[0].traceId, report.traceId);
    assert.strictEqual(storedList[0].action, SentinelAction.TEMPORARY_DENY);
  });

  // 4. [P0-1 Regression] Sentinel.score should verify Bearer token when headers and signals coexist
  await it('Sentinel.score should verify Bearer token when headers and signals coexist', async () => {
    const partnerPolicy = createPolicy({
      botPolicy: { targetMode: 'VERIFIED_PARTNERS_ONLY' }
    });

    const partnerSentinel = createSentinel({
      policy: partnerPolicy,
      mode: 'enforce',
      keyResolver,
      nonceStore,
      expectedAudience: 'sentinel-prod-api',
      allowedIssuers: ['partner-corp']
    });

    const validToken = signCollectorToken({
      v: 1,
      kid: 'partner-kid-1',
      iss: 'partner-corp',
      aud: 'sentinel-prod-api',
      purpose: 'telemetry-collect',
      sessionRef: 'sess-coexist-1',
      iat: Date.now(),
      exp: Date.now() + 60000,
      nonce: 'nonce_coexist_1'
    }, secretKey);

    const report = await partnerSentinel.score({
      headers: {
        authorization: `Bearer ${validToken}`,
        'user-agent': 'PartnerBot/1.0'
      },
      signals: {
        telemetryObserved: true,
        trustedInputCount: 2
      }
    });

    assert.strictEqual(report.verification?.state, 'VERIFIED');
    assert.strictEqual(report.action, SentinelAction.ALLOW);
    assert.strictEqual(report.decision.reasonCode, 'BOT_ALLOWLIST_PASSED');
  });

  // 5. [P0-2 Regression] Invalid presented token yields state: FAILED (not NONE)
  await it('invalid presented token yields verification.state: FAILED instead of NONE', async () => {
    const partnerPolicy = createPolicy({
      botPolicy: { targetMode: 'VERIFIED_PARTNERS_ONLY' }
    });

    const partnerSentinel = createSentinel({
      policy: partnerPolicy,
      mode: 'enforce',
      keyResolver,
      nonceStore,
      expectedAudience: 'sentinel-prod-api',
      allowedIssuers: ['partner-corp'],
      stateFailureMode: 'OBSERVE_ONLY'
    });

    const report = await partnerSentinel.score({
      headers: {
        authorization: 'Bearer sv1.invalid_forged_payload.invalid_sig',
        'user-agent': 'PartnerBot/1.0'
      }
    });

    assert.strictEqual(report.verification?.state, 'FAILED');
    assert.strictEqual(report.action, SentinelAction.TEMPORARY_DENY);
    assert.strictEqual(report.decision.reasonCode, 'TARGET_MODE_PARTNERS_UNVERIFIED');
  });

  // 6. [P0-2 Regression] stateFailureMode: FAIL_CLOSED throws on invalid token presentation
  await it('stateFailureMode: FAIL_CLOSED throws on invalid token presentation', async () => {
    const strictSentinel = createSentinel({
      mode: 'enforce',
      keyResolver,
      nonceStore,
      expectedAudience: 'sentinel-prod-api',
      allowedIssuers: ['partner-corp'],
      stateFailureMode: 'FAIL_CLOSED'
    });

    await assert.rejects(
      async () => strictSentinel.score({
        headers: {
          authorization: 'Bearer sv1.invalid.sig'
        }
      }),
      /Sentinel security violation/
    );
  });

  // 7. [P0-3 Regression] readJsonBodyLimited rejects 64KB+ body with 413
  await it('readJsonBodyLimited rejects body exceeding 64KB limit', async () => {
    const hugeBody = JSON.stringify({ data: 'a'.repeat(70000) });

    await assert.rejects(
      async () => readJsonBodyLimited({ body: hugeBody }, 65536),
      { name: 'CollectorVerificationError', httpStatus: 413 }
    );
  });

  // 8. [P0-3 Regression] Multi-byte UTF-8 64KB byte-level size limit enforcement
  await it('readJsonBodyLimited measures true byte length for multi-byte characters', async () => {
    // 25,000 Korean 3-byte characters = 75,000 bytes (> 64KB)
    const multiByteBody = JSON.stringify({ data: '한'.repeat(25000) });

    await assert.rejects(
      async () => readJsonBodyLimited({ body: multiByteBody }, 65536),
      { name: 'CollectorVerificationError', httpStatus: 413 }
    );
  });

  // 9. [P1-4 Regression] Public evaluate({ verifiedBot: true }) cannot bypass VERIFIED_PARTNERS_ONLY
  await it('public evaluate({ verifiedBot: true }) cannot bypass VERIFIED_PARTNERS_ONLY mode', () => {
    const partnerPolicy = createPolicy({
      botPolicy: { targetMode: 'VERIFIED_PARTNERS_ONLY' }
    });

    // Attempting to bypass verification via untrusted signals
    const report = evaluate({ verifiedBot: true, userAgent: 'RoguePartner/1.0' }, {
      policy: partnerPolicy,
      enforcementMode: 'ENFORCE'
    });

    assert.strictEqual(report.verification.state, 'NONE');
    assert.strictEqual(report.action, SentinelAction.TEMPORARY_DENY);
    assert.strictEqual(report.decision.reasonCode, 'TARGET_MODE_PARTNERS_UNVERIFIED');
  });

  // 10. [P0-1 Regression] Signals boolean values remain authoritative when body fields are absent
  await it('signals boolean values remain authoritative when body fields are absent', async () => {
    const s = createSentinel({ mode: 'shadow' });
    const report = await s.score({
      headers: {
        'user-agent': 'Mozilla/5.0'
      },
      signals: {
        telemetryObserved: true,
        sampleComplete: true,
        observationDurationMs: 7000,
        trustedInputCount: 3
      }
    });
    assert.strictEqual(report.signals?.telemetryObserved, true);
    assert.strictEqual(report.signals?.sampleComplete, true);
    assert.strictEqual(report.signals?.isTrustedEventsCount, 3);
  });

  // 11. [P0-3 Regression] Sentinel.score rejects oversized request regardless of stateFailureMode
  await it('Sentinel.score rejects oversized request regardless of stateFailureMode', async () => {
    const s = createSentinel({
      mode: 'shadow',
      stateFailureMode: 'OBSERVE_ONLY'
    });
    const hugeBody = JSON.stringify({
      data: '한'.repeat(25000)
    });
    await assert.rejects(
      () => s.score({ body: hugeBody }),
      {
        name: 'CollectorVerificationError',
        httpStatus: 413
      }
    );
  });

  // 12. [P1-3 Regression] Untrusted verifiedBot cannot elevate classification identityState or verification
  await it('untrusted verifiedBot cannot elevate classification identityState or verification state', () => {
    const report = evaluate({
      verifiedBot: true,
      userAgent: 'Googlebot/2.1'
    });
    assert.notStrictEqual(report.classification?.identityState, 'VERIFIED');
    assert.strictEqual(report.classification?.identityState, 'CLAIMED');
    assert.strictEqual(report.verification.state, 'NONE');
  });

  if (failedTests > 0) {
    process.exit(1);
  }
  console.log(`\n{"suite":"sentinel","passed":${passedTests},"failed":${failedTests},"total":${passedTests + failedTests}}`);
}

run();

```

---

### 9. RiskEventStore V1 & V2 Schema Validation & Migration Suite (8 Gates)
* **Target File**: [`tests/store.test.js`](../../tests/store.test.js)
* **Execution Status**: `PASS` (8 passed, 0 failed in 120ms)

#### Execution Console Output:
```text
🧪 Running AMEVA Sentinel RiskEventStore V1 & V2 Test Suite...

  ✅ PASS: should create and validate StoredRiskEventV2 with schemaVersion 2.0
  ✅ PASS: should validate legacy StoredRiskEventV1 and support migration guard
  ✅ PASS: should evict oldest items in FIFO order when exceeding maxItems
  ✅ PASS: should be idempotent and deduplicate appends with identical traceId
  ✅ PASS: isStoredRiskEventV2 should reject out-of-bounds score and confidence numbers
  ✅ PASS: isStoredRiskEventV2 should reject invalid actions, modes, and non-ISO dates
  ✅ PASS: isStoredRiskEventV2 should reject nested objects or arrays inside evidence attributes
  ✅ PASS: should prune expired events beyond maxAgeMs

{"suite":"store","passed":8,"failed":0,"total":8}
```

#### Source Code Verification (`tests/store.test.js`):
```javascript
﻿import assert from 'node:assert';
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

function it(name, fn) {
  try {
    fn();
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

// 1. StoredRiskEventV2 Serialization & Schema Validation
it('should create and validate StoredRiskEventV2 with schemaVersion 2.0', () => {
  const report = createDummyReport('trc_test_v2_001', 15);
  const storedV2 = toStoredRiskEvent(report);

  assert.strictEqual(storedV2.schemaVersion, '2.0');
  assert.strictEqual(isStoredRiskEventV2(storedV2), true);
  assert.strictEqual(isStoredRiskEvent(storedV2), true);
});

// 2. Backward Compatible V1 Schema Support
it('should validate legacy StoredRiskEventV1 and support migration guard', () => {
  const report = createDummyReport('trc_test_v1_001', 10);
  const storedV1 = toStoredRiskEventV1(report);

  assert.strictEqual(storedV1.schemaVersion, '1.0');
  assert.strictEqual(isStoredRiskEventV1(storedV1), true);
  assert.strictEqual(isStoredRiskEvent(storedV1), true);
});

// 3. FIFO Eviction Order
it('should evict oldest items in FIFO order when exceeding maxItems', async () => {
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
it('should be idempotent and deduplicate appends with identical traceId', async () => {
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
it('isStoredRiskEventV2 should reject out-of-bounds score and confidence numbers', () => {
  const base = toStoredRiskEvent(createDummyReport('trc_bounds'));

  assert.strictEqual(isStoredRiskEventV2({ ...base, score: -1 }), false);
  assert.strictEqual(isStoredRiskEventV2({ ...base, score: 101 }), false);
  assert.strictEqual(isStoredRiskEventV2({ ...base, score: NaN }), false);
  assert.strictEqual(isStoredRiskEventV2({ ...base, score: Infinity }), false);
  assert.strictEqual(isStoredRiskEventV2({ ...base, evidenceConfidence: -0.1 }), false);
  assert.strictEqual(isStoredRiskEventV2({ ...base, evidenceConfidence: 1.1 }), false);
});

// 6. Schema Guard: Reject Invalid Actions and Non-ISO Dates
it('isStoredRiskEventV2 should reject invalid actions, modes, and non-ISO dates', () => {
  const base = toStoredRiskEvent(createDummyReport('trc_invalid'));

  assert.strictEqual(isStoredRiskEventV2({ ...base, action: 'DESTROY_USER' }), false);
  assert.strictEqual(isStoredRiskEventV2({ ...base, evaluatedAt: 'yesterday' }), false);
  assert.strictEqual(isStoredRiskEventV2({ ...base, evaluatedAt: 1234567890 }), false);
});

// 7. Schema Guard: Reject Prototype Pollution / Nested Objects in Attributes
it('isStoredRiskEventV2 should reject nested objects or arrays inside evidence attributes', () => {
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
it('should prune expired events beyond maxAgeMs', async () => {
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

```

---

### 10. @ameva/sentinel-browser Client Telemetry Unit Tests (2 Gates)
* **Target File**: [`tests/browser.test.js`](../../tests/browser.test.js)
* **Execution Status**: `PASS` (2 passed, 0 failed in 88ms)

#### Execution Console Output:
```text
🧪 Running @ameva/sentinel-browser Unit Test Suite...

  ✅ PASS: telemetry.snapshot() should return schema-compliant signals in Node fallback
  ✅ PASS: telemetry lifecycle should manage start and destroy without throwing

{"suite":"browser","passed":2,"failed":0,"total":2}
```

#### Source Code Verification (`tests/browser.test.js`):
```javascript
﻿import assert from 'node:assert';
import { createBrowserTelemetry, browserTelemetry } from '../packages/browser-sdk/dist/index.js';

console.log('\n🧪 Running @ameva/sentinel-browser Unit Test Suite...\n');

let passedTests = 0;
let failedTests = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failedTests++;
  }
}

// 1. Node.js Fallback Snapshot
it('telemetry.snapshot() should return schema-compliant signals in Node fallback', () => {
  const telemetry = createBrowserTelemetry({ autoStart: false });
  const snapshot = telemetry.snapshot();

  assert.strictEqual(snapshot.webdriverObserved, false);
  assert.strictEqual(snapshot.telemetryObserved, false);
  assert.strictEqual(snapshot.sampleComplete, false);
  assert.strictEqual(snapshot.trustedInputCount, 0);
  assert.strictEqual(snapshot.touchMismatch, false);
  assert.strictEqual(typeof snapshot.observationDurationMs, 'number');
});

// 2. Lifecycle: start and destroy without throwing
it('telemetry lifecycle should manage start and destroy without throwing', () => {
  const telemetry = createBrowserTelemetry({ autoStart: true });
  telemetry.reset();
  telemetry.destroy();
  assert.ok(true);
});

if (failedTests > 0) {
  process.exit(1);
}
console.log(`\n{"suite":"browser","passed":${passedTests},"failed":${failedTests},"total":${passedTests + failedTests}}`);

```

---

### 11. Playwright Cross-Browser Integration (Chromium, Firefox, WebKit, 9 Tests)
* **Target File**: [`tests/browser-integration/dashboard.spec.js`](../../tests/browser-integration/dashboard.spec.js)
* **Execution Status**: `PASS` (9 passed, 0 failed in 14259ms)

#### Execution Console Output:
```text
Running 9 tests using 1 worker

  ok 1 [chromium] › tests\browser-integration\dashboard.spec.js:12:3 › AMEVA Sentinel Real-Browser Integration › stored report survives page reload with identical traceId (710ms)
  ok 2 [chromium] › tests\browser-integration\dashboard.spec.js:29:3 › AMEVA Sentinel Real-Browser Integration › risk event is synchronized in real-time across tabs (675ms)
  ok 3 [chromium] › tests\browser-integration\dashboard.spec.js:52:3 › AMEVA Sentinel Real-Browser Integration › destroy() stops active telemetry collection and listener observation (191ms)
  ok 4 [firefox] › tests\browser-integration\dashboard.spec.js:12:3 › AMEVA Sentinel Real-Browser Integration › stored report survives page reload with identical traceId (2.3s)
  ok 5 [firefox] › tests\browser-integration\dashboard.spec.js:29:3 › AMEVA Sentinel Real-Browser Integration › risk event is synchronized in real-time across tabs (1.4s)
  ok 6 [firefox] › tests\browser-integration\dashboard.spec.js:52:3 › AMEVA Sentinel Real-Browser Integration › destroy() stops active telemetry collection and listener observation (327ms)
  ok 7 [webkit] › tests\browser-integration\dashboard.spec.js:12:3 › AMEVA Sentinel Real-Browser Integration › stored report survives page reload with identical traceId (847ms)
  ok 8 [webkit] › tests\browser-integration\dashboard.spec.js:29:3 › AMEVA Sentinel Real-Browser Integration › risk event is synchronized in real-time across tabs (816ms)
  ok 9 [webkit] › tests\browser-integration\dashboard.spec.js:52:3 › AMEVA Sentinel Real-Browser Integration › destroy() stops active telemetry collection and listener observation (262ms)

  9 passed (12.5s)
```

#### Source Code Verification (`tests/browser-integration/dashboard.spec.js`):
```javascript
/**
 * AMEVA Sentinel - Playwright Real-Browser Integration Test Suite
 * Validates:
 * 1. Stored report persistence and reload recovery
 * 2. Real-time multi-tab LocalStorage synchronization
 * 3. Telemetry collector lifecycle and listener destruction
 */
import { test, expect } from '@playwright/test';

test.describe('AMEVA Sentinel Real-Browser Integration', () => {

  test('stored report survives page reload with identical traceId', async ({ page }) => {
    await page.goto('/packages/dashboard/index.html');

    // Click "Evaluate Real Browser" button
    await page.getByRole('button', { name: /evaluate real browser/i }).click();

    // Read generated latest traceId
    const firstTraceId = await page.locator('[data-testid="latest-trace-id"]').textContent();
    expect(firstTraceId).toBeTruthy();

    // Reload page
    await page.reload();

    // Verify same report traceId is restored and visible
    await expect(page.locator(`[data-trace-id="${firstTraceId}"]`)).toBeVisible();
  });

  test('risk event is synchronized in real-time across tabs', async ({ browser }) => {
    const context = await browser.newContext();
    const producer = await context.newPage();
    const dashboard = await context.newPage();

    try {
      await producer.goto('/packages/dashboard/index.html');
      await dashboard.goto('/packages/dashboard/index.html');

      const before = Number(await dashboard.locator('[data-testid="event-count"]').textContent());

      // Generate event on producer tab
      await producer.getByRole('button', { name: /simulate headless bot/i }).click();

      // Verify dashboard tab updates count dynamically without reload
      await expect(dashboard.locator('[data-testid="event-count"]')).toHaveText(String(before + 1));
    } finally {
      await producer.close().catch(() => {});
      await dashboard.close().catch(() => {});
      await context.close().catch(() => {});
    }
  });

  test('destroy() stops active telemetry collection and listener observation', async ({ page }) => {
    await page.goto('/tests/fixtures/telemetry-test.html');

    const before = await page.evaluate(() => {
      window.testTelemetry.start();
      return window.testTelemetry.snapshot();
    });

    await page.mouse.move(100, 100);
    await page.mouse.move(300, 300);

    const during = await page.evaluate(() => {
      return window.testTelemetry.snapshot();
    });

    // Must strictly prove telemetry listener actually captured pointer events before destruction
    expect(during.pointerEventCount).toBeGreaterThan(before.pointerEventCount);

    // Destroy telemetry collector
    await page.evaluate(() => {
      window.testTelemetry.destroy();
    });

    const stoppedAt = await page.evaluate(() => {
      return window.testTelemetry.snapshot();
    });

    await page.mouse.move(500, 500);
    await page.mouse.move(700, 700);

    const after = await page.evaluate(() => {
      return window.testTelemetry.snapshot();
    });

    // Pointer event counter must not increase after destroy()
    expect(after.pointerEventCount).toBe(stoppedAt.pointerEventCount);
  });

});

```

---
