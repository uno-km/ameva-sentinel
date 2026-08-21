import {
  BotCategory,
  BotClassificationResult,
  BotIdentityState,
  TelemetrySignals
} from './types.js';

interface BotSignatureEntry {
  category: BotCategory;
  name: string;
  pattern: RegExp;
}

// Strictly bounded linear pattern table (Zero nested quantifiers, ReDoS-safe)
const BOT_SIGNATURES: readonly BotSignatureEntry[] = [
  // 1. Search Engines (Claimed)
  { category: 'SEARCH_ENGINE', name: 'Googlebot', pattern: /Googlebot/i },
  { category: 'SEARCH_ENGINE', name: 'Bingbot', pattern: /bingbot|msnbot/i },
  { category: 'SEARCH_ENGINE', name: 'YandexBot', pattern: /YandexBot/i },
  { category: 'SEARCH_ENGINE', name: 'Baiduspider', pattern: /Baiduspider/i },
  { category: 'SEARCH_ENGINE', name: 'DuckDuckBot', pattern: /DuckDuckBot/i },
  { category: 'SEARCH_ENGINE', name: 'SogouSpider', pattern: /Sogou/i },

  // 2. AI Agents & LLM Scrapers (Claimed)
  { category: 'AI_AGENT', name: 'GPTBot', pattern: /GPTBot|ChatGPT-User/i },
  { category: 'AI_AGENT', name: 'ClaudeBot', pattern: /ClaudeBot|Claude-Web|anthropic-ai/i },
  { category: 'AI_AGENT', name: 'PerplexityBot', pattern: /PerplexityBot/i },
  { category: 'AI_AGENT', name: 'Google-Extended', pattern: /Google-Extended/i },
  { category: 'AI_AGENT', name: 'Bytespider', pattern: /Bytespider/i },
  { category: 'AI_AGENT', name: 'CCBot', pattern: /CCBot/i },
  { category: 'AI_AGENT', name: 'CohereBot', pattern: /cohere-ai/i },

  // 3. Social Media & Link Preview Bots (Claimed)
  { category: 'SOCIAL_PREVIEW', name: 'Twitterbot', pattern: /Twitterbot/i },
  { category: 'SOCIAL_PREVIEW', name: 'Slackbot', pattern: /Slackbot/i },
  { category: 'SOCIAL_PREVIEW', name: 'Discordbot', pattern: /Discordbot/i },
  { category: 'SOCIAL_PREVIEW', name: 'FacebookBot', pattern: /facebookexternalhit|facebookcatalog/i },
  { category: 'SOCIAL_PREVIEW', name: 'TelegramBot', pattern: /TelegramBot/i },
  { category: 'SOCIAL_PREVIEW', name: 'WhatsApp', pattern: /WhatsApp/i },
  { category: 'SOCIAL_PREVIEW', name: 'LinkedInBot', pattern: /LinkedInBot/i },

  // 4. Monitoring & Healthcheck Services (Claimed)
  { category: 'MONITORING', name: 'Pingdom', pattern: /Pingdom/i },
  { category: 'MONITORING', name: 'UptimeRobot', pattern: /UptimeRobot/i },
  { category: 'MONITORING', name: 'Datadog', pattern: /Datadog/i },
  { category: 'MONITORING', name: 'NewRelic', pattern: /NewRelicPinger/i },
  { category: 'MONITORING', name: 'BetterUptime', pattern: /Better Uptime/i },

  // 5. Feed Fetchers & Readers (Claimed)
  { category: 'FEED_FETCHER', name: 'AppleNewsBot', pattern: /AppleNewsBot/i },
  { category: 'FEED_FETCHER', name: 'Feedfetcher-Google', pattern: /Feedfetcher-Google/i },
  { category: 'FEED_FETCHER', name: 'Feedly', pattern: /Feedly/i },

  // 6. Automated Tools, Scrapers & Headless Drivers (Claimed / Suspected)
  { category: 'AUTOMATED_TOOL', name: 'Playwright', pattern: /Playwright/i },
  { category: 'AUTOMATED_TOOL', name: 'Puppeteer', pattern: /Puppeteer/i },
  { category: 'AUTOMATED_TOOL', name: 'Selenium', pattern: /Selenium/i },
  { category: 'AUTOMATED_TOOL', name: 'HeadlessChrome', pattern: /HeadlessChrome/i },
  { category: 'AUTOMATED_TOOL', name: 'PhantomJS', pattern: /PhantomJS/i },
  { category: 'AUTOMATED_TOOL', name: 'cURL', pattern: /^curl\//i },
  { category: 'AUTOMATED_TOOL', name: 'Wget', pattern: /^Wget\//i },
  { category: 'AUTOMATED_TOOL', name: 'Python-requests', pattern: /python-requests|python-urllib|aiohttp|httpx|Scrapy/i },
  { category: 'AUTOMATED_TOOL', name: 'Go-http-client', pattern: /Go-http-client/i },
  { category: 'AUTOMATED_TOOL', name: 'Axios', pattern: /axios\//i },
  { category: 'AUTOMATED_TOOL', name: 'Java-HttpClient', pattern: /Java\/|Apache-HttpClient/i }
];

const GENERIC_BOT_PATTERN = /\b(bot|crawler|spider|scraper|archiver|transcoder)\b/i;

/**
 * Pure heuristic bot classifier.
 * 
 * Guarantees:
 * - O(N) bounded execution: Max 512 bytes string clamp.
 * - ReDoS-immunity: No nested quantifiers or dynamic RegExp compilation.
 * - Clear distinction between CLAIMED identity vs VERIFIED cryptographic context.
 */
export function classifyBot(uaString?: string, signals?: TelemetrySignals): BotClassificationResult {
  const evidenceCodes: string[] = [];
  const rawUA = typeof uaString === 'string' ? uaString : (signals?.userAgent || '');
  
  // Guard 1: Truncate to 512 characters to prevent ReDoS on malicious oversized headers
  const ua = rawUA.slice(0, 512).trim();

  // Guard 2: Missing or completely empty User-Agent
  if (!ua) {
    if (signals?.webdriver) {
      return {
        isBotLikely: true,
        category: 'AUTOMATED_TOOL',
        claimedName: 'headless-webdriver',
        identityState: 'SUSPECTED',
        heuristicConfidence: 0.95,
        evidenceCodes: ['SIGNAL_WEBDRIVER_ACTIVE', 'UA_EMPTY']
      };
    }
    return {
      isBotLikely: false,
      category: 'NONE',
      identityState: 'NOT_BOT',
      heuristicConfidence: 0.20,
      evidenceCodes: ['UA_EMPTY']
    };
  }

  // Step 1: Check Known Signatures Table
  for (const entry of BOT_SIGNATURES) {
    if (entry.pattern.test(ua)) {
      evidenceCodes.push(`SIGNATURE_MATCH_${entry.category}`);
      if (signals?.webdriver) {
        evidenceCodes.push('SIGNAL_WEBDRIVER_ACTIVE');
      }

      const isVerified = signals?.verifiedBot === true || signals?.verifiedContext?.isVerified === true;
      const identityState: BotIdentityState = isVerified
        ? 'VERIFIED'
        : (entry.category === 'AUTOMATED_TOOL' ? 'SUSPECTED' : 'CLAIMED');

      return {
        isBotLikely: true,
        category: entry.category,
        claimedName: entry.name,
        identityState,
        heuristicConfidence: isVerified ? 1.00 : (entry.category === 'AUTOMATED_TOOL' ? 0.90 : 0.80),
        evidenceCodes
      };
    }
  }

  // Step 2: Check Generic Bot / Crawler / Spider Tokens
  if (GENERIC_BOT_PATTERN.test(ua)) {
    evidenceCodes.push('GENERIC_BOT_TOKEN_FOUND');
    return {
      isBotLikely: true,
      category: 'UNKNOWN_BOT',
      claimedName: 'generic-crawler',
      identityState: 'CLAIMED',
      heuristicConfidence: 0.70,
      evidenceCodes
    };
  }

  // Step 3: Check Environmental Automation Signals on Standard Browser UA
  if (signals?.webdriver) {
    evidenceCodes.push('SIGNAL_WEBDRIVER_ON_STANDARD_UA');
    return {
      isBotLikely: true,
      category: 'AUTOMATED_TOOL',
      claimedName: 'automated-browser',
      identityState: 'SUSPECTED',
      heuristicConfidence: 0.85,
      evidenceCodes
    };
  }

  // Step 4: Standard Clean Human Browser
  evidenceCodes.push('STANDARD_BROWSER_HEURISTIC');
  return {
    isBotLikely: false,
    category: 'NONE',
    identityState: 'NOT_BOT',
    heuristicConfidence: 0.90,
    evidenceCodes
  };
}
