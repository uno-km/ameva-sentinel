"""
ASGI Middleware for AMEVA-Sentinel Cost Guardrails.
"""

import json
from urllib.parse import parse_qs
from typing import Callable, Optional, Any
from ..core.evaluator import SentinelCostGuardEvaluator
from ..core.budget_types import RequestCostContext, VerifiedPrincipal
from ..core.guards import RequestShapeGuard
from ..trusted_proxy import TrustedProxyPolicy, inspect_client_address


class SentinelASGIMiddleware:
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

    async def __call__(self, scope: dict, receive: Callable, send: Callable) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        method = scope.get("method", "GET")
        raw_path_bytes = scope.get("raw_path")
        path = raw_path_bytes.decode("latin1").split("?")[0] if raw_path_bytes else scope.get("path", "/")

        request_inspection = RequestShapeGuard.inspect_path(path)

        # Extract headers dict from raw ASGI headers list [(b"name", b"val")]
        headers_dict = {}
        for k, v in scope.get("headers", []):
            try:
                headers_dict[k.decode("latin1")] = v.decode("latin1")
            except Exception:
                pass

        client_info = scope.get("client")
        socket_ip = client_info[0] if client_info and len(client_info) > 0 else None
        client_address_inspection = inspect_client_address(
            socket_remote_address=socket_ip,
            headers=headers_dict,
            policy=self.trusted_proxy_policy,
        )

        query_string = scope.get("query_string", b"").decode("utf-8")

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

        # Upstream-Verified Principal extraction only
        principal = None
        if self.principal_resolver:
            principal = self.principal_resolver(scope)
        elif "sentinel.principal" in scope and isinstance(scope["sentinel.principal"], VerifiedPrincipal):
            principal = scope["sentinel.principal"]

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
            decision = await self.evaluator.evaluate_async(ctx)

        sentinel_context = {
            "request_inspection": request_inspection,
            "client_address_inspection": client_address_inspection,
            "decision": decision,
            "request_context": ctx,
        }

        scope["ameva_sentinel"] = sentinel_context

        if self.on_assessment:
            res = self.on_assessment(sentinel_context)
            if hasattr(res, "__await__"):
                await res

        async def send_wrapper(message: dict) -> None:
            if message["type"] == "http.response.start" and decision:
                headers = message.setdefault("headers", [])
                headers.append((b"x-sentinel-action", decision.action.encode("utf-8")))
                headers.append((b"x-sentinel-policy-version", decision.policy_version.encode("utf-8")))
                headers.append((b"x-sentinel-checksum", decision.display_checksum.encode("utf-8")))
            await send(message)

        await self.app(scope, receive, send_wrapper)


SentinelASGIObserver = SentinelASGIMiddleware
