"""
AMEVA-Sentinel Python Core GEO & AI Crawler Payload Resolver.
Accurate Bandwidth Calculation and Crawler Recognition.
"""

from dataclasses import dataclass, field
import re
from typing import Any, Callable, Dict, List, Optional


@dataclass(frozen=True)
class GeoBotPattern:
    pattern: re.Pattern
    name: str
    vendor: str
    category: str  # 'AI_AGENT' | 'SEARCH_ENGINE' | 'SOCIAL_BOT' | 'UNKNOWN'


AI_BOT_PATTERNS: List[GeoBotPattern] = [
    GeoBotPattern(pattern=re.compile(r"gptbot|chatgpt-user|oai-searchbot", re.I), name="GPTBot (OpenAI / ChatGPT)", vendor="OpenAI", category="AI_AGENT"),
    GeoBotPattern(pattern=re.compile(r"claudebot|claude-web|anthropic", re.I), name="ClaudeBot (Anthropic)", vendor="Anthropic", category="AI_AGENT"),
    GeoBotPattern(pattern=re.compile(r"perplexitybot|perplexity", re.I), name="PerplexityBot (Perplexity AI)", vendor="Perplexity", category="AI_AGENT"),
    GeoBotPattern(pattern=re.compile(r"deepseekbot|deepseek", re.I), name="DeepSeekBot (DeepSeek AI)", vendor="DeepSeek", category="AI_AGENT"),
    GeoBotPattern(pattern=re.compile(r"google-extended|googleother", re.I), name="Google-Extended (Gemini Training)", vendor="Google", category="AI_AGENT"),
    GeoBotPattern(pattern=re.compile(r"googlebot", re.I), name="Googlebot (Google Search)", vendor="Google", category="SEARCH_ENGINE"),
    GeoBotPattern(pattern=re.compile(r"bytespider", re.I), name="Bytespider (ByteDance / TikTok AI)", vendor="ByteDance", category="AI_AGENT"),
    GeoBotPattern(pattern=re.compile(r"cohere-ai", re.I), name="Cohere-AI (Cohere RAG)", vendor="Cohere", category="AI_AGENT"),
    GeoBotPattern(pattern=re.compile(r"applebot-extended", re.I), name="Applebot-Extended (Apple Intelligence)", vendor="Apple", category="AI_AGENT"),
    GeoBotPattern(pattern=re.compile(r"applebot", re.I), name="Applebot (Apple Search)", vendor="Apple", category="SEARCH_ENGINE"),
    GeoBotPattern(pattern=re.compile(r"ccbot", re.I), name="CCBot (Common Crawl / LLM Datasets)", vendor="CommonCrawl", category="AI_AGENT"),
    GeoBotPattern(pattern=re.compile(r"diffbot", re.I), name="Diffbot (Knowledge Graph AI)", vendor="Diffbot", category="AI_AGENT"),
    GeoBotPattern(pattern=re.compile(r"amazonbot", re.I), name="Amazonbot (Amazon AI / Bedrock)", vendor="Amazon", category="AI_AGENT"),
    GeoBotPattern(pattern=re.compile(r"bingbot", re.I), name="Bingbot (Microsoft Bing)", vendor="Microsoft", category="SEARCH_ENGINE"),
    GeoBotPattern(pattern=re.compile(r"yandexbot", re.I), name="YandexBot (Yandex Search)", vendor="Yandex", category="SEARCH_ENGINE"),
    GeoBotPattern(pattern=re.compile(r"duckduckbot", re.I), name="DuckDuckBot", vendor="DuckDuckGo", category="SEARCH_ENGINE"),
    GeoBotPattern(pattern=re.compile(r"facebookexternalhit|facebookcatalog|meta-externalagent", re.I), name="Meta/Facebook Scraper", vendor="Meta", category="SOCIAL_BOT"),
    GeoBotPattern(pattern=re.compile(r"twitterbot", re.I), name="Twitter/X Bot", vendor="Twitter", category="SOCIAL_BOT")
]


@dataclass
class GeoBaselineOptions:
    default_baseline_bytes: int = 0
    route_baselines: Dict[str, int] = field(default_factory=dict)
    payload_resolver: Optional[Callable[[str, Optional[GeoBotPattern]], str]] = None


@dataclass
class GeoResolutionResult:
    payload: str
    bot_name: str
    bot_vendor: str
    bot_category: str
    bytes_served: int
    original_bytes: int
    bytes_saved: int
    savings_ratio: float
    is_bandwidth_saved: bool
    is_bot: bool = True


def measure_utf8_bytes(content: str) -> int:
    if not content:
        return 0
    return len(content.encode("utf-8"))


def calculate_bandwidth_savings(bytes_served: int, original_bytes: int) -> Dict[str, Any]:
    if not isinstance(original_bytes, (int, float)) or original_bytes <= 0:
        return {"bytes_saved": 0, "savings_ratio": 0.0, "is_bandwidth_saved": False}
    
    safe_served = max(0, bytes_served) if isinstance(bytes_served, (int, float)) else 0
    bytes_saved = max(0, int(original_bytes - safe_served))
    if bytes_saved <= 0:
        return {"bytes_saved": 0, "savings_ratio": 0.0, "is_bandwidth_saved": False}
    
    raw_ratio = (bytes_saved / original_bytes) * 100.0
    savings_ratio = round(min(100.0, max(0.0, raw_ratio)), 1)
    return {
        "bytes_saved": bytes_saved,
        "savings_ratio": savings_ratio,
        "is_bandwidth_saved": bytes_saved > 0
    }


def match_route_baseline(pathname: str, options: Optional[GeoBaselineOptions] = None) -> int:
    if not options:
        return 0
    default_bytes = max(0, int(options.default_baseline_bytes or 0))
    route_baselines = options.route_baselines or {}
    if not route_baselines:
        return default_bytes
    
    clean_path = (pathname or "/").strip()
    if clean_path in route_baselines:
        return max(0, int(route_baselines[clean_path]))
    
    longest_match = ""
    matched_bytes = default_bytes
    for route, val in route_baselines.items():
        if route != "/" and clean_path.startswith(route):
            if len(route) > len(longest_match):
                longest_match = route
                matched_bytes = max(0, int(val))
                
    if longest_match:
        return matched_bytes
        
    if "/" in route_baselines:
        return max(0, int(route_baselines["/"]))
        
    return default_bytes


def default_markdown_payload(path: str, bot: Optional[GeoBotPattern] = None) -> str:
    bot_label = bot.name if bot else "AI Crawler"
    return (
        "---\n"
        f"# AMEVA High-Efficiency GEO Markdown Delivery\n"
        f"- Target Bot: {bot_label}\n"
        f"- Path: {path or '/'}\n"
        f"- Delivered By: @ameva/sentinel Core GEO Engine\n"
        "---\n\n"
        "## System Observability & AI Ingestion Endpoint\n"
        "Optimized Markdown content streamed for LLM ingestion and edge bandwidth efficiency."
    )


def match_bot_pattern(user_agent: str) -> Optional[GeoBotPattern]:
    if not user_agent or not isinstance(user_agent, str):
        return None
    for bot in AI_BOT_PATTERNS:
        if bot.pattern.search(user_agent):
            return bot
    return None


def resolve_geo_payload(
    user_agent: str,
    pathname: str = "/",
    options: Optional[GeoBaselineOptions] = None
) -> Optional[GeoResolutionResult]:
    matched_bot = match_bot_pattern(user_agent)
    if not matched_bot:
        return None
        
    resolver = (options.payload_resolver if options and options.payload_resolver else default_markdown_payload)
    payload = resolver(pathname, matched_bot)
    bytes_served = measure_utf8_bytes(payload)
    original_bytes = match_route_baseline(pathname, options)
    savings = calculate_bandwidth_savings(bytes_served, original_bytes)
    
    return GeoResolutionResult(
        payload=payload,
        bot_name=matched_bot.name,
        bot_vendor=matched_bot.vendor,
        bot_category=matched_bot.category,
        bytes_served=bytes_served,
        original_bytes=original_bytes,
        bytes_saved=savings["bytes_saved"],
        savings_ratio=savings["savings_ratio"],
        is_bandwidth_saved=savings["is_bandwidth_saved"],
        is_bot=True
    )
