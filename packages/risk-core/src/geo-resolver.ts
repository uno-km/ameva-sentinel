/**
 * @file geo-resolver.ts
 * AMEVA-Sentinel Core GEO & AI Crawler Payload Resolver with Accurate Bandwidth Calculation.
 * 
 * Features:
 * 1. 18-Model AI / Search / Social Bot Pattern Recognition & Vendor Extraction.
 * 2. Route-based Original Baseline Byte Mapping with Longest Prefix Match.
 * 3. Exact UTF-8 Byte Measurement for Cross-Runtime (Node.js & Edge Runtime).
 * 4. ZeroDivisionError & Inverse Negative Savings Defense Guarantees.
 * 5. 100% Encapsulated GeoResolutionResult for Thin-Client Host Bypass.
 */

export interface GeoBotPattern {
  pattern: RegExp;
  name: string;
  vendor: string;
  category: 'AI_AGENT' | 'SEARCH_ENGINE' | 'SOCIAL_BOT' | 'UNKNOWN';
}

export const AI_BOT_PATTERNS: readonly GeoBotPattern[] = Object.freeze([
  { pattern: /gptbot|chatgpt-user|oai-searchbot/i, name: 'GPTBot (OpenAI / ChatGPT)', vendor: 'OpenAI', category: 'AI_AGENT' },
  { pattern: /claudebot|claude-web|anthropic/i, name: 'ClaudeBot (Anthropic)', vendor: 'Anthropic', category: 'AI_AGENT' },
  { pattern: /perplexitybot|perplexity/i, name: 'PerplexityBot (Perplexity AI)', vendor: 'Perplexity', category: 'AI_AGENT' },
  { pattern: /deepseekbot|deepseek/i, name: 'DeepSeekBot (DeepSeek AI)', vendor: 'DeepSeek', category: 'AI_AGENT' },
  { pattern: /google-extended|googleother/i, name: 'Google-Extended (Gemini Training)', vendor: 'Google', category: 'AI_AGENT' },
  { pattern: /googlebot/i, name: 'Googlebot (Google Search)', vendor: 'Google', category: 'SEARCH_ENGINE' },
  { pattern: /bytespider/i, name: 'Bytespider (ByteDance / TikTok AI)', vendor: 'ByteDance', category: 'AI_AGENT' },
  { pattern: /cohere-ai/i, name: 'Cohere-AI (Cohere RAG)', vendor: 'Cohere', category: 'AI_AGENT' },
  { pattern: /applebot-extended/i, name: 'Applebot-Extended (Apple Intelligence)', vendor: 'Apple', category: 'AI_AGENT' },
  { pattern: /applebot/i, name: 'Applebot (Apple Search)', vendor: 'Apple', category: 'SEARCH_ENGINE' },
  { pattern: /ccbot/i, name: 'CCBot (Common Crawl / LLM Datasets)', vendor: 'CommonCrawl', category: 'AI_AGENT' },
  { pattern: /diffbot/i, name: 'Diffbot (Knowledge Graph AI)', vendor: 'Diffbot', category: 'AI_AGENT' },
  { pattern: /amazonbot/i, name: 'Amazonbot (Amazon AI / Bedrock)', vendor: 'Amazon', category: 'AI_AGENT' },
  { pattern: /bingbot/i, name: 'Bingbot (Microsoft Bing)', vendor: 'Microsoft', category: 'SEARCH_ENGINE' },
  { pattern: /yandexbot/i, name: 'YandexBot (Yandex Search)', vendor: 'Yandex', category: 'SEARCH_ENGINE' },
  { pattern: /duckduckbot/i, name: 'DuckDuckBot', vendor: 'DuckDuckGo', category: 'SEARCH_ENGINE' },
  { pattern: /facebookexternalhit|facebookcatalog|meta-externalagent/i, name: 'Meta/Facebook Scraper', vendor: 'Meta', category: 'SOCIAL_BOT' },
  { pattern: /twitterbot/i, name: 'Twitter/X Bot', vendor: 'Twitter', category: 'SOCIAL_BOT' }
]);

export interface GeoBaselineOptions {
  /** 미지정 경로에 대한 기본 원본 크기 (기본값: 0) */
  defaultBaselineBytes?: number;
  /** 경로별/접두사별 실측 원본 바이트 맵 (예: { '/': 210000, '/lib/stt/': 95000, '/robots.txt': 500 }) */
  routeBaselines?: Record<string, number>;
  /** 사용자 정의 페이로드 생성 함수 (선택적) */
  payloadResolver?: (path: string, bot?: GeoBotPattern | null) => string;
}

export interface GeoResolutionResult {
  /** 서빙할 최적화된 마크다운 페이로드 문자열 */
  payload: string;
  /** 매칭된 봇 명칭 */
  botName: string;
  /** 식별된 벤더 명칭 */
  botVendor: string;
  /** 봇 카테고리 */
  botCategory: 'AI_AGENT' | 'SEARCH_ENGINE' | 'SOCIAL_BOT' | 'UNKNOWN';
  /** 실제 서빙된 마크다운 UTF-8 바이트 크기 */
  bytesServed: number;
  /** 매칭된 원본 베이스라인 바이트 크기 */
  originalBytes: number;
  /** 절감된 바이트 (Math.max(0, originalBytes - bytesServed)) */
  bytesSaved: number;
  /** 절감 비율 (0.0 ~ 100.0, 소수점 1자리 정밀도) */
  savingsRatio: number;
  /** 실제 대역폭 절감이 발생했는지 여부 (bytesSaved > 0) */
  isBandwidthSaved: boolean;
  /** AI / 크롤러 봇 매칭 여부 */
  isBot: boolean;
}

declare const Buffer: { byteLength(str: string, encoding?: string): number } | undefined;

/**
 * Measures exact UTF-8 byte length across Edge Runtime and Node.js environments.
 */
export function measureUtf8Bytes(content: string): number {
  if (!content) return 0;
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(content).length;
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.byteLength(content, 'utf8');
  }
  // Fallback UTF-8 byte length computation
  let bytes = 0;
  for (let i = 0; i < content.length; i++) {
    const code = content.charCodeAt(i);
    if (code <= 0x7f) bytes += 1;
    else if (code <= 0x7ff) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      // Surrogate pair
      bytes += 4;
      i++;
    } else bytes += 3;
  }
  return bytes;
}

/**
 * Calculates bandwidth savings with strict numerical defenses against ZeroDivisionError and inverse sizes.
 */
export function calculateBandwidthSavings(
  bytesServed: number,
  originalBytes: number
): { bytesSaved: number; savingsRatio: number; isBandwidthSaved: boolean } {
  if (typeof originalBytes !== 'number' || isNaN(originalBytes) || originalBytes <= 0) {
    return { bytesSaved: 0, savingsRatio: 0.0, isBandwidthSaved: false };
  }
  const safeServed = typeof bytesServed === 'number' && !isNaN(bytesServed) && bytesServed > 0 ? bytesServed : 0;
  const bytesSaved = Math.max(0, originalBytes - safeServed);
  if (bytesSaved <= 0) {
    return { bytesSaved: 0, savingsRatio: 0.0, isBandwidthSaved: false };
  }
  const rawRatio = (bytesSaved / originalBytes) * 100;
  const savingsRatio = Number(Math.min(100.0, Math.max(0.0, isNaN(rawRatio) ? 0.0 : rawRatio)).toFixed(1));
  return {
    bytesSaved,
    savingsRatio,
    isBandwidthSaved: bytesSaved > 0
  };
}

/**
 * Resolves the baseline byte size for a given pathname using exact match first, then longest prefix match, and finally default baseline.
 */
export function matchRouteBaseline(
  pathname: string,
  options?: GeoBaselineOptions
): number {
  if (!options) return 0;
  const routeBaselines = options.routeBaselines;
  const defaultBytes = typeof options.defaultBaselineBytes === 'number' && !isNaN(options.defaultBaselineBytes)
    ? Math.max(0, options.defaultBaselineBytes)
    : 0;

  if (!routeBaselines || typeof routeBaselines !== 'object') {
    return defaultBytes;
  }

  const cleanPath = (pathname || '/').trim();

  // 1. Exact match
  if (Object.prototype.hasOwnProperty.call(routeBaselines, cleanPath)) {
    const val = routeBaselines[cleanPath];
    return typeof val === 'number' && !isNaN(val) ? Math.max(0, val) : defaultBytes;
  }

  // 2. Longest prefix match
  let longestMatch = '';
  let matchedBytes = defaultBytes;

  for (const route of Object.keys(routeBaselines)) {
    if (route !== '/' && cleanPath.startsWith(route)) {
      if (route.length > longestMatch.length) {
        longestMatch = route;
        const val = routeBaselines[route];
        matchedBytes = typeof val === 'number' && !isNaN(val) ? Math.max(0, val) : defaultBytes;
      }
    }
  }

  if (longestMatch) {
    return matchedBytes;
  }

  // 3. Root '/' match fallback if defined in routeBaselines
  if (Object.prototype.hasOwnProperty.call(routeBaselines, '/')) {
    const rootVal = routeBaselines['/'];
    return typeof rootVal === 'number' && !isNaN(rootVal) ? Math.max(0, rootVal) : defaultBytes;
  }

  return defaultBytes;
}

/**
 * Default fallback Markdown generator when no custom payloadResolver is provided.
 */
function defaultMarkdownPayload(path: string, bot?: GeoBotPattern | null): string {
  const botLabel = bot ? bot.name : 'AI Crawler';
  return [
    '---',
    `# AMEVA High-Efficiency GEO Markdown Delivery`,
    `- Target Bot: ${botLabel}`,
    `- Path: ${path || '/'}`,
    `- Delivered By: @ameva/sentinel Core GEO Engine`,
    '---',
    '',
    '## System Observability & AI Ingestion Endpoint',
    'Optimized Markdown content streamed for LLM ingestion and edge bandwidth efficiency.'
  ].join('\n');
}

/**
 * Extracts User-Agent and Request Path from various request shapes (Fetch Request, Express/Node req, Next.js, or plain object).
 */
export function extractRequestMetadata(req: any): { userAgent: string; pathname: string } {
  if (!req) return { userAgent: '', pathname: '/' };

  // 1. User-Agent Extraction
  let userAgent = '';
  if (req.headers) {
    if (typeof req.headers.get === 'function') {
      userAgent = req.headers.get('user-agent') || req.headers.get('User-Agent') || '';
    } else if (typeof req.headers === 'object') {
      userAgent = req.headers['user-agent'] || req.headers['User-Agent'] || req.headers['USER-AGENT'] || '';
    }
  }
  if (!userAgent && req.get && typeof req.get === 'function') {
    userAgent = req.get('user-agent') || '';
  }
  if (!userAgent && typeof req.userAgent === 'string') {
    userAgent = req.userAgent;
  }

  // 2. Pathname Extraction
  let pathname = '/';
  if (req.nextUrl && req.nextUrl.pathname) {
    pathname = req.nextUrl.pathname;
  } else if (typeof req.path === 'string') {
    pathname = req.path;
  } else if (typeof req.pathname === 'string') {
    pathname = req.pathname;
  } else if (typeof req.url === 'string') {
    try {
      if (req.url.startsWith('http://') || req.url.startsWith('https://')) {
        pathname = new URL(req.url).pathname;
      } else {
        pathname = req.url.split('?')[0];
      }
    } catch {
      pathname = req.url.split('?')[0];
    }
  }

  return { userAgent, pathname: pathname || '/' };
}

/**
 * Matches User-Agent against the 18 AI/Crawler patterns.
 */
export function matchBotPattern(userAgent: string): GeoBotPattern | null {
  if (!userAgent || typeof userAgent !== 'string') return null;
  for (const bot of AI_BOT_PATTERNS) {
    if (bot.pattern.test(userAgent)) {
      return bot;
    }
  }
  return null;
}

/**
 * Core GEO resolution engine: Identifies AI crawlers, generates/resolves optimized Markdown payload,
 * maps route baselines, and calculates precise bandwidth savings.
 */
export function resolveGeoPayloadCore(
  req: any,
  options?: GeoBaselineOptions
): GeoResolutionResult | null {
  const { userAgent, pathname } = extractRequestMetadata(req);
  const matchedBot = matchBotPattern(userAgent);

  if (!matchedBot) {
    return null;
  }

  const payloadResolver = options?.payloadResolver || defaultMarkdownPayload;
  const payload = payloadResolver(pathname, matchedBot);
  const bytesServed = measureUtf8Bytes(payload);
  const originalBytes = matchRouteBaseline(pathname, options);
  const { bytesSaved, savingsRatio, isBandwidthSaved } = calculateBandwidthSavings(bytesServed, originalBytes);

  return {
    payload,
    botName: matchedBot.name,
    botVendor: matchedBot.vendor,
    botCategory: matchedBot.category,
    bytesServed,
    originalBytes,
    bytesSaved,
    savingsRatio,
    isBandwidthSaved,
    isBot: true
  };
}
