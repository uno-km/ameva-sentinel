import { RuleDefinition, rules } from './rules.js';

export interface SentinelThresholds {
  rateLimit: number;
  appVerification: number;
  deny: number;
}

export interface SentinelPolicy {
  version: string;
  thresholds: SentinelThresholds;
  rules: RuleDefinition[];
}

export interface CreatePolicyOptions {
  version?: string;
  thresholds?: Partial<SentinelThresholds>;
  rules?: RuleDefinition[];
}

export function createPolicy(options: CreatePolicyOptions = {}): SentinelPolicy {
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
