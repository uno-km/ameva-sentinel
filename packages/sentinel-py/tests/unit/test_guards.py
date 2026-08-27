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

    # Invalid paths & ambiguity fixtures
    assert RequestShapeGuard.validate_path("").valid is False
    assert RequestShapeGuard.validate_path(None).valid is False
    assert RequestShapeGuard.validate_path("api/v1").message == "PATH_MUST_START_WITH_SLASH"
    assert RequestShapeGuard.validate_path("/api/v1/\0/secret").message == "ASCII_CONTROL_CHAR_IN_PATH"
    assert RequestShapeGuard.validate_path("/api/v1/\u001f/secret").message == "ASCII_CONTROL_CHAR_IN_PATH"
    assert RequestShapeGuard.validate_path("/api/v1/\u007f/secret").message == "ASCII_CONTROL_CHAR_IN_PATH"
    assert RequestShapeGuard.validate_path("/api/v1/%00/secret").message == "NULL_BYTE_IN_PATH"
    assert RequestShapeGuard.validate_path("/api/v1/../secret").message == "DOT_SEGMENT_IN_PATH"
    assert RequestShapeGuard.validate_path("/api/v1/..").message == "DOT_SEGMENT_IN_PATH"
    assert RequestShapeGuard.validate_path("/api/v1/.").message == "DOT_SEGMENT_IN_PATH"
    assert RequestShapeGuard.validate_path("//api/v1").message == "REPEATED_SLASHES_IN_PATH"
    assert RequestShapeGuard.validate_path("/api//v1").message == "REPEATED_SLASHES_IN_PATH"
    assert RequestShapeGuard.validate_path("/api/v1/chart;jsessionid=123").message == "SEMICOLON_IN_PATH"
    assert RequestShapeGuard.validate_path("/api/v1/%252e%252e/secret").message == "DOUBLE_ENCODING_IN_PATH"
    assert RequestShapeGuard.validate_path("/api/v1/%255csecret").message == "DOUBLE_ENCODING_IN_PATH"
    assert RequestShapeGuard.validate_path("/api/v1/%2e%2e/secret").message == "ENCODED_DOT_SEGMENT_IN_PATH"
    assert RequestShapeGuard.validate_path("/api/v1/%2e./secret").message == "ENCODED_DOT_SEGMENT_IN_PATH"
    assert RequestShapeGuard.validate_path("/api/v1/.%2e/secret").message == "ENCODED_DOT_SEGMENT_IN_PATH"
    assert RequestShapeGuard.validate_path("/api/v1/%").message == "MALFORMED_PERCENT_ENCODING"
    assert RequestShapeGuard.validate_path("/api/v1/%2g").message == "MALFORMED_PERCENT_ENCODING"
    assert RequestShapeGuard.validate_path("C:\\windows\\system32").message == "PATH_MUST_START_WITH_SLASH"
    assert RequestShapeGuard.validate_path("/api/v1/%5csecret").message == "BACKSLASH_IN_PATH"
    assert RequestShapeGuard.validate_path("/api/v1\\secret").message == "BACKSLASH_IN_PATH"


def test_trusted_proxy_extraction():
    import pytest
    from ameva_sentinel import extract_client_ip, is_ip_in_cidr, TrustedProxyPolicy

    # CIDR check including IPv6 and mapped IPv4
    assert is_ip_in_cidr("127.0.0.1", "127.0.0.0/8") is True
    assert is_ip_in_cidr("10.0.5.23", "10.0.0.0/8") is True
    assert is_ip_in_cidr("203.0.113.195", "10.0.0.0/8") is False
    assert is_ip_in_cidr("fc00::1", "fc00::/7") is True
    assert is_ip_in_cidr("fe80::1", "fe80::/10") is True
    assert is_ip_in_cidr("::ffff:192.168.1.10", "192.168.1.0/24") is True
    assert is_ip_in_cidr("2001:db8::1%eth0", "2001:db8::/32") is False

    # Default policy trusts NO proxy
    with pytest.raises(ValueError, match="UNTRUSTED_FORWARDED_HEADERS"):
        extract_client_ip(
            socket_remote_address="10.0.0.1",
            headers={"x-forwarded-for": "8.8.8.8"},
        )

    # Missing socket address
    with pytest.raises(ValueError, match="MISSING_OR_INVALID_SOCKET_REMOTE_ADDRESS"):
        extract_client_ip(
            socket_remote_address="",
            headers={"x-forwarded-for": "8.8.8.8"},
        )

    # Untrusted direct connection with no forwarded headers
    direct = extract_client_ip(socket_remote_address="203.0.113.5")
    assert direct == "203.0.113.5"

    # Explicit trusted proxy right-to-left resolution
    pol = TrustedProxyPolicy(
        trusted_cidrs=("10.0.0.0/8", "172.16.0.0/12"),
        max_forwarded_hops=3,
    )
    res = extract_client_ip(
        socket_remote_address="10.0.0.1",
        headers={"x-forwarded-for": "203.0.113.195, 172.16.0.5"},
        policy=pol,
    )
    assert res == "203.0.113.195"

    # Hop limit exceeded
    with pytest.raises(ValueError, match="FORWARDED_HOP_LIMIT_EXCEEDED"):
        extract_client_ip(
            socket_remote_address="10.0.0.1",
            headers={"x-forwarded-for": "1.1.1.1, 2.2.2.2, 3.3.3.3, 4.4.4.4"},
            policy=pol,
        )

    # Conflicting headers
    with pytest.raises(ValueError, match="CONFLICTING_FORWARDED_HEADERS"):
        extract_client_ip(
            socket_remote_address="10.0.0.1",
            headers={"forwarded": "for=198.51.100.1", "x-forwarded-for": "198.51.100.2"},
            policy=pol,
        )




