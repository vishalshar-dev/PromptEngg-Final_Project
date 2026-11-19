import { useMemo, useState } from 'react';
import {
  ShoppingBag,
  Plus,
  ScanLine,
  LineChart as LineChartIcon,
  Pencil,
  Check,
  X,
  ArrowRight,
  Receipt,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useAppStore } from '../../store/useStore';
import type { AppSection } from '../ui/AppShell';
import { SectionHeader } from '../ui/SectionHeader';
import { ProgressBar } from '../ui/ProgressBar';
import { EmptyState } from '../ui/EmptyState';
import { SplitExpenseModal } from '../splits/SplitExpenseModal';
import {
  formatCurrency,
  formatCurrencyExact,
  getCategoryStyle,
} from '../../utils/categoryStyles';
import { getEffectiveTransactionAmount } from '../../utils/martEngine';
import {
  computeCategoryAnalytics,
  computeRadarBudgetMonitor,
  computeRadarOverview,
  computeSpendingTrends,
  detectUnusualSpending,
  generateRadarInsights,
  resolveRadarWindow,
} from '../../utils/radarEngine';
import {
  buildProductPriceSummaries,
  computeCategoryPriceAnalytics,
  generatePriceInsights,
} from '../../utils/priceTrackerEngine';

interface OverviewDashboardProps {
  onNavigate: (section: AppSection, subTab?: string) => void;
}

function getGreeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function OverviewDashboard({ onNavigate }: OverviewDashboardProps) {
  const transactions = useAppStore((s) => s.transactions);
  const totalBudget = useAppStore((s) => s.totalBudget);
  const setTotalBudget = useAppStore((s) => s.setTotalBudget);
  const categories = useAppStore((s) => s.categories);
  const categoryCaps = useAppStore((s) => s.categoryCaps);
  const items = useAppStore((s) => s.items);
  const priceObservations = useAppStore((s) => s.priceObservations);

  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState(String(totalBudget));
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [chartMode, setChartMode] = useState<'daily' | 'category'>('daily');

  const now = new Date();
  const greeting = getGreeting(now.getHours());
  const formattedDate = now.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const activeTransactions = useMemo(
    () => transactions.filter((tx) => tx.status !== 'cancelled'),
    [transactions]
  );

  const totalSpent = useMemo(
    () =>
      transactions.reduce(
        (sum, tx) => sum + getEffectiveTransactionAmount(tx),
        0
      ),
    [transactions]
  );

  const safeBudget = Math.max(0, totalBudget);
  const remaining = safeBudget - totalSpent;
  const utilizationPct =
    safeBudget > 0 ? Math.round((totalSpent / safeBudget) * 1000) / 10 : 0;

  const budgetStatus =
    safeBudget > 0 && remaining < 0
      ? {
          label: 'Budget exceeded',
          tone: 'danger' as const,
          badgeClass: 'bg-[#FDECEC] text-[#C23838] border-[#FAD4D4]',
          balanceClass: 'text-[#DE5252]',
        }
      : utilizationPct >= 80
        ? {
            label: 'Approaching limit',
            tone: 'warning' as const,
            badgeClass: 'bg-[#FEF6E7] text-[#9E6614] border-[#FDE8C4]',
            balanceClass: 'text-[#C7851F]',
          }
        : {
            label: 'On track',
            tone: 'success' as const,
            badgeClass: 'bg-[#E8F7F1] text-[#0D5E43] border-[#C8EDE0]',
            balanceClass: 'text-[#15966B]',
          };

  const handleOpenEditBudget = () => {
    setBudgetDraft(String(totalBudget));
    setBudgetError(null);
    setEditingBudget(true);
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(budgetDraft);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setBudgetError('Enter a valid amount greater than ₹0.');
      return;
    }
    setTotalBudget(Math.round(parsed));
    setBudgetError(null);
    setEditingBudget(false);
  };

  // Real data engines for Spending Overview & Smart Insights
  const monthWindow = useMemo(() => resolveRadarWindow('this_month'), []);

  const categoriesResult = useMemo(
    () =>
      computeCategoryAnalytics({
        transactions,
        categories,
        categoryCaps,
        window: monthWindow,
      }),
    [transactions, categories, categoryCaps, monthWindow]
  );

  const dailyTrendsResult = useMemo(
    () =>
      computeSpendingTrends({
        transactions,
        granularity: 'daily',
        window: monthWindow,
      }),
    [transactions, monthWindow]
  );

  const smartInsights = useMemo(() => {
    const overview = computeRadarOverview({
      transactions,
      totalBudget,
      window: monthWindow,
    });
    const budgetMonitor = computeRadarBudgetMonitor({
      transactions,
      totalBudget,
      categories,
      categoryCaps,
    });
    const anomalies = detectUnusualSpending({
      transactions,
      window: monthWindow,
    });
    const radarInsights = generateRadarInsights({
      overview,
      categoriesResult,
      trendsResult: dailyTrendsResult,
      budgetResult: budgetMonitor,
      anomalies,
    });

    const priceSummaries = buildProductPriceSummaries(priceObservations, items);
    const priceCategories = computeCategoryPriceAnalytics(priceSummaries);
    const priceInsights = generatePriceInsights(priceSummaries, priceCategories);

    const combined: Array<{
      id: string;
      title: string;
      description: string;
      badge?: string;
      tone: 'positive' | 'warning' | 'neutral';
      targetSection: AppSection;
      targetSubTab?: string;
    }> = [];

    for (const r of radarInsights.slice(0, 2)) {
      combined.push({
        id: r.id,
        title: r.title,
        description: r.description,
        badge: r.metricLabel,
        tone:
          r.tone === 'positive'
            ? 'positive'
            : r.tone === 'caution'
              ? 'warning'
              : 'neutral',
        targetSection: 'insights',
        targetSubTab: 'radar',
      });
    }

    for (const p of priceInsights.slice(0, 1)) {
      combined.push({
        id: p.id,
        title: p.title,
        description: p.description,
        badge: p.metricBadge,
        tone:
          p.tone === 'positive'
            ? 'positive'
            : p.tone === 'warning'
              ? 'warning'
              : 'neutral',
        targetSection: 'insights',
        targetSubTab: 'prices',
      });
    }

    return combined.slice(0, 3);
  }, [
    transactions,
    totalBudget,
    monthWindow,
    categories,
    categoryCaps,
    categoriesResult,
    dailyTrendsResult,
    priceObservations,
    items,
  ]);

  const recentTransactions = useMemo(
    () =>
      [...transactions]
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .slice(0, 5),
    [transactions]
  );

  const recentDailyChartData = useMemo(() => {
    const pts = dailyTrendsResult.points;
    return pts.slice(-14).map((p) => ({
      label: p.label,
      fullLabel: p.fullLabel,
      spent: p.spent,
    }));
  }, [dailyTrendsResult.points]);

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

  const hasChartData =
    activeTransactions.length > 0 &&
    (chartMode === 'daily'
      ? recentDailyChartData.some((d) => d.spent > 0)
      : topCategoriesChartData.length > 0);

  return (
    <div className="space-y-5">
      {/* Section A: Greeting & Date */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <p className="text-[12.5px] font-medium text-[#697386]">
            {formattedDate}
          </p>
          <h1 className="text-[24px] sm:text-[28px] font-bold tracking-tight text-[#151922] mt-0.5">
            {greeting}
          </h1>
        </div>
        <p className="text-[13px] text-[#697386]">
          Track your spending, compare baskets, and audit hidden fees in one view.
        </p>
      </header>

      {/* Section B: Main Budget Overview Card */}
      <section aria-label="Budget overview" className="surface-card p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[12.5px] font-semibold text-[#697386]">
                Remaining Balance
              </span>
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${budgetStatus.badgeClass}`}
              >
                {budgetStatus.label}
              </span>
            </div>
            <p
              data-testid="overview-remaining-balance"
              className={`text-[32px] sm:text-[38px] font-bold font-mono tabular-nums tracking-tight leading-none ${budgetStatus.balanceClass}`}
            >
              {remaining < 0 ? '-' : ''}₹{formatCurrencyExact(Math.abs(remaining))}
            </p>
            <p className="text-[12.5px] text-[#697386] pt-0.5">
              {activeTransactions.length === 0
                ? 'No active expenses logged yet this period.'
                : `${activeTransactions.length} active expense${
                    activeTransactions.length === 1 ? '' : 's'
                  } recorded`}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 sm:gap-8 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-[#E7EAF0] lg:pl-8">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-medium text-[#697386]">
                  Total Budget
                </span>
                {!editingBudget && (
                  <button
                    type="button"
                    onClick={handleOpenEditBudget}
                    aria-label="Edit total budget"
                    className="p-1 rounded-lg text-[#697386] hover:text-[#365FE8] hover:bg-[#EDF2FF] transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {!editingBudget ? (
                <p
                  data-testid="overview-total-budget"
                  className="text-[18px] sm:text-[20px] font-bold font-mono tabular-nums text-[#151922] mt-1"
                >
                  ₹{formatCurrency(safeBudget)}
                </p>
              ) : (
                <form onSubmit={handleSaveBudget} className="mt-1 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      aria-label="Monthly budget amount"
                      value={budgetDraft}
                      onChange={(e) => setBudgetDraft(e.target.value)}
                      autoFocus
                      className="input-field w-28 px-2.5 py-1.5 text-[14px] font-mono font-semibold tabular-nums"
                    />
                    <button
                      type="submit"
                      aria-label="Save budget"
                      className="w-8 h-8 rounded-lg bg-[#365FE8] hover:bg-[#294FCC] text-white flex items-center justify-center shrink-0"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Cancel budget edit"
                      onClick={() => {
                        setEditingBudget(false);
                        setBudgetError(null);
                      }}
                      className="w-8 h-8 rounded-lg bg-[#F1F3F6] hover:bg-[#E7EAF0] text-[#697386] flex items-center justify-center shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {budgetError && (
                    <p className="text-[11px] font-medium text-[#DE5252]">
                      {budgetError}
                    </p>
                  )}
                </form>
              )}
            </div>

            <div>
              <p className="text-[12px] font-medium text-[#697386]">Spent</p>
              <p
                data-testid="overview-total-spent"
                className="text-[18px] sm:text-[20px] font-bold font-mono tabular-nums text-[#151922] mt-1"
              >
                ₹{formatCurrencyExact(totalSpent)}
              </p>
            </div>

            <div>
              <p className="text-[12px] font-medium text-[#697386]">
                Utilization
              </p>
              <p
                data-testid="overview-utilization"
                className="text-[18px] sm:text-[20px] font-bold font-mono tabular-nums text-[#151922] mt-1"
              >
                {utilizationPct}%
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <ProgressBar
            value={utilizationPct}
            tone={budgetStatus.tone}
            size="md"
            label="Monthly budget utilization"
          />
          <div className="flex items-center justify-between text-[12px] text-[#697386]">
            <span>
              {utilizationPct <= 100
                ? `${Math.max(0, Math.round((100 - utilizationPct) * 10) / 10)}% of budget available`
                : `Exceeded by ₹${formatCurrencyExact(Math.abs(remaining))}`}
            </span>
            <span className="font-mono tabular-nums">
              ₹{formatCurrencyExact(totalSpent)} / ₹{formatCurrency(safeBudget)}
            </span>
          </div>
        </div>
      </section>

      {/* Section C: Quick Actions */}
      <section aria-label="Quick actions" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => onNavigate('shopping')}
          className="surface-card p-4 text-left hover:border-[#365FE8]/40 hover:shadow-card-hover transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-[#EDF2FF] text-[#365FE8] flex items-center justify-center mb-3 group-hover:bg-[#365FE8] group-hover:text-white transition-colors">
            <ShoppingBag className="w-[18px] h-[18px]" strokeWidth={2} />
          </div>
          <p className="text-[14px] font-semibold text-[#151922]">
            Start Shopping
          </p>
          <p className="text-[12px] text-[#697386] mt-0.5">
            Build cart from quick catalog
          </p>
        </button>

        <button
          type="button"
          onClick={() => setAddExpenseOpen(true)}
          className="surface-card p-4 text-left hover:border-[#365FE8]/40 hover:shadow-card-hover transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-[#E8F7F1] text-[#15966B] flex items-center justify-center mb-3 group-hover:bg-[#15966B] group-hover:text-white transition-colors">
            <Plus className="w-[18px] h-[18px]" strokeWidth={2.2} />
          </div>
          <p className="text-[14px] font-semibold text-[#151922]">
            Add Expense
          </p>
          <p className="text-[12px] text-[#697386] mt-0.5">
            Log a personal or split cost
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('scanner')}
          className="surface-card p-4 text-left hover:border-[#365FE8]/40 hover:shadow-card-hover transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-[#FEF6E7] text-[#C7851F] flex items-center justify-center mb-3 group-hover:bg-[#E5A23B] group-hover:text-white transition-colors">
            <ScanLine className="w-[18px] h-[18px]" strokeWidth={2} />
          </div>
          <p className="text-[14px] font-semibold text-[#151922]">
            Scan Receipt
          </p>
          <p className="text-[12px] text-[#697386] mt-0.5">
            Extract items &amp; detect fees
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('insights')}
          className="surface-card p-4 text-left hover:border-[#365FE8]/40 hover:shadow-card-hover transition-all group"
        >
          <div className="w-9 h-9 rounded-xl bg-[#F1F3F6] text-[#151922] flex items-center justify-center mb-3 group-hover:bg-[#151922] group-hover:text-white transition-colors">
            <LineChartIcon className="w-[18px] h-[18px]" strokeWidth={2} />
          </div>
          <p className="text-[14px] font-semibold text-[#151922]">
            View Insights
          </p>
          <p className="text-[12px] text-[#697386] mt-0.5">
            Explore trends &amp; price moves
          </p>
        </button>
      </section>

      {/* Sections D & E: Spending Overview + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Section D: Spending Overview */}
        <section
          aria-label="Spending overview"
          className="lg:col-span-7 surface-card p-5 sm:p-6 space-y-5"
        >
          <SectionHeader
            title="Spending Overview"
            subtitle={
              chartMode === 'daily'
                ? 'Daily spending activity over the last 14 days'
                : 'Top spending categories this month'
            }
            action={
              <div className="inline-flex items-center p-1 rounded-xl bg-[#F1F3F6] border border-[#E7EAF0]">
                <button
                  type="button"
                  onClick={() => setChartMode('daily')}
                  className={`px-3 py-1 rounded-lg text-[12px] font-semibold transition-colors ${
                    chartMode === 'daily'
                      ? 'bg-white text-[#151922] shadow-xs'
                      : 'text-[#697386] hover:text-[#151922]'
                  }`}
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('category')}
                  className={`px-3 py-1 rounded-lg text-[12px] font-semibold transition-colors ${
                    chartMode === 'category'
                      ? 'bg-white text-[#151922] shadow-xs'
                      : 'text-[#697386] hover:text-[#151922]'
                  }`}
                >
                  Category
                </button>
              </div>
            }
          />

          {!hasChartData ? (
            <EmptyState
              compact
              icon={LineChartIcon}
              title="No spending activity yet"
              description="Log an expense, scan a receipt, or check out from Shopping to visualize your spending trends."
              action={
                <button
                  type="button"
                  onClick={() => setAddExpenseOpen(true)}
                  className="btn-primary px-4 py-2 text-[13px]"
                >
                  Add First Expense
                </button>
              }
            />
          ) : (
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartMode === 'daily' ? (
                  <BarChart
                    data={recentDailyChartData}
                    margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#E7EAF0"
                    />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#697386', fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#697386', fontSize: 11 }}
                      tickFormatter={(v) => `₹${v}`}
                    />
                    <Tooltip
                      cursor={{ fill: '#F1F3F6' }}
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E7EAF0',
                        borderRadius: '12px',
                        boxShadow: '0 8px 24px rgba(21, 25, 34, 0.08)',
                        fontSize: '12px',
                        color: '#151922',
                      }}
                      formatter={(val) => [
                        `₹${formatCurrencyExact(Number(val))}`,
                        'Spent',
                      ]}
                    />
                    <Bar dataKey="spent" radius={[6, 6, 0, 0]} maxBarSize={32}>
                      {recentDailyChartData.map((entry, idx) => (
                        <Cell
                          key={entry.label + idx}
                          fill={entry.spent > 0 ? '#365FE8' : '#E7EAF0'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <BarChart
                    data={topCategoriesChartData}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="#E7EAF0"
                    />
                    <XAxis
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#697386', fontSize: 11 }}
                      tickFormatter={(v) => `₹${v}`}
                    />
                    <YAxis
                      type="category"
                      dataKey="category"
                      width={110}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#151922', fontSize: 11.5 }}
                    />
                    <Tooltip
                      cursor={{ fill: '#F1F3F6' }}
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E7EAF0',
                        borderRadius: '12px',
                        boxShadow: '0 8px 24px rgba(21, 25, 34, 0.08)',
                        fontSize: '12px',
                        color: '#151922',
                      }}
                      formatter={(val) => [
                        `₹${formatCurrencyExact(Number(val))}`,
                        'Spent',
                      ]}
                    />
                    <Bar
                      dataKey="spent"
                      fill="#365FE8"
                      radius={[0, 6, 6, 0]}
                      maxBarSize={24}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Section E: Recent Activity */}
        <section
          aria-label="Recent activity"
          className="lg:col-span-5 surface-card p-5 sm:p-6 space-y-4"
        >
          <SectionHeader
            title="Recent Activity"
            subtitle="Latest recorded expenses"
            action={
              <button
                type="button"
                onClick={() => onNavigate('expenses')}
                className="text-[12.5px] font-semibold text-[#365FE8] hover:text-[#294FCC] flex items-center gap-1 transition-colors"
              >
                View all
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            }
          />

          {recentTransactions.length === 0 ? (
            <EmptyState
              compact
              icon={Receipt}
              title="No recent transactions"
              description="Your recent cart checkouts, scanned receipts, and manual expenses will show up here."
              action={
                <button
                  type="button"
                  onClick={() => onNavigate('shopping')}
                  className="btn-secondary px-4 py-2 text-[13px]"
                >
                  Open Shopping
                </button>
              }
            />
          ) : (
            <div className="divide-y divide-[#E7EAF0]">
              {recentTransactions.map((tx) => {
                const catStyle = getCategoryStyle(tx.category);
                const effectiveAmt = getEffectiveTransactionAmount(tx);
                const isInactive =
                  tx.status === 'cancelled' || tx.status === 'refunded';
                return (
                  <div
                    key={tx.id}
                    className="py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${catStyle.dot}`}
                      />
                      <div className="min-w-0">
                        <p
                          className={`text-[13.5px] font-semibold truncate ${
                            isInactive
                              ? 'line-through text-[#929BAB]'
                              : 'text-[#151922]'
                          }`}
                        >
                          {tx.name}
                        </p>
                        <p className="text-[12px] text-[#697386] truncate">
                          {tx.category} ·{' '}
                          {new Date(tx.timestamp).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                          {tx.status && tx.status !== 'active'
                            ? ` · ${tx.status}`
                            : ''}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[13.5px] font-bold font-mono tabular-nums shrink-0 ${
                        isInactive
                          ? 'line-through text-[#929BAB]'
                          : 'text-[#151922]'
                      }`}
                    >
                      -₹{formatCurrencyExact(isInactive ? tx.amount : effectiveAmt)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Section F: Smart Insights */}
      <section aria-label="Smart insights" className="surface-card p-5 sm:p-6 space-y-4">
        <SectionHeader
          title="Smart Insights"
          subtitle="Live signals derived directly from your spending and price history"
          action={
            <button
              type="button"
              onClick={() => onNavigate('insights')}
              className="text-[12.5px] font-semibold text-[#365FE8] hover:text-[#294FCC] flex items-center gap-1 transition-colors"
            >
              Open Insights
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          }
        />

        {smartInsights.length === 0 ? (
          <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#EDF2FF] text-[#365FE8] flex items-center justify-center shrink-0">
                <Sparkles className="w-[18px] h-[18px]" />
              </div>
              <div>
                <p className="text-[13.5px] font-semibold text-[#151922]">
                  Insights unlock as you record activity
                </p>
                <p className="text-[12.5px] text-[#697386] mt-0.5">
                  Log expenses or scan a receipt to see category trends, budget pace, and item price changes.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onNavigate('scanner')}
                className="btn-secondary px-3.5 py-2 text-[12.5px]"
              >
                Scan Receipt
              </button>
              <button
                type="button"
                onClick={() => setAddExpenseOpen(true)}
                className="btn-primary px-3.5 py-2 text-[12.5px]"
              >
                Add Expense
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {smartInsights.map((insight) => {
              const Icon =
                insight.tone === 'positive'
                  ? TrendingDown
                  : insight.tone === 'warning'
                    ? AlertTriangle
                    : Info;
              const badgeStyles =
                insight.tone === 'positive'
                  ? 'bg-[#E8F7F1] text-[#0D5E43]'
                  : insight.tone === 'warning'
                    ? 'bg-[#FEF6E7] text-[#9E6614]'
                    : 'bg-[#EDF2FF] text-[#365FE8]';

              return (
                <button
                  key={insight.id}
                  type="button"
                  onClick={() =>
                    onNavigate(insight.targetSection, insight.targetSubTab)
                  }
                  className="text-left rounded-xl bg-[#F7F8FA] hover:bg-[#F1F3F6] border border-[#E7EAF0] p-4 transition-colors flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${badgeStyles}`}
                      >
                        <Icon className="w-4 h-4" />
                      </span>
                      {insight.badge && (
                        <span
                          className={`text-[11px] font-semibold font-mono tabular-nums px-2 py-0.5 rounded-md ${badgeStyles}`}
                        >
                          {insight.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[13.5px] font-semibold text-[#151922] leading-snug">
                      {insight.title}
                    </p>
                    <p className="text-[12.5px] text-[#697386] leading-relaxed line-clamp-2">
                      {insight.description}
                    </p>
                  </div>
                  <span className="text-[12px] font-semibold text-[#365FE8] flex items-center gap-1">
                    Explore details
                    <TrendingUp className="w-3.5 h-3.5" />
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <SplitExpenseModal
        isOpen={addExpenseOpen}
        onClose={() => setAddExpenseOpen(false)}
        mode="create"
        defaultSplitEnabled={false}
      />
    </div>
  );
}
