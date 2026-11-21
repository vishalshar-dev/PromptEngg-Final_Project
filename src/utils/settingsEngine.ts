import type { FeatureSettings, SettingsPreset, ThemeMode } from '../types/models';
import type { AppSection } from '../components/ui/AppShell';

export const DEFAULT_FEATURE_SETTINGS: FeatureSettings = {
  preset: 'full',
  showInsights: true,
  showScanner: true,
  showWellness: true,
  showPennyCompanion: true,
  showSmartInsightsOnOverview: true,
  showShopSummaryMetrics: true,
  showShopBaskets: true,
  showShopRecurring: true,
  showShopHistory: true,
  showPriceTracker: true,
  showAuditComparator: true,
  showAuditGuardrail: true,
  showAuditFeeScanner: true,
  showAuditHistory: true,
  showAuditExportBackup: true,
};

export const FEATURE_TOGGLE_KEYS: Array<Exclude<keyof FeatureSettings, 'preset'>> = [
  'showInsights',
  'showScanner',
  'showWellness',
  'showPennyCompanion',
  'showSmartInsightsOnOverview',
  'showShopSummaryMetrics',
  'showShopBaskets',
  'showShopRecurring',
  'showShopHistory',
  'showPriceTracker',
  'showAuditComparator',
  'showAuditGuardrail',
  'showAuditFeeScanner',
  'showAuditHistory',
  'showAuditExportBackup',
];

export const TOTAL_FEATURE_TOGGLES_COUNT = FEATURE_TOGGLE_KEYS.length;

export const PRESET_DEFINITIONS: Record<
  Exclude<SettingsPreset, 'custom'>,
  {
    label: string;
    subtitle: string;
    settings: FeatureSettings;
  }
> = {
  simple: {
    label: 'Simple',
    subtitle: 'Budget overview, clean shop catalog, and expenses only',
    settings: {
      preset: 'simple',
      showInsights: false,
      showScanner: false,
      showWellness: false,
      showPennyCompanion: false,
      showSmartInsightsOnOverview: false,
      showShopSummaryMetrics: false,
      showShopBaskets: false,
      showShopRecurring: false,
      showShopHistory: false,
      showPriceTracker: false,
      showAuditComparator: false,
      showAuditGuardrail: false,
      showAuditFeeScanner: false,
      showAuditHistory: false,
      showAuditExportBackup: false,
    },
  },
  standard: {
    label: 'Standard',
    subtitle: 'Shopping, expenses, scanner, insights, and floating Penny',
    settings: {
      preset: 'standard',
      showInsights: true,
      showScanner: true,
      showWellness: false,
      showPennyCompanion: true,
      showSmartInsightsOnOverview: true,
      showShopSummaryMetrics: true,
      showShopBaskets: true,
      showShopRecurring: true,
      showShopHistory: true,
      showPriceTracker: true,
      showAuditComparator: false,
      showAuditGuardrail: true,
      showAuditFeeScanner: true,
      showAuditHistory: false,
      showAuditExportBackup: true,
    },
  },
  full: {
    label: 'Full Power',
    subtitle: 'Every tool including Wellness, Comparator, and Penny AI',
    settings: { ...DEFAULT_FEATURE_SETTINGS },
  },
};

export function detectSettingsPreset(
  settings: Omit<FeatureSettings, 'preset'>
): SettingsPreset {
  for (const presetName of ['simple', 'standard', 'full'] as const) {
    const target = PRESET_DEFINITIONS[presetName].settings;
    if (FEATURE_TOGGLE_KEYS.every((k) => Boolean(settings[k]) === Boolean(target[k]))) {
      return presetName;
    }
  }
  return 'custom';
}

export function getPresetSettings(preset: Exclude<SettingsPreset, 'custom'>): FeatureSettings {
  return { ...PRESET_DEFINITIONS[preset].settings };
}

export function mergeFeatureSettings(
  current: FeatureSettings,
  patch: Partial<FeatureSettings>
): FeatureSettings {
  const merged = {
    ...DEFAULT_FEATURE_SETTINGS,
    ...current,
    ...patch,
  };
  return {
    ...merged,
    preset: detectSettingsPreset(merged),
  };
}

export function sanitizeFeatureSettings(raw: unknown): FeatureSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_FEATURE_SETTINGS };
  }
  const obj = raw as Partial<Record<keyof FeatureSettings, unknown>>;
  const base: Omit<FeatureSettings, 'preset'> = {
    showInsights:
      typeof obj.showInsights === 'boolean'
        ? obj.showInsights
        : DEFAULT_FEATURE_SETTINGS.showInsights,
    showScanner:
      typeof obj.showScanner === 'boolean'
        ? obj.showScanner
        : DEFAULT_FEATURE_SETTINGS.showScanner,
    showWellness:
      typeof obj.showWellness === 'boolean'
        ? obj.showWellness
        : DEFAULT_FEATURE_SETTINGS.showWellness,
    showPennyCompanion:
      typeof obj.showPennyCompanion === 'boolean'
        ? obj.showPennyCompanion
        : DEFAULT_FEATURE_SETTINGS.showPennyCompanion,
    showSmartInsightsOnOverview:
      typeof obj.showSmartInsightsOnOverview === 'boolean'
        ? obj.showSmartInsightsOnOverview
        : DEFAULT_FEATURE_SETTINGS.showSmartInsightsOnOverview,
    showShopSummaryMetrics:
      typeof obj.showShopSummaryMetrics === 'boolean'
        ? obj.showShopSummaryMetrics
        : DEFAULT_FEATURE_SETTINGS.showShopSummaryMetrics,
    showShopBaskets:
      typeof obj.showShopBaskets === 'boolean'
        ? obj.showShopBaskets
        : DEFAULT_FEATURE_SETTINGS.showShopBaskets,
    showShopRecurring:
      typeof obj.showShopRecurring === 'boolean'
        ? obj.showShopRecurring
        : DEFAULT_FEATURE_SETTINGS.showShopRecurring,
    showShopHistory:
      typeof obj.showShopHistory === 'boolean'
        ? obj.showShopHistory
        : DEFAULT_FEATURE_SETTINGS.showShopHistory,
    showPriceTracker:
      typeof obj.showPriceTracker === 'boolean'
        ? obj.showPriceTracker
        : DEFAULT_FEATURE_SETTINGS.showPriceTracker,
    showAuditComparator:
      typeof obj.showAuditComparator === 'boolean'
        ? obj.showAuditComparator
        : DEFAULT_FEATURE_SETTINGS.showAuditComparator,
    showAuditGuardrail:
      typeof obj.showAuditGuardrail === 'boolean'
        ? obj.showAuditGuardrail
        : DEFAULT_FEATURE_SETTINGS.showAuditGuardrail,
    showAuditFeeScanner:
      typeof obj.showAuditFeeScanner === 'boolean'
        ? obj.showAuditFeeScanner
        : DEFAULT_FEATURE_SETTINGS.showAuditFeeScanner,
    showAuditHistory:
      typeof obj.showAuditHistory === 'boolean'
        ? obj.showAuditHistory
        : DEFAULT_FEATURE_SETTINGS.showAuditHistory,
    showAuditExportBackup:
      typeof obj.showAuditExportBackup === 'boolean'
        ? obj.showAuditExportBackup
        : DEFAULT_FEATURE_SETTINGS.showAuditExportBackup,
  };
  return {
    ...base,
    preset: detectSettingsPreset(base),
  };
}

export function sanitizeThemeMode(raw: unknown): ThemeMode {
  return raw === 'dark' ? 'dark' : 'light';
}

export function isSectionEnabled(
  section: AppSection,
  settings: FeatureSettings
): boolean {
  if (section === 'insights') return settings.showInsights;
  if (section === 'scanner') return settings.showScanner;
  if (section === 'wellness') return settings.showWellness;
  return true;
}

export function resolveSafeSection(
  requested: AppSection,
  settings: FeatureSettings
): AppSection {
  return isSectionEnabled(requested, settings) ? requested : 'overview';
}

export function countEnabledFeatures(settings: FeatureSettings): number {
  return FEATURE_TOGGLE_KEYS.filter((k) => settings[k]).length;
}

