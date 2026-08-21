# 🛡️ AMEVA Sentinel v0.6 Architecture Specification
# Data Trust Boundaries & Security Model (Canonical Spec)

> **Document Version**: `1.0.0-RFC`  
> **Status**: `Draft / Target Milestone: v0.6.0`  
> **Classification**: Security Architecture & Trust Boundary Model  
> **Author**: AMEVA Core Security Engineering Team

---

## 1. 🎯 Foundational Philosophy & Threat Model

> **"Browser telemetry represents software-observed signals, not unforgeable hardware proofs."**  
> *(A client running inside user-controlled memory can forge JavaScript variables, but cannot forge server-held cryptographic proofs or replay expired nonces against synchronized server clocks.)*

In the AMEVA Sentinel ecosystem, zero trust is placed on raw client-supplied claims. Security observability is achieved by separating **observation**, **cryptographic token exchange**, and **server-side verification**.

```text
┌─────────────────────────── UNTRUSTED ZONE ───────────────────────────┐
│  Browser Client Runtime                                              │
│  - Raw DOM Events, Pointer Moves, Touch Signals                       │
│  - Ephemeral Collector Token (Short-lived HMAC envelope)             │
└───────────────────────────────────┬───────────────────────────────────┘
                                    │ HTTPS POST /api/v1/sentinel/collect
                                    ▼
┌──────────────────────────── TRUSTED ZONE ────────────────────────────┐
│  Server-Side Collector Endpoint                                      │
│  ├── 1. Cryptographic Signature Validation (Constant-time HMAC)     │
│  ├── 2. Timestamp Freshness Window Check (|Δt| <= 30s)               │
│  ├── 3. Atomic Nonce Consumption (Replay Attack Defense)             │
│  ├── 4. Server-Side Context Enrichment (TCP Remote IP, TLS Cipher)  │
│  └── 5. Deterministic Risk Core Engine Evaluation                    │
└───────────────────────────────────┬───────────────────────────────────┘
                                    ▼
┌────────────────────── PERSISTENT STATE STORAGE ──────────────────────┐
│  Distributed Adapters                                                │
│  ├── Sliding-Window Counter: Redis / Distributed Cache               │
│  └── Auditable Event Ledger: PostgreSQL / Write-Ahead Store          │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 2. 🧱 The 6 Data Trust Boundary Categories

Every field and signal processed by Sentinel must belong to exactly one of the six trust tiers:

| Trust Tier | Source | Cryptographic Status | Mutability | Examples |
| :--- | :--- | :--- | :--- | :--- |
| **`Untrusted`** | Client Body / HTTP Headers | None | High (Attacker Controlled) | `User-Agent`, `Referer`, raw body JSON, claimed identity |
| **`Observed`** | Browser Telemetry SDK | Software Instrumentation | Moderate (Spoofable in sandbox) | `isTrustedEventsCount`, `pointerEventCount`, `webdriver` flag |
| **`Signed`** | Issued by App Server | HMAC-SHA256 Signed Envelope | Immutable without Secret | `collectorToken` (`header.payload.signature`) |
| **`Verified`** | Evaluated by Collector | Cryptographically Proven | Immutable | `tokenVerified: true`, `nonceConsumed: true`, `freshnessMs <= 30000` |
| **`Trusted`** | Collector Server Origin | Machine-Local / Infrastructure | Sovereign | Server System Time, Socket Peer IP, Master Secret, Server Config |
| **`Derived`** | Risk Engine Core | Deterministic Algorithmic Output | Read-Only | Risk Score `0~100`, `SentinelAction`, Evidence List, `traceId` |

---

## 3. 🔐 Cryptographic Token & Replay Defense Specification

### 3.1 Ephemeral Collection Token
Application servers issue short-lived collection tokens to authenticated or guest sessions prior to telemetry ingestion:

$$\text{TokenPayload} = \{\text{sessionId}, \text{timestamp}, \text{nonce}, \text{clientIpPrefix}\}$$

$$\text{Signature} = \text{HMAC-SHA256}(\text{Canonical}(\text{TokenPayload}), \text{ServerSecretKey})$$

### 3.2 Verification Invariants
When the Collector receives a telemetry report:
1. **Signature Integrity**: Must verify using constant-time string comparison (`crypto.timingSafeEqual`).
2. **Freshness Window**: $|t_{\text{server}} - t_{\text{token}}| \le 30\,\text{seconds}$.
3. **Atomic Nonce Check**: The `nonce` must be recorded atomically in an idempotent cache (e.g., Redis `SET nonce:<id> 1 EX 60 NX`). If the key already exists, the request is flagged as `REPLAY_ATTACK_DETECTED` and immediately classified as high-risk.

---

## 4. 📡 Collector API Schema Specification (v0.6 RFC)

### 4.1 Endpoint Contract
* **Method**: `POST`
* **Path**: `/api/v1/sentinel/collect`
* **Content-Type**: `application/json; charset=utf-8`

### 4.2 Request Body Schema
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "signals": {
    "telemetryObserved": true,
    "sampleComplete": true,
    "observationDurationMs": 5240,
    "webdriver": false,
    "isTrustedEventsCount": 14,
    "touchMismatch": false,
    "suspiciousUA": false
  },
  "clientMetadata": {
    "sdkVersion": "0.6.0",
    "sessionId": "sess_89a7fbc2"
  }
}
```

### 4.3 Response Schema
```json
{
  "traceId": "trc_9a7d3f82e1c045b1",
  "status": "ACCEPTED",
  "score": 0,
  "action": "ALLOW",
  "evidenceConfidence": 0.95,
  "verified": {
    "tokenValid": true,
    "replaySafe": true,
    "freshnessMs": 42
  },
  "evaluatedAt": "2026-08-21T12:00:00.000Z"
}
```

---

## 5. 🗄️ Distributed Storage Adapter Interface

### 5.1 Distributed Counter Store (`DistributedCounterStore`)
```typescript
export interface DistributedCounterStore {
  increment(key: string, options: { windowMs: number }): Promise<{ count: number; expiresAt: number }>;
  get(key: string): Promise<number>;
  reset(key: string): Promise<void>;
}
```

### 5.2 Persistent Risk Event Store (`PersistentRiskEventStore`)
```typescript
export interface PersistentRiskEventStore {
  append(event: StoredRiskEventV2): Promise<void>;
  query(filters: { fromDate?: string; toDate?: string; minScore?: number; limit?: number }): Promise<StoredRiskEventV2[]>;
  findById(traceId: string): Promise<StoredRiskEventV2 | null>;
}
```

---

## 6. 🗺️ Implementation Roadmap to v0.6

| Phase | Milestone Task | Focus Area |
| :---: | :--- | :--- |
| **Phase 1** | Threat Model & Trust Boundary Formalization | Security & Cryptographic Contract (This Document) |
| **Phase 2** | Collector Server Engine (`@ameva/sentinel-collector`) | Express / Fastify / Node HTTP Middleware & HMAC Verifier |
| **Phase 3** | Nonce Replay & Atomic Sliding-Window Store | Redis Adapter & Memory Fallback with atomic locks |
| **Phase 4** | PostgreSQL Audit Ledger Adapter | High-throughput batch writer for compliance auditing |
| **Phase 5** | End-to-End Distributed Verification Suite | Integration tests verifying replay injection & signature tampering |
