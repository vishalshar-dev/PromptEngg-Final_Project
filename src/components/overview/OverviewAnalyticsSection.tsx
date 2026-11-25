import { useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  LineChart as LineChartIcon,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AppSection } from '../ui/AppShell';
import { SectionHeader } from '../ui/SectionHeader';
import { EmptyState } from '../ui/EmptyState';
import { ProgressBar } from '../ui/ProgressBar';
import {
  formatCurrency,
  formatCurrencyExact,
  getCategoryStyle,
} from '../../utils/categoryStyles';
import type { ChartThemeTokens } from '../../utils/settingsEngine';
import type {
  RadarCategoryAnalyticsResult,
  RadarOverviewMetrics,
  RadarSpendingTrendsResult,
} from '../../utils/radarEngine';

interface OverviewAnalyticsSectionProps {
  activeTransactionCount: number;
  dailyTrendsResult: RadarSpendingTrendsResult;
  weeklyTrendsResult: RadarSpendingTrendsResult;
  categoriesResult: RadarCategoryAnalyticsResult;
  radarOverview: RadarOverviewMetrics;
  chartTokens: ChartThemeTokens;
  showInsightsFeature: boolean;
  onAddExpense: () => void;
  onNavigate: (section: AppSection, subTab?: string) => void;
}

export function OverviewAnalyticsSection({
  activeTransactionCount,
  dailyTrendsResult,
  weeklyTrendsResult,
  categoriesResult,
  radarOverview,
  chartTokens,
  showInsightsFeature,
  onAddExpense,
  onNavigate,
}: OverviewAnalyticsSectionProps) {
  const [chartMode, setChartMode] = useState<'daily' | 'weekly' | 'category'>('daily');
  const [dailyRange, setDailyRange] = useState<'14d' | 'month'>('14d');

  const dailyChartData = useMemo(() => {
    const pts = dailyTrendsResult.points;
    const sliced = dailyRange === '14d' ? pts.slice(-14) : pts;
    return sliced.map((p) => ({
      label: p.label,
      fullLabel: p.fullLabel,
      spent: p.spent,
      txCount: p.txCount,
    }));
  }, [dailyTrendsResult.points, dailyRange]);

  const weeklyChartData = useMemo(
    () =>
      weeklyTrendsResult.points.map((p) => ({
        label: p.label,
        fullLabel: p.fullLabel,
        spent: p.spent,
        txCount: p.txCount,
      })),
    [weeklyTrendsResult.points]
  );

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

  const rankedCategories = useMemo(
    () =>
      categoriesResult.categories
        .filter((c) => c.totalSpent > 0)
        .slice(0, 5),
    [categoriesResult.categories]
  );

  const maxCategorySpend = rankedCategories[0]?.totalSpent ?? 0;

  const hasChartData =
    activeTransactionCount > 0 &&
    (chartMode === 'daily'
      ? dailyChartData.some((d) => d.spent > 0)
      : chartMode === 'weekly'
        ? weeklyChartData.some((d) => d.spent > 0)
        : topCategoriesChartData.length > 0);

  const formatCompactAxisInr = (value: number) => {
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${Math.round(value / 1000)}k`;
    return `₹${value}`;
  };

  const chartSubtitle =
    chartMode === 'daily'
      ? dailyRange === '14d'
        ? 'Daily expenditure over the last 14 days'
        : `Daily expenditure across ${radarOverview.window.label}`
      : chartMode === 'weekly'
        ? `Weekly spending trajectory · ${radarOverview.window.label}`
        : `Top spending categories · ${radarOverview.window.label}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
      {/* Spending Analytics Chart Card (7 cols) */}
      <section
        aria-label="Spending overview"
        data-testid="overview-spending-analytics"
        className="lg:col-span-7 surface-card p-5 sm:p-6 flex flex-col gap-4 overflow-hidden"
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[16px] font-semibold font-display tracking-tight text-[var(--text-primary)] leading-snug">
                Spending Analytics
              </h2>
              <p className="text-[12.5px] text-[var(--text-secondary)] mt-0.5 leading-snug">
                {chartSubtitle}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {chartMode === 'daily' && dailyTrendsResult.points.length > 14 && (
                <div className="inline-flex items-center p-0.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] tactile-well">
                  <button
                    type="button"
                    onClick={() => setDailyRange('14d')}
                    className={`px-2.5 py-1 rounded-md text-[11.5px] font-semibold whitespace-nowrap transition-colors ${
                      dailyRange === '14d'
                        ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    14D
                  </button>
                  <button
                    type="button"
                    onClick={() => setDailyRange('month')}
                    className={`px-2.5 py-1 rounded-md text-[11.5px] font-semibold whitespace-nowrap transition-colors ${
                      dailyRange === 'month'
                        ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Month
                  </button>
                </div>
              )}

              <div className="inline-flex items-center p-1 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] tactile-well">
                <button
                  type="button"
                  onClick={() => setChartMode('daily')}
                  className={`px-2.5 sm:px-3 py-1 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-colors ${
                    chartMode === 'daily'
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('weekly')}
                  className={`px-2.5 sm:px-3 py-1 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-colors ${
                    chartMode === 'weekly'
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('category')}
                  className={`px-2.5 sm:px-3 py-1 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-colors ${
                    chartMode === 'category'
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Category
                </button>
              </div>
            </div>
          </div>

          {/* Compact Real Analytical KPI Ribbon */}
          {hasChartData && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2.5 px-3.5 py-2.5 rounded-xl bg-[var(--bg-subtle)]/75 border border-[var(--border-subtle)]">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-[var(--text-secondary)] truncate">
                  Avg daily spend
                </p>
                <p className="text-[14px] font-bold font-mono tabular-nums text-[var(--text-primary)] mt-0.5 truncate">
                  ₹{formatCurrencyExact(radarOverview.avgDailySpend)}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                  Across {radarOverview.window.elapsedDays}d in cycle
                </p>
              </div>
              <div className="min-w-0 pl-3 border-l border-[var(--border-subtle)]">
                <p className="text-[11px] font-medium text-[var(--text-secondary)] truncate">
                  Peak day
                </p>
                <p className="text-[14px] font-bold font-mono tabular-nums text-[var(--text-primary)] mt-0.5 truncate">
                  {dailyTrendsResult.highestSpendingDay
                    ? `₹${formatCurrency(dailyTrendsResult.highestSpendingDay.amount)}`
                    : '—'}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                  {dailyTrendsResult.highestSpendingDay
                    ? `${dailyTrendsResult.highestSpendingDay.label} · ${dailyTrendsResult.highestSpendingDay.txCount} tx`
                    : 'No spend recorded'}
                </p>
              </div>
              <div className="col-span-2 sm:col-span-1 min-w-0 pt-2 sm:pt-0 border-t sm:border-t-0 sm:pl-3 sm:border-l border-[var(--border-subtle)]">
                <p className="text-[11px] font-medium text-[var(--text-secondary)] truncate">
                  {radarOverview.spendDeltaPct !== null ? 'Vs prior period' : 'Avg ticket'}
                </p>
                {radarOverview.spendDeltaPct !== null ? (
                  <>
                    <p
                      className={`text-[14px] font-bold font-mono tabular-nums mt-0.5 inline-flex items-center gap-1 ${
                        radarOverview.spendDeltaPct > 10
                          ? 'text-[var(--accent-warning-ink)]'
                          : radarOverview.spendDeltaPct < 0
                            ? 'text-[var(--accent-success-ink)]'
                            : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {radarOverview.spendDeltaPct > 0 ? (
                        <TrendingUp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      ) : radarOverview.spendDeltaPct < 0 ? (
                        <TrendingDown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      ) : null}
                      <span>
                        {radarOverview.spendDeltaPct > 0 ? '+' : ''}
                        {radarOverview.spendDeltaPct}%
                      </span>
                    </p>
                    <p className="text-[11px] font-mono tabular-nums text-[var(--text-muted)] truncate mt-0.5">
                      vs ₹{formatCurrency(radarOverview.prevTotalSpent)} prior
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[14px] font-bold font-mono tabular-nums text-[var(--text-primary)] mt-0.5 truncate">
                      ₹{formatCurrency(radarOverview.avgTxValue)}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                      {radarOverview.txCount} transaction{radarOverview.txCount === 1 ? '' : 's'}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {!hasChartData ? (
          <EmptyState
            compact
            icon={LineChartIcon}
            title="No spending activity yet"
            description="Log an expense, scan a receipt, or check out from Shopping to visualize your spending trends."
            action={
              <button
                type="button"
                onClick={onAddExpense}
                className="btn-primary px-4 py-2 text-[13px]"
              >
                Add First Expense
              </button>
            }
          />
        ) : (
          <div className="flex-1 min-h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'daily' ? (
                <BarChart
                  data={dailyChartData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
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
                    tick={{ fill: chartTokens.tickColor, fontSize: 11.5 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    width={52}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: chartTokens.tickColor, fontSize: 11.5 }}
                    tickFormatter={formatCompactAxisInr}
                  />
                  <Tooltip
                    cursor={{ fill: chartTokens.cursorFill }}
                    contentStyle={chartTokens.tooltipStyle}
                    labelFormatter={(_, payload) =>
                      String(payload?.[0]?.payload?.fullLabel ?? '')
                    }
                    formatter={(val) => [
                      `₹${formatCurrencyExact(Number(val))}`,
                      'Spent',
                    ]}
                  />
                  <Bar dataKey="spent" radius={[6, 6, 0, 0]} maxBarSize={32} isAnimationActive={false}>
                    {dailyChartData.map((entry, idx) => (
                      <Cell
                        key={entry.label + idx}
                        fill={
                          entry.spent > 0
                            ? chartTokens.accent
                            : chartTokens.mutedBarFill
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              ) : chartMode === 'weekly' ? (
                <BarChart
                  data={weeklyChartData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
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
                    tick={{ fill: chartTokens.tickColor, fontSize: 11.5 }}
                  />
                  <YAxis
                    width={52}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: chartTokens.tickColor, fontSize: 11.5 }}
                    tickFormatter={formatCompactAxisInr}
                  />
                  <Tooltip
                    cursor={{ fill: chartTokens.cursorFill }}
                    contentStyle={chartTokens.tooltipStyle}
                    labelFormatter={(_, payload) =>
                      String(payload?.[0]?.payload?.fullLabel ?? '')
                    }
                    formatter={(val) => [
                      `₹${formatCurrencyExact(Number(val))}`,
                      'Weekly spend',
                    ]}
                  />
                  <Bar
                    dataKey="spent"
                    fill={chartTokens.accent}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={42}
                    isAnimationActive={false}
                  />
                </BarChart>
              ) : (
                <BarChart
                  data={topCategoriesChartData}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
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
                    tick={{ fill: chartTokens.tickColor, fontSize: 11.5 }}
                    tickFormatter={formatCompactAxisInr}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    width={112}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: chartTokens.tickColor, fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: chartTokens.cursorFill }}
                    contentStyle={chartTokens.tooltipStyle}
                    labelFormatter={(_, payload) =>
                      String(payload?.[0]?.payload?.fullCategory ?? '')
                    }
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
                    isAnimationActive={false}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Category Intelligence Card (5 cols) */}
      <section
        aria-label="Category intelligence"
        data-testid="overview-category-intelligence"
        className="lg:col-span-5 surface-card p-5 sm:p-6 flex flex-col justify-between gap-4"
      >
        <div className="space-y-4">
          <SectionHeader
            title="Category Intelligence"
            subtitle={`Share of spend & cap usage · ${radarOverview.window.label}`}
            action={
              showInsightsFeature ? (
                <button
                  type="button"
                  onClick={() => onNavigate('insights', 'radar')}
                  className="text-[12.5px] font-semibold text-[var(--accent-ink)] hover:underline inline-flex items-center gap-1 whitespace-nowrap"
                >
                  <span>Full Radar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : undefined
            }
          />

          {rankedCategories.length === 0 ? (
            <EmptyState
              compact
              icon={BarChart3}
              title="No category breakdown yet"
              description="Once you log expenses across categories, your top spending areas and monthly cap progress appear here."
              action={
                <button
                  type="button"
                  onClick={() => onNavigate('wellness')}
                  className="btn-secondary px-4 py-2 text-[12.5px]"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Configure Limits</span>
                </button>
              }
            />
          ) : (
            <div className="space-y-3.5">
              {rankedCategories.map((cat) => {
                const catStyle = getCategoryStyle(cat.category);
                const barValue =
                  cat.capUtilisationPct !== null
                    ? cat.capUtilisationPct
                    : maxCategorySpend > 0
                      ? (cat.totalSpent / maxCategorySpend) * 100
                      : 0;
                const barTone: 'brand' | 'warning' | 'danger' = cat.isOverCap
                  ? 'danger'
                  : cat.isApproachingCap
                    ? 'warning'
                    : 'brand';

                return (
                  <div key={cat.category} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-[13px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${catStyle.dot}`}
                        />
                        <span className="font-semibold text-[var(--text-primary)] truncate">
                          {cat.category}
                        </span>
                        {cat.isOverCap && (
                          <span className="text-[11px] font-semibold text-[var(--accent-danger-ink)] shrink-0">
                            Over cap
                          </span>
                        )}
                        {!cat.isOverCap && cat.isApproachingCap && (
                          <span className="text-[11px] font-semibold text-[var(--accent-warning-ink)] shrink-0">
                            Near cap
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-2 shrink-0 font-mono tabular-nums">
                        <span className="font-bold text-[var(--text-primary)]">
                          ₹{formatCurrency(cat.totalSpent)}
                        </span>
                        <span className="text-[11.5px] text-[var(--text-secondary)]">
                          {Math.round(cat.sharePct)}%
                        </span>
                      </div>
                    </div>

                    <ProgressBar
                      value={barValue}
                      tone={barTone}
                      size="sm"
                      label={`${cat.category} spending progress`}
                    />

                    <div className="flex items-center justify-between gap-2 text-[11.5px] text-[var(--text-secondary)]">
                      <span>
                        {cat.txCount} transaction{cat.txCount === 1 ? '' : 's'} · avg ₹
                        {formatCurrency(cat.avgTxValue)}
                      </span>
                      <span className="font-mono tabular-nums shrink-0">
                        {cat.allocatedCap !== null ? (
                          <span
                            className={
                              cat.isOverCap
                                ? 'text-[var(--accent-danger-ink)] font-semibold'
                                : cat.isApproachingCap
                                  ? 'text-[var(--accent-warning-ink)] font-semibold'
                                  : ''
                            }
                          >
                            {Math.round(cat.capUtilisationPct ?? 0)}% of ₹
                            {formatCurrency(cat.allocatedCap)} cap
                          </span>
                        ) : cat.deltaPct !== null ? (
                          <span
                            className={`inline-flex items-center gap-0.5 ${
                              cat.deltaPct > 15
                                ? 'text-[var(--accent-warning-ink)] font-semibold'
                                : cat.deltaPct < -10
                                  ? 'text-[var(--accent-success-ink)] font-semibold'
                                  : ''
                            }`}
                          >
                            {cat.deltaPct > 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : cat.deltaPct < 0 ? (
                              <TrendingDown className="w-3 h-3" />
                            ) : null}
                            {cat.deltaPct > 0 ? '+' : ''}
                            {Math.round(cat.deltaPct)}% vs prior
                          </span>
                        ) : (
                          'No cap set'
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {rankedCategories.length > 0 && (
          <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2 text-[12px]">
            <span className="text-[var(--text-secondary)] truncate">
              {categoriesResult.categories.filter((c) => c.totalSpent > 0).length} active
              categor{categoriesResult.categories.filter((c) => c.totalSpent > 0).length === 1 ? 'y' : 'ies'}
            </span>
            <button
              type="button"
              onClick={() => onNavigate('wellness')}
              className="font-semibold text-[var(--accent-ink)] hover:underline whitespace-nowrap shrink-0"
            >
              Manage caps & limits
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
