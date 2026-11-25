import { useEffect, useState } from 'react';
import {
  X,
  Sun,
  Moon,
  SlidersHorizontal,
  RotateCcw,
  Check,
  LayoutGrid,
  ShoppingBag,
  LineChart,
  ScanLine,
  Sparkles,
  Trash2,
  Cloud,
  CloudOff,
  LogIn,
  LogOut,
  RefreshCw,
  AlertTriangle,
  QrCode,
  Calendar,
  Download,
  FileJson,
  Palette,
  Layers,
  Type,
  Zap,
  Wand2,
  ExternalLink,
} from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { useCloudSync } from '../../contexts/CloudSyncContext';
import { isValidUpiId, normalizeUpiId } from '../../utils/upiEngine';
import { getActiveBudgetCycleWindow } from '../../utils/budgetCycle';
import { downloadTextReport, generateReportText } from '../../utils/reportGenerator';
import { buildWorkspaceBackupPayload, downloadWorkspaceBackup } from '../../utils/storeHelpers';
import type {
  FeatureSettings,
  PennyTonePreference,
  SettingsPreset,
} from '../../types/models';
import {
  DEFAULT_VISUAL_THEME,
  FONT_PAIRING_OPTIONS,
  MOTION_PROFILE_OPTIONS,
  PRESET_DEFINITIONS,
  SURFACE_STYLE_OPTIONS,
  THEME_MOOD_OPTIONS,
  TOTAL_FEATURE_TOGGLES_COUNT,
  VISUAL_BUNDLES,
  countEnabledFeatures,
  isSameVisualTheme,
} from '../../utils/settingsEngine';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FeatureToggleRow {
  key: Exclude<keyof FeatureSettings, 'preset'>;
  label: string;
  description: string;
}

const NAV_SECTION_TOGGLES: FeatureToggleRow[] = [
  {
    key: 'showInsights',
    label: 'Insights & Price Trends',
    description: 'Smart Radar analytics and historical product unit-price tracking.',
  },
  {
    key: 'showScanner',
    label: 'Receipt Scanner & Audit',
    description: 'AI receipt upload, hidden-fee scanner, comparator, and exports.',
  },
  {
    key: 'showWellness',
    label: 'Financial Wellness (War Room)',
    description: 'Broke Mode guardrails, category caps, and discipline streaks.',
  },
];

const OVERVIEW_SHOP_TOGGLES: FeatureToggleRow[] = [
  {
    key: 'showSmartInsightsOnOverview',
    label: 'Overview Smart Insights',
    description: 'Show insight cards under Spending Overview on the home screen.',
  },
  {
    key: 'showShopSummaryMetrics',
    label: 'Shopping Budget Strip',
    description: 'Cart value, quantity, month spend, and budget left cards in Shop.',
  },
  {
    key: 'showShopBaskets',
    label: 'Saved Baskets',
    description: 'Reusable basket templates tab and quick-load shelf in Shop.',
  },
  {
    key: 'showShopRecurring',
    label: 'Recurring Auto-Buys & Bills',
    description: 'Recurring items tab, due reminders, and bill reminders in Shop.',
  },
  {
    key: 'showShopHistory',
    label: 'Buy Again & Order History',
    description: 'Past checkout cards and order history tab inside Shopping.',
  },
];

const ANALYTICS_SCANNER_TOGGLES: FeatureToggleRow[] = [
  {
    key: 'showPriceTracker',
    label: 'Price Intelligence Tab',
    description: 'Product unit-price history charts and alerts inside Insights.',
  },
  {
    key: 'showAuditGuardrail',
    label: 'Session Budget Guardrail',
    description: 'Spending cap banner in the Receipt Scanner workspace.',
  },
  {
    key: 'showAuditFeeScanner',
    label: 'Hidden Fee & Dark Pattern Detector',
    description: 'Scan receipts and logged expenses for platform/surge fees.',
  },
  {
    key: 'showAuditComparator',
    label: 'Multi-App Cart Comparator',
    description: 'Compare quick-commerce fees and basket totals side by side.',
  },
  {
    key: 'showAuditHistory',
    label: 'Saved Audit History',
    description: 'Log of previously audited receipts and fee reports.',
  },
  {
    key: 'showAuditExportBackup',
    label: 'Export Reports & JSON Backup',
    description: 'Download CSV/PDF reports and backup or restore app data.',
  },
];

function SwitchRow({
  label,
  description,
  checked,
  onToggle,
}: {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-[var(--border-subtle)] last:border-b-0">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-[var(--text-primary)] leading-snug">{label}</p>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-snug">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${
          checked
            ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]'
            : 'bg-[var(--bg-well)] border-[var(--border-strong)]'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const theme = useAppStore((s) => s.theme);
  const visualTheme = useAppStore((s) => s.visualTheme);
  const featureSettings = useAppStore((s) => s.featureSettings);
  const pennyProfile = useAppStore((s) => s.pennyProfile);
  const pennyMessages = useAppStore((s) => s.pennyMessages);
  const setTheme = useAppStore((s) => s.setTheme);
  const setVisualTheme = useAppStore((s) => s.setVisualTheme);
  const resetVisualTheme = useAppStore((s) => s.resetVisualTheme);
  const applyFeaturePreset = useAppStore((s) => s.applyFeaturePreset);
  const updateFeatureSettings = useAppStore((s) => s.updateFeatureSettings);
  const resetFeatureSettings = useAppStore((s) => s.resetFeatureSettings);
  const setPennyTonePreference = useAppStore((s) => s.setPennyTonePreference);
  const resetPennyProfile = useAppStore((s) => s.resetPennyProfile);
  const clearPennyMessages = useAppStore((s) => s.clearPennyMessages);
  const myUpiId = useAppStore((s) => s.myUpiId);
  const myUpiName = useAppStore((s) => s.myUpiName);
  const setMyUpiProfile = useAppStore((s) => s.setMyUpiProfile);
  const isSampleDataLoaded = useAppStore((s) => s.isSampleDataLoaded);
  const loadSampleMonth = useAppStore((s) => s.loadSampleMonth);
  const clearWorkspaceData = useAppStore((s) => s.clearWorkspaceData);
  const budgetResetDay = useAppStore((s) => s.budgetResetDay);
  const budgetRolloverEnabled = useAppStore((s) => s.budgetRolloverEnabled);
  const setBudgetResetDay = useAppStore((s) => s.setBudgetResetDay);
  const setBudgetRolloverEnabled = useAppStore((s) => s.setBudgetRolloverEnabled);

  const [upiIdDraft, setUpiIdDraft] = useState(myUpiId);
  const [upiNameDraft, setUpiNameDraft] = useState(myUpiName);
  const [upiSavedStatus, setUpiSavedStatus] = useState<string | null>(null);
  const [upiValidationError, setUpiValidationError] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [confirmClearData, setConfirmClearData] = useState(false);

  const {
    user,
    syncStatus,
    lastSyncedAt,
    syncError,
    syncErrorAction,
    quotaUpgradeUrl,
    deviceLabel,
    isSigningIn,
    signInWithGoogle,
    signOutAccount,
    syncNow,
    clearSyncError,
  } = useCloudSync();

  useEffect(() => {
    if (!isOpen) return;
    const state = useAppStore.getState();
    setUpiIdDraft(state.myUpiId);
    setUpiNameDraft(state.myUpiName);
    setUpiSavedStatus(null);
    setUpiValidationError(null);
    setConfirmClearData(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const enabledCount = countEnabledFeatures(featureSettings);

  const toggleKey = (key: Exclude<keyof FeatureSettings, 'preset'>) => {
    updateFeatureSettings({ [key]: !featureSettings[key] });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div
        className="fixed inset-0 bg-[var(--backdrop-scrim)] backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col modal-panel rounded-t-3xl sm:rounded-2xl animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-primary-soft)] border border-[var(--accent-border)] text-[var(--accent-ink)] flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-4 h-4" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <h2
                id="settings-modal-title"
                className="text-base font-bold font-display text-[var(--text-primary)] tracking-tight"
              >
                Workspace Settings &amp; Theme
              </h2>
              <p className="text-xs text-[var(--text-secondary)] truncate">
                Switch between Light &amp; Dark themes, budget cycles, or module visibility.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="w-8 h-8 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center shrink-0 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-6 overflow-y-auto scrollbar-thin">
          {/* 0. Multi-Device Cloud Sync & Account */}
          <section className="surface-well border border-[var(--border-subtle)] p-4 space-y-3" aria-label="Account and cloud sync">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {syncStatus === 'offline' ? (
                  <CloudOff className="w-4 h-4 text-[var(--accent-warning-ink)] shrink-0" />
                ) : (
                  <Cloud className="w-4 h-4 text-[var(--accent-ink)] shrink-0" />
                )}
                <h3 className="text-[13px] font-bold font-display text-[var(--text-primary)]">
                  Account &amp; Multi-Device Cloud Sync
                </h3>
              </div>
              <span
                className={`text-xs font-mono font-semibold ${
                  syncStatus === 'synced'
                    ? 'text-[var(--accent-success-ink)]'
                    : syncStatus === 'error'
                      ? 'text-[var(--accent-danger-ink)]'
                      : syncStatus === 'offline'
                        ? 'text-[var(--accent-warning-ink)]'
                        : 'text-[var(--text-secondary)]'
                }`}
              >
                {syncStatus === 'synced'
                  ? 'Live Sync Active'
                  : syncStatus === 'syncing' || syncStatus === 'connecting'
                    ? 'Syncing…'
                    : syncStatus === 'offline'
                      ? 'Offline'
                      : syncStatus === 'conflict'
                        ? 'Merge Needed'
                        : syncStatus === 'error'
                          ? 'Sync Error'
                          : 'Local Browser Only'}
              </span>
            </div>

            {user ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-xl object-cover shrink-0 border border-[var(--border-subtle)]"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-[var(--accent-primary)] text-white text-sm font-bold flex items-center justify-center shrink-0">
                        {(user.displayName || user.email || 'U').trim().charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-[var(--text-primary)] truncate">
                        {user.displayName || 'CartAudit Account'}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] truncate">
                        {user.email} · {deviceLabel}
                      </p>
                      {lastSyncedAt && (
                        <p className="text-xs text-[var(--text-muted)] font-mono tabular-nums mt-0.5">
                          Last synced: {new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={syncStatus === 'syncing'}
                      onClick={() => void syncNow()}
                      className="btn-secondary px-3 py-1.5 text-xs whitespace-nowrap"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`}
                      />
                      <span>Sync Now</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void signOutAccount()}
                      className="btn-secondary px-3 py-1.5 text-xs text-[var(--accent-danger-ink)] whitespace-nowrap"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Sign in with Google to automatically sync your expenses, splits, catalog, and Penny history across your phone and laptop.
                </p>
                <button
                  type="button"
                  disabled={isSigningIn}
                  onClick={() => void signInWithGoogle()}
                  data-testid="settings-google-signin"
                  className="btn-primary px-4 py-2 text-xs whitespace-nowrap shrink-0"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{isSigningIn ? 'Connecting…' : 'Sign in with Google'}</span>
                </button>
              </div>
            )}

            {syncError && (
              <div
                role="alert"
                data-testid="settings-sync-error"
                className="rounded-xl px-3 py-2 bg-[var(--accent-danger-soft)] border border-[var(--accent-danger-border)] text-[var(--accent-danger-ink)] text-xs flex items-start justify-between gap-2"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="space-y-1.5 min-w-0">
                    <p className="break-words">{syncError}</p>
                    <div className="flex flex-wrap items-center gap-3">
                      {syncErrorAction === 'open_new_tab' && typeof window !== 'undefined' && (
                        <a
                          href={window.location.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline font-semibold inline-flex items-center gap-1"
                        >
                          <span>Open in new tab</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {quotaUpgradeUrl && (
                        <a
                          href={quotaUpgradeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline font-semibold inline-block"
                        >
                          Open Firebase Console Usage
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearSyncError}
                  aria-label="Dismiss sync error"
                  className="shrink-0 p-0.5 rounded hover:bg-black/10"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </section>

          {/* 1. Appearance & Tactile Studio */}
          <section className="space-y-4" aria-label="Appearance and tactile studio">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-[var(--accent-ink)] shrink-0" />
                <div>
                  <h3 className="text-sm font-bold font-display text-[var(--text-primary)]">
                    Appearance &amp; Tactile Studio
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Customize color mood, surface material, typography, and motion feel.
                  </p>
                </div>
              </div>
              {!isSameVisualTheme(visualTheme, DEFAULT_VISUAL_THEME) && (
                <button
                  type="button"
                  onClick={resetVisualTheme}
                  data-testid="settings-reset-visual-theme"
                  className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Visual Studio</span>
                </button>
              )}
            </div>

            {/* Light / Dark Mode Switch */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTheme('light')}
                aria-pressed={theme === 'light'}
                data-testid="settings-theme-light"
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                  theme === 'light'
                    ? 'bg-[var(--accent-primary-soft)] border-[var(--accent-primary)] ring-1 ring-[var(--accent-ring)]'
                    : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    color: '#0F172A',
                  }}
                >
                  <Sun className="w-4 h-4" style={{ color: '#C7851F' }} strokeWidth={2.2} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[var(--text-primary)]">Light Mode</span>
                    {theme === 'light' && (
                      <Check className="w-4 h-4 text-[var(--accent-ink)] shrink-0" strokeWidth={2.5} />
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Porcelain daylight surfaces &amp; crisp slate contrast.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                aria-pressed={theme === 'dark'}
                data-testid="settings-theme-dark"
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                  theme === 'dark'
                    ? 'bg-[var(--accent-primary-soft)] border-[var(--accent-primary)] ring-1 ring-[var(--accent-ring)]'
                    : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: '#090B0F',
                    border: '1px solid #232A38',
                    color: '#F3F5F9',
                  }}
                >
                  <Moon className="w-4 h-4" style={{ color: '#7B9BFF' }} strokeWidth={2.2} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[var(--text-primary)]">Dark Mode</span>
                    {theme === 'dark' && (
                      <Check className="w-4 h-4 text-[var(--accent-ink)] shrink-0" strokeWidth={2.5} />
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Low-glare obsidian atmosphere &amp; luminous accents.
                  </p>
                </div>
              </button>
            </div>

            {/* One-Tap Curated Aesthetic Bundles */}
            <div className="surface-well border border-[var(--border-subtle)] p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-[var(--accent-ink)]" />
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    Curated Aesthetic Bundles
                  </span>
                </div>
                <span className="text-xs font-mono text-[var(--text-secondary)]">One-tap styles</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {VISUAL_BUNDLES.map((bundle) => {
                  const active = isSameVisualTheme(visualTheme, bundle.config);
                  return (
                    <button
                      key={bundle.id}
                      type="button"
                      onClick={() => setVisualTheme(bundle.config)}
                      aria-pressed={active}
                      data-testid={`settings-bundle-${bundle.id}`}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                        active
                          ? 'bg-[var(--accent-primary-soft)] border-[var(--accent-primary)] ring-1 ring-[var(--accent-ring)]'
                          : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[var(--text-primary)] truncate">{bundle.label}</p>
                        <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                          {bundle.tagline}
                        </p>
                      </div>
                      {active && (
                        <Check className="w-3.5 h-3.5 text-[var(--accent-ink)] shrink-0" strokeWidth={2.5} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4 Color Moods with Protected Inline Live Swatches */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)]">Color Mood</span>
                <span className="text-xs font-mono text-[var(--accent-ink)]">
                  {THEME_MOOD_OPTIONS.find((m) => m.id === visualTheme.mood)?.inspiredBy}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {THEME_MOOD_OPTIONS.map((opt) => {
                  const active = visualTheme.mood === opt.id;
                  const swatch = theme === 'dark' ? opt.darkPreview : opt.lightPreview;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setVisualTheme({ mood: opt.id })}
                      aria-pressed={active}
                      data-testid={`settings-mood-${opt.id}`}
                      className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                        active
                          ? 'bg-[var(--accent-primary-soft)] border-[var(--accent-primary)] ring-1 ring-[var(--accent-ring)]'
                          : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      {/* Miniature live UI preview using protected inline colors */}
                      <div
                        className="w-12 h-11 rounded-xl p-1.5 flex flex-col justify-between shrink-0"
                        style={{
                          backgroundColor: swatch.canvas,
                          border: `1px solid ${swatch.border}`,
                        }}
                        aria-hidden="true"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: swatch.accent }}
                          />
                          <span
                            className="h-1.5 w-4 rounded-full"
                            style={{ backgroundColor: swatch.text, opacity: 0.7 }}
                          />
                        </div>
                        <div
                          className="h-4 rounded-md px-1 flex items-center justify-between"
                          style={{
                            backgroundColor: swatch.surface,
                            border: `1px solid ${swatch.border}`,
                          }}
                        >
                          <span
                            className="h-1 w-3.5 rounded-full"
                            style={{ backgroundColor: swatch.text, opacity: 0.55 }}
                          />
                          <span
                            className="h-1.5 w-2 rounded-sm"
                            style={{ backgroundColor: swatch.accent }}
                          />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                            {opt.label}
                          </span>
                          {active && (
                            <Check className="w-3.5 h-3.5 text-[var(--accent-ink)] shrink-0" strokeWidth={2.5} />
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-snug line-clamp-2">
                          {opt.subtitle}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3 Tactile Surface Finishes */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[var(--accent-ink)]" />
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Tactile Surface Finish
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {SURFACE_STYLE_OPTIONS.map((opt) => {
                  const active = visualTheme.surface === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setVisualTheme({ surface: opt.id })}
                      aria-pressed={active}
                      data-testid={`settings-surface-${opt.id}`}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        active
                          ? 'bg-[var(--accent-primary-soft)] border-[var(--accent-primary)] ring-1 ring-[var(--accent-ring)]'
                          : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs font-bold text-[var(--text-primary)]">{opt.label}</span>
                        {active && (
                          <Check className="w-3.5 h-3.5 text-[var(--accent-ink)] shrink-0" strokeWidth={2.5} />
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-snug">
                        {opt.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3 Typography Pairings & 3 Motion Profiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-[var(--accent-ink)]" />
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    Typography Pairing
                  </span>
                </div>
                <div className="space-y-1.5">
                  {FONT_PAIRING_OPTIONS.map((opt) => {
                    const active = visualTheme.font === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setVisualTheme({ font: opt.id })}
                        aria-pressed={active}
                        data-testid={`settings-font-${opt.id}`}
                        className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                          active
                            ? 'bg-[var(--accent-primary-soft)] border-[var(--accent-primary)] ring-1 ring-[var(--accent-ring)]'
                            : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[var(--text-primary)]">{opt.label}</p>
                          <p className="text-xs text-[var(--text-secondary)] truncate">{opt.description}</p>
                        </div>
                        <span
                          className="text-xs font-bold text-[var(--accent-ink)] tabular-nums shrink-0"
                          style={{ fontFamily: opt.specimenFont }}
                        >
                          ₹12,480
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[var(--accent-ink)]" />
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    Motion Profile
                  </span>
                </div>
                <div className="space-y-1.5">
                  {MOTION_PROFILE_OPTIONS.map((opt) => {
                    const active = visualTheme.motion === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setVisualTheme({ motion: opt.id })}
                        aria-pressed={active}
                        data-testid={`settings-motion-${opt.id}`}
                        className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                          active
                            ? 'bg-[var(--accent-primary-soft)] border-[var(--accent-primary)] ring-1 ring-[var(--accent-ring)]'
                            : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[var(--text-primary)]">{opt.label}</p>
                          <p className="text-xs text-[var(--text-secondary)] truncate">{opt.description}</p>
                        </div>
                        {active && (
                          <Check className="w-3.5 h-3.5 text-[var(--accent-ink)] shrink-0" strokeWidth={2.5} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* 1.5 Budget Cycle & Rollover */}
          <section className="surface-well border border-[var(--border-subtle)] p-4 space-y-3" aria-label="Budget cycle settings">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--accent-ink)] shrink-0" />
                <div>
                  <h3 className="text-[13px] font-bold font-display text-[var(--text-primary)]">
                    Monthly Budget Cycle &amp; Rollover
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Match your salary date so budget balances reset when you get paid.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-semibold text-[var(--accent-ink)]">
                {getActiveBudgetCycleWindow(budgetResetDay).label}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-[var(--border-subtle)]">
              <label htmlFor="budget-reset-day-select" className="text-[12.5px] font-semibold text-[var(--text-primary)]">
                Cycle Reset Day
              </label>
              <select
                id="budget-reset-day-select"
                data-testid="settings-budget-reset-day"
                value={budgetResetDay}
                onChange={(e) => setBudgetResetDay(Number(e.target.value))}
                className="input-field px-3 py-1.5 text-xs font-mono font-semibold sm:w-48"
              >
                {Array.from({ length: 28 }, (_, idx) => idx + 1).map((day) => {
                  const suffix =
                    day === 1 || day === 21
                      ? 'st'
                      : day === 2 || day === 22
                        ? 'nd'
                        : day === 3 || day === 23
                          ? 'rd'
                          : 'th';
                  return (
                    <option key={day} value={day}>
                      {day}
                      {suffix} of every month
                    </option>
                  );
                })}
              </select>
            </div>

            <SwitchRow
              label="Carry Unused Budget / Deficit (Rollover)"
              description="Adjusts your current cycle budget by last cycle's surplus or overspend."
              checked={budgetRolloverEnabled}
              onToggle={() => setBudgetRolloverEnabled(!budgetRolloverEnabled)}
            />
          </section>

          {/* 2. Quick Layout Simplicity Presets */}
          <section className="space-y-2.5" aria-label="Workspace layout presets">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold font-display text-[var(--text-primary)]">
                Workspace Focus Mode
              </h3>
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                {featureSettings.preset === 'custom'
                  ? `Custom (${enabledCount}/${TOTAL_FEATURE_TOGGLES_COUNT} tools)`
                  : `${PRESET_DEFINITIONS[featureSettings.preset].label} (${enabledCount}/${TOTAL_FEATURE_TOGGLES_COUNT} tools)`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {(['simple', 'standard', 'full'] as Array<Exclude<SettingsPreset, 'custom'>>).map(
                (presetKey) => {
                  const def = PRESET_DEFINITIONS[presetKey];
                  const active = featureSettings.preset === presetKey;
                  return (
                    <button
                      key={presetKey}
                      type="button"
                      onClick={() => applyFeaturePreset(presetKey)}
                      aria-pressed={active}
                      data-testid={`settings-preset-${presetKey}`}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        active
                          ? 'bg-[var(--accent-primary-soft)] border-[var(--accent-primary)] ring-1 ring-[var(--accent-ring)]'
                          : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[13px] font-bold text-[var(--text-primary)]">
                          {def.label}
                        </span>
                        {active && (
                          <Check className="w-3.5 h-3.5 text-[var(--accent-ink)]" strokeWidth={2.5} />
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-1 leading-snug">
                        {def.subtitle}
                      </p>
                    </button>
                  );
                }
              )}
            </div>
          </section>

          {/* 3. Penny AI Companion */}
          <section className="surface-well border border-[var(--border-subtle)] p-4 space-y-3" aria-label="Penny AI companion controls">
            <div className="space-y-1 pb-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--accent-ink)] shrink-0" />
                  <h3 className="text-[13px] font-bold font-display text-[var(--text-primary)]">
                    Penny AI Companion
                  </h3>
                </div>
                <span className="text-xs font-mono font-semibold text-[var(--accent-ink)] truncate max-w-full">
                  {pennyProfile.resolvedSummary}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] pl-6">
                Global floating chat assistant that learns your style and executes confirmed actions.
              </p>
            </div>

            <SwitchRow
              label="Floating Penny Launcher Everywhere"
              description="Show the quick Ask Penny button in the bottom-right corner across every tab."
              checked={featureSettings.showPennyCompanion}
              onToggle={() => toggleKey('showPennyCompanion')}
            />

            <div className="pt-1 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">
                  Personality Mode ({pennyProfile.messageCount}{' '}
                  {pennyProfile.messageCount === 1 ? 'chat' : 'chats'} learned)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={resetPennyProfile}
                    className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset Style
                  </button>
                  {pennyMessages.length > 0 && (
                    <button
                      type="button"
                      onClick={clearPennyMessages}
                      className="text-xs font-semibold text-[var(--accent-danger-ink)] hover:underline inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear Chat ({pennyMessages.length})
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    { id: 'auto', label: 'Auto Adapt', hint: 'Matches your vibe' },
                    { id: 'friendly', label: 'Friendly', hint: 'Warm & encouraging' },
                    { id: 'crisp', label: 'Crisp', hint: 'Direct bullets' },
                    { id: 'strict_coach', label: 'Strict Coach', hint: 'Firm guardrail tone' },
                  ] as Array<{ id: PennyTonePreference; label: string; hint: string }>
                ).map((modeOpt) => {
                  const active = pennyProfile.tonePreference === modeOpt.id;
                  return (
                    <button
                      key={modeOpt.id}
                      type="button"
                      onClick={() => setPennyTonePreference(modeOpt.id)}
                      aria-pressed={active}
                      className={`p-2 rounded-xl border text-left transition-colors ${
                        active
                          ? 'bg-[var(--accent-primary-soft)] border-[var(--accent-primary)] text-[var(--text-primary)]'
                          : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <p className="text-xs font-bold leading-tight">{modeOpt.label}</p>
                      <p className="text-xs opacity-80 mt-0.5 leading-tight">{modeOpt.hint}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 3.5 UPI Profile for Split Settlements */}
          <section className="surface-well border border-[var(--border-subtle)] p-4 space-y-3" aria-label="UPI profile settings">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[var(--accent-ink)]" />
                <div>
                  <h3 className="text-[13px] font-bold font-display text-[var(--text-primary)]">
                    UPI Profile for Split Settlements
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Used to generate scannable QR codes when friends owe you money.
                  </p>
                </div>
              </div>
              {myUpiId && (
                <span className="text-xs font-mono font-semibold text-[var(--accent-success-ink)]">
                  Saved
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-[var(--text-secondary)]">Your UPI ID</span>
                <input
                  type="text"
                  value={upiIdDraft}
                  onChange={(e) => {
                    setUpiIdDraft(e.target.value);
                    setUpiValidationError(null);
                    setUpiSavedStatus(null);
                  }}
                  placeholder="e.g. name@okaxis"
                  data-testid="settings-upi-id-input"
                  className="input-field w-full px-3 py-1.5 text-xs font-mono"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-[var(--text-secondary)]">Display Name (optional)</span>
                <input
                  type="text"
                  value={upiNameDraft}
                  onChange={(e) => {
                    setUpiNameDraft(e.target.value);
                    setUpiSavedStatus(null);
                  }}
                  placeholder={user?.displayName || 'Your name'}
                  className="input-field w-full px-3 py-1.5 text-xs"
                />
              </label>
            </div>

            {upiValidationError && (
              <p className="text-xs font-medium text-[var(--accent-danger-ink)]">{upiValidationError}</p>
            )}
            {upiSavedStatus && (
              <p className="text-xs font-semibold text-[var(--accent-success-ink)]">{upiSavedStatus}</p>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                data-testid="settings-upi-save"
                onClick={() => {
                  const clean = normalizeUpiId(upiIdDraft);
                  if (clean && !isValidUpiId(clean)) {
                    setUpiValidationError('Enter a valid UPI ID such as name@okaxis or mobile@ybl.');
                    setUpiSavedStatus(null);
                    return;
                  }
                  setMyUpiProfile(clean, upiNameDraft);
                  setUpiValidationError(null);
                  setUpiSavedStatus(clean ? `Saved ${clean}` : 'Cleared saved UPI ID.');
                }}
                className="btn-secondary px-3.5 py-1.5 text-xs"
              >
                Save UPI Profile
              </button>
            </div>
          </section>

          {/* 4. Navigation Tabs */}
          <section className="surface-well border border-[var(--border-subtle)] p-4 space-y-2" aria-label="Navigation modules">
            <div className="flex items-center gap-2 pb-1">
              <LayoutGrid className="w-4 h-4 text-[var(--accent-ink)]" />
              <div>
                <h3 className="text-[13px] font-bold font-display text-[var(--text-primary)]">
                  Navigation Sections
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Overview, Shopping, and Expenses always remain available as core essentials.
                </p>
              </div>
            </div>
            <div>
              {NAV_SECTION_TOGGLES.map((item) => (
                <SwitchRow
                  key={item.key}
                  label={item.label}
                  description={item.description}
                  checked={featureSettings[item.key]}
                  onToggle={() => toggleKey(item.key)}
                />
              ))}
            </div>
          </section>

          {/* 5. Overview & Shopping Widgets */}
          <section className="surface-well border border-[var(--border-subtle)] p-4 space-y-2" aria-label="Overview and Shopping controls">
            <div className="flex items-center gap-2 pb-1">
              <ShoppingBag className="w-4 h-4 text-[var(--accent-success-ink)]" />
              <div>
                <h3 className="text-[13px] font-bold font-display text-[var(--text-primary)]">
                  Overview &amp; Shopping Clutter Control
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Turn off secondary shelves or summary strips when you only want to browse &amp; buy.
                </p>
              </div>
            </div>
            <div>
              {OVERVIEW_SHOP_TOGGLES.map((item) => (
                <SwitchRow
                  key={item.key}
                  label={item.label}
                  description={item.description}
                  checked={featureSettings[item.key]}
                  onToggle={() => toggleKey(item.key)}
                />
              ))}
            </div>
          </section>

          {/* 6. Insights & Receipt Scanner Widgets */}
          <section className="surface-well border border-[var(--border-subtle)] p-4 space-y-2" aria-label="Insights and Scanner controls">
            <div className="flex items-center gap-2 pb-1">
              {featureSettings.showScanner ? (
                <ScanLine className="w-4 h-4 text-[var(--accent-warning-ink)]" />
              ) : (
                <LineChart className="w-4 h-4 text-[var(--accent-ink)]" />
              )}
              <div>
                <h3 className="text-[13px] font-bold font-display text-[var(--text-primary)]">
                  Insights &amp; Receipt Scanner Modules
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Show only the analysis and auditing cards you actively use.
                </p>
              </div>
            </div>
            <div>
              {ANALYTICS_SCANNER_TOGGLES.map((item) => (
                <SwitchRow
                  key={item.key}
                  label={item.label}
                  description={item.description}
                  checked={featureSettings[item.key]}
                  onToggle={() => toggleKey(item.key)}
                />
              ))}
            </div>
          </section>

          {/* 7. Workspace Data, Backup & Export */}
          <section className="surface-well border border-[var(--border-subtle)] p-4 space-y-3" aria-label="Workspace data, export and backup">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-[var(--accent-ink)]" />
                <div>
                  <h3 className="text-[13px] font-bold font-display text-[var(--text-primary)]">
                    Workspace Data, Backup &amp; Export
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Explore with a realistic Indian budget month, clear your workspace, or export backups.
                  </p>
                </div>
              </div>
              {exportStatus && (
                <span className="text-xs font-semibold text-[var(--accent-success-ink)]">{exportStatus}</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="settings-load-sample"
                onClick={() => {
                  loadSampleMonth();
                  setConfirmClearData(false);
                  setExportStatus('Sample month loaded');
                  setTimeout(() => setExportStatus(null), 2500);
                }}
                className="btn-secondary px-3.5 py-2 text-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-[var(--accent-ink)]" />
                <span>{isSampleDataLoaded ? 'Reload Sample Month' : 'Load Sample Month'}</span>
              </button>

              {!confirmClearData ? (
                <button
                  type="button"
                  data-testid="settings-clear-data"
                  onClick={() => setConfirmClearData(true)}
                  className="btn-secondary px-3.5 py-2 text-xs text-[var(--accent-danger-ink)]"
                >
                  <Trash2 className="w-3.5 h-3.5 text-[var(--accent-danger-ink)]" />
                  <span>Clear Workspace Data</span>
                </button>
              ) : (
                <div className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--accent-danger-border)] bg-[var(--accent-danger-soft)] px-2.5 py-1">
                  <span className="text-xs font-semibold text-[var(--accent-danger-ink)]">
                    Reset all entries?
                  </span>
                  <button
                    type="button"
                    data-testid="settings-confirm-clear-data"
                    onClick={() => {
                      clearWorkspaceData();
                      setConfirmClearData(false);
                      setExportStatus('Workspace cleared');
                      setTimeout(() => setExportStatus(null), 2500);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-[var(--accent-danger)] text-white text-xs font-semibold hover:opacity-90"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearData(false)}
                    className="px-2 py-0.5 rounded-lg bg-[var(--bg-surface)] text-[var(--text-secondary)] text-xs font-semibold border border-[var(--border-subtle)]"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <button
                type="button"
                data-testid="settings-export-json"
                onClick={() => {
                  downloadWorkspaceBackup(
                    buildWorkspaceBackupPayload(useAppStore.getState())
                  );
                  setExportStatus('JSON backup downloaded');
                  setTimeout(() => setExportStatus(null), 2500);
                }}
                className="btn-secondary px-3.5 py-2 text-xs"
              >
                <FileJson className="w-3.5 h-3.5 text-[var(--accent-ink)]" />
                <span>Download JSON Backup</span>
              </button>
              <button
                type="button"
                data-testid="settings-export-txt"
                onClick={() => {
                  const st = useAppStore.getState();
                  const text = generateReportText({
                    items: st.items,
                    transactions: st.transactions,
                    totalBudget: st.totalBudget,
                    sessionBudget: st.sessionBudget,
                    parsedReceipts: st.parsedReceipts,
                    feeFlags: st.feeFlags,
                  });
                  downloadTextReport(text);
                  setExportStatus('TXT report downloaded');
                  setTimeout(() => setExportStatus(null), 2500);
                }}
                className="btn-secondary px-3.5 py-2 text-xs"
              >
                <Download className="w-3.5 h-3.5 text-[var(--accent-success-ink)]" />
                <span>Export Budget Report (.TXT)</span>
              </button>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={resetFeatureSettings}
            className="btn-secondary px-3 py-2 text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Full Power
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn-primary px-5 py-2 text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
