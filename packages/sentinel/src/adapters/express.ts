/**
 * @file express.ts
 * Express Middleware Adapter for AMEVA-Sentinel Cost Guardrails.
 */

import {
  SentinelCostGuardEvaluator,
  VerifiedPrincipal,
  RequestCostContext,
  RequestShapeGuard,
  TrustedProxyPolicy,
  extractClientIp
} from '@ameva/sentinel-risk-core';

export function createExpressCostGuard(options: {
  evaluator?: SentinelCostGuardEvaluator;
  principalResolver?: (req: any) => VerifiedPrincipal | undefined;
  trustedProxyPolicy?: Partial<TrustedProxyPolicy>;
} = {}) {
  const evaluator = options.evaluator || new SentinelCostGuardEvaluator();
  const principalResolver = options.principalResolver;
  const trustedProxyPolicy = options.trustedProxyPolicy;

  return async function sentinelCostGuardMiddleware(req: any, res: any, next: any) {
    const rawPath = req.originalUrl ? req.originalUrl.split('?')[0] : (req.path || req.url || '/');
    const pathValidation = RequestShapeGuard.validatePath(rawPath);
    if (!pathValidation.valid) {
      return res.status(400).json({ error: 'INVALID_REQUEST_PATH', message: pathValidation.message });
    }

    let clientIp: string;
    try {
      clientIp = extractClientIp({
        socketRemoteAddress: req.socket?.remoteAddress || req.connection?.remoteAddress || req.ip,
        headers: req.headers
      }, trustedProxyPolicy);
    } catch (err: any) {
      return res.status(400).json({ error: 'INVALID_CLIENT_ADDRESS', message: err.message });
    }

    let pageSize: number | undefined;
    let seriesCount: number | undefined;
    let timeBuckets: number | undefined;

    if (req.query?.pageSize) {
      const val = parseInt(String(req.query.pageSize), 10);
      if (isNaN(val) || val <= 0) {
        return res.status(422).json({ error: 'Invalid pageSize parameter' });
      }
      pageSize = val;
    }

    if (req.query?.seriesCount) {
      const val = parseInt(String(req.query.seriesCount), 10);
      if (isNaN(val) || val <= 0) {
        return res.status(422).json({ error: 'Invalid seriesCount parameter' });
      }
      seriesCount = val;
    }

    if (req.query?.timeBuckets) {
      const val = parseInt(String(req.query.timeBuckets), 10);
      if (isNaN(val) || val <= 0) {
        return res.status(422).json({ error: 'Invalid timeBuckets parameter' });
      }
      timeBuckets = val;
    }

    // Strictly resolve verified principal from upstream auth
    let principal: VerifiedPrincipal | undefined;
    if (principalResolver) {
      principal = principalResolver(req);
    } else if (req['sentinel.principal']?.authenticated) {
      principal = req['sentinel.principal'];
    }

    const context: RequestCostContext = {
      method: req.method || 'GET',
      path: rawPath,
      pageSize,
      seriesCount,
      timeBuckets,
      principal,
      sessionId: req.sessionID || req.cookies?.['session_id'],
      asn: req.asn ? Number(req.asn) : undefined,
      tenantId: req.headers?.['x-tenant-id'],
      networkKey: clientIp
    };

    const decision = await evaluator.evaluate(context);

    res.setHeader('x-sentinel-action', decision.action);
    res.setHeader('x-sentinel-policy-version', decision.policyVersion);
    res.setHeader('x-sentinel-checksum', decision.displayChecksum);

    if (!decision.allowed) {
      const statusCode = decision.action === 'REQUIRE_AUTH' ? 401 : (decision.action === 'RATE_LIMIT' ? 429 : 400);
      return res.status(statusCode).json(decision);
    }

    return next();
  };
}
