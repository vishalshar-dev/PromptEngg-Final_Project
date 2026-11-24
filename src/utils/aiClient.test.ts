import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearLiveAiCooldown,
  enqueueAiPost,
  getLiveAiAvailability,
  isTransientAiFailure,
  LIVE_AI_COOLDOWN_MS,
  parseJsonResponseSafe,
  resetAiClientForTests,
} from './aiClient';

test('parseJsonResponseSafe returns null for HTML 502/503 proxy pages and parses valid JSON cleanly', async () => {
  const htmlRes = new Response('<!doctype html><html><body>503 Tunnel Closed</body></html>', {
    status: 503,
    headers: { 'Content-Type': 'text/html' },
  });
  assert.equal(await parseJsonResponseSafe(htmlRes), null);

  const jsonRes = new Response(JSON.stringify({ answer: 'ok', ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
  assert.deepEqual(await parseJsonResponseSafe<{ answer: string; ok: boolean }>(jsonRes), {
    answer: 'ok',
    ok: true,
  });
});

test('isTransientAiFailure identifies 503 UNAVAILABLE, 429 RESOURCE_EXHAUSTED, and timeouts', () => {
  assert.equal(isTransientAiFailure(503, 'UNAVAILABLE', 'High demand'), true);
  assert.equal(isTransientAiFailure(429, 'RESOURCE_EXHAUSTED', 'Rate limit'), true);
  assert.equal(isTransientAiFailure(0, 'NETWORK_ERROR', 'Failed to fetch'), true);
  assert.equal(isTransientAiFailure(400, 'INVALID_ARGUMENT', 'Bad input'), false);
});

test('enqueueAiPost runs requests sequentially without parallel overlap', async () => {
  resetAiClientForTests();
  let activeCount = 0;
  let maxConcurrent = 0;
  const order: number[] = [];

  const mockFetch: typeof fetch = async (_url, init) => {
    activeCount += 1;
    maxConcurrent = Math.max(maxConcurrent, activeCount);
    const body = JSON.parse(String(init?.body ?? '{}')) as { seq: number };
    await new Promise((r) => setTimeout(r, body.seq === 1 ? 35 : 5));
    order.push(body.seq);
    activeCount -= 1;
    return new Response(JSON.stringify({ seq: body.seq }), { status: 200 });
  };

  const [r1, r2, r3] = await Promise.all([
    enqueueAiPost<{ seq: number }>('/api/penny-chat', { seq: 1 }, { fetchImpl: mockFetch }),
    enqueueAiPost<{ seq: number }>('/api/penny-chat', { seq: 2 }, { fetchImpl: mockFetch }),
    enqueueAiPost<{ seq: number }>('/api/penny-chat', { seq: 3 }, { fetchImpl: mockFetch }),
  ]);

  assert.equal(maxConcurrent, 1);
  assert.deepEqual(order, [1, 2, 3]);
  assert.equal(r1.ok && r1.data.seq, 1);
  assert.equal(r2.ok && r2.data.seq, 2);
  assert.equal(r3.ok && r3.data.seq, 3);
});

test('enqueueAiPost enters cooldown on 503, short-circuits immediately during cooldown, and auto-recovers after expiry', async () => {
  resetAiClientForTests();
  let clock = 100_000;
  let networkCalls = 0;

  const busyFetch: typeof fetch = async () => {
    networkCalls += 1;
    return new Response(
      JSON.stringify({
        error: 'This model is currently experiencing high demand.',
        code: 'UNAVAILABLE',
      }),
      { status: 503 }
    );
  };

  const first = await enqueueAiPost('/api/penny-chat', { q: 1 }, {
    fetchImpl: busyFetch,
    nowMs: () => clock,
  });
  assert.equal(first.ok, false);
  assert.equal(networkCalls, 1);
  assert.equal(getLiveAiAvailability(clock).mode, 'cooldown');

  // Within 60s cooldown, second call must skip network completely
  clock += 10_000;
  const second = await enqueueAiPost('/api/penny-chat', { q: 2 }, {
    fetchImpl: busyFetch,
    nowMs: () => clock,
  });
  assert.equal(second.ok, false);
  if (!second.ok) {
    assert.equal(second.skippedByCooldown, true);
  }
  assert.equal(networkCalls, 1);

  // After cooldown expires, next call probes live server again and recovers on 200
  clock += LIVE_AI_COOLDOWN_MS;
  assert.equal(getLiveAiAvailability(clock).mode, 'live');
  const healthyFetch: typeof fetch = async () => {
    networkCalls += 1;
    return new Response(JSON.stringify({ answer: 'Recovered!' }), { status: 200 });
  };
  const third = await enqueueAiPost<{ answer: string }>('/api/penny-chat', { q: 3 }, {
    fetchImpl: healthyFetch,
    nowMs: () => clock,
  });
  assert.equal(networkCalls, 2);
  assert.equal(third.ok, true);
  if (third.ok) {
    assert.equal(third.data.answer, 'Recovered!');
  }
  assert.equal(getLiveAiAvailability(clock).mode, 'live');

  clearLiveAiCooldown();
});
