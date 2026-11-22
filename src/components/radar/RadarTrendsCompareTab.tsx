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
      ? { text: 'Increasing Trend', cls: 'text-[#9E6614]' }
      : trendsResult.overallTrend === 'decreasing'
        ? { text: 'Decreasing Trend', cls: 'text-[#15966B]' }
        : trendsResult.overallTrend === 'stable'
          ? { text: 'Stable Spending', cls: 'text-[#365FE8]' }
          : { text: 'Insufficient History', cls: 'text-[#697386]' };

  return (
    <div className="space-y-5">
      {/* Spending Trends Card */}
      <section className="surface-card p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#365FE8]" />
              <h3 className="text-sm font-bold text-[#151922]">
                Historical Spending Trends
              </h3>
              <span className={`text-xs font-semibold ${trendBadge.cls}`}>· {trendBadge.text}</span>
            </div>
            <p className="text-xs text-[#697386] mt-1">{trendsResult.trendSummary}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className="tactile-well inline-flex items-center bg-[#F1F3F6] border border-[#E7EAF0] rounded-xl p-0.5"
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
                      ? 'bg-[#365FE8] text-white shadow-xs'
                      : 'text-[#697386] hover:text-[#151922]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div
              className="tactile-well inline-flex items-center bg-[#F1F3F6] border border-[#E7EAF0] rounded-xl p-0.5"
              role="group"
              aria-label="Chart mode"
            >
              <button
                type="button"
                onClick={() => setChartType('area')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  chartType === 'area'
                    ? 'bg-white text-[#365FE8] shadow-xs border border-[#E7EAF0]'
                    : 'text-[#697386] hover:text-[#151922] border border-transparent'
                }`}
              >
                Area
              </button>
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  chartType === 'bar'
                    ? 'bg-white text-[#365FE8] shadow-xs border border-[#E7EAF0]'
                    : 'text-[#697386] hover:text-[#151922] border border-transparent'
                }`}
              >
                Bar
              </button>
            </div>
          </div>
        </div>

        {/* Daily Stats Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="surface-subtle px-3.5 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
              Average Daily Spend
            </p>
            <p className="text-base font-bold font-mono tabular-nums text-[#151922] mt-0.5">
              ₹{formatCurrencyExact(trendsResult.avgDailySpend)}
            </p>
            <p className="text-[11px] text-[#929BAB] mt-0.5">Across {window.label}</p>
          </div>

          <div className="surface-subtle px-3.5 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
              Highest-Spending Day
            </p>
            <p className="text-base font-bold font-mono tabular-nums text-[#9E6614] mt-0.5">
              {trendsResult.highestSpendingDay
                ? `₹${formatCurrencyExact(trendsResult.highestSpendingDay.amount)}`
                : '—'}
            </p>
            <p className="text-[11px] text-[#929BAB] mt-0.5 truncate">
              {trendsResult.highestSpendingDay
                ? `${trendsResult.highestSpendingDay.label} (${trendsResult.highestSpendingDay.txCount} txns)`
                : 'No activity in window'}
            </p>
          </div>

          <div className="surface-subtle px-3.5 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
              Lowest Active Day
            </p>
            <p className="text-base font-bold font-mono tabular-nums text-[#15966B] mt-0.5">
              {trendsResult.lowestActiveDay
                ? `₹${formatCurrencyExact(trendsResult.lowestActiveDay.amount)}`
                : '—'}
            </p>
            <p className="text-[11px] text-[#929BAB] mt-0.5 truncate">
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
                margin={{ top: 10, right: 12, left: -10, bottom: 2 }}
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
                  width={54}
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
                margin={{ top: 10, right: 12, left: -10, bottom: 2 }}
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
                  width={54}
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
              <h3 className="text-sm font-bold text-[#151922]">
                Multi-Category Trend Comparison
              </h3>
              <p className="text-xs text-[#697386] mt-0.5">
                Compare selected categories across {granularity} intervals (up to 4)
              </p>
            </div>
          </div>

          {trendsResult.availableCategories.length === 0 ? (
            <p className="text-xs text-[#697386] py-10 text-center">
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
                          ? 'bg-[#EDF2FF] text-[#151922] border-[#D4E0FF]'
                          : 'bg-[#F7F8FA] text-[#697386] border-[#E7EAF0] hover:text-[#151922]'
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
                    margin={{ top: 8, right: 12, left: -10, bottom: 2 }}
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
                      width={52}
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
            <Repeat className="w-4 h-4 text-[#365FE8]" />
            <h3 className="text-sm font-bold text-[#151922]">Repeated Spending Patterns</h3>
          </div>
          <p className="text-xs text-[#697386] mb-4">
            Recurring items purchased 2+ times during {window.label}
          </p>

          {trendsResult.repeatedPatterns.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8 border border-dashed border-[#D5DBE6] bg-[#F7F8FA] rounded-xl">
              <p className="text-xs font-semibold text-[#151922]">No repeated purchase patterns yet</p>
              <p className="text-xs text-[#697386] mt-1 px-4">
                Items bought multiple times within {window.label} will surface here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#E7EAF0]">
              {trendsResult.repeatedPatterns.map((pat) => (
                <div
                  key={`${pat.category}-${pat.itemName}`}
                  className="py-2.5 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-[#151922] truncate">{pat.itemName}</p>
                    <p className="text-[#697386] mt-0.5">
                      {pat.category} · {pat.occurrences}x purchases · avg ₹{formatCurrencyExact(pat.avgSpent)}
                    </p>
                  </div>
                  <span className="font-mono tabular-nums font-bold text-[#151922] shrink-0">
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
              <GitCompare className="w-4 h-4 text-[#365FE8]" />
              <h3 className="text-sm font-bold text-[#151922]">
                Period &amp; Monthly Financial Comparison
              </h3>
            </div>
            <p className="text-xs text-[#697386] mt-0.5">
              Comparing <strong className="text-[#151922]">{comparisonResult.currentLabel}</strong> vs{' '}
              <strong className="text-[#151922]">{comparisonResult.previousLabel}</strong>
            </p>
          </div>

          <div
            className="tactile-well inline-flex flex-wrap items-center bg-[#F1F3F6] border border-[#E7EAF0] rounded-xl p-0.5"
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
                    ? 'bg-[#365FE8] text-white shadow-xs'
                    : 'text-[#697386] hover:text-[#151922]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {comparisonResult.fairElapsedNote && (
          <div className="flex items-start gap-2 rounded-xl bg-[#EDF2FF] border border-[#D4E0FF] px-3.5 py-2.5 text-xs text-[#294FCC] mb-4">
            <Info className="w-4 h-4 text-[#365FE8] shrink-0 mt-0.5" />
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
                <tr className="border-b border-[#E7EAF0] text-[11px] uppercase tracking-wider text-[#697386]">
                  <th className="py-2 pr-3 font-semibold">Category</th>
                  <th className="py-2 px-3 font-semibold text-right">Previous</th>
                  <th className="py-2 px-3 font-semibold text-right">Current</th>
                  <th className="py-2 px-3 font-semibold text-right">Difference</th>
                  <th className="py-2 pl-3 font-semibold text-right">% Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7EAF0] text-xs">
                {comparisonResult.categoryDeltas.map((row) => (
                  <tr key={row.category} className="hover:bg-[#F7F8FA]">
                    <td className="py-2.5 pr-3 font-semibold text-[#151922]">{row.category}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#697386]">
                      ₹{formatCurrencyExact(row.previousSpent)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-[#151922]">
                      ₹{formatCurrencyExact(row.currentSpent)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono tabular-nums font-semibold ${
                        row.diff > 0
                          ? 'text-[#9E6614]'
                          : row.diff < 0
                            ? 'text-[#15966B]'
                            : 'text-[#697386]'
                      }`}
                    >
                      {row.diff >= 0 ? '+' : '-'}₹{formatCurrencyExact(Math.abs(row.diff))}
                    </td>
                    <td className="py-2.5 pl-3 text-right font-mono tabular-nums text-[#151922]">
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
    <div className="surface-subtle p-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">{title}</p>
      <div className="flex items-baseline justify-between gap-2 mt-1.5">
        <span className="text-lg font-bold font-mono tabular-nums text-[#151922]">{curr}</span>
        {pct !== null ? (
          <span
            className={`text-xs font-mono tabular-nums font-semibold inline-flex items-center gap-0.5 ${
              isUp ? 'text-[#9E6614]' : isDown ? 'text-[#15966B]' : 'text-[#697386]'
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
          <span className="text-[11px] text-[#929BAB]">No baseline</span>
        )}
      </div>
      <p className="text-[11px] text-[#697386] mt-1 font-mono tabular-nums">
        Prior: <span className="whitespace-nowrap">{prev}</span> · Diff:{' '}
        <span className="whitespace-nowrap">{diffText}</span>
      </p>
    </div>
  );
}
