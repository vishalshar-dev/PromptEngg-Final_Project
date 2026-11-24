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
          cls: 'text-[var(--accent-danger-ink)]',
          Icon: TrendingUp,
        }
      : summary.trendDirection === 'decreasing'
        ? {
            text: `${pct?.toFixed(1)}%`,
            cls: 'text-[var(--accent-success-ink)]',
            Icon: TrendingDown,
          }
        : summary.trendDirection === 'stable'
          ? {
              text: 'Stable',
              cls: 'text-[var(--accent-ink)]',
              Icon: Minus,
            }
          : {
              text: '1 buy',
              cls: 'text-[var(--text-secondary)]',
              Icon: Clock,
            };

  const TrendIcon = trend.Icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(summary.productId)}
      className="surface-card-interactive w-full text-left p-4 group flex flex-col gap-3"
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
            <h4 className="font-display text-[14px] font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-ink)] transition-colors">
              {summary.productName}
            </h4>
            <span
              className={`inline-flex items-center gap-1 text-[12px] font-mono font-semibold whitespace-nowrap shrink-0 tabular-nums ${trend.cls}`}
            >
              <TrendIcon className="w-3 h-3" strokeWidth={2} />
              <span>{trend.text}</span>
            </span>
          </div>

          <p className="text-[12px] text-[var(--text-secondary)] mt-1 truncate">
            <span className={`font-medium ${catStyle.text}`}>{summary.category}</span>
            {' · '}
            <span className="font-mono">
              {summary.purchaseCount} {summary.purchaseCount === 1 ? 'record' : 'records'}
            </span>
            {summary.brands.length > 0 && ` · ${summary.brands.join(', ')}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-[var(--border-subtle)] items-center">
        <div>
          <p className="text-[11.5px] font-medium text-[var(--text-secondary)]">
            Latest/{summary.unitOfMeasurement}
          </p>
          <p className="text-[13.5px] font-semibold font-mono text-[var(--text-primary)] tabular-nums">
            ₹{formatCurrencyExact(summary.latestPrice)}
          </p>
        </div>
        <div>
          <p className="text-[11.5px] font-medium text-[var(--text-secondary)]">
            Avg/{summary.unitOfMeasurement}
          </p>
          <p className="text-[12.5px] font-medium font-mono text-[var(--text-secondary)] tabular-nums">
            ₹{formatCurrencyExact(summary.averagePrice)}
          </p>
        </div>
        <div className="text-right flex items-center justify-end gap-1 text-[12px] font-medium text-[var(--text-secondary)] group-hover:text-[var(--accent-ink)]">
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
