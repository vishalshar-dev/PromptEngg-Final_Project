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
      className={`group rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between transition-all border ${
        totalItemCartQty > 0
          ? 'bg-[var(--accent-primary-soft)] border-[var(--accent-primary)] shadow-card'
          : isBrokeWatched
          ? 'bg-[var(--bg-surface)] border-[var(--accent-warning-border)] shadow-card hover:border-[var(--accent-warning)]'
          : 'surface-card-interactive'
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
              className="!h-28 sm:!h-32"
            />
          </button>

          {/* Top-left subtle contextual indicator */}
          <div className="absolute top-2 left-2 flex items-center gap-1 pointer-events-none">
            {isBrokeWatched ? (
              <span
                title="Watched by Broke Mode"
                className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-[var(--accent-warning-soft)] border border-[var(--accent-warning-border)] text-[var(--accent-warning-ink)] shadow-xs flex items-center gap-1"
              >
                <AlertTriangle className="w-3 h-3" strokeWidth={2.5} />
                Cap
              </span>
            ) : item.recurrence ? (
              <span
                title={
                  isDue
                    ? 'Recurring item due now'
                    : item.recurrence.source === 'auto'
                      ? `Auto-detected recurring (${item.recurrence.frequency})`
                      : `Recurring (${item.recurrence.frequency})`
                }
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border shadow-xs flex items-center gap-1 backdrop-blur-sm ${
                  isDue
                    ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white'
                    : 'bg-[var(--bg-surface-translucent)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                }`}
              >
                <Repeat className="w-3 h-3" strokeWidth={2.5} />
                {isDue ? 'Due' : item.recurrence.frequency}
              </span>
            ) : item.isCustom ? (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-[var(--bg-surface-translucent)] border border-[var(--border-subtle)] text-[var(--accent-ink)] shadow-xs backdrop-blur-sm">
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
            className={`absolute top-2 right-2 w-8 h-8 rounded-lg border shadow-xs flex items-center justify-center transition-colors backdrop-blur-sm ${
              item.isFavourite
                ? 'bg-[var(--accent-danger-soft)] border-[var(--accent-danger-border)] text-[var(--accent-danger)]'
                : 'bg-[var(--bg-surface-translucent)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
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
          <div className="flex items-center justify-between gap-1 text-[12px] font-medium truncate">
            <span className="text-[var(--text-secondary)] truncate">{item.brand || item.category}</span>
            {item.subcategory && (
              <span className={`${style.text} truncate font-semibold`}>{item.subcategory}</span>
            )}
          </div>
          <p className="text-[13px] font-bold text-[var(--text-primary)] leading-snug line-clamp-2 min-h-[2.25rem] mt-0.5">
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
                      className={`px-2 py-0.5 rounded-lg text-[11.5px] font-semibold border transition-colors flex items-center gap-1 whitespace-nowrap ${
                        selected
                          ? 'bg-[var(--accent-primary-soft)] border-[var(--accent-border)] text-[var(--accent-ink)]'
                          : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span>{variant.unit}</span>
                      {varQty > 0 && <span className="text-[11px] font-mono">({formatQuantity(varQty)})</span>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <select
                aria-label={`Select pack size for ${item.name}`}
                value={activeVariant?.id ?? ''}
                onChange={(e) => onSelectVariant?.(item.id, e.target.value)}
                className="w-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-[12px] font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
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
          <div className="flex items-center gap-1.5 mt-1.5 min-h-[1.35rem]">
            <span className="text-[12px] font-mono text-[var(--text-secondary)]">
              {displayUnit}
            </span>
            {item.allowDecimalQuantity && (
              <span className="text-[11.5px] text-[var(--text-muted)] font-medium">· step {step}</span>
            )}
          </div>
        )}
      </div>

      {/* Price + Inline Cart Action Footer */}
      <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)]">
        {editingPrice ? (
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-[var(--accent-ink)]">₹</span>
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
              className="w-16 bg-[var(--bg-surface)] border border-[var(--accent-primary)] rounded-lg px-1.5 py-1 text-xs font-mono text-[var(--text-primary)] outline-none"
              autoFocus
            />
            <button
              type="button"
              onClick={commitPrice}
              aria-label="Save price"
              className="w-7 h-7 rounded-lg bg-[var(--accent-primary)] text-white flex items-center justify-center"
            >
              <Check className="w-3.5 h-3.5" strokeWidth={3} />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingPrice(false);
                setTempPrice('');
              }}
              aria-label="Cancel price edit"
              className="w-7 h-7 rounded-lg bg-[var(--bg-subtle)] text-[var(--text-secondary)] flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-1.5">
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[14px] font-bold font-mono text-[var(--text-primary)] tabular-nums">
                  ₹{formatCurrencyExact(displayPrice)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPrice(true);
                    setTempPrice(String(displayPrice));
                  }}
                  aria-label={`Edit price for ${item.name}`}
                  className="text-[var(--text-muted)] hover:text-[var(--accent-ink)] p-1 transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
              {otherVariantsInCart && (
                <p className="text-[11px] text-[var(--accent-ink)] font-mono font-semibold tabular-nums">
                  {formatQuantity(totalItemCartQty)} total
                </p>
              )}
            </div>

            {activeQty === 0 ? (
              <button
                type="button"
                onClick={() => onAddToCart(item, step, activeVariant?.id)}
                aria-label={`Add ${item.name} to cart`}
                className="px-3 py-1.5 rounded-xl bg-[var(--accent-primary-soft)] hover:bg-[var(--accent-primary)] text-[var(--accent-ink)] hover:text-white border border-[var(--accent-border)] text-xs font-semibold flex items-center gap-1 transition-colors flex-shrink-0 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                Add
              </button>
            ) : (
              <div className="flex items-center gap-0.5 bg-[var(--accent-primary)] rounded-xl p-0.5 text-white shadow-xs flex-shrink-0">
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(item.id, -step, activeVariant?.id)}
                  aria-label={`Decrease ${item.name} quantity`}
                  className="w-7 h-7 rounded-lg hover:bg-black/15 flex items-center justify-center"
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
                    className="w-9 bg-[var(--bg-surface)] text-[var(--text-primary)] rounded px-0.5 text-[12px] font-bold font-mono text-center outline-none"
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
                    className="text-xs font-bold font-mono min-w-[1.35rem] px-1 text-center tabular-nums"
                  >
                    {formatQuantity(activeQty)}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(item.id, step, activeVariant?.id)}
                  aria-label={`Increase ${item.name} quantity`}
                  className="w-7 h-7 rounded-lg hover:bg-black/15 flex items-center justify-center"
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
