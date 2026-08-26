"""
PII Redaction and Sanitization for Threat Telemetry.
"""

import time
from typing import Optional, Dict, Any
from .budget_types import RedactedThreatEvent

ALLOWED_EVIDENCE_CODES = {
    "MALFORMED_INPUT",
    "SQLI_SUSPECT",
    "AUTH_BYPASS_ATTEMPT",
    "RATE_LIMIT_EXCEEDED",
    "REPLAY_DETECTED",
    "PATH_TRAVERSAL_SUSPECT",
    "BUDGET_OVERRUN",
}


def sanitize_threat_event(
    signature: Optional[str] = None,
    route_template: Optional[str] = None,
    asn: Optional[int] = None,
    status_code: Optional[int] = None,
    evidence_code: Optional[str] = None,
    timestamp: Optional[float] = None,
) -> RedactedThreatEvent:
    sig = str(signature)[:64] if signature else "unknown"
    route = str(route_template)[:128] if route_template else "/"
    safe_asn = int(asn) if asn is not None else 0
    safe_status = int(status_code) if status_code is not None else None
    code = evidence_code if evidence_code in ALLOWED_EVIDENCE_CODES else None
    ts = float(timestamp) if timestamp is not None else time.time()

    return RedactedThreatEvent(
        signature=sig,
        route_template=route,
        asn=safe_asn,
        status_code=safe_status,
        evidence_code=code,
        timestamp=ts,
    )
