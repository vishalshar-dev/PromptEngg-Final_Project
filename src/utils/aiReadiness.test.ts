import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchGeminiHealth,
  getCachedAiConfigured,
  getCachedGeminiConfigured,
  markAiConfigured,
  markGeminiConfigured,
  resetGeminiHealthCache,
} from './aiReadiness';

test('fetchGeminiHealth caches server response and tracks both Gemini and Groq readiness', async () => {
  resetGeminiHealthCache();
  assert.equal(getCachedGeminiConfigured(), null);
  assert.equal(getCachedAiConfigured(), null);

  let fetchCount = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    fetchCount += 1;
    return new Response(
      JSON.stringify({
        ok: true,
        geminiConfigured: false,
        groqConfigured: true,
        aiConfigured: true,
        visionConfigured: true,
        pennyConfigured: true,
        model: 'gemini-4-hydrogen',
        pennyModel: 'openai/gpt-oss-120b',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }) as typeof fetch;

  try {
    const [first, second] = await Promise.all([fetchGeminiHealth(), fetchGeminiHealth()]);
    assert.equal(fetchCount, 1);
    assert.equal(first.geminiConfigured, false);
    assert.equal(first.groqConfigured, true);
    assert.equal(first.aiConfigured, true);
    assert.equal(second.aiConfigured, true);
    assert.equal(getCachedGeminiConfigured(), false);
    assert.equal(getCachedAiConfigured(), true);

    markGeminiConfigured(true);
    assert.equal(getCachedGeminiConfigured(), true);

    markAiConfigured(false);
    assert.equal(getCachedAiConfigured(), false);
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
    assert.equal(status.groqConfigured, false);
    assert.equal(status.aiConfigured, false);
    assert.equal(getCachedGeminiConfigured(), false);
    assert.equal(getCachedAiConfigured(), false);
  } finally {
    globalThis.fetch = originalFetch;
    resetGeminiHealthCache();
  }
});
