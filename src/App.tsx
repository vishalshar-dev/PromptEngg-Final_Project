import { useState, useEffect } from 'react';
import { ShoppingBag, Radar, Shield, Wallet } from 'lucide-react';
import { QuickMartGrid } from './components/mart/QuickMartGrid';
import { CartDrawer } from './components/mart/CartDrawer';
import { Ledger } from './components/ledgers/Ledger';
import { RadarDashboard } from './components/analytics/RadarDashboard';
import { SurvivalSandbox } from './components/analytics/SurvivalSandbox';
import { useAppStore } from './store/useStore';
import { formatCurrency } from './utils/categoryStyles';

type Tab = 'mart' | 'radar' | 'warroom';

const tabs: { id: Tab; label: string; icon: typeof ShoppingBag }[] = [
  { id: 'mart', label: 'Mart', icon: ShoppingBag },
  { id: 'radar', label: 'Radar', icon: Radar },
  { id: 'warroom', label: 'War Room', icon: Shield },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('mart');
  const transactions = useAppStore((s) => s.transactions);
  const totalBudget = useAppStore((s) => s.totalBudget);

  const totalSpent = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const remaining = totalBudget - totalSpent;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-ink-950 text-white pb-32 font-sans selection:bg-brand-500 selection:text-black">
      {/* Top Bar */}
      <header className="glass-nav sticky top-0 z-40 border-b border-white/[0.06]">
        <div className="max-w-md mx-auto px-4">
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
                ₹{formatCurrency(remaining)}
              </p>
            </div>
          </div>

          {/* Pill Navigation */}
          <nav className="flex gap-1.5 pb-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-300 ${
                    active
                      ? 'bg-white/[0.08] text-white border border-white/10 shadow-lg'
                      : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 transition-transform duration-300 ${
                      active ? 'scale-110' : ''
                    }`}
                    strokeWidth={2.5}
                  />
                  {tab.label}
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
      <main className="max-w-md mx-auto px-4 pt-5">
        <div key={activeTab} className="animate-fade-in-up">
          {activeTab === 'mart' && (
            <div className="space-y-5">
              <QuickMartGrid />
              <Ledger />
            </div>
          )}
          {activeTab === 'radar' && <RadarDashboard />}
          {activeTab === 'warroom' && <SurvivalSandbox />}
        </div>
      </main>

      {/* Floating Checkout Bar */}
      <CartDrawer />
    </div>
  );
}
