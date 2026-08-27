/**
 * @file next.ts
 * Next.js Edge / Node Middleware Observer Adapter for AMEVA-Sentinel.
 * Observes request, runs pure inspection and cost evaluation, attaches results to request context,
 * and always invokes downstream handler. Never returns synthetic error responses.
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

export interface NextObserverOptions {
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

export function createNextCostGuard(options: NextObserverOptions = {}) {
  const evaluator = options.evaluator || new SentinelCostGuardEvaluator();
  const principalResolver = options.principalResolver;
  const trustedProxyPolicy = options.trustedProxyPolicy;
  const onAssessment = options.onAssessment;

  return async function sentinelNextObserver(req: any) {
    const url = new URL(req.url, 'http://localhost');
    const requestInspection = RequestShapeGuard.inspectPath(url.pathname);

    const headersObj: Record<string, string> = {};
    if (req.headers && typeof req.headers.forEach === 'function') {
      req.headers.forEach((val: string, key: string) => {
        headersObj[key] = val;
      });
    }

    const clientAddressInspection = inspectClientAddress({
      socketRemoteAddress: req.ip,
      headers: headersObj
    }, trustedProxyPolicy);

    let pageSize: number | undefined;
    let seriesCount: number | undefined;
    let timeBuckets: number | undefined;

    const pageParam = url.searchParams.get('pageSize');
    if (pageParam) {
      const val = parseInt(pageParam, 10);
      if (!isNaN(val) && val > 0) pageSize = val;
    }

    const seriesParam = url.searchParams.get('seriesCount');
    if (seriesParam) {
      const val = parseInt(seriesParam, 10);
      if (!isNaN(val) && val > 0) seriesCount = val;
    }

    const bucketParam = url.searchParams.get('timeBuckets');
    if (bucketParam) {
      const val = parseInt(bucketParam, 10);
      if (!isNaN(val) && val > 0) timeBuckets = val;
    }

    let principal: VerifiedPrincipal | undefined;
    if (principalResolver) {
      principal = principalResolver(req);
    }

    const requestContext: RequestCostContext = {
      method: req.method || 'GET',
      path: url.pathname,
      pageSize,
      seriesCount,
      timeBuckets,
      principal,
      sessionId: req.cookies?.get?.('session_id')?.value,
      tenantId: req.headers?.get?.('x-tenant-id') || undefined,
      networkKey: clientAddressInspection.clientAddress || clientAddressInspection.socketAddress || 'unknown'
    };

    let decision: CostGuardDecision | undefined;
    if (requestInspection.acceptedByInspector) {
      decision = await evaluator.evaluate(requestContext);
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

    return null; // Always continue request in Next middleware
  };
}

export function withSentinelObservation<THandler extends (...args: any[]) => any>(
  handler: THandler,
  options: NextObserverOptions = {}
): THandler {
  const observer = createNextCostGuard(options);
  return (async (req: any, ...args: any[]) => {
    await observer(req);
    return handler(req, ...args);
  }) as THandler;
}
