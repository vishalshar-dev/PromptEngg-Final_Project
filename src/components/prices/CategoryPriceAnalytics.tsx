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
      <div className="glass rounded-2xl p-8 text-center">
        <Layers className="w-7 h-7 text-zinc-600 mx-auto mb-2" />
        <p className="text-sm font-bold text-zinc-300">No category price data yet</p>
        <p className="text-xs text-zinc-500 mt-1">
          Tracked purchases from Quick Mart, Audit, or Manual Entry will populate category price analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-brand-400" strokeWidth={2.5} />
          <h3 className="text-sm font-extrabold text-white">Category-Wise Price Trends</h3>
        </div>
        <span className="text-[11px] text-zinc-500">
          Average % change calculated per product (never mixing unrelated prices)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map((row) => {
          const cfg = categoryConfigs.find((c) => c.name === row.category);
          const style = getCategoryStyle(row.category, cfg?.accent);
          const avgPct = row.avgPriceChangePct;
          const isUp = avgPct !== null && avgPct >= 1;
          const isDown = avgPct !== null && avgPct <= -1;

          return (
            <div
              key={row.category}
              className="glass rounded-2xl p-4 border border-white/[0.06] space-y-3"
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
                    <p className="text-sm font-extrabold text-white truncate group-hover:text-brand-300">
                      {row.category}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {row.trackedProducts} product{row.trackedProducts === 1 ? '' : 's'} ·{' '}
                      {row.totalPurchases} buy{row.totalPurchases === 1 ? '' : 's'}
                    </p>
                  </div>
                </button>

                <div className="text-right flex-shrink-0">
                  {avgPct !== null ? (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-mono font-extrabold ${
                        isUp
                          ? 'bg-red-500/15 text-red-400 border-red-500/25'
                          : isDown
                          ? 'bg-brand-500/15 text-brand-400 border-brand-500/25'
                          : 'bg-white/[0.06] text-zinc-300 border-white/[0.1]'
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
                    <span className="text-[11px] font-semibold text-zinc-500">
                      Single-buy baseline
                    </span>
                  )}
                  <p className="text-[11px] font-mono text-zinc-400 mt-1">
                    ₹{formatCurrencyExact(row.totalSpend)} spend
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-ink-900/70 rounded-xl p-2 border border-white/[0.04]">
                  <p className="text-[9px] font-bold uppercase text-zinc-500">Increasing</p>
                  <p className="text-sm font-extrabold font-mono text-red-400 mt-0.5">
                    {row.increasingCount}
                  </p>
                </div>
                <div className="bg-ink-900/70 rounded-xl p-2 border border-white/[0.04]">
                  <p className="text-[9px] font-bold uppercase text-zinc-500">Decreasing</p>
                  <p className="text-sm font-extrabold font-mono text-brand-400 mt-0.5">
                    {row.decreasingCount}
                  </p>
                </div>
                <div className="bg-ink-900/70 rounded-xl p-2 border border-white/[0.04]">
                  <p className="text-[9px] font-bold uppercase text-zinc-500">Stable / 1× Buy</p>
                  <p className="text-sm font-extrabold font-mono text-zinc-300 mt-0.5">
                    {row.stableOrSingleCount}
                  </p>
                </div>
              </div>

              {row.topMover && row.topMover.overallChangePct !== null && (
                <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs">
                  <span className="text-zinc-500">Top mover:</span>
                  <button
                    type="button"
                    onClick={() => onSelectProduct?.(row.topMover!.productId)}
                    className="font-bold text-zinc-200 hover:text-brand-400 transition-colors"
                  >
                    {row.topMover.productName}{' '}
                    <span
                      className={`font-mono ${
                        row.topMover.overallChangePct > 0 ? 'text-red-400' : 'text-brand-400'
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
