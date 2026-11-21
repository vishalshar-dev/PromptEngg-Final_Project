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
} from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { useCloudSync } from '../../contexts/CloudSyncContext';
import { isValidUpiId, normalizeUpiId } from '../../utils/upiEngine';
import type {
  FeatureSettings,
  PennyTonePreference,
  SettingsPreset,
} from '../../types/models';
import {
  PRESET_DEFINITIONS,
  TOTAL_FEATURE_TOGGLES_COUNT,
  countEnabledFeatures,
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
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-[#E7EAF0] last:border-b-0">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-[#151922] leading-snug">{label}</p>
        <p className="text-[11.5px] text-[#697386] mt-0.5 leading-snug">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${
          checked
            ? 'bg-[#365FE8] border-[#365FE8]'
            : 'bg-[#F1F3F6] border-[#D5DBE5]'
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
  const featureSettings = useAppStore((s) => s.featureSettings);
  const pennyProfile = useAppStore((s) => s.pennyProfile);
  const pennyMessages = useAppStore((s) => s.pennyMessages);
  const setTheme = useAppStore((s) => s.setTheme);
  const applyFeaturePreset = useAppStore((s) => s.applyFeaturePreset);
  const updateFeatureSettings = useAppStore((s) => s.updateFeatureSettings);
  const resetFeatureSettings = useAppStore((s) => s.resetFeatureSettings);
  const setPennyTonePreference = useAppStore((s) => s.setPennyTonePreference);
  const resetPennyProfile = useAppStore((s) => s.resetPennyProfile);
  const clearPennyMessages = useAppStore((s) => s.clearPennyMessages);
  const myUpiId = useAppStore((s) => s.myUpiId);
  const myUpiName = useAppStore((s) => s.myUpiName);
  const setMyUpiProfile = useAppStore((s) => s.setMyUpiProfile);

  const [upiIdDraft, setUpiIdDraft] = useState(myUpiId);
  const [upiNameDraft, setUpiNameDraft] = useState(myUpiName);
  const [upiSavedStatus, setUpiSavedStatus] = useState<string | null>(null);
  const [upiValidationError, setUpiValidationError] = useState<string | null>(null);

  const {
    user,
    syncStatus,
    lastSyncedAt,
    syncError,
    quotaUpgradeUrl,
    deviceLabel,
    isSigningIn,
    signInWithGoogle,
    signOutAccount,
    syncNow,
  } = useCloudSync();

  useEffect(() => {
    if (!isOpen) return;
    const state = useAppStore.getState();
    setUpiIdDraft(state.myUpiId);
    setUpiNameDraft(state.myUpiName);
    setUpiSavedStatus(null);
    setUpiValidationError(null);
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
        className="fixed inset-0 bg-[#151922]/50 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col bg-white border border-[#E7EAF0] rounded-t-3xl sm:rounded-2xl shadow-modal animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E7EAF0] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#EDF2FF] border border-[#D4E0FF] text-[#365FE8] flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-4 h-4" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <h2
                id="settings-modal-title"
                className="text-base font-bold text-[#151922] tracking-tight"
              >
                Workspace Settings &amp; Theme
              </h2>
              <p className="text-xs text-[#697386] truncate">
                Switch between White &amp; Black themes or hide tools to keep your workspace minimal.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="w-8 h-8 rounded-xl bg-[#F1F3F6] hover:bg-[#E7EAF0] text-[#697386] hover:text-[#151922] flex items-center justify-center shrink-0 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-6 overflow-y-auto scrollbar-thin">
          {/* 0. Multi-Device Cloud Sync & Account */}
          <section className="surface-subtle p-4 space-y-3" aria-label="Account and cloud sync">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {syncStatus === 'offline' ? (
                  <CloudOff className="w-4 h-4 text-[#C7851F] shrink-0" />
                ) : (
                  <Cloud className="w-4 h-4 text-[#365FE8] shrink-0" />
                )}
                <h3 className="text-xs font-bold text-[#151922]">
                  Account &amp; Multi-Device Cloud Sync
                </h3>
              </div>
              <span
                className={`text-[11px] font-mono font-semibold ${
                  syncStatus === 'synced'
                    ? 'text-[#15966B]'
                    : syncStatus === 'error'
                      ? 'text-[#DE5252]'
                      : syncStatus === 'offline'
                        ? 'text-[#C7851F]'
                        : 'text-[#697386]'
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
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#E7EAF0] rounded-xl p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-xl object-cover shrink-0 border border-[#E7EAF0]"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-[#365FE8] text-white text-sm font-bold flex items-center justify-center shrink-0">
                        {(user.displayName || user.email || 'U').trim().charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-[#151922] truncate">
                        {user.displayName || 'CartAudit Account'}
                      </p>
                      <p className="text-[11px] text-[#697386] truncate">
                        {user.email} · {deviceLabel}
                      </p>
                      {lastSyncedAt && (
                        <p className="text-[10.5px] text-[#929BAB] font-mono tabular-nums mt-0.5">
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
                      className="btn-secondary px-3 py-1.5 text-xs text-[#DE5252] whitespace-nowrap"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-[11.5px] text-[#697386] leading-relaxed">
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
                className="rounded-xl px-3 py-2 bg-[#FDECEC] border border-[#F6B8B8] text-[#B93B3B] text-xs flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p>{syncError}</p>
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
            )}
          </section>

          {/* 1. Theme Selector (White vs Black) */}
          <section className="space-y-2.5" aria-label="Theme selection">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#697386]">
                Appearance Theme
              </h3>
              <span className="text-xs font-mono font-semibold text-[#365FE8]">
                {theme === 'dark' ? 'Black Theme' : 'White Theme'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTheme('light')}
                aria-pressed={theme === 'light'}
                data-testid="settings-theme-light"
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                  theme === 'light'
                    ? 'bg-[#EDF2FF] border-[#365FE8] ring-1 ring-[#365FE8]/20'
                    : 'bg-[#F7F8FA] border-[#E7EAF0] hover:border-[#D5DBE5]'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-[#FFFFFF] border border-[#E7EAF0] text-[#151922] flex items-center justify-center shrink-0 shadow-xs">
                  <Sun className="w-4 h-4 text-[#C7851F]" strokeWidth={2.2} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[#151922]">White Theme</span>
                    {theme === 'light' && (
                      <Check className="w-4 h-4 text-[#365FE8] shrink-0" strokeWidth={2.5} />
                    )}
                  </div>
                  <p className="text-[11.5px] text-[#697386] mt-0.5">
                    Bright studio white surfaces &amp; crisp slate text.
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
                    ? 'bg-[#EDF2FF] border-[#365FE8] ring-1 ring-[#365FE8]/20'
                    : 'bg-[#F7F8FA] border-[#E7EAF0] hover:border-[#D5DBE5]'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-[#090B0F] border border-[#232A38] text-[#F3F5F9] flex items-center justify-center shrink-0 shadow-xs">
                  <Moon className="w-4 h-4 text-[#7B9BFF]" strokeWidth={2.2} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[#151922]">Black Theme</span>
                    {theme === 'dark' && (
                      <Check className="w-4 h-4 text-[#365FE8] shrink-0" strokeWidth={2.5} />
                    )}
                  </div>
                  <p className="text-[11.5px] text-[#697386] mt-0.5">
                    Deep obsidian black canvas for low-glare clarity.
                  </p>
                </div>
              </button>
            </div>
          </section>

          {/* 2. Quick Layout Simplicity Presets */}
          <section className="space-y-2.5" aria-label="Workspace layout presets">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#697386]">
                Workspace Focus Mode
              </h3>
              <span className="text-[11px] font-semibold text-[#697386]">
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
                          ? 'bg-[#EDF2FF] border-[#365FE8] ring-1 ring-[#365FE8]/20'
                          : 'bg-[#F7F8FA] border-[#E7EAF0] hover:border-[#D5DBE5]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[13px] font-bold text-[#151922]">
                          {def.label}
                        </span>
                        {active && (
                          <Check className="w-3.5 h-3.5 text-[#365FE8]" strokeWidth={2.5} />
                        )}
                      </div>
                      <p className="text-[11px] text-[#697386] mt-1 leading-snug">
                        {def.subtitle}
                      </p>
                    </button>
                  );
                }
              )}
            </div>
          </section>

          {/* 3. Penny AI Companion */}
          <section className="surface-subtle p-4 space-y-3" aria-label="Penny AI companion controls">
            <div className="space-y-1 pb-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#365FE8] shrink-0" />
                  <h3 className="text-xs font-bold text-[#151922]">
                    Penny AI Companion
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-semibold text-[#365FE8] truncate max-w-full">
                  {pennyProfile.resolvedSummary}
                </span>
              </div>
              <p className="text-[11px] text-[#697386] pl-6">
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
                <span className="text-[11.5px] font-semibold text-[#697386]">
                  Personality Mode ({pennyProfile.messageCount}{' '}
                  {pennyProfile.messageCount === 1 ? 'chat' : 'chats'} learned)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={resetPennyProfile}
                    className="text-[11px] font-semibold text-[#697386] hover:text-[#151922] inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset Style
                  </button>
                  {pennyMessages.length > 0 && (
                    <button
                      type="button"
                      onClick={clearPennyMessages}
                      className="text-[11px] font-semibold text-[#DE5252] hover:underline inline-flex items-center gap-1"
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
                          ? 'bg-[#EDF2FF] border-[#365FE8] text-[#151922]'
                          : 'bg-white border-[#E7EAF0] text-[#697386] hover:text-[#151922]'
                      }`}
                    >
                      <p className="text-xs font-bold leading-tight">{modeOpt.label}</p>
                      <p className="text-[10.5px] opacity-80 mt-0.5 leading-tight">{modeOpt.hint}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 3.5 UPI Profile for Split Settlements */}
          <section className="surface-subtle p-4 space-y-3" aria-label="UPI profile settings">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[#365FE8]" />
                <div>
                  <h3 className="text-xs font-bold text-[#151922]">
                    UPI Profile for Split Settlements
                  </h3>
                  <p className="text-[11px] text-[#697386]">
                    Used to generate scannable QR codes when friends owe you money.
                  </p>
                </div>
              </div>
              {myUpiId && (
                <span className="text-[11px] font-mono font-semibold text-[#15966B]">
                  Saved
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="block space-y-1">
                <span className="text-[11px] font-medium text-[#697386]">Your UPI ID</span>
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
                <span className="text-[11px] font-medium text-[#697386]">Display Name (optional)</span>
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
              <p className="text-[11.5px] font-medium text-[#DE5252]">{upiValidationError}</p>
            )}
            {upiSavedStatus && (
              <p className="text-[11.5px] font-semibold text-[#15966B]">{upiSavedStatus}</p>
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
          <section className="surface-subtle p-4 space-y-2" aria-label="Navigation modules">
            <div className="flex items-center gap-2 pb-1">
              <LayoutGrid className="w-4 h-4 text-[#365FE8]" />
              <div>
                <h3 className="text-xs font-bold text-[#151922]">
                  Navigation Sections
                </h3>
                <p className="text-[11px] text-[#697386]">
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
          <section className="surface-subtle p-4 space-y-2" aria-label="Overview and Shopping controls">
            <div className="flex items-center gap-2 pb-1">
              <ShoppingBag className="w-4 h-4 text-[#15966B]" />
              <div>
                <h3 className="text-xs font-bold text-[#151922]">
                  Overview &amp; Shopping Clutter Control
                </h3>
                <p className="text-[11px] text-[#697386]">
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
          <section className="surface-subtle p-4 space-y-2" aria-label="Insights and Scanner controls">
            <div className="flex items-center gap-2 pb-1">
              {featureSettings.showScanner ? (
                <ScanLine className="w-4 h-4 text-[#C7851F]" />
              ) : (
                <LineChart className="w-4 h-4 text-[#365FE8]" />
              )}
              <div>
                <h3 className="text-xs font-bold text-[#151922]">
                  Insights &amp; Receipt Scanner Modules
                </h3>
                <p className="text-[11px] text-[#697386]">
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
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[#E7EAF0] bg-[#F7F8FA] flex items-center justify-between gap-3">
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
