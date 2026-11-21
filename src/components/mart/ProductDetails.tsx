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
        className="fixed inset-0 bg-[#151922]/40 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] flex flex-col bg-white border border-[#E7EAF0] rounded-t-3xl sm:rounded-2xl shadow-modal animate-slide-up overflow-hidden">
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
            className="absolute top-6 right-6 w-9 h-9 rounded-xl bg-white/95 border border-[#E7EAF0] shadow-card flex items-center justify-center text-[#697386] hover:text-[#151922]"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => toggleFavourite(liveItem.id)}
            aria-label={liveItem.isFavourite ? 'Remove from favourites' : 'Add to favourites'}
            className={`absolute top-6 left-6 w-9 h-9 rounded-xl border shadow-card flex items-center justify-center ${
              liveItem.isFavourite
                ? 'bg-[#FDECEC] border-[#F6B8B8] text-[#DE5252]'
                : 'bg-white/95 border-[#E7EAF0] text-[#697386] hover:text-[#DE5252]'
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
              <div className="flex items-center gap-1.5 flex-wrap text-xs text-[#697386]">
                {liveItem.brand && (
                  <>
                    <span className="font-semibold text-[#151922]">{liveItem.brand}</span>
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
              <h3 className="text-xl font-bold text-[#151922] mt-1.5">
                {liveItem.name}
              </h3>
              {liveItem.description && (
                <p className="text-xs text-[#697386] mt-1 leading-relaxed">
                  {liveItem.description}
                </p>
              )}
              {liveItem.tags && liveItem.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mt-2 text-[11px] text-[#697386]">
                  <Tag className="w-3 h-3 text-[#929BAB]" />
                  {liveItem.tags.map((tag, i) => (
                    <span key={tag}>
                      {i > 0 && <span className="mr-1.5 text-[#D5DBE5]" aria-hidden="true">·</span>}
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-bold font-mono text-[#365FE8] tabular-nums">
                ₹{formatCurrencyExact(displayPrice)}
              </p>
              <p className="text-xs text-[#697386] font-mono">
                per {displayUnit}
              </p>
            </div>
          </div>

          {/* Interactive Pack Size / Variant Picker */}
          {liveItem.variants && liveItem.variants.length > 0 && (
            <div className="bg-[#F7F8FA] border border-[#E7EAF0] rounded-xl p-3.5 space-y-2.5">
              <p className="text-xs font-semibold text-[#697386]">
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
                          ? 'bg-[#EDF2FF] border-[#365FE8] text-[#151922]'
                          : 'bg-white border-[#E7EAF0] text-[#4B5565] hover:border-[#D5DBE5]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold">{variant.label}</span>
                        {varQty > 0 && (
                          <span className="text-[11px] font-mono font-semibold text-[#365FE8]">
                            {formatQuantity(varQty)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono font-semibold text-[#365FE8] mt-0.5 tabular-nums">
                        ₹{formatCurrencyExact(variant.price)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Unit-Compatible Price Summary */}
          {stats && stats.compatiblePoints.length > 0 && (
            <div className="bg-[#F7F8FA] border border-[#E7EAF0] rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[#697386]">
                  Price History ({displayUnit})
                </p>
                <div className="flex items-center gap-1 text-xs font-mono font-semibold tabular-nums">
                  {stats.deltaFromAvg < -0.5 ? (
                    <span className="text-[#15966B] flex items-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5" />
                      {stats.deltaPctFromAvg}% vs avg
                    </span>
                  ) : stats.deltaFromAvg > 0.5 ? (
                    <span className="text-[#DE5252] flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      +{stats.deltaPctFromAvg}% vs avg
                    </span>
                  ) : (
                    <span className="text-[#697386] flex items-center gap-1">
                      <FlatIcon className="w-3.5 h-3.5" />
                      At average
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white border border-[#E7EAF0] rounded-lg p-2">
                  <p className="text-[11px] font-medium text-[#697386]">Average</p>
                  <p className="text-xs font-bold font-mono text-[#151922] mt-0.5 tabular-nums">
                    ₹{formatCurrencyExact(stats.average)}
                  </p>
                </div>
                <div className="bg-white border border-[#E7EAF0] rounded-lg p-2">
                  <p className="text-[11px] font-medium text-[#697386]">Lowest</p>
                  <p className="text-xs font-bold font-mono text-[#15966B] mt-0.5 tabular-nums">
                    ₹{formatCurrencyExact(stats.min)}
                  </p>
                </div>
                <div className="bg-white border border-[#E7EAF0] rounded-lg p-2">
                  <p className="text-[11px] font-medium text-[#697386]">Highest</p>
                  <p className="text-xs font-bold font-mono text-[#C7851F] mt-0.5 tabular-nums">
                    ₹{formatCurrencyExact(stats.max)}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-[#697386]">
                {stats.userPurchaseCount} user purchase{stats.userPurchaseCount === 1 ? '' : 's'} ·{' '}
                {stats.referenceCount} reference price{stats.referenceCount === 1 ? '' : 's'}
                {stats.excludedIncompatibleCount > 0 &&
                  ` · ${stats.excludedIncompatibleCount} incompatible unit skipped`}
              </p>
            </div>
          )}

          {/* Recurring Schedule */}
          <div className="bg-[#F7F8FA] border border-[#E7EAF0] rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-[#365FE8]" />
                <span className="text-xs font-bold text-[#151922]">
                  Recurring Schedule
                </span>
                {liveItem.recurrence?.source === 'auto' && (
                  <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md bg-[#E8F7F1] border border-[#B7E4D3] text-[#15966B]">
                    Auto-detected
                  </span>
                )}
              </div>
              {liveItem.recurrence?.nextDueDate && (
                <span className="text-[11px] font-mono text-[#365FE8]">
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
                        ? 'bg-[#EDF2FF] border-[#365FE8]/45 text-[#365FE8]'
                        : 'bg-white border-[#E7EAF0] text-[#697386] hover:text-[#151922]'
                    }`}
                  >
                    {freq === 'none' ? 'Off' : freq}
                  </button>
                );
              })}
            </div>
            {liveItem.recurrence?.frequency === 'custom' && (
              <div className="flex items-center gap-2 pt-1">
                <label className="text-xs text-[#697386]">Repeat every</label>
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
                  className="w-16 bg-white border border-[#E7EAF0] rounded-lg px-2 py-1 text-xs font-mono text-[#151922] text-center"
                />
                <span className="text-xs text-[#697386]">days</span>
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
              className="btn-secondary text-xs"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Product
            </button>

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="px-3.5 py-2 rounded-xl bg-[#FDECEC] hover:bg-[#F9DADA] border border-[#F6B8B8] text-xs font-semibold text-[#DE5252] flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-2 rounded-xl bg-[#DE5252] text-xs font-semibold text-white flex items-center gap-1"
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
            <p className="text-xs text-[#697386]">
              Removing from your personal catalogue preserves all past financial transactions &amp; audit logs.
            </p>
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className="p-4 border-t border-[#E7EAF0] bg-[#F7F8FA] flex items-center gap-3">
          {activeCartQty > 0 ? (
            <div className="flex items-center justify-between w-full gap-3">
              <div className="flex items-center gap-1.5 bg-white rounded-xl p-1 border border-[#E7EAF0]">
                <button
                  type="button"
                  onClick={() => updateQuantity(liveItem.id, -defaultStep, activeVariant?.id)}
                  aria-label="Decrease quantity"
                  className="w-9 h-9 rounded-lg bg-[#F7F8FA] hover:bg-[#F1F3F6] flex items-center justify-center text-[#151922]"
                >
                  <Minus className="w-4 h-4" strokeWidth={2.5} />
                </button>
                <span className="min-w-[2.25rem] px-1 text-center font-mono font-bold text-[#151922] tabular-nums">
                  {formatQuantity(activeCartQty)}
                </span>
                <button
                  type="button"
                  onClick={() => updateQuantity(liveItem.id, defaultStep, activeVariant?.id)}
                  aria-label="Increase quantity"
                  className="w-9 h-9 rounded-lg bg-[#365FE8] text-white flex items-center justify-center"
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
              <div className="flex items-center gap-1.5 bg-white rounded-xl p-1 border border-[#E7EAF0]">
                <button
                  type="button"
                  onClick={() =>
                    setQtyToAdd((q) => Math.max(defaultStep, roundQuantity(q - defaultStep)))
                  }
                  aria-label="Decrease add quantity"
                  className="w-9 h-9 rounded-lg bg-[#F7F8FA] hover:bg-[#F1F3F6] flex items-center justify-center text-[#151922]"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="min-w-[2rem] px-1 text-center font-mono font-bold text-sm text-[#151922] tabular-nums">
                  {formatQuantity(qtyToAdd)}
                </span>
                <button
                  type="button"
                  onClick={() => setQtyToAdd((q) => roundQuantity(q + defaultStep))}
                  aria-label="Increase add quantity"
                  className="w-9 h-9 rounded-lg bg-[#F7F8FA] hover:bg-[#F1F3F6] flex items-center justify-center text-[#151922]"
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
