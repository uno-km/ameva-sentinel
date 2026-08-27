"""
Integration tests for ASGI, WSGI, and SQLAlchemy Postgres Guards.
"""

import pytest
from ameva_sentinel.core.evaluator import SentinelCostGuardEvaluator
from ameva_sentinel.core.budget_types import RouteCostPolicy, VerifiedPrincipal
from ameva_sentinel.core.policy_registry import CostPolicyRegistry
from ameva_sentinel.adapters.asgi import SentinelASGIMiddleware
from ameva_sentinel.adapters.wsgi import SentinelWSGIMiddleware
from ameva_sentinel.integrations.sqlalchemy_postgres import (
    PostgresSqlAlchemyBudgetGuard,
    DatabaseBudgetUsageError,
)
from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Route
from starlette.testclient import TestClient
from werkzeug.test import Client
from werkzeug.wrappers import Response


def test_asgi_middleware_observer_and_enforcer():
    async def homepage(request):
        sentinel_ctx = request.scope.get("ameva_sentinel", {})
        return JSONResponse({
            "status": "ok",
            "violation": sentinel_ctx.get("decision", {}).violation_detected if sentinel_ctx.get("decision") else False
        })

    policy = RouteCostPolicy(method="GET", path="/api/v1/chart", cost=10, page_size_max=50)
    registry = CostPolicyRegistry()
    registry.config.routes.append(policy)
    registry._index_routes()
    evaluator = SentinelCostGuardEvaluator(policy_registry=registry, enforce_by_default=True)

    # 1. Observer Mode: always proceeds downstream
    app_obs = Starlette(routes=[Route("/api/v1/chart", homepage)])
    app_obs.add_middleware(SentinelASGIMiddleware, evaluator=evaluator)
    client_obs = TestClient(app_obs)

    res = client_obs.get("/api/v1/chart?pageSize=20")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"
    assert res.headers["x-sentinel-action"] == "ALLOW"

    # Shape violation in Observer mode STILL calls downstream handler
    res_bad = client_obs.get("/api/v1/chart?pageSize=100")
    assert res_bad.status_code == 200
    assert res_bad.json()["violation"] is True

    # 2. Explicit Enforcer Mode: consumer-controlled blocking
    from ameva_sentinel.adapters.enforcement import SentinelASGIEnforcer

    def custom_decide(ctx):
        decision = ctx.get("decision")
        if decision and not decision.allowed:
            return {"action": "respond", "status": 400, "body": {"error": "REQUEST_SHAPE_EXCEEDED"}}
        return {"action": "continue"}

    app_enf = Starlette(routes=[Route("/api/v1/chart", homepage)])
    app_enf.add_middleware(SentinelASGIEnforcer, decide=custom_decide, evaluator=evaluator)
    client_enf = TestClient(app_enf)

    res_enf_ok = client_enf.get("/api/v1/chart?pageSize=20")
    assert res_enf_ok.status_code == 200

    res_enf_bad = client_enf.get("/api/v1/chart?pageSize=100")
    assert res_enf_bad.status_code == 400
    assert res_enf_bad.json()["error"] == "REQUEST_SHAPE_EXCEEDED"


def test_wsgi_middleware_observer_and_enforcer():
    def simple_app(environ, start_response):
        sentinel_ctx = environ.get("ameva_sentinel", {})
        has_violation = sentinel_ctx.get("decision").violation_detected if sentinel_ctx.get("decision") else False
        body = f"ok, violation={has_violation}".encode("utf-8")
        response = Response(body, mimetype="text/plain")
        return response(environ, start_response)

    policy = RouteCostPolicy(method="GET", path="/api/v1/data", cost=10, page_size_max=50)
    registry = CostPolicyRegistry()
    registry.config.routes.append(policy)
    registry._index_routes()
    evaluator = SentinelCostGuardEvaluator(policy_registry=registry, enforce_by_default=True)

    # 1. Observer mode
    wrapped_obs = SentinelWSGIMiddleware(simple_app, evaluator=evaluator)
    client_obs = Client(wrapped_obs, Response)

    res = client_obs.get("/api/v1/data?pageSize=20")
    assert res.status_code == 200
    assert res.headers["x-sentinel-action"] == "ALLOW"

    # Shape violation in Observer mode STILL calls application
    res_bad = client_obs.get("/api/v1/data?pageSize=100")
    assert res_bad.status_code == 200
    assert b"violation=True" in res_bad.data

    # 2. Explicit Enforcer mode
    from ameva_sentinel.adapters.enforcement import SentinelWSGIEnforcer

    def wsgi_decide(ctx):
        decision = ctx.get("decision")
        if decision and not decision.allowed:
            return {"action": "respond", "status": 400, "body": {"error": "REQUEST_SHAPE_EXCEEDED"}}
        return {"action": "continue"}

    wrapped_enf = SentinelWSGIEnforcer(simple_app, decide=wsgi_decide, evaluator=evaluator)
    client_enf = Client(wrapped_enf, Response)

    res_enf_bad = client_enf.get("/api/v1/data?pageSize=100")
    assert res_enf_bad.status_code == 400
    assert b"REQUEST_SHAPE_EXCEEDED" in res_enf_bad.data



@pytest.mark.asyncio
async def test_sqlalchemy_postgres_guard_transaction_contract():
    class DummySessionWithoutTx:
        def in_transaction(self):
            return False

    class DummySessionOutsideTx:
        def in_transaction(self):
            return False

    policy = RouteCostPolicy(method="GET", path="/test", cost=10, query_timeout_ms=1500, lock_timeout_ms=300)

    # 1. Calling without transaction must raise DatabaseBudgetUsageError
    with pytest.raises(DatabaseBudgetUsageError, match="A transaction is required"):
        await PostgresSqlAlchemyBudgetGuard.apply_postgres_budget(DummySessionWithoutTx(), policy)

    # 2. In valid transaction with failing execute
    class FailingSessionInTx:
        def in_transaction(self):
            return True

        async def execute(self, stmt):
            raise RuntimeError("Database connection reset")

    with pytest.raises(DatabaseBudgetUsageError, match="Failed to apply PostgreSQL query budget"):
        await PostgresSqlAlchemyBudgetGuard.apply_postgres_budget(FailingSessionInTx(), policy)
