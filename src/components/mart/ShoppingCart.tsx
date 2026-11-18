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
      {expanded && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
          onClick={() => {
            setExpanded(false);
            setConfirmClear(false);
          }}
        />
      )}

      {/* Compact Sticky Cart Bar */}
      <div
        className={`fixed bottom-0 md:bottom-4 left-1/2 -translate-x-1/2 w-full max-w-md md:max-w-xl ${
          expanded ? 'z-50' : 'z-40'
        } md:px-4`}
      >
        <div
          className={`glass-strong border-t md:border md:rounded-2xl shadow-2xl transition-all duration-300 ${
            expanded ? 'rounded-t-3xl' : ''
          } ${
            isOverSession
              ? 'border-red-500/30 glow-red'
              : isWarningSession
              ? 'border-orange-500/20'
              : 'border-white/[0.08]'
          } ${hasItems && !isOverSession ? 'glow-brand' : ''}`}
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
                  className={`relative w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    hasItems
                      ? 'bg-brand-500/15 border border-brand-500/30'
                      : 'bg-white/[0.04] border border-white/[0.06]'
                  }`}
                >
                  <ShoppingBag
                    className={`w-4 h-4 ${hasItems ? 'text-brand-400' : 'text-zinc-600'}`}
                    strokeWidth={2.5}
                  />
                  {hasItems && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[1.25rem] h-5 px-1 rounded-full bg-brand-500 text-ink-950 text-[10px] font-extrabold flex items-center justify-center shadow">
                      {lines.length}
                    </span>
                  )}
                </div>

                <div className="text-left min-w-0">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider truncate">
                    {doneBanner
                      ? 'Recorded to Budget'
                      : hasItems
                      ? `${uniqueProducts} item${uniqueProducts > 1 ? 's' : ''} · ${formatQuantity(totalCount)} qty`
                      : 'Empty Cart'}
                  </p>
                  <p
                    className={`text-base font-extrabold font-mono tabular-nums leading-tight ${
                      doneBanner
                        ? 'text-brand-400'
                        : hasItems
                        ? 'text-white'
                        : 'text-zinc-600'
                    }`}
                  >
                    {doneBanner ? 'Purchase Saved' : `₹${formatCurrencyExact(totalPrice)}`}
                  </p>
                </div>

                {hasItems && (
                  <ChevronUp
                    className={`w-4 h-4 text-zinc-400 transition-transform ${
                      expanded ? 'rotate-180' : ''
                    }`}
                    strokeWidth={2.5}
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
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-extrabold bg-white/[0.06] hover:bg-brand-500/15 text-zinc-200 hover:text-brand-400 border border-white/[0.08] whitespace-nowrap transition-all"
                  >
                    <Users className="w-3.5 h-3.5" strokeWidth={2.5} />
                    Split
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openCheckout(false)}
                  disabled={!hasItems}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all ${
                    hasItems
                      ? 'bg-brand-500 hover:bg-brand-400 text-ink-950 glow-brand'
                      : 'bg-white/[0.04] text-zinc-600 cursor-not-allowed'
                  }`}
                >
                  <span>Checkout</span>
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={3} />
                </button>
              </div>
            </div>
          </div>

          {/* Expanded Cart Panel */}
          {expanded && hasItems && (
            <div className="px-4 pb-4 max-h-[56vh] overflow-y-auto scrollbar-thin animate-slide-up">
              <div className="h-px bg-white/[0.06] mb-3" />

              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Shopping Cart ({lines.length} {lines.length === 1 ? 'line' : 'lines'} ·{' '}
                  {formatQuantity(totalCount)} qty)
                </p>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSaveBasketOpen((v) => !v);
                      setConfirmClear(false);
                    }}
                    className="text-[11px] font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1 whitespace-nowrap"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    Save Basket
                  </button>

                  {confirmClear ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-red-300 font-bold">Clear all?</span>
                      <button
                        type="button"
                        onClick={() => {
                          clearCart();
                          setConfirmClear(false);
                        }}
                        className="px-2 py-0.5 rounded-md bg-red-500 text-white text-[11px] font-extrabold"
                      >
                        Yes, Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClear(false)}
                        className="px-2 py-0.5 rounded-md bg-white/[0.08] text-zinc-300 text-[11px] font-bold"
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
                      className="text-[11px] font-bold text-zinc-500 hover:text-red-400 flex items-center gap-1 whitespace-nowrap"
                    >
                      <Trash2 className="w-3 h-3" />
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
                  className="mb-3 rounded-xl bg-ink-900/80 border border-brand-500/30 p-2.5 flex items-center gap-2"
                >
                  <input
                    type="text"
                    aria-label="Basket template name"
                    value={basketNameInput}
                    onChange={(e) => setBasketNameInput(e.target.value)}
                    placeholder="Name this basket (e.g. Weekend Essentials)"
                    className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-ink-950/70 border border-white/[0.08] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-brand-500/50"
                  />
                  <button
                    type="submit"
                    disabled={!basketNameInput.trim()}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold whitespace-nowrap ${
                      basketNameInput.trim()
                        ? 'bg-brand-500 hover:bg-brand-400 text-ink-950'
                        : 'bg-white/[0.06] text-zinc-500 cursor-not-allowed'
                    }`}
                  >
                    Save
                  </button>
                </form>
              )}

              {basketSavedBanner && (
                <div
                  role="status"
                  className="mb-3 rounded-xl bg-brand-500/15 border border-brand-500/30 px-3 py-2 flex items-center gap-2 text-xs font-bold text-brand-300"
                >
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
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
                  className={`mt-3 rounded-xl p-2.5 flex items-center gap-2 ${
                    isOverSession
                      ? 'bg-red-500/10 border border-red-500/20'
                      : isWarningSession
                      ? 'bg-orange-500/10 border border-orange-500/20'
                      : 'bg-brand-500/10 border border-brand-500/20'
                  }`}
                >
                  {isOverSession ? (
                    <AlertOctagon className="w-4 h-4 text-red-400 flex-shrink-0" />
                  ) : (
                    <Check className="w-4 h-4 text-brand-400 flex-shrink-0" />
                  )}
                  <p
                    className={`text-[11px] font-bold ${
                      isOverSession
                        ? 'text-red-400'
                        : isWarningSession
                        ? 'text-orange-400'
                        : 'text-brand-400'
                    }`}
                  >
                    {isOverSession
                      ? `Over session limit by ₹${formatCurrencyExact(totalPrice - sessionBudget)}`
                      : isWarningSession
                      ? `₹${formatCurrencyExact(sessionBudget - totalPrice)} left in session budget`
                      : `Within session budget (₹${formatCurrencyExact(sessionBudget - totalPrice)} left)`}
                  </p>
                </div>
              )}

              <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Continue Shopping
                </button>
                <span className="text-xs font-mono text-zinc-400">
                  Total:{' '}
                  <strong className="text-brand-400 font-extrabold">
                    ₹{formatCurrencyExact(totalPrice)}
                  </strong>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

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
