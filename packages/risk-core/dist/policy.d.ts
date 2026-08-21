import { RuleDefinition } from './rules.js';
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
export declare function createPolicy(options?: CreatePolicyOptions): SentinelPolicy;
export declare const defaultPolicy: SentinelPolicy;
