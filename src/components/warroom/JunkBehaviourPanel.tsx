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
import { formatCurrency, formatCurrencyExact } from '../../utils/categoryStyles';
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

  return (
    <div className="space-y-5">
      {/* Top Junk Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            This Month Junk (Non-Ess + Impulsive)
          </p>
          <p className="text-2xl font-extrabold font-mono tabular-nums text-amber-300 mt-1.5">
            ₹{formatCurrencyExact(junkIntel.monthlyJunkSpend)}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">
            {junkIntel.junkShareOfMonthPct}% of monthly spend
          </p>
        </div>

        <div className="glass rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Impulsive Purchases (Month)
          </p>
          <p className="text-2xl font-extrabold font-mono tabular-nums text-rose-400 mt-1.5">
            ₹{formatCurrencyExact(junkIntel.monthlyImpulsiveSpend)}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">
            All-time impulsive: ₹{formatCurrency(junkIntel.allTimeImpulsiveSpend)}
          </p>
        </div>

        <div className="glass rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            This Week Junk
          </p>
          <p className="text-2xl font-extrabold font-mono tabular-nums text-white mt-1.5">
            ₹{formatCurrencyExact(junkIntel.weeklyJunkSpend)}
          </p>
          <p className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
            {junkIntel.weeklyJunkChangePct === null ? (
              'No prior week baseline'
            ) : junkIntel.weeklyJunkChangePct <= 0 ? (
              <span className="text-brand-400 flex items-center gap-0.5 font-mono">
                <TrendingDown className="w-3 h-3" /> {junkIntel.weeklyJunkChangePct}% vs last week
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-0.5 font-mono">
                <TrendingUp className="w-3 h-3" /> +{junkIntel.weeklyJunkChangePct}% vs last week
              </span>
            )}
          </p>
        </div>

        <div className="glass rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Essential Spend (Month)
          </p>
          <p className="text-2xl font-extrabold font-mono tabular-nums text-brand-400 mt-1.5">
            ₹{formatCurrencyExact(junkIntel.monthlyEssentialSpend)}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">
            Core staples, fuel & bills
          </p>
        </div>
      </div>

      {/* Period Comparisons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[behaviour.weekComparison, behaviour.monthComparison].map((cmp) => (
          <div key={cmp.currentLabel} className="glass rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-extrabold text-white">
                {cmp.currentLabel} vs {cmp.previousLabel}
              </h4>
              {cmp.junkDeltaPct !== null ? (
                <span
                  className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                    cmp.junkDeltaPct <= 0
                      ? 'bg-brand-500/15 text-brand-300 border-brand-500/30'
                      : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  }`}
                >
                  Junk {cmp.junkDeltaPct > 0 ? '+' : ''}
                  {cmp.junkDeltaPct}%
                </span>
              ) : (
                <span className="text-[11px] text-zinc-500">No prior baseline</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-bold">Total</p>
                <p className="font-mono font-extrabold text-white tabular-nums">
                  ₹{formatCurrency(cmp.currentTotal)}
                </p>
                <p className="text-[10px] text-zinc-500 font-mono">
                  Prev ₹{formatCurrency(cmp.previousTotal)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-bold">Essential</p>
                <p className="font-mono font-extrabold text-brand-400 tabular-nums">
                  ₹{formatCurrency(cmp.currentEssential)}
                </p>
                <p className="text-[10px] text-zinc-500 font-mono">
                  Prev ₹{formatCurrency(cmp.previousEssential)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-bold">Non-Ess/Imp</p>
                <p className="font-mono font-extrabold text-amber-300 tabular-nums">
                  ₹{formatCurrency(cmp.currentJunk)}
                </p>
                <p className="text-[10px] text-zinc-500 font-mono">
                  Prev ₹{formatCurrency(cmp.previousJunk)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      {!hasAnyTransactions ? (
        <div className="glass rounded-2xl p-6 text-center text-xs text-zinc-500">
          Record purchases to populate Essential vs Non-Essential behaviour charts and category breakdowns.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Chart 1: Behaviour Trend Stacked Bars */}
          <div className="lg:col-span-7 glass rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-extrabold text-white">
                  Essential vs Non-Essential vs Impulsive Trend
                </h4>
                <p className="text-[11px] text-zinc-500">
                  Observed spending mix across {timeRange === 'daily' ? '14 days' : timeRange === 'weekly' ? '6 weeks' : '6 months'}
                </p>
              </div>
              <div className="flex items-center gap-1 bg-ink-900 p-1 rounded-xl border border-white/[0.06]">
                {(['daily', 'weekly', 'monthly'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setTimeRange(r)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-colors ${
                      timeRange === r
                        ? 'bg-white/[0.12] text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeSeries} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111116',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="essential" name="Essential" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="nonEssential" name="Non-Essential" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="impulsive" name="Impulsive" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Top Junk Categories */}
          <div className="lg:col-span-5 glass rounded-2xl p-4 space-y-3">
            <div>
              <h4 className="text-sm font-extrabold text-white">
                Category Discretionary Breakdown
              </h4>
              <p className="text-[11px] text-zinc-500">
                Top categories ranked by non-essential & impulsive spend
              </p>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={junkIntel.topJunkCategories.slice(0, 6)}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <YAxis
                    dataKey="category"
                    type="category"
                    width={90}
                    tick={{ fill: '#e4e4e7', fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111116',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="nonEssential" name="Non-Essential" stackId="c" fill="#f59e0b" />
                  <Bar dataKey="impulsive" name="Impulsive" stackId="c" fill="#f43f5e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Leakage Detector & Estimated Potential Savings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Leakage Detector */}
        <section className="lg:col-span-6 glass rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-rose-400" />
            <h4 className="text-sm font-extrabold text-white">
              Spending Leakage Detector (30 Days)
            </h4>
          </div>
          <p className="text-[11px] text-zinc-500">
            Flags repeated discretionary items purchased at least twice in 30 days and estimates their cumulative run rate.
          </p>

          {junkIntel.leakages.length === 0 ? (
            <p className="text-xs text-zinc-500 py-4">
              No repeated non-essential leakage patterns detected yet (requires 2 or more similar non-essential purchases).
            </p>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {junkIntel.leakages.map((leak) => (
                <div key={leak.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-extrabold text-white">
                      {leak.itemName}{' '}
                      <span className="text-[10px] font-bold text-rose-300 bg-rose-500/15 px-1.5 py-0.5 rounded ml-1">
                        {leak.occurrences}× purchases
                      </span>
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      {leak.category} · Avg ₹{formatCurrencyExact(leak.averageAmount)} · Total ₹
                      {formatCurrencyExact(leak.totalSpent)}
                    </p>
                  </div>
                  <div className="text-right font-mono tabular-nums flex-shrink-0">
                    <p className="text-xs font-extrabold text-amber-300">
                      ~₹{formatCurrency(leak.projected30DayCost)} / 30d
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      ~₹{formatCurrency(leak.projectedWeeklyCost)} / wk est.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Estimated Potential Savings & Behavioural Insights */}
        <div className="lg:col-span-6 space-y-4">
          <section className="glass rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-400" />
                <h4 className="text-sm font-extrabold text-white">
                  Potential Monthly Savings (Estimate)
                </h4>
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                Estimate Only
              </span>
            </div>

            <p className="text-[11px] text-zinc-400 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-sky-400 flex-shrink-0 mt-0.5" />
              <span>{junkIntel.potentialSavings.disclaimer}</span>
            </p>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div className="rounded-xl bg-ink-900/70 border border-white/[0.06] p-3">
                <p className="text-[10px] font-bold text-zinc-400 uppercase">Conservative</p>
                <p className="text-base font-extrabold font-mono text-white tabular-nums mt-1">
                  ₹{formatCurrency(junkIntel.potentialSavings.conservativeMonthlySavings)}
                </p>
                <p className="text-[10px] text-zinc-500 mt-0.5">-20% non-ess / -50% imp</p>
              </div>
              <div className="rounded-xl bg-brand-500/10 border border-brand-500/25 p-3">
                <p className="text-[10px] font-bold text-brand-300 uppercase">Balanced</p>
                <p className="text-base font-extrabold font-mono text-brand-400 tabular-nums mt-1">
                  ₹{formatCurrency(junkIntel.potentialSavings.balancedMonthlySavings)}
                </p>
                <p className="text-[10px] text-zinc-400 mt-0.5">-40% non-ess / -75% imp</p>
              </div>
              <div className="rounded-xl bg-ink-900/70 border border-white/[0.06] p-3">
                <p className="text-[10px] font-bold text-zinc-400 uppercase">Strict Broke</p>
                <p className="text-base font-extrabold font-mono text-amber-300 tabular-nums mt-1">
                  ₹{formatCurrency(junkIntel.potentialSavings.strictMonthlySavings)}
                </p>
                <p className="text-[10px] text-zinc-500 mt-0.5">-60% non-ess / -100% imp</p>
              </div>
            </div>
          </section>

          {/* Actionable Behavioural Insights */}
          {behaviour.insights.length > 0 && (
            <section className="glass rounded-2xl p-4 space-y-2.5">
              <h4 className="text-sm font-extrabold text-white">Actionable Insights</h4>
              <div className="space-y-2">
                {behaviour.insights.map((ins) => (
                  <div
                    key={ins.id}
                    className="rounded-xl bg-ink-900/60 border border-white/[0.06] p-3 flex items-start justify-between gap-3"
                  >
                    <div>
                      <p
                        className={`text-xs font-extrabold ${
                          ins.tone === 'positive'
                            ? 'text-brand-300'
                            : ins.tone === 'caution'
                            ? 'text-amber-300'
                            : 'text-white'
                        }`}
                      >
                        {ins.title}
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-1">{ins.detail}</p>
                    </div>
                    {ins.metric && (
                      <span className="font-mono text-xs font-extrabold text-zinc-200 flex-shrink-0">
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
      <section className="glass rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-400" />
            <h4 className="text-sm font-extrabold text-white">
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
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                  txFilter === val
                    ? 'bg-brand-500/20 border-brand-500/40 text-brand-300'
                    : 'bg-ink-900 border-white/[0.06] text-zinc-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filteredTxs.length === 0 ? (
          <p className="text-xs text-zinc-500 py-4">No matching transactions in this filter.</p>
        ) : (
          <div className="divide-y divide-white/[0.06] max-h-96 overflow-y-auto scrollbar-thin pr-1">
            {filteredTxs.map((item) => (
              <div
                key={item.transaction.id}
                className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-bold text-white truncate">
                      {item.transaction.name}
                    </p>
                    <span className="text-[10px] font-mono font-bold text-zinc-300">
                      ₹{formatCurrencyExact(item.effectiveAmount)}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/[0.05] text-zinc-400">
                      {item.transaction.category}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                        item.classificationSource === 'user'
                          ? 'bg-brand-500/15 text-brand-300 border-brand-500/30'
                          : 'bg-sky-500/10 text-sky-300 border-sky-500/25'
                      }`}
                    >
                      {item.classificationSource === 'user' ? 'Confirmed by User' : 'Predicted'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    {new Date(item.transaction.timestamp).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    · {item.reason}
                  </p>
                </div>

                {/* 1-Click Reclassify Buttons */}
                <div className="flex items-center gap-1 flex-shrink-0">
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
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                          active
                            ? cls === 'essential'
                              ? 'bg-brand-500/20 border-brand-500/45 text-brand-300'
                              : cls === 'impulsive'
                              ? 'bg-rose-500/20 border-rose-500/45 text-rose-300'
                              : 'bg-amber-500/20 border-amber-500/45 text-amber-300'
                            : 'bg-ink-900 border-white/[0.06] text-zinc-400 hover:text-white'
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
