import {
  CollectorTokenPayload,
  VerifiedCollectorContext,
  KeyResolver,
  NonceStore,
  CollectorErrorCode,
  VERIFIED_COLLECTOR_BRAND
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

/**
 * In-memory atomic Nonce Store with automatic TTL cleanup
 */
export class MemoryNonceStore implements NonceStore {
  private nonces = new Map<string, number>();

  async consume(nonce: string, expiresAt: number): Promise<boolean> {
    this.prune();
    if (this.nonces.has(nonce)) {
      return false; // Replay detected!
    }
    this.nonces.set(nonce, expiresAt);
    return true;
  }

  private prune(): void {
    const now = Date.now();
    for (const [nonce, exp] of this.nonces.entries()) {
      if (exp <= now) {
        this.nonces.delete(nonce);
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
 * Creates unforgeable VerifiedCollectorContext branded with unexported module Symbol
 */
export function createVerifiedCollectorContext(payload: CollectorTokenPayload): VerifiedCollectorContext {
  return Object.freeze({
    [VERIFIED_COLLECTOR_BRAND]: true as const,
    kid: payload.kid,
    issuer: payload.iss,
    audience: payload.aud,
    sessionRef: payload.sessionRef,
    issuedAt: payload.iat,
    expiresAt: payload.exp
  });
}

/**
 * Checks if object is authentic VerifiedCollectorContext
 */
export function isVerifiedCollectorContext(obj: any): obj is VerifiedCollectorContext {
  return typeof obj === 'object' && obj !== null && obj[VERIFIED_COLLECTOR_BRAND] === true;
}

/**
 * Deterministic RFC 8785 Canonical JSON Serialization
 */
export function canonicalizeJson(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalizeJson).join(',') + ']';
  }
  const sortedKeys = Object.keys(obj).sort();
  const entries = sortedKeys.map(k => `${JSON.stringify(k)}:${canonicalizeJson(obj[k])}`);
  return '{' + entries.join(',') + '}';
}

/**
 * Safe Base64URL utilities (Zero dependencies, Browser & Node isomorphic)
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
  return new TextDecoder().decode(bytes);
}

/**
 * Length pre-checked constant-time comparison
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
 * Pure Isomorphic SHA-256 implementation (Zero dependencies)
 */
function sha256(data: Uint8Array): Uint8Array {
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
  view.setUint32(paddedLen - 4, l >>> 0);
  view.setUint32(paddedLen - 8, Math.floor(l / 0x100000000) >>> 0);

  const W = new Uint32Array(64);
  const rotr = (n: number, x: number) => (x >>> n) | (x << (32 - n));

  for (let i = 0; i < paddedLen; i += 64) {
    for (let t = 0; t < 16; t++) {
      W[t] = view.getUint32(i + t * 4);
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
    outView.setUint32(i * 4, H[i]);
  }
  return out;
}

/**
 * Pure Isomorphic HMAC-SHA256 generator
 */
export function computeHmacSha256(key: string | Uint8Array, data: string | Uint8Array): Uint8Array {
  const encoder = new TextEncoder();
  let keyBytes = typeof key === 'string' ? encoder.encode(key) : key;
  const dataBytes = typeof data === 'string' ? encoder.encode(data) : data;

  const blockSize = 64;
  if (keyBytes.length > blockSize) {
    keyBytes = sha256(keyBytes);
  }
  const paddedKey = new Uint8Array(blockSize);
  paddedKey.set(keyBytes);

  const oKeyPad = new Uint8Array(blockSize);
  const iKeyPad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    oKeyPad[i] = paddedKey[i] ^ 0x5c;
    iKeyPad[i] = paddedKey[i] ^ 0x36;
  }

  const inner = new Uint8Array(blockSize + dataBytes.length);
  inner.set(iKeyPad);
  inner.set(dataBytes, blockSize);
  const innerHash = sha256(inner);

  const outer = new Uint8Array(blockSize + innerHash.length);
  outer.set(oKeyPad);
  outer.set(innerHash, blockSize);
  return sha256(outer);
}

/**
 * Helper to generate a valid signed `sv1` token for testing and collectors
 */
export function signCollectorToken(payload: CollectorTokenPayload, secretKey: string): string {
  const canonical = canonicalizeJson(payload);
  const payloadB64 = base64UrlEncode(canonical);
  const signingInput = `sv1.${payloadB64}`;
  const sigBytes = computeHmacSha256(secretKey, signingInput);
  const sigB64 = base64UrlEncode(sigBytes);
  return `${signingInput}.${sigB64}`;
}

export interface VerifyTokenOptions {
  expectedAudience?: string;
  expectedPurpose?: string;
  maxClockSkewMs?: number;
  nowEpochMs?: number;
}

/**
 * Complete sv1 Envelope Token Verifier Pipeline
 */
export async function verifyCollectorToken(
  token: string,
  keyResolver: KeyResolver,
  nonceStore: NonceStore,
  options: VerifyTokenOptions = {}
): Promise<VerifiedCollectorContext> {
  // Step 1: Max token size check (4096 bytes)
  if (typeof token !== 'string' || token.length > 4096) {
    throw new CollectorVerificationError('MALFORMED_TOKEN', 'Token exceeds maximum allowed size of 4096 bytes', 400);
  }

  // Step 2: Format and segment validation (sv1.<payload_b64>.<sig_b64>)
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'sv1') {
    throw new CollectorVerificationError('MALFORMED_TOKEN', 'Invalid token format. Expected sv1.<payload>.<sig>', 400);
  }

  const [, payloadB64, sigB64] = parts;

  // Step 3: Base64URL Decode and Payload Parse
  let payload: CollectorTokenPayload;
  try {
    const rawJson = base64UrlDecode(payloadB64);
    payload = JSON.parse(rawJson);
  } catch (err) {
    throw new CollectorVerificationError('MALFORMED_TOKEN', 'Failed to decode or parse token payload JSON', 400);
  }

  // Mandatory fields check
  if (
    payload.v !== 1 ||
    typeof payload.kid !== 'string' ||
    typeof payload.iss !== 'string' ||
    typeof payload.aud !== 'string' ||
    typeof payload.purpose !== 'string' ||
    typeof payload.iat !== 'number' ||
    typeof payload.exp !== 'number' ||
    typeof payload.nonce !== 'string' ||
    typeof payload.sessionRef !== 'string'
  ) {
    throw new CollectorVerificationError('MALFORMED_TOKEN', 'Token payload is missing mandatory envelope claims', 400);
  }

  // Step 4: Key ID Resolution
  const secretKey = await keyResolver.resolveKey(payload.kid);
  if (!secretKey) {
    throw new CollectorVerificationError('UNKNOWN_KEY_ID', `Key ID "${payload.kid}" is not recognized or has been revoked`, 401);
  }

  // Step 5: Canonicalize & HMAC Constant-Time Verification
  const canonical = canonicalizeJson(payload);
  const reEncodedPayloadB64 = base64UrlEncode(canonical);
  const signingInput = `sv1.${reEncodedPayloadB64}`;
  const expectedSigBytes = computeHmacSha256(secretKey, signingInput);
  
  let providedSigBytes: Uint8Array;
  try {
    providedSigBytes = base64UrlDecodeToBytes(sigB64);
  } catch (err) {
    throw new CollectorVerificationError('INVALID_SIGNATURE', 'Invalid signature encoding', 401);
  }

  if (!constantTimeEqual(expectedSigBytes, providedSigBytes)) {
    throw new CollectorVerificationError('INVALID_SIGNATURE', 'Cryptographic signature verification failed', 401);
  }

  // Step 6: Expiration Check
  const now = options.nowEpochMs ?? Date.now();
  if (payload.exp < now) {
    throw new CollectorVerificationError('TOKEN_EXPIRED', 'Collector token has expired', 401);
  }

  // Step 7: Timestamp Freshness Window Check (+- 30s default)
  const maxClockSkewMs = options.maxClockSkewMs ?? 30000;
  if (Math.abs(now - payload.iat) > maxClockSkewMs) {
    throw new CollectorVerificationError('INVALID_TIMESTAMP_FRESHNESS', 'Token timestamp violates freshness window', 401);
  }

  // Step 8: Audience & Purpose Validation
  if (options.expectedAudience && payload.aud !== options.expectedAudience) {
    throw new CollectorVerificationError('AUDIENCE_MISMATCH', `Expected audience ${options.expectedAudience}, got ${payload.aud}`, 403);
  }
  if (options.expectedPurpose && payload.purpose !== options.expectedPurpose) {
    throw new CollectorVerificationError('PURPOSE_MISMATCH', `Expected purpose ${options.expectedPurpose}, got ${payload.purpose}`, 403);
  }

  // Step 9: Replay Defense (Atomic Nonce Consumption)
  const nonceAccepted = await nonceStore.consume(payload.nonce, payload.exp);
  if (!nonceAccepted) {
    throw new CollectorVerificationError('REPLAY_ATTACK_DETECTED', `Nonce "${payload.nonce}" has already been used (Replay Attack Detected)`, 409);
  }

  // Return Unforgeable Branded Verified Context
  return createVerifiedCollectorContext(payload);
}
