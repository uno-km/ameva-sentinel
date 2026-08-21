import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

console.log('🚀 Initiating Fail-Closed Cross-Platform Release Verification Pipeline...');

// 1. Determine Python command
const pythonCandidates =
  process.platform === 'win32'
    ? [['py', []], ['python', []], ['python3', []]]
    : [['python3', []], ['python', []]];

let exported = false;
for (const [command, args] of pythonCandidates) {
  const result = spawnSync(
    command,
    [...args, path.join('scripts', 'export_source_code.py')],
    { cwd: ROOT, stdio: 'inherit', shell: false }
  );
  if (result.status === 0) {
    exported = true;
    break;
  }
}

if (!exported) {
  console.error('❌ FAIL: Unable to execute Python source export script across candidate binaries.');
  process.exit(1);
}

// 2. Run Test Report Generator and Provenance Verifier
const steps = [
  { name: 'Generate Test Report & Summary', cmd: 'node', args: ['scripts/generate_test_report.js'] },
  { name: 'Verify Provenance Certificate', cmd: 'node', args: ['scripts/verify_provenance.js'] }
];

for (const step of steps) {
  console.log(`\n▶️ Executing: ${step.name}...`);
  const result = spawnSync(step.cmd, step.args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: false
  });
  if (result.status !== 0) {
    console.error(`❌ FAIL: Step "${step.name}" failed with exit code ${result.status ?? 1}`);
    process.exit(result.status ?? 1);
  }
}

console.log('\n🏆 Single-Entry Release Verification Pipeline Succeeded (100% PASS).');
