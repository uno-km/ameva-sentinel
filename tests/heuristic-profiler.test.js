import assert from 'node:assert';
import { HeuristicProfileEngine } from '../packages/sentinel/dist/index.js';

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
    failed++;
  }
}

async function main() {
  console.log('🧪 Running Heuristic Profile Engine Test Suite...');

  await test('Gate 1: SwiftShader virtual GPU detection -> CLOUD_AUTOMATION_BOT', async () => {
    const verdict = HeuristicProfileEngine.profileSession({
      visitorId: 'usr_azure_bot_1',
      webglRenderer: 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)',
      country: 'US',
      city: 'Boydton',
      installedFonts: 'Consolas, Segoe UI'
    });

    assert.strictEqual(verdict.persona, 'CLOUD_AUTOMATION_BOT');
    assert.strictEqual(verdict.riskLevel, 'HIGH');
    assert.ok(verdict.confidence >= 0.9);
    assert.ok(verdict.tags.includes('Headless_Browser'));
    assert.ok(verdict.summaryNarrative.includes('자동화 봇 의심'));
  });

  await test('Gate 2: Datacenter proxy IP without GPU acceleration -> HEADLESS_SCRAPER', async () => {
    const verdict = HeuristicProfileEngine.profileSession({
      visitorId: 'usr_ashburn_scraper',
      webglRenderer: 'unknown',
      country: 'US',
      city: 'Ashburn'
    });

    assert.strictEqual(verdict.persona, 'HEADLESS_SCRAPER');
    assert.strictEqual(verdict.riskLevel, 'MEDIUM');
    assert.ok(verdict.tags.includes('Datacenter_Proxy'));
    assert.ok(verdict.summaryNarrative.includes('데이터센터 크롤러'));
  });

  await test('Gate 3: Programmer fonts (D2Coding, Cascadia Code) -> SOFTWARE_ENGINEER', async () => {
    const verdict = HeuristicProfileEngine.profileSession({
      visitorId: 'usr_dev_korea',
      webglRenderer: 'ANGLE (Intel, Intel(R) Arc(TM) 130V GPU (8GB), Direct3D11)',
      installedFonts: 'D2Coding, Cascadia Code, Malgun Gothic, Segoe UI',
      country: 'KR',
      city: 'Seongnam-si'
    });

    assert.strictEqual(verdict.persona, 'SOFTWARE_ENGINEER');
    assert.strictEqual(verdict.riskLevel, 'LOW');
    assert.ok(verdict.confidence >= 0.85);
    assert.ok(verdict.tags.includes('Developer_Environment'));
    assert.ok(verdict.summaryNarrative.includes('개발자/엔지니어 환경'));
  });

  await test('Gate 4: 5+ repeat visits -> POWER_USER with high retention tags', async () => {
    const verdict = HeuristicProfileEngine.profileSession({
      visitorId: 'usr_loyal_user',
      totalVisitCount: 7,
      country: 'KR',
      city: 'Seoul'
    });

    assert.strictEqual(verdict.persona, 'POWER_USER');
    assert.ok(verdict.tags.includes('High_Retention'));
    assert.ok(verdict.tags.includes('Visits_7'));
    assert.ok(verdict.summaryNarrative.includes('코어 사용자'));
  });

  await test('Gate 5: Workstation charging battery & 144Hz display tagging', async () => {
    const verdict = HeuristicProfileEngine.profileSession({
      visitorId: 'usr_gamer_workstation',
      isCharging: true,
      batteryLevel: 95,
      screenHz: 144,
      country: 'KR',
      city: 'Gangnam-gu'
    });

    assert.ok(verdict.tags.includes('AC_Powered'));
    assert.ok(verdict.tags.includes('Workstation'));
    assert.ok(verdict.tags.includes('High_Refresh_Display'));
    assert.ok(verdict.tags.includes('144Hz'));
  });

  await test('Gate 6: Standard desktop casual user default fallback', async () => {
    const verdict = HeuristicProfileEngine.profileSession({
      visitorId: 'usr_casual_reader',
      country: 'JP',
      city: 'Tokyo',
      totalVisitCount: 1
    });

    assert.strictEqual(verdict.persona, 'DESKTOP_STANDARD');
    assert.strictEqual(verdict.riskLevel, 'LOW');
    assert.ok(verdict.summaryNarrative.includes('일반 방문자'));
  });

  await test('Gate 7: sentinel.profileFootprint() and sentinel.aggregatePathFlows() facade methods', async () => {
    const { sentinel } = await import('../packages/sentinel/dist/index.js');
    const v = sentinel.profileFootprint({
      visitorId: 'usr_facade_test',
      webglRenderer: 'SwiftShader'
    });
    assert.strictEqual(v.persona, 'CLOUD_AUTOMATION_BOT');

    const m = sentinel.aggregatePathFlows(['/a -> /b -> /c']);
    assert.strictEqual(m.nodes.length, 3);
    assert.strictEqual(m.links.length, 2);
  });

  await test('Gate 8: sentinel.getForensicAnalytics() headless analytics generation', async () => {
    const { sentinel } = await import('../packages/sentinel/dist/index.js');
    const report = sentinel.getForensicAnalytics({
      footprints: [
        {
          visitorId: 'usr_bot_1',
          webglRenderer: 'SwiftShader',
          pastPathsHistory: '/a -> /b'
        },
        {
          visitorId: 'usr_dev_1',
          installedFonts: 'D2Coding, Cascadia Code',
          pastPathsHistory: '/a -> /b -> /c'
        }
      ]
    });

    assert.strictEqual(report.overview.totalRecords, 2);
    assert.strictEqual(report.overview.totalUniqueVisitors, 2);
    assert.strictEqual(report.overview.botCount, 1);
    assert.strictEqual(report.overview.engineerCount, 1);
    assert.strictEqual(report.verdicts.length, 2);
    assert.strictEqual(report.flowMatrix.links.length, 2);
  });

  console.log('\n==================================================');
  console.log(`Results: ${passed} passed, ${failed} failed, total ${passed + failed}`);
  console.log(JSON.stringify({ suite: 'heuristic_profiler', passed, failed, total: passed + failed }));

  if (failed > 0) process.exit(1);
}

main();
