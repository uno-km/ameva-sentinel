"""
Unit tests for RequestShapeGuard and ResponseBudgetGuard in Python.
"""

from ameva_sentinel.core.guards import RequestShapeGuard, ResponseBudgetGuard
from ameva_sentinel.core.budget_types import RouteCostPolicy


def test_request_shape_page_size():
    policy = RouteCostPolicy(method="GET", path="/api/v1/data", cost=10, page_size_default=25, page_size_max=50)

    # Valid page size
    res1 = RequestShapeGuard.validate_page_size(30, policy)
    assert res1.valid is True

    # Exceeds max page size
    res2 = RequestShapeGuard.validate_page_size(100, policy)
    assert res2.valid is False
    assert res2.reason_code == "PAGE_SIZE_EXCEEDED"


def test_request_shape_data_point_budget():
    policy = RouteCostPolicy(method="GET", path="/api/v1/chart", cost=10, max_data_points=5000)

    # 10 series * 100 buckets = 1000 points (within 5000)
    res1 = RequestShapeGuard.validate_data_point_budget(10, 100, policy)
    assert res1.valid is True

    # 100 series * 100 buckets = 10000 points (exceeds 5000)
    res2 = RequestShapeGuard.validate_data_point_budget(100, 100, policy)
    assert res2.valid is False
    assert res2.reason_code == "QUERY_BUDGET_EXCEEDED"


def test_response_budget_row_count():
    # 500 rows within 1000 limit
    res1 = ResponseBudgetGuard.validate_row_count(500, max_rows=1000)
    assert res1.valid is True

    # 2000 rows exceeds 1000 limit
    res2 = ResponseBudgetGuard.validate_row_count(2000, max_rows=1000)
    assert res2.valid is False
    assert res2.reason_code == "RESPONSE_ROW_BUDGET_EXCEEDED"


def test_budget_scopes_ssot():
    from ameva_sentinel import BUDGET_SCOPES, LEGACY_DEFAULT_BUDGET_SCOPES
    assert BUDGET_SCOPES == ("global", "route", "tenant", "account", "authKey", "session", "network")
    assert LEGACY_DEFAULT_BUDGET_SCOPES == ("route", "tenant", "account", "authKey", "session", "network")


def test_request_shape_path_validation():
    # Valid paths
    assert RequestShapeGuard.validate_path("/api/v1/chart").valid is True
    assert RequestShapeGuard.validate_path("/users/123/profile").valid is True

    # Invalid paths
    assert RequestShapeGuard.validate_path("").valid is False
    assert RequestShapeGuard.validate_path(None).valid is False
    assert RequestShapeGuard.validate_path("/api/v1/\0/secret").valid is False
    assert RequestShapeGuard.validate_path("/api/v1/%00/secret").valid is False
    assert RequestShapeGuard.validate_path("/api/v1/../secret").valid is False
    assert RequestShapeGuard.validate_path("/api/v1/%2e%2e/secret").valid is False
    assert RequestShapeGuard.validate_path("/api/v1/..%2fsecret").valid is False
    assert RequestShapeGuard.validate_path("/api/v1/%2fsecret").valid is False
    assert RequestShapeGuard.validate_path("C:\\windows\\system32").valid is False
    assert RequestShapeGuard.validate_path("/api/v1/%5csecret").valid is False


