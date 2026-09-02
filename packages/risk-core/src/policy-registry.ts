/**
 * @file policy-registry.ts
 * In-Memory Cost Policy Registry for deterministic route matching and checksum resolution.
 */

import { CostPolicyConfig, RouteCostPolicy, HttpMethod } from './budget-types.js';
import {
  SAFE_FALLBACK_COST_POLICY,
  computePolicyChecksum,
  validateCostPolicy
} from './policy-canonical.js';

export class CostPolicyRegistry {
  public readonly config: CostPolicyConfig;
  public readonly checksum: string; // full 64-char SHA-256
  public readonly displayChecksum: string; // 16-char display
  private readonly exactRoutes = new Map<string, RouteCostPolicy>();
  private readonly wildcardRoutes = new Map<string, RouteCostPolicy>();

  constructor(rawPolicy?: unknown) {
    if (!rawPolicy) {
      this.config = SAFE_FALLBACK_COST_POLICY;
      const identity = computePolicyChecksum(this.config);
      this.checksum = identity.checksumSha256;
      this.displayChecksum = identity.displayChecksum;
    } else {
      try {
        this.config = validateCostPolicy(rawPolicy);
        const identity = computePolicyChecksum(this.config);
        this.checksum = identity.checksumSha256;
        this.displayChecksum = identity.displayChecksum;
      } catch (err: unknown) {
        // [AUDIT FIX] Silent fallback removed. Operators must be notified when
        // a supplied policy is rejected so they can diagnose deployment issues.
        const reason = err instanceof Error ? err.message : String(err);
        console.error(
          `[ameva-sentinel] CostPolicyRegistry: supplied policy failed validation and was rejected. ` +
          `Falling back to SAFE_FALLBACK_COST_POLICY. ` +
          `Reason: ${reason}`
        );
        this.config = SAFE_FALLBACK_COST_POLICY;
        const identity = computePolicyChecksum(this.config);
        this.checksum = identity.checksumSha256;
        this.displayChecksum = identity.displayChecksum;
      }
    }

    this.indexRoutes();
  }

  private indexRoutes(): void {
    this.exactRoutes.clear();
    this.wildcardRoutes.clear();

    for (const r of this.config.routes || []) {
      const cleanPath = r.path.replace(/\/+$/, '') || '/';
      const cleanMethod = r.method.toUpperCase();

      if (cleanMethod === '*') {
        this.wildcardRoutes.set(cleanPath, r);
      } else {
        this.exactRoutes.set(`${cleanMethod}:${cleanPath}`, r);
      }
    }
  }

  public getRoutePolicy(method: string, path: string): RouteCostPolicy {
    const cleanPath = path.split('?')[0].replace(/\/+$/, '') || '/';
    const cleanMethod = method.toUpperCase() as HttpMethod;

    const exact = this.exactRoutes.get(`${cleanMethod}:${cleanPath}`);
    if (exact) return exact;

    const wildcard = this.wildcardRoutes.get(cleanPath);
    if (wildcard) return wildcard;

    const d = this.config.defaults;
    return {
      method: cleanMethod,
      path: cleanPath,
      cost: d.cost,
      authentication: d.authentication,
      page_size_default: d.page_size_default,
      page_size_max: d.page_size_max,
      query_timeout_ms: d.query_timeout_ms,
      lock_timeout_ms: d.lock_timeout_ms,
      max_data_points: d.max_data_points,
      max_request_body_bytes: d.max_request_body_bytes,
      max_response_bytes: d.max_response_bytes,
      failure_mode: d.failure_mode,
      shadow_mode: d.shadow_mode
    };
  }
}
