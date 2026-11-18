import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Users,
  UserPlus,
  Check,
  AlertCircle,
  Calendar,
  Tag,
  Split,
} from 'lucide-react';
import {
  SELF_PERSON_ID,
  type SharedExpense,
  type SplitMethod,
  type Transaction,
} from '../../types/models';
import { useAppStore } from '../../store/useStore';
import { formatCurrencyExact } from '../../utils/categoryStyles';
import {
  calculateEqualShares,
  validateAndBuildShares,
  type SplitParticipantInput,
} from '../../utils/splitLedgerEngine';

export interface SplitExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'mart' | 'convert';
  initialExpense?: SharedExpense;
  initialMartData?: {
    name: string;
    totalAmount: number;
    category: string;
  };
  initialConvertTx?: Transaction;
  defaultSplitEnabled?: boolean;
  onComplete?: () => void;
}

function toDateInputValue(isoString?: string): string {
  const d = isoString ? new Date(isoString) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateInputToIso(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  const now = new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return now.toISOString();
  const combined = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
  return combined.toISOString();
}

export function SplitExpenseModal({
  isOpen,
  onClose,
  mode,
  initialExpense,
  initialMartData,
  initialConvertTx,
  defaultSplitEnabled = true,
  onComplete,
}: SplitExpenseModalProps) {
  const people = useAppStore((s) => s.people);
  const categories = useAppStore((s) => s.categories);
  const addPerson = useAppStore((s) => s.addPerson);
  const addTransaction = useAppStore((s) => s.addTransaction);
  const addSharedExpense = useAppStore((s) => s.addSharedExpense);
  const updateSharedExpense = useAppStore((s) => s.updateSharedExpense);
  const checkoutCart = useAppStore((s) => s.checkoutCart);
  const convertTransactionToSplit = useAppStore((s) => s.convertTransactionToSplit);

  const [splitEnabled, setSplitEnabled] = useState(defaultSplitEnabled);
  const [name, setName] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [category, setCategory] = useState(categories[0] ?? 'Groceries');
  const [dateInput, setDateInput] = useState(toDateInputValue());
  const [paidById, setPaidById] = useState<string>(SELF_PERSON_ID);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');

  const [selectedIds, setSelectedIds] = useState<string[]>([SELF_PERSON_ID]);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [customPcts, setCustomPcts] = useState<Record<string, string>>({});

  const [showNewPerson, setShowNewPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonContact, setNewPersonContact] = useState('');
  const [personError, setPersonError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setShowNewPerson(false);
    setNewPersonName('');
    setNewPersonContact('');
    setPersonError(null);

    if (mode === 'edit' && initialExpense) {
      setSplitEnabled(true);
      setName(initialExpense.name);
      setAmountInput(String(initialExpense.totalAmount));
      setCategory(initialExpense.category || categories[0] || 'Groceries');
      setDateInput(toDateInputValue(initialExpense.date));
      setPaidById(initialExpense.paidById);
      setSplitMethod(initialExpense.splitMethod);
      const ids = initialExpense.participants.map((p) => p.personId);
      setSelectedIds(ids);

      const amtMap: Record<string, string> = {};
      const pctMap: Record<string, string> = {};
      for (const p of initialExpense.participants) {
        amtMap[p.personId] = String(p.amount);
        if (typeof p.percentage === 'number') {
          pctMap[p.personId] = String(p.percentage);
        } else if (initialExpense.totalAmount > 0) {
          pctMap[p.personId] = String(
            Math.round((p.amount / initialExpense.totalAmount) * 10000) / 100
          );
        }
      }
      setCustomAmounts(amtMap);
      setCustomPcts(pctMap);
      return;
    }

    if (mode === 'mart' && initialMartData) {
      setSplitEnabled(true);
      setName(initialMartData.name);
      setAmountInput(String(initialMartData.totalAmount));
      setCategory(initialMartData.category || 'Groceries');
      setDateInput(toDateInputValue());
      setPaidById(SELF_PERSON_ID);
      setSplitMethod('equal');
      const initialParticipants = [
        SELF_PERSON_ID,
        ...people.slice(0, 2).map((p) => p.id),
      ];
      setSelectedIds(initialParticipants);
      setCustomAmounts({});
      setCustomPcts({});
      return;
    }

    if (mode === 'convert' && initialConvertTx) {
      setSplitEnabled(true);
      setName(initialConvertTx.name);
      setAmountInput(String(initialConvertTx.amount));
      setCategory(initialConvertTx.category || 'Groceries');
      setDateInput(toDateInputValue(initialConvertTx.timestamp));
      setPaidById(SELF_PERSON_ID);
      setSplitMethod('equal');
      const initialParticipants = [
        SELF_PERSON_ID,
        ...(people[0] ? [people[0].id] : []),
      ];
      setSelectedIds(initialParticipants);
      setCustomAmounts({});
      setCustomPcts({});
      return;
    }

    setSplitEnabled(defaultSplitEnabled);
    setName('');
    setAmountInput('');
    setCategory(categories[0] ?? 'Groceries');
    setDateInput(toDateInputValue());
    setPaidById(SELF_PERSON_ID);
    setSplitMethod('equal');
    setSelectedIds([SELF_PERSON_ID, ...(people[0] ? [people[0].id] : [])]);
    setCustomAmounts({});
    setCustomPcts({});
  }, [isOpen, mode, initialExpense, initialMartData, initialConvertTx, defaultSplitEnabled, categories, people]);

  const totalAmount = Number(amountInput) || 0;

  const handleSwitchMethod = (nextMethod: SplitMethod) => {
    setSplitMethod(nextMethod);
    if (nextMethod === 'custom' && selectedIds.length > 0 && totalAmount > 0) {
      const hasAnyCustom = selectedIds.some((id) => Number(customAmounts[id]) > 0);
      if (!hasAnyCustom) {
        const equal = calculateEqualShares(totalAmount, selectedIds);
        const nextMap: Record<string, string> = {};
        for (const s of equal) nextMap[s.personId] = String(s.amount);
        setCustomAmounts(nextMap);
      }
    }
    if (nextMethod === 'percentage' && selectedIds.length > 0) {
      const hasAnyPct = selectedIds.some((id) => Number(customPcts[id]) > 0);
      if (!hasAnyPct) {
        const base = Math.floor((10000 / selectedIds.length)) / 100;
        const nextMap: Record<string, string> = {};
        let assigned = 0;
        selectedIds.forEach((id, idx) => {
          if (idx === selectedIds.length - 1) {
            nextMap[id] = String(Math.round((100 - assigned) * 100) / 100);
          } else {
            nextMap[id] = String(base);
            assigned += base;
          }
        });
        setCustomPcts(nextMap);
      }
    }
  };

  const toggleParticipant = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleQuickAddPerson = () => {
    const trimmed = newPersonName.trim();
    if (!trimmed) {
      setPersonError('Person name is required.');
      return;
    }
    const created = addPerson(trimmed, newPersonContact);
    setSelectedIds((prev) => (prev.includes(created.id) ? prev : [...prev, created.id]));
    setNewPersonName('');
    setNewPersonContact('');
    setPersonError(null);
    setShowNewPerson(false);
  };

  const participantInputs: SplitParticipantInput[] = useMemo(() => {
    return selectedIds.map((id) => ({
      personId: id,
      amount: Number(customAmounts[id]) || 0,
      percentage: Number(customPcts[id]) || 0,
    }));
  }, [selectedIds, customAmounts, customPcts]);

  const splitValidation = useMemo(() => {
    if (!splitEnabled) return null;
    return validateAndBuildShares(
      totalAmount,
      splitMethod,
      paidById,
      participantInputs
    );
  }, [splitEnabled, totalAmount, splitMethod, paidById, participantInputs]);

  const personLabelMap = useMemo(() => {
    const map: Record<string, string> = { [SELF_PERSON_ID]: 'You' };
    for (const p of people) map[p.id] = p.name;
    return map;
  }, [people]);

  if (!isOpen) return null;

  const canSubmit =
    name.trim().length > 0 &&
    totalAmount > 0 &&
    (!splitEnabled || Boolean(splitValidation?.valid));

  const userSharePreview = splitValidation?.shares.find(
    (s) => s.personId === SELF_PERSON_ID
  )?.amount ?? 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const isoDate = dateInputToIso(dateInput);

    if (!splitEnabled) {
      if (mode === 'mart') {
        checkoutCart();
      } else {
        addTransaction({
          name: name.trim(),
          amount: Math.round(totalAmount * 100) / 100,
          category,
          timestamp: isoDate,
        });
      }
      onComplete?.();
      onClose();
      return;
    }

    if (!splitValidation?.valid) return;

    const payload = {
      name: name.trim(),
      totalAmount,
      category,
      date: isoDate,
      paidById,
      splitMethod,
      participants: splitValidation.shares,
    };

    if (mode === 'mart') {
      checkoutCart(payload);
    } else if (mode === 'edit' && initialExpense) {
      updateSharedExpense(initialExpense.id, payload);
    } else if (mode === 'convert' && initialConvertTx) {
      convertTransactionToSplit(initialConvertTx.id, payload);
    } else {
      addSharedExpense({ ...payload, source: 'ledger' });
    }

    onComplete?.();
    onClose();
  };

  const title =
    mode === 'edit'
      ? 'Edit Shared Expense'
      : mode === 'mart'
      ? 'Split Mart Checkout'
      : mode === 'convert'
      ? 'Split Transaction'
      : 'Add Expense';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#151922]/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="split-modal-title"
    >
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto scrollbar-thin bg-white border border-[#E7EAF0] rounded-t-3xl sm:rounded-2xl p-5 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EDF2FF] border border-[#D4E0FF] flex items-center justify-center">
              <Split className="w-4 h-4 text-[#365FE8]" strokeWidth={2.2} />
            </div>
            <div>
              <h3 id="split-modal-title" className="text-base font-bold text-[#151922]">
                {title}
              </h3>
              <p className="text-xs text-[#697386]">
                {mode === 'mart'
                  ? 'Your budget only counts your personal share'
                  : 'Track personal or multi-person shared expenses'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-xl bg-[#F1F3F6] hover:bg-[#E7EAF0] flex items-center justify-center text-[#697386] hover:text-[#151922] transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={2.2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Expense Name */}
          <div>
            <label
              htmlFor="expense-name-input"
              className="block text-[11px] font-semibold uppercase tracking-wider text-[#697386] mb-1.5"
            >
              Expense Name
            </label>
            <input
              id="expense-name-input"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Quick Mart Groceries, Dinner, Uber"
              className="input-field w-full px-3.5 py-2.5 text-sm"
            />
          </div>

          {/* Amount + Date + Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label
                htmlFor="expense-amount-input"
                className="block text-[11px] font-semibold uppercase tracking-wider text-[#697386] mb-1.5"
              >
                Total Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#697386]">
                  ₹
                </span>
                <input
                  id="expense-amount-input"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  readOnly={mode === 'mart'}
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="0.00"
                  className={`input-field w-full pl-7 pr-3 py-2.5 text-sm font-mono font-bold ${
                    mode === 'mart' ? 'opacity-80 cursor-not-allowed bg-[#F7F8FA]' : ''
                  }`}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="expense-date-input"
                className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[#697386] mb-1.5"
              >
                <Calendar className="w-3 h-3" />
                Date
              </label>
              <input
                id="expense-date-input"
                type="date"
                required
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="input-field w-full px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="expense-category-select"
                className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[#697386] mb-1.5"
              >
                <Tag className="w-3 h-3" />
                Category
              </label>
              <select
                id="expense-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-field w-full px-3 py-2.5 text-sm"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Optional Split Expense Toggle */}
          {mode !== 'edit' && mode !== 'convert' && (
            <div className="flex items-center justify-between bg-[#F7F8FA] border border-[#E7EAF0] rounded-xl px-3.5 py-2.5">
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-[#365FE8]" strokeWidth={2.2} />
                <div>
                  <p className="text-xs font-bold text-[#151922]">Split Expense</p>
                  <p className="text-[11px] text-[#697386]">
                    Share this cost with one or more people
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={splitEnabled}
                aria-label="Split Expense"
                onClick={() => setSplitEnabled((v) => !v)}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
                  splitEnabled ? 'bg-[#365FE8]' : 'bg-[#D5DBE6]'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                    splitEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}

          {/* Split Details */}
          {splitEnabled && (
            <div className="space-y-4 pt-1">
              {/* Who Paid */}
              <div>
                <label
                  htmlFor="paid-by-select"
                  className="block text-[11px] font-semibold uppercase tracking-wider text-[#697386] mb-1.5"
                >
                  Who Paid
                </label>
                <select
                  id="paid-by-select"
                  value={paidById}
                  onChange={(e) => {
                    const nextPayer = e.target.value;
                    setPaidById(nextPayer);
                    if (!selectedIds.includes(nextPayer)) {
                      setSelectedIds((prev) => [...prev, nextPayer]);
                    }
                  }}
                  className="input-field w-full px-3.5 py-2.5 text-sm"
                >
                  <option value={SELF_PERSON_ID}>You (Me)</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Participants + Inline Add Person */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
                    Participants ({selectedIds.length} selected)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowNewPerson((v) => !v)}
                    className="text-xs font-semibold text-[#365FE8] hover:text-[#294FCC] flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" strokeWidth={2.2} />
                    {showNewPerson ? 'Cancel' : 'Add Person'}
                  </button>
                </div>

                {showNewPerson && (
                  <div className="bg-[#EDF2FF] border border-[#D4E0FF] rounded-xl p-3 mb-2.5 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        aria-label="New person name"
                        placeholder="Name (required)"
                        value={newPersonName}
                        onChange={(e) => setNewPersonName(e.target.value)}
                        className="input-field px-3 py-2 text-xs"
                      />
                      <input
                        type="text"
                        aria-label="New person phone or email"
                        placeholder="Phone or email (optional)"
                        value={newPersonContact}
                        onChange={(e) => setNewPersonContact(e.target.value)}
                        className="input-field px-3 py-2 text-xs"
                      />
                    </div>
                    {personError && (
                      <p className="text-xs text-[#DE5252] font-medium">{personError}</p>
                    )}
                    <button
                      type="button"
                      onClick={handleQuickAddPerson}
                      className="btn-primary w-full py-2 text-xs"
                    >
                      Save Person &amp; Add to Split
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => toggleParticipant(SELF_PERSON_ID)}
                    aria-pressed={selectedIds.includes(SELF_PERSON_ID)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                      selectedIds.includes(SELF_PERSON_ID)
                        ? 'bg-[#EDF2FF] text-[#365FE8] border-[#D4E0FF]'
                        : 'bg-[#F7F8FA] text-[#697386] border-[#E7EAF0] hover:text-[#151922]'
                    }`}
                  >
                    {selectedIds.includes(SELF_PERSON_ID) && (
                      <Check className="w-3 h-3" strokeWidth={2.5} />
                    )}
                    You
                  </button>

                  {people.map((person) => {
                    const active = selectedIds.includes(person.id);
                    return (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => toggleParticipant(person.id)}
                        aria-pressed={active}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                          active
                            ? 'bg-[#EDF2FF] text-[#365FE8] border-[#D4E0FF]'
                            : 'bg-[#F7F8FA] text-[#697386] border-[#E7EAF0] hover:text-[#151922]'
                        }`}
                      >
                        {active && <Check className="w-3 h-3" strokeWidth={2.5} />}
                        {person.name}
                      </button>
                    );
                  })}
                </div>

                {people.length === 0 && !showNewPerson && (
                  <p className="text-xs text-[#9E6614] mt-2">
                    No people added yet. Click &ldquo;Add Person&rdquo; above to add friends or roommates.
                  </p>
                )}
              </div>

              {/* Split Method Selector */}
              <div>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#697386] mb-1.5">
                  Split Method
                </span>
                <div className="grid grid-cols-3 gap-1.5 bg-[#F1F3F6] p-1 rounded-xl border border-[#E7EAF0]">
                  {(
                    [
                      { id: 'equal', label: 'Equal' },
                      { id: 'custom', label: 'Custom (₹)' },
                      { id: 'percentage', label: 'Percentage (%)' },
                    ] as const
                  ).map((opt) => {
                    const active = splitMethod === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSwitchMethod(opt.id)}
                        aria-pressed={active}
                        className={`py-2 px-2 rounded-lg text-xs font-semibold transition-colors ${
                          active
                            ? 'bg-[#365FE8] text-white shadow-xs'
                            : 'text-[#697386] hover:text-[#151922]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Participant Share Breakdown */}
              {selectedIds.length > 0 && (
                <div className="surface-subtle p-3 space-y-2">
                  {selectedIds.map((id) => {
                    const computedShare =
                      splitValidation?.shares.find((s) => s.personId === id)?.amount ?? 0;
                    const label = personLabelMap[id] ?? 'Unknown';

                    return (
                      <div
                        key={id}
                        className="flex items-center justify-between gap-3 py-1.5 border-b border-[#E7EAF0] last:border-b-0"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-[#365FE8] shrink-0" />
                          <span className="text-xs font-bold text-[#151922] truncate">
                            {label}
                          </span>
                          {id === paidById && (
                            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-[#E8F7F1] text-[#15966B] border border-[#B7E4D3]">
                              Paid
                            </span>
                          )}
                        </div>

                        {splitMethod === 'equal' && (
                          <span className="text-xs font-bold font-mono tabular-nums text-[#151922]">
                            ₹{formatCurrencyExact(computedShare)}
                          </span>
                        )}

                        {splitMethod === 'custom' && (
                          <div className="relative w-28">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[#697386]">
                              ₹
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              aria-label={`Custom share for ${label}`}
                              value={customAmounts[id] ?? ''}
                              onChange={(e) =>
                                setCustomAmounts((prev) => ({
                                  ...prev,
                                  [id]: e.target.value,
                                }))
                              }
                              placeholder="0"
                              className="input-field w-full pl-6 pr-2 py-1.5 text-xs font-mono font-bold text-right"
                            />
                          </div>
                        )}

                        {splitMethod === 'percentage' && (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-[#697386] tabular-nums">
                              ₹{formatCurrencyExact(computedShare)}
                            </span>
                            <div className="relative w-20">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                aria-label={`Percentage share for ${label}`}
                                value={customPcts[id] ?? ''}
                                onChange={(e) =>
                                  setCustomPcts((prev) => ({
                                    ...prev,
                                    [id]: e.target.value,
                                  }))
                                }
                                placeholder="0"
                                className="input-field w-full pl-2 pr-6 py-1.5 text-xs font-mono font-bold text-right"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#697386]">
                                %
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Validation Status / Summary */}
                  {splitValidation && !splitValidation.valid && (
                    <div
                      role="alert"
                      className="flex items-center gap-2 text-xs font-semibold text-[#DE5252] bg-[#FDECEC] border border-[#F6B8B8] rounded-lg px-2.5 py-2 mt-2"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={2.2} />
                      <span>{splitValidation.error}</span>
                    </div>
                  )}

                  {splitValidation?.valid && (
                    <div className="flex items-center justify-between text-xs pt-1 text-[#697386]">
                      <span>Your budget share:</span>
                      <span className="font-mono font-bold text-[#15966B]">
                        ₹{formatCurrencyExact(userSharePreview)} of ₹
                        {formatCurrencyExact(totalAmount)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1 py-3 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="btn-primary flex-[2] py-3 text-sm flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" strokeWidth={2.5} />
              {mode === 'edit'
                ? 'Save Changes'
                : mode === 'mart'
                ? splitEnabled
                  ? 'Checkout & Split'
                  : 'Checkout'
                : splitEnabled
                ? 'Save Shared Expense'
                : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
