import { useState, useEffect, useMemo } from 'react';
import { X, ArrowRight, Check, AlertCircle, ShieldCheck } from 'lucide-react';
import { SELF_PERSON_ID } from '../../types/models';
import { useAppStore } from '../../store/useStore';
import { formatCurrencyExact } from '../../utils/categoryStyles';
import {
  computeLedgerState,
  getOutstandingDirectionAmount,
  roundCurrency,
} from '../../utils/splitLedgerEngine';

export interface SettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPersonId?: string;
  defaultDirection?: 'i_pay' | 'they_pay';
  defaultAmount?: number;
  defaultExpenseId?: string;
}

function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export function SettlementModal({
  isOpen,
  onClose,
  defaultPersonId,
  defaultDirection = 'i_pay',
  defaultAmount,
  defaultExpenseId,
}: SettlementModalProps) {
  const people = useAppStore((s) => s.people);
  const sharedExpenses = useAppStore((s) => s.sharedExpenses);
  const settlements = useAppStore((s) => s.settlements);
  const recordSettlement = useAppStore((s) => s.recordSettlement);

  const ledger = useMemo(
    () => computeLedgerState(people, sharedExpenses, settlements),
    [people, sharedExpenses, settlements]
  );

  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [direction, setDirection] = useState<'i_pay' | 'they_pay'>('i_pay');
  const [amountInput, setAmountInput] = useState('');
  const [expenseId, setExpenseId] = useState<string>('');
  const [dateInput, setDateInput] = useState(todayDateStr());
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const firstPerson = defaultPersonId || people[0]?.id || '';
    setSelectedPersonId(firstPerson);

    let nextDir = defaultDirection;
    if (firstPerson && !defaultAmount && !defaultExpenseId) {
      const ps = ledger.personSummaries[firstPerson];
      if (ps) {
        if (ps.iOwe > 0 && ps.owedToMe === 0) nextDir = 'i_pay';
        else if (ps.owedToMe > 0 && ps.iOwe === 0) nextDir = 'they_pay';
      }
    }
    setDirection(nextDir);
    setExpenseId(defaultExpenseId ?? '');
    setDateInput(todayDateStr());
    setNote('');
    setConfirming(false);
    setError(null);

    if (typeof defaultAmount === 'number' && defaultAmount > 0) {
      setAmountInput(String(roundCurrency(defaultAmount)));
    } else if (firstPerson) {
      const fromId = nextDir === 'i_pay' ? SELF_PERSON_ID : firstPerson;
      const toId = nextDir === 'i_pay' ? firstPerson : SELF_PERSON_ID;
      const max = getOutstandingDirectionAmount(ledger, fromId, toId);
      setAmountInput(max > 0 ? String(max) : '');
    } else {
      setAmountInput('');
    }
  }, [isOpen, defaultPersonId, defaultDirection, defaultAmount, defaultExpenseId, people, ledger]);

  if (!isOpen) return null;

  const fromPersonId = direction === 'i_pay' ? SELF_PERSON_ID : selectedPersonId;
  const toPersonId = direction === 'i_pay' ? selectedPersonId : SELF_PERSON_ID;
  const maxOutstanding = selectedPersonId
    ? getOutstandingDirectionAmount(ledger, fromPersonId, toPersonId)
    : 0;

  const selectedPerson = people.find((p) => p.id === selectedPersonId);
  const personSummary = selectedPersonId ? ledger.personSummaries[selectedPersonId] : undefined;

  const candidateExpenses = (personSummary?.transactions ?? []).filter((tx) => {
    if (tx.remainingOwed <= 0) return false;
    return direction === 'i_pay' ? tx.direction === 'i_owe' : tx.direction === 'owed_to_me';
  });

  const amountNum = roundCurrency(Number(amountInput) || 0);
  const remainingAfter = Math.max(0, roundCurrency(maxOutstanding - amountNum));

  const handlePersonOrDirectionChange = (
    nextPersonId: string,
    nextDirection: 'i_pay' | 'they_pay'
  ) => {
    setSelectedPersonId(nextPersonId);
    setDirection(nextDirection);
    setExpenseId('');
    setConfirming(false);
    setError(null);
    const fId = nextDirection === 'i_pay' ? SELF_PERSON_ID : nextPersonId;
    const tId = nextDirection === 'i_pay' ? nextPersonId : SELF_PERSON_ID;
    const max = getOutstandingDirectionAmount(ledger, fId, tId);
    setAmountInput(max > 0 ? String(max) : '');
  };

  const handleReview = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedPersonId) {
      setError('Select a person first.');
      return;
    }
    if (amountNum <= 0) {
      setError('Repayment amount must be greater than ₹0.');
      return;
    }
    if (maxOutstanding > 0 && amountNum > maxOutstanding) {
      setError(
        `Amount exceeds outstanding balance of ₹${formatCurrencyExact(maxOutstanding)}.`
      );
      return;
    }
    if (maxOutstanding === 0) {
      setError('No outstanding balance exists in this direction.');
      return;
    }
    setConfirming(true);
  };

  const handleConfirmSave = () => {
    const [y, m, d] = dateInput.split('-').map(Number);
    const now = new Date();
    const dateIso =
      y && m && d
        ? new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds()).toISOString()
        : now.toISOString();

    const result = recordSettlement({
      fromPersonId,
      toPersonId,
      amount: amountNum,
      date: dateIso,
      note,
      expenseId: expenseId || undefined,
    });

    if (!result.ok) {
      setError(result.error ?? 'Could not record repayment.');
      setConfirming(false);
      return;
    }

    onClose();
  };

  const payerLabel = direction === 'i_pay' ? 'You' : selectedPerson?.name ?? 'Person';
  const receiverLabel = direction === 'i_pay' ? selectedPerson?.name ?? 'Person' : 'You';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#151922]/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settlement-modal-title"
    >
      <div className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto scrollbar-thin bg-white border border-[#E7EAF0] rounded-t-3xl sm:rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E8F7F1] border border-[#B7E4D3] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-[#15966B]" strokeWidth={2.2} />
            </div>
            <div>
              <h3 id="settlement-modal-title" className="text-base font-bold text-[#151922]">
                Record Repayment
              </h3>
              <p className="text-xs text-[#697386]">
                Full or partial settlement (preserves history)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settlement modal"
            className="w-8 h-8 rounded-xl bg-[#F1F3F6] hover:bg-[#E7EAF0] flex items-center justify-center text-[#697386] hover:text-[#151922]"
          >
            <X className="w-4 h-4" strokeWidth={2.2} />
          </button>
        </div>

        {people.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-[#697386] font-medium">
              Add a person and a shared expense first to record repayments.
            </p>
          </div>
        ) : confirming ? (
          <div className="space-y-4">
            <div className="bg-[#E8F7F1] border border-[#B7E4D3] rounded-2xl p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#15966B]">
                Confirm Repayment
              </p>
              <div className="flex items-center justify-center gap-3 py-2 text-sm font-bold text-[#151922]">
                <span className="px-3 py-1.5 rounded-lg bg-white border border-[#E7EAF0]">{payerLabel}</span>
                <ArrowRight className="w-4 h-4 text-[#15966B]" />
                <span className="px-3 py-1.5 rounded-lg bg-white border border-[#E7EAF0]">{receiverLabel}</span>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold font-mono text-[#15966B] tabular-nums">
                  ₹{formatCurrencyExact(amountNum)}
                </p>
                <p className="text-xs text-[#697386] mt-1">
                  Outstanding balance will update from{' '}
                  <span className="font-mono font-bold text-[#151922]">
                    ₹{formatCurrencyExact(maxOutstanding)}
                  </span>{' '}
                  to{' '}
                  <span className="font-mono font-bold text-[#15966B]">
                    ₹{formatCurrencyExact(remainingAfter)}
                  </span>
                  .
                </p>
              </div>
              {note.trim() && (
                <p className="text-xs text-[#697386] text-center">Note: {note.trim()}</p>
              )}
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="btn-secondary flex-1 py-3 text-sm"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                className="btn-primary flex-[2] py-3 text-sm flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" strokeWidth={2.5} />
                Confirm Payment
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReview} className="space-y-3.5">
            {/* Select Person */}
            <div>
              <label
                htmlFor="settlement-person-select"
                className="block text-[11px] font-semibold uppercase tracking-wider text-[#697386] mb-1.5"
              >
                Person
              </label>
              <select
                id="settlement-person-select"
                value={selectedPersonId}
                onChange={(e) => handlePersonOrDirectionChange(e.target.value, direction)}
                className="input-field w-full px-3.5 py-2.5 text-sm"
              >
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Who Paid Whom */}
            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#697386] mb-1.5">
                Who Paid Whom
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handlePersonOrDirectionChange(selectedPersonId, 'i_pay')}
                  aria-pressed={direction === 'i_pay'}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-colors ${
                    direction === 'i_pay'
                      ? 'bg-[#FDECEC] text-[#DE5252] border-[#F6B8B8]'
                      : 'bg-[#F7F8FA] text-[#697386] border-[#E7EAF0]'
                  }`}
                >
                  You → {selectedPerson?.name ?? 'Person'}
                </button>
                <button
                  type="button"
                  onClick={() => handlePersonOrDirectionChange(selectedPersonId, 'they_pay')}
                  aria-pressed={direction === 'they_pay'}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-colors ${
                    direction === 'they_pay'
                      ? 'bg-[#E8F7F1] text-[#15966B] border-[#B7E4D3]'
                      : 'bg-[#F7F8FA] text-[#697386] border-[#E7EAF0]'
                  }`}
                >
                  {selectedPerson?.name ?? 'Person'} → You
                </button>
              </div>
              <p className="text-xs text-[#697386] mt-1.5">
                Outstanding in this direction:{' '}
                <span className="font-mono font-bold text-[#151922]">
                  ₹{formatCurrencyExact(maxOutstanding)}
                </span>
              </p>
            </div>

            {/* Optional Specific Expense */}
            {candidateExpenses.length > 0 && (
              <div>
                <label
                  htmlFor="settlement-expense-select"
                  className="block text-[11px] font-semibold uppercase tracking-wider text-[#697386] mb-1.5"
                >
                  Apply To Expense
                </label>
                <select
                  id="settlement-expense-select"
                  value={expenseId}
                  onChange={(e) => {
                    const nextExpId = e.target.value;
                    setExpenseId(nextExpId);
                    if (nextExpId) {
                      const found = candidateExpenses.find((c) => c.expenseId === nextExpId);
                      if (found) setAmountInput(String(found.remainingOwed));
                    } else {
                      setAmountInput(maxOutstanding > 0 ? String(maxOutstanding) : '');
                    }
                  }}
                  className="input-field w-full px-3.5 py-2.5 text-sm"
                >
                  <option value="">General balance (oldest unsettled first)</option>
                  {candidateExpenses.map((tx) => (
                    <option key={tx.expenseId} value={tx.expenseId}>
                      {tx.name} (₹{formatCurrencyExact(tx.remainingOwed)} due)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Amount + Quick Fill */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="settlement-amount-input"
                  className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]"
                >
                  Repayment Amount
                </label>
                {maxOutstanding > 0 && (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setAmountInput(String(roundCurrency(maxOutstanding / 2)))
                      }
                      className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#F1F3F6] hover:bg-[#E7EAF0] text-[#697386]"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmountInput(String(maxOutstanding))}
                      className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#EDF2FF] hover:bg-[#DFE8FF] text-[#365FE8]"
                    >
                      Full (₹{formatCurrencyExact(maxOutstanding)})
                    </button>
                  </div>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#697386]">
                  ₹
                </span>
                <input
                  id="settlement-amount-input"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={amountInput}
                  onChange={(e) => {
                    setAmountInput(e.target.value);
                    setError(null);
                  }}
                  placeholder="0.00"
                  className="input-field w-full pl-8 pr-3.5 py-2.5 text-sm font-mono font-bold"
                />
              </div>
            </div>

            {/* Date + Note */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label
                  htmlFor="settlement-date-input"
                  className="block text-[11px] font-semibold uppercase tracking-wider text-[#697386] mb-1.5"
                >
                  Date
                </label>
                <input
                  id="settlement-date-input"
                  type="date"
                  required
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="input-field w-full px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label
                  htmlFor="settlement-note-input"
                  className="block text-[11px] font-semibold uppercase tracking-wider text-[#697386] mb-1.5"
                >
                  Note (optional)
                </label>
                <input
                  id="settlement-note-input"
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="UPI, Cash, etc."
                  className="input-field w-full px-3 py-2 text-xs"
                />
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-center gap-2 text-xs text-[#DE5252] bg-[#FDECEC] border border-[#F6B8B8] rounded-xl px-3 py-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={maxOutstanding <= 0}
              className="btn-primary w-full py-3 text-sm"
            >
              Review Repayment
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
