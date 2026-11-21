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

  const trend =
    summary.trendDirection === 'increasing'
      ? {
          text: `+${pct?.toFixed(1)}%`,
          cls: 'text-[#DE5252]',
          Icon: TrendingUp,
        }
      : summary.trendDirection === 'decreasing'
        ? {
            text: `${pct?.toFixed(1)}%`,
            cls: 'text-[#15966B]',
            Icon: TrendingDown,
          }
        : summary.trendDirection === 'stable'
          ? {
              text: 'Stable',
              cls: 'text-[#365FE8]',
              Icon: Minus,
            }
          : {
              text: '1 buy',
              cls: 'text-[#697386]',
              Icon: Clock,
            };

  const TrendIcon = trend.Icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(summary.productId)}
      className="w-full text-left bg-white border border-[#E7EAF0] hover:border-[#D5DBE5] rounded-xl p-4 transition-colors group flex flex-col gap-3"
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
            <h4 className="text-[14px] font-semibold text-[#151922] truncate group-hover:text-[#365FE8] transition-colors">
              {summary.productName}
            </h4>
            <span
              className={`inline-flex items-center gap-1 text-[11.5px] font-mono font-semibold whitespace-nowrap shrink-0 ${trend.cls}`}
            >
              <TrendIcon className="w-3 h-3" strokeWidth={2} />
              <span>{trend.text}</span>
            </span>
          </div>

          <p className="text-[11.5px] text-[#697386] mt-1 truncate">
            <span className={`font-medium ${catStyle.text}`}>{summary.category}</span>
            {' · '}
            <span className="font-mono">
              {summary.purchaseCount} {summary.purchaseCount === 1 ? 'record' : 'records'}
            </span>
            {summary.brands.length > 0 && ` · ${summary.brands.join(', ')}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-[#E7EAF0] items-center">
        <div>
          <p className="text-[11px] font-medium text-[#697386]">
            Latest/{summary.unitOfMeasurement}
          </p>
          <p className="text-[13.5px] font-semibold font-mono text-[#151922] tabular-nums">
            ₹{formatCurrencyExact(summary.latestPrice)}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-[#697386]">
            Avg/{summary.unitOfMeasurement}
          </p>
          <p className="text-[12.5px] font-medium font-mono text-[#697386] tabular-nums">
            ₹{formatCurrencyExact(summary.averagePrice)}
          </p>
        </div>
        <div className="text-right flex items-center justify-end gap-1 text-[12px] font-medium text-[#697386] group-hover:text-[#365FE8]">
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
