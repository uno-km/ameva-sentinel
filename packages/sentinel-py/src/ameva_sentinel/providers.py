"""
Provider header resolution for Cloudflare, CloudFront, Fastly, AWS, and generic reverse proxies.
"""

from typing import Dict, Optional, Any
from dataclasses import dataclass


@dataclass
class EdgeClientInfo:
    client_ip: str
    asn: Optional[int] = None
    country: Optional[str] = None
    verified_bot_category: Optional[str] = None
    provider: str = "generic"


def resolve_provider_adapter(headers: Dict[str, str]) -> EdgeClientInfo:
    h = {k.lower(): v for k, v in headers.items()}

    # Cloudflare
    if "cf-connecting-ip" in h:
        asn = int(h["cf-connecting-asn"]) if "cf-connecting-asn" in h and h["cf-connecting-asn"].isdigit() else None
        return EdgeClientInfo(
            client_ip=h["cf-connecting-ip"],
            asn=asn,
            country=h.get("cf-ipcountry"),
            verified_bot_category=h.get("cf-verified-bot-category"),
            provider="cloudflare",
        )

    # CloudFront
    if "cloudfront-viewer-address" in h:
        addr = h["cloudfront-viewer-address"].split(":")[0]
        asn = int(h["cloudfront-viewer-asn"]) if "cloudfront-viewer-asn" in h and h["cloudfront-viewer-asn"].isdigit() else None
        return EdgeClientInfo(
            client_ip=addr,
            asn=asn,
            country=h.get("cloudfront-viewer-country"),
            provider="cloudfront",
        )

    # X-Forwarded-For fallback
    if "x-forwarded-for" in h:
        client_ip = h["x-forwarded-for"].split(",")[0].strip()
        return EdgeClientInfo(client_ip=client_ip, provider="generic")

    return EdgeClientInfo(client_ip="127.0.0.1", provider="local")
