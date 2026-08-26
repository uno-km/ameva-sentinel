"""
Unit tests for SentinelCostGuardEvaluator, LocalEmergencyBudgetStore, and Redis failure fallback in Python.
"""

import pytest
from ameva_sentinel.core.evaluator import SentinelCostGuardEvaluator
from ameva_sentinel.core.local_store import LocalEmergencyBudgetStore
from ameva_sentinel.core.budget_types import (
    RequestCostContext,
    RouteCostPolicy,
    BudgetConsumeRequest,
    VerifiedPrincipal,
    RateLimitTier,
)
from ameva_sentinel.core.policy_registry import CostPolicyRegistry


@pytest.mark.asyncio
async def test_local_emergency_budget_store():
    store = LocalEmergencyBudgetStore(default_capacity=100, default_refill_rate=1.66)
    policy = RouteCostPolicy(method="GET", path="/test", cost=30)

    # 1st consume: 30 of 100
    r1 = await store.consume_async(BudgetConsumeRequest(cost=30, route_key="GET:/test", policy=policy))
    assert r1.allowed is True
    assert r1.remaining_cost == 70

    # 2nd consume: 30 of 70
    r2 = await store.consume_async(BudgetConsumeRequest(cost=30, route_key="GET:/test", policy=policy))
    assert r2.allowed is True
    assert r2.remaining_cost == 40

    # 3rd consume: 30 of 40
    r3 = await store.consume_async(BudgetConsumeRequest(cost=30, route_key="GET:/test", policy=policy))
    assert r3.allowed is True
    assert r3.remaining_cost == 10

    # 4th consume: 30 needed, 10 available -> refused
    r4 = await store.consume_async(BudgetConsumeRequest(cost=30, route_key="GET:/test", policy=policy))
    assert r4.allowed is False
    assert r4.retry_after_seconds > 0


@pytest.mark.asyncio
async def test_emergency_store_tier_isolation():
    store = LocalEmergencyBudgetStore(default_capacity=100, default_refill_rate=0.001)
    base_request = BudgetConsumeRequest(cost=10, route_key="GET:/api/v1/data", network_key="net-client-a")

    # 1. Initial consume with authenticated tier (emergencyCapacity = 200)
    auth_tier = RateLimitTier(name="authenticated_key", capacity=2000, refill_tokens_per_minute=2000, emergency_local_capacity=200)
    r1 = store.consume(BudgetConsumeRequest(
        cost=10,
        route_key="GET:/api/v1/data",
        network_key="net-client-a",
        emergency_capacity=200,
        tier=auth_tier
    ))
    assert r1.allowed is True
    assert r1.remaining_cost == 190

    # 2. Subsequent consume with different anonymous tier (creates isolated bucket)
    anon_tier = RateLimitTier(name="anonymous_network", capacity=100, refill_tokens_per_minute=100, emergency_local_capacity=30)
    r2 = store.consume(BudgetConsumeRequest(
        cost=10,
        route_key="GET:/api/v1/data",
        network_key="net-client-a",
        emergency_capacity=30,
        tier=anon_tier
    ))
    assert r2.allowed is True
    assert r2.remaining_cost == 20


@pytest.mark.asyncio
async def test_dynamic_capacity_clamp_same_tier():
    store = LocalEmergencyBudgetStore(default_capacity=500, default_refill_rate=0.0001)
    base_request = BudgetConsumeRequest(cost=10, route_key="GET:/api/v1/data", network_key="net-client-a")
    custom_tier = RateLimitTier(name="custom-plan", capacity=2000, refill_tokens_per_minute=1, emergency_local_capacity=200)

    # 1. First consume with emergency capacity 200 -> consumes 10, remaining 190
    r1 = store.consume(BudgetConsumeRequest(
        cost=10,
        route_key="GET:/api/v1/data",
        network_key="net-client-a",
        emergency_capacity=200,
        tier=custom_tier
    ))
    assert r1.allowed is True
    assert r1.remaining_cost == 190

    # 2. Dynamically reduce emergency capacity to 30 on the EXACT same tier and key
    # Remaining tokens must clamp from 190 down to min(30, 190) = 30, then 10 consumed -> remaining 20
    r2 = store.consume(BudgetConsumeRequest(
        cost=10,
        route_key="GET:/api/v1/data",
        network_key="net-client-a",
        emergency_capacity=30,
        tier=custom_tier
    ))
    assert r2.allowed is True
    assert r2.remaining_cost == 20


@pytest.mark.asyncio
async def test_same_bucket_concurrent_consume():
    import asyncio

    store = LocalEmergencyBudgetStore(default_capacity=10, default_refill_rate=0.00001)
    base_request = BudgetConsumeRequest(
        cost=8,
        route_key="GET:/api/v1/checkout",
        network_key="client-py-concurrency",
    )

    # Launch two concurrent consume requests against a bucket with 10 tokens
    res1, res2 = await asyncio.gather(
        store.consume_async(base_request),
        store.consume_async(base_request),
    )

    success_count = sum(1 for r in (res1, res2) if r.allowed)
    failure_count = sum(1 for r in (res1, res2) if not r.allowed)

    assert success_count == 1, "Exactly one concurrent request of cost 8 must succeed within budget 10"
    assert failure_count == 1, "The second concurrent request must be rate limited"

    succ_res = res1 if res1.allowed else res2
    fail_res = res2 if res1.allowed else res1

    assert succ_res.remaining_cost == 2
    assert fail_res.remaining_cost == 2
    assert fail_res.retry_after_seconds > 0


def test_unauthenticated_principal_invariant():
    # Valid unauthenticated principal with safe default risk_class
    valid_anon = VerifiedPrincipal(authenticated=False, risk_class="anonymous_browser")
    assert valid_anon.authenticated is False
    assert valid_anon.tenant_id is None
    assert valid_anon.risk_class == "anonymous_browser"

    # Setting identity fields when authenticated=False must raise ValueError
    with pytest.raises(ValueError, match="Unauthenticated VerifiedPrincipal cannot contain identity fields"):
        VerifiedPrincipal(authenticated=False, tenant_id="victim", api_key_id="spoofed")

    with pytest.raises(ValueError, match="Unauthenticated VerifiedPrincipal cannot contain identity fields"):
        VerifiedPrincipal(authenticated=False, authenticated_tier="premium")




@pytest.mark.asyncio
async def test_unverified_tenant_and_principal_isolation():
    captured_req = None

    class SpyStore:
        async def consume_async(self, req):
            nonlocal captured_req
            captured_req = req
            from ameva_sentinel.core.budget_types import BudgetConsumeResult
            return BudgetConsumeResult(allowed=True, remaining_cost=100, retry_after_seconds=0)

    evaluator = SentinelCostGuardEvaluator(budget_store=SpyStore(), enforce_by_default=True)

    # 1. Unverified context tenantId
    unverified_ctx = RequestCostContext(
        method="GET",
        path="/health",
        tenant_id="victim-tenant-hijack",
        principal=VerifiedPrincipal(authenticated=False),
        pseudonymous_key="anon-network-1",
    )
    await evaluator.evaluate_async(unverified_ctx)
    assert captured_req.tenant_id is None
    assert captured_req.api_key_id is None

    # 2. Verified principal tenantId and accountId
    verified_ctx = RequestCostContext(
        method="GET",
        path="/health",
        tenant_id="spoofed-header-tenant",
        principal=VerifiedPrincipal(
            authenticated=True,
            tenant_id="trusted-corp-tenant",
            account_id="account-99",
            api_key_id="ak-live-123",
        ),
    )
    await evaluator.evaluate_async(verified_ctx)
    assert captured_req.tenant_id == "trusted-corp-tenant"
    assert captured_req.account_id == "account-99"
    assert captured_req.api_key_id == "ak-live-123"


@pytest.mark.asyncio
async def test_redis_failure_emergency_cap_enforcement():
    class FailingStore:
        async def consume_async(self, req):
            raise ConnectionError("Redis cluster unreachable")

    emergency_store = LocalEmergencyBudgetStore(default_capacity=50, default_refill_rate=0.001)
    evaluator = SentinelCostGuardEvaluator(
        budget_store=FailingStore(),
        emergency_store=emergency_store,
        enforce_by_default=True,
    )

    ctx = RequestCostContext(method="GET", path="/api/v1/chart/unified")  # cost = 10, failure_mode="allow_with_emergency_cap"

    # anonymous_network emergency_local_capacity is 30.
    # 3 requests * 10 cost = 30 tokens (exhausts capacity)
    for _ in range(3):
        dec = await evaluator.evaluate_async(ctx)
        assert dec.allowed is True
        assert dec.degraded is True
        assert dec.enforced is True

    # 4th request: Emergency tokens exhausted -> Must be rate limited
    dec4 = await evaluator.evaluate_async(ctx)
    assert dec4.allowed is False
    assert dec4.action == "RATE_LIMIT"
    assert dec4.reason_code == "COST_BUDGET_EXCEEDED"
    assert dec4.degraded is True
    assert dec4.enforced is True


@pytest.mark.asyncio
async def test_shadow_mode_unified_semantics():
    registry = CostPolicyRegistry()
    evaluator = SentinelCostGuardEvaluator(policy_registry=registry, enforce_by_default=False)

    ctx = RequestCostContext(
        method="GET",
        path="/health",
        page_size=500,  # exceeds default max (50)
    )
    decision = await evaluator.evaluate_async(ctx)
    assert decision.allowed is True
    assert decision.action == "OBSERVE"
    assert decision.proposed_action == "DENY"
    assert decision.enforced_action == "ALLOW"
    assert decision.violation_detected is True
    assert decision.enforced is False
