import { useState } from 'react';
import {
  Plus,
  Minus,
  Heart,
  Pencil,
  Check,
  X,
  Repeat,
  AlertTriangle,
} from 'lucide-react';
import type { CartItem } from '../../store/useStore';
import { formatCurrencyExact, getCategoryStyle } from '../../utils/categoryStyles';
import { ProductVisual } from './ProductVisual';

export interface ProductCardProps {
  item: CartItem;
  categoryAccent?: string;
  categoryIconKey?: string;
  isBrokeWatched?: boolean;
  onAddToCart: (item: CartItem) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onToggleFavourite: (id: string) => void;
  onUpdatePrice: (id: string, newPrice: number) => void;
  onOpenDetails: (item: CartItem) => void;
}

export function ProductCard({
  item,
  categoryAccent,
  categoryIconKey,
  isBrokeWatched = false,
  onAddToCart,
  onUpdateQuantity,
  onToggleFavourite,
  onUpdatePrice,
  onOpenDetails,
}: ProductCardProps) {
  const [editingPrice, setEditingPrice] = useState(false);
  const [tempPrice, setTempPrice] = useState('');
  const [popped, setPopped] = useState(false);

  const style = getCategoryStyle(item.category, categoryAccent);
  const inCart = item.quantity > 0;

  const handleQuickAdd = () => {
    onAddToCart(item);
    setPopped(true);
    setTimeout(() => setPopped(false), 320);
  };

  const commitPrice = () => {
    const val = Number(tempPrice);
    if (tempPrice && Number.isFinite(val) && val > 0) {
      onUpdatePrice(item.id, val);
    }
    setEditingPrice(false);
    setTempPrice('');
  };

  return (
    <div
      className={`group relative rounded-2xl border p-3 flex flex-col transition-all duration-200 ${
        isBrokeWatched
          ? 'bg-amber-500/[0.04] border-amber-500/30 hover:border-amber-400/50'
          : 'glass hover:border-white/15 hover:bg-white/[0.05]'
      } ${popped ? 'animate-pop' : ''}`}
    >
      {/* Visual Area */}
      <div className="relative mb-2.5">
        <button
          type="button"
          onClick={() => onOpenDetails(item)}
          aria-label={`View details for ${item.name}`}
          className="block w-full text-left rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        >
          <ProductVisual
            name={item.name}
            category={item.category}
            imageUrl={item.imageUrl}
            iconKey={categoryIconKey}
            accent={categoryAccent}
            size="md"
          />
        </button>

        {/* Favourite Toggle */}
        <button
          type="button"
          onClick={() => onToggleFavourite(item.id)}
          aria-label={
            item.isFavourite
              ? `Remove ${item.name} from favourites`
              : `Add ${item.name} to favourites`
          }
          className={`absolute top-2 right-2 w-7 h-7 rounded-lg backdrop-blur-md border flex items-center justify-center transition-all ${
            item.isFavourite
              ? 'bg-rose-500/20 border-rose-400/40 text-rose-400'
              : 'bg-ink-950/70 border-white/10 text-zinc-400 hover:text-rose-300'
          }`}
        >
          <Heart
            className="w-3.5 h-3.5"
            fill={item.isFavourite ? 'currentColor' : 'none'}
            strokeWidth={2.3}
          />
        </button>

        {/* Recurring Indicator */}
        {item.recurrence && (
          <span
            title={`Recurring: ${item.recurrence.frequency}`}
            className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-ink-950/75 backdrop-blur-md border border-sky-400/30 text-sky-300 text-[9px] font-bold flex items-center gap-1"
          >
            <Repeat className="w-2.5 h-2.5" strokeWidth={2.5} />
            <span className="capitalize">{item.recurrence.frequency}</span>
          </span>
        )}

        {/* Broke Mode Watch Badge */}
        {isBrokeWatched && (
          <span
            title="Monitored in Broke Mode"
            className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md bg-ink-950/85 backdrop-blur-md border border-amber-400/40 text-amber-300 text-[9px] font-extrabold flex items-center gap-1"
          >
            <AlertTriangle className="w-2.5 h-2.5" strokeWidth={2.5} />
            Broke Watch
          </span>
        )}
      </div>

      {/* Category & Package Unit */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className={`text-[10px] font-bold truncate ${style.text}`}>
          {item.category}
        </span>
        <span className="text-[10px] font-mono font-bold text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06] whitespace-nowrap">
          {item.unit || '1 unit'}
        </span>
      </div>

      {/* Product Title */}
      <button
        type="button"
        onClick={() => onOpenDetails(item)}
        className="text-left mb-2 flex-1"
      >
        <h3 className="font-bold text-[13px] text-zinc-100 group-hover:text-white leading-snug line-clamp-2 transition-colors">
          {item.name}
        </h3>
      </button>

      {/* Price Row */}
      {editingPrice ? (
        <div className="flex items-center gap-1 mb-2.5">
          <span className="text-brand-400 font-bold text-xs">₹</span>
          <input
            type="number"
            min="1"
            step="any"
            aria-label={`Edit price for ${item.name}`}
            value={tempPrice}
            onChange={(e) => setTempPrice(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitPrice();
              if (e.key === 'Escape') {
                setEditingPrice(false);
                setTempPrice('');
              }
            }}
            className="w-full min-w-0 bg-ink-900 border border-brand-500/40 rounded-lg px-2 py-1 text-xs text-white font-mono outline-none"
            autoFocus
          />
          <button
            type="button"
            aria-label={`Save price for ${item.name}`}
            onClick={commitPrice}
            className="w-6 h-6 rounded-md bg-brand-500 text-ink-950 flex items-center justify-center flex-shrink-0"
          >
            <Check className="w-3.5 h-3.5" strokeWidth={3} />
          </button>
          <button
            type="button"
            aria-label={`Cancel price edit for ${item.name}`}
            onClick={() => {
              setEditingPrice(false);
              setTempPrice('');
            }}
            className="w-6 h-6 rounded-md bg-white/[0.06] text-zinc-400 flex items-center justify-center flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-base font-extrabold text-brand-400 font-mono tabular-nums">
              ₹{formatCurrencyExact(item.price)}
            </span>
            <button
              type="button"
              aria-label={`Edit price for ${item.name}`}
              onClick={() => {
                setEditingPrice(true);
                setTempPrice(String(item.price));
              }}
              className="text-zinc-500 hover:text-brand-400 transition-colors p-1 rounded-md hover:bg-white/[0.05]"
            >
              <Pencil className="w-3 h-3" strokeWidth={2.3} />
            </button>
          </div>
          {inCart && (
            <span className="text-[10px] font-mono font-bold text-brand-300">
              ₹{formatCurrencyExact(item.price * item.quantity)}
            </span>
          )}
        </div>
      )}

      {/* CTA / Quantity Controls */}
      {inCart ? (
        <div className="flex items-center justify-between gap-1 bg-brand-500/15 border border-brand-500/35 rounded-xl p-1">
          <button
            type="button"
            onClick={() => onUpdateQuantity(item.id, -1)}
            aria-label={`Decrease quantity of ${item.name}`}
            className="w-8 h-8 rounded-lg bg-ink-950/60 hover:bg-ink-950 text-white flex items-center justify-center transition-colors"
          >
            <Minus className="w-3.5 h-3.5" strokeWidth={3} />
          </button>
          <span className="text-sm font-extrabold font-mono text-brand-300 tabular-nums">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={() => onUpdateQuantity(item.id, 1)}
            aria-label={`Increase quantity of ${item.name}`}
            className="w-8 h-8 rounded-lg bg-brand-500 hover:bg-brand-400 text-ink-950 flex items-center justify-center transition-colors"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={3} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleQuickAdd}
          aria-label={`Add ${item.name} to cart`}
          className={`w-full py-2.5 rounded-xl text-xs font-extrabold border transition-all duration-200 flex items-center justify-center gap-1.5 ${
            isBrokeWatched
              ? 'bg-amber-500/15 hover:bg-amber-500 text-amber-200 hover:text-ink-950 border-amber-500/30 hover:border-amber-500'
              : 'bg-white/[0.07] hover:bg-brand-500 text-zinc-100 hover:text-ink-950 border-white/[0.08] hover:border-brand-500'
          }`}
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={3} />
          {isBrokeWatched ? 'Add (Watched)' : 'Add to Cart'}
        </button>
      )}
    </div>
  );
}

