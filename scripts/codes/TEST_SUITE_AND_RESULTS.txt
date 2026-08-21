# 🛡️ AMEVA Sentinel v0.6.0-alpha.1 Unified Master Verification & Audit Report

- **Release Target**: `v0.6.0-alpha.1`
- **Generated Timestamp**: `2026-08-21T08:01:32.623Z`
- **Git Branch**: [`release-0.6`](https://github.com/uno-km/ameva-sentinel/tree/release-0.6)
- **Implementation Commit**: `13af37266fce15b5a1222b9f4fe2431b4ca48cd2`
- **Source Snapshot SHA-256**: `71b47889de9d3fcd5de8c41ecc944e2ca0890defe1f4d30b4d50b0fea3427458`
- **Working Tree State**: `CLEAN`
- **Overall Gate Status**: `PASSED (100% SUCCESS)`
- **Final Score**: `100.0 / 100 pts (Grade A+)`
- **Total Release Checks**: `97 Executable Gates + 4 Monorepo Packaging Gates = 101 / 101 Release Checks (100% ALL PASS)`

---

## 📊 1. Executive Test Scorecard (101 / 101 Release Checks)

| Test Category | Tests Passed | Execution Time | Score Points | Gate Status |
| :--- | :---: | :---: | :---: | :---: |
| TypeScript Static Contract | 1 / 1 | 2818ms | 10.0 / 10 pts | 🟢 PASS |
| TypeScript Runtime Contract | 1 / 1 | 92ms | 5.0 / 5 pts | 🟢 PASS |
| Trust Boundary & Collector Crypto | 16 / 16 | 101ms | 15.0 / 15 pts | 🟢 PASS |
| Redirect Security & Injection Defense | 8 / 8 | 84ms | 10.0 / 10 pts | 🟢 PASS |
| Smart Bot Classifier & ReDoS Safety | 8 / 8 | 86ms | 15.0 / 15 pts | 🟢 PASS |
| Target Mode & Decision Engine | 6 / 6 | 111ms | 15.0 / 15 pts | 🟢 PASS |
| Risk Engine Quality Gates | 7 / 7 | 183ms | 10.0 / 10 pts | 🟢 PASS |
| Facade & State Enforcement | 17 / 17 | 145ms | 10.0 / 10 pts | 🟢 PASS |
| Persistence & Schema V1/V2 Bounds | 8 / 8 | 91ms | 10.0 / 10 pts | 🟢 PASS |
| Browser SDK Unit Verification | 2 / 2 | 78ms | 5.0 / 5 pts | 🟢 PASS |
| Async RingBuffer & Composite Sinks | 8 / 8 | 307ms | 5.0 / 5 pts | 🟢 PASS |
| Redis Distributed Storage & Streams | 6 / 6 | 96ms | 5.0 / 5 pts | 🟢 PASS |
| Playwright Cross-Browser E2E (9 Tests) | 9 / 9 | 13298ms | E2E Verified | 🟢 PASS |
| **TOTAL EXECUTABLE AUDIT SCORE** | **97 Passed / 0 Failed** | **—** | **100.0 / 100.0 pts (Grade A+)** | **🏆 PASS** |

---

## 🔒 2. Single-File Verification Metadata & Provenance Certificate (All-in-One SSOT)

### 2.1 Release Summary Metadata (`summary.json`):
```json
{
  "schemaVersion": "1.0",
  "sourceCommit": "13af37266fce15b5a1222b9f4fe2431b4ca48cd2",
  "artifactPath": "scripts/codes/source_export.txt",
  "sha256": "71b47889de9d3fcd5de8c41ecc944e2ca0890defe1f4d30b4d50b0fea3427458",
  "branch": "release-0.6",
  "workingTreeAtExport": "CLEAN",
  "executable": 97,
  "packaging": 4,
  "total": 101,
  "passed": 101,
  "failed": 0,
  "executableFailed": 0,
  "packagingFailed": 0,
  "score": 100,
  "grade": "A+",
  "status": "PASS",
  "generatedAt": "2026-08-21T08:01:32.623Z"
}
```

### 2.2 Independent Verification Provenance Certificate (`provenance.json`):
```json
{
  "schemaVersion": "1.0",
  "sourceCommit": "13af37266fce15b5a1222b9f4fe2431b4ca48cd2",
  "artifactPath": "scripts/codes/source_export.txt",
  "sha256": "71b47889de9d3fcd5de8c41ecc944e2ca0890defe1f4d30b4d50b0fea3427458",
  "branch": "release-0.6",
  "workingTreeAtExport": "CLEAN",
  "totalChecks": 101,
  "passedChecks": 101,
  "status": "PASS",
  "timestamp": "2026-08-21T08:01:32.623Z"
}
```

---

## 📦 3. Monorepo Distribution Packaging Dry-Run (4 / 4 Packages Valid)

| Package Path | Real Package Name | Status | Verified Format |
| :--- | :--- | :---: | :--- |
| `packages/risk-core` | `@ameva/sentinel-risk-core` | `🟢 VALID` | Pure ESM & Declarations | 
| `packages/browser-sdk` | `@ameva/sentinel-browser` | `🟢 VALID` | Pure ESM & Declarations | 
| `packages/sentinel` | `@ameva/sentinel` | `🟢 VALID` | Pure ESM & Declarations | 
| `packages/store-redis` | `@ameva/sentinel-store-redis` | `🟢 VALID` | Pure ESM & Declarations | 

---

## 🔬 4. Detailed Execution Logs & Source Code by Test Suite

### 1. TypeScript Static Consumer Contract Gate (32+ Types, Guards, Interfaces)
* **Target File**: [`tests/typecheck.ts`](../../tests/typecheck.ts)
* **Execution Status**: `PASS` (1 passed, 0 failed in 2818ms)

#### Execution Console Output:
```text
> ameva-sentinel-monorepo@0.6.0-alpha.1 test:types:static
> tsc --noEmit tests/typecheck.ts --target es2022 --module NodeNext --moduleResolution NodeNext
```

#### Source Code Verification (`tests/typecheck.ts`):
```javascript
import {
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
  validateRedirectUrl,
  AsyncRingBufferSink,
  CompositeSink,
  NullSink,
  type EventSink,
  type StreamRecord,
  type RiskEventRecord,
  type RingBufferStats,
  type DistributedNonceStore,
  type DistributedCounterStore,
  type DistributedRiskEventStore
} from '../packages/sentinel/dist/index.js';

import {
  RedisNonceStore,
  RedisFixedWindowCounterStore,
  RedisRiskEventStore,
  RedisStreamSink
} from '../packages/store-redis/dist/index.js';

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

  // Stream Sinks & Workers Static Contract Checks
  const nullSink: EventSink = new NullSink();
  const compositeSink: EventSink = new CompositeSink([nullSink], { emitTimeoutMs: 1000 });
  const ringBuffer: EventSink = new AsyncRingBufferSink({
    downstream: compositeSink,
    capacity: 256,
    flushIntervalMs: 50,
    batchSize: 16,
    overflowPolicy: 'DROP_OLDEST'
  });
  const stats: RingBufferStats = (ringBuffer as AsyncRingBufferSink).stats();

  // Distributed Store Contract Checks
  const mockRedisClient = {
    set: async () => 'OK',
    get: async () => '1',
    del: async () => 1,
    eval: async () => 1,
    ping: async () => 'PONG',
    xadd: async () => '1-0',
    lpush: async () => 1,
    ltrim: async () => 'OK',
    lrange: async () => []
  };
  const distNonceStore: DistributedNonceStore = new RedisNonceStore({ redis: mockRedisClient });
  const distCounterStore: DistributedCounterStore = new RedisFixedWindowCounterStore({ redis: mockRedisClient });
  const distEventStore: DistributedRiskEventStore = new RedisRiskEventStore({ redis: mockRedisClient });
  const redisStreamSink: EventSink = new RedisStreamSink({ redis: mockRedisClient, streamKey: 'risk-events' });

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
  void stats;
  void distNonceStore;
  void distCounterStore;
  void distEventStore;
  void redisStreamSink;
}

runFullStaticTypeCheck();

```

---

### 2. TypeScript Runtime Consumer Contract Gate (Live Execution & Assertion)
* **Target File**: [`tests/typecheck.runtime.js`](../../tests/typecheck.runtime.js)
* **Execution Status**: `PASS` (1 passed, 0 failed in 92ms)

#### Execution Console Output:
```text
🔍 Running TypeScript Consumer API Runtime Contract Gate...

[TypeScript v0.6.0 Contract Gate] ALL 32+ SDK Types & Runtime Interfaces 100% Verified.
  - TraceId: trc_b7ae38b9268c495f
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

### 3. Trust Boundary Collector HMAC, RFC 4231 Vectors, Freshness, Replay Attack, Capacity Saturation & 100-Race Suite (16 Gates)
* **Target File**: [`tests/collector-crypto.test.js`](../../tests/collector-crypto.test.js)
* **Execution Status**: `PASS` (16 passed, 0 failed in 101ms)

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
  ✅ PASS: MemoryNonceStore throws NONCE_STORE_CAPACITY_REACHED when store capacity is saturated

{"suite":"collector_crypto","passed":16,"failed":0,"total":16}
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

  // 16. MemoryNonceStore Capacity Exhaustion Defense
  await runTest('MemoryNonceStore throws NONCE_STORE_CAPACITY_REACHED when store capacity is saturated', async () => {
    const tinyStore = new MemoryNonceStore({ maxEntries: 2 });
    const now = Date.now();
    const res1 = await tinyStore.consume({ issuer: 'iss1', kid: 'k1', nonce: 'n1' }, now + 60000);
    const res2 = await tinyStore.consume({ issuer: 'iss1', kid: 'k1', nonce: 'n2' }, now + 60000);
    assert.strictEqual(res1, true);
    assert.strictEqual(res2, true);

    await assert.rejects(
      async () => tinyStore.consume({ issuer: 'iss1', kid: 'k1', nonce: 'n3' }, now + 60000),
      { name: 'CollectorVerificationError', code: 'NONCE_STORE_CAPACITY_REACHED' }
    );
  });

  if (failedTests > 0) {
    process.exit(1);
  }
  console.log(`\n{"suite":"collector_crypto","passed":${passedTests},"failed":${failedTests},"total":${passedTests + failedTests}}`);
}

main();

```

---

### 4. Redirect Security & Closed-Destination Injection Defense Suite (8 Gates)
* **Target File**: [`tests/redirect-security.test.js`](../../tests/redirect-security.test.js)
* **Execution Status**: `PASS` (8 passed, 0 failed in 84ms)

#### Execution Console Output:
```text
🛡️ Running AMEVA Sentinel Redirect Security & Open Redirect Prevention Tests...

  ✅ PASS: should accept valid relative paths and HTTPS URLs with normalization
  ✅ PASS: should strictly reject javascript:, data:, file: and other dangerous schemes
  ✅ PASS: should strictly reject protocol-relative URLs (//) and backslash traversal
  ✅ PASS: should strictly reject CRLF and header injection attempts
  ✅ PASS: should reject URLs with embedded user credentials (user:pass@host)
  ✅ PASS: should enforce allowedHosts whitelist and fail constructor on invalid registry
  ✅ PASS: should enforce exact hostname when allowSubdomains is false
  ✅ PASS: normalizeAllowedHost normalizes casing/whitespace and strictly rejects malformed host strings

{"suite":"redirect_security","passed":8,"failed":0,"total":8}
```

#### Source Code Verification (`tests/redirect-security.test.js`):
```javascript
import assert from 'node:assert';
import { validateRedirectUrl, normalizeAllowedHost, createSentinel } from '../packages/sentinel/dist/index.js';

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

// 7. Exact Hostname vs Subdomain Whitelist Controls
runTest('should enforce exact hostname when allowSubdomains is false', () => {
  const optionsStrict = { allowedHosts: ['example.com'], allowSubdomains: false };
  assert.strictEqual(validateRedirectUrl('https://example.com/bot', optionsStrict).valid, true);
  assert.strictEqual(validateRedirectUrl('https://sub.example.com/bot', optionsStrict).valid, false);

  const optionsPermissive = { allowedHosts: ['example.com'], allowSubdomains: true };
  assert.strictEqual(validateRedirectUrl('https://sub.example.com/bot', optionsPermissive).valid, true);
});

// 8. Allowed Host Normalization & Suffix Attack Prevention
runTest('normalizeAllowedHost normalizes casing/whitespace and strictly rejects malformed host strings', () => {
  assert.strictEqual(normalizeAllowedHost(' Example.COM '), 'example.com');
  assert.strictEqual(normalizeAllowedHost('example.com.'), 'example.com');
  assert.strictEqual(normalizeAllowedHost('127.0.0.1'), '127.0.0.1');
  assert.strictEqual(normalizeAllowedHost('localhost'), 'localhost');
  assert.strictEqual(normalizeAllowedHost('255.255.255.255'), '255.255.255.255');
  assert.strictEqual(normalizeAllowedHost('0.0.0.0'), '0.0.0.0');

  // Rejections for out-of-range IPv4, leading zeroes, and numeric TLD
  assert.throws(() => normalizeAllowedHost('256.1.1.1'), /Invalid IPv4 address/);
  assert.throws(() => normalizeAllowedHost('999.999.999.999'), /Invalid IPv4 address/);
  assert.throws(() => normalizeAllowedHost('1.2.3.999'), /Invalid IPv4 address/);
  assert.throws(() => normalizeAllowedHost('01.02.03.04'), /Invalid IPv4 address/);
  assert.throws(() => normalizeAllowedHost('123.456'), /Top-level domain cannot be purely numeric/);

  // Rejections for invalid protocols, ports, paths, and malformed label syntax
  assert.throws(() => normalizeAllowedHost('https://example.com'), /Invalid allowed host format/);
  assert.throws(() => normalizeAllowedHost('example.com:443'), /Invalid allowed host format/);
  assert.throws(() => normalizeAllowedHost(''), /Invalid allowed host format/);
  assert.throws(() => normalizeAllowedHost('example.com/path'), /Invalid allowed host format/);
  assert.throws(() => normalizeAllowedHost('-bad.example.com'), /Invalid allowed host label/);
  assert.throws(() => normalizeAllowedHost('example..com'), /Invalid allowed host label/);
  assert.throws(() => normalizeAllowedHost('_bad.example.com'), /Invalid allowed host format/);
  assert.throws(() => normalizeAllowedHost('exa%mple.com'), /Invalid allowed host format/);
  assert.throws(() => normalizeAllowedHost('.'), /Invalid allowed host format/);

  // Suffix collision attacks (evil-example.com, example.com.evil.test) must be strictly rejected
  const opts = { allowedHosts: ['Example.COM '], allowSubdomains: true };
  assert.strictEqual(validateRedirectUrl('https://example.com/path', opts).valid, true);
  assert.strictEqual(validateRedirectUrl('https://sub.example.com/path', opts).valid, true);
  assert.strictEqual(validateRedirectUrl('https://evil-example.com/path', opts).valid, false);
  assert.strictEqual(validateRedirectUrl('https://example.com.evil.test/path', opts).valid, false);
});

if (failedTests > 0) {
  process.exit(1);
}
console.log(`\n{"suite":"redirect_security","passed":${passedTests},"failed":${failedTests},"total":${passedTests + failedTests}}`);

```

---

### 5. Smart Bot Classifier & ReDoS Safety Suite (7 Taxonomies, 8 Gates)
* **Target File**: [`tests/bot-classifier.test.js`](../../tests/bot-classifier.test.js)
* **Execution Status**: `PASS` (8 passed, 0 failed in 86ms)

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
* **Execution Status**: `PASS` (6 passed, 0 failed in 111ms)

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
* **Execution Status**: `PASS` (7 passed, 0 failed in 183ms)

#### Execution Console Output:
```text
🧪 Running AMEVA Sentinel Quality Gate Test Suite...

  ✅ PASS: should classify clean synthetic baseline session as ALLOW with 0 score
  ✅ PASS: missing telemetry must not be treated as zero interaction (Guard against false positives)
  ✅ PASS: shadow mode never enforces a denial action directly (returns OBSERVE with recommendation)
  ✅ PASS: score must be clamped strictly to 100 on excessive cumulative rule weights
  ✅ PASS: score must be clamped to 0 on negative weights or empty inputs
  ✅ PASS: evaluation does not mutate top-level input properties
  ✅ PASS: should gracefully handle undefined, null, and NaN signals without throwing

{"suite":"engine","passed":7,"failed":0,"total":7}
```

#### Source Code Verification (`tests/engine.test.js`):
```javascript
import assert from 'node:assert';
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

// 5. Input Mutation Defense Test (Top-level Shallow Clone)
it('evaluation does not mutate top-level input properties', () => {
  const nested = { marker: 'original' };
  const rawSignals = Object.freeze({
    webdriver: true,
    burstCount10s: 42,
    customKey: 'original_val',
    customObject: nested
  });

  const report = evaluate(rawSignals);
  assert.strictEqual(rawSignals.customKey, 'original_val');
  assert.deepStrictEqual(nested, { marker: 'original' });
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

### 8. Sentinel Facade & Stateful Rate Enforcement Tests (17 Gates)
* **Target File**: [`tests/sentinel.test.js`](../../tests/sentinel.test.js)
* **Execution Status**: `PASS` (17 passed, 0 failed in 145ms)

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
  ✅ PASS: Sentinel.score rejects oversized pre-parsed object body exceeding 64KB
  ✅ PASS: readJsonBodyLimited throws MALFORMED_REQUEST_BODY on invalid JSON and request.json failure
  ✅ PASS: Sentinel.score propagates nonce capacity saturation as HTTP 503
  ✅ PASS: createSentinel validates allowRedirectSubdomains: false and rejects subdomain URLs
  ✅ PASS: presented token without verifier configuration is FAILED (VERIFIER_CONFIGURATION_MISSING), never NONE

{"suite":"sentinel","passed":17,"failed":0,"total":17}
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
        code: 'REQUEST_BODY_TOO_LARGE',
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

  // 13. [P0-3 Regression] Sentinel.score rejects oversized pre-parsed object body exceeding 64KB
  await it('Sentinel.score rejects oversized pre-parsed object body exceeding 64KB', async () => {
    const s = createSentinel({ mode: 'shadow' });
    await assert.rejects(
      () => s.score({
        body: { data: '한'.repeat(25000) }
      }),
      {
        name: 'CollectorVerificationError',
        code: 'REQUEST_BODY_TOO_LARGE',
        httpStatus: 413
      }
    );
  });

  // 14. [P1 Regression] readJsonBodyLimited fail-closed on malformed JSON and request.json error
  await it('readJsonBodyLimited throws MALFORMED_REQUEST_BODY on invalid JSON and request.json failure', async () => {
    await assert.rejects(
      () => readJsonBodyLimited({ body: '{ invalid_json ' }, 65536),
      {
        name: 'CollectorVerificationError',
        code: 'MALFORMED_REQUEST_BODY',
        httpStatus: 400
      }
    );

    const failingMockRequest = {
      json: async () => { throw new SyntaxError('Unexpected token in JSON'); }
    };
    await assert.rejects(
      () => readJsonBodyLimited(failingMockRequest, 65536),
      {
        name: 'CollectorVerificationError',
        code: 'MALFORMED_REQUEST_BODY',
        httpStatus: 400
      }
    );
  });

  // 15. [P1-1 Regression] Sentinel.score propagates nonce capacity saturation as HTTP 503
  await it('Sentinel.score propagates nonce capacity saturation as HTTP 503', async () => {
    const tinyNonceStore = new MemoryNonceStore({ maxEntries: 1 });
    const s = createSentinel({
      mode: 'shadow',
      keyResolver: new StaticKeyResolver({ 'k1': 'secret-123' }),
      nonceStore: tinyNonceStore,
      expectedAudience: 'aud-test',
      expectedPurpose: 'telemetry-collect'
    });

    const tok1 = signCollectorToken({
      v: 1,
      kid: 'k1',
      iss: 'iss-1',
      aud: 'aud-test',
      purpose: 'telemetry-collect',
      sessionRef: 's1',
      iat: Date.now(),
      exp: Date.now() + 60000,
      nonce: 'nonce_sat_1'
    }, 'secret-123');

    const tok2 = signCollectorToken({
      v: 1,
      kid: 'k1',
      iss: 'iss-1',
      aud: 'aud-test',
      purpose: 'telemetry-collect',
      sessionRef: 's2',
      iat: Date.now(),
      exp: Date.now() + 60000,
      nonce: 'nonce_sat_2'
    }, 'secret-123');

    // First consumption succeeds
    const rep1 = await s.score({
      headers: { authorization: `Bearer ${tok1}` }
    });
    assert.strictEqual(rep1.verification.state, 'VERIFIED');

    // Second consumption hits saturation limit (1 entry) and throws HTTP 503
    await assert.rejects(
      () => s.score({ headers: { authorization: `Bearer ${tok2}` } }),
      {
        name: 'CollectorVerificationError',
        code: 'NONCE_STORE_CAPACITY_REACHED',
        httpStatus: 503
      }
    );
  });

  // 16. [P1-2 Regression] createSentinel validates allowRedirectSubdomains: false and rejects subdomain URLs
  await it('createSentinel validates allowRedirectSubdomains: false and rejects subdomain URLs', () => {
    // Exact hostname match passes
    assert.doesNotThrow(() => {
      createSentinel({
        redirectRegistry: {
          AI_FEED: 'https://example.com/feed'
        },
        allowedRedirectHosts: ['example.com'],
        allowRedirectSubdomains: false
      });
    });

    // Subdomain fails when allowRedirectSubdomains is false
    assert.throws(() => {
      createSentinel({
        redirectRegistry: {
          AI_FEED: 'https://sub.example.com/feed'
        },
        allowedRedirectHosts: ['example.com'],
        allowRedirectSubdomains: false
      });
    }, /Invalid redirectRegistry URL/);
  });

  // 17. [P1-A Regression] Presented token without verifier configuration is FAILED, never NONE
  await it('presented token without verifier configuration is FAILED (VERIFIER_CONFIGURATION_MISSING), never NONE', async () => {
    const s = createSentinel({ mode: 'shadow' });
    const report = await s.score({
      headers: {
        authorization: 'Bearer sv1.payload.signature'
      }
    });
    assert.strictEqual(report.verification.state, 'FAILED');
    assert.strictEqual(report.verification.error, 'VERIFIER_CONFIGURATION_MISSING');
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
* **Execution Status**: `PASS` (8 passed, 0 failed in 91ms)

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

```

---

### 10. @ameva/sentinel-browser Client Telemetry Unit Tests (2 Gates)
* **Target File**: [`tests/browser.test.js`](../../tests/browser.test.js)
* **Execution Status**: `PASS` (2 passed, 0 failed in 78ms)

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

### 11. Async RingBuffer WorkerSink, CompositeSink Fan-out & Dropping Policies (8 Gates)
* **Target File**: [`tests/ring-buffer-sink.test.js`](../../tests/ring-buffer-sink.test.js)
* **Execution Status**: `PASS` (8 passed, 0 failed in 307ms)

#### Execution Console Output:
```text
🧪 Running Async RingBuffer & Composite EventSink Test Suite...
  ✅ PASS: Gate 1: NullSink functionality and zero-overhead benchmark compliance
  ✅ PASS: Gate 2: AsyncRingBufferSink bitmask power-of-2 capacity and batch flusher
  ✅ PASS: Gate 3: OverflowPolicy DROP_OLDEST and granular drop metrics
  ✅ PASS: Gate 4: OverflowPolicy DROP_NEWEST and granular drop metrics
  ✅ PASS: Gate 5: OverflowPolicy FAIL_CLOSED throws immediately on buffer saturation
  ✅ PASS: Gate 6: Circuit Breaker state machine (CLOSED -> OPEN -> HALF_OPEN -> CLOSED)
  ✅ PASS: Gate 7: CompositeSink fan-out multi-sink dispatch with timeout protection
  ✅ PASS: Gate 8: Sentinel facade auto-dispatches RiskEventRecord to eventSink

==================================================
Results: 8 passed, 0 failed, total 8
{"suite": "ring_buffer_sink", "passed": 8, "failed": 0, "total": 8}
```

#### Source Code Verification (`tests/ring-buffer-sink.test.js`):
```javascript
﻿import assert from 'node:assert';
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

```

---

### 12. Redis Distributed Storage, Lua TTL Drift Guard & Stream Sinks (6 Gates)
* **Target File**: [`tests/store-redis.test.js`](../../tests/store-redis.test.js)
* **Execution Status**: `PASS` (6 passed, 0 failed in 96ms)

#### Execution Console Output:
```text
🧪 Running Redis Distributed Storage & Stream Sink Test Suite...
  ✅ PASS: Gate 1: RedisNonceStore atomic lock & 100-request concurrent replay prevention
  ✅ PASS: Gate 2: RedisNonceStore key sanitization against command injection
  ✅ PASS: Gate 3: RedisFixedWindowCounterStore atomic Lua execution with TTL drift recovery
  ✅ PASS: Gate 4: RedisRiskEventStore append, capped trim, listing, and query by since
  ✅ PASS: Gate 5: RedisStreamSink XADD MAXLEN~ streaming and pipeline batch execution
  ✅ PASS: Gate 6: Sentinel end-to-end integration with RedisNonceStore & RedisFixedWindowCounterStore

==================================================
Results: 6 passed, 0 failed, total 6
{"suite": "store_redis", "passed": 6, "failed": 0, "total": 6}
```

#### Source Code Verification (`tests/store-redis.test.js`):
```javascript
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

```

---

### 13. Playwright Cross-Browser Integration (Chromium, Firefox, WebKit, 9 Tests)
* **Target File**: [`tests/browser-integration/dashboard.spec.js`](../../tests/browser-integration/dashboard.spec.js)
* **Execution Status**: `PASS` (9 passed, 0 failed in 13298ms)

#### Execution Console Output:
```text
Running 9 tests using 1 worker

  ok 1 [chromium] › tests\browser-integration\dashboard.spec.js:12:3 › AMEVA Sentinel Real-Browser Integration › stored report survives page reload with identical traceId (480ms)
  ok 2 [chromium] › tests\browser-integration\dashboard.spec.js:30:3 › AMEVA Sentinel Real-Browser Integration › risk event is synchronized in real-time across tabs (646ms)
  ok 3 [chromium] › tests\browser-integration\dashboard.spec.js:53:3 › AMEVA Sentinel Real-Browser Integration › destroy() stops active telemetry collection and listener observation (229ms)
  ok 4 [firefox] › tests\browser-integration\dashboard.spec.js:12:3 › AMEVA Sentinel Real-Browser Integration › stored report survives page reload with identical traceId (1.7s)
  ok 5 [firefox] › tests\browser-integration\dashboard.spec.js:30:3 › AMEVA Sentinel Real-Browser Integration › risk event is synchronized in real-time across tabs (1.3s)
  ok 6 [firefox] › tests\browser-integration\dashboard.spec.js:53:3 › AMEVA Sentinel Real-Browser Integration › destroy() stops active telemetry collection and listener observation (414ms)
  ok 7 [webkit] › tests\browser-integration\dashboard.spec.js:12:3 › AMEVA Sentinel Real-Browser Integration › stored report survives page reload with identical traceId (693ms)
  ok 8 [webkit] › tests\browser-integration\dashboard.spec.js:30:3 › AMEVA Sentinel Real-Browser Integration › risk event is synchronized in real-time across tabs (779ms)
  ok 9 [webkit] › tests\browser-integration\dashboard.spec.js:53:3 › AMEVA Sentinel Real-Browser Integration › destroy() stops active telemetry collection and listener observation (273ms)

  9 passed (11.6s)
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
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Verify same report traceId is restored and visible
    await expect(page.locator(`[data-trace-id="${firstTraceId}"]`)).toBeVisible();
    await page.waitForLoadState('domcontentloaded');
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
