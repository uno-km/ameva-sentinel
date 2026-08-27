"""
FastAPI helper integration for AMEVA-Sentinel.
"""

from typing import Optional, Callable
from .asgi import SentinelASGIMiddleware
from ..core.evaluator import SentinelCostGuardEvaluator
from ..core.budget_types import VerifiedPrincipal


def create_fastapi_cost_guard(
    app: any,
    evaluator: Optional[SentinelCostGuardEvaluator] = None,
    principal_resolver: Optional[Callable[[dict], Optional[VerifiedPrincipal]]] = None,
) -> None:
    app.add_middleware(
        SentinelASGIMiddleware,
        evaluator=evaluator,
        principal_resolver=principal_resolver,
    )


create_fastapi_observer = create_fastapi_cost_guard

