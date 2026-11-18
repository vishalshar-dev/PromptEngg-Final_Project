import { useState } from 'react';
import { Plus, Minus, Trash2, Pencil, Check, X } from 'lucide-react';
import type { CartItem as CartItemModel, CategoryConfig } from '../../store/useStore';
import { formatCurrencyExact } from '../../utils/categoryStyles';
import { ProductVisual } from './ProductVisual';

export interface CartItemRowProps {
  item: CartItemModel;
  categoryConfig?: CategoryConfig;
  onUpdateQuantity: (id: string, delta: number) => void;
  onUpdatePrice: (id: string, newPrice: number) => void;
  onRemove: (id: string) => void;
}

export function CartItemRow({
  item,
  categoryConfig,
  onUpdateQuantity,
  onUpdatePrice,
  onRemove,
}: CartItemRowProps) {
  const [editingPrice, setEditingPrice] = useState(false);
  const [tempPrice, setTempPrice] = useState('');

  const commitPrice = () => {
    const val = Number(tempPrice);
    if (tempPrice && Number.isFinite(val) && val > 0) {
      onUpdatePrice(item.id, val);
    }
    setEditingPrice(false);
    setTempPrice('');
  };

  return (
    <div className="flex items-center gap-3 bg-white/[0.03] rounded-xl p-2.5 border border-white/[0.06]">
      <ProductVisual
        name={item.name}
        category={item.category}
        imageUrl={item.imageUrl}
        iconKey={categoryConfig?.iconKey}
        accent={categoryConfig?.accent}
        size="xs"
      />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{item.name}</p>
        {editingPrice ? (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs text-brand-400 font-bold">₹</span>
            <input
              type="number"
              min="1"
              step="any"
              aria-label={`Edit cart price for ${item.name}`}
              value={tempPrice}
              onChange={(e) => setTempPrice(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitPrice();
                if (e.key === 'Escape') {
                  setEditingPrice(false);
                  setTempPrice('');
                }
              }}
              className="w-16 bg-ink-900 border border-brand-500/40 rounded px-1.5 py-0.5 text-xs text-white font-mono outline-none"
              autoFocus
            />
            <button
              type="button"
              onClick={commitPrice}
              aria-label="Save price"
              className="w-5 h-5 rounded bg-brand-500 text-ink-950 flex items-center justify-center"
            >
              <Check className="w-3 h-3" strokeWidth={3} />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingPrice(false);
                setTempPrice('');
              }}
              aria-label="Cancel price edit"
              className="w-5 h-5 rounded bg-white/[0.08] text-zinc-400 flex items-center justify-center"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
            <span>₹{formatCurrencyExact(item.price)}</span>
            <span>·</span>
            <span>{item.unit || '1 unit'}</span>
            <button
              type="button"
              onClick={() => {
                setEditingPrice(true);
                setTempPrice(String(item.price));
              }}
              aria-label={`Edit price of ${item.name}`}
              className="text-zinc-500 hover:text-brand-400 p-0.5"
            >
              <Pencil className="w-2.5 h-2.5" />
            </button>
          </div>
        )}
      </div>

      {/* Quantity Controls */}
      <div className="flex items-center gap-1 bg-ink-900 rounded-lg p-1 border border-white/[0.06]">
        <button
          type="button"
          onClick={() => onUpdateQuantity(item.id, -1)}
          aria-label={`Decrease ${item.name} quantity`}
          className="w-6 h-6 rounded-md bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center"
        >
          <Minus className="w-3 h-3 text-white" strokeWidth={3} />
        </button>
        <span className="text-xs font-extrabold text-white font-mono w-5 text-center tabular-nums">
          {item.quantity}
        </span>
        <button
          type="button"
          onClick={() => onUpdateQuantity(item.id, 1)}
          aria-label={`Increase ${item.name} quantity`}
          className="w-6 h-6 rounded-md bg-brand-500/20 hover:bg-brand-500/30 flex items-center justify-center"
        >
          <Plus className="w-3 h-3 text-brand-400" strokeWidth={3} />
        </button>
      </div>

      {/* Subtotal + Remove */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-xs font-extrabold text-brand-400 font-mono tabular-nums w-14 text-right">
          ₹{formatCurrencyExact(item.price * item.quantity)}
        </span>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          aria-label={`Remove ${item.name} from cart`}
          className="w-6 h-6 rounded-md text-zinc-600 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export { CartItemRow as CartItem };
