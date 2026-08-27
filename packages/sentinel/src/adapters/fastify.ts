/**
 * @file fastify.ts
 * Fastify PreHandler Observer Hook for AMEVA-Sentinel.
 * Observes request, runs pure inspection and cost evaluation, attaches results to request.sentinel,
 * and always calls continuation. Never terminates reply or forces HTTP status codes.
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

export interface FastifyObserverOptions {
  evaluator?: SentinelCostGuardEvaluator;
  principalResolver?: (req: any) => VerifiedPrincipal | undefined;
  trustedProxyPolicy?: Partial<TrustedProxyPolicy>;
  onAssessment?: (context: {
    requestInspection: RequestInspection;
    clientAddressInspection: ClientAddressInspection;
    decision?: CostGuardDecision;
    requestContext: RequestCostContext;
  }) => void | Promise<void>;
}

export function createFastifySentinelObserver(options: FastifyObserverOptions = {}) {
  const evaluator = options.evaluator || new SentinelCostGuardEvaluator();
  const principalResolver = options.principalResolver;
  const trustedProxyPolicy = options.trustedProxyPolicy;
  const onAssessment = options.onAssessment;

  return async function sentinelFastifyObserver(req: any, reply: any) {
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
      if (reply && typeof reply.header === 'function') {
        reply.header('x-sentinel-action', decision.action);
        reply.header('x-sentinel-policy-version', decision.policyVersion);
        reply.header('x-sentinel-checksum', decision.displayChecksum);
      }
    }

    const sentinelContext = {
      requestInspection,
      clientAddressInspection,
      decision,
      requestContext
    };

    req.sentinel = sentinelContext;

    if (typeof onAssessment === 'function') {
      await onAssessment(sentinelContext);
    }
  };
}

/**
 * @deprecated Use createFastifySentinelObserver or createFastifySentinelEnforcer.
 */
export const createFastifyCostGuard = createFastifySentinelObserver;
