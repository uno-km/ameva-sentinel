"""
ASGI Middleware for AMEVA-Sentinel Cost Guardrails.
"""

import json
from urllib.parse import parse_qs
from typing import Callable, Optional, Any
from ..core.evaluator import SentinelCostGuardEvaluator
from ..core.budget_types import RequestCostContext, VerifiedPrincipal
from ..core.guards import RequestShapeGuard


class SentinelASGIMiddleware:
    def __init__(
        self,
        app: Any,
        evaluator: Optional[SentinelCostGuardEvaluator] = None,
        principal_resolver: Optional[Callable[[dict], Optional[VerifiedPrincipal]]] = None,
    ):
        self.app = app
        self.evaluator = evaluator or SentinelCostGuardEvaluator()
        self.principal_resolver = principal_resolver

    async def __call__(self, scope: dict, receive: Callable, send: Callable) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        method = scope.get("method", "GET")
        path = scope.get("path", "/")

        path_res = RequestShapeGuard.validate_path(path)
        if not path_res.valid:
            await self._respond_json(send, 400, {"error": "INVALID_REQUEST_PATH", "message": path_res.message})
            return

        query_string = scope.get("query_string", b"").decode("utf-8")

        page_size = None
        series_count = None
        time_buckets = None

        if query_string:
            qs = parse_qs(query_string)
            if "pageSize" in qs:
                try:
                    val = int(qs["pageSize"][0])
                    if val <= 0:
                        await self._respond_json(send, 422, {"error": "Invalid pageSize parameter"})
                        return
                    page_size = val
                except ValueError:
                    await self._respond_json(send, 422, {"error": "Invalid pageSize parameter"})
                    return
            if "seriesCount" in qs:
                try:
                    val = int(qs["seriesCount"][0])
                    if val <= 0:
                        await self._respond_json(send, 422, {"error": "Invalid seriesCount parameter"})
                        return
                    series_count = val
                except ValueError:
                    await self._respond_json(send, 422, {"error": "Invalid seriesCount parameter"})
                    return
            if "timeBuckets" in qs:
                try:
                    val = int(qs["timeBuckets"][0])
                    if val <= 0:
                        await self._respond_json(send, 422, {"error": "Invalid timeBuckets parameter"})
                        return
                    time_buckets = val
                except ValueError:
                    await self._respond_json(send, 422, {"error": "Invalid timeBuckets parameter"})
                    return

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
        )

        decision = await self.evaluator.evaluate_async(ctx)

        if not decision.allowed:
            status = 401 if decision.action == "REQUIRE_AUTH" else (429 if decision.action == "RATE_LIMIT" else 400)
            await self._respond_json(send, status, decision.to_dict())
            return

        async def send_wrapper(message: dict) -> None:
            if message["type"] == "http.response.start":
                headers = message.setdefault("headers", [])
                headers.append((b"x-sentinel-action", decision.action.encode("utf-8")))
                headers.append((b"x-sentinel-policy-version", decision.policy_version.encode("utf-8")))
                headers.append((b"x-sentinel-checksum", decision.display_checksum.encode("utf-8")))
            await send(message)

        await self.app(scope, receive, send_wrapper)

    async def _respond_json(self, send: Callable, status_code: int, body: dict) -> None:
        payload = json.dumps(body).encode("utf-8")
        await send(
            {
                "type": "http.response.start",
                "status": status_code,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"content-length", str(len(payload)).encode("utf-8")),
                ],
            }
        )
        await send({"type": "http.response.body", "body": payload})
