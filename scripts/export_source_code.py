import os
import sys
import hashlib
import subprocess
from datetime import datetime
from pathlib import Path

EXCLUDE_DIRS = {'.git', '.venv', 'node_modules', 'dist', 'build', 'coverage', '__pycache__', 'releases', 'tools', 'codes', '.pytest_cache', '*.egg-info'}
EXCLUDE_FILES = {'package-lock.json', 'pnpm-lock.yaml', '*.whl', '*.tar.gz', '*.tgz', '*.png', '*.jpg', '*.jpeg', '*.gif', '*.mp4', '*.mp3', '.env*', '*.pem', '*.key', '*.cert', 'API token', '비밀번호', '개인키', '인증서'}
LANG_MAP = {'.py': 'python', '.ts': 'typescript', '.js': 'javascript', '.mjs': 'javascript', '.md': 'markdown', '.json': 'json', '.html': 'html', '.css': 'css', '.yaml': 'yaml', '.yml': 'yaml', '.toml': 'toml', '.ps1': 'powershell', '.sh': 'bash'}

def cmd(args: list[str]) -> str:
    try:
        return subprocess.run(args, capture_output=True, text=True, encoding='utf-8').stdout.strip()
    except Exception:
        return ""

def generate_tree(path: Path, prefix="") -> str:
    try:
        entries = sorted([p for p in path.iterdir() if p.name not in EXCLUDE_DIRS and not any(p.match(pat) for pat in EXCLUDE_FILES) and not p.name.endswith('.egg-info')], key=lambda p: (not p.is_dir(), p.name.lower()))
    except PermissionError:
        return ""
    lines = []
    for i, p in enumerate(entries):
        is_last = (i == len(entries) - 1)
        conn = "ㄴ-- " if is_last else "├── "
        lines.append(f"{prefix}{conn}{p.name}")
        if p.is_dir():
            child_prefix = prefix + ("    " if is_last else "│   ")
            child_tree = generate_tree(p, child_prefix)
            if child_tree:
                lines.append(child_tree)
    return "\n".join(lines)

def build_architecture_markdown(branch: str, commit: str, porcelain: str, now: datetime, tree: str) -> str:
    return f"""# 🛡️ AMEVA-Sentinel Full Architecture, Configuration & Source Code Export

> **Snapshot Date**: {now:%Y-%m-%d %H:%M:%S}  
> **Repository Branch**: `{branch}`  
> **Commit Hash**: `{commit}`  
> **Working Tree State**: `{'DIRTY' if porcelain else 'CLEAN'}`  
> **Unified Monorepo Version**: `v2.2.0-alpha.1` (TypeScript) / `2.2.0a1` (Python PEP 440)  
> **License**: `Apache-2.0`  
> **Governing Body**: `AMEVA Open-Source Foundation (AOSF)`  

---

## 🏛️ Executive System Architecture

AMEVA-Sentinel is a dual-runtime (TypeScript/Node.js & Python) privacy-first security observability and deterministic cost guardrail layer. It provides zero-raw-data client telemetry, multi-axis computational cost limits, hierarchical token-bucket rate limiting, unverified tenant credential isolation, and emergency in-memory fail-open fallback with dynamic capacity clamping.

```mermaid
flowchart TD
    subgraph ClientEdge ["1. Client & Edge Layer"]
        Browser["@ameva/sentinel-browser\\n(Derived Signals, Throttled 100ms,\\nZero Raw Keystroke/Coordinates)"]
        EdgeAdapters["Edge Provider Normalizers\\n(Cloudflare, Fastly, AWS CloudFront)"]
    end

    subgraph MiddlewareLayer ["2. Web Framework Adapters"]
        TS_MW["TypeScript Adapters\\n(Express, Fastify, Next.js)"]
        PY_MW["Python Adapters\\n(FastAPI, Starlette, Flask, WSGI, ASGI)"]
    end

    subgraph SecurityEvaluator ["3. Sentinel Cost Guard Evaluator (Dual-Runtime Parity)"]
        Evaluator["SentinelCostGuardEvaluator\\n(Unified Shadow & Enforcement Logic)"]
        ShapeGuard["RequestShapeGuard\\n(Page Size, Data Point Bounds)"]
        BudgetGuard["ResponseBudgetGuard\\n(Response Row & Byte Limits)"]
        PrincipalSec["VerifiedPrincipal Security Boundary\\n(Unauthenticated Tenant Namespace Stripping)"]
        CanonicalPolicy["Policy Engine & Checksum\\n(RFC 8785 Canonical JSON & SHA-256)"]
        ThreatAgg["BoundedThreatAggregator\\n(In-Memory LRU Window Aggregation)"]
    end

    subgraph StorageLayer ["4. Distributed State & Emergency Stores"]
        RedisStore["RedisTokenBucketStore & RedisThreatAggregator\\n(Distributed Hierarchical Token Bucket via Atomic Lua)"]
        LocalStore["LocalEmergencyBudgetStore\\n(In-Memory Token Bucket with Dynamic Clamp)"]
        DBGuard["PostgresSqlAlchemyBudgetGuard\\n(SQLAlchemy Transaction Query Timeout & Lock Budget)"]
    end

    Browser --> TS_MW
    EdgeAdapters --> TS_MW
    EdgeAdapters --> PY_MW

    TS_MW --> Evaluator
    PY_MW --> Evaluator

    Evaluator --> PrincipalSec
    Evaluator --> ShapeGuard
    Evaluator --> BudgetGuard
    Evaluator --> CanonicalPolicy
    Evaluator --> ThreatAgg

    Evaluator -->|Primary Path| RedisStore
    Evaluator -->|Redis Partition / Outage Fallback| LocalStore
    PY_MW --> DBGuard
```

---

## 🧩 Monorepo Component & Package Breakdown

| Package Name | Runtime / Target | Description | Version |
| :--- | :--- | :--- | :--- |
| **`@ameva/sentinel-risk-core`** | TypeScript / NodeNext ESM | Deterministic 0-100 risk scoring, pure cost evaluation, shape guards, canonical JSON hashing, and local emergency token bucket. | `2.2.0-alpha.1` |
| **`@ameva/sentinel-browser`** | Browser DOM / ESM | Privacy-first browser telemetry collector with 100ms throttled interaction metrics and zero raw coordinate persistence. | `2.2.0-alpha.1` |
| **`@ameva/sentinel-store-redis`** | TypeScript / Node.js | Distributed hierarchical multi-key token bucket (Tenant, Account, API Key, Route, Network) and sliding threat aggregator. | `2.2.0-alpha.1` |
| **`@ameva/sentinel`** | TypeScript / Node.js | High-level facade with drop-in middleware adapters for Express, Fastify, and Next.js. | `2.2.0-alpha.1` |
| **`ameva-sentinel` (sentinel-py)** | Python 3.9+ | Dual-runtime Python SDK with ASGI, WSGI, FastAPI middlewares, and SQLAlchemy PostgreSQL transaction timeout guards. | `2.2.0a1` |

---

## 🔒 Security Invariants & Trust Boundary Specifications

### 1. Unverified Identity & Tenant Namespace Isolation
- **Rule**: Requests containing unauthenticated identity headers (`x-tenant-id`, `x-account-id`, `x-api-key`) MUST NOT influence or pollute authenticated budget quotas.
- **TypeScript Implementation**: Discriminant union on `VerifiedPrincipal`:
  ```typescript
  export type VerifiedPrincipal =
    | {{ authenticated: true; tenantId: string; accountId?: string; apiKeyId?: string; role?: string; tier?: string; }}
    | {{ authenticated: false; tenantId?: undefined; accountId?: undefined; apiKeyId?: undefined; role?: undefined; tier?: undefined; }};
  ```
- **Python Implementation**: Enforced `__post_init__` invariant raising `ValueError` if unauthenticated principals contain identity fields:
  ```python
  @dataclass
  class VerifiedPrincipal:
      authenticated: bool
      tenant_id: Optional[str] = None
      account_id: Optional[str] = None
      api_key_id: Optional[str] = None
      role: Optional[str] = None
      tier: Optional[str] = None

      def __post_init__(self) -> None:
          if not self.authenticated and any(
              v is not None for v in (self.tenant_id, self.account_id, self.api_key_id, self.role, self.tier)
          ):
              raise ValueError("Unauthenticated VerifiedPrincipal cannot contain identity fields")
  ```

### 2. Emergency Dynamic Capacity Clamping
- **Rule**: When degrading to local in-memory emergency budgets due to Redis cluster outage or network partitions, token balances must be dynamically clamped to `min(current_tokens, new_emergency_capacity)`.
- **Guarantee**: A client downgraded from high-tier capacity (e.g. 200) to anonymous capacity (e.g. 30) within the same bucket cannot inherit or consume the previous 190 residual balance.

### 3. Canonical Policy JSON & Full SHA-256 Digest
- **Rule**: Cost policy configurations are canonicalized deterministically using RFC 8785 rules (sorted object keys, strict numeric formatting, unescaped safe characters) and hashed via SHA-256 producing full 64-hexadecimal character signatures.

---

## 📋 Comprehensive Directory Tree

```text
{tree}
```

---

"""

def main():
    root = Path(__file__).resolve().parent.parent
    now = datetime.now()
    out_dir = root / 'scripts' / 'codes'
    out_dir.mkdir(parents=True, exist_ok=True)
    timestamp = f"{now:%Y%m%d_%H%M%S}_{now.microsecond // 1000:03d}"
    out_file_txt = out_dir / f"{timestamp}_export.txt"
    out_file_md = out_dir / f"{timestamp}_export.md"
    root_md = root / "ALL_SOURCE_CODE.md"

    branch = cmd(["git", "branch", "--show-current"]) or "main"
    commit = cmd(["git", "rev-parse", "HEAD"]) or "HEAD"
    porcelain = cmd(["git", "status", "--porcelain"])
    tree = generate_tree(root)

    header_md = build_architecture_markdown(branch, commit, porcelain, now, tree)

    sep = "=" * 80
    header_txt = (
        f"# 프로젝트 디렉터리\n#root\n{tree}\n\n\n"
        f"# PROJECT_METADATA\nProject: AMEVA-Sentinel\nSnapshot Date: {now:%Y-%m-%d}\nBranch: {branch}\nCommit: {commit}\n"
        f"Working Tree: {'DIRTY' if porcelain else 'CLEAN'}\nSnapshot State: {'HEAD + working tree snapshot' if porcelain else 'HEAD snapshot'}\n"
        f"Operating System: {sys.platform}\nPython Version: {sys.version.split()[0]}\nNode Version: {cmd(['node', '-v']) or 'Unknown'}\n"
        f"Package Manager: npm\nCurrent Stage: v2.2.0-alpha.1 Dual-Runtime Monorepo\nTarget Release: 2.2.0 OSS Release\n\n\n"
    )
    files_data = []
    for root_dir, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted([d for d in dirnames if d not in EXCLUDE_DIRS and not d.endswith('.egg-info')])
        for f in sorted(filenames):
            p = Path(root_dir) / f
            if any(p.match(pat) for pat in EXCLUDE_FILES) or f.endswith("_export.txt") or f.endswith("_export.md") or f == "ALL_SOURCE_CODE.md" or ".egg-info" in p.as_posix():
                continue
            rel_path = p.relative_to(root).as_posix()
            lang = LANG_MAP.get(p.suffix.lower(), "text")
            try:
                content = p.read_text(encoding="utf-8")
                raw_bytes = content.encode("utf-8")
                sha256 = hashlib.sha256(raw_bytes).hexdigest()
                byte_size = len(raw_bytes)
                line_count = len(content.splitlines())
            except Exception as e:
                content = f"<에러 발생 또는 바이너리 파일: {e}>"
                sha256 = "N/A"
                byte_size = 0
                line_count = 0
            files_data.append((f, rel_path, lang, content, sha256, byte_size, line_count))

    # Validate against git ls-files
    raw_tracked = cmd(["git", "ls-files"]).splitlines()
    expected_tracked = {
        f.replace("\\", "/") for f in raw_tracked
        if f and not any(Path(f).match(pat) for pat in EXCLUDE_FILES)
        and not any(part in EXCLUDE_DIRS for part in Path(f).parts)
        and not f.endswith(".egg-info")
        and not f.endswith(".whl")
        and not f.endswith(".tgz")
        and not f.endswith(".tar.gz")
        and f != "ALL_SOURCE_CODE.md"
        and not f.startswith("reports/")
        and not f.startswith("scripts/codes/")
    }
    exported_set = {rel_path for _, rel_path, _, _, _, _, _ in files_data}
    missing_files = expected_tracked - exported_set
    if missing_files:
        print(f"[WARN] Tracked files not in export: {sorted(missing_files)}")
    else:
        print(f"[OK] Git tracked files ({len(expected_tracked)}) 100% matched against exported set.")

    # Write TXT export
    with open(out_file_txt, "w", encoding="utf-8") as out:
        out.write(header_txt)
        for f, rel_path, lang, content, sha256, byte_size, line_count in files_data:
            out.write(
                f"{sep}\nFILE_BEGIN\n{sep}\nFILE_NAME: {f}\nFILE_PATH: {rel_path}\n"
                f"FILE_LANGUAGE: {lang}\nFILE_SHA256: {sha256}\nFILE_BYTES: {byte_size}\nFILE_LINES: {line_count}\n"
                f"{sep}\nFILE_CONTENT_BEGIN\n{sep}\n\n"
                f"{content}{'' if content.endswith(chr(10)) else chr(10)}\n"
                f"{sep}\nFILE_CONTENT_END\n{sep}\nFILE_END: {rel_path}\n{sep}\n\n"
            )

    # Write Markdown export
    with open(out_file_md, "w", encoding="utf-8") as out:
        out.write(header_md)
        for f, rel_path, lang, content, sha256, byte_size, line_count in files_data:
            out.write(
                f"### File: `{rel_path}`\n\n"
                f"- **SHA-256**: `{sha256}`\n"
                f"- **Size**: `{byte_size}` bytes\n"
                f"- **Lines**: `{line_count}`\n\n"
                f"```{lang}\n{content}{'' if content.endswith(chr(10)) else chr(10)}```\n\n---\n\n"
            )

    # Write root markdown export for easy access
    with open(root_md, "w", encoding="utf-8") as out:
        out.write(header_md)
        for f, rel_path, lang, content, sha256, byte_size, line_count in files_data:
            out.write(
                f"### File: `{rel_path}`\n\n"
                f"- **SHA-256**: `{sha256}`\n"
                f"- **Size**: `{byte_size}` bytes\n"
                f"- **Lines**: `{line_count}`\n\n"
                f"```{lang}\n{content}{'' if content.endswith(chr(10)) else chr(10)}```\n\n---\n\n"
            )

    print(f"소스코드 TXT 추출 완료: {out_file_txt} (파일 {len(files_data)}개)")
    print(f"소스코드 Markdown (.md) 추출 완료: {out_file_md}")
    print(f"루트 Markdown 복사 완료: {root_md}")

if __name__ == "__main__":
    main()
