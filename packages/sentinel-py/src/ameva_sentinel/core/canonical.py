"""
Canonical JSON serialization, Full SHA-256 Checksum computation, and Schema Validation.
100% Cross-Language Conformance with @ameva/sentinel-risk-core.
"""

import json
import hashlib
import math
from typing import Any, Dict, Set
from .budget_types import (
    CostPolicyConfig,
    CostPolicyDefaults,
    RouteCostPolicy,
    RateLimitTier,
    PolicyIdentity,
)

SAFE_FALLBACK_COST_POLICY = CostPolicyConfig(
    schema_version="1.0",
    policy_version="cost-guard-fallback.0",
    defaults=CostPolicyDefaults(
        cost=10,
        authentication="optional",
        page_size_default=25,
        page_size_max=50,
        query_timeout_ms=2000,
        lock_timeout_ms=500,
        max_data_points=5000,
        max_request_body_bytes=1048576,
        max_response_bytes=1048576,
        failure_mode="allow_with_emergency_cap",
        shadow_mode=True,
    ),
    rate_limit_tiers={
        "anonymous_network": RateLimitTier(
            name="anonymous_network",
            capacity=100,
            refill_tokens_per_minute=100,
            emergency_local_capacity=30,
        ),
        "session": RateLimitTier(
            name="session",
            capacity=300,
            refill_tokens_per_minute=300,
            emergency_local_capacity=50,
        ),
        "authenticated_key": RateLimitTier(
            name="authenticated_key",
            capacity=2000,
            refill_tokens_per_minute=2000,
            emergency_local_capacity=200,
        ),
    },
    routes=[
        RouteCostPolicy(
            method="GET",
            path="/health",
            cost=1,
            query_timeout_ms=500,
            lock_timeout_ms=200,
            max_request_body_bytes=65536,
            max_response_bytes=65536,
            failure_mode="allow",
        ),
        RouteCostPolicy(
            method="GET",
            path="/api/v1/health",
            cost=1,
            query_timeout_ms=500,
            lock_timeout_ms=200,
            max_request_body_bytes=65536,
            max_response_bytes=65536,
            failure_mode="allow",
        ),
    ],
)


def canonicalize_policy_json(obj: Any) -> str:
    if obj is None or isinstance(obj, (bool, str)):
        return json.dumps(obj, separators=(",", ":"), ensure_ascii=False)

    if isinstance(obj, float):
        if not math.isfinite(obj):
            raise ValueError("Non-finite numbers (NaN/Infinity) are forbidden in canonical policy")
        if obj.is_integer():
            return str(int(obj))
        return json.dumps(obj, separators=(",", ":"), ensure_ascii=False)

    if isinstance(obj, int):
        return str(obj)

    if isinstance(obj, list):
        return "[" + ",".join(canonicalize_policy_json(item) for item in obj) + "]"

    if isinstance(obj, dict):
        sorted_keys = sorted(obj.keys())
        pairs = [
            f"{json.dumps(k, ensure_ascii=False)}:{canonicalize_policy_json(obj[k])}"
            for k in sorted_keys
        ]
        return "{" + ",".join(pairs) + "}"

    if hasattr(obj, "model_dump"):
        return canonicalize_policy_json(obj.model_dump(exclude_none=True))

    return json.dumps(obj, separators=(",", ":"), ensure_ascii=False)


def compute_policy_checksum(policy: CostPolicyConfig) -> PolicyIdentity:
    canonical_str = canonicalize_policy_json(policy)
    full_sha = hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()
    return PolicyIdentity(
        checksum_sha256=full_sha,
        display_checksum=full_sha[:16],
    )


def hash_key_identifier(val: str) -> str:
    return hashlib.sha256(val.encode("utf-8")).hexdigest()


def validate_cost_policy(raw_data: Any) -> CostPolicyConfig:
    if not isinstance(raw_data, dict):
        raise ValueError("Cost policy must be a dictionary")

    config = CostPolicyConfig.model_validate(raw_data)

    seen_routes: Set[str] = set()
    for r in config.routes:
        clean_path = r.path.rstrip("/") or "/"
        route_key = f"{r.method.upper()}:{clean_path}"
        if route_key in seen_routes:
            raise ValueError(f"Duplicate route policy defined: {route_key}")
        seen_routes.add(route_key)

    return config
