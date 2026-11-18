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
          cls: 'bg-[#FDECEC] text-[#DE5252] border-[#F6B8B8]',
          Icon: TrendingUp,
        }
      : summary.trendDirection === 'decreasing'
      ? {
          text: `${pct?.toFixed(1)}%`,
          cls: 'bg-[#E8F7F1] text-[#15966B] border-[#B7E4D3]',
          Icon: TrendingDown,
        }
      : summary.trendDirection === 'stable'
      ? {
          text: 'Stable',
          cls: 'bg-[#EDF2FF] text-[#365FE8] border-[#D4E0FF]',
          Icon: Minus,
        }
      : {
          text: '1 Buy',
          cls: 'bg-[#F1F3F6] text-[#697386] border-[#E7EAF0]',
          Icon: Clock,
        };

  const BadgeIcon = badge.Icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(summary.productId)}
      className="w-full text-left surface-card p-3.5 hover:border-[#D4E0FF] hover:shadow-md transition-all group flex flex-col gap-3"
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
            <h4 className="text-sm font-bold text-[#151922] truncate group-hover:text-[#365FE8] transition-colors">
              {summary.productName}
            </h4>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-mono font-semibold whitespace-nowrap shrink-0 ${badge.cls}`}
            >
              <BadgeIcon className="w-3 h-3" strokeWidth={2.2} />
              {badge.text}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            <span className={`text-[11px] font-semibold ${catStyle.text}`}>
              {summary.category}
            </span>
            <span className="text-[11px] text-[#929BAB]">·</span>
            <span className="text-[11px] font-mono text-[#697386]">
              {summary.purchaseCount} {summary.purchaseCount === 1 ? 'record' : 'records'}
            </span>
            {summary.brands.length > 0 && (
              <>
                <span className="text-[11px] text-[#929BAB]">·</span>
                <span className="text-[11px] text-[#697386] truncate max-w-[110px]">
                  {summary.brands.join(', ')}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-[#E7EAF0] items-center">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#697386]">
            Latest/{summary.unitOfMeasurement}
          </p>
          <p className="text-sm font-bold font-mono text-[#151922] tabular-nums">
            ₹{formatCurrencyExact(summary.latestPrice)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#697386]">
            Avg/{summary.unitOfMeasurement}
          </p>
          <p className="text-xs font-semibold font-mono text-[#697386] tabular-nums">
            ₹{formatCurrencyExact(summary.averagePrice)}
          </p>
        </div>
        <div className="text-right flex items-center justify-end gap-1 text-xs font-semibold text-[#697386] group-hover:text-[#365FE8]">
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
