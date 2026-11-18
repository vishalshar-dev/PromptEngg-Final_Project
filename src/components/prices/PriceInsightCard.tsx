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
      <div className="glass rounded-2xl p-4 sm:p-5 border border-white/[0.07] space-y-1.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-400" strokeWidth={2.5} />
          <h3 className="text-sm font-extrabold text-white">Your Price Insights</h3>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Record at least 2 purchases for the same product (via Quick Mart checkout, Receipt Scan, or Manual Entry) to unlock real historical price insights. No trends are fabricated from a single purchase.
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-4 sm:p-5 border border-white/[0.08] space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-400" strokeWidth={2.5} />
          <h3 className="text-sm font-extrabold text-white">Your Price Insights</h3>
        </div>
        <span className="text-[11px] font-semibold text-zinc-500">
          Based on real recorded purchases
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
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
              ? 'bg-red-500/10 border-red-500/20 text-red-400'
              : insight.tone === 'positive'
              ? 'bg-brand-500/10 border-brand-500/20 text-brand-400'
              : 'bg-sky-500/10 border-sky-500/20 text-sky-300';

          const clickable = Boolean(insight.productId && onSelectProduct);

          return (
            <button
              key={insight.id}
              type="button"
              disabled={!clickable}
              onClick={() => insight.productId && onSelectProduct?.(insight.productId)}
              className={`text-left rounded-xl p-3.5 bg-ink-900/70 border border-white/[0.06] transition-all flex items-start gap-3 ${
                clickable
                  ? 'hover:border-white/[0.16] hover:bg-white/[0.04] cursor-pointer group'
                  : 'cursor-default'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${toneClasses}`}
              >
                <Icon className="w-4 h-4" strokeWidth={2.5} />
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-extrabold text-white truncate">
                    {insight.title}
                  </p>
                  <span
                    className={`text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded border whitespace-nowrap ${toneClasses}`}
                  >
                    {insight.metricBadge}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  {insight.description}
                </p>
                {clickable && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-500 group-hover:text-brand-400 transition-colors pt-0.5">
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
