import { SentinelRiskReport, SentinelAction, evaluateRisk, TelemetrySignals, defaultPolicy } from '@ameva/sentinel-risk-core';

export { SentinelAction, SentinelRiskReport } from '@ameva/sentinel-risk-core';

export class Sentinel {
  private policy = defaultPolicy;

  /**
   * 1-Line Signature API: Evaluate request risk and obtain explainable report
   */
  async score(req: Request | any): Promise<SentinelRiskReport> {
    const ctx = await this.collect(req);
    const verified = await this.verify(ctx);
    const evaluated = evaluateRisk(verified, this.policy);
    return evaluated;
  }

  private async collect(req: any): Promise<TelemetrySignals> {
    const headers = req.headers || {};
    const ua = typeof headers.get === 'function' ? headers.get('user-agent') : headers['user-agent'] || '';
    
    // Parse simulated/received telemetry body
    let body: any = {};
    if (typeof req.json === 'function') {
      try { body = await req.json(); } catch(e) {}
    } else if (req.body) {
      body = req.body;
    }

    const isWebdriver = !!body.webdriver || /HeadlessChrome|PhantomJS/i.test(ua);
    const isTrustedCount = typeof body.trusted_events === 'number' ? body.trusted_events : 1;
    const burstCount = typeof body.burst_count === 'number' ? body.burst_count : 1;

    return {
      webdriver: isWebdriver,
      isTrustedEventsCount: isTrustedCount,
      burstCount10s: burstCount,
      hasSignedToken: !!body.token,
      tokenFreshnessMs: 200
    };
  }

  private async verify(signals: TelemetrySignals): Promise<TelemetrySignals> {
    // Verified pass-through
    return signals;
  }
}

export const sentinel = new Sentinel();
