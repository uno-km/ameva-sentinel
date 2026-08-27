/**
 * @file express.ts
 * Express Middleware Observer Adapter for AMEVA-Sentinel.
 * Observes request, runs pure inspection and cost evaluation, attaches results to req.sentinel,
 * and always calls next(). Never terminates response or forces HTTP status codes.
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

export interface ExpressObserverOptions {
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

export function createExpressSentinelObserver(options: ExpressObserverOptions = {}) {
  const evaluator = options.evaluator || new SentinelCostGuardEvaluator();
  const principalResolver = options.principalResolver;
  const trustedProxyPolicy = options.trustedProxyPolicy;
  const onAssessment = options.onAssessment;

  return async function sentinelExpressObserver(req: any, res: any, next: any) {
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
      if (res && typeof res.setHeader === 'function') {
        res.setHeader('x-sentinel-action', decision.action);
        res.setHeader('x-sentinel-policy-version', decision.policyVersion);
        res.setHeader('x-sentinel-checksum', decision.displayChecksum);
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

    return next();
  };
}

/**
 * @deprecated Use createExpressSentinelObserver (observe-only) or createExpressSentinelEnforcer (explicit enforcement).
 */
export const createExpressCostGuard = createExpressSentinelObserver;
export const sentinelMiddleware = createExpressSentinelObserver;
