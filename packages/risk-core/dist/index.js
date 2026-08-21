// src/types.ts
var SentinelAction = /* @__PURE__ */ ((SentinelAction2) => {
  SentinelAction2["ALLOW"] = "ALLOW";
  SentinelAction2["OBSERVE"] = "OBSERVE";
  SentinelAction2["RATE_LIMIT"] = "RATE_LIMIT";
  SentinelAction2["REQUIRE_APP_VERIFICATION"] = "REQUIRE_APP_VERIFICATION";
  SentinelAction2["TEMPORARY_DENY"] = "TEMPORARY_DENY";
  return SentinelAction2;
})(SentinelAction || {});
function createTraceId() {
  const uuid = typeof globalThis !== "undefined" && globalThis.crypto && typeof globalThis.crypto.randomUUID === "function" ? globalThis.crypto.randomUUID() : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  return `trc_${uuid.replace(/-/g, "").slice(0, 16)}`;
}

// src/confidence.ts
function calculateConfidence(signals = {}) {
  if (!signals || typeof signals !== "object") {
    return 0.1;
  }
  const qSignal = signals.tokenVerified === true ? 1 : 0.5;
  const validSignalKeys = [
    "webdriver",
    "burstCount10s",
    "isTrustedEventsCount",
    "touchMismatch",
    "suspiciousUA"
  ];
  const presentCount = validSignalKeys.filter((k) => signals[k] !== void 0).length;
  const cRules = Math.min(1, Math.max(0.4, presentCount / 4));
  const latency = typeof signals.tokenFreshnessMs === "number" ? signals.tokenFreshnessMs : 0;
  let fFreshness = 1;
  if (latency > 3e4) {
    fFreshness = 0.5;
  } else if (latency > 1e4) {
    fFreshness = 0.75;
  } else if (latency > 5e3) {
    fFreshness = 0.9;
  }
  const sCompleteness = signals.telemetryObserved === true && signals.isTrustedEventsCount !== void 0 ? 1 : 0.6;
  const raw = qSignal * cRules * fFreshness * sCompleteness;
  return Math.min(1, Math.max(0.05, Math.round(raw * 100) / 100));
}

// src/counter.ts
var MemoryFixedWindowCounterStore = class {
  store = /* @__PURE__ */ new Map();
  async increment(key, options) {
    const now = Date.now();
    const amount = options.amount ?? 1;
    const existing = this.store.get(key);
    if (!existing || existing.expiresAt <= now) {
      const resetAt = now + options.windowMs;
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
};
var MemoryCounterStore = MemoryFixedWindowCounterStore;

// src/rules.ts
var rules = {
  /**
   * Evaluates navigator.webdriver automation flag
   */
  webdriver: (options = {}) => {
    const weight = options.weight ?? 25;
    return {
      id: "automation.webdriver",
      weight,
      evaluate: (signals) => {
        const isTriggered = !!signals.webdriver;
        return {
          triggered: isTriggered,
          score: isTriggered ? weight : 0,
          attributes: {
            observed: isTriggered,
            property: "navigator.webdriver"
          },
          message: isTriggered ? "navigator.webdriver automation flag is active" : "navigator.webdriver is clean"
        };
      }
    };
  },
  /**
   * Evaluates high frequency request burst within sliding window
   */
  burst: (options = {}) => {
    const weight = options.weight ?? 30;
    const threshold = options.threshold ?? 30;
    const windowMs = options.windowMs ?? 1e4;
    return {
      id: "rate.burst_request",
      weight,
      evaluate: (signals) => {
        const count = signals.burstCount10s ?? 1;
        const isTriggered = count >= threshold;
        return {
          triggered: isTriggered,
          score: isTriggered ? weight : 0,
          attributes: {
            window: `${windowMs / 1e3}s`,
            count,
            threshold
          },
          message: isTriggered ? `Request frequency exceeded the configured threshold (${count} req / ${windowMs / 1e3}s)` : `Request rate is within limits (${count} req / ${windowMs / 1e3}s)`
        };
      }
    };
  },
  /**
   * Evaluates absence of trusted human interaction ONLY when telemetry was genuinely observed
   * Guards against false positives when client telemetry is uninitialized or JS is disabled.
   */
  trustedInputAbsent: (options = {}) => {
    const weight = options.weight ?? 20;
    const minDuration = options.minDurationMs ?? 5e3;
    const minBurst = options.minBurst ?? 5;
    return {
      id: "interaction.trusted_input_absent",
      weight,
      evaluate: (signals) => {
        if (!signals.telemetryObserved) {
          return {
            triggered: false,
            score: 0,
            attributes: { telemetry_observed: false },
            message: "Client interaction telemetry not observed (insufficient evidence)"
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
          message: isTriggered ? "No trusted interaction events were observed during the active sampling window" : "Interaction signals are consistent"
        };
      }
    };
  },
  /**
   * Evaluates touch and mobile platform capability mismatch
   */
  touchMismatch: (options = {}) => {
    const weight = options.weight ?? 15;
    return {
      id: "environment.touch_mismatch",
      weight,
      evaluate: (signals) => {
        const isTriggered = !!signals.touchMismatch;
        return {
          triggered: isTriggered,
          score: isTriggered ? weight : 0,
          attributes: {
            touch_mismatch: isTriggered
          },
          message: isTriggered ? "Mobile platform Client-Hints and touch capability mismatch detected" : "Platform attributes are consistent"
        };
      }
    };
  },
  /**
   * Evaluates known automated bot signatures in User-Agent header
   */
  suspiciousUA: (options = {}) => {
    const weight = options.weight ?? 15;
    return {
      id: "header.suspicious_ua",
      weight,
      evaluate: (signals) => {
        const isTriggered = !!signals.suspiciousUA;
        return {
          triggered: isTriggered,
          score: isTriggered ? weight : 0,
          attributes: {
            suspicious_ua: isTriggered,
            claimed_bot: signals.claimedBot || null
          },
          message: isTriggered ? `Suspicious or automated scraper signature detected (${signals.claimedBot || "headless"})` : "User-Agent header format is standard"
        };
      }
    };
  }
};

// src/policy.ts
function createPolicy(options = {}) {
  var _a, _b, _c;
  return {
    version: options.version || "2026-08-21.1",
    thresholds: {
      rateLimit: ((_a = options.thresholds) == null ? void 0 : _a.rateLimit) ?? 50,
      appVerification: ((_b = options.thresholds) == null ? void 0 : _b.appVerification) ?? 70,
      deny: ((_c = options.thresholds) == null ? void 0 : _c.deny) ?? 85
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
var defaultPolicy = createPolicy();

// src/engine.ts
function evaluate(signals = {}, optionsOrPolicy = defaultPolicy) {
  let policy = defaultPolicy;
  let traceId;
  let enforcementMode = "SHADOW";
  if ("rules" in optionsOrPolicy && Array.isArray(optionsOrPolicy.rules)) {
    policy = optionsOrPolicy;
  } else {
    const opts = optionsOrPolicy;
    if (opts.policy) policy = opts.policy;
    if (opts.traceId) traceId = opts.traceId;
    if (opts.enforcementMode) enforcementMode = opts.enforcementMode;
  }
  const currentTraceId = traceId || createTraceId();
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
  const finalScore = Number.isFinite(calculatedScore) ? Math.min(100, Math.max(0, calculatedScore)) : 0;
  const evidenceConfidence = calculateConfidence(safeSignals);
  let recommendedAction = "ALLOW" /* ALLOW */;
  if (finalScore >= policy.thresholds.deny) {
    recommendedAction = "TEMPORARY_DENY" /* TEMPORARY_DENY */;
  } else if (finalScore >= policy.thresholds.appVerification) {
    recommendedAction = "REQUIRE_APP_VERIFICATION" /* REQUIRE_APP_VERIFICATION */;
  } else if (finalScore >= policy.thresholds.rateLimit) {
    recommendedAction = "RATE_LIMIT" /* RATE_LIMIT */;
  } else if (finalScore > 20) {
    recommendedAction = "OBSERVE" /* OBSERVE */;
  }
  let action = recommendedAction;
  if (enforcementMode === "SHADOW") {
    action = recommendedAction === "ALLOW" /* ALLOW */ ? "ALLOW" /* ALLOW */ : "OBSERVE" /* OBSERVE */;
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
    evaluatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    signals: safeSignals
  };
}

// src/store.ts
function isStoredRiskEventV1(value) {
  if (value === null || typeof value !== "object") return false;
  const item = value;
  return item.schemaVersion === "1.0" && typeof item.traceId === "string" && typeof item.score === "number" && Number.isFinite(item.score) && item.score >= 0 && item.score <= 100 && typeof item.evaluatedAt === "string" && Array.isArray(item.evidence);
}
function sanitizeSignals(signals = {}) {
  return {
    webdriverObserved: !!signals.webdriver || !!signals.webdriverObserved,
    telemetryObserved: !!signals.telemetryObserved,
    observationDurationMs: typeof signals.observationDurationMs === "number" ? signals.observationDurationMs : 0,
    trustedInputCount: typeof signals.isTrustedEventsCount === "number" ? signals.isTrustedEventsCount : typeof signals.trustedInputCount === "number" ? signals.trustedInputCount : 0,
    burstCount10s: typeof signals.burstCount10s === "number" ? signals.burstCount10s : 1,
    touchMismatch: !!signals.touchMismatch,
    suspiciousUA: !!signals.suspiciousUA
  };
}
function sanitizeEvidence(item) {
  const safeAttrs = {};
  if (item.attributes && typeof item.attributes === "object") {
    for (const [k, v] of Object.entries(item.attributes)) {
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null) {
        safeAttrs[k] = v;
      }
    }
  }
  return {
    rule: String(item.rule || "unknown"),
    score: Number(item.score || 0),
    attributes: safeAttrs,
    message: String(item.message || "")
  };
}
function toStoredRiskEvent(report) {
  const now = Date.now();
  return {
    schemaVersion: "1.0",
    traceId: report.traceId,
    evaluatedAt: report.evaluatedAt || new Date(now).toISOString(),
    score: report.score,
    evidenceConfidence: report.evidenceConfidence,
    action: report.action,
    recommendedAction: report.recommendedAction,
    enforcementMode: report.enforcementMode,
    policyVersion: report.policyVersion,
    minimalDerivedSignals: sanitizeSignals(report.signals),
    evidence: (report.evidence || []).map(sanitizeEvidence),
    storedAt: new Date(now).toISOString()
  };
}
var MemoryRiskEventStore = class {
  events = [];
  maxItems;
  maxAgeMs;
  constructor(options = {}) {
    this.maxItems = options.maxItems ?? 500;
    this.maxAgeMs = options.maxAgeMs ?? 24 * 60 * 60 * 1e3;
  }
  async append(report) {
    if (!report || !report.traceId) return;
    const now = Date.now();
    const storedItem = toStoredRiskEvent(report);
    this.events = this.events.filter((e) => e.traceId !== report.traceId);
    this.events.unshift(storedItem);
    this.prune(now);
  }
  async list(options = {}) {
    const now = Date.now();
    if (!options.includeExpired) {
      this.prune(now);
    }
    const limit = options.limit ?? this.maxItems;
    return this.events.slice(0, limit);
  }
  async clear() {
    this.events = [];
  }
  prune(now) {
    this.events = this.events.filter((e) => {
      const itemTime = new Date(e.evaluatedAt).getTime();
      return now - itemTime <= this.maxAgeMs;
    });
    if (this.events.length > this.maxItems) {
      this.events = this.events.slice(0, this.maxItems);
    }
  }
};
var LocalStorageRiskEventStore = class {
  key;
  maxItems;
  maxAgeMs;
  constructor(options = {}) {
    this.key = options.key || "ameva:sentinel:risk-events";
    this.maxItems = options.maxItems ?? 500;
    this.maxAgeMs = options.maxAgeMs ?? 24 * 60 * 60 * 1e3;
  }
  async append(report) {
    if (typeof localStorage === "undefined" || !report || !report.traceId) return;
    const current = await this.list({ limit: this.maxItems, includeExpired: false });
    const storedItem = toStoredRiskEvent(report);
    const filtered = current.filter((e) => e.traceId !== report.traceId);
    const next = [storedItem, ...filtered].slice(0, this.maxItems);
    try {
      localStorage.setItem(this.key, JSON.stringify(next));
      if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
        try {
          window.dispatchEvent(new CustomEvent("sentinel:risk-event-appended", { detail: storedItem }));
        } catch (e) {
        }
      }
    } catch (err) {
      try {
        const halved = next.slice(0, Math.floor(this.maxItems / 2));
        localStorage.setItem(this.key, JSON.stringify(halved));
      } catch (e) {
      }
    }
  }
  async list(options = {}) {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(this.key);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const now = Date.now();
      const valid = parsed.filter(isStoredRiskEventV1);
      const unexpired = options.includeExpired ? valid : valid.filter((item) => {
        const time = new Date(item.evaluatedAt).getTime();
        return now - time <= this.maxAgeMs;
      });
      return unexpired.slice(0, options.limit ?? this.maxItems);
    } catch (e) {
      try {
        localStorage.removeItem(this.key);
      } catch (err) {
      }
      return [];
    }
  }
  async clear() {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.removeItem(this.key);
    } catch (e) {
    }
  }
};
export {
  LocalStorageRiskEventStore,
  MemoryCounterStore,
  MemoryFixedWindowCounterStore,
  MemoryRiskEventStore,
  SentinelAction,
  calculateConfidence,
  createPolicy,
  createTraceId,
  defaultPolicy,
  evaluate,
  isStoredRiskEventV1,
  rules,
  sanitizeEvidence,
  sanitizeSignals,
  toStoredRiskEvent
};
