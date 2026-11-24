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
  QrCode,
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
  onOpenUpiRemind: (opts: {
    personId: string;
    direction: 'i_pay' | 'they_pay';
  }) => void;
}

export function PersonLedgerView({
  summary,
  onBack,
  onOpenSettle,
  onOpenUpiRemind,
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
            className="w-10 h-10 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2.2} />
          </button>
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight text-[var(--text-primary)]">
              {person.name}
            </h2>
            <p className="text-[12.5px] text-[var(--text-secondary)]">
              {person.contact || 'Individual Person Ledger'}
            </p>
          </div>
        </div>

        {hasOpenBalance && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                onOpenUpiRemind({
                  personId: person.id,
                  direction: owedToMe >= iOwe ? 'they_pay' : 'i_pay',
                })
              }
              className="btn-secondary px-3.5 py-2 text-[13px] min-h-[38px] flex items-center gap-1.5 whitespace-nowrap"
            >
              <QrCode className="w-4 h-4 text-[var(--accent-ink)]" strokeWidth={2.2} />
              UPI QR &amp; Remind
            </button>
            <button
              type="button"
              onClick={() =>
                onOpenSettle({
                  personId: person.id,
                  direction: iOwe >= owedToMe ? 'i_pay' : 'they_pay',
                })
              }
              className="btn-primary px-3.5 py-2 text-[13px] min-h-[38px] flex items-center gap-1.5 whitespace-nowrap"
            >
              <ShieldCheck className="w-4 h-4" strokeWidth={2.2} />
              Record Repayment
            </button>
          </div>
        )}
      </div>

      {/* Person Balance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="surface-card p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <ArrowDownLeft className="w-3.5 h-3.5 text-[var(--accent-success-ink)]" strokeWidth={2.2} />
            <span className="text-[12.5px] font-medium text-[var(--text-secondary)]">
              Owed to You
            </span>
          </div>
          <p className="font-display text-xl font-bold font-mono tabular-nums text-[var(--accent-success-ink)]">
            ₹{formatCurrencyExact(owedToMe)}
          </p>
        </div>

        <div className="surface-card p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-[var(--accent-danger-ink)]" strokeWidth={2.2} />
            <span className="text-[12.5px] font-medium text-[var(--text-secondary)]">
              You Owe {person.name}
            </span>
          </div>
          <p className="font-display text-xl font-bold font-mono tabular-nums text-[var(--accent-danger-ink)]">
            ₹{formatCurrencyExact(iOwe)}
          </p>
        </div>

        <div className="surface-card p-4">
          <span className="text-[12.5px] font-medium text-[var(--text-secondary)] block mb-1">
            Net Balance
          </span>
          <p
            className={`font-display text-xl font-bold font-mono tabular-nums ${
              netBalance > 0
                ? 'text-[var(--accent-success-ink)]'
                : netBalance < 0
                ? 'text-[var(--accent-danger-ink)]'
                : 'text-[var(--text-primary)]'
            }`}
          >
            {netBalance > 0
              ? `+₹${formatCurrencyExact(netBalance)}`
              : netBalance < 0
              ? `-₹${formatCurrencyExact(Math.abs(netBalance))}`
              : '₹0'}
          </p>
          <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
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
          <h3 className="font-display text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[var(--accent-ink)]" strokeWidth={2.2} />
            Shared Transaction History
          </h3>
          <span className="text-[12.5px] font-medium text-[var(--text-secondary)] tabular-nums">
            {transactions.length} {transactions.length === 1 ? 'expense' : 'expenses'}
          </span>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-8 text-[12.5px] text-[var(--text-secondary)]">
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
                  className="surface-well p-3.5 space-y-2.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-[var(--text-primary)]">{tx.name}</span>
                        <span className={`text-[12px] font-semibold ${catStyle.text}`}>
                          · {tx.category}
                        </span>
                      </div>
                      <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                        {new Date(tx.date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        · Paid by{' '}
                        <span className="text-[var(--text-primary)] font-semibold">
                          {tx.paidByName}
                        </span>{' '}
                        (₹{formatCurrencyExact(tx.totalAmount)})
                      </p>
                    </div>

                    <span
                      className={`text-[12px] font-semibold inline-flex items-center gap-1 capitalize ${
                        isSettled
                          ? 'text-[var(--accent-success-ink)]'
                          : isPartial
                          ? 'text-[var(--accent-warning-ink)]'
                          : 'text-[var(--accent-danger-ink)]'
                      }`}
                    >
                      {isSettled ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <Clock className="w-3.5 h-3.5" />
                      )}
                      {tx.status}
                    </span>
                  </div>

                  {/* Shares & Owed Breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[var(--border-subtle)] text-[12.5px]">
                    <div>
                      <p className="text-[11.5px] font-medium text-[var(--text-secondary)]">
                        Total Bill
                      </p>
                      <p className="font-mono font-semibold text-[var(--text-primary)] tabular-nums">
                        ₹{formatCurrencyExact(tx.totalAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11.5px] font-medium text-[var(--text-secondary)]">
                        Your Share
                      </p>
                      <p className="font-mono font-semibold text-[var(--text-primary)] tabular-nums">
                        ₹{formatCurrencyExact(tx.userShare)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11.5px] font-medium text-[var(--text-secondary)]">
                        {person.name}&apos;s Share
                      </p>
                      <p className="font-mono font-semibold text-[var(--text-primary)] tabular-nums">
                        ₹{formatCurrencyExact(tx.personShare)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11.5px] font-medium text-[var(--text-secondary)]">
                        {tx.direction === 'owed_to_me'
                          ? 'Owed to You'
                          : tx.direction === 'i_owe'
                          ? 'You Owe'
                          : 'Balance'}
                      </p>
                      <p
                        className={`font-mono font-bold tabular-nums ${
                          tx.remainingOwed === 0
                            ? 'text-[var(--text-secondary)]'
                            : tx.direction === 'owed_to_me'
                            ? 'text-[var(--accent-success-ink)]'
                            : 'text-[var(--accent-danger-ink)]'
                        }`}
                      >
                        ₹{formatCurrencyExact(tx.remainingOwed)}
                        {tx.settledAmount > 0 && tx.remainingOwed > 0 && (
                          <span className="text-[11.5px] text-[var(--text-secondary)] font-normal ml-1">
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
                        className="text-[12.5px] font-semibold bg-[var(--accent-primary-soft)] hover:bg-[var(--accent-primary-soft-hover)] text-[var(--accent-ink)] border border-[var(--accent-border)] px-3 py-1.5 rounded-lg transition-colors"
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
          <h3 className="font-display text-sm font-bold text-[var(--text-primary)]">
            Repayment History
          </h3>
          <span className="text-[12.5px] font-medium text-[var(--text-secondary)] tabular-nums">
            {settlements.length} {settlements.length === 1 ? 'payment' : 'payments'}
          </span>
        </div>

        {settlements.length === 0 ? (
          <p className="text-center py-6 text-[12.5px] text-[var(--text-secondary)]">
            No repayments recorded with {person.name} yet.
          </p>
        ) : (
          <div className="space-y-2">
            {settlements.map((st) => {
              const iPaid = st.fromPersonId === SELF_PERSON_ID;
              return (
                <div
                  key={st.id}
                  className="surface-well p-3.5 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-[var(--text-primary)]">
                      {iPaid ? `You paid ${person.name}` : `${person.name} paid You`}
                    </p>
                    <p className="text-[12px] text-[var(--text-secondary)]">
                      {new Date(st.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {st.note ? ` · ${st.note}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold font-mono text-[var(--accent-success-ink)] tabular-nums">
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
                          className="text-[12px] font-semibold bg-[var(--accent-danger)] text-white px-2.5 py-1 rounded-md"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteSettlementId(null)}
                          className="text-[12px] font-semibold bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] px-2.5 py-1 rounded-md"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteSettlementId(st.id)}
                        aria-label={`Delete repayment of ₹${st.amount}`}
                        className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--accent-danger-ink)] rounded-lg hover:bg-[var(--accent-danger-soft)] transition-colors"
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
