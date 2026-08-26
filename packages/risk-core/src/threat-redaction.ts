/**
 * @file threat-redaction.ts
 * Bounded PII Redaction and Anonymization for Threat Telemetry.
 */

import { RedactedThreatEvent } from './budget-types.js';

export const ALLOWED_EVIDENCE_CODES = new Set([
  'MALFORMED_INPUT',
  'SQLI_SUSPECT',
  'AUTH_BYPASS_ATTEMPT',
  'RATE_LIMIT_EXCEEDED',
  'REPLAY_DETECTED',
  'PATH_TRAVERSAL_SUSPECT',
  'BUDGET_OVERRUN'
]);

export function sanitizeThreatEvent(raw: {
  signature?: string;
  routeTemplate?: string;
  asn?: number;
  statusCode?: number;
  evidenceCode?: string;
  timestamp?: number;
}): RedactedThreatEvent {
  const sig = raw.signature ? String(raw.signature).slice(0, 64) : 'unknown';
  const route = raw.routeTemplate ? String(raw.routeTemplate).slice(0, 128) : '/';
  const asn = typeof raw.asn === 'number' && Number.isFinite(raw.asn) ? Math.floor(raw.asn) : 0;
  const status = typeof raw.statusCode === 'number' ? Math.floor(raw.statusCode) : undefined;
  const code = raw.evidenceCode && ALLOWED_EVIDENCE_CODES.has(raw.evidenceCode) ? raw.evidenceCode : undefined;
  const ts = typeof raw.timestamp === 'number' && Number.isFinite(raw.timestamp) ? raw.timestamp : Date.now() / 1000;

  return {
    signature: sig,
    routeTemplate: route,
    asn,
    statusCode: status,
    evidenceCode: code,
    timestamp: ts
  };
}
