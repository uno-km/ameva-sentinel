"""
In-Memory Emergency Budget Store implementing SyncBudgetStore and AsyncBudgetStore.
Supports tier-specific emergency local capacities, namespace isolation, strict input validation, and dynamic token balance clamping.
"""

import time
import math
from typing import Dict, Tuple
from .budget_types import BudgetConsumeRequest, BudgetConsumeResult


def compute_emergency_capacity(
    normal_capacity: int,
    emergency_ratio: float = 0.5,
    expected_replica_count: int = 1,
) -> int:
    if not isinstance(normal_capacity, int) or normal_capacity < 0:
        raise ValueError("normal_capacity must be a non-negative integer")
    if not isinstance(emergency_ratio, (int, float)) or emergency_ratio <= 0 or emergency_ratio > 1:
        raise ValueError("emergency_ratio must be a number > 0 and <= 1")
    if not isinstance(expected_replica_count, int) or expected_replica_count < 1:
        raise ValueError("expected_replica_count must be an integer >= 1")
    if normal_capacity == 0:
        return 0
    return max(1, math.floor((normal_capacity * emergency_ratio) / expected_replica_count))


class LocalEmergencyBudgetStore:
    def __init__(self, default_capacity: int = 100, default_refill_rate: float = 1.66):
        if not isinstance(default_capacity, int) or default_capacity < 0:
            raise ValueError("default_capacity must be a non-negative integer")
        if not isinstance(default_refill_rate, (int, float)) or default_refill_rate < 0:
            raise ValueError("default_refill_rate must be a non-negative number")
        self.default_capacity = default_capacity
        self.default_refill_rate = default_refill_rate
        self._buckets: Dict[str, Tuple[float, float]] = {}

    def _resolve_key(self, request: BudgetConsumeRequest) -> str:
        tenant = f"tenant:{request.tenant_id}:" if request.tenant_id else ""
        tier = f"tier:{request.tier.name}:" if (request.tier and request.tier.name) else ""
        if request.api_key_id:
            return f"{tenant}{tier}auth_key:{request.api_key_id}"
        if request.account_id:
            return f"{tenant}{tier}account:{request.account_id}"
        if request.session_id:
            return f"{tenant}{tier}session:{request.session_id}"
        if request.network_key:
            return f"{tenant}{tier}net:{request.network_key}"
        return f"{tenant}{tier}route:{request.route_key}"

    def consume(self, request: BudgetConsumeRequest) -> BudgetConsumeResult:
        if not request or not isinstance(request.cost, int) or request.cost <= 0:
            raise ValueError("cost must be an integer greater than zero")
        if not isinstance(request.route_key, str) or len(request.route_key) == 0 or len(request.route_key) > 512:
            raise ValueError("route_key must be a non-empty bounded string")

        now = time.time()
        key = self._resolve_key(request)
        cost = request.cost

        capacity = float(
            request.emergency_capacity
            if request.emergency_capacity is not None
            else (request.tier.emergency_local_capacity if request.tier else self.default_capacity)
        )
        if capacity < 0:
            raise ValueError("capacity must be non-negative")

        refill_rate = (
            float(request.tier.refill_tokens_per_minute) / 60.0
            if request.tier
            else self.default_refill_rate
        )
        if refill_rate < 0:
            raise ValueError("refill_rate must be non-negative")

        tokens, last_updated = self._buckets.get(key, (capacity, now))
        elapsed = max(0.0, now - last_updated)

        # Dynamic capacity clamp on tier downgrade
        base_tokens = min(tokens, capacity)
        tokens = min(capacity, base_tokens + (elapsed * refill_rate))

        if tokens >= cost:
            tokens -= cost
            self._buckets[key] = (tokens, now)
            return BudgetConsumeResult(
                allowed=True,
                remaining_cost=int(tokens),
                retry_after_seconds=0,
                degraded=True,
                store="local-emergency",
                consistency="process-local",
                reason="ALLOWED",
            )
        else:
            missing = cost - tokens
            retry_after = 0 if refill_rate == 0 else math.ceil(missing / refill_rate)
            self._buckets[key] = (tokens, now)
            return BudgetConsumeResult(
                allowed=False,
                remaining_cost=int(tokens),
                retry_after_seconds=retry_after,
                degraded=True,
                store="local-emergency",
                consistency="process-local",
                reason="QUOTA_EXCEEDED",
            )

    async def consume_async(self, request: BudgetConsumeRequest) -> BudgetConsumeResult:
        return self.consume(request)

    def reset(self) -> None:
        self._buckets.clear()
