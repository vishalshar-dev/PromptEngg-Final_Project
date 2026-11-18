import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, BarChart3, Activity } from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import {
  buildMonthlySpendingSeries,
  type MonthlySpendPoint,
} from '../../utils/spendingTrends';
import { formatCompact, formatCurrency } from '../../utils/categoryStyles';

type RangeOption = 6 | 12;
type ChartMode = 'area' | 'bar';

interface CustomTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: MonthlySpendPoint }>;
}

function CustomTrendsTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  const isOver = point.isOverBudget;
  const diff = Math.abs(point.remaining);

  return (
    <div className="bg-white rounded-xl px-3.5 py-2.5 shadow-lg border border-[#E7EAF0] min-w-[188px]">
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <span className="text-xs font-bold text-[#151922]">{point.fullLabel}</span>
        <span
          className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${
            point.txCount === 0
              ? 'bg-[#F1F3F6] text-[#697386]'
              : isOver
              ? 'bg-[#FDECEC] text-[#DE5252]'
              : 'bg-[#E8F7F1] text-[#15966B]'
          }`}
        >
          {point.txCount === 0
            ? 'No txns'
            : isOver
            ? 'Over budget'
            : 'Under budget'}
        </span>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#697386] font-medium">Spent</span>
          <span className="font-mono font-bold text-[#151922] tabular-nums">
            ₹{formatCurrency(point.spent)}
          </span>
        </div>

        {point.budget > 0 && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#697386] font-medium">
              {isOver ? 'Over by' : 'Remaining'}
            </span>
            <span
              className={`font-mono font-semibold tabular-nums ${
                isOver ? 'text-[#DE5252]' : 'text-[#15966B]'
              }`}
            >
              ₹{formatCurrency(diff)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 pt-1 border-t border-[#E7EAF0] text-[11px]">
          <span className="text-[#929BAB]">
            {point.txCount} {point.txCount === 1 ? 'txn' : 'txns'}
          </span>
          {point.topCategory && (
            <span className="text-[#697386] font-semibold truncate max-w-[100px]">
              Top: {point.topCategory}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function MonthlyTrendsChart() {
  const transactions = useAppStore((s) => s.transactions);
  const totalBudget = useAppStore((s) => s.totalBudget);

  const [range, setRange] = useState<RangeOption>(6);
  const [chartMode, setChartMode] = useState<ChartMode>('area');

  const summary = useMemo(
    () => buildMonthlySpendingSeries(transactions, totalBudget, range),
    [transactions, totalBudget, range]
  );

  const yMax = useMemo(() => {
    const maxSpent = summary.points.reduce(
      (max, p) => (p.spent > max ? p.spent : max),
      0
    );
    const baseline = Math.max(maxSpent, totalBudget, 1000);
    return Math.ceil(baseline * 1.15);
  }, [summary.points, totalBudget]);

  const momDisplay = useMemo(() => {
    if (summary.momDeltaPct === null) return null;
    const sign = summary.momDeltaPct > 0 ? '+' : '';
    return `${sign}${summary.momDeltaPct}% MoM`;
  }, [summary.momDeltaPct]);

  return (
    <section
      className="surface-card p-5"
      aria-label="Monthly Spending Trends"
    >
      {/* Header + Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#EDF2FF] border border-[#D4E0FF] flex items-center justify-center shrink-0 mt-0.5">
            <TrendingUp className="w-4 h-4 text-[#365FE8]" strokeWidth={2.2} />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-[#151922]">
              Monthly Spending Trends
            </h3>
            <p className="text-xs text-[#697386] mt-0.5">
              Spend history vs ₹{formatCurrency(totalBudget)} budget across last{' '}
              {range} months
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Range Selector */}
          <div
            className="inline-flex items-center bg-[#F1F3F6] border border-[#E7EAF0] rounded-xl p-0.5"
            role="group"
            aria-label="Month range"
          >
            {([6, 12] as const).map((opt) => {
              const active = range === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setRange(opt)}
                  aria-pressed={active}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-[#365FE8] text-white shadow-xs'
                      : 'text-[#697386] hover:text-[#151922]'
                  }`}
                >
                  {opt}M
                </button>
              );
            })}
          </div>

          {/* Chart Type Toggle */}
          <div
            className="inline-flex items-center bg-[#F1F3F6] border border-[#E7EAF0] rounded-xl p-0.5"
            role="group"
            aria-label="Chart style"
          >
            <button
              type="button"
              onClick={() => setChartMode('area')}
              aria-pressed={chartMode === 'area'}
              aria-label="Area chart"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                chartMode === 'area'
                  ? 'bg-white text-[#365FE8] shadow-xs border border-[#E7EAF0]'
                  : 'text-[#697386] hover:text-[#151922] border border-transparent'
              }`}
            >
              <Activity className="w-3.5 h-3.5" strokeWidth={2.2} />
              <span>Area</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode('bar')}
              aria-pressed={chartMode === 'bar'}
              aria-label="Bar chart"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                chartMode === 'bar'
                  ? 'bg-white text-[#365FE8] shadow-xs border border-[#E7EAF0]'
                  : 'text-[#697386] hover:text-[#151922] border border-transparent'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" strokeWidth={2.2} />
              <span>Bar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
        <div className="surface-subtle px-3.5 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
            Avg / Month
          </p>
          <p className="text-sm font-bold font-mono tabular-nums text-[#151922] mt-0.5">
            {summary.hasAnyTransactions
              ? `₹${formatCurrency(summary.avgMonthlySpend)}`
              : '—'}
          </p>
          <p className="text-[11px] text-[#929BAB] mt-0.5 truncate">
            {summary.activeMonthsCount > 0
              ? `${summary.activeMonthsCount} active ${
                  summary.activeMonthsCount === 1 ? 'mo' : 'mos'
                }`
              : 'No active months'}
          </p>
        </div>

        <div className="surface-subtle px-3.5 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
            Peak Month
          </p>
          <p
            className={`text-sm font-bold font-mono tabular-nums mt-0.5 ${
              summary.peakMonth?.isOverBudget ? 'text-[#DE5252]' : 'text-[#151922]'
            }`}
          >
            {summary.peakMonth
              ? `₹${formatCurrency(summary.peakMonth.spent)}`
              : '—'}
          </p>
          <p className="text-[11px] text-[#929BAB] mt-0.5 truncate">
            {summary.peakMonth ? summary.peakMonth.fullLabel : 'Waiting for data'}
          </p>
        </div>

        <div className="surface-subtle px-3.5 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
            On Budget
          </p>
          <p
            className={`text-sm font-bold font-mono tabular-nums mt-0.5 ${
              !summary.hasAnyTransactions
                ? 'text-[#697386]'
                : summary.overBudgetCount > 0
                ? 'text-[#9E6614]'
                : 'text-[#15966B]'
            }`}
          >
            {summary.hasAnyTransactions
              ? `${summary.underBudgetCount}/${summary.activeMonthsCount} mos`
              : '—'}
          </p>
          <p className="text-[11px] text-[#929BAB] mt-0.5 truncate">
            {momDisplay ?? 'Track month over month'}
          </p>
        </div>
      </div>

      {/* Chart or Empty State */}
      {!summary.hasAnyTransactions ? (
        <div
          className="h-56 rounded-xl bg-[#F7F8FA] border border-dashed border-[#D5DBE6] flex flex-col items-center justify-center text-center px-6"
          data-testid="monthly-trends-empty"
        >
          <div className="w-10 h-10 rounded-xl bg-white border border-[#E7EAF0] flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5 text-[#929BAB]" strokeWidth={2} />
          </div>
          <p className="text-sm font-semibold text-[#151922]">
            No monthly spending history yet
          </p>
          <p className="text-xs text-[#697386] mt-1 max-w-xs">
            Check out items from Shopping or save a scanned receipt in Receipt Scanner to chart
            your monthly spend against your budget.
          </p>
        </div>
      ) : (
        <>
          <div className="h-60 sm:h-64 w-full" data-testid="monthly-trends-chart">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'area' ? (
                <AreaChart
                  data={summary.points}
                  margin={{ top: 18, right: 12, left: -10, bottom: 2 }}
                >
                  <defs>
                    <linearGradient id="monthlySpendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#365FE8" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#365FE8" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#E7EAF0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{
                      fill: '#697386',
                      fontSize: 11,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={14}
                  />
                  <YAxis
                    domain={[0, yMax]}
                    tickFormatter={(v: number) =>
                      v === 0 ? '₹0' : `₹${formatCompact(v)}`
                    }
                    tick={{
                      fill: '#697386',
                      fontSize: 11,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                    axisLine={false}
                    tickLine={false}
                    width={54}
                  />
                  <Tooltip
                    cursor={{
                      stroke: '#D5DBE6',
                      strokeDasharray: '3 3',
                    }}
                    content={<CustomTrendsTooltip />}
                  />
                  {totalBudget > 0 && (
                    <ReferenceLine
                      y={totalBudget}
                      stroke="#E5A23B"
                      strokeDasharray="5 5"
                      strokeOpacity={0.9}
                      label={{
                        value: `Budget ₹${formatCompact(totalBudget)}`,
                        position: 'insideTopRight',
                        fill: '#9E6614',
                        fontSize: 10,
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="spent"
                    stroke="#365FE8"
                    strokeWidth={2.5}
                    fill="url(#monthlySpendGrad)"
                    isAnimationActive={false}
                    dot={{
                      r: 3.5,
                      fill: '#FFFFFF',
                      stroke: '#365FE8',
                      strokeWidth: 2,
                    }}
                    activeDot={{
                      r: 5.5,
                      fill: '#365FE8',
                      stroke: '#FFFFFF',
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              ) : (
                <BarChart
                  data={summary.points}
                  margin={{ top: 18, right: 12, left: -10, bottom: 2 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#E7EAF0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{
                      fill: '#697386',
                      fontSize: 11,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={14}
                  />
                  <YAxis
                    domain={[0, yMax]}
                    tickFormatter={(v: number) =>
                      v === 0 ? '₹0' : `₹${formatCompact(v)}`
                    }
                    tick={{
                      fill: '#697386',
                      fontSize: 11,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                    axisLine={false}
                    tickLine={false}
                    width={54}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(54, 95, 232, 0.05)' }}
                    content={<CustomTrendsTooltip />}
                  />
                  {totalBudget > 0 && (
                    <ReferenceLine
                      y={totalBudget}
                      stroke="#E5A23B"
                      strokeDasharray="5 5"
                      strokeOpacity={0.9}
                      label={{
                        value: `Budget ₹${formatCompact(totalBudget)}`,
                        position: 'insideTopRight',
                        fill: '#9E6614',
                        fontSize: 10,
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    />
                  )}
                  <Bar dataKey="spent" radius={[6, 6, 0, 0]} maxBarSize={36} isAnimationActive={false}>
                    {summary.points.map((entry) => (
                      <Cell
                        key={entry.monthKey}
                        fill={
                          entry.isOverBudget
                            ? '#DE5252'
                            : entry.txCount > 0
                            ? '#365FE8'
                            : '#E7EAF0'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-[#E7EAF0] text-xs text-[#697386]">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#365FE8] inline-block" />
                <span>Monthly Spend</span>
              </span>
              {chartMode === 'bar' && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#DE5252] inline-block" />
                  <span>Over Budget</span>
                </span>
              )}
              {totalBudget > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-4 border-t-2 border-dashed border-[#E5A23B] inline-block" />
                  <span>Budget Cap (₹{formatCurrency(totalBudget)})</span>
                </span>
              )}
            </div>
            {summary.overBudgetCount > 0 && (
              <span className="text-[#DE5252] font-semibold">
                {summary.overBudgetCount}{' '}
                {summary.overBudgetCount === 1 ? 'month' : 'months'} over budget
              </span>
            )}
          </div>
        </>
      )}
    </section>
  );
}
