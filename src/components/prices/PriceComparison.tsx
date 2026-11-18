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
    <div className="surface-subtle p-3.5 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
          {label}
        </span>
        {hasComparison && (
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-bold font-mono px-1.5 py-0.5 rounded-md ${
              isUp
                ? 'bg-[#FDECEC] text-[#DE5252]'
                : isDown
                ? 'bg-[#E8F7F1] text-[#15966B]'
                : 'bg-white text-[#697386]'
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
            className={`text-base font-bold font-mono tabular-nums ${
              isUp ? 'text-[#DE5252]' : isDown ? 'text-[#15966B]' : 'text-[#151922]'
            }`}
          >
            {diff! > 0 ? '+' : diff! < 0 ? '-' : ''}₹{formatCurrencyExact(Math.abs(diff!))}/
            {unit}
          </p>
          <p className="text-[11px] text-[#697386]">
            {baselineLabel}:{' '}
            <span className="font-mono font-semibold text-[#151922]">
              ₹{formatCurrencyExact(baselinePrice!)}/{unit}
            </span>
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-[#929BAB]">—</p>
          <p className="text-[11px] text-[#929BAB]">{emptyHint}</p>
        </>
      )}
    </div>
  );
}

export function PriceComparison({ summary }: { summary: ProductPriceSummary }) {
  const u = summary.unitOfMeasurement;

  return (
    <div className="surface-card p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-[#365FE8]" strokeWidth={2.2} />
          <h4 className="text-sm font-bold text-[#151922]">Price Comparison</h4>
        </div>
        <span className="text-xs font-mono text-[#697386]">
          Latest: <strong className="text-[#151922]">₹{formatCurrencyExact(summary.latestPrice)}/{u}</strong>
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
