/**
 * @file fastify.ts
 * Fastify PreHandler Hook for AMEVA-Sentinel Cost Guardrails.
 */

import { SentinelCostGuardEvaluator, VerifiedPrincipal, RequestCostContext } from '@ameva/sentinel-risk-core';

export function createFastifyCostGuard(options: {
  evaluator?: SentinelCostGuardEvaluator;
  principalResolver?: (req: any) => VerifiedPrincipal | undefined;
} = {}) {
  const evaluator = options.evaluator || new SentinelCostGuardEvaluator();
  const principalResolver = options.principalResolver;

  return async function sentinelFastifyHook(req: any, reply: any) {
    let pageSize: number | undefined;
    let seriesCount: number | undefined;
    let timeBuckets: number | undefined;

    const query = req.query || {};
    if (query.pageSize) {
      const val = parseInt(String(query.pageSize), 10);
      if (isNaN(val) || val <= 0) {
        return reply.code(422).send({ error: 'Invalid pageSize parameter' });
      }
      pageSize = val;
    }

    if (query.seriesCount) {
      const val = parseInt(String(query.seriesCount), 10);
      if (isNaN(val) || val <= 0) {
        return reply.code(422).send({ error: 'Invalid seriesCount parameter' });
      }
      seriesCount = val;
    }

    if (query.timeBuckets) {
      const val = parseInt(String(query.timeBuckets), 10);
      if (isNaN(val) || val <= 0) {
        return reply.code(422).send({ error: 'Invalid timeBuckets parameter' });
      }
      timeBuckets = val;
    }

    let principal: VerifiedPrincipal | undefined;
    if (principalResolver) {
      principal = principalResolver(req);
    } else if (req['sentinel.principal']?.authenticated) {
      principal = req['sentinel.principal'];
    }

    const context: RequestCostContext = {
      method: req.method || 'GET',
      path: req.url || '/',
      pageSize,
      seriesCount,
      timeBuckets,
      principal,
      sessionId: req.cookies?.['session_id'],
      tenantId: req.headers?.['x-tenant-id']
    };

    const decision = await evaluator.evaluate(context);

    reply.header('x-sentinel-action', decision.action);
    reply.header('x-sentinel-policy-version', decision.policyVersion);
    reply.header('x-sentinel-checksum', decision.displayChecksum);

    if (!decision.allowed) {
      const statusCode = decision.action === 'REQUIRE_AUTH' ? 401 : (decision.action === 'RATE_LIMIT' ? 429 : 400);
      return reply.code(statusCode).send(decision);
    }
  };
}
