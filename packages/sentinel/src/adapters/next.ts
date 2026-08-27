/**
 * @file next.ts
 * Next.js Edge / Node Middleware Adapter for AMEVA-Sentinel Cost Guardrails.
 */

import {
  SentinelCostGuardEvaluator,
  VerifiedPrincipal,
  RequestCostContext,
  RequestShapeGuard,
  TrustedProxyPolicy,
  extractClientIp
} from '@ameva/sentinel-risk-core';

export function createNextCostGuard(options: {
  evaluator?: SentinelCostGuardEvaluator;
  principalResolver?: (req: any) => VerifiedPrincipal | undefined;
  trustedProxyPolicy?: Partial<TrustedProxyPolicy>;
} = {}) {
  const evaluator = options.evaluator || new SentinelCostGuardEvaluator();
  const principalResolver = options.principalResolver;
  const trustedProxyPolicy = options.trustedProxyPolicy;

  return async function sentinelNextMiddleware(req: any) {
    const url = new URL(req.url, 'http://localhost');
    const pathValidation = RequestShapeGuard.validatePath(url.pathname);
    if (!pathValidation.valid) {
      return new Response(JSON.stringify({ error: 'INVALID_REQUEST_PATH', message: pathValidation.message }), {
        status: 400,
        headers: { 'content-type': 'application/json' }
      });
    }

    const headersObj: Record<string, string> = {};
    if (req.headers && typeof req.headers.forEach === 'function') {
      req.headers.forEach((val: string, key: string) => {
        headersObj[key] = val;
      });
    }

    const clientIp = extractClientIp({
      socketRemoteAddress: req.ip,
      headers: headersObj
    }, trustedProxyPolicy);

    let pageSize: number | undefined;
    let seriesCount: number | undefined;
    let timeBuckets: number | undefined;

    const pageParam = url.searchParams.get('pageSize');
    if (pageParam) {
      const val = parseInt(pageParam, 10);
      if (isNaN(val) || val <= 0) {
        return new Response(JSON.stringify({ error: 'Invalid pageSize parameter' }), {
          status: 422,
          headers: { 'content-type': 'application/json' }
        });
      }
      pageSize = val;
    }

    const seriesParam = url.searchParams.get('seriesCount');
    if (seriesParam) {
      const val = parseInt(seriesParam, 10);
      if (isNaN(val) || val <= 0) {
        return new Response(JSON.stringify({ error: 'Invalid seriesCount parameter' }), {
          status: 422,
          headers: { 'content-type': 'application/json' }
        });
      }
      seriesCount = val;
    }

    const bucketParam = url.searchParams.get('timeBuckets');
    if (bucketParam) {
      const val = parseInt(bucketParam, 10);
      if (isNaN(val) || val <= 0) {
        return new Response(JSON.stringify({ error: 'Invalid timeBuckets parameter' }), {
          status: 422,
          headers: { 'content-type': 'application/json' }
        });
      }
      timeBuckets = val;
    }

    let principal: VerifiedPrincipal | undefined;
    if (principalResolver) {
      principal = principalResolver(req);
    }

    const context: RequestCostContext = {
      method: req.method || 'GET',
      path: url.pathname,
      pageSize,
      seriesCount,
      timeBuckets,
      principal,
      sessionId: req.cookies?.get?.('session_id')?.value,
      tenantId: req.headers?.get?.('x-tenant-id') || undefined,
      networkKey: clientIp
    };

    const decision = await evaluator.evaluate(context);

    if (!decision.allowed) {
      const statusCode = decision.action === 'REQUIRE_AUTH' ? 401 : (decision.action === 'RATE_LIMIT' ? 429 : 400);
      return new Response(JSON.stringify(decision), {
        status: statusCode,
        headers: {
          'content-type': 'application/json',
          'x-sentinel-action': decision.action,
          'x-sentinel-policy-version': decision.policyVersion,
          'x-sentinel-checksum': decision.displayChecksum
        }
      });
    }

    return null; // Continue request
  };
}
