"""
AMEVA-Sentinel Python SDK.
Privacy-first Automation Risk Observation & Multi-Axis Cost Guardrails.
"""

__version__ = "2.2.0"

from .core.budget_types import (
    RouteCostPolicy,
    RateLimitTier,
    CostPolicyDefaults,
    CostPolicyConfig,
    PolicyIdentity,
    VerifiedPrincipal,
    RequestCostContext,
    CostGuardDecision,
    CostGuardBudgetInfo,
    BudgetConsumeRequest,
    BudgetConsumeResult,
    RedactedThreatEvent,
    ThreatAggregateRecord,
)
from .core.canonical import (
    canonicalize_policy_json,
    compute_policy_checksum,
    hash_key_identifier,
    validate_cost_policy,
    SAFE_FALLBACK_COST_POLICY,
)
from .core.policy_registry import CostPolicyRegistry
from .core.guards import RequestShapeGuard, ResponseBudgetGuard, GuardValidationResult
from .core.local_store import LocalEmergencyBudgetStore
from .core.redaction import sanitize_threat_event, ALLOWED_EVIDENCE_CODES
from .core.aggregator import BoundedThreatAggregator
from .core.evaluator import SentinelCostGuardEvaluator
from .core.protocols import AsyncBudgetStore, SyncBudgetStore, ThreatAggregateStore
from .core.geo_registry import (
    GeoCountryInfo,
    RegionViewport,
    REGION_VIEWPORTS,
    ISO_COUNTRIES,
    resolve_country,
    resolve_geo_coordinates,
)

from .privacy import mask_ip_address, normalize_target_type
from .providers import resolve_provider_adapter, EdgeClientInfo
from .observability import Sentinel, ActorClaim, Assessment
from .adapters.dashboard import (
    get_sentinel_dashboard_html,
    mount_fastapi_dashboard,
    mount_flask_dashboard,
)

__version__ = "2.2.0a1"

__all__ = [
    "__version__",
    "Sentinel",
    "ActorClaim",
    "Assessment",
    "RouteCostPolicy",
    "RateLimitTier",
    "CostPolicyDefaults",
    "CostPolicyConfig",
    "PolicyIdentity",
    "VerifiedPrincipal",
    "RequestCostContext",
    "CostGuardDecision",
    "CostGuardBudgetInfo",
    "BudgetConsumeRequest",
    "BudgetConsumeResult",
    "RedactedThreatEvent",
    "ThreatAggregateRecord",
    "canonicalize_policy_json",
    "compute_policy_checksum",
    "hash_key_identifier",
    "validate_cost_policy",
    "SAFE_FALLBACK_COST_POLICY",
    "CostPolicyRegistry",
    "RequestShapeGuard",
    "ResponseBudgetGuard",
    "GuardValidationResult",
    "LocalEmergencyBudgetStore",
    "sanitize_threat_event",
    "ALLOWED_EVIDENCE_CODES",
    "BoundedThreatAggregator",
    "SentinelCostGuardEvaluator",
    "AsyncBudgetStore",
    "SyncBudgetStore",
    "ThreatAggregateStore",
    "GeoCountryInfo",
    "RegionViewport",
    "REGION_VIEWPORTS",
    "ISO_COUNTRIES",
    "resolve_country",
    "resolve_geo_coordinates",
    "mask_ip_address",
    "normalize_target_type",
    "resolve_provider_adapter",
    "EdgeClientInfo",
    "get_sentinel_dashboard_html",
    "mount_fastapi_dashboard",
    "mount_flask_dashboard",
]
