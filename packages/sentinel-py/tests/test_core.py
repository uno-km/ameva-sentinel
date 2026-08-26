"""
Basic core tests for privacy, target typing, and ActorClaim evaluation.
"""

from ameva_sentinel import (
    Sentinel,
    ActorClaim,
    mask_ip_address,
    normalize_target_type,
    resolve_provider_adapter,
)


def test_ip_masking():
    assert mask_ip_address("192.168.1.100") == "192.168.1.0/24"
    assert mask_ip_address("2001:db8:85a3::8a2e:370:7334") == "2001:db8:85a3::/48"
    assert mask_ip_address("invalid") == "0.0.0.0/0"
    assert mask_ip_address(None) == "0.0.0.0/0"


def test_target_type():
    assert normalize_target_type("chart") == "chart"
    assert normalize_target_type("ORDERBOOK") == "orderbook"
    assert normalize_target_type("invalid") == "standard"
    assert normalize_target_type(None) == "standard"


def test_provider_resolution():
    cf_headers = {"cf-connecting-ip": "1.1.1.1", "cf-connecting-asn": "13335", "cf-ipcountry": "US"}
    info = resolve_provider_adapter(cf_headers)
    assert info.provider == "cloudflare"
    assert info.client_ip == "1.1.1.1"
    assert info.asn == 13335
    assert info.country == "US"


def test_sentinel_evaluation_unknown_baseline():
    claim = ActorClaim(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)", ip_address="1.2.3.4")
    assessment = Sentinel.evaluate_request(claim)
    assert assessment.action == "ALLOW"
    assert assessment.bot_category == "NONE"
    assert assessment.confidence == 0.10


def test_sentinel_fail_open():
    claim = ActorClaim(user_agent="python-requests/2.31.0", ip_address="1.2.3.4")
    assessment = Sentinel.evaluate_request(claim)
    assert assessment.action == "OBSERVE"
    assert assessment.bot_category == "AUTOMATED_TOOL"
