import {
  SentinelAction,
  SentinelDecision,
  BotPolicyConfig,
  BotClassificationResult,
  TelemetrySignals,
  EnforcementMode,
  DecisionReasonCode
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
 * - Pure function without side effects or HTTP transport logic.
 */
export function resolveDecision(context: DecisionContext): SentinelDecision {
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
  const isVerified = signals.verifiedBot === true;

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
    if (classification.isBotLikely || signals.webdriver) {
      if (classification.category === 'AUTOMATED_TOOL' || denylist.has(classification.category)) {
        return {
          action: SentinelAction.TEMPORARY_DENY,
          reasonCode: 'TARGET_MODE_HUMANS_ONLY_VIOLATION'
        };
      }
      return {
        action: SentinelAction.REQUIRE_APP_VERIFICATION,
        reasonCode: 'TARGET_MODE_HUMANS_ONLY_VIOLATION'
      };
    }
  }

  // =========================================================================
  // 3. Target Mode: BOTS_ONLY
  // Rule: Reject human interactive browsers; Route to guidance or allow bots
  // =========================================================================
  if (targetMode === 'BOTS_ONLY') {
    const isHumanInteractive = (signals.isTrustedEventsCount ?? 0) > 0 && !signals.webdriver && !classification.isBotLikely;
    if (isHumanInteractive) {
      const guidanceRule = botPolicy.categoryRouting?.['NONE'];
      return {
        action: guidanceRule?.action || SentinelAction.REDIRECT,
        reasonCode: 'TARGET_MODE_BOTS_ONLY_VIOLATION',
        redirect: {
          destinationId: guidanceRule?.destinationId || 'BOT_GUIDANCE',
          statusCode: guidanceRule?.statusCode || 302
        }
      };
    }
  }

  // =========================================================================
  // 4. Category-Specific Routing & Denylist / Allowlist Evaluation (ANY / BOTS)
  // =========================================================================
  if (classification.isBotLikely) {
    // 4.1 Denylist Check
    if (denylist.has(classification.category) || (classification.claimedName && denylist.has(classification.claimedName))) {
      const customDeny = categoryRouting[classification.category];
      if (customDeny?.action === SentinelAction.REDIRECT && customDeny.destinationId) {
        return {
          action: SentinelAction.REDIRECT,
          reasonCode: 'BOT_DENYLIST_TRIGGERED',
          redirect: {
            destinationId: customDeny.destinationId,
            statusCode: customDeny.statusCode || 302
          }
        };
      }
      return {
        action: SentinelAction.TEMPORARY_DENY,
        reasonCode: 'BOT_DENYLIST_TRIGGERED'
      };
    }

    // 4.2 Category Routing Check (e.g. AI_AGENT -> REDIRECT to AI_FEED)
    const matchedCategoryRule = categoryRouting[classification.category];
    if (matchedCategoryRule) {
      if (matchedCategoryRule.action === SentinelAction.REDIRECT && matchedCategoryRule.destinationId) {
        return {
          action: SentinelAction.REDIRECT,
          reasonCode: 'CATEGORY_ROUTING_REDIRECT',
          redirect: {
            destinationId: matchedCategoryRule.destinationId,
            statusCode: matchedCategoryRule.statusCode || 302
          }
        };
      }
      return {
        action: matchedCategoryRule.action,
        reasonCode: matchedCategoryRule.reasonCode || 'CATEGORY_ROUTING_MATCH'
      };
    }

    // 4.3 Allowlist Check
    if (allowlist.has(classification.category) || (classification.claimedName && allowlist.has(classification.claimedName))) {
      return {
        action: SentinelAction.ALLOW,
        reasonCode: 'BOT_ALLOWLIST_PASSED'
      };
    }
  }

  // =========================================================================
  // 5. Default Fallback to Pure Risk Engine Score Recommendation
  // =========================================================================
  let reasonCode: DecisionReasonCode = 'BASELINE_CLEAN';
  if (recommendedScoreAction === SentinelAction.TEMPORARY_DENY) {
    reasonCode = 'POLICY_SCORE_DENY';
  } else if (recommendedScoreAction === SentinelAction.REQUIRE_APP_VERIFICATION) {
    reasonCode = 'POLICY_SCORE_APP_VERIFICATION';
  } else if (recommendedScoreAction === SentinelAction.RATE_LIMIT) {
    reasonCode = 'POLICY_SCORE_RATE_LIMIT';
  } else if (signals.webdriver) {
    reasonCode = 'AUTOMATION_SUSPECTED';
  } else if (signals.burstCount10s && signals.burstCount10s > 10) {
    reasonCode = 'RATE_BURST_EXCEEDED';
  }

  return {
    action: recommendedScoreAction,
    reasonCode
  };
}
