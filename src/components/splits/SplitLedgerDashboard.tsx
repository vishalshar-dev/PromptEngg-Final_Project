import { useMemo, useState } from 'react';
import {
  Users,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Scale,
  Clock,
  ShieldCheck,
  UserPlus,
  ArrowUpDown,
  Pencil,
  Trash2,
  CheckCircle2,
  Receipt,
  ChevronRight,
  History,
  QrCode,
} from 'lucide-react';
import { SELF_PERSON_ID, type SharedExpense } from '../../types/models';
import { useAppStore } from '../../store/useStore';
import { formatCurrencyExact, getCategoryStyle } from '../../utils/categoryStyles';
import {
  computeLedgerState,
  filterAndSortExpenses,
  type LedgerFilter,
  type LedgerSortBy,
  type LedgerSortOrder,
} from '../../utils/splitLedgerEngine';
import { SplitExpenseModal } from './SplitExpenseModal';
import { PeopleManagerModal } from './PeopleManagerModal';
import { SettlementModal } from './SettlementModal';
import { PersonLedgerView } from './PersonLedgerView';
import { UpiRemindModal } from './UpiRemindModal';

export function SplitLedgerDashboard() {
  const people = useAppStore((s) => s.people);
  const sharedExpenses = useAppStore((s) => s.sharedExpenses);
  const settlements = useAppStore((s) => s.settlements);
  const removeSharedExpense = useAppStore((s) => s.removeSharedExpense);
  const removeSettlement = useAppStore((s) => s.removeSettlement);

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [activeSubView, setActiveSubView] = useState<'expenses' | 'repayments'>('expenses');

  const [filter, setFilter] = useState<LedgerFilter>('all');
  const [sortBy, setSortBy] = useState<LedgerSortBy>('date');
  const [sortOrder, setSortOrder] = useState<LedgerSortOrder>('desc');

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<SharedExpense | undefined>(undefined);
  const [peopleModalOpen, setPeopleModalOpen] = useState(false);
  const [settlementModalState, setSettlementModalState] = useState<{
    isOpen: boolean;
    personId?: string;
    direction?: 'i_pay' | 'they_pay';
    amount?: number;
    expenseId?: string;
  }>({ isOpen: false });
  const [upiModalState, setUpiModalState] = useState<{
    isOpen: boolean;
    personId?: string;
    direction?: 'they_pay' | 'i_pay';
  }>({ isOpen: false });

  const [confirmDeleteExpenseId, setConfirmDeleteExpenseId] = useState<string | null>(null);
  const [confirmDeleteSettlementId, setConfirmDeleteSettlementId] = useState<string | null>(null);

  const ledger = useMemo(
    () => computeLedgerState(people, sharedExpenses, settlements),
    [people, sharedExpenses, settlements]
  );

  const filteredExpenses = useMemo(
    () => filterAndSortExpenses(ledger.expenseViews, filter, sortBy, sortOrder),
    [ledger.expenseViews, filter, sortBy, sortOrder]
  );

  const sortedSettlements = useMemo(
    () =>
      [...settlements].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [settlements]
  );

  const openSettle = (opts: {
    personId?: string;
    direction?: 'i_pay' | 'they_pay';
    amount?: number;
    expenseId?: string;
  }) => {
    setSettlementModalState({
      isOpen: true,
      ...opts,
    });
  };

  const openUpiRemind = (opts: {
    personId: string;
    direction: 'they_pay' | 'i_pay';
  }) => {
    setUpiModalState({
      isOpen: true,
      ...opts,
    });
  };

  const activePersonSummary = selectedPersonId
    ? ledger.personSummaries[selectedPersonId]
    : undefined;

  const upiTargetPerson = upiModalState.personId
    ? people.find((p) => p.id === upiModalState.personId) ?? null
    : null;
  const upiTargetSummary = upiModalState.personId
    ? ledger.personSummaries[upiModalState.personId]
    : undefined;

  if (activePersonSummary) {
    return (
      <>
        <PersonLedgerView
          summary={activePersonSummary}
          onBack={() => setSelectedPersonId(null)}
          onOpenSettle={openSettle}
          onOpenUpiRemind={openUpiRemind}
        />
        <SettlementModal
          isOpen={settlementModalState.isOpen}
          onClose={() => setSettlementModalState({ isOpen: false })}
          defaultPersonId={settlementModalState.personId}
          defaultDirection={settlementModalState.direction}
          defaultAmount={settlementModalState.amount}
          defaultExpenseId={settlementModalState.expenseId}
        />
        <UpiRemindModal
          isOpen={upiModalState.isOpen}
          onClose={() => setUpiModalState({ isOpen: false })}
          person={upiTargetPerson}
          summary={upiTargetSummary}
          initialDirection={upiModalState.direction}
          onProceedToSettle={(opts) => openSettle(opts)}
        />
      </>
    );
  }

  const { dashboard } = ledger;

  return (
    <div className="space-y-5">
      {/* Header + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#365FE8]" strokeWidth={2.2} />
          <div>
            <h2 className="text-base font-bold tracking-tight text-[#151922]">
              Shared Expense Splits
            </h2>
            <p className="text-xs text-[#697386]">
              Multi-person balances, shared bills, and repayments
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingExpense(undefined);
              setExpenseModalOpen(true);
            }}
            className="btn-primary px-3.5 py-2 text-xs flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Add Expense
          </button>
          <button
            type="button"
            onClick={() => openSettle({})}
            disabled={people.length === 0 || (dashboard.totalIOwe === 0 && dashboard.totalOwedToMe === 0)}
            className="btn-secondary disabled:opacity-45 disabled:cursor-not-allowed px-3 py-2 text-xs flex items-center gap-1.5 whitespace-nowrap"
          >
            <ShieldCheck className="w-4 h-4 text-[#15966B]" strokeWidth={2.2} />
            Settle Up
          </button>
          <button
            type="button"
            onClick={() => setPeopleModalOpen(true)}
            className="btn-secondary px-3 py-2 text-xs flex items-center gap-1.5 whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4 text-[#697386]" strokeWidth={2.2} />
            People ({people.length})
          </button>
        </div>
      </div>

      {/* 4 Split Dashboard Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="surface-card p-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <ArrowUpRight className="w-4 h-4 text-[#DE5252]" strokeWidth={2.2} />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
              Total I Owe
            </span>
          </div>
          <p
            data-testid="dashboard-total-i-owe"
            className="text-xl font-bold font-mono tabular-nums text-[#DE5252]"
          >
            ₹{formatCurrencyExact(dashboard.totalIOwe)}
          </p>
          <p className="text-[11px] text-[#929BAB] mt-0.5">Payable to others</p>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <ArrowDownLeft className="w-4 h-4 text-[#15966B]" strokeWidth={2.2} />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
              Owed to Me
            </span>
          </div>
          <p
            data-testid="dashboard-total-owed-to-me"
            className="text-xl font-bold font-mono tabular-nums text-[#15966B]"
          >
            ₹{formatCurrencyExact(dashboard.totalOwedToMe)}
          </p>
          <p className="text-[11px] text-[#929BAB] mt-0.5">Receivable from others</p>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Scale className="w-4 h-4 text-[#697386]" strokeWidth={2.2} />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
              Net Balance
            </span>
          </div>
          <p
            data-testid="dashboard-net-balance"
            className={`text-xl font-bold font-mono tabular-nums ${
              dashboard.overallNetBalance > 0
                ? 'text-[#15966B]'
                : dashboard.overallNetBalance < 0
                ? 'text-[#DE5252]'
                : 'text-[#151922]'
            }`}
          >
            {dashboard.overallNetBalance > 0
              ? `+₹${formatCurrencyExact(dashboard.overallNetBalance)}`
              : dashboard.overallNetBalance < 0
              ? `-₹${formatCurrencyExact(Math.abs(dashboard.overallNetBalance))}`
              : '₹0'}
          </p>
          <p className="text-[11px] text-[#929BAB] mt-0.5">
            {dashboard.overallNetBalance > 0
              ? 'Net receivable'
              : dashboard.overallNetBalance < 0
              ? 'Net payable'
              : 'All even'}
          </p>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Clock className="w-4 h-4 text-[#C7851F]" strokeWidth={2.2} />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
              Unsettled Txns
            </span>
          </div>
          <p
            data-testid="dashboard-unsettled-count"
            className="text-xl font-bold font-mono tabular-nums text-[#151922]"
          >
            {dashboard.unsettledCount}
          </p>
          <p className="text-[11px] text-[#929BAB] mt-0.5">
            {dashboard.settledCount} settled of {dashboard.totalSharedCount}
          </p>
        </div>
      </div>

      {/* People Balances Section */}
      <section className="surface-card p-5 space-y-3" aria-label="People Balances">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#151922] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#365FE8]" strokeWidth={2.2} />
            People &amp; Balances
          </h3>
          <button
            type="button"
            onClick={() => setPeopleModalOpen(true)}
            className="text-xs font-semibold text-[#365FE8] hover:text-[#294FCC] flex items-center gap-1"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Manage
          </button>
        </div>

        {people.length === 0 ? (
          <div className="text-center py-6 bg-[#F7F8FA] rounded-xl border border-dashed border-[#D5DBE6]">
            <p className="text-xs font-semibold text-[#151922]">
              No people added yet
            </p>
            <p className="text-xs text-[#697386] mt-1">
              Add friends or roommates to track who owes whom.
            </p>
            <button
              type="button"
              onClick={() => setPeopleModalOpen(true)}
              className="btn-secondary mt-3 text-xs px-3.5 py-2"
            >
              + Add Your First Person
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {people.map((person) => {
              const summary = ledger.personSummaries[person.id];
              const net = summary?.netBalance ?? 0;
              const owedToMe = summary?.owedToMe ?? 0;
              const iOwe = summary?.iOwe ?? 0;

              return (
                <div
                  key={person.id}
                  className="bg-[#F7F8FA] hover:bg-white border border-[#E7EAF0] rounded-xl p-3.5 flex flex-col justify-between gap-2.5 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedPersonId(person.id)}
                    className="text-left w-full group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#151922] group-hover:text-[#365FE8] transition-colors truncate">
                          {person.name}
                        </p>
                        <p className="text-[11px] text-[#697386] truncate">
                          {person.contact || `${summary?.transactions.length ?? 0} shared bills`}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#929BAB] group-hover:text-[#365FE8] shrink-0" />
                    </div>

                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#E7EAF0] text-xs">
                      <span className="text-[#697386] font-medium">Net</span>
                      <span
                        className={`font-mono font-bold ${
                          net > 0
                            ? 'text-[#15966B]'
                            : net < 0
                            ? 'text-[#DE5252]'
                            : 'text-[#697386]'
                        }`}
                      >
                        {net > 0
                          ? `Owes you ₹${formatCurrencyExact(net)}`
                          : net < 0
                          ? `You owe ₹${formatCurrencyExact(Math.abs(net))}`
                          : 'Settled'}
                      </span>
                    </div>
                  </button>

                  {(owedToMe > 0 || iOwe > 0) && (
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <span className="text-[#697386] font-mono tabular-nums">
                        In: ₹{formatCurrencyExact(owedToMe)} · Out: ₹
                        {formatCurrencyExact(iOwe)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            openUpiRemind({
                              personId: person.id,
                              direction: owedToMe >= iOwe ? 'they_pay' : 'i_pay',
                            })
                          }
                          aria-label={`UPI QR and reminder for ${person.name}`}
                          className="font-semibold text-[#151922] hover:text-[#365FE8] bg-white border border-[#E7EAF0] hover:border-[#D4E0FF] px-2 py-1 rounded-lg inline-flex items-center gap-1 whitespace-nowrap"
                        >
                          <QrCode className="w-3 h-3 text-[#365FE8]" />
                          <span>UPI / Remind</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            openSettle({
                              personId: person.id,
                              direction: iOwe >= owedToMe ? 'i_pay' : 'they_pay',
                            })
                          }
                          className="font-semibold text-[#365FE8] hover:text-[#294FCC] bg-[#EDF2FF] border border-[#D4E0FF] px-2.5 py-1 rounded-lg whitespace-nowrap"
                        >
                          Settle
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* History Panel: Shared Expenses vs Repayments */}
      <section className="surface-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex bg-[#F1F3F6] p-1 rounded-xl border border-[#E7EAF0] self-start">
            <button
              type="button"
              onClick={() => setActiveSubView('expenses')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                activeSubView === 'expenses'
                  ? 'bg-[#365FE8] text-white shadow-xs'
                  : 'text-[#697386] hover:text-[#151922]'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              Shared Expenses ({sharedExpenses.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubView('repayments')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                activeSubView === 'repayments'
                  ? 'bg-[#365FE8] text-white shadow-xs'
                  : 'text-[#697386] hover:text-[#151922]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Repayments ({settlements.length})
            </button>
          </div>

          {activeSubView === 'expenses' && (
            <div className="flex items-center gap-2">
              <label htmlFor="ledger-sort-select" className="sr-only">
                Sort transactions by
              </label>
              <select
                id="ledger-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as LedgerSortBy)}
                className="input-field px-2.5 py-1.5 text-xs font-medium"
              >
                <option value="date">Sort: Date</option>
                <option value="amount">Sort: Amount</option>
              </select>
              <button
                type="button"
                onClick={() =>
                  setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))
                }
                aria-label={`Sort direction ${
                  sortOrder === 'desc' ? 'descending' : 'ascending'
                }`}
                className="btn-secondary px-2.5 py-1.5 text-xs flex items-center gap-1 whitespace-nowrap"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                {sortOrder === 'desc' ? 'High/New' : 'Low/Old'}
              </button>
            </div>
          )}
        </div>

        {activeSubView === 'expenses' ? (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'i_owe', label: 'Money I Owe' },
                  { id: 'owed_to_me', label: 'Owed to Me' },
                  { id: 'unsettled', label: 'Unsettled' },
                  { id: 'settled', label: 'Settled' },
                ] as const
              ).map((f) => {
                const active = filter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilter(f.id)}
                    aria-pressed={active}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[#EDF2FF] text-[#365FE8] border-[#D4E0FF]'
                        : 'bg-[#F7F8FA] text-[#697386] border-[#E7EAF0] hover:text-[#151922]'
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            {filteredExpenses.length === 0 ? (
              <div
                className="text-center py-10 bg-[#F7F8FA] rounded-xl border border-dashed border-[#D5DBE6]"
                data-testid="shared-expenses-empty"
              >
                <Receipt className="w-8 h-8 text-[#929BAB] mx-auto mb-2.5" />
                <p className="text-sm font-semibold text-[#151922]">
                  {sharedExpenses.length === 0
                    ? 'No shared expenses yet'
                    : 'No transactions match this filter'}
                </p>
                <p className="text-xs text-[#697386] mt-1 max-w-sm mx-auto">
                  {sharedExpenses.length === 0
                    ? 'Click "Add Expense" above or split a grocery basket directly from Shopping checkout.'
                    : 'Try switching filters above to view other shared transactions.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredExpenses.map((view) => {
                  const { expense } = view;
                  const catStyle = getCategoryStyle(expense.category);
                  const isSettled = view.status === 'settled';
                  const isPartial = view.status === 'partial';

                  const otherParticipantId =
                    expense.paidById === SELF_PERSON_ID
                      ? expense.participants.find((p) => p.personId !== SELF_PERSON_ID)
                          ?.personId
                      : expense.paidById;

                  return (
                    <div
                      key={expense.id}
                      className="bg-[#F7F8FA] border border-[#E7EAF0] rounded-xl p-4 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-[#151922]">
                              {expense.name}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${catStyle.bg} ${catStyle.text} border ${catStyle.border}`}
                            >
                              {expense.category}
                            </span>
                            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-md bg-white border border-[#E7EAF0] text-[#697386]">
                              {expense.splitMethod}
                            </span>
                          </div>
                          <p className="text-xs text-[#697386] mt-0.5">
                            {new Date(expense.date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}{' '}
                            · Paid by{' '}
                            <span className="text-[#151922] font-semibold">
                              {view.paidByName}
                            </span>
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-bold font-mono text-[#151922] tabular-nums">
                            ₹{formatCurrencyExact(expense.totalAmount)}
                          </p>
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border mt-1 ${
                              isSettled
                                ? 'bg-[#E8F7F1] text-[#15966B] border-[#B7E4D3]'
                                : isPartial
                                ? 'bg-[#FEF6E7] text-[#9E6614] border-[#F3D8A8]'
                                : 'bg-[#FDECEC] text-[#DE5252] border-[#F6B8B8]'
                            }`}
                          >
                            {isSettled ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            {view.status}
                          </span>
                        </div>
                      </div>

                      {/* Participant Share Chips */}
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#E7EAF0]">
                        {expense.participants.map((part) => {
                          const pName =
                            ledger.personNameMap[part.personId] ?? 'Unknown';
                          const isSelf = part.personId === SELF_PERSON_ID;
                          return isSelf ? (
                            <span
                              key={part.personId}
                              className="text-xs font-medium bg-white border border-[#E7EAF0] text-[#697386] px-2.5 py-1 rounded-lg"
                            >
                              You: ₹{formatCurrencyExact(part.amount)}
                            </span>
                          ) : (
                            <button
                              key={part.personId}
                              type="button"
                              onClick={() => setSelectedPersonId(part.personId)}
                              className="text-xs font-semibold bg-white hover:bg-[#EDF2FF] border border-[#E7EAF0] hover:border-[#D4E0FF] text-[#151922] hover:text-[#365FE8] px-2.5 py-1 rounded-lg transition-colors"
                            >
                              {pName}: ₹{formatCurrencyExact(part.amount)}
                            </button>
                          );
                        })}
                      </div>

                      {/* Footer Row: Owed Status + Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5">
                        <div className="text-xs font-semibold">
                          {view.remainingAmount === 0 ? (
                            <span className="text-[#15966B]">
                              Fully settled (₹{formatCurrencyExact(view.originalOwedAmount)})
                            </span>
                          ) : view.direction === 'owed_to_me' ? (
                            <span className="text-[#15966B]">
                              Owed to you: ₹{formatCurrencyExact(view.remainingAmount)}
                            </span>
                          ) : (
                            <span className="text-[#DE5252]">
                              You owe: ₹{formatCurrencyExact(view.remainingAmount)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {view.remainingAmount > 0 && otherParticipantId && (
                            <button
                              type="button"
                              onClick={() =>
                                openSettle({
                                  personId: otherParticipantId,
                                  direction:
                                    view.direction === 'i_owe' ? 'i_pay' : 'they_pay',
                                  expenseId: expense.id,
                                })
                              }
                              className="text-xs font-semibold bg-[#EDF2FF] hover:bg-[#DFE8FF] text-[#365FE8] border border-[#D4E0FF] px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap"
                            >
                              Settle
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingExpense(expense);
                              setExpenseModalOpen(true);
                            }}
                            aria-label={`Edit shared expense ${expense.name}`}
                            className="p-1.5 rounded-lg text-[#697386] hover:text-[#151922] hover:bg-white transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {confirmDeleteExpenseId === expense.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  removeSharedExpense(expense.id);
                                  setConfirmDeleteExpenseId(null);
                                }}
                                className="text-[11px] font-semibold bg-[#DE5252] text-white px-2 py-1 rounded-md"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteExpenseId(null)}
                                className="text-[11px] font-semibold bg-white border border-[#E7EAF0] text-[#697386] px-2 py-1 rounded-md"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteExpenseId(expense.id)}
                              aria-label={`Delete shared expense ${expense.name}`}
                              className="p-1.5 rounded-lg text-[#697386] hover:text-[#DE5252] hover:bg-[#FDECEC] transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : sortedSettlements.length === 0 ? (
          <div className="text-center py-10 bg-[#F7F8FA] rounded-xl border border-dashed border-[#D5DBE6]">
            <History className="w-8 h-8 text-[#929BAB] mx-auto mb-2.5" />
            <p className="text-sm font-semibold text-[#151922]">No repayments recorded yet</p>
            <p className="text-xs text-[#697386] mt-1">
              Repayments you record will appear here with full history preserved.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {sortedSettlements.map((st) => {
              const fromName = ledger.personNameMap[st.fromPersonId] ?? 'Unknown';
              const toName = ledger.personNameMap[st.toPersonId] ?? 'Unknown';
              const linkedExpense = st.expenseId
                ? sharedExpenses.find((e) => e.id === st.expenseId)
                : undefined;

              return (
                <div
                  key={st.id}
                  className="bg-[#F7F8FA] border border-[#E7EAF0] rounded-xl p-3.5 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#151922]">
                      {fromName} → {toName}
                    </p>
                    <p className="text-[11px] text-[#697386] mt-0.5">
                      {new Date(st.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {linkedExpense ? ` · For: ${linkedExpense.name}` : ''}
                      {st.note ? ` · ${st.note}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold font-mono text-[#15966B] tabular-nums">
                      ₹{formatCurrencyExact(st.amount)}
                    </span>
                    {confirmDeleteSettlementId === st.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            removeSettlement(st.id);
                            setConfirmDeleteSettlementId(null);
                          }}
                          className="text-[11px] font-semibold bg-[#DE5252] text-white px-2 py-1 rounded-md"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteSettlementId(null)}
                          className="text-[11px] font-semibold bg-white border border-[#E7EAF0] text-[#697386] px-2 py-1 rounded-md"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteSettlementId(st.id)}
                        aria-label={`Delete repayment ${fromName} to ${toName}`}
                        className="p-1.5 rounded-lg text-[#697386] hover:text-[#DE5252] hover:bg-[#FDECEC] transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Modals */}
      <SplitExpenseModal
        isOpen={expenseModalOpen}
        onClose={() => {
          setExpenseModalOpen(false);
          setEditingExpense(undefined);
        }}
        mode={editingExpense ? 'edit' : 'create'}
        initialExpense={editingExpense}
        defaultSplitEnabled={true}
      />

      <PeopleManagerModal
        isOpen={peopleModalOpen}
        onClose={() => setPeopleModalOpen(false)}
      />

      <SettlementModal
        isOpen={settlementModalState.isOpen}
        onClose={() => setSettlementModalState({ isOpen: false })}
        defaultPersonId={settlementModalState.personId}
        defaultDirection={settlementModalState.direction}
        defaultAmount={settlementModalState.amount}
        defaultExpenseId={settlementModalState.expenseId}
      />

      <UpiRemindModal
        isOpen={upiModalState.isOpen}
        onClose={() => setUpiModalState({ isOpen: false })}
        person={upiTargetPerson}
        summary={upiTargetSummary}
        initialDirection={upiModalState.direction}
        onProceedToSettle={(opts) => openSettle(opts)}
      />
    </div>
  );
}
