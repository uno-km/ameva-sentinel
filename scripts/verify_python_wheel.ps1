# verify_python_wheel.ps1
# Clean isolated virtualenv wheel installation & extras matrix verification
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$tempVenv = Join-Path ([System.IO.Path]::GetTempPath()) ("wheel-test-" + [System.Guid]::NewGuid().ToString("N"))

# Portable Python resolver
$PythonCmd = if ($env:PYTHON) { 
    $env:PYTHON 
} elseif (Get-Command py -ErrorAction SilentlyContinue) { 
    "py -3.12" 
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) { 
    "python3" 
} elseif (Get-Command python -ErrorAction SilentlyContinue) { 
    "python" 
} else { 
    "python" 
}

Write-Host ">>> [PY-WHEEL] Using Python resolver: $PythonCmd"
Set-Location (Join-Path $repoRoot "packages\sentinel-py")

try {
    Write-Host ">>> [PY-WHEEL] Building wheel and sdist for ameva-sentinel..."
    Invoke-Expression "$PythonCmd -m build ."
    if ($LASTEXITCODE -ne 0) { throw "python -m build failed with exit code $LASTEXITCODE" }

    $distDir = Join-Path $repoRoot "packages\sentinel-py\dist"
    $wheel = Get-ChildItem -Path $distDir -Filter "*.whl" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $wheel) { throw "No wheel file found in $distDir" }
    Write-Host ">>> [PY-WHEEL] Found wheel: $($wheel.FullName)"

    Write-Host ">>> [PY-WHEEL] Setting up fresh virtualenv: $tempVenv"
    Invoke-Expression "$PythonCmd -m venv $tempVenv"
    if ($LASTEXITCODE -ne 0) { throw "venv creation failed with exit code $LASTEXITCODE" }

    $isWindowsPlatform = [System.IO.Path]::DirectorySeparatorChar -eq [char]'\'
    $venvPy = if ($isWindowsPlatform) {
        Join-Path $tempVenv "Scripts\python.exe"
    } else {
        Join-Path $tempVenv "bin/python"
    }

    Write-Host ">>> [PY-WHEEL] Installing wheel in clean venv with full extras matrix..."
    & $venvPy -m pip install --upgrade pip --quiet
    & $venvPy -m pip install "$($wheel.FullName)[redis,fastapi,flask,sqlalchemy,yaml]"
    if ($LASTEXITCODE -ne 0) { throw "pip install failed with exit code $LASTEXITCODE" }

    Write-Host ">>> [PY-WHEEL] Verifying installed package location & py.typed marker in isolated directory..."
    $consumerTempDir = Join-Path $tempVenv "consumer_test"
    New-Item -ItemType Directory -Force -Path $consumerTempDir | Out-Null
    $verifyScriptPath = Join-Path $consumerTempDir "verify_smoke.py"
    @'
import sys
import os
import pathlib
import importlib.metadata

# Ensure no repository source pollution
import ameva_sentinel
from ameva_sentinel import (
    Sentinel,
    ActorClaim,
    SentinelCostGuardEvaluator,
    LocalEmergencyBudgetStore,
    RequestCostContext,
    VerifiedPrincipal,
    validate_cost_policy,
    compute_policy_checksum,
    SAFE_FALLBACK_COST_POLICY,
)

version = importlib.metadata.version("ameva-sentinel")
module_path = pathlib.Path(ameva_sentinel.__file__).resolve()

print(f"[WHEEL-TEST] ameva-sentinel version: {version}")
print(f"[WHEEL-TEST] ameva_sentinel module path: {module_path}")

assert version == "2.2.0a1", f"Expected version 2.2.0a1, got {version}"
assert "site-packages" in str(module_path), f"Module must be loaded from isolated site-packages: {module_path}"

# Check py.typed
pkg_dir = module_path.parent
py_typed = pkg_dir / "py.typed"
assert py_typed.exists(), "py.typed marker missing from installed wheel"
print("[WHEEL-TEST] py.typed marker verified successfully.")

# Evaluate in clean venv
evaluator = SentinelCostGuardEvaluator(enforce_by_default=True)
ctx = RequestCostContext(method="GET", path="/health")
dec = evaluator.evaluate_sync(ctx)
assert dec.allowed is True, f"Evaluation failed: {dec}"
print("[WHEEL-TEST] Core evaluation smoke test passed from installed wheel.")

# Verify optional extras imports
from ameva_sentinel.adapters.asgi import SentinelASGIMiddleware
from ameva_sentinel.adapters.wsgi import SentinelWSGIMiddleware
from ameva_sentinel.adapters.fastapi import create_fastapi_cost_guard
from ameva_sentinel.integrations.sqlalchemy_postgres import PostgresSqlAlchemyBudgetGuard
print("[WHEEL-TEST] All optional adapters, integrations, and stores imported cleanly with extras.")
'@ | Set-Content -Path $verifyScriptPath -Encoding utf8

    $oldPythonPath = $env:PYTHONPATH
    try {
        Remove-Item Env:PYTHONPATH -ErrorAction SilentlyContinue
        Push-Location $consumerTempDir
        & $venvPy "verify_smoke.py"
        if ($LASTEXITCODE -ne 0) { throw "verify_smoke.py failed with exit code $LASTEXITCODE" }
    }
    finally {
        Pop-Location
        if ($oldPythonPath) { $env:PYTHONPATH = $oldPythonPath }
    }

    Write-Host "[PASS] Clean virtualenv wheel installation and extras verified completely."

}
finally {
    Set-Location $repoRoot
    if (Test-Path $tempVenv) {
        Write-Host ">>> [PY-WHEEL] Cleaning up temporary virtualenv: $tempVenv"
        Remove-Item -Recurse -Force $tempVenv -ErrorAction SilentlyContinue
    }
}

