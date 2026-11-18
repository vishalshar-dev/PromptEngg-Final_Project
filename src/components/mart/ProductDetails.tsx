import { useState, useMemo } from 'react';
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
} from 'lucide-react';
import {
  useAppStore,
  type CartItem,
  type RecurrenceFrequency,
} from '../../store/useStore';
import { formatCurrencyExact, getCategoryStyle } from '../../utils/categoryStyles';
import { computeUnitPriceStats, toLocalDateKey } from '../../utils/martEngine';
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
  const toggleFavourite = useAppStore((s) => s.toggleFavourite);
  const setProductRecurrence = useAppStore((s) => s.setProductRecurrence);
  const removeProduct = useAppStore((s) => s.removeProduct);

  const [qtyToAdd, setQtyToAdd] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const liveItem = useAppStore((s) =>
    item ? s.items.find((i) => i.id === item.id) ?? item : null
  );

  const stats = useMemo(() => {
    if (!liveItem) return null;
    return computeUnitPriceStats(priceHistory[liveItem.id] ?? [], liveItem.unit);
  }, [liveItem, priceHistory]);

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
    addToCart(liveItem, qtyToAdd);
    setQtyToAdd(1);
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
            aria-label="Toggle favourite"
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
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${style.bg} ${style.text} border ${style.border}`}
                >
                  {liveItem.category}
                </span>
                <span className="text-[11px] font-mono font-bold text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06]">
                  {liveItem.unit || '1 unit'}
                </span>
                {liveItem.productType && (
                  <span className="text-[11px] font-medium text-zinc-500">
                    · {liveItem.productType}
                  </span>
                )}
              </div>
              <h3 className="text-xl font-extrabold text-white mt-2">
                {liveItem.name}
              </h3>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold font-mono text-brand-400 tabular-nums">
                ₹{formatCurrencyExact(liveItem.price)}
              </p>
              <p className="text-[10px] text-zinc-500 font-mono">
                per {liveItem.unit || 'unit'}
              </p>
            </div>
          </div>

          {/* Unit-Compatible Price Summary */}
          {stats && stats.compatiblePoints.length > 0 && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">
                  Price History ({liveItem.unit || '1 unit'})
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
                  Confirm Delete
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
        </div>

        {/* Bottom Action Bar */}
        <div className="p-4 border-t border-white/[0.08] bg-ink-950/60 flex items-center gap-3">
          {liveItem.quantity > 0 ? (
            <div className="flex items-center justify-between w-full gap-3">
              <div className="flex items-center gap-2 bg-ink-900 rounded-xl p-1 border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => updateQuantity(liveItem.id, -1)}
                  className="w-9 h-9 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white"
                >
                  <Minus className="w-4 h-4" strokeWidth={3} />
                </button>
                <span className="w-8 text-center font-mono font-extrabold text-white">
                  {liveItem.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => updateQuantity(liveItem.id, 1)}
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
                Done · ₹{formatCurrencyExact(liveItem.price * liveItem.quantity)} in Cart
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 bg-ink-900 rounded-xl p-1 border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setQtyToAdd((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center text-white"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-7 text-center font-mono font-extrabold text-sm text-white">
                  {qtyToAdd}
                </span>
                <button
                  type="button"
                  onClick={() => setQtyToAdd((q) => q + 1)}
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
                Add to Cart · ₹{formatCurrencyExact(liveItem.price * qtyToAdd)}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
