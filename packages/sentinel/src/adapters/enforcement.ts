/**
 * @file enforcement.ts
 * Explicit consumer-controlled enforcement layer for AMEVA-Sentinel.
 * Strictly requires consumer decision callback; never applies default HTTP blocking or status codes.
 */

import {
  SentinelCostGuardEvaluator,
  VerifiedPrincipal,
  RequestCostContext,
  RequestShapeGuard,
  TrustedProxyPolicy,
  inspectClientAddress,
  CostGuardDecision,
  RequestInspection,
  ClientAddressInspection
} from '@ameva/sentinel-risk-core';

export interface SentinelContext {
  requestInspection: RequestInspection;
  clientAddressInspection: ClientAddressInspection;
  decision?: CostGuardDecision;
  requestContext: RequestCostContext;
}

export interface EnforcementDecision {
  action: 'continue' | 'respond';
  status?: number;
  headers?: Record<string, string>;
  body?: unknown;
}

export type EnforcementPolicy = (
  context: SentinelContext
) => EnforcementDecision | Promise<EnforcementDecision>;

export interface ExpressEnforcerOptions {
  decide: EnforcementPolicy;
  evaluator?: SentinelCostGuardEvaluator;
  principalResolver?: (req: any) => VerifiedPrincipal | undefined;
  trustedProxyPolicy?: Partial<TrustedProxyPolicy>;
}

export function createExpressSentinelEnforcer(options: ExpressEnforcerOptions) {
  if (!options || typeof options.decide !== 'function') {
    throw new TypeError('createExpressSentinelEnforcer requires a mandatory options.decide callback.');
  }

  const evaluator = options.evaluator || new SentinelCostGuardEvaluator();
  const principalResolver = options.principalResolver;
  const trustedProxyPolicy = options.trustedProxyPolicy;
  const decide = options.decide;

  return async function expressSentinelEnforcer(req: any, res: any, next: any) {
    const rawPath = req.originalUrl ? req.originalUrl.split('?')[0] : (req.path || req.url || '/');
    const requestInspection = RequestShapeGuard.inspectPath(rawPath);

    const clientAddressInspection = inspectClientAddress({
      socketRemoteAddress: req.socket?.remoteAddress || req.connection?.remoteAddress || req.ip,
      headers: req.headers
    }, trustedProxyPolicy);

    let pageSize: number | undefined;
    let seriesCount: number | undefined;
    let timeBuckets: number | undefined;

    if (req.query?.pageSize) {
      const val = parseInt(String(req.query.pageSize), 10);
      if (!isNaN(val) && val > 0) pageSize = val;
    }
    if (req.query?.seriesCount) {
      const val = parseInt(String(req.query.seriesCount), 10);
      if (!isNaN(val) && val > 0) seriesCount = val;
    }
    if (req.query?.timeBuckets) {
      const val = parseInt(String(req.query.timeBuckets), 10);
      if (!isNaN(val) && val > 0) timeBuckets = val;
    }

    let principal: VerifiedPrincipal | undefined;
    if (principalResolver) {
      principal = principalResolver(req);
    } else if (req['sentinel.principal']?.authenticated) {
      principal = req['sentinel.principal'];
    }

    const requestContext: RequestCostContext = {
      method: req.method || 'GET',
      path: rawPath,
      pageSize,
      seriesCount,
      timeBuckets,
      principal,
      sessionId: req.sessionID || req.cookies?.['session_id'],
      asn: req.asn ? Number(req.asn) : undefined,
      tenantId: req.headers?.['x-tenant-id'],
      networkKey: clientAddressInspection.clientAddress || clientAddressInspection.socketAddress || 'unknown'
    };

    let decision: CostGuardDecision | undefined;
    if (requestInspection.acceptedByInspector) {
      decision = await evaluator.evaluate(requestContext);
    }

    const sentinelContext: SentinelContext = {
      requestInspection,
      clientAddressInspection,
      decision,
      requestContext
    };

    req.sentinel = sentinelContext;

    const outcome = await decide(sentinelContext);

    if (outcome && outcome.action === 'respond') {
      const status = outcome.status || 400;
      if (outcome.headers) {
        for (const [k, v] of Object.entries(outcome.headers)) {
          res.setHeader(k, v);
        }
      }
      if (outcome.body !== undefined) {
        return res.status(status).json(outcome.body);
      }
      return res.status(status).end();
    }

    return next();
  };
}

export interface FastifyEnforcerOptions {
  decide: EnforcementPolicy;
  evaluator?: SentinelCostGuardEvaluator;
  principalResolver?: (req: any) => VerifiedPrincipal | undefined;
  trustedProxyPolicy?: Partial<TrustedProxyPolicy>;
}

export function createFastifySentinelEnforcer(options: FastifyEnforcerOptions) {
  if (!options || typeof options.decide !== 'function') {
    throw new TypeError('createFastifySentinelEnforcer requires a mandatory options.decide callback.');
  }

  const evaluator = options.evaluator || new SentinelCostGuardEvaluator();
  const principalResolver = options.principalResolver;
  const trustedProxyPolicy = options.trustedProxyPolicy;
  const decide = options.decide;

  return async function fastifySentinelEnforcer(req: any, reply: any, done?: any) {
    const rawPath = req.raw?.url ? req.raw.url.split('?')[0] : (req.url || '/');
    const requestInspection = RequestShapeGuard.inspectPath(rawPath);

    const clientAddressInspection = inspectClientAddress({
      socketRemoteAddress: req.raw?.socket?.remoteAddress || req.ip,
      headers: req.headers
    }, trustedProxyPolicy);

    let pageSize: number | undefined;
    let seriesCount: number | undefined;
    let timeBuckets: number | undefined;

    const query = req.query || {};
    if (query.pageSize) {
      const val = parseInt(String(query.pageSize), 10);
      if (!isNaN(val) && val > 0) pageSize = val;
    }
    if (query.seriesCount) {
      const val = parseInt(String(query.seriesCount), 10);
      if (!isNaN(val) && val > 0) seriesCount = val;
    }
    if (query.timeBuckets) {
      const val = parseInt(String(query.timeBuckets), 10);
      if (!isNaN(val) && val > 0) timeBuckets = val;
    }

    let principal: VerifiedPrincipal | undefined;
    if (principalResolver) {
      principal = principalResolver(req);
    } else if (req['sentinel.principal']?.authenticated) {
      principal = req['sentinel.principal'];
    }

    const requestContext: RequestCostContext = {
      method: req.method || 'GET',
      path: rawPath,
      pageSize,
      seriesCount,
      timeBuckets,
      principal,
      sessionId: req.cookies?.['session_id'],
      tenantId: req.headers?.['x-tenant-id'],
      networkKey: clientAddressInspection.clientAddress || clientAddressInspection.socketAddress || 'unknown'
    };

    let decision: CostGuardDecision | undefined;
    if (requestInspection.acceptedByInspector) {
      decision = await evaluator.evaluate(requestContext);
    }

    const sentinelContext: SentinelContext = {
      requestInspection,
      clientAddressInspection,
      decision,
      requestContext
    };

    req.sentinel = sentinelContext;

    const outcome = await decide(sentinelContext);

    if (outcome && outcome.action === 'respond') {
      const status = outcome.status || 400;
      if (outcome.headers) {
        for (const [k, v] of Object.entries(outcome.headers)) {
          reply.header(k, v);
        }
      }
      if (outcome.body !== undefined) {
        return reply.code(status).send(outcome.body);
      }
      return reply.code(status).send();
    }

    if (typeof done === 'function') {
      done();
    }
  };
}
