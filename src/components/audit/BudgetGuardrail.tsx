import { useState } from 'react';
import { Gauge, AlertOctagon, Check, X, Pencil } from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { formatCurrency } from '../../utils/categoryStyles';

export function BudgetGuardrail() {
  const sessionBudget = useAppStore((s) => s.sessionBudget);
  const setSessionBudget = useAppStore((s) => s.setSessionBudget);
  const items = useAppStore((s) => s.items);

  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(sessionBudget !== null ? String(sessionBudget) : '');

  const cartItems = items.filter((i) => i.quantity > 0);
  const cartTotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const isActive = sessionBudget !== null;
  const isOver = isActive && cartTotal > sessionBudget!;
  const isWarning = isActive && cartTotal > sessionBudget! * 0.8 && cartTotal <= sessionBudget!;
  const isSafe = isActive && cartTotal <= sessionBudget! * 0.8;
  const usagePct = isActive ? Math.min((cartTotal / sessionBudget!) * 100, 100) : 0;

  const handleSave = () => {
    const val = Number(inputValue);
    if (inputValue && val > 0) {
      setSessionBudget(val);
    } else if (!inputValue) {
      setSessionBudget(null);
    }
    setIsEditing(false);
  };

  const handleClear = () => {
    setSessionBudget(null);
    setInputValue('');
    setIsEditing(false);
  };

  return (
    <div className={`rounded-2xl border p-4 transition-all duration-500 ${
      isOver
        ? 'bg-red-950/20 border-red-500/20 glow-red'
        : isWarning
        ? 'bg-orange-950/15 border-orange-500/20'
        : 'glass border-white/[0.06]'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isOver ? 'bg-red-500/20 border border-red-500/30'
            : isWarning ? 'bg-orange-500/15 border border-orange-500/25'
            : 'bg-white/[0.04] border border-white/[0.06]'
          }`}>
            <Gauge className={`w-4 h-4 ${
              isOver ? 'text-red-400' : isWarning ? 'text-orange-400' : 'text-zinc-400'
            }`} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold tracking-tight">Session Budget Guardrail</h3>
            <p className="text-[10px] text-zinc-500 font-medium">Set a hard spending cap for this cart</p>
          </div>
        </div>
        {isActive && !isEditing && (
          <button
            onClick={() => { setInputValue(String(sessionBudget)); setIsEditing(true); }}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {isEditing || !isActive ? (
        <div className="space-y-2.5 animate-scale-in">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-500">₹</span>
            <input
              type="number"
              placeholder="Enter session limit (e.g. 500)"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full bg-ink-900 border border-white/[0.08] rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-white outline-none focus:border-brand-500/40 transition-colors placeholder:text-zinc-600 font-mono"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!inputValue || Number(inputValue) <= 0}
              className="flex-1 bg-brand-500 hover:bg-brand-400 disabled:bg-white/[0.04] disabled:text-zinc-600 text-ink-950 py-2.5 rounded-xl text-sm font-extrabold transition-all flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" strokeWidth={2.5} />
              Set Limit
            </button>
            {isActive && (
              <button
                onClick={handleClear}
                className="bg-white/[0.06] text-zinc-400 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-1"
              >
                <X className="w-4 h-4" strokeWidth={2.5} />
                Remove
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3 animate-fade-in">
          {/* Budget Display */}
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Session Limit</p>
              <p className="text-xl font-extrabold font-mono tabular-nums text-white">
                ₹{formatCurrency(sessionBudget!)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Cart Total</p>
              <p className={`text-xl font-extrabold font-mono tabular-nums ${
                isOver ? 'text-red-400' : isWarning ? 'text-orange-400' : 'text-brand-400'
              }`}>
                ₹{formatCurrency(cartTotal)}
              </p>
            </div>
          </div>

          {/* Usage Bar */}
          <div className="h-2.5 w-full bg-ink-900 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                isOver ? 'bg-red-500' : isWarning ? 'bg-orange-500' : 'bg-gradient-to-r from-brand-500 to-brand-400'
              }`}
              style={{ width: `${usagePct}%` }}
            />
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-1.5 ${isOver ? 'text-red-400' : isWarning ? 'text-orange-400' : 'text-brand-400'}`}>
              {isOver ? <AlertOctagon className="w-4 h-4" strokeWidth={2.5} /> : <Check className="w-4 h-4" strokeWidth={2.5} />}
              <span className="text-xs font-extrabold">
                {isOver
                  ? `OVER LIMIT by ₹${formatCurrency(cartTotal - sessionBudget!)}`
                  : isWarning
                  ? `₹${formatCurrency(sessionBudget! - cartTotal)} remaining — caution`
                  : `₹${formatCurrency(sessionBudget! - cartTotal)} remaining`}
              </span>
            </div>
            <span className={`text-[10px] font-extrabold px-2 py-1 rounded-md ${
              isOver ? 'bg-red-500/10 text-red-400 border border-red-500/20'
              : isWarning ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
              : 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
            }`}>
              {Math.round(usagePct)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
