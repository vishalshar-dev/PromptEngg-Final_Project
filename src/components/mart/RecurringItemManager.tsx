import { useState } from 'react';
import { Repeat, ShoppingCart, Plus, Check, Calendar, Trash2 } from 'lucide-react';
import { useAppStore, type CartItem } from '../../store/useStore';
import { formatCurrencyExact } from '../../utils/categoryStyles';
import { getDueRecurringItems, isRecurringItemDue } from '../../utils/martEngine';
import { EmptyState } from '../ui/EmptyState';
import { ProductVisual } from './ProductVisual';

interface RecurringItemManagerProps {
  onOpenDetails?: (item: CartItem) => void;
}

export function RecurringItemManager({ onOpenDetails }: RecurringItemManagerProps) {
  const items = useAppStore((s) => s.items);
  const categoryConfigs = useAppStore((s) => s.categoryConfigs);
  const addToCart = useAppStore((s) => s.addToCart);
  const addDueRecurringToCart = useAppStore((s) => s.addDueRecurringToCart);
  const setProductRecurrence = useAppStore((s) => s.setProductRecurrence);

  const [addedToast, setAddedToast] = useState<string | null>(null);

  const recurringItems = items.filter((item) => Boolean(item.recurrence));
  const dueItems = getDueRecurringItems(recurringItems);

  const handleAddAllDue = () => {
    const count = addDueRecurringToCart();
    if (count > 0) {
      setAddedToast(`Added ${count} due item${count === 1 ? '' : 's'} to cart`);
      setTimeout(() => setAddedToast(null), 2500);
    }
  };

  return (
    <div className="space-y-4">
      <div className="surface-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary-soft)] text-[var(--accent-ink)] flex items-center justify-center flex-shrink-0">
            <Repeat className="w-5 h-5" strokeWidth={2.2} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Recurring Purchases</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {recurringItems.length === 0
                ? 'Automatically captured from repeat checkouts · Or set any item manually'
                : dueItems.length > 0
                  ? `${dueItems.length} item${dueItems.length === 1 ? ' is' : 's are'} due now · Expenses are only recorded at checkout`
                  : `${recurringItems.length} tracked · Auto-detected from repeat orders or set manually`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddAllDue}
          disabled={dueItems.length === 0}
          className="px-4 py-2.5 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:bg-[var(--bg-subtle)] disabled:text-[var(--text-muted)] text-white text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
        >
          {addedToast ? (
            <>
              <Check className="w-4 h-4" strokeWidth={2.5} />
              {addedToast}
            </>
          ) : (
            <>
              <ShoppingCart className="w-4 h-4" strokeWidth={2.2} />
              Add All Due to Cart ({dueItems.length})
            </>
          )}
        </button>
      </div>

      {recurringItems.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="No recurring items detected yet"
          description="Buy an item across 2+ checkouts and CartAudit will automatically capture it as recurring—or open any product to set a manual schedule."
        />
      ) : (
        <div className="space-y-2.5">
          {recurringItems.map((item) => {
            const cfg = categoryConfigs.find((c) => c.name === item.category);
            const isDue = isRecurringItemDue(item);
            const isAuto = item.recurrence?.source === 'auto';
            const freqLabel =
              item.recurrence?.frequency === 'custom'
                ? `Every ${item.recurrence.intervalDays ?? 7}d`
                : item.recurrence?.frequency;

            return (
              <div
                key={item.id}
                className={`surface-card rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 ${
                  isDue ? '!border-[var(--accent-border)]' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => onOpenDetails?.(item)}
                  className="flex items-center gap-3 min-w-0 flex-1 text-left"
                >
                  <ProductVisual
                    name={item.name}
                    category={item.category}
                    imageUrl={item.imageUrl}
                    iconKey={cfg?.iconKey}
                    accent={cfg?.accent}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-[var(--text-primary)] truncate">{item.name}</p>
                      <span className="text-[12px] font-medium text-[var(--text-secondary)] capitalize">
                        · {freqLabel}
                        {isAuto && (
                          <span
                            title="Automatically captured from your checkout history"
                            className="text-[var(--accent-success-ink)] font-semibold normal-case"
                          >
                            {' '}· Auto{item.recurrence?.detectedOrderCount ? ` (${item.recurrence.detectedOrderCount} orders)` : ''}
                          </span>
                        )}
                      </span>
                      {isDue && (
                        <span className="text-[12px] font-bold text-[var(--accent-ink)]">
                          · Due now
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-mono mt-0.5 tabular-nums">
                      <span>₹{formatCurrencyExact(item.price)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.unit || '1 unit'}</span>
                      {item.recurrence?.nextDueDate && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {item.recurrence.nextDueDate}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </button>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => addToCart(item)}
                    aria-label={`Add ${item.name} to cart`}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 whitespace-nowrap transition-colors ${
                      item.quantity > 0
                        ? 'bg-[var(--accent-primary-soft)] border border-[var(--accent-border)] text-[var(--accent-ink)]'
                        : 'bg-[var(--bg-subtle)] hover:bg-[var(--accent-primary)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:text-white'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                    {item.quantity > 0 ? `${item.quantity} in cart` : 'Add'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductRecurrence(item.id, null)}
                    aria-label={`Mark ${item.name} as not recurring`}
                    title="Not recurring (stop tracking)"
                    className="w-9 h-9 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--accent-danger-soft)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--accent-danger)] flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
