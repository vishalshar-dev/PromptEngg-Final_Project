import { useState, useMemo } from 'react';
import {
  BookmarkPlus,
  Check,
  ChevronDown,
  ChevronUp,
  Pencil,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { formatCurrencyExact, formatQuantity } from '../../utils/categoryStyles';
import { calculateCartTotals, evaluateBasketTemplate } from '../../utils/martEngine';

interface BasketTemplatesPanelProps {
  onLoadedToCart?: () => void;
}

export function BasketTemplatesPanel({ onLoadedToCart }: BasketTemplatesPanelProps) {
  const items = useAppStore((s) => s.items);
  const basketTemplates = useAppStore((s) => s.basketTemplates);
  const saveCartAsBasket = useAppStore((s) => s.saveCartAsBasket);
  const loadBasketTemplateToCart = useAppStore((s) => s.loadBasketTemplateToCart);
  const updateBasketFromCart = useAppStore((s) => s.updateBasketFromCart);
  const refreshBasketBaselinePrices = useAppStore((s) => s.refreshBasketBaselinePrices);
  const renameBasketTemplate = useAppStore((s) => s.renameBasketTemplate);
  const removeBasketTemplateItem = useAppStore((s) => s.removeBasketTemplateItem);
  const deleteBasketTemplate = useAppStore((s) => s.deleteBasketTemplate);

  const cartSummary = useMemo(() => calculateCartTotals(items), [items]);

  const evaluatedBaskets = useMemo(
    () => basketTemplates.map((basket) => evaluateBasketTemplate(basket, items)),
    [basketTemplates, items]
  );

  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccessFlash, setSaveSuccessFlash] = useState<string | null>(null);

  const [expandedBasketId, setExpandedBasketId] = useState<string | null>(
    basketTemplates[0]?.id ?? null
  );
  const [editingBasketId, setEditingBasketId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [loadedFlashId, setLoadedFlashId] = useState<string | null>(null);

  const handleSaveCurrentCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (cartSummary.lineCount === 0) {
      setSaveError('Add at least one item to your cart before saving a basket.');
      return;
    }
    const trimmed = newName.trim();
    if (!trimmed) {
      setSaveError('Enter a basket name (e.g. Weekly Groceries).');
      return;
    }

    const created = saveCartAsBasket(trimmed, newDesc);
    if (created) {
      setNewName('');
      setNewDesc('');
      setSaveError(null);
      setExpandedBasketId(created.id);
      setSaveSuccessFlash(created.name);
      setTimeout(() => setSaveSuccessFlash(null), 2400);
    }
  };

  const handleLoadBasket = (basketId: string, mode: 'merge' | 'replace') => {
    const count = loadBasketTemplateToCart(basketId, mode);
    if (count > 0) {
      setLoadedFlashId(`${basketId}:${mode}`);
      setTimeout(() => setLoadedFlashId(null), 1800);
      onLoadedToCart?.();
    }
  };

  return (
    <div className="space-y-4">
      {/* Save Current Cart Card */}
      <form
        onSubmit={handleSaveCurrentCart}
        className="glass rounded-2xl p-4 border border-white/[0.08] space-y-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
              <BookmarkPlus className="w-4 h-4 text-brand-400" />
              Save Current Cart as Basket
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {cartSummary.lineCount > 0
                ? `${cartSummary.lineCount} ${cartSummary.lineCount === 1 ? 'line' : 'lines'} · ${formatQuantity(cartSummary.totalUnits)} qty · ₹${formatCurrencyExact(cartSummary.totalAmount)} ready to save`
                : 'Add items to your cart first to save them as a reusable shopping basket.'}
            </p>
          </div>
          {saveSuccessFlash && (
            <span className="text-[11px] font-bold text-brand-400 flex items-center gap-1 whitespace-nowrap">
              <Check className="w-3.5 h-3.5" strokeWidth={3} />
              Saved “{saveSuccessFlash}”
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex-1 min-w-0">
            <label htmlFor="new-basket-name" className="sr-only">
              Basket name
            </label>
            <input
              id="new-basket-name"
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                if (saveError) setSaveError(null);
              }}
              placeholder="Basket name (e.g. Hostel Refill)"
              className="w-full px-3 py-2 rounded-xl bg-ink-900/80 border border-white/[0.08] focus:border-brand-500/50 focus:outline-none text-xs text-white placeholder:text-zinc-500"
            />
          </div>
          <div className="flex-1 min-w-0">
            <label htmlFor="new-basket-desc" className="sr-only">
              Basket note or description
            </label>
            <input
              id="new-basket-desc"
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Optional note (e.g. Sunday run)"
              className="w-full px-3 py-2 rounded-xl bg-ink-900/80 border border-white/[0.08] focus:border-brand-500/50 focus:outline-none text-xs text-white placeholder:text-zinc-500"
            />
          </div>
          <button
            type="submit"
            disabled={cartSummary.lineCount === 0}
            className={`sm:w-auto w-full shrink-0 py-2 px-4 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
              cartSummary.lineCount > 0
                ? 'bg-brand-500 hover:bg-brand-400 text-ink-950'
                : 'bg-white/[0.05] text-zinc-500 cursor-not-allowed'
            }`}
          >
            Save Basket
          </button>
        </div>

        {saveError && (
          <p role="alert" className="text-[11px] font-semibold text-amber-300">
            {saveError}
          </p>
        )}
      </form>

      {/* Saved Baskets List */}
      {evaluatedBaskets.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center space-y-2 border border-white/[0.06]">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-zinc-500">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-zinc-200">No saved baskets yet</p>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">
            Build a cart or open any order in History to save a reusable basket template with live price tracking.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {evaluatedBaskets.map((evaluated) => {
            const { basket, lines, savedTotal, currentTotal, priceDiff, totalUnits, lineCount } =
              evaluated;
            const isExpanded = expandedBasketId === basket.id;
            const isEditing = editingBasketId === basket.id;
            const isDeleting = confirmDeleteId === basket.id;
            const hasPriceShift = Math.abs(priceDiff) >= 0.5;
            const updatedLabel = new Date(basket.updatedAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
            });

            return (
              <div
                key={basket.id}
                className="glass rounded-2xl p-4 border border-white/[0.08] space-y-3"
              >
                {/* Header */}
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        aria-label={`Edit name for ${basket.name}`}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="px-3 py-1.5 rounded-xl bg-ink-900 border border-white/[0.12] text-xs font-bold text-white focus:outline-none focus:border-brand-500/50"
                      />
                      <input
                        type="text"
                        aria-label={`Edit note for ${basket.name}`}
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="Optional note"
                        className="px-3 py-1.5 rounded-xl bg-ink-900 border border-white/[0.12] text-xs text-zinc-200 focus:outline-none focus:border-brand-500/50"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          renameBasketTemplate(basket.id, editName, editDesc);
                          setEditingBasketId(null);
                        }}
                        className="px-3 py-1 rounded-lg bg-brand-500 text-ink-950 text-[11px] font-extrabold"
                      >
                        Save Changes
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingBasketId(null)}
                        className="px-3 py-1 rounded-lg bg-white/[0.06] text-zinc-300 text-[11px] font-bold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-extrabold text-white truncate">
                          {basket.name}
                        </h4>
                        {basket.isPreset && (
                          <span className="text-[10px] font-semibold text-zinc-400">
                            · Starter preset
                          </span>
                        )}
                      </div>
                      {basket.description && (
                        <p className="text-[11px] text-zinc-400 mt-0.5">{basket.description}</p>
                      )}
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono tabular-nums mt-1 flex-wrap">
                        <span>
                          {lineCount} {lineCount === 1 ? 'item' : 'items'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{formatQuantity(totalUnits)} qty</span>
                        <span aria-hidden="true">·</span>
                        <span>Updated {updatedLabel}</span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-base font-extrabold font-mono text-white tabular-nums">
                        ₹{formatCurrencyExact(currentTotal)}
                      </p>
                      {hasPriceShift ? (
                        <p
                          className={`text-[11px] font-mono font-bold flex items-center justify-end gap-1 tabular-nums ${
                            priceDiff > 0 ? 'text-amber-300' : 'text-brand-400'
                          }`}
                        >
                          {priceDiff > 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {priceDiff > 0
                            ? `+₹${formatCurrencyExact(priceDiff)} vs saved`
                            : `-₹${formatCurrencyExact(Math.abs(priceDiff))} cheaper`}
                        </p>
                      ) : (
                        <p className="text-[10px] font-mono text-zinc-500 tabular-nums">
                          Saved ₹{formatCurrencyExact(savedTotal)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Row */}
                <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleLoadBasket(basket.id, 'merge')}
                      aria-label={`Add ${basket.name} to cart`}
                      disabled={lineCount === 0}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                        loadedFlashId === `${basket.id}:merge`
                          ? 'bg-brand-500 text-ink-950'
                          : lineCount > 0
                          ? 'bg-brand-500/15 hover:bg-brand-500 text-brand-300 hover:text-ink-950 border border-brand-500/35'
                          : 'bg-white/[0.04] text-zinc-600 cursor-not-allowed'
                      }`}
                    >
                      {loadedFlashId === `${basket.id}:merge` ? (
                        <>
                          <Check className="w-3.5 h-3.5" strokeWidth={3} />
                          Added
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-3.5 h-3.5" strokeWidth={2.5} />
                          Add to Cart
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLoadBasket(basket.id, 'replace')}
                      aria-label={`Replace cart with ${basket.name}`}
                      disabled={lineCount === 0}
                      className="px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-zinc-200 text-[11px] font-bold whitespace-nowrap transition-colors"
                    >
                      {loadedFlashId === `${basket.id}:replace` ? 'Cart Replaced' : 'Replace Cart'}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedBasketId((cur) => (cur === basket.id ? null : basket.id))
                      }
                      aria-expanded={isExpanded}
                      aria-label={`${isExpanded ? 'Hide' : 'Show'} items in ${basket.name}`}
                      className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] text-zinc-300 text-[11px] font-bold flex items-center gap-1 whitespace-nowrap"
                    >
                      <span>{isExpanded ? 'Hide Items' : 'View Items'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {hasPriceShift && (
                      <button
                        type="button"
                        onClick={() => refreshBasketBaselinePrices(basket.id)}
                        title="Update saved baseline prices to match current catalog prices"
                        className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-300 text-[10px] font-bold flex items-center gap-1 whitespace-nowrap"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Sync Price
                      </button>
                    )}

                    {cartSummary.lineCount > 0 && (
                      <button
                        type="button"
                        onClick={() => updateBasketFromCart(basket.id)}
                        aria-label={`Overwrite ${basket.name} with current cart`}
                        title="Overwrite basket items with current cart"
                        className="px-2 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 text-[10px] font-bold whitespace-nowrap"
                      >
                        Update from Cart
                      </button>
                    )}

                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBasketId(basket.id);
                          setEditName(basket.name);
                          setEditDesc(basket.description ?? '');
                        }}
                        aria-label={`Rename ${basket.name}`}
                        className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-zinc-400 hover:text-white"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {isDeleting ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            deleteBasketTemplate(basket.id);
                            setConfirmDeleteId(null);
                          }}
                          aria-label={`Confirm delete ${basket.name}`}
                          className="px-2 py-1 rounded-lg bg-red-500 text-white text-[10px] font-extrabold whitespace-nowrap"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 rounded-lg bg-white/[0.08] text-zinc-300 text-[10px] font-bold"
                        >
                          Keep
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(basket.id)}
                        aria-label={`Delete ${basket.name}`}
                        className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-red-500/20 text-zinc-400 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Line Breakdown */}
                {isExpanded && (
                  <div className="bg-ink-900/60 rounded-xl p-2.5 space-y-1.5 border border-white/[0.05]">
                    {lines.length === 0 ? (
                      <p className="text-[11px] text-zinc-500 text-center py-2">
                        All items were removed from this basket.
                      </p>
                    ) : (
                      lines.map((line, idx) => (
                        <div
                          key={`${basket.id}-${line.templateItem.itemId}-${line.templateItem.variantId ?? idx}`}
                          className="flex items-center justify-between gap-2 text-xs py-0.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-zinc-200 font-semibold truncate">
                              {line.templateItem.name}
                              {line.templateItem.variantLabel
                                ? ` · ${line.templateItem.variantLabel}`
                                : ''}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500 tabular-nums">
                              <span>
                                {formatQuantity(line.templateItem.quantity)} × ₹
                                {formatCurrencyExact(line.currentPrice)}
                              </span>
                              {Math.abs(line.unitPriceDiff) >= 0.5 && (
                                <span
                                  className={
                                    line.unitPriceDiff > 0 ? 'text-amber-300' : 'text-brand-400'
                                  }
                                >
                                  · was ₹{formatCurrencyExact(line.savedPrice)}
                                </span>
                              )}
                              {line.isMissingFromCatalog && (
                                <span className="text-zinc-400">· custom/restorable</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="font-mono font-bold text-zinc-200 tabular-nums">
                              ₹{formatCurrencyExact(line.currentSubtotal)}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                removeBasketTemplateItem(
                                  basket.id,
                                  line.templateItem.itemId,
                                  line.templateItem.variantId
                                )
                              }
                              aria-label={`Remove ${line.templateItem.name} from ${basket.name}`}
                              className="text-zinc-500 hover:text-red-400 p-1"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
