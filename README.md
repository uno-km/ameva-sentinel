# 🛡️ AMEVA Sentinel

> **Privacy-first Security Observability Layer for Web Applications**  
> *AMEVA Sentinel v0.5 — Browser-Local Shadow Mode Prototype*

![Tests](https://img.shields.io/badge/internal%20tests-16%20passing-16a34a?style=flat-square)
![Stage](https://img.shields.io/badge/status-v0.5%20prototype-blue?style=flat-square)
![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square)
![Privacy](https://img.shields.io/badge/privacy-zero%20raw%20coordinates-10b981?style=flat-square)

---

## 🎯 Canonical Mission

> **"웹 서비스에 들어오는 트래픽을 관측하고, 측정하고, 설명하고, 점수화한다."**  
> *(Observe, Measure, Explain, and Score incoming web traffic with privacy-by-design.)*

---

## 🏗️ Architecture & Vertical Slice (v0.5)

```text
[Browser User Interaction]
       │
       ▼
[@ameva/sentinel-browser] ──► Software-observed signals (isTrusted count, duration, webdriver flag)
       │
       ▼
[sentinel.score(request)] ──► Sliding-window rate counter + Policy-as-Code evaluation
       │
       ▼
[RiskEventStore] ──────────► LocalStorageRiskEventStore (Idempotent, FIFO capacity, 24h TTL)
       │
       ▼
[Shadow Mode Dashboard] ───► summarize(reports) dynamic aggregation & Policy Re-Evaluation
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
  MemoryCounterStore,
  LocalStorageRiskEventStore
} from '@ameva/sentinel';

const sentinel = createSentinel({
  mode: 'shadow',
  counterStore: new MemoryCounterStore(), // Single-process/local use
  eventStore: new LocalStorageRiskEventStore()
});

const report = await sentinel.score({ signals });

console.log(report);
/* Output:
{
  "traceId": "trc_8fdc1a92e4b3",
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

## 🔬 Honest Product Scope & Limitations (v0.5 Disclosure)

- **Browser-Local Prototype**: Current demo events are stored in the browser's `LocalStorage`. Multi-tenant central traffic aggregation is not yet supported.
- **CounterStore**: `MemoryCounterStore` is intended for local testing and single-instance Node runtimes. Serverless/distributed edge deployments require external state engines (e.g. Redis / Durable Objects).
- **Software-Observed Signals**: Interaction metrics (`isTrusted`, `webdriver`) represent browser-reported software signals, not unforgeable hardware biometric proofs.

---

## 🗺️ Next Roadmap

1. **Automated Browser E2E Tests**: Playwright automated suites for tab sync, reload recovery, and listener disposal.
2. **Server Collector API**: Central `/api/v1/sentinel/collect` endpoint with HMAC signed token verification.
3. **Distributed State Adapters**: `RedisCounterStore` and `PostgresRiskEventStore`.

---

## 📄 License

Apache-2.0 © 2026 AMEVA Open Source Ecosystem.
