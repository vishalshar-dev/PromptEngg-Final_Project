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
        className="fixed inset-0 bg-black/75 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] flex flex-col glass-strong border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl animate-slide-up overflow-hidden">
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
            className="absolute top-6 right-6 w-9 h-9 rounded-xl bg-ink-950/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => toggleFavourite(liveItem.id)}
            aria-label={liveItem.isFavourite ? 'Remove from favourites' : 'Add to favourites'}
            className={`absolute top-6 left-6 w-9 h-9 rounded-xl backdrop-blur-md border flex items-center justify-center ${
              liveItem.isFavourite
                ? 'bg-rose-500/25 border-rose-400/50 text-rose-300'
                : 'bg-ink-950/80 border-white/10 text-zinc-300 hover:text-rose-300'
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
              <div className="flex items-center gap-1.5 flex-wrap">
                {liveItem.brand && (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/[0.08] text-zinc-200 border border-white/10">
                    {liveItem.brand}
                  </span>
                )}
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${style.bg} ${style.text} border ${style.border}`}
                >
                  {liveItem.category}
                </span>
                {liveItem.subcategory && (
                  <span className="text-[10px] font-bold text-zinc-300 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06]">
                    {liveItem.subcategory}
                  </span>
                )}
                <span className="text-[10px] font-mono font-bold text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06]">
                  {displayUnit}
                </span>
              </div>
              <h3 className="text-xl font-extrabold text-white mt-2">
                {liveItem.name}
              </h3>
              {liveItem.description && (
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  {liveItem.description}
                </p>
              )}
              {liveItem.tags && liveItem.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  <Tag className="w-3 h-3 text-zinc-500" />
                  {liveItem.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-400 border border-white/[0.05]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-extrabold font-mono text-brand-400 tabular-nums">
                ₹{formatCurrencyExact(displayPrice)}
              </p>
              <p className="text-[10px] text-zinc-500 font-mono">
                per {displayUnit}
              </p>
            </div>
          </div>

          {/* Interactive Pack Size / Variant Picker */}
          {liveItem.variants && liveItem.variants.length > 0 && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5 space-y-2">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">
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
                      className={`px-3 py-2 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-brand-500/15 border-brand-500/50 text-white'
                          : 'bg-ink-900/70 border-white/[0.08] text-zinc-300 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-extrabold">{variant.label}</span>
                        {varQty > 0 && (
                          <span className="text-[10px] font-mono font-bold text-brand-400">
                            {formatQuantity(varQty)} in cart
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono font-bold text-brand-400 mt-0.5">
                        ₹{formatCurrencyExact(variant.price)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Unit-Compatible & Variant-Isolated Price Summary */}
          {stats && stats.compatiblePoints.length > 0 && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">
                  Price History ({displayUnit})
                </p>
                <div className="flex items-center gap-1 text-xs font-mono font-bold">
                  {stats.deltaFromAvg < -0.5 ? (
                    <span className="text-brand-400 flex items-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5" />
                      {stats.deltaPctFromAvg}% vs avg
                    </span>
                  ) : stats.deltaFromAvg > 0.5 ? (
                    <span className="text-red-400 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      +{stats.deltaPctFromAvg}% vs avg
                    </span>
                  ) : (
                    <span className="text-zinc-400 flex items-center gap-1">
                      <FlatIcon className="w-3.5 h-3.5" />
                      At average
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-ink-900/70 rounded-lg p-2">
                  <p className="text-[9px] font-bold uppercase text-zinc-500">Average</p>
                  <p className="text-xs font-extrabold font-mono text-zinc-200 mt-0.5">
                    ₹{formatCurrencyExact(stats.average)}
                  </p>
                </div>
                <div className="bg-ink-900/70 rounded-lg p-2">
                  <p className="text-[9px] font-bold uppercase text-zinc-500">Lowest</p>
                  <p className="text-xs font-extrabold font-mono text-brand-400 mt-0.5">
                    ₹{formatCurrencyExact(stats.min)}
                  </p>
                </div>
                <div className="bg-ink-900/70 rounded-lg p-2">
                  <p className="text-[9px] font-bold uppercase text-zinc-500">Highest</p>
                  <p className="text-xs font-extrabold font-mono text-orange-400 mt-0.5">
                    ₹{formatCurrencyExact(stats.max)}
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-zinc-500">
                {stats.userPurchaseCount} user purchase{stats.userPurchaseCount === 1 ? '' : 's'} ·{' '}
                {stats.referenceCount} reference price{stats.referenceCount === 1 ? '' : 's'}
                {stats.excludedIncompatibleCount > 0 &&
                  ` · ${stats.excludedIncompatibleCount} incompatible unit skipped`}
              </p>
            </div>
          )}

          {/* Recurring Schedule */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-xs font-extrabold text-zinc-200">
                  Recurring Schedule
                </span>
              </div>
              {liveItem.recurrence?.nextDueDate && (
                <span className="text-[10px] font-mono text-sky-300">
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
                    className={`py-1.5 rounded-lg text-[11px] font-bold capitalize border transition-all ${
                      active
                        ? 'bg-sky-500/20 border-sky-400/40 text-sky-300'
                        : 'bg-ink-900/70 border-white/[0.06] text-zinc-400 hover:text-white'
                    }`}
                  >
                    {freq === 'none' ? 'Off' : freq}
                  </button>
                );
              })}
            </div>
            {liveItem.recurrence?.frequency === 'custom' && (
              <div className="flex items-center gap-2 pt-1">
                <label className="text-xs text-zinc-400">Repeat every</label>
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
                  className="w-16 bg-ink-900 border border-white/[0.08] rounded-lg px-2 py-1 text-xs font-mono text-white text-center"
                />
                <span className="text-xs text-zinc-400">days</span>
              </div>
            )}
          </div>

          {/* Manage Buttons */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEditProduct(liveItem);
              }}
              className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold text-zinc-200 flex items-center gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Product
            </button>

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-bold text-red-400 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-2 rounded-xl bg-red-500 text-xs font-extrabold text-white flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  Confirm Remove
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-2 rounded-xl bg-white/[0.06] text-xs font-bold text-zinc-400"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          {confirmDelete && (
            <p className="text-[10px] text-zinc-400">
              Removing from your personal catalogue preserves all past financial transactions & audit logs.
            </p>
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className="p-4 border-t border-white/[0.08] bg-ink-950/60 flex items-center gap-3">
          {activeCartQty > 0 ? (
            <div className="flex items-center justify-between w-full gap-3">
              <div className="flex items-center gap-2 bg-ink-900 rounded-xl p-1 border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => updateQuantity(liveItem.id, -defaultStep, activeVariant?.id)}
                  aria-label="Decrease quantity"
                  className="w-9 h-9 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white"
                >
                  <Minus className="w-4 h-4" strokeWidth={3} />
                </button>
                <span className="min-w-[2.25rem] px-1 text-center font-mono font-extrabold text-white">
                  {formatQuantity(activeCartQty)}
                </span>
                <button
                  type="button"
                  onClick={() => updateQuantity(liveItem.id, defaultStep, activeVariant?.id)}
                  aria-label="Increase quantity"
                  className="w-9 h-9 rounded-lg bg-brand-500 text-ink-950 flex items-center justify-center"
                >
                  <Plus className="w-4 h-4" strokeWidth={3} />
                </button>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-brand-500 hover:bg-brand-400 text-ink-950 py-3 rounded-xl text-sm font-extrabold"
              >
                Done · ₹{formatCurrencyExact(displayPrice * activeCartQty)} in Cart
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 bg-ink-900 rounded-xl p-1 border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() =>
                    setQtyToAdd((q) => Math.max(defaultStep, roundQuantity(q - defaultStep)))
                  }
                  aria-label="Decrease add quantity"
                  className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center text-white"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="min-w-[2rem] px-1 text-center font-mono font-extrabold text-sm text-white">
                  {formatQuantity(qtyToAdd)}
                </span>
                <button
                  type="button"
                  onClick={() => setQtyToAdd((q) => roundQuantity(q + defaultStep))}
                  aria-label="Increase add quantity"
                  className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center text-white"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={handleAddClick}
                className="flex-1 bg-brand-500 hover:bg-brand-400 text-ink-950 py-3 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" strokeWidth={2.5} />
                Add{activeVariant ? ` (${activeVariant.label})` : ''} · ₹{formatCurrencyExact(displayPrice * qtyToAdd)}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
