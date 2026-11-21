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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl p-5 border border-[#E7EAF0] shadow-card">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EDF2FF] text-[#365FE8] flex items-center justify-center flex-shrink-0">
            <Repeat className="w-5 h-5" strokeWidth={2.2} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#151922]">Recurring Purchases</h3>
            <p className="text-xs text-[#697386] mt-0.5">
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
          className="px-4 py-2.5 rounded-xl bg-[#365FE8] hover:bg-[#294FCC] disabled:bg-[#F1F3F6] disabled:text-[#929BAB] text-white text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
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
                className={`bg-white rounded-2xl p-3.5 flex items-center justify-between gap-3 border shadow-card ${
                  isDue ? 'border-[#365FE8]/35' : 'border-[#E7EAF0]'
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
                      <p className="text-sm font-bold text-[#151922] truncate">{item.name}</p>
                      <span
                        className={`text-[11px] font-semibold capitalize px-2 py-0.5 rounded-md border ${
                          isDue
                            ? 'bg-[#EDF2FF] border-[#365FE8]/25 text-[#365FE8]'
                            : 'bg-[#F7F8FA] border-[#E7EAF0] text-[#697386]'
                        }`}
                      >
                        {freqLabel}
                      </span>
                      {isAuto && (
                        <span
                          title="Automatically captured from your checkout history"
                          className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md bg-[#E8F7F1] border border-[#B7E4D3] text-[#15966B]"
                        >
                          Auto{item.recurrence?.detectedOrderCount ? ` · ${item.recurrence.detectedOrderCount} orders` : ''}
                        </span>
                      )}
                      {isDue && (
                        <span className="text-[11px] font-bold text-[#15966B]">
                          Due now
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#697386] font-mono mt-0.5 tabular-nums">
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
                        ? 'bg-[#EDF2FF] border border-[#365FE8]/30 text-[#365FE8]'
                        : 'bg-[#F7F8FA] hover:bg-[#365FE8] border border-[#E7EAF0] text-[#151922] hover:text-white'
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
                    className="w-9 h-9 rounded-xl bg-[#F7F8FA] hover:bg-[#FDECEC] border border-[#E7EAF0] text-[#697386] hover:text-[#DE5252] flex items-center justify-center transition-colors"
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
