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
   * Evaluates navigator.webdriver flag
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
   * Evaluates high frequency request burst within 10s window
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
            ? `High frequency request burst (${count} req / ${windowMs / 1000}s)`
            : `Request rate is normal (${count} req / ${windowMs / 1000}s)`
        };
      }
    };
  },

  /**
   * Evaluates absence of trusted human interaction under active burst
   */
  noInteraction: (options: { weight?: number; minBurstTrigger?: number } = {}): RuleDefinition => {
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
          attributes: {
            is_trusted_count: isTrusted,
            burst_count: count
          },
          message: isTriggered
            ? `Zero trusted user interaction physics observed under ${count} requests`
            : `User interaction physics verified (${isTrusted} trusted events)`
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
   * Evaluates known bot UA spoofing or suspicious headers
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
            ? `Suspicious or spoofed User-Agent detected (${signals.claimedBot || 'headless'})`
            : 'User-Agent format is standard'
        };
      }
    };
  }
};
