/**
 * @file geo-payload.test.js
 * Comprehensive Quality Gate & Edge-Case Benchmark for AMEVA-Sentinel GEO Payload Engine.
 * 
 * Verifies:
 * 1. 18-Model AI / Search / Social Bot Classification & Vendor Extraction.
 * 2. Non-bot Permissive Bypass (Returns null for normal user agents).
 * 3. Route Baseline Matching (Exact match, Longest Prefix Match, Root/Default Fallback).
 * 4. Exact UTF-8 Byte Precision on Multilingual & Emoji Content.
 * 5. Numerical Defenses (ZeroDivisionError, Inverse Payload Clamping, NaN/Undefined safety).
 * 6. Sentinel Instance & Standalone resolveGeoPayload APIs with Configuration Merging.
 * 7. Host (uno-km) Thin-Client Middleware Conformance & Database Payload Compatibility.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  Sentinel,
  createSentinel,
  resolveGeoPayload,
  AI_BOT_PATTERNS,
  measureUtf8Bytes,
  calculateBandwidthSavings,
  matchRouteBaseline,
  matchBotPattern
} from '../packages/sentinel/dist/index.js';

test('1. 18-Model AI / Search / Social Bot Classification & Vendor Extraction', () => {
  const sampleBots = [
    { ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)', name: 'GPTBot (OpenAI / ChatGPT)', vendor: 'OpenAI', category: 'AI_AGENT' },
    { ua: 'Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)', name: 'ClaudeBot (Anthropic)', vendor: 'Anthropic', category: 'AI_AGENT' },
    { ua: 'Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)', name: 'PerplexityBot (Perplexity AI)', vendor: 'Perplexity', category: 'AI_AGENT' },
    { ua: 'Mozilla/5.0 (compatible; DeepSeekBot/1.0; +https://www.deepseek.com/)', name: 'DeepSeekBot (DeepSeek AI)', vendor: 'DeepSeek', category: 'AI_AGENT' },
    { ua: 'Mozilla/5.0 (compatible; Google-Extended; +https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers)', name: 'Google-Extended (Gemini Training)', vendor: 'Google', category: 'AI_AGENT' },
    { ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', name: 'Googlebot (Google Search)', vendor: 'Google', category: 'SEARCH_ENGINE' },
    { ua: 'Mozilla/5.0 (compatible; Bytespider; spider-feedback@bytedance.com)', name: 'Bytespider (ByteDance / TikTok AI)', vendor: 'ByteDance', category: 'AI_AGENT' },
    { ua: 'Mozilla/5.0 (compatible; cohere-ai/1.0; +https://cohere.com/bot)', name: 'Cohere-AI (Cohere RAG)', vendor: 'Cohere', category: 'AI_AGENT' },
    { ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15 (Applebot-Extended/0.1)', name: 'Applebot-Extended (Apple Intelligence)', vendor: 'Apple', category: 'AI_AGENT' },
    { ua: 'Mozilla/5.0 (compatible; Applebot/0.3; +http://www.apple.com/go/applebot)', name: 'Applebot (Apple Search)', vendor: 'Apple', category: 'SEARCH_ENGINE' },
    { ua: 'CCBot/2.0 (https://commoncrawl.org/faq/)', name: 'CCBot (Common Crawl / LLM Datasets)', vendor: 'CommonCrawl', category: 'AI_AGENT' },
    { ua: 'Diffbot/0.1; +http://www.diffbot.com', name: 'Diffbot (Knowledge Graph AI)', vendor: 'Diffbot', category: 'AI_AGENT' },
    { ua: 'Amazonbot/0.1 (https://developer.amazon.com/support/amazonbot)', name: 'Amazonbot (Amazon AI / Bedrock)', vendor: 'Amazon', category: 'AI_AGENT' },
    { ua: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)', name: 'Bingbot (Microsoft Bing)', vendor: 'Microsoft', category: 'SEARCH_ENGINE' },
    { ua: 'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)', name: 'YandexBot (Yandex Search)', vendor: 'Yandex', category: 'SEARCH_ENGINE' },
    { ua: 'DuckDuckBot/1.1; (+http://duckduckgo.com/duckduckbot.html)', name: 'DuckDuckBot', vendor: 'DuckDuckGo', category: 'SEARCH_ENGINE' },
    { ua: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)', name: 'Meta/Facebook Scraper', vendor: 'Meta', category: 'SOCIAL_BOT' },
    { ua: 'Twitterbot/1.0', name: 'Twitter/X Bot', vendor: 'Twitter', category: 'SOCIAL_BOT' }
  ];

  assert.equal(AI_BOT_PATTERNS.length, 18, 'Must maintain exactly 18 standard bot definitions');

  for (const item of sampleBots) {
    const matched = matchBotPattern(item.ua);
    assert.ok(matched, `Expected match for UA: ${item.ua}`);
    assert.equal(matched.name, item.name);
    assert.equal(matched.vendor, item.vendor);
    assert.equal(matched.category, item.category);
  }
});

test('2. Non-bot Normal User Agent Permissive Bypass', () => {
  const normalUAs = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    ''
  ];

  for (const ua of normalUAs) {
    const result = resolveGeoPayload({ headers: { 'user-agent': ua }, url: '/lib/stt/' });
    assert.equal(result, null, `Non-bot UA must return null: ${ua}`);
  }
});

test('3. Route Baseline Matching (Exact, Longest Prefix, Root Fallback, Default)', () => {
  const options = {
    defaultBaselineBytes: 50000,
    routeBaselines: {
      '/': 210000,
      '/robots.txt': 500,
      '/lib/': 120000,
      '/lib/stt/': 95000,
      '/lib/train/core': 140000
    }
  };

  // Exact match
  assert.equal(matchRouteBaseline('/robots.txt', options), 500);
  assert.equal(matchRouteBaseline('/', options), 210000);

  // Longest prefix match
  assert.equal(matchRouteBaseline('/lib/stt/engine.html', options), 95000);
  assert.equal(matchRouteBaseline('/lib/other/index.html', options), 120000);
  assert.equal(matchRouteBaseline('/lib/train/core/bench', options), 140000);

  // Root fallback for non-lib routes
  assert.equal(matchRouteBaseline('/about', options), 210000);

  // Default fallback when routeBaselines is empty
  assert.equal(matchRouteBaseline('/anything', { defaultBaselineBytes: 30000 }), 30000);
  assert.equal(matchRouteBaseline('/anything', {}), 0);
  assert.equal(matchRouteBaseline('/anything', null), 0);
});

test('4. Exact UTF-8 Byte Precision on Multilingual & Emoji Content', () => {
  const koreanAndEmoji = '# 🎙️ Termux-STT 음성 인식 엔진 고도화 사양서\n한국어 UTF-8 3바이트 문자열과 이모지 🚀✨';
  const expectedBytes = Buffer.byteLength(koreanAndEmoji, 'utf8');
  const measured = measureUtf8Bytes(koreanAndEmoji);

  assert.equal(measured, expectedBytes, 'UTF-8 byte length calculation must match Node.js Buffer standard');
  assert.equal(measureUtf8Bytes(''), 0);
  assert.equal(measureUtf8Bytes(null), 0);
});

test('5. Strict Numerical Defenses (ZeroDivisionError & Negative Clamp)', () => {
  // Case 1: Zero original baseline -> ZeroDivisionError prevented
  const zeroBaseline = calculateBandwidthSavings(1500, 0);
  assert.equal(zeroBaseline.bytesSaved, 0);
  assert.equal(zeroBaseline.savingsRatio, 0.0);
  assert.equal(zeroBaseline.isBandwidthSaved, false);

  // Case 2: Negative original baseline
  const negBaseline = calculateBandwidthSavings(1500, -100);
  assert.equal(negBaseline.bytesSaved, 0);
  assert.equal(negBaseline.savingsRatio, 0.0);
  assert.equal(negBaseline.isBandwidthSaved, false);

  // Case 3: Inverse payload (servedBytes > originalBytes) -> Clamp to 0
  const inverse = calculateBandwidthSavings(250000, 180000);
  assert.equal(inverse.bytesSaved, 0);
  assert.equal(inverse.savingsRatio, 0.0);
  assert.equal(inverse.isBandwidthSaved, false);

  // Case 4: Equal payload (servedBytes === originalBytes)
  const equalSize = calculateBandwidthSavings(180000, 180000);
  assert.equal(equalSize.bytesSaved, 0);
  assert.equal(equalSize.savingsRatio, 0.0);
  assert.equal(equalSize.isBandwidthSaved, false);

  // Case 5: Standard reduction: Original 210KB, Served 10KB -> Saved 200KB (95.2%)
  const standard = calculateBandwidthSavings(10000, 210000);
  assert.equal(standard.bytesSaved, 200000);
  assert.equal(standard.savingsRatio, 95.2);
  assert.equal(standard.isBandwidthSaved, true);

  // Case 6: NaN or invalid inputs
  const invalid = calculateBandwidthSavings(NaN, undefined);
  assert.equal(invalid.bytesSaved, 0);
  assert.equal(invalid.savingsRatio, 0.0);
  assert.equal(invalid.isBandwidthSaved, false);
});

test('6. Sentinel Instance & Configuration Merging', () => {
  const sentinelInstance = createSentinel({
    geoBaseline: {
      defaultBaselineBytes: 100000,
      routeBaselines: {
        '/lib/stt/': 95000
      }
    }
  });

  const mockRequest = {
    headers: { 'user-agent': 'GPTBot/1.2' },
    url: 'https://uno-km.vercel.app/lib/stt/docs'
  };

  // 1. Using instance config
  const res1 = sentinelInstance.resolveGeoPayload(mockRequest);
  assert.ok(res1);
  assert.equal(res1.isBot, true);
  assert.equal(res1.botVendor, 'OpenAI');
  assert.equal(res1.originalBytes, 95000);
  assert.ok(res1.bytesServed > 0);
  assert.ok(res1.bytesSaved > 0);
  assert.ok(res1.savingsRatio > 90.0);
  assert.equal(res1.isBandwidthSaved, true);

  // 2. Overriding with per-call route options
  const res2 = sentinelInstance.resolveGeoPayload(mockRequest, {
    routeBaselines: {
      '/lib/stt/': 50000
    }
  });
  assert.ok(res2);
  assert.equal(res2.originalBytes, 50000);
});

test('7. uno-km Host Thin-Client Conformance & DB Insertion Simulation', async () => {
  const sentinelCore = createSentinel({
    geoBaseline: {
      defaultBaselineBytes: 180000,
      routeBaselines: {
        '/': 210000,
        '/lib/stt/': 95000,
        '/robots.txt': 500
      }
    }
  });

  const crawlerReq = {
    headers: {
      get: (k) => (k.toLowerCase() === 'user-agent' ? 'ClaudeBot/1.0 (+claudebot@anthropic.com)' : null)
    },
    nextUrl: { pathname: '/lib/stt/' }
  };

  const geoResult = sentinelCore.resolveGeoPayload(crawlerReq);
  assert.ok(geoResult);

  // Host response header formatting simulation
  const headers = new Map();
  headers.set('Content-Type', 'text/markdown; charset=utf-8');
  headers.set('X-Sentinel-Payload-Size', `${(geoResult.bytesServed / 1024).toFixed(1)}KB`);
  headers.set('X-Sentinel-Bandwidth-Saved', `${(geoResult.bytesSaved / 1024).toFixed(1)}KB (${geoResult.savingsRatio}%)`);
  headers.set('X-Sentinel-Vendor', geoResult.botVendor);

  assert.equal(headers.get('Content-Type'), 'text/markdown; charset=utf-8');
  assert.ok(headers.get('X-Sentinel-Payload-Size').endsWith('KB'));
  assert.ok(headers.get('X-Sentinel-Bandwidth-Saved').includes('%'));
  assert.equal(headers.get('X-Sentinel-Vendor'), 'Anthropic');

  // DB insertion parameters simulation
  const dbParams = [
    geoResult.botName,
    geoResult.botVendor,
    '/lib/stt/',
    'text/markdown; charset=utf-8',
    geoResult.bytesServed,
    geoResult.bytesSaved,
    geoResult.savingsRatio
  ];

  assert.equal(dbParams[0], 'ClaudeBot (Anthropic)');
  assert.equal(dbParams[1], 'Anthropic');
  assert.equal(typeof dbParams[4], 'number');
  assert.equal(typeof dbParams[5], 'number');
  assert.equal(typeof dbParams[6], 'number');
  assert.ok(dbParams[5] > 0);
  assert.ok(dbParams[6] > 90);
});
