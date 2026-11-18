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

export function SplitLedgerDashboard() {
  const people = useAppStore((s) => s.people);
  const sharedExpenses = useAppStore((s) => s.sharedExpenses);
  const settlements = useAppStore((s) => s.settlements);
  const removeSharedExpense = useAppStore((s) => s.removeSharedExpense);
  const removeSettlement = useAppStore((s) => s.removeSettlement);

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [activeSubView, setActiveSubView] = useState<'expenses' | 'repayments'>('expenses');

  // Filters & sorting
  const [filter, setFilter] = useState<LedgerFilter>('all');
  const [sortBy, setSortBy] = useState<LedgerSortBy>('date');
  const [sortOrder, setSortOrder] = useState<LedgerSortOrder>('desc');

  // Modals
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

  // Delete confirmations
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

  // Individual Person Ledger View
  const activePersonSummary = selectedPersonId
    ? ledger.personSummaries[selectedPersonId]
    : undefined;

  if (activePersonSummary) {
    return (
      <>
        <PersonLedgerView
          summary={activePersonSummary}
          onBack={() => setSelectedPersonId(null)}
          onOpenSettle={openSettle}
        />
        <SettlementModal
          isOpen={settlementModalState.isOpen}
          onClose={() => setSettlementModalState({ isOpen: false })}
          defaultPersonId={settlementModalState.personId}
          defaultDirection={settlementModalState.direction}
          defaultAmount={settlementModalState.amount}
          defaultExpenseId={settlementModalState.expenseId}
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
          <Users className="w-5 h-5 text-brand-400" strokeWidth={2.5} />
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-white">
              Expense Split Ledger
            </h2>
            <p className="text-xs text-zinc-500 font-medium">
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
            className="bg-brand-500 hover:bg-brand-400 text-ink-950 px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" strokeWidth={3} />
            Add Expense
          </button>
          <button
            type="button"
            onClick={() => openSettle({})}
            disabled={people.length === 0 || (dashboard.totalIOwe === 0 && dashboard.totalOwedToMe === 0)}
            className="bg-white/[0.06] hover:bg-white/[0.12] disabled:opacity-40 disabled:cursor-not-allowed text-white border border-white/[0.08] px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-brand-400" strokeWidth={2.5} />
            Settle Up
          </button>
          <button
            type="button"
            onClick={() => setPeopleModalOpen(true)}
            className="bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 border border-white/[0.08] px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <UserPlus className="w-4 h-4 text-zinc-400" strokeWidth={2.5} />
            People ({people.length})
          </button>
        </div>
      </div>

      {/* 4 Dashboard Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <ArrowUpRight className="w-4 h-4 text-red-400" strokeWidth={2.5} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Total I Owe
            </span>
          </div>
          <p
            data-testid="dashboard-total-i-owe"
            className="text-xl font-extrabold font-mono tabular-nums text-red-400"
          >
            ₹{formatCurrencyExact(dashboard.totalIOwe)}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Payable to others</p>
        </div>

        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <ArrowDownLeft className="w-4 h-4 text-brand-400" strokeWidth={2.5} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Owed to Me
            </span>
          </div>
          <p
            data-testid="dashboard-total-owed-to-me"
            className="text-xl font-extrabold font-mono tabular-nums text-brand-400"
          >
            ₹{formatCurrencyExact(dashboard.totalOwedToMe)}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Receivable from others</p>
        </div>

        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Scale className="w-4 h-4 text-zinc-400" strokeWidth={2.5} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Net Balance
            </span>
          </div>
          <p
            data-testid="dashboard-net-balance"
            className={`text-xl font-extrabold font-mono tabular-nums ${
              dashboard.overallNetBalance > 0
                ? 'text-brand-400'
                : dashboard.overallNetBalance < 0
                ? 'text-red-400'
                : 'text-zinc-200'
            }`}
          >
            {dashboard.overallNetBalance > 0
              ? `+₹${formatCurrencyExact(dashboard.overallNetBalance)}`
              : dashboard.overallNetBalance < 0
              ? `-₹${formatCurrencyExact(Math.abs(dashboard.overallNetBalance))}`
              : '₹0'}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            {dashboard.overallNetBalance > 0
              ? 'Net receivable'
              : dashboard.overallNetBalance < 0
              ? 'Net payable'
              : 'All even'}
          </p>
        </div>

        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Clock className="w-4 h-4 text-amber-400" strokeWidth={2.5} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Unsettled Txns
            </span>
          </div>
          <p
            data-testid="dashboard-unsettled-count"
            className="text-xl font-extrabold font-mono tabular-nums text-white"
          >
            {dashboard.unsettledCount}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            {dashboard.settledCount} settled of {dashboard.totalSharedCount}
          </p>
        </div>
      </div>

      {/* People Balances Section */}
      <section className="glass rounded-2xl p-4 space-y-3" aria-label="People Balances">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-400" strokeWidth={2.5} />
            People & Balances
          </h3>
          <button
            type="button"
            onClick={() => setPeopleModalOpen(true)}
            className="text-[11px] font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Manage
          </button>
        </div>

        {people.length === 0 ? (
          <div className="text-center py-6 bg-ink-900/40 rounded-xl border border-dashed border-white/[0.08]">
            <p className="text-xs font-semibold text-zinc-400">
              No people added yet
            </p>
            <p className="text-[11px] text-zinc-500 mt-1">
              Add friends or roommates to track who owes whom.
            </p>
            <button
              type="button"
              onClick={() => setPeopleModalOpen(true)}
              className="mt-3 bg-white/[0.06] hover:bg-white/[0.12] text-white text-xs font-bold px-3.5 py-2 rounded-xl border border-white/[0.08]"
            >
              + Add Your First Person
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {people.map((person) => {
              const summary = ledger.personSummaries[person.id];
              const net = summary?.netBalance ?? 0;
              const owedToMe = summary?.owedToMe ?? 0;
              const iOwe = summary?.iOwe ?? 0;

              return (
                <div
                  key={person.id}
                  className="bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] rounded-xl p-3 flex flex-col justify-between gap-2.5 transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedPersonId(person.id)}
                    className="text-left w-full group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-white group-hover:text-brand-400 transition-colors truncate">
                          {person.name}
                        </p>
                        <p className="text-[10px] text-zinc-500 truncate">
                          {person.contact || `${summary?.transactions.length ?? 0} shared bills`}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-brand-400 shrink-0" />
                    </div>

                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/[0.05] text-xs">
                      <span className="text-zinc-500 font-medium">Net</span>
                      <span
                        className={`font-mono font-extrabold ${
                          net > 0
                            ? 'text-brand-400'
                            : net < 0
                            ? 'text-red-400'
                            : 'text-zinc-400'
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
                    <div className="flex items-center justify-between gap-2 text-[10px]">
                      <span className="text-zinc-500">
                        In: ₹{formatCurrencyExact(owedToMe)} · Out: ₹
                        {formatCurrencyExact(iOwe)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          openSettle({
                            personId: person.id,
                            direction: iOwe >= owedToMe ? 'i_pay' : 'they_pay',
                          })
                        }
                        className="font-bold text-brand-400 hover:text-brand-300 bg-brand-500/10 border border-brand-500/20 px-2 py-1 rounded-lg"
                      >
                        Settle
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* History Panel: Shared Expenses vs Repayments */}
      <section className="glass rounded-2xl p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex bg-ink-900 p-1 rounded-xl border border-white/[0.06] self-start">
            <button
              type="button"
              onClick={() => setActiveSubView('expenses')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeSubView === 'expenses'
                  ? 'bg-white/[0.1] text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              Shared Expenses ({sharedExpenses.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubView('repayments')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeSubView === 'repayments'
                  ? 'bg-white/[0.1] text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
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
                className="bg-ink-900 border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-xs font-bold text-zinc-200 outline-none"
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
                className="bg-ink-900 border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-xs font-bold text-zinc-300 hover:text-white flex items-center gap-1"
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      active
                        ? 'bg-brand-500/15 text-brand-400 border-brand-500/30'
                        : 'bg-white/[0.03] text-zinc-400 border-white/[0.06] hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            {filteredExpenses.length === 0 ? (
              <div
                className="text-center py-10 bg-ink-900/40 rounded-xl border border-dashed border-white/[0.08]"
                data-testid="shared-expenses-empty"
              >
                <Receipt className="w-8 h-8 text-zinc-600 mx-auto mb-2.5" />
                <p className="text-sm font-bold text-zinc-300">
                  {sharedExpenses.length === 0
                    ? 'No shared expenses yet'
                    : 'No transactions match this filter'}
                </p>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  {sharedExpenses.length === 0
                    ? 'Click "Add Expense" above or split a grocery basket directly from the Mart checkout.'
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

                  // Find first counterparty for quick settle button
                  const otherParticipantId =
                    expense.paidById === SELF_PERSON_ID
                      ? expense.participants.find((p) => p.personId !== SELF_PERSON_ID)
                          ?.personId
                      : expense.paidById;

                  return (
                    <div
                      key={expense.id}
                      className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-extrabold text-white">
                              {expense.name}
                            </span>
                            <span
                              className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${catStyle.bg} ${catStyle.text} border ${catStyle.border}`}
                            >
                              {expense.category}
                            </span>
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/[0.05] text-zinc-400">
                              {expense.splitMethod}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            {new Date(expense.date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}{' '}
                            · Paid by{' '}
                            <span className="text-zinc-300 font-semibold">
                              {view.paidByName}
                            </span>
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-extrabold font-mono text-white">
                            ₹{formatCurrencyExact(expense.totalAmount)}
                          </p>
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border mt-1 ${
                              isSettled
                                ? 'bg-brand-500/10 text-brand-400 border-brand-500/20'
                                : isPartial
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
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
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/[0.05]">
                        {expense.participants.map((part) => {
                          const pName =
                            ledger.personNameMap[part.personId] ?? 'Unknown';
                          const isSelf = part.personId === SELF_PERSON_ID;
                          return isSelf ? (
                            <span
                              key={part.personId}
                              className="text-[11px] font-semibold bg-ink-900 border border-white/[0.06] text-zinc-300 px-2 py-1 rounded-lg"
                            >
                              You: ₹{formatCurrencyExact(part.amount)}
                            </span>
                          ) : (
                            <button
                              key={part.personId}
                              type="button"
                              onClick={() => setSelectedPersonId(part.personId)}
                              className="text-[11px] font-semibold bg-ink-900 hover:bg-white/[0.06] border border-white/[0.06] text-zinc-200 hover:text-brand-400 px-2 py-1 rounded-lg transition-colors"
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
                            <span className="text-brand-400">
                              Fully settled (₹{formatCurrencyExact(view.originalOwedAmount)})
                            </span>
                          ) : view.direction === 'owed_to_me' ? (
                            <span className="text-brand-400">
                              Owed to you: ₹{formatCurrencyExact(view.remainingAmount)}
                            </span>
                          ) : (
                            <span className="text-red-400">
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
                              className="text-[11px] font-bold bg-brand-500/15 hover:bg-brand-500/25 text-brand-400 border border-brand-500/25 px-2.5 py-1 rounded-lg transition-colors"
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
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {confirmDeleteExpenseId === expense.id ? (
                            <div className="flex items-center gap-1 animate-scale-in">
                              <button
                                type="button"
                                onClick={() => {
                                  removeSharedExpense(expense.id);
                                  setConfirmDeleteExpenseId(null);
                                }}
                                className="text-[10px] font-bold bg-red-500 text-white px-2 py-1 rounded-md"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteExpenseId(null)}
                                className="text-[10px] font-bold bg-white/[0.08] text-zinc-300 px-2 py-1 rounded-md"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteExpenseId(expense.id)}
                              aria-label={`Delete shared expense ${expense.name}`}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
          <div className="text-center py-10 bg-ink-900/40 rounded-xl border border-dashed border-white/[0.08]">
            <History className="w-8 h-8 text-zinc-600 mx-auto mb-2.5" />
            <p className="text-sm font-bold text-zinc-300">No repayments recorded yet</p>
            <p className="text-xs text-zinc-500 mt-1">
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
                  className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white">
                      {fromName} → {toName}
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
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
                    <span className="text-sm font-extrabold font-mono text-brand-400">
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
                          className="text-[10px] font-bold bg-red-500 text-white px-2 py-1 rounded-md"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteSettlementId(null)}
                          className="text-[10px] font-bold bg-white/[0.08] text-zinc-300 px-2 py-1 rounded-md"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteSettlementId(st.id)}
                        aria-label={`Delete repayment ${fromName} to ${toName}`}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
    </div>
  );
}
