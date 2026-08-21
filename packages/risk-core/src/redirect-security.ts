export interface RedirectValidationResult {
  valid: boolean;
  error?: string;
  sanitizedUrl?: string;
}

const FORBIDDEN_PROTOCOLS = /^(javascript|data|file|vbscript|about):/i;
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F\r\n]/;

const HOSTNAME_LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const IPV4_RE = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

/**
 * Normalizes and validates an allowed redirect hostname according to RFC 1123 and IPv4 specifications.
 * Strips whitespace, lowercases, removes trailing dot, and rejects malformed labels, protocols, ports, or injections.
 */
export function normalizeAllowedHost(value: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Invalid allowed host: expected non-empty string, got ${typeof value}`);
  }
  const host = value.trim().toLowerCase().replace(/\.$/, '');
  if (
    !host ||
    host.length > 253 ||
    host.includes('/') ||
    host.includes(':') ||
    host.includes('@') ||
    host.includes('?') ||
    host.includes('#') ||
    host.includes('%') ||
    host.includes('_') ||
    /\s/.test(host)
  ) {
    throw new Error(`Invalid allowed host format: "${value}". Must be a valid hostname or IPv4 without protocol, port, path, or credentials.`);
  }

  // IPv4 literal or localhost
  if (host === 'localhost' || IPV4_RE.test(host)) {
    return host;
  }

  // RFC 1123 DNS Label Validation
  const labels = host.split('.');
  for (const label of labels) {
    if (!label || !HOSTNAME_LABEL_RE.test(label)) {
      throw new Error(`Invalid allowed host label: "${label}" in "${value}". Labels must contain only alphanumeric characters or hyphens and cannot start or end with a hyphen.`);
    }
  }

  return host;
}

export interface RedirectValidationOptions {
  allowedHosts?: string[];
  allowSubdomains?: boolean; // default true: permits 'sub.example.com' for allowedHost 'example.com'
  allowRelative?: boolean;   // default true: permits '/path' relative redirects
}

/**
 * Validates redirect destination URLs against Open Redirect, CRLF, and protocol injection attacks.
 * Supports exact hostname matching and optional subdomain matching (allowSubdomains: true by default).
 */
export function validateRedirectUrl(
  rawUrl: string,
  options: RedirectValidationOptions = {}
): RedirectValidationResult {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return { valid: false, error: 'Redirect URL must be a non-empty string' };
  }

  const trimmed = rawUrl.trim();

  // Guard 1: Max URL length
  if (trimmed.length > 2048) {
    return { valid: false, error: 'URL exceeds maximum length of 2048 characters' };
  }

  // Guard 2: Control characters, CRLF injection, and backslashes
  if (CONTROL_CHARACTERS.test(trimmed)) {
    return { valid: false, error: 'URL contains forbidden control characters or CRLF' };
  }

  if (trimmed.includes('\\')) {
    return { valid: false, error: 'URL contains forbidden backslash characters' };
  }

  // Guard 3: Protocol-relative URLs (//evil.com)
  if (trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return { valid: false, error: 'Protocol-relative URLs (//) are strictly prohibited' };
  }

  // Guard 4: Forbidden dangerous schemes
  if (FORBIDDEN_PROTOCOLS.test(trimmed)) {
    return { valid: false, error: 'Dangerous URL protocol scheme detected' };
  }

  // Guard 5: Relative URL normalization and validation
  if (trimmed.startsWith('/')) {
    if (options.allowRelative !== false) {
      try {
        const dummyBase = new URL('https://internal.sentinel.base');
        const parsedRel = new URL(trimmed, dummyBase);
        if (parsedRel.origin !== dummyBase.origin) {
          return { valid: false, error: 'Relative URL parsed across origin boundary' };
        }
        return { valid: true, sanitizedUrl: parsedRel.pathname + parsedRel.search + parsedRel.hash };
      } catch (err) {
        return { valid: false, error: 'Malformed relative URL structure' };
      }
    }
    return { valid: false, error: 'Relative URLs are not permitted in this context' };
  }

  // Guard 6: Absolute URL Parsing & Host / Credential validation
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch (err) {
    return { valid: false, error: 'Malformed URL structure' };
  }

  // Protocol must be HTTPS (or HTTP for localhost in local dev)
  const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLocalhost)) {
    return { valid: false, error: 'Redirect URL must use https: protocol' };
  }

  // User credentials in URL (user:pass@host)
  if (parsed.username || parsed.password) {
    return { valid: false, error: 'URLs with embedded user credentials are prohibited' };
  }

  // Host Whitelist check
  if (options.allowedHosts && options.allowedHosts.length > 0) {
    const allowSub = options.allowSubdomains !== false;
    let normalizedAllowedHosts: string[];
    try {
      normalizedAllowedHosts = options.allowedHosts.map(normalizeAllowedHost);
    } catch (err: any) {
      return { valid: false, error: err.message };
    }

    const currentHost = parsed.hostname.toLowerCase().replace(/\.$/, '');
    const hostAllowed = normalizedAllowedHosts.some(h => (
      currentHost === h || (allowSub && currentHost.endsWith(`.${h}`))
    ));
    if (!hostAllowed) {
      return { valid: false, error: `Host ${parsed.hostname} is not in allowed redirect whitelist` };
    }
  }

  return { valid: true, sanitizedUrl: parsed.toString() };
}
