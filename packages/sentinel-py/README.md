# AMEVA-Sentinel (Python SDK)

<div align="center">

[![Official Documentation](https://img.shields.io/badge/Official_Docs-uno--km.vercel.app%2Fsentinel-004499?style=for-the-badge&logo=vercel&logoColor=white)](https://uno-km.vercel.app/lib/sentinel/)
[![PyPI Version](https://img.shields.io/pypi/v/ameva-sentinel.svg?color=blue&style=for-the-badge&logo=pypi&logoColor=white)](https://pypi.org/project/ameva-sentinel/)
[![Python Versions](https://img.shields.io/pypi/pyversions/ameva-sentinel.svg?style=for-the-badge&logo=python&logoColor=white)](https://pypi.org/project/ameva-sentinel/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg?style=for-the-badge)](LICENSE)
[![Audit Scorecard](https://img.shields.io/badge/Quality_Gates-55%2F55_PASS_(100%25)-16a34a?style=for-the-badge)](https://uno-km.vercel.app/lib/sentinel/benchmarks.html)
[![Privacy Compliance](https://img.shields.io/badge/Privacy-Zero_Raw_IP_Persistence-10b981?style=for-the-badge)](https://uno-km.vercel.app/lib/sentinel/)
[![AMEVA Foundation](https://img.shields.io/badge/Foundation-AOSF_Tier_1-orange?style=for-the-badge)](https://uno-km.vercel.app/docs/foundation/)

### Shadow-First Automation Risk Observation & Multi-Axis Threat Telemetry Layer for Python Web Applications
**An Official Tier 1 Top-Level Open-Source Project of the AMEVA Foundation (AOSF)**

[📖 Official Documentation Site](https://uno-km.vercel.app/lib/sentinel/) • [📊 Live Observability Console](https://uno-km.vercel.app/lib/sentinel/admin) • [📦 PyPI Package](https://pypi.org/project/ameva-sentinel/) • [💬 Issue Tracker](https://github.com/uno-km/ameva-sentinel/issues)

</div>

---

## 🏛️ Executive Summary & Architectural Mission

> *"Sentinel is a provider-neutral automation trust, abuse observation, and GEO content policy layer that complements existing CDN, WAF, and bot-management platforms."*

Mainstream bot-management and security libraries suffer from three fatal design flaws:
1. **Deterministic Identity Overpromising**: Arbitrarily classifying untracked clients as "Verified Human" or "AI Bot" based on fragile single-signal heuristics.
2. **Privacy Violations**: Persisting raw IP addresses, physical GPS coordinates, and unrestricted user click text into database tables.
3. **Fail-Closed Cascades**: Crashing serverless runtimes with 500/502 errors during traffic spikes or telemetry ingestion errors.

`ameva-sentinel` establishes a **Shadow-first multi-axis observation architecture** in pure Python with zero heavy dependencies:
* **Multi-Axis Separation (`schemaVersion: 2.0`)**: Deconstructs monolithic scores into 4 independent evaluation vectors: pure automation risk (`riskLevel`), declared client signature (`actorClaim`), cryptographic/CDN verification status (`verification`), and policy enforcement (`decision`).
* **Multi-CDN Edge Provider Adapters**: Seamless ingestion and normalization for Cloudflare Bot Management (`cf-bot-management`, JA3, JA4), Vercel Edge Middleware, Fastly Compute@Edge, and standard WSGI/ASGI servers.
* **Trust Boundary Enforcement**: Enforces strict network-level verification rules—bot claims escalate to `VERIFIED` only when authenticated edge-to-origin channels and direct origin blocks are proven.
* **Zero Raw IP Persistence**: Subnet masking (`mask_ip_address`) automatically zeroes host bits (`203.0.***.***` / `2001:0db8::`) before database writes.
* **3-Tier Fail-Open Guarantee**: Uncaught exceptions return HTTP 200 with safe degraded allowance (`action: "ALLOW"`), guaranteeing zero disruption to upstream business traffic.

---

## 🏗️ Architecture & Data Flow

```text
[Incoming HTTP / ASGI Request]
       │
       ▼
[Edge Provider Adapter (Cloudflare / Vercel / Fastly / Generic)]
       │ ──► Standardized EdgeClientInfo (IP Masking, Geo Centroid, TLS Fingerprints)
       ▼
[Sentinel Core Engine (Multi-Axis Policy Compiler)]
       │
       ├─► 1. riskLevel    : LOW_AUTOMATION_RISK | ELEVATED_AUTOMATION_RISK | HIGH_AUTOMATION_RISK
       ├─► 2. actorClaim   : { type: "UNKNOWN"|"AI_OPERATOR", state: "CLAIMED"|"NONE" }
       ├─► 3. verification : UNVERIFIED | VERIFIED | NOT_APPLICABLE | CONTRADICTORY
       ├─► 4. trustBoundary: { directOriginBlocked: "ENFORCED", edgeAuthenticated: true }
       ├─► 5. decision     : { mode: "SHADOW", proposedAction: "ALLOW", enforcedAction: "ALLOW" }
       └─► 6. legacy       : { triageCategory: "HUMAN", deprecated: true }
```

---

## ⚡ 5-Minute Quickstart

### 1. Installation

Install the base package via PyPI (Zero heavy dependencies, pure standard library):

```bash
pip install ameva-sentinel
```

Or install with optional framework extras:

```bash
# For FastAPI / Starlette
pip install "ameva-sentinel[fastapi]"

# For Flask
pip install "ameva-sentinel[flask]"

# All integrations
pip install "ameva-sentinel[all]"
```

---

## 💻 Code Recipes & Framework Integrations

### Recipe 1: FastAPI & Starlette (Asynchronous ASGI Middleware)

```python
from fastapi import FastAPI, Request
from ameva_sentinel.middleware import SentinelMiddleware

app = FastAPI(title="Production API")

# Register Sentinel Middleware in Shadow Mode (Non-blocking observation)
app.add_middleware(SentinelMiddleware, mode="shadow")

@app.get("/api/v1/resource")
async def get_resource(request: Request):
    # Retrieve standardized Sentinel v2.0 assessment object
    assessment = request.state.sentinel_assessment
    
    print(f"Risk Level: {assessment.risk_level}")
    print(f"Actor Claim: {assessment.actor_claim.type} (Status: {assessment.actor_claim.verification})")
    print(f"Masked IP: {assessment.edge_telemetry.get('maskedIp')}")
    
    return {
        "status": "success",
        "data": "Secure resource payload",
        "security": {
            "risk_level": assessment.risk_level,
            "provider": assessment.edge_provider
        }
    }
```

---

### Recipe 2: Flask / WSGI Middleware Integration

```python
from flask import Flask, request, jsonify
from ameva_sentinel import Sentinel

app = Flask(__name__)
sentinel = Sentinel(mode="shadow")

@app.before_request
def evaluate_traffic():
    headers = {k: v for k, v in request.headers.items()}
    assessment = sentinel.evaluate(headers=headers)
    request.sentinel_assessment = assessment

@app.route("/api/order", methods=["POST"])
def place_order():
    assessment = request.sentinel_assessment
    if assessment.risk_level == "HIGH_AUTOMATION_RISK" and assessment.decision["enforcedAction"] == "CHALLENGE":
        return jsonify({"error": "Automated abuse suspected", "action": "CHALLENGE"}), 403

    return jsonify({"status": "order_processed"})
```

---

### Recipe 3: Pure Python Direct Evaluation with Cloudflare Headers

```python
from ameva_sentinel import Sentinel, resolve_provider_adapter

sentinel = Sentinel(mode="shadow")

# Simulated request headers from Cloudflare Workers
headers = {
    "user-agent": "Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)",
    "cf-ray": "8f123-ICN",
    "cf-connecting-ip": "203.0.113.195",
    "cf-ipcountry": "KR",
    "cf-ipcity": "Seoul",
    "cf-bot-management": '{"score": 1, "verified_bot": true, "ja3Hash": "abc123ja3"}'
}

# Evaluate with explicit Trust Boundary parameters
assessment = sentinel.evaluate(
    headers=headers,
    signals={"is_webdriver": False, "screen_hz": 60},
    direct_origin_blocked=True,
    edge_authenticated=True
)

# Output evaluation result
result = assessment.to_dict()
print(result)
# {
#   "schemaVersion": "2.0",
#   "riskLevel": "LOW_AUTOMATION_RISK",
#   "actorClaim": {
#     "type": "AI_OPERATOR",
#     "name": "KnownBot",
#     "state": "CLAIMED",
#     "verification": "VERIFIED",
#     "trustBoundary": {"provider": "CLOUDFLARE", "directOriginBlocked": "ENFORCED"}
#   },
#   "decision": {"mode": "SHADOW", "enforcedAction": "ALLOW"},
#   "edgeProvider": "CLOUDFLARE",
#   "edgeTelemetry": {"maskedIp": "203.0.***.***", "country": "KR", "cdnBotScore": 1}
# }
```

---

### Recipe 4: Privacy-First Subnet Masking Utilities

```python
from ameva_sentinel import mask_ip_address, normalize_target_type

# 1. Zero Raw IP Persistence
assert mask_ip_address("203.0.113.195") == "203.0.***.***"
assert mask_ip_address("2001:0db8:85a3:0000:0000:8a2e:0370:7334") == "2001:0db8:85a3:0000::"

# 2. Strict UI Target Type Normalization (Prevents PII click logging)
assert normalize_target_type("button") == "BUTTON"
assert normalize_target_type("link") == "LINK"
assert normalize_target_type("password_raw_text") == "OTHER"  # Sanitized to OTHER
```

---

## 📊 Evaluation Schema Reference (`schemaVersion: 2.0`)

| Field | Type | Description |
|:---|:---|:---|
| `schemaVersion` | `str` | Assessment schema version (Fixed: `"2.0"`). |
| `riskLevel` | `str` | Pure automation likelihood: `LOW_AUTOMATION_RISK`, `ELEVATED_AUTOMATION_RISK`, `HIGH_AUTOMATION_RISK`. |
| `actorClaim.type` | `str` | Declared signature: `UNKNOWN`, `AI_OPERATOR`, `AUTOMATION_TOOL`, `BROWSER_USER`. |
| `actorClaim.state` | `str` | Claim declaration status: `NONE`, `CLAIMED`, `INFERRED`. |
| `actorClaim.verification` | `str` | Evidence state: `UNVERIFIED`, `VERIFIED`, `NOT_APPLICABLE`, `CONTRADICTORY`. |
| `trustBoundary` | `dict` | Edge isolation metadata: `provider`, `edgeAuthenticated`, `directOriginBlocked`. |
| `decision.mode` | `str` | Active policy mode: `SHADOW` (Observation) or `ENFORCE`. |
| `decision.enforcedAction`| `str` | Recommended enforcement: `ALLOW`, `OBSERVE`, `CHALLENGE`, `TEMPORARY_DENY`. |
| `edgeTelemetry.maskedIp` | `str` | Host-masked IP identifier (e.g. `203.0.***.***`). |

---

## 🛡️ Guarantees & Operational Principles

1. **Zero Raw IP Persistence in Application Tables**: Never stores raw host identifiers in database storage.
2. **Fail-Open Resilience**: When underlying evaluation encounters exceptions or timeouts, the engine fails open with HTTP 200 and `status: 'degraded'`.
3. **Single Passive Signal Guard**: Passive heuristics alone (such as `isWebdriver`) are prohibited from triggering `TEMPORARY_DENY`; actions are safely downgraded to `OBSERVE`.
4. **Zero Heavy Dependency**: Pure Python standard library core running with sub-0.1ms evaluation overhead and zero native compilation.

---

## 📜 License

Distributed under the **Apache-2.0 License**. Copyright &copy; 2026 AMEVA Open-Source Foundation (AOSF) & Uno Kim.
