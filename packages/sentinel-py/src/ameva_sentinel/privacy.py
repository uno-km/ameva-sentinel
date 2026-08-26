"""
Privacy-first Network Utilities & Anonymization.
"""

import ipaddress
from typing import Optional


def mask_ip_address(ip_str: Optional[str]) -> str:
    if not ip_str:
        return "0.0.0.0/0"
    try:
        ip = ipaddress.ip_address(ip_str.strip())
        if isinstance(ip, ipaddress.IPv4Address):
            net = ipaddress.IPv4Network(f"{ip}/24", strict=False)
            return str(net)
        elif isinstance(ip, ipaddress.IPv6Address):
            net = ipaddress.IPv6Network(f"{ip}/48", strict=False)
            return str(net)
    except ValueError:
        pass
    return "0.0.0.0/0"


def normalize_target_type(target_type: Optional[str]) -> str:
    if not target_type:
        return "standard"
    t = target_type.strip().lower()
    if t in ("chart", "orderbook", "websocket", "search", "export"):
        return t
    return "standard"
