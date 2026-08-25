import assert from 'node:assert';
import {
  createSentinel,
  SentinelAction,
  MemoryRiskEventStore,
  MemoryCounterStore
} from '../packages/sentinel/dist/index.js';

console.log('\n🧪 ========================================================');
console.log('🧪 AMEVA Sentinel 4-Stage Agile Verification Suite');
console.log('🧪 ========================================================\n');

let passedTests = 0;
let failedTests = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failedTests++;
  }
}

async function run() {
  const eventStore = new MemoryRiskEventStore();
  const counterStore = new MemoryCounterStore();
  const sentinel = createSentinel({
    mode: 'shadow',
    eventStore,
    counterStore
  });

  // =========================================================================
  // 1단계 (ㄱ. Playwright 스텔스 모드 직접 진입 검증)
  // =========================================================================
  console.log('\n--- [Stage 1] ㄱ. Playwright Stealth Live Context Verification ---');
  
  await test('1-1. Playwright Stealth: navigator.webdriver=false + SwiftShader WebGL -> HeadlessDeep Triggered & High Score', async () => {
    const playwrightStealthReq = {
      sessionId: 'playwright_stealth_sess_01',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate'
      },
      signals: {
        webdriver: false, // Stealth masked!
        telemetryObserved: true,
        observationDurationMs: 1500, // Short scraper session
        trustedInputCount: 0,
        isHeadlessRenderer: true, // Software WebGL SwiftShader detected by browser-sdk
        headlessEvasionsDetected: true,
        webglRenderer: 'Google SwiftShader (Direct3D11 Synthetic Device)',
        webglVendor: 'Google Inc.',
        burstCount10s: 1
      }
    };

    const report = await sentinel.score(playwrightStealthReq);

    // Triggered rules: headlessDeep(40) + botClassification(35) = 75
    assert.ok(report.score >= 70, `Expected score >= 70, got ${report.score}`);
    assert.strictEqual(report.recommendedAction, SentinelAction.TEMPORARY_DENY);
    assert.strictEqual(report.classification?.triageCategory, 'CRAWLER_TOOL');
    assert.strictEqual(report.classification?.vendorGroup, 'HeadlessDriver');

    const triggeredRules = report.evidence.map(e => e.rule);
    assert.ok(triggeredRules.includes('automation.headless_deep'), 'headlessDeep rule must be triggered');
  });

  // =========================================================================
  // 2단계 (ㄴ. cURL 직접 호출 및 위조 실기 검증)
  // =========================================================================
  console.log('\n--- [Stage 2] ㄴ. cURL Pure & Spoofed Live Call Verification ---');

  await test('2-1. Pure cURL: curl/7.88.1 default CLI call -> CRAWLER_TOOL / CLITool / cURL, Score >= 45', async () => {
    const pureCurlReq = {
      ip: '192.168.1.10',
      url: '/api/v1/documents',
      headers: {
        'user-agent': 'curl/7.88.1',
        'accept': '*/*'
      }
    };

    const report = await sentinel.score(pureCurlReq);

    // Triggered rules: botClassification(35) + suspiciousUA(15) = 50
    assert.ok(report.score >= 45, `Expected score >= 45, got ${report.score}`);
    assert.strictEqual(report.classification?.triageCategory, 'CRAWLER_TOOL');
    assert.strictEqual(report.classification?.vendorGroup, 'CLITool');
    assert.strictEqual(report.classification?.claimedName, 'cURL');
    assert.strictEqual(report.recommendedAction, SentinelAction.REQUIRE_APP_VERIFICATION);
  });

  await test('2-2. Spoofed cURL: curl -A "Mozilla/5.0..." without browser Sec-Fetch headers -> httpMissingHeaders Triggered', async () => {
    const spoofedCurlReq = {
      ip: '192.168.1.11',
      url: '/docs/architecture',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'accept': '*/*'
        // Missing sec-fetch-dest, sec-fetch-mode, sec-ch-ua, accept-language
      }
    };

    const report = await sentinel.score(spoofedCurlReq);

    // Triggered rules: httpMissingHeaders(35) + botClassification(35) = 70
    assert.ok(report.score >= 60, `Expected score >= 60, got ${report.score}`);
    assert.strictEqual(report.classification?.triageCategory, 'CRAWLER_TOOL');
    assert.strictEqual(report.classification?.vendorGroup, 'CLITool');
    
    const triggeredRules = report.evidence.map(e => e.rule);
    assert.ok(triggeredRules.includes('header.http_missing_headers'), 'httpMissingHeaders rule must be triggered');
  });

  // =========================================================================
  // 3단계 (ㄷ. AI 에이전트 직접 호출 & 무-JS 서버 사이드 발자취 검증)
  // =========================================================================
  console.log('\n--- [Stage 3] ㄷ. AI Agent Direct Call & Server-side Footprint Synthesis ---');

  await test('3-1. AI Agent Call: GPTBot / ClaudeBot without JS -> Synthesized Footprint & AI_AGENT Triage', async () => {
    const gptBotReq = {
      ip: '20.15.100.25',
      url: '/llms.txt',
      headers: {
        'user-agent': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)',
        'x-country-code': 'US'
      }
    };

    const claudeBotReq = {
      ip: '54.210.88.99',
      url: '/llms.txt',
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
        'x-country-code': 'US'
      }
    };

    const gptReport = await sentinel.score(gptBotReq);
    const claudeReport = await sentinel.score(claudeBotReq);

    assert.strictEqual(gptReport.classification?.triageCategory, 'AI_AGENT');
    assert.strictEqual(gptReport.classification?.vendorGroup, 'OpenAI');
    assert.strictEqual(gptReport.signals?.customSignals?.webglRenderer, 'server-http-client');

    assert.strictEqual(claudeReport.classification?.triageCategory, 'AI_AGENT');
    assert.strictEqual(claudeReport.classification?.vendorGroup, 'Anthropic');

    // Verify stored events in EventStore
    const storedEvents = await eventStore.list();
    assert.ok(storedEvents.length >= 2, 'Stored events must include synthesized AI agent footprints');
  });

  // =========================================================================
  // 4단계 (ㄹ. VPN / 데이터센터 세션 검증 & 대시보드 3대 분류 집계)
  // =========================================================================
  console.log('\n--- [Stage 4] ㄹ. VPN / Datacenter Persona & Dashboard 3-Way Triage Analytics ---');

  await test('4-1. Datacenter / VPN session -> DATACENTER_PROXY persona & Correct Triage Breakdown', async () => {
    const vpnFootprint = {
      visitorId: 'vpn_visitor_01',
      country: 'VPN',
      city: 'Frankfurt',
      webglRenderer: 'unknown',
      totalVisitCount: 3,
      pastPathsHistory: '/login -> /dashboard'
    };

    const verdict = sentinel.profileFootprint(vpnFootprint);
    assert.strictEqual(verdict.persona, 'DATACENTER_PROXY');
    assert.ok(verdict.tags.includes('VPN_Exit_Node'));

    // Test Complete Dashboard Analytics with 3-way Triage
    const analytics = sentinel.getForensicAnalytics({
      events: await eventStore.list(),
      footprints: [
        vpnFootprint,
        {
          visitorId: 'human_dev_01',
          installedFonts: 'D2Coding, Cascadia Code',
          webglRenderer: 'NVIDIA GeForce RTX 4090',
          pastPathsHistory: '/docs -> /api'
        }
      ]
    });

    assert.ok(analytics.triageBreakdown, 'triageBreakdown must exist in analytics report');
    assert.ok(analytics.triageBreakdown.aiAgent.total >= 2, `Expected aiAgent >= 2, got ${analytics.triageBreakdown.aiAgent.total}`);
    assert.ok(analytics.triageBreakdown.crawlerTool.total >= 2, `Expected crawlerTool >= 2, got ${analytics.triageBreakdown.crawlerTool.total}`);
    assert.ok(analytics.triageBreakdown.human.total >= 1, `Expected human >= 1, got ${analytics.triageBreakdown.human.total}`);

    console.log('\n📊 Aggregated 3-Way Triage Breakdown Snapshot:');
    console.log('   👤 Human Visitors:    ', analytics.triageBreakdown.human.total, JSON.stringify(analytics.triageBreakdown.human));
    console.log('   🤖 AI Agents & LLMs:  ', analytics.triageBreakdown.aiAgent.total, JSON.stringify(analytics.triageBreakdown.aiAgent.byVendor));
    console.log('   🕷️ Crawlers & Tools:  ', analytics.triageBreakdown.crawlerTool.total, JSON.stringify(analytics.triageBreakdown.crawlerTool.byTool));
  });

  if (failedTests > 0) {
    process.exit(1);
  }

  console.log(`\n🎉 ALL 4-STAGE AGILE LIVE VERIFICATIONS COMPLETED SUCCESSFULLY! (${passedTests} passed, 0 failed)\n`);
}

run();
