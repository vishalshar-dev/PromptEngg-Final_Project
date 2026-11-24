import { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Check,
  Users,
  UserPlus,
  ShoppingBag,
  AlertCircle,
  Split,
  ShieldCheck,
} from 'lucide-react';
import {
  useAppStore,
  type SplitMethod,
} from '../../store/useStore';
import { SELF_PERSON_ID } from '../../types/models';
import { formatCurrencyExact, formatQuantity } from '../../utils/categoryStyles';
import { buildCheckoutBreakdown } from '../../utils/martEngine';
import { computeBrokeModeStatus } from '../../utils/warRoomEngine';
import {
  calculateEqualShares,
  validateAndBuildShares,
  type SplitParticipantInput,
} from '../../utils/splitLedgerEngine';

interface CheckoutSummaryProps {
  isOpen: boolean;
  defaultSplitEnabled?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function toDateInputValue(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function CheckoutSummary({
  isOpen,
  defaultSplitEnabled = false,
  onClose,
  onSuccess,
}: CheckoutSummaryProps) {
  const items = useAppStore((s) => s.items);
  const people = useAppStore((s) => s.people);
  const transactions = useAppStore((s) => s.transactions);
  const isBrokeMode = useAppStore((s) => s.isBrokeMode);
  const brokeModeConfig = useAppStore((s) => s.brokeModeConfig);
  const addPerson = useAppStore((s) => s.addPerson);
  const checkoutCart = useAppStore((s) => s.checkoutCart);

  const submittingRef = useRef(false);

  const breakdown = useMemo(() => buildCheckoutBreakdown(items), [items]);
  const brokeStatus = useMemo(
    () => computeBrokeModeStatus(transactions, brokeModeConfig),
    [transactions, brokeModeConfig]
  );
  const watchedBasketSpend = useMemo(() => {
    const watched = new Set(
      brokeModeConfig.restrictedCategories.map((c) => c.trim().toLowerCase())
    );
    return breakdown.lines
      .filter((l) => watched.has(l.item.category.trim().toLowerCase()))
      .reduce((sum, l) => sum + l.subtotal, 0);
  }, [breakdown.lines, brokeModeConfig.restrictedCategories]);

  const [splitEnabled, setSplitEnabled] = useState(defaultSplitEnabled);
  const [expenseName, setExpenseName] = useState('');
  const [dateInput, setDateInput] = useState(toDateInputValue());
  const [paidById, setPaidById] = useState<string>(SELF_PERSON_ID);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [selectedIds, setSelectedIds] = useState<string[]>([SELF_PERSON_ID]);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [customPcts, setCustomPcts] = useState<Record<string, string>>({});

  const [addingPerson, setAddingPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonContact, setNewPersonContact] = useState('');
  const [personError, setPersonError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    submittingRef.current = false;
    setSplitEnabled(defaultSplitEnabled);
    setExpenseName(breakdown.summaryTitle);
    setDateInput(toDateInputValue());
    setPaidById(SELF_PERSON_ID);
    setSplitMethod('equal');
    setSelectedIds([SELF_PERSON_ID]);
    setCustomAmounts({});
    setCustomPcts({});
    setAddingPerson(false);
    setNewPersonName('');
    setNewPersonContact('');
    setPersonError(null);
    setSubmitError(null);
  }, [isOpen, defaultSplitEnabled, breakdown.summaryTitle]);

  const allPeopleChoices = useMemo(
    () => [
      { id: SELF_PERSON_ID, name: 'Me (You)' },
      ...people.map((p) => ({ id: p.id, name: p.name })),
    ],
    [people]
  );

  const splitValidation = useMemo(() => {
    if (!splitEnabled) {
      return { ok: true, shares: [], userShare: breakdown.totalAmount, error: undefined };
    }
    const inputs: SplitParticipantInput[] = selectedIds.map((pid) => ({
      personId: pid,
      amount: Number(customAmounts[pid] || 0),
      percentage: Number(customPcts[pid] || 0),
    }));
    const result = validateAndBuildShares(breakdown.totalAmount, splitMethod, paidById, inputs);
    const selfShare =
      result.shares.find((s) => s.personId === SELF_PERSON_ID)?.amount ?? 0;
    return {
      ok: result.valid,
      shares: result.shares,
      userShare: selfShare,
      error: result.error,
    };
  }, [splitEnabled, selectedIds, customAmounts, customPcts, breakdown.totalAmount, splitMethod, paidById]);

  const equalPreview = useMemo(() => {
    return calculateEqualShares(breakdown.totalAmount, selectedIds);
  }, [breakdown.totalAmount, selectedIds]);

  if (!isOpen) return null;

  const toggleParticipant = (pid: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(pid)) {
        if (prev.length <= 1) return prev;
        return prev.filter((id) => id !== pid);
      }
      return [...prev, pid];
    });
  };

  const handleQuickAddPerson = () => {
    const trimmed = newPersonName.trim();
    if (!trimmed) {
      setPersonError('Enter a name');
      return;
    }
    if (
      people.some((p) => p.name.toLowerCase() === trimmed.toLowerCase()) ||
      trimmed.toLowerCase() === 'me'
    ) {
      setPersonError('Person already exists');
      return;
    }
    const created = addPerson(trimmed, newPersonContact.trim() || undefined);
    setSelectedIds((prev) => (prev.includes(created.id) ? prev : [...prev, created.id]));
    setNewPersonName('');
    setNewPersonContact('');
    setPersonError(null);
    setAddingPerson(false);
  };

  const handleConfirmPurchase = () => {
    if (submittingRef.current || breakdown.items.length === 0) return;

    if (splitEnabled) {
      if (selectedIds.length < 2) {
        setSubmitError('Select at least 2 participants to split this purchase.');
        return;
      }
      if (!splitValidation.ok) {
        setSubmitError(splitValidation.error || 'Please fix split amounts.');
        return;
      }
    }

    submittingRef.current = true;
    setSubmitError(null);

    const isoDate = dateInput
      ? new Date(`${dateInput}T12:00:00`).toISOString()
      : new Date().toISOString();

    const ok = splitEnabled
      ? checkoutCart({
          name: expenseName.trim() || breakdown.summaryTitle,
          totalAmount: breakdown.totalAmount,
          category: breakdown.dominantCategory,
          date: isoDate,
          paidById,
          splitMethod,
          participants: splitValidation.shares,
        })
      : checkoutCart();

    if (ok) {
      onSuccess?.();
      onClose();
    } else {
      submittingRef.current = false;
    }
  };

  const categoryEntries = Object.entries(breakdown.categoryTotals);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="fixed inset-0 bg-[var(--backdrop-scrim)] backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-xl max-h-[92vh] flex flex-col bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-t-2xl sm:rounded-2xl shadow-modal animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary-soft)] text-[var(--accent-ink)] flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">Checkout Summary</h3>
              <p className="text-[12px] text-[var(--text-secondary)]">
                Review itemized basket &amp; record expenditure
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout summary"
            className="w-9 h-9 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 space-y-4 overflow-y-auto scrollbar-thin">
          {/* Itemized List */}
          <div className="surface-well rounded-xl p-4 space-y-2.5">
            <p className="text-[12px] font-medium text-[var(--text-secondary)]">
              Items ({formatQuantity(breakdown.totalCount)} units across {breakdown.lines.length}{' '}
              {breakdown.lines.length === 1 ? 'line' : 'lines'})
            </p>
            <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin pr-1">
              {breakdown.lines.map((line) => (
                <div
                  key={line.lineKey}
                  className="flex items-center justify-between text-[12.5px] gap-2"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-[var(--text-primary)]">
                      {line.item.name}
                      {line.variantLabel ? ` · ${line.variantLabel}` : ''}
                    </span>
                    <span className="text-[var(--text-secondary)] font-mono ml-2 tabular-nums">
                      {formatQuantity(line.quantity)} × ₹{formatCurrencyExact(line.price)} ({line.unit})
                    </span>
                  </div>
                  <span className="font-mono font-semibold text-[var(--text-primary)] tabular-nums flex-shrink-0">
                    ₹{formatCurrencyExact(line.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-wrap gap-2 text-[12px] text-[var(--text-secondary)]">
              {categoryEntries.map(([cat, amt], i) => (
                <span key={cat} className="tabular-nums">
                  {i > 0 && <span className="mr-2 text-[var(--border-strong)]" aria-hidden="true">·</span>}
                  {cat}: <span className="font-mono font-medium text-[var(--text-primary)]">₹{formatCurrencyExact(amt)}</span>
                </span>
              ))}
            </div>

            <div className="pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between">
              <span className="text-[12px] font-medium text-[var(--text-secondary)]">
                Cart Total
              </span>
              <span className="text-[20px] font-semibold font-mono text-[var(--text-primary)] tabular-nums">
                ₹{formatCurrencyExact(breakdown.totalAmount)}
              </span>
            </div>
          </div>

          {/* Optional Expense Splitting */}
          <div className="border-t border-[var(--border-subtle)] pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary-soft)] text-[var(--accent-ink)] flex items-center justify-center shrink-0">
                  <Split className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">Split This Purchase</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Track shared balances &amp; charge only your personal share to budget
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={splitEnabled}
                aria-label="Toggle split expense"
                onClick={() => setSplitEnabled((v) => !v)}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 ${
                  splitEnabled ? 'bg-[var(--accent-primary)]' : 'bg-[var(--border-strong)]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                    splitEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {splitEnabled && (
              <div className="space-y-3 pt-3 border-t border-[var(--border-subtle)] animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-xs font-semibold text-[var(--text-tertiary)] block mb-1">
                      Expense Label
                    </label>
                    <input
                      type="text"
                      value={expenseName}
                      onChange={(e) => setExpenseName(e.target.value)}
                      className="input-field w-full py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--text-tertiary)] block mb-1">
                      Paid By
                    </label>
                    <select
                      aria-label="Paid by"
                      value={paidById}
                      onChange={(e) => setPaidById(e.target.value)}
                      className="input-field w-full py-2 text-xs"
                    >
                      {allPeopleChoices.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Participants */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-[var(--text-tertiary)] flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> Participants ({selectedIds.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setAddingPerson((v) => !v)}
                      className="text-xs font-semibold text-[var(--accent-ink)] hover:underline flex items-center gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Add Person
                    </button>
                  </div>

                  {addingPerson && (
                    <div className="surface-well rounded-xl p-3 mb-2 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Friend name"
                          aria-label="New participant name"
                          value={newPersonName}
                          onChange={(e) => setNewPersonName(e.target.value)}
                          className="input-field w-full py-1.5 text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Phone or email (optional)"
                          value={newPersonContact}
                          onChange={(e) => setNewPersonContact(e.target.value)}
                          className="input-field w-full py-1.5 text-xs"
                        />
                      </div>
                      {personError && (
                        <p className="text-xs text-[var(--accent-danger)]">{personError}</p>
                      )}
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setAddingPerson(false)}
                          className="btn-secondary py-1 px-2.5 text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleQuickAddPerson}
                          className="btn-primary py-1 px-3 text-xs"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {allPeopleChoices.map((p) => {
                      const active = selectedIds.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggleParticipant(p.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                            active
                              ? 'bg-[var(--accent-primary-soft)] border-[var(--accent-border)] text-[var(--accent-ink)]'
                              : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Split Method */}
                <div className="grid grid-cols-3 gap-1.5">
                  {(['equal', 'custom', 'percentage'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSplitMethod(m)}
                      className={`py-1.5 rounded-lg text-xs font-semibold capitalize border transition-colors ${
                        splitMethod === m
                          ? 'bg-[var(--accent-primary-soft)] border-[var(--accent-border)] text-[var(--accent-ink)]'
                          : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                {/* Per-person share breakdown */}
                <div className="space-y-1.5 surface-well rounded-xl p-3">
                  {selectedIds.map((pid) => {
                    const label =
                      allPeopleChoices.find((c) => c.id === pid)?.name ?? 'Participant';
                    const equalAmt =
                      equalPreview.find((s) => s.personId === pid)?.amount ?? 0;

                    return (
                      <div
                        key={pid}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="font-semibold text-[var(--text-primary)]">{label}</span>
                        {splitMethod === 'equal' ? (
                          <span className="font-mono font-bold text-[var(--accent-ink)] tabular-nums">
                            ₹{formatCurrencyExact(equalAmt)}
                          </span>
                        ) : splitMethod === 'custom' ? (
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="₹0"
                            value={customAmounts[pid] ?? ''}
                            onChange={(e) =>
                              setCustomAmounts((prev) => ({
                                ...prev,
                                [pid]: e.target.value,
                              }))
                            }
                            className="w-24 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded px-2 py-1 text-right font-mono text-[var(--text-primary)]"
                          />
                        ) : (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="any"
                              placeholder="0"
                              value={customPcts[pid] ?? ''}
                              onChange={(e) =>
                                setCustomPcts((prev) => ({
                                  ...prev,
                                  [pid]: e.target.value,
                                }))
                              }
                              className="w-16 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded px-2 py-1 text-right font-mono text-[var(--text-primary)]"
                            />
                            <span className="text-[var(--text-secondary)]">%</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {!splitValidation.ok && splitValidation.error && (
                  <p className="text-xs text-[var(--accent-danger)] flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {splitValidation.error}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Personal Budget Impact */}
          <div className="rounded-xl p-3.5 bg-[var(--accent-success-soft)] border border-[var(--accent-success-border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[var(--accent-success-ink)] flex-shrink-0" />
              <span className="text-xs font-semibold text-[var(--accent-success-ink)]">
                {splitEnabled
                  ? 'Your personal share charged to budget'
                  : 'Amount charged to monthly budget'}
              </span>
            </div>
            <span className="text-base font-bold font-mono text-[var(--accent-success-ink)] tabular-nums">
              ₹
              {formatCurrencyExact(
                splitEnabled ? splitValidation.userShare : breakdown.totalAmount
              )}
            </span>
          </div>

          {isBrokeMode &&
            (watchedBasketSpend > 0 ||
              brokeStatus.spent + (splitEnabled ? splitValidation.userShare : breakdown.totalAmount) >
                brokeStatus.limit) && (
              <div className="rounded-xl p-3.5 bg-[var(--accent-warning-soft)] border border-[var(--accent-warning-border)] space-y-1">
                <p className="text-xs font-bold text-[var(--accent-warning-ink)] flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  Broke Mode Accountability Notice
                </p>
                <p className="text-xs text-[var(--accent-warning-ink)] leading-relaxed">
                  {watchedBasketSpend > 0
                    ? `Cart includes ₹${formatCurrencyExact(watchedBasketSpend)} in watched discretionary categories. Remaining non-essential allowance: ₹${formatCurrencyExact(brokeStatus.nonEssentialRemaining)}. `
                    : ''}
                  {brokeStatus.limit > 0 &&
                  brokeStatus.spent +
                    (splitEnabled ? splitValidation.userShare : breakdown.totalAmount) >
                    brokeStatus.limit
                    ? `This purchase exceeds your ${brokeStatus.period} allowance (₹${formatCurrencyExact(brokeStatus.remaining)} left).`
                    : ''}
                </p>
              </div>
            )}

          {submitError && (
            <p className="text-xs text-[var(--accent-danger)] flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {submitError}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)] flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary px-4 py-3 text-xs"
          >
            Back to Cart
          </button>
          <button
            type="button"
            onClick={handleConfirmPurchase}
            disabled={breakdown.items.length === 0}
            className="flex-1 btn-primary py-3 text-sm disabled:bg-[var(--bg-well)] disabled:text-[var(--text-muted)]"
          >
            <Check className="w-4 h-4" strokeWidth={2.5} />
            Confirm Purchase
          </button>
        </div>
      </div>
    </div>
  );
}
