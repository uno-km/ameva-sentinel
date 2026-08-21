import {
  SentinelAction,
  SentinelDecision,
  BotPolicyConfig,
  BotClassificationResult,
  TelemetrySignals,
  EnforcementMode,
  InternalDecisionTrustState
} from './types.js';

export interface DecisionContext {
  score: number;
  recommendedScoreAction: SentinelAction;
  classification: BotClassificationResult;
  signals: TelemetrySignals;
  botPolicy?: BotPolicyConfig;
  enforcementMode: EnforcementMode;
}

/**
 * Pure Deterministic Decision Engine (Stage 3)
 * 
 * Guarantees:
 * - Implements the complete Truth Table across all 4 TrafficTargetModes.
 * - Closed-Destination ID routing only (zero open redirect vulnerabilities).
 * - Accepts an internal trustedState parameter; raw caller signals cannot spoof verification state.
 */
export function resolveDecision(
  context: DecisionContext,
  trustedState: InternalDecisionTrustState = { isVerified: false }
): SentinelDecision {
  const {
    score,
    recommendedScoreAction,
    classification,
    signals,
    botPolicy = {},
    enforcementMode
  } = context;

  const targetMode = botPolicy.targetMode || 'ANY';
  const allowlist = new Set(botPolicy.allowlist || []);
  const denylist = new Set(botPolicy.denylist || []);
  const categoryRouting = botPolicy.categoryRouting || {};
  
  // Verification state is derived STRICTLY from trusted internal context
  const isVerified = trustedState.isVerified === true;

  // =========================================================================
  // 1. Target Mode: VERIFIED_PARTNERS_ONLY
  // Rule: "No Verification -> No Privileged Access"
  // =========================================================================
  if (targetMode === 'VERIFIED_PARTNERS_ONLY') {
    if (isVerified) {
      return {
        action: SentinelAction.ALLOW,
        reasonCode: 'BOT_ALLOWLIST_PASSED'
      };
    }
    return {
      action: SentinelAction.TEMPORARY_DENY,
      reasonCode: 'TARGET_MODE_PARTNERS_UNVERIFIED'
    };
  }

  // =========================================================================
  // 2. Target Mode: HUMANS_ONLY
  // Rule: Reject automation tools & require verification for claimed bots
  // =========================================================================
  if (targetMode === 'HUMANS_ONLY') {
    if (classification.category === 'AUTOMATED_TOOL' || denylist.has(classification.category)) {
      return {
        action: SentinelAction.TEMPORARY_DENY,
        reasonCode: 'TARGET_MODE_HUMANS_ONLY_VIOLATION'
      };
    }

    if (classification.isBotLikely && !isVerified) {
      return {
        action: SentinelAction.TEMPORARY_DENY,
        reasonCode: 'TARGET_MODE_HUMANS_ONLY_VIOLATION'
      };
    }

    // Interactive human browser passing heuristic checks
    return {
      action: recommendedScoreAction,
      reasonCode: recommendedScoreAction === SentinelAction.ALLOW ? 'BASELINE_CLEAN' : 'AUTOMATION_SUSPECTED'
    };
  }

  // =========================================================================
  // 3. Target Mode: BOTS_ONLY
  // Rule: Redirect human traffic to BOT_GUIDANCE / LLMs feed
  // =========================================================================
  if (targetMode === 'BOTS_ONLY') {
    if (!classification.isBotLikely && classification.category === 'NONE') {
      const guidanceRoute = categoryRouting['NONE'] || {
        action: SentinelAction.REDIRECT,
        destinationId: 'BOT_GUIDANCE',
        statusCode: 302,
        reasonCode: 'TARGET_MODE_BOTS_ONLY_VIOLATION'
      };

      return {
        action: guidanceRoute.action,
        reasonCode: guidanceRoute.reasonCode || 'TARGET_MODE_BOTS_ONLY_VIOLATION',
        redirect: guidanceRoute.destinationId ? {
          destinationId: guidanceRoute.destinationId,
          statusCode: guidanceRoute.statusCode || 302
        } : undefined
      };
    }

    // Bot traffic in BOTS_ONLY mode continues to category routing or policy score
  }

  // =========================================================================
  // 4. Target Mode: ANY & Universal Routing / Allowlist / Denylist Engine
  // =========================================================================

  // Check 4a: Explicit Denylist (Highest precedence)
  if (denylist.has(classification.category) || (classification.claimedName && denylist.has(classification.claimedName))) {
    return {
      action: SentinelAction.TEMPORARY_DENY,
      reasonCode: 'BOT_DENYLIST_TRIGGERED'
    };
  }

  // Check 4b: Explicit Allowlist (Verified or Trusted Partner)
  if (isVerified || allowlist.has(classification.category) || (classification.claimedName && allowlist.has(classification.claimedName))) {
    return {
      action: SentinelAction.ALLOW,
      reasonCode: 'BOT_ALLOWLIST_PASSED'
    };
  }

  // Check 4c: Category Routing (e.g., AI_AGENT -> AI_FEED redirect)
  const categoryRule = categoryRouting[classification.category];
  if (categoryRule) {
    return {
      action: categoryRule.action,
      reasonCode: categoryRule.reasonCode || 'CATEGORY_ROUTING_REDIRECT',
      redirect: categoryRule.destinationId ? {
        destinationId: categoryRule.destinationId,
        statusCode: categoryRule.statusCode || 302
      } : undefined
    };
  }

  // Check 4d: Unknown Bot Fallback
  if (classification.category === 'UNKNOWN_BOT' && botPolicy.unknownBotAction) {
    return {
      action: botPolicy.unknownBotAction.action,
      reasonCode: botPolicy.unknownBotAction.reasonCode || 'UNKNOWN_BOT_POLICY_ACTION',
      redirect: botPolicy.unknownBotAction.destinationId ? {
        destinationId: botPolicy.unknownBotAction.destinationId,
        statusCode: botPolicy.unknownBotAction.statusCode || 302
      } : undefined
    };
  }

  // Check 4e: Pure Risk Score Fallback
  return {
    action: recommendedScoreAction,
    reasonCode: recommendedScoreAction === SentinelAction.ALLOW
      ? 'BASELINE_CLEAN'
      : recommendedScoreAction === SentinelAction.TEMPORARY_DENY
        ? 'POLICY_SCORE_DENY'
        : recommendedScoreAction === SentinelAction.REQUIRE_APP_VERIFICATION
          ? 'POLICY_SCORE_APP_VERIFICATION'
          : 'POLICY_SCORE_RATE_LIMIT'
  };
}
