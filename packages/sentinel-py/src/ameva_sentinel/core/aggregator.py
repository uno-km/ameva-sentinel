"""
Bounded in-memory threat aggregator with sliding reservoir sampling.
"""

from typing import Dict, List, Any
from datetime import datetime, timezone
from .budget_types import RedactedThreatEvent, ThreatAggregateRecord


class BoundedThreatAggregator:
    def __init__(self, window_seconds: int = 60, max_records: int = 1000):
        self.window_seconds = window_seconds
        self.max_records = max_records
        self._records: Dict[str, ThreatAggregateRecord] = {}
        self._window_start = datetime.now(timezone.utc).isoformat()[:16]

    async def increment(self, event: RedactedThreatEvent) -> None:
        key = f"{event.signature}:{event.route_template}:{event.asn}"
        rec = self._records.get(key)

        if not rec:
            if len(self._records) >= self.max_records:
                return  # Bounded capacity safeguard
            rec = ThreatAggregateRecord(
                window_start=self._window_start,
                window_seconds=self.window_seconds,
                signature=event.signature,
                route_template=event.route_template,
                asn=event.asn,
                count=0,
                samples=[],
            )
            self._records[key] = rec

        rec.count += 1
        if len(rec.samples) < 5:
            rec.samples.append(
                {
                    "timestamp": event.timestamp,
                    "statusCode": event.status_code,
                    "evidenceCode": event.evidence_code,
                }
            )

    async def flush(self) -> List[ThreatAggregateRecord]:
        out = list(self._records.values())
        self._records.clear()
        self._window_start = datetime.now(timezone.utc).isoformat()[:16]
        return out
