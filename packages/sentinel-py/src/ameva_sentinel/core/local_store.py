"""
In-Memory Emergency Budget Store implementing SyncBudgetStore and AsyncBudgetStore.
Supports tier-specific emergency local capacities, namespace isolation, and dynamic token balance clamping.
"""

import time
import math
from typing import Dict, Tuple
from .budget_types import BudgetConsumeRequest, BudgetConsumeResult


class LocalEmergencyBudgetStore:
    def __init__(self, default_capacity: int = 100, default_refill_rate: float = 1.66):
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
        now = time.time()
        key = self._resolve_key(request)
        cost = request.cost

        capacity = float(
            request.emergency_capacity
            if request.emergency_capacity is not None
            else (request.tier.emergency_local_capacity if request.tier else self.default_capacity)
        )
        refill_rate = (
            float(request.tier.refill_tokens_per_minute) / 60.0
            if request.tier
            else self.default_refill_rate
        )

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
                degraded=False,
            )
        else:
            missing = cost - tokens
            retry_after = math.ceil(missing / max(0.001, refill_rate))
            self._buckets[key] = (tokens, now)
            return BudgetConsumeResult(
                allowed=False,
                remaining_cost=int(tokens),
                retry_after_seconds=retry_after,
                degraded=False,
            )

    async def consume_async(self, request: BudgetConsumeRequest) -> BudgetConsumeResult:
        return self.consume(request)

    def reset(self) -> None:
        self._buckets.clear()
