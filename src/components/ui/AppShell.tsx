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
    isSigningIn,
    signInWithGoogle,
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
    <div className="min-h-screen app-canvas-atmosphere text-[#151922] flex flex-col lg:flex-row">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-xl focus:bg-[#365FE8] focus:text-white focus:text-sm focus:font-semibold"
      >
        Skip to content
      </a>

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-[256px] shrink-0 shell-sidebar sticky top-0 h-screen px-4 py-5 gap-4">
        {/* Brand */}
        <button
          type="button"
          onClick={() => onSelectSection('overview')}
          className="w-full shrink-0 flex items-center gap-3 px-2 py-1.5 text-left rounded-xl hover:bg-[#F7F8FA] transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-[#365FE8] flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_2px_6px_rgba(0,0,0,0.16)]">
            <Wallet className="w-[18px] h-[18px] text-white" strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-bold font-display tracking-tight text-[#151922] leading-tight">
              CartAudit
            </p>
            <p className="text-[11px] font-medium text-[#697386] leading-tight mt-0.5">
              Smart Budget Radar
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
                  className={`relative w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-[13.5px] transition-all ${
                    active
                      ? 'bg-[#EDF2FF] text-[#365FE8] font-semibold border border-[#D4E0FF]'
                      : 'text-[#697386] font-medium border border-transparent hover:bg-[#F7F8FA] hover:text-[#151922]'
                  }`}
                >
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute left-1 top-2 bottom-2 w-[3px] rounded-full bg-[#365FE8]"
                    />
                  )}
                  <span className="flex items-center gap-3 min-w-0 pl-1">
                    <Icon
                      className={`w-[18px] h-[18px] shrink-0 ${
                        active ? 'text-[#365FE8]' : 'text-[#697386]'
                      }`}
                      strokeWidth={active ? 2.2 : 1.9}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.id === 'shopping' && cartItemCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-md bg-[#365FE8] text-white text-[11px] font-mono font-semibold tabular-nums">
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
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#F7F8FA] hover:bg-[#F1F3F6] border border-[#E7EAF0] text-left transition-colors"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-lg object-cover shrink-0 border border-[#E7EAF0]"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-[#365FE8] text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {userInitial}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[#151922] truncate leading-tight">
                  {user.displayName || 'Synced Account'}
                </p>
                <p
                  className={`text-[10.5px] font-semibold truncate leading-tight mt-0.5 flex items-center gap-1 ${
                    syncStatus === 'error'
                      ? 'text-[#DE5252]'
                      : syncStatus === 'offline'
                        ? 'text-[#C7851F]'
                        : 'text-[#15966B]'
                  }`}
                >
                  {syncStatus === 'syncing' || syncStatus === 'connecting' ? (
                    <RefreshCw className="w-2.5 h-2.5 animate-spin shrink-0" />
                  ) : syncStatus === 'offline' ? (
                    <CloudOff className="w-2.5 h-2.5 shrink-0" />
                  ) : (
                    <Cloud className="w-2.5 h-2.5 shrink-0" />
                  )}
                  <span>{syncLabel}</span>
                </p>
              </div>
            </button>
          ) : (
            <button
              type="button"
              disabled={isSigningIn}
              onClick={() => void signInWithGoogle()}
              data-testid="sidebar-google-signin"
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#EDF2FF] hover:bg-[#DCE6FF] border border-[#D4E0FF] text-[#365FE8] text-xs font-bold transition-colors whitespace-nowrap"
            >
              <LogIn className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
              <span>{isSigningIn ? 'Connecting…' : 'Sign in to Sync'}</span>
            </button>
          )}

          {/* Active Cart Shortcut (Accessible from any section) */}
          {cartItemCount > 0 && onOpenCart && (
            <button
              type="button"
              onClick={onOpenCart}
              aria-label={`Open shopping cart with ${cartItemCount} items`}
              data-testid="sidebar-open-cart"
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#EDF2FF] hover:bg-[#DCE6FF] border border-[#D4E0FF] text-[#365FE8] text-xs font-bold transition-colors"
            >
              <span className="flex items-center gap-2 min-w-0">
                <ShoppingBag className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                <span className="truncate">Open Cart</span>
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-[#365FE8] text-white text-[11px] font-mono tabular-nums">
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
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-[#F7F8FA] hover:bg-[#F1F3F6] border border-[#E7EAF0] text-xs font-semibold text-[#151922] transition-colors"
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-[#F5B74F]" strokeWidth={2.2} />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-[#365FE8]" strokeWidth={2.2} />
                  <span>Dark</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Open settings"
              data-testid="sidebar-settings-button"
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-[#F7F8FA] hover:bg-[#F1F3F6] border border-[#E7EAF0] text-xs font-semibold text-[#151922] transition-colors"
            >
              <Settings className="w-3.5 h-3.5 text-[#697386]" strokeWidth={2.2} />
              <span>Settings</span>
            </button>
          </div>

          {/* Bottom Budget Status Card */}
          <div className="surface-subtle p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
                Budget Status
              </span>
              <span
                className={`text-[11px] font-semibold font-mono tabular-nums ${
                  budgetTone === 'danger'
                    ? 'text-[#DE5252]'
                    : budgetTone === 'warning'
                      ? 'text-[#C7851F]'
                      : 'text-[#15966B]'
                }`}
              >
                {Math.round(utilisationPct)}%
              </span>
            </div>

            <div>
              <p className="text-[11px] text-[#697386]">Remaining</p>
              <p
                className={`text-[19px] font-bold font-mono tabular-nums tracking-tight ${
                  remainingBudget < 0 ? 'text-[#DE5252]' : 'text-[#151922]'
                }`}
              >
                {remainingBudget < 0 ? '-' : ''}₹{formatCurrencyExact(Math.abs(remainingBudget))}
              </p>
            </div>

            <ProgressBar
              value={safeBudget > 0 ? (totalSpent / safeBudget) * 100 : 0}
              tone={budgetTone}
              size="sm"
            />

            <div className="flex items-center justify-between text-[11px] text-[#697386] font-mono tabular-nums pt-0.5">
              <span>₹{formatCurrency(totalSpent)} spent</span>
              <span>of ₹{formatCurrency(safeBudget)}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Compact Sticky Mobile/Tablet Header (Single Clean Row + Hamburger Drawer) */}
        <header className="lg:hidden sticky top-0 z-30 h-[54px] shell-header px-3 sm:px-5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={mobileDrawerOpen}
              className="relative w-8 h-8 rounded-xl bg-[#F7F8FA] border border-[#E7EAF0] flex items-center justify-center text-[#151922] shrink-0"
            >
              <Menu className="w-4 h-4" strokeWidth={2.2} />
              {cartItemCount > 0 && activeSection !== 'shopping' && (
                <span
                  aria-hidden="true"
                  className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#365FE8] ring-2 ring-white"
                />
              )}
            </button>
            <button
              type="button"
              onClick={() => onSelectSection('overview')}
              className="flex items-center gap-2 text-left min-w-0"
            >
              <div className="w-7 h-7 rounded-lg bg-[#365FE8] flex items-center justify-center shrink-0">
                <Wallet className="w-3.5 h-3.5 text-white" strokeWidth={2.2} />
              </div>
              <span className="text-[15px] font-bold tracking-tight text-[#151922] truncate">
                CartAudit
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="text-right leading-tight mr-0.5">
              <span className="hidden sm:block text-[10px] font-medium text-[#697386]">
                Balance
              </span>
              <span
                className={`text-[12.5px] sm:text-[13px] font-bold font-mono tabular-nums whitespace-nowrap ${
                  remainingBudget < 0 ? 'text-[#DE5252]' : 'text-[#15966B]'
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
                className="w-8 h-8 rounded-xl bg-[#EDF2FF] border border-[#D4E0FF] flex items-center justify-center overflow-hidden shrink-0"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold text-[#365FE8]">{userInitial}</span>
                )}
              </button>
            )}

            {cartItemCount > 0 && onOpenCart && (
              <button
                type="button"
                onClick={onOpenCart}
                aria-label={`Open shopping cart with ${cartItemCount} items`}
                data-testid="mobile-open-cart"
                className="h-8 px-2 rounded-xl bg-[#EDF2FF] border border-[#D4E0FF] text-[#365FE8] text-xs font-bold flex items-center gap-1 shrink-0"
              >
                <ShoppingBag className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                <span className="font-mono tabular-nums">{cartItemCount}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isDark ? 'Switch to Light theme' : 'Switch to Dark theme'}
              data-testid="mobile-theme-toggle"
              className="w-8 h-8 rounded-xl bg-[#F7F8FA] border border-[#E7EAF0] flex items-center justify-center text-[#151922] shrink-0"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-[#F5B74F]" strokeWidth={2.2} />
              ) : (
                <Moon className="w-4 h-4 text-[#365FE8]" strokeWidth={2.2} />
              )}
            </button>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Open settings"
              data-testid="mobile-settings-button"
              className="w-8 h-8 rounded-xl bg-[#F7F8FA] border border-[#E7EAF0] flex items-center justify-center text-[#697386] hover:text-[#151922] shrink-0"
            >
              <Settings className="w-4 h-4" strokeWidth={2.2} />
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
            className="fixed inset-0 bg-[#151922]/45 backdrop-blur-[3px] animate-fade-in"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <aside className="relative z-10 w-[280px] max-w-[85vw] h-full modal-panel border-r border-[#E7EAF0] px-4 py-4 flex flex-col gap-4 animate-fade-in">
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
                <div className="w-8 h-8 rounded-xl bg-[#365FE8] flex items-center justify-center shrink-0">
                  <Wallet className="w-4 h-4 text-white" strokeWidth={2.2} />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#151922] leading-tight">CartAudit</p>
                  <p className="text-[11px] text-[#697386] leading-tight">Smart Budget Radar</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close navigation menu"
                className="w-8 h-8 rounded-lg bg-[#F7F8FA] border border-[#E7EAF0] flex items-center justify-center text-[#697386] hover:text-[#151922]"
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
                    className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-[13.5px] transition-colors ${
                      active
                        ? 'bg-[#EDF2FF] text-[#365FE8] font-semibold'
                        : 'text-[#697386] font-medium hover:bg-[#F7F8FA] hover:text-[#151922]'
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`w-[18px] h-[18px] shrink-0 ${
                          active ? 'text-[#365FE8]' : 'text-[#697386]'
                        }`}
                        strokeWidth={active ? 2.2 : 1.9}
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.id === 'shopping' && cartItemCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-md bg-[#365FE8] text-white text-[11px] font-mono font-semibold tabular-nums shrink-0">
                        {cartItemCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="shrink-0 pt-2 border-t border-[#E7EAF0]">
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    setSettingsOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#F7F8FA] border border-[#E7EAF0] text-left"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-[#365FE8] text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {userInitial}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#151922] truncate">
                      {user.displayName || 'Synced Account'}
                    </p>
                    <p className="text-[10.5px] font-semibold text-[#15966B] truncate">
                      {syncLabel}
                    </p>
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSigningIn}
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    void signInWithGoogle();
                  }}
                  className="btn-primary w-full px-3 py-2 text-xs"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{isSigningIn ? 'Connecting…' : 'Sign in with Google'}</span>
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
