import { chromium } from '@playwright/test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

// Simple static HTTP server to serve current workspace files
const PORT = 4174;
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json'
};

const server = http.createServer((req, res) => {
  const cleanUrl = req.url.split('?')[0];
  const filePath = path.join(process.cwd(), cleanUrl);
  
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, async () => {
  console.log(`\n🚀 Local static server listening on http://127.0.0.1:${PORT}`);
  console.log(`🌐 Launching real Playwright Headless Browser (Simulating Stealth & Headless Visitor)...`);

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 }
    });

    const page = await context.newPage();

    // Inject stealth-like evasions (trying to hide navigator.webdriver)
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false
      });
    });

    console.log(`📡 Navigating Playwright to: http://127.0.0.1:${PORT}/packages/dashboard/index.html`);
    await page.goto(`http://127.0.0.1:${PORT}/packages/dashboard/index.html`, { waitUntil: 'networkidle' });

    // Wait for Sentinel auto-ingest to execute and render
    await page.waitForTimeout(1000);

    // Read values directly from the rendered DOM
    const eventCount = await page.locator('[data-testid="event-count"]').textContent();
    const humanTotal = await page.locator('#triage-human-total').textContent();
    const aiTotal = await page.locator('#triage-ai-total').textContent();
    const crawlerTotal = await page.locator('#triage-crawler-total').textContent();
    const latestScore = await page.locator('.score-box').first().textContent().catch(() => 'N/A');
    const latestTraceId = await page.locator('[data-testid="latest-trace-id"]').textContent().catch(() => 'N/A');

    console.log('\n==================================================');
    console.log('🎯 PLAYWRIGHT LIVE VISIT INSPECTION RESULT');
    console.log('==================================================');
    console.log(`📌 Total Observed Sessions (방문자 수): ${eventCount}`);
    console.log(`👤 Human Visitors: ${humanTotal}`);
    console.log(`🤖 AI Agents & LLMs: ${aiTotal}`);
    console.log(`🕷️ Crawlers & Tools: ${crawlerTotal}`);
    console.log(`📊 Auto-Ingested Trace ID: ${latestTraceId}`);
    console.log(`🛡️ Evaluated Risk Score: ${latestScore}`);
    console.log('==================================================\n');

    if (Number(eventCount) < 1) {
      throw new Error(`FAIL: Event count did not increase on Playwright visit! (count = ${eventCount})`);
    }

    console.log('✅ SUCCESS: Playwright visit was automatically captured and counted in dashboard!');
  } catch (err) {
    console.error('❌ Playwright Live Visit Error:', err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.close();
  }
});
