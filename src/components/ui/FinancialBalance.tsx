import { useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { formatCurrency, formatCurrencyExact } from '../../utils/categoryStyles';
import { ProgressBar } from './ProgressBar';

interface FinancialBalanceProps {
  remaining: number;
  totalBudget: number;
  totalSpent: number;
  utilizationPct: number;
  activeTxCount: number;
  onSaveBudget: (newBudget: number) => void;
}

export function FinancialBalance({
  remaining,
  totalBudget,
  totalSpent,
  utilizationPct,
  activeTxCount,
  onSaveBudget,
}: FinancialBalanceProps) {
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState(String(totalBudget));
  const [budgetError, setBudgetError] = useState<string | null>(null);

  const safeBudget = Math.max(0, totalBudget);
  const status =
    safeBudget > 0 && remaining < 0
      ? {
          label: 'Budget exceeded',
          tone: 'danger' as const,
          textClass: 'text-[#DE5252]',
          balanceClass: 'text-[#DE5252]',
        }
      : utilizationPct >= 80
        ? {
            label: 'Approaching limit',
            tone: 'warning' as const,
            textClass: 'text-[#C7851F]',
            balanceClass: 'text-[#C7851F]',
          }
        : {
            label: 'On track',
            tone: 'success' as const,
            textClass: 'text-[#15966B]',
            balanceClass: 'text-[#151922]',
          };

  const handleOpenEdit = () => {
    setBudgetDraft(String(totalBudget));
    setBudgetError(null);
    setEditingBudget(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(budgetDraft);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setBudgetError('Enter a valid amount greater than ₹0.');
      return;
    }
    onSaveBudget(Math.round(parsed));
    setBudgetError(null);
    setEditingBudget(false);
  };

  return (
    <section
      aria-label="Budget overview"
      className="bg-white border border-[#E7EAF0] rounded-2xl p-6 sm:p-7"
    >
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-[12.5px]">
            <span className="font-medium text-[#697386]">Remaining balance</span>
            <span aria-hidden="true" className="text-[#D5DBE5]">
              ·
            </span>
            <span className={`font-semibold ${status.textClass}`}>
              {status.label}
            </span>
          </div>

          <p
            data-testid="overview-remaining-balance"
            className={`text-[36px] sm:text-[44px] font-bold font-mono tabular-nums tracking-tight leading-none mt-2 ${status.balanceClass}`}
          >
            {remaining < 0 ? '-' : ''}₹{formatCurrencyExact(Math.abs(remaining))}
          </p>

          <p className="text-[13px] text-[#697386] mt-2">
            {activeTxCount === 0
              ? 'No active expenses recorded this period.'
              : `${activeTxCount} active expense${
                  activeTxCount === 1 ? '' : 's'
                } recorded this period`}
          </p>
        </div>

        {/* Inline Secondary Metrics (separated by subtle vertical hairlines) */}
        <div className="grid grid-cols-3 gap-5 sm:gap-8 pt-5 lg:pt-0 border-t lg:border-t-0 lg:border-l border-[#E7EAF0] lg:pl-8">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-medium text-[#697386]">
                Monthly budget
              </span>
              {!editingBudget && (
                <button
                  type="button"
                  onClick={handleOpenEdit}
                  aria-label="Edit total budget"
                  className="p-1 rounded-md text-[#697386] hover:text-[#151922] hover:bg-[#F1F3F6] transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
            </div>

            {!editingBudget ? (
              <p
                data-testid="overview-total-budget"
                className="text-[18px] sm:text-[20px] font-semibold font-mono tabular-nums text-[#151922] mt-1"
              >
                ₹{formatCurrency(safeBudget)}
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="mt-1 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    aria-label="Monthly budget amount"
                    value={budgetDraft}
                    onChange={(e) => setBudgetDraft(e.target.value)}
                    autoFocus
                    className="input-field w-28 px-2.5 py-1 text-[14px] font-mono font-semibold tabular-nums"
                  />
                  <button
                    type="submit"
                    aria-label="Save budget"
                    className="w-7 h-7 rounded-lg bg-[#365FE8] hover:bg-[#294FCC] text-white flex items-center justify-center shrink-0"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Cancel budget edit"
                    onClick={() => {
                      setEditingBudget(false);
                      setBudgetError(null);
                    }}
                    className="w-7 h-7 rounded-lg bg-[#F1F3F6] hover:bg-[#E7EAF0] text-[#697386] flex items-center justify-center shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {budgetError && (
                  <p className="text-[11px] font-medium text-[#DE5252]">
                    {budgetError}
                  </p>
                )}
              </form>
            )}
          </div>

          <div>
            <p className="text-[12px] font-medium text-[#697386]">Spent</p>
            <p
              data-testid="overview-total-spent"
              className="text-[18px] sm:text-[20px] font-semibold font-mono tabular-nums text-[#151922] mt-1"
            >
              ₹{formatCurrencyExact(totalSpent)}
            </p>
          </div>

          <div>
            <p className="text-[12px] font-medium text-[#697386]">Utilization</p>
            <p
              data-testid="overview-utilization"
              className="text-[18px] sm:text-[20px] font-semibold font-mono tabular-nums text-[#151922] mt-1"
            >
              {utilizationPct}%
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <ProgressBar
          value={utilizationPct}
          tone={status.tone}
          size="sm"
          label="Monthly budget utilization"
        />
        <div className="flex items-center justify-between text-[12px] text-[#697386]">
          <span>
            {utilizationPct <= 100
              ? `${Math.max(0, Math.round((100 - utilizationPct) * 10) / 10)}% of monthly allowance available`
              : `Exceeded by ₹${formatCurrencyExact(Math.abs(remaining))}`}
          </span>
          <span className="font-mono tabular-nums">
            ₹{formatCurrencyExact(totalSpent)} / ₹{formatCurrency(safeBudget)}
          </span>
        </div>
      </div>
    </section>
  );
}
