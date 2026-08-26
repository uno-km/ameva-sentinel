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


def test_asgi_middleware_integration():
    async def homepage(request):
        return JSONResponse({"status": "ok"})

    app = Starlette(routes=[Route("/api/v1/chart", homepage)])

    policy = RouteCostPolicy(method="GET", path="/api/v1/chart", cost=10, page_size_max=50)
    registry = CostPolicyRegistry()
    registry.config.routes.append(policy)
    registry._index_routes()

    evaluator = SentinelCostGuardEvaluator(policy_registry=registry, enforce_by_default=True)
    app.add_middleware(SentinelASGIMiddleware, evaluator=evaluator)

    client = TestClient(app)

    # Valid request
    res = client.get("/api/v1/chart?pageSize=20")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}
    assert res.headers["x-sentinel-action"] == "ALLOW"

    # Shape guard violation (page size 100 > 50)
    res_bad = client.get("/api/v1/chart?pageSize=100")
    assert res_bad.status_code == 400
    data = res_bad.json()
    assert data["allowed"] is False
    assert data["reasonCode"] == "REQUEST_SHAPE_EXCEEDED"


def test_wsgi_middleware_integration():
    def simple_app(environ, start_response):
        response = Response("ok", mimetype="text/plain")
        return response(environ, start_response)

    policy = RouteCostPolicy(method="GET", path="/api/v1/data", cost=10, page_size_max=50)
    registry = CostPolicyRegistry()
    registry.config.routes.append(policy)
    registry._index_routes()

    evaluator = SentinelCostGuardEvaluator(policy_registry=registry, enforce_by_default=True)
    wrapped = SentinelWSGIMiddleware(simple_app, evaluator=evaluator)
    client = Client(wrapped, Response)

    # Valid request
    res = client.get("/api/v1/data?pageSize=20")
    assert res.status_code == 200
    assert res.headers["x-sentinel-action"] == "ALLOW"

    # Shape violation
    res_bad = client.get("/api/v1/data?pageSize=100")
    assert res_bad.status_code == 400


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
