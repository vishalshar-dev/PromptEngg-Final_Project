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
    <div className="space-y-6">
      {/* Top Junk Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="surface-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
            This Month Junk (Non-Ess + Impulsive)
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums text-[#9E6614] mt-1.5">
            ₹{formatCurrencyExact(junkIntel.monthlyJunkSpend)}
          </p>
          <p className="text-xs text-[#697386] mt-1">
            {junkIntel.junkShareOfMonthPct}% of monthly spend
          </p>
        </div>

        <div className="surface-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
            Impulsive Purchases (Month)
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums text-[#DE5252] mt-1.5">
            ₹{formatCurrencyExact(junkIntel.monthlyImpulsiveSpend)}
          </p>
          <p className="text-xs text-[#697386] mt-1">
            All-time impulsive: ₹{formatCurrency(junkIntel.allTimeImpulsiveSpend)}
          </p>
        </div>

        <div className="surface-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
            This Week Junk
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums text-[#151922] mt-1.5">
            ₹{formatCurrencyExact(junkIntel.weeklyJunkSpend)}
          </p>
          <p className="text-xs text-[#697386] mt-1 flex items-center gap-1">
            {junkIntel.weeklyJunkChangePct === null ? (
              'No prior week baseline'
            ) : junkIntel.weeklyJunkChangePct <= 0 ? (
              <span className="text-[#15966B] flex items-center gap-0.5 font-mono font-semibold">
                <TrendingDown className="w-3 h-3" />{' '}
                {junkIntel.weeklyJunkChangePct}% vs last week
              </span>
            ) : (
              <span className="text-[#DE5252] flex items-center gap-0.5 font-mono font-semibold">
                <TrendingUp className="w-3 h-3" /> +
                {junkIntel.weeklyJunkChangePct}% vs last week
              </span>
            )}
          </p>
        </div>

        <div className="surface-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
            Essential Spend (Month)
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums text-[#15966B] mt-1.5">
            ₹{formatCurrencyExact(junkIntel.monthlyEssentialSpend)}
          </p>
          <p className="text-xs text-[#697386] mt-1">
            Core staples, fuel &amp; bills
          </p>
        </div>
      </div>

      {/* Period Comparisons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[behaviour.weekComparison, behaviour.monthComparison].map((cmp) => (
          <div key={cmp.currentLabel} className="surface-card p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-[15px] font-bold text-[#151922]">
                {cmp.currentLabel} vs {cmp.previousLabel}
              </h4>
              {cmp.junkDeltaPct !== null ? (
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border ${
                    cmp.junkDeltaPct <= 0
                      ? 'bg-[#E8F7F1] text-[#15966B] border-[#B7E4D3]'
                      : 'bg-[#FDECEC] text-[#DE5252] border-[#F6B8B8]'
                  }`}
                >
                  Junk {cmp.junkDeltaPct > 0 ? '+' : ''}
                  {cmp.junkDeltaPct}%
                </span>
              ) : (
                <span className="text-xs text-[#697386]">No prior baseline</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="surface-subtle p-2.5">
                <p className="text-[10px] text-[#697386] uppercase font-semibold">
                  Total
                </p>
                <p className="font-mono font-bold text-[#151922] tabular-nums mt-0.5">
                  ₹{formatCurrency(cmp.currentTotal)}
                </p>
                <p className="text-[11px] text-[#697386] font-mono">
                  Prev ₹{formatCurrency(cmp.previousTotal)}
                </p>
              </div>
              <div className="surface-subtle p-2.5">
                <p className="text-[10px] text-[#697386] uppercase font-semibold">
                  Essential
                </p>
                <p className="font-mono font-bold text-[#15966B] tabular-nums mt-0.5">
                  ₹{formatCurrency(cmp.currentEssential)}
                </p>
                <p className="text-[11px] text-[#697386] font-mono">
                  Prev ₹{formatCurrency(cmp.previousEssential)}
                </p>
              </div>
              <div className="surface-subtle p-2.5">
                <p className="text-[10px] text-[#697386] uppercase font-semibold">
                  Non-Ess/Imp
                </p>
                <p className="font-mono font-bold text-[#9E6614] tabular-nums mt-0.5">
                  ₹{formatCurrency(cmp.currentJunk)}
                </p>
                <p className="text-[11px] text-[#697386] font-mono">
                  Prev ₹{formatCurrency(cmp.previousJunk)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      {!hasAnyTransactions ? (
        <div className="surface-card p-6 text-center text-xs text-[#697386]">
          Record purchases to populate Essential vs Non-Essential behaviour charts and category breakdowns.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 surface-card p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-[15px] font-bold text-[#151922]">
                  Essential vs Non-Essential vs Impulsive Trend
                </h4>
                <p className="text-xs text-[#697386]">
                  Observed spending mix across{' '}
                  {timeRange === 'daily'
                    ? '14 days'
                    : timeRange === 'weekly'
                    ? '6 weeks'
                    : '6 months'}
                </p>
              </div>
              <div className="flex items-center gap-1 bg-[#F1F3F6] p-1 rounded-xl border border-[#E7EAF0]">
                {(['daily', 'weekly', 'monthly'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setTimeRange(r)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                      timeRange === r
                        ? 'bg-[#365FE8] text-white'
                        : 'text-[#697386] hover:text-[#151922]'
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
                  margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7EAF0" />
                  <XAxis
                    dataKey="label"
                    tick={{
                      fill: '#697386',
                      fontSize: 11,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  />
                  <YAxis
                    tick={{
                      fill: '#697386',
                      fontSize: 11,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(54, 95, 232, 0.05)' }}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E7EAF0',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#151922',
                      boxShadow: '0 8px 24px rgba(21,25,34,0.08)',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#4F5869' }} />
                  <Bar
                    dataKey="essential"
                    name="Essential"
                    stackId="a"
                    fill="#15966B"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="nonEssential"
                    name="Non-Essential"
                    stackId="a"
                    fill="#E5A23B"
                  />
                  <Bar
                    dataKey="impulsive"
                    name="Impulsive"
                    stackId="a"
                    fill="#DE5252"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-5 surface-card p-5 space-y-3">
            <div>
              <h4 className="text-[15px] font-bold text-[#151922]">
                Category Discretionary Breakdown
              </h4>
              <p className="text-xs text-[#697386]">
                Top categories ranked by non-essential &amp; impulsive spend
              </p>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={junkIntel.topJunkCategories.slice(0, 6)}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7EAF0" />
                  <XAxis
                    type="number"
                    tick={{
                      fill: '#697386',
                      fontSize: 11,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  />
                  <YAxis
                    dataKey="category"
                    type="category"
                    width={90}
                    tick={{ fill: '#151922', fontSize: 11 }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(54, 95, 232, 0.05)' }}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E7EAF0',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#151922',
                      boxShadow: '0 8px 24px rgba(21,25,34,0.08)',
                    }}
                  />
                  <Bar
                    dataKey="nonEssential"
                    name="Non-Essential"
                    stackId="c"
                    fill="#E5A23B"
                  />
                  <Bar
                    dataKey="impulsive"
                    name="Impulsive"
                    stackId="c"
                    fill="#DE5252"
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
            <Repeat className="w-4 h-4 text-[#DE5252]" />
            <h4 className="text-[15px] font-bold text-[#151922]">
              Spending Leakage Detector (30 Days)
            </h4>
          </div>
          <p className="text-xs text-[#697386]">
            Flags repeated discretionary items purchased at least twice in 30 days and estimates their cumulative run rate.
          </p>

          {junkIntel.leakages.length === 0 ? (
            <p className="text-xs text-[#697386] py-3">
              No repeated non-essential leakage patterns detected yet (requires 2 or more similar non-essential purchases).
            </p>
          ) : (
            <div className="divide-y divide-[#E7EAF0]">
              {junkIntel.leakages.map((leak) => (
                <div
                  key={leak.id}
                  className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3"
                >
                  <div>
                    <p className="text-xs font-bold text-[#151922]">
                      {leak.itemName}{' '}
                      <span className="text-[10px] font-bold text-[#DE5252] bg-[#FDECEC] border border-[#F6B8B8] px-1.5 py-0.5 rounded ml-1">
                        {leak.occurrences}× purchases
                      </span>
                    </p>
                    <p className="text-xs text-[#697386] mt-1">
                      {leak.category} · Avg ₹{formatCurrencyExact(leak.averageAmount)}{' '}
                      · Total ₹{formatCurrencyExact(leak.totalSpent)}
                    </p>
                  </div>
                  <div className="text-right font-mono tabular-nums shrink-0">
                    <p className="text-xs font-bold text-[#9E6614]">
                      ~₹{formatCurrency(leak.projected30DayCost)} / 30d
                    </p>
                    <p className="text-[11px] text-[#697386]">
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
                <Sparkles className="w-4 h-4 text-[#365FE8]" />
                <h4 className="text-[15px] font-bold text-[#151922]">
                  Potential Monthly Savings (Estimate)
                </h4>
              </div>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#EDF2FF] text-[#365FE8] border border-[#D4E0FF]">
                Estimate Only
              </span>
            </div>

            <p className="text-xs text-[#697386] flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#365FE8] shrink-0 mt-0.5" />
              <span>{junkIntel.potentialSavings.disclaimer}</span>
            </p>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div className="surface-subtle p-3">
                <p className="text-[10px] font-semibold text-[#697386] uppercase">
                  Conservative
                </p>
                <p className="text-base font-bold font-mono text-[#151922] tabular-nums mt-1">
                  ₹
                  {formatCurrency(
                    junkIntel.potentialSavings.conservativeMonthlySavings
                  )}
                </p>
                <p className="text-[10px] text-[#697386] mt-0.5">
                  -20% non-ess / -50% imp
                </p>
              </div>
              <div className="rounded-xl bg-[#E8F7F1] border border-[#B7E4D3] p-3">
                <p className="text-[10px] font-bold text-[#15966B] uppercase">
                  Balanced
                </p>
                <p className="text-base font-bold font-mono text-[#15966B] tabular-nums mt-1">
                  ₹
                  {formatCurrency(
                    junkIntel.potentialSavings.balancedMonthlySavings
                  )}
                </p>
                <p className="text-[10px] text-[#4F5869] mt-0.5">
                  -40% non-ess / -75% imp
                </p>
              </div>
              <div className="surface-subtle p-3">
                <p className="text-[10px] font-semibold text-[#697386] uppercase">
                  Strict Broke
                </p>
                <p className="text-base font-bold font-mono text-[#9E6614] tabular-nums mt-1">
                  ₹
                  {formatCurrency(
                    junkIntel.potentialSavings.strictMonthlySavings
                  )}
                </p>
                <p className="text-[10px] text-[#697386] mt-0.5">
                  -60% non-ess / -100% imp
                </p>
              </div>
            </div>
          </section>

          {behaviour.insights.length > 0 && (
            <section className="surface-card p-5 space-y-3">
              <h4 className="text-[15px] font-bold text-[#151922]">
                Actionable Insights
              </h4>
              <div className="space-y-2">
                {behaviour.insights.map((ins) => (
                  <div
                    key={ins.id}
                    className="surface-subtle p-3 flex items-start justify-between gap-3"
                  >
                    <div>
                      <p
                        className={`text-xs font-bold ${
                          ins.tone === 'positive'
                            ? 'text-[#15966B]'
                            : ins.tone === 'caution'
                            ? 'text-[#9E6614]'
                            : 'text-[#151922]'
                        }`}
                      >
                        {ins.title}
                      </p>
                      <p className="text-xs text-[#697386] mt-1">
                        {ins.detail}
                      </p>
                    </div>
                    {ins.metric && (
                      <span className="font-mono text-xs font-bold text-[#151922] shrink-0">
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
            <Filter className="w-4 h-4 text-[#697386]" />
            <h4 className="text-[15px] font-bold text-[#151922]">
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
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                  txFilter === val
                    ? 'bg-[#365FE8] border-[#365FE8] text-white'
                    : 'bg-[#F7F8FA] border-[#E7EAF0] text-[#697386] hover:text-[#151922]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filteredTxs.length === 0 ? (
          <p className="text-xs text-[#697386] py-3">
            No matching transactions in this filter.
          </p>
        ) : (
          <div className="divide-y divide-[#E7EAF0] max-h-96 overflow-y-auto scrollbar-thin pr-1">
            {filteredTxs.map((item) => (
              <div
                key={item.transaction.id}
                className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-bold text-[#151922] truncate">
                      {item.transaction.name}
                    </p>
                    <span className="text-xs font-mono font-bold text-[#151922]">
                      ₹{formatCurrencyExact(item.effectiveAmount)}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#F1F3F6] text-[#4F5869] border border-[#E7EAF0]">
                      {item.transaction.category}
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                        item.classificationSource === 'user'
                          ? 'bg-[#E8F7F1] text-[#15966B] border-[#B7E4D3]'
                          : 'bg-[#EDF2FF] text-[#365FE8] border-[#D4E0FF]'
                      }`}
                    >
                      {item.classificationSource === 'user'
                        ? 'Confirmed by User'
                        : 'Predicted'}
                    </span>
                  </div>
                  <p className="text-xs text-[#697386] mt-1">
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
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          active
                            ? cls === 'essential'
                              ? 'bg-[#E8F7F1] border-[#B7E4D3] text-[#15966B]'
                              : cls === 'impulsive'
                              ? 'bg-[#FDECEC] border-[#F6B8B8] text-[#DE5252]'
                              : 'bg-[#FEF6E7] border-[#F3D8A8] text-[#9E6614]'
                            : 'bg-[#F7F8FA] border-[#E7EAF0] text-[#697386] hover:text-[#151922]'
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
