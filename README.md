# AMEVA Sentinel

> **Privacy-First Security Observability & Deterministic Traffic Governance Layer for Web Applications**  
> *AMEVA Sentinel v0.7.0 — Multi-Taxonomy Bot Classification, Cryptographic Trust Boundaries, and Zero-Data Telemetry.*

[![Official Documentation](https://img.shields.io/badge/docs-uno--km.vercel.app%2Fsentinel-004499?style=flat-square&logo=vercel)](https://uno-km.vercel.app/sentinel/)
[![npm package](https://img.shields.io/npm/v/@ameva/sentinel/alpha?style=flat-square&color=cb3837&logo=npm)](https://www.npmjs.com/package/@ameva/sentinel)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square)](LICENSE)
[![Release Gates](https://img.shields.io/badge/release%20checks-86%2F86%20passing%20(83%20tests%20%2B%203%20pkg%20dryruns)-16a34a?style=flat-square)](https://uno-km.vercel.app/sentinel/benchmarks.html)
[![Privacy](https://img.shields.io/badge/privacy-zero%20raw%20coordinates-10b981?style=flat-square)](https://uno-km.vercel.app/sentinel/)
[![Foundation](https://img.shields.io/badge/AOSF-Tier%201%20TLP-f59e0b?style=flat-square)](https://uno-km.vercel.app/docs/foundation/)

---

## Canonical Mission

> **"Observe, Measure, Explain, and Score incoming web traffic with privacy-by-design."**  
> *0% mouse coordinate collection, 0% keylogging, 100% deterministic scorecards.*

---

## Architecture & Single Source of Truth

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

## 10-Second Quickstart

### 1. Installation
```bash
npm install @ameva/sentinel@alpha @ameva/sentinel-browser@alpha @ameva/sentinel-risk-core@alpha
```

### 2. Client Browser Telemetry (`@ameva/sentinel-browser`)
```javascript
import { createBrowserTelemetry } from '@ameva/sentinel-browser';

const telemetry = createBrowserTelemetry({ autoStart: true });
const envelope = await telemetry.flush();
```

### 3. Server-Side Risk Verification (`@ameva/sentinel`)
```javascript
import { Sentinel } from '@ameva/sentinel';

const sentinel = new Sentinel({
  targetMode: 'HUMANS_ONLY',
  tokenVerifier: {
    expectedAudience: 'https://my-app.com',
    secretKey: process.env.SENTINEL_SECRET_KEY,
  },
});

const report = await sentinel.score(request);
console.log(`Action: ${report.action}, Score: ${report.score}`);
```

---

## License

Apache-2.0. Copyright (c) 2026 uno-km (AMEVA Foundation).
