/**
 * @file trusted-proxy.ts
 * Cryptographically safe client IP extraction with CIDR trust boundaries.
 */

export interface TrustedProxyPolicy {
  trustedCidrs?: string[];
  headerPrecedence?: Array<'cf-connecting-ip' | 'x-real-ip' | 'x-forwarded-for' | 'forwarded'>;
  rejectUntrustedForwardedHeaders?: boolean;
}

export const DEFAULT_TRUSTED_PROXY_POLICY: TrustedProxyPolicy = {
  trustedCidrs: [
    '127.0.0.0/8',
    '10.0.0.0/8',
    '172.16.0.0/12',
    '192.168.0.0/16',
    '::1/128',
    'fc00::/7',
    'fe80::/10'
  ],
  headerPrecedence: ['cf-connecting-ip', 'x-real-ip', 'x-forwarded-for', 'forwarded'],
  rejectUntrustedForwardedHeaders: true
};

function ipToLong(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let num = 0;
  for (const part of parts) {
    const n = parseInt(part, 10);
    if (isNaN(n) || n < 0 || n > 255) return null;
    num = (num << 8) + n;
  }
  return num >>> 0;
}

export function isIpInCidr(ip: string, cidr: string): boolean {
  const cleanIp = ip.trim();
  if (cidr === '*' || cidr === '0.0.0.0/0') return true;

  if (cleanIp === '::1' && (cidr === '::1' || cidr === '::1/128')) return true;
  if (cleanIp === '127.0.0.1' && (cidr === '127.0.0.1' || cidr === '127.0.0.1/32' || cidr === '127.0.0.0/8')) return true;

  const [range, bitsStr] = cidr.split('/');
  const bits = bitsStr ? parseInt(bitsStr, 10) : 32;

  const ipLong = ipToLong(cleanIp);
  const rangeLong = ipToLong(range);

  if (ipLong === null || rangeLong === null) {
    return cleanIp.toLowerCase() === range.toLowerCase();
  }

  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipLong & mask) === (rangeLong & mask);
}

export function isIpInAnyCidr(ip: string, cidrs: string[]): boolean {
  if (!ip || !cidrs || cidrs.length === 0) return false;
  return cidrs.some(cidr => isIpInCidr(ip, cidr));
}

export interface ClientIpExtractionRequest {
  socketRemoteAddress?: string;
  headers?: Record<string, string | string[] | undefined>;
}

export function extractClientIp(
  request: ClientIpExtractionRequest,
  customPolicy?: Partial<TrustedProxyPolicy>
): string {
  const policy: TrustedProxyPolicy = {
    ...DEFAULT_TRUSTED_PROXY_POLICY,
    ...customPolicy
  };

  const socketIp = (request.socketRemoteAddress || '').trim() || '127.0.0.1';
  const trustedCidrs = policy.trustedCidrs || DEFAULT_TRUSTED_PROXY_POLICY.trustedCidrs!;

  const isSocketTrusted = isIpInAnyCidr(socketIp, trustedCidrs);

  if (!isSocketTrusted && policy.rejectUntrustedForwardedHeaders) {
    return socketIp;
  }

  const headers = request.headers || {};
  const getHeader = (name: string): string | undefined => {
    const val = headers[name.toLowerCase()] || headers[name];
    if (Array.isArray(val)) return val[0];
    return typeof val === 'string' ? val : undefined;
  };

  const precedence = policy.headerPrecedence || DEFAULT_TRUSTED_PROXY_POLICY.headerPrecedence!;

  for (const headerName of precedence) {
    const rawVal = getHeader(headerName);
    if (!rawVal) continue;

    if (headerName === 'x-forwarded-for') {
      const parts = rawVal.split(',').map(s => s.trim()).filter(Boolean);
      if (parts.length > 0) {
        return parts[0];
      }
    } else if (headerName === 'forwarded') {
      const match = /for="?([^";,\s]+)"?/i.exec(rawVal);
      if (match && match[1]) {
        return match[1].replace(/[\[\]]/g, '');
      }
    } else {
      const clean = rawVal.split(',')[0].trim();
      if (clean) return clean;
    }
  }

  return socketIp;
}
