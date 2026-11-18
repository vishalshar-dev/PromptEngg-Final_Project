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
    <div className="glass-strong rounded-xl px-3.5 py-2.5 shadow-2xl border border-white/10 min-w-[180px]">
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <span className="text-xs font-extrabold text-white">{point.fullLabel}</span>
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            point.txCount === 0
              ? 'bg-white/[0.06] text-zinc-400'
              : isOver
              ? 'bg-red-500/15 text-red-400'
              : 'bg-brand-500/15 text-brand-400'
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
          <span className="text-zinc-400 font-medium">Spent</span>
          <span className="font-mono font-extrabold text-white tabular-nums">
            ₹{formatCurrency(point.spent)}
          </span>
        </div>

        {point.budget > 0 && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-zinc-400 font-medium">
              {isOver ? 'Over by' : 'Remaining'}
            </span>
            <span
              className={`font-mono font-bold tabular-nums ${
                isOver ? 'text-red-400' : 'text-brand-400'
              }`}
            >
              ₹{formatCurrency(diff)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 pt-1 border-t border-white/[0.06] text-[11px]">
          <span className="text-zinc-500">
            {point.txCount} {point.txCount === 1 ? 'txn' : 'txns'}
          </span>
          {point.topCategory && (
            <span className="text-zinc-300 font-semibold truncate max-w-[96px]">
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
      className="glass rounded-2xl p-4 sm:p-5 shadow-xl animate-fade-in-up"
      aria-label="Monthly Spending Trends"
    >
      {/* Header + Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <TrendingUp className="w-4 h-4 text-brand-400" strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold tracking-tight text-white">
              Monthly Spending Trends
            </h3>
            <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
              Spend history vs ₹{formatCurrency(totalBudget)} budget across last{' '}
              {range} months
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Range Selector */}
          <div
            className="inline-flex items-center bg-ink-900/90 border border-white/[0.06] rounded-xl p-0.5"
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
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    active
                      ? 'bg-white/[0.1] text-white shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {opt}M
                </button>
              );
            })}
          </div>

          {/* Chart Type Toggle */}
          <div
            className="inline-flex items-center bg-ink-900/90 border border-white/[0.06] rounded-xl p-0.5"
            role="group"
            aria-label="Chart style"
          >
            <button
              type="button"
              onClick={() => setChartMode('area')}
              aria-pressed={chartMode === 'area'}
              aria-label="Area chart"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                chartMode === 'area'
                  ? 'bg-brand-500/15 text-brand-400 border border-brand-500/25'
                  : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
              }`}
            >
              <Activity className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>Area</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode('bar')}
              aria-pressed={chartMode === 'bar'}
              aria-label="Bar chart"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                chartMode === 'bar'
                  ? 'bg-brand-500/15 text-brand-400 border border-brand-500/25'
                  : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span>Bar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Metrics Strip */}
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <div className="bg-ink-900/70 border border-white/[0.05] rounded-xl px-3 py-2.5">
          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
            Avg / Month
          </p>
          <p className="text-sm font-extrabold font-mono tabular-nums text-white mt-0.5">
            {summary.hasAnyTransactions
              ? `₹${formatCurrency(summary.avgMonthlySpend)}`
              : '—'}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5 truncate">
            {summary.activeMonthsCount > 0
              ? `${summary.activeMonthsCount} active ${
                  summary.activeMonthsCount === 1 ? 'mo' : 'mos'
                }`
              : 'No active months'}
          </p>
        </div>

        <div className="bg-ink-900/70 border border-white/[0.05] rounded-xl px-3 py-2.5">
          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
            Peak Month
          </p>
          <p
            className={`text-sm font-extrabold font-mono tabular-nums mt-0.5 ${
              summary.peakMonth?.isOverBudget ? 'text-red-400' : 'text-white'
            }`}
          >
            {summary.peakMonth
              ? `₹${formatCurrency(summary.peakMonth.spent)}`
              : '—'}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5 truncate">
            {summary.peakMonth ? summary.peakMonth.fullLabel : 'Waiting for data'}
          </p>
        </div>

        <div className="bg-ink-900/70 border border-white/[0.05] rounded-xl px-3 py-2.5">
          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
            On Budget
          </p>
          <p
            className={`text-sm font-extrabold font-mono tabular-nums mt-0.5 ${
              !summary.hasAnyTransactions
                ? 'text-zinc-400'
                : summary.overBudgetCount > 0
                ? 'text-orange-400'
                : 'text-brand-400'
            }`}
          >
            {summary.hasAnyTransactions
              ? `${summary.underBudgetCount}/${summary.activeMonthsCount} mos`
              : '—'}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5 truncate">
            {momDisplay ?? 'Track month over month'}
          </p>
        </div>
      </div>

      {/* Chart or Empty State */}
      {!summary.hasAnyTransactions ? (
        <div
          className="h-56 rounded-xl bg-ink-900/50 border border-dashed border-white/[0.08] flex flex-col items-center justify-center text-center px-6"
          data-testid="monthly-trends-empty"
        >
          <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5 text-zinc-500" strokeWidth={2} />
          </div>
          <p className="text-sm font-bold text-zinc-300">
            No monthly spending history yet
          </p>
          <p className="text-xs text-zinc-500 mt-1 max-w-xs">
            Check out items from Mart or save a scanned receipt in Audit to chart
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
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.38} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.06)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{
                      fill: '#71717a',
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
                      fill: '#71717a',
                      fontSize: 11,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                    axisLine={false}
                    tickLine={false}
                    width={54}
                  />
                  <Tooltip
                    cursor={{
                      stroke: 'rgba(255,255,255,0.16)',
                      strokeDasharray: '3 3',
                    }}
                    content={<CustomTrendsTooltip />}
                  />
                  {totalBudget > 0 && (
                    <ReferenceLine
                      y={totalBudget}
                      stroke="#f59e0b"
                      strokeDasharray="5 5"
                      strokeOpacity={0.8}
                      label={{
                        value: `Budget ₹${formatCompact(totalBudget)}`,
                        position: 'insideTopRight',
                        fill: '#fbbf24',
                        fontSize: 10,
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="spent"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#monthlySpendGrad)"
                    dot={{
                      r: 3.5,
                      fill: '#09090b',
                      stroke: '#10b981',
                      strokeWidth: 2,
                    }}
                    activeDot={{
                      r: 5.5,
                      fill: '#34d399',
                      stroke: '#09090b',
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
                    stroke="rgba(255,255,255,0.06)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{
                      fill: '#71717a',
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
                      fill: '#71717a',
                      fontSize: 11,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                    axisLine={false}
                    tickLine={false}
                    width={54}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    content={<CustomTrendsTooltip />}
                  />
                  {totalBudget > 0 && (
                    <ReferenceLine
                      y={totalBudget}
                      stroke="#f59e0b"
                      strokeDasharray="5 5"
                      strokeOpacity={0.8}
                      label={{
                        value: `Budget ₹${formatCompact(totalBudget)}`,
                        position: 'insideTopRight',
                        fill: '#fbbf24',
                        fontSize: 10,
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    />
                  )}
                  <Bar dataKey="spent" radius={[6, 6, 0, 0]} maxBarSize={36}>
                    {summary.points.map((entry) => (
                      <Cell
                        key={entry.monthKey}
                        fill={
                          entry.isOverBudget
                            ? '#ef4444'
                            : entry.txCount > 0
                            ? '#10b981'
                            : 'rgba(255,255,255,0.08)'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-white/[0.06] text-[11px] text-zinc-400">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-500 inline-block" />
                <span>Monthly Spend</span>
              </span>
              {chartMode === 'bar' && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                  <span>Over Budget</span>
                </span>
              )}
              {totalBudget > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-4 border-t-2 border-dashed border-amber-400 inline-block" />
                  <span>Budget Cap (₹{formatCurrency(totalBudget)})</span>
                </span>
              )}
            </div>
            {summary.overBudgetCount > 0 && (
              <span className="text-red-400 font-semibold">
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
