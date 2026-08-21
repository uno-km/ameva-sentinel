# 🛡️ AMEVA Sentinel

> **Privacy-first Security Observability Layer for Web Applications**  
> *AMEVA Sentinel v0.6.0-alpha.1 — Target Discrimination, Smart Bot Classifier & Trust Boundary Engine*

[![Official Documentation](https://img.shields.io/badge/docs-uno--km.vercel.app%2Fsentinel-004499?style=flat-square&logo=vercel)](https://uno-km.vercel.app/sentinel/)
[![npm package](https://img.shields.io/npm/v/@ameva/sentinel/alpha?style=flat-square&color=cb3837&logo=npm)](https://www.npmjs.com/package/@ameva/sentinel)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square)](LICENSE)
[![Release Gates](https://img.shields.io/badge/release%20checks-85%2F85%20passing%20(82%20tests%20%2B%203%20pkg%20dryruns)-16a34a?style=flat-square)](https://uno-km.vercel.app/sentinel/benchmarks.html)
[![Privacy](https://img.shields.io/badge/privacy-zero%20raw%20coordinates-10b981?style=flat-square)](https://uno-km.vercel.app/sentinel/)
[![Foundation](https://img.shields.io/badge/AOSF-Tier%201%20TLP-f59e0b?style=flat-square)](https://uno-km.vercel.app/docs/foundation/)

> [!NOTE]
> **Pre-release Notice**: Version `0.6.0-alpha.1` introduces Target Discrimination (`HUMANS_ONLY`, `BOTS_ONLY`, `VERIFIED_PARTNERS_ONLY`), 7-tier bot taxonomy, cryptographic trust boundary collector verification (`sv1` envelope), and closed-destination URL routing.  
> Complete interactive documentation & API reference: [https://uno-km.vercel.app/sentinel/](https://uno-km.vercel.app/sentinel/)

---

## 🎯 Canonical Mission

> **"웹 서비스에 들어오는 트래픽을 관측하고, 측정하고, 설명하고, 점수화한다."**  
> *(Observe, Measure, Explain, and Score incoming web traffic with privacy-by-design.)*

---

## 🏗️ Architecture & Single Source of Truth

```text
[Incoming Request / Client Interaction]
       │
       ▼
[@ameva/sentinel-browser] ──► Software-observed signals (isTrusted count, duration, webdriver flag)
       │                      (Throttled 100ms pointermove, discrete click/touch unthrottled)
       ▼
[sentinel.score(request)] ──► End-to-End Token Verification (KeyResolver, NonceStore, Audience/Purpose)
       │                      + Fixed-Window Session Rate Tracking + 4-Stage Pipeline Evaluation
       ▼
[Pure 4-Stage Engine] ─────► 1. Classify -> 2. Score -> 3. Target Mode Decision -> 4. Report Resolution
       │
       ▼
[StoredRiskEventV2] ────────► Strict schema validation with universal migration guard (V1 & V2)
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

### 3. Server Risk Evaluation & Collector Verification (`@ameva/sentinel`)
```javascript
import {
  createSentinel,
  StaticKeyResolver,
  MemoryNonceStore,
  MemoryFixedWindowCounterStore,
  LocalStorageRiskEventStore
} from '@ameva/sentinel';

const sentinel = createSentinel({
  mode: 'shadow',
  keyResolver: new StaticKeyResolver({ 'prod-key-1': process.env.COLLECTOR_SECRET }),
  nonceStore: new MemoryNonceStore(),
  expectedAudience: 'sentinel-api-prod',
  expectedPurpose: 'telemetry-collect',
  allowedIssuers: ['partner-corp'],
  counterStore: new MemoryFixedWindowCounterStore(),
  eventStore: new LocalStorageRiskEventStore()
});

const report = await sentinel.score({
  headers: {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36',
    'authorization': 'Bearer sv1.ey...sig'
  },
  signals
});

console.log(report);
```

---

## 🧪 Comprehensive Test Suite & Results (85 / 85 Release Checks)

Execute the full fail-closed verification pipeline:
```bash
npm run build && npm run test:types && npm run test:unit && npx playwright test
node scripts/generate_test_report.js
```

Full details available in [TEST_SUITE_AND_RESULTS.md](reports/TEST_SUITE_AND_RESULTS.md).
