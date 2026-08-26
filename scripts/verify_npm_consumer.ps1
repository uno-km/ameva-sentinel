# verify_npm_consumer.ps1
# Clean isolated consumer packaging & subpath import static/runtime verification
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$smokeDir = Join-Path ([System.IO.Path]::GetTempPath()) ("sentinel-npm-smoke-" + [System.Guid]::NewGuid().ToString("N"))

try {
    Write-Host ">>> [NPM-SMOKE] Building workspace packages..."
    Set-Location $repoRoot
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build failed with exit code $LASTEXITCODE" }

    Write-Host ">>> [NPM-SMOKE] Packing tarballs..."
    New-Item -ItemType Directory -Force $smokeDir | Out-Null
    npm pack --workspace=@ameva/sentinel-risk-core --pack-destination=$smokeDir | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "npm pack risk-core failed" }
    npm pack --workspace=@ameva/sentinel-browser --pack-destination=$smokeDir | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "npm pack browser failed" }
    npm pack --workspace=@ameva/sentinel-store-redis --pack-destination=$smokeDir | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "npm pack store-redis failed" }
    npm pack --workspace=@ameva/sentinel --pack-destination=$smokeDir | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "npm pack sentinel failed" }

    Set-Location $smokeDir
    Write-Host ">>> [NPM-SMOKE] Initializing isolated test project in $smokeDir..."
    npm init -y | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "npm init failed" }

    $riskCoreTgz = Get-ChildItem -Path $smokeDir -Filter "*risk-core*.tgz" | Select-Object -First 1
    $browserTgz = Get-ChildItem -Path $smokeDir -Filter "*browser*.tgz" | Select-Object -First 1
    $storeRedisTgz = Get-ChildItem -Path $smokeDir -Filter "*store-redis*.tgz" | Select-Object -First 1
    $sentinelTgz = Get-ChildItem -Path $smokeDir -Filter "*sentinel-*.tgz" | Where-Object { $_.Name -notmatch "risk-core|store-redis|browser" } | Select-Object -First 1

    npm install $riskCoreTgz.FullName | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "npm install risk-core failed" }
    npm install $browserTgz.FullName | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "npm install browser failed" }
    npm install $storeRedisTgz.FullName | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "npm install store-redis failed" }
    npm install $sentinelTgz.FullName | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "npm install sentinel failed" }
    npm install --save-dev typescript @types/node | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "npm install typescript failed" }

    $smokeCode = @"
import assert from 'node:assert/strict';
import { createSentinel } from '@ameva/sentinel';
import { createExpressCostGuard } from '@ameva/sentinel/express';
import { createFastifyCostGuard } from '@ameva/sentinel/fastify';
import { createNextCostGuard } from '@ameva/sentinel/next';
import { createBrowserTelemetry } from '@ameva/sentinel-browser';
import {
  SentinelCostGuardEvaluator,
  LocalEmergencyBudgetStore,
  validateCostPolicy,
  canonicalizePolicyJson,
  computePolicyChecksum,
  SAFE_FALLBACK_COST_POLICY
} from '@ameva/sentinel-risk-core';
import { RedisTokenBucketStore } from '@ameva/sentinel-store-redis';

// 1. Facade & Adapter Smoke Test
const sentinel = createSentinel({ mode: 'shadow' });
assert.ok(sentinel, 'Sentinel instance created successfully');
assert.equal(typeof createExpressCostGuard, 'function');
assert.equal(typeof createFastifyCostGuard, 'function');
assert.equal(typeof createNextCostGuard, 'function');

// 2. Browser Telemetry Smoke Test
assert.equal(typeof createBrowserTelemetry, 'function');
const telemetry = createBrowserTelemetry({ autoStart: false });
assert.ok(telemetry, 'Browser telemetry created successfully');

// 3. Risk-Core Pure Evaluator & Emergency Fallback
const evaluator = new SentinelCostGuardEvaluator({ enforceByDefault: true });
const decision = await evaluator.evaluate({
  method: 'GET',
  path: '/health'
});
assert.equal(decision.allowed, true);
assert.equal(decision.action, 'ALLOW');

console.log('[SMOKE] 1. Root, Browser and Subpath Runtime Imports Successful');
console.log('[SMOKE] 2. Runtime Evaluation & Subpath Factories Verified');
"@

    Set-Content -Path (Join-Path $smokeDir "smoke.mjs") -Value $smokeCode -Encoding utf8

    Write-Host ">>> [NPM-SMOKE] Running isolated Node runtime smoke test..."
    node (Join-Path $smokeDir "smoke.mjs")
    if ($LASTEXITCODE -ne 0) { throw "node smoke.mjs failed with exit code $LASTEXITCODE" }

    Write-Host "[PASS] Clean consumer installation and subpath verification for all 4 packages completed successfully."

}
finally {
    Set-Location $repoRoot
    if (Test-Path $smokeDir) {
        Write-Host ">>> [NPM-SMOKE] Cleaning up temporary smoke test directory: $smokeDir"
        Remove-Item -Recurse -Force $smokeDir -ErrorAction SilentlyContinue
    }
}

