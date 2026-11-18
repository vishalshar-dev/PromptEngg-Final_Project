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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

          const toneClasses =
            insight.tone === 'warning'
              ? 'bg-[#FDECEC] border-[#F6B8B8] text-[#DE5252]'
              : insight.tone === 'positive'
              ? 'bg-[#E8F7F1] border-[#B7E4D3] text-[#15966B]'
              : 'bg-[#EDF2FF] border-[#D4E0FF] text-[#365FE8]';

          const clickable = Boolean(insight.productId && onSelectProduct);

          return (
            <button
              key={insight.id}
              type="button"
              disabled={!clickable}
              onClick={() => insight.productId && onSelectProduct?.(insight.productId)}
              className={`text-left surface-subtle p-3.5 transition-all flex items-start gap-3 ${
                clickable
                  ? 'hover:border-[#D4E0FF] hover:bg-white cursor-pointer group'
                  : 'cursor-default'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${toneClasses}`}
              >
                <Icon className="w-4 h-4" strokeWidth={2.2} />
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-[#151922] truncate">
                    {insight.title}
                  </p>
                  <span
                    className={`text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded border whitespace-nowrap shrink-0 ${toneClasses}`}
                  >
                    {insight.metricBadge}
                  </span>
                </div>
                <p className="text-xs text-[#697386] leading-relaxed">
                  {insight.description}
                </p>
                {clickable && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#365FE8] pt-0.5">
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
