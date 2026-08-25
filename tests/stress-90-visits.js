import assert from 'node:assert';
import {
  createSentinel,
  MemoryRiskEventStore,
  MemoryCounterStore
} from '../packages/sentinel/dist/index.js';

console.log('\n🧪 ========================================================');
console.log('🧪 AMEVA Sentinel 90-Hit Stress & Footprint Live Audit');
console.log('🧪 Target: 30 AI Agents + 30 VPN Sessions + 30 Crawlers');
console.log('🧪 ========================================================\n');

async function runLiveStressAudit() {
  const eventStore = new MemoryRiskEventStore();
  const counterStore = new MemoryCounterStore();
  const sentinel = createSentinel({
    mode: 'shadow',
    eventStore,
    counterStore
  });

  // 1. Measure As-Is Baseline Visitor / Event Count
  const asIsEvents = await eventStore.list();
  const asIsCount = asIsEvents.length;
  console.log(`📊 [AS-IS Baseline] Total Events in Store: ${asIsCount}`);

  // 2. Execute 30 AI Agent Calls
  console.log('\n🤖 [Batch 1] Sending 30 AI Agent Calls (GPTBot, ClaudeBot, Perplexity, DeepSeek, etc.)...');
  const aiVendorsList = [
    { ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)', name: 'OpenAI GPTBot' },
    { ua: 'Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)', name: 'Anthropic ClaudeBot' },
    { ua: 'Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/bot)', name: 'Perplexity' },
    { ua: 'Mozilla/5.0 (compatible; Google-Extended/1.0; +https://developers.google.com/search/docs/crawling-indexing/overview-google-extended)', name: 'Google-Extended' },
    { ua: 'Mozilla/5.0 (compatible; Bytespider; spider-feedback@bytedance.com)', name: 'ByteDance Bytespider' },
    { ua: 'Mozilla/5.0 (compatible; DeepSeek-Bot/1.0; +https://deepseek.com)', name: 'DeepSeek' }
  ];

  for (let i = 1; i <= 30; i++) {
    const v = aiVendorsList[(i - 1) % aiVendorsList.length];
    const req = {
      ip: `198.51.100.${i}`,
      sessionId: `ai_sess_${i}_${Date.now()}`,
      url: `/llms.txt?query=item_${i}`,
      headers: {
        'user-agent': v.ua,
        'x-country-code': 'US'
      }
    };
    await sentinel.score(req);
  }
  const afterAiCount = (await eventStore.list()).length;
  console.log(`   -> AI Batch Complete: Stored Events = ${afterAiCount} (+${afterAiCount - asIsCount})`);

  // 3. Execute 30 VPN / Datacenter Proxy Sessions
  console.log('\n🌐 [Batch 2] Sending 30 VPN / Datacenter Sessions (Exit Nodes, Frankfurt, Dublin, etc.)...');
  for (let i = 1; i <= 30; i++) {
    const cities = ['Frankfurt', 'Dublin', 'Ashburn', 'Dallas', 'Amsterdam', 'Tokyo'];
    const city = cities[(i - 1) % cities.length];
    const req = {
      ip: `185.220.101.${i}`,
      sessionId: `vpn_sess_${i}_${Date.now()}`,
      url: `/portal/dashboard?tab=${i}`,
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
        'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'x-country-code': 'VPN',
        'cf-ipcity': city
      },
      signals: {
        telemetryObserved: true,
        observationDurationMs: 4000,
        trustedInputCount: 4,
        totalVisitCount: 3,
        webglRenderer: 'unknown',
        burstCount10s: 1
      }
    };
    await sentinel.score(req);
  }
  const afterVpnCount = (await eventStore.list()).length;
  console.log(`   -> VPN Batch Complete: Stored Events = ${afterVpnCount} (+${afterVpnCount - afterAiCount})`);

  // 4. Execute 30 Crawlers & Automated Tools (Playwright Stealth, cURL, Python)
  console.log('\n🕷️ [Batch 3] Sending 30 Crawlers & Automated Tools (Playwright Stealth, cURL, Scrapy)...');
  for (let i = 1; i <= 30; i++) {
    let req;
    if (i % 3 === 1) {
      // Playwright Stealth
      req = {
        ip: `10.0.0.${i}`,
        sessionId: `playwright_stealth_${i}_${Date.now()}`,
        url: `/api/v1/extract?page=${i}`,
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          'sec-ch-ua': '"Chromium";v="128"'
        },
        signals: {
          webdriver: false, // Stealth evasion
          isHeadlessRenderer: true,
          headlessEvasionsDetected: true,
          webglRenderer: 'Google SwiftShader (Direct3D11 Synthetic Device)',
          webglVendor: 'Google Inc.',
          telemetryObserved: true,
          observationDurationMs: 1200,
          trustedInputCount: 0,
          burstCount10s: 1
        }
      };
    } else if (i % 3 === 2) {
      // Pure cURL
      req = {
        ip: `10.0.1.${i}`,
        sessionId: `curl_pure_${i}_${Date.now()}`,
        url: `/api/v2/items/${i}`,
        headers: {
          'user-agent': `curl/7.88.${i % 10}`,
          'accept': '*/*'
        }
      };
    } else {
      // Spoofed cURL (Chrome UA without Sec-Fetch)
      req = {
        ip: `10.0.2.${i}`,
        sessionId: `curl_spoofed_${i}_${Date.now()}`,
        url: `/docs/page_${i}`,
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          'accept': '*/*'
        }
      };
    }
    await sentinel.score(req);
  }
  const tobeCount = (await eventStore.list()).length;
  console.log(`   -> Crawler Batch Complete: Stored Events = ${tobeCount} (+${tobeCount - afterVpnCount})`);

  // 5. Audit Analytics and 3-Way Triage Breakdown
  const allStoredEvents = await eventStore.list();
  const analytics = sentinel.getForensicAnalytics({
    events: allStoredEvents
  });

  const delta = tobeCount - asIsCount;

  console.log('\n================================================================');
  console.log('📈 FINAL 90-VISIT STRESS AUDIT VERIFICATION REPORT');
  console.log('================================================================');
  console.log(`📌 As-Is Total Events:  ${asIsCount}`);
  console.log(`📌 To-Be Total Events:  ${tobeCount}`);
  console.log(`📌 Total Increment (Δ): +${delta} (Exact Target: +90)`);
  console.log('----------------------------------------------------------------');
  console.log('📊 3-WAY TRIAGE CATEGORY BREAKDOWN:');
  console.log(`   🤖 1. AI Agents & LLMs Total:  ${analytics.triageBreakdown.aiAgent.total} / 30`);
  console.log(`      └─ By Vendor: ${JSON.stringify(analytics.triageBreakdown.aiAgent.byVendor)}`);
  console.log(`   🌐 2. VPN / Datacenter Proxies: ${analytics.overview.botCount + analytics.overview.powerUserCount + analytics.overview.standardCount} sessions tracked`);
  console.log(`   🕷️ 3. Crawlers & CLI Tools:     ${analytics.triageBreakdown.crawlerTool.total} / 30`);
  console.log(`      └─ By Tool:   ${JSON.stringify(analytics.triageBreakdown.crawlerTool.byTool)}`);
  console.log('================================================================\n');

  assert.strictEqual(delta, 90, `FAILED: Expected total increment of 90, got ${delta}`);
  assert.strictEqual(analytics.triageBreakdown.aiAgent.total, 30, `FAILED: Expected 30 AI Agents, got ${analytics.triageBreakdown.aiAgent.total}`);
  assert.strictEqual(analytics.triageBreakdown.crawlerTool.total, 30, `FAILED: Expected 30 Crawlers, got ${analytics.triageBreakdown.crawlerTool.total}`);

  console.log('🏆 100% PROVEN: As-Is 대비 정확히 +90 방문자 수가 스토어 및 대시보드 집계 엔진에 완벽히 기록되었습니다!');
}

runLiveStressAudit();
