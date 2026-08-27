"""
Core SentinelCostGuardEvaluator for Python.
Provides both Async and Sync evaluation methods with emergency fallback caps and verified principals.
"""

from typing import Optional, Union, Any, Tuple
from .budget_types import (
    RequestCostContext,
    CostGuardDecision,
    CostGuardBudgetInfo,
    BudgetConsumeRequest,
    RouteCostPolicy,
    RateLimitTier,
    RedisFailurePolicy,
)
from .policy_registry import CostPolicyRegistry
from .guards import RequestShapeGuard
from .local_store import LocalEmergencyBudgetStore, compute_emergency_capacity
from .protocols import AsyncBudgetStore, SyncBudgetStore, ThreatAggregateStore


class SentinelCostGuardEvaluator:
    def __init__(
        self,
        policy_registry: Optional[CostPolicyRegistry] = None,
        budget_store: Optional[Union[AsyncBudgetStore, SyncBudgetStore, LocalEmergencyBudgetStore]] = None,
        emergency_store: Optional[LocalEmergencyBudgetStore] = None,
        threat_store: Optional[ThreatAggregateStore] = None,
        enforce_by_default: bool = False,
        failure_policy: Optional[RedisFailurePolicy] = None,
    ):
        self.registry = policy_registry or CostPolicyRegistry()
        self.budget_store = budget_store or LocalEmergencyBudgetStore()
        self.emergency_store = emergency_store or LocalEmergencyBudgetStore(default_capacity=50, default_refill_rate=1.0)
        self.threat_store = threat_store
        self.enforce_by_default = enforce_by_default
        self.failure_policy = failure_policy or RedisFailurePolicy()

    def _resolve_tier(self, context: RequestCostContext) -> Tuple[str, RateLimitTier]:
        tiers = self.registry.config.rate_limit_tiers
        principal = context.principal
        if principal and principal.authenticated and principal.tier and principal.tier in tiers:
            t = tiers[principal.tier]
            t.name = principal.tier
            return principal.tier, t
        if principal and principal.authenticated:
            if "authenticated_key" in tiers:
                t = tiers["authenticated_key"]
                t.name = "authenticated_key"
                return "authenticated_key", t
            return "authenticated_key", RateLimitTier(name="authenticated_key", capacity=2000, refill_tokens_per_minute=2000, emergency_local_capacity=200)
        if context.session_id:
            if "session" in tiers:
                t = tiers["session"]
                t.name = "session"
                return "session", t
            return "session", RateLimitTier(name="session", capacity=300, refill_tokens_per_minute=300, emergency_local_capacity=50)
        if "anonymous_network" in tiers:
            t = tiers["anonymous_network"]
            t.name = "anonymous_network"
            return "anonymous_network", t
        return "anonymous_network", RateLimitTier(name="anonymous_network", capacity=100, refill_tokens_per_minute=100, emergency_local_capacity=30)

    def _pre_evaluate(self, context: RequestCostContext) -> Optional[CostGuardDecision]:
        policy = self.registry.get_route_policy(context.method, context.path)
        policy_version = self.registry.config.policy_version
        policy_checksum = self.registry.checksum
        display_checksum = self.registry.display_checksum
        is_shadow = False if self.enforce_by_default else (policy.shadow_mode if policy.shadow_mode is not None else True)

        # 0. Request Path Guard (Ambiguity & Traversal Rejection)
        path_res = RequestShapeGuard.validate_path(context.path)
        if not path_res.valid:
            return CostGuardDecision(
                allowed=is_shadow,
                action="OBSERVE" if is_shadow else "DENY",
                proposed_action="DENY",
                enforced_action="ALLOW" if is_shadow else "DENY",
                violation_detected=True,
                reason_code="REQUEST_SHAPE_EXCEEDED",
                policy_version=policy_version,
                policy_checksum=policy_checksum,
                display_checksum=display_checksum,
                cost=policy.cost,
                degraded=False,
                enforced=not is_shadow,
                message=path_res.message,
            )

        # 1. Upstream-Verified Authentication check (Strictly require principal.authenticated is True)
        principal = context.principal
        is_authenticated = bool(principal and principal.authenticated)
        if policy.authentication == "required" and not is_authenticated:
            return CostGuardDecision(
                allowed=is_shadow,
                action="OBSERVE" if is_shadow else "REQUIRE_AUTH",
                proposed_action="REQUIRE_AUTH",
                enforced_action="ALLOW" if is_shadow else "REQUIRE_AUTH",
                violation_detected=True,
                reason_code="AUTH_REQUIRED",
                policy_version=policy_version,
                policy_checksum=policy_checksum,
                display_checksum=display_checksum,
                cost=policy.cost,
                degraded=False,
                enforced=not is_shadow,
                message="Authentication credentials required and must be verified by upstream auth layer.",
            )

        # 2. Page size guard
        if context.page_size is not None:
            page_res = RequestShapeGuard.validate_page_size(context.page_size, policy)
            if not page_res.valid:
                return CostGuardDecision(
                    allowed=is_shadow,
                    action="OBSERVE" if is_shadow else "DENY",
                    proposed_action="DENY",
                    enforced_action="ALLOW" if is_shadow else "DENY",
                    violation_detected=True,
                    reason_code="REQUEST_SHAPE_EXCEEDED",
                    policy_version=policy_version,
                    policy_checksum=policy_checksum,
                    display_checksum=display_checksum,
                    cost=policy.cost,
                    degraded=False,
                    enforced=not is_shadow,
                    message=page_res.message,
                )

        # 3. Data point calculation budget
        if context.series_count is not None or context.time_buckets is not None:
            point_res = RequestShapeGuard.validate_data_point_budget(
                context.series_count, context.time_buckets, policy
            )
            if not point_res.valid:
                return CostGuardDecision(
                    allowed=is_shadow,
                    action="OBSERVE" if is_shadow else "DENY",
                    proposed_action="DENY",
                    enforced_action="ALLOW" if is_shadow else "DENY",
                    violation_detected=True,
                    reason_code="REQUEST_SHAPE_EXCEEDED",
                    policy_version=policy_version,
                    policy_checksum=policy_checksum,
                    display_checksum=display_checksum,
                    cost=policy.cost,
                    degraded=False,
                    enforced=not is_shadow,
                    message=point_res.message,
                )

        # 4. Body size guard (against max_request_body_bytes)
        if context.body_bytes is not None:
            max_body = policy.max_request_body_bytes or 1048576
            body_res = RequestShapeGuard.validate_body_size(context.body_bytes, max_body)
            if not body_res.valid:
                return CostGuardDecision(
                    allowed=is_shadow,
                    action="OBSERVE" if is_shadow else "DENY",
                    proposed_action="DENY",
                    enforced_action="ALLOW" if is_shadow else "DENY",
                    violation_detected=True,
                    reason_code="REQUEST_SHAPE_EXCEEDED",
                    policy_version=policy_version,
                    policy_checksum=policy_checksum,
                    display_checksum=display_checksum,
                    cost=policy.cost,
                    degraded=False,
                    enforced=not is_shadow,
                    message=body_res.message,
                )

        return None

    async def evaluate_async(self, context: RequestCostContext) -> CostGuardDecision:
        early_decision = self._pre_evaluate(context)
        if early_decision is not None:
            return early_decision

        policy = self.registry.get_route_policy(context.method, context.path)
        policy_version = self.registry.config.policy_version
        policy_checksum = self.registry.checksum
        display_checksum = self.registry.display_checksum
        is_shadow = False if self.enforce_by_default else (policy.shadow_mode if policy.shadow_mode is not None else True)
        tier_name, tier = self._resolve_tier(context)
        route_key = f"{context.method.upper()}:{policy.path}"

        principal = context.principal
        is_authenticated = bool(principal and principal.authenticated)
        trusted_tenant_id = principal.tenant_id if (is_authenticated and principal) else None
        trusted_account_id = principal.account_id if (is_authenticated and principal) else None
        trusted_api_key_id = principal.api_key_id if (is_authenticated and principal) else None

        consume_req = BudgetConsumeRequest(
            cost=policy.cost,
            route_key=route_key,
            tenant_id=trusted_tenant_id,
            account_id=trusted_account_id,
            api_key_id=trusted_api_key_id,
            session_id=context.session_id,
            network_key=context.pseudonymous_key,
            tier=tier,
            emergency_capacity=tier.emergency_local_capacity,
            policy=policy,
        )

        try:
            if hasattr(self.budget_store, "consume_async"):
                consume_res = await self.budget_store.consume_async(consume_req)
            elif hasattr(self.budget_store, "consume") and callable(self.budget_store.consume):
                import inspect
                if inspect.iscoroutinefunction(self.budget_store.consume):
                    consume_res = await self.budget_store.consume(consume_req)
                else:
                    consume_res = self.budget_store.consume(consume_req)
            else:
                consume_res = self.emergency_store.consume(consume_req)

            if not consume_res.allowed:
                return CostGuardDecision(
                    allowed=is_shadow,
                    action="OBSERVE" if is_shadow else "RATE_LIMIT",
                    proposed_action="RATE_LIMIT",
                    enforced_action="ALLOW" if is_shadow else "RATE_LIMIT",
                    violation_detected=True,
                    reason_code="COST_BUDGET_EXCEEDED",
                    policy_version=policy_version,
                    policy_checksum=policy_checksum,
                    display_checksum=display_checksum,
                    cost=policy.cost,
                    budget=CostGuardBudgetInfo(
                        requested_cost=policy.cost,
                        remaining_cost=consume_res.remaining_cost,
                        retry_after_seconds=consume_res.retry_after_seconds,
                    ),
                    degraded=consume_res.degraded,
                    enforced=not is_shadow,
                    message=f"Cost budget exceeded for route '{route_key}'.",
                )

            return CostGuardDecision(
                allowed=True,
                action="ALLOW",
                proposed_action="ALLOW",
                enforced_action="ALLOW",
                violation_detected=False,
                reason_code="WITHIN_BUDGET",
                policy_version=policy_version,
                policy_checksum=policy_checksum,
                display_checksum=display_checksum,
                cost=policy.cost,
                budget=CostGuardBudgetInfo(
                    requested_cost=policy.cost,
                    remaining_cost=consume_res.remaining_cost,
                    retry_after_seconds=0,
                ),
                degraded=consume_res.degraded,
                enforced=not is_shadow,
            )
        except Exception:
            failure_mode = self.failure_policy.mode

            if policy.failure_mode == "deny" or failure_mode == "fail-closed":
                return CostGuardDecision(
                    allowed=is_shadow,
                    action="OBSERVE" if is_shadow else "DENY",
                    proposed_action="DENY",
                    enforced_action="ALLOW" if is_shadow else "DENY",
                    violation_detected=True,
                    reason_code="FAIL_CLOSED",
                    policy_version=policy_version,
                    policy_checksum=policy_checksum,
                    display_checksum=display_checksum,
                    cost=policy.cost,
                    degraded=True,
                    enforced=not is_shadow,
                    message="Distributed budget store unavailable (failure_mode=fail-closed).",
                )

            if policy.failure_mode == "allow" or failure_mode == "fail-open":
                return CostGuardDecision(
                    allowed=True,
                    action="ALLOW",
                    proposed_action="ALLOW",
                    enforced_action="ALLOW",
                    violation_detected=False,
                    reason_code="FAIL_OPEN",
                    policy_version=policy_version,
                    policy_checksum=policy_checksum,
                    display_checksum=display_checksum,
                    cost=policy.cost,
                    degraded=True,
                    enforced=not is_shadow,
                    message="Distributed budget store unavailable (failure_mode=fail-open).",
                )

            base_cap = tier.emergency_local_capacity or tier.capacity or 100
            bounded_emergency_cap = compute_emergency_capacity(
                base_cap,
                self.failure_policy.emergency_ratio,
                self.failure_policy.expected_replica_count,
            )
            consume_req.emergency_capacity = bounded_emergency_cap

            em_res = self.emergency_store.consume(consume_req)
            if not em_res.allowed:
                return CostGuardDecision(
                    allowed=is_shadow,
                    action="OBSERVE" if is_shadow else "RATE_LIMIT",
                    proposed_action="RATE_LIMIT",
                    enforced_action="ALLOW" if is_shadow else "RATE_LIMIT",
                    violation_detected=True,
                    reason_code="COST_BUDGET_EXCEEDED",
                    policy_version=policy_version,
                    policy_checksum=policy_checksum,
                    display_checksum=display_checksum,
                    cost=policy.cost,
                    budget=CostGuardBudgetInfo(
                        requested_cost=policy.cost,
                        remaining_cost=em_res.remaining_cost,
                        retry_after_seconds=em_res.retry_after_seconds,
                    ),
                    degraded=True,
                    enforced=not is_shadow,
                    message=f"Emergency local capacity ({bounded_emergency_cap}) exceeded for route '{route_key}'.",
                )

            return CostGuardDecision(
                allowed=True,
                action="ALLOW",
                proposed_action="ALLOW",
                enforced_action="ALLOW",
                violation_detected=False,
                reason_code="WITHIN_BUDGET",
                policy_version=policy_version,
                policy_checksum=policy_checksum,
                display_checksum=display_checksum,
                cost=policy.cost,
                budget=CostGuardBudgetInfo(
                    requested_cost=policy.cost,
                    remaining_cost=em_res.remaining_cost,
                    retry_after_seconds=0,
                ),
                degraded=True,
                enforced=not is_shadow,
                message="Distributed budget store unavailable; operating under bounded emergency local cap.",
            )

    def evaluate_sync(self, context: RequestCostContext) -> CostGuardDecision:
        early_decision = self._pre_evaluate(context)
        if early_decision is not None:
            return early_decision

        policy = self.registry.get_route_policy(context.method, context.path)
        policy_version = self.registry.config.policy_version
        policy_checksum = self.registry.checksum
        display_checksum = self.registry.display_checksum
        is_shadow = False if self.enforce_by_default else (policy.shadow_mode if policy.shadow_mode is not None else True)
        tier_name, tier = self._resolve_tier(context)
        route_key = f"{context.method.upper()}:{policy.path}"

        principal = context.principal
        is_authenticated = bool(principal and principal.authenticated)
        trusted_tenant_id = principal.tenant_id if (is_authenticated and principal) else None
        trusted_account_id = principal.account_id if (is_authenticated and principal) else None
        trusted_api_key_id = principal.api_key_id if (is_authenticated and principal) else None

        consume_req = BudgetConsumeRequest(
            cost=policy.cost,
            route_key=route_key,
            tenant_id=trusted_tenant_id,
            account_id=trusted_account_id,
            api_key_id=trusted_api_key_id,
            session_id=context.session_id,
            network_key=context.pseudonymous_key,
            tier=tier,
            emergency_capacity=tier.emergency_local_capacity,
            policy=policy,
        )

        try:
            if hasattr(self.budget_store, "consume") and callable(self.budget_store.consume):
                consume_res = self.budget_store.consume(consume_req)
            else:
                consume_res = self.emergency_store.consume(consume_req)

            if not consume_res.allowed:
                return CostGuardDecision(
                    allowed=is_shadow,
                    action="OBSERVE" if is_shadow else "RATE_LIMIT",
                    proposed_action="RATE_LIMIT",
                    enforced_action="ALLOW" if is_shadow else "RATE_LIMIT",
                    violation_detected=True,
                    reason_code="COST_BUDGET_EXCEEDED",
                    policy_version=policy_version,
                    policy_checksum=policy_checksum,
                    display_checksum=display_checksum,
                    cost=policy.cost,
                    budget=CostGuardBudgetInfo(
                        requested_cost=policy.cost,
                        remaining_cost=consume_res.remaining_cost,
                        retry_after_seconds=consume_res.retry_after_seconds,
                    ),
                    degraded=consume_res.degraded,
                    enforced=not is_shadow,
                    message=f"Cost budget exceeded for route '{route_key}'.",
                )

            return CostGuardDecision(
                allowed=True,
                action="ALLOW",
                proposed_action="ALLOW",
                enforced_action="ALLOW",
                violation_detected=False,
                reason_code="WITHIN_BUDGET",
                policy_version=policy_version,
                policy_checksum=policy_checksum,
                display_checksum=display_checksum,
                cost=policy.cost,
                budget=CostGuardBudgetInfo(
                    requested_cost=policy.cost,
                    remaining_cost=consume_res.remaining_cost,
                    retry_after_seconds=0,
                ),
                degraded=consume_res.degraded,
                enforced=not is_shadow,
            )
        except Exception:
            failure_mode = self.failure_policy.mode

            if policy.failure_mode == "deny" or failure_mode == "fail-closed":
                return CostGuardDecision(
                    allowed=is_shadow,
                    action="OBSERVE" if is_shadow else "DENY",
                    proposed_action="DENY",
                    enforced_action="ALLOW" if is_shadow else "DENY",
                    violation_detected=True,
                    reason_code="FAIL_CLOSED",
                    policy_version=policy_version,
                    policy_checksum=policy_checksum,
                    display_checksum=display_checksum,
                    cost=policy.cost,
                    degraded=True,
                    enforced=not is_shadow,
                    message="Distributed budget store unavailable (failure_mode=fail-closed).",
                )

            if policy.failure_mode == "allow" or failure_mode == "fail-open":
                return CostGuardDecision(
                    allowed=True,
                    action="ALLOW",
                    proposed_action="ALLOW",
                    enforced_action="ALLOW",
                    violation_detected=False,
                    reason_code="FAIL_OPEN",
                    policy_version=policy_version,
                    policy_checksum=policy_checksum,
                    display_checksum=display_checksum,
                    cost=policy.cost,
                    degraded=True,
                    enforced=not is_shadow,
                    message="Distributed budget store unavailable (failure_mode=fail-open).",
                )

            base_cap = tier.emergency_local_capacity or tier.capacity or 100
            bounded_emergency_cap = compute_emergency_capacity(
                base_cap,
                self.failure_policy.emergency_ratio,
                self.failure_policy.expected_replica_count,
            )
            consume_req.emergency_capacity = bounded_emergency_cap

            em_res = self.emergency_store.consume(consume_req)
            if not em_res.allowed:
                return CostGuardDecision(
                    allowed=is_shadow,
                    action="OBSERVE" if is_shadow else "RATE_LIMIT",
                    proposed_action="RATE_LIMIT",
                    enforced_action="ALLOW" if is_shadow else "RATE_LIMIT",
                    violation_detected=True,
                    reason_code="COST_BUDGET_EXCEEDED",
                    policy_version=policy_version,
                    policy_checksum=policy_checksum,
                    display_checksum=display_checksum,
                    cost=policy.cost,
                    budget=CostGuardBudgetInfo(
                        requested_cost=policy.cost,
                        remaining_cost=em_res.remaining_cost,
                        retry_after_seconds=em_res.retry_after_seconds,
                    ),
                    degraded=True,
                    enforced=not is_shadow,
                    message=f"Emergency local capacity ({bounded_emergency_cap}) exceeded for route '{route_key}'.",
                )

            return CostGuardDecision(
                allowed=True,
                action="ALLOW",
                proposed_action="ALLOW",
                enforced_action="ALLOW",
                violation_detected=False,
                reason_code="WITHIN_BUDGET",
                policy_version=policy_version,
                policy_checksum=policy_checksum,
                display_checksum=display_checksum,
                cost=policy.cost,
                budget=CostGuardBudgetInfo(
                    requested_cost=policy.cost,
                    remaining_cost=em_res.remaining_cost,
                    retry_after_seconds=0,
                ),
                degraded=True,
                enforced=not is_shadow,
                message="Distributed budget store unavailable; operating under bounded emergency local cap.",
            )
