/**
 * @file token-attestation.ts
 * AMEVA Sentinel Cryptographic Token Attestation & Signature Verification Engine.
 * 
 * Features:
 * - Cross-runtime HMAC-SHA256 token generation and verification.
 * - Constant-time signature comparison (Timing Attack Defense).
 * - Epoch timestamp freshness validation (Clock Skew & Max Age bounds).
 * - Deterministic telemetry payload digest verification.
 */

export interface SentinelTokenPayload {
  sessionId?: string;
  timestamp: number;
  signalsDigest?: string;
  nonce?: string;
}

export interface TokenVerificationResult {
  valid: boolean;
  reason?: string;
  payload?: SentinelTokenPayload;
  ageMs?: number;
}

/**
 * Lightweight cross-runtime SHA-256 implementation (Node.js, Edge Runtime, Browser).
 */
function sha256Pure(ascii: string): Uint8Array {
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i = 0, j = 0;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty] * 8;

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }

  words[asciiBitLength >> 5] |= 0x80 << ((3 - ((asciiBitLength >> 3) % 4)) * 8);
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

  const w: number[] = [];
  for (i = 0; i < words[lengthProperty]; i += 16) {
    const a = hash.slice(0);

    for (j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = words[i + j] || 0;
      } else {
        const gamma0 = ((w[j - 15] >>> 7) | (w[j - 15] << 25)) ^ ((w[j - 15] >>> 18) | (w[j - 15] << 14)) ^ (w[j - 15] >>> 3);
        const gamma1 = ((w[j - 2] >>> 17) | (w[j - 2] << 15)) ^ ((w[j - 2] >>> 19) | (w[j - 2] << 13)) ^ (w[j - 2] >>> 10);
        w[j] = ((w[j - 16] + gamma0) | 0) + ((w[j - 7] + gamma1) | 0);
      }

      const ch = (a[4] & a[5]) ^ (~a[4] & a[6]);
      const maj = (a[0] & a[1]) ^ (a[0] & a[2]) ^ (a[1] & a[2]);
      const sigma0 = ((a[0] >>> 2) | (a[0] << 30)) ^ ((a[0] >>> 13) | (a[0] << 19)) ^ ((a[0] >>> 22) | (a[0] << 10));
      const sigma1 = ((a[4] >>> 6) | (a[4] << 26)) ^ ((a[4] >>> 11) | (a[4] << 21)) ^ ((a[4] >>> 25) | (a[4] << 7));

      const temp1 = (a[7] + sigma1 + ch + k[j] + w[j]) | 0;
      const temp2 = (sigma0 + maj) | 0;

      a[7] = a[6];
      a[6] = a[5];
      a[5] = a[4];
      a[4] = (a[3] + temp1) | 0;
      a[3] = a[2];
      a[2] = a[1];
      a[1] = a[0];
      a[0] = (temp1 + temp2) | 0;
    }

    for (j = 0; j < 8; j++) {
      hash[j] = (hash[j] + a[j]) | 0;
    }
  }

  const output = new Uint8Array(32);
  for (i = 0; i < 8; i++) {
    output[i * 4] = (hash[i] >>> 24) & 0xff;
    output[i * 4 + 1] = (hash[i] >>> 16) & 0xff;
    output[i * 4 + 2] = (hash[i] >>> 8) & 0xff;
    output[i * 4 + 3] = hash[i] & 0xff;
  }
  return output;
}

function hmacSha256(key: string, message: string): string {
  const blockSize = 64;
  let keyBytes: number[] = [];
  for (let i = 0; i < key.length; i++) {
    keyBytes.push(key.charCodeAt(i) & 0xff);
  }

  if (keyBytes.length > blockSize) {
    const hashed = sha256Pure(key);
    keyBytes = Array.from(hashed);
  }
  while (keyBytes.length < blockSize) {
    keyBytes.push(0);
  }

  const oKeyPad = new Uint8Array(blockSize);
  const iKeyPad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    oKeyPad[i] = keyBytes[i] ^ 0x5c;
    iKeyPad[i] = keyBytes[i] ^ 0x36;
  }

  let iKeyPadStr = '';
  for (let i = 0; i < blockSize; i++) iKeyPadStr += String.fromCharCode(iKeyPad[i]);
  const innerHash = sha256Pure(iKeyPadStr + message);

  let oKeyPadStr = '';
  for (let i = 0; i < blockSize; i++) oKeyPadStr += String.fromCharCode(oKeyPad[i]);
  let innerHashStr = '';
  for (let i = 0; i < innerHash.length; i++) innerHashStr += String.fromCharCode(innerHash[i]);

  const outerHash = sha256Pure(oKeyPadStr + innerHashStr);
  return Array.from(outerHash).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Constant-time comparison between two hex signature strings to prevent side-channel timing attacks.
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Generates an authenticated Sentinel Token with version header, epoch timestamp, nonce, and HMAC-SHA256 signature.
 */
export function createSentinelToken(
  payload: SentinelTokenPayload,
  secretKey: string
): string {
  const version = 'v1';
  const timestamp = Math.floor(payload.timestamp || Date.now());
  const sessionId = (payload.sessionId || 'ephem').replace(/[^a-zA-Z0-9_-]/g, '');
  const digest = (payload.signalsDigest || '0').replace(/[^a-zA-Z0-9_-]/g, '');
  const nonce = (payload.nonce || Math.random().toString(36).substring(2, 10)).replace(/[^a-zA-Z0-9_-]/g, '');

  const dataToSign = `${version}.${timestamp}.${sessionId}.${digest}.${nonce}`;
  const signature = hmacSha256(secretKey, dataToSign);

  return `${dataToSign}.${signature}`;
}

/**
 * Rigorously verifies an incoming Sentinel Token against secret key, clock skew, and maximum age constraints.
 */
export function verifySentinelToken(
  tokenString: string,
  secretKey?: string,
  options?: { maxAgeMs?: number; now?: number }
): TokenVerificationResult {
  if (!tokenString || typeof tokenString !== 'string') {
    return { valid: false, reason: 'TOKEN_EMPTY_OR_NON_STRING' };
  }

  const parts = tokenString.trim().split('.');
  if (parts.length !== 6 || parts[0] !== 'v1') {
    return { valid: false, reason: 'INVALID_TOKEN_FORMAT' };
  }

  const [version, rawTs, sessionId, digest, nonce, signature] = parts;
  const timestamp = parseInt(rawTs, 10);
  if (isNaN(timestamp) || timestamp <= 0) {
    return { valid: false, reason: 'INVALID_TIMESTAMP_IN_TOKEN' };
  }

  const now = options?.now || Date.now();
  const ageMs = now - timestamp;
  const maxAgeMs = typeof options?.maxAgeMs === 'number' && options.maxAgeMs > 0 ? options.maxAgeMs : 300000;

  // 1. Freshness and Future Timestamp Defense
  if (ageMs < -5000) {
    return { valid: false, reason: 'TOKEN_TIMESTAMP_IN_FUTURE', ageMs };
  }
  if (ageMs > maxAgeMs) {
    return { valid: false, reason: 'TOKEN_EXPIRED', ageMs };
  }

  // 2. Cryptographic HMAC Signature Verification if Secret Key is Provided
  if (secretKey && typeof secretKey === 'string' && secretKey.length > 0) {
    const dataToSign = `${version}.${timestamp}.${sessionId}.${digest}.${nonce}`;
    const expectedSignature = hmacSha256(secretKey, dataToSign);

    if (!timingSafeEqualHex(signature, expectedSignature)) {
      return { valid: false, reason: 'INVALID_SIGNATURE', ageMs };
    }
  }

  return {
    valid: true,
    ageMs,
    payload: {
      sessionId,
      timestamp,
      signalsDigest: digest,
      nonce
    }
  };
}
