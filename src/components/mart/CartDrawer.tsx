import { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Minus, Check, ChevronUp, Trash2, AlertOctagon } from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { getCategoryStyle, formatCurrency } from '../../utils/categoryStyles';

export function CartDrawer() {
  const items = useAppStore((s) => s.items);
  const updateQuantity = useAppStore((s) => s.updateQuantity);
  const checkoutCart = useAppStore((s) => s.checkoutCart);
  const clearCart = useAppStore((s) => s.clearCart);
  const sessionBudget = useAppStore((s) => s.sessionBudget);

  const [expanded, setExpanded] = useState(false);
  const [checkoutFlash, setCheckoutFlash] = useState(false);

  const cartItems = items.filter((i) => i.quantity > 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  const isOverSession = sessionBudget !== null && totalPrice > sessionBudget;
  const isWarningSession = sessionBudget !== null && totalPrice > sessionBudget * 0.8 && totalPrice <= sessionBudget;

  // Auto-collapse when cart becomes empty
  useEffect(() => {
    if (cartItems.length === 0) setExpanded(false);
  }, [cartItems.length]);

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    setCheckoutFlash(true);
    setTimeout(() => {
      checkoutCart();
      setCheckoutFlash(false);
      setExpanded(false);
    }, 600);
  };

  const hasItems = cartItems.length > 0;

  return (
    <>
      {/* Backdrop when expanded */}
      {expanded && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
          onClick={() => setExpanded(false)}
        />
      )}

      {/* Checkout Bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50">
        <div
          className={`glass-strong border-t shadow-2xl transition-all duration-300 ${
            expanded ? 'rounded-t-3xl' : ''
          } ${
            isOverSession
              ? 'border-red-500/30 glow-red'
              : isWarningSession
              ? 'border-orange-500/20'
              : 'border-white/[0.08]'
          } ${hasItems && !isOverSession ? 'glow-brand' : ''}`}
        >
          {/* Collapsed Bar */}
          <div className="px-4 pt-3.5 pb-3.5">
            <div className="flex items-center justify-between gap-3">
              {/* Left: Cart Info */}
              <button
                onClick={() => hasItems && setExpanded(!expanded)}
                disabled={!hasItems}
                className="flex items-center gap-3 min-w-0 flex-1"
              >
                <div
                  className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
                    hasItems
                      ? 'bg-brand-500/15 border border-brand-500/30'
                      : 'bg-white/[0.04] border border-white/[0.06]'
                  }`}
                >
                  <ShoppingBag
                    className={`w-5 h-5 ${
                      hasItems ? 'text-brand-400' : 'text-zinc-600'
                    }`}
                    strokeWidth={2.5}
                  />
                  {hasItems && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-brand-500 text-ink-950 text-[10px] font-extrabold flex items-center justify-center shadow-md animate-bounce-in">
                      {totalCount}
                    </span>
                  )}
                </div>
                <div className="text-left min-w-0">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                    {hasItems ? 'Cart Total' : 'Empty Cart'}
                  </p>
                  <p
                    className={`text-lg font-extrabold font-mono tabular-nums leading-tight ${
                      hasItems ? 'text-white' : 'text-zinc-600'
                    }`}
                  >
                    ₹{formatCurrency(totalPrice)}
                  </p>
                </div>
                {hasItems && (
                  <ChevronUp
                    className={`w-4 h-4 text-zinc-500 transition-transform duration-300 ${
                      expanded ? 'rotate-180' : ''
                    }`}
                    strokeWidth={2.5}
                  />
                )}
              </button>

              {/* Right: Checkout Button */}
              <button
                onClick={handleCheckout}
                disabled={!hasItems || checkoutFlash}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-extrabold transition-all duration-300 whitespace-nowrap ${
                  checkoutFlash
                    ? 'bg-brand-400 text-ink-950 scale-95'
                    : hasItems
                    ? 'bg-brand-500 hover:bg-brand-400 text-ink-950 glow-brand active:scale-95'
                    : 'bg-white/[0.04] text-zinc-600 cursor-not-allowed'
                }`}
              >
                {checkoutFlash ? (
                  <>
                    <Check className="w-4 h-4" strokeWidth={3} />
                    Done!
                  </>
                ) : (
                  <>
                    Checkout
                    <span className="bg-ink-950/20 px-1.5 py-0.5 rounded-md text-xs font-mono">
                      {totalCount}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Expanded Cart Items */}
          {expanded && hasItems && (
            <div className="px-4 pb-4 max-h-[50vh] overflow-y-auto scrollbar-thin animate-slide-up">
              {/* Divider */}
              <div className="h-px bg-white/[0.06] mb-3" />

              {/* Clear All */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                  {cartItems.length} item{cartItems.length > 1 ? 's' : ''} in cart
                </p>
                <button
                  onClick={clearCart}
                  className="text-[11px] font-bold text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" strokeWidth={2.5} />
                  Clear
                </button>
              </div>

              {/* Item List */}
              <div className="space-y-2">
                {cartItems.map((item) => {
                  const catStyle = getCategoryStyle(item.category);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 bg-white/[0.03] rounded-xl p-2.5 border border-white/[0.04] animate-fade-in-up"
                    >
                      <div
                        className={`w-10 h-10 rounded-lg bg-gradient-to-br ${catStyle.gradient} border ${catStyle.border} flex items-center justify-center text-lg flex-shrink-0`}
                      >
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-zinc-500 font-mono">
                          ₹{formatCurrency(item.price)} each
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1.5 bg-ink-900 rounded-lg p-1">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-7 h-7 rounded-md bg-white/[0.06] hover:bg-white/[0.1] flex items-center justify-center transition-colors"
                        >
                          <Minus className="w-3 h-3 text-white" strokeWidth={3} />
                        </button>
                        <span className="text-sm font-extrabold text-white font-mono w-6 text-center tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-7 h-7 rounded-md bg-brand-500/20 hover:bg-brand-500/30 flex items-center justify-center transition-colors"
                        >
                          <Plus
                            className="w-3 h-3 text-brand-400"
                            strokeWidth={3}
                          />
                        </button>
                      </div>

                      {/* Line Total */}
                      <div className="text-right flex-shrink-0 w-16">
                        <p className="text-sm font-extrabold text-brand-400 font-mono tabular-nums">
                          ₹{formatCurrency(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Session Budget Warning */}
              {sessionBudget !== null && hasItems && (
                <div className={`mt-3 rounded-xl p-2.5 flex items-center gap-2 animate-fade-in-up ${
                  isOverSession
                    ? 'bg-red-500/10 border border-red-500/20'
                    : isWarningSession
                    ? 'bg-orange-500/10 border border-orange-500/20'
                    : 'bg-brand-500/10 border border-brand-500/20'
                }`}>
                  {isOverSession ? (
                    <AlertOctagon className="w-4 h-4 text-red-400 flex-shrink-0" strokeWidth={2.5} />
                  ) : (
                    <Check className="w-4 h-4 text-brand-400 flex-shrink-0" strokeWidth={2.5} />
                  )}
                  <p className={`text-[11px] font-bold ${
                    isOverSession ? 'text-red-400' : isWarningSession ? 'text-orange-400' : 'text-brand-400'
                  }`}>
                    {isOverSession
                      ? `Over session limit by ₹${formatCurrency(totalPrice - sessionBudget)}`
                      : isWarningSession
                      ? `₹${formatCurrency(sessionBudget - totalPrice)} left in session budget — caution`
                      : `Within session budget (₹${formatCurrency(sessionBudget - totalPrice)} left)`}
                  </p>
                </div>
              )}

              {/* Cart Summary */}
              <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                <span className="text-sm font-bold text-zinc-400">Subtotal</span>
                <span className="text-lg font-extrabold text-white font-mono tabular-nums">
                  ₹{formatCurrency(totalPrice)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
