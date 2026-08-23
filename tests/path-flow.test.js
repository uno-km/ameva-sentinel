import assert from 'node:assert';
import { PathFlowAggregator } from '../packages/sentinel/dist/index.js';

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
  console.log('🧪 Running Path Flow Aggregator Test Suite...');

  await test('Gate 1: Sequential path parsing (A -> B -> C) into 3 nodes and 2 weighted links', async () => {
    const matrix = PathFlowAggregator.aggregateFlows([
      '/foundation/ -> /lib/playwright/ -> /sdk/sentinel/'
    ]);

    assert.strictEqual(matrix.nodes.length, 3);
    assert.strictEqual(matrix.links.length, 2);
    assert.strictEqual(matrix.totalHops, 2);
    assert.strictEqual(matrix.uniquePaths, 1);

    const fToP = matrix.links.find(l => l.source === '/foundation/' && l.target === '/lib/playwright/');
    assert.ok(fToP);
    assert.strictEqual(fToP.value, 1);

    const pToS = matrix.links.find(l => l.source === '/lib/playwright/' && l.target === '/sdk/sentinel/');
    assert.ok(pToS);
    assert.strictEqual(pToS.value, 1);
  });

  await test('Gate 2: Multi-session link frequency aggregation', async () => {
    const matrix = PathFlowAggregator.aggregateFlows([
      '/ -> /foundation/',
      '/ -> /foundation/',
      '/ -> /foundation/ -> /lib/forge/',
      '/ -> /lib/stt/'
    ]);

    assert.strictEqual(matrix.uniquePaths, 4);

    const rootToFoundation = matrix.links.find(l => l.source === '/' && l.target === '/foundation/');
    assert.ok(rootToFoundation);
    assert.strictEqual(rootToFoundation.value, 3);

    const rootNode = matrix.nodes.find(n => n.id === '/');
    assert.ok(rootNode);
    assert.strictEqual(rootNode.totalVisits, 4);
  });

  await test('Gate 3: Cycle handling (A -> B -> A -> B)', async () => {
    const matrix = PathFlowAggregator.aggregateFlows([
      '/foundation/ -> /lib/playwright/ -> /foundation/ -> /lib/playwright/'
    ]);

    assert.strictEqual(matrix.nodes.length, 2);
    assert.strictEqual(matrix.totalHops, 3);

    const fToP = matrix.links.find(l => l.source === '/foundation/' && l.target === '/lib/playwright/');
    const pToF = matrix.links.find(l => l.source === '/lib/playwright/' && l.target === '/foundation/');

    assert.strictEqual(fToP?.value, 2);
    assert.strictEqual(pToF?.value, 1);
  });

  await test('Gate 4: Unicode arrow parsing (A ──> B)', async () => {
    const matrix = PathFlowAggregator.aggregateFlows([
      '/foundation/ ──> /lib/playwright/ ──> /sdk/sentinel/observability'
    ]);

    assert.strictEqual(matrix.nodes.length, 3);
    assert.strictEqual(matrix.links.length, 2);
    assert.ok(matrix.nodes.some(n => n.id === '/sdk/sentinel/observability'));
  });

  await test('Gate 5: Empty, null, and whitespace path resilience', async () => {
    const matrix = PathFlowAggregator.aggregateFlows([
      null,
      undefined,
      '',
      '   ',
      '/single-page/'
    ]);

    assert.strictEqual(matrix.uniquePaths, 1);
    assert.strictEqual(matrix.nodes.length, 1);
    assert.strictEqual(matrix.links.length, 0);
    assert.strictEqual(matrix.totalHops, 0);
  });

  console.log('\n==================================================');
  console.log(`Results: ${passed} passed, ${failed} failed, total ${passed + failed}`);
  console.log(JSON.stringify({ suite: 'path_flow', passed, failed, total: passed + failed }));

  if (failed > 0) process.exit(1);
}

main();
