# 🛡️ AMEVA Sentinel

> **Privacy-first Security Observability Layer for Web Applications**  
> *AMEVA Sentinel v0.6.0-alpha.1 — Target Discrimination, Smart Bot Classifier & Closed-Destination Routing*

[![Official Documentation](https://img.shields.io/badge/docs-uno--km.vercel.app%2Fsentinel-004499?style=flat-square&logo=vercel)](https://uno-km.vercel.app/sentinel/)
[![npm package](https://img.shields.io/npm/v/@ameva/sentinel/alpha?style=flat-square&color=cb3837&logo=npm)](https://www.npmjs.com/package/@ameva/sentinel)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square)](LICENSE)
[![Release Gates](https://img.shields.io/badge/release%20checks-44%2F44%20passing%20(43%20tests%20%2B%203%20pkg%20dryruns)-16a34a?style=flat-square)](https://uno-km.vercel.app/sentinel/benchmarks.html)
[![Privacy](https://img.shields.io/badge/privacy-zero%20raw%20coordinates-10b981?style=flat-square)](https://uno-km.vercel.app/sentinel/)
[![Foundation](https://img.shields.io/badge/AOSF-Tier%201%20TLP-f59e0b?style=flat-square)](https://uno-km.vercel.app/docs/foundation/)

> [!NOTE]
> **Pre-release Notice**: The current release is an alpha prototype intended for local/shadow mode testing. Install explicitly with `npm install @ameva/sentinel@alpha @ameva/sentinel-browser@alpha @ameva/sentinel-risk-core@alpha`.  
> Complete interactive documentation & API reference: [https://uno-km.vercel.app/sentinel/](https://uno-km.vercel.app/sentinel/)

---

## 🎯 Canonical Mission

> **"웹 서비스에 들어오는 트래픽을 관측하고, 측정하고, 설명하고, 점수화한다."**  
> *(Observe, Measure, Explain, and Score incoming web traffic with privacy-by-design.)*

---

## 🏗️ Architecture & Single Source of Truth

```text
[Browser Interaction]
       │
       ▼
[@ameva/sentinel-browser] ──► Software-observed signals (isTrusted count, duration, webdriver flag)
       │                      (Throttled 100ms pointermove, discrete click/touch unthrottled)
       ▼
[sentinel.score(request)] ──► Session-scoped fixed-window counter + Policy-as-Code evaluation
       │                      (Deterministic 0~100 clamp, crypto.randomUUID trace IDs with fallback)
       ▼
[StoredRiskEventV1] ───────► Strict schema validation (zero raw cookies/auth/headers/PII)
       │
       ▼
[Shadow Mode Dashboard] ───► Single Risk Core engine import (DOM API & textContent rendering)
```

---

## 📦 10-Second Quickstart

### 1. Installation
```bash
npm install @ameva/sentinel@alpha @ameva/sentinel-browser@alpha @ameva/sentinel-risk-core@alpha
```

### 2. Client Browser Telemetry (`@ameva/sentinel-browser`)
```javascript
import { createBrowserTelemetry } from '@ameva/sentinel-browser';

const telemetry = createBrowserTelemetry({ autoStart: true });
const signals = telemetry.snapshot();
```

### 3. Risk Evaluation & Storage (`@ameva/sentinel`)
```javascript
import {
  createSentinel,
  MemoryFixedWindowCounterStore,
  LocalStorageRiskEventStore
} from '@ameva/sentinel';

const sentinel = createSentinel({
  mode: 'shadow',
  counterStore: new MemoryFixedWindowCounterStore(),
  eventStore: new LocalStorageRiskEventStore()
});

const report = await sentinel.score({ signals });

console.log(report);
/* Output:
{
  "traceId": "trc_8fdc1a92e4b34455",
  "score": 75,
  "evidenceConfidence": 0.82,
  "action": "OBSERVE",
  "recommendedAction": "REQUIRE_APP_VERIFICATION",
  "enforcementMode": "SHADOW",
  "policyVersion": "2026-08-21.1",
  "evidence": [
    {
      "rule": "automation.webdriver",
      "score": 25,
      "attributes": { "observed": true, "property": "navigator.webdriver" },
      "message": "navigator.webdriver automation flag is active"
    }
  ]
}
*/
```

---

## 🔬 Product Scope & Current Status (v0.5.0-alpha.1)

- **Browser-Local Prototype**: Current events are stored in the browser's `LocalStorage`. Centralized multi-tenant aggregation will be supported via Server Collector API in v0.6.
- **CounterStore**: `MemoryFixedWindowCounterStore` is intended for local testing and single-instance Node runtimes. Serverless/distributed edge deployments will utilize Redis adapters.
- **Software-Observed Signals**: Interaction metrics (`isTrusted`, `webdriver`) represent browser-reported software signals, not unforgeable hardware biometric proofs.
- **Token Verification**: In v0.5, client tokens are marked `tokenPresented: true, tokenVerified: false`. Cryptographic HMAC signature verification will be enforced in the server-side Collector (v0.6).
- **Security Design**: Stored event fields are rendered through DOM APIs and `textContent`, eliminating DOM XSS injection sinks.

---

## ✅ Completed in v0.5.0-alpha.1

- **TypeScript Single Source of Truth**: Mechanically compiled `dist/index.js` and `dist/*.d.ts` across all packages.
- **29 Automated Release Quality Gates (100% PASS)**: 28 automated behavioral tests (19 Node unit + 9 Playwright cross-browser) + 1 comprehensive TypeScript Consumer API Contract gate.
- **Linux CI Release Gate**: Ubuntu, Node.js 22 LTS, Playwright cross-browser verification, and workspace package dry-run validation.
- **Cross-Browser Verification**: Reload persistence recovery, real-time multi-tab synchronization, and listener disposal verification.
- **Deep Schema Validation**: `isStoredRiskEventV1` runtime guards with negative boundary & primitive attribute attack prevention.
- **Public npm Registry Release**: `@ameva/sentinel-risk-core`, `@ameva/sentinel-browser`, `@ameva/sentinel` published under `@alpha` dist-tag.
- **Clean-Room Consumer Verification**: Standalone installation from `https://registry.npmjs.org` verified with 100% pass.

---

## 🗺️ Next Roadmap (v0.6.0 Milestone)

1. **Server Collector API**: Central `/api/v1/sentinel/collect` endpoint with short-lived client tokens and server-side verification.
2. **Cryptographic Signatures & Freshness**: Constant-time HMAC-SHA256 signature verification, timestamp freshness, and nonce replay defense.
3. **Distributed State Adapters**: `RedisCounterStore` and `PostgresRiskEventStore`.

---

## 📄 License

Apache-2.0 © 2026 AMEVA Open Source Ecosystem.
