import { useState } from 'react';
import { History, RotateCcw, Users, Calendar, Check, ShoppingBag } from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { formatCurrencyExact, formatQuantity, getCategoryStyle } from '../../utils/categoryStyles';

interface PurchaseHistoryProps {
  onRepeated?: () => void;
}

export function PurchaseHistory({ onRepeated }: PurchaseHistoryProps) {
  const purchaseHistory = useAppStore((s) => s.purchaseHistory);
  const repeatPurchaseSession = useAppStore((s) => s.repeatPurchaseSession);
  const [repeatedId, setRepeatedId] = useState<string | null>(null);

  const handleRepeat = (sessionId: string) => {
    const count = repeatPurchaseSession(sessionId);
    if (count > 0) {
      setRepeatedId(sessionId);
      setTimeout(() => setRepeatedId(null), 1800);
      onRepeated?.();
    }
  };

  if (purchaseHistory.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-zinc-500">
          <History className="w-6 h-6" />
        </div>
        <p className="text-sm font-bold text-zinc-300">No purchase sessions yet</p>
        <p className="text-xs text-zinc-500 max-w-xs mx-auto">
          Complete a Quick Mart checkout to build your purchase history, track price changes, and repeat baskets in one tap.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {purchaseHistory.map((session) => {
        const dateObj = new Date(session.timestamp);
        const formattedDate = Number.isNaN(dateObj.getTime())
          ? session.timestamp
          : dateObj.toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
        const isRepeated = repeatedId === session.id;
        const catEntries = Object.entries(session.categoryTotals);

        return (
          <div
            key={session.id}
            className="glass rounded-2xl p-4 space-y-3 border border-white/[0.07]"
          >
            {/* Header Row */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-zinc-300">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    {formattedDate}
                  </span>
                  {session.isSplit && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-brand-500/15 border border-brand-500/30 text-brand-300">
                      <Users className="w-3 h-3" />
                      Split
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {session.items.length} line item{session.items.length === 1 ? '' : 's'} ·{' '}
                  {formatQuantity(session.items.reduce((s, i) => s + i.quantity, 0))} total units
                </p>
              </div>

              <div className="text-right">
                <p className="text-base font-extrabold font-mono text-white tabular-nums">
                  ₹{formatCurrencyExact(session.totalAmount)}
                </p>
                {session.isSplit && (
                  <p className="text-[11px] font-mono font-bold text-brand-400">
                    My share: ₹{formatCurrencyExact(session.personalShare)}
                  </p>
                )}
              </div>
            </div>

            {/* Item Breakdown */}
            <div className="bg-ink-900/60 rounded-xl p-2.5 space-y-1.5 border border-white/[0.04]">
              {session.items.map((item, idx) => (
                <div
                  key={`${session.id}-${item.itemId}-${item.variantId ?? idx}`}
                  className="flex items-center justify-between text-xs gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ShoppingBag className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                    <span className="text-zinc-200 font-medium truncate">
                      {item.name}
                      {item.variantLabel ? ` · ${item.variantLabel}` : ''}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500 whitespace-nowrap">
                      {formatQuantity(item.quantity)} × ₹{formatCurrencyExact(item.price)}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-zinc-300 tabular-nums whitespace-nowrap">
                    ₹{formatCurrencyExact(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            {/* Category Breakdown + Repeat CTA */}
            <div className="flex items-center justify-between gap-3 flex-wrap pt-0.5">
              <div className="flex flex-wrap gap-1.5">
                {catEntries.map(([cat, amt]) => {
                  const st = getCategoryStyle(cat);
                  return (
                    <span
                      key={cat}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${st.bg} ${st.text} ${st.border}`}
                    >
                      {cat}: ₹{formatCurrencyExact(amt)}
                    </span>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => handleRepeat(session.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  isRepeated
                    ? 'bg-brand-500 text-ink-950'
                    : 'bg-white/[0.06] hover:bg-brand-500 text-zinc-200 hover:text-ink-950 border border-white/[0.08]'
                }`}
              >
                {isRepeated ? (
                  <>
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    Added to Cart
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" strokeWidth={2.5} />
                    Repeat Purchase
                  </>
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
