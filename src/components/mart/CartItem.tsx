import { useState } from 'react';
import { Plus, Minus, Trash2, Pencil, Check, X } from 'lucide-react';
import type { CartLineItem, CategoryConfig } from '../../types/models';
import { formatCurrencyExact, formatQuantity } from '../../utils/categoryStyles';
import { getDefaultQuantityStep } from '../../utils/martEngine';
import { ProductVisual } from './ProductVisual';

export interface CartItemRowProps {
  line: CartLineItem;
  categoryConfig?: CategoryConfig;
  onUpdateQuantity: (id: string, delta: number, variantId?: string) => void;
  onSetQuantity: (id: string, qty: number, variantId?: string) => void;
  onUpdatePrice: (id: string, newPrice: number, variantId?: string) => void;
  onRemove: (id: string, variantId?: string) => void;
}

export function CartItemRow({
  line,
  categoryConfig,
  onUpdateQuantity,
  onSetQuantity,
  onUpdatePrice,
  onRemove,
}: CartItemRowProps) {
  const { item, variantId, variantLabel, unit, price, quantity, subtotal } = line;
  const [editingPrice, setEditingPrice] = useState(false);
  const [tempPrice, setTempPrice] = useState('');
  const [editingQty, setEditingQty] = useState(false);
  const [tempQty, setTempQty] = useState('');

  const step = getDefaultQuantityStep(item);

  const commitPrice = () => {
    const val = Number(tempPrice);
    if (tempPrice && Number.isFinite(val) && val > 0) {
      onUpdatePrice(item.id, val, variantId);
    }
    setEditingPrice(false);
    setTempPrice('');
  };

  const commitQty = () => {
    const val = Number(tempQty);
    if (tempQty !== '' && Number.isFinite(val) && val >= 0) {
      onSetQuantity(item.id, val, variantId);
    }
    setEditingQty(false);
    setTempQty('');
  };

  return (
    <div className="flex items-center gap-3 bg-[#F7F8FA] rounded-xl p-2.5 border border-[#E7EAF0]">
      <ProductVisual
        name={item.name}
        category={item.category}
        imageUrl={item.imageUrl}
        iconKey={categoryConfig?.iconKey}
        accent={categoryConfig?.accent}
        size="xs"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-sm font-bold text-[#151922] truncate">{item.name}</p>
          {variantLabel && (
            <span className="text-xs font-medium text-[#365FE8] flex-shrink-0">
              · {variantLabel}
            </span>
          )}
        </div>
        {item.brand && (
          <p className="text-[11px] text-[#697386] font-medium truncate">{item.brand}</p>
        )}

        {editingPrice ? (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs text-[#365FE8] font-bold">₹</span>
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
              className="w-16 bg-white border border-[#365FE8] rounded px-1.5 py-0.5 text-xs text-[#151922] font-mono outline-none"
              autoFocus
            />
            <button
              type="button"
              onClick={commitPrice}
              aria-label="Save price"
              className="w-5 h-5 rounded bg-[#365FE8] text-white flex items-center justify-center"
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
              className="w-5 h-5 rounded bg-[#E7EAF0] text-[#697386] flex items-center justify-center"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-[#697386] font-mono tabular-nums">
            <span>₹{formatCurrencyExact(price)}</span>
            <span aria-hidden="true">·</span>
            <span>{unit}</span>
            <button
              type="button"
              onClick={() => {
                setEditingPrice(true);
                setTempPrice(String(price));
              }}
              aria-label={`Edit price of ${item.name}`}
              className="text-[#929BAB] hover:text-[#365FE8] p-0.5"
            >
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Quantity Controls */}
      <div className="flex items-center gap-1 bg-white rounded-lg p-1 border border-[#E7EAF0]">
        <button
          type="button"
          onClick={() => onUpdateQuantity(item.id, -step, variantId)}
          aria-label={`Decrease ${item.name} quantity`}
          className="w-6 h-6 rounded-md bg-[#F7F8FA] hover:bg-[#F1F3F6] flex items-center justify-center"
        >
          <Minus className="w-3 h-3 text-[#151922]" strokeWidth={2.5} />
        </button>

        {editingQty ? (
          <input
            type="number"
            min="0"
            step={step}
            aria-label={`Exact quantity for ${item.name}`}
            value={tempQty}
            onChange={(e) => setTempQty(e.target.value)}
            onBlur={commitQty}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitQty();
              if (e.key === 'Escape') {
                setEditingQty(false);
                setTempQty('');
              }
            }}
            className="w-11 bg-white border border-[#365FE8] rounded px-1 py-0.5 text-xs text-[#151922] font-mono text-center outline-none"
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setEditingQty(true);
              setTempQty(String(quantity));
            }}
            title="Click to enter exact quantity"
            className="text-xs font-bold text-[#151922] font-mono min-w-[1.75rem] px-1 text-center tabular-nums hover:text-[#365FE8]"
          >
            {formatQuantity(quantity)}
          </button>
        )}

        <button
          type="button"
          onClick={() => onUpdateQuantity(item.id, step, variantId)}
          aria-label={`Increase ${item.name} quantity`}
          className="w-6 h-6 rounded-md bg-[#EDF2FF] hover:bg-[#365FE8] text-[#365FE8] hover:text-white flex items-center justify-center transition-colors"
        >
          <Plus className="w-3 h-3" strokeWidth={2.5} />
        </button>
      </div>

      {/* Subtotal + Remove */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-xs font-bold text-[#151922] font-mono tabular-nums w-16 text-right">
          ₹{formatCurrencyExact(subtotal)}
        </span>
        <button
          type="button"
          onClick={() => onRemove(item.id, variantId)}
          aria-label={`Remove ${item.name} from cart`}
          className="w-6 h-6 rounded-md text-[#929BAB] hover:text-[#DE5252] hover:bg-[#FDECEC] flex items-center justify-center transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export { CartItemRow as CartItem };
