"""
Unit test for Python AMEVA-Sentinel GEO Payload Resolver.
"""

import pytest
from ameva_sentinel import (
    AI_BOT_PATTERNS,
    GeoBaselineOptions,
    GeoResolutionResult,
    measure_utf8_bytes,
    calculate_bandwidth_savings,
    match_route_baseline,
    match_bot_pattern,
    resolve_geo_payload,
)


def test_ai_bot_patterns_coverage():
    assert len(AI_BOT_PATTERNS) == 18
    gpt_match = match_bot_pattern("Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)")
    assert gpt_match is not None
    assert gpt_match.name == "GPTBot (OpenAI / ChatGPT)"
    assert gpt_match.vendor == "OpenAI"
    assert gpt_match.category == "AI_AGENT"

    non_bot = match_bot_pattern("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
    assert non_bot is None


def test_measure_utf8_bytes():
    text = "한국어 UTF-8 3바이트 문자열과 이모지 🚀✨"
    assert measure_utf8_bytes(text) == len(text.encode("utf-8"))
    assert measure_utf8_bytes("") == 0


def test_bandwidth_savings_defenses():
    # Zero baseline
    res0 = calculate_bandwidth_savings(1000, 0)
    assert res0["bytes_saved"] == 0
    assert res0["savings_ratio"] == 0.0
    assert not res0["is_bandwidth_saved"]

    # Negative baseline
    res_neg = calculate_bandwidth_savings(1000, -500)
    assert res_neg["bytes_saved"] == 0
    assert res_neg["savings_ratio"] == 0.0

    # Inverse payload (served > original)
    res_inv = calculate_bandwidth_savings(250000, 180000)
    assert res_inv["bytes_saved"] == 0
    assert res_inv["savings_ratio"] == 0.0

    # Normal savings
    res_norm = calculate_bandwidth_savings(10000, 210000)
    assert res_norm["bytes_saved"] == 200000
    assert res_norm["savings_ratio"] == 95.2
    assert res_norm["is_bandwidth_saved"]


def test_route_baseline_matching():
    options = GeoBaselineOptions(
        default_baseline_bytes=50000,
        route_baselines={
            "/": 210000,
            "/robots.txt": 500,
            "/lib/stt/": 95000,
        }
    )
    assert match_route_baseline("/robots.txt", options) == 500
    assert match_route_baseline("/lib/stt/engine", options) == 95000
    assert match_route_baseline("/about", options) == 210000
    assert match_route_baseline("/other", GeoBaselineOptions(default_baseline_bytes=30000)) == 30000


def test_resolve_geo_payload_e2e():
    options = GeoBaselineOptions(
        default_baseline_bytes=180000,
        route_baselines={
            "/lib/stt/": 95000
        }
    )
    result = resolve_geo_payload(
        user_agent="ClaudeBot/1.0 (+claudebot@anthropic.com)",
        pathname="/lib/stt/",
        options=options
    )
    assert result is not None
    assert isinstance(result, GeoResolutionResult)
    assert result.is_bot
    assert result.bot_vendor == "Anthropic"
    assert result.original_bytes == 95000
    assert result.bytes_served > 0
    assert result.bytes_saved > 0
    assert result.savings_ratio > 90.0
    assert result.is_bandwidth_saved
