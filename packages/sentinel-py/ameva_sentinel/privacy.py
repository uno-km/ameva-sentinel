from typing import Optional

def mask_ip_address(ip: Optional[str]) -> Optional[str]:
    if not ip or not isinstance(ip, str):
        return None
    trimmed = ip.strip()
    if "." in trimmed:
        parts = trimmed.split(".")
        if len(parts) == 4:
            return f"{parts[0]}.{parts[1]}.***.***"
        return None
    if ":" in trimmed:
        parts = trimmed.split(":")
        if len(parts) >= 4:
            return f"{parts[0]}:{parts[1]}:{parts[2]}:{parts[3]}::"
        return None
    return None

VALID_TARGET_TYPES = {"BUTTON", "LINK", "CODE", "INPUT", "NAVIGATION", "OTHER"}

def normalize_target_type(target_type: Optional[str]) -> str:
    if not target_type or not isinstance(target_type, str):
        return "OTHER"
    upper = target_type.strip().upper()
    return upper if upper in VALID_TARGET_TYPES else "OTHER"
