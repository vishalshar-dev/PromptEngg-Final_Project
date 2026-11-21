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
import { PennyFloatingCompanion } from './components/penny/PennyFloatingCompanion';
import { CloudSyncConflictModal } from './components/cloud/CloudSyncConflictModal';
import { useAppStore } from './store/useStore';
import { calculateCartTotals } from './utils/martEngine';
import { computeBudgetCycleSummary } from './utils/budgetCycle';
import { resolveSafeSection } from './utils/settingsEngine';

export default function App() {
  const [activeSection, setActiveSection] = useState<AppSection>('overview');
  const [insightsInitialTab, setInsightsInitialTab] =
    useState<InsightsTab>('penny');
  const [insightsTabSignal, setInsightsTabSignal] = useState(0);
  const [shopInitialSection, setShopInitialSection] =
    useState<'home' | 'baskets'>('home');
  const [shopSectionSignal, setShopSectionSignal] = useState(0);
  const [warRoomInitialTab, setWarRoomInitialTab] =
    useState<'overview' | 'broke'>('overview');
  const [warRoomTabSignal, setWarRoomTabSignal] = useState(0);
  const [scannerFocusTarget, setScannerFocusTarget] = useState<'comparator' | undefined>(undefined);
  const [scannerFocusSignal, setScannerFocusSignal] = useState(0);
  const [cartOpenSignal, setCartOpenSignal] = useState(0);

  const transactions = useAppStore((s) => s.transactions);
  const totalBudget = useAppStore((s) => s.totalBudget);
  const budgetResetDay = useAppStore((s) => s.budgetResetDay);
  const budgetRolloverEnabled = useAppStore((s) => s.budgetRolloverEnabled);
  const items = useAppStore((s) => s.items);
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const featureSettings = useAppStore((s) => s.featureSettings);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    const safe = resolveSafeSection(activeSection, featureSettings);
    if (safe !== activeSection) {
      setActiveSection(safe);
    }
  }, [activeSection, featureSettings]);

  const cycleSummary = useMemo(
    () =>
      computeBudgetCycleSummary({
        transactions,
        totalBudget,
        resetDay: budgetResetDay,
        rolloverEnabled: budgetRolloverEnabled,
      }),
    [transactions, totalBudget, budgetResetDay, budgetRolloverEnabled]
  );
  const effectiveBudget = cycleSummary.effectiveBudget;
  const totalSpent = cycleSummary.currentSpent;
  const remaining = cycleSummary.remainingBudget;

  const cartTotals = useMemo(() => calculateCartTotals(items), [items]);
  const hasCartItems = cartTotals.lineCount > 0;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeSection]);

  const handleNavigate = (section: AppSection, subTab?: string) => {
    const safeSection = resolveSafeSection(section, featureSettings);
    if (safeSection === 'shopping') {
      const target =
        subTab === 'baskets' && featureSettings.showShopBaskets ? 'baskets' : 'home';
      setShopInitialSection(target);
      setShopSectionSignal((n) => n + 1);
    }
    if (safeSection === 'insights') {
      if (subTab === 'radar' || subTab === 'prices' || subTab === 'penny') {
        setInsightsInitialTab(
          subTab === 'prices' && !featureSettings.showPriceTracker ? 'radar' : subTab
        );
      } else {
        setInsightsInitialTab('penny');
      }
      setInsightsTabSignal((n) => n + 1);
    }
    if (safeSection === 'wellness') {
      setWarRoomInitialTab(subTab === 'broke' ? 'broke' : 'overview');
      setWarRoomTabSignal((n) => n + 1);
    }
    if (safeSection === 'scanner') {
      if (subTab === 'comparator') {
        setScannerFocusTarget('comparator');
        setScannerFocusSignal((n) => n + 1);
      } else {
        setScannerFocusTarget(undefined);
      }
    }
    setActiveSection(safeSection);
  };

  return (
    <AppShell
      activeSection={activeSection}
      onSelectSection={(sec, subTab) => handleNavigate(sec, subTab)}
      totalBudget={effectiveBudget}
      totalSpent={totalSpent}
      remainingBudget={remaining}
      cartItemCount={cartTotals.lineCount}
      onOpenCart={() => setCartOpenSignal((n) => n + 1)}
      theme={theme}
      onToggleTheme={toggleTheme}
      featureSettings={featureSettings}
    >
      {activeSection === 'overview' && (
        <OverviewDashboard onNavigate={handleNavigate} />
      )}

      {activeSection === 'shopping' && (
        <QuickMartGrid
          initialSection={shopInitialSection}
          sectionSignal={shopSectionSignal}
          onOpenCart={() => setCartOpenSignal((n) => n + 1)}
          onOpenComparator={() => handleNavigate('scanner', 'comparator')}
        />
      )}

      {activeSection === 'insights' && featureSettings.showInsights && (
        <InsightsDashboard
          initialTab={insightsInitialTab}
          tabSignal={insightsTabSignal}
          onOpenExpenses={() => handleNavigate('expenses')}
          onOpenShopping={(sub) => handleNavigate('shopping', sub)}
          onOpenScanner={() => handleNavigate('scanner')}
          onOpenWellness={() => handleNavigate('wellness')}
        />
      )}

      {activeSection === 'expenses' && <ExpensesDashboard />}

      {activeSection === 'scanner' && featureSettings.showScanner && (
        <AuditPanel
          focusTarget={scannerFocusTarget}
          focusSignal={scannerFocusSignal}
          onOpenPriceTracker={() =>
            handleNavigate(
              featureSettings.showInsights ? 'insights' : 'overview',
              'prices'
            )
          }
        />
      )}

      {activeSection === 'wellness' && featureSettings.showWellness && (
        <SurvivalSandbox
          initialTab={warRoomInitialTab}
          tabSignal={warRoomTabSignal}
        />
      )}

      {(activeSection === 'shopping' || hasCartItems) && (
        <CartDrawer
          openSignal={cartOpenSignal}
          showFloatingBar={activeSection === 'shopping'}
        />
      )}

      {featureSettings.showPennyCompanion && (
        <PennyFloatingCompanion
          activeScreen={activeSection}
          hasCartBarVisible={activeSection === 'shopping' && hasCartItems}
          onNavigate={handleNavigate}
        />
      )}

      <CloudSyncConflictModal />
    </AppShell>
  );
}
