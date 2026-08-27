"""
WSGI / Flask Middleware for AMEVA-Sentinel Cost Guardrails.
"""

import json
from urllib.parse import parse_qs
from typing import Callable, Optional, Any
from ..core.evaluator import SentinelCostGuardEvaluator
from ..core.budget_types import RequestCostContext, VerifiedPrincipal
from ..core.guards import RequestShapeGuard
from ..trusted_proxy import TrustedProxyPolicy, inspect_client_address


class SentinelWSGIMiddleware:
    def __init__(
        self,
        app: Any,
        evaluator: Optional[SentinelCostGuardEvaluator] = None,
        principal_resolver: Optional[Callable[[dict], Optional[VerifiedPrincipal]]] = None,
        trusted_proxy_policy: Optional[TrustedProxyPolicy] = None,
        on_assessment: Optional[Callable[[dict], Any]] = None,
    ):
        self.app = app
        self.evaluator = evaluator or SentinelCostGuardEvaluator()
        self.principal_resolver = principal_resolver
        self.trusted_proxy_policy = trusted_proxy_policy
        self.on_assessment = on_assessment

    def __call__(self, environ: dict, start_response: Callable) -> Any:
        method = environ.get("REQUEST_METHOD", "GET")
        raw_uri = environ.get("RAW_URI") or environ.get("REQUEST_URI") or environ.get("PATH_INFO", "/")
        path = raw_uri.split("?")[0]

        request_inspection = RequestShapeGuard.inspect_path(path)

        # Extract headers from WSGI environ (HTTP_* prefix)
        headers = {}
        for key, value in environ.items():
            if key.startswith("HTTP_"):
                header_name = key[5:].replace("_", "-").lower()
                headers[header_name] = value

        client_address_inspection = inspect_client_address(
            socket_remote_address=environ.get("REMOTE_ADDR"),
            headers=headers,
            policy=self.trusted_proxy_policy,
        )

        query_string = environ.get("QUERY_STRING", "")

        page_size = None
        series_count = None
        time_buckets = None

        if query_string:
            qs = parse_qs(query_string)
            if "pageSize" in qs:
                try:
                    val = int(qs["pageSize"][0])
                    if val > 0:
                        page_size = val
                except ValueError:
                    pass
            if "seriesCount" in qs:
                try:
                    val = int(qs["seriesCount"][0])
                    if val > 0:
                        series_count = val
                except ValueError:
                    pass
            if "timeBuckets" in qs:
                try:
                    val = int(qs["timeBuckets"][0])
                    if val > 0:
                        time_buckets = val
                except ValueError:
                    pass

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
            network_key=client_address_inspection.client_address or client_address_inspection.socket_address or "unknown",
        )

        decision = None
        if request_inspection.accepted_by_inspector:
            decision = self.evaluator.evaluate_sync(ctx)

        sentinel_context = {
            "request_inspection": request_inspection,
            "client_address_inspection": client_address_inspection,
            "decision": decision,
            "request_context": ctx,
        }

        environ["ameva_sentinel"] = sentinel_context

        if self.on_assessment:
            self.on_assessment(sentinel_context)

        def custom_start_response(status: str, headers: list, exc_info=None):
            if decision:
                headers.append(("x-sentinel-action", decision.action))
                headers.append(("x-sentinel-policy-version", decision.policy_version))
                headers.append(("x-sentinel-checksum", decision.display_checksum))
            return start_response(status, headers, exc_info)

        return self.app(environ, custom_start_response)


SentinelWSGIObserver = SentinelWSGIMiddleware
