import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, LineChart } from 'lucide-react';
import { useAppStore, type PricePoint } from '../../store/useStore';
import { formatCurrency } from '../../utils/categoryStyles';

export function PriceTrendTracker() {
  const items = useAppStore((s) => s.items);
  const priceHistory = useAppStore((s) => s.priceHistory);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const itemsWithHistory = items.map((item) => ({
    ...item,
    history: priceHistory[item.id] ?? [],
  }));

  const selectedItem = itemsWithHistory.find((i) => i.id === selectedId) ?? itemsWithHistory[0];

  const trendData = useMemo(() => {
    if (!selectedItem || selectedItem.history.length < 2) return null;
    const history = selectedItem.history;
    const prices = history.map((p) => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const first = history[0].price;
    const last = history[history.length - 1].price;
    const change = last - first;
    const changePct = first > 0 ? (change / first) * 100 : 0;
    const isDiscount = change < 0;
    const isGenuineDiscount = isDiscount && last <= min * 1.05;

    return {
      history, min, max, first, last, change, changePct,
      isDiscount: change < 0,
      isIncrease: change > 0,
      isFlat: Math.abs(change) < 0.5,
      isGenuineDiscount,
    };
  }, [selectedItem]);

  if (itemsWithHistory.length === 0) {
    return (
      <div className="glass rounded-xl p-5 text-center">
        <LineChart className="w-6 h-6 text-zinc-600 mx-auto mb-2" strokeWidth={2} />
        <p className="text-sm font-bold text-zinc-400">No price history yet</p>
        <p className="text-[11px] text-zinc-600 mt-1">Add items to track their price trends</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <LineChart className="w-4 h-4 text-sky-400" strokeWidth={2.5} />
        <h3 className="text-sm font-extrabold tracking-tight">Price Trend Tracker</h3>
      </div>

      {/* Item Selector */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {itemsWithHistory.map((item) => (
          <button
            key={item.id}
            onClick={() => setSelectedId(item.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              (selectedItem?.id ?? itemsWithHistory[0]?.id) === item.id
                ? 'bg-sky-500/15 text-sky-300 border border-sky-500/25'
                : 'bg-white/[0.03] text-zinc-400 border border-white/[0.04] hover:bg-white/[0.06]'
            }`}
          >
            <span>{item.icon}</span>
            {item.name}
          </button>
        ))}
      </div>

      {trendData && selectedItem && (
        <PriceChart
          history={trendData.history}
          min={trendData.min}
          max={trendData.max}
          change={trendData.change}
          changePct={trendData.changePct}
          isDiscount={trendData.isDiscount}
          isIncrease={trendData.isIncrease}
          isFlat={trendData.isFlat}
          isGenuineDiscount={trendData.isGenuineDiscount}
          currentPrice={selectedItem.price}
          itemName={selectedItem.name}
          itemIcon={selectedItem.icon}
        />
      )}
    </div>
  );
}

function PriceChart({
  history,
  min,
  max,
  change,
  changePct,
  isDiscount,
  isIncrease,
  isFlat,
  isGenuineDiscount,
  currentPrice,
  itemName,
  itemIcon,
}: {
  history: PricePoint[];
  min: number;
  max: number;
  change: number;
  changePct: number;
  isDiscount: boolean;
  isIncrease: boolean;
  isFlat: boolean;
  isGenuineDiscount: boolean;
  currentPrice: number;
  itemName: string;
  itemIcon: string;
}) {
  const width = 300;
  const height = 120;
  const padding = { top: 12, right: 12, bottom: 24, left: 36 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const range = Math.max(max - min, 1);

  const points = history.map((p, i) => {
    const x = padding.left + (i / (history.length - 1)) * chartW;
    const y = padding.top + chartH - ((p.price - min) / range) * chartH;
    return { x, y, ...p };
  });

  const linePath = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(' ');

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  const lineColor = isDiscount ? '#34d399' : isIncrease ? '#f87171' : '#a1a1aa';

  const TrendIcon = isDiscount ? TrendingDown : isIncrease ? TrendingUp : Minus;
  const trendColor = isDiscount ? 'text-brand-400' : isIncrease ? 'text-red-400' : 'text-zinc-400';

  return (
    <div className="glass rounded-xl p-4 animate-fade-in-up">
      {/* Item Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{itemIcon}</span>
          <div>
            <p className="text-sm font-bold text-white">{itemName}</p>
            <p className="text-[10px] text-zinc-500 font-medium">6-month price history</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-base font-extrabold font-mono tabular-nums text-white">
            ₹{formatCurrency(currentPrice)}
          </p>
          <div className={`flex items-center justify-end gap-1 ${trendColor}`}>
            <TrendIcon className="w-3 h-3" strokeWidth={2.5} />
            <span className="text-[11px] font-bold font-mono">
              {change > 0 ? '+' : ''}₹{formatCurrency(Math.abs(change))} ({changePct.toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="priceArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.15" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = padding.top + t * chartH;
            return (
              <line
                key={t}
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="1"
              />
            );
          })}

          {/* Area fill */}
          <path d={areaPath} fill="url(#priceArea)" />

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke={lineColor}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${lineColor}66)` }}
          />

          {/* Points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={i === points.length - 1 ? 4 : 2.5}
              fill={lineColor}
              stroke="#0c0c0f"
              strokeWidth="1.5"
            />
          ))}

          {/* Y-axis labels */}
          <text x={padding.left - 6} y={padding.top + 4} textAnchor="end" fontSize="8" fill="#52525b" fontFamily="monospace">
            ₹{Math.round(max)}
          </text>
          <text x={padding.left - 6} y={padding.top + chartH + 3} textAnchor="end" fontSize="8" fill="#52525b" fontFamily="monospace">
            ₹{Math.round(min)}
          </text>

          {/* X-axis labels */}
          {points.map((p, i) => {
            if (i === 0 || i === points.length - 1 || i === Math.floor(points.length / 2)) {
              const d = new Date(p.date);
              return (
                <text
                  key={i}
                  x={p.x}
                  y={height - 6}
                  textAnchor="middle"
                  fontSize="7"
                  fill="#52525b"
                  fontFamily="monospace"
                >
                  {d.toLocaleDateString('en-IN', { month: 'short' })}
                </text>
              );
            }
            return null;
          })}
        </svg>
      </div>

      {/* Discount Authenticity Verdict */}
      <div className={`mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between`}>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Discount Verdict</p>
          <div className={`flex items-center gap-1.5 mt-0.5 ${
            isFlat ? 'text-zinc-400' : isGenuineDiscount ? 'text-brand-400' : isIncrease ? 'text-red-400' : 'text-orange-400'
          }`}>
            <span className="text-sm font-extrabold">
              {isFlat ? 'STABLE PRICE' : isGenuineDiscount ? 'GENUINE DISCOUNT' : isIncrease ? 'PRICE INCREASED' : 'INFLATED DISCOUNT'}
            </span>
          </div>
        </div>
        <p className="text-[11px] text-zinc-500 max-w-[140px] text-right leading-tight">
          {isFlat
            ? 'Price has been stable over the tracking period.'
            : isGenuineDiscount
            ? 'Current price is at or near the 6-month low. Good time to buy.'
            : isIncrease
            ? 'Price has gone up. Wait for a better deal if possible.'
            : '"Discount" is above the 6-month average. Not a real sale.'}
        </p>
      </div>
    </div>
  );
}
