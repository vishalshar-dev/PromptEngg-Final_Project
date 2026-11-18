import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Check,
  Info,
  Pencil,
  PieChart as PieChartIcon,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { formatCurrency, formatCurrencyExact, getCategoryStyle } from '../../utils/categoryStyles';
import type {
  RadarCategoryAnalyticsResult,
  RadarFinancialInsight,
  RadarOverviewMetrics,
  RadarSpendingAnomaly,
} from '../../utils/radarEngine';
import { MonthlyTrendsChart } from '../analytics/MonthlyTrendsChart';

export type RadarTabSection =
  | 'overview'
  | 'categories'
  | 'trends'
  | 'budgets'
  | 'explorer';

interface RadarOverviewTabProps {
  overview: RadarOverviewMetrics;
  categoriesResult: RadarCategoryAnalyticsResult;
  anomalies: RadarSpendingAnomaly[];
  insights: RadarFinancialInsight[];
  onNavigateSection: (section: RadarTabSection) => void;
  onInspectCategory: (category: string) => void;
}

export function RadarOverviewTab({
  overview,
  categoriesResult,
  anomalies,
  insights,
  onNavigateSection,
  onInspectCategory,
}: RadarOverviewTabProps) {
  const totalBudget = useAppStore((s) => s.totalBudget);
  const setTotalBudget = useAppStore((s) => s.setTotalBudget);

  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const budgetInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingBudget) {
      setBudgetInput(String(totalBudget));
      setTimeout(() => budgetInputRef.current?.focus(), 40);
    }
  }, [editingBudget, totalBudget]);

  const handleBudgetSave = () => {
    const val = Number(budgetInput);
    if (budgetInput && Number.isFinite(val) && val > 0) {
      setTotalBudget(val);
    }
    setEditingBudget(false);
  };

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const cappedPct = Math.min(overview.budgetUtilisationPct, 100);
  const strokeOffset = circumference - (cappedPct / 100) * circumference;
  const isWarning =
    !overview.isOverMonthlyBudget && overview.budgetUtilisationPct >= 80;
  const statusColor = overview.isOverMonthlyBudget
    ? '#DE5252'
    : isWarning
      ? '#E5A23B'
      : '#15966B';

  const topCategories = categoriesResult.categories
    .filter((c) => c.totalSpent > 0)
    .slice(0, 6);

  return (
    <div className="space-y-5">
      {/* Window Summary Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-[#E7EAF0] text-xs text-[#697386]">
        <span className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-[#365FE8] shrink-0" />
          <span>
            Active Window: <strong className="text-[#151922]">{overview.window.label}</strong> · Comparing against{' '}
            <strong className="text-[#151922]">{overview.window.comparisonLabel}</strong>
          </span>
        </span>
        <span className="text-[11px] text-[#929BAB]">
          Expenditure &amp; budget analytics
        </span>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        <OverviewKpiCard
          label="Total Expenditure"
          value={`₹${formatCurrencyExact(overview.totalSpent)}`}
          deltaPct={overview.spendDeltaPct}
          deltaSub={
            overview.prevTotalSpent > 0
              ? `${overview.spendDeltaAmount >= 0 ? '+' : '-'}₹${formatCurrencyExact(Math.abs(overview.spendDeltaAmount))} vs prior`
              : 'No prior baseline'
          }
          invertDeltaSemantics
          icon={Wallet}
        />

        <OverviewKpiCard
          label="Average Daily Spend"
          value={`₹${formatCurrencyExact(overview.avgDailySpend)}`}
          deltaPct={overview.avgDailyDeltaPct}
          deltaSub={`Across ${overview.window.elapsedDays} ${overview.window.elapsedDays === 1 ? 'day' : 'days'}`}
          invertDeltaSemantics
          icon={TrendingUp}
        />

        <OverviewKpiCard
          label="Transactions"
          value={String(overview.txCount)}
          deltaPct={overview.txCountDeltaPct}
          deltaSub={
            overview.txCount > 0
              ? `Avg ₹${formatCurrencyExact(overview.avgTxValue)} / txn`
              : 'No active expenses'
          }
          icon={Activity}
        />

        <div className="surface-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
              Highest Category
            </span>
            <PieChartIcon className="w-4 h-4 text-[#929BAB]" />
          </div>
          {overview.highestCategory ? (
            <div className="mt-2">
              <p className="text-lg font-bold text-[#151922] truncate">
                {overview.highestCategory.category}
              </p>
              <div className="flex items-center justify-between gap-2 mt-1 text-xs">
                <span className="font-mono tabular-nums font-bold text-[#365FE8]">
                  ₹{formatCurrencyExact(overview.highestCategory.amount)}
                </span>
                <span className="text-[#697386] font-mono tabular-nums">
                  {overview.highestCategory.sharePct}% share
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-2">
              <p className="text-base font-semibold text-[#697386]">No spending yet</p>
              <p className="text-xs text-[#929BAB] mt-0.5">Select a wider range or add expenses</p>
            </div>
          )}
        </div>

        <div className="surface-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
              Monthly Budget Used
            </span>
            <span
              className={`text-xs font-semibold ${
                overview.isOverMonthlyBudget
                  ? 'text-[#DE5252]'
                  : isWarning
                    ? 'text-[#9E6614]'
                    : 'text-[#15966B]'
              }`}
            >
              {overview.isOverMonthlyBudget
                ? 'Over Budget'
                : isWarning
                  ? 'Approaching'
                  : 'On Track'}
            </span>
          </div>
          <div className="mt-2">
            <p
              className={`text-2xl font-bold font-mono tabular-nums ${
                overview.isOverMonthlyBudget ? 'text-[#DE5252]' : 'text-[#151922]'
              }`}
            >
              {overview.budgetUtilisationPct}%
            </p>
            <p className="text-xs text-[#697386] mt-1 font-mono tabular-nums">
              ₹{formatCurrencyExact(overview.currentMonthSpent)} / ₹{formatCurrency(overview.monthlyBudget)}
            </p>
          </div>
        </div>

        <div className="surface-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
              Remaining Budget
            </span>
            <button
              type="button"
              onClick={() => onNavigateSection('budgets')}
              className="text-xs font-semibold text-[#365FE8] hover:text-[#294FCC] transition-colors whitespace-nowrap shrink-0"
            >
              Monitor Caps
            </button>
          </div>
          <div className="mt-2">
            <p
              className={`text-2xl font-bold font-mono tabular-nums ${
                overview.isOverMonthlyBudget ? 'text-[#DE5252]' : 'text-[#15966B]'
              }`}
            >
              {overview.remainingBudget < 0 ? '-' : ''}₹
              {formatCurrencyExact(Math.abs(overview.remainingBudget))}
            </p>
            <p className="text-xs text-[#697386] mt-1">
              {overview.isOverMonthlyBudget
                ? 'Exceeded current monthly budget'
                : 'Available for rest of month'}
            </p>
          </div>
        </div>
      </div>

      {/* Main 2-Column Analytical Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Monthly Budget Ring Card */}
        <div className="lg:col-span-5 surface-card p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
                Monthly Budget Target
              </p>
              {editingBudget ? (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-xl font-bold font-mono text-[#365FE8]">₹</span>
                  <input
                    ref={budgetInputRef}
                    type="number"
                    min={1}
                    aria-label="Edit monthly budget amount"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleBudgetSave();
                      if (e.key === 'Escape') setEditingBudget(false);
                    }}
                    className="input-field w-28 px-2.5 py-1 text-lg font-bold font-mono tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={handleBudgetSave}
                    aria-label="Save monthly budget"
                    className="w-8 h-8 bg-[#365FE8] hover:bg-[#294FCC] rounded-lg flex items-center justify-center text-white transition-colors"
                  >
                    <Check className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingBudget(false)}
                    aria-label="Cancel editing monthly budget"
                    className="w-8 h-8 bg-[#F1F3F6] hover:bg-[#E7EAF0] rounded-lg flex items-center justify-center text-[#697386] hover:text-[#151922] transition-colors"
                  >
                    <X className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-2xl font-bold font-mono tabular-nums text-[#151922]">
                    ₹{formatCurrency(totalBudget)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setEditingBudget(true)}
                    aria-label="Edit monthly budget"
                    className="text-[#697386] hover:text-[#365FE8] transition-colors p-1 rounded-md hover:bg-[#F1F3F6]"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-md border whitespace-nowrap shrink-0 ${
                overview.isOverMonthlyBudget
                  ? 'bg-[#FDECEC] text-[#DE5252] border-[#F6B8B8]'
                  : isWarning
                    ? 'bg-[#FEF6E7] text-[#9E6614] border-[#F3D8A8]'
                    : 'bg-[#E8F7F1] text-[#15966B] border-[#B7E4D3]'
              }`}
            >
              {overview.isOverMonthlyBudget
                ? 'Over Budget'
                : isWarning
                  ? 'Low Balance'
                  : 'On Track'}
            </span>
          </div>

          <div className="flex items-center justify-center py-5">
            <div className="relative w-36 h-36">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke="#E7EAF0"
                  strokeWidth="8"
                />
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke={statusColor}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeOffset}
                  style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
                  Month Used
                </p>
                <p
                  className={`text-2xl font-bold font-mono tabular-nums ${
                    overview.isOverMonthlyBudget ? 'text-[#DE5252]' : 'text-[#151922]'
                  }`}
                >
                  {Math.round(overview.budgetUtilisationPct)}%
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E7EAF0] flex items-center justify-between text-xs">
            <span className="text-[#697386]">Month Spent vs Budget</span>
            <span className="font-mono tabular-nums font-bold text-[#151922]">
              ₹{formatCurrencyExact(overview.currentMonthSpent)} / ₹{formatCurrency(totalBudget)}
            </span>
          </div>
        </div>

        {/* Category Ranking Snapshot */}
        <div className="lg:col-span-7 surface-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#151922]">
                  Category Spend Ranking ({overview.window.label})
                </h3>
                <p className="text-xs text-[#697386] mt-0.5">
                  Click any category to inspect distribution &amp; underlying expenses
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateSection('categories')}
                className="text-xs font-semibold text-[#365FE8] hover:text-[#294FCC] flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                Full Analysis
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {topCategories.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-[#D5DBE6] bg-[#F7F8FA] rounded-xl">
                <p className="text-sm font-semibold text-[#151922]">No spending in {overview.window.label}</p>
                <p className="text-xs text-[#697386] mt-1">
                  Try selecting another timeframe above or log a purchase in Shopping.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {topCategories.map((cat) => {
                  const style = getCategoryStyle(cat.category);
                  const maxVal = topCategories[0].totalSpent || 1;
                  const widthPct = Math.max(4, Math.round((cat.totalSpent / maxVal) * 100));
                  return (
                    <button
                      key={cat.category}
                      type="button"
                      onClick={() => {
                        onInspectCategory(cat.category);
                        onNavigateSection('categories');
                      }}
                      className="w-full text-left group"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs mb-1">
                        <span className="font-semibold text-[#151922] group-hover:text-[#365FE8] transition-colors truncate">
                          {cat.category}
                          <span className="text-[#697386] font-normal ml-2">
                            {cat.txCount} {cat.txCount === 1 ? 'txn' : 'txns'} · {cat.sharePct}%
                          </span>
                        </span>
                        <span className="font-mono tabular-nums font-bold text-[#151922] shrink-0">
                          ₹{formatCurrencyExact(cat.totalSpent)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[#F1F3F6] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            cat.isOverCap ? 'bg-[#DE5252]' : style.dot
                          }`}
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Anomaly & Insight Strip */}
          <div className="mt-5 pt-4 border-t border-[#E7EAF0] grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="surface-subtle p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#697386] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#C7851F]" />
                  Unusual Activity
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateSection('budgets')}
                  className="text-xs font-semibold text-[#365FE8] hover:text-[#294FCC] whitespace-nowrap"
                >
                  Inspect ({anomalies.length})
                </button>
              </div>
              <p className="text-xs text-[#151922] mt-1.5 line-clamp-2">
                {anomalies.length > 0
                  ? anomalies[0].reason
                  : 'No statistical spending deviations detected for this window.'}
              </p>
            </div>

            <div className="surface-subtle p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#697386] flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#365FE8]" />
                  Key Insight
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateSection('explorer')}
                  className="text-xs font-semibold text-[#365FE8] hover:text-[#294FCC] whitespace-nowrap"
                >
                  Reports
                </button>
              </div>
              <p className="text-xs text-[#151922] mt-1.5 line-clamp-2">
                {insights[0]?.description ?? 'Log transactions to surface automated Radar insights.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Spending Trends Chart */}
      <MonthlyTrendsChart />
    </div>
  );
}

function OverviewKpiCard({
  label,
  value,
  deltaPct,
  deltaSub,
  invertDeltaSemantics = false,
  icon: Icon,
}: {
  label: string;
  value: string;
  deltaPct: number | null;
  deltaSub: string;
  invertDeltaSemantics?: boolean;
  icon: typeof Wallet;
}) {
  let deltaColor = 'text-[#697386]';
  if (deltaPct !== null && deltaPct !== 0) {
    const isUp = deltaPct > 0;
    deltaColor = invertDeltaSemantics
      ? isUp
        ? 'text-[#9E6614]'
        : 'text-[#15966B]'
      : isUp
        ? 'text-[#15966B]'
        : 'text-[#9E6614]';
  }

  return (
    <div className="surface-card p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
          {label}
        </span>
        <Icon className="w-4 h-4 text-[#929BAB]" />
      </div>
      <div className="mt-2">
        <p className="text-2xl font-bold font-mono tabular-nums text-[#151922]">{value}</p>
        <div className="flex items-center justify-between gap-2 mt-1 text-xs">
          <span className="text-[#697386] truncate">{deltaSub}</span>
          {deltaPct !== null && (
            <span className={`font-mono tabular-nums font-semibold inline-flex items-center gap-0.5 shrink-0 ${deltaColor}`}>
              {deltaPct > 0 ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : deltaPct < 0 ? (
                <ArrowDownRight className="w-3.5 h-3.5" />
              ) : null}
              {deltaPct > 0 ? `+${deltaPct}%` : `${deltaPct}%`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
