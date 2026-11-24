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
    <div className="surface-well p-3.5 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-medium text-[var(--text-secondary)]">
          {label}
        </span>
        {hasComparison && (
          <span
            className={`inline-flex items-center gap-1 text-[12px] font-bold font-mono tabular-nums ${
              isUp
                ? 'text-[var(--accent-danger-ink)]'
                : isDown
                ? 'text-[var(--accent-success-ink)]'
                : 'text-[var(--text-secondary)]'
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
              isUp
                ? 'text-[var(--accent-danger-ink)]'
                : isDown
                ? 'text-[var(--accent-success-ink)]'
                : 'text-[var(--text-primary)]'
            }`}
          >
            {diff! > 0 ? '+' : diff! < 0 ? '-' : ''}₹{formatCurrencyExact(Math.abs(diff!))}/
            {unit}
          </p>
          <p className="text-[12px] text-[var(--text-secondary)]">
            {baselineLabel}:{' '}
            <span className="font-mono font-semibold text-[var(--text-primary)] tabular-nums">
              ₹{formatCurrencyExact(baselinePrice!)}/{unit}
            </span>
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-[var(--text-muted)]">—</p>
          <p className="text-[12px] text-[var(--text-muted)]">{emptyHint}</p>
        </>
      )}
    </div>
  );
}

export function PriceComparison({ summary }: { summary: ProductPriceSummary }) {
  const u = summary.unitOfMeasurement;

  return (
    <div className="surface-card p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-[var(--accent-ink)]" strokeWidth={2.2} />
          <h4 className="font-display text-sm font-bold text-[var(--text-primary)]">
            Price Comparison
          </h4>
        </div>
        <span className="text-[12.5px] font-mono text-[var(--text-secondary)] tabular-nums">
          Latest:{' '}
          <strong className="text-[var(--text-primary)]">
            ₹{formatCurrencyExact(summary.latestPrice)}/{u}
          </strong>
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
