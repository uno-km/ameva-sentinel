# 🛡️ AMEVA Sentinel v0.6 Architecture Specification
# Data Trust Boundaries & Security Model (Canonical Spec)

> **Document Version**: `1.1.0-RFC`  
> **Status**: `Approved RFC / SSOT for v0.6.0 Development`  
> **Classification**: Security Architecture & Trust Boundary Model  
> **Author**: AMEVA Core Security Engineering Team

---

## 1. 🎯 Foundational Philosophy & Threat Model

> **"Browser telemetry represents software-observed signals, not unforgeable hardware proofs."**  
> *(A client running inside user-controlled memory can forge JavaScript variables, but cannot forge server-held cryptographic proofs or replay expired nonces against synchronized server clocks.)*

In the AMEVA Sentinel ecosystem, zero trust is placed on raw client-supplied claims. Security observability is achieved by strictly isolating **untrusted client inputs**, **short-lived cryptographic token envelopes**, and **server-side verification**.

```text
┌─────────────────────────── UNTRUSTED ZONE ───────────────────────────┐
│  Browser Client Runtime                                              │
│  - Raw DOM Events, Pointer Moves, Touch Signals (Software Observed)   │
│  - Ephemeral Collector Token (sv1.<payload>.<hmac> Envelope)         │
└───────────────────────────────────┬───────────────────────────────────┘
                                    │ HTTPS POST /api/v1/sentinel/collect
                                    ▼
┌──────────────────────────── TRUSTED ZONE ────────────────────────────┐
│  Server-Side Collector Endpoint                                      │
│  ├── 1. Request Sanitation & Size Limits (Body <= 64KB, Token <= 4096)│
│  ├── 2. Key Ring Lookup (kid) & Length-Safe HMAC Verification        │
│  │      (crypto.timingSafeEqual after length pre-check)              │
│  ├── 3. Freshness & Timestamp Window Validation (|Δt| <= 30s)        │
│  ├── 4. Nonce Consumption (In-Memory Check-and-Set / Redis SET NX)   │
│  │      ├── If Nonce Already Exists: REJECT (409) -> Security Audit  │
│  │      └── If Nonce Fresh & Consumed: PROCEED                       │
│  ├── 5. Server Context Extraction (Trusted Proxy Whitelisted Peer IP)│
│  └── 6. Deterministic Risk Core Engine Evaluation                    │
└───────────────────────────────────┬───────────────────────────────────┘
                                    ▼
┌────────────────────── PERSISTENT STATE STORAGE ──────────────────────┐
│  Distributed Adapters                                                │
│  ├── Fixed-Window Counter: Redis / Distributed Key-Value Store       │
│  ├── Auditable Event Ledger: PostgreSQL / Write-Ahead Store          │
│  └── Security Incident Ledger: Dedicated Audit Log (Replay/Tampering)│
└───────────────────────────────────────────────────────────────────────┘
```

---

## 2. 🧱 The 6 Data Trust Boundary Categories

Every field and signal processed by Sentinel must belong to exactly one of the six trust tiers:

| Trust Tier | Source | Cryptographic Status | Mutability & Replayability | Examples |
| :--- | :--- | :--- | :--- | :--- |
| **`Untrusted`** | Client HTTP Headers & Body | None | High (Attacker Controlled) | `User-Agent`, `Referer`, raw body JSON, claimed identity |
| **`Observed`** | Browser Telemetry SDK | Software Instrumentation | Moderate (Spoofable in sandbox) | `isTrustedEventsCount`, `pointerEventCount`, `webdriver` flag |
| **`Signed`** | Issued by Application Server | HMAC-SHA256 Signed Envelope | Payload integrity protected; Replayable unless nonce consumed | `sv1.<base64url(payload)>.<base64url(hmac)>` |
| **`Verified`** | Evaluated by Collector | Cryptographically Proven | Sovereign (Immutable) | Signature valid + recognized `kid` + valid `aud`/`purpose` + fresh timestamp + consumed unique nonce |
| **`Trusted`** | Collector Server Origin | Machine-Local / Infrastructure | Sovereign (Source of Truth) | Server System Time, Socket Peer IP (Whitelisted Proxy), Master Secret |
| **`Derived`** | Risk Engine Core | Deterministic Algorithmic Output | Read-Only | Risk Score `0~100`, `SentinelAction`, Evidence List, `traceId` |

---

## 3. 🔐 Cryptographic Token & Replay Defense Specification

### 3.1 Versioned Envelope Token Format (`sv1`)
Collection tokens must follow the deterministic format:
```text
sv1.<base64url_canonical_payload>.<base64url_hmac_sha256>
```

### 3.2 Token Payload Schema (Epoch Milliseconds)
```json
{
  "v": 1,
  "kid": "collector-2026-08-a",
  "iss": "ameva-app-auth",
  "aud": "ameva-sentinel-collector",
  "purpose": "telemetry-collect",
  "iat": 1787277600000,
  "exp": 1787277660000,
  "nonce": "c4b8d1e2f3a4567890abcdef",
  "sessionRef": "sess_89a7fbc2"
}
```
> **Timestamp Unit Requirement**: `iat` and `exp` must be positive integer Unix timestamps in **milliseconds** (e.g. `Date.now()`).

### 3.3 AMEVA Deterministic Canonical JSON Subset
> *AMEVA deterministic canonical JSON subset. This is not a complete RFC 8785 implementation.*
1. Keys must be sorted lexicographically by UTF-16 code units (`Object.keys().sort()`).
2. Zero extraneous whitespace between tokens (`{"aud":"...","exp":123}`).
3. Strings encoded in UTF-8 without BOM.
4. Non-finite numbers (NaN, Infinity) and circular references are strictly forbidden and throw.

### 3.4 Verification & Replay Protection Invariants
When the Collector receives a token:
1. **Size Limit Check**: Raw token string $\le 4096$ characters.
2. **Key Ring Resolution**: Extract `kid`. If unknown or retired, reject with HTTP `401 Unauthorized` (`UNKNOWN_KEY_ID`).
3. **Length Pre-Checked Constant-Time Verification**:
   ```typescript
   if (actualSignatureBuffer.length !== expectedSignatureBuffer.length) {
     return { valid: false, error: 'SIGNATURE_LENGTH_MISMATCH' };
   }
   const isValid = crypto.timingSafeEqual(actualSignatureBuffer, expectedSignatureBuffer);
   ```
4. **Domain & Purpose Isolation**: Verify `aud === options.expectedAudience` and `purpose === options.expectedPurpose`.
5. **Freshness Window Check**:
   $$|t_{\text{server}} - t_{\text{iat}}| \le 30,000\,\text{ms} \quad \text{and} \quad t_{\text{server}} \le t_{\text{exp}}$$
6. **Multi-Tenant Nonce Consumption**:
   - Single instance: `MemoryNonceStore` synchronous in-memory consumption.
   - Distributed architecture: `SET sentinel:nonce:<iss>:<kid>:<nonce> 1 EX 60 NX` (Redis).
   - **If key already existed (Replay Attack)**:
     - Terminate pipeline immediately.
     - Return **HTTP `409 Conflict` (`REPLAY_ATTACK_DETECTED`)**.
     - Emit separate `SecurityAuditEvent` (`REPLAY_ATTACK_DETECTED`) to the security audit ledger.
     - **DO NOT** feed replayed payload into standard Risk Event store.

---

## 4. 📡 Collector API Schema Specification (v0.6 RFC)

### 4.1 Endpoint Contract
* **Method**: `POST`
* **Path**: `/api/v1/sentinel/collect`
* **Content-Type**: `application/json; charset=utf-8`
* **Max Payload Body Size**: `64 KB`

### 4.2 Request Body Schema
```json
{
  "token": "sv1.eyJhdWQiOiJhbWV2YS1zZW50aW5lbC1jb2xsZWN0b3IiLCJleHAiOjE3ODcyNzc2NjAsImlhdCI6MTc4NzI3NzYwMCwia2lkIjoiY29sbGVjdG9yLTIwMjYtMDgtYSIsImlzcyI6ImFldmEtYXBwLWF1dGgiLCJub25jZSI6ImM0YjhkMWUyZjNhNDU2Nzg5MGFiY2RlZiIsInB1cnBvc2UiOiJ0ZWxlbWV0cnktY29sbGVjdCIsInNlc3Npb25SZWYiOiJzZXNzXzg5YTdmYmMyIiwidiI6MX0.aW50ZWdyaXR5X3NpZ25hdHVyZQ",
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
    "sdkVersion": "0.6.0-alpha.1",
    "sessionId": "sess_89a7fbc2"
  }
}
```

### 4.3 Success Response Schema (HTTP 200 OK)
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

### 4.4 Security Rejection Schema (HTTP 401 / 409)
```json
{
  "error": "REPLAY_ATTACK_DETECTED",
  "message": "Collector token nonce has already been consumed within the active freshness window",
  "traceId": "trc_sec_9948a7b1c3e0",
  "rejectedAt": "2026-08-21T12:00:01.000Z"
}
```

---

## 5. 🌐 Trusted Proxy & Client IP Extraction

Collector endpoints running behind reverse proxies (Cloudflare, AWS ALB, NGINX) must enforce:
1. `trustedProxies` CIDR whitelist (e.g. `10.0.0.0/8`, `172.16.0.0/12`, Cloudflare IP ranges).
2. If remote peer IP is in whitelist: parse leftmost untrusted entry in `X-Forwarded-For` or `CF-Connecting-IP`.
3. If remote peer IP is NOT in whitelist: discard headers and use direct socket `remoteAddress` as sovereign trusted IP.

---

## 6. 🗄️ Distributed Storage Adapter Interface

### 6.1 Distributed Counter Store (`DistributedCounterStore`)
```typescript
export interface DistributedCounterStore {
  increment(key: string, options: { windowMs: number }): Promise<{ count: number; expiresAt: number }>;
  get(key: string): Promise<number>;
  reset(key: string): Promise<void>;
}
```

### 6.2 Persistent Risk Event Store (`PersistentRiskEventStore`)
```typescript
export interface PersistentRiskEventStore {
  append(event: StoredRiskEventV2): Promise<void>;
  query(filters: { fromDate?: string; toDate?: string; minScore?: number; limit?: number }): Promise<StoredRiskEventV2[]>;
  findById(traceId: string): Promise<StoredRiskEventV2 | null>;
}
```

### 6.3 Security Audit Event Store (`SecurityAuditEventStore`)
```typescript
export interface SecurityAuditEvent {
  incidentId: string;
  type: 'REPLAY_ATTACK_DETECTED' | 'INVALID_SIGNATURE' | 'EXPIRED_TOKEN' | 'KEY_ROTATION_MISSING';
  kid?: string;
  nonce?: string;
  sourceIp: string;
  occurredAt: string;
}

export interface SecurityAuditEventStore {
  logIncident(event: SecurityAuditEvent): Promise<void>;
}
```
