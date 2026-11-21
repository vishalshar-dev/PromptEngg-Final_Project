import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchGeminiHealth,
  getCachedGeminiConfigured,
  markGeminiConfigured,
  resetGeminiHealthCache,
} from './aiReadiness';

test('fetchGeminiHealth caches server response and avoids duplicate fetches', async () => {
  resetGeminiHealthCache();
  assert.equal(getCachedGeminiConfigured(), null);

  let fetchCount = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    fetchCount += 1;
    return new Response(
      JSON.stringify({ ok: true, geminiConfigured: false, model: 'gemini-4-hydrogen' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }) as typeof fetch;

  try {
    const [first, second] = await Promise.all([fetchGeminiHealth(), fetchGeminiHealth()]);
    assert.equal(fetchCount, 1);
    assert.equal(first.geminiConfigured, false);
    assert.equal(second.geminiConfigured, false);
    assert.equal(getCachedGeminiConfigured(), false);

    markGeminiConfigured(true);
    assert.equal(getCachedGeminiConfigured(), true);
  } finally {
    globalThis.fetch = originalFetch;
    resetGeminiHealthCache();
  }
});

test('fetchGeminiHealth degrades safely on network error', async () => {
  resetGeminiHealthCache();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error('offline');
  }) as typeof fetch;

  try {
    const status = await fetchGeminiHealth();
    assert.equal(status.ok, false);
    assert.equal(status.geminiConfigured, false);
    assert.equal(getCachedGeminiConfigured(), false);
  } finally {
    globalThis.fetch = originalFetch;
    resetGeminiHealthCache();
  }
});
