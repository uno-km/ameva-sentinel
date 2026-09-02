"""
Observability and Actor Assessment telemetry structures.
Pure data models decoupled from underlying database/storage.
"""

from typing import Optional, Dict, Any
from dataclasses import dataclass
from .privacy import mask_ip_address, normalize_target_type
from .providers import resolve_provider_adapter


@dataclass
class ActorClaim:
    user_agent: str
    ip_address: Optional[str] = None
    target_type: str = "standard"
    headers: Optional[Dict[str, str]] = None


@dataclass
class Assessment:
    action: str
    bot_category: str
    confidence: float
    masked_ip: str
    target_type: str
    asn: Optional[int] = None
    provider: str = "generic"


class Sentinel:
    @staticmethod
    def evaluate_request(claim: ActorClaim) -> Assessment:
        headers = claim.headers or {}
        edge_info = resolve_provider_adapter(headers)
        masked_ip = mask_ip_address(claim.ip_address or edge_info.client_ip)
        target = normalize_target_type(claim.target_type)

        ua = claim.user_agent.lower()
        if "googlebot" in ua or "bingbot" in ua:
            return Assessment(
                action="ALLOW",
                bot_category="SEARCH_ENGINE",
                confidence=0.99,
                masked_ip=masked_ip,
                target_type=target,
                asn=edge_info.asn,
                provider=edge_info.provider,
            )
        elif "python-requests" in ua or "curl" in ua or "scrapy" in ua:
            return Assessment(
                action="OBSERVE",
                bot_category="AUTOMATED_TOOL",
                confidence=0.85,
                masked_ip=masked_ip,
                target_type=target,
                asn=edge_info.asn,
                provider=edge_info.provider,
            )
        else:
            return Assessment(
                action="ALLOW",
                bot_category="NONE",
                confidence=0.10,
                masked_ip=masked_ip,
                target_type=target,
                asn=edge_info.asn,
                provider=edge_info.provider,
            )

    @staticmethod
    def create_degraded_assessment(error: Any, claim: Optional[ActorClaim] = None) -> Assessment:
        """Official fail-open assessment on unhandled evaluation errors."""
        err_msg = str(error) if error else "Internal evaluation failure"
        masked_ip = mask_ip_address(claim.ip_address) if claim and claim.ip_address else "0.0.0.0"
        return Assessment(
            action="DEGRADED_ALLOW",
            bot_category="DEGRADED_SYSTEM_ERROR",
            confidence=0.0,
            masked_ip=masked_ip,
            target_type=claim.target_type if claim else "standard",
            provider="fail_open"
        )


def create_degraded_assessment(error: Any, claim: Optional[ActorClaim] = None) -> Assessment:
    return Sentinel.create_degraded_assessment(error, claim)
