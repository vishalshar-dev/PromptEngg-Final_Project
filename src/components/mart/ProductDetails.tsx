import { useState, useMemo, useEffect } from 'react';
import {
  X,
  Heart,
  Pencil,
  Trash2,
  Plus,
  Minus,
  Repeat,
  TrendingUp,
  TrendingDown,
  Minus as FlatIcon,
  ShoppingBag,
  Check,
  Tag,
} from 'lucide-react';
import {
  useAppStore,
  type CartItem,
  type RecurrenceFrequency,
} from '../../store/useStore';
import { formatCurrencyExact, formatQuantity, getCategoryStyle } from '../../utils/categoryStyles';
import {
  computeUnitPriceStats,
  getActiveVariant,
  getDefaultQuantityStep,
  getItemVariantCartQty,
  getPriceHistoryPointsForItem,
  roundQuantity,
  toLocalDateKey,
} from '../../utils/martEngine';
import { ProductVisual } from './ProductVisual';

interface ProductDetailsProps {
  item: CartItem | null;
  onClose: () => void;
  onEditProduct: (item: CartItem) => void;
}

export function ProductDetails({
  item,
  onClose,
  onEditProduct,
}: ProductDetailsProps) {
  const categoryConfigs = useAppStore((s) => s.categoryConfigs);
  const priceHistory = useAppStore((s) => s.priceHistory);
  const addToCart = useAppStore((s) => s.addToCart);
  const updateQuantity = useAppStore((s) => s.updateQuantity);
  const selectProductVariant = useAppStore((s) => s.selectProductVariant);
  const toggleFavourite = useAppStore((s) => s.toggleFavourite);
  const setProductRecurrence = useAppStore((s) => s.setProductRecurrence);
  const removeProduct = useAppStore((s) => s.removeProduct);

  const liveItem = useAppStore((s) =>
    item ? s.items.find((i) => i.id === item.id) ?? item : null
  );

  const defaultStep = liveItem ? getDefaultQuantityStep(liveItem) : 1;
  const [qtyToAdd, setQtyToAdd] = useState(defaultStep);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setConfirmDelete(false);
    setQtyToAdd(liveItem ? getDefaultQuantityStep(liveItem) : 1);
  }, [liveItem?.id]);

  const activeVariant = liveItem ? getActiveVariant(liveItem) : null;
  const displayPrice = activeVariant ? activeVariant.price : liveItem?.price ?? 0;
  const displayUnit = activeVariant ? activeVariant.unit : liveItem?.unit || '1 unit';
  const activeCartQty = liveItem ? getItemVariantCartQty(liveItem, activeVariant?.id) : 0;

  const stats = useMemo(() => {
    if (!liveItem) return null;
    const points = getPriceHistoryPointsForItem(priceHistory, liveItem, activeVariant?.id);
    return computeUnitPriceStats(points, displayUnit);
  }, [liveItem, priceHistory, activeVariant?.id, displayUnit]);

  if (!liveItem) return null;

  const cfg = categoryConfigs.find((c) => c.name === liveItem.category);
  const style = getCategoryStyle(liveItem.category, cfg?.accent);

  const handleRecurrenceSelect = (freq: 'none' | RecurrenceFrequency) => {
    if (freq === 'none') {
      setProductRecurrence(liveItem.id, null);
      return;
    }
    setProductRecurrence(liveItem.id, {
      frequency: freq,
      intervalDays: freq === 'custom' ? liveItem.recurrence?.intervalDays ?? 14 : undefined,
      nextDueDate: liveItem.recurrence?.nextDueDate ?? toLocalDateKey(new Date()),
      source: 'manual',
    });
  };

  const handleAddClick = () => {
    addToCart(liveItem, qtyToAdd, activeVariant?.id);
    setQtyToAdd(defaultStep);
    onClose();
  };

  const handleDelete = () => {
    removeProduct(liveItem.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="fixed inset-0 bg-[var(--backdrop-scrim)] backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] flex flex-col bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-t-3xl sm:rounded-2xl shadow-modal animate-slide-up overflow-hidden">
        {/* Top Visual Header */}
        <div className="relative p-4 pb-0">
          <ProductVisual
            name={liveItem.name}
            category={liveItem.category}
            imageUrl={liveItem.imageUrl}
            iconKey={cfg?.iconKey}
            accent={cfg?.accent}
            size="lg"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close product details"
            className="absolute top-6 right-6 w-9 h-9 rounded-xl bg-[var(--bg-surface-translucent)] border border-[var(--border-subtle)] shadow-card flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] backdrop-blur-sm"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => toggleFavourite(liveItem.id)}
            aria-label={liveItem.isFavourite ? 'Remove from favourites' : 'Add to favourites'}
            className={`absolute top-6 left-6 w-9 h-9 rounded-xl border shadow-card flex items-center justify-center backdrop-blur-sm ${
              liveItem.isFavourite
                ? 'bg-[var(--accent-danger-soft)] border-[var(--accent-danger-border)] text-[var(--accent-danger)]'
                : 'bg-[var(--bg-surface-translucent)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--accent-danger)]'
            }`}
          >
            <Heart
              className="w-4 h-4"
              fill={liveItem.isFavourite ? 'currentColor' : 'none'}
            />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto scrollbar-thin">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap text-xs text-[var(--text-secondary)]">
                {liveItem.brand && (
                  <>
                    <span className="font-semibold text-[var(--text-primary)]">{liveItem.brand}</span>
                    <span aria-hidden="true">·</span>
                  </>
                )}
                <span className={`font-semibold ${style.text}`}>{liveItem.category}</span>
                {liveItem.subcategory && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{liveItem.subcategory}</span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span className="font-mono">{displayUnit}</span>
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mt-1.5">
                {liveItem.name}
              </h3>
              {liveItem.description && (
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  {liveItem.description}
                </p>
              )}
              {liveItem.tags && liveItem.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mt-2 text-[12px] text-[var(--text-secondary)]">
                  <Tag className="w-3 h-3 text-[var(--text-muted)]" />
                  {liveItem.tags.map((tag, i) => (
                    <span key={tag}>
                      {i > 0 && <span className="mr-1.5 text-[var(--border-strong)]" aria-hidden="true">·</span>}
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-bold font-mono text-[var(--accent-ink)] tabular-nums">
                ₹{formatCurrencyExact(displayPrice)}
              </p>
              <p className="text-xs text-[var(--text-secondary)] font-mono">
                per {displayUnit}
              </p>
            </div>
          </div>

          {/* Interactive Pack Size / Variant Picker */}
          {liveItem.variants && liveItem.variants.length > 0 && (
            <div className="border-t border-[var(--border-subtle)] pt-3.5 space-y-2.5">
              <p className="text-xs font-semibold text-[var(--text-secondary)]">
                Select Pack Size / Variant
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {liveItem.variants.map((variant) => {
                  const isSelected = activeVariant?.id === variant.id;
                  const varQty = getItemVariantCartQty(liveItem, variant.id);
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => selectProductVariant(liveItem.id, variant.id)}
                      className={`px-3 py-2 rounded-xl border text-left transition-colors ${
                        isSelected
                          ? 'bg-[var(--accent-primary-soft)] border-[var(--accent-primary)] text-[var(--text-primary)]'
                          : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold">{variant.label}</span>
                        {varQty > 0 && (
                          <span className="text-[12px] font-mono font-semibold text-[var(--accent-ink)]">
                            {formatQuantity(varQty)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono font-semibold text-[var(--accent-ink)] mt-0.5 tabular-nums">
                        ₹{formatCurrencyExact(variant.price)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Unit-Compatible Price Summary (flat surface-well metrics — zero nested border stacks) */}
          {stats && stats.compatiblePoints.length > 0 && (
            <div className="border-t border-[var(--border-subtle)] pt-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[var(--text-secondary)]">
                  Price History ({displayUnit})
                </p>
                <div className="flex items-center gap-1 text-xs font-mono font-semibold tabular-nums">
                  {stats.deltaFromAvg < -0.5 ? (
                    <span className="text-[var(--accent-success-ink)] flex items-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5" />
                      {stats.deltaPctFromAvg}% vs avg
                    </span>
                  ) : stats.deltaFromAvg > 0.5 ? (
                    <span className="text-[var(--accent-danger)] flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      +{stats.deltaPctFromAvg}% vs avg
                    </span>
                  ) : (
                    <span className="text-[var(--text-secondary)] flex items-center gap-1">
                      <FlatIcon className="w-3.5 h-3.5" />
                      At average
                    </span>
                  )}
                </div>
              </div>
              <div className="surface-well rounded-xl grid grid-cols-3 divide-x divide-[var(--border-subtle)] text-center">
                <div className="p-2.5">
                  <p className="text-[12px] font-medium text-[var(--text-secondary)]">Average</p>
                  <p className="text-xs font-bold font-mono text-[var(--text-primary)] mt-0.5 tabular-nums">
                    ₹{formatCurrencyExact(stats.average)}
                  </p>
                </div>
                <div className="p-2.5">
                  <p className="text-[12px] font-medium text-[var(--text-secondary)]">Lowest</p>
                  <p className="text-xs font-bold font-mono text-[var(--accent-success-ink)] mt-0.5 tabular-nums">
                    ₹{formatCurrencyExact(stats.min)}
                  </p>
                </div>
                <div className="p-2.5">
                  <p className="text-[12px] font-medium text-[var(--text-secondary)]">Highest</p>
                  <p className="text-xs font-bold font-mono text-[var(--accent-warning-ink)] mt-0.5 tabular-nums">
                    ₹{formatCurrencyExact(stats.max)}
                  </p>
                </div>
              </div>
              <p className="text-[12px] text-[var(--text-secondary)]">
                {stats.userPurchaseCount} user purchase{stats.userPurchaseCount === 1 ? '' : 's'} ·{' '}
                {stats.referenceCount} reference price{stats.referenceCount === 1 ? '' : 's'}
                {stats.excludedIncompatibleCount > 0 &&
                  ` · ${stats.excludedIncompatibleCount} incompatible unit skipped`}
              </p>
            </div>
          )}

          {/* Recurring Schedule */}
          <div className="border-t border-[var(--border-subtle)] pt-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-[var(--accent-ink)]" />
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Recurring Schedule
                </span>
                {liveItem.recurrence?.source === 'auto' && (
                  <span className="text-[12px] font-semibold text-[var(--accent-success-ink)]">
                    · Auto-detected
                  </span>
                )}
              </div>
              {liveItem.recurrence?.nextDueDate && (
                <span className="text-[12px] font-mono text-[var(--accent-ink)]">
                  Next due: {liveItem.recurrence.nextDueDate}
                </span>
              )}
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {(['none', 'daily', 'weekly', 'monthly', 'custom'] as const).map((freq) => {
                const active =
                  freq === 'none'
                    ? !liveItem.recurrence
                    : liveItem.recurrence?.frequency === freq;
                return (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => handleRecurrenceSelect(freq)}
                    className={`py-1.5 rounded-lg text-xs font-semibold capitalize border transition-colors ${
                      active
                        ? 'bg-[var(--accent-primary-soft)] border-[var(--accent-border)] text-[var(--accent-ink)]'
                        : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {freq === 'none' ? 'Off' : freq}
                  </button>
                );
              })}
            </div>
            {liveItem.recurrence?.frequency === 'custom' && (
              <div className="flex items-center gap-2 pt-1">
                <label className="text-xs text-[var(--text-secondary)]">Repeat every</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={liveItem.recurrence.intervalDays ?? 14}
                  onChange={(e) =>
                    setProductRecurrence(liveItem.id, {
                      ...liveItem.recurrence!,
                      intervalDays: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                  className="w-16 bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 text-xs font-mono text-[var(--text-primary)] text-center"
                />
                <span className="text-xs text-[var(--text-secondary)]">days</span>
              </div>
            )}
          </div>

          {/* Manage Buttons */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEditProduct(liveItem);
              }}
              className="btn-secondary text-xs mt-2"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Product
            </button>

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="mt-2 px-3.5 py-2 rounded-xl bg-[var(--accent-danger-soft)] hover:opacity-90 border border-[var(--accent-danger-border)] text-xs font-semibold text-[var(--accent-danger-ink)] flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            ) : (
              <div className="flex items-center gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-2 rounded-xl bg-[var(--accent-danger)] text-xs font-semibold text-white flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  Confirm Remove
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="btn-secondary py-2 px-3 text-xs"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          {confirmDelete && (
            <p className="text-xs text-[var(--text-secondary)]">
              Removing from your personal catalogue preserves all past financial transactions &amp; audit logs.
            </p>
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)] flex items-center gap-3">
          {activeCartQty > 0 ? (
            <div className="flex items-center justify-between w-full gap-3">
              <div className="flex items-center gap-1.5 bg-[var(--bg-surface)] rounded-xl p-1 border border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => updateQuantity(liveItem.id, -defaultStep, activeVariant?.id)}
                  aria-label="Decrease quantity"
                  className="w-9 h-9 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-primary)]"
                >
                  <Minus className="w-4 h-4" strokeWidth={2.5} />
                </button>
                <span className="min-w-[2.25rem] px-1 text-center font-mono font-bold text-[var(--text-primary)] tabular-nums">
                  {formatQuantity(activeCartQty)}
                </span>
                <button
                  type="button"
                  onClick={() => updateQuantity(liveItem.id, defaultStep, activeVariant?.id)}
                  aria-label="Increase quantity"
                  className="w-9 h-9 rounded-lg bg-[var(--accent-primary)] text-white flex items-center justify-center"
                >
                  <Plus className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 btn-primary py-3 text-sm"
              >
                Done · ₹{formatCurrencyExact(displayPrice * activeCartQty)} in Cart
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 bg-[var(--bg-surface)] rounded-xl p-1 border border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() =>
                    setQtyToAdd((q) => Math.max(defaultStep, roundQuantity(q - defaultStep)))
                  }
                  aria-label="Decrease add quantity"
                  className="w-9 h-9 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-primary)]"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="min-w-[2rem] px-1 text-center font-mono font-bold text-sm text-[var(--text-primary)] tabular-nums">
                  {formatQuantity(qtyToAdd)}
                </span>
                <button
                  type="button"
                  onClick={() => setQtyToAdd((q) => roundQuantity(q + defaultStep))}
                  aria-label="Increase add quantity"
                  className="w-9 h-9 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-primary)]"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={handleAddClick}
                className="flex-1 btn-primary py-3 text-sm"
              >
                <ShoppingBag className="w-4 h-4" strokeWidth={2.2} />
                Add{activeVariant ? ` (${activeVariant.label})` : ''} · ₹{formatCurrencyExact(displayPrice * qtyToAdd)}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
