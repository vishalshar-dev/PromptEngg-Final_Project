import type {
  FeatureSettings,
  FontPairing,
  MotionProfile,
  SettingsPreset,
  SurfaceStyle,
  ThemeMode,
  ThemeMood,
  VisualThemeConfig,
} from '../types/models';
import type { AppSection } from '../components/ui/AppShell';

export const DEFAULT_VISUAL_THEME: VisualThemeConfig = {
  mood: 'obsidian_indigo',
  surface: 'hairline_bevel',
  font: 'manrope_mono',
  motion: 'crisp_micro',
};

export interface ThemeMoodOption {
  id: ThemeMood;
  label: string;
  subtitle: string;
  inspiredBy: string;
  lightPreview: {
    canvas: string;
    surface: string;
    accent: string;
    text: string;
    border: string;
  };
  darkPreview: {
    canvas: string;
    surface: string;
    accent: string;
    text: string;
    border: string;
  };
}

export const THEME_MOOD_OPTIONS: ThemeMoodOption[] = [
  {
    id: 'obsidian_indigo',
    label: 'Obsidian Indigo & Porcelain',
    subtitle: 'Crisp porcelain daylight & smoked indigo-slate dark mode.',
    inspiredBy: 'Linear Precision',
    lightPreview: {
      canvas: '#F5F7FB',
      surface: '#FFFFFF',
      accent: '#4865F5',
      text: '#0F172A',
      border: '#E2E8F0',
    },
    darkPreview: {
      canvas: '#07090F',
      surface: '#101420',
      accent: '#6E8BFF',
      text: '#F4F7FF',
      border: '#222A3E',
    },
  },
  {
    id: 'stealth_mint',
    label: 'Stealth Obsidian Mint',
    subtitle: 'Alabaster & matte graphite paired with luminous mint emerald.',
    inspiredBy: 'Cred Stealth',
    lightPreview: {
      canvas: '#F2F7F4',
      surface: '#FFFFFF',
      accent: '#0E9B6E',
      text: '#0E1C17',
      border: '#DCE8E1',
    },
    darkPreview: {
      canvas: '#060A09',
      surface: '#0E1512',
      accent: '#2CE09B',
      text: '#EEF8F4',
      border: '#1E2D26',
    },
  },
  {
    id: 'frosted_sapphire',
    label: 'Frosted Sapphire Glass',
    subtitle: 'Cool glacier mist & deep midnight sapphire atmospheric clarity.',
    inspiredBy: 'Arc Atmosphere',
    lightPreview: {
      canvas: '#ECF3FC',
      surface: '#FFFFFF',
      accent: '#2563EB',
      text: '#0D1B33',
      border: '#D6E4F7',
    },
    darkPreview: {
      canvas: '#050A14',
      surface: '#0D1526',
      accent: '#5CA4FF',
      text: '#EEF4FF',
      border: '#1D2C4A',
    },
  },
  {
    id: 'titanium_amber',
    label: 'Titanium Cobalt & Amber',
    subtitle: 'Architectural warm stone & brushed titanium with warm amber poise.',
    inspiredBy: 'Machined Studio',
    lightPreview: {
      canvas: '#F6F4EF',
      surface: '#FFFFFF',
      accent: '#3B66F5',
      text: '#191714',
      border: '#E5E0D5',
    },
    darkPreview: {
      canvas: '#0A0B0F',
      surface: '#141720',
      accent: '#F0A83C',
      text: '#F6F4EE',
      border: '#272B38',
    },
  },
];

export const SURFACE_STYLE_OPTIONS: Array<{
  id: SurfaceStyle;
  label: string;
  description: string;
}> = [
  {
    id: 'hairline_bevel',
    label: 'Hairline & Bevel',
    description: '1px borders + crisp top specular rim',
  },
  {
    id: 'frosted_glass',
    label: 'Arc Frosted Glass',
    description: 'Translucent blur over ambient glow',
  },
  {
    id: 'tactile_wells',
    label: 'Tactile Wells',
    description: 'Recessed slots & sculpted raised keys',
  },
];

export const FONT_PAIRING_OPTIONS: Array<{
  id: FontPairing;
  label: string;
  description: string;
  specimenFont: string;
}> = [
  {
    id: 'manrope_mono',
    label: 'Manrope + Mono',
    description: 'Geometric precision UI & tabular numbers',
    specimenFont: '"Manrope", system-ui, sans-serif',
  },
  {
    id: 'jakarta_mono',
    label: 'Jakarta + Mono',
    description: 'Balanced modern fintech clarity',
    specimenFont: '"Plus Jakarta Sans", system-ui, sans-serif',
  },
  {
    id: 'bricolage_dm',
    label: 'Bricolage + DM Sans',
    description: 'Editorial display titles & serene body',
    specimenFont: '"Bricolage Grotesque", "DM Sans", sans-serif',
  },
];

export const MOTION_PROFILE_OPTIONS: Array<{
  id: MotionProfile;
  label: string;
  description: string;
}> = [
  {
    id: 'crisp_micro',
    label: 'Crisp Micro-Presses',
    description: '150ms spring settle & subtle detents',
  },
  {
    id: 'calm_minimal',
    label: 'Ultra-Calm Minimal',
    description: 'Soothing zero-lift minimal fades',
  },
  {
    id: 'rich_tactile',
    label: 'Rich Elevation',
    description: 'Cred-inspired lift & border sheen',
  },
];

export interface VisualBundlePreset {
  id: string;
  label: string;
  tagline: string;
  theme?: ThemeMode;
  config: VisualThemeConfig;
}

export const VISUAL_BUNDLES: VisualBundlePreset[] = [
  {
    id: 'linear_precision',
    label: 'Linear Precision',
    tagline: 'Obsidian Indigo · Hairline Bevel · Manrope',
    config: {
      mood: 'obsidian_indigo',
      surface: 'hairline_bevel',
      font: 'manrope_mono',
      motion: 'crisp_micro',
    },
  },
  {
    id: 'cred_obsidian',
    label: 'Cred Obsidian',
    tagline: 'Stealth Mint · Tactile Wells · Rich Elevation',
    config: {
      mood: 'stealth_mint',
      surface: 'tactile_wells',
      font: 'manrope_mono',
      motion: 'rich_tactile',
    },
  },
  {
    id: 'arc_glacier',
    label: 'Arc Glacier',
    tagline: 'Frosted Sapphire · Glass · Calm Minimal',
    config: {
      mood: 'frosted_sapphire',
      surface: 'frosted_glass',
      font: 'jakarta_mono',
      motion: 'calm_minimal',
    },
  },
  {
    id: 'titanium_studio',
    label: 'Titanium Studio',
    tagline: 'Titanium Amber · Tactile Wells · Bricolage',
    config: {
      mood: 'titanium_amber',
      surface: 'tactile_wells',
      font: 'bricolage_dm',
      motion: 'rich_tactile',
    },
  },
];

const VALID_MOODS = new Set<ThemeMood>([
  'obsidian_indigo',
  'stealth_mint',
  'frosted_sapphire',
  'titanium_amber',
]);
const VALID_SURFACES = new Set<SurfaceStyle>([
  'hairline_bevel',
  'frosted_glass',
  'tactile_wells',
]);
const VALID_FONTS = new Set<FontPairing>([
  'manrope_mono',
  'jakarta_mono',
  'bricolage_dm',
]);
const VALID_MOTIONS = new Set<MotionProfile>([
  'crisp_micro',
  'calm_minimal',
  'rich_tactile',
]);

export function sanitizeVisualTheme(raw: unknown): VisualThemeConfig {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_VISUAL_THEME };
  }
  const obj = raw as Partial<Record<keyof VisualThemeConfig, unknown>>;
  return {
    mood: VALID_MOODS.has(obj.mood as ThemeMood)
      ? (obj.mood as ThemeMood)
      : DEFAULT_VISUAL_THEME.mood,
    surface: VALID_SURFACES.has(obj.surface as SurfaceStyle)
      ? (obj.surface as SurfaceStyle)
      : DEFAULT_VISUAL_THEME.surface,
    font: VALID_FONTS.has(obj.font as FontPairing)
      ? (obj.font as FontPairing)
      : DEFAULT_VISUAL_THEME.font,
    motion: VALID_MOTIONS.has(obj.motion as MotionProfile)
      ? (obj.motion as MotionProfile)
      : DEFAULT_VISUAL_THEME.motion,
  };
}

export function mergeVisualTheme(
  current: VisualThemeConfig,
  patch: Partial<VisualThemeConfig>
): VisualThemeConfig {
  return sanitizeVisualTheme({
    ...sanitizeVisualTheme(current),
    ...patch,
  });
}

export function isSameVisualTheme(a: VisualThemeConfig, b: VisualThemeConfig): boolean {
  return (
    a.mood === b.mood &&
    a.surface === b.surface &&
    a.font === b.font &&
    a.motion === b.motion
  );
}

export interface ChartThemeTokens {
  accent: string;
  accentSoft: string;
  success: string;
  warning: string;
  danger: string;
  purple: string;
  secondarySeries: string[];
  gridStroke: string;
  mutedBarFill: string;
  tickColor: string;
  cursorFill: string;
  tooltipStyle: {
    backgroundColor: string;
    borderColor: string;
    borderRadius: string;
    fontSize: string;
    color: string;
    boxShadow: string;
  };
}

export function getChartThemeTokens(
  theme: ThemeMode,
  mood: ThemeMood = DEFAULT_VISUAL_THEME.mood
): ChartThemeTokens {
  const isDark = theme === 'dark';
  const moodOpt =
    THEME_MOOD_OPTIONS.find((m) => m.id === mood) ?? THEME_MOOD_OPTIONS[0];
  const palette = isDark ? moodOpt.darkPreview : moodOpt.lightPreview;

  const accent =
    mood === 'titanium_amber'
      ? isDark
        ? '#6E94FF'
        : '#3B66F5'
      : palette.accent;
  const success = isDark ? '#2CE09B' : '#0E9B6E';
  const warning = isDark ? '#F5B74F' : '#D98218';
  const danger = isDark ? '#F06A6A' : '#DC4A4A';
  const purple = isDark ? '#A78BFA' : '#7C3AED';

  return {
    accent,
    accentSoft: isDark ? 'rgba(110, 139, 255, 0.18)' : 'rgba(72, 101, 245, 0.14)',
    success,
    warning,
    danger,
    purple,
    secondarySeries: [
      accent,
      success,
      warning,
      purple,
      danger,
      isDark ? '#38BDF8' : '#0284C7',
      isDark ? '#94A3B8' : '#64748B',
    ],
    gridStroke: palette.border,
    mutedBarFill: palette.border,
    tickColor: isDark ? '#9CA8BF' : '#5E6B80',
    cursorFill: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.04)',
    tooltipStyle: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: '14px',
      fontSize: '12px',
      color: palette.text,
      boxShadow: isDark
        ? '0 12px 32px rgba(0, 0, 0, 0.55)'
        : '0 10px 28px rgba(15, 23, 42, 0.09)',
    },
  };
}

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

