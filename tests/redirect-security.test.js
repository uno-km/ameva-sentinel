import assert from 'node:assert';
import { validateRedirectUrl, createSentinel } from '../packages/sentinel/dist/index.js';

console.log('\n🛡️ Running AMEVA Sentinel Redirect Security & Open Redirect Prevention Tests...\n');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
    failedTests++;
  }
}

// 1. Valid URLs (Relative & HTTPS)
runTest('should accept valid relative paths and HTTPS URLs with normalization', () => {
  const rel = validateRedirectUrl('/llms.txt', { allowRelative: true });
  assert.strictEqual(rel.valid, true);
  assert.strictEqual(rel.sanitizedUrl, '/llms.txt');

  const abs = validateRedirectUrl('https://example.com/llms.txt');
  assert.strictEqual(abs.valid, true);
  assert.strictEqual(abs.sanitizedUrl, 'https://example.com/llms.txt');
});

// 2. Reject Dangerous Schemes (javascript:, data:, file:)
runTest('should strictly reject javascript:, data:, file: and other dangerous schemes', () => {
  assert.strictEqual(validateRedirectUrl('javascript:alert(1)').valid, false);
  assert.strictEqual(validateRedirectUrl('data:text/html,<script>alert(1)</script>').valid, false);
  assert.strictEqual(validateRedirectUrl('file:///etc/passwd').valid, false);
  assert.strictEqual(validateRedirectUrl('vbscript:msgbox(1)').valid, false);
});

// 3. Reject Protocol-Relative URLs and Backslashes
runTest('should strictly reject protocol-relative URLs (//) and backslash traversal', () => {
  assert.strictEqual(validateRedirectUrl('//evil.example.com/login').valid, false);
  assert.strictEqual(validateRedirectUrl('/\\evil.example.com/login').valid, false);
  assert.strictEqual(validateRedirectUrl('/login\\..\\evil').valid, false);
});

// 4. Reject CRLF and Control Character Injections
runTest('should strictly reject CRLF and header injection attempts', () => {
  assert.strictEqual(validateRedirectUrl('https://example.com/page\r\nSet-Cookie: session=1').valid, false);
  assert.strictEqual(validateRedirectUrl('https://example.com/page\u0000admin').valid, false);
});

// 5. Reject URLs with Embedded User Credentials
runTest('should reject URLs with embedded user credentials (user:pass@host)', () => {
  const res = validateRedirectUrl('https://admin:secret@attacker.com/login');
  assert.strictEqual(res.valid, false);
  assert.ok(res.error?.includes('user credentials'));
});

// 6. Host Whitelist Enforcement & Constructor-Time Registry Validation
runTest('should enforce allowedHosts whitelist and fail constructor on invalid registry', () => {
  const options = { allowedHosts: ['example.com', 'api.example.com'] };
  
  assert.strictEqual(validateRedirectUrl('https://example.com/bot', options).valid, true);
  assert.strictEqual(validateRedirectUrl('https://api.example.com/bot', options).valid, true);
  
  const untrusted = validateRedirectUrl('https://evil-phishing.com/bot', options);
  assert.strictEqual(untrusted.valid, false);
  assert.ok(untrusted.error?.includes('not in allowed redirect whitelist'));

  // Constructor-time fail-fast validation
  assert.throws(() => {
    createSentinel({
      redirectRegistry: {
        AI_FEED: 'javascript:alert(1)'
      }
    });
  }, /Invalid redirectRegistry URL/);
});

if (failedTests > 0) {
  process.exit(1);
}
console.log(`\n{"suite":"redirect_security","passed":${passedTests},"failed":${failedTests},"total":${passedTests + failedTests}}`);
