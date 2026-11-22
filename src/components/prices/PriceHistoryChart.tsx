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
import { useAppStore } from '../../store/useStore';
import { filterObservationsByTimeframe } from '../../utils/priceTrackerEngine';
import { formatCurrencyExact } from '../../utils/categoryStyles';
import { getChartThemeTokens } from '../../utils/settingsEngine';

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
    <div className="bg-white rounded-xl px-3.5 py-2.5 shadow-lg border border-[#E7EAF0] min-w-[200px] space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold text-[#151922]">{d.fullDate}</span>
        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-[#F1F3F6] text-[#697386]">
          {d.sourceLabel}
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[11px] text-[#697386]">Unit Price</span>
        <span className="text-sm font-bold font-mono text-[#365FE8] tabular-nums">
          ₹{formatCurrencyExact(d.unitPrice)}/{d.unitOfMeasurement}
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-4 text-[11px]">
        <span className="text-[#697386]">Paid</span>
        <span className="font-mono font-semibold text-[#151922] tabular-nums">
          ₹{formatCurrencyExact(d.totalPrice)} ({d.quantity} × {d.packageSize})
        </span>
      </div>
      {d.brand && (
        <div className="flex items-baseline justify-between gap-4 text-[11px]">
          <span className="text-[#697386]">Brand</span>
          <span className="font-semibold text-[#151922]">{d.brand}</span>
        </div>
      )}
      <div className="pt-1 border-t border-[#E7EAF0] text-[10px] text-[#929BAB]">
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
  const theme = useAppStore((s) => s.theme);
  const visualTheme = useAppStore((s) => s.visualTheme);
  const chartTokens = getChartThemeTokens(theme, visualTheme.mood);
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
    <div className="surface-card p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <LineChartIcon className="w-4 h-4 text-[#365FE8]" strokeWidth={2.2} />
          <div>
            <h4 className="text-sm font-bold text-[#151922]">
              Recorded Unit Price History (₹/{unitOfMeasurement})
            </h4>
            <p className="text-xs text-[#697386]">
              {chartData.length} actual recorded point{chartData.length === 1 ? '' : 's'} in range
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="tactile-well inline-flex items-center bg-[#F1F3F6] border border-[#E7EAF0] rounded-xl p-0.5"
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
                  className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-[#365FE8] text-white shadow-xs'
                      : 'text-[#697386] hover:text-[#151922]'
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
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
              showAverageLine
                ? 'bg-[#FEF6E7] text-[#9E6614] border-[#F3D8A8]'
                : 'bg-[#F7F8FA] text-[#697386] border-[#E7EAF0] hover:text-[#151922]'
            }`}
          >
            {showAverageLine ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Avg Line</span>
          </button>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="h-56 rounded-xl bg-[#F7F8FA] border border-dashed border-[#D5DBE6] flex flex-col items-center justify-center text-center px-4">
          <Calendar className="w-5 h-5 text-[#929BAB] mb-2" />
          <p className="text-xs font-semibold text-[#151922]">
            No recorded purchases in the selected timeframe
          </p>
          <p className="text-xs text-[#697386] mt-1">
            Switch timeframe to All to inspect earlier observations.
          </p>
        </div>
      ) : (
        <div className="h-60 sm:h-64 w-full" data-testid="product-price-history-chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 14, right: 26, left: -4, bottom: 4 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={chartTokens.gridStroke}
                vertical={false}
              />
              <XAxis
                dataKey="dateLabel"
                padding={{ left: 16, right: 20 }}
                tick={{
                  fill: chartTokens.tickColor,
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
                  fill: chartTokens.tickColor,
                  fontSize: 11,
                  fontFamily: 'JetBrains Mono, monospace',
                }}
                axisLine={false}
                tickLine={false}
                width={54}
              />
              <Tooltip
                cursor={{
                  stroke: chartTokens.gridStroke,
                  strokeDasharray: '3 3',
                }}
                content={<PriceChartTooltip />}
              />
              {showAverageLine && averagePrice > 0 && (
                <ReferenceLine
                  y={averagePrice}
                  stroke={chartTokens.warning}
                  strokeDasharray="5 5"
                  strokeOpacity={0.9}
                  label={{
                    value: `Avg ₹${formatCurrencyExact(averagePrice)}`,
                    position: 'insideTopRight',
                    fill: chartTokens.warning,
                    fontSize: 10,
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                />
              )}
              <Line
                type="linear"
                dataKey="unitPrice"
                stroke={chartTokens.accent}
                strokeWidth={2.5}
                isAnimationActive={false}
                dot={{
                  r: 4.5,
                  fill: chartTokens.tooltipStyle.backgroundColor,
                  stroke: chartTokens.accent,
                  strokeWidth: 2.2,
                }}
                activeDot={{
                  r: 6,
                  fill: chartTokens.accent,
                  stroke: chartTokens.tooltipStyle.backgroundColor,
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {chartData.length === 1 && (
        <p className="text-xs text-[#697386]">
          Only 1 recorded point so far. Record another purchase to draw a multi-point price curve.
        </p>
      )}
    </div>
  );
}
