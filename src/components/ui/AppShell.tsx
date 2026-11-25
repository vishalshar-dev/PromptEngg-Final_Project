import { useState, useEffect, type ReactNode } from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  LineChart,
  Receipt,
  ScanLine,
  ShieldCheck,
  Wallet,
  Settings,
  Sun,
  Moon,
  Menu,
  X,
  Cloud,
  CloudOff,
  LogIn,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import type { FeatureSettings, ThemeMode } from '../../types/models';
import { formatCurrency, formatCurrencyExact } from '../../utils/categoryStyles';
import { isSectionEnabled } from '../../utils/settingsEngine';
import { useCloudSync } from '../../contexts/CloudSyncContext';
import { useAppStore } from '../../store/useStore';
import { ProgressBar } from './ProgressBar';
import { SettingsModal } from '../settings/SettingsModal';

export type AppSection =
  | 'overview'
  | 'shopping'
  | 'insights'
  | 'expenses'
  | 'scanner'
  | 'wellness';

interface NavItem {
  id: AppSection;
  label: string;
  icon: typeof LayoutDashboard;
}

export const APP_NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag },
  { id: 'insights', label: 'Insights', icon: LineChart },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'scanner', label: 'Receipt Scanner', icon: ScanLine },
  { id: 'wellness', label: 'Financial Wellness', icon: ShieldCheck },
];

interface AppShellProps {
  activeSection: AppSection;
  onSelectSection: (section: AppSection, subTab?: string) => void;
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  cartItemCount: number;
  onOpenCart?: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  featureSettings: FeatureSettings;
  children: ReactNode;
}

export function AppShell({
  activeSection,
  onSelectSection,
  totalBudget,
  totalSpent,
  remainingBudget,
  cartItemCount,
  onOpenCart,
  theme,
  onToggleTheme,
  featureSettings,
  children,
}: AppShellProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    if (!mobileDrawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileDrawerOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileDrawerOpen]);

  useEffect(() => {
    if (!featureSettings.showPennyCompanion) return;
    const onShortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        useAppStore.getState().togglePennyOpen();
      }
    };
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, [featureSettings.showPennyCompanion]);

  const visibleNavItems = APP_NAV_ITEMS.filter((item) =>
    isSectionEnabled(item.id, featureSettings)
  );

  const safeBudget = Math.max(0, totalBudget);
  const utilisationPct =
    safeBudget > 0 ? Math.round((totalSpent / safeBudget) * 1000) / 10 : 0;

  const budgetTone: 'brand' | 'success' | 'warning' | 'danger' =
    safeBudget > 0 && remainingBudget < 0
      ? 'danger'
      : utilisationPct >= 80
        ? 'warning'
        : 'success';

  const isDark = theme === 'dark';
  const {
    user,
    syncStatus,
    syncError,
    syncErrorAction,
    isSigningIn,
    signInWithGoogle,
    clearSyncError,
  } = useCloudSync();

  const syncLabel =
    syncStatus === 'syncing' || syncStatus === 'connecting'
      ? 'Syncing…'
      : syncStatus === 'synced'
        ? 'Cloud Synced'
        : syncStatus === 'offline'
          ? 'Offline (Local)'
          : syncStatus === 'conflict'
            ? 'Review Merge'
            : syncStatus === 'error'
              ? 'Sync Issue'
              : 'Local Only';

  const userInitial = (user?.displayName || user?.email || 'U')
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <div className="min-h-screen app-canvas-atmosphere text-[var(--text-primary)] flex flex-col lg:flex-row">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-xl focus:bg-[var(--accent-primary)] focus:text-white focus:text-sm focus:font-semibold"
      >
        Skip to content
      </a>

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-[252px] shrink-0 shell-sidebar sticky top-0 h-screen px-4 py-5 gap-4">
        {/* Brand */}
        <button
          type="button"
          onClick={() => onSelectSection('overview')}
          className="w-full shrink-0 flex items-center gap-3 px-2.5 py-2 text-left rounded-xl hover:bg-[var(--bg-hover)] transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-[var(--accent-primary)] flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_2px_6px_rgba(0,0,0,0.16)]">
            <Wallet className="w-[18px] h-[18px] text-white" strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <p className="text-[15.5px] font-bold font-display tracking-tight text-[var(--text-primary)] leading-tight whitespace-nowrap">
              CartAudit
            </p>
            <p className="text-[12px] font-medium text-[var(--text-secondary)] leading-tight mt-0.5 truncate">
              Personal Finance
            </p>
          </div>
        </button>

        {/* Scrollable Primary Nav */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin pr-0.5">
          <nav aria-label="Primary navigation" className="space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectSection(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-[13.5px] whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-[var(--accent-primary-soft)] text-[var(--accent-ink)] font-semibold border border-[var(--accent-border)]'
                      : 'text-[var(--text-secondary)] font-medium border border-transparent hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-[18px] h-[18px] shrink-0 ${
                        active ? 'text-[var(--accent-ink)]' : 'text-[var(--text-secondary)]'
                      }`}
                      strokeWidth={active ? 2.2 : 1.85}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.id === 'shopping' && cartItemCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-md bg-[var(--accent-primary)] text-white text-xs font-mono font-semibold tabular-nums shrink-0">
                      {cartItemCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Workspace Controls + Cloud Account + Budget Status */}
        <div className="shrink-0 space-y-3">
          {/* Multi-Device Cloud Account */}
          {user ? (
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              data-testid="sidebar-cloud-account"
              aria-label={`Cloud account ${user.displayName || user.email || ''} (${syncLabel})`}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-left transition-colors"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-lg object-cover shrink-0 border border-[var(--border-subtle)]"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-[var(--accent-primary)] text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {userInitial}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[var(--text-primary)] truncate leading-tight">
                  {user.displayName || 'Synced Account'}
                </p>
                <p
                  className={`text-[12px] font-medium truncate leading-tight mt-0.5 flex items-center gap-1 ${
                    syncStatus === 'error'
                      ? 'text-[var(--accent-danger-ink)]'
                      : syncStatus === 'offline'
                        ? 'text-[var(--accent-warning-ink)]'
                        : 'text-[var(--accent-success-ink)]'
                  }`}
                >
                  {syncStatus === 'syncing' || syncStatus === 'connecting' ? (
                    <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
                  ) : syncStatus === 'offline' ? (
                    <CloudOff className="w-3 h-3 shrink-0" />
                  ) : (
                    <Cloud className="w-3 h-3 shrink-0" />
                  )}
                  <span>{syncLabel}</span>
                </p>
              </div>
            </button>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                disabled={isSigningIn}
                onClick={() => void signInWithGoogle()}
                data-testid="sidebar-google-signin"
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[var(--accent-primary-soft)] hover:bg-[var(--accent-primary-soft-hover)] border border-[var(--accent-border)] text-[var(--accent-ink)] text-xs font-semibold transition-colors whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5 shrink-0" strokeWidth={2.1} />
                <span>{isSigningIn ? 'Connecting…' : 'Sign in to Sync'}</span>
              </button>
              {syncError && (
                <div
                  role="alert"
                  data-testid="sidebar-sync-error"
                  className="rounded-xl px-2.5 py-2 bg-[var(--accent-danger-soft)] border border-[var(--accent-danger-border)] text-[var(--accent-danger-ink)] text-[11px] leading-snug space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex items-start gap-1.5 min-w-0">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <p className="break-words">{syncError}</p>
                    </div>
                    <button
                      type="button"
                      onClick={clearSyncError}
                      aria-label="Dismiss sync error"
                      className="shrink-0 p-0.5 rounded hover:bg-black/10"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  {syncErrorAction === 'open_new_tab' && typeof window !== 'undefined' && (
                    <a
                      href={window.location.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold underline"
                    >
                      <span>Open in new tab</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Active Cart Shortcut (Accessible from any section) */}
          {cartItemCount > 0 && onOpenCart && (
            <button
              type="button"
              onClick={onOpenCart}
              aria-label={`Open shopping cart with ${cartItemCount} items`}
              data-testid="sidebar-open-cart"
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[var(--accent-primary-soft)] hover:bg-[var(--accent-primary-soft-hover)] border border-[var(--accent-border)] text-[var(--accent-ink)] text-xs font-semibold transition-colors whitespace-nowrap"
            >
              <span className="flex items-center gap-2 min-w-0">
                <ShoppingBag className="w-3.5 h-3.5 shrink-0" strokeWidth={2.1} />
                <span className="truncate">Open Cart</span>
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-[var(--accent-primary)] text-white text-xs font-mono tabular-nums shrink-0">
                {cartItemCount}
              </span>
            </button>
          )}

          {/* Quick Theme & Settings Controls */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isDark ? 'Switch to Light theme' : 'Switch to Dark theme'}
              data-testid="sidebar-theme-toggle"
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] transition-colors whitespace-nowrap"
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-[var(--accent-warning)]" strokeWidth={2.1} />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-[var(--accent-ink)]" strokeWidth={2.1} />
                  <span>Dark</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Open settings"
              data-testid="sidebar-settings-button"
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] transition-colors whitespace-nowrap"
            >
              <Settings className="w-3.5 h-3.5 text-[var(--text-secondary)]" strokeWidth={2.1} />
              <span>Settings</span>
            </button>
          </div>

          {/* Compact Persistent Budget Strip */}
          <button
            type="button"
            onClick={() => onSelectSection('overview')}
            data-testid="sidebar-budget-strip"
            aria-label={`Budget status: ${Math.round(utilisationPct)}% used, ${
              remainingBudget < 0 ? 'over by ' : ''
            }₹${formatCurrencyExact(Math.abs(remainingBudget))} ${
              remainingBudget < 0 ? 'deficit' : 'remaining'
            }`}
            className={`w-full text-left surface-subtle px-3.5 py-2.5 space-y-1.5 transition-all hover:border-[var(--accent-border)] ${
              activeSection === 'overview' ? 'opacity-80 hover:opacity-100' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11.5px] font-semibold text-[var(--text-secondary)]">
                Cycle budget
              </span>
              <span
                className={`text-[11.5px] font-semibold font-mono tabular-nums ${
                  budgetTone === 'danger'
                    ? 'text-[var(--accent-danger-ink)]'
                    : budgetTone === 'warning'
                      ? 'text-[var(--accent-warning-ink)]'
                      : 'text-[var(--accent-success-ink)]'
                }`}
              >
                {Math.round(utilisationPct)}% used
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-2">
              <span
                className={`text-[14px] font-bold font-mono tabular-nums tracking-tight ${
                  remainingBudget < 0
                    ? 'text-[var(--accent-danger-ink)]'
                    : 'text-[var(--text-primary)]'
                }`}
              >
                {remainingBudget < 0 ? '-' : ''}₹{formatCurrencyExact(Math.abs(remainingBudget))}
              </span>
              <span className="text-[11px] font-mono tabular-nums text-[var(--text-muted)] truncate">
                of ₹{formatCurrency(safeBudget)}
              </span>
            </div>

            <ProgressBar
              value={safeBudget > 0 ? (totalSpent / safeBudget) * 100 : 0}
              tone={budgetTone}
              size="sm"
              label="Sidebar cycle budget utilization"
            />
          </button>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Compact Sticky Mobile/Tablet Header (Single Clean Row + Hamburger Drawer) */}
        <header className="lg:hidden sticky top-0 z-30 h-[56px] shell-header px-2.5 sm:px-5 flex items-center justify-between gap-1.5 sm:gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={mobileDrawerOpen}
              className="relative w-9 h-9 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] shrink-0"
            >
              <Menu className="w-4 h-4" strokeWidth={2.1} />
              {cartItemCount > 0 && activeSection !== 'shopping' && (
                <span
                  aria-hidden="true"
                  className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[var(--accent-primary)] ring-2 ring-[var(--bg-surface)]"
                />
              )}
            </button>
            <button
              type="button"
              onClick={() => onSelectSection('overview')}
              className="flex items-center gap-2 text-left min-w-0"
            >
              <div className="hidden sm:flex w-7 h-7 rounded-lg bg-[var(--accent-primary)] items-center justify-center shrink-0">
                <Wallet className="w-3.5 h-3.5 text-white" strokeWidth={2.2} />
              </div>
              <span className="text-[15px] font-bold font-display tracking-tight text-[var(--text-primary)] truncate">
                CartAudit
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="text-right leading-tight mr-0.5">
              <span className="hidden sm:block text-xs font-medium text-[var(--text-secondary)]">
                Balance
              </span>
              <span
                className={`text-[12.5px] sm:text-[13px] font-bold font-mono tabular-nums whitespace-nowrap ${
                  remainingBudget < 0
                    ? 'text-[var(--accent-danger-ink)]'
                    : 'text-[var(--accent-success-ink)]'
                }`}
              >
                {remainingBudget < 0 ? '-' : ''}₹{formatCurrencyExact(Math.abs(remainingBudget))}
              </span>
            </div>

            {user && (
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                aria-label="Account and sync settings"
                data-testid="mobile-account-button"
                className="w-9 h-9 rounded-xl bg-[var(--accent-primary-soft)] border border-[var(--accent-border)] flex items-center justify-center overflow-hidden shrink-0"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold text-[var(--accent-ink)]">{userInitial}</span>
                )}
              </button>
            )}

            {cartItemCount > 0 && onOpenCart && (
              <button
                type="button"
                onClick={onOpenCart}
                aria-label={`Open shopping cart with ${cartItemCount} items`}
                data-testid="mobile-open-cart"
                className="h-9 px-2.5 rounded-xl bg-[var(--accent-primary-soft)] border border-[var(--accent-border)] text-[var(--accent-ink)] text-xs font-bold flex items-center gap-1 shrink-0 whitespace-nowrap"
              >
                <ShoppingBag className="w-3.5 h-3.5 shrink-0" strokeWidth={2.1} />
                <span className="font-mono tabular-nums">{cartItemCount}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isDark ? 'Switch to Light theme' : 'Switch to Dark theme'}
              data-testid="mobile-theme-toggle"
              className="w-9 h-9 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] shrink-0"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-[var(--accent-warning)]" strokeWidth={2.1} />
              ) : (
                <Moon className="w-4 h-4 text-[var(--accent-ink)]" strokeWidth={2.1} />
              )}
            </button>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Open settings"
              data-testid="mobile-settings-button"
              className="w-9 h-9 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0"
            >
              <Settings className="w-4 h-4" strokeWidth={2.1} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main
          id="main-content"
          className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 pb-24 lg:pb-16"
        >
          <div key={activeSection} className="animate-fade-in-up">
            {children}
          </div>
        </main>
      </div>

      {/* Slide-out Mobile/Tablet Drawer */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-[var(--backdrop-scrim)] backdrop-blur-[3px] animate-fade-in"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <aside className="relative z-10 w-[280px] max-w-[85vw] h-full modal-panel border-r border-[var(--border-subtle)] px-4 py-4 flex flex-col gap-4 animate-fade-in">
            {/* Drawer Header */}
            <div className="shrink-0 flex items-center justify-between gap-2 px-1">
              <button
                type="button"
                onClick={() => {
                  onSelectSection('overview');
                  setMobileDrawerOpen(false);
                }}
                className="flex items-center gap-2.5 text-left"
              >
                <div className="w-8 h-8 rounded-xl bg-[var(--accent-primary)] flex items-center justify-center shrink-0">
                  <Wallet className="w-4 h-4 text-white" strokeWidth={2.2} />
                </div>
                <div>
                  <p className="text-sm font-bold font-display text-[var(--text-primary)] leading-tight">
                    CartAudit
                  </p>
                  <p className="text-[12px] text-[var(--text-secondary)] leading-tight">
                    Personal Finance
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close navigation menu"
                className="w-9 h-9 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Clean Scrollable Sections List */}
            <nav
              aria-label="Drawer navigation"
              className="flex-1 min-h-0 overflow-y-auto scrollbar-thin space-y-1 pr-0.5"
            >
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectSection(item.id);
                      setMobileDrawerOpen(false);
                    }}
                    aria-current={active ? 'page' : undefined}
                    className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-[13.5px] whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-[var(--accent-primary-soft)] text-[var(--accent-ink)] font-semibold'
                        : 'text-[var(--text-secondary)] font-medium hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`w-[18px] h-[18px] shrink-0 ${
                          active ? 'text-[var(--accent-ink)]' : 'text-[var(--text-secondary)]'
                        }`}
                        strokeWidth={active ? 2.2 : 1.85}
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.id === 'shopping' && cartItemCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-md bg-[var(--accent-primary)] text-white text-xs font-mono font-semibold tabular-nums shrink-0">
                        {cartItemCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="shrink-0 pt-2 border-t border-[var(--border-subtle)]">
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    setSettingsOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-left"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-[var(--accent-primary)] text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {userInitial}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                      {user.displayName || 'Synced Account'}
                    </p>
                    <p className="text-[12px] font-medium text-[var(--accent-success-ink)] truncate">
                      {syncLabel}
                    </p>
                  </div>
                </button>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={isSigningIn}
                    onClick={() => {
                      void signInWithGoogle();
                    }}
                    className="btn-primary w-full px-3 py-2 text-xs"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{isSigningIn ? 'Connecting…' : 'Sign in with Google'}</span>
                  </button>
                  {syncError && (
                    <div
                      role="alert"
                      className="rounded-xl px-2.5 py-2 bg-[var(--accent-danger-soft)] border border-[var(--accent-danger-border)] text-[var(--accent-danger-ink)] text-[11px] leading-snug space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-start gap-1.5 min-w-0">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <p className="break-words">{syncError}</p>
                        </div>
                        <button
                          type="button"
                          onClick={clearSyncError}
                          aria-label="Dismiss sync error"
                          className="shrink-0 p-0.5 rounded hover:bg-black/10"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      {syncErrorAction === 'open_new_tab' && typeof window !== 'undefined' && (
                        <a
                          href={window.location.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold underline"
                        >
                          <span>Open in new tab</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
