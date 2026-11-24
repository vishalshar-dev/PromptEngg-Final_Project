import { Layers, TrendingUp, TrendingDown } from 'lucide-react';
import type { CategoryConfig } from '../../types/models';
import type { CategoryPriceAnalyticsRow } from '../../utils/priceTrackerEngine';
import { formatCurrencyExact, getCategoryStyle } from '../../utils/categoryStyles';
import { CategoryIcon } from '../mart/CategoryIcon';

interface CategoryPriceAnalyticsProps {
  rows: CategoryPriceAnalyticsRow[];
  categoryConfigs: CategoryConfig[];
  onSelectCategory?: (category: string) => void;
  onSelectProduct?: (productId: string) => void;
}

export function CategoryPriceAnalytics({
  rows,
  categoryConfigs,
  onSelectCategory,
  onSelectProduct,
}: CategoryPriceAnalyticsProps) {
  if (rows.length === 0) {
    return (
      <div className="surface-card p-8 text-center">
        <Layers className="w-7 h-7 text-[var(--text-muted)] mx-auto mb-2" />
        <p className="text-sm font-semibold text-[var(--text-primary)]">No category price data yet</p>
        <p className="text-[12.5px] text-[var(--text-secondary)] mt-1">
          Tracked purchases from Shopping, Receipt Scanner, or Manual Entry will populate category price analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[var(--accent-ink)]" strokeWidth={2.2} />
          <h3 className="font-display text-sm font-bold text-[var(--text-primary)]">
            Category-Wise Price Trends
          </h3>
        </div>
        <span className="text-[12px] text-[var(--text-secondary)]">
          Average % change calculated per product
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {rows.map((row) => {
          const cfg = categoryConfigs.find((c) => c.name === row.category);
          const style = getCategoryStyle(row.category, cfg?.accent);
          const avgPct = row.avgPriceChangePct;
          const isUp = avgPct !== null && avgPct >= 1;
          const isDown = avgPct !== null && avgPct <= -1;

          return (
            <div
              key={row.category}
              className="surface-card p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onSelectCategory?.(row.category)}
                  className="flex items-center gap-2.5 min-w-0 text-left group"
                >
                  <div
                    className={`w-9 h-9 rounded-xl ${style.bg} ${style.text} border ${style.border} flex items-center justify-center flex-shrink-0`}
                  >
                    <CategoryIcon iconKey={cfg?.iconKey} className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-ink)]">
                      {row.category}
                    </p>
                    <p className="text-[12px] text-[var(--text-secondary)]">
                      {row.trackedProducts} product{row.trackedProducts === 1 ? '' : 's'} ·{' '}
                      {row.totalPurchases} buy{row.totalPurchases === 1 ? '' : 's'}
                    </p>
                  </div>
                </button>

                <div className="text-right flex-shrink-0">
                  {avgPct !== null ? (
                    <span
                      className={`inline-flex items-center gap-1 text-[12.5px] font-mono font-bold tabular-nums ${
                        isUp
                          ? 'text-[var(--accent-danger-ink)]'
                          : isDown
                          ? 'text-[var(--accent-success-ink)]'
                          : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      {isUp ? (
                        <TrendingUp className="w-3.5 h-3.5" />
                      ) : isDown ? (
                        <TrendingDown className="w-3.5 h-3.5" />
                      ) : null}
                      {avgPct > 0 ? '+' : ''}
                      {avgPct.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-[12px] font-medium text-[var(--text-secondary)]">
                      Single-buy baseline
                    </span>
                  )}
                  <p className="text-[12px] font-mono text-[var(--text-secondary)] mt-0.5 tabular-nums">
                    ₹{formatCurrencyExact(row.totalSpend)} spend
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="surface-well p-2.5">
                  <p className="text-[12px] font-medium text-[var(--text-secondary)]">Increasing</p>
                  <p className="text-sm font-bold font-mono text-[var(--accent-danger-ink)] mt-0.5 tabular-nums">
                    {row.increasingCount}
                  </p>
                </div>
                <div className="surface-well p-2.5">
                  <p className="text-[12px] font-medium text-[var(--text-secondary)]">Decreasing</p>
                  <p className="text-sm font-bold font-mono text-[var(--accent-success-ink)] mt-0.5 tabular-nums">
                    {row.decreasingCount}
                  </p>
                </div>
                <div className="surface-well p-2.5">
                  <p className="text-[12px] font-medium text-[var(--text-secondary)]">Stable / 1× Buy</p>
                  <p className="text-sm font-bold font-mono text-[var(--text-primary)] mt-0.5 tabular-nums">
                    {row.stableOrSingleCount}
                  </p>
                </div>
              </div>

              {row.topMover && row.topMover.overallChangePct !== null && (
                <div className="flex items-center justify-between pt-2.5 border-t border-[var(--border-subtle)] text-[12.5px]">
                  <span className="text-[var(--text-secondary)]">Top mover:</span>
                  <button
                    type="button"
                    onClick={() => onSelectProduct?.(row.topMover!.productId)}
                    className="font-semibold text-[var(--text-primary)] hover:text-[var(--accent-ink)] transition-colors"
                  >
                    {row.topMover.productName}{' '}
                    <span
                      className={`font-mono tabular-nums ${
                        row.topMover.overallChangePct > 0
                          ? 'text-[var(--accent-danger-ink)]'
                          : 'text-[var(--accent-success-ink)]'
                      }`}
                    >
                      ({row.topMover.overallChangePct > 0 ? '+' : ''}
                      {row.topMover.overallChangePct.toFixed(1)}%)
                    </span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
