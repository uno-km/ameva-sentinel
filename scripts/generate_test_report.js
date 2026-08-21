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
    id: 'types',
    title: '1. TypeScript Consumer API Contract Gate',
    file: 'tests/typecheck.ts',
    category: 'TypeScript Consumer API Contract',
    command: 'npm run test:types',
    pointsPerTest: 15,
    maxPoints: 15
  },
  {
    id: 'engine',
    title: '2. Risk Core Engine & Boundary Quality Gate Tests',
    file: 'tests/engine.test.js',
    category: 'Risk Engine Quality Gates',
    command: 'node tests/engine.test.js',
    pointsPerTest: 30 / 7,
    maxPoints: 30
  },
  {
    id: 'sentinel',
    title: '3. Sentinel Facade & Stateful Rate Enforcement Tests',
    file: 'tests/sentinel.test.js',
    category: 'Facade & State Enforcement',
    command: 'node tests/sentinel.test.js',
    pointsPerTest: 25 / 3,
    maxPoints: 25
  },
  {
    id: 'store',
    title: '4. RiskEventStore Persistence & Deep Schema Validation Tests',
    file: 'tests/store.test.js',
    category: 'Persistence & Deep Schema Bounds',
    command: 'node tests/store.test.js',
    pointsPerTest: 15 / 7,
    maxPoints: 15
  },
  {
    id: 'browser',
    title: '5. @ameva/sentinel-browser Client Telemetry Unit Tests',
    file: 'tests/browser.test.js',
    category: 'Browser SDK Unit Verification',
    command: 'node tests/browser.test.js',
    pointsPerTest: 15 / 2,
    maxPoints: 15
  },
  {
    id: 'playwright',
    title: '6. Playwright Real-Browser Cross-Browser Integration (Chromium, Firefox, WebKit)',
    file: 'tests/browser-integration/dashboard.spec.js',
    category: 'Playwright Cross-Browser E2E (9 Tests)',
    command: 'npx playwright test',
    pointsPerTest: 0,
    maxPoints: 0
  }
];

let totalScore = 0;
const maxTotalScore = 100;
let totalPassed = 0;
let totalFailed = 0;
const resultsData = [];

console.log('\n🧪 Executing all test suites and collecting execution logs...\n');

for (const suite of testSuites) {
  const filePath = path.join(ROOT, suite.file);
  const sourceCode = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '// File not found';

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

    if (suite.id === 'types') {
      passedCount = status === 'PASS' ? 1 : 0;
      failedCount = status === 'PASS' ? 0 : 1;
      totalScore += (passedCount * suite.maxPoints);
      if (!outputLog.trim()) {
        outputLog = '✅ PASS: TypeScript Consumer API Contract & Type Resolution (tsc --noEmit)';
      }
    } else if (suite.id === 'playwright') {
      const match = outputLog.match(/(\d+)\s+passed/);
      passedCount = match ? Number(match[1]) : 0;
      if (passedCount !== 9 || status === 'FAIL') {
        status = 'FAIL';
        failedCount = Math.max(1, 9 - passedCount);
      }
    } else {
      const passMatches = outputLog.match(/✅ PASS/g) || [];
      const failMatches = outputLog.match(/❌ FAIL/g) || [];
      passedCount = passMatches.length;
      failedCount = failMatches.length;
      if (failedCount > 0) {
        status = 'FAIL';
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

// 6. Verify npm pack --dry-run for all 3 workspaces
console.log('📦 Verifying npm pack --dry-run across workspaces...');
let packLog = '';
try {
  const packCore = execSync('npm pack --dry-run --workspace @ameva/sentinel-risk-core', { cwd: ROOT, encoding: 'utf8' });
  const packBrowser = execSync('npm pack --dry-run --workspace @ameva/sentinel-browser', { cwd: ROOT, encoding: 'utf8' });
  const packSentinel = execSync('npm pack --dry-run --workspace @ameva/sentinel', { cwd: ROOT, encoding: 'utf8' });
  packLog = [packCore, packBrowser, packSentinel].join('\n---\n');
} catch (e) {
  packLog = e.message;
}

// Determine final dynamic audit verdict
const allPassed = totalFailed === 0 && resultsData.every(r => r.status === 'PASS');
const grade = allPassed ? 'Grade A+' : 'Grade F';
const finalStatus = allPassed ? '🏆 100% PASS' : '🔴 QUALITY GATE FAILED';

// Generate Markdown Document
const now = new Date();
const pad = (n, len = 2) => String(n).padStart(len, '0');
const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}_${pad(now.getMilliseconds(), 3)}`;
const timestampedFile = path.join(CODES_DIR, `${timestamp}_test_report.txt`);

const lines = [];

lines.push('# 🛡️ AMEVA-Sentinel — Comprehensive Test Suite & Execution Results Report\n');
lines.push(`> **Generated At**: \`${now.toISOString()}\`  `);
lines.push(`> **Repository**: [https://github.com/uno-km/ameva-sentinel.git](https://github.com/uno-km/ameva-sentinel.git)  `);
lines.push(`> **Monorepo Version**: \`0.5.0-alpha.1\`  `);
lines.push(`> **Execution Engine**: Node.js \`${process.version}\` on \`${process.platform}\`\n`);

lines.push('---\n');
lines.push('## 📊 0-Point Baseline Executive Scorecard\n');
lines.push('| Test Category | Tests Passed | Execution Time | Score Points | Status |');
lines.push('| :--- | :---: | :---: | :---: | :---: |');

for (const res of resultsData) {
  if (res.id === 'playwright') {
    lines.push(`| **${res.category}** | \`${res.passedCount} / ${res.passedCount + res.failedCount}\` | \`${res.durationMs}ms\` | **E2E Verified** | ${res.status === 'PASS' ? '🟢 PASS' : '🔴 FAIL'} |`);
  } else {
    const pts = (res.passedCount * res.pointsPerTest).toFixed(1);
    lines.push(`| **${res.category}** | \`${res.passedCount} / ${res.passedCount + res.failedCount}\` | \`${res.durationMs}ms\` | **${pts} / ${res.maxPoints} pts** | ${res.status === 'PASS' ? '🟢 PASS' : '🔴 FAIL'} |`);
  }
}

lines.push(`| **TOTAL AUDIT SCORE** | **${totalPassed} Passed / ${totalFailed} Failed** | **—** | **${Math.min(100, totalScore).toFixed(1)} / ${maxTotalScore} pts (${grade})** | ${finalStatus} |\n`);

lines.push('---\n');
lines.push('## 📑 Test Suites Index\n');
for (const res of resultsData) {
  lines.push(`- [${res.title}](#${res.id})`);
}
lines.push('- [6. Workspace Distribution & Packaging Verification (`npm pack --dry-run`)](#packaging)');
lines.push('\n---\n');

for (const res of resultsData) {
  lines.push(`<a id="${res.id}"></a>`);
  lines.push(`## ${res.title}\n`);
  lines.push(`- **Test File Path**: [\`${res.file}\`](../${res.file})`);
  if (res.command) {
    lines.push(`- **Execution Command**: \`${res.command}\``);
    lines.push(`- **Execution Latency**: \`${res.durationMs} ms\``);
    lines.push(`- **Results**: \`${res.passedCount} Passed, ${res.failedCount} Failed\``);
  }
  lines.push('\n### 📄 Test Source Code\n');
  lines.push('```javascript');
  lines.push(res.sourceCode);
  lines.push('```\n');

  lines.push('### 🖥️ Actual Execution Output & Assertion Logs\n');
  lines.push('```text');
  lines.push(res.outputLog);
  lines.push('```\n');
  lines.push('---\n');
}

// Section 6: Packaging dry run output
lines.push('<a id="packaging"></a>');
lines.push('## 6. Workspace Distribution & Packaging Verification (`npm pack --dry-run`)\n');
lines.push('```text');
lines.push(packLog.trim());
lines.push('```\n');

const content = lines.join('\n');

// 1. Save canonical report in reports/
fs.writeFileSync(REPORT_FILE, content, 'utf8');

// 2. Save in scripts/codes/ for quick user access
fs.writeFileSync(CODES_REPORT_FILE, content, 'utf8');
fs.writeFileSync(timestampedFile, content, 'utf8');

console.log(`\n🎉 Comprehensive Test Report successfully generated at:`);
console.log(`   1. ${REPORT_FILE}`);
console.log(`   2. ${CODES_REPORT_FILE}`);
console.log(`   3. ${timestampedFile}\n`);

if (!allPassed) {
  console.error(`❌ Quality gate failed: ${totalFailed} test(s) failed.`);
  process.exitCode = 1;
}
