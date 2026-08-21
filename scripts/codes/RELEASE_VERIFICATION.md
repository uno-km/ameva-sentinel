# 🚀 AMEVA Sentinel v0.5.0-alpha.1 Release & Verification Document

> **Release Version**: `0.5.0-alpha.1`  
> **Git Release Tag**: [`v0.5.0-alpha.1`](https://github.com/uno-km/ameva-sentinel/releases/tag/v0.5.0-alpha.1)  
> **Tag Object SHA**: `ebdbd0313fa18fb2e5ff98254cd195d61c35adc6`  
> **Release Target Peeled Commit SHA (`refs/tags/v0.5.0-alpha.1^{}`)**: `c03ae6319f3684d6e2b753880dacd1c8e87b1735`  
> **Latest Verification & Snapshot Commit SHA**: `c4451179d5fc05a67894d49731ffacb42ca56a31`  
> **Repository**: [https://github.com/uno-km/ameva-sentinel.git](https://github.com/uno-km/ameva-sentinel.git)  
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

## 📦 2. Clean-Room Consumer Smoke Test Result

Executed in an isolated temporary directory (`test-consumer-smoke`) using standalone generated tarballs:

```text
$ npm init -y
$ npm install ./ameva-sentinel-risk-core-0.5.0-alpha.1.tgz \
              ./ameva-sentinel-browser-0.5.0-alpha.1.tgz \
              ./ameva-sentinel-0.5.0-alpha.1.tgz

added 3 packages, and audited 4 packages in 992ms (found 0 vulnerabilities)

$ node smoke.mjs
🧪 Running Consumer Smoke Test...

✅ Consumer Imports & Exports: SUCCESS
✅ Facade Score Evaluation: {
  traceId: 'trc_0b8d828e90ce4361',
  score: 0,
  action: 'ALLOW',
  confidence: 0.3
}
✅ Risk Core Engine Evaluation: { score: 0, action: 'ALLOW' }

🎉 ALL CONSUMER SMOKE TESTS PASSED!
```

---

## 🏷️ 3. npm Scope (`@ameva`) Requirement

During registry publishing test with authenticated user `uno-km`:
- **Auth Status**: `npm whoami` &rarr; `uno-km` (Verified ✅)
- **Scope Status**: `Scope not found` (404 on `PUT /@ameva%2fsentinel-*`)
- **Resolution**:
  1. On npmjs.com, create a free organization named `ameva` ([https://www.npmjs.com/org/create](https://www.npmjs.com/org/create)) with `uno-km` as owner.
  2. Once `@ameva` org is created, publishing `@ameva/sentinel*` will succeed immediately.

---

## 🗺️ 4. Next Milestone (v0.6.0 Server Collector API)

1. **Collector Endpoint**: `POST /api/v1/sentinel/collect`
2. **Envelope & Signature Verification**: Short-lived collection token & HMAC-SHA256 signatures.
3. **Replay & Freshness Protection**: Nonce deduplication and timestamp freshness windows.
4. **Distributed Storage Adapters**: Pluggable Redis & PostgreSQL stores.
