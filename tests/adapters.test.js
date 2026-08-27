import assert from 'node:assert';
import { test, describe } from 'node:test';
import {
  createExpressSentinelObserver,
  createFastifySentinelObserver,
  withSentinelObservation,
  createExpressSentinelEnforcer,
  createFastifySentinelEnforcer
} from '../packages/sentinel/dist/index.js';
import {
  SentinelCostGuardEvaluator,
  CostPolicyRegistry
} from '../packages/risk-core/dist/index.js';

describe('Framework Observer & Explicit Enforcer Boundary Verification', () => {
  const registry = new CostPolicyRegistry();
  registry.config.routes.push({
    method: 'GET',
    path: '/api/v1/chart',
    cost: 10,
    page_size_max: 50
  });
  if (typeof registry._indexRoutes === 'function') {
    registry._indexRoutes();
  }

  const evaluator = new SentinelCostGuardEvaluator({
    policyRegistry: registry,
    enforceByDefault: true
  });

  test('Express Observer: never calls res.status/json/send/end, always calls next(), and populates req.sentinel', async () => {
    let statusCalls = 0;
    let jsonCalls = 0;
    let sendCalls = 0;
    let endCalls = 0;
    let nextCalls = 0;
    let assessmentCallbackCalls = 0;

    const res = {
      status(code) { statusCalls++; return this; },
      json(data) { jsonCalls++; return this; },
      send(data) { sendCalls++; return this; },
      end() { endCalls++; return this; },
      setHeader() {}
    };

    const observer = createExpressSentinelObserver({
      evaluator,
      onAssessment(ctx) {
        assessmentCallbackCalls++;
        assert.ok(ctx.requestInspection);
        assert.ok(ctx.clientAddressInspection);
      }
    });

    // 1. Valid request
    const req1 = {
      method: 'GET',
      originalUrl: '/api/v1/chart?pageSize=20',
      query: { pageSize: 20 },
      headers: {}
    };
    await observer(req1, res, () => { nextCalls++; });
    assert.strictEqual(nextCalls, 1);
    assert.strictEqual(statusCalls, 0);
    assert.strictEqual(assessmentCallbackCalls, 1);
    assert.strictEqual(req1.sentinel.decision.action, 'ALLOW');

    // 2. Ambiguous / invalid path in Observer: STILL calls next(), NEVER terminates
    const req2 = {
      method: 'GET',
      originalUrl: '/api/v1/chart/..;/admin',
      query: {},
      headers: {}
    };
    await observer(req2, res, () => { nextCalls++; });
    assert.strictEqual(nextCalls, 2);
    assert.strictEqual(statusCalls, 0);
    assert.strictEqual(jsonCalls, 0);
    assert.strictEqual(req2.sentinel.requestInspection.acceptedByInspector, false);

    // 3. Quota / Shape violation in Observer: STILL calls next()
    const req3 = {
      method: 'GET',
      originalUrl: '/api/v1/chart?pageSize=100',
      query: { pageSize: 100 },
      headers: {}
    };
    await observer(req3, res, () => { nextCalls++; });
    assert.strictEqual(nextCalls, 3);
    assert.strictEqual(statusCalls, 0);
    assert.strictEqual(jsonCalls, 0);
    assert.strictEqual(req3.sentinel.decision.allowed, false);
    assert.strictEqual(req3.sentinel.decision.violationDetected, true);
  });

  test('Fastify Observer: never calls reply.code/send and allows continuation', async () => {
    let codeCalls = 0;
    let sendCalls = 0;
    const reply = {
      code(c) { codeCalls++; return this; },
      send(d) { sendCalls++; return this; },
      header() {}
    };

    const observer = createFastifySentinelObserver({ evaluator });
    const req = {
      raw: { url: '/api/v1/chart?pageSize=100' },
      query: { pageSize: 100 },
      headers: {}
    };

    await observer(req, reply);
    assert.strictEqual(codeCalls, 0);
    assert.strictEqual(sendCalls, 0);
    assert.ok(req.sentinel);
    assert.strictEqual(req.sentinel.decision.violationDetected, true);
  });

  test('Next.js Observer: always invokes downstream handler and returns its response', async () => {
    let handlerExecuted = false;
    const downstreamHandler = async (req) => {
      handlerExecuted = true;
      return new Response(JSON.stringify({ from: 'handler' }), { status: 200 });
    };

    const wrapped = withSentinelObservation(downstreamHandler, { evaluator });
    const req = {
      url: 'http://localhost/api/v1/chart?pageSize=100',
      headers: new Headers()
    };

    const res = await wrapped(req);
    assert.strictEqual(handlerExecuted, true);
    assert.strictEqual(res.status, 200);
    assert.ok(req.sentinel);
    assert.strictEqual(req.sentinel.decision.violationDetected, true);
  });

  test('Explicit Enforcer: requires mandatory decide callback and terminates only when decided', async () => {
    // 1. Missing decide callback throws TypeError
    assert.throws(() => {
      createExpressSentinelEnforcer({});
    }, /requires a mandatory options\.decide callback/);

    let statusCalledWith = 0;
    let jsonBody = null;
    let nextCalls = 0;

    const res = {
      status(code) { statusCalledWith = code; return this; },
      json(body) { jsonBody = body; return this; },
      end() { return this; },
      setHeader() {}
    };

    // 2. Enforcer with custom decision callback
    const enforcer = createExpressSentinelEnforcer({
      evaluator,
      decide(ctx) {
        if (ctx.decision && !ctx.decision.allowed) {
          return {
            action: 'respond',
            status: 429,
            body: { customBlocked: true, reason: ctx.decision.reasonCode }
          };
        }
        return { action: 'continue' };
      }
    });

    // Valid request -> continue
    const req1 = {
      method: 'GET',
      originalUrl: '/api/v1/chart?pageSize=20',
      query: { pageSize: 20 },
      headers: {}
    };
    await enforcer(req1, res, () => { nextCalls++; });
    assert.strictEqual(nextCalls, 1);
    assert.strictEqual(statusCalledWith, 0);

    // Violating request -> blocked by consumer policy
    const req2 = {
      method: 'GET',
      originalUrl: '/api/v1/chart?pageSize=100',
      query: { pageSize: 100 },
      headers: {}
    };
    await enforcer(req2, res, () => { nextCalls++; });
    assert.strictEqual(nextCalls, 1); // next NOT called
    assert.strictEqual(statusCalledWith, 429);
    assert.deepStrictEqual(jsonBody, {
      customBlocked: true,
      reason: 'REQUEST_SHAPE_EXCEEDED'
    });
  });
});
