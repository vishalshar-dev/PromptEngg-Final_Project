import { useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Receipt,
  Trash2,
} from 'lucide-react';
import { SELF_PERSON_ID } from '../../types/models';
import { useAppStore } from '../../store/useStore';
import { formatCurrencyExact, getCategoryStyle } from '../../utils/categoryStyles';
import type { PersonLedgerSummary } from '../../utils/splitLedgerEngine';

export interface PersonLedgerViewProps {
  summary: PersonLedgerSummary;
  onBack: () => void;
  onOpenSettle: (opts: {
    personId: string;
    direction?: 'i_pay' | 'they_pay';
    amount?: number;
    expenseId?: string;
  }) => void;
}

export function PersonLedgerView({
  summary,
  onBack,
  onOpenSettle,
}: PersonLedgerViewProps) {
  const removeSettlement = useAppStore((s) => s.removeSettlement);
  const [confirmDeleteSettlementId, setConfirmDeleteSettlementId] = useState<string | null>(null);

  const { person, owedToMe, iOwe, netBalance, transactions, settlements } = summary;
  const hasOpenBalance = owedToMe > 0 || iOwe > 0;

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to Ledger Dashboard"
            className="w-9 h-9 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
          </button>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-white">
              {person.name}
            </h2>
            <p className="text-[11px] text-zinc-500 font-medium">
              {person.contact || 'Individual Person Ledger'}
            </p>
          </div>
        </div>

        {hasOpenBalance && (
          <button
            type="button"
            onClick={() =>
              onOpenSettle({
                personId: person.id,
                direction: iOwe >= owedToMe ? 'i_pay' : 'they_pay',
              })
            }
            className="bg-brand-500 hover:bg-brand-400 text-ink-950 px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-colors"
          >
            <ShieldCheck className="w-4 h-4" strokeWidth={2.5} />
            Record Repayment
          </button>
        )}
      </div>

      {/* Person Balance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <ArrowDownLeft className="w-3.5 h-3.5 text-brand-400" strokeWidth={2.5} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Owed to You
            </span>
          </div>
          <p className="text-xl font-extrabold font-mono tabular-nums text-brand-400">
            ₹{formatCurrencyExact(owedToMe)}
          </p>
        </div>

        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-red-400" strokeWidth={2.5} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              You Owe {person.name}
            </span>
          </div>
          <p className="text-xl font-extrabold font-mono tabular-nums text-red-400">
            ₹{formatCurrencyExact(iOwe)}
          </p>
        </div>

        <div className="glass rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
            Net Balance
          </span>
          <p
            className={`text-xl font-extrabold font-mono tabular-nums ${
              netBalance > 0
                ? 'text-brand-400'
                : netBalance < 0
                ? 'text-red-400'
                : 'text-zinc-300'
            }`}
          >
            {netBalance > 0
              ? `+₹${formatCurrencyExact(netBalance)}`
              : netBalance < 0
              ? `-₹${formatCurrencyExact(Math.abs(netBalance))}`
              : '₹0'}
          </p>
          <p className="text-[10px] text-zinc-500 font-medium mt-0.5">
            {netBalance > 0
              ? `${person.name} owes you`
              : netBalance < 0
              ? `You owe ${person.name}`
              : 'All settled up'}
          </p>
        </div>
      </div>

      {/* Transaction History */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-brand-400" strokeWidth={2.5} />
            Shared Transaction History
          </h3>
          <span className="text-[11px] font-bold text-zinc-500">
            {transactions.length} {transactions.length === 1 ? 'expense' : 'expenses'}
          </span>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-8 text-xs text-zinc-500">
            No shared expenses recorded with {person.name} yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {transactions.map((tx) => {
              const catStyle = getCategoryStyle(tx.category);
              const isSettled = tx.status === 'settled';
              const isPartial = tx.status === 'partial';

              return (
                <div
                  key={tx.expenseId}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5 space-y-2.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">{tx.name}</span>
                        <span
                          className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${catStyle.bg} ${catStyle.text} border ${catStyle.border}`}
                        >
                          {tx.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {new Date(tx.date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        · Paid by{' '}
                        <span className="text-zinc-300 font-semibold">
                          {tx.paidByName}
                        </span>{' '}
                        (₹{formatCurrencyExact(tx.totalAmount)})
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-lg border flex items-center gap-1 ${
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
                        {tx.status}
                      </span>
                    </div>
                  </div>

                  {/* Shares & Owed Breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/[0.05] text-xs">
                    <div>
                      <p className="text-[9px] font-bold uppercase text-zinc-500">
                        Total Bill
                      </p>
                      <p className="font-mono font-bold text-zinc-200">
                        ₹{formatCurrencyExact(tx.totalAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase text-zinc-500">
                        Your Share
                      </p>
                      <p className="font-mono font-bold text-zinc-200">
                        ₹{formatCurrencyExact(tx.userShare)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase text-zinc-500">
                        {person.name}&apos;s Share
                      </p>
                      <p className="font-mono font-bold text-zinc-200">
                        ₹{formatCurrencyExact(tx.personShare)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase text-zinc-500">
                        {tx.direction === 'owed_to_me'
                          ? 'Owed to You'
                          : tx.direction === 'i_owe'
                          ? 'You Owe'
                          : 'Balance'}
                      </p>
                      <p
                        className={`font-mono font-extrabold ${
                          tx.remainingOwed === 0
                            ? 'text-zinc-400'
                            : tx.direction === 'owed_to_me'
                            ? 'text-brand-400'
                            : 'text-red-400'
                        }`}
                      >
                        ₹{formatCurrencyExact(tx.remainingOwed)}
                        {tx.settledAmount > 0 && tx.remainingOwed > 0 && (
                          <span className="text-[10px] text-zinc-500 font-normal ml-1">
                            (of ₹{formatCurrencyExact(tx.originalOwed)})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Quick Settle Button */}
                  {tx.remainingOwed > 0 && tx.direction !== 'none' && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          onOpenSettle({
                            personId: person.id,
                            direction: tx.direction === 'i_owe' ? 'i_pay' : 'they_pay',
                            amount: tx.remainingOwed,
                            expenseId: tx.expenseId,
                          })
                        }
                        className="text-[11px] font-bold bg-brand-500/15 hover:bg-brand-500/25 text-brand-400 border border-brand-500/25 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        {tx.direction === 'i_owe' ? 'Pay / Settle' : 'Mark Received'} (₹
                        {formatCurrencyExact(tx.remainingOwed)})
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Repayment History */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-white">Repayment History</h3>
          <span className="text-[11px] font-bold text-zinc-500">
            {settlements.length} {settlements.length === 1 ? 'payment' : 'payments'}
          </span>
        </div>

        {settlements.length === 0 ? (
          <p className="text-center py-6 text-xs text-zinc-500">
            No repayments recorded with {person.name} yet.
          </p>
        ) : (
          <div className="space-y-2">
            {settlements.map((st) => {
              const iPaid = st.fromPersonId === SELF_PERSON_ID;
              return (
                <div
                  key={st.id}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white">
                      {iPaid ? `You paid ${person.name}` : `${person.name} paid You`}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {new Date(st.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
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
                        aria-label={`Delete repayment of ₹${st.amount}`}
                        className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
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
      </div>
    </div>
  );
}
