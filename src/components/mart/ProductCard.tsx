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
      className={`group rounded-2xl p-3 flex flex-col justify-between transition-all duration-150 border ${
        totalItemCartQty > 0
          ? 'bg-[#EDF2FF]/35 border-[#365FE8]/45 shadow-card'
          : isBrokeWatched
          ? 'bg-white border-[#F3D8A8] shadow-card hover:border-[#E5A23B]'
          : 'bg-white border-[#E7EAF0] shadow-card hover:border-[#D5DBE5] hover:-translate-y-0.5'
      }`}
    >
      <div>
        <div className="relative">
          <button
            type="button"
            onClick={() => onOpenDetails(item)}
            className="w-full block text-left focus-visible:outline-none rounded-xl"
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

          {/* Top-left subtle contextual indicator */}
          <div className="absolute top-1.5 left-1.5 flex items-center gap-1 pointer-events-none">
            {isBrokeWatched ? (
              <span
                title="Watched by Broke Mode"
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[#FEF6E7] border border-[#F3D8A8] text-[#9E6614] shadow-xs flex items-center gap-1"
              >
                <AlertTriangle className="w-2.5 h-2.5" strokeWidth={2.5} />
                Cap
              </span>
            ) : item.recurrence ? (
              <span
                title={isDue ? 'Recurring item due now' : `Recurring (${item.recurrence.frequency})`}
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border shadow-xs flex items-center gap-1 ${
                  isDue
                    ? 'bg-[#365FE8] border-[#365FE8] text-white'
                    : 'bg-white/95 border-[#E7EAF0] text-[#4B5565]'
                }`}
              >
                <Repeat className="w-2.5 h-2.5" strokeWidth={2.5} />
                {isDue ? 'Due' : item.recurrence.frequency}
              </span>
            ) : item.isCustom ? (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-white/95 border border-[#E7EAF0] text-[#365FE8] shadow-xs">
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
            className={`absolute top-1.5 right-1.5 w-7 h-7 rounded-lg border shadow-xs flex items-center justify-center transition-colors backdrop-blur-sm ${
              item.isFavourite
                ? 'bg-[#FDECEC]/95 dark:bg-[#2A1318]/95 border-[#F6B8B8] dark:border-[#F06A6A]/55 text-[#DE5252]'
                : 'bg-white/95 dark:bg-[#11141B]/90 border-[#E7EAF0] dark:border-[#323B4F] text-[#697386] hover:text-[#151922]'
            }`}
          >
            <Heart
              className="w-3.5 h-3.5"
              strokeWidth={2.2}
              fill={item.isFavourite ? 'currentColor' : 'none'}
            />
          </button>
        </div>

        {/* Brand + Category Metadata & Product Title */}
        <button
          type="button"
          onClick={() => onOpenDetails(item)}
          className="w-full text-left mt-2.5 focus-visible:outline-none"
        >
          <div className="flex items-center justify-between gap-1 text-[11px] font-medium truncate">
            <span className="text-[#697386] truncate">{item.brand || item.category}</span>
            {item.subcategory && (
              <span className={`${style.text} truncate font-semibold`}>{item.subcategory}</span>
            )}
          </div>
          <p className="text-xs font-bold text-[#151922] leading-snug line-clamp-2 min-h-[2rem] mt-0.5">
            {item.name}
          </p>
        </button>

        {/* Variant Switcher OR Unit Label */}
        {item.variants && item.variants.length > 0 ? (
          <div className="mt-2">
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
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-colors flex items-center gap-1 whitespace-nowrap ${
                        selected
                          ? 'bg-[#EDF2FF] border-[#365FE8]/45 text-[#365FE8]'
                          : 'bg-[#F7F8FA] border-[#E7EAF0] text-[#4B5565] hover:text-[#151922]'
                      }`}
                    >
                      <span>{variant.unit}</span>
                      {varQty > 0 && <span className="text-[9px] font-mono">({formatQuantity(varQty)})</span>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <select
                aria-label={`Select pack size for ${item.name}`}
                value={activeVariant?.id ?? ''}
                onChange={(e) => onSelectVariant?.(item.id, e.target.value)}
                className="w-full bg-[#F7F8FA] border border-[#E7EAF0] rounded-lg px-2 py-1 text-[11px] font-semibold text-[#151922] outline-none focus:border-[#365FE8]"
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
          <div className="flex items-center gap-1.5 mt-1.5 min-h-[1.25rem]">
            <span className="text-[11px] font-mono text-[#697386]">
              {displayUnit}
            </span>
            {item.allowDecimalQuantity && (
              <span className="text-[10px] text-[#929BAB] font-medium">· step {step}</span>
            )}
          </div>
        )}
      </div>

      {/* Price + Inline Cart Action Footer */}
      <div className="mt-3 pt-2.5 border-t border-[#E7EAF0]">
        {editingPrice ? (
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-[#365FE8]">₹</span>
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
              className="w-16 bg-white border border-[#365FE8] rounded-lg px-1.5 py-1 text-xs font-mono text-[#151922] outline-none"
              autoFocus
            />
            <button
              type="button"
              onClick={commitPrice}
              aria-label="Save price"
              className="w-6 h-6 rounded-lg bg-[#365FE8] text-white flex items-center justify-center"
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
              className="w-6 h-6 rounded-lg bg-[#F1F3F6] text-[#697386] flex items-center justify-center"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-1.5">
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold font-mono text-[#151922] tabular-nums">
                  ₹{formatCurrencyExact(displayPrice)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPrice(true);
                    setTempPrice(String(displayPrice));
                  }}
                  aria-label={`Edit price for ${item.name}`}
                  className="text-[#929BAB] hover:text-[#365FE8] p-0.5 transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
              {otherVariantsInCart && (
                <p className="text-[10px] text-[#365FE8] font-mono font-semibold">
                  {formatQuantity(totalItemCartQty)} total
                </p>
              )}
            </div>

            {activeQty === 0 ? (
              <button
                type="button"
                onClick={() => onAddToCart(item, step, activeVariant?.id)}
                aria-label={`Add ${item.name} to cart`}
                className="px-3 py-1.5 rounded-xl bg-[#EDF2FF] hover:bg-[#365FE8] text-[#365FE8] hover:text-white border border-[#365FE8]/25 text-xs font-semibold flex items-center gap-1 transition-colors flex-shrink-0 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                Add
              </button>
            ) : (
              <div className="flex items-center gap-0.5 bg-[#365FE8] rounded-xl p-0.5 text-white shadow-xs flex-shrink-0">
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
                    className="w-9 bg-white text-[#151922] rounded px-0.5 text-[11px] font-bold font-mono text-center outline-none"
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
                    className="text-xs font-bold font-mono min-w-[1.25rem] px-1 text-center tabular-nums"
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
