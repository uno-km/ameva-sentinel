from ameva_sentinel import Sentinel, mask_ip_address, normalize_target_type
from ameva_sentinel.providers import resolve_provider_adapter

def test_ip_masking():
    assert mask_ip_address("203.0.113.195") == "203.0.***.***"
    assert mask_ip_address("2001:0db8:85a3:0000:0000:8a2e:0370:7334") == "2001:0db8:85a3:0000::"
    assert mask_ip_address("invalid") is None

def test_target_type():
    assert normalize_target_type("button") == "BUTTON"
    assert normalize_target_type("evil_text") == "OTHER"

def test_provider_resolution():
    adapter = resolve_provider_adapter({"cf-ray": "8f123-ICN"})
    assert adapter.name == "CLOUDFLARE"

def test_sentinel_evaluation_unknown_baseline():
    sentinel = Sentinel()
    assessment = sentinel.evaluate(headers={"user-agent": "Mozilla/5.0 Chrome"})
    assert assessment.risk_level == "LOW_AUTOMATION_RISK"
    assert assessment.actor_claim.type == "UNKNOWN"

def test_sentinel_fail_open():
    sentinel = Sentinel()
    assessment = sentinel.evaluate(headers=None)
    assert assessment.decision.get("failOpen") is True

if __name__ == "__main__":
    test_ip_masking()
    test_target_type()
    test_provider_resolution()
    test_sentinel_evaluation_unknown_baseline()
    test_sentinel_fail_open()
    print("ALL PYTHON TESTS PASS (5/5)!")
