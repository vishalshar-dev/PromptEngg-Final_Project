import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Plus,
  ScanLine,
  Sparkles,
  X,
} from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import type { AppSection } from '../ui/AppShell';
import { SplitExpenseModal } from '../splits/SplitExpenseModal';
import { PennyEmblem } from '../penny/PennyEmblem';
import { formatCurrencyExact } from '../../utils/categoryStyles';
import { getChartThemeTokens } from '../../utils/settingsEngine';
import {
  computeCategoryAnalytics,
  computeRadarBudgetMonitor,
  computeRadarOverview,
  computeSpendingTrends,
  detectUnusualSpending,
  generateRadarInsights,
  resolveRadarWindow,
} from '../../utils/radarEngine';
import {
  buildProductPriceSummaries,
  computeCategoryPriceAnalytics,
  generatePriceInsights,
} from '../../utils/priceTrackerEngine';
import { computeLedgerState } from '../../utils/splitLedgerEngine';
import {
  computeBrokeModeStatus,
  evaluateCategoryLimits,
  generateSmartAlerts,
} from '../../utils/warRoomEngine';
import { computeUpcomingCommitments } from '../../utils/pennyEngine';
import { AetherBudgetHud } from './AetherBudgetHud';
import { deriveCapsuleBudgetState } from './capsule/capsuleBudgetState';
import { deriveAetherIntelligence } from './capsule/aetherIntelligence';
import { OverviewAnalyticsSection } from './OverviewAnalyticsSection';
import { OverviewAttentionSection } from './OverviewAttentionSection';

interface OverviewDashboardProps {
  onNavigate: (section: AppSection, subTab?: string) => void;
}

function getGreeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function OverviewDashboard({ onNavigate }: OverviewDashboardProps) {
  const transactions = useAppStore((s) => s.transactions);
  const totalBudget = useAppStore((s) => s.totalBudget);
  const budgetResetDay = useAppStore((s) => s.budgetResetDay);
  const budgetRolloverEnabled = useAppStore((s) => s.budgetRolloverEnabled);
  const categories = useAppStore((s) => s.categories);
  const categoryCaps = useAppStore((s) => s.categoryCaps);
  const categoryLimits = useAppStore((s) => s.categoryLimits);
  const brokeModeConfig = useAppStore((s) => s.brokeModeConfig);
  const dismissedWarRoomAlerts = useAppStore((s) => s.dismissedWarRoomAlerts);
  const items = useAppStore((s) => s.items);
  const people = useAppStore((s) => s.people);
  const sharedExpenses = useAppStore((s) => s.sharedExpenses);
  const settlements = useAppStore((s) => s.settlements);
  const priceObservations = useAppStore((s) => s.priceObservations);
  const theme = useAppStore((s) => s.theme);
  const visualTheme = useAppStore((s) => s.visualTheme);
  const featureSettings = useAppStore((s) => s.featureSettings);
  const isSampleDataLoaded = useAppStore((s) => s.isSampleDataLoaded);
  const loadSampleMonth = useAppStore((s) => s.loadSampleMonth);
  const clearWorkspaceData = useAppStore((s) => s.clearWorkspaceData);
  const setPennyOpen = useAppStore((s) => s.setPennyOpen);

  const chartTokens = useMemo(
    () => getChartThemeTokens(theme, visualTheme.mood),
    [theme, visualTheme.mood]
  );

  const [addExpenseOpen, setAddExpenseOpen] = useState(false);

  const now = new Date();
  const greeting = getGreeting(now.getHours());
  const formattedDate = now.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const activeTransactions = useMemo(
    () => transactions.filter((tx) => tx.status !== 'cancelled'),
    [transactions]
  );

  const monthWindow = useMemo(() => resolveRadarWindow('this_month'), []);

  const radarOverview = useMemo(
    () =>
      computeRadarOverview({
        transactions,
        totalBudget,
        window: monthWindow,
      }),
    [transactions, totalBudget, monthWindow]
  );

  const categoriesResult = useMemo(
    () =>
      computeCategoryAnalytics({
        transactions,
        categories,
        categoryCaps,
        window: monthWindow,
      }),
    [transactions, categories, categoryCaps, monthWindow]
  );

  const dailyTrendsResult = useMemo(
    () =>
      computeSpendingTrends({
        transactions,
        granularity: 'daily',
        window: monthWindow,
      }),
    [transactions, monthWindow]
  );

  const weeklyTrendsResult = useMemo(
    () =>
      computeSpendingTrends({
        transactions,
        granularity: 'weekly',
        window: monthWindow,
      }),
    [transactions, monthWindow]
  );

  const budgetState = useMemo(
    () =>
      deriveCapsuleBudgetState({
        transactions,
        totalBudget,
        budgetResetDay,
        budgetRolloverEnabled,
      }),
    [transactions, totalBudget, budgetResetDay, budgetRolloverEnabled]
  );

  const aetherIntelligence = useMemo(
    () =>
      deriveAetherIntelligence({
        budgetState,
        transactions,
        categoryLimits,
        categoryCaps,
      }),
    [budgetState, transactions, categoryLimits, categoryCaps]
  );

  const anomalies = useMemo(
    () =>
      detectUnusualSpending({
        transactions,
        window: monthWindow,
      }),
    [transactions, monthWindow]
  );

  const budgetMonitor = useMemo(
    () =>
      computeRadarBudgetMonitor({
        transactions,
        totalBudget,
        categories,
        categoryCaps,
      }),
    [transactions, totalBudget, categories, categoryCaps]
  );

  const radarInsights = useMemo(
    () =>
      generateRadarInsights({
        overview: radarOverview,
        categoriesResult,
        trendsResult: dailyTrendsResult,
        budgetResult: budgetMonitor,
        anomalies,
      }),
    [radarOverview, categoriesResult, dailyTrendsResult, budgetMonitor, anomalies]
  );

  const priceInsights = useMemo(() => {
    const priceSummaries = buildProductPriceSummaries(priceObservations, items);
    const priceCategories = computeCategoryPriceAnalytics(priceSummaries);
    return generatePriceInsights(priceSummaries, priceCategories);
  }, [priceObservations, items]);

  const smartAlerts = useMemo(() => {
    const evaluatedLimits = evaluateCategoryLimits(categoryLimits, transactions);
    const brokeModeStatus = computeBrokeModeStatus(transactions, brokeModeConfig);
    return generateSmartAlerts({
      transactions,
      evaluatedLimits,
      brokeModeStatus,
      totalBudget,
      dismissedSignatures: dismissedWarRoomAlerts,
    }).activeAlerts;
  }, [categoryLimits, transactions, brokeModeConfig, totalBudget, dismissedWarRoomAlerts]);

  const ledgerDashboard = useMemo(
    () => computeLedgerState(people, sharedExpenses, settlements).dashboard,
    [people, sharedExpenses, settlements]
  );

  const commitmentsSummary = useMemo(
    () =>
      computeUpcomingCommitments({
        items,
        people,
        sharedExpenses,
        settlements,
        transactions,
        totalBudget,
      }),
    [items, people, sharedExpenses, settlements, transactions, totalBudget]
  );

  const recentTransactions = useMemo(
    () =>
      [...transactions]
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .slice(0, 6),
    [transactions]
  );

  return (
    <div className="space-y-5">
      {/* Header: Command Center Greeting, Cycle Context & Primary Actions */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-[12.5px] font-medium text-[var(--text-secondary)]">
            {formattedDate}
            {budgetState.cycleLabel ? ` · Cycle ${budgetState.cycleLabel}` : ''}
          </p>
          <h1 className="text-[26px] sm:text-[30px] font-bold font-display tracking-tight text-[var(--text-primary)] mt-0.5 leading-tight">
            {greeting}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {transactions.length === 0 ? (
            <button
              type="button"
              onClick={loadSampleMonth}
              data-testid="overview-load-sample-btn"
              className="btn-secondary px-3.5 py-2 text-[12.5px]"
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent-ink)]" />
              <span>Try Sample Month</span>
            </button>
          ) : isSampleDataLoaded ? (
            <button
              type="button"
              onClick={clearWorkspaceData}
              data-testid="overview-clear-sample-btn"
              className="btn-secondary px-3 py-2 text-[12.5px]"
            >
              <X className="w-3.5 h-3.5 text-[var(--accent-danger-ink)]" />
              <span>Sample Month · Clear</span>
            </button>
          ) : null}

          {featureSettings.showPennyCompanion && (
            <button
              type="button"
              onClick={() => setPennyOpen(true)}
              data-testid="overview-penny-header-btn"
              className="btn-secondary px-3.5 py-2 text-[12.5px]"
            >
              <PennyEmblem size="xs" variant="subtle" />
              <span>Ask Penny</span>
            </button>
          )}

          {featureSettings.showScanner && (
            <button
              type="button"
              onClick={() => onNavigate('scanner')}
              className="btn-secondary px-3.5 py-2 text-[12.5px]"
            >
              <ScanLine className="w-3.5 h-3.5 text-[var(--accent-ink)]" />
              <span>Scan Receipt</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setAddExpenseOpen(true)}
            data-testid="overview-add-expense-btn"
            className="btn-primary px-4 py-2 text-[12.5px]"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.4} />
            <span>Add Expense</span>
          </button>
        </div>
      </header>

      {/* Sections 1, 2 & 3: Flagship Financial Hero + Dedicated AETHER Showcase + Budget Trajectory */}
      <AetherBudgetHud onNavigate={onNavigate} />

      {/* Section 4: Spending Analytics + Category Intelligence */}
      <OverviewAnalyticsSection
        activeTransactionCount={activeTransactions.length}
        dailyTrendsResult={dailyTrendsResult}
        weeklyTrendsResult={weeklyTrendsResult}
        categoriesResult={categoriesResult}
        radarOverview={radarOverview}
        chartTokens={chartTokens}
        showInsightsFeature={featureSettings.showInsights}
        onAddExpense={() => setAddExpenseOpen(true)}
        onNavigate={onNavigate}
      />

      {/* Section 5: Financial Attention Center + Upcoming Commitments (when real) + Recent Activity */}
      <OverviewAttentionSection
        showAttentionCenter={featureSettings.showSmartInsightsOnOverview}
        showInsightsFeature={featureSettings.showInsights}
        smartAlerts={smartAlerts}
        radarInsights={radarInsights}
        priceInsights={priceInsights}
        anomalies={anomalies}
        ledgerDashboard={ledgerDashboard}
        commitmentsSummary={commitmentsSummary}
        recentTransactions={recentTransactions}
        highlightCategory={aetherIntelligence.categoryAttention?.category}
        onAddExpense={() => setAddExpenseOpen(true)}
        onNavigate={onNavigate}
      />

      {/* Section 6: Contextual Penny AI Co-Pilot Strip */}
      {featureSettings.showPennyCompanion && (
        <section
          aria-label="Penny financial co-pilot"
          data-testid="overview-penny-strip"
          className="surface-card px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <PennyEmblem size="md" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-[14.5px] font-bold font-display tracking-tight text-[var(--text-primary)]">
                  Penny Co-Pilot
                </h2>
                <span className="text-[11.5px] font-mono text-[var(--text-muted)]">
                  ⌘K
                </span>
              </div>
              <p className="text-[12.5px] text-[var(--text-secondary)] mt-0.5 truncate">
                {totalBudget > 0 && commitmentsSummary.committedUpcoming30d > 0
                  ? `Safe-to-spend after upcoming bills & splits: ₹${formatCurrencyExact(commitmentsSummary.trueSafeToSpend)} (${commitmentsSummary.remainingDaysInMonth}d left).`
                  : 'Ask Penny to break down spending categories, log expenses quickly, or audit recurring prices.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setPennyOpen(true)}
              className="btn-primary px-4 py-2 text-[12.5px]"
            >
              <span>Ask Penny</span>
            </button>
            {featureSettings.showInsights && (
              <button
                type="button"
                onClick={() => onNavigate('insights', 'penny')}
                className="btn-secondary px-3.5 py-2 text-[12.5px]"
              >
                <span>Open Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </section>
      )}

      <SplitExpenseModal
        isOpen={addExpenseOpen}
        onClose={() => setAddExpenseOpen(false)}
        mode="create"
        defaultSplitEnabled={false}
      />
    </div>
  );
}
