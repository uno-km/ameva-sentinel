"""
Explicit consumer-controlled enforcement middleware for Python ASGI/WSGI.
Strictly requires consumer decision callback; never applies default HTTP blocking or status codes.
"""

import json
from typing import Callable, Optional, Any, Dict
from ..core.evaluator import SentinelCostGuardEvaluator
from ..core.budget_types import RequestCostContext, VerifiedPrincipal
from ..core.guards import RequestShapeGuard
from ..trusted_proxy import TrustedProxyPolicy, inspect_client_address


class SentinelASGIEnforcer:
    def __init__(
        self,
        app: Any,
        decide: Callable[[dict], dict],
        evaluator: Optional[SentinelCostGuardEvaluator] = None,
        principal_resolver: Optional[Callable[[dict], Optional[VerifiedPrincipal]]] = None,
        trusted_proxy_policy: Optional[TrustedProxyPolicy] = None,
    ):
        if not callable(decide):
            raise TypeError("SentinelASGIEnforcer requires a mandatory callable `decide`.")
        self.app = app
        self.decide = decide
        self.evaluator = evaluator or SentinelCostGuardEvaluator()
        self.principal_resolver = principal_resolver
        self.trusted_proxy_policy = trusted_proxy_policy

    async def __call__(self, scope: dict, receive: Callable, send: Callable) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        method = scope.get("method", "GET")
        raw_path_bytes = scope.get("raw_path")
        path = raw_path_bytes.decode("latin1").split("?")[0] if raw_path_bytes else scope.get("path", "/")

        request_inspection = RequestShapeGuard.inspect_path(path)

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
        from urllib.parse import parse_qs
        page_size, series_count, time_buckets = None, None, None
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

        outcome = self.decide(sentinel_context)
        if hasattr(outcome, "__await__"):
            outcome = await outcome

        if outcome and outcome.get("action") == "respond":
            status = outcome.get("status", 400)
            headers = []
            if "headers" in outcome:
                for k, v in outcome["headers"].items():
                    headers.append((k.encode("utf-8"), str(v).encode("utf-8")))

            payload = b""
            if "body" in outcome:
                body = outcome["body"]
                if isinstance(body, (dict, list)):
                    payload = json.dumps(body).encode("utf-8")
                    headers.append((b"content-type", b"application/json"))
                elif isinstance(body, str):
                    payload = body.encode("utf-8")
                elif isinstance(body, bytes):
                    payload = body

            headers.append((b"content-length", str(len(payload)).encode("utf-8")))

            await send({"type": "http.response.start", "status": status, "headers": headers})
            await send({"type": "http.response.body", "body": payload})
            return

        await self.app(scope, receive, send)


class SentinelWSGIEnforcer:
    def __init__(
        self,
        app: Any,
        decide: Callable[[dict], dict],
        evaluator: Optional[SentinelCostGuardEvaluator] = None,
        principal_resolver: Optional[Callable[[dict], Optional[VerifiedPrincipal]]] = None,
        trusted_proxy_policy: Optional[TrustedProxyPolicy] = None,
    ):
        if not callable(decide):
            raise TypeError("SentinelWSGIEnforcer requires a mandatory callable `decide`.")
        self.app = app
        self.decide = decide
        self.evaluator = evaluator or SentinelCostGuardEvaluator()
        self.principal_resolver = principal_resolver
        self.trusted_proxy_policy = trusted_proxy_policy

    def __call__(self, environ: dict, start_response: Callable) -> Any:
        method = environ.get("REQUEST_METHOD", "GET")
        raw_uri = environ.get("RAW_URI") or environ.get("REQUEST_URI") or environ.get("PATH_INFO", "/")
        path = raw_uri.split("?")[0]

        request_inspection = RequestShapeGuard.inspect_path(path)

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
        from urllib.parse import parse_qs
        page_size, series_count, time_buckets = None, None, None
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

        outcome = self.decide(sentinel_context)

        if outcome and outcome.get("action") == "respond":
            status = outcome.get("status", 400)
            status_text = f"{status} Response"
            headers_list = []
            if "headers" in outcome:
                for k, v in outcome["headers"].items():
                    headers_list.append((k, str(v)))

            payload = b""
            if "body" in outcome:
                body = outcome["body"]
                if isinstance(body, (dict, list)):
                    payload = json.dumps(body).encode("utf-8")
                    headers_list.append(("Content-Type", "application/json"))
                elif isinstance(body, str):
                    payload = body.encode("utf-8")
                elif isinstance(body, bytes):
                    payload = body

            headers_list.append(("Content-Length", str(len(payload))))
            start_response(status_text, headers_list)
            return [payload]

        return self.app(environ, start_response)
