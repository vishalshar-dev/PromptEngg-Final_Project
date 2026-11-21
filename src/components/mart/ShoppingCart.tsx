import { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  Check,
  ChevronUp,
  Trash2,
  AlertOctagon,
  Users,
  ArrowRight,
  ArrowLeft,
  BookmarkPlus,
} from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { formatCurrencyExact, formatQuantity } from '../../utils/categoryStyles';
import { calculateCartTotals } from '../../utils/martEngine';
import { CartItemRow } from './CartItem';
import { CheckoutSummary } from './CheckoutSummary';

interface ShoppingCartProps {
  externalOpenRequest?: number;
}

export function ShoppingCart({ externalOpenRequest }: ShoppingCartProps) {
  const items = useAppStore((s) => s.items);
  const categoryConfigs = useAppStore((s) => s.categoryConfigs);
  const updateQuantity = useAppStore((s) => s.updateQuantity);
  const setItemQuantity = useAppStore((s) => s.setItemQuantity);
  const updateItemPrice = useAppStore((s) => s.updateItemPrice);
  const clearCart = useAppStore((s) => s.clearCart);
  const saveCartAsBasket = useAppStore((s) => s.saveCartAsBasket);
  const sessionBudget = useAppStore((s) => s.sessionBudget);

  const [expanded, setExpanded] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [saveBasketOpen, setSaveBasketOpen] = useState(false);
  const [basketNameInput, setBasketNameInput] = useState('');
  const [basketSavedBanner, setBasketSavedBanner] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutSplitDefault, setCheckoutSplitDefault] = useState(false);
  const [doneBanner, setDoneBanner] = useState(false);

  const { lines, totalAmount: totalPrice, totalUnits: totalCount, uniqueProducts } = useMemo(
    () => calculateCartTotals(items),
    [items]
  );

  const isOverSession = sessionBudget !== null && totalPrice > sessionBudget;
  const isWarningSession =
    sessionBudget !== null && totalPrice > sessionBudget * 0.8 && totalPrice <= sessionBudget;

  useEffect(() => {
    if (lines.length === 0) {
      setExpanded(false);
      setConfirmClear(false);
    }
  }, [lines.length]);

  useEffect(() => {
    if (externalOpenRequest && externalOpenRequest > 0) {
      setExpanded(true);
    }
  }, [externalOpenRequest]);

  const catMap = new Map(categoryConfigs.map((c) => [c.name, c]));
  const hasItems = lines.length > 0;

  const openCheckout = (withSplit: boolean) => {
    if (!hasItems) return;
    setExpanded(false);
    setConfirmClear(false);
    setCheckoutSplitDefault(withSplit);
    setCheckoutOpen(true);
  };

  return (
    <>
      {expanded && hasItems && (
        <div
          className="fixed inset-0 bg-[#151922]/40 backdrop-blur-[2px] z-40 animate-fade-in"
          onClick={() => {
            setExpanded(false);
            setConfirmClear(false);
          }}
        />
      )}

      {/* Compact Sticky Cart Bar (only visible when cart has items or right after checkout) */}
      {(hasItems || doneBanner) && (
        <div
          className={`fixed bottom-4 lg:bottom-5 left-1/2 lg:left-[calc(50%+126px)] -translate-x-1/2 w-full max-w-lg xl:max-w-xl px-3 lg:px-0 animate-slide-up ${
            expanded ? 'z-50' : 'z-40'
          }`}
        >
        <div
          className={`bg-white border rounded-2xl shadow-modal transition-all duration-200 ${
            isOverSession
              ? 'border-[#DE5252]'
              : isWarningSession
              ? 'border-[#E5A23B]'
              : 'border-[#E7EAF0]'
          }`}
        >
          <div className="px-4 py-3">
            <div className="flex items-center justify-between gap-2.5">
              {/* Left Cart Summary Button */}
              <button
                type="button"
                aria-label={hasItems ? 'Toggle cart items' : 'Cart is empty'}
                onClick={() => setExpanded((v) => (hasItems ? !v : v))}
                disabled={!hasItems}
                className="flex items-center gap-3 min-w-0 flex-1"
              >
                <div
                  className={`relative w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                    hasItems
                      ? 'bg-[#EDF2FF] border-[#365FE8]/25'
                      : 'bg-[#F7F8FA] border-[#E7EAF0]'
                  }`}
                >
                  <ShoppingBag
                    className={`w-4 h-4 ${hasItems ? 'text-[#365FE8]' : 'text-[#929BAB]'}`}
                    strokeWidth={2.2}
                  />
                  {hasItems && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[1.25rem] h-5 px-1 rounded-full bg-[#365FE8] text-white text-[10px] font-bold flex items-center justify-center shadow-xs tabular-nums">
                      {lines.length}
                    </span>
                  )}
                </div>

                <div className="text-left min-w-0">
                  <p className="text-xs text-[#697386] font-medium truncate">
                    {doneBanner
                      ? 'Recorded to Budget'
                      : hasItems
                      ? `${uniqueProducts} item${uniqueProducts > 1 ? 's' : ''} · ${formatQuantity(totalCount)} qty`
                      : 'Empty Cart'}
                  </p>
                  <p
                    className={`text-base font-bold font-mono tabular-nums leading-tight ${
                      doneBanner
                        ? 'text-[#15966B]'
                        : hasItems
                        ? 'text-[#151922]'
                        : 'text-[#929BAB]'
                    }`}
                  >
                    {doneBanner ? 'Purchase Saved' : `₹${formatCurrencyExact(totalPrice)}`}
                  </p>
                </div>

                {hasItems && (
                  <ChevronUp
                    className={`w-4 h-4 text-[#697386] transition-transform ${
                      expanded ? 'rotate-180' : ''
                    }`}
                    strokeWidth={2.2}
                  />
                )}
              </button>

              {/* Right CTA Buttons */}
              <div className="flex items-center gap-2">
                {hasItems && (
                  <button
                    type="button"
                    onClick={() => openCheckout(true)}
                    aria-label="Split and checkout cart"
                    className="btn-secondary px-3 py-2 text-xs"
                  >
                    <Users className="w-3.5 h-3.5 text-[#365FE8]" strokeWidth={2.2} />
                    Split
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openCheckout(false)}
                  disabled={!hasItems}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors ${
                    hasItems
                      ? 'bg-[#365FE8] hover:bg-[#294FCC] text-white'
                      : 'bg-[#F1F3F6] text-[#929BAB] cursor-not-allowed'
                  }`}
                >
                  <span>Checkout</span>
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>

          {/* Expanded Cart Panel */}
          {expanded && hasItems && (
            <div className="px-4 pb-4 max-h-[52vh] overflow-y-auto scrollbar-thin animate-slide-up">
              <div className="h-px bg-[#E7EAF0] mb-3" />

              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-xs font-semibold text-[#697386] tabular-nums">
                  Shopping Cart ({lines.length} {lines.length === 1 ? 'line' : 'lines'} ·{' '}
                  {formatQuantity(totalCount)} qty)
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSaveBasketOpen((v) => !v);
                      setConfirmClear(false);
                    }}
                    className="text-xs font-semibold text-[#365FE8] hover:underline flex items-center gap-1 whitespace-nowrap"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    Save Basket
                  </button>

                  {confirmClear ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-[#DE5252] font-semibold">Clear all?</span>
                      <button
                        type="button"
                        onClick={() => {
                          clearCart();
                          setConfirmClear(false);
                        }}
                        className="px-2 py-0.5 rounded-md bg-[#DE5252] text-white text-xs font-semibold"
                      >
                        Yes, Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClear(false)}
                        className="px-2 py-0.5 rounded-md bg-[#F1F3F6] text-[#4B5565] text-xs font-semibold"
                      >
                        Keep
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmClear(true);
                        setSaveBasketOpen(false);
                      }}
                      className="text-xs font-semibold text-[#697386] hover:text-[#DE5252] flex items-center gap-1 whitespace-nowrap"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear Cart
                    </button>
                  )}
                </div>
              </div>

              {saveBasketOpen && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const created = saveCartAsBasket(basketNameInput);
                    if (created) {
                      setBasketSavedBanner(created.name);
                      setBasketNameInput('');
                      setSaveBasketOpen(false);
                      setTimeout(() => setBasketSavedBanner(null), 2500);
                    }
                  }}
                  className="mb-3 rounded-xl bg-[#F7F8FA] border border-[#365FE8]/25 p-2.5 flex items-center gap-2"
                >
                  <input
                    type="text"
                    aria-label="Basket template name"
                    value={basketNameInput}
                    onChange={(e) => setBasketNameInput(e.target.value)}
                    placeholder="Name this basket (e.g. Weekend Essentials)"
                    className="input-field py-1.5 text-xs flex-1 min-w-0"
                  />
                  <button
                    type="submit"
                    disabled={!basketNameInput.trim()}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                      basketNameInput.trim()
                        ? 'bg-[#365FE8] hover:bg-[#294FCC] text-white'
                        : 'bg-[#E7EAF0] text-[#929BAB] cursor-not-allowed'
                    }`}
                  >
                    Save
                  </button>
                </form>
              )}

              {basketSavedBanner && (
                <div
                  role="status"
                  className="mb-3 rounded-xl bg-[#E8F7F1] border border-[#B7E4D3] px-3 py-2 flex items-center gap-2 text-xs font-semibold text-[#15966B]"
                >
                  <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                  <span>Saved basket “{basketSavedBanner}”</span>
                </div>
              )}

              <div className="space-y-2">
                {lines.map((line) => (
                  <CartItemRow
                    key={line.lineKey}
                    line={line}
                    categoryConfig={catMap.get(line.item.category)}
                    onUpdateQuantity={updateQuantity}
                    onSetQuantity={setItemQuantity}
                    onUpdatePrice={updateItemPrice}
                    onRemove={(id, variantId) => setItemQuantity(id, 0, variantId)}
                  />
                ))}
              </div>

              {sessionBudget !== null && (
                <div
                  className={`mt-3 rounded-xl p-2.5 flex items-center gap-2 border ${
                    isOverSession
                      ? 'bg-[#FDECEC] border-[#F6B8B8] text-[#DE5252]'
                      : isWarningSession
                      ? 'bg-[#FEF6E7] border-[#F3D8A8] text-[#9E6614]'
                      : 'bg-[#E8F7F1] border-[#B7E4D3] text-[#15966B]'
                  }`}
                >
                  {isOverSession ? (
                    <AlertOctagon className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <Check className="w-4 h-4 flex-shrink-0" />
                  )}
                  <p className="text-xs font-semibold">
                    {isOverSession
                      ? `Over session limit by ₹${formatCurrencyExact(totalPrice - sessionBudget)}`
                      : isWarningSession
                      ? `₹${formatCurrencyExact(sessionBudget - totalPrice)} left in session budget`
                      : `Within session budget (₹${formatCurrencyExact(sessionBudget - totalPrice)} left)`}
                  </p>
                </div>
              )}

              <div className="mt-3 pt-2.5 border-t border-[#E7EAF0] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="text-xs font-semibold text-[#697386] hover:text-[#151922] flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Continue Shopping
                </button>
                <span className="text-xs font-mono text-[#697386] tabular-nums">
                  Total:{' '}
                  <strong className="text-[#151922] font-bold">
                    ₹{formatCurrencyExact(totalPrice)}
                  </strong>
                </span>
              </div>
            </div>
          )}
        </div>
        </div>
      )}

      <CheckoutSummary
        isOpen={checkoutOpen}
        defaultSplitEnabled={checkoutSplitDefault}
        onClose={() => setCheckoutOpen(false)}
        onSuccess={() => {
          setDoneBanner(true);
          setTimeout(() => setDoneBanner(false), 2600);
        }}
      />
    </>
  );
}
