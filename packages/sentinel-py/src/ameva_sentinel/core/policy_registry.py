"""
In-Memory Cost Policy Registry for Python.
"""

from typing import Dict, Optional, Any
from .budget_types import CostPolicyConfig, RouteCostPolicy, HttpMethod
from .canonical import (
    SAFE_FALLBACK_COST_POLICY,
    compute_policy_checksum,
    validate_cost_policy,
)


class CostPolicyRegistry:
    def __init__(self, raw_policy: Optional[Any] = None):
        if raw_policy is None:
            self.config = SAFE_FALLBACK_COST_POLICY
            identity = compute_policy_checksum(self.config)
            self.checksum = identity.checksum_sha256
            self.display_checksum = identity.display_checksum
        else:
            try:
                self.config = validate_cost_policy(raw_policy)
                identity = compute_policy_checksum(self.config)
                self.checksum = identity.checksum_sha256
                self.display_checksum = identity.display_checksum
            except Exception:
                self.config = SAFE_FALLBACK_COST_POLICY
                identity = compute_policy_checksum(self.config)
                self.checksum = identity.checksum_sha256
                self.display_checksum = identity.display_checksum

        self._exact_routes: Dict[str, RouteCostPolicy] = {}
        self._wildcard_routes: Dict[str, RouteCostPolicy] = {}
        self._index_routes()

    def _index_routes(self) -> None:
        self._exact_routes.clear()
        self._wildcard_routes.clear()

        for r in self.config.routes:
            clean_path = r.path.rstrip("/") or "/"
            clean_method = r.method.upper()

            if clean_method == "*":
                self._wildcard_routes[clean_path] = r
            else:
                self._exact_routes[f"{clean_method}:{clean_path}"] = r

    def get_route_policy(self, method: str, path: str) -> RouteCostPolicy:
        clean_path = path.split("?")[0].rstrip("/") or "/"
        clean_method = method.upper()

        exact_key = f"{clean_method}:{clean_path}"
        if exact_key in self._exact_routes:
            return self._exact_routes[exact_key]

        if clean_path in self._wildcard_routes:
            return self._wildcard_routes[clean_path]

        d = self.config.defaults
        return RouteCostPolicy(
            method=clean_method,  # type: ignore
            path=clean_path,
            cost=d.cost,
            authentication=d.authentication,
            page_size_default=d.page_size_default,
            page_size_max=d.page_size_max,
            query_timeout_ms=d.query_timeout_ms,
            lock_timeout_ms=d.lock_timeout_ms,
            max_data_points=d.max_data_points,
            max_request_body_bytes=d.max_request_body_bytes,
            max_response_bytes=d.max_response_bytes,
            failure_mode=d.failure_mode,
            shadow_mode=d.shadow_mode,
        )
