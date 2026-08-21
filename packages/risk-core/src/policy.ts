import { RuleDefinition, rules } from './rules.js';
import { BotPolicyConfig } from './types.js';

export interface SentinelThresholds {
  rateLimit: number;
  appVerification: number;
  deny: number;
}

export interface SentinelPolicy {
  version: string;
  thresholds: SentinelThresholds;
  rules: RuleDefinition[];
  botPolicy?: BotPolicyConfig;
}

export interface CreatePolicyOptions {
  version?: string;
  thresholds?: Partial<SentinelThresholds>;
  rules?: RuleDefinition[];
  botPolicy?: BotPolicyConfig;
}

export function createPolicy(options: CreatePolicyOptions = {}): SentinelPolicy {
  return {
    version: options.version || '2026-08-21.v0.6',
    thresholds: {
      rateLimit: options.thresholds?.rateLimit ?? 30,
      appVerification: options.thresholds?.appVerification ?? 50,
      deny: options.thresholds?.deny ?? 75
    },
    rules: options.rules || [
      rules.webdriver({ weight: 25 }),
      rules.burst({ weight: 30, threshold: 30 }),
      rules.trustedInputAbsent({ weight: 20 }),
      rules.touchMismatch({ weight: 15 }),
      rules.suspiciousUA({ weight: 15 })
    ],
    botPolicy: options.botPolicy
  };
}

export const defaultPolicy = createPolicy();
