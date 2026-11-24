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
    ? 'var(--accent-danger)'
    : isWarning
      ? 'var(--accent-warning)'
      : 'var(--accent-success)';

  const topCategories = categoriesResult.categories
    .filter((c) => c.totalSpent > 0)
    .slice(0, 6);

  return (
    <div className="space-y-4">
      {/* Subtle Inline Window Caption */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-secondary)] px-0.5">
        <span className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-[var(--accent-ink)] shrink-0" />
          <span>
            Showing <strong className="text-[var(--text-primary)]">{overview.window.label}</strong> · vs{' '}
            <strong className="text-[var(--text-primary)]">{overview.window.comparisonLabel}</strong>
          </span>
        </span>
      </div>

      {/* Single Hairline KPI Strip (4 core window metrics; budget target ring sits below) */}
      <div className="surface-card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)]">
        <OverviewKpiCell
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

        <OverviewKpiCell
          label="Average Daily Spend"
          value={`₹${formatCurrencyExact(overview.avgDailySpend)}`}
          deltaPct={overview.avgDailyDeltaPct}
          deltaSub={`Across ${overview.window.elapsedDays} ${overview.window.elapsedDays === 1 ? 'day' : 'days'}`}
          invertDeltaSemantics
          icon={TrendingUp}
        />

        <OverviewKpiCell
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

        <div className="p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-semibold text-[var(--text-secondary)]">
              Highest Category
            </span>
            <PieChartIcon className="w-4 h-4 text-[var(--text-muted)]" />
          </div>
          {overview.highestCategory ? (
            <div className="mt-2">
              <p className="text-lg font-bold text-[var(--text-primary)] truncate">
                {overview.highestCategory.category}
              </p>
              <div className="flex items-center justify-between gap-2 mt-1 text-xs">
                <span className="font-mono tabular-nums font-bold text-[var(--accent-ink)]">
                  ₹{formatCurrencyExact(overview.highestCategory.amount)}
                </span>
                <span className="text-[var(--text-secondary)] font-mono tabular-nums">
                  {overview.highestCategory.sharePct}% share
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-2">
              <p className="text-base font-semibold text-[var(--text-secondary)]">No spending yet</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Select a wider range or add expenses</p>
            </div>
          )}
        </div>
      </div>

      {/* Main 2-Column Analytical Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Monthly Budget Ring Card */}
        <div className="lg:col-span-5 surface-card p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[12px] font-semibold text-[var(--text-secondary)]">
                Monthly Budget Target
              </p>
              {editingBudget ? (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-xl font-bold font-mono text-[var(--accent-ink)]">₹</span>
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
                    className="w-8 h-8 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] rounded-lg flex items-center justify-center text-white transition-colors"
                  >
                    <Check className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingBudget(false)}
                    aria-label="Cancel editing monthly budget"
                    className="w-8 h-8 bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <X className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-2xl font-bold font-mono tabular-nums text-[var(--text-primary)]">
                    ₹{formatCurrency(totalBudget)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setEditingBudget(true)}
                    aria-label="Edit monthly budget"
                    className="text-[var(--text-secondary)] hover:text-[var(--accent-ink)] transition-colors p-1.5 rounded-lg hover:bg-[var(--bg-subtle)]"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${
                overview.isOverMonthlyBudget
                  ? 'text-[var(--accent-danger-ink)]'
                  : isWarning
                    ? 'text-[var(--accent-warning-ink)]'
                    : 'text-[var(--accent-success-ink)]'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  overview.isOverMonthlyBudget
                    ? 'bg-[var(--accent-danger)]'
                    : isWarning
                      ? 'bg-[var(--accent-warning)]'
                      : 'bg-[var(--accent-success)]'
                }`}
                aria-hidden="true"
              />
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
                  stroke="var(--border-subtle)"
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
                <p className="text-[11.5px] font-semibold text-[var(--text-secondary)]">
                  Month Used
                </p>
                <p
                  className={`text-2xl font-bold font-mono tabular-nums ${
                    overview.isOverMonthlyBudget
                      ? 'text-[var(--accent-danger-ink)]'
                      : 'text-[var(--text-primary)]'
                  }`}
                >
                  {Math.round(overview.budgetUtilisationPct)}%
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[var(--text-secondary)]">Spent vs Target</span>
              <span className="font-mono tabular-nums font-bold text-[var(--text-primary)]">
                ₹{formatCurrencyExact(overview.currentMonthSpent)} / ₹{formatCurrency(totalBudget)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span
                className={`font-mono tabular-nums font-semibold ${
                  overview.isOverMonthlyBudget
                    ? 'text-[var(--accent-danger-ink)]'
                    : 'text-[var(--accent-success-ink)]'
                }`}
              >
                {overview.remainingBudget < 0 ? '-' : ''}₹
                {formatCurrencyExact(Math.abs(overview.remainingBudget))}{' '}
                {overview.isOverMonthlyBudget ? 'over budget' : 'remaining'}
              </span>
              <button
                type="button"
                onClick={() => onNavigateSection('budgets')}
                className="font-semibold text-[var(--accent-ink)] hover:underline inline-flex items-center gap-1 whitespace-nowrap"
              >
                Monitor Caps
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Ranking Snapshot */}
        <div className="lg:col-span-7 surface-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Category Spend Ranking ({overview.window.label})
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Click any category to inspect distribution &amp; underlying expenses
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateSection('categories')}
                className="text-xs font-semibold text-[var(--accent-ink)] hover:underline flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                Full Analysis
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {topCategories.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm font-semibold text-[var(--text-primary)]">No spending in {overview.window.label}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
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
                        <span className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-ink)] transition-colors truncate">
                          {cat.category}
                          <span className="text-[var(--text-secondary)] font-normal ml-2">
                            {cat.txCount} {cat.txCount === 1 ? 'txn' : 'txns'} · {cat.sharePct}%
                          </span>
                        </span>
                        <span className="font-mono tabular-nums font-bold text-[var(--text-primary)] shrink-0">
                          ₹{formatCurrencyExact(cat.totalSpent)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--bg-well)] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            cat.isOverCap ? 'bg-[var(--accent-danger)]' : style.dot
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
          <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)]">
            <div className="pb-3 sm:pb-0 sm:pr-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-[var(--accent-warning-ink)]" />
                  Unusual Activity
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateSection('budgets')}
                  className="text-xs font-semibold text-[var(--accent-ink)] hover:underline whitespace-nowrap"
                >
                  Inspect ({anomalies.length})
                </button>
              </div>
              <p className="text-xs text-[var(--text-primary)] mt-1.5 line-clamp-2 leading-relaxed">
                {anomalies.length > 0
                  ? anomalies[0].reason
                  : 'No statistical spending deviations detected for this window.'}
              </p>
            </div>

            <div className="pt-3 sm:pt-0 sm:pl-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[var(--accent-ink)]" />
                  Key Insight
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateSection('explorer')}
                  className="text-xs font-semibold text-[var(--accent-ink)] hover:underline whitespace-nowrap"
                >
                  Reports
                </button>
              </div>
              <p className="text-xs text-[var(--text-primary)] mt-1.5 line-clamp-2 leading-relaxed">
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

function OverviewKpiCell({
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
  let deltaColor = 'text-[var(--text-secondary)]';
  if (deltaPct !== null && deltaPct !== 0) {
    const isUp = deltaPct > 0;
    deltaColor = invertDeltaSemantics
      ? isUp
        ? 'text-[var(--accent-warning-ink)]'
        : 'text-[var(--accent-success-ink)]'
      : isUp
        ? 'text-[var(--accent-success-ink)]'
        : 'text-[var(--accent-warning-ink)]';
  }

  return (
    <div className="p-4 sm:p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-semibold text-[var(--text-secondary)]">
          {label}
        </span>
        <Icon className="w-4 h-4 text-[var(--text-muted)]" />
      </div>
      <div className="mt-2">
        <p className="text-2xl font-bold font-mono tabular-nums text-[var(--text-primary)]">{value}</p>
        <div className="flex items-center justify-between gap-2 mt-1 text-xs">
          <span className="text-[var(--text-secondary)] truncate">{deltaSub}</span>
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
