import { useState, useEffect, useMemo } from 'react';
import { AppShell, type AppSection } from './components/ui/AppShell';
import { OverviewDashboard } from './components/overview/OverviewDashboard';
import { QuickMartGrid } from './components/mart/QuickMartGrid';
import { CartDrawer } from './components/mart/CartDrawer';
import {
  InsightsDashboard,
  type InsightsTab,
} from './components/insights/InsightsDashboard';
import { ExpensesDashboard } from './components/expenses/ExpensesDashboard';
import { AuditPanel } from './components/audit/AuditPanel';
import { SurvivalSandbox } from './components/analytics/SurvivalSandbox';
import { useAppStore } from './store/useStore';
import {
  calculateCartTotals,
  getEffectiveTransactionAmount,
} from './utils/martEngine';

export default function App() {
  const [activeSection, setActiveSection] = useState<AppSection>('overview');
  const [insightsInitialTab, setInsightsInitialTab] =
    useState<InsightsTab>('radar');
  const [cartOpenSignal, setCartOpenSignal] = useState(0);

  const transactions = useAppStore((s) => s.transactions);
  const totalBudget = useAppStore((s) => s.totalBudget);
  const items = useAppStore((s) => s.items);

  const totalSpent = useMemo(
    () =>
      transactions.reduce(
        (sum, tx) => sum + getEffectiveTransactionAmount(tx),
        0
      ),
    [transactions]
  );
  const remaining = totalBudget - totalSpent;

  const cartTotals = useMemo(() => calculateCartTotals(items), [items]);
  const hasCartItems = cartTotals.lineCount > 0;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeSection]);

  const handleNavigate = (section: AppSection, subTab?: string) => {
    if (section === 'insights' && (subTab === 'radar' || subTab === 'prices')) {
      setInsightsInitialTab(subTab);
    }
    setActiveSection(section);
  };

  return (
    <AppShell
      activeSection={activeSection}
      onSelectSection={(sec) => handleNavigate(sec)}
      totalBudget={totalBudget}
      totalSpent={totalSpent}
      remainingBudget={remaining}
      cartItemCount={cartTotals.lineCount}
    >
      {activeSection === 'overview' && (
        <OverviewDashboard onNavigate={handleNavigate} />
      )}

      {activeSection === 'shopping' && (
        <QuickMartGrid onOpenCart={() => setCartOpenSignal((n) => n + 1)} />
      )}

      {activeSection === 'insights' && (
        <InsightsDashboard
          initialTab={insightsInitialTab}
          onOpenExpenses={() => handleNavigate('expenses')}
        />
      )}

      {activeSection === 'expenses' && <ExpensesDashboard />}

      {activeSection === 'scanner' && (
        <AuditPanel
          onOpenPriceTracker={() => handleNavigate('insights', 'prices')}
        />
      )}

      {activeSection === 'wellness' && <SurvivalSandbox />}

      {(activeSection === 'shopping' || hasCartItems) && (
        <CartDrawer openSignal={cartOpenSignal} />
      )}
    </AppShell>
  );
}
