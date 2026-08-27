/**
 * @file trusted-proxy.ts
 * Cryptographically safe client IP extraction with CIDR trust boundaries.
 */

import ipaddr from 'ipaddr.js';
import { ClientAddressFinding, ClientAddressInspection } from './budget-types.js';

export type TrustedForwardedHeader = 'forwarded' | 'x-forwarded-for' | 'x-real-ip' | 'cf-connecting-ip';

export interface TrustedProxyPolicy {
  trustedCidrs: readonly string[];
  headerPrecedence: readonly TrustedForwardedHeader[];
  rejectUntrustedForwardedHeaders: boolean;
  rejectConflictingHeaders: boolean;
  maxForwardedHops: number;
}

export const DEFAULT_TRUSTED_PROXY_POLICY: TrustedProxyPolicy = Object.freeze({
  trustedCidrs: Object.freeze([] as string[]),
  headerPrecedence: Object.freeze(['forwarded', 'x-forwarded-for'] as TrustedForwardedHeader[]),
  rejectUntrustedForwardedHeaders: true,
  rejectConflictingHeaders: true,
  maxForwardedHops: 1,
});

export type NormalizedIp = {
  address: string;
  family: 'ipv4' | 'ipv6';
};

export function normalizeIp(rawValue: string | undefined | null): NormalizedIp | null {
  if (
    typeof rawValue !== 'string' ||
    rawValue.length === 0 ||
    rawValue.length > 128 ||
    rawValue.includes('%')
  ) {
    return null;
  }

  let candidate = rawValue.trim();

  // Strip brackets from IPv6 with optional port [2001:db8::1]:443
  if (candidate.startsWith('[') && candidate.includes(']')) {
    const closingBracket = candidate.indexOf(']');
    const suffix = candidate.slice(closingBracket + 1);
    if (suffix && !/^:\d{1,5}$/.test(suffix)) {
      return null;
    }
    candidate = candidate.slice(1, closingBracket);
  } else if (/^(\d{1,3}\.){3}\d{1,3}:\d{1,5}$/.test(candidate)) {
    candidate = candidate.split(':')[0];
  }

  if (!ipaddr.isValid(candidate)) {
    return null;
  }

  let parsed = ipaddr.parse(candidate);

  if (parsed.kind() === 'ipv6' && (parsed as ipaddr.IPv6).isIPv4MappedAddress()) {
    parsed = (parsed as ipaddr.IPv6).toIPv4Address();
  }

  return {
    address: parsed.toNormalizedString(),
    family: parsed.kind() === 'ipv4' ? 'ipv4' : 'ipv6',
  };
}

export function isIpInCidr(rawIp: string, rawCidr: string): boolean {
  const normalized = normalizeIp(rawIp);
  if (!normalized) {
    return false;
  }

  if (rawCidr === '*' || rawCidr === '0.0.0.0/0') {
    return true;
  }

  try {
    const [range, prefix] = ipaddr.parseCIDR(rawCidr);

    let address = ipaddr.parse(normalized.address);

    if (address.kind() === 'ipv6' && (address as ipaddr.IPv6).isIPv4MappedAddress()) {
      address = (address as ipaddr.IPv6).toIPv4Address();
    }

    if (address.kind() !== range.kind()) {
      return false;
    }

    return address.match(range, prefix);
  } catch {
    return false;
  }
}

export function isIpInAnyCidr(ip: string, cidrs: readonly string[]): boolean {
  if (!ip || !cidrs || cidrs.length === 0) return false;
  return cidrs.some((cidr) => isIpInCidr(ip, cidr));
}

export interface ClientIpExtractionRequest {
  socketRemoteAddress?: string | null;
  headers?: Record<string, string | string[] | undefined>;
}

export function parseAndValidateIp(raw: string): string | null {
  const norm = normalizeIp(raw);
  return norm ? norm.address : null;
}

export function parseForwardedHeaderStrictly(headerName: string, rawValue: string): string[] {
  if (headerName === 'forwarded') {
    const ips: string[] = [];
    const entries = rawValue.split(',');
    for (const entry of entries) {
      const match = /for="?([^";,\s]+)"?/i.exec(entry.trim());
      if (match && match[1]) {
        const cleaned = match[1].replace(/[\[\]]/g, '');
        const norm = parseAndValidateIp(cleaned);
        if (norm) ips.push(norm);
      }
    }
    return ips;
  }

  if (headerName === 'x-forwarded-for') {
    const parts = rawValue.split(',').map((s) => s.trim()).filter(Boolean);
    const ips: string[] = [];
    for (const part of parts) {
      const norm = parseAndValidateIp(part);
      if (norm) ips.push(norm);
    }
    return ips;
  }

  const first = rawValue.split(',')[0].trim();
  const norm = parseAndValidateIp(first);
  return norm ? [norm] : [];
}

export function selectFromForwardedChain(
  socketIp: string,
  forwardedIps: readonly string[],
  trustedCidrs: readonly string[],
  maxForwardedHops: number
): string {
  if (forwardedIps.length === 0) {
    throw new Error('EMPTY_FORWARDED_CHAIN');
  }
  if (forwardedIps.length > maxForwardedHops) {
    throw new Error('FORWARDED_HOP_LIMIT_EXCEEDED');
  }

  const chain = [...forwardedIps, socketIp];

  for (let index = chain.length - 1; index >= 0; index -= 1) {
    const candidate = chain[index];
    if (!trustedCidrs.some((cidr) => isIpInCidr(candidate, cidr))) {
      return candidate;
    }
  }

  return forwardedIps[0];
}

export function inspectClientAddress(
  request: ClientIpExtractionRequest,
  customPolicy: Partial<TrustedProxyPolicy> = {}
): ClientAddressInspection {
  const policy: TrustedProxyPolicy = {
    ...DEFAULT_TRUSTED_PROXY_POLICY,
    ...customPolicy,
  };

  const findings: ClientAddressFinding[] = [];
  const normalizedSocket = normalizeIp(request.socketRemoteAddress);
  const headers = request.headers ?? {};
  const getHeader = (name: string): string | undefined => {
    const val = headers[name.toLowerCase()] || headers[name];
    if (Array.isArray(val)) return val[0];
    return typeof val === 'string' ? val : undefined;
  };

  const presentHeaders: Array<{ name: TrustedForwardedHeader; value: string }> = [];
  for (const h of policy.headerPrecedence) {
    const val = getHeader(h);
    if (val && val.trim().length > 0) {
      presentHeaders.push({ name: h, value: val.trim() });
    }
  }

  const socketAddress = normalizedSocket ? normalizedSocket.address : null;

  if (!normalizedSocket) {
    if (presentHeaders.length > 0) {
      findings.push({
        code: 'MISSING_OR_INVALID_SOCKET_REMOTE_ADDRESS',
        severity: 'high',
        message: 'Socket remote address is missing or invalid while forwarded headers are present.'
      });
      return {
        socketAddress: null,
        clientAddress: null,
        forwardedAddress: presentHeaders[0]?.value || null,
        source: 'unknown',
        trust: 'invalid',
        findings
      };
    }
    return {
      socketAddress: null,
      clientAddress: null,
      forwardedAddress: null,
      source: 'unknown',
      trust: 'trusted',
      findings
    };
  }

  const socketIp = normalizedSocket.address;
  const socketTrusted = isIpInAnyCidr(socketIp, policy.trustedCidrs);

  if (presentHeaders.length === 0) {
    return {
      socketAddress: socketIp,
      clientAddress: socketIp,
      forwardedAddress: null,
      source: 'socket',
      trust: 'trusted',
      findings
    };
  }

  if (!socketTrusted) {
    findings.push({
      code: 'UNTRUSTED_FORWARDED_HEADERS',
      severity: 'high',
      message: 'Socket remote address is not in trusted CIDR list, ignoring forwarded headers.'
    });
    return {
      socketAddress: socketIp,
      clientAddress: socketIp,
      forwardedAddress: presentHeaders[0].value,
      source: 'socket',
      trust: 'untrusted',
      findings
    };
  }

  if (policy.rejectConflictingHeaders && presentHeaders.length > 1) {
    findings.push({
      code: 'CONFLICTING_FORWARDED_HEADERS',
      severity: 'high',
      message: 'Multiple conflicting forwarded headers present.'
    });
  }

  const selected = presentHeaders[0];
  const forwardedIps = parseForwardedHeaderStrictly(selected.name, selected.value);

  if (forwardedIps.length === 0) {
    findings.push({
      code: 'INVALID_FORWARDED_ADDRESS',
      severity: 'medium',
      message: 'Forwarded header value contained no valid IP addresses.'
    });
    return {
      socketAddress: socketIp,
      clientAddress: socketIp,
      forwardedAddress: selected.value,
      source: 'socket',
      trust: 'invalid',
      findings
    };
  }

  if (forwardedIps.length > policy.maxForwardedHops) {
    findings.push({
      code: 'FORWARDED_HOP_LIMIT_EXCEEDED',
      severity: 'high',
      message: `Forwarded hops (${forwardedIps.length}) exceeded limit (${policy.maxForwardedHops}).`
    });
    return {
      socketAddress: socketIp,
      clientAddress: socketIp,
      forwardedAddress: selected.value,
      source: 'socket',
      trust: 'invalid',
      findings
    };
  }

  let resolvedClientIp = socketIp;
  try {
    resolvedClientIp = selectFromForwardedChain(
      socketIp,
      forwardedIps,
      policy.trustedCidrs,
      policy.maxForwardedHops
    );
  } catch (err: any) {
    findings.push({
      code: err.message || 'FORWARDED_RESOLUTION_ERROR',
      severity: 'high',
      message: err.message || 'Error resolving forwarded chain'
    });
  }

  return {
    socketAddress: socketIp,
    clientAddress: resolvedClientIp,
    forwardedAddress: selected.value,
    source: resolvedClientIp === socketIp ? 'socket' : 'forwarded',
    trust: findings.length > 0 ? 'untrusted' : 'trusted',
    findings
  };
}

/**
 * @deprecated Legacy convenience function. For pure non-throwing inspection, use `inspectClientAddress()`.
 */
export function extractClientIp(
  request: ClientIpExtractionRequest,
  customPolicy: Partial<TrustedProxyPolicy> = {}
): string {
  const policy: TrustedProxyPolicy = {
    ...DEFAULT_TRUSTED_PROXY_POLICY,
    ...customPolicy,
  };

  const normalizedSocket = normalizeIp(request.socketRemoteAddress);
  const headers = request.headers ?? {};
  const getHeader = (name: string): string | undefined => {
    const val = headers[name.toLowerCase()] || headers[name];
    if (Array.isArray(val)) return val[0];
    return typeof val === 'string' ? val : undefined;
  };

  const presentHeaders: Array<{ name: TrustedForwardedHeader; value: string }> = [];
  for (const h of policy.headerPrecedence) {
    const val = getHeader(h);
    if (val && val.trim().length > 0) {
      presentHeaders.push({ name: h, value: val.trim() });
    }
  }

  if (!normalizedSocket) {
    if (presentHeaders.length > 0) {
      throw new Error('MISSING_OR_INVALID_SOCKET_REMOTE_ADDRESS');
    }
    return 'unknown';
  }

  const socketIp = normalizedSocket.address;
  const socketTrusted = isIpInAnyCidr(socketIp, policy.trustedCidrs);

  if (!socketTrusted) {
    if (policy.rejectUntrustedForwardedHeaders && presentHeaders.length > 0) {
      throw new Error('UNTRUSTED_FORWARDED_HEADERS');
    }
    return socketIp;
  }

  if (policy.rejectConflictingHeaders && presentHeaders.length > 1) {
    throw new Error('CONFLICTING_FORWARDED_HEADERS');
  }

  if (presentHeaders.length === 0) {
    return socketIp;
  }

  const selected = presentHeaders[0];
  const forwardedIps = parseForwardedHeaderStrictly(selected.name, selected.value);

  return selectFromForwardedChain(
    socketIp,
    forwardedIps,
    policy.trustedCidrs,
    policy.maxForwardedHops
  );
}
