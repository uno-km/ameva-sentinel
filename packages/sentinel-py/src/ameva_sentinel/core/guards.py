"""
Pre-Execution Request Shape and Post-Execution Response Budget Guards for Python SDK.
"""

from typing import Optional, Dict, Any
from dataclasses import dataclass
from .budget_types import RouteCostPolicy


@dataclass
class GuardValidationResult:
    valid: bool
    reason_code: Optional[str] = None
    message: Optional[str] = None
    limits: Optional[Dict[str, Any]] = None


class RequestShapeGuard:
    @staticmethod
    def validate_page_size(page_size: Optional[int], policy: RouteCostPolicy) -> GuardValidationResult:
        default_size = policy.page_size_default or 25
        max_size = policy.page_size_max or 50

        if page_size is None or page_size <= 0:
            return GuardValidationResult(valid=True, limits={"max_page_size": max_size, "default_page_size": default_size})

        if page_size > max_size:
            return GuardValidationResult(
                valid=False,
                reason_code="PAGE_SIZE_EXCEEDED",
                message=f"Requested page size '{page_size}' exceeds the allowed limit of {max_size}.",
                limits={"max_page_size": max_size, "default_page_size": default_size},
            )

        return GuardValidationResult(valid=True, limits={"max_page_size": max_size, "default_page_size": default_size})

    @staticmethod
    def validate_data_point_budget(
        series_count: Optional[int],
        time_buckets: Optional[int],
        policy: RouteCostPolicy,
        custom_max: Optional[int] = None,
    ) -> GuardValidationResult:
        max_points = custom_max or policy.max_data_points or 10000
        series = max(1, series_count or 1)
        buckets = max(1, time_buckets or 1)
        estimated_points = series * buckets

        if estimated_points > max_points:
            return GuardValidationResult(
                valid=False,
                reason_code="QUERY_BUDGET_EXCEEDED",
                message=f"Estimated data points ({estimated_points:,}) exceed the calculation budget of {max_points:,}.",
                limits={"estimated_data_points": estimated_points, "max_data_points": max_points},
            )

        return GuardValidationResult(
            valid=True,
            limits={"estimated_data_points": estimated_points, "max_data_points": max_points},
        )

    @staticmethod
    def validate_body_size(body_bytes: int, max_bytes: int = 1048576) -> GuardValidationResult:
        if body_bytes < 0 or body_bytes > max_bytes:
            return GuardValidationResult(
                valid=False,
                reason_code="REQUEST_BODY_TOO_LARGE",
                message=f"Request payload ({body_bytes:,} bytes) exceeds the allowed size of {max_bytes:,} bytes.",
                limits={"max_body_bytes": max_bytes},
            )
        return GuardValidationResult(valid=True, limits={"max_body_bytes": max_bytes})


class ResponseBudgetGuard:
    @staticmethod
    def validate_row_count(row_count: int, max_rows: int = 1000) -> GuardValidationResult:
        if row_count > max_rows:
            return GuardValidationResult(
                valid=False,
                reason_code="RESPONSE_ROW_BUDGET_EXCEEDED",
                message=f"Query returned {row_count:,} rows, exceeding the safe response budget of {max_rows:,} rows.",
                limits={"max_rows": max_rows},
            )
        return GuardValidationResult(valid=True, limits={"max_rows": max_rows})

    @staticmethod
    def validate_response_size(response_bytes: int, max_bytes: int = 5242880) -> GuardValidationResult:
        if response_bytes > max_bytes:
            return GuardValidationResult(
                valid=False,
                reason_code="RESPONSE_SIZE_BUDGET_EXCEEDED",
                message=f"Generated response payload ({response_bytes:,} bytes) exceeds the allowed response size of {max_bytes:,} bytes.",
                limits={"max_response_bytes": max_bytes},
            )
        return GuardValidationResult(valid=True, limits={"max_response_bytes": max_bytes})
