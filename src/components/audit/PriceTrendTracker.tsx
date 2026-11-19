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
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EDF2FF] border border-[#D4E0FF] text-[#365FE8] flex items-center justify-center">
              <LineChart className="w-4 h-4" strokeWidth={2.25} />
            </div>
            <h3 className="text-[15px] font-bold text-[#151922] tracking-tight">
              Price Trend Tracker
            </h3>
          </div>
          {onOpenPriceTracker && (
            <button
              type="button"
              onClick={onOpenPriceTracker}
              className="text-xs font-semibold text-[#365FE8] hover:text-[#294FCC] flex items-center gap-1"
            >
              Open Full Tracker <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="py-4 text-center space-y-1.5">
          <div className="w-9 h-9 rounded-xl bg-[#F1F3F6] border border-[#E7EAF0] flex items-center justify-center mx-auto mb-1">
            <Clock className="w-4 h-4 text-[#697386]" />
          </div>
          <p className="text-xs font-semibold text-[#151922]">
            No recorded purchase prices yet
          </p>
          <p className="text-xs text-[#697386] leading-relaxed max-w-sm mx-auto">
            Click &ldquo;Record Expense &amp; Track Prices&rdquo; on any scanned receipt, or check out in Shopping to track unit-normalized price history.
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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#EDF2FF] border border-[#D4E0FF] text-[#365FE8] flex items-center justify-center">
            <LineChart className="w-4 h-4" strokeWidth={2.25} />
          </div>
          <h3 className="text-[15px] font-bold text-[#151922] tracking-tight">
            Price Trend Tracker
          </h3>
        </div>
        {onOpenPriceTracker && (
          <button
            type="button"
            onClick={onOpenPriceTracker}
            className="text-xs font-semibold text-[#365FE8] hover:text-[#294FCC] flex items-center gap-1"
          >
            Open Full Tracker <ArrowRight className="w-3.5 h-3.5" />
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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 border ${
                active
                  ? 'bg-[#365FE8] text-white border-[#365FE8]'
                  : 'bg-[#F7F8FA] text-[#697386] border-[#E7EAF0] hover:text-[#151922]'
              }`}
            >
              <span>{s.productName}</span>
              <span className="text-[11px] font-mono opacity-85">
                ₹{formatCurrencyExact(s.latestPrice)}/{s.unitOfMeasurement}
              </span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="surface-subtle p-4 space-y-3.5">
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
                <p className="text-sm font-bold text-[#151922] truncate">
                  {selected.productName}
                </p>
                <p className="text-[11px] text-[#697386] font-mono">
                  {selected.purchaseCount} real{' '}
                  {selected.purchaseCount === 1 ? 'purchase' : 'purchases'} · per{' '}
                  {selected.unitOfMeasurement}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <p className="text-base font-bold font-mono text-[#151922] tabular-nums">
                ₹{formatCurrencyExact(selected.latestPrice)}
                <span className="text-[11px] text-[#697386]">
                  /{selected.unitOfMeasurement}
                </span>
              </p>
              {pct !== null ? (
                <div
                  className={`flex items-center justify-end gap-1 text-[11px] font-bold font-mono ${
                    isUp
                      ? 'text-[#DE5252]'
                      : isDown
                      ? 'text-[#15966B]'
                      : 'text-[#365FE8]'
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
                <p className="text-[11px] text-[#697386] font-medium">
                  Single purchase
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-[#FFFFFF] rounded-lg p-2.5 border border-[#E7EAF0]">
              <p className="text-[10px] font-semibold uppercase text-[#697386]">
                Average
              </p>
              <p className="text-xs font-bold font-mono text-[#151922] tabular-nums mt-0.5">
                ₹{formatCurrencyExact(selected.averagePrice)}
              </p>
            </div>
            <div className="bg-[#FFFFFF] rounded-lg p-2.5 border border-[#E7EAF0]">
              <p className="text-[10px] font-semibold uppercase text-[#697386]">
                Lowest
              </p>
              <p className="text-xs font-bold font-mono text-[#15966B] tabular-nums mt-0.5">
                ₹{formatCurrencyExact(selected.lowestPrice)}
              </p>
            </div>
            <div className="bg-[#FFFFFF] rounded-lg p-2.5 border border-[#E7EAF0]">
              <p className="text-[10px] font-semibold uppercase text-[#697386]">
                Highest
              </p>
              <p className="text-xs font-bold font-mono text-[#9E6614] tabular-nums mt-0.5">
                ₹{formatCurrencyExact(selected.highestPrice)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
