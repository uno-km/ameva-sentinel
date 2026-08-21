import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const REPORT_DIR = path.join(ROOT, 'reports');
const CODES_DIR = path.join(ROOT, 'scripts', 'codes');
const provPath = path.join(REPORT_DIR, 'provenance.json');
const codesProvPath = path.join(CODES_DIR, 'provenance.json');

const EXPECTED_SCHEMA = '1.0';
const EXPECTED_ARTIFACT = 'scripts/codes/source_export.txt';
const EXPECTED_TOTAL_CHECKS = 86;
const GIT_SHA_RE = /^[a-f0-9]{40}$/;
const SHA256_RE = /^[a-f0-9]{64}$/;

function fail(message) {
  console.error(`❌ FAIL: ${message}`);
  process.exit(1);
}

console.log('🔒 Verifying AMEVA Sentinel Provenance Certificate & Artifact Integrity...');

// 1. Check file existence
if (!fs.existsSync(provPath)) {
  fail(`Provenance certificate not found at ${provPath}`);
}
if (!fs.existsSync(codesProvPath)) {
  fail(`Mirror provenance certificate not found at ${codesProvPath}`);
}

// 2. Verify mirror equality (byte-for-byte)
const reportProvBytes = fs.readFileSync(provPath);
const codesProvBytes = fs.readFileSync(codesProvPath);
if (!reportProvBytes.equals(codesProvBytes)) {
  fail('Provenance mirror mismatch between reports/provenance.json and scripts/codes/provenance.json');
}

// 3. Parse and validate provenance certificate schema and contents
let prov;
try {
  prov = JSON.parse(reportProvBytes.toString('utf8'));
} catch (e) {
  fail(`Malformed JSON in provenance certificate: ${e.message}`);
}

if (prov.schemaVersion !== EXPECTED_SCHEMA) {
  fail(`Unsupported schemaVersion: ${prov.schemaVersion} (expected: ${EXPECTED_SCHEMA})`);
}

if (prov.artifactPath !== EXPECTED_ARTIFACT) {
  fail(`Unexpected artifactPath: ${prov.artifactPath} (expected: ${EXPECTED_ARTIFACT})`);
}

// Ensure artifactPath does not escape repository root
const declaredArtifact = path.resolve(ROOT, prov.artifactPath);
const rootPrefix = ROOT.endsWith(path.sep) ? ROOT : ROOT + path.sep;
if (declaredArtifact !== ROOT && !declaredArtifact.startsWith(rootPrefix)) {
  fail(`artifactPath escapes repository root: ${prov.artifactPath}`);
}
if (declaredArtifact !== path.resolve(ROOT, EXPECTED_ARTIFACT)) {
  fail(`Resolved artifactPath mismatch: ${declaredArtifact}`);
}
if (!fs.existsSync(declaredArtifact)) {
  fail(`Source export file not found at ${declaredArtifact}`);
}

// Validate sourceCommit is a valid 40-char git commit SHA
if (typeof prov.sourceCommit !== 'string' || !GIT_SHA_RE.test(prov.sourceCommit)) {
  fail(`Invalid sourceCommit: "${prov.sourceCommit}" (must be 40-character lowercase hexadecimal Git SHA)`);
}

// Validate SHA-256 hash existence and format
if (typeof prov.sha256 !== 'string' || !SHA256_RE.test(prov.sha256)) {
  fail(`Missing or invalid provenance SHA-256 string: "${prov.sha256}"`);
}

// Validate workingTreeAtExport is CLEAN
if (prov.workingTreeAtExport !== 'CLEAN') {
  fail(`Release export must be CLEAN, got "${prov.workingTreeAtExport}"`);
}

// Validate totalChecks and passedChecks
if (!Number.isSafeInteger(prov.totalChecks) || prov.totalChecks !== EXPECTED_TOTAL_CHECKS) {
  fail(`Invalid totalChecks: ${prov.totalChecks} (expected: ${EXPECTED_TOTAL_CHECKS})`);
}
if (!Number.isSafeInteger(prov.passedChecks) || prov.passedChecks !== prov.totalChecks) {
  fail(`Not all checks passed: ${prov.passedChecks} / ${prov.totalChecks}`);
}

// Validate status
if (prov.status !== 'PASS') {
  fail(`Provenance certificate status is not PASS: "${prov.status}"`);
}

// Validate timestamp
if (typeof prov.timestamp !== 'string' || !Number.isFinite(Date.parse(prov.timestamp))) {
  fail(`Invalid ISO-8601 timestamp: "${prov.timestamp}"`);
}

// 4. Compute and compare SHA-256 hash using crypto.timingSafeEqual
const exportBytes = fs.readFileSync(declaredArtifact);
const computedHash = crypto.createHash('sha256').update(exportBytes).digest('hex');

const expectedHashBuf = Buffer.from(prov.sha256, 'hex');
const computedHashBuf = Buffer.from(computedHash, 'hex');

if (expectedHashBuf.length !== computedHashBuf.length || !crypto.timingSafeEqual(expectedHashBuf, computedHashBuf)) {
  fail(`Hash mismatch! Expected ${prov.sha256}, computed ${computedHash}`);
}

console.log('✅ Provenance Certificate Fully Verified (Fail-Closed Validated):');
console.log(`   Schema Version     : ${prov.schemaVersion}`);
console.log(`   Source Commit      : ${prov.sourceCommit}`);
console.log(`   Artifact Path      : ${prov.artifactPath}`);
console.log(`   Artifact SHA-256   : ${computedHash}`);
console.log(`   Working Tree State : ${prov.workingTreeAtExport}`);
console.log(`   Release Quality    : ${prov.passedChecks}/${prov.totalChecks} Quality Gates (STATUS: ${prov.status})`);
console.log(`   Timestamp          : ${prov.timestamp}`);
console.log('🎉 Provenance verification successfully passed.');
