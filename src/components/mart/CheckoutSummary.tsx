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
import { formatCurrencyExact, getCategoryStyle } from '../../utils/categoryStyles';
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
    return breakdown.items
      .filter((i) => watched.has(i.category.trim().toLowerCase()))
      .reduce((sum, i) => sum + i.price * i.quantity, 0);
  }, [breakdown.items, brokeModeConfig.restrictedCategories]);

  const [splitEnabled, setSplitEnabled] = useState(defaultSplitEnabled);
  const [expenseName, setExpenseName] = useState('');
  const [dateInput, setDateInput] = useState(toDateInputValue());
  const [paidById, setPaidById] = useState<string>(SELF_PERSON_ID);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [selectedIds, setSelectedIds] = useState<string[]>([SELF_PERSON_ID]);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [customPcts, setCustomPcts] = useState<Record<string, string>>({});

  // Quick add person inline
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
        className="fixed inset-0 bg-black/75 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-xl max-h-[92vh] flex flex-col glass-strong border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <ShoppingBag className="w-4 h-4" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Checkout Summary</h3>
              <p className="text-[11px] text-zinc-500">
                Review itemized basket & record expenditure
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout summary"
            className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 space-y-4 overflow-y-auto scrollbar-thin">
          {/* Itemized List */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3.5 space-y-2">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">
              Items ({breakdown.totalCount} units)
            </p>
            <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin pr-1">
              {breakdown.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-xs gap-2"
                >
                  <div className="min-w-0">
                    <span className="font-bold text-white">{item.name}</span>
                    <span className="text-zinc-500 font-mono ml-2">
                      {item.quantity} × ₹{formatCurrencyExact(item.price)} ({item.unit || '1 unit'})
                    </span>
                  </div>
                  <span className="font-mono font-extrabold text-zinc-200 tabular-nums">
                    ₹{formatCurrencyExact(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-white/[0.06] flex flex-wrap gap-1.5">
              {categoryEntries.map(([cat, amt]) => {
                const st = getCategoryStyle(cat);
                return (
                  <span
                    key={cat}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${st.bg} ${st.text} ${st.border}`}
                  >
                    {cat}: ₹{formatCurrencyExact(amt)}
                  </span>
                );
              })}
            </div>

            <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Cart Total
              </span>
              <span className="text-xl font-extrabold font-mono text-white tabular-nums">
                ₹{formatCurrencyExact(breakdown.totalAmount)}
              </span>
            </div>
          </div>

          {/* Optional Expense Splitting */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Split className="w-4 h-4 text-brand-400" strokeWidth={2.4} />
                <div>
                  <p className="text-sm font-extrabold text-white">Split This Purchase</p>
                  <p className="text-[11px] text-zinc-500">
                    Track shared balances & charge only your personal share to budget
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={splitEnabled}
                aria-label="Toggle split expense"
                onClick={() => setSplitEnabled((v) => !v)}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
                  splitEnabled ? 'bg-brand-500' : 'bg-white/[0.12]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    splitEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {splitEnabled && (
              <div className="space-y-3 pt-2 border-t border-white/[0.06] animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                      Expense Label
                    </label>
                    <input
                      type="text"
                      value={expenseName}
                      onChange={(e) => setExpenseName(e.target.value)}
                      className="w-full bg-ink-900 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                      Paid By
                    </label>
                    <select
                      aria-label="Paid by"
                      value={paidById}
                      onChange={(e) => setPaidById(e.target.value)}
                      className="w-full bg-ink-900 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none"
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
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                      <Users className="w-3 h-3" /> Participants ({selectedIds.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setAddingPerson((v) => !v)}
                      className="text-[11px] font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1"
                    >
                      <UserPlus className="w-3 h-3" />
                      Add Person
                    </button>
                  </div>

                  {addingPerson && (
                    <div className="bg-ink-900 border border-white/[0.08] rounded-xl p-2.5 mb-2 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Friend name"
                          aria-label="New participant name"
                          value={newPersonName}
                          onChange={(e) => setNewPersonName(e.target.value)}
                          className="bg-ink-950 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Phone or email (optional)"
                          value={newPersonContact}
                          onChange={(e) => setNewPersonContact(e.target.value)}
                          className="bg-ink-950 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                        />
                      </div>
                      {personError && (
                        <p className="text-[11px] text-red-400">{personError}</p>
                      )}
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setAddingPerson(false)}
                          className="px-2.5 py-1 rounded-lg bg-white/[0.06] text-[11px] font-bold text-zinc-400"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleQuickAddPerson}
                          className="px-3 py-1 rounded-lg bg-brand-500 text-[11px] font-extrabold text-ink-950"
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
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            active
                              ? 'bg-brand-500/20 border-brand-500/40 text-brand-300'
                              : 'bg-ink-900 border-white/[0.06] text-zinc-400 hover:text-white'
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
                      className={`py-1.5 rounded-lg text-xs font-bold capitalize border ${
                        splitMethod === m
                          ? 'bg-brand-500/20 border-brand-500/40 text-brand-300'
                          : 'bg-ink-900 border-white/[0.06] text-zinc-400'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                {/* Per-person share breakdown */}
                <div className="space-y-1.5 bg-ink-900/70 rounded-xl p-2.5 border border-white/[0.05]">
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
                        <span className="font-bold text-zinc-200">{label}</span>
                        {splitMethod === 'equal' ? (
                          <span className="font-mono font-bold text-brand-400">
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
                            className="w-24 bg-ink-950 border border-white/[0.1] rounded px-2 py-1 text-right font-mono text-white"
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
                              className="w-16 bg-ink-950 border border-white/[0.1] rounded px-2 py-1 text-right font-mono text-white"
                            />
                            <span className="text-zinc-400">%</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {!splitValidation.ok && splitValidation.error && (
                  <p className="text-xs text-red-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {splitValidation.error}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Personal Budget Impact */}
          <div className="rounded-xl p-3 bg-brand-500/10 border border-brand-500/25 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-400 flex-shrink-0" />
              <span className="text-xs font-bold text-brand-300">
                {splitEnabled
                  ? 'Your personal share charged to budget'
                  : 'Amount charged to monthly budget'}
              </span>
            </div>
            <span className="text-base font-extrabold font-mono text-brand-400 tabular-nums">
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
              <div className="rounded-xl p-3 bg-amber-500/10 border border-amber-500/30 space-y-1">
                <p className="text-xs font-extrabold text-amber-300 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  Broke Mode Accountability Notice
                </p>
                <p className="text-[11px] text-amber-200/85 leading-relaxed">
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
            <p className="text-xs text-red-400 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {submitError}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-ink-950/70 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold text-zinc-300"
          >
            Back to Cart
          </button>
          <button
            type="button"
            onClick={handleConfirmPurchase}
            disabled={breakdown.items.length === 0}
            className="flex-1 bg-brand-500 hover:bg-brand-400 disabled:bg-white/[0.04] disabled:text-zinc-600 text-ink-950 py-3 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all"
          >
            <Check className="w-4 h-4" strokeWidth={3} />
            Confirm Purchase
          </button>
        </div>
      </div>
    </div>
  );
}
