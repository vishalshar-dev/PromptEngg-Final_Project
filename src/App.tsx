import { useState, useEffect } from 'react';
import { ShoppingBag, Radar, Shield, Wallet, ScanSearch, Users, LineChart } from 'lucide-react';
import { QuickMartGrid } from './components/mart/QuickMartGrid';
import { CartDrawer } from './components/mart/CartDrawer';
import { Ledger } from './components/ledgers/Ledger';
import { RadarDashboard } from './components/analytics/RadarDashboard';
import { SurvivalSandbox } from './components/analytics/SurvivalSandbox';
import { AuditPanel } from './components/audit/AuditPanel';
import { SplitLedgerDashboard } from './components/splits/SplitLedgerDashboard';
import { PriceTrackerDashboard } from './components/prices/PriceTrackerDashboard';
import { useAppStore } from './store/useStore';
import { formatCurrencyExact } from './utils/categoryStyles';
import { getEffectiveTransactionAmount } from './utils/martEngine';

type Tab = 'mart' | 'ledger' | 'prices' | 'audit' | 'radar' | 'warroom';

const tabs: { id: Tab; label: string; icon: typeof ShoppingBag }[] = [
  { id: 'mart', label: 'Mart', icon: ShoppingBag },
  { id: 'ledger', label: 'Ledger', icon: Users },
  { id: 'prices', label: 'Prices', icon: LineChart },
  { id: 'audit', label: 'Audit', icon: ScanSearch },
  { id: 'radar', label: 'Radar', icon: Radar },
  { id: 'warroom', label: 'War Room', icon: Shield },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('mart');
  const [cartOpenSignal, setCartOpenSignal] = useState(0);
  const transactions = useAppStore((s) => s.transactions);
  const totalBudget = useAppStore((s) => s.totalBudget);
  const items = useAppStore((s) => s.items);

  const totalSpent = transactions.reduce(
    (sum, tx) => sum + getEffectiveTransactionAmount(tx),
    0
  );
  const remaining = totalBudget - totalSpent;
  const hasCartItems = items.some((i) => i.quantity > 0);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-ink-950 text-white pb-32 font-sans selection:bg-brand-500 selection:text-black">
      {/* Top Bar */}
      <header className="glass-nav sticky top-0 z-40 border-b border-white/[0.06]">
        <div className="max-w-md md:max-w-5xl mx-auto px-4 md:px-6">
          {/* Logo + Balance */}
          <div className="flex items-center justify-between py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center glow-brand">
                  <Wallet className="w-5 h-5 text-ink-950" strokeWidth={2.5} />
                </div>
              </div>
              <div>
                <h1 className="text-[15px] font-extrabold tracking-tight leading-none">
                  CartAudit
                </h1>
                <p className="text-[10px] text-zinc-500 font-medium tracking-wide mt-0.5">
                  Smart Budget Radar
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                Balance
              </p>
              <p
                className={`text-sm font-bold font-mono tabular-nums ${
                  remaining > 500 ? 'text-brand-400' : 'text-red-400'
                }`}
              >
                ₹{formatCurrencyExact(remaining)}
              </p>
            </div>
          </div>

          {/* Pill Navigation */}
          <nav className="flex items-center justify-between sm:justify-start gap-1 sm:gap-1.5 pb-3 md:max-w-2xl overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative sm:flex-1 shrink-0 flex items-center justify-center gap-1 sm:gap-1.5 py-2 sm:py-2.5 px-2 rounded-xl text-[11px] sm:text-[13px] font-bold whitespace-nowrap transition-all duration-300 ${
                    active
                      ? 'bg-white/[0.08] text-white border border-white/10 shadow-lg'
                      : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-transform duration-300 ${
                      active ? 'scale-110' : ''
                    }`}
                    strokeWidth={2.5}
                  />
                  <span>{tab.label}</span>
                  {active && (
                    <span className="absolute -bottom-px left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-brand-400 glow-brand" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md md:max-w-5xl mx-auto px-4 md:px-6 pt-5">
        <div key={activeTab} className="animate-fade-in-up">
          {activeTab === 'mart' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7">
                <QuickMartGrid onOpenCart={() => setCartOpenSignal((n) => n + 1)} />
              </div>
              <div className="lg:col-span-5 lg:sticky lg:top-32">
                <Ledger onOpenSplitLedger={() => setActiveTab('ledger')} />
              </div>
            </div>
          )}
          {activeTab === 'ledger' && <SplitLedgerDashboard />}
          {activeTab === 'prices' && <PriceTrackerDashboard />}
          {activeTab === 'audit' && (
            <AuditPanel onOpenPriceTracker={() => setActiveTab('prices')} />
          )}
          {activeTab === 'radar' && <RadarDashboard />}
          {activeTab === 'warroom' && <SurvivalSandbox />}
        </div>
      </main>

      {/* Floating Checkout Bar (visible on Mart tab or whenever cart has items) */}
      {(activeTab === 'mart' || hasCartItems) && <CartDrawer openSignal={cartOpenSignal} />}
    </div>
  );
}
