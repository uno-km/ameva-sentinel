// Pure ESM compiled JavaScript for risk-core

export const SentinelAction = {
  ALLOW: 'ALLOW',
  OBSERVE: 'OBSERVE',
  RATE_LIMIT: 'RATE_LIMIT',
  REQUIRE_APP_VERIFICATION: 'REQUIRE_APP_VERIFICATION',
  TEMPORARY_DENY: 'TEMPORARY_DENY'
};

export function calculateConfidence(signals) {
  if (!signals || typeof signals !== 'object') return 0.10;
  const qSignal = signals.hasSignedToken ? 1.0 : 0.5;
  const validKeys = ['webdriver', 'burstCount10s', 'isTrustedEventsCount', 'touchMismatch', 'suspiciousUA'];
  const presentCount = validKeys.filter(k => signals[k] !== undefined).length;
  const cRules = Math.min(1.0, Math.max(0.4, presentCount / 4));
  const latency = typeof signals.tokenFreshnessMs === 'number' ? signals.tokenFreshnessMs : 0;
  let fFreshness = 1.0;
  if (latency > 30000) fFreshness = 0.5;
  else if (latency > 10000) fFreshness = 0.75;
  else if (latency > 5000) fFreshness = 0.9;
  const sCompleteness = signals.isTrustedEventsCount !== undefined || signals.mousePhysicsVariance !== undefined ? 1.0 : 0.6;
  const raw = qSignal * cRules * fFreshness * sCompleteness;
  return Math.min(1.0, Math.max(0.05, Math.round(raw * 100) / 100));
}

export const rules = {
  webdriver: (options = {}) => {
    const weight = options.weight ?? 25;
    return {
      id: 'automation.webdriver',
      weight,
      evaluate: (signals) => {
        const isTriggered = !!signals.webdriver;
        return {
          triggered: isTriggered,
          score: isTriggered ? weight : 0,
          attributes: { observed: isTriggered, property: 'navigator.webdriver' },
          message: isTriggered ? 'navigator.webdriver automation flag is active' : 'navigator.webdriver is clean'
        };
      }
    };
  },
  burst: (options = {}) => {
    const weight = options.weight ?? 30;
    const threshold = options.threshold ?? 30;
    const windowMs = options.windowMs ?? 10000;
    return {
      id: 'rate.burst_request',
      weight,
      evaluate: (signals) => {
        const count = signals.burstCount10s ?? 1;
        const isTriggered = count >= threshold;
        return {
          triggered: isTriggered,
          score: isTriggered ? weight : 0,
          attributes: { window: `${windowMs / 1000}s`, count, threshold },
          message: isTriggered ? `High frequency request burst (${count} req / ${windowMs / 1000}s)` : `Request rate normal`
        };
      }
    };
  },
  noInteraction: (options = {}) => {
    const weight = options.weight ?? 20;
    const minBurst = options.minBurstTrigger ?? 5;
    return {
      id: 'interaction.no_physics',
      weight,
      evaluate: (signals) => {
        const count = signals.burstCount10s ?? 1;
        const isTrusted = signals.isTrustedEventsCount ?? 0;
        const isTriggered = isTrusted === 0 && count >= minBurst;
        return {
          triggered: isTriggered,
          score: isTriggered ? weight : 0,
          attributes: { is_trusted_count: isTrusted, burst_count: count },
          message: isTriggered ? `Zero trusted user interaction physics observed under ${count} requests` : 'Interaction verified'
        };
      }
    };
  },
  touchMismatch: (options = {}) => {
    const weight = options.weight ?? 15;
    return {
      id: 'environment.touch_mismatch',
      weight,
      evaluate: (signals) => {
        const isTriggered = !!signals.touchMismatch;
        return {
          triggered: isTriggered,
          score: isTriggered ? weight : 0,
          attributes: { touch_mismatch: isTriggered },
          message: isTriggered ? 'Mobile platform and touch capability mismatch' : 'Platform consistent'
        };
      }
    };
  },
  suspiciousUA: (options = {}) => {
    const weight = options.weight ?? 15;
    return {
      id: 'header.suspicious_ua',
      weight,
      evaluate: (signals) => {
        const isTriggered = !!signals.suspiciousUA;
        return {
          triggered: isTriggered,
          score: isTriggered ? weight : 0,
          attributes: { suspicious_ua: isTriggered, claimed_bot: signals.claimedBot || null },
          message: isTriggered ? 'Suspicious or spoofed User-Agent detected' : 'User-Agent standard'
        };
      }
    };
  }
};

export function createPolicy(options = {}) {
  return {
    version: options.version || '2026-08-21.1',
    thresholds: {
      rateLimit: options.thresholds?.rateLimit ?? 50,
      appVerification: options.thresholds?.appVerification ?? 70,
      deny: options.thresholds?.deny ?? 85
    },
    rules: options.rules || [
      rules.webdriver({ weight: 25 }),
      rules.burst({ weight: 30, threshold: 30 }),
      rules.noInteraction({ weight: 20 }),
      rules.touchMismatch({ weight: 15 }),
      rules.suspiciousUA({ weight: 15 })
    ]
  };
}

export const defaultPolicy = createPolicy();

export function evaluate(signals = {}, policy = defaultPolicy, traceId) {
  const currentTraceId = traceId || 'trc_' + Math.random().toString(36).substring(2, 14);
  const evidence = [];
  let calculatedScore = 0;

  for (const rule of policy.rules) {
    const result = rule.evaluate(signals);
    if (result.triggered) {
      calculatedScore += result.score;
      evidence.push({
        rule: rule.id,
        score: result.score,
        attributes: result.attributes,
        message: result.message
      });
    }
  }

  const finalScore = Math.min(100, Math.max(0, calculatedScore));
  const confidence = calculateConfidence(signals);

  let action = SentinelAction.ALLOW;
  if (finalScore >= policy.thresholds.deny) {
    action = SentinelAction.TEMPORARY_DENY;
  } else if (finalScore >= policy.thresholds.appVerification) {
    action = SentinelAction.REQUIRE_APP_VERIFICATION;
  } else if (finalScore >= policy.thresholds.rateLimit) {
    action = SentinelAction.RATE_LIMIT;
  } else if (finalScore > 20) {
    action = SentinelAction.OBSERVE;
  }

  return {
    traceId: currentTraceId,
    score: finalScore,
    confidence,
    action,
    policyVersion: policy.version,
    evidence,
    evaluatedAt: new Date().toISOString()
  };
}
