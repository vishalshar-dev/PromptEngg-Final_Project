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
        <Layers className="w-7 h-7 text-[#929BAB] mx-auto mb-2" />
        <p className="text-sm font-semibold text-[#151922]">No category price data yet</p>
        <p className="text-xs text-[#697386] mt-1">
          Tracked purchases from Shopping, Receipt Scanner, or Manual Entry will populate category price analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#365FE8]" strokeWidth={2.2} />
          <h3 className="text-sm font-bold text-[#151922]">Category-Wise Price Trends</h3>
        </div>
        <span className="text-xs text-[#697386]">
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
                    <p className="text-sm font-bold text-[#151922] truncate group-hover:text-[#365FE8]">
                      {row.category}
                    </p>
                    <p className="text-xs text-[#697386]">
                      {row.trackedProducts} product{row.trackedProducts === 1 ? '' : 's'} ·{' '}
                      {row.totalPurchases} buy{row.totalPurchases === 1 ? '' : 's'}
                    </p>
                  </div>
                </button>

                <div className="text-right flex-shrink-0">
                  {avgPct !== null ? (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-mono font-semibold ${
                        isUp
                          ? 'bg-[#FDECEC] text-[#DE5252] border-[#F6B8B8]'
                          : isDown
                          ? 'bg-[#E8F7F1] text-[#15966B] border-[#B7E4D3]'
                          : 'bg-[#F1F3F6] text-[#697386] border-[#E7EAF0]'
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
                    <span className="text-xs font-medium text-[#697386]">
                      Single-buy baseline
                    </span>
                  )}
                  <p className="text-xs font-mono text-[#697386] mt-1">
                    ₹{formatCurrencyExact(row.totalSpend)} spend
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="surface-subtle p-2">
                  <p className="text-[10px] font-semibold uppercase text-[#697386]">Increasing</p>
                  <p className="text-sm font-bold font-mono text-[#DE5252] mt-0.5">
                    {row.increasingCount}
                  </p>
                </div>
                <div className="surface-subtle p-2">
                  <p className="text-[10px] font-semibold uppercase text-[#697386]">Decreasing</p>
                  <p className="text-sm font-bold font-mono text-[#15966B] mt-0.5">
                    {row.decreasingCount}
                  </p>
                </div>
                <div className="surface-subtle p-2">
                  <p className="text-[10px] font-semibold uppercase text-[#697386]">Stable / 1× Buy</p>
                  <p className="text-sm font-bold font-mono text-[#151922] mt-0.5">
                    {row.stableOrSingleCount}
                  </p>
                </div>
              </div>

              {row.topMover && row.topMover.overallChangePct !== null && (
                <div className="flex items-center justify-between pt-2 border-t border-[#E7EAF0] text-xs">
                  <span className="text-[#697386]">Top mover:</span>
                  <button
                    type="button"
                    onClick={() => onSelectProduct?.(row.topMover!.productId)}
                    className="font-semibold text-[#151922] hover:text-[#365FE8] transition-colors"
                  >
                    {row.topMover.productName}{' '}
                    <span
                      className={`font-mono ${
                        row.topMover.overallChangePct > 0 ? 'text-[#DE5252]' : 'text-[#15966B]'
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
