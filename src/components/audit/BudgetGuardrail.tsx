import { useState } from 'react';
import { Gauge, AlertOctagon, Check, X, Pencil } from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { formatCurrency } from '../../utils/categoryStyles';

export function BudgetGuardrail() {
  const sessionBudget = useAppStore((s) => s.sessionBudget);
  const setSessionBudget = useAppStore((s) => s.setSessionBudget);
  const items = useAppStore((s) => s.items);

  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(
    sessionBudget !== null ? String(sessionBudget) : ''
  );

  const cartItems = items.filter((i) => i.quantity > 0);
  const cartTotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const isActive = sessionBudget !== null;
  const isOver = isActive && cartTotal > sessionBudget!;
  const isWarning =
    isActive && cartTotal > sessionBudget! * 0.8 && cartTotal <= sessionBudget!;
  const usagePct = isActive
    ? Math.min((cartTotal / sessionBudget!) * 100, 100)
    : 0;

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
    <div
      className={`surface-card p-5 transition-colors ${
        isOver
          ? 'border-[#F6B8B8] bg-[#FFF8F8]'
          : isWarning
          ? 'border-[#F3D8A8] bg-[#FFFDF7]'
          : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
              isOver
                ? 'bg-[#FDECEC] border-[#F6B8B8] text-[#DE5252]'
                : isWarning
                ? 'bg-[#FEF6E7] border-[#F3D8A8] text-[#9E6614]'
                : 'bg-[#EDF2FF] border-[#D4E0FF] text-[#365FE8]'
            }`}
          >
            <Gauge className="w-4 h-4" strokeWidth={2.25} />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-[#151922] tracking-tight">
              Session Budget Guardrail
            </h3>
            <p className="text-xs text-[#697386]">
              Set a hard spending cap for your active cart
            </p>
          </div>
        </div>
        {isActive && !isEditing && (
          <button
            type="button"
            onClick={() => {
              setInputValue(String(sessionBudget));
              setIsEditing(true);
            }}
            aria-label="Edit session budget guardrail"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#697386] hover:text-[#151922] hover:bg-[#F1F3F6] transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" strokeWidth={2.25} />
          </button>
        )}
      </div>

      {isEditing || !isActive ? (
        <div className="space-y-3">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#697386]">
              ₹
            </span>
            <input
              type="number"
              aria-label="Session budget limit"
              placeholder="Enter session limit (e.g. 500)"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="input-field w-full pl-8 pr-3.5 py-2.5 text-sm font-mono tabular-nums"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!inputValue || Number(inputValue) <= 0}
              className="btn-primary flex-1 py-2.5 px-4 text-sm flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" strokeWidth={2.5} />
              Set Limit
            </button>
            {isActive && (
              <button
                type="button"
                onClick={handleClear}
                className="btn-secondary px-4 py-2.5 text-sm flex items-center gap-1.5"
              >
                <X className="w-4 h-4" strokeWidth={2.25} />
                Remove
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
                Session Limit
              </p>
              <p className="text-xl font-bold font-mono tabular-nums text-[#151922] mt-0.5">
                ₹{formatCurrency(sessionBudget!)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
                Cart Total
              </p>
              <p
                className={`text-xl font-bold font-mono tabular-nums mt-0.5 ${
                  isOver
                    ? 'text-[#DE5252]'
                    : isWarning
                    ? 'text-[#9E6614]'
                    : 'text-[#15966B]'
                }`}
              >
                ₹{formatCurrency(cartTotal)}
              </p>
            </div>
          </div>

          <div className="h-2.5 w-full bg-[#ECEFF4] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isOver
                  ? 'bg-[#DE5252]'
                  : isWarning
                  ? 'bg-[#E5A23B]'
                  : 'bg-[#15966B]'
              }`}
              style={{ width: `${usagePct}%` }}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div
              className={`flex items-center gap-1.5 ${
                isOver
                  ? 'text-[#DE5252]'
                  : isWarning
                  ? 'text-[#9E6614]'
                  : 'text-[#15966B]'
              }`}
            >
              {isOver ? (
                <AlertOctagon className="w-4 h-4 shrink-0" strokeWidth={2.25} />
              ) : (
                <Check className="w-4 h-4 shrink-0" strokeWidth={2.25} />
              )}
              <span className="text-xs font-bold">
                {isOver
                  ? `OVER LIMIT by ₹${formatCurrency(cartTotal - sessionBudget!)}`
                  : isWarning
                  ? `₹${formatCurrency(sessionBudget! - cartTotal)} remaining — caution`
                  : `₹${formatCurrency(sessionBudget! - cartTotal)} remaining`}
              </span>
            </div>
            <span
              className={`text-[11px] font-bold font-mono tabular-nums px-2 py-0.5 rounded-md border ${
                isOver
                  ? 'bg-[#FDECEC] text-[#DE5252] border-[#F6B8B8]'
                  : isWarning
                  ? 'bg-[#FEF6E7] text-[#9E6614] border-[#F3D8A8]'
                  : 'bg-[#E8F7F1] text-[#15966B] border-[#B7E4D3]'
              }`}
            >
              {Math.round(usagePct)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
