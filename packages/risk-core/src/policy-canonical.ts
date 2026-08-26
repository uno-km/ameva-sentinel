/**
 * @file policy-canonical.ts
 * Deterministic JSON Canonicalization, SHA-256 Checksum, and Schema Validation.
 * Edge-Safe, zero external dependencies, self-contained standard SHA-256.
 */

import { CostPolicyConfig, PolicyIdentity } from './budget-types.js';

// Standard SHA-256 Pure Implementation (Zero-Dependency)
function rightRotate(n: number, count: number): number {
  return (n >>> count) | (n << (32 - count));
}

export function computeSha256Bytes(data: Uint8Array): Uint8Array {
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

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const length = data.length;
  const bitLength = length * 8;
  const newLength = ((length + 8) >> 6) + 1;
  const blocks = new Uint32Array(newLength * 16);

  for (let i = 0; i < length; i++) {
    blocks[i >> 2] |= data[i] << (24 - (i % 4) * 8);
  }
  blocks[length >> 2] |= 0x80 << (24 - (length % 4) * 8);
  blocks[blocks.length - 1] = bitLength;

  const w = new Uint32Array(64);
  for (let i = 0; i < blocks.length; i += 16) {
    for (let t = 0; t < 16; t++) {
      w[t] = blocks[i + t];
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rightRotate(w[t - 15], 7) ^ rightRotate(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rightRotate(w[t - 2], 17) ^ rightRotate(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

    for (let t = 0; t < 64; t++) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + K[t] + w[t]) | 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  const result = new Uint8Array(32);
  const hashes = [h0, h1, h2, h3, h4, h5, h6, h7];
  for (let i = 0; i < 8; i++) {
    result[i * 4] = (hashes[i] >>> 24) & 0xff;
    result[i * 4 + 1] = (hashes[i] >>> 16) & 0xff;
    result[i * 4 + 2] = (hashes[i] >>> 8) & 0xff;
    result[i * 4 + 3] = hashes[i] & 0xff;
  }
  return result;
}

export const SAFE_FALLBACK_COST_POLICY: CostPolicyConfig = {
  schema_version: '1.0',
  policy_version: 'cost-guard-fallback.0',
  defaults: {
    cost: 10,
    authentication: 'optional',
    page_size_default: 25,
    page_size_max: 50,
    query_timeout_ms: 2000,
    lock_timeout_ms: 500,
    max_data_points: 5000,
    max_request_body_bytes: 1048576,
    max_response_bytes: 1048576,
    failure_mode: 'allow_with_emergency_cap',
    shadow_mode: true
  },
  rate_limit_tiers: {
    anonymous_network: {
      capacity: 100,
      refill_tokens_per_minute: 100,
      emergency_local_capacity: 30
    },
    session: {
      capacity: 300,
      refill_tokens_per_minute: 300,
      emergency_local_capacity: 50
    },
    authenticated_key: {
      capacity: 2000,
      refill_tokens_per_minute: 2000,
      emergency_local_capacity: 200
    }
  },
  routes: [
    {
      method: 'GET',
      path: '/health',
      cost: 1,
      query_timeout_ms: 500,
      lock_timeout_ms: 200,
      max_request_body_bytes: 65536,
      max_response_bytes: 65536,
      failure_mode: 'allow'
    },
    {
      method: 'GET',
      path: '/api/v1/health',
      cost: 1,
      query_timeout_ms: 500,
      lock_timeout_ms: 200,
      max_request_body_bytes: 65536,
      max_response_bytes: 65536,
      failure_mode: 'allow'
    }
  ]
};

export function canonicalizePolicyJson(obj: unknown): string {
  if (obj === null || typeof obj === 'boolean' || typeof obj === 'string') {
    return JSON.stringify(obj);
  }

  if (typeof obj === 'number') {
    if (!Number.isFinite(obj)) {
      throw new Error('Non-finite numbers (NaN/Infinity) are forbidden in canonical policy');
    }
    if (Object.is(obj, -0)) {
      return '0';
    }
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalizePolicyJson).join(',') + ']';
  }

  if (typeof obj === 'object') {
    const rawObj = obj as Record<string, unknown>;
    const sortedKeys = Object.keys(rawObj)
      .filter(k => rawObj[k] !== undefined)
      .sort();
    const pairs = sortedKeys.map(
      key => `${JSON.stringify(key)}:${canonicalizePolicyJson(rawObj[key])}`
    );
    return '{' + pairs.join(',') + '}';
  }

  return JSON.stringify(obj);
}

export function computePolicyChecksum(policy: CostPolicyConfig): PolicyIdentity {
  const canonicalStr = canonicalizePolicyJson(policy);
  const bytes = computeSha256Bytes(new TextEncoder().encode(canonicalStr));
  const fullHex = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return {
    checksumSha256: fullHex,
    displayChecksum: fullHex.slice(0, 16)
  };
}

export function hashKeyIdentifier(val: string): string {
  const bytes = computeSha256Bytes(new TextEncoder().encode(val));
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

const VALID_HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', '*']);
const VALID_FAILURE_MODES = new Set(['allow', 'allow_with_emergency_cap', 'deny']);
const VALID_AUTH_MODES = new Set(['optional', 'required', 'admin_only']);

export function validateCostPolicy(raw: unknown): CostPolicyConfig {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Cost policy must be a non-null object');
  }

  const p = raw as Partial<CostPolicyConfig>;

  const allowedRootKeys = new Set(['schema_version', 'policy_version', 'defaults', 'rate_limit_tiers', 'routes']);
  for (const k of Object.keys(p)) {
    if (!allowedRootKeys.has(k)) {
      throw new Error(`Unknown field '${k}' is forbidden in cost policy`);
    }
  }

  if (p.schema_version !== '1.0') {
    throw new Error("Missing or invalid 'schema_version' (expected '1.0')");
  }

  if (!p.policy_version || typeof p.policy_version !== 'string' || p.policy_version.trim() === '') {
    throw new Error("Missing or invalid 'policy_version' (expected non-empty string)");
  }

  if (!p.defaults || typeof p.defaults !== 'object') {
    throw new Error("Missing or invalid 'defaults' object");
  }

  const allowedDefaultsKeys = new Set([
    'cost',
    'authentication',
    'page_size_default',
    'page_size_max',
    'query_timeout_ms',
    'lock_timeout_ms',
    'max_data_points',
    'max_request_body_bytes',
    'max_response_bytes',
    'failure_mode',
    'shadow_mode'
  ]);
  for (const k of Object.keys(p.defaults)) {
    if (!allowedDefaultsKeys.has(k)) {
      throw new Error(`Unknown field '${k}' is forbidden in defaults`);
    }
  }

  const d = p.defaults;
  if (typeof d.cost !== 'number' || !Number.isInteger(d.cost) || d.cost <= 0) {
    throw new Error('defaults.cost must be a positive integer');
  }

  if (typeof d.page_size_default !== 'number' || !Number.isInteger(d.page_size_default) || d.page_size_default <= 0) {
    throw new Error('defaults.page_size_default must be a positive integer');
  }

  if (typeof d.page_size_max !== 'number' || !Number.isInteger(d.page_size_max) || d.page_size_max <= 0) {
    throw new Error('defaults.page_size_max must be a positive integer');
  }

  if (d.page_size_default > d.page_size_max) {
    throw new Error('defaults.page_size_default cannot exceed defaults.page_size_max');
  }

  if (typeof d.query_timeout_ms !== 'number' || !Number.isInteger(d.query_timeout_ms) || d.query_timeout_ms < 10 || d.query_timeout_ms > 60000) {
    throw new Error('defaults.query_timeout_ms must be an integer between 10ms and 60000ms');
  }

  if (typeof d.lock_timeout_ms !== 'number' || !Number.isInteger(d.lock_timeout_ms) || d.lock_timeout_ms < 10 || d.lock_timeout_ms > 10000) {
    throw new Error('defaults.lock_timeout_ms must be an integer between 10ms and 10000ms');
  }

  if (typeof d.max_data_points !== 'number' || !Number.isInteger(d.max_data_points) || d.max_data_points <= 0) {
    throw new Error('defaults.max_data_points must be a positive integer');
  }

  if (typeof d.max_request_body_bytes !== 'number' || !Number.isInteger(d.max_request_body_bytes) || d.max_request_body_bytes < 1024 || d.max_request_body_bytes > 52428800) {
    throw new Error('defaults.max_request_body_bytes must be an integer between 1024 and 52428800 bytes');
  }

  if (typeof d.max_response_bytes !== 'number' || !Number.isInteger(d.max_response_bytes) || d.max_response_bytes < 1024 || d.max_response_bytes > 52428800) {
    throw new Error('defaults.max_response_bytes must be an integer between 1024 and 52428800 bytes');
  }

  if (d.authentication && !VALID_AUTH_MODES.has(d.authentication)) {
    throw new Error(`Invalid defaults.authentication '${d.authentication}'`);
  }

  if (d.failure_mode && !VALID_FAILURE_MODES.has(d.failure_mode)) {
    throw new Error(`Invalid defaults.failure_mode '${d.failure_mode}'`);
  }

  if (typeof d.shadow_mode !== 'boolean') {
    throw new Error('defaults.shadow_mode must be a boolean');
  }

  const rate_limit_tiers = p.rate_limit_tiers || {};
  for (const [tierName, tier] of Object.entries(rate_limit_tiers)) {
    if (!tier || typeof tier !== 'object') {
      throw new Error(`Rate limit tier '${tierName}' must be an object`);
    }
    const allowedTierKeys = new Set(['capacity', 'refill_tokens_per_minute', 'emergency_local_capacity']);
    for (const k of Object.keys(tier)) {
      if (!allowedTierKeys.has(k)) {
        throw new Error(`Unknown field '${k}' in rate_limit_tiers.${tierName}`);
      }
    }
    if (typeof tier.capacity !== 'number' || !Number.isInteger(tier.capacity) || tier.capacity <= 0) {
      throw new Error(`rate_limit_tiers.${tierName}.capacity must be a positive integer`);
    }
    if (typeof tier.refill_tokens_per_minute !== 'number' || !Number.isInteger(tier.refill_tokens_per_minute) || tier.refill_tokens_per_minute <= 0) {
      throw new Error(`rate_limit_tiers.${tierName}.refill_tokens_per_minute must be a positive integer`);
    }
    if (typeof tier.emergency_local_capacity !== 'number' || !Number.isInteger(tier.emergency_local_capacity) || tier.emergency_local_capacity <= 0) {
      throw new Error(`rate_limit_tiers.${tierName}.emergency_local_capacity must be a positive integer`);
    }
  }

  const routes = p.routes || [];
  const seenRoutes = new Set<string>();
  const allowedRouteKeys = new Set([
    'method',
    'path',
    'cost',
    'authentication',
    'page_size_default',
    'page_size_max',
    'query_timeout_ms',
    'lock_timeout_ms',
    'max_data_points',
    'max_request_body_bytes',
    'max_response_bytes',
    'failure_mode',
    'shadow_mode'
  ]);

  for (const r of routes) {
    if (!r || typeof r !== 'object') {
      throw new Error('Each route policy must be an object');
    }
    for (const k of Object.keys(r)) {
      if (!allowedRouteKeys.has(k)) {
        throw new Error(`Unknown field '${k}' in route policy '${r.method} ${r.path}'`);
      }
    }
    if (!r.method || !VALID_HTTP_METHODS.has(r.method)) {
      throw new Error(`Route missing or invalid 'method': ${r.method}`);
    }
    if (!r.path || typeof r.path !== 'string' || r.path.trim() === '') {
      throw new Error("Route missing or invalid 'path'");
    }
    if (typeof r.cost !== 'number' || !Number.isInteger(r.cost) || r.cost <= 0) {
      throw new Error(`Route '${r.method} ${r.path}' cost must be a positive integer`);
    }

    if (r.authentication !== undefined && !VALID_AUTH_MODES.has(r.authentication)) {
      throw new Error(`Invalid route '${r.method} ${r.path}' authentication '${r.authentication}'`);
    }
    if (r.failure_mode !== undefined && !VALID_FAILURE_MODES.has(r.failure_mode)) {
      throw new Error(`Invalid route '${r.method} ${r.path}' failure_mode '${r.failure_mode}'`);
    }
    if (r.shadow_mode !== undefined && typeof r.shadow_mode !== 'boolean') {
      throw new Error(`Route '${r.method} ${r.path}' shadow_mode must be a boolean`);
    }

    if (r.page_size_default !== undefined && (typeof r.page_size_default !== 'number' || !Number.isInteger(r.page_size_default) || r.page_size_default <= 0)) {
      throw new Error(`Route '${r.method} ${r.path}' page_size_default must be a positive integer`);
    }
    if (r.page_size_max !== undefined && (typeof r.page_size_max !== 'number' || !Number.isInteger(r.page_size_max) || r.page_size_max <= 0)) {
      throw new Error(`Route '${r.method} ${r.path}' page_size_max must be a positive integer`);
    }
    if (r.page_size_default !== undefined && r.page_size_max !== undefined && r.page_size_default > r.page_size_max) {
      throw new Error(`Route '${r.method} ${r.path}' page_size_default exceeds page_size_max`);
    }

    if (r.query_timeout_ms !== undefined && (typeof r.query_timeout_ms !== 'number' || !Number.isInteger(r.query_timeout_ms) || r.query_timeout_ms < 10 || r.query_timeout_ms > 60000)) {
      throw new Error(`Route '${r.method} ${r.path}' query_timeout_ms must be an integer between 10ms and 60000ms`);
    }
    if (r.lock_timeout_ms !== undefined && (typeof r.lock_timeout_ms !== 'number' || !Number.isInteger(r.lock_timeout_ms) || r.lock_timeout_ms < 10 || r.lock_timeout_ms > 10000)) {
      throw new Error(`Route '${r.method} ${r.path}' lock_timeout_ms must be an integer between 10ms and 10000ms`);
    }
    if (r.max_data_points !== undefined && (typeof r.max_data_points !== 'number' || !Number.isInteger(r.max_data_points) || r.max_data_points <= 0)) {
      throw new Error(`Route '${r.method} ${r.path}' max_data_points must be a positive integer`);
    }

    if (r.max_request_body_bytes !== undefined && (typeof r.max_request_body_bytes !== 'number' || !Number.isInteger(r.max_request_body_bytes) || r.max_request_body_bytes < 1024 || r.max_request_body_bytes > 52428800)) {
      throw new Error(`Route '${r.method} ${r.path}' max_request_body_bytes must be an integer between 1024 and 52428800 bytes`);
    }
    if (r.max_response_bytes !== undefined && (typeof r.max_response_bytes !== 'number' || !Number.isInteger(r.max_response_bytes) || r.max_response_bytes < 1024 || r.max_response_bytes > 52428800)) {
      throw new Error(`Route '${r.method} ${r.path}' max_response_bytes must be an integer between 1024 and 52428800 bytes`);
    }

    const routeKey = `${r.method.toUpperCase()}:${r.path.replace(/\/+$/, '') || '/'}`;
    if (seenRoutes.has(routeKey)) {
      throw new Error(`Duplicate route policy defined: ${routeKey}`);
    }
    seenRoutes.add(routeKey);
  }

  return {
    schema_version: p.schema_version,
    policy_version: p.policy_version,
    defaults: p.defaults,
    rate_limit_tiers,
    routes
  };
}
