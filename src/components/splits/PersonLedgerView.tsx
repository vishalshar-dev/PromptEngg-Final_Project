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
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to Ledger Dashboard"
            className="w-9 h-9 rounded-xl bg-white hover:bg-[#F1F3F6] border border-[#E7EAF0] flex items-center justify-center text-[#697386] hover:text-[#151922] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2.2} />
          </button>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[#151922]">
              {person.name}
            </h2>
            <p className="text-xs text-[#697386]">
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
            className="btn-primary px-3.5 py-2 text-xs flex items-center gap-1.5 whitespace-nowrap"
          >
            <ShieldCheck className="w-4 h-4" strokeWidth={2.2} />
            Record Repayment
          </button>
        )}
      </div>

      {/* Person Balance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="surface-card p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <ArrowDownLeft className="w-3.5 h-3.5 text-[#15966B]" strokeWidth={2.2} />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
              Owed to You
            </span>
          </div>
          <p className="text-xl font-bold font-mono tabular-nums text-[#15966B]">
            ₹{formatCurrencyExact(owedToMe)}
          </p>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-[#DE5252]" strokeWidth={2.2} />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
              You Owe {person.name}
            </span>
          </div>
          <p className="text-xl font-bold font-mono tabular-nums text-[#DE5252]">
            ₹{formatCurrencyExact(iOwe)}
          </p>
        </div>

        <div className="surface-card p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#697386] block mb-1">
            Net Balance
          </span>
          <p
            className={`text-xl font-bold font-mono tabular-nums ${
              netBalance > 0
                ? 'text-[#15966B]'
                : netBalance < 0
                ? 'text-[#DE5252]'
                : 'text-[#151922]'
            }`}
          >
            {netBalance > 0
              ? `+₹${formatCurrencyExact(netBalance)}`
              : netBalance < 0
              ? `-₹${formatCurrencyExact(Math.abs(netBalance))}`
              : '₹0'}
          </p>
          <p className="text-[11px] text-[#697386] mt-0.5">
            {netBalance > 0
              ? `${person.name} owes you`
              : netBalance < 0
              ? `You owe ${person.name}`
              : 'All settled up'}
          </p>
        </div>
      </div>

      {/* Transaction History */}
      <div className="surface-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#151922] flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#365FE8]" strokeWidth={2.2} />
            Shared Transaction History
          </h3>
          <span className="text-xs font-medium text-[#697386]">
            {transactions.length} {transactions.length === 1 ? 'expense' : 'expenses'}
          </span>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#697386]">
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
                  className="bg-[#F7F8FA] border border-[#E7EAF0] rounded-xl p-3.5 space-y-2.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-[#151922]">{tx.name}</span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${catStyle.bg} ${catStyle.text} border ${catStyle.border}`}
                        >
                          {tx.category}
                        </span>
                      </div>
                      <p className="text-xs text-[#697386] mt-0.5">
                        {new Date(tx.date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        · Paid by{' '}
                        <span className="text-[#151922] font-semibold">
                          {tx.paidByName}
                        </span>{' '}
                        (₹{formatCurrencyExact(tx.totalAmount)})
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-lg border flex items-center gap-1 ${
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
                        {tx.status}
                      </span>
                    </div>
                  </div>

                  {/* Shares & Owed Breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#E7EAF0] text-xs">
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-[#697386]">
                        Total Bill
                      </p>
                      <p className="font-mono font-semibold text-[#151922]">
                        ₹{formatCurrencyExact(tx.totalAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-[#697386]">
                        Your Share
                      </p>
                      <p className="font-mono font-semibold text-[#151922]">
                        ₹{formatCurrencyExact(tx.userShare)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-[#697386]">
                        {person.name}&apos;s Share
                      </p>
                      <p className="font-mono font-semibold text-[#151922]">
                        ₹{formatCurrencyExact(tx.personShare)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-[#697386]">
                        {tx.direction === 'owed_to_me'
                          ? 'Owed to You'
                          : tx.direction === 'i_owe'
                          ? 'You Owe'
                          : 'Balance'}
                      </p>
                      <p
                        className={`font-mono font-bold ${
                          tx.remainingOwed === 0
                            ? 'text-[#697386]'
                            : tx.direction === 'owed_to_me'
                            ? 'text-[#15966B]'
                            : 'text-[#DE5252]'
                        }`}
                      >
                        ₹{formatCurrencyExact(tx.remainingOwed)}
                        {tx.settledAmount > 0 && tx.remainingOwed > 0 && (
                          <span className="text-[11px] text-[#697386] font-normal ml-1">
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
                        className="text-xs font-semibold bg-[#EDF2FF] hover:bg-[#DFE8FF] text-[#365FE8] border border-[#D4E0FF] px-3 py-1.5 rounded-lg transition-colors"
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
      <div className="surface-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#151922]">Repayment History</h3>
          <span className="text-xs font-medium text-[#697386]">
            {settlements.length} {settlements.length === 1 ? 'payment' : 'payments'}
          </span>
        </div>

        {settlements.length === 0 ? (
          <p className="text-center py-6 text-xs text-[#697386]">
            No repayments recorded with {person.name} yet.
          </p>
        ) : (
          <div className="space-y-2">
            {settlements.map((st) => {
              const iPaid = st.fromPersonId === SELF_PERSON_ID;
              return (
                <div
                  key={st.id}
                  className="bg-[#F7F8FA] border border-[#E7EAF0] rounded-xl p-3 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#151922]">
                      {iPaid ? `You paid ${person.name}` : `${person.name} paid You`}
                    </p>
                    <p className="text-[11px] text-[#697386]">
                      {new Date(st.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
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
                        aria-label={`Delete repayment of ₹${st.amount}`}
                        className="p-1.5 text-[#697386] hover:text-[#DE5252] rounded-lg hover:bg-[#FDECEC] transition-colors"
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
