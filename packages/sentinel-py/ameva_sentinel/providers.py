import json
from typing import Dict, Any, Optional
from .privacy import mask_ip_address

class EdgeClientInfo:
    def __init__(
        self,
        provider: str = "GENERIC",
        request_id: Optional[str] = None,
        masked_ip: Optional[str] = None,
        country: str = "GLOBAL",
        city: str = "Edge",
        asn: str = "Standard",
        cdn_bot_score: Optional[int] = None,
        is_cdn_verified_bot: Optional[bool] = None,
        ja3_hash: Optional[str] = None,
        ja4_hash: Optional[str] = None,
        capabilities: Optional[Dict[str, bool]] = None
    ):
        self.provider = provider
        self.request_id = request_id
        self.masked_ip = masked_ip or "0.0.***.***"
        self.country = country
        self.city = city
        self.asn = asn
        self.cdn_bot_score = cdn_bot_score
        self.is_cdn_verified_bot = is_cdn_verified_bot
        self.ja3_hash = ja3_hash
        self.ja4_hash = ja4_hash
        self.capabilities = capabilities or {}

def resolve_provider_adapter(headers: Dict[str, str]) -> "BaseEdgeProvider":
    norm = {k.lower(): str(v) for k, v in headers.items()}
    if "cf-ray" in norm or "cf-connecting-ip" in norm:
        return CloudflareEdgeProvider()
    if "x-vercel-id" in norm or "x-vercel-ip-country" in norm:
        return VercelEdgeProvider()
    if "fastly-client-ip" in norm or "fastly-ff" in norm:
        return FastlyEdgeProvider()
    return GenericEdgeProvider()

class BaseEdgeProvider:
    name = "GENERIC"
    def extract_client_info(self, headers: Dict[str, str]) -> EdgeClientInfo:
        norm = {k.lower(): str(v) for k, v in headers.items()}
        raw_ip = norm.get("x-forwarded-for", "").split(",")[0].strip() or norm.get("remote-addr")
        return EdgeClientInfo(
            provider="GENERIC",
            masked_ip=mask_ip_address(raw_ip),
            capabilities={"botScore": False, "verifiedBot": False, "ja3": False, "ja4": False}
        )

class CloudflareEdgeProvider(BaseEdgeProvider):
    name = "CLOUDFLARE"
    def extract_client_info(self, headers: Dict[str, str]) -> EdgeClientInfo:
        norm = {k.lower(): str(v) for k, v in headers.items()}
        raw_ip = norm.get("cf-connecting-ip") or norm.get("x-forwarded-for", "").split(",")[0].strip()
        bot_mgmt = norm.get("cf-bot-management")
        cdn_bot_score = None
        is_verified = None
        ja3 = norm.get("cf-ja3-hash")
        ja4 = norm.get("cf-ja4")

        if bot_mgmt:
            try:
                bm = json.loads(bot_mgmt)
                if isinstance(bm.get("score"), (int, float)):
                    cdn_bot_score = int(bm["score"])
                if isinstance(bm.get("verified_bot"), bool):
                    is_verified = bm["verified_bot"]
                if not ja3 and bm.get("ja3Hash"):
                    ja3 = bm["ja3Hash"]
                if not ja4 and bm.get("ja4"):
                    ja4 = bm["ja4"]
            except Exception:
                pass

        return EdgeClientInfo(
            provider="CLOUDFLARE",
            request_id=norm.get("cf-ray"),
            masked_ip=mask_ip_address(raw_ip),
            country=norm.get("cf-ipcountry", "GLOBAL").upper(),
            city=norm.get("cf-ipcity", "Edge"),
            asn=norm.get("cf-asn", "AS_CLOUDFLARE"),
            cdn_bot_score=cdn_bot_score,
            is_cdn_verified_bot=is_verified,
            ja3_hash=ja3,
            ja4_hash=ja4,
            capabilities={"botScore": True, "verifiedBot": True, "ja3": True, "ja4": True}
        )

class VercelEdgeProvider(BaseEdgeProvider):
    name = "VERCEL"
    def extract_client_info(self, headers: Dict[str, str]) -> EdgeClientInfo:
        norm = {k.lower(): str(v) for k, v in headers.items()}
        raw_ip = norm.get("x-real-ip") or norm.get("x-forwarded-for", "").split(",")[0].strip()
        return EdgeClientInfo(
            provider="VERCEL",
            request_id=norm.get("x-vercel-id"),
            masked_ip=mask_ip_address(raw_ip),
            country=norm.get("x-vercel-ip-country", "GLOBAL").upper(),
            city=norm.get("x-vercel-ip-city", "Edge"),
            asn=norm.get("x-vercel-ip-as-number", "AS_VERCEL"),
            capabilities={"botScore": False, "verifiedBot": False, "ja3": False, "ja4": False}
        )

class FastlyEdgeProvider(BaseEdgeProvider):
    name = "FASTLY"
    def extract_client_info(self, headers: Dict[str, str]) -> EdgeClientInfo:
        norm = {k.lower(): str(v) for k, v in headers.items()}
        raw_ip = norm.get("fastly-client-ip") or norm.get("x-forwarded-for", "").split(",")[0].strip()
        return EdgeClientInfo(
            provider="FASTLY",
            request_id=norm.get("x-fastly-request-id"),
            masked_ip=mask_ip_address(raw_ip),
            country=norm.get("fastly-client-country-code", "GLOBAL").upper(),
            capabilities={"botScore": True, "verifiedBot": True, "ja3": False, "ja4": False}
        )

class GenericEdgeProvider(BaseEdgeProvider):
    pass
