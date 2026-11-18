import { TrendingUp, TrendingDown, Minus, Scale } from 'lucide-react';
import type { ProductPriceSummary } from '../../utils/priceTrackerEngine';
import { formatCurrencyExact } from '../../utils/categoryStyles';

function formatShortDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface ComparisonTileProps {
  label: string;
  baselineLabel: string;
  baselinePrice: number | null;
  diff: number | null;
  pct: number | null;
  unit: string;
  emptyHint: string;
}

function ComparisonTile({
  label,
  baselineLabel,
  baselinePrice,
  diff,
  pct,
  unit,
  emptyHint,
}: ComparisonTileProps) {
  const hasComparison = baselinePrice !== null && diff !== null && pct !== null;
  const isUp = (diff ?? 0) > 0.01;
  const isDown = (diff ?? 0) < -0.01;

  return (
    <div className="bg-ink-900/70 border border-white/[0.06] rounded-xl p-3.5 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          {label}
        </span>
        {hasComparison && (
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-extrabold font-mono px-1.5 py-0.5 rounded ${
              isUp
                ? 'bg-red-500/15 text-red-400'
                : isDown
                ? 'bg-brand-500/15 text-brand-400'
                : 'bg-white/[0.06] text-zinc-400'
            }`}
          >
            {isUp ? (
              <TrendingUp className="w-3 h-3" />
            ) : isDown ? (
              <TrendingDown className="w-3 h-3" />
            ) : (
              <Minus className="w-3 h-3" />
            )}
            {pct! > 0 ? '+' : ''}
            {pct!.toFixed(1)}%
          </span>
        )}
      </div>

      {hasComparison ? (
        <>
          <p
            className={`text-base font-extrabold font-mono tabular-nums ${
              isUp ? 'text-red-400' : isDown ? 'text-brand-400' : 'text-zinc-200'
            }`}
          >
            {diff! > 0 ? '+' : diff! < 0 ? '-' : ''}₹{formatCurrencyExact(Math.abs(diff!))}/
            {unit}
          </p>
          <p className="text-[11px] text-zinc-400">
            {baselineLabel}:{' '}
            <span className="font-mono font-bold text-zinc-200">
              ₹{formatCurrencyExact(baselinePrice!)}/{unit}
            </span>
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-bold text-zinc-400">—</p>
          <p className="text-[11px] text-zinc-500">{emptyHint}</p>
        </>
      )}
    </div>
  );
}

export function PriceComparison({ summary }: { summary: ProductPriceSummary }) {
  const u = summary.unitOfMeasurement;

  return (
    <div className="glass rounded-2xl p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-brand-400" strokeWidth={2.5} />
          <h4 className="text-sm font-extrabold text-white">Price Comparison</h4>
        </div>
        <span className="text-[11px] font-mono text-zinc-400">
          Latest: <strong className="text-white">₹{formatCurrencyExact(summary.latestPrice)}/{u}</strong>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <ComparisonTile
          label="vs Previous"
          baselineLabel={`Prev (${formatShortDate(summary.previousObservation?.purchaseDate)})`}
          baselinePrice={summary.previousPrice}
          diff={summary.vsPreviousDiff}
          pct={summary.vsPreviousPct}
          unit={u}
          emptyHint="Requires 2+ purchases"
        />
        <ComparisonTile
          label="vs Average"
          baselineLabel={`Historical avg (${summary.purchaseCount})`}
          baselinePrice={summary.purchaseCount >= 2 ? summary.averagePrice : null}
          diff={summary.vsAverageDiff}
          pct={summary.vsAveragePct}
          unit={u}
          emptyHint="Single purchase baseline"
        />
        <ComparisonTile
          label="vs Highest"
          baselineLabel={`Peak (${formatShortDate(summary.highestObservation.purchaseDate)})`}
          baselinePrice={summary.purchaseCount >= 2 ? summary.highestPrice : null}
          diff={summary.vsHighestDiff}
          pct={summary.vsHighestPct}
          unit={u}
          emptyHint="Requires 2+ purchases"
        />
        <ComparisonTile
          label="vs Lowest"
          baselineLabel={`Best (${formatShortDate(summary.lowestObservation.purchaseDate)})`}
          baselinePrice={summary.purchaseCount >= 2 ? summary.lowestPrice : null}
          diff={summary.vsLowestDiff}
          pct={summary.vsLowestPct}
          unit={u}
          emptyHint="Requires 2+ purchases"
        />
      </div>
    </div>
  );
}
