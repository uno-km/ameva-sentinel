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
const exportPath = path.join(CODES_DIR, 'source_export.txt');

console.log('🔒 Verifying AMEVA Sentinel Provenance Certificate & Artifact Integrity...');

if (!fs.existsSync(provPath)) {
  console.error(`❌ FAIL: Provenance certificate not found at ${provPath}`);
  process.exit(1);
}

if (!fs.existsSync(exportPath)) {
  console.error(`❌ FAIL: Source export file not found at ${exportPath}`);
  process.exit(1);
}

const prov = JSON.parse(fs.readFileSync(provPath, 'utf8'));
const exportBytes = fs.readFileSync(exportPath);
const computedHash = crypto.createHash('sha256').update(exportBytes).digest('hex');

if (prov.status !== 'PASS') {
  console.error(`❌ FAIL: Provenance certificate status is not PASS: ${prov.status}`);
  process.exit(1);
}

if (prov.sha256 && prov.sha256 !== computedHash) {
  console.error(`❌ FAIL: Hash mismatch! Expected ${prov.sha256}, computed ${computedHash}`);
  process.exit(1);
}

console.log('✅ Provenance Certificate Verified:');
console.log(`   Schema Version: ${prov.schemaVersion}`);
console.log(`   Source Commit: ${prov.sourceCommit}`);
console.log(`   Artifact Path: ${prov.artifactPath}`);
console.log(`   Artifact SHA-256: ${computedHash}`);
console.log(`   Working Tree: ${prov.workingTreeAtExport}`);
console.log(`   Total Release Checks: ${prov.totalChecks} (${prov.status})`);
console.log('🎉 Provenance verification successfully passed.');
