import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  Repeat,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Info,
  Filter,
} from 'lucide-react';
import type { SpendingClassification } from '../../types/models';
import { useAppStore } from '../../store/useStore';
import { formatCurrency, formatCurrencyExact } from '../../utils/categoryStyles';
import { getChartThemeTokens } from '../../utils/settingsEngine';
import type {
  BehaviourAnalyticsSummary,
  ClassifiedTransaction,
  JunkIntelligenceSummary,
} from '../../utils/warRoomEngine';

interface JunkBehaviourPanelProps {
  junkIntel: JunkIntelligenceSummary;
  behaviour: BehaviourAnalyticsSummary;
  classifiedTxs: ClassifiedTransaction[];
  onReclassify: (txId: string, classification: SpendingClassification) => void;
}

type BehaviourTimeRange = 'daily' | 'weekly' | 'monthly';
type TxFilter = 'all' | SpendingClassification | 'predicted' | 'user';

export function JunkBehaviourPanel({
  junkIntel,
  behaviour,
  classifiedTxs,
  onReclassify,
}: JunkBehaviourPanelProps) {
  const theme = useAppStore((s) => s.theme);
  const visualTheme = useAppStore((s) => s.visualTheme);
  const chartTokens = getChartThemeTokens(theme, visualTheme.mood);
  const [timeRange, setTimeRange] = useState<BehaviourTimeRange>('weekly');
  const [txFilter, setTxFilter] = useState<TxFilter>('all');

  const timeSeries = useMemo(() => {
    if (timeRange === 'daily') return behaviour.dailySeries;
    if (timeRange === 'monthly') return behaviour.monthlySeries;
    return behaviour.weeklySeries;
  }, [timeRange, behaviour]);

  const filteredTxs = useMemo(() => {
    return classifiedTxs.filter((item) => {
      if (txFilter === 'all') return true;
      if (txFilter === 'predicted' || txFilter === 'user') {
        return item.classificationSource === txFilter;
      }
      return item.classification === txFilter;
    });
  }, [classifiedTxs, txFilter]);

  const hasAnyTransactions = classifiedTxs.length > 0;

  const formatAxisCurrency = (v: number) =>
    v >= 1000 ? `₹${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : `₹${v}`;

  return (
    <div className="space-y-6">
      {/* Top Junk Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="surface-card p-4">
          <p className="text-[12px] font-medium text-[var(--text-secondary)]">
            This Month Junk
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums text-[var(--accent-warning-ink)] mt-1.5">
            ₹{formatCurrencyExact(junkIntel.monthlyJunkSpend)}
          </p>
          <p className="text-[12px] text-[var(--text-secondary)] mt-1">
            {junkIntel.junkShareOfMonthPct}% of monthly spend
          </p>
        </div>

        <div className="surface-card p-4">
          <p className="text-[12px] font-medium text-[var(--text-secondary)]">
            Impulsive (Month)
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums text-[var(--accent-danger-ink)] mt-1.5">
            ₹{formatCurrencyExact(junkIntel.monthlyImpulsiveSpend)}
          </p>
          <p className="text-[12px] text-[var(--text-secondary)] mt-1 tabular-nums">
            All-time impulsive: ₹{formatCurrency(junkIntel.allTimeImpulsiveSpend)}
          </p>
        </div>

        <div className="surface-card p-4">
          <p className="text-[12px] font-medium text-[var(--text-secondary)]">
            This Week Junk
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums text-[var(--text-primary)] mt-1.5">
            ₹{formatCurrencyExact(junkIntel.weeklyJunkSpend)}
          </p>
          <p className="text-[12px] text-[var(--text-secondary)] mt-1 flex items-center gap-1">
            {junkIntel.weeklyJunkChangePct === null ? (
              'No prior week baseline'
            ) : junkIntel.weeklyJunkChangePct <= 0 ? (
              <span className="text-[var(--accent-success-ink)] flex items-center gap-0.5 font-mono font-semibold tabular-nums">
                <TrendingDown className="w-3 h-3" />{' '}
                {junkIntel.weeklyJunkChangePct}% vs last week
              </span>
            ) : (
              <span className="text-[var(--accent-danger-ink)] flex items-center gap-0.5 font-mono font-semibold tabular-nums">
                <TrendingUp className="w-3 h-3" /> +
                {junkIntel.weeklyJunkChangePct}% vs last week
              </span>
            )}
          </p>
        </div>

        <div className="surface-card p-4">
          <p className="text-[12px] font-medium text-[var(--text-secondary)]">
            Essential Spend (Month)
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums text-[var(--accent-success-ink)] mt-1.5">
            ₹{formatCurrencyExact(junkIntel.monthlyEssentialSpend)}
          </p>
          <p className="text-[12px] text-[var(--text-secondary)] mt-1">
            Core staples, fuel &amp; bills
          </p>
        </div>
      </div>

      {/* Period Comparisons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[behaviour.weekComparison, behaviour.monthComparison].map((cmp) => (
          <div key={cmp.currentLabel} className="surface-card p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-display text-[15px] font-bold text-[var(--text-primary)]">
                {cmp.currentLabel} vs {cmp.previousLabel}
              </h4>
              {cmp.junkDeltaPct !== null ? (
                <span
                  className={`text-[12px] font-mono tabular-nums font-bold px-2 py-0.5 rounded-md border ${
                    cmp.junkDeltaPct <= 0
                      ? 'bg-[var(--accent-success-soft)] text-[var(--accent-success-ink)] border-[var(--accent-success-border)]'
                      : 'bg-[var(--accent-danger-soft)] text-[var(--accent-danger-ink)] border-[var(--accent-danger-border)]'
                  }`}
                >
                  Junk {cmp.junkDeltaPct > 0 ? '+' : ''}
                  {cmp.junkDeltaPct}%
                </span>
              ) : (
                <span className="text-[12px] text-[var(--text-secondary)]">No prior baseline</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 text-[12px]">
              <div className="surface-well p-2.5">
                <p className="text-[12px] text-[var(--text-secondary)] font-medium">
                  Total
                </p>
                <p className="font-mono font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
                  ₹{formatCurrency(cmp.currentTotal)}
                </p>
                <p className="text-[12px] text-[var(--text-secondary)] font-mono tabular-nums">
                  Prev ₹{formatCurrency(cmp.previousTotal)}
                </p>
              </div>
              <div className="surface-well p-2.5">
                <p className="text-[12px] text-[var(--text-secondary)] font-medium">
                  Essential
                </p>
                <p className="font-mono font-bold text-[var(--accent-success-ink)] tabular-nums mt-0.5">
                  ₹{formatCurrency(cmp.currentEssential)}
                </p>
                <p className="text-[12px] text-[var(--text-secondary)] font-mono tabular-nums">
                  Prev ₹{formatCurrency(cmp.previousEssential)}
                </p>
              </div>
              <div className="surface-well p-2.5">
                <p className="text-[12px] text-[var(--text-secondary)] font-medium">
                  Non-Ess/Imp
                </p>
                <p className="font-mono font-bold text-[var(--accent-warning-ink)] tabular-nums mt-0.5">
                  ₹{formatCurrency(cmp.currentJunk)}
                </p>
                <p className="text-[12px] text-[var(--text-secondary)] font-mono tabular-nums">
                  Prev ₹{formatCurrency(cmp.previousJunk)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      {!hasAnyTransactions ? (
        <div className="surface-card p-6 text-center text-[12.5px] text-[var(--text-secondary)]">
          Record purchases to populate Essential vs Non-Essential behaviour charts and category breakdowns.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 surface-card p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="font-display text-[15px] font-bold text-[var(--text-primary)]">
                  Essential vs Non-Essential vs Impulsive Trend
                </h4>
                <p className="text-[12px] text-[var(--text-secondary)]">
                  Observed spending mix across{' '}
                  {timeRange === 'daily'
                    ? '14 days'
                    : timeRange === 'weekly'
                    ? '6 weeks'
                    : '6 months'}
                </p>
              </div>
              <div className="tactile-well flex items-center gap-1 bg-[var(--bg-well)] p-1 rounded-xl border border-[var(--border-subtle)]">
                {(['daily', 'weekly', 'monthly'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setTimeRange(r)}
                    className={`px-2.5 py-1 rounded-lg text-[12px] font-semibold capitalize transition-colors ${
                      timeRange === r
                        ? 'bg-[var(--accent-primary)] text-white'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={timeSeries}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTokens.gridStroke} />
                  <XAxis
                    dataKey="label"
                    tick={{
                      fill: chartTokens.tickColor,
                      fontSize: 11,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  />
                  <YAxis
                    width={58}
                    tickFormatter={formatAxisCurrency}
                    tick={{
                      fill: chartTokens.tickColor,
                      fontSize: 11,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  />
                  <Tooltip
                    cursor={{ fill: chartTokens.cursorFill }}
                    contentStyle={chartTokens.tooltipStyle}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', color: chartTokens.tickColor }} />
                  <Bar
                    dataKey="essential"
                    name="Essential"
                    stackId="a"
                    fill={chartTokens.success}
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="nonEssential"
                    name="Non-Essential"
                    stackId="a"
                    fill={chartTokens.warning}
                  />
                  <Bar
                    dataKey="impulsive"
                    name="Impulsive"
                    stackId="a"
                    fill={chartTokens.danger}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-5 surface-card p-5 space-y-3">
            <div>
              <h4 className="font-display text-[15px] font-bold text-[var(--text-primary)]">
                Category Discretionary Breakdown
              </h4>
              <p className="text-[12px] text-[var(--text-secondary)]">
                Top categories ranked by non-essential &amp; impulsive spend
              </p>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={junkIntel.topJunkCategories.slice(0, 6)}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTokens.gridStroke} />
                  <XAxis
                    type="number"
                    tickFormatter={formatAxisCurrency}
                    tick={{
                      fill: chartTokens.tickColor,
                      fontSize: 11,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  />
                  <YAxis
                    dataKey="category"
                    type="category"
                    width={92}
                    tick={{ fill: chartTokens.tickColor, fontSize: 11 }}
                  />
                  <Tooltip
                    cursor={{ fill: chartTokens.cursorFill }}
                    contentStyle={chartTokens.tooltipStyle}
                  />
                  <Bar
                    dataKey="nonEssential"
                    name="Non-Essential"
                    stackId="c"
                    fill={chartTokens.warning}
                  />
                  <Bar
                    dataKey="impulsive"
                    name="Impulsive"
                    stackId="c"
                    fill={chartTokens.danger}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Leakage Detector & Estimated Potential Savings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-6 surface-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-[var(--accent-danger-ink)]" />
            <h4 className="font-display text-[15px] font-bold text-[var(--text-primary)]">
              Spending Leakage Detector (30 Days)
            </h4>
          </div>
          <p className="text-[12px] text-[var(--text-secondary)]">
            Flags repeated discretionary items purchased at least twice in 30 days and estimates their cumulative run rate.
          </p>

          {junkIntel.leakages.length === 0 ? (
            <p className="text-[12px] text-[var(--text-secondary)] py-3">
              No repeated non-essential leakage patterns detected yet (requires 2 or more similar non-essential purchases).
            </p>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {junkIntel.leakages.map((leak) => (
                <div
                  key={leak.id}
                  className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3"
                >
                  <div>
                    <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                      {leak.itemName}{' '}
                      <span className="text-[12px] font-semibold text-[var(--accent-danger-ink)] ml-1.5">
                        · {leak.occurrences}× purchases
                      </span>
                    </p>
                    <p className="text-[12px] text-[var(--text-secondary)] mt-1 tabular-nums">
                      {leak.category} · Avg ₹{formatCurrencyExact(leak.averageAmount)}{' '}
                      · Total ₹{formatCurrencyExact(leak.totalSpent)}
                    </p>
                  </div>
                  <div className="text-right font-mono tabular-nums shrink-0">
                    <p className="text-[12.5px] font-bold text-[var(--accent-warning-ink)]">
                      ~₹{formatCurrency(leak.projected30DayCost)} / 30d
                    </p>
                    <p className="text-[12px] text-[var(--text-secondary)]">
                      ~₹{formatCurrency(leak.projectedWeeklyCost)} / wk est.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="lg:col-span-6 space-y-5">
          <section className="surface-card p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--accent-ink)]" />
                <h4 className="font-display text-[15px] font-bold text-[var(--text-primary)]">
                  Potential Monthly Savings (Estimate)
                </h4>
              </div>
              <span className="text-[12px] font-semibold text-[var(--accent-ink)]">
                Estimate Only
              </span>
            </div>

            <p className="text-[12px] text-[var(--text-secondary)] flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-[var(--accent-ink)] shrink-0 mt-0.5" />
              <span>{junkIntel.potentialSavings.disclaimer}</span>
            </p>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div className="surface-well p-3">
                <p className="text-[12px] font-medium text-[var(--text-secondary)]">
                  Conservative
                </p>
                <p className="text-base font-bold font-mono text-[var(--text-primary)] tabular-nums mt-1">
                  ₹
                  {formatCurrency(
                    junkIntel.potentialSavings.conservativeMonthlySavings
                  )}
                </p>
                <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                  -20% non-ess / -50% imp
                </p>
              </div>
              <div className="rounded-xl bg-[var(--accent-success-soft)] border border-[var(--accent-success-border)] p-3">
                <p className="text-[12px] font-semibold text-[var(--accent-success-ink)]">
                  Balanced
                </p>
                <p className="text-base font-bold font-mono text-[var(--accent-success-ink)] tabular-nums mt-1">
                  ₹
                  {formatCurrency(
                    junkIntel.potentialSavings.balancedMonthlySavings
                  )}
                </p>
                <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">
                  -40% non-ess / -75% imp
                </p>
              </div>
              <div className="surface-well p-3">
                <p className="text-[12px] font-medium text-[var(--text-secondary)]">
                  Strict Broke
                </p>
                <p className="text-base font-bold font-mono text-[var(--accent-warning-ink)] tabular-nums mt-1">
                  ₹
                  {formatCurrency(
                    junkIntel.potentialSavings.strictMonthlySavings
                  )}
                </p>
                <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                  -60% non-ess / -100% imp
                </p>
              </div>
            </div>
          </section>

          {behaviour.insights.length > 0 && (
            <section className="surface-card p-5 space-y-3">
              <h4 className="font-display text-[15px] font-bold text-[var(--text-primary)]">
                Actionable Insights
              </h4>
              <div className="space-y-2">
                {behaviour.insights.map((ins) => (
                  <div
                    key={ins.id}
                    className="surface-well p-3 flex items-start justify-between gap-3"
                  >
                    <div>
                      <p
                        className={`text-[12.5px] font-bold ${
                          ins.tone === 'positive'
                            ? 'text-[var(--accent-success-ink)]'
                            : ins.tone === 'caution'
                            ? 'text-[var(--accent-warning-ink)]'
                            : 'text-[var(--text-primary)]'
                        }`}
                      >
                        {ins.title}
                      </p>
                      <p className="text-[12px] text-[var(--text-secondary)] mt-1">
                        {ins.detail}
                      </p>
                    </div>
                    {ins.metric && (
                      <span className="font-mono tabular-nums text-[12px] font-bold text-[var(--text-primary)] shrink-0">
                        {ins.metric}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Classification Review Table */}
      <section className="surface-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--text-secondary)]" />
            <h4 className="font-display text-[15px] font-bold text-[var(--text-primary)]">
              Expense Classification Ledger ({filteredTxs.length})
            </h4>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['all', 'All'],
                ['essential', 'Essential'],
                ['non_essential', 'Non-Essential'],
                ['impulsive', 'Impulsive'],
                ['predicted', 'Auto-Predicted'],
                ['user', 'User Confirmed'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setTxFilter(val)}
                className={`px-2.5 py-1 rounded-lg text-[12px] font-semibold border transition-colors ${
                  txFilter === val
                    ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white'
                    : 'bg-[var(--bg-well)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filteredTxs.length === 0 ? (
          <p className="text-[12.5px] text-[var(--text-secondary)] py-3">
            No matching transactions in this filter.
          </p>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)] max-h-96 overflow-y-auto scrollbar-thin pr-1">
            {filteredTxs.map((item) => (
              <div
                key={item.transaction.id}
                className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
                      {item.transaction.name}
                    </p>
                    <span className="text-[12.5px] font-mono tabular-nums font-bold text-[var(--text-primary)]">
                      ₹{formatCurrencyExact(item.effectiveAmount)}
                    </span>
                    <span className="text-[12px] text-[var(--text-secondary)]">
                      · {item.transaction.category}
                    </span>
                    <span
                      className={`text-[12px] font-semibold ${
                        item.classificationSource === 'user'
                          ? 'text-[var(--accent-success-ink)]'
                          : 'text-[var(--accent-ink)]'
                      }`}
                    >
                      · {item.classificationSource === 'user'
                        ? 'Confirmed by User'
                        : 'Predicted'}
                    </span>
                  </div>
                  <p className="text-[12px] text-[var(--text-secondary)] mt-1">
                    {new Date(item.transaction.timestamp).toLocaleDateString(
                      'en-IN',
                      {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }
                    )}{' '}
                    · {item.reason}
                  </p>
                </div>

                {/* 1-Click Reclassify Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {(
                    [
                      ['essential', 'Essential'],
                      ['non_essential', 'Non-Essential'],
                      ['impulsive', 'Impulsive'],
                    ] as const
                  ).map(([cls, lbl]) => {
                    const active = item.classification === cls;
                    return (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => onReclassify(item.transaction.id, cls)}
                        className={`px-2.5 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors ${
                          active
                            ? cls === 'essential'
                              ? 'bg-[var(--accent-success-soft)] border-[var(--accent-success-border)] text-[var(--accent-success-ink)]'
                              : cls === 'impulsive'
                              ? 'bg-[var(--accent-danger-soft)] border-[var(--accent-danger-border)] text-[var(--accent-danger-ink)]'
                              : 'bg-[var(--accent-warning-soft)] border-[var(--accent-warning-border)] text-[var(--accent-warning-ink)]'
                            : 'bg-[var(--bg-well)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {lbl}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
