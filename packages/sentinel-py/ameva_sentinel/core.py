from typing import Dict, Any, Optional, List
from .providers import resolve_provider_adapter, EdgeClientInfo

class ActorClaim:
    def __init__(
        self,
        claim_type: str = "UNKNOWN",
        name: Optional[str] = None,
        state: str = "NONE",
        verification: str = "NOT_APPLICABLE",
        verification_evidence: Optional[List[Dict[str, Any]]] = None,
        trust_boundary: Optional[Dict[str, Any]] = None,
        basis: Optional[List[str]] = None
    ):
        self.type = claim_type
        self.name = name
        self.state = state
        self.verification = verification
        self.verification_evidence = verification_evidence or []
        self.trust_boundary = trust_boundary or {}
        self.basis = basis or []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.type,
            "name": self.name,
            "state": self.state,
            "verification": self.verification,
            "verificationEvidence": self.verification_evidence,
            "trustBoundary": self.trust_boundary,
            "basis": self.basis
        }

class Assessment:
    def __init__(
        self,
        schema_version: str = "2.0",
        risk_level: str = "LOW_AUTOMATION_RISK",
        actor_claim: Optional[ActorClaim] = None,
        decision: Optional[Dict[str, Any]] = None,
        edge_provider: str = "GENERIC",
        edge_telemetry: Optional[Dict[str, Any]] = None,
        legacy: Optional[Dict[str, Any]] = None
    ):
        self.schema_version = schema_version
        self.risk_level = risk_level
        self.actor_claim = actor_claim or ActorClaim()
        self.decision = decision or {"mode": "SHADOW", "enforcedAction": "ALLOW"}
        self.edge_provider = edge_provider
        self.edge_telemetry = edge_telemetry or {}
        self.legacy = legacy or {"triageCategory": "HUMAN", "deprecated": True}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "schemaVersion": self.schema_version,
            "riskLevel": self.risk_level,
            "actorClaim": self.actor_claim.to_dict(),
            "decision": self.decision,
            "edgeProvider": self.edge_provider,
            "edgeTelemetry": self.edge_telemetry,
            "legacy": self.legacy
        }

class Sentinel:
    def __init__(self, mode: str = "shadow"):
        self.mode = mode

    def evaluate(
        self,
        headers: Optional[Dict[str, str]] = None,
        signals: Optional[Dict[str, Any]] = None,
        direct_origin_blocked: bool = False,
        edge_authenticated: bool = False
    ) -> Assessment:
        if headers is None:
            # 3-Tier Fail-Open Guarantee
            return Assessment(
                schema_version="2.0",
                risk_level="LOW_AUTOMATION_RISK",
                decision={"mode": "SHADOW", "enforcedAction": "ALLOW", "failOpen": True},
                legacy={"status": "degraded"}
            )
        try:
            adapter = resolve_provider_adapter(headers)
            client_info = adapter.extract_client_info(headers)
            
            ua = headers.get("user-agent", "").lower()
            is_known_bot = any(b in ua for b in ["gptbot", "claudebot", "googlebot", "bingbot", "yandexbot"])
            
            actor_claim = ActorClaim(
                claim_type="AI_OPERATOR" if is_known_bot else "UNKNOWN",
                name="KnownBot" if is_known_bot else None,
                state="CLAIMED" if is_known_bot else "NONE",
                verification="UNVERIFIED" if is_known_bot else "NOT_APPLICABLE",
                basis=["USER_AGENT_MATCH"] if is_known_bot else []
            )

            if client_info.is_cdn_verified_bot and actor_claim.state == "CLAIMED":
                trust_valid = direct_origin_blocked and edge_authenticated
                actor_claim.verification = "VERIFIED" if trust_valid else "UNVERIFIED"
                actor_claim.trust_boundary = {
                    "provider": client_info.provider,
                    "edgeAuthenticated": edge_authenticated,
                    "directOriginBlocked": "ENFORCED" if direct_origin_blocked else "UNVERIFIED_NETWORK_BOUNDARY"
                }
                actor_claim.verification_evidence = [{
                    "method": "PROVIDER_VERIFIED_BOT_SIGNAL",
                    "provider": client_info.provider,
                    "trustBoundaryValidated": trust_valid
                }]

            risk_level = "LOW_AUTOMATION_RISK"
            if is_known_bot:
                risk_level = "ELEVATED_AUTOMATION_RISK"
            if signals and signals.get("is_webdriver"):
                risk_level = "HIGH_AUTOMATION_RISK"

            return Assessment(
                schema_version="2.0",
                risk_level=risk_level,
                actor_claim=actor_claim,
                decision={"mode": self.mode.upper(), "enforcedAction": "ALLOW"},
                edge_provider=client_info.provider,
                edge_telemetry={
                    "maskedIp": client_info.masked_ip,
                    "country": client_info.country,
                    "cdnBotScore": client_info.cdn_bot_score,
                    "isCdnVerifiedBot": client_info.is_cdn_verified_bot
                }
            )
        except Exception:
            return Assessment(
                schema_version="2.0",
                risk_level="LOW_AUTOMATION_RISK",
                decision={"mode": "SHADOW", "enforcedAction": "ALLOW", "failOpen": True},
                legacy={"status": "degraded"}
            )
