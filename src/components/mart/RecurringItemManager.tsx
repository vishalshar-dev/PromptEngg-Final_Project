import { useState } from 'react';
import { Repeat, ShoppingCart, Plus, Check, Calendar, Trash2 } from 'lucide-react';
import { useAppStore, type CartItem } from '../../store/useStore';
import { formatCurrencyExact } from '../../utils/categoryStyles';
import { getDueRecurringItems, isRecurringItemDue } from '../../utils/martEngine';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 glass rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 flex-shrink-0">
            <Repeat className="w-5 h-5" strokeWidth={2.3} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white">Recurring Purchases</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {dueItems.length > 0
                ? `${dueItems.length} item${dueItems.length === 1 ? ' is' : 's are'} due now · Expenses are only recorded at checkout`
                : 'All recurring items are up to date'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddAllDue}
          disabled={dueItems.length === 0}
          className="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 disabled:bg-white/[0.05] disabled:text-zinc-600 text-ink-950 text-xs font-extrabold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all"
        >
          {addedToast ? (
            <>
              <Check className="w-4 h-4" strokeWidth={3} />
              {addedToast}
            </>
          ) : (
            <>
              <ShoppingCart className="w-4 h-4" strokeWidth={2.5} />
              Add All Due to Cart ({dueItems.length})
            </>
          )}
        </button>
      </div>

      {recurringItems.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center">
          <Repeat className="w-7 h-7 text-zinc-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-zinc-300">No recurring items configured</p>
          <p className="text-xs text-zinc-500 mt-1">
            Open any product to set a Daily, Weekly, Monthly, or Custom schedule.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {recurringItems.map((item) => {
            const cfg = categoryConfigs.find((c) => c.name === item.category);
            const isDue = isRecurringItemDue(item);
            const freqLabel =
              item.recurrence?.frequency === 'custom'
                ? `Every ${item.recurrence.intervalDays ?? 7}d`
                : item.recurrence?.frequency;

            return (
              <div
                key={item.id}
                className={`glass rounded-2xl p-3 flex items-center justify-between gap-3 border ${
                  isDue ? 'border-sky-500/25' : 'border-white/[0.06]'
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
                      <p className="text-sm font-bold text-white truncate">{item.name}</p>
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                          isDue
                            ? 'bg-sky-500/15 border-sky-400/30 text-sky-300'
                            : 'bg-white/[0.04] border-white/[0.08] text-zinc-400'
                        }`}
                      >
                        {freqLabel}
                      </span>
                      {isDue && (
                        <span className="text-[10px] font-extrabold text-brand-400">
                          Due now
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono mt-0.5">
                      <span>₹{formatCurrencyExact(item.price)}</span>
                      <span>·</span>
                      <span>{item.unit || '1 unit'}</span>
                      {item.recurrence?.nextDueDate && (
                        <>
                          <span>·</span>
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
                    className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1 transition-all ${
                      item.quantity > 0
                        ? 'bg-brand-500/20 border border-brand-500/40 text-brand-300'
                        : 'bg-white/[0.06] hover:bg-brand-500 text-zinc-200 hover:text-ink-950'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                    {item.quantity > 0 ? `${item.quantity} in cart` : 'Add'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductRecurrence(item.id, null)}
                    aria-label={`Disable recurrence for ${item.name}`}
                    title="Stop recurring"
                    className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-red-500/15 text-zinc-500 hover:text-red-400 flex items-center justify-center transition-colors"
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
