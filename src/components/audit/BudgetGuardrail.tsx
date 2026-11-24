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
      className={`surface-card p-5 transition-colors ${
        isOver
          ? 'border-[var(--accent-danger-border)] bg-[var(--accent-danger-soft)]'
          : isWarning
          ? 'border-[var(--accent-warning-border)] bg-[var(--accent-warning-soft)]'
          : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
              isOver
                ? 'bg-[var(--bg-surface)] border-[var(--accent-danger-border)] text-[var(--accent-danger-ink)]'
                : isWarning
                ? 'bg-[var(--bg-surface)] border-[var(--accent-warning-border)] text-[var(--accent-warning-ink)]'
                : 'bg-[var(--accent-primary-soft)] border-[var(--accent-border)] text-[var(--accent-ink)]'
            }`}
          >
            <Gauge className="w-4 h-4" strokeWidth={2.1} />
          </div>
          <div>
            <h3 className="font-display text-[15px] font-semibold text-[var(--text-primary)] tracking-tight">
              Session Budget Guardrail
            </h3>
            <p className="text-[12px] text-[var(--text-secondary)]">
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
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" strokeWidth={2.1} />
          </button>
        )}
      </div>

      {isEditing || !isActive ? (
        <div className="space-y-3">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-[var(--text-secondary)]">
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
              <p className="text-[12px] font-medium text-[var(--text-secondary)]">
                Session Limit
              </p>
              <p className="text-[20px] font-bold font-mono tabular-nums text-[var(--text-primary)] mt-0.5">
                ₹{formatCurrency(sessionBudget!)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[12px] font-medium text-[var(--text-secondary)]">
                Cart Total
              </p>
              <p
                className={`text-[20px] font-bold font-mono tabular-nums mt-0.5 ${
                  isOver
                    ? 'text-[var(--accent-danger-ink)]'
                    : isWarning
                    ? 'text-[var(--accent-warning-ink)]'
                    : 'text-[var(--accent-success-ink)]'
                }`}
              >
                ₹{formatCurrency(cartTotal)}
              </p>
            </div>
          </div>

          <div className="h-2 w-full bg-[var(--bg-well)] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isOver
                  ? 'bg-[var(--accent-danger)]'
                  : isWarning
                  ? 'bg-[var(--accent-warning)]'
                  : 'bg-[var(--accent-success)]'
              }`}
              style={{ width: `${usagePct}%` }}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div
              className={`flex items-center gap-1.5 ${
                isOver
                  ? 'text-[var(--accent-danger-ink)]'
                  : isWarning
                  ? 'text-[var(--accent-warning-ink)]'
                  : 'text-[var(--accent-success-ink)]'
              }`}
            >
              {isOver ? (
                <AlertOctagon className="w-4 h-4 shrink-0" strokeWidth={2.1} />
              ) : (
                <Check className="w-4 h-4 shrink-0" strokeWidth={2.1} />
              )}
              <span className="text-[12.5px] font-semibold tabular-nums">
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
                  ? 'text-[var(--accent-danger-ink)]'
                  : isWarning
                  ? 'text-[var(--accent-warning-ink)]'
                  : 'text-[var(--accent-success-ink)]'
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
