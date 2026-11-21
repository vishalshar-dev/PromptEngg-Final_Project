import { useState } from 'react';
import { Gauge, AlertOctagon, Check, X, Pencil } from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { formatCurrency } from '../../utils/categoryStyles';
import { calculateCartTotals } from '../../utils/martEngine';

export function BudgetGuardrail() {
  const sessionBudget = useAppStore((s) => s.sessionBudget);
  const setSessionBudget = useAppStore((s) => s.setSessionBudget);
  const items = useAppStore((s) => s.items);

  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(
    sessionBudget !== null ? String(sessionBudget) : ''
  );

  const cartTotal = calculateCartTotals(items).totalAmount;

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
      className={`bg-white border rounded-2xl p-5 transition-colors ${
        isOver
          ? 'border-[#F6B8B8] bg-[#FDECEC]/40'
          : isWarning
          ? 'border-[#F3D8A8] bg-[#FEF6E7]/40'
          : 'border-[#E7EAF0]'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
              isOver
                ? 'bg-[#FDECEC] border-[#F6B8B8] text-[#DE5252]'
                : isWarning
                ? 'bg-[#FEF6E7] border-[#F3D8A8] text-[#C7851F]'
                : 'bg-[#EDF2FF] border-[#D4E0FF] text-[#365FE8]'
            }`}
          >
            <Gauge className="w-4 h-4" strokeWidth={2.1} />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-[#151922] tracking-tight">
              Session Budget Guardrail
            </h3>
            <p className="text-[12px] text-[#697386]">
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
            <Pencil className="w-3.5 h-3.5" strokeWidth={2.1} />
          </button>
        )}
      </div>

      {isEditing || !isActive ? (
        <div className="space-y-3">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-[#697386]">
              ₹
            </span>
            <input
              type="number"
              aria-label="Session budget limit"
              placeholder="Enter session limit (e.g. 500)"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="input-field w-full pl-8 pr-3.5 py-2.5 text-[13px] font-mono tabular-nums"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!inputValue || Number(inputValue) <= 0}
              className="btn-primary flex-1 py-2.5 px-4 text-[13px] flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" strokeWidth={2.3} />
              Set Limit
            </button>
            {isActive && (
              <button
                type="button"
                onClick={handleClear}
                className="btn-secondary px-4 py-2.5 text-[13px] flex items-center gap-1.5"
              >
                <X className="w-4 h-4" strokeWidth={2.1} />
                Remove
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#697386]">
                Session Limit
              </p>
              <p className="text-[20px] font-bold font-mono tabular-nums text-[#151922] mt-0.5">
                ₹{formatCurrency(sessionBudget!)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#697386]">
                Cart Total
              </p>
              <p
                className={`text-[20px] font-bold font-mono tabular-nums mt-0.5 ${
                  isOver
                    ? 'text-[#DE5252]'
                    : isWarning
                    ? 'text-[#C7851F]'
                    : 'text-[#15966B]'
                }`}
              >
                ₹{formatCurrency(cartTotal)}
              </p>
            </div>
          </div>

          <div className="h-2 w-full bg-[#F1F3F6] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isOver
                  ? 'bg-[#DE5252]'
                  : isWarning
                  ? 'bg-[#C7851F]'
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
                  ? 'text-[#C7851F]'
                  : 'text-[#15966B]'
              }`}
            >
              {isOver ? (
                <AlertOctagon className="w-4 h-4 shrink-0" strokeWidth={2.1} />
              ) : (
                <Check className="w-4 h-4 shrink-0" strokeWidth={2.1} />
              )}
              <span className="text-[12.5px] font-semibold">
                {isOver
                  ? `OVER LIMIT by ₹${formatCurrency(cartTotal - sessionBudget!)}`
                  : isWarning
                  ? `₹${formatCurrency(sessionBudget! - cartTotal)} remaining — caution`
                  : `₹${formatCurrency(sessionBudget! - cartTotal)} remaining`}
              </span>
            </div>
            <span
              className={`text-[12px] font-semibold font-mono tabular-nums ${
                isOver
                  ? 'text-[#DE5252]'
                  : isWarning
                  ? 'text-[#C7851F]'
                  : 'text-[#15966B]'
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
