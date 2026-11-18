import { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  LineChart,
  UserCheck,
  Database,
  AlertTriangle,
} from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { formatCurrencyExact } from '../../utils/categoryStyles';
import { computeUnitPriceStats, type NormalizedPricePoint } from '../../utils/martEngine';
import { ProductVisual } from '../mart/ProductVisual';

export function PriceTrendTracker() {
  const items = useAppStore((s) => s.items);
  const categoryConfigs = useAppStore((s) => s.categoryConfigs);
  const priceHistory = useAppStore((s) => s.priceHistory);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const itemsWithHistory = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        history: priceHistory[item.id] ?? [],
      })),
    [items, priceHistory]
  );

  const selectedItem =
    itemsWithHistory.find((i) => i.id === selectedId) ?? itemsWithHistory[0];

  const stats = useMemo(() => {
    if (!selectedItem) return null;
    return computeUnitPriceStats(selectedItem.history, selectedItem.unit);
  }, [selectedItem]);

  if (itemsWithHistory.length === 0) {
    return (
      <div className="glass rounded-xl p-5 text-center">
        <LineChart className="w-6 h-6 text-zinc-600 mx-auto mb-2" strokeWidth={2} />
        <p className="text-sm font-bold text-zinc-400">No price history yet</p>
        <p className="text-[11px] text-zinc-600 mt-1">
          Add or purchase products in Quick Mart to track unit-normalized price trends.
        </p>
      </div>
    );
  }

  const catConfig = categoryConfigs.find((c) => c.name === selectedItem?.category);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LineChart className="w-4 h-4 text-sky-400" strokeWidth={2.5} />
          <h3 className="text-sm font-extrabold tracking-tight">Price Trend Tracker</h3>
        </div>
        <span className="text-[10px] font-bold text-zinc-500">
          Unit-normalized comparisons
        </span>
      </div>

      {/* Item Selector */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {itemsWithHistory.map((item) => {
          const pts = priceHistory[item.id] ?? [];
          const hasUserPurchase = pts.some((p) => p.source === 'user_purchase');
          const active = (selectedItem?.id ?? itemsWithHistory[0]?.id) === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                active
                  ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                  : 'bg-white/[0.03] text-zinc-400 border-white/[0.05] hover:bg-white/[0.06]'
              }`}
            >
              <span>{item.name}</span>
              <span className="text-[10px] font-mono opacity-70">
                {item.unit || '1u'}
              </span>
              {hasUserPurchase && (
                <span
                  title="Includes your checkout purchase prices"
                  className="w-1.5 h-1.5 rounded-full bg-brand-400"
                />
              )}
            </button>
          );
        })}
      </div>

      {selectedItem && stats && stats.compatiblePoints.length > 0 && (
        <UnitAwarePriceChart
          points={stats.compatiblePoints}
          average={stats.average}
          min={stats.min}
          max={stats.max}
          change={stats.deltaFromFirst}
          changePct={stats.deltaPctFromFirst}
          userPurchaseCount={stats.userPurchaseCount}
          referenceCount={stats.referenceCount}
          excludedIncompatibleCount={stats.excludedIncompatibleCount}
          currentPrice={selectedItem.price}
          itemName={selectedItem.name}
          itemCategory={selectedItem.category}
          itemUnit={selectedItem.unit || '1 unit'}
          imageUrl={selectedItem.imageUrl}
          iconKey={catConfig?.iconKey}
          accent={catConfig?.accent}
        />
      )}
    </div>
  );
}

function UnitAwarePriceChart({
  points,
  average,
  min,
  max,
  change,
  changePct,
  userPurchaseCount,
  referenceCount,
  excludedIncompatibleCount,
  currentPrice,
  itemName,
  itemCategory,
  itemUnit,
  imageUrl,
  iconKey,
  accent,
}: {
  points: NormalizedPricePoint[];
  average: number;
  min: number;
  max: number;
  change: number;
  changePct: number;
  userPurchaseCount: number;
  referenceCount: number;
  excludedIncompatibleCount: number;
  currentPrice: number;
  itemName: string;
  itemCategory: string;
  itemUnit: string;
  imageUrl?: string;
  iconKey?: string;
  accent?: string;
}) {
  const width = 320;
  const height = 130;
  const padding = { top: 14, right: 14, bottom: 24, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const range = Math.max(max - min, 1);

  const coords = points.map((p, i) => {
    const x =
      points.length === 1
        ? padding.left + chartW / 2
        : padding.left + (i / (points.length - 1)) * chartW;
    const y = padding.top + chartH - ((p.normalizedPrice - min) / range) * chartH;
    return { x, y, ...p };
  });

  const linePath = coords
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(' ');

  const areaPath =
    coords.length > 1
      ? `${linePath} L ${coords[coords.length - 1].x} ${padding.top + chartH} L ${coords[0].x} ${padding.top + chartH} Z`
      : '';

  const isDiscount = change < -0.5;
  const isIncrease = change > 0.5;
  const isFlat = !isDiscount && !isIncrease;
  const isGenuineDiscount = isDiscount && currentPrice <= min * 1.05;

  const lineColor = isDiscount ? '#34d399' : isIncrease ? '#f87171' : '#38bdf8';
  const TrendIcon = isDiscount ? TrendingDown : isIncrease ? TrendingUp : Minus;
  const trendColor = isDiscount
    ? 'text-brand-400'
    : isIncrease
    ? 'text-red-400'
    : 'text-sky-400';

  return (
    <div className="glass rounded-xl p-4 animate-fade-in-up space-y-3">
      {/* Item Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <ProductVisual
            name={itemName}
            category={itemCategory}
            imageUrl={imageUrl}
            iconKey={iconKey}
            accent={accent}
            size="xs"
          />
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">{itemName}</p>
            <p className="text-[10px] text-zinc-400 font-mono">
              Normalized to <span className="text-zinc-200 font-bold">{itemUnit}</span>
            </p>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-base font-extrabold font-mono tabular-nums text-white">
            ₹{formatCurrencyExact(currentPrice)}
          </p>
          <div className={`flex items-center justify-end gap-1 ${trendColor}`}>
            <TrendIcon className="w-3 h-3" strokeWidth={2.5} />
            <span className="text-[11px] font-bold font-mono">
              {change > 0 ? '+' : ''}₹{formatCurrencyExact(Math.abs(change))} ({changePct > 0 ? '+' : ''}
              {changePct.toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Avg / Min / Max Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-ink-900/70 rounded-lg p-2 text-center border border-white/[0.04]">
          <p className="text-[9px] font-bold uppercase text-zinc-500">Average</p>
          <p className="text-xs font-extrabold font-mono text-zinc-200 mt-0.5">
            ₹{formatCurrencyExact(average)}
          </p>
        </div>
        <div className="bg-ink-900/70 rounded-lg p-2 text-center border border-white/[0.04]">
          <p className="text-[9px] font-bold uppercase text-zinc-500">Lowest</p>
          <p className="text-xs font-extrabold font-mono text-brand-400 mt-0.5">
            ₹{formatCurrencyExact(min)}
          </p>
        </div>
        <div className="bg-ink-900/70 rounded-lg p-2 text-center border border-white/[0.04]">
          <p className="text-[9px] font-bold uppercase text-zinc-500">Highest</p>
          <p className="text-xs font-extrabold font-mono text-orange-400 mt-0.5">
            ₹{formatCurrencyExact(max)}
          </p>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="priceAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.18" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = padding.top + t * chartH;
            return (
              <line
                key={t}
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1"
              />
            );
          })}

          {areaPath && <path d={areaPath} fill="url(#priceAreaGrad)" />}

          {coords.length > 1 && (
            <path
              d={linePath}
              fill="none"
              stroke={lineColor}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {coords.map((p, i) => {
            const isUser = p.effectiveSource === 'user_purchase';
            return (
              <circle
                key={`${p.date}-${i}`}
                cx={p.x}
                cy={p.y}
                r={isUser ? 4.5 : 2.8}
                fill={isUser ? '#10b981' : '#71717a'}
                stroke="#0c0c0f"
                strokeWidth="1.5"
              />
            );
          })}

          <text
            x={padding.left - 6}
            y={padding.top + 4}
            textAnchor="end"
            fontSize="8"
            fill="#71717a"
            fontFamily="monospace"
          >
            ₹{Math.round(max)}
          </text>
          <text
            x={padding.left - 6}
            y={padding.top + chartH + 3}
            textAnchor="end"
            fontSize="8"
            fill="#71717a"
            fontFamily="monospace"
          >
            ₹{Math.round(min)}
          </text>

          {coords.map((p, i) => {
            if (
              i === 0 ||
              i === coords.length - 1 ||
              i === Math.floor(coords.length / 2)
            ) {
              const d = new Date(p.date);
              return (
                <text
                  key={`x-${i}`}
                  x={p.x}
                  y={height - 6}
                  textAnchor="middle"
                  fontSize="7"
                  fill="#71717a"
                  fontFamily="monospace"
                >
                  {d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                </text>
              );
            }
            return null;
          })}
        </svg>
      </div>

      {/* Data Source Legend */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-[10px] pt-1 border-t border-white/[0.06]">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-brand-400 font-bold">
            <UserCheck className="w-3 h-3" />
            User Purchases ({userPurchaseCount})
          </span>
          <span className="inline-flex items-center gap-1 text-zinc-400 font-medium">
            <Database className="w-3 h-3" />
            Market Reference ({referenceCount})
          </span>
        </div>

        <span
          className={`font-extrabold ${
            isFlat
              ? 'text-zinc-400'
              : isGenuineDiscount
              ? 'text-brand-400'
              : isIncrease
              ? 'text-red-400'
              : 'text-orange-400'
          }`}
        >
          {isFlat
            ? 'STABLE PRICE'
            : isGenuineDiscount
            ? 'NEAR LOWEST'
            : isIncrease
            ? 'PRICE UP'
            : 'BELOW START'}
        </span>
      </div>

      {excludedIncompatibleCount > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            {excludedIncompatibleCount} historical entry skipped due to incompatible unit/package size.
          </span>
        </div>
      )}
    </div>
  );
}
