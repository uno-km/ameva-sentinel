"""
Abstract store interfaces and typing protocols for Python SDK.
"""

from typing import Protocol, runtime_checkable, List, Optional
from .budget_types import (
    BudgetConsumeRequest,
    BudgetConsumeResult,
    RedactedThreatEvent,
    ThreatAggregateRecord,
)


@runtime_checkable
class AsyncBudgetStore(Protocol):
    async def consume_async(self, request: BudgetConsumeRequest) -> BudgetConsumeResult:
        ...


@runtime_checkable
class SyncBudgetStore(Protocol):
    def consume(self, request: BudgetConsumeRequest) -> BudgetConsumeResult:
        ...


@runtime_checkable
class ThreatAggregateStore(Protocol):
    async def increment(self, event: RedactedThreatEvent) -> None:
        ...

    async def flush(self) -> List[ThreatAggregateRecord]:
        ...
