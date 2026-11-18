import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { Calendar, Eye, EyeOff, LineChart as LineChartIcon } from 'lucide-react';
import type { PriceObservation, PriceTimeframe } from '../../types/models';
import { filterObservationsByTimeframe } from '../../utils/priceTrackerEngine';
import { formatCurrencyExact } from '../../utils/categoryStyles';

const TIMEFRAMES: { id: PriceTimeframe; label: string }[] = [
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: '3m', label: '3M' },
  { id: '6m', label: '6M' },
  { id: '12m', label: '12M' },
  { id: 'all', label: 'All' },
];

interface ChartDatum {
  id: string;
  dateLabel: string;
  fullDate: string;
  unitPrice: number;
  totalPrice: number;
  packageSize: string;
  quantity: number;
  unitOfMeasurement: string;
  sourceLabel: string;
  entryKindLabel: string;
  brand?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: ChartDatum }>;
}

function PriceChartTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <div className="glass-strong rounded-xl px-3.5 py-2.5 shadow-2xl border border-white/10 min-w-[200px] space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-extrabold text-white">{d.fullDate}</span>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/[0.08] text-zinc-300">
          {d.sourceLabel}
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[11px] text-zinc-400">Unit Price</span>
        <span className="text-sm font-extrabold font-mono text-brand-400 tabular-nums">
          ₹{formatCurrencyExact(d.unitPrice)}/{d.unitOfMeasurement}
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-4 text-[11px]">
        <span className="text-zinc-400">Paid</span>
        <span className="font-mono font-bold text-zinc-200 tabular-nums">
          ₹{formatCurrencyExact(d.totalPrice)} ({d.quantity} × {d.packageSize})
        </span>
      </div>
      {d.brand && (
        <div className="flex items-baseline justify-between gap-4 text-[11px]">
          <span className="text-zinc-400">Brand</span>
          <span className="font-semibold text-zinc-200">{d.brand}</span>
        </div>
      )}
      <div className="pt-1 border-t border-white/[0.06] text-[10px] text-zinc-500">
        {d.entryKindLabel}
      </div>
    </div>
  );
}

interface PriceHistoryChartProps {
  observations: PriceObservation[];
  unitOfMeasurement: string;
  averagePrice: number;
}

export function PriceHistoryChart({
  observations,
  unitOfMeasurement,
  averagePrice,
}: PriceHistoryChartProps) {
  const [timeframe, setTimeframe] = useState<PriceTimeframe>('all');
  const [showAverageLine, setShowAverageLine] = useState(true);

  const filtered = useMemo(
    () => filterObservationsByTimeframe(observations, timeframe),
    [observations, timeframe]
  );

  const chartData: ChartDatum[] = useMemo(
    () =>
      filtered.map((o) => {
        const dt = new Date(o.purchaseDate);
        const dateLabel = Number.isNaN(dt.getTime())
          ? o.purchaseDate
          : dt.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        const fullDate = Number.isNaN(dt.getTime())
          ? o.purchaseDate
          : dt.toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
        const sourceLabel =
          o.purchaseSource === 'mart'
            ? 'Quick Mart'
            : o.purchaseSource === 'audit'
            ? 'Receipt Scan'
            : 'Manual Entry';
        const entryKindLabel =
          o.entryKind === 'manual_estimate' ? 'Manual Price Estimate' : 'Actual Purchase';

        return {
          id: o.id,
          dateLabel,
          fullDate,
          unitPrice: o.unitPrice,
          totalPrice: o.totalPrice,
          packageSize: o.packageSize,
          quantity: o.quantity,
          unitOfMeasurement: o.unitOfMeasurement,
          sourceLabel,
          entryKindLabel,
          brand: o.brand,
        };
      }),
    [filtered]
  );

  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 100] as [number, number];
    const prices = chartData.map((d) => d.unitPrice);
    if (showAverageLine && averagePrice > 0) prices.push(averagePrice);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const pad = Math.max((max - min) * 0.2, max * 0.1, 2);
    return [Math.max(0, Math.floor(min - pad)), Math.ceil(max + pad)] as [number, number];
  }, [chartData, showAverageLine, averagePrice]);

  return (
    <div className="glass rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <LineChartIcon className="w-4 h-4 text-sky-400" strokeWidth={2.5} />
          <div>
            <h4 className="text-sm font-extrabold text-white">
              Recorded Unit Price History (₹/{unitOfMeasurement})
            </h4>
            <p className="text-[11px] text-zinc-500">
              {chartData.length} actual recorded point{chartData.length === 1 ? '' : 's'} in range
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex items-center bg-ink-900/90 border border-white/[0.06] rounded-xl p-0.5"
            role="group"
            aria-label="Chart timeframe"
          >
            {TIMEFRAMES.map((tf) => {
              const active = timeframe === tf.id;
              return (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => setTimeframe(tf.id)}
                  aria-pressed={active}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    active
                      ? 'bg-white/[0.12] text-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {tf.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowAverageLine((v) => !v)}
            aria-pressed={showAverageLine}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border flex items-center gap-1.5 transition-all ${
              showAverageLine
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : 'bg-white/[0.04] text-zinc-400 border-white/[0.06] hover:text-white'
            }`}
          >
            {showAverageLine ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Avg Line</span>
          </button>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="h-56 rounded-xl bg-ink-900/50 border border-dashed border-white/[0.08] flex flex-col items-center justify-center text-center px-4">
          <Calendar className="w-5 h-5 text-zinc-500 mb-2" />
          <p className="text-xs font-bold text-zinc-300">
            No recorded purchases in the selected timeframe
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">
            Switch timeframe to All to inspect earlier observations.
          </p>
        </div>
      ) : (
        <div className="h-60 sm:h-64 w-full" data-testid="product-price-history-chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 14, right: 26, left: -4, bottom: 4 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.06)"
                vertical={false}
              />
              <XAxis
                dataKey="dateLabel"
                padding={{ left: 16, right: 20 }}
                tick={{
                  fill: '#71717a',
                  fontSize: 11,
                  fontFamily: 'JetBrains Mono, monospace',
                }}
                axisLine={false}
                tickLine={false}
                minTickGap={16}
              />
              <YAxis
                domain={yDomain}
                tickFormatter={(v: number) => `₹${v}`}
                tick={{
                  fill: '#71717a',
                  fontSize: 11,
                  fontFamily: 'JetBrains Mono, monospace',
                }}
                axisLine={false}
                tickLine={false}
                width={54}
              />
              <Tooltip
                cursor={{
                  stroke: 'rgba(255,255,255,0.16)',
                  strokeDasharray: '3 3',
                }}
                content={<PriceChartTooltip />}
              />
              {showAverageLine && averagePrice > 0 && (
                <ReferenceLine
                  y={averagePrice}
                  stroke="#f59e0b"
                  strokeDasharray="5 5"
                  strokeOpacity={0.85}
                  label={{
                    value: `Avg ₹${formatCurrencyExact(averagePrice)}`,
                    position: 'insideTopRight',
                    fill: '#fbbf24',
                    fontSize: 10,
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                />
              )}
              <Line
                type="linear"
                dataKey="unitPrice"
                stroke="#38bdf8"
                strokeWidth={2.5}
                dot={{
                  r: 4.5,
                  fill: '#09090b',
                  stroke: '#10b981',
                  strokeWidth: 2.2,
                }}
                activeDot={{
                  r: 6,
                  fill: '#34d399',
                  stroke: '#09090b',
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {chartData.length === 1 && (
        <p className="text-[11px] text-zinc-500">
          Only 1 recorded point so far. Record another purchase to draw a multi-point price curve.
        </p>
      )}
    </div>
  );
}
