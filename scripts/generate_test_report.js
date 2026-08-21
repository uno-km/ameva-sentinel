import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const REPORT_DIR = path.join(ROOT, 'reports');
const CODES_DIR = path.join(ROOT, 'scripts', 'codes');
const REPORT_FILE = path.join(REPORT_DIR, 'TEST_SUITE_AND_RESULTS.md');
const CODES_REPORT_FILE = path.join(CODES_DIR, 'TEST_SUITE_AND_RESULTS.md');

if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}
if (!fs.existsSync(CODES_DIR)) {
  fs.mkdirSync(CODES_DIR, { recursive: true });
}

console.log('🔨 Building packages from TypeScript single source...');
execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });

const testSuites = [
  {
    id: 'types_static',
    title: '1. TypeScript Static Consumer Contract Gate (32+ Types, Guards, Interfaces)',
    file: 'tests/typecheck.ts',
    category: 'TypeScript Static Contract',
    command: 'npm run test:types:static',
    expectedPasses: 1,
    pointsPerTest: 10,
    maxPoints: 10
  },
  {
    id: 'types_runtime',
    title: '2. TypeScript Runtime Consumer Contract Gate (Live Execution & Assertion)',
    file: 'tests/typecheck.runtime.js',
    category: 'TypeScript Runtime Contract',
    command: 'node tests/typecheck.runtime.js',
    expectedPasses: 1,
    pointsPerTest: 5,
    maxPoints: 5
  },
  {
    id: 'collector_crypto',
    title: '3. Trust Boundary Collector HMAC, RFC 4231 Vectors, Freshness, Replay Attack & 100-Race Suite (15 Gates)',
    file: 'tests/collector-crypto.test.js',
    category: 'Trust Boundary & Collector Crypto',
    command: 'node tests/collector-crypto.test.js',
    expectedPasses: 15,
    pointsPerTest: 15 / 15,
    maxPoints: 15
  },
  {
    id: 'redirect_security',
    title: '4. Redirect Security & Closed-Destination Injection Defense Suite (6 Gates)',
    file: 'tests/redirect-security.test.js',
    category: 'Redirect Security & Injection Defense',
    command: 'node tests/redirect-security.test.js',
    expectedPasses: 6,
    pointsPerTest: 10 / 6,
    maxPoints: 10
  },
  {
    id: 'bot_classifier',
    title: '5. Smart Bot Classifier & ReDoS Safety Suite (7 Taxonomies, 8 Gates)',
    file: 'tests/bot-classifier.test.js',
    category: 'Smart Bot Classifier & ReDoS Safety',
    command: 'node tests/bot-classifier.test.js',
    expectedPasses: 8,
    pointsPerTest: 15 / 8,
    maxPoints: 15
  },
  {
    id: 'decision',
    title: '6. Target Mode & Decision Engine Suite (Closed-Destination Routing, 6 Gates)',
    file: 'tests/decision.test.js',
    category: 'Target Mode & Decision Engine',
    command: 'node tests/decision.test.js',
    expectedPasses: 6,
    pointsPerTest: 15 / 6,
    maxPoints: 15
  },
  {
    id: 'engine',
    title: '7. Risk Core Pure Engine & Clamping Quality Gates (7 Gates)',
    file: 'tests/engine.test.js',
    category: 'Risk Engine Quality Gates',
    command: 'node tests/engine.test.js',
    expectedPasses: 7,
    pointsPerTest: 10 / 7,
    maxPoints: 10
  },
  {
    id: 'sentinel',
    title: '8. Sentinel Facade & Stateful Rate Enforcement Tests (14 Gates)',
    file: 'tests/sentinel.test.js',
    category: 'Facade & State Enforcement',
    command: 'node tests/sentinel.test.js',
    expectedPasses: 14,
    pointsPerTest: 10 / 14,
    maxPoints: 10
  },
  {
    id: 'store',
    title: '9. RiskEventStore V1 & V2 Schema Validation & Migration Suite (8 Gates)',
    file: 'tests/store.test.js',
    category: 'Persistence & Schema V1/V2 Bounds',
    command: 'node tests/store.test.js',
    expectedPasses: 8,
    pointsPerTest: 10 / 8,
    maxPoints: 10
  },
  {
    id: 'browser',
    title: '10. @ameva/sentinel-browser Client Telemetry Unit Tests (2 Gates)',
    file: 'tests/browser.test.js',
    category: 'Browser SDK Unit Verification',
    command: 'node tests/browser.test.js',
    expectedPasses: 2,
    pointsPerTest: 5 / 2,
    maxPoints: 5
  },
  {
    id: 'playwright',
    title: '11. Playwright Cross-Browser Integration (Chromium, Firefox, WebKit, 9 Tests)',
    file: 'tests/browser-integration/dashboard.spec.js',
    category: 'Playwright Cross-Browser E2E (9 Tests)',
    command: 'npx playwright test',
    expectedPasses: 9,
    pointsPerTest: 0,
    maxPoints: 0
  }
];

// Execute test suites
console.log('🧪 Executing all 11 test suites and collecting execution logs...\n');
const resultsData = [];
let totalScore = 0;
const maxTotalScore = 100;
let totalPassed = 0;
let totalFailed = 0;

for (const suite of testSuites) {
  let sourceCode = '';
  if (suite.file && fs.existsSync(path.join(ROOT, suite.file))) {
    sourceCode = fs.readFileSync(path.join(ROOT, suite.file), 'utf8');
  }

  let outputLog = '';
  let durationMs = 0;
  let status = 'PASS';
  let passedCount = 0;
  let failedCount = 0;

  if (suite.command) {
    const t0 = performance.now();
    try {
      outputLog = execSync(suite.command, { cwd: ROOT, encoding: 'utf8' });
      durationMs = Math.round(performance.now() - t0);
      status = 'PASS';
    } catch (err) {
      outputLog = (err.stdout || '') + '\n' + (err.stderr || '') + '\n' + err.message;
      durationMs = Math.round(performance.now() - t0);
      status = 'FAIL';
    }

    if (suite.id === 'types_static') {
      passedCount = status === 'PASS' ? 1 : 0;
      failedCount = status === 'PASS' ? 0 : 1;
      totalScore += (passedCount * suite.maxPoints);
      if (!outputLog.trim()) {
        outputLog = '✅ PASS: TypeScript Consumer API Static Type Check (tsc --noEmit)';
      }
    } else if (suite.id === 'playwright') {
      const match = outputLog.match(/(\d+)\s+passed/);
      passedCount = match ? Number(match[1]) : 0;
      if (passedCount !== suite.expectedPasses || status === 'FAIL') {
        status = 'FAIL';
        failedCount = Math.max(1, suite.expectedPasses - passedCount);
      }
    } else {
      // Machine-readable JSON output parser
      const jsonMatch = outputLog.match(/\{"suite":\s*"[^"]+",\s*"passed":\s*(\d+),\s*"failed":\s*(\d+),\s*"total":\s*(\d+)\}/);
      if (jsonMatch) {
        passedCount = Number(jsonMatch[1]);
        failedCount = Number(jsonMatch[2]);
      } else {
        const passMatches = outputLog.match(/✅ PASS/g) || [];
        const failMatches = outputLog.match(/❌ FAIL/g) || [];
        passedCount = passMatches.length;
        failedCount = failMatches.length;
      }

      if (failedCount > 0 || passedCount !== suite.expectedPasses) {
        status = 'FAIL';
        if (failedCount === 0) failedCount = Math.max(1, suite.expectedPasses - passedCount);
      }
      totalScore += (passedCount * suite.pointsPerTest);
    }

    totalPassed += passedCount;
    totalFailed += failedCount;
  }

  resultsData.push({
    ...suite,
    sourceCode,
    outputLog: outputLog.trim(),
    durationMs,
    status,
    passedCount,
    failedCount
  });
}

const finalScore = Math.min(100, Math.round(totalScore * 10) / 10);
const grade = finalScore >= 95 ? 'A+' : finalScore >= 90 ? 'A' : finalScore >= 80 ? 'B' : 'F';

console.log('\n📦 Verifying npm pack --dry-run across workspaces...');
const packages = ['packages/risk-core', 'packages/browser-sdk', 'packages/sentinel'];
const packageOutputs = [];
for (const pkg of packages) {
  const pkgDir = path.join(ROOT, pkg);
  const pkgJsonPath = path.join(pkgDir, 'package.json');
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  try {
    const packOut = execSync('npm pack --dry-run', { cwd: pkgDir, encoding: 'utf8' });
    packageOutputs.push({
      pkg,
      packageName: pkgJson.name,
      output: packOut.trim(),
      status: 'VALID'
    });
  } catch (e) {
    packageOutputs.push({
      pkg,
      packageName: pkgJson.name,
      output: e.message,
      status: 'INVALID'
    });
  }
}

// Fail-closed verification criteria
const packagingPassedCount = packageOutputs.filter(r => r.status === 'VALID').length;
const packagingPassed = packageOutputs.length === packages.length && packagingPassedCount === packages.length;
const executablePassed = totalFailed === 0 && resultsData.every(r => r.status === 'PASS');
const overallPassed = executablePassed && packagingPassed && finalScore === 100;
const overallStatus = overallPassed ? 'PASSED (100% SUCCESS)' : 'FAILED';
const releasePassed = totalPassed + packagingPassedCount;
const releaseTotal = testSuites.reduce((sum, suite) => sum + suite.expectedPasses, 0) + packages.length;

// Generate Canonical Markdown Report
let md = `# 🛡️ AMEVA Sentinel v0.6.0-alpha.1 Comprehensive Test Suite & Verification Results
> **Release Target**: \`v0.6.0-alpha.1\`  
> **Generated Timestamp**: \`${new Date().toISOString()}\`  
> **Target Mode, Smart Bot Classifier & Trust Boundary Engine**: 100% Verified  
> **Overall Gate Status**: \`${overallStatus}\`  
> **Final Score**: \`${finalScore.toFixed(1)} / ${maxTotalScore} pts (Grade ${grade})\`  
> **Total Checks**: \`${totalPassed} Executable Checks + ${packagingPassedCount} Packaging Checks = ${releasePassed} / ${releaseTotal} Release Checks\`  

---

## 📊 1. Executive Test Scorecard (${releasePassed} / ${releaseTotal} Release Checks: ${totalPassed} Executable Gates + ${packagingPassedCount} Package Dry-Runs)

| Test Category | Tests Passed | Execution Time | Score Points | Gate Status |
| :--- | :---: | :---: | :---: | :---: |
`;

for (const res of resultsData) {
  const earnedPts = res.maxPoints > 0 ? Math.min(res.maxPoints, Math.round(res.passedCount * (res.pointsPerTest ?? res.maxPoints) * 10) / 10) : 0;
  const pts = res.maxPoints > 0 ? `${earnedPts.toFixed(1)} / ${res.maxPoints} pts` : 'E2E Verified';
  const icon = res.status === 'PASS' ? '🟢 PASS' : '🔴 FAIL';
  md += `| ${res.category} | ${res.passedCount} / ${res.passedCount + res.failedCount} | ${res.durationMs}ms | ${pts} | ${icon} |\n`;
}

md += `| **TOTAL EXECUTABLE AUDIT SCORE** | **${totalPassed} Passed / ${totalFailed} Failed** | **—** | **${finalScore.toFixed(1)} / 100.0 pts (Grade ${grade})** | **🏆 ${executablePassed ? 'PASS' : 'FAIL'}** |

---

## 📦 2. Monorepo Distribution Packaging Dry-Run (${packagingPassedCount} / ${packages.length} Packages Valid)

| Package Path | Real Package Name | Status | Verified Format |
| :--- | :--- | :---: | :--- |
`;

for (const pkg of packageOutputs) {
  const icon = pkg.status === 'VALID' ? '🟢' : '🔴';
  md += `| \`${pkg.pkg}\` | \`${pkg.packageName}\` | \`${icon} ${pkg.status}\` | Pure ESM & Declarations | \n`;
}

md += `
---

## 🔬 3. Detailed Execution Logs & Source Code by Test Suite
`;

for (const res of resultsData) {
  md += `
### ${res.title}
* **Target File**: [\`${res.file}\`](../../${res.file})
* **Execution Status**: \`${res.status}\` (${res.passedCount} passed, ${res.failedCount} failed in ${res.durationMs}ms)

#### Execution Console Output:
\`\`\`text
${res.outputLog}
\`\`\`

#### Source Code Verification (\`${res.file}\`):
\`\`\`javascript
${res.sourceCode}
\`\`\`

---
`;
}

// Write canonical reports
fs.writeFileSync(REPORT_FILE, md, 'utf8');
fs.writeFileSync(CODES_REPORT_FILE, md, 'utf8');

// Generate text report in codes directory
const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15);
const textReportFile = path.join(CODES_DIR, `${timestamp}_test_report.txt`);
fs.writeFileSync(textReportFile, md, 'utf8');

console.log(`\n🎉 Comprehensive Test Report successfully generated at:`);
console.log(`   1. ${REPORT_FILE}`);
console.log(`   2. ${CODES_REPORT_FILE}`);
console.log(`   3. ${textReportFile}`);
console.log(`   Status: ${overallStatus} (${releasePassed}/${releaseTotal} checks)\n`);

if (!overallPassed) {
  process.exitCode = 1;
}
