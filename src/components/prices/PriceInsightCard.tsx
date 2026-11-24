import {
  TrendingUp,
  TrendingDown,
  Repeat,
  Award,
  Layers,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import type { PriceInsight } from '../../utils/priceTrackerEngine';

interface PriceInsightCardProps {
  insights: PriceInsight[];
  onSelectProduct?: (productId: string) => void;
}

export function PriceInsightCard({ insights, onSelectProduct }: PriceInsightCardProps) {
  if (insights.length === 0) {
    return (
      <div className="surface-card p-5 space-y-1.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#365FE8]" strokeWidth={2.2} />
          <h3 className="text-sm font-bold text-[#151922]">Your Price Insights</h3>
        </div>
        <p className="text-xs text-[#697386] leading-relaxed">
          Record at least 2 purchases for the same product (via Shopping checkout, Receipt Scan, or Manual Entry) to unlock real historical price insights. No trends are fabricated from a single purchase.
        </p>
      </div>
    );
  }

  return (
    <div className="surface-card p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#365FE8]" strokeWidth={2.2} />
          <h3 className="text-sm font-bold text-[#151922]">Your Price Insights</h3>
        </div>
        <span className="text-xs text-[#697386]">
          Based on real recorded purchases
        </span>
      </div>

      <div className="border-t border-[#E7EAF0] divide-y divide-[#E7EAF0]">
        {insights.map((insight) => {
          const Icon =
            insight.kind === 'increase'
              ? TrendingUp
              : insight.kind === 'decrease'
              ? TrendingDown
              : insight.kind === 'frequent'
              ? Repeat
              : insight.kind === 'savings'
              ? Award
              : Layers;

          const toneText =
            insight.tone === 'warning'
              ? 'text-[#DE5252]'
              : insight.tone === 'positive'
              ? 'text-[#15966B]'
              : 'text-[#365FE8]';

          const iconSurface =
            insight.tone === 'warning'
              ? 'bg-[#FDECEC] text-[#DE5252]'
              : insight.tone === 'positive'
              ? 'bg-[#E8F7F1] text-[#15966B]'
              : 'bg-[#EDF2FF] text-[#365FE8]';

          const clickable = Boolean(insight.productId && onSelectProduct);

          return (
            <button
              key={insight.id}
              type="button"
              disabled={!clickable}
              onClick={() => insight.productId && onSelectProduct?.(insight.productId)}
              className={`w-full text-left py-3.5 first:pt-3.5 last:pb-1 flex items-start gap-3 transition-colors ${
                clickable ? 'group cursor-pointer' : 'cursor-default'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${iconSurface}`}
              >
                <Icon className="w-4 h-4" strokeWidth={2.2} />
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-bold text-[#151922] group-hover:text-[#365FE8] transition-colors truncate">
                    {insight.title}
                  </p>
                  <span
                    className={`text-xs font-mono font-bold tabular-nums whitespace-nowrap shrink-0 ${toneText}`}
                  >
                    {insight.metricBadge}
                  </span>
                </div>
                <p className="text-xs text-[#697386] leading-relaxed">
                  {insight.description}
                </p>
                {clickable && (
                  <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#365FE8] pt-0.5">
                    View price chart <ArrowRight className="w-3 h-3" />
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
