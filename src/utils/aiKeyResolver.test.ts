import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectKeyCandidates,
  fingerprintApiKey,
  isAuthKeyError,
  isPlaceholderKey,
  normalizeCandidateKey,
  redactSecretValues,
  resolveProviderHealthStatus,
} from './aiKeyResolver';

test('normalizeCandidateKey strips quotes, env prefixes, and Bearer tokens', () => {
  assert.equal(normalizeCandidateKey('  "AIzaSyTest12345"  '), 'AIzaSyTest12345');
  assert.equal(normalizeCandidateKey('GEMINI_API_KEY=AIzaSyTest12345'), 'AIzaSyTest12345');
  assert.equal(normalizeCandidateKey('Bearer gsk_testtoken999'), 'gsk_testtoken999');
});

test('isPlaceholderKey rejects blank and template values', () => {
  assert.equal(isPlaceholderKey(''), true);
  assert.equal(isPlaceholderKey('your_api_key_here'), true);
  assert.equal(isPlaceholderKey('undefined'), true);
  assert.equal(isPlaceholderKey('AIzaSyRealKey123'), false);
});

test('collectKeyCandidates deduplicates and prioritizes unrejected keys first', () => {
  const badKey = 'gsk_bad_key_12345';
  const goodKey = 'gsk_good_key_67890';
  const rejected = new Set([fingerprintApiKey('groq', badKey)]);

  const resolved = collectKeyCandidates(
    'groq',
    [
      ['CartAudit_GROQ_API_KEY', badKey],
      ['GROQ_API_KEY', goodKey],
      ['GROQ_KEY', goodKey],
    ],
    rejected
  );

  assert.equal(resolved.length, 2);
  assert.equal(resolved[0].source, 'GROQ_API_KEY');
  assert.equal(resolved[0].rejected, false);
  assert.equal(resolved[1].source, 'CartAudit_GROQ_API_KEY');
  assert.equal(resolved[1].rejected, true);
});

test('isAuthKeyError detects 401/403, expired keys, and Groq invalid_api_key errors', () => {
  assert.equal(isAuthKeyError(401, 'Invalid API Key', 'invalid_api_key'), true);
  assert.equal(isAuthKeyError(400, 'API key expired. Please renew the API key.', 'INVALID_ARGUMENT'), true);
  assert.equal(isAuthKeyError(503, 'Model overloaded', 'UNAVAILABLE'), false);
});

test('resolveProviderHealthStatus distinguishes active, invalid_key, cooldown, and unconfigured', () => {
  assert.equal(
    resolveProviderHealthStatus({ allCandidatesCount: 0, activeCandidatesCount: 0, inCooldown: false }),
    'unconfigured'
  );
  assert.equal(
    resolveProviderHealthStatus({ allCandidatesCount: 1, activeCandidatesCount: 0, inCooldown: false }),
    'invalid_key'
  );
  assert.equal(
    resolveProviderHealthStatus({ allCandidatesCount: 1, activeCandidatesCount: 1, inCooldown: true }),
    'cooldown'
  );
  assert.equal(
    resolveProviderHealthStatus({ allCandidatesCount: 1, activeCandidatesCount: 1, inCooldown: false }),
    'active'
  );
});

test('redactSecretValues masks Gemini, Groq, and Bearer credentials', () => {
  const masked = redactSecretValues(
    'Auth failed for AIzaSyAbCdEf1234567890 and gsk_AbCdEf1234567890 via Bearer tok123456'
  );
  assert.equal(masked.includes('AIzaSyAbCdEf'), false);
  assert.equal(masked.includes('gsk_AbCdEf'), false);
  assert.equal(masked.includes('tok123456'), false);
});
