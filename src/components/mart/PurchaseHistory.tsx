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
            className="surface-card rounded-2xl p-5 space-y-3.5"
          >
            {/* Header Row */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
                    <Calendar className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                    {formattedDate}
                  </span>
                  {session.source === 'receipt' && (
                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--accent-success-ink)]">
                      · {session.merchantLabel ? `${session.merchantLabel} Receipt` : 'Scanned Receipt'}
                    </span>
                  )}
                  {session.isSplit && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-ink)]">
                      <Users className="w-3 h-3" />
                      · Split
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 tabular-nums">
                  {session.items.length} line item{session.items.length === 1 ? '' : 's'} ·{' '}
                  {formatQuantity(session.items.reduce((s, i) => s + i.quantity, 0))} total units
                </p>
              </div>

              <div className="text-right">
                <p className="text-base font-bold font-mono text-[var(--text-primary)] tabular-nums">
                  ₹{formatCurrencyExact(session.totalAmount)}
                </p>
                {session.isSplit && (
                  <p className="text-xs font-mono font-semibold text-[var(--accent-ink)] tabular-nums">
                    My share: ₹{formatCurrencyExact(session.personalShare)}
                  </p>
                )}
              </div>
            </div>

            {/* Item Breakdown (Flat hairline rows — zero box-within-box) */}
            <div className="border-t border-b border-[var(--border-subtle)] py-2 divide-y divide-[var(--border-subtle)]/60">
              {session.items.map((item, idx) => (
                <div
                  key={`${session.id}-${item.itemId}-${item.variantId ?? idx}`}
                  className="flex items-center justify-between text-xs gap-2 py-1.5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ShoppingBag className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" />
                    <span className="text-[var(--text-primary)] font-medium truncate">
                      {item.name}
                      {item.variantLabel ? ` · ${item.variantLabel}` : ''}
                    </span>
                    <span className="text-[12px] font-mono text-[var(--text-secondary)] whitespace-nowrap tabular-nums">
                      {formatQuantity(item.quantity)} × ₹{formatCurrencyExact(item.price)}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-[var(--text-primary)] tabular-nums whitespace-nowrap">
                    ₹{formatCurrencyExact(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            {/* Category Breakdown + Repeat CTA */}
            <div className="flex items-center justify-between gap-3 flex-wrap pt-0.5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                {catEntries.map(([cat, amt], i) => (
                  <span key={cat} className="font-medium tabular-nums">
                    {i > 0 && <span className="mr-2 text-[var(--border-strong)]" aria-hidden="true">·</span>}
                    {cat}: <span className="font-mono font-semibold text-[var(--text-primary)]">₹{formatCurrencyExact(amt)}</span>
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleSaveAsBasket(session.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap border ${
                    savedBasketId === session.id
                      ? 'bg-[var(--accent-success-soft)] border-[var(--accent-success-border)] text-[var(--accent-success-ink)]'
                      : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] border-[var(--border-subtle)]'
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
                      ? 'bg-[var(--accent-success)] text-white'
                      : 'bg-[var(--accent-primary-soft)] hover:bg-[var(--accent-primary)] text-[var(--accent-ink)] hover:text-white border border-[var(--accent-border)]'
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
