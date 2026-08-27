"""
WSGI / Flask Middleware for AMEVA-Sentinel Cost Guardrails.
"""

import json
from urllib.parse import parse_qs
from typing import Callable, Optional, Any
from ..core.evaluator import SentinelCostGuardEvaluator
from ..core.budget_types import RequestCostContext, VerifiedPrincipal
from ..core.guards import RequestShapeGuard


class SentinelWSGIMiddleware:
    def __init__(
        self,
        app: Any,
        evaluator: Optional[SentinelCostGuardEvaluator] = None,
        principal_resolver: Optional[Callable[[dict], Optional[VerifiedPrincipal]]] = None,
    ):
        self.app = app
        self.evaluator = evaluator or SentinelCostGuardEvaluator()
        self.principal_resolver = principal_resolver

    def __call__(self, environ: dict, start_response: Callable) -> Any:
        method = environ.get("REQUEST_METHOD", "GET")
        path = environ.get("PATH_INFO", "/")

        path_res = RequestShapeGuard.validate_path(path)
        if not path_res.valid:
            return self._respond_json(start_response, 400, {"error": "INVALID_REQUEST_PATH", "message": path_res.message})

        query_string = environ.get("QUERY_STRING", "")

        page_size = None
        series_count = None
        time_buckets = None

        if query_string:
            qs = parse_qs(query_string)
            if "pageSize" in qs:
                try:
                    val = int(qs["pageSize"][0])
                    if val <= 0:
                        return self._respond_json(start_response, 422, {"error": "Invalid pageSize parameter"})
                    page_size = val
                except ValueError:
                    return self._respond_json(start_response, 422, {"error": "Invalid pageSize parameter"})
            if "seriesCount" in qs:
                try:
                    val = int(qs["seriesCount"][0])
                    if val <= 0:
                        return self._respond_json(start_response, 422, {"error": "Invalid seriesCount parameter"})
                    series_count = val
                except ValueError:
                    return self._respond_json(start_response, 422, {"error": "Invalid seriesCount parameter"})
            if "timeBuckets" in qs:
                try:
                    val = int(qs["timeBuckets"][0])
                    if val <= 0:
                        return self._respond_json(start_response, 422, {"error": "Invalid timeBuckets parameter"})
                    time_buckets = val
                except ValueError:
                    return self._respond_json(start_response, 422, {"error": "Invalid timeBuckets parameter"})

        # Verified principal resolution only
        principal = None
        if self.principal_resolver:
            principal = self.principal_resolver(environ)
        elif "sentinel.principal" in environ and isinstance(environ["sentinel.principal"], VerifiedPrincipal):
            principal = environ["sentinel.principal"]

        ctx = RequestCostContext(
            method=method,
            path=path,
            page_size=page_size,
            series_count=series_count,
            time_buckets=time_buckets,
            principal=principal,
        )

        decision = self.evaluator.evaluate_sync(ctx)

        if not decision.allowed:
            status = 401 if decision.action == "REQUIRE_AUTH" else (429 if decision.action == "RATE_LIMIT" else 400)
            return self._respond_json(start_response, status, decision.to_dict())

        def custom_start_response(status: str, headers: list, exc_info=None):
            headers.append(("x-sentinel-action", decision.action))
            headers.append(("x-sentinel-policy-version", decision.policy_version))
            headers.append(("x-sentinel-checksum", decision.display_checksum))
            return start_response(status, headers, exc_info)

        return self.app(environ, custom_start_response)

    def _respond_json(self, start_response: Callable, status_code: int, body: dict) -> list:
        payload = json.dumps(body).encode("utf-8")
        status_text = f"{status_code} " + {
            400: "Bad Request",
            401: "Unauthorized",
            422: "Unprocessable Entity",
            429: "Too Many Requests",
        }.get(status_code, "Error")

        start_response(
            status_text,
            [
                ("Content-Type", "application/json"),
                ("Content-Length", str(len(payload))),
            ],
        )
        return [payload]
