// Pure ESM compiled JavaScript for risk-core

export const SentinelAction = {
  ALLOW: 'ALLOW',
  OBSERVE: 'OBSERVE',
  RATE_LIMIT: 'RATE_LIMIT',
  REQUIRE_APP_VERIFICATION: 'REQUIRE_APP_VERIFICATION',
  TEMPORARY_DENY: 'TEMPORARY_DENY'
};

export class MemoryCounterStore {
  constructor() {
    this.store = new Map();
  }
  async increment(key, options = {}) {
    const now = Date.now();
    const amount = options.amount ?? 1;
    const windowMs = options.windowMs || 10000;
    const existing = this.store.get(key);
    if (!existing || existing.expiresAt <= now) {
      const resetAt = now + windowMs;
      this.store.set(key, { count: amount, expiresAt: resetAt });
      return { count: amount, resetAt };
    }
    existing.count += amount;
    return { count: existing.count, resetAt: existing.expiresAt };
  }
  async get(key) {
    const now = Date.now();
    const existing = this.store.get(key);
    if (!existing || existing.expiresAt <= now) {
      this.store.delete(key);
      return 0;
    }
    return existing.count;
  }
  async reset(key) {
    this.store.delete(key);
  }
}

export class MemoryRiskEventStore {
  constructor(maxItems = 500) {
    this.events = [];
    this.maxItems = maxItems;
  }
  async append(report) {
    this.events.unshift({ ...report, evaluatedAt: report.evaluatedAt || new Date().toISOString() });
    if (this.events.length > this.maxItems) this.events = this.events.slice(0, this.maxItems);
  }
  async list(options = {}) {
    return this.events.slice(0, options.limit ?? this.maxItems);
  }
  async clear() {
    this.events = [];
  }
}

export class LocalStorageRiskEventStore {
  constructor(key = 'ameva:sentinel:risk-events', maxItems = 500) {
    this.key = key;
    this.maxItems = maxItems;
  }
  async append(report) {
    if (typeof localStorage === 'undefined') return;
    const current = await this.list({ limit: this.maxItems });
    const next = [{ ...report, evaluatedAt: report.evaluatedAt || new Date().toISOString() }, ...current].slice(0, this.maxItems);
    try { localStorage.setItem(this.key, JSON.stringify(next)); } catch (e) {}
  }
  async list(options = {}) {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(this.key);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.slice(0, options.limit ?? this.maxItems) : [];
    } catch (e) { return []; }
  }
  async clear() {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.key);
  }
}

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
          message: isTriggered ? `Request frequency exceeded the configured threshold (${count} req / ${windowMs / 1000}s)` : `Request rate normal`
        };
      }
    };
  },
  trustedInputAbsent: (options = {}) => {
    const weight = options.weight ?? 20;
    const minDuration = options.minDurationMs ?? 5000;
    const minBurst = options.minBurst ?? 5;
    return {
      id: 'interaction.trusted_input_absent',
      weight,
      evaluate: (signals) => {
        if (!signals.telemetryObserved) {
          return {
            triggered: false,
            score: 0,
            attributes: { telemetry_observed: false },
            message: 'Client interaction telemetry not observed (insufficient evidence)'
          };
        }
        const duration = signals.observationDurationMs ?? 0;
        const trustedCount = signals.isTrustedEventsCount ?? 0;
        const burstCount = signals.burstCount10s ?? 1;
        const isTriggered = duration >= minDuration && trustedCount === 0 && burstCount >= minBurst;
        return {
          triggered: isTriggered,
          score: isTriggered ? weight : 0,
          attributes: {
            telemetry_observed: true,
            observation_duration_ms: duration,
            is_trusted_count: trustedCount,
            burst_count: burstCount
          },
          message: isTriggered ? 'No trusted interaction events were observed during the active sampling window' : 'Interaction signals consistent'
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
          message: isTriggered ? 'Mobile platform and touch capability mismatch detected' : 'Platform consistent'
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
          message: isTriggered ? 'Suspicious or automated scraper signature detected' : 'User-Agent standard'
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
      rules.trustedInputAbsent({ weight: 20 }),
      rules.touchMismatch({ weight: 15 }),
      rules.suspiciousUA({ weight: 15 })
    ]
  };
}

export const defaultPolicy = createPolicy();

export function evaluate(signals = {}, optionsOrPolicy = defaultPolicy) {
  let policy = defaultPolicy;
  let traceId = undefined;
  let enforcementMode = 'SHADOW';

  if (optionsOrPolicy && 'rules' in optionsOrPolicy && Array.isArray(optionsOrPolicy.rules)) {
    policy = optionsOrPolicy;
  } else if (optionsOrPolicy) {
    if (optionsOrPolicy.policy) policy = optionsOrPolicy.policy;
    if (optionsOrPolicy.traceId) traceId = optionsOrPolicy.traceId;
    if (optionsOrPolicy.enforcementMode) enforcementMode = optionsOrPolicy.enforcementMode;
  }

  const currentTraceId = traceId || 'trc_' + Math.random().toString(36).substring(2, 14);
  const evidence = [];
  let calculatedScore = 0;
  const safeSignals = { ...signals };

  for (const rule of policy.rules) {
    const result = rule.evaluate(safeSignals);
    if (result.triggered) {
      calculatedScore += result.score;
      evidence.push({
        rule: rule.id,
        score: result.score,
        attributes: { ...result.attributes },
        message: result.message
      });
    }
  }

  const finalScore = Number.isFinite(calculatedScore)
    ? Math.min(100, Math.max(0, calculatedScore))
    : 0;

  const evidenceConfidence = calculateConfidence(safeSignals);

  let recommendedAction = SentinelAction.ALLOW;
  if (finalScore >= policy.thresholds.deny) {
    recommendedAction = SentinelAction.TEMPORARY_DENY;
  } else if (finalScore >= policy.thresholds.appVerification) {
    recommendedAction = SentinelAction.REQUIRE_APP_VERIFICATION;
  } else if (finalScore >= policy.thresholds.rateLimit) {
    recommendedAction = SentinelAction.RATE_LIMIT;
  } else if (finalScore > 20) {
    recommendedAction = SentinelAction.OBSERVE;
  }

  let action = recommendedAction;
  if (enforcementMode === 'SHADOW') {
    action = recommendedAction === SentinelAction.ALLOW ? SentinelAction.ALLOW : SentinelAction.OBSERVE;
  }

  return {
    traceId: currentTraceId,
    score: finalScore,
    evidenceConfidence,
    action,
    recommendedAction,
    enforcementMode,
    policyVersion: policy.version,
    evidence,
    evaluatedAt: new Date().toISOString()
  };
}
