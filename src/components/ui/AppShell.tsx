import type { ReactNode } from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  LineChart,
  Receipt,
  ScanLine,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { formatCurrency, formatCurrencyExact } from '../../utils/categoryStyles';
import { ProgressBar } from './ProgressBar';

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
  mobileLabel: string;
  icon: typeof LayoutDashboard;
}

export const APP_NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', mobileLabel: 'Overview', icon: LayoutDashboard },
  { id: 'shopping', label: 'Shopping', mobileLabel: 'Shop', icon: ShoppingBag },
  { id: 'insights', label: 'Insights', mobileLabel: 'Insights', icon: LineChart },
  { id: 'expenses', label: 'Expenses', mobileLabel: 'Expenses', icon: Receipt },
  { id: 'scanner', label: 'Receipt Scanner', mobileLabel: 'Scan', icon: ScanLine },
  { id: 'wellness', label: 'Financial Wellness', mobileLabel: 'Wellness', icon: ShieldCheck },
];

interface AppShellProps {
  activeSection: AppSection;
  onSelectSection: (section: AppSection) => void;
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  cartItemCount: number;
  children: ReactNode;
}

export function AppShell({
  activeSection,
  onSelectSection,
  totalBudget,
  totalSpent,
  remainingBudget,
  cartItemCount,
  children,
}: AppShellProps) {
  const safeBudget = Math.max(0, totalBudget);
  const utilisationPct =
    safeBudget > 0 ? Math.round((totalSpent / safeBudget) * 1000) / 10 : 0;

  const budgetTone: 'brand' | 'success' | 'warning' | 'danger' =
    safeBudget > 0 && remainingBudget < 0
      ? 'danger'
      : utilisationPct >= 80
        ? 'warning'
        : 'success';

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#151922] flex flex-col lg:flex-row">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-xl focus:bg-[#365FE8] focus:text-white focus:text-sm focus:font-semibold"
      >
        Skip to content
      </a>

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:justify-between w-[252px] shrink-0 bg-white border-r border-[#E7EAF0] sticky top-0 h-screen px-4 py-6">
        <div className="space-y-6">
          {/* Brand */}
          <button
            type="button"
            onClick={() => onSelectSection('overview')}
            className="w-full flex items-center gap-3 px-2 py-1 text-left rounded-xl hover:bg-[#F7F8FA] transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-[#365FE8] flex items-center justify-center shrink-0 shadow-sm">
              <Wallet className="w-[18px] h-[18px] text-white" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-bold tracking-tight text-[#151922] leading-tight">
                CartAudit
              </p>
              <p className="text-[11px] font-medium text-[#697386] leading-tight mt-0.5">
                Smart Budget Radar
              </p>
            </div>
          </button>

          {/* Primary Nav */}
          <nav aria-label="Primary navigation" className="space-y-1">
            {APP_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectSection(item.id)}
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
                    <span className="px-1.5 py-0.5 rounded-md bg-[#365FE8] text-white text-[11px] font-mono font-semibold tabular-nums">
                      {cartItemCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Budget Status Card */}
        <div className="rounded-2xl bg-[#F7F8FA] border border-[#E7EAF0] p-4 space-y-2.5">
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
      </aside>

      {/* Main Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Compact Mobile Top Header (<= 52px) */}
        <header className="lg:hidden sticky top-0 z-30 h-[52px] bg-white/95 backdrop-blur border-b border-[#E7EAF0] px-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onSelectSection('overview')}
            className="flex items-center gap-2.5 text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-[#365FE8] flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4 text-white" strokeWidth={2.2} />
            </div>
            <span className="text-[15px] font-bold tracking-tight text-[#151922]">
              CartAudit
            </span>
          </button>

          <div className="text-right leading-tight">
            <span className="block text-[10px] font-medium text-[#697386]">
              Balance
            </span>
            <span
              className={`text-[13.5px] font-bold font-mono tabular-nums ${
                remainingBudget < 0 ? 'text-[#DE5252]' : 'text-[#15966B]'
              }`}
            >
              {remainingBudget < 0 ? '-' : ''}₹{formatCurrencyExact(Math.abs(remainingBudget))}
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main
          id="main-content"
          className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 pb-24 lg:pb-12"
        >
          <div key={activeSection} className="animate-fade-in-up">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation (<= 60px) */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-[60px] bg-white/95 backdrop-blur border-t border-[#E7EAF0] grid grid-cols-6 items-center px-1"
      >
        {APP_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectSection(item.id)}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg transition-colors min-h-[48px] ${
                active ? 'text-[#365FE8]' : 'text-[#697386] hover:text-[#151922]'
              }`}
            >
              <span className="relative">
                <Icon className="w-[18px] h-[18px]" strokeWidth={active ? 2.2 : 1.8} />
                {item.id === 'shopping' && cartItemCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-1 rounded-full bg-[#365FE8] text-white text-[9px] font-bold font-mono tabular-nums flex items-center justify-center">
                    {cartItemCount > 9 ? '9+' : cartItemCount}
                  </span>
                )}
              </span>
              <span
                className={`text-[10px] leading-none truncate max-w-[58px] ${
                  active ? 'font-semibold' : 'font-medium'
                }`}
              >
                {item.mobileLabel}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
