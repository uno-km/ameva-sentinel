"""
Type definitions and Pydantic validation models for AMEVA-Sentinel Python SDK.
Strict validation preventing type coercion errors and enforcing schema parity.
"""

from typing import Literal, Optional, List, Dict, Any
from dataclasses import dataclass, field
from pydantic import BaseModel, ConfigDict, Field, StrictInt, StrictStr, StrictBool, model_validator

HttpMethod = Literal["GET", "POST", "PUT", "DELETE", "PATCH", "*"]
FailureMode = Literal["allow", "allow_with_emergency_cap", "deny"]
AuthRequirement = Literal["optional", "required", "admin_only"]
CostGuardAction = Literal["ALLOW", "OBSERVE", "RATE_LIMIT", "REQUIRE_AUTH", "DENY"]
CostGuardReasonCode = Literal[
    "WITHIN_BUDGET",
    "REQUEST_SHAPE_EXCEEDED",
    "COST_BUDGET_EXCEEDED",
    "LIMITER_UNAVAILABLE",
    "POLICY_NOT_FOUND",
    "POLICY_INVALID",
    "AUTH_REQUIRED",
]


class RouteCostPolicy(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    method: HttpMethod
    path: StrictStr = Field(..., min_length=1)
    cost: StrictInt = Field(..., gt=0)
    authentication: Optional[AuthRequirement] = None
    page_size_default: Optional[StrictInt] = Field(None, gt=0)
    page_size_max: Optional[StrictInt] = Field(None, gt=0)
    query_timeout_ms: Optional[StrictInt] = Field(None, ge=10, le=60000)
    lock_timeout_ms: Optional[StrictInt] = Field(None, ge=10, le=10000)
    max_data_points: Optional[StrictInt] = Field(None, gt=0)
    max_request_body_bytes: Optional[StrictInt] = Field(None, ge=1024, le=52428800)
    max_response_bytes: Optional[StrictInt] = Field(None, ge=1024, le=52428800)
    failure_mode: Optional[FailureMode] = None
    shadow_mode: Optional[StrictBool] = None

    @model_validator(mode="after")
    def validate_page_size_bounds(self) -> "RouteCostPolicy":
        if (
            self.page_size_default is not None
            and self.page_size_max is not None
            and self.page_size_default > self.page_size_max
        ):
            raise ValueError("page_size_default cannot exceed page_size_max")
        return self


class RateLimitTier(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    name: Optional[StrictStr] = None
    capacity: StrictInt = Field(..., gt=0)
    refill_tokens_per_minute: StrictInt = Field(..., gt=0)
    emergency_local_capacity: StrictInt = Field(..., gt=0)


class CostPolicyDefaults(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    cost: StrictInt = Field(..., gt=0)
    authentication: AuthRequirement = "optional"
    page_size_default: StrictInt = Field(25, gt=0)
    page_size_max: StrictInt = Field(50, gt=0)
    query_timeout_ms: StrictInt = Field(2000, ge=10, le=60000)
    lock_timeout_ms: StrictInt = Field(500, ge=10, le=10000)
    max_data_points: StrictInt = Field(5000, gt=0)
    max_request_body_bytes: StrictInt = Field(1048576, ge=1024, le=52428800)
    max_response_bytes: StrictInt = Field(1048576, ge=1024, le=52428800)
    failure_mode: FailureMode = "allow_with_emergency_cap"
    shadow_mode: StrictBool = True

    @model_validator(mode="after")
    def validate_page_size_bounds(self) -> "CostPolicyDefaults":
        if self.page_size_default > self.page_size_max:
            raise ValueError("defaults.page_size_default cannot exceed defaults.page_size_max")
        return self


class CostPolicyConfig(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    schema_version: Literal["1.0"] = "1.0"
    policy_version: StrictStr = Field(..., min_length=1)
    defaults: CostPolicyDefaults
    rate_limit_tiers: Dict[str, RateLimitTier] = Field(default_factory=dict)
    routes: List[RouteCostPolicy] = Field(default_factory=list)


@dataclass(frozen=True)
class PolicyIdentity:
    checksum_sha256: str
    display_checksum: str


@dataclass
class VerifiedPrincipal:
    authenticated: bool
    tenant_id: Optional[str] = None
    account_id: Optional[str] = None
    api_key_id: Optional[str] = None
    role: Optional[str] = None
    tier: Optional[str] = None
    authenticated_tier: Optional[str] = None
    risk_class: str = "anonymous_network"

    def __post_init__(self) -> None:
        if not self.authenticated:
            if any(
                val is not None
                for val in (self.tenant_id, self.account_id, self.api_key_id, self.role, self.tier, self.authenticated_tier)
            ):
                raise ValueError(
                    "Unauthenticated VerifiedPrincipal cannot contain identity fields "
                    "(tenant_id, account_id, api_key_id, role, tier/authenticated_tier must be None when authenticated=False)"
                )




@dataclass
class RequestCostContext:
    method: str
    path: str
    body_bytes: Optional[int] = None
    page_size: Optional[int] = None
    series_count: Optional[int] = None
    time_buckets: Optional[int] = None
    principal: Optional[VerifiedPrincipal] = None
    session_id: Optional[str] = None
    pseudonymous_key: Optional[str] = None
    asn: Optional[int] = None
    tenant_id: Optional[str] = None  # Unverified context identifier


@dataclass
class CostGuardBudgetInfo:
    requested_cost: int
    remaining_cost: int
    retry_after_seconds: int = 0


@dataclass
class CostGuardDecision:
    allowed: bool
    action: CostGuardAction
    proposed_action: CostGuardAction
    enforced_action: CostGuardAction
    violation_detected: bool
    reason_code: CostGuardReasonCode
    policy_version: str
    policy_checksum: str
    display_checksum: str
    cost: int
    budget: Optional[CostGuardBudgetInfo] = None
    degraded: bool = False
    enforced: bool = False
    message: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "allowed": self.allowed,
            "action": self.action,
            "proposedAction": self.proposed_action,
            "enforcedAction": self.enforced_action,
            "violationDetected": self.violation_detected,
            "reasonCode": self.reason_code,
            "policyVersion": self.policy_version,
            "policyChecksum": self.policy_checksum,
            "displayChecksum": self.display_checksum,
            "cost": self.cost,
            "budget": {
                "requestedCost": self.budget.requested_cost,
                "remainingCost": self.budget.remaining_cost,
                "retryAfterSeconds": self.budget.retry_after_seconds,
            } if self.budget else None,
            "degraded": self.degraded,
            "enforced": self.enforced,
            "message": self.message,
        }


BUDGET_SCOPES: tuple[str, ...] = (
    "global",
    "route",
    "tenant",
    "account",
    "authKey",
    "session",
    "network",
)

LEGACY_DEFAULT_BUDGET_SCOPES: tuple[str, ...] = (
    "route",
    "tenant",
    "account",
    "authKey",
    "session",
    "network",
)


@dataclass
class BudgetConsumeRequest:
    cost: int
    route_key: str
    global_key: Optional[str] = None
    tenant_id: Optional[str] = None
    account_id: Optional[str] = None
    api_key_id: Optional[str] = None
    session_id: Optional[str] = None
    network_key: Optional[str] = None
    tier: Optional[RateLimitTier] = None
    emergency_capacity: Optional[int] = None
    policy: Optional[RouteCostPolicy] = None


@dataclass
class BudgetConsumeResult:
    allowed: bool
    remaining_cost: int
    retry_after_seconds: int = 0
    degraded: bool = False


@dataclass
class RedactedThreatEvent:
    signature: str
    route_template: str
    asn: int = 0
    status_code: Optional[int] = None
    evidence_code: Optional[str] = None
    timestamp: float = 0.0


@dataclass
class ThreatAggregateRecord:
    window_start: str
    window_seconds: int
    signature: str
    route_template: str
    asn: int
    count: int
    samples: List[Dict[str, Any]] = field(default_factory=list)
