import { useMemo, useState } from 'react';
import {
  FileText,
  GitCompare,
  LayoutDashboard,
  PieChart,
  Target,
} from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import {
  computeCategoryAnalytics,
  computePeriodComparison,
  computeRadarBudgetMonitor,
  computeRadarOverview,
  computeSpendingTrends,
  detectUnusualSpending,
  generateRadarInsights,
  resolveRadarWindow,
  type RadarComparisonPreset,
  type RadarTimeframePreset,
  type TrendGranularity,
} from '../../utils/radarEngine';
import { RadarBudgetAnomaliesTab } from '../radar/RadarBudgetAnomaliesTab';
import { RadarCategoriesTab } from '../radar/RadarCategoriesTab';
import { RadarExplorerReportsTab } from '../radar/RadarExplorerReportsTab';
import { RadarOverviewTab, type RadarTabSection } from '../radar/RadarOverviewTab';
import { RadarTrendsCompareTab } from '../radar/RadarTrendsCompareTab';

const TIMEFRAME_OPTIONS: Array<{ id: RadarTimeframePreset; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'last_3m', label: 'Last 3M' },
  { id: 'last_6m', label: 'Last 6M' },
  { id: 'this_year', label: 'This Year' },
  { id: 'custom', label: 'Custom' },
];

function toInputDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function RadarDashboard({
  onOpenLedger,
}: {
  onOpenLedger?: () => void;
}) {
  const transactions = useAppStore((s) => s.transactions);
  const totalBudget = useAppStore((s) => s.totalBudget);
  const categories = useAppStore((s) => s.categories);
  const categoryCaps = useAppStore((s) => s.categoryCaps);

  const [section, setSection] = useState<RadarTabSection>('overview');
  const [timeframe, setTimeframe] = useState<RadarTimeframePreset>('this_month');
  const [customStart, setCustomStart] = useState(() => {
    const now = new Date();
    return toInputDate(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [customEnd, setCustomEnd] = useState(() => toInputDate(new Date()));

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [explorerCategory, setExplorerCategory] = useState<string>('all');
  const [granularity, setGranularity] = useState<TrendGranularity>('daily');
  const [comparisonPreset, setComparisonPreset] =
    useState<RadarComparisonPreset>('month_over_month');

  const radarWindow = useMemo(
    () => resolveRadarWindow(timeframe, customStart, customEnd),
    [timeframe, customStart, customEnd]
  );

  const overview = useMemo(
    () =>
      computeRadarOverview({
        transactions,
        totalBudget,
        window: radarWindow,
      }),
    [transactions, totalBudget, radarWindow]
  );

  const categoriesResult = useMemo(
    () =>
      computeCategoryAnalytics({
        transactions,
        categories,
        categoryCaps,
        window: radarWindow,
      }),
    [transactions, categories, categoryCaps, radarWindow]
  );

  const trendsResult = useMemo(
    () =>
      computeSpendingTrends({
        transactions,
        granularity,
        window: radarWindow,
      }),
    [transactions, granularity, radarWindow]
  );

  const comparisonResult = useMemo(
    () =>
      computePeriodComparison({
        transactions,
        preset: comparisonPreset,
        selectedWindow: radarWindow,
      }),
    [transactions, comparisonPreset, radarWindow]
  );

  const budgetResult = useMemo(
    () =>
      computeRadarBudgetMonitor({
        transactions,
        totalBudget,
        categories,
        categoryCaps,
      }),
    [transactions, totalBudget, categories, categoryCaps]
  );

  const anomalies = useMemo(
    () =>
      detectUnusualSpending({
        transactions,
        window: radarWindow,
      }),
    [transactions, radarWindow]
  );

  const insights = useMemo(
    () =>
      generateRadarInsights({
        overview,
        categoriesResult,
        trendsResult,
        budgetResult,
        anomalies,
      }),
    [overview, categoriesResult, trendsResult, budgetResult, anomalies]
  );

  const handleOpenCategoryInExplorer = (cat: string) => {
    setExplorerCategory(cat);
    setSection('explorer');
  };

  return (
    <div className="space-y-4">
      {/* Unified Flat Radar Controls & Section Tabs */}
      <div className="flex flex-col gap-2.5">
        {/* Row 1: Radar Room Navigation Tabs */}
        <div
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5"
          role="tablist"
          aria-label="Radar Room analytics sections"
        >
          {(
            [
              { id: 'overview', label: 'Overview', icon: LayoutDashboard },
              { id: 'categories', label: 'Categories', icon: PieChart },
              { id: 'trends', label: 'Trends & Compare', icon: GitCompare },
              {
                id: 'budgets',
                label: 'Budgets & Alerts',
                icon: Target,
                badge: anomalies.length > 0 ? anomalies.length : undefined,
              },
              { id: 'explorer', label: 'Transactions & Reports', icon: FileText },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = section === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSection(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-xl text-[12.5px] font-semibold whitespace-nowrap shrink-0 transition-colors border ${
                  active
                    ? 'bg-[var(--accent-primary-soft)] text-[var(--accent-ink)] border-[var(--accent-border)]'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-subtle)]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={2.2} />
                <span>{tab.label}</span>
                {'badge' in tab && tab.badge !== undefined && (
                  <span className="ml-0.5 font-mono tabular-nums text-[11px] px-1.5 rounded bg-[var(--accent-warning-soft)] text-[var(--accent-warning-ink)] border border-[var(--accent-warning-border)]">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Row 2: Timeframe Filter Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div
            className="tactile-well flex items-center gap-1 overflow-x-auto no-scrollbar bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-xl p-1 max-w-full"
            role="group"
            aria-label="Radar Room timeframe selector"
          >
            {TIMEFRAME_OPTIONS.map((opt) => {
              const active = timeframe === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTimeframe(opt.id)}
                  aria-pressed={active}
                  className={`px-2.5 py-1 rounded-lg text-[12px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    active
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {timeframe === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 text-xs bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 w-fit">
            <label className="flex items-center gap-2 text-[var(--text-secondary)] font-medium">
              <span>From</span>
              <input
                type="date"
                aria-label="Radar custom start date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="input-field px-2.5 py-1 text-xs"
              />
            </label>
            <label className="flex items-center gap-2 text-[var(--text-secondary)] font-medium">
              <span>To</span>
              <input
                type="date"
                aria-label="Radar custom end date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="input-field px-2.5 py-1 text-xs"
              />
            </label>
          </div>
        )}
      </div>

      {/* Section Body */}
      {section === 'overview' && (
        <RadarOverviewTab
          overview={overview}
          categoriesResult={categoriesResult}
          anomalies={anomalies}
          insights={insights}
          onNavigateSection={setSection}
          onInspectCategory={setSelectedCategory}
        />
      )}

      {section === 'categories' && (
        <RadarCategoriesTab
          categoriesResult={categoriesResult}
          window={radarWindow}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          onOpenTxInExplorer={handleOpenCategoryInExplorer}
        />
      )}

      {section === 'trends' && (
        <RadarTrendsCompareTab
          window={radarWindow}
          granularity={granularity}
          onChangeGranularity={setGranularity}
          trendsResult={trendsResult}
          comparisonPreset={comparisonPreset}
          onChangeComparisonPreset={setComparisonPreset}
          comparisonResult={comparisonResult}
        />
      )}

      {section === 'budgets' && (
        <RadarBudgetAnomaliesTab
          budgetResult={budgetResult}
          anomalies={anomalies}
          insights={insights}
        />
      )}

      {section === 'explorer' && (
        <RadarExplorerReportsTab
          key={explorerCategory}
          initialCategoryFilter={explorerCategory}
          onOpenLedger={onOpenLedger}
        />
      )}
    </div>
  );
}
