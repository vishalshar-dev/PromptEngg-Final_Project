import { useState } from 'react';
import { Heart, Pencil, Check, X, Plus, Minus, Repeat, AlertTriangle } from 'lucide-react';
import type { CartItem } from '../../types/models';
import { formatCurrencyExact, formatQuantity, getCategoryStyle } from '../../utils/categoryStyles';
import {
  getActiveVariant,
  getDefaultQuantityStep,
  getItemVariantCartQty,
  isRecurringItemDue,
} from '../../utils/martEngine';
import { ProductVisual } from './ProductVisual';

export interface ProductCardProps {
  item: CartItem;
  categoryAccent?: string;
  categoryIconKey?: string;
  isBrokeWatched?: boolean;
  onAddToCart: (item: CartItem, amount?: number, variantId?: string) => void;
  onUpdateQuantity: (id: string, delta: number, variantId?: string) => void;
  onSetQuantity?: (id: string, quantity: number, variantId?: string) => void;
  onSelectVariant?: (id: string, variantId: string) => void;
  onToggleFavourite: (id: string) => void;
  onUpdatePrice: (id: string, newPrice: number, variantId?: string) => void;
  onOpenDetails: (item: CartItem) => void;
}

export function ProductCard({
  item,
  categoryAccent,
  categoryIconKey,
  isBrokeWatched = false,
  onAddToCart,
  onUpdateQuantity,
  onSetQuantity,
  onSelectVariant,
  onToggleFavourite,
  onUpdatePrice,
  onOpenDetails,
}: ProductCardProps) {
  const [editingPrice, setEditingPrice] = useState(false);
  const [tempPrice, setTempPrice] = useState('');
  const [editingQty, setEditingQty] = useState(false);
  const [tempQty, setTempQty] = useState('');

  const style = getCategoryStyle(item.category, categoryAccent);
  const isDue = isRecurringItemDue(item);

  const activeVariant = getActiveVariant(item);
  const displayPrice = activeVariant ? activeVariant.price : item.price;
  const displayUnit = activeVariant ? activeVariant.unit : item.unit || '1 unit';
  const activeQty = getItemVariantCartQty(item, activeVariant?.id);
  const totalItemCartQty = item.quantity;
  const otherVariantsInCart = totalItemCartQty > activeQty;
  const step = getDefaultQuantityStep(item);

  const commitPrice = () => {
    const val = Number(tempPrice);
    if (tempPrice && Number.isFinite(val) && val > 0) {
      onUpdatePrice(item.id, val, activeVariant?.id);
    }
    setEditingPrice(false);
    setTempPrice('');
  };

  const commitQty = () => {
    const val = Number(tempQty);
    if (tempQty !== '' && Number.isFinite(val) && val >= 0) {
      onSetQuantity?.(item.id, val, activeVariant?.id);
    }
    setEditingQty(false);
    setTempQty('');
  };

  return (
    <div
      className={`group glass rounded-2xl p-2.5 flex flex-col justify-between transition-all duration-200 border ${
        totalItemCartQty > 0
          ? 'border-brand-500/40 bg-brand-500/[0.04] shadow-lg'
          : isBrokeWatched
          ? 'border-amber-500/25 hover:border-amber-500/40'
          : 'border-white/[0.06] hover:border-white/[0.15] hover:-translate-y-0.5'
      }`}
    >
      <div>
        <div className="relative">
          <button
            type="button"
            onClick={() => onOpenDetails(item)}
            className="w-full block text-left focus:outline-none"
            aria-label={`View details for ${item.name}`}
          >
            <ProductVisual
              name={item.name}
              category={item.category}
              imageUrl={item.imageUrl}
              iconKey={categoryIconKey}
              accent={categoryAccent}
              size="md"
              className="!h-24"
            />
          </button>

          {/* Top-left subtle contextual tag (max 1) */}
          <div className="absolute top-1.5 left-1.5 flex items-center gap-1 pointer-events-none">
            {isBrokeWatched ? (
              <span
                title="Watched by Broke Mode"
                className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-amber-500/90 text-ink-950 shadow flex items-center gap-0.5"
              >
                <AlertTriangle className="w-2.5 h-2.5" strokeWidth={2.5} />
                Cap
              </span>
            ) : item.recurrence ? (
              <span
                title={isDue ? 'Recurring item due now' : `Recurring (${item.recurrence.frequency})`}
                className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md backdrop-blur-md border flex items-center gap-0.5 ${
                  isDue
                    ? 'bg-sky-500/90 border-sky-300 text-ink-950'
                    : 'bg-ink-950/75 border-white/15 text-zinc-200'
                }`}
              >
                <Repeat className="w-2.5 h-2.5" strokeWidth={2.5} />
                {isDue ? 'Due' : item.recurrence.frequency}
              </span>
            ) : item.isCustom ? (
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-ink-950/80 border border-white/15 text-brand-300">
                Custom
              </span>
            ) : null}
          </div>

          {/* Favorite Heart Button */}
          <button
            type="button"
            onClick={() => onToggleFavourite(item.id)}
            aria-label={
              item.isFavourite
                ? `Remove ${item.name} from favourites`
                : `Add ${item.name} to favourites`
            }
            aria-pressed={Boolean(item.isFavourite)}
            className={`absolute top-1.5 right-1.5 w-7 h-7 rounded-lg backdrop-blur-md border flex items-center justify-center transition-all ${
              item.isFavourite
                ? 'bg-rose-500/25 border-rose-400/40 text-rose-400'
                : 'bg-ink-950/65 border-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            <Heart
              className="w-3.5 h-3.5"
              strokeWidth={2.3}
              fill={item.isFavourite ? 'currentColor' : 'none'}
            />
          </button>
        </div>

        {/* Brand + Category Metadata & Product Title */}
        <button
          type="button"
          onClick={() => onOpenDetails(item)}
          className="w-full text-left mt-2 focus:outline-none"
        >
          <div className="flex items-center justify-between gap-1 text-[9px] font-bold uppercase tracking-wider truncate">
            <span className="text-zinc-400 truncate">{item.brand || item.category}</span>
            {item.subcategory && (
              <span className={`${style.text} truncate opacity-85`}>{item.subcategory}</span>
            )}
          </div>
          <p className="text-xs font-extrabold text-zinc-100 leading-snug line-clamp-2 min-h-[2rem] mt-0.5">
            {item.name}
          </p>
        </button>

        {/* Variant Switcher OR Unit Label */}
        {item.variants && item.variants.length > 0 ? (
          <div className="mt-1.5">
            {item.variants.length <= 3 ? (
              <div className="flex items-center gap-1 flex-wrap">
                {item.variants.map((variant) => {
                  const selected = activeVariant?.id === variant.id;
                  const varQty = getItemVariantCartQty(item, variant.id);
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => onSelectVariant?.(item.id, variant.id)}
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border transition-all flex items-center gap-1 ${
                        selected
                          ? 'bg-brand-500/20 border-brand-500/50 text-brand-300'
                          : 'bg-ink-900/90 border-white/[0.08] text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span>{variant.unit}</span>
                      {varQty > 0 && <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <select
                aria-label={`Select pack size for ${item.name}`}
                value={activeVariant?.id ?? ''}
                onChange={(e) => onSelectVariant?.(item.id, e.target.value)}
                className="w-full bg-ink-900 border border-white/[0.1] rounded-lg px-2 py-1 text-[10px] font-bold text-zinc-200 outline-none"
              >
                {item.variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.label} — ₹{formatCurrencyExact(variant.price)}
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 mt-1 min-h-[1.25rem]">
            <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">
              {displayUnit}
            </span>
            {item.allowDecimalQuantity && (
              <span className="text-[9px] text-zinc-500 font-medium">step {step}</span>
            )}
          </div>
        )}
      </div>

      {/* Price + Inline Cart Action Footer */}
      <div className="mt-2.5 pt-2 border-t border-white/[0.06]">
        {editingPrice ? (
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-brand-400">₹</span>
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
              className="w-16 bg-ink-900 border border-brand-500/40 rounded-lg px-1.5 py-1 text-xs font-mono text-white outline-none"
              autoFocus
            />
            <button
              type="button"
              onClick={commitPrice}
              aria-label="Save price"
              className="w-6 h-6 rounded-lg bg-brand-500 text-ink-950 flex items-center justify-center"
            >
              <Check className="w-3 h-3" strokeWidth={3} />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingPrice(false);
                setTempPrice('');
              }}
              aria-label="Cancel price edit"
              className="w-6 h-6 rounded-lg bg-white/[0.08] text-zinc-400 flex items-center justify-center"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-1.5">
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-sm font-extrabold font-mono text-white tabular-nums">
                  ₹{formatCurrencyExact(displayPrice)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPrice(true);
                    setTempPrice(String(displayPrice));
                  }}
                  aria-label={`Edit price for ${item.name}`}
                  className="text-zinc-600 hover:text-brand-400 p-0.5 transition-colors"
                >
                  <Pencil className="w-2.5 h-2.5" />
                </button>
              </div>
              {otherVariantsInCart && (
                <p className="text-[9px] text-brand-400/90 font-mono">
                  {formatQuantity(totalItemCartQty)} total
                </p>
              )}
            </div>

            {activeQty === 0 ? (
              <button
                type="button"
                onClick={() => onAddToCart(item, step, activeVariant?.id)}
                aria-label={`Add ${item.name} to cart`}
                className="px-3 py-1.5 rounded-xl bg-brand-500/15 hover:bg-brand-500 text-brand-400 hover:text-ink-950 border border-brand-500/35 text-[11px] font-extrabold uppercase tracking-wide flex items-center gap-1 transition-all flex-shrink-0"
              >
                <Plus className="w-3 h-3" strokeWidth={3} />
                Add
              </button>
            ) : (
              <div className="flex items-center gap-0.5 bg-brand-500 rounded-xl p-0.5 text-ink-950 shadow flex-shrink-0">
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(item.id, -step, activeVariant?.id)}
                  aria-label={`Decrease ${item.name} quantity`}
                  className="w-6 h-6 rounded-lg hover:bg-black/15 flex items-center justify-center"
                >
                  <Minus className="w-3 h-3" strokeWidth={3} />
                </button>
                {editingQty && onSetQuantity ? (
                  <input
                    type="number"
                    min="0"
                    step={step}
                    aria-label={`Enter quantity for ${item.name}`}
                    value={tempQty}
                    onChange={(e) => setTempQty(e.target.value)}
                    onBlur={commitQty}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitQty();
                      if (e.key === 'Escape') {
                        setEditingQty(false);
                        setTempQty('');
                      }
                    }}
                    className="w-9 bg-white/90 text-ink-950 rounded px-0.5 text-[11px] font-extrabold font-mono text-center outline-none"
                    autoFocus
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (onSetQuantity) {
                        setEditingQty(true);
                        setTempQty(String(activeQty));
                      }
                    }}
                    title="Click to type exact quantity"
                    className="text-xs font-extrabold font-mono min-w-[1.25rem] px-1 text-center tabular-nums"
                  >
                    {formatQuantity(activeQty)}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(item.id, step, activeVariant?.id)}
                  aria-label={`Increase ${item.name} quantity`}
                  className="w-6 h-6 rounded-lg hover:bg-black/15 flex items-center justify-center"
                >
                  <Plus className="w-3 h-3" strokeWidth={3} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
