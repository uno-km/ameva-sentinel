# 🚀 AMEVA Sentinel v0.5.0-alpha.1 Release & Registry Verification Document

> **Release Version**: `0.5.0-alpha.1`  
> **Git Release Tag**: [`v0.5.0-alpha.1`](https://github.com/uno-km/ameva-sentinel/releases/tag/v0.5.0-alpha.1)  
> **Tag Object SHA**: `ebdbd0313fa18fb2e5ff98254cd195d61c35adc6`  
> **Release Target Peeled Commit SHA (`refs/tags/v0.5.0-alpha.1^{}`)**: `c03ae6319f3684d6e2b753880dacd1c8e87b1735`  
> **Latest Verification Commit SHA**: `24514f1e28bae4373959e5974356d6ee8e2e2f2e`  
> **Repository**: [https://github.com/uno-km/ameva-sentinel.git](https://github.com/uno-km/ameva-sentinel.git)  
> **npm Registry Status**: 🟢 **100% PUBLISHED & VERIFIED**  
> **Verification Date**: `2026-08-21`

---

## 📊 1. Quality Gate Verification (28/28 Tests PASS)

```text
====================================================================================================
                        🛡️ AMEVA SENTINEL v0.5.0-alpha.1 AUDIT SCORECARD
====================================================================================================
  1. Risk Core Engine Quality Gates       : 7 / 7 Passed  (148ms)  |  35.0 / 35.0 pts  [🟢 PASS]
  2. Facade & Stateful Rate Enforcement   : 3 / 3 Passed   (97ms)  |  30.0 / 30.0 pts  [🟢 PASS]
  3. RiskEventStore Deep Schema Validation: 7 / 7 Passed   (96ms)  |  21.0 / 21.0 pts  [🟢 PASS]
  4. Browser SDK Client Telemetry Unit    : 2 / 2 Passed  (103ms)  |  14.0 / 14.0 pts  [🟢 PASS]
  5. Playwright Cross-Browser E2E (9 Tests): 9 / 9 Passed(14,898ms)|  E2E Verified     [🟢 PASS]
     - [chromium] Reload Recovery, Multi-Tab Sync, Listener Destruction (3/3 PASS)
     - [firefox]  Reload Recovery, Multi-Tab Sync, Listener Destruction (3/3 PASS)
     - [webkit]   Reload Recovery, Multi-Tab Sync, Listener Destruction (3/3 PASS)
  6. Workspace Distribution (npm pack)   : 3 / 3 Workspaces Valid Tarballs Verified   [🟢 PASS]
----------------------------------------------------------------------------------------------------
  🏆 TOTAL AUDIT SCORE: 28 Passed / 0 Failed | 100.0 / 100.0 pts (Grade A+) | 100% ALL GATES PASS
====================================================================================================
```

---

## 📦 2. Public npm Registry Deployment Status

All 3 packages are live on the official npm registry under `@alpha` and `latest` dist-tags:

| Package Name | Published Version | Visibility | dist-tags |
| :--- | :---: | :---: | :---: |
| **`@ameva/sentinel-risk-core`** | `0.5.0-alpha.1` | Public | `alpha`, `latest` |
| **`@ameva/sentinel-browser`** | `0.5.0-alpha.1` | Public | `alpha`, `latest` |
| **`@ameva/sentinel`** | `0.5.0-alpha.1` | Public | `alpha`, `latest` |

---

## 🧪 3. Public Registry Consumer Smoke Test (100% PASS)

Executed in a completely fresh temporary directory (`$env:TEMP\ameva-public-registry-smoke`) by installing directly from `https://registry.npmjs.org`:

```text
$ npm init -y
$ npm install @ameva/sentinel@alpha @ameva/sentinel-browser@alpha @ameva/sentinel-risk-core@alpha

added 3 packages, and audited 4 packages in 1s (0 vulnerabilities)

$ node smoke.mjs
🧪 Running Public Registry Consumer Smoke Test...

✅ Public npm Registry Download: SUCCESS
✅ ESM Imports & Type Resolution: SUCCESS
✅ Facade Score Evaluation: {
  traceId: 'trc_1aec5ae58b41465a',
  score: 0,
  action: 'ALLOW',
  confidence: 0.3
}
✅ Risk Core Engine Evaluation: { score: 0, action: 'ALLOW' }

🎉 ALL PUBLIC NPM REGISTRY CONSUMER SMOKE TESTS PASSED!
```

---

## 🗺️ 4. Next Milestone (v0.6.0 Server Collector API)

- **Collector Endpoint**: `POST /api/v1/sentinel/collect`
- **Envelope & HMAC Signatures**: Client token verification & replay freshness validation.
- **Distributed Storage**: Pluggable Redis Rate Counters & PostgreSQL Stores.
