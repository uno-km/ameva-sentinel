import { TelemetrySignals, RuleAttributes } from './types.js';

export interface RuleEvaluationResult {
  triggered: boolean;
  score: number;
  attributes: RuleAttributes;
  message: string;
}

export interface RuleDefinition {
  id: string;
  weight: number;
  evaluate: (signals: TelemetrySignals) => RuleEvaluationResult;
}

export const rules = {
  /**
   * Evaluates navigator.webdriver automation flag
   */
  webdriver: (options: { weight?: number } = {}): RuleDefinition => {
    const weight = options.weight ?? 25;
    return {
      id: 'automation.webdriver',
      weight,
      evaluate: (signals) => {
        const isTriggered = !!signals.webdriver;
        return {
          triggered: isTriggered,
          score: isTriggered ? weight : 0,
          attributes: {
            observed: isTriggered,
            property: 'navigator.webdriver'
          },
          message: isTriggered
            ? 'navigator.webdriver automation flag is active'
            : 'navigator.webdriver is clean'
        };
      }
    };
  },

  /**
   * Evaluates high frequency request burst within sliding window
   */
  burst: (options: { weight?: number; threshold?: number; windowMs?: number } = {}): RuleDefinition => {
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
          attributes: {
            window: `${windowMs / 1000}s`,
            count,
            threshold
          },
          message: isTriggered
            ? `Request frequency exceeded the configured threshold (${count} req / ${windowMs / 1000}s)`
            : `Request rate is within limits (${count} req / ${windowMs / 1000}s)`
        };
      }
    };
  },

  /**
   * Evaluates absence of trusted human interaction ONLY when telemetry was genuinely observed
   * Guards against false positives when client telemetry is uninitialized or JS is disabled.
   */
  trustedInputAbsent: (options: { weight?: number; minDurationMs?: number; minBurst?: number } = {}): RuleDefinition => {
    const weight = options.weight ?? 20;
    const minDuration = options.minDurationMs ?? 5000;
    const minBurst = options.minBurst ?? 5;

    return {
      id: 'interaction.trusted_input_absent',
      weight,
      evaluate: (signals) => {
        // Crucial Guard: If telemetry was never observed, we lack evidence -> DO NOT TRIGGER
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
          message: isTriggered
            ? 'No trusted interaction events were observed during the active sampling window'
            : 'Interaction signals are consistent'
        };
      }
    };
  },

  /**
   * Evaluates touch and mobile platform capability mismatch
   */
  touchMismatch: (options: { weight?: number } = {}): RuleDefinition => {
    const weight = options.weight ?? 15;
    return {
      id: 'environment.touch_mismatch',
      weight,
      evaluate: (signals) => {
        const isTriggered = !!signals.touchMismatch;
        return {
          triggered: isTriggered,
          score: isTriggered ? weight : 0,
          attributes: {
            touch_mismatch: isTriggered
          },
          message: isTriggered
            ? 'Mobile platform Client-Hints and touch capability mismatch detected'
            : 'Platform attributes are consistent'
        };
      }
    };
  },

  /**
   * Evaluates known automated bot signatures in User-Agent header
   */
  suspiciousUA: (options: { weight?: number } = {}): RuleDefinition => {
    const weight = options.weight ?? 15;
    return {
      id: 'header.suspicious_ua',
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
          message: isTriggered
            ? `Suspicious or automated scraper signature detected (${signals.claimedBot || 'headless'})`
            : 'User-Agent header format is standard'
        };
      }
    };
  }
};
