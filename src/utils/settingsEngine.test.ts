import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_FEATURE_SETTINGS,
  DEFAULT_VISUAL_THEME,
  PRESET_DEFINITIONS,
  TOTAL_FEATURE_TOGGLES_COUNT,
  VISUAL_BUNDLES,
  countEnabledFeatures,
  detectSettingsPreset,
  getChartThemeTokens,
  getPresetSettings,
  isSameVisualTheme,
  isSectionEnabled,
  mergeFeatureSettings,
  mergeVisualTheme,
  resolveSafeSection,
  sanitizeFeatureSettings,
  sanitizeThemeMode,
  sanitizeVisualTheme,
} from './settingsEngine';
import { buildWorkspaceBackupPayload, normalizeBackupPayload } from './storeHelpers';

test('getPresetSettings returns clean presets with accurate enabled counts', () => {
  const simple = getPresetSettings('simple');
  const standard = getPresetSettings('standard');
  const full = getPresetSettings('full');

  assert.equal(simple.preset, 'simple');
  assert.equal(simple.showPennyCompanion, false);
  assert.equal(countEnabledFeatures(simple), 0);

  assert.equal(standard.preset, 'standard');
  assert.equal(standard.showInsights, true);
  assert.equal(standard.showScanner, true);
  assert.equal(standard.showPennyCompanion, true);
  assert.equal(standard.showWellness, false);

  assert.equal(full.preset, 'full');
  assert.equal(full.showPennyCompanion, true);
  assert.equal(countEnabledFeatures(full), TOTAL_FEATURE_TOGGLES_COUNT);
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

test('normalizeBackupPayload preserves valid theme, visualTheme, and featureSettings safely', () => {
  const normalized = normalizeBackupPayload({
    version: 1,
    transactions: [],
    theme: 'dark',
    visualTheme: {
      mood: 'stealth_mint',
      surface: 'tactile_wells',
      font: 'jakarta_mono',
      motion: 'rich_tactile',
    },
    featureSettings: {
      showInsights: true,
      showScanner: false,
      showWellness: false,
    },
  });

  assert.equal(normalized.theme, 'dark');
  assert.deepEqual(normalized.visualTheme, {
    mood: 'stealth_mint',
    surface: 'tactile_wells',
    font: 'jakarta_mono',
    motion: 'rich_tactile',
  });
  assert.equal(normalized.featureSettings?.showInsights, true);
  assert.equal(normalized.featureSettings?.showScanner, false);
  assert.equal(normalized.featureSettings?.showWellness, false);
  assert.equal(normalized.featureSettings?.preset, 'custom');
});

test('sanitizeVisualTheme, mergeVisualTheme, and isSameVisualTheme handle valid and invalid inputs', () => {
  assert.deepEqual(sanitizeVisualTheme(null), DEFAULT_VISUAL_THEME);
  assert.deepEqual(
    sanitizeVisualTheme({
      mood: 'invalid_mood',
      surface: 'frosted_glass',
      font: 123,
      motion: 'calm_minimal',
    }),
    {
      mood: DEFAULT_VISUAL_THEME.mood,
      surface: 'frosted_glass',
      font: DEFAULT_VISUAL_THEME.font,
      motion: 'calm_minimal',
    }
  );

  const merged = mergeVisualTheme(DEFAULT_VISUAL_THEME, {
    mood: 'frosted_sapphire',
    surface: 'frosted_glass',
  });
  assert.equal(merged.mood, 'frosted_sapphire');
  assert.equal(merged.surface, 'frosted_glass');
  assert.equal(merged.font, DEFAULT_VISUAL_THEME.font);

  const credBundle = VISUAL_BUNDLES.find((b) => b.id === 'cred_obsidian');
  assert.ok(credBundle);
  assert.equal(isSameVisualTheme(credBundle.config, { ...credBundle.config }), true);
  assert.equal(isSameVisualTheme(credBundle.config, DEFAULT_VISUAL_THEME), false);
});

test('getChartThemeTokens adapts colors to theme mode and mood cleanly', () => {
  const lightIndigo = getChartThemeTokens('light', 'obsidian_indigo');
  const darkMint = getChartThemeTokens('dark', 'stealth_mint');

  assert.notEqual(lightIndigo.accent, darkMint.accent);
  assert.notEqual(lightIndigo.tooltipStyle.backgroundColor, darkMint.tooltipStyle.backgroundColor);
  assert.ok(darkMint.secondarySeries.length >= 5);
});

test('buildWorkspaceBackupPayload builds a complete v1 payload accepted by normalizeBackupPayload', () => {
  const payload = buildWorkspaceBackupPayload(
    {
      transactions: [],
      items: [],
      categories: ['Groceries'],
      totalBudget: 12000,
      sessionBudget: 1500,
      budgetResetDay: 5,
      budgetRolloverEnabled: true,
      categoryCaps: { Groceries: 5000 },
      savedAudits: [],
      people: [],
      sharedExpenses: [],
      settlements: [],
      isBrokeMode: false,
      theme: 'dark',
      featureSettings: getPresetSettings('standard'),
      myUpiId: '  Alex@UPI  ',
      myUpiName: '  Alex  ',
    },
    '2026-11-24T10:00:00.000Z'
  );

  assert.equal(payload.version, 1);
  assert.equal(payload.exportedAt, '2026-11-24T10:00:00.000Z');
  assert.equal(payload.totalBudget, 12000);

  const normalized = normalizeBackupPayload(payload);
  assert.equal(normalized.totalBudget, 12000);
  assert.equal(normalized.budgetResetDay, 5);
  assert.equal(normalized.budgetRolloverEnabled, true);
  assert.equal(normalized.theme, 'dark');
  assert.equal(normalized.featureSettings?.preset, 'standard');
  assert.equal(normalized.myUpiId, 'alex@upi');
  assert.equal(normalized.myUpiName, 'Alex');
});

