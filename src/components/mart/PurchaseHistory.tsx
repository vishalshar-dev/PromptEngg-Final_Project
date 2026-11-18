import { useState } from 'react';
import { History, RotateCcw, Users, Calendar, Check, ShoppingBag, BookmarkPlus } from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { formatCurrencyExact, formatQuantity } from '../../utils/categoryStyles';
import { EmptyState } from '../ui/EmptyState';

interface PurchaseHistoryProps {
  onRepeated?: () => void;
  onSavedBasket?: () => void;
}

export function PurchaseHistory({ onRepeated, onSavedBasket }: PurchaseHistoryProps) {
  const purchaseHistory = useAppStore((s) => s.purchaseHistory);
  const repeatPurchaseSession = useAppStore((s) => s.repeatPurchaseSession);
  const saveSessionAsBasket = useAppStore((s) => s.saveSessionAsBasket);
  const [repeatedId, setRepeatedId] = useState<string | null>(null);
  const [savedBasketId, setSavedBasketId] = useState<string | null>(null);

  const handleRepeat = (sessionId: string) => {
    const count = repeatPurchaseSession(sessionId);
    if (count > 0) {
      setRepeatedId(sessionId);
      setTimeout(() => setRepeatedId(null), 1800);
      onRepeated?.();
    }
  };

  const handleSaveAsBasket = (sessionId: string) => {
    const created = saveSessionAsBasket(sessionId);
    if (created) {
      setSavedBasketId(sessionId);
      setTimeout(() => setSavedBasketId(null), 1800);
      onSavedBasket?.();
    }
  };

  if (purchaseHistory.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No purchase sessions yet"
        description="Complete a Shopping checkout to build your purchase history, track price changes, and repeat baskets in one tap."
      />
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
            className="bg-white rounded-2xl p-5 space-y-3.5 border border-[#E7EAF0] shadow-card"
          >
            {/* Header Row */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#151922]">
                    <Calendar className="w-3.5 h-3.5 text-[#697386]" />
                    {formattedDate}
                  </span>
                  {session.isSplit && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#365FE8]">
                      <Users className="w-3 h-3" />
                      · Split
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#697386] mt-0.5 tabular-nums">
                  {session.items.length} line item{session.items.length === 1 ? '' : 's'} ·{' '}
                  {formatQuantity(session.items.reduce((s, i) => s + i.quantity, 0))} total units
                </p>
              </div>

              <div className="text-right">
                <p className="text-base font-bold font-mono text-[#151922] tabular-nums">
                  ₹{formatCurrencyExact(session.totalAmount)}
                </p>
                {session.isSplit && (
                  <p className="text-xs font-mono font-semibold text-[#365FE8] tabular-nums">
                    My share: ₹{formatCurrencyExact(session.personalShare)}
                  </p>
                )}
              </div>
            </div>

            {/* Item Breakdown */}
            <div className="bg-[#F7F8FA] rounded-xl p-3 space-y-1.5 border border-[#E7EAF0]">
              {session.items.map((item, idx) => (
                <div
                  key={`${session.id}-${item.itemId}-${item.variantId ?? idx}`}
                  className="flex items-center justify-between text-xs gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ShoppingBag className="w-3.5 h-3.5 text-[#929BAB] flex-shrink-0" />
                    <span className="text-[#151922] font-medium truncate">
                      {item.name}
                      {item.variantLabel ? ` · ${item.variantLabel}` : ''}
                    </span>
                    <span className="text-[11px] font-mono text-[#697386] whitespace-nowrap tabular-nums">
                      {formatQuantity(item.quantity)} × ₹{formatCurrencyExact(item.price)}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-[#151922] tabular-nums whitespace-nowrap">
                    ₹{formatCurrencyExact(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            {/* Category Breakdown + Repeat CTA */}
            <div className="flex items-center justify-between gap-3 flex-wrap pt-0.5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#697386]">
                {catEntries.map(([cat, amt], i) => (
                  <span key={cat} className="font-medium tabular-nums">
                    {i > 0 && <span className="mr-2 text-[#D5DBE5]" aria-hidden="true">·</span>}
                    {cat}: <span className="font-mono font-semibold text-[#151922]">₹{formatCurrencyExact(amt)}</span>
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleSaveAsBasket(session.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap border ${
                    savedBasketId === session.id
                      ? 'bg-[#E8F7F1] border-[#B7E4D3] text-[#15966B]'
                      : 'bg-white hover:bg-[#F7F8FA] text-[#4B5565] border-[#E7EAF0]'
                  }`}
                >
                  {savedBasketId === session.id ? (
                    <>
                      <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                      Basket Saved
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="w-3.5 h-3.5" strokeWidth={2.2} />
                      Save Basket
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleRepeat(session.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    isRepeated
                      ? 'bg-[#15966B] text-white'
                      : 'bg-[#EDF2FF] hover:bg-[#365FE8] text-[#365FE8] hover:text-white border border-[#365FE8]/25'
                  }`}
                >
                  {isRepeated ? (
                    <>
                      <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                      Added to Cart
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" strokeWidth={2.2} />
                      Repeat Purchase
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
