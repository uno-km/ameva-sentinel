import {
  BotCategory,
  BotClassificationResult,
  BotIdentityState,
  TelemetrySignals,
  TriageCategory
} from './types.js';

interface BotSignatureEntry {
  category: BotCategory;
  triageCategory: TriageCategory;
  vendorGroup: string;
  name: string;
  pattern: RegExp;
}

// Strictly bounded linear pattern table (Zero nested quantifiers, ReDoS-safe)
const BOT_SIGNATURES: readonly BotSignatureEntry[] = [
  // 1. Search Engines (Claimed)
  { category: 'SEARCH_ENGINE', triageCategory: 'CRAWLER_TOOL', vendorGroup: 'SearchEngine', name: 'Googlebot', pattern: /Googlebot/i },
  { category: 'SEARCH_ENGINE', triageCategory: 'CRAWLER_TOOL', vendorGroup: 'SearchEngine', name: 'Bingbot', pattern: /bingbot|msnbot/i },
  { category: 'SEARCH_ENGINE', triageCategory: 'CRAWLER_TOOL', vendorGroup: 'SearchEngine', name: 'YandexBot', pattern: /YandexBot/i },
  { category: 'SEARCH_ENGINE', triageCategory: 'CRAWLER_TOOL', vendorGroup: 'SearchEngine', name: 'Baiduspider', pattern: /Baiduspider/i },
  { category: 'SEARCH_ENGINE', triageCategory: 'CRAWLER_TOOL', vendorGroup: 'SearchEngine', name: 'DuckDuckBot', pattern: /DuckDuckBot/i },
  { category: 'SEARCH_ENGINE', triageCategory: 'CRAWLER_TOOL', vendorGroup: 'SearchEngine', name: 'SogouSpider', pattern: /Sogou/i },
  { category: 'SEARCH_ENGINE', triageCategory: 'CRAWLER_TOOL', vendorGroup: 'SearchEngine', name: 'NaverYeti', pattern: /Yeti|NaverBot/i },

  // 2. AI Agents & LLM Scrapers (Claimed)
  { category: 'AI_AGENT', triageCategory: 'AI_AGENT', vendorGroup: 'OpenAI', name: 'GPTBot', pattern: /GPTBot|ChatGPT-User|OAI-SearchBot/i },
  { category: 'AI_AGENT', triageCategory: 'AI_AGENT', vendorGroup: 'Anthropic', name: 'ClaudeBot', pattern: /ClaudeBot|Claude-Web|anthropic-ai/i },
  { category: 'AI_AGENT', triageCategory: 'AI_AGENT', vendorGroup: 'Perplexity', name: 'PerplexityBot', pattern: /PerplexityBot/i },
  { category: 'AI_AGENT', triageCategory: 'AI_AGENT', vendorGroup: 'Google', name: 'Google-Extended', pattern: /Google-Extended|GoogleOther/i },
  { category: 'AI_AGENT', triageCategory: 'AI_AGENT', vendorGroup: 'ByteDance', name: 'Bytespider', pattern: /Bytespider/i },
  { category: 'AI_AGENT', triageCategory: 'AI_AGENT', vendorGroup: 'CommonCrawl', name: 'CCBot', pattern: /CCBot/i },
  { category: 'AI_AGENT', triageCategory: 'AI_AGENT', vendorGroup: 'Cohere', name: 'CohereBot', pattern: /cohere-ai/i },
  { category: 'AI_AGENT', triageCategory: 'AI_AGENT', vendorGroup: 'DeepSeek', name: 'DeepSeekBot', pattern: /DeepSeek|DeepSeekBot/i },
  { category: 'AI_AGENT', triageCategory: 'AI_AGENT', vendorGroup: 'Mistral', name: 'MistralBot', pattern: /MistralAI|Mistral/i },
  { category: 'AI_AGENT', triageCategory: 'AI_AGENT', vendorGroup: 'OtherAI', name: 'LLMAgent', pattern: /langchain|llamaindex|autogpt|chatglm|qwen/i },

  // 3. Social Media & Link Preview Bots (Claimed)
  { category: 'SOCIAL_PREVIEW', triageCategory: 'CRAWLER_TOOL', vendorGroup: 'SocialPreview', name: 'Twitterbot', pattern: /Twitterbot/i },
  { category: 'SOCIAL_PREVIEW', triageCategory: 'CRAWLER_TOOL', vendorGroup: 'SocialPreview', name: 'Slackbot', pattern: /Slackbot/i },
  { category: 'SOCIAL_PREVIEW', triageCategory: 'CRAWLER_TOOL', vendorGroup: 'SocialPreview', name: 'Discordbot', pattern: /Discordbot/i },
  { category: 'SOCIAL_PREVIEW', triageCategory: 'CRAWLER_TOOL', vendorGroup: 'SocialPreview', name: 'FacebookBot', pattern: /facebookexternalhit|facebookcatalog/i },
  { category: 'SOCIAL_PREVIEW', triageCategory: 'CRAWLER_TOOL', vendorGroup: 'SocialPreview', name: 'TelegramBot', pattern: /TelegramBot/i },
  { category: 'SOCIAL_PREVIEW', triageCategory: 'CRAWLER_TOOL', vendorGroup: 'SocialPreview', name: 'WhatsApp', pattern: /WhatsApp/i },
  { category: 'SOCIAL_PREVIEW', triageCategory: 'CRAWLER_TOOL', vendorGroup: 'SocialPreview', name: 'LinkedInBot', pattern: /LinkedInBot/i },

  // 4. Monitoring & Healthcheck Services (Claimed)
  { category: 'MONITORING', triageCategory: 'CRAWLER_TOOL', vendorGroup: 'Monitoring', name: 'Pingdom', pattern: /Pingdom/i },
  { category: 'MONITORING', triageCategory: 'CRAWLER_TOOL', vendorGroup: 'Monitoring', name: 'UptimeRobot', pattern: /UptimeRobot/i },
  { category: 'MONITORING', triageCategory: 'CRAWLER_TOOL', vendorGroup: 'Monitoring', name: 'Datadog', pattern: /Datadog/i },
  { category: 'MONITORING', triageCategory: 'CRAWLER_TOOL', vendorGroup: 'Monitoring', name: 'NewRelic', pattern: /NewRelicPinger/i },
  { category: 'MONITORING', triageCategory: 'CRAWLER_TOOL', vendorGroup: 'Monitoring', name: 'BetterUptime', pattern: /Better Uptime/i },

  // 5. Feed Fetchers & Readers (Claimed)
  { category: 'FEED_FETCHER', triageCategory: 'CRAWLER_TOOL', vendorGroup: 'FeedFetcher', name: 'AppleNewsBot', pattern: /AppleNewsBot/i },
  { category: 'FEED_FETCHER', triageCategory: 'CRAWLER_TOOL', vendorGroup: 'FeedFetcher', name: 'Feedfetcher-Google', pattern: /Feedfetcher-Google/i },
  { category: 'FEED_FETCHER', triageCategory: 'CRAWLER_TOOL', vendorGroup: 'FeedFetcher', name: 'Feedly', pattern: /Feedly/i },

  // 6. Automated Tools, Scrapers & Headless Drivers (Claimed / Suspected)
  { category: 'AUTOMATED_TOOL', triageCategory: 'CRAWLER_TOOL', vendorGroup: 'HeadlessDriver', name: 'Playwright', pattern: /Playwright/i },
  { category: 'AUTOMATED_TOOL', triageCategory: 'CRAWLER_TOOL', vendorGroup: 'HeadlessDriver', name: 'Puppeteer', pattern: /Puppeteer/i },
  { category: 'AUTOMATED_TOOL', triageCategory: 'CRAWLER_TOOL', vendorGroup: 'HeadlessDriver', name: 'Selenium', pattern: /Selenium/i },
  { category: 'AUTOMATED_TOOL', triageCategory: 'CRAWLER_TOOL', vendorGroup: 'HeadlessDriver', name: 'HeadlessChrome', pattern: /HeadlessChrome/i },
  { category: 'AUTOMATED_TOOL', triageCategory: 'CRAWLER_TOOL', vendorGroup: 'HeadlessDriver', name: 'PhantomJS', pattern: /PhantomJS/i },
  { category: 'AUTOMATED_TOOL', triageCategory: 'CRAWLER_TOOL', vendorGroup: 'CLITool', name: 'cURL', pattern: /^curl\//i },
  { category: 'AUTOMATED_TOOL', triageCategory: 'CRAWLER_TOOL', vendorGroup: 'CLITool', name: 'Wget', pattern: /^Wget\//i },
  { category: 'AUTOMATED_TOOL', triageCategory: 'CRAWLER_TOOL', vendorGroup: 'CLITool', name: 'Python-requests', pattern: /python-requests|python-urllib|aiohttp|httpx|Scrapy/i },
  { category: 'AUTOMATED_TOOL', triageCategory: 'CRAWLER_TOOL', vendorGroup: 'CLITool', name: 'Go-http-client', pattern: /Go-http-client/i },
  { category: 'AUTOMATED_TOOL', triageCategory: 'CRAWLER_TOOL', vendorGroup: 'CLITool', name: 'Axios', pattern: /axios\//i },
  { category: 'AUTOMATED_TOOL', triageCategory: 'CRAWLER_TOOL', vendorGroup: 'CLITool', name: 'Node-fetch', pattern: /node-fetch|undici/i },
  { category: 'AUTOMATED_TOOL', triageCategory: 'CRAWLER_TOOL', vendorGroup: 'CLITool', name: 'Java-HttpClient', pattern: /Java\/|Apache-HttpClient/i }
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
    if (signals?.webdriver || signals?.isHeadlessRenderer || signals?.headlessEvasionsDetected) {
      return {
        isBotLikely: true,
        category: 'AUTOMATED_TOOL',
        triageCategory: 'CRAWLER_TOOL',
        vendorGroup: 'HeadlessDriver',
        claimedName: 'headless-webdriver',
        identityState: 'SUSPECTED',
        heuristicConfidence: 0.95,
        evidenceCodes: ['SIGNAL_WEBDRIVER_ACTIVE', 'UA_EMPTY']
      };
    }
    return {
      isBotLikely: false,
      category: 'NONE',
      triageCategory: 'HUMAN',
      vendorGroup: 'HumanUser',
      identityState: 'NOT_BOT',
      heuristicConfidence: 0.20,
      evidenceCodes: ['UA_EMPTY']
    };
  }

  // Step 1: Check Known Signatures Table
  for (const entry of BOT_SIGNATURES) {
    if (entry.pattern.test(ua)) {
      evidenceCodes.push(`SIGNATURE_MATCH_${entry.category}`);
      if (signals?.webdriver || signals?.isHeadlessRenderer) {
        evidenceCodes.push('SIGNAL_WEBDRIVER_ACTIVE');
      }

      const identityState: BotIdentityState =
        entry.category === 'AUTOMATED_TOOL' ? 'SUSPECTED' : 'CLAIMED';

      return {
        isBotLikely: true,
        category: entry.category,
        triageCategory: entry.triageCategory,
        vendorGroup: entry.vendorGroup,
        claimedName: entry.name,
        identityState,
        heuristicConfidence: entry.category === 'AUTOMATED_TOOL' ? 0.90 : 0.80,
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
      triageCategory: 'CRAWLER_TOOL',
      vendorGroup: 'OtherCrawler',
      claimedName: 'generic-crawler',
      identityState: 'CLAIMED',
      heuristicConfidence: 0.70,
      evidenceCodes
    };
  }

  // Step 3: Check Environmental Automation Signals on Standard Browser UA
  if (signals?.webdriver || signals?.isHeadlessRenderer || signals?.headlessEvasionsDetected) {
    evidenceCodes.push('SIGNAL_WEBDRIVER_ON_STANDARD_UA');
    return {
      isBotLikely: true,
      category: 'AUTOMATED_TOOL',
      triageCategory: 'CRAWLER_TOOL',
      vendorGroup: 'HeadlessDriver',
      claimedName: 'stealth-headless-browser',
      identityState: 'SUSPECTED',
      heuristicConfidence: 0.95,
      evidenceCodes
    };
  }

  // Step 3b: Check HTTP Missing Headers on Standard Browser UA (e.g. cURL pretending to be Chrome)
  if (signals?.httpMissingHeaders) {
    evidenceCodes.push('SIGNAL_SPOOFED_BROWSER_UA_CLI');
    return {
      isBotLikely: true,
      category: 'AUTOMATED_TOOL',
      triageCategory: 'CRAWLER_TOOL',
      vendorGroup: 'CLITool',
      claimedName: 'spoofed-http-client',
      identityState: 'SUSPECTED',
      heuristicConfidence: 0.88,
      evidenceCodes
    };
  }

  // Step 4: Standard Clean Human Browser
  evidenceCodes.push('STANDARD_BROWSER_HEURISTIC');
  return {
    isBotLikely: false,
    category: 'NONE',
    triageCategory: 'HUMAN',
    vendorGroup: 'HumanUser',
    identityState: 'NOT_BOT',
    heuristicConfidence: 0.90,
    evidenceCodes
  };
}
