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
            <div className="w-9 h-9 rounded-xl bg-[var(--accent-primary-soft)] border border-[var(--accent-border)] text-[var(--accent-ink)] flex items-center justify-center">
              <LineChart className="w-4 h-4" strokeWidth={2.25} />
            </div>
            <h3 className="font-display text-[15px] font-bold text-[var(--text-primary)] tracking-tight">
              Price Trend Tracker
            </h3>
          </div>
          {onOpenPriceTracker && (
            <button
              type="button"
              onClick={onOpenPriceTracker}
              className="text-[12.5px] font-semibold text-[var(--accent-ink)] hover:opacity-80 flex items-center gap-1"
            >
              Open Full Tracker <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="py-4 text-center space-y-1.5">
          <div className="w-9 h-9 rounded-xl bg-[var(--bg-well)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto mb-1">
            <Clock className="w-4 h-4 text-[var(--text-secondary)]" />
          </div>
          <p className="text-[13px] font-semibold text-[var(--text-primary)]">
            No recorded purchase prices yet
          </p>
          <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed max-w-sm mx-auto">
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
          <div className="w-9 h-9 rounded-xl bg-[var(--accent-primary-soft)] border border-[var(--accent-border)] text-[var(--accent-ink)] flex items-center justify-center">
            <LineChart className="w-4 h-4" strokeWidth={2.25} />
          </div>
          <h3 className="font-display text-[15px] font-bold text-[var(--text-primary)] tracking-tight">
            Price Trend Tracker
          </h3>
        </div>
        {onOpenPriceTracker && (
          <button
            type="button"
            onClick={onOpenPriceTracker}
            className="text-[12.5px] font-semibold text-[var(--accent-ink)] hover:opacity-80 flex items-center gap-1"
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
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 border ${
                active
                  ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]'
                  : 'bg-[var(--bg-well)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>{s.productName}</span>
              <span className="text-[12px] font-mono tabular-nums opacity-85">
                ₹{formatCurrencyExact(s.latestPrice)}/{s.unitOfMeasurement}
              </span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="surface-well p-4 space-y-3.5">
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
                <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                  {selected.productName}
                </p>
                <p className="text-[12px] text-[var(--text-secondary)] font-mono tabular-nums">
                  {selected.purchaseCount} real{' '}
                  {selected.purchaseCount === 1 ? 'purchase' : 'purchases'} · per{' '}
                  {selected.unitOfMeasurement}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <p className="text-base font-bold font-mono text-[var(--text-primary)] tabular-nums">
                ₹{formatCurrencyExact(selected.latestPrice)}
                <span className="text-[12px] text-[var(--text-secondary)]">
                  /{selected.unitOfMeasurement}
                </span>
              </p>
              {pct !== null ? (
                <div
                  className={`flex items-center justify-end gap-1 text-[12px] font-bold font-mono tabular-nums ${
                    isUp
                      ? 'text-[var(--accent-danger-ink)]'
                      : isDown
                      ? 'text-[var(--accent-success-ink)]'
                      : 'text-[var(--accent-ink)]'
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
                <p className="text-[12px] text-[var(--text-secondary)] font-medium">
                  Single purchase
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x divide-[var(--border-subtle)] pt-2 border-t border-[var(--border-subtle)] text-center">
            <div className="px-2">
              <p className="text-[12px] font-medium text-[var(--text-secondary)]">
                Average
              </p>
              <p className="text-[12.5px] font-bold font-mono text-[var(--text-primary)] tabular-nums mt-0.5">
                ₹{formatCurrencyExact(selected.averagePrice)}
              </p>
            </div>
            <div className="px-2">
              <p className="text-[12px] font-medium text-[var(--text-secondary)]">
                Lowest
              </p>
              <p className="text-[12.5px] font-bold font-mono text-[var(--accent-success-ink)] tabular-nums mt-0.5">
                ₹{formatCurrencyExact(selected.lowestPrice)}
              </p>
            </div>
            <div className="px-2">
              <p className="text-[12px] font-medium text-[var(--text-secondary)]">
                Highest
              </p>
              <p className="text-[12.5px] font-bold font-mono text-[var(--accent-warning-ink)] tabular-nums mt-0.5">
                ₹{formatCurrencyExact(selected.highestPrice)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
