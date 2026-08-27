import {
  SentinelAction,
  SentinelRiskReport,
  TelemetrySignals,
  EvidenceItem,
  EnforcementMode,
  EvaluationContext,
  createTraceId
} from './types.js';
import { calculateConfidence } from './confidence.js';
import { SentinelPolicy, defaultPolicy } from './policy.js';
import { computePolicyChecksum } from './policy-canonical.js';
import { deepFreeze, defensiveClone } from './deep-freeze.js';

export const RUNTIME_VERSION = '2.2.0';

export interface EvaluateOptions {
  policy?: SentinelPolicy;
  traceId?: string;
  enforcementMode?: EnforcementMode;
  context?: EvaluationContext;
}

/**
 * Pure risk evaluation engine with deterministic EvaluationContext injection.
 * Evaluates telemetry signals against the configured SentinelPolicy.
 * Guaranteed input immutability, side-effect-free deep freezing, and deterministic 0~100 score clamping.
 */
export function evaluateRisk(
  signals: Readonly<TelemetrySignals> = {},
  policy: Readonly<SentinelPolicy> = defaultPolicy,
  context?: EvaluationContext,
  options: { traceId?: string; enforcementMode?: EnforcementMode } = {}
): SentinelRiskReport {
  const evalContext: EvaluationContext = context || {
    nowEpochMs: Date.now(),
    policyHash: (policy && policy.version) ? policy.version : 'v2.2.0',
    runtimeVersion: RUNTIME_VERSION
  };

  if (typeof evalContext.nowEpochMs !== 'number' || !Number.isFinite(evalContext.nowEpochMs) || evalContext.nowEpochMs <= 0) {
    throw new Error('EvaluationContext nowEpochMs must be a positive finite integer');
  }

  const currentTraceId = options.traceId || createTraceId();
  const enforcementMode: EnforcementMode = options.enforcementMode || 'SHADOW';
  const evidence: EvidenceItem[] = [];
  let calculatedScore = 0;

  // Defensive deep clone to guarantee input immutability and prototype/accessor safety
  const safeSignals: TelemetrySignals = signals ? (defensiveClone(signals) as TelemetrySignals) : {};

  for (const rule of policy.rules) {
    const result = rule.evaluate(safeSignals);
    if (result.triggered) {
      calculatedScore += result.score;
      evidence.push({
        rule: rule.id,
        score: result.score,
        attributes: (defensiveClone(result.attributes || {}) as Record<string, any>),
        message: result.message
      });
    }
  }

  // Strict Clamping: Must be finite and clamped strictly between 0 and 100
  const finalScore = Number.isFinite(calculatedScore)
    ? Math.min(100, Math.max(0, calculatedScore))
    : 0;

  const evidenceConfidence = calculateConfidence(safeSignals);

  // Determine Evaluated Recommendation based on Policy Thresholds
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

  // In Shadow Mode, never enforce blocking actions directly
  let action = recommendedAction;
  if (enforcementMode === 'SHADOW') {
    action = recommendedAction === SentinelAction.ALLOW ? SentinelAction.ALLOW : SentinelAction.OBSERVE;
  }

  const report: SentinelRiskReport = {
    traceId: currentTraceId,
    score: finalScore,
    evidenceConfidence,
    action,
    recommendedAction,
    enforcementMode,
    policyVersion: policy.version,
    evidence,
    evaluatedAt: new Date(evalContext.nowEpochMs).toISOString(),
    signals: safeSignals
  };

  return deepFreeze(report);
}

export function evaluateRiskNow(
  signals: TelemetrySignals = {},
  policy: SentinelPolicy = defaultPolicy,
  options: { traceId?: string; enforcementMode?: EnforcementMode } = {}
): SentinelRiskReport {
  return evaluateRisk(
    signals,
    policy,
    {
      nowEpochMs: Date.now(),
      policyHash: policy.version || 'v2.2.0',
      runtimeVersion: RUNTIME_VERSION
    },
    options
  );
}

export function evaluate(
  signals: TelemetrySignals = {},
  optionsOrPolicy: EvaluateOptions | SentinelPolicy = defaultPolicy
): SentinelRiskReport {
  let policy: SentinelPolicy = defaultPolicy;
  let traceId: string | undefined;
  let enforcementMode: EnforcementMode = 'SHADOW';
  let context: EvaluationContext | undefined;

  if ('rules' in optionsOrPolicy && Array.isArray(optionsOrPolicy.rules)) {
    policy = optionsOrPolicy;
  } else {
    const opts = optionsOrPolicy as EvaluateOptions;
    if (opts.policy) policy = opts.policy;
    if (opts.traceId) traceId = opts.traceId;
    if (opts.enforcementMode) enforcementMode = opts.enforcementMode;
    if (opts.context) context = opts.context;
  }

  if (context) {
    return evaluateRisk(signals, policy, context, { traceId, enforcementMode });
  }

  return evaluateRiskNow(signals, policy, { traceId, enforcementMode });
}

