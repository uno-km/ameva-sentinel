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
    EvaluationContext,
    BUDGET_SCOPES,
    LEGACY_DEFAULT_BUDGET_SCOPES,
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
from .core.local_store import LocalEmergencyBudgetStore, compute_emergency_capacity
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
from .trusted_proxy import (
    TrustedProxyPolicy,
    DEFAULT_TRUSTED_PROXY_POLICY,
    extract_client_ip,
    inspect_client_address,
    is_ip_in_cidr,
    is_ip_in_any_cidr,
)
from .providers import resolve_provider_adapter, EdgeClientInfo
from .observability import Sentinel, ActorClaim, Assessment
from .adapters.asgi import SentinelASGIMiddleware, SentinelASGIObserver
from .adapters.wsgi import SentinelWSGIMiddleware, SentinelWSGIObserver
from .adapters.fastapi import create_fastapi_cost_guard, create_fastapi_observer
from .adapters.enforcement import SentinelASGIEnforcer, SentinelWSGIEnforcer
from .adapters.dashboard import (
    get_sentinel_dashboard_html,
    mount_fastapi_dashboard,
    mount_flask_dashboard,
)

__all__ = [
    "__version__",
    "Sentinel",
    "ActorClaim",
    "Assessment",
    "TrustedProxyPolicy",
    "DEFAULT_TRUSTED_PROXY_POLICY",
    "extract_client_ip",
    "is_ip_in_cidr",
    "is_ip_in_any_cidr",
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
    "EvaluationContext",
    "BUDGET_SCOPES",
    "LEGACY_DEFAULT_BUDGET_SCOPES",
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
    "compute_emergency_capacity",
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
