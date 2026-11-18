import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowUpRight, Info, Layers, X } from 'lucide-react';
import { formatCompact, formatCurrencyExact } from '../../utils/categoryStyles';
import type {
  RadarCategoryAnalyticsResult,
  RadarDateWindow,
} from '../../utils/radarEngine';

const DONUT_COLORS = [
  '#365FE8',
  '#15966B',
  '#E5A23B',
  '#7C3AED',
  '#DE5252',
  '#0D9488',
  '#697386',
];

const LIGHT_TOOLTIP_STYLE = {
  backgroundColor: '#FFFFFF',
  borderColor: '#E7EAF0',
  borderRadius: '12px',
  fontSize: '12px',
  color: '#151922',
  boxShadow: '0 8px 24px rgba(21,25,34,0.08)',
};

interface RadarCategoriesTabProps {
  categoriesResult: RadarCategoryAnalyticsResult;
  window: RadarDateWindow;
  selectedCategory: string | null;
  onSelectCategory: (cat: string | null) => void;
  onOpenTxInExplorer: (category: string) => void;
}

export function RadarCategoriesTab({
  categoriesResult,
  window,
  selectedCategory,
  onSelectCategory,
  onOpenTxInExplorer,
}: RadarCategoriesTabProps) {
  const [barMode, setBarMode] = useState<'comparison' | 'ranking'>('comparison');

  const activeCategories = useMemo(
    () => categoriesResult.categories.filter((c) => c.totalSpent > 0 || c.prevSpent > 0),
    [categoriesResult.categories]
  );

  const comparisonBarData = useMemo(
    () =>
      activeCategories.slice(0, 8).map((c) => ({
        name: c.category.length > 15 ? `${c.category.slice(0, 14)}…` : c.category,
        fullName: c.category,
        Current: c.totalSpent,
        Previous: c.prevSpent,
      })),
    [activeCategories]
  );

  const rankingBarData = useMemo(
    () =>
      activeCategories
        .filter((c) => c.totalSpent > 0)
        .slice(0, 8)
        .map((c) => ({
          name: c.category.length > 18 ? `${c.category.slice(0, 17)}…` : c.category,
          fullName: c.category,
          Spent: c.totalSpent,
          Share: c.sharePct,
        })),
    [activeCategories]
  );

  const selectedDetail = useMemo(
    () =>
      selectedCategory
        ? categoriesResult.categories.find((c) => c.category === selectedCategory) ?? null
        : null,
    [categoriesResult.categories, selectedCategory]
  );

  return (
    <div className="space-y-5">
      {/* Category Insights Strip */}
      {categoriesResult.categoryInsights.length > 0 && (
        <div className="surface-card p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <Info className="w-4 h-4 text-[#365FE8]" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#697386]">
              Category Intelligence Observations ({window.label})
            </h3>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs text-[#151922]">
            {categoriesResult.categoryInsights.map((obs, idx) => (
              <li
                key={idx}
                className="surface-subtle px-3 py-2.5 leading-relaxed"
              >
                {obs}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Charts Row: Donut + Bar/Ranking */}
      {activeCategories.length === 0 ? (
        <div className="surface-card p-10 text-center">
          <Layers className="w-8 h-8 text-[#929BAB] mx-auto mb-2.5" />
          <p className="text-sm font-semibold text-[#151922]">
            No category transactions in {window.label}
          </p>
          <p className="text-xs text-[#697386] mt-1">
            Switch the timeframe filter above or record purchases in Shopping or Expenses.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Expense Distribution Donut Chart */}
          <div className="lg:col-span-5 surface-card p-5 flex flex-col">
            <h3 className="text-sm font-bold text-[#151922]">Expense Distribution</h3>
            <p className="text-xs text-[#697386] mt-0.5 mb-3">
              Share of ₹{formatCurrencyExact(categoriesResult.totalSpent)} in {window.label}
            </p>

            {categoriesResult.donutData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-10 text-xs text-[#697386]">
                No spend in current period (prior period activity exists).
              </div>
            ) : (
              <>
                <div className="h-56 w-full" data-testid="radar-category-donut">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoriesResult.donutData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={56}
                        outerRadius={88}
                        paddingAngle={2}
                        isAnimationActive={false}
                      >
                        {categoriesResult.donutData.map((entry, idx) => (
                          <Cell
                            key={entry.name}
                            fill={DONUT_COLORS[idx % DONUT_COLORS.length]}
                            stroke="#FFFFFF"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: unknown, name: unknown) => [
                          `₹${formatCurrencyExact(Number(value ?? 0))}`,
                          String(name ?? ''),
                        ]}
                        contentStyle={LIGHT_TOOLTIP_STYLE}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-1.5 mt-2 pt-3 border-t border-[#E7EAF0]">
                  {categoriesResult.donutData.map((d, idx) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-[#697386] truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length] }}
                        />
                        <span className="truncate text-[#151922] font-medium">{d.name}</span>
                      </span>
                      <span className="font-mono tabular-nums font-semibold text-[#151922] shrink-0">
                        {d.sharePct}% · ₹{formatCurrencyExact(d.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Period Comparison or Horizontal Ranking Bar Chart */}
          <div className="lg:col-span-7 surface-card p-5 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#151922]">
                  {barMode === 'comparison'
                    ? 'Category Period Comparison'
                    : 'Highest-Spending Categories Ranking'}
                </h3>
                <p className="text-xs text-[#697386] mt-0.5">
                  {barMode === 'comparison'
                    ? `${window.label} vs ${window.comparisonLabel}`
                    : `Top categories ranked by expenditure in ${window.label}`}
                </p>
              </div>
              <div
                className="inline-flex items-center bg-[#F1F3F6] border border-[#E7EAF0] rounded-xl p-0.5"
                role="group"
                aria-label="Category chart view"
              >
                <button
                  type="button"
                  onClick={() => setBarMode('comparison')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    barMode === 'comparison'
                      ? 'bg-[#365FE8] text-white shadow-xs'
                      : 'text-[#697386] hover:text-[#151922]'
                  }`}
                >
                  vs Prior
                </button>
                <button
                  type="button"
                  onClick={() => setBarMode('ranking')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    barMode === 'ranking'
                      ? 'bg-[#365FE8] text-white shadow-xs'
                      : 'text-[#697386] hover:text-[#151922]'
                  }`}
                >
                  Ranking
                </button>
              </div>
            </div>

            <div className="h-72 w-full" data-testid="radar-category-bar">
              <ResponsiveContainer width="100%" height="100%">
                {barMode === 'comparison' ? (
                  <BarChart
                    data={comparisonBarData}
                    margin={{ top: 10, right: 12, left: -10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E7EAF0" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#697386', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis
                      tickFormatter={(v: number) => (v === 0 ? '₹0' : `₹${formatCompact(v)}`)}
                      tick={{ fill: '#697386', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                      axisLine={false}
                      tickLine={false}
                      width={52}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(54, 95, 232, 0.05)' }}
                      formatter={(v: unknown) => `₹${formatCurrencyExact(Number(v ?? 0))}`}
                      contentStyle={LIGHT_TOOLTIP_STYLE}
                    />
                    <Bar dataKey="Previous" fill="#CBD5E1" radius={[5, 5, 0, 0]} maxBarSize={24} isAnimationActive={false} />
                    <Bar dataKey="Current" fill="#365FE8" radius={[5, 5, 0, 0]} maxBarSize={24} isAnimationActive={false} />
                  </BarChart>
                ) : (
                  <BarChart
                    data={rankingBarData}
                    layout="vertical"
                    margin={{ top: 8, right: 20, left: 10, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E7EAF0" horizontal={false} />
                    <XAxis
                      type="number"
                      tickFormatter={(v: number) => (v === 0 ? '₹0' : `₹${formatCompact(v)}`)}
                      tick={{ fill: '#697386', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={118}
                      tick={{ fill: '#151922', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(54, 95, 232, 0.05)' }}
                      formatter={(v: unknown) => [`₹${formatCurrencyExact(Number(v ?? 0))}`, 'Spent']}
                      contentStyle={LIGHT_TOOLTIP_STYLE}
                    />
                    <Bar dataKey="Spent" fill="#365FE8" radius={[0, 6, 6, 0]} maxBarSize={22} isAnimationActive={false} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Category Breakdown Table */}
      <div className="surface-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#151922]">Category Breakdown Matrix</h3>
            <p className="text-xs text-[#697386] mt-0.5">
              Select a category row to inspect its underlying transactions
            </p>
          </div>
          {selectedDetail && (
            <button
              type="button"
              onClick={() => onSelectCategory(null)}
              className="text-xs font-semibold text-[#697386] hover:text-[#151922] flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Close Drill-Down
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[680px]">
            <thead>
              <tr className="border-b border-[#E7EAF0] text-[11px] uppercase tracking-wider text-[#697386]">
                <th className="py-2.5 pr-3 font-semibold">Category</th>
                <th className="py-2.5 px-3 font-semibold text-right">Spent</th>
                <th className="py-2.5 px-3 font-semibold text-right">Share</th>
                <th className="py-2.5 px-3 font-semibold text-right">Txns</th>
                <th className="py-2.5 px-3 font-semibold text-right">Avg / Txn</th>
                <th className="py-2.5 px-3 font-semibold text-right">vs Prior</th>
                <th className="py-2.5 px-3 font-semibold">Trend</th>
                <th className="py-2.5 pl-3 font-semibold text-right">Drill-Down</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7EAF0] text-xs">
              {categoriesResult.categories.map((cat) => {
                const isSelected = selectedCategory === cat.category;
                const trendLabel =
                  cat.trend === 'increasing'
                    ? 'Increasing'
                    : cat.trend === 'decreasing'
                      ? 'Decreasing'
                      : cat.trend === 'stable'
                        ? 'Stable'
                        : cat.trend === 'new'
                          ? 'New'
                          : 'No Activity';
                const trendClass =
                  cat.trend === 'increasing'
                    ? 'text-[#9E6614]'
                    : cat.trend === 'decreasing'
                      ? 'text-[#15966B]'
                      : cat.trend === 'new'
                        ? 'text-[#365FE8]'
                        : 'text-[#697386]';

                return (
                  <tr
                    key={cat.category}
                    className={`transition-colors ${
                      isSelected ? 'bg-[#EDF2FF]' : 'hover:bg-[#F7F8FA]'
                    }`}
                  >
                    <td className="py-3 pr-3 font-semibold text-[#151922]">{cat.category}</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-[#151922]">
                      ₹{formatCurrencyExact(cat.totalSpent)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-[#697386]">
                      {cat.sharePct}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-[#697386]">
                      {cat.txCount}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-[#697386]">
                      ₹{formatCurrencyExact(cat.avgTxValue)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      {cat.deltaPct !== null ? (
                        <span
                          className={
                            cat.deltaPct > 0
                              ? 'text-[#9E6614] font-semibold'
                              : cat.deltaPct < 0
                                ? 'text-[#15966B] font-semibold'
                                : 'text-[#697386]'
                          }
                        >
                          {cat.deltaPct > 0 ? '+' : ''}
                          {cat.deltaPct}%
                        </span>
                      ) : (
                        <span className="text-[#929BAB]">—</span>
                      )}
                    </td>
                    <td className={`py-3 px-3 font-semibold ${trendClass}`}>{trendLabel}</td>
                    <td className="py-3 pl-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          onSelectCategory(isSelected ? null : cat.category)
                        }
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                          isSelected
                            ? 'bg-[#365FE8] text-white'
                            : 'bg-[#F1F3F6] hover:bg-[#EDF2FF] text-[#151922] hover:text-[#365FE8]'
                        }`}
                      >
                        {isSelected ? 'Hide' : `Inspect (${cat.txCount})`}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Interactive Category Transaction Drill-Down */}
        {selectedDetail && (
          <div className="mt-5 pt-4 border-t border-[#E7EAF0]">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h4 className="text-sm font-bold text-[#151922]">
                  {selectedDetail.category} — Transactions in {window.label}
                </h4>
                <p className="text-xs text-[#697386] mt-0.5">
                  {selectedDetail.txCount} transactions · Total ₹
                  {formatCurrencyExact(selectedDetail.totalSpent)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenTxInExplorer(selectedDetail.category)}
                className="text-xs font-semibold text-[#365FE8] hover:text-[#294FCC] flex items-center gap-1 whitespace-nowrap"
              >
                Open in Explorer
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {selectedDetail.transactions.length === 0 ? (
              <p className="text-xs text-[#697386] py-4">
                No active transactions in {selectedDetail.category} during {window.label} (previous period had ₹{formatCurrencyExact(selectedDetail.prevSpent)}).
              </p>
            ) : (
              <div className="divide-y divide-[#E7EAF0] rounded-xl bg-[#F7F8FA] border border-[#E7EAF0]">
                {selectedDetail.transactions.map((slice) => (
                  <div
                    key={slice.tx.id}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[#151922] truncate">{slice.tx.name}</p>
                      <p className="text-[#697386] mt-0.5">
                        {new Date(slice.tx.timestamp).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        · {slice.tx.source ?? 'manual'}
                        {slice.tx.status === 'refunded' ? ' · Partial Refund Adjusted' : ''}
                      </p>
                    </div>
                    <span className="font-mono tabular-nums font-bold text-[#151922] shrink-0">
                      ₹{formatCurrencyExact(slice.effectiveAmount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
