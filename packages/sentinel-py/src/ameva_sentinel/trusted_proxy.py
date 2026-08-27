"""
Cryptographically safe client IP extraction with CIDR trust boundaries for Python SDK.
"""

import ipaddress
import re
from typing import Optional, List, Dict, Any, Tuple
from dataclasses import dataclass, field
from .core.budget_types import ClientAddressFinding, ClientAddressInspection


@dataclass(frozen=True)
class TrustedProxyPolicy:
    trusted_cidrs: Tuple[str, ...] = ()
    header_precedence: Tuple[str, ...] = ("forwarded", "x-forwarded-for")
    reject_untrusted_forwarded_headers: bool = True
    reject_conflicting_headers: bool = True
    max_forwarded_hops: int = 1


DEFAULT_TRUSTED_PROXY_POLICY = TrustedProxyPolicy()


def normalize_ip(raw_value: Optional[str]) -> Optional[str]:
    if not isinstance(raw_value, str):
        return None

    candidate = raw_value.strip()
    if not candidate or len(candidate) > 128 or "%" in candidate:
        return None

    # Handle [IPv6]:port
    if candidate.startswith("[") and "]" in candidate:
        closing = candidate.index("]")
        suffix = candidate[closing + 1 :]
        if suffix and not re.match(r"^:\d{1,5}$", suffix):
            return None
        candidate = candidate[1:closing]
    elif re.match(r"^(\d{1,3}\.){3}\d{1,3}:\d{1,5}$", candidate):
        candidate = candidate.split(":")[0]

    try:
        parsed = ipaddress.ip_address(candidate)
    except ValueError:
        return None

    if isinstance(parsed, ipaddress.IPv6Address) and parsed.ipv4_mapped is not None:
        parsed = parsed.ipv4_mapped

    return parsed.compressed


def is_ip_in_cidr(ip_str: str, cidr_str: str) -> bool:
    if cidr_str in ("*", "0.0.0.0/0"):
        return True
    try:
        norm_ip = normalize_ip(ip_str)
        if not norm_ip:
            return False
        ip = ipaddress.ip_address(norm_ip)
        net = ipaddress.ip_network(cidr_str.strip(), strict=False)
        return ip in net
    except Exception:
        return False


def is_ip_in_any_cidr(ip_str: str, cidrs: Tuple[str, ...]) -> bool:
    if not ip_str or not cidrs:
        return False
    return any(is_ip_in_cidr(ip_str, cidr) for cidr in cidrs)


def parse_and_validate_ip(raw: str) -> Optional[str]:
    return normalize_ip(raw)


def parse_forwarded_header_strictly(header_name: str, raw_value: str) -> List[str]:
    if header_name == "forwarded":
        ips: List[str] = []
        for entry in raw_value.split(","):
            m = re.search(r'for="?([^";,\s]+)"?', entry.strip(), re.IGNORECASE)
            if m and m.group(1):
                cleaned = m.group(1).replace("[", "").replace("]", "")
                norm = parse_and_validate_ip(cleaned)
                if norm:
                    ips.append(norm)
        return ips

    if header_name == "x-forwarded-for":
        parts = [p.strip() for p in raw_value.split(",") if p.strip()]
        ips: List[str] = []
        for part in parts:
            norm = parse_and_validate_ip(part)
            if norm:
                ips.append(norm)
        return ips

    first = raw_value.split(",")[0].strip()
    norm = parse_and_validate_ip(first)
    return [norm] if norm else []


def select_client_from_chain(
    socket_ip: str,
    forwarded_ips: List[str],
    trusted_cidrs: Tuple[str, ...],
    max_forwarded_hops: int,
) -> str:
    if len(forwarded_ips) == 0:
        raise ValueError("EMPTY_FORWARDED_CHAIN")

    if len(forwarded_ips) > max_forwarded_hops:
        raise ValueError("FORWARDED_HOP_LIMIT_EXCEEDED")

    chain = [*forwarded_ips, socket_ip]

    for candidate in reversed(chain):
        if not is_ip_in_any_cidr(candidate, trusted_cidrs):
            return candidate

    return forwarded_ips[0]


def inspect_client_address(
    socket_remote_address: Optional[str] = None,
    headers: Optional[Dict[str, Any]] = None,
    policy: Optional[TrustedProxyPolicy] = None,
) -> ClientAddressInspection:
    from .core.budget_types import ClientAddressFinding, ClientAddressInspection

    pol = policy or DEFAULT_TRUSTED_PROXY_POLICY
    findings: List[ClientAddressFinding] = []
    normalized_socket = normalize_ip(socket_remote_address)

    hdrs = headers or {}
    lower_headers = {k.lower().replace("_", "-"): str(v).strip() for k, v in hdrs.items() if v is not None}

    present_headers: List[Tuple[str, str]] = []
    for h in pol.header_precedence:
        val = lower_headers.get(h.lower())
        if val:
            present_headers.append((h, val))

    if not normalized_socket:
        if present_headers:
            findings.append(
                ClientAddressFinding(
                    code="MISSING_OR_INVALID_SOCKET_REMOTE_ADDRESS",
                    severity="high",
                    message="Socket remote address is missing or invalid while forwarded headers are present.",
                )
            )
            return ClientAddressInspection(
                socket_address=None,
                client_address=None,
                forwarded_address=present_headers[0][1] if present_headers else None,
                source="unknown",
                trust="invalid",
                findings=findings,
            )
        return ClientAddressInspection(
            socket_address=None,
            client_address=None,
            forwarded_address=None,
            source="unknown",
            trust="trusted",
            findings=findings,
        )

    socket_ip = normalized_socket
    socket_trusted = is_ip_in_any_cidr(socket_ip, pol.trusted_cidrs)

    if not present_headers:
        return ClientAddressInspection(
            socket_address=socket_ip,
            client_address=socket_ip,
            forwarded_address=None,
            source="socket",
            trust="trusted",
            findings=findings,
        )

    if not socket_trusted:
        findings.append(
            ClientAddressFinding(
                code="UNTRUSTED_FORWARDED_HEADERS",
                severity="high",
                message="Socket remote address is not in trusted CIDR list, ignoring forwarded headers.",
            )
        )
        return ClientAddressInspection(
            socket_address=socket_ip,
            client_address=socket_ip,
            forwarded_address=present_headers[0][1],
            source="socket",
            trust="untrusted",
            findings=findings,
        )

    if pol.reject_conflicting_headers and len(present_headers) > 1:
        findings.append(
            ClientAddressFinding(
                code="CONFLICTING_FORWARDED_HEADERS",
                severity="high",
                message="Multiple conflicting forwarded headers present.",
            )
        )

    selected_name, selected_value = present_headers[0]
    forwarded_ips = parse_forwarded_header_strictly(selected_name, selected_value)

    if not forwarded_ips:
        findings.append(
            ClientAddressFinding(
                code="INVALID_FORWARDED_ADDRESS",
                severity="medium",
                message="Forwarded header value contained no valid IP addresses.",
            )
        )
        return ClientAddressInspection(
            socket_address=socket_ip,
            client_address=socket_ip,
            forwarded_address=selected_value,
            source="socket",
            trust="invalid",
            findings=findings,
        )

    if len(forwarded_ips) > pol.max_forwarded_hops:
        findings.append(
            ClientAddressFinding(
                code="FORWARDED_HOP_LIMIT_EXCEEDED",
                severity="high",
                message=f"Forwarded hops ({len(forwarded_ips)}) exceeded limit ({pol.max_forwarded_hops}).",
            )
        )
        return ClientAddressInspection(
            socket_address=socket_ip,
            client_address=socket_ip,
            forwarded_address=selected_value,
            source="socket",
            trust="invalid",
            findings=findings,
        )

    resolved_client_ip = socket_ip
    try:
        resolved_client_ip = select_client_from_chain(
            socket_ip=socket_ip,
            forwarded_ips=forwarded_ips,
            trusted_cidrs=pol.trusted_cidrs,
            max_forwarded_hops=pol.max_forwarded_hops,
        )
    except Exception as exc:
        findings.append(
            ClientAddressFinding(
                code=str(exc),
                severity="high",
                message=str(exc),
            )
        )

    return ClientAddressInspection(
        socket_address=socket_ip,
        client_address=resolved_client_ip,
        forwarded_address=selected_value,
        source="socket" if resolved_client_ip == socket_ip else "forwarded",
        trust="untrusted" if findings else "trusted",
        findings=findings,
    )


def extract_client_ip(
    socket_remote_address: Optional[str] = None,
    headers: Optional[Dict[str, Any]] = None,
    policy: Optional[TrustedProxyPolicy] = None,
) -> str:
    pol = policy or DEFAULT_TRUSTED_PROXY_POLICY
    normalized_socket = normalize_ip(socket_remote_address)

    hdrs = headers or {}
    lower_headers = {k.lower().replace("_", "-"): str(v).strip() for k, v in hdrs.items() if v is not None}

    present_headers: List[Tuple[str, str]] = []
    for h in pol.header_precedence:
        val = lower_headers.get(h.lower())
        if val:
            present_headers.append((h, val))

    if not normalized_socket:
        if present_headers:
            raise ValueError("MISSING_OR_INVALID_SOCKET_REMOTE_ADDRESS")
        return "unknown"

    socket_ip = normalized_socket
    socket_trusted = is_ip_in_any_cidr(socket_ip, pol.trusted_cidrs)

    if not socket_trusted:
        if pol.reject_untrusted_forwarded_headers and present_headers:
            raise ValueError("UNTRUSTED_FORWARDED_HEADERS")
        return socket_ip

    if pol.reject_conflicting_headers and len(present_headers) > 1:
        raise ValueError("CONFLICTING_FORWARDED_HEADERS")

    if not present_headers:
        return socket_ip

    selected_name, selected_value = present_headers[0]
    forwarded_ips = parse_forwarded_header_strictly(selected_name, selected_value)

    return select_client_from_chain(
        socket_ip=socket_ip,
        forwarded_ips=forwarded_ips,
        trusted_cidrs=pol.trusted_cidrs,
        max_forwarded_hops=pol.max_forwarded_hops,
    )
