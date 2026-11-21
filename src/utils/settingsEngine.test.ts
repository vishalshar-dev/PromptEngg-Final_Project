import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_FEATURE_SETTINGS,
  PRESET_DEFINITIONS,
  countEnabledFeatures,
  detectSettingsPreset,
  getPresetSettings,
  isSectionEnabled,
  mergeFeatureSettings,
  resolveSafeSection,
  sanitizeFeatureSettings,
  sanitizeThemeMode,
} from './settingsEngine';
import { normalizeBackupPayload } from './storeHelpers';

test('getPresetSettings returns clean presets with accurate enabled counts', () => {
  const simple = getPresetSettings('simple');
  const standard = getPresetSettings('standard');
  const full = getPresetSettings('full');

  assert.equal(simple.preset, 'simple');
  assert.equal(countEnabledFeatures(simple), 0);

  assert.equal(standard.preset, 'standard');
  assert.equal(standard.showInsights, true);
  assert.equal(standard.showScanner, true);
  assert.equal(standard.showWellness, false);

  assert.equal(full.preset, 'full');
  assert.equal(countEnabledFeatures(full), 14);
});

test('mergeFeatureSettings switches to custom when deviated and detects matching preset again', () => {
  const full = getPresetSettings('full');
  const modified = mergeFeatureSettings(full, { showWellness: false });
  assert.equal(modified.preset, 'custom');
  assert.equal(modified.showWellness, false);
  assert.equal(modified.showInsights, true);

  const restored = mergeFeatureSettings(modified, { showWellness: true });
  assert.equal(restored.preset, 'full');
  assert.equal(detectSettingsPreset(restored), 'full');
});

test('sanitizeFeatureSettings & sanitizeThemeMode handle invalid or partial persisted payloads', () => {
  assert.equal(sanitizeThemeMode('dark'), 'dark');
  assert.equal(sanitizeThemeMode('light'), 'light');
  assert.equal(sanitizeThemeMode('blue'), 'light');
  assert.equal(sanitizeThemeMode(undefined), 'light');

  const sanitizedEmpty = sanitizeFeatureSettings(null);
  assert.deepEqual(sanitizedEmpty, DEFAULT_FEATURE_SETTINGS);

  const partial = sanitizeFeatureSettings({
    showWellness: false,
    showScanner: 'invalid-string',
  });
  assert.equal(partial.showWellness, false);
  assert.equal(partial.showScanner, true);
  assert.equal(partial.preset, 'custom');

  const simpleSanitized = sanitizeFeatureSettings(PRESET_DEFINITIONS.simple.settings);
  assert.equal(simpleSanitized.preset, 'simple');
});

test('isSectionEnabled and resolveSafeSection keep core routes accessible and guard disabled ones', () => {
  const simple = getPresetSettings('simple');

  // Core tabs stay enabled even in simple mode
  assert.equal(isSectionEnabled('overview', simple), true);
  assert.equal(isSectionEnabled('shopping', simple), true);
  assert.equal(isSectionEnabled('expenses', simple), true);

  // Restricted optional tabs redirect safely back to overview
  assert.equal(isSectionEnabled('insights', simple), false);
  assert.equal(isSectionEnabled('scanner', simple), false);
  assert.equal(isSectionEnabled('wellness', simple), false);
  assert.equal(resolveSafeSection('wellness', simple), 'overview');
  assert.equal(resolveSafeSection('shopping', simple), 'shopping');
});

test('normalizeBackupPayload preserves valid theme and featureSettings safely', () => {
  const normalized = normalizeBackupPayload({
    version: 1,
    transactions: [],
    theme: 'dark',
    featureSettings: {
      showInsights: true,
      showScanner: false,
      showWellness: false,
    },
  });

  assert.equal(normalized.theme, 'dark');
  assert.equal(normalized.featureSettings?.showInsights, true);
  assert.equal(normalized.featureSettings?.showScanner, false);
  assert.equal(normalized.featureSettings?.showWellness, false);
  assert.equal(normalized.featureSettings?.preset, 'custom');
});
