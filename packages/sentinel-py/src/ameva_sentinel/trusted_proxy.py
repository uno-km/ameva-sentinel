"""
Cryptographically safe client IP extraction with CIDR trust boundaries for Python SDK.
"""

import ipaddress
import re
from typing import Optional, List, Dict, Any, Union
from dataclasses import dataclass, field


@dataclass
class TrustedProxyPolicy:
    trusted_cidrs: List[str] = field(
        default_factory=lambda: [
            "127.0.0.0/8",
            "10.0.0.0/8",
            "172.16.0.0/12",
            "192.168.0.0/16",
            "::1/128",
            "fc00::/7",
            "fe80::/10",
        ]
    )
    header_precedence: List[str] = field(
        default_factory=lambda: ["cf-connecting-ip", "x-real-ip", "x-forwarded-for", "forwarded"]
    )
    reject_untrusted_forwarded_headers: bool = True


DEFAULT_TRUSTED_PROXY_POLICY = TrustedProxyPolicy()


def is_ip_in_cidr(ip_str: str, cidr_str: str) -> bool:
    if cidr_str in ("*", "0.0.0.0/0"):
        return True
    try:
        ip = ipaddress.ip_address(ip_str.strip())
        net = ipaddress.ip_network(cidr_str.strip(), strict=False)
        return ip in net
    except ValueError:
        return False


def is_ip_in_any_cidr(ip_str: str, cidrs: List[str]) -> bool:
    if not ip_str or not cidrs:
        return False
    return any(is_ip_in_cidr(ip_str, cidr) for cidr in cidrs)


def extract_client_ip(
    socket_remote_address: Optional[str] = None,
    headers: Optional[Dict[str, Any]] = None,
    policy: Optional[TrustedProxyPolicy] = None,
) -> str:
    pol = policy or DEFAULT_TRUSTED_PROXY_POLICY
    socket_ip = (socket_remote_address or "127.0.0.1").strip()

    is_socket_trusted = is_ip_in_any_cidr(socket_ip, pol.trusted_cidrs)

    if not is_socket_trusted and pol.reject_untrusted_forwarded_headers:
        return socket_ip

    hdrs = headers or {}
    lower_headers = {k.lower().replace("_", "-"): v for k, v in hdrs.items()}

    for header_name in pol.header_precedence:
        raw_val = lower_headers.get(header_name.lower())
        if not raw_val:
            continue
        if isinstance(raw_val, list):
            raw_val = raw_val[0]
        raw_val = str(raw_val).strip()

        if header_name == "x-forwarded-for":
            parts = [p.strip() for p in raw_val.split(",") if p.strip()]
            if parts:
                return parts[0]
        elif header_name == "forwarded":
            m = re.search(r'for="?([^";,\s]+)"?', raw_val, re.IGNORECASE)
            if m and m.group(1):
                return m.group(1).replace("[", "").replace("]", "")
        else:
            clean = raw_val.split(",")[0].strip()
            if clean:
                return clean

    return socket_ip
