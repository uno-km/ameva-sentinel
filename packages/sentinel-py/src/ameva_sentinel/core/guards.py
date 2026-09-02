"""
Strict request shape and path ambiguity validation guards for Python SDK.
"""

import re
from dataclasses import dataclass
from typing import Optional, Union
from .budget_types import RouteCostPolicy


@dataclass(frozen=True)
class ValidationResult:
    valid: bool
    message: str = ""
    reason_code: Optional[str] = None


GuardValidationResult = ValidationResult


class RequestShapeGuard:
    @staticmethod
    def inspect_path(raw_path: Optional[str]) -> "RequestInspection":
        from .budget_types import RequestFinding, RequestInspection

        findings = []
        if not isinstance(raw_path, str) or len(raw_path) == 0 or len(raw_path) > 2048:
            findings.append(
                RequestFinding(
                    code="PATH_LENGTH_INVALID",
                    severity="high",
                    message="Path length is empty or exceeds 2048 characters.",
                )
            )
            return RequestInspection(
                accepted_by_inspector=False,
                findings=findings,
                normalized_values={"raw_path": raw_path or ""},
            )

        if not raw_path.startswith("/"):
            findings.append(
                RequestFinding(
                    code="PATH_MUST_START_WITH_SLASH",
                    severity="medium",
                    message="Path must start with a forward slash.",
                )
            )

        # ASCII control characters (0x00-0x1F, 0x7F)
        if re.search(r"[\x00-\x1f\x7f]", raw_path):
            findings.append(
                RequestFinding(
                    code="ASCII_CONTROL_CHAR_IN_PATH",
                    severity="critical",
                    message="Path contains ASCII control characters.",
                )
            )

        # Malformed percent encoding
        if re.search(r"%(?![0-9a-fA-F]{2})", raw_path):
            findings.append(
                RequestFinding(
                    code="MALFORMED_PERCENT_ENCODING",
                    severity="high",
                    message="Path contains invalid percent encoding sequence.",
                )
            )

        # Double percent encodings
        if re.search(r"%25(?:2e|2f|5c|25)", raw_path, re.IGNORECASE):
            findings.append(
                RequestFinding(
                    code="DOUBLE_ENCODING_IN_PATH",
                    severity="high",
                    message="Path contains double percent encoding.",
                )
            )

        # Dot segments (. or ..)
        if re.search(r"(^|/)\.\.?(?:/|$)", raw_path):
            findings.append(
                RequestFinding(
                    code="DOT_SEGMENT_IN_PATH",
                    severity="high",
                    message="Path contains dot directory traversal segments.",
                )
            )

        # Repeated slashes (//+)
        if re.search(r"/{2,}", raw_path):
            findings.append(
                RequestFinding(
                    code="REPEATED_SLASHES_IN_PATH",
                    severity="low",
                    message="Path contains repeated consecutive slashes.",
                )
            )

        # Semicolon matrix parameter ambiguity
        if re.search(r"(^|/)[^/?#]*;", raw_path):
            findings.append(
                RequestFinding(
                    code="SEMICOLON_IN_PATH",
                    severity="medium",
                    message="Path contains matrix parameter semicolon separator.",
                )
            )

        # Backslash or encoded backslash
        if "\\" in raw_path or "%5c" in raw_path.lower():
            findings.append(
                RequestFinding(
                    code="BACKSLASH_IN_PATH",
                    severity="high",
                    message="Path contains backslash or encoded backslash.",
                )
            )

        # Null byte or encoded null byte
        if "%00" in raw_path.lower() or "\\0" in raw_path:
            findings.append(
                RequestFinding(
                    code="NULL_BYTE_IN_PATH",
                    severity="critical",
                    message="Path contains NUL byte.",
                )
            )

        # Encoded dot segments
        if re.search(r"%2e%2e|%2e\.|\.%2e", raw_path, re.IGNORECASE):
            findings.append(
                RequestFinding(
                    code="ENCODED_DOT_SEGMENT_IN_PATH",
                    severity="high",
                    message="Path contains encoded dot segment traversal.",
                )
            )

        # Encoded forward slash (%2f)
        if "%2f" in raw_path.lower():
            findings.append(
                RequestFinding(
                    code="ENCODED_SLASH_IN_PATH",
                    severity="high",
                    message="Path contains encoded forward slash sequence (%2F).",
                )
            )


        return RequestInspection(
            accepted_by_inspector=len(findings) == 0,
            findings=findings,
            normalized_values={"raw_path": raw_path},
        )

    @staticmethod
    def validate_path(raw_path: str) -> ValidationResult:
        inspection = RequestShapeGuard.inspect_path(raw_path)
        if not inspection.accepted_by_inspector:
            first = inspection.findings[0]
            return ValidationResult(valid=False, message=first.code, reason_code=first.code)
        return ValidationResult(valid=True)

    @staticmethod
    def validate_method(method: str) -> ValidationResult:
        standard_methods = {"GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"}
        if not isinstance(method, str) or method.upper() not in standard_methods:
            return ValidationResult(valid=False, message=f"INVALID_HTTP_METHOD: {method}")
        return ValidationResult(valid=True)

    @staticmethod
    def validate_page_size(page_size: Optional[int], policy_or_max: Union[int, RouteCostPolicy]) -> ValidationResult:
        if page_size is None:
            return ValidationResult(valid=True)
        max_allowed = policy_or_max if isinstance(policy_or_max, int) else (policy_or_max.page_size_max or 1000)
        if not isinstance(page_size, int) or page_size < 1:
            return ValidationResult(valid=False, message="Page size must be a positive integer", reason_code="PAGE_SIZE_EXCEEDED")
        if page_size > max_allowed:
            return ValidationResult(valid=False, message=f"Page size {page_size} exceeds maximum allowed limit {max_allowed}", reason_code="PAGE_SIZE_EXCEEDED")
        return ValidationResult(valid=True)

    @staticmethod
    def validate_data_point_budget(series_count: int = 1, time_buckets: int = 1, policy_or_max: Optional[Union[int, RouteCostPolicy]] = None) -> ValidationResult:
        if not isinstance(series_count, int) or series_count < 1 or not isinstance(time_buckets, int) or time_buckets < 1:
            return ValidationResult(valid=False, message="Series and bucket counts must be positive integers", reason_code="QUERY_BUDGET_EXCEEDED")
        max_points = 50000
        if isinstance(policy_or_max, int):
            max_points = policy_or_max
        elif isinstance(policy_or_max, RouteCostPolicy) and policy_or_max.max_data_points:
            max_points = policy_or_max.max_data_points
        total = series_count * time_buckets
        if total > max_points:
            return ValidationResult(valid=False, message=f"Requested data point matrix ({series_count}x{time_buckets}={total}) exceeds maximum limit ({max_points})", reason_code="QUERY_BUDGET_EXCEEDED")
        return ValidationResult(valid=True)

    validate_data_points = validate_data_point_budget

    @staticmethod
    def validate_body_size(content_length: Optional[int], policy_or_max: Optional[Union[int, RouteCostPolicy]] = None) -> ValidationResult:
        if content_length is None:
            return ValidationResult(valid=True)
        max_bytes = 1048576
        if isinstance(policy_or_max, int):
            max_bytes = policy_or_max
        elif isinstance(policy_or_max, RouteCostPolicy) and policy_or_max.max_request_body_bytes:
            max_bytes = policy_or_max.max_request_body_bytes
        if not isinstance(content_length, int) or content_length < 0:
            return ValidationResult(valid=False, message="Content-Length must be a non-negative integer", reason_code="BODY_SIZE_EXCEEDED")
        if content_length > max_bytes:
            return ValidationResult(valid=False, message=f"Request body size {content_length} bytes exceeds limit of {max_bytes} bytes", reason_code="BODY_SIZE_EXCEEDED")
        return ValidationResult(valid=True)


class ResponseBudgetGuard:
    @staticmethod
    def validate_row_count(row_count: int, max_rows: int = 10000) -> ValidationResult:
        if not isinstance(row_count, int) or row_count < 0:
            return ValidationResult(valid=False, message="Row count must be a non-negative integer", reason_code="RESPONSE_ROW_BUDGET_EXCEEDED")
        if row_count > max_rows:
            return ValidationResult(valid=False, message=f"Result row count {row_count} exceeds maximum allowed budget {max_rows}", reason_code="RESPONSE_ROW_BUDGET_EXCEEDED")
        return ValidationResult(valid=True)
