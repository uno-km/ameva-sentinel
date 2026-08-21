# 🛡️ AMEVA Sentinel

> **Privacy-first Security Observability Layer for Web Applications**  
> *AMEVA Sentinel v0.5.0-alpha.1 — Browser-Local Shadow Mode Prototype*

![Tests](https://img.shields.io/badge/internal%20tests-16%20passing-16a34a?style=flat-square)
![Stage](https://img.shields.io/badge/stage-v0.5.0--alpha.1-blue?style=flat-square)
![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square)
![Privacy](https://img.shields.io/badge/privacy-zero%20raw%20coordinates-10b981?style=flat-square)

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
[StoredRiskEventV1] ───────► Explicit schema conversion (zero raw cookies/auth/headers/PII)
       │
       ▼
[Shadow Mode Dashboard] ───► Single Risk Core engine import (DOM API & textContent rendering)
```

---

## 📦 10-Second Quickstart

### 1. Client Browser Telemetry (`@ameva/sentinel-browser`)
```javascript
import { createBrowserTelemetry } from '@ameva/sentinel-browser';

const telemetry = createBrowserTelemetry({ autoStart: true });
const signals = telemetry.snapshot();
```

### 2. Risk Evaluation & Storage (`@ameva/sentinel`)
```javascript
import {
  createSentinel,
  MemoryFixedWindowCounterStore,
  LocalStorageRiskEventStore
} from '@ameva/sentinel';

const sentinel = createSentinel({
  mode: 'shadow',
  counterStore: new MemoryFixedWindowCounterStore(), // Single-process/local use
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

## 🔬 Honest Product Scope & Limitations (v0.5.0-alpha.1 Disclosure)

- **Browser-Local Prototype**: Current events are stored in the browser's `LocalStorage`. Multi-tenant central traffic aggregation is not yet supported.
- **CounterStore**: `MemoryFixedWindowCounterStore` is intended for local testing and single-instance Node runtimes. Serverless/distributed edge deployments require external state engines (e.g. Redis / Durable Objects).
- **Software-Observed Signals**: Interaction metrics (`isTrusted`, `webdriver`) represent browser-reported software signals, not unforgeable hardware biometric proofs.
- **Token Verification**: In v0.5, client tokens are marked `tokenPresented: true, tokenVerified: false`. Cryptographic HMAC signature verification will be enforced in the server-side Collector (v0.6).
- **Security Design**: Stored event fields are rendered through DOM APIs and `textContent`, eliminating the previously identified HTML injection sinks.

---

## 🗺️ Next Roadmap

1. **Automated Browser E2E Tests**: Playwright automated suite for multi-tab sync, reload recovery, and listener disposal across Chromium, Firefox, WebKit.
2. **Server Collector API**: Central `/api/v1/sentinel/collect` endpoint with HMAC signed token verification and replay protection.
3. **Distributed State Adapters**: `RedisCounterStore` and `PostgresRiskEventStore`.

---

## 📄 License

Apache-2.0 © 2026 AMEVA Open Source Ecosystem.
