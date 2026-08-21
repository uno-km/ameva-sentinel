# AMEVA Sentinel (amevageo / @ameva/sentinel)

> **"웹 서비스에 들어오는 트래픽을 관측하고, 측정하고, 설명하고, 점수화한다."**  
> *Privacy-first Security Observability Layer for Web Applications.*

[![npm version](https://img.shields.io/npm/v/@ameva/sentinel.svg)](https://www.npmjs.com/package/@ameva/sentinel)
[![PyPI version](https://img.shields.io/pypi/v/ameva-sentinel.svg)](https://pypi.org/project/ameva-sentinel/)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-100%25%20Passing-brightgreen.svg)](tests)
[![Size](https://img.shields.io/badge/Browser_SDK-<15KB_gzip-success.svg)](packages/browser-sdk)

---

## ⚡ 3-Minute Quickstart

### 1. Install

```bash
npm install @ameva/sentinel
# or
pip install ameva-sentinel
```

### 2. Frontend: Client Telemetry (< 15KB)

```html
<!-- Vanilla HTML (1-Line) -->
<script src="https://cdn.jsdelivr.net/npm/@ameva/sentinel/dist/sentinel.min.js" data-collector="/api/sentinel"></script>
```

```tsx
// React / Next.js Hook
import { useSentinel } from '@ameva/sentinel/react'

export default function LoginForm() {
  const { score, isSuspicious } = useSentinel()
  return (
    <form>
      {isSuspicious && <p className="warning">추가 보안 인증이 필요합니다.</p>}
      <input type="text" name="username" />
      <input type="password" name="password" />
      <button type="submit">로그인</button>
    </form>
  )
}
```

### 3. Backend: Evaluate Risk in 1 Line

```typescript
import { sentinel, SentinelAction } from '@ameva/sentinel'

export async function POST(req: Request) {
  const risk = await sentinel.score(req)

  if (risk.action === SentinelAction.RATE_LIMIT) {
    return new Response("Too Many Requests", { status: 429 })
  }

  if (risk.action === SentinelAction.REQUIRE_APP_VERIFICATION) {
    return new Response(JSON.stringify({ error: "2FA Challenge Required" }), { status: 401 })
  }

  // Proceed with business logic...
}
```

---

## 📊 Machine-Readable Output Specification

```json
{
  "traceId": "trc_8fdc1a92e4b3",
  "score": 73,
  "confidence": 0.82,
  "action": "RATE_LIMIT",
  "policyVersion": "2026-08-21.1",
  "evidence": [
    {
      "rule": "webdriver",
      "score": 20,
      "attributes": {
        "observed": true,
        "property": "navigator.webdriver"
      },
      "message": "navigator.webdriver flag is active"
    },
    {
      "rule": "burst_request",
      "score": 30,
      "attributes": {
        "window": "10s",
        "count": 47,
        "threshold": 30
      },
      "message": "High frequency burst (47 req / 10s)"
    },
    {
      "rule": "no_user_interaction",
      "score": 23,
      "attributes": {
        "mouse_events": 0,
        "touch_events": 0,
        "is_trusted_count": 0
      },
      "message": "Zero trusted user interaction physics observed"
    }
  ]
}
```

---

## 🛡️ Core Pillars

- ✅ **Self-Hosted & Sovereign**: Your data stays in your PostgreSQL, Redis, ClickHouse, or Edge instances. Zero data sent to 3rd-party SaaS.
- ✅ **Explainable Risk Scoring**: No black-box AI. Every score is mathematically broken down into `evidence.attributes`.
- ✅ **Privacy by Design**: Zero raw IP storage. Rotating HMAC-SHA-256 pseudonymization with daily salt.
- ✅ **Edge Native**: 0ms overhead on Vercel Edge, Cloudflare Workers, Node.js Express, and Fastify.
- ✅ **Policy as Code**: Security rules versioned and reviewed via `git diff`.

---

## 📂 Monorepo Architecture

```text
packages/
├── sentinel/             # Unified Facade API & React Hook
├── browser-sdk/          # Lightweight Client Harvester (<15KB gzip)
├── risk-core/            # Pure-Function Multi-Signal Rule Engine
├── server-sdk/           # Signed Token Verification & Replay Defense
├── state/                # CounterStore & Rate State Abstractions (Redis / Memory)
├── observability/        # W3C TraceID, Metrics & Diagnostics
├── collectors/           # Vercel Edge / Cloudflare / Express Adapters
└── compliance/           # Daily HMAC Pseudonymization & Deletion APIs
```

---

## ⚖️ License
Released under the [Apache 2.0 License](LICENSE). Copyright &copy; 2026 AMEVA Open-Source Foundation (AOSF) & Eunho Kim (@uno-km).
