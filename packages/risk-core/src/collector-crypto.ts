import {
  CollectorTokenPayload,
  VerifiedCollectorContext,
  KeyResolver,
  NonceNamespace,
  NonceStore,
  CollectorErrorCode
} from './types.js';

export class CollectorVerificationError extends Error {
  readonly code: CollectorErrorCode;
  readonly httpStatus: number;

  constructor(code: CollectorErrorCode, message: string, httpStatus: number = 400) {
    super(message);
    this.name = 'CollectorVerificationError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

// Unexported internal Symbol guaranteeing brand unforgeability outside this module
const VERIFIED_COLLECTOR_BRAND = Symbol('AMEVA_VERIFIED_COLLECTOR_INTERNAL');

/**
 * In-memory Nonce Store with bounded capacity and multi-tenant namespace (Single-thread synchronous execution).
 * Note: For distributed multi-instance architectures, deploy Redis SET NX or equivalent distributed adapters.
 */
export class MemoryNonceStore implements NonceStore {
  private nonces = new Map<string, number>();
  private readonly maxEntries: number;

  constructor(options: { maxEntries?: number } = {}) {
    this.maxEntries = options.maxEntries ?? 10000;
  }

  async consume(namespace: NonceNamespace, expiresAtEpochMs: number): Promise<boolean> {
    if (!namespace || !namespace.issuer || !namespace.kid || !namespace.nonce) {
      return false;
    }
    const key = `${namespace.issuer}:${namespace.kid}:${namespace.nonce}`;
    this.prune();

    if (this.nonces.has(key)) {
      return false; // Replay detected!
    }

    if (this.nonces.size >= this.maxEntries) {
      this.prune();
      if (this.nonces.size >= this.maxEntries) {
        throw new CollectorVerificationError(
          'NONCE_STORE_CAPACITY_REACHED',
          `Nonce store capacity limit (${this.maxEntries} entries) reached`,
          503
        );
      }
    }

    this.nonces.set(key, expiresAtEpochMs);
    return true;
  }

  private prune(): void {
    const now = Date.now();
    for (const [key, exp] of this.nonces.entries()) {
      if (exp <= now) {
        this.nonces.delete(key);
      }
    }
  }
}

/**
 * Static Key Resolver for HMAC verification
 */
export class StaticKeyResolver implements KeyResolver {
  constructor(private keys: Record<string, string>) {}

  async resolveKey(kid: string): Promise<string | null> {
    return this.keys[kid] || null;
  }
}

/**
 * Strictly unexported internal factory creating unforgeable VerifiedCollectorContext
 */
function createVerifiedCollectorContext(payload: CollectorTokenPayload): VerifiedCollectorContext {
  return Object.freeze({
    [VERIFIED_COLLECTOR_BRAND]: true as const,
    kid: payload.kid,
    issuer: payload.iss,
    audience: payload.aud,
    sessionRef: payload.sessionRef,
    issuedAtEpochMs: payload.iat,
    expiresAtEpochMs: payload.exp
  }) as unknown as VerifiedCollectorContext;
}

/**
 * Internal guard checking if an object is an authentic VerifiedCollectorContext
 */
export function isVerifiedCollectorContext(obj: unknown): obj is VerifiedCollectorContext {
  return typeof obj === 'object' && obj !== null && (obj as any)[VERIFIED_COLLECTOR_BRAND] === true;
}

/**
 * AMEVA Deterministic Canonical JSON Subset
 * Handles primitives, objects with sorted keys, and arrays without circular references.
 */
export function canonicalizeJsonSubset(obj: unknown, seen = new Set<unknown>()): string {
  if (obj === null) return 'null';
  if (typeof obj === 'number') {
    if (!Number.isFinite(obj)) {
      throw new CollectorVerificationError('MALFORMED_TOKEN', 'Non-finite numbers are not permitted in canonical JSON', 400);
    }
    return JSON.stringify(obj);
  }
  if (typeof obj === 'boolean' || typeof obj === 'string') {
    return JSON.stringify(obj);
  }
  if (typeof obj === 'undefined') {
    throw new CollectorVerificationError('MALFORMED_TOKEN', 'Undefined values are not permitted in canonical JSON', 400);
  }
  if (typeof obj !== 'object') {
    throw new CollectorVerificationError('MALFORMED_TOKEN', `Unsupported type ${typeof obj} in canonical JSON`, 400);
  }

  if (seen.has(obj)) {
    throw new CollectorVerificationError('MALFORMED_TOKEN', 'Circular reference detected in payload', 400);
  }
  seen.add(obj);

  if (Array.isArray(obj)) {
    const items = obj.map(item => canonicalizeJsonSubset(item, seen));
    seen.delete(obj);
    return '[' + items.join(',') + ']';
  }

  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const entries = keys.map(k => `${JSON.stringify(k)}:${canonicalizeJsonSubset((obj as Record<string, unknown>)[k], seen)}`);
  seen.delete(obj);
  return '{' + entries.join(',') + '}';
}

const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;

export function assertBase64UrlSegment(segment: string, name: string): void {
  if (!segment || typeof segment !== 'string' || !BASE64URL_RE.test(segment) || segment.length % 4 === 1) {
    throw new CollectorVerificationError('MALFORMED_TOKEN', `Invalid ${name} Base64URL encoding`, 400);
  }
}

/**
 * Safe Base64URL utilities (Browser & Node isomorphic)
 */
export function base64UrlEncode(data: string | Uint8Array): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = typeof btoa === 'function' ? btoa(binary) : (globalThis as any).Buffer.from(bytes).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlDecodeToBytes(str: string): Uint8Array {
  assertBase64UrlSegment(str, 'segment');
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  return new Uint8Array((globalThis as any).Buffer.from(base64, 'base64'));
}

export function base64UrlDecode(str: string): string {
  const bytes = base64UrlDecodeToBytes(str);
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

/**
 * Length pre-checked constant-time buffer comparison
 */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/**
 * Pure Isomorphic SHA-256 (NIST FIPS 180-4 compliant)
 */
export function computeSha256(data: Uint8Array): Uint8Array {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const l = data.length * 8;
  const k = ((448 - (l + 8) % 512) + 512) % 512;
  const paddedLen = (l + 8 + k + 64) / 8;
  const padded = new Uint8Array(paddedLen);
  padded.set(data);
  padded[data.length] = 0x80;

  const view = new DataView(padded.buffer, padded.byteOffset, padded.byteLength);
  view.setUint32(paddedLen - 8, Math.floor(data.length / 0x20000000) >>> 0, false);
  view.setUint32(paddedLen - 4, (l >>> 0), false);

  const W = new Uint32Array(64);
  const rotr = (n: number, x: number) => (x >>> n) | (x << (32 - n));

  for (let i = 0; i < paddedLen; i += 64) {
    for (let t = 0; t < 16; t++) {
      W[t] = view.getUint32(i + t * 4, false);
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(7, W[t - 15]) ^ rotr(18, W[t - 15]) ^ (W[t - 15] >>> 3);
      const s1 = rotr(17, W[t - 2]) ^ rotr(19, W[t - 2]) ^ (W[t - 2] >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
    }

    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];

    for (let t = 0; t < 64; t++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) {
    outView.setUint32(i * 4, H[i], false);
  }
  return out;
}

/**
 * Pure Isomorphic HMAC-SHA256 generator (RFC 4231 compliant)
 */
export function computeHmacSha256(key: string | Uint8Array, data: string | Uint8Array): Uint8Array {
  const encoder = new TextEncoder();
  const keyBytes = typeof key === 'string' ? encoder.encode(key) : key;
  const dataBytes = typeof data === 'string' ? encoder.encode(data) : data;

  const blockSize = 64;
  let finalKey = keyBytes;
  if (keyBytes.length > blockSize) {
    finalKey = computeSha256(keyBytes);
  }
  const paddedKey = new Uint8Array(blockSize);
  paddedKey.set(finalKey);

  const oKeyPad = new Uint8Array(blockSize);
  const iKeyPad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    oKeyPad[i] = paddedKey[i] ^ 0x5c;
    iKeyPad[i] = paddedKey[i] ^ 0x36;
  }

  const inner = new Uint8Array(blockSize + dataBytes.length);
  inner.set(iKeyPad);
  inner.set(dataBytes, blockSize);
  const innerHash = computeSha256(inner);

  const outer = new Uint8Array(blockSize + innerHash.length);
  outer.set(oKeyPad);
  outer.set(innerHash, blockSize);
  return computeSha256(outer);
}

/**
 * Server-side helper to sign a valid `sv1` token
 */
export function signCollectorToken(payload: CollectorTokenPayload, secretKey: string): string {
  const canonical = canonicalizeJsonSubset(payload);
  const payloadB64 = base64UrlEncode(canonical);
  const signingInput = `sv1.${payloadB64}`;
  const sigBytes = computeHmacSha256(secretKey, signingInput);
  const sigB64 = base64UrlEncode(sigBytes);
  return `${signingInput}.${sigB64}`;
}

export interface VerifyTokenOptions {
  expectedAudience: string; // REQUIRED: Non-empty string
  expectedPurpose: string;  // REQUIRED: Non-empty string
  allowedIssuers?: string[]; // Whitelist of authorized issuers
  maxClockSkewMs?: number;   // default 30,000ms
  maxTokenLifetimeMs?: number; // default 300,000ms (5 min)
  nowEpochMs?: number;
}

/**
 * Strict sv1 Token Verifier Pipeline (Fail-Closed, Non-malleable, Oracle-Resistant)
 */
export async function verifyCollectorToken(
  token: string,
  keyResolver: KeyResolver,
  nonceStore: NonceStore,
  options: VerifyTokenOptions
): Promise<VerifiedCollectorContext> {
  // Guard 0: Mandatory configuration check
  if (!options || typeof options.expectedAudience !== 'string' || !options.expectedAudience.trim()) {
    throw new CollectorVerificationError('CONFIGURATION_ERROR', 'options.expectedAudience must be a non-empty string', 500);
  }
  if (typeof options.expectedPurpose !== 'string' || !options.expectedPurpose.trim()) {
    throw new CollectorVerificationError('CONFIGURATION_ERROR', 'options.expectedPurpose must be a non-empty string', 500);
  }

  // Step 1: Max token size check (4096 bytes)
  if (typeof token !== 'string' || token.length === 0 || token.length > 4096) {
    throw new CollectorVerificationError('MALFORMED_TOKEN', 'Token exceeds maximum allowed size of 4096 bytes or is empty', 400);
  }

  // Step 2: Format and segment validation (sv1.<payload_b64>.<sig_b64>)
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'sv1') {
    throw new CollectorVerificationError('MALFORMED_TOKEN', 'Invalid token format. Expected sv1.<payload>.<sig>', 400);
  }

  const [, payloadB64, sigB64] = parts;
  assertBase64UrlSegment(payloadB64, 'payload');
  assertBase64UrlSegment(sigB64, 'signature');

  // Step 3: Base64URL Decode and Payload Parse
  let payload: CollectorTokenPayload;
  try {
    const rawJson = base64UrlDecode(payloadB64);
    payload = JSON.parse(rawJson);
  } catch (err) {
    throw new CollectorVerificationError('MALFORMED_TOKEN', 'Failed to decode or parse token payload JSON', 400);
  }

  // Mandatory fields & safe integer checks
  if (
    payload.v !== 1 ||
    typeof payload.kid !== 'string' || !payload.kid ||
    typeof payload.iss !== 'string' || !payload.iss ||
    typeof payload.aud !== 'string' || !payload.aud ||
    typeof payload.purpose !== 'string' || !payload.purpose ||
    !Number.isSafeInteger(payload.iat) || payload.iat <= 0 ||
    !Number.isSafeInteger(payload.exp) || payload.exp <= 0 ||
    typeof payload.nonce !== 'string' || !payload.nonce ||
    typeof payload.sessionRef !== 'string'
  ) {
    throw new CollectorVerificationError('MALFORMED_TOKEN', 'Token payload contains invalid or missing mandatory claims', 400);
  }

  // Step 4: Key ID Resolution
  const secretKey = await keyResolver.resolveKey(payload.kid);
  if (!secretKey) {
    throw new CollectorVerificationError('UNKNOWN_KEY_ID', `Key ID "${payload.kid}" is not recognized or has been revoked`, 401);
  }

  // Step 5: Canonical Form Verification (Malleability Defense)
  const canonical = canonicalizeJsonSubset(payload);
  const reEncodedPayloadB64 = base64UrlEncode(canonical);
  if (payloadB64 !== reEncodedPayloadB64) {
    throw new CollectorVerificationError('MALFORMED_TOKEN', 'Token payload is not in canonical form', 400);
  }

  // Step 6: Constant-Time HMAC Signature Verification
  const signingInput = `sv1.${reEncodedPayloadB64}`;
  const expectedSigBytes = computeHmacSha256(secretKey, signingInput);
  const providedSigBytes = base64UrlDecodeToBytes(sigB64);

  if (!constantTimeEqual(expectedSigBytes, providedSigBytes)) {
    throw new CollectorVerificationError('INVALID_SIGNATURE', 'Cryptographic signature verification failed', 401);
  }

  // Step 7: Lifetime & Expiration Check
  const now = options.nowEpochMs ?? Date.now();
  if (payload.exp <= payload.iat) {
    throw new CollectorVerificationError('MALFORMED_TOKEN', 'Token expiration must be strictly greater than issued timestamp', 400);
  }

  const maxLifetime = options.maxTokenLifetimeMs ?? 300000;
  if ((payload.exp - payload.iat) > maxLifetime) {
    throw new CollectorVerificationError('MALFORMED_TOKEN', `Token lifetime exceeds maximum allowed duration (${maxLifetime}ms)`, 400);
  }

  if (payload.exp < now) {
    throw new CollectorVerificationError('TOKEN_EXPIRED', 'Collector token has expired', 401);
  }

  // Step 8: Timestamp Freshness Window Check (+- 30s default)
  const maxClockSkewMs = options.maxClockSkewMs ?? 30000;
  if (Math.abs(now - payload.iat) > maxClockSkewMs) {
    throw new CollectorVerificationError('INVALID_TIMESTAMP_FRESHNESS', 'Token timestamp violates freshness window', 401);
  }

  // Step 9: Audience & Purpose Validation
  if (payload.aud !== options.expectedAudience) {
    throw new CollectorVerificationError('AUDIENCE_MISMATCH', `Expected audience "${options.expectedAudience}", got "${payload.aud}"`, 403);
  }
  if (payload.purpose !== options.expectedPurpose) {
    throw new CollectorVerificationError('PURPOSE_MISMATCH', `Expected purpose "${options.expectedPurpose}", got "${payload.purpose}"`, 403);
  }

  // Step 10: Issuer Whitelist Check
  if (options.allowedIssuers && options.allowedIssuers.length > 0) {
    if (!options.allowedIssuers.includes(payload.iss)) {
      throw new CollectorVerificationError('UNAUTHORIZED_ISSUER', `Issuer "${payload.iss}" is not in authorized issuers whitelist`, 403);
    }
  }

  // Step 11: Replay Defense (Multi-Tenant Nonce Consumption in single-threaded event loop)
  const namespace: NonceNamespace = {
    issuer: payload.iss,
    kid: payload.kid,
    nonce: payload.nonce
  };
  const nonceAccepted = await nonceStore.consume(namespace, payload.exp);
  if (!nonceAccepted) {
    throw new CollectorVerificationError('REPLAY_ATTACK_DETECTED', `Nonce "${payload.nonce}" has already been used for issuer "${payload.iss}" (Replay Attack Detected)`, 409);
  }

  // Step 12: Return Unforgeable Branded Verified Context
  return createVerifiedCollectorContext(payload);
}

/**
 * Stream and multi-byte safe Request JSON body reader with hard byte-level limits
 */
export async function readJsonBodyLimited(request: any, maxBytes = 65536): Promise<any> {
  if (!request) return {};

  // Standard Fetch / Web Request with stream body
  if (typeof request.headers?.get === 'function') {
    const contentLength = request.headers.get('content-length');
    if (contentLength && Number.isFinite(Number(contentLength)) && Number(contentLength) > maxBytes) {
      throw new CollectorVerificationError('REQUEST_BODY_TOO_LARGE', `Request body exceeds maximum size of ${maxBytes} bytes`, 413);
    }

    if (request.body && typeof request.body.getReader === 'function') {
      const reader = request.body.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) {
          await reader.cancel();
          throw new CollectorVerificationError('REQUEST_BODY_TOO_LARGE', `Request body exceeds maximum size of ${maxBytes} bytes`, 413);
        }
        chunks.push(value);
      }
      const bytes = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      let text = '';
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      } catch {
        throw new CollectorVerificationError('MALFORMED_REQUEST_BODY', 'Request body contains invalid UTF-8 encoding', 400);
      }
      try {
        return text.trim() ? JSON.parse(text) : {};
      } catch {
        throw new CollectorVerificationError('MALFORMED_REQUEST_BODY', 'Request body contains invalid JSON syntax', 400);
      }
    }
  }

  // Pre-parsed object or raw string body in Node / Express / Fastify / Mock objects
  if (request.body !== undefined && request.body !== null) {
    if (typeof request.body === 'string') {
      const bytes = new TextEncoder().encode(request.body);
      if (bytes.byteLength > maxBytes) {
        throw new CollectorVerificationError('REQUEST_BODY_TOO_LARGE', `Request body exceeds maximum size of ${maxBytes} bytes`, 413);
      }
      try {
        return request.body.trim() ? JSON.parse(request.body) : {};
      } catch {
        throw new CollectorVerificationError('MALFORMED_REQUEST_BODY', 'Request body contains invalid JSON syntax', 400);
      }
    }
    if (typeof request.body === 'object' && !ArrayBuffer.isView(request.body)) {
      let serialized: string;
      try {
        serialized = JSON.stringify(request.body);
      } catch {
        throw new CollectorVerificationError('MALFORMED_REQUEST_BODY', 'Request body is not JSON-serializable', 400);
      }
      const bytes = new TextEncoder().encode(serialized);
      if (bytes.byteLength > maxBytes) {
        throw new CollectorVerificationError('REQUEST_BODY_TOO_LARGE', `Request body exceeds maximum size of ${maxBytes} bytes`, 413);
      }
      return request.body;
    }
  }

  // Fetch / Web Request .json() method fallback
  if (typeof request.json === 'function') {
    try {
      const parsed = await request.json();
      if (parsed !== null && typeof parsed === 'object' && !ArrayBuffer.isView(parsed)) {
        const serialized = JSON.stringify(parsed);
        const bytes = new TextEncoder().encode(serialized);
        if (bytes.byteLength > maxBytes) {
          throw new CollectorVerificationError('REQUEST_BODY_TOO_LARGE', `Request body exceeds maximum size of ${maxBytes} bytes`, 413);
        }
      }
      return parsed ?? {};
    } catch (err: any) {
      if (err instanceof CollectorVerificationError) throw err;
      throw new CollectorVerificationError('MALFORMED_REQUEST_BODY', 'Request body contains invalid JSON or UTF-8', 400);
    }
  }

  return {};
}
