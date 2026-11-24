import { useMemo, useState } from 'react';
import {
  Plus,
  ScanLine,
  LineChart as LineChartIcon,
  X,
  ArrowRight,
  Receipt,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useAppStore } from '../../store/useStore';
import type { AppSection } from '../ui/AppShell';
import { SectionHeader } from '../ui/SectionHeader';
import { EmptyState } from '../ui/EmptyState';
import { SplitExpenseModal } from '../splits/SplitExpenseModal';
import { AetherBudgetHud } from './AetherBudgetHud';
import {
  formatCurrencyExact,
  getCategoryStyle,
} from '../../utils/categoryStyles';
import { getChartThemeTokens } from '../../utils/settingsEngine';
import { getEffectiveTransactionAmount } from '../../utils/martEngine';
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
  const categories = useAppStore((s) => s.categories);
  const categoryCaps = useAppStore((s) => s.categoryCaps);
  const items = useAppStore((s) => s.items);
  const priceObservations = useAppStore((s) => s.priceObservations);
  const theme = useAppStore((s) => s.theme);
  const visualTheme = useAppStore((s) => s.visualTheme);
  const featureSettings = useAppStore((s) => s.featureSettings);
  const isSampleDataLoaded = useAppStore((s) => s.isSampleDataLoaded);
  const loadSampleMonth = useAppStore((s) => s.loadSampleMonth);
  const clearWorkspaceData = useAppStore((s) => s.clearWorkspaceData);
  const chartTokens = useMemo(
    () => getChartThemeTokens(theme, visualTheme.mood),
    [theme, visualTheme.mood]
  );

  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [chartMode, setChartMode] = useState<'daily' | 'category'>('daily');

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

  // Real data engines for Spending Overview & Smart Insights
  const monthWindow = useMemo(() => resolveRadarWindow('this_month'), []);

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

  const smartInsights = useMemo(() => {
    const overview = computeRadarOverview({
      transactions,
      totalBudget,
      window: monthWindow,
    });
    const budgetMonitor = computeRadarBudgetMonitor({
      transactions,
      totalBudget,
      categories,
      categoryCaps,
    });
    const anomalies = detectUnusualSpending({
      transactions,
      window: monthWindow,
    });
    const radarInsights = generateRadarInsights({
      overview,
      categoriesResult,
      trendsResult: dailyTrendsResult,
      budgetResult: budgetMonitor,
      anomalies,
    });

    const priceSummaries = buildProductPriceSummaries(priceObservations, items);
    const priceCategories = computeCategoryPriceAnalytics(priceSummaries);
    const priceInsights = generatePriceInsights(priceSummaries, priceCategories);

    const combined: Array<{
      id: string;
      title: string;
      description: string;
      badge?: string;
      tone: 'positive' | 'warning' | 'neutral';
      targetSection: AppSection;
      targetSubTab?: string;
    }> = [];

    for (const r of radarInsights.slice(0, 2)) {
      combined.push({
        id: r.id,
        title: r.title,
        description: r.description,
        badge: r.metricLabel,
        tone:
          r.tone === 'positive'
            ? 'positive'
            : r.tone === 'caution'
              ? 'warning'
              : 'neutral',
        targetSection: 'insights',
        targetSubTab: 'radar',
      });
    }

    for (const p of priceInsights.slice(0, 1)) {
      combined.push({
        id: p.id,
        title: p.title,
        description: p.description,
        badge: p.metricBadge,
        tone:
          p.tone === 'positive'
            ? 'positive'
            : p.tone === 'warning'
              ? 'warning'
              : 'neutral',
        targetSection: 'insights',
        targetSubTab: 'prices',
      });
    }

    return combined.slice(0, 3);
  }, [
    transactions,
    totalBudget,
    monthWindow,
    categories,
    categoryCaps,
    categoriesResult,
    dailyTrendsResult,
    priceObservations,
    items,
  ]);

  const recentTransactions = useMemo(
    () =>
      [...transactions]
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .slice(0, 5),
    [transactions]
  );

  const recentDailyChartData = useMemo(() => {
    const pts = dailyTrendsResult.points;
    return pts.slice(-14).map((p) => ({
      label: p.label,
      fullLabel: p.fullLabel,
      spent: p.spent,
    }));
  }, [dailyTrendsResult.points]);

  const topCategoriesChartData = useMemo(
    () =>
      categoriesResult.categories
        .filter((c) => c.totalSpent > 0)
        .slice(0, 6)
        .map((c) => ({
          category:
            c.category.length > 14 ? `${c.category.slice(0, 13)}…` : c.category,
          fullCategory: c.category,
          spent: c.totalSpent,
          sharePct: c.sharePct,
        })),
    [categoriesResult.categories]
  );

  const hasChartData =
    activeTransactions.length > 0 &&
    (chartMode === 'daily'
      ? recentDailyChartData.some((d) => d.spent > 0)
      : topCategoriesChartData.length > 0);

  return (
    <div className="space-y-5">
      {/* Section A: Greeting & Date */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-[12.5px] font-medium text-[#697386]">
            {formattedDate}
          </p>
          <h1 className="text-[24px] sm:text-[28px] font-bold tracking-tight text-[#151922] mt-0.5">
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
              <Sparkles className="w-3.5 h-3.5 text-[#365FE8]" />
              <span>Try Sample Month</span>
            </button>
          ) : isSampleDataLoaded ? (
            <button
              type="button"
              onClick={clearWorkspaceData}
              data-testid="overview-clear-sample-btn"
              className="btn-secondary px-3 py-2 text-[12px]"
            >
              <X className="w-3.5 h-3.5 text-[#DE5252]" />
              <span>Sample Month · Clear</span>
            </button>
          ) : null}

          {featureSettings.showScanner && (
            <button
              type="button"
              onClick={() => onNavigate('scanner')}
              className="btn-secondary px-3.5 py-2 text-[12.5px]"
            >
              <ScanLine className="w-3.5 h-3.5 text-[#365FE8]" />
              <span>Scan Receipt</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setAddExpenseOpen(true)}
            className="btn-primary px-3.5 py-2 text-[12.5px]"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span>Add Expense</span>
          </button>
        </div>
      </header>

      {/* Section B: Project AETHER Financial HUD & 3D Energy Capsule */}
      <AetherBudgetHud />

      {/* Sections D & E: Spending Overview + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Section D: Spending Overview */}
        <section
          aria-label="Spending overview"
          className="lg:col-span-7 surface-card p-5 sm:p-6 space-y-5"
        >
          <SectionHeader
            title="Spending Overview"
            subtitle={
              chartMode === 'daily'
                ? 'Daily spending activity over the last 14 days'
                : 'Top spending categories this month'
            }
            action={
              <div className="inline-flex items-center p-1 rounded-xl bg-[#F1F3F6] border border-[#E7EAF0] tactile-well">
                <button
                  type="button"
                  onClick={() => setChartMode('daily')}
                  className={`px-3 py-1 rounded-lg text-[12px] font-semibold transition-colors ${
                    chartMode === 'daily'
                      ? 'bg-white text-[#151922] shadow-xs'
                      : 'text-[#697386] hover:text-[#151922]'
                  }`}
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('category')}
                  className={`px-3 py-1 rounded-lg text-[12px] font-semibold transition-colors ${
                    chartMode === 'category'
                      ? 'bg-white text-[#151922] shadow-xs'
                      : 'text-[#697386] hover:text-[#151922]'
                  }`}
                >
                  Category
                </button>
              </div>
            }
          />

          {!hasChartData ? (
            <EmptyState
              compact
              icon={LineChartIcon}
              title="No spending activity yet"
              description="Log an expense, scan a receipt, or check out from Shopping to visualize your spending trends."
              action={
                <button
                  type="button"
                  onClick={() => setAddExpenseOpen(true)}
                  className="btn-primary px-4 py-2 text-[13px]"
                >
                  Add First Expense
                </button>
              }
            />
          ) : (
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartMode === 'daily' ? (
                  <BarChart
                    data={recentDailyChartData}
                    margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke={chartTokens.gridStroke}
                    />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: chartTokens.tickColor, fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: chartTokens.tickColor, fontSize: 11 }}
                      tickFormatter={(v) => `₹${v}`}
                    />
                    <Tooltip
                      cursor={{ fill: chartTokens.cursorFill }}
                      contentStyle={chartTokens.tooltipStyle}
                      formatter={(val) => [
                        `₹${formatCurrencyExact(Number(val))}`,
                        'Spent',
                      ]}
                    />
                    <Bar dataKey="spent" radius={[6, 6, 0, 0]} maxBarSize={32}>
                      {recentDailyChartData.map((entry, idx) => (
                        <Cell
                          key={entry.label + idx}
                          fill={entry.spent > 0 ? chartTokens.accent : chartTokens.mutedBarFill}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <BarChart
                    data={topCategoriesChartData}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke={chartTokens.gridStroke}
                    />
                    <XAxis
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: chartTokens.tickColor, fontSize: 11 }}
                      tickFormatter={(v) => `₹${v}`}
                    />
                    <YAxis
                      type="category"
                      dataKey="category"
                      width={110}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: chartTokens.tickColor, fontSize: 11.5 }}
                    />
                    <Tooltip
                      cursor={{ fill: chartTokens.cursorFill }}
                      contentStyle={chartTokens.tooltipStyle}
                      formatter={(val) => [
                        `₹${formatCurrencyExact(Number(val))}`,
                        'Spent',
                      ]}
                    />
                    <Bar
                      dataKey="spent"
                      fill={chartTokens.accent}
                      radius={[0, 6, 6, 0]}
                      maxBarSize={24}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Section E: Recent Activity */}
        <section
          aria-label="Recent activity"
          className="lg:col-span-5 surface-card p-5 sm:p-6 space-y-4"
        >
          <SectionHeader
            title="Recent Activity"
            subtitle="Latest recorded expenses"
            action={
              <button
                type="button"
                onClick={() => onNavigate('expenses')}
                className="text-[12.5px] font-semibold text-[#365FE8] hover:text-[#294FCC] flex items-center gap-1 transition-colors"
              >
                View all
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            }
          />

          {recentTransactions.length === 0 ? (
            <EmptyState
              compact
              icon={Receipt}
              title="No recent transactions"
              description="Your recent cart checkouts, scanned receipts, and manual expenses will show up here."
              action={
                <button
                  type="button"
                  onClick={() => onNavigate('shopping')}
                  className="btn-secondary px-4 py-2 text-[13px]"
                >
                  Open Shopping
                </button>
              }
            />
          ) : (
            <div className="divide-y divide-[#E7EAF0]">
              {recentTransactions.map((tx) => {
                const catStyle = getCategoryStyle(tx.category);
                const effectiveAmt = getEffectiveTransactionAmount(tx);
                const isInactive =
                  tx.status === 'cancelled' || tx.status === 'refunded';
                return (
                  <div
                    key={tx.id}
                    className="py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${catStyle.dot}`}
                      />
                      <div className="min-w-0">
                        <p
                          className={`text-[13.5px] font-semibold truncate ${
                            isInactive
                              ? 'line-through text-[#929BAB]'
                              : 'text-[#151922]'
                          }`}
                        >
                          {tx.name}
                        </p>
                        <p className="text-[12px] text-[#697386] truncate">
                          {tx.category} ·{' '}
                          {new Date(tx.timestamp).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                          {tx.status && tx.status !== 'active'
                            ? ` · ${tx.status}`
                            : ''}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[13.5px] font-bold font-mono tabular-nums shrink-0 ${
                        isInactive
                          ? 'line-through text-[#929BAB]'
                          : 'text-[#151922]'
                      }`}
                    >
                      -₹{formatCurrencyExact(isInactive ? tx.amount : effectiveAmt)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Section F: Smart Insights */}
      {featureSettings.showSmartInsightsOnOverview && (
        <section aria-label="Smart insights" className="surface-card p-5 sm:p-6 space-y-4">
          <SectionHeader
            title="Smart Insights"
            subtitle="Live signals derived directly from your spending and price history"
            action={
              featureSettings.showInsights ? (
                <button
                  type="button"
                  onClick={() => onNavigate('insights', 'radar')}
                  className="text-[12.5px] font-semibold text-[#365FE8] hover:text-[#294FCC] flex items-center gap-1 transition-colors whitespace-nowrap"
                >
                  Open Radar
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : undefined
            }
          />

          {smartInsights.length === 0 ? (
            <div className="pt-2 border-t border-[#E7EAF0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#EDF2FF] text-[#365FE8] flex items-center justify-center shrink-0">
                  <Sparkles className="w-[18px] h-[18px]" />
                </div>
                <div>
                  <p className="text-[13.5px] font-semibold text-[#151922]">
                    Insights unlock as you record activity
                  </p>
                  <p className="text-[12.5px] text-[#697386] mt-0.5">
                    Log expenses or scan a receipt to see category trends, budget pace, and item price changes.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddExpenseOpen(true)}
                className="btn-primary px-3.5 py-2 text-[12.5px] shrink-0 self-start sm:self-auto"
              >
                Add Expense
              </button>
            </div>
          ) : (
            <div className="border-t border-[#E7EAF0] grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#E7EAF0]">
              {smartInsights.map((insight, idx) => {
                const Icon =
                  insight.tone === 'positive'
                    ? TrendingDown
                    : insight.tone === 'warning'
                      ? AlertTriangle
                      : Info;
                const toneColor =
                  insight.tone === 'positive'
                    ? 'text-[#0D5E43]'
                    : insight.tone === 'warning'
                      ? 'text-[#9E6614]'
                      : 'text-[#365FE8]';

                return (
                  <button
                    key={insight.id}
                    type="button"
                    onClick={() =>
                      onNavigate(
                        featureSettings.showInsights ? insight.targetSection : 'expenses',
                        insight.targetSubTab
                      )
                    }
                    className={`text-left py-4 md:py-4 flex flex-col justify-between gap-2.5 group transition-colors ${
                      idx === 0
                        ? 'md:pr-5'
                        : idx === smartInsights.length - 1
                          ? 'md:pl-5'
                          : 'md:px-5'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-semibold ${toneColor}`}>
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {insight.tone === 'positive'
                              ? 'Savings signal'
                              : insight.tone === 'warning'
                                ? 'Price / spend alert'
                                : 'Spend signal'}
                          </span>
                        </span>
                        {insight.badge && (
                          <span
                            className={`text-[12px] font-bold font-mono tabular-nums ${toneColor}`}
                          >
                            {insight.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[13.5px] font-semibold text-[#151922] group-hover:text-[#365FE8] transition-colors leading-snug">
                        {insight.title}
                      </p>
                      <p className="text-[12.5px] text-[#697386] leading-relaxed line-clamp-2">
                        {insight.description}
                      </p>
                    </div>
                    <span className="text-[12px] font-semibold text-[#365FE8] inline-flex items-center gap-1 pt-0.5">
                      Explore details
                      <TrendingUp className="w-3.5 h-3.5" />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
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
