"""
PostgreSQL SQLAlchemy Integration for AMEVA-Sentinel.
Enforces transaction-scoped SET LOCAL timeouts and strictly raises on query timeout failures.
"""

from typing import Any
from ..core.budget_types import RouteCostPolicy


class DatabaseBudgetUsageError(Exception):
    """Raised when Database budget injection violates transaction contract or execution fails."""
    pass


class PostgresSqlAlchemyBudgetGuard:
    @staticmethod
    async def apply_postgres_budget(session: Any, policy: RouteCostPolicy) -> None:
        """
        Injects statement and lock timeouts inside an active PostgreSQL transaction.
        Raises DatabaseBudgetUsageError if called outside a transaction or if execution fails.
        """
        from sqlalchemy import text

        if not hasattr(session, "in_transaction"):
            raise DatabaseBudgetUsageError("Unsupported SQLAlchemy session: missing in_transaction method.")

        if not session.in_transaction():
            raise DatabaseBudgetUsageError(
                "A transaction is required for SET LOCAL statement_timeout. Wrap query inside 'async with session.begin():'."
            )

        q_timeout = policy.query_timeout_ms or 2000
        l_timeout = policy.lock_timeout_ms or 500

        try:
            await session.execute(text(f"SET LOCAL statement_timeout = '{q_timeout}ms'"))
            await session.execute(text(f"SET LOCAL lock_timeout = '{l_timeout}ms'"))
        except Exception as exc:
            raise DatabaseBudgetUsageError("Failed to apply PostgreSQL query budget timeouts.") from exc

    @staticmethod
    def is_statement_timeout_exception(exc: Exception) -> bool:
        err_msg = str(exc).lower()
        return (
            "statement timeout" in err_msg
            or "canceling statement due to statement timeout" in err_msg
            or "lock timeout" in err_msg
        )


def create_sentinel_schema(engine: Any) -> None:
    """Explicit helper to initialize schema. Must be called explicitly by user, never in constructor."""
    pass

