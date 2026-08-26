# AMEVA-Sentinel

> **Shadow-First Automation Risk Observation & Multi-Axis Threat Telemetry Layer for Web Applications**  
> *AMEVA-Sentinel v2.1.0 — Pluggable Edge Provider Adapters, Trust Boundary Guardrails, and Application-Level Data Minimization.*

[![Official Documentation](https://img.shields.io/badge/docs-uno--km.vercel.app%2Fsentinel-004499?style=flat-square&logo=vercel)](https://uno-km.vercel.app/sentinel/)
[![npm package](https://img.shields.io/npm/v/ameva-sentinel?style=flat-square&color=cb3837&logo=npm)](https://www.npmjs.com/package/ameva-sentinel)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square)](LICENSE)
[![Release Verification](https://img.shields.io/badge/release%20checks-55%2F55%20passing%20(high--intensity)-16a34a?style=flat-square)](https://uno-km.vercel.app/sentinel/benchmarks.html)
[![Privacy](https://img.shields.io/badge/privacy-zero%20raw%20ip%20persistence-10b981?style=flat-square)](https://uno-km.vercel.app/sentinel/)
[![Foundation](https://img.shields.io/badge/AOSF-Tier%201%20TLP-f59e0b?style=flat-square)](https://uno-km.vercel.app/docs/foundation/)

---

## Canonical Architecture & Purpose

> *"Sentinel is a provider-neutral automation trust, abuse observation, and GEO content policy layer that complements existing CDN, WAF, and bot-management platforms."*

AMEVA-Sentinel v2.1 separates monolithic classification into 4 independent evaluation dimensions under a **Shadow-first observation architecture**:

1. **Risk Level (`riskLevel`)**: Pure automation risk estimation (`LOW_AUTOMATION_RISK`, `ELEVATED_AUTOMATION_RISK`, `HIGH_AUTOMATION_RISK`).
2. **Actor Claim (`actorClaim`)**: Declared identity signature (`UNKNOWN`, `AI_OPERATOR`, `AUTOMATION_TOOL`, `BROWSER_USER`). Absences of automation signatures default to `UNKNOWN`.
3. **Claim Verification (`verification`)**: Independent verification status (`UNVERIFIED`, `VERIFIED`, `NOT_APPLICABLE`, `CONTRADICTORY`).
4. **Policy Decision (`decision`)**: Action recommendation (`ALLOW`, `OBSERVE`, `CHALLENGE`, `TEMPORARY_DENY`).

```text
[Incoming Request via Edge CDN]
       │
       ▼
[Edge Provider Adapter (Cloudflare / Vercel / Fastly / Generic)]
       │ ──► Standardized EdgeClientInfo (IP Subnet Masking, Geo Centroid, TLS Fingerprints)
       ▼
[Sentinel Core Engine (score / evaluateWithTrust)]
       │ ──► Multi-Axis Evaluation & Trust Boundary Enforcement
       ▼
[Assessment Response (schemaVersion: 2.0)]
       ├─► riskLevel    : LOW_AUTOMATION_RISK
       ├─► actorClaim   : { type: "UNKNOWN", state: "NONE", verification: "NOT_APPLICABLE" }
       ├─► trustBoundary: { directOriginBlocked: "ENFORCED", edgeAuthenticated: true }
       ├─► decision     : { mode: "SHADOW", enforcedAction: "ALLOW" }
       └─► legacy       : { triageCategory: "HUMAN", deprecated: true }
```

---

## Key Guarantees & Operational Principles

* **Zero Raw IP Persistence in Application Tables**: Subnet masking (`maskIpAddress()`) zeroes host identifiers before persistence (`203.0.***.***` / `2001:0db8::`).
* **Zero Coordinate / Free-Text Logging**: Latitude/longitude and arbitrary click text logging are discontinued (`null` enforced) with strict target-type enum allowlists.
* **Anti-Spoofing Trust Boundary**: Edge-verified bot claims require verified edge-to-origin authentication and direct-origin blocking to escalate to `VERIFIED`.
* **Fail-Open Architecture**: Uncaught evaluation errors return HTTP 200 with degraded safe allowance (`status: 'degraded'`, `failOpen: true`, `action: 'ALLOW'`), ensuring zero disruption to origin services.
* **Signal Coverage Metric**: Real-time 5-category availability quantification (HTTP context, Runtime artifacts, Browser consistency, Interaction signals, Session behavior) replacing arbitrary confidence percentages.

---

## 10-Second Quickstart

### 1. Installation
```bash
npm install ameva-sentinel
```

### 2. Edge Middleware & Serverless Integration
```javascript
import { createSentinel, resolveProviderAdapter } from 'ameva-sentinel';

const sentinel = createSentinel({
  mode: 'shadow'
});

export default async function handler(req, res) {
  // 1. Ingest telemetry and evaluate multi-axis risk
  const report = await sentinel.score(req);

  // 2. Access v2 assessment dimensions
  const { riskLevel, actorClaim, decision } = report.assessment;
  console.log(`Risk: ${riskLevel}, Claim: ${actorClaim.type} (${actorClaim.verification}), Action: ${decision.enforcedAction}`);

  return res.status(200).json({ status: 'ok', assessment: report.assessment });
}
```

---

## License

Apache-2.0. Copyright (c) 2026 uno-km (AMEVA Foundation).
