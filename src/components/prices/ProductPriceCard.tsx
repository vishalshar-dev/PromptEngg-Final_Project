import { TrendingUp, TrendingDown, Minus, Clock, ChevronRight } from 'lucide-react';
import type { CartItem, CategoryConfig } from '../../types/models';
import type { ProductPriceSummary } from '../../utils/priceTrackerEngine';
import { formatCurrencyExact, getCategoryStyle } from '../../utils/categoryStyles';
import { ProductVisual } from '../mart/ProductVisual';

interface ProductPriceCardProps {
  summary: ProductPriceSummary;
  catalogItem?: CartItem;
  categoryConfig?: CategoryConfig;
  onSelect: (productId: string) => void;
}

export function ProductPriceCard({
  summary,
  catalogItem,
  categoryConfig,
  onSelect,
}: ProductPriceCardProps) {
  const catStyle = getCategoryStyle(summary.category, categoryConfig?.accent);
  const pct = summary.overallChangePct;

  const badge =
    summary.trendDirection === 'increasing'
      ? {
          text: `+${pct?.toFixed(1)}%`,
          cls: 'bg-red-500/15 text-red-400 border-red-500/25',
          Icon: TrendingUp,
        }
      : summary.trendDirection === 'decreasing'
      ? {
          text: `${pct?.toFixed(1)}%`,
          cls: 'bg-brand-500/15 text-brand-400 border-brand-500/25',
          Icon: TrendingDown,
        }
      : summary.trendDirection === 'stable'
      ? {
          text: 'Stable',
          cls: 'bg-sky-500/15 text-sky-300 border-sky-500/25',
          Icon: Minus,
        }
      : {
          text: '1 Buy',
          cls: 'bg-white/[0.06] text-zinc-400 border-white/[0.1]',
          Icon: Clock,
        };

  const BadgeIcon = badge.Icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(summary.productId)}
      className="w-full text-left glass rounded-2xl p-3.5 border border-white/[0.06] hover:border-white/[0.16] hover:bg-white/[0.04] transition-all group flex flex-col gap-3"
    >
      <div className="flex items-start gap-3">
        <ProductVisual
          name={summary.productName}
          category={summary.category}
          imageUrl={catalogItem?.imageUrl ?? categoryConfig?.imageUrl}
          iconKey={categoryConfig?.iconKey}
          accent={categoryConfig?.accent}
          size="sm"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-extrabold text-white truncate group-hover:text-brand-300 transition-colors">
              {summary.productName}
            </h4>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-mono font-extrabold whitespace-nowrap ${badge.cls}`}
            >
              <BadgeIcon className="w-3 h-3" strokeWidth={2.5} />
              {badge.text}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            <span className={`text-[10px] font-bold ${catStyle.text}`}>
              {summary.category}
            </span>
            <span className="text-[10px] text-zinc-600">·</span>
            <span className="text-[10px] font-mono text-zinc-400">
              {summary.purchaseCount} {summary.purchaseCount === 1 ? 'record' : 'records'}
            </span>
            {summary.brands.length > 0 && (
              <>
                <span className="text-[10px] text-zinc-600">·</span>
                <span className="text-[10px] text-zinc-400 truncate max-w-[110px]">
                  {summary.brands.join(', ')}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/[0.06] items-center">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
            Latest/{summary.unitOfMeasurement}
          </p>
          <p className="text-sm font-extrabold font-mono text-white tabular-nums">
            ₹{formatCurrencyExact(summary.latestPrice)}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
            Avg/{summary.unitOfMeasurement}
          </p>
          <p className="text-xs font-bold font-mono text-zinc-300 tabular-nums">
            ₹{formatCurrencyExact(summary.averagePrice)}
          </p>
        </div>
        <div className="text-right flex items-center justify-end gap-1 text-[11px] font-bold text-zinc-500 group-hover:text-brand-400">
          <span>
            {new Date(summary.mostRecentDate).toLocaleDateString('en-IN', {
              month: 'short',
              day: 'numeric',
            })}
          </span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </button>
  );
}
