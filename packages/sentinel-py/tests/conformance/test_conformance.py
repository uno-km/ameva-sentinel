"""
Multi-Fixture Conformance Corpus test validating manifest.json in Python.
"""

import os
import json
import pytest
from ameva_sentinel.core.canonical import validate_cost_policy, compute_policy_checksum

# Locate fixtures/conformance robustly from repo root or package dir
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
POSSIBLE_PATHS = [
    os.path.abspath(os.path.join(CURRENT_DIR, "../../../../fixtures/conformance")),
    os.path.abspath(os.path.join(CURRENT_DIR, "../../../fixtures/conformance")),
    os.path.abspath(os.path.join(os.getcwd(), "fixtures/conformance")),
]

FIXTURES_DIR = None
for p in POSSIBLE_PATHS:
    if os.path.exists(os.path.join(p, "manifest.json")):
        FIXTURES_DIR = p
        break

MANIFEST_PATH = os.path.join(FIXTURES_DIR, "manifest.json") if FIXTURES_DIR else None


def test_conformance_corpus_against_manifest():
    if not FIXTURES_DIR or not os.path.exists(MANIFEST_PATH):
        pytest.fail("Conformance manifest file not found")

    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    for fixture in manifest["fixtures"]:
        fixture_file = os.path.join(FIXTURES_DIR, fixture["filename"])
        with open(fixture_file, "r", encoding="utf-8") as f:
            raw_data = json.load(f)

        if fixture["expected_valid"]:
            policy = validate_cost_policy(raw_data)
            identity = compute_policy_checksum(policy)
            assert identity.checksum_sha256 == fixture["checksum_sha256"], (
                f"Checksum mismatch for fixture {fixture['filename']}: "
                f"expected {fixture['checksum_sha256']}, got {identity.checksum_sha256}"
            )
        else:
            with pytest.raises(Exception):
                validate_cost_policy(raw_data)


def test_cross_runtime_hardening_invariants():
    from ameva_sentinel import (
        BUDGET_SCOPES,
        LEGACY_DEFAULT_BUDGET_SCOPES,
        compute_emergency_capacity,
        extract_client_ip,
        is_ip_in_cidr,
    )
    from ameva_sentinel.core.guards import RequestShapeGuard

    # 1. Scope SSOT
    assert BUDGET_SCOPES == ("global", "route", "tenant", "account", "authKey", "session", "network")
    assert LEGACY_DEFAULT_BUDGET_SCOPES == ("route", "tenant", "account", "authKey", "session", "network")

    # 2. Emergency capacity
    assert compute_emergency_capacity(100, 0.5, 10) == 5
    assert compute_emergency_capacity(0, 0.5, 10) == 0
    assert compute_emergency_capacity(10, 0.5, 20) == 1

    # 3. Path ambiguity rejection
    assert RequestShapeGuard.validate_path("/api/v1/chart").valid is True
    assert RequestShapeGuard.validate_path("/api/v1/../secret").valid is False
    assert RequestShapeGuard.validate_path("/api/v1/%00/secret").valid is False

    # 4. Trusted proxy extraction
    assert is_ip_in_cidr("10.0.5.1", "10.0.0.0/8") is True
    assert extract_client_ip(socket_remote_address="203.0.113.5", headers={"x-forwarded-for": "8.8.8.8"}) == "203.0.113.5"
    assert extract_client_ip(socket_remote_address="10.0.0.1", headers={"x-forwarded-for": "203.0.113.195"}) == "203.0.113.195"

