import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowDownRight, ArrowUpRight, GitCompare, Info, Repeat, TrendingUp } from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { formatCompact, formatCurrencyExact } from '../../utils/categoryStyles';
import { getChartThemeTokens } from '../../utils/settingsEngine';
import type {
  RadarComparisonPreset,
  RadarDateWindow,
  RadarPeriodComparisonResult,
  RadarSpendingTrendsResult,
  TrendGranularity,
} from '../../utils/radarEngine';

interface RadarTrendsCompareTabProps {
  window: RadarDateWindow;
  granularity: TrendGranularity;
  onChangeGranularity: (g: TrendGranularity) => void;
  trendsResult: RadarSpendingTrendsResult;
  comparisonPreset: RadarComparisonPreset;
  onChangeComparisonPreset: (p: RadarComparisonPreset) => void;
  comparisonResult: RadarPeriodComparisonResult;
}

export function RadarTrendsCompareTab({
  window,
  granularity,
  onChangeGranularity,
  trendsResult,
  comparisonPreset,
  onChangeComparisonPreset,
  comparisonResult,
}: RadarTrendsCompareTabProps) {
  const theme = useAppStore((s) => s.theme);
  const visualTheme = useAppStore((s) => s.visualTheme);
  const isDark = theme === 'dark';
  const chartTokens = getChartThemeTokens(theme, visualTheme.mood);
  const lineColors = chartTokens.secondarySeries;
  const tooltipStyle = chartTokens.tooltipStyle;
  const gridStroke = chartTokens.gridStroke;
  const tickColor = chartTokens.tickColor;
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [selectedTrendCats, setSelectedTrendCats] = useState<string[]>(() =>
    trendsResult.availableCategories.slice(0, 3)
  );

  const activeCategorySelection = useMemo(() => {
    const valid = selectedTrendCats.filter((c) =>
      trendsResult.availableCategories.includes(c)
    );
    return valid.length > 0 ? valid : trendsResult.availableCategories.slice(0, 3);
  }, [selectedTrendCats, trendsResult.availableCategories]);

  const toggleTrendCategory = (cat: string) => {
    setSelectedTrendCats((prev) => {
      const current = prev.length > 0 ? prev : trendsResult.availableCategories.slice(0, 3);
      if (current.includes(cat)) {
        if (current.length === 1) return current;
        return current.filter((c) => c !== cat);
      }
      return [...current.slice(-3), cat];
    });
  };

  const categoryTrendSeries = useMemo(
    () =>
      trendsResult.points.map((pt) => {
        const row: Record<string, string | number> = {
          label: pt.label,
          fullLabel: pt.fullLabel,
        };
        for (const cat of activeCategorySelection) {
          row[cat] = pt.byCategory[cat] ?? 0;
        }
        return row;
      }),
    [trendsResult.points, activeCategorySelection]
  );

  const trendBadge =
    trendsResult.overallTrend === 'increasing'
      ? { text: 'Increasing Trend', cls: 'text-[var(--accent-warning-ink)]' }
      : trendsResult.overallTrend === 'decreasing'
        ? { text: 'Decreasing Trend', cls: 'text-[var(--accent-success-ink)]' }
        : trendsResult.overallTrend === 'stable'
          ? { text: 'Stable Spending', cls: 'text-[var(--accent-ink)]' }
          : { text: 'Insufficient History', cls: 'text-[var(--text-secondary)]' };

  return (
    <div className="space-y-5">
      {/* Spending Trends Card */}
      <section className="surface-card p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[var(--accent-ink)]" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Historical Spending Trends
              </h3>
              <span className={`text-xs font-semibold ${trendBadge.cls}`}>· {trendBadge.text}</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1">{trendsResult.trendSummary}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className="tactile-well inline-flex items-center bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-xl p-0.5"
              role="group"
              aria-label="Trend granularity"
            >
              {(
                [
                  ['daily', 'Daily'],
                  ['weekly', 'Weekly'],
                  ['monthly', 'Monthly'],
                  ['yearly', 'Yearly'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onChangeGranularity(id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    granularity === id
                      ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div
              className="tactile-well inline-flex items-center bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-xl p-0.5"
              role="group"
              aria-label="Chart mode"
            >
              <button
                type="button"
                onClick={() => setChartType('area')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  chartType === 'area'
                    ? 'bg-[var(--bg-surface)] text-[var(--accent-ink)] shadow-sm border border-[var(--border-subtle)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
                }`}
              >
                Area
              </button>
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  chartType === 'bar'
                    ? 'bg-[var(--bg-surface)] text-[var(--accent-ink)] shadow-sm border border-[var(--border-subtle)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
                }`}
              >
                Bar
              </button>
            </div>
          </div>
        </div>

        {/* Daily Stats Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="surface-well px-3.5 py-2.5">
            <p className="text-[12px] font-semibold text-[var(--text-secondary)]">
              Average Daily Spend
            </p>
            <p className="text-base font-bold font-mono tabular-nums text-[var(--text-primary)] mt-0.5">
              ₹{formatCurrencyExact(trendsResult.avgDailySpend)}
            </p>
            <p className="text-[11.5px] text-[var(--text-muted)] mt-0.5">Across {window.label}</p>
          </div>

          <div className="surface-well px-3.5 py-2.5">
            <p className="text-[12px] font-semibold text-[var(--text-secondary)]">
              Highest-Spending Day
            </p>
            <p className="text-base font-bold font-mono tabular-nums text-[var(--accent-warning-ink)] mt-0.5">
              {trendsResult.highestSpendingDay
                ? `₹${formatCurrencyExact(trendsResult.highestSpendingDay.amount)}`
                : '—'}
            </p>
            <p className="text-[11.5px] text-[var(--text-muted)] mt-0.5 truncate">
              {trendsResult.highestSpendingDay
                ? `${trendsResult.highestSpendingDay.label} (${trendsResult.highestSpendingDay.txCount} txns)`
                : 'No activity in window'}
            </p>
          </div>

          <div className="surface-well px-3.5 py-2.5">
            <p className="text-[12px] font-semibold text-[var(--text-secondary)]">
              Lowest Active Day
            </p>
            <p className="text-base font-bold font-mono tabular-nums text-[var(--accent-success-ink)] mt-0.5">
              {trendsResult.lowestActiveDay
                ? `₹${formatCurrencyExact(trendsResult.lowestActiveDay.amount)}`
                : '—'}
            </p>
            <p className="text-[11.5px] text-[var(--text-muted)] mt-0.5 truncate">
              {trendsResult.lowestActiveDay
                ? `${trendsResult.lowestActiveDay.label} (${trendsResult.lowestActiveDay.txCount} txns)`
                : 'No activity in window'}
            </p>
          </div>
        </div>

        <div className="h-64 w-full" data-testid="radar-trends-main-chart">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart
                data={trendsResult.points}
                margin={{ top: 10, right: 12, left: 0, bottom: 2 }}
              >
                <defs>
                  <linearGradient id="radarTrendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartTokens.accent} stopOpacity={0.26} />
                    <stop offset="100%" stopColor={chartTokens.accent} stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: tickColor, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={16}
                />
                <YAxis
                  tickFormatter={(v: number) => (v === 0 ? '₹0' : `₹${formatCompact(v)}`)}
                  tick={{ fill: tickColor, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                  axisLine={false}
                  tickLine={false}
                  width={58}
                />
                <Tooltip
                  cursor={{ stroke: chartTokens.gridStroke, strokeDasharray: '3 3' }}
                  formatter={(v: unknown) => [`₹${formatCurrencyExact(Number(v ?? 0))}`, 'Spent']}
                  labelFormatter={(_, payload) =>
                    String(payload?.[0]?.payload?.fullLabel ?? '')
                  }
                  contentStyle={tooltipStyle}
                />
                <Area
                  type="monotone"
                  dataKey="spent"
                  stroke={chartTokens.accent}
                  strokeWidth={2.5}
                  fill="url(#radarTrendGrad)"
                  isAnimationActive={false}
                  dot={{ r: 3, fill: chartTokens.tooltipStyle.backgroundColor, stroke: chartTokens.accent, strokeWidth: 2 }}
                />
              </AreaChart>
            ) : (
              <BarChart
                data={trendsResult.points}
                margin={{ top: 10, right: 12, left: 0, bottom: 2 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: tickColor, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={16}
                />
                <YAxis
                  tickFormatter={(v: number) => (v === 0 ? '₹0' : `₹${formatCompact(v)}`)}
                  tick={{ fill: tickColor, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                  axisLine={false}
                  tickLine={false}
                  width={58}
                />
                <Tooltip
                  cursor={{ fill: chartTokens.cursorFill }}
                  formatter={(v: unknown) => [`₹${formatCurrencyExact(Number(v ?? 0))}`, 'Spent']}
                  labelFormatter={(_, payload) =>
                    String(payload?.[0]?.payload?.fullLabel ?? '')
                  }
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="spent" fill={chartTokens.accent} radius={[5, 5, 0, 0]} maxBarSize={28} isAnimationActive={false} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </section>

      {/* Category Trend Comparison + Repeated Patterns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <section className="lg:col-span-7 surface-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Multi-Category Trend Comparison
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Compare selected categories across {granularity} intervals (up to 4)
              </p>
            </div>
          </div>

          {trendsResult.availableCategories.length === 0 ? (
            <p className="text-xs text-[var(--text-secondary)] py-10 text-center">
              Log expenses across categories to compare category trajectories.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {trendsResult.availableCategories.slice(0, 8).map((cat) => {
                  const idx = activeCategorySelection.indexOf(cat);
                  const active = idx !== -1;
                  const lineColor = active ? lineColors[idx % lineColors.length] : undefined;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleTrendCategory(cat)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border whitespace-nowrap transition-colors ${
                        active
                          ? 'bg-[var(--accent-primary-soft)] text-[var(--text-primary)] border-[var(--accent-border)]'
                          : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {active && (
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: lineColor }}
                        />
                      )}
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>

              <div className="h-56 w-full" data-testid="radar-category-trend-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={categoryTrendSeries}
                    margin={{ top: 8, right: 12, left: 0, bottom: 2 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: tickColor, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={16}
                    />
                    <YAxis
                      tickFormatter={(v: number) => (v === 0 ? '₹0' : `₹${formatCompact(v)}`)}
                      tick={{ fill: tickColor, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                      axisLine={false}
                      tickLine={false}
                      width={58}
                    />
                    <Tooltip
                      formatter={(v: unknown) => `₹${formatCurrencyExact(Number(v ?? 0))}`}
                      contentStyle={tooltipStyle}
                    />
                    {activeCategorySelection.map((cat, idx) => (
                      <Line
                        key={cat}
                        type="monotone"
                        dataKey={cat}
                        stroke={lineColors[idx % lineColors.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        isAnimationActive={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </section>

        <section className="lg:col-span-5 surface-card p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Repeat className="w-4 h-4 text-[var(--accent-ink)]" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Repeated Spending Patterns</h3>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mb-4">
            Recurring items purchased 2+ times during {window.label}
          </p>

          {trendsResult.repeatedPatterns.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8 border border-dashed border-[var(--border-strong)] bg-[var(--bg-subtle)] rounded-xl">
              <p className="text-xs font-semibold text-[var(--text-primary)]">No repeated purchase patterns yet</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1 px-4">
                Items bought multiple times within {window.label} will surface here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {trendsResult.repeatedPatterns.map((pat) => (
                <div
                  key={`${pat.category}-${pat.itemName}`}
                  className="py-2.5 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--text-primary)] truncate">{pat.itemName}</p>
                    <p className="text-[var(--text-secondary)] mt-0.5">
                      {pat.category} · {pat.occurrences}x purchases · avg ₹{formatCurrencyExact(pat.avgSpent)}
                    </p>
                  </div>
                  <span className="font-mono tabular-nums font-bold text-[var(--text-primary)] shrink-0">
                    ₹{formatCurrencyExact(pat.totalSpent)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Period & Monthly Financial Comparison System */}
      <section className="surface-card p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-[var(--accent-ink)]" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Period &amp; Monthly Financial Comparison
              </h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Comparing <strong className="text-[var(--text-primary)]">{comparisonResult.currentLabel}</strong> vs{' '}
              <strong className="text-[var(--text-primary)]">{comparisonResult.previousLabel}</strong>
            </p>
          </div>

          <div
            className="tactile-well inline-flex flex-wrap items-center bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-xl p-0.5"
            role="group"
            aria-label="Comparison period mode"
          >
            {(
              [
                ['month_over_month', 'Month vs Month'],
                ['week_over_week', 'Week vs Week'],
                ['year_over_year', 'Year vs Year'],
                ['selected_window', 'Selected Range'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => onChangeComparisonPreset(id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  comparisonPreset === id
                    ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {comparisonResult.fairElapsedNote && (
          <div className="flex items-start gap-2 rounded-xl bg-[var(--accent-primary-soft)] border border-[var(--accent-border)] px-3.5 py-2.5 text-xs text-[var(--accent-ink)] mb-4">
            <Info className="w-4 h-4 text-[var(--accent-ink)] shrink-0 mt-0.5" />
            <span>{comparisonResult.fairElapsedNote}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <ComparisonStatCard
            title="Total Expenditure"
            curr={`₹${formatCurrencyExact(comparisonResult.currentSpent)}`}
            prev={`₹${formatCurrencyExact(comparisonResult.previousSpent)}`}
            diffText={`${comparisonResult.amountDiff >= 0 ? '+' : '-'}₹${formatCurrencyExact(Math.abs(comparisonResult.amountDiff))}`}
            pct={comparisonResult.pctChange}
          />
          <ComparisonStatCard
            title="Transaction Count"
            curr={String(comparisonResult.currentTxCount)}
            prev={String(comparisonResult.previousTxCount)}
            diffText={`${comparisonResult.txFreqDiff >= 0 ? '+' : ''}${comparisonResult.txFreqDiff} txns`}
            pct={comparisonResult.txFreqPctChange}
          />
          <ComparisonStatCard
            title="Avg Transaction Value"
            curr={`₹${formatCurrencyExact(comparisonResult.currentAvgTx)}`}
            prev={`₹${formatCurrencyExact(comparisonResult.previousAvgTx)}`}
            diffText={`${comparisonResult.avgTxDiff >= 0 ? '+' : '-'}₹${formatCurrencyExact(Math.abs(comparisonResult.avgTxDiff))}`}
            pct={comparisonResult.avgTxPctChange}
          />
          <ComparisonStatCard
            title="Daily Avg Spending"
            curr={`₹${formatCurrencyExact(comparisonResult.currentDailyAvg)}`}
            prev={`₹${formatCurrencyExact(comparisonResult.previousDailyAvg)}`}
            diffText={`${comparisonResult.dailyAvgDiff >= 0 ? '+' : '-'}₹${formatCurrencyExact(Math.abs(comparisonResult.dailyAvgDiff))}/d`}
            pct={comparisonResult.dailyAvgPctChange}
          />
        </div>

        {comparisonResult.categoryDeltas.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[520px]">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[12px] text-[var(--text-secondary)]">
                  <th className="py-2 pr-3 font-semibold">Category</th>
                  <th className="py-2 px-3 font-semibold text-right">Previous</th>
                  <th className="py-2 px-3 font-semibold text-right">Current</th>
                  <th className="py-2 px-3 font-semibold text-right">Difference</th>
                  <th className="py-2 pl-3 font-semibold text-right">% Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-xs">
                {comparisonResult.categoryDeltas.map((row) => (
                  <tr key={row.category} className="hover:bg-[var(--bg-hover)]">
                    <td className="py-2.5 pr-3 font-semibold text-[var(--text-primary)]">{row.category}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                      ₹{formatCurrencyExact(row.previousSpent)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-[var(--text-primary)]">
                      ₹{formatCurrencyExact(row.currentSpent)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono tabular-nums font-semibold ${
                        row.diff > 0
                          ? 'text-[var(--accent-warning-ink)]'
                          : row.diff < 0
                            ? 'text-[var(--accent-success-ink)]'
                            : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      {row.diff >= 0 ? '+' : '-'}₹{formatCurrencyExact(Math.abs(row.diff))}
                    </td>
                    <td className="py-2.5 pl-3 text-right font-mono tabular-nums text-[var(--text-primary)]">
                      {row.pctChange !== null
                        ? `${row.pctChange > 0 ? '+' : ''}${row.pctChange}%`
                        : row.previousSpent === 0 && row.currentSpent > 0
                          ? 'New baseline'
                          : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function ComparisonStatCard({
  title,
  curr,
  prev,
  diffText,
  pct,
}: {
  title: string;
  curr: string;
  prev: string;
  diffText: string;
  pct: number | null;
}) {
  const isUp = (pct ?? 0) > 0;
  const isDown = (pct ?? 0) < 0;
  return (
    <div className="surface-well p-3.5">
      <p className="text-[12px] font-semibold text-[var(--text-secondary)]">{title}</p>
      <div className="flex items-baseline justify-between gap-2 mt-1.5">
        <span className="text-lg font-bold font-mono tabular-nums text-[var(--text-primary)]">{curr}</span>
        {pct !== null ? (
          <span
            className={`text-xs font-mono tabular-nums font-semibold inline-flex items-center gap-0.5 ${
              isUp
                ? 'text-[var(--accent-warning-ink)]'
                : isDown
                  ? 'text-[var(--accent-success-ink)]'
                  : 'text-[var(--text-secondary)]'
            }`}
          >
            {isUp ? (
              <ArrowUpRight className="w-3.5 h-3.5" />
            ) : isDown ? (
              <ArrowDownRight className="w-3.5 h-3.5" />
            ) : null}
            {pct > 0 ? `+${pct}%` : `${pct}%`}
          </span>
        ) : (
          <span className="text-[11.5px] text-[var(--text-muted)]">No baseline</span>
        )}
      </div>
      <p className="text-[11.5px] text-[var(--text-secondary)] mt-1 font-mono tabular-nums">
        Prior: <span className="whitespace-nowrap">{prev}</span> · Diff:{' '}
        <span className="whitespace-nowrap">{diffText}</span>
      </p>
    </div>
  );
}
