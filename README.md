# 🛡️ AMEVA Sentinel

> **Privacy-first Security Observability and Multi-Axis Cost Guard Layer for Web Applications**  
> *AMEVA Sentinel v2.2.0-alpha.1 — Deterministic Policy Guardrails, Dual-Runtime SDKs & Hierarchical Cost Controls*

[![Official Documentation](https://img.shields.io/badge/docs-uno--km.github.io%2Fameva--sentinel-004499?style=flat-square&logo=github)](https://uno-km.github.io/ameva-sentinel/)
[![npm package](https://img.shields.io/npm/v/@ameva/sentinel/alpha?style=flat-square&color=cb3837&logo=npm)](https://www.npmjs.com/package/@ameva/sentinel)
[![PyPI package](https://img.shields.io/pypi/v/ameva-sentinel?style=flat-square&color=3775a9&logo=pypi)](https://pypi.org/project/ameva-sentinel/)
[![Open Collective](https://img.shields.io/badge/Open_Collective-AOSF_Fund-004499?style=flat&logo=opencollective)](https://opencollective.com/ameva-fund)
[![GitHub Sponsors](https://img.shields.io/badge/GitHub_Sponsors-uno--km-ea4aaa?style=flat&logo=githubsponsors)](https://github.com/sponsors/uno-km)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square)](LICENSE)
[![Foundation](https://img.shields.io/badge/AOSF-Tier%201%20TLP-f59e0b?style=flat-square)](https://uno-km.vercel.app/docs/foundation/)

> [!NOTE]
> **Pre-release Notice**: The current release is an alpha prototype intended for shadow mode evaluation and early testing.
> - **TypeScript / Node.js**: `npm install @ameva/sentinel@alpha @ameva/sentinel-browser@alpha @ameva/sentinel-risk-core@alpha @ameva/sentinel-store-redis@alpha`
> - **Python (3.9+)**: `pip install "ameva-sentinel[all]"`
> Complete interactive documentation & API reference: [https://uno-km.github.io/ameva-sentinel/](https://uno-km.github.io/ameva-sentinel/)

---

## 🎯 Canonical Mission

> **"웹 서비스에 들어오는 트래픽과 컴퓨팅 비용을 관측하고, 측정하고, 설명하고, 통제한다."**  
> *(Observe, Measure, Explain, and Guard incoming web traffic and backend execution budgets with privacy-by-design.)*

---

## 🏗️ Dual-Runtime Architecture

```text
[Client / Edge Layer]
  │  ├── [@ameva/sentinel-browser] (Derived interaction telemetry, zero raw coordinates)
  │  └── Cloudflare / Fastly / AWS CloudFront Provider Normalizers
  ▼
[Security Evaluator Layer] (TypeScript & Python Dual Runtime)
  │  ├── SentinelCostGuardEvaluator (Unified shadow-mode and enforcement evaluation)
  │  ├── RequestShapeGuard & ResponseBudgetGuard (Bounded payload and row validation)
  │  └── BoundedThreatAggregator (Bounded in-memory LRU threat aggregator)
  ▼
[Storage & Distributed State]
  │  ├── LocalEmergencyBudgetStore (In-memory token bucket with dynamic clamp fallback)
  │  └── RedisTokenBucketStore & RedisThreatAggregator (Distributed hierarchical token bucket)
  ▼
[Framework Adapters & Integrations]
     ├── Express, Fastify, Next.js (TypeScript)
     └── FastAPI, Starlette, Flask, SQLAlchemy (Python)
```

---

## 📦 Quickstart

### 1. TypeScript / Node.js Installation
```bash
npm install @ameva/sentinel@alpha @ameva/sentinel-risk-core@alpha @ameva/sentinel-store-redis@alpha
```

```typescript
import { SentinelCostGuardEvaluator } from '@ameva/sentinel-risk-core';
import { RedisTokenBucketStore } from '@ameva/sentinel-store-redis';

const evaluator = new SentinelCostGuardEvaluator({
  budgetStore: new RedisTokenBucketStore({ redisClient }),
  enforceByDefault: true
});

const decision = await evaluator.evaluate({
  method: 'GET',
  path: '/api/v1/chart',
  pageSize: 25,
  principal: {
    authenticated: true,
    tenantId: 'tenant-acme',
    apiKeyId: 'ak-live-123'
  }
});
```

### 2. Python SDK Installation
```bash
pip install "ameva-sentinel[redis,fastapi]"
```

```python
from ameva_sentinel import SentinelCostGuardEvaluator, RequestCostContext, VerifiedPrincipal

evaluator = SentinelCostGuardEvaluator(enforce_by_default=True)
ctx = RequestCostContext(
    method="GET",
    path="/api/v1/chart",
    page_size=25,
    principal=VerifiedPrincipal(
        authenticated=True,
        tenant_id="tenant-acme",
        api_key_id="ak-live-123",
    ),
)
decision = evaluator.evaluate_sync(ctx)
```

---

## 🔬 Product Scope & Quality Status (v2.2.0-alpha.1)

- **Dual-Runtime Parity**: Complete functional parity across TypeScript and Python runtimes with shared canonical JSON schema validation.
- **Unverified Identity Isolation**: Unauthenticated principals strictly isolate tenant and credential namespaces.
- **Dynamic Emergency Capacity Clamping**: Under Redis outage or fail-open fallback, emergency in-memory stores clamp balances dynamically without leaking previous high-tier token allocations.
- **Multi-Fixture Conformance Corpus**: Validated against shared conformance fixtures with SHA-256 policy checksum verification.
- **Automated CI Quality Gates**: Enforced via dual-job Node.js and Python GitHub Actions pipelines.

---

## 📄 License

Apache-2.0 © 2026 AMEVA Open Source Ecosystem.



---

## 💖 Sponsorship & Community Backing

AMEVA is an independent open-source public good governed under the **AMEVA Open-Source Foundation (AOSF)**. All sponsorship funds are 100% publicly audited and dedicated to physical ARM64 testbeds and CI/CD GPU runners.

- **Open Collective (Non-Profit 501(c)(6))**: [https://opencollective.com/ameva-fund](https://opencollective.com/ameva-fund)
- **GitHub Sponsors**: [https://github.com/sponsors/uno-km](https://github.com/sponsors/uno-km)
- **Official Foundation Portal**: [https://uno-km.vercel.app/docs/foundation/sponsorship.html](https://uno-km.vercel.app/docs/foundation/sponsorship.html)
