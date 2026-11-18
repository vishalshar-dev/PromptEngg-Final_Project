import { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  LineChart,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { formatCurrencyExact } from '../../utils/categoryStyles';
import { buildProductPriceSummaries } from '../../utils/priceTrackerEngine';
import { ProductVisual } from '../mart/ProductVisual';

export function PriceTrendTracker({
  onOpenPriceTracker,
}: {
  onOpenPriceTracker?: () => void;
}) {
  const items = useAppStore((s) => s.items);
  const categoryConfigs = useAppStore((s) => s.categoryConfigs);
  const priceObservations = useAppStore((s) => s.priceObservations);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const summaries = useMemo(
    () => buildProductPriceSummaries(priceObservations, items),
    [priceObservations, items]
  );

  const selected =
    summaries.find((s) => s.productId === selectedId) ?? summaries[0] ?? null;

  if (summaries.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <LineChart className="w-4 h-4 text-sky-400" strokeWidth={2.5} />
            <h3 className="text-sm font-extrabold tracking-tight">Price Trend Tracker</h3>
          </div>
          {onOpenPriceTracker && (
            <button
              type="button"
              onClick={onOpenPriceTracker}
              className="text-[11px] font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1"
            >
              Open Full Tracker <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="bg-ink-900/50 border border-dashed border-white/[0.08] rounded-xl p-5 text-center space-y-1.5">
          <Clock className="w-5 h-5 text-zinc-500 mx-auto" />
          <p className="text-xs font-bold text-zinc-300">No recorded purchase prices yet</p>
          <p className="text-[11px] text-zinc-500">
            Click &ldquo;Record Expense &amp; Track Prices&rdquo; on any scanned receipt, or check out in Quick Mart to track unit-normalized price history.
          </p>
        </div>
      </div>
    );
  }

  const catalogItem = items.find((i) => i.id === selected?.productId);
  const catConfig = categoryConfigs.find((c) => c.name === selected?.category);
  const pct = selected?.overallChangePct ?? null;
  const isUp = pct !== null && pct >= 1;
  const isDown = pct !== null && pct <= -1;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <LineChart className="w-4 h-4 text-sky-400" strokeWidth={2.5} />
          <h3 className="text-sm font-extrabold tracking-tight">Price Trend Tracker</h3>
        </div>
        {onOpenPriceTracker && (
          <button
            type="button"
            onClick={onOpenPriceTracker}
            className="text-[11px] font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1"
          >
            Open Full Tracker <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Product Selector */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {summaries.map((s) => {
          const active = selected?.productId === s.productId;
          return (
            <button
              key={s.productId}
              type="button"
              onClick={() => setSelectedId(s.productId)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                active
                  ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                  : 'bg-white/[0.03] text-zinc-400 border-white/[0.05] hover:bg-white/[0.06]'
              }`}
            >
              <span>{s.productName}</span>
              <span className="text-[10px] font-mono opacity-75">
                ₹{formatCurrencyExact(s.latestPrice)}/{s.unitOfMeasurement}
              </span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="glass rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <ProductVisual
                name={selected.productName}
                category={selected.category}
                imageUrl={catalogItem?.imageUrl ?? catConfig?.imageUrl}
                iconKey={catConfig?.iconKey}
                accent={catConfig?.accent}
                size="xs"
              />
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{selected.productName}</p>
                <p className="text-[10px] text-zinc-400 font-mono">
                  {selected.purchaseCount} real {selected.purchaseCount === 1 ? 'purchase' : 'purchases'} · per{' '}
                  {selected.unitOfMeasurement}
                </p>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <p className="text-base font-extrabold font-mono text-white tabular-nums">
                ₹{formatCurrencyExact(selected.latestPrice)}
                <span className="text-[10px] text-zinc-500">/{selected.unitOfMeasurement}</span>
              </p>
              {pct !== null ? (
                <div
                  className={`flex items-center justify-end gap-1 text-[11px] font-bold font-mono ${
                    isUp ? 'text-red-400' : isDown ? 'text-brand-400' : 'text-sky-400'
                  }`}
                >
                  {isUp ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : isDown ? (
                    <TrendingDown className="w-3 h-3" />
                  ) : (
                    <Minus className="w-3 h-3" />
                  )}
                  <span>
                    {pct > 0 ? '+' : ''}
                    {pct.toFixed(1)}% overall
                  </span>
                </div>
              ) : (
                <p className="text-[10px] text-zinc-500 font-semibold">Single purchase</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-ink-900/70 rounded-lg p-2 border border-white/[0.04]">
              <p className="text-[9px] font-bold uppercase text-zinc-500">Average</p>
              <p className="text-xs font-extrabold font-mono text-zinc-200 mt-0.5">
                ₹{formatCurrencyExact(selected.averagePrice)}
              </p>
            </div>
            <div className="bg-ink-900/70 rounded-lg p-2 border border-white/[0.04]">
              <p className="text-[9px] font-bold uppercase text-zinc-500">Lowest</p>
              <p className="text-xs font-extrabold font-mono text-brand-400 mt-0.5">
                ₹{formatCurrencyExact(selected.lowestPrice)}
              </p>
            </div>
            <div className="bg-ink-900/70 rounded-lg p-2 border border-white/[0.04]">
              <p className="text-[9px] font-bold uppercase text-zinc-500">Highest</p>
              <p className="text-xs font-extrabold font-mono text-orange-400 mt-0.5">
                ₹{formatCurrencyExact(selected.highestPrice)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
