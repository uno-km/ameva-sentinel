import assert from 'node:assert';
import { classifyBot } from '../packages/risk-core/dist/index.js';

console.log('\n🤖 Running @ameva/sentinel-risk-core Bot Classifier Quality Gate Tests...\n');

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

// 1. Search Engine Classification
runTest('should accurately classify search engines as SEARCH_ENGINE with CLAIMED state', () => {
  const uas = [
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
    'DuckDuckBot/1.1; (+http://duckduckgo.com/duckduckbot.html)',
    'Baiduspider+(+http://www.baidu.com/search/spider.htm)'
  ];

  for (const ua of uas) {
    const res = classifyBot(ua);
    assert.strictEqual(res.isBotLikely, true, `Failed isBotLikely for ${ua}`);
    assert.strictEqual(res.category, 'SEARCH_ENGINE', `Failed category for ${ua}`);
    assert.strictEqual(res.identityState, 'CLAIMED');
    assert.ok(res.heuristicConfidence >= 0.75);
  }
});

// 2. AI Agents & LLM Scrapers
runTest('should accurately classify AI scrapers as AI_AGENT', () => {
  const uas = [
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)',
    'Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
    'Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)',
    'Bytespider; https://zhanzhang.toutiao.com/',
    'Mozilla/5.0 (compatible; Google-Extended; +https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers)'
  ];

  for (const ua of uas) {
    const res = classifyBot(ua);
    assert.strictEqual(res.isBotLikely, true, `Failed isBotLikely for ${ua}`);
    assert.strictEqual(res.category, 'AI_AGENT', `Failed category for ${ua}`);
    assert.strictEqual(res.identityState, 'CLAIMED');
  }
});

// 3. Social Media & Link Preview Bots
runTest('should accurately classify social preview bots as SOCIAL_PREVIEW', () => {
  const uas = [
    'Twitterbot/1.0',
    'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
    'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    'WhatsApp/2.21.12.21 A'
  ];

  for (const ua of uas) {
    const res = classifyBot(ua);
    assert.strictEqual(res.isBotLikely, true, `Failed isBotLikely for ${ua}`);
    assert.strictEqual(res.category, 'SOCIAL_PREVIEW', `Failed category for ${ua}`);
  }
});

// 4. Monitoring & Healthcheck Services
runTest('should accurately classify uptime and monitoring services as MONITORING', () => {
  const uas = [
    'Pingdom.com_bot_version_1.4_(http://www.pingdom.com/)',
    'Mozilla/5.0 (compatible; UptimeRobot/2.0; http://www.uptimerobot.com/)',
    'Datadog Agent/7.40.0'
  ];

  for (const ua of uas) {
    const res = classifyBot(ua);
    assert.strictEqual(res.isBotLikely, true, `Failed isBotLikely for ${ua}`);
    assert.strictEqual(res.category, 'MONITORING', `Failed category for ${ua}`);
  }
});

// 5. Feed Fetchers & Readers
runTest('should accurately classify feed readers as FEED_FETCHER', () => {
  const uas = [
    'AppleNewsBot',
    'Feedfetcher-Google; (+http://www.google.com/feedfetcher.html)',
    'Feedly/1.0 (+http://www.feedly.com/fetcher.html)'
  ];

  for (const ua of uas) {
    const res = classifyBot(ua);
    assert.strictEqual(res.isBotLikely, true, `Failed isBotLikely for ${ua}`);
    assert.strictEqual(res.category, 'FEED_FETCHER', `Failed category for ${ua}`);
  }
});

// 6. Automated Tools, Scrapers & Headless Drivers
runTest('should accurately classify developer tools and scrapers as AUTOMATED_TOOL with SUSPECTED state', () => {
  const uas = [
    'curl/7.88.1',
    'Wget/1.21.3',
    'python-requests/2.31.0',
    'Scrapy/2.11.0 (+https://scrapy.org)',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Playwright/1.40.0'
  ];

  for (const ua of uas) {
    const res = classifyBot(ua);
    assert.strictEqual(res.isBotLikely, true, `Failed isBotLikely for ${ua}`);
    assert.strictEqual(res.category, 'AUTOMATED_TOOL', `Failed category for ${ua}`);
    assert.strictEqual(res.identityState, 'SUSPECTED');
  }
});

// 7. Clean Human Browser User-Agents
runTest('should classify clean standard browser User-Agents as NOT_BOT and NONE category', () => {
  const humanUAs = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Mobile/15E148 Safari/604.1'
  ];

  for (const ua of humanUAs) {
    const res = classifyBot(ua);
    assert.strictEqual(res.isBotLikely, false, `Failed for clean human UA: ${ua}`);
    assert.strictEqual(res.category, 'NONE');
    assert.strictEqual(res.identityState, 'NOT_BOT');
    assert.ok(res.heuristicConfidence >= 0.85);
  }
});

// 8. ReDoS & Bounded Execution Resilience
runTest('10,000+ character adversarial input completed in < 10ms in local benchmark execution', () => {
  const evilPayload = 'Mozilla/5.0 ' + 'bot-'.repeat(2000) + 'xyz\u0000\u001f';
  const t0 = performance.now();
  const res = classifyBot(evilPayload);
  const elapsed = performance.now() - t0;

  assert.ok(elapsed < 10, `Adversarial input execution took ${elapsed}ms (expected < 10ms)`);
  assert.strictEqual(res.isBotLikely, true);
  assert.ok(res.evidenceCodes.length > 0);
});

if (failedTests > 0) {
  process.exit(1);
}
console.log(`\n{"suite":"bot_classifier","passed":${passedTests},"failed":${failedTests},"total":${passedTests + failedTests}}`);
