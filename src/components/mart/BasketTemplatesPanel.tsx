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
import { EmptyState } from '../ui/EmptyState';

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
  const [loadToast, setLoadToast] = useState<string | null>(null);

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
    const basket = basketTemplates.find((b) => b.id === basketId);
    const count = loadBasketTemplateToCart(basketId, mode);
    if (count > 0) {
      setLoadedFlashId(`${basketId}:${mode}`);
      setLoadToast(
        mode === 'replace'
          ? `Replaced cart with “${basket?.name ?? 'Basket'}” (${count} items)`
          : `Added “${basket?.name ?? 'Basket'}” (${count} items) to cart`
      );
      setTimeout(() => setLoadedFlashId(null), 1800);
      setTimeout(() => setLoadToast(null), 3000);
      onLoadedToCart?.();
    }
  };

  return (
    <div className="space-y-4">
      {loadToast && (
        <div
          role="status"
          className="rounded-xl bg-[#E8F7F1] border border-[#B7E4D3] px-3.5 py-2.5 flex items-center gap-2 text-xs font-semibold text-[#15966B] animate-fade-in"
        >
          <Check className="w-4 h-4 shrink-0" strokeWidth={2.5} />
          <span>{loadToast}</span>
        </div>
      )}
      {/* Save Current Cart Card */}
      <form
        onSubmit={handleSaveCurrentCart}
        className="bg-white rounded-2xl p-5 border border-[#E7EAF0] shadow-card space-y-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#151922] flex items-center gap-2">
              <BookmarkPlus className="w-4 h-4 text-[#365FE8]" />
              Save Current Cart as Basket
            </h3>
            <p className="text-xs text-[#697386] mt-0.5">
              {cartSummary.lineCount > 0
                ? `${cartSummary.lineCount} ${cartSummary.lineCount === 1 ? 'line' : 'lines'} · ${formatQuantity(cartSummary.totalUnits)} qty · ₹${formatCurrencyExact(cartSummary.totalAmount)} ready to save`
                : 'Add items to your cart first to save them as a reusable shopping basket.'}
            </p>
          </div>
          {saveSuccessFlash && (
            <span className="text-xs font-semibold text-[#15966B] flex items-center gap-1 whitespace-nowrap">
              <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
              Saved “{saveSuccessFlash}”
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
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
              className="input-field w-full py-2 text-xs"
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
              className="input-field w-full py-2 text-xs"
            />
          </div>
          <button
            type="submit"
            disabled={cartSummary.lineCount === 0}
            className={`sm:w-auto w-full shrink-0 py-2 px-4 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              cartSummary.lineCount > 0
                ? 'bg-[#365FE8] hover:bg-[#294FCC] text-white'
                : 'bg-[#F1F3F6] text-[#929BAB] cursor-not-allowed'
            }`}
          >
            Save Basket
          </button>
        </div>

        {saveError && (
          <p role="alert" className="text-xs font-medium text-[#C7851F]">
            {saveError}
          </p>
        )}
      </form>

      {/* Saved Baskets List */}
      {evaluatedBaskets.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No saved baskets yet"
          description="Build a cart or open any order in History to save a reusable shopping basket with live price tracking."
        />
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
                className="bg-white rounded-2xl p-5 border border-[#E7EAF0] shadow-card space-y-3.5"
              >
                {isEditing ? (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        aria-label={`Edit name for ${basket.name}`}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="input-field w-full py-2 text-xs font-semibold"
                      />
                      <input
                        type="text"
                        aria-label={`Edit note for ${basket.name}`}
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="Optional note"
                        className="input-field w-full py-2 text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          renameBasketTemplate(basket.id, editName, editDesc);
                          setEditingBasketId(null);
                        }}
                        className="btn-primary py-1.5 px-3 text-xs"
                      >
                        Save Changes
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingBasketId(null)}
                        className="btn-secondary py-1.5 px-3 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-[#151922] truncate">
                          {basket.name}
                        </h4>
                        {basket.isPreset && (
                          <span className="text-xs font-medium text-[#697386]">
                            · Starter preset
                          </span>
                        )}
                      </div>
                      {basket.description && (
                        <p className="text-xs text-[#697386] mt-0.5">{basket.description}</p>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-[#697386] font-mono tabular-nums mt-1 flex-wrap">
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
                      <p className="text-base font-bold font-mono text-[#151922] tabular-nums">
                        ₹{formatCurrencyExact(currentTotal)}
                      </p>
                      {hasPriceShift ? (
                        <p
                          className={`text-xs font-mono font-semibold flex items-center justify-end gap-1 tabular-nums ${
                            priceDiff > 0 ? 'text-[#C7851F]' : 'text-[#15966B]'
                          }`}
                        >
                          {priceDiff > 0 ? (
                            <TrendingUp className="w-3.5 h-3.5" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5" />
                          )}
                          {priceDiff > 0
                            ? `+₹${formatCurrencyExact(priceDiff)} vs saved`
                            : `-₹${formatCurrencyExact(Math.abs(priceDiff))} cheaper`}
                        </p>
                      ) : (
                        <p className="text-[11px] font-mono text-[#929BAB] tabular-nums">
                          Saved ₹{formatCurrencyExact(savedTotal)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Row */}
                <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleLoadBasket(basket.id, 'merge')}
                      aria-label={`Add ${basket.name} to cart`}
                      disabled={lineCount === 0}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                        loadedFlashId === `${basket.id}:merge`
                          ? 'bg-[#15966B] text-white'
                          : lineCount > 0
                          ? 'bg-[#EDF2FF] hover:bg-[#365FE8] text-[#365FE8] hover:text-white border border-[#365FE8]/25'
                          : 'bg-[#F1F3F6] text-[#929BAB] cursor-not-allowed'
                      }`}
                    >
                      {loadedFlashId === `${basket.id}:merge` ? (
                        <>
                          <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                          Added
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-3.5 h-3.5" strokeWidth={2.2} />
                          Add to Cart
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLoadBasket(basket.id, 'replace')}
                      aria-label={`Replace cart with ${basket.name}`}
                      disabled={lineCount === 0}
                      className="btn-secondary py-1.5 px-3 text-xs"
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
                      className="btn-secondary py-1.5 px-3 text-xs"
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
                        className="px-2.5 py-1.5 rounded-lg bg-[#FEF6E7] hover:bg-[#FDEBC7] border border-[#F3D8A8] text-[#9E6614] text-xs font-semibold flex items-center gap-1 whitespace-nowrap"
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
                        className="px-2.5 py-1.5 rounded-lg bg-[#F7F8FA] hover:bg-[#EDF2FF] border border-[#E7EAF0] text-[#4B5565] hover:text-[#365FE8] text-xs font-semibold whitespace-nowrap"
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
                        className="p-1.5 rounded-lg bg-[#F7F8FA] hover:bg-[#F1F3F6] border border-[#E7EAF0] text-[#697386] hover:text-[#151922]"
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
                          className="px-2.5 py-1 rounded-lg bg-[#DE5252] text-white text-xs font-semibold whitespace-nowrap"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2.5 py-1 rounded-lg bg-[#F1F3F6] text-[#4B5565] text-xs font-semibold"
                        >
                          Keep
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(basket.id)}
                        aria-label={`Delete ${basket.name}`}
                        className="p-1.5 rounded-lg bg-[#F7F8FA] hover:bg-[#FDECEC] border border-[#E7EAF0] text-[#697386] hover:text-[#DE5252]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Line Breakdown */}
                {isExpanded && (
                  <div className="bg-[#F7F8FA] rounded-xl p-3 space-y-2 border border-[#E7EAF0]">
                    {lines.length === 0 ? (
                      <p className="text-xs text-[#697386] text-center py-2">
                        All items were removed from this basket.
                      </p>
                    ) : (
                      lines.map((line, idx) => (
                        <div
                          key={`${basket.id}-${line.templateItem.itemId}-${line.templateItem.variantId ?? idx}`}
                          className="flex items-center justify-between gap-2 text-xs py-1"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-[#151922] font-semibold truncate">
                              {line.templateItem.name}
                              {line.templateItem.variantLabel
                                ? ` · ${line.templateItem.variantLabel}`
                                : ''}
                            </p>
                            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#697386] tabular-nums">
                              <span>
                                {formatQuantity(line.templateItem.quantity)} × ₹
                                {formatCurrencyExact(line.currentPrice)}
                              </span>
                              {Math.abs(line.unitPriceDiff) >= 0.5 && (
                                <span
                                  className={
                                    line.unitPriceDiff > 0 ? 'text-[#C7851F]' : 'text-[#15966B]'
                                  }
                                >
                                  · was ₹{formatCurrencyExact(line.savedPrice)}
                                </span>
                              )}
                              {line.isMissingFromCatalog && (
                                <span className="text-[#929BAB]">· custom/restorable</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="font-mono font-bold text-[#151922] tabular-nums">
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
                              className="text-[#929BAB] hover:text-[#DE5252] p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
