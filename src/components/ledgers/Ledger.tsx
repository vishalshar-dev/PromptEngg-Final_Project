import { useMemo, useState } from 'react';
import {
  BookOpen,
  Users,
  Inbox,
  Plus,
  Trash2,
  ArrowRight,
  Split,
  Ban,
  RotateCcw,
} from 'lucide-react';
import { useAppStore, type Transaction } from '../../store/useStore';
import type { SpendingClassification } from '../../types/models';
import { getCategoryStyle, formatCurrencyExact } from '../../utils/categoryStyles';
import { getEffectiveTransactionAmount } from '../../utils/martEngine';
import { computeLedgerState } from '../../utils/splitLedgerEngine';
import { classifyTransaction } from '../../utils/warRoomEngine';
import { SplitExpenseModal } from '../splits/SplitExpenseModal';

export function Ledger({
  onOpenSplitLedger,
}: {
  onOpenSplitLedger?: () => void;
}) {
  const transactions = useAppStore((s) => s.transactions);
  const isBrokeMode = useAppStore((s) => s.isBrokeMode);
  const removeTransaction = useAppStore((s) => s.removeTransaction);
  const cancelTransaction = useAppStore((s) => s.cancelTransaction);
  const refundTransaction = useAppStore((s) => s.refundTransaction);
  const updateTransactionClassification = useAppStore((s) => s.updateTransactionClassification);
  const people = useAppStore((s) => s.people);
  const sharedExpenses = useAppStore((s) => s.sharedExpenses);
  const settlements = useAppStore((s) => s.settlements);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [convertTx, setConvertTx] = useState<Transaction | null>(null);

  const ledgerState = useMemo(
    () => computeLedgerState(people, sharedExpenses, settlements),
    [people, sharedExpenses, settlements]
  );

  const totalOwedToMe = ledgerState.dashboard.totalOwedToMe;

  const sortedTx = [...transactions].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#365FE8]" strokeWidth={2.2} />
          <h2 className="text-base font-bold tracking-tight text-[#151922]">Transaction Ledger</h2>
          {transactions.length > 0 && (
            <span className="text-xs font-mono font-semibold text-[#697386] bg-white px-2 py-0.5 rounded-lg border border-[#E7EAF0]">
              {transactions.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onOpenSplitLedger && totalOwedToMe > 0 && (
            <button
              type="button"
              onClick={onOpenSplitLedger}
              className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 whitespace-nowrap"
            >
              <span>Owed to you: ₹{formatCurrencyExact(totalOwedToMe)}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#365FE8]" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            Add Expense
          </button>
        </div>
      </div>

      {/* Transactions List */}
      <div className="surface-card p-4">
        <div className="space-y-2.5 max-h-[58vh] lg:max-h-[64vh] overflow-y-auto scrollbar-thin pr-1">
          {sortedTx.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-xl bg-[#F1F3F6] border border-[#E7EAF0] flex items-center justify-center mx-auto mb-3">
                <Inbox className="w-6 h-6 text-[#929BAB]" strokeWidth={2} />
              </div>
              <p className="text-[#151922] text-sm font-semibold">
                No transactions yet
              </p>
              <p className="text-[#697386] text-xs mt-1">
                Check out from your cart or click Add Expense above
              </p>
            </div>
          ) : (
            sortedTx.map((tx) => {
              const catStyle = getCategoryStyle(tx.category);
              const linkedShared = tx.linkedSharedExpenseId
                ? sharedExpenses.find((e) => e.id === tx.linkedSharedExpenseId)
                : undefined;
              const effectiveAmt = getEffectiveTransactionAmount(tx);
              const isInactive = tx.status === 'cancelled' || tx.status === 'refunded';
              const classifiedInfo = classifyTransaction(tx, transactions);
              const isNonEssential = classifiedInfo.classification !== 'essential';
              const brokeHighlighted = isBrokeMode && !isInactive && isNonEssential;

              return (
                <div
                  key={tx.id}
                  className={`rounded-xl p-3.5 border transition-colors ${
                    isInactive
                      ? 'bg-[#F7F8FA] border-[#E7EAF0] opacity-65'
                      : brokeHighlighted
                      ? 'bg-[#FEF6E7] border-[#F3D8A8]'
                      : 'bg-[#F7F8FA] border-[#E7EAF0] hover:bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 mb-2.5">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className={`w-2 h-2 rounded-full ${catStyle.dot} mt-1.5 flex-shrink-0`}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p
                            className={`text-sm font-semibold truncate ${
                              isInactive ? 'line-through text-[#697386]' : 'text-[#151922]'
                            }`}
                          >
                            {tx.name}
                          </p>
                          {tx.status === 'cancelled' && (
                            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-[#FDECEC] text-[#DE5252] border border-[#F6B8B8]">
                              Cancelled
                            </span>
                          )}
                          {tx.status === 'refunded' && (
                            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-[#FEF6E7] text-[#9E6614] border border-[#F3D8A8]">
                              Refunded
                            </span>
                          )}
                          {brokeHighlighted && (
                            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-white text-[#9E6614] border border-[#F3D8A8]">
                              Watched
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#697386] mt-0.5">
                          {new Date(tx.timestamp).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {tx.source && ` · ${tx.source}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <p
                        className={`text-sm font-bold font-mono tabular-nums mr-1 ${
                          isInactive ? 'text-[#929BAB] line-through' : 'text-[#151922]'
                        }`}
                      >
                        -₹{formatCurrencyExact(isInactive ? tx.amount : effectiveAmt)}
                      </p>
                      {!isInactive && (
                        <>
                          <button
                            type="button"
                            onClick={() => refundTransaction(tx.id)}
                            aria-label={`Mark transaction ${tx.name} refunded`}
                            title="Mark refunded (excludes from budget & price trends)"
                            className="text-[#697386] hover:text-[#9E6614] transition-colors p-1 rounded-md hover:bg-[#FEF6E7]"
                          >
                            <RotateCcw className="w-3.5 h-3.5" strokeWidth={2.2} />
                          </button>
                          <button
                            type="button"
                            onClick={() => cancelTransaction(tx.id)}
                            aria-label={`Cancel transaction ${tx.name}`}
                            title="Cancel transaction"
                            className="text-[#697386] hover:text-[#9E6614] transition-colors p-1 rounded-md hover:bg-[#FEF6E7]"
                          >
                            <Ban className="w-3.5 h-3.5" strokeWidth={2.2} />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => removeTransaction(tx.id)}
                        aria-label={`Delete transaction ${tx.name}`}
                        title="Delete transaction"
                        className="text-[#697386] hover:text-[#DE5252] transition-colors p-1 rounded-md hover:bg-[#FDECEC]"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={2.2} />
                      </button>
                    </div>
                  </div>

                  {/* Bottom Row: Category, Classification & Split */}
                  <div className="flex flex-wrap justify-between items-center gap-2 mt-2 pt-2.5 border-t border-[#E7EAF0]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${catStyle.bg} ${catStyle.text} border ${catStyle.border} flex items-center gap-1.5`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${catStyle.dot}`}
                        />
                        {tx.category}
                      </span>

                      {!isInactive && (
                        <select
                          aria-label={`Classification for ${tx.name}`}
                          value={classifiedInfo.classification}
                          onChange={(e) =>
                            updateTransactionClassification(
                              tx.id,
                              e.target.value as SpendingClassification
                            )
                          }
                          title={`${classifiedInfo.reason} (${
                            classifiedInfo.classificationSource === 'user' ? 'User confirmed' : 'Auto-predicted'
                          })`}
                          className={`text-[11px] font-semibold px-2 py-1 rounded-md border bg-white outline-none cursor-pointer ${
                            classifiedInfo.classification === 'essential'
                              ? 'text-[#15966B] border-[#B7E4D3]'
                              : classifiedInfo.classification === 'impulsive'
                              ? 'text-[#DE5252] border-[#F6B8B8]'
                              : 'text-[#9E6614] border-[#F3D8A8]'
                          }`}
                        >
                          <option value="essential">
                            Essential ({classifiedInfo.classificationSource === 'user' ? 'Confirmed' : 'Auto'})
                          </option>
                          <option value="non_essential">
                            Non-Essential ({classifiedInfo.classificationSource === 'user' ? 'Confirmed' : 'Auto'})
                          </option>
                          <option value="impulsive">
                            Impulsive ({classifiedInfo.classificationSource === 'user' ? 'Confirmed' : 'Auto'})
                          </option>
                        </select>
                      )}
                    </div>

                    {linkedShared ? (
                      <button
                        type="button"
                        onClick={onOpenSplitLedger}
                        className="text-xs font-semibold text-[#365FE8] bg-[#EDF2FF] hover:bg-[#DFE8FF] border border-[#D4E0FF] px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
                      >
                        <Split className="w-3 h-3" strokeWidth={2.2} />
                        Split ({linkedShared.participants.length} ppl)
                      </button>
                    ) : !isInactive ? (
                      <button
                        type="button"
                        onClick={() => setConvertTx(tx)}
                        className="text-xs font-semibold text-[#697386] hover:text-[#365FE8] transition-colors flex items-center gap-1 whitespace-nowrap"
                      >
                        <Users className="w-3 h-3" strokeWidth={2.2} />
                        Split bill
                      </button>
                    ) : (
                      <span className="text-[11px] font-medium text-[#929BAB]">
                        Excluded from budget &amp; trends
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Personal / Split Expense Modal */}
      <SplitExpenseModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        mode="create"
        defaultSplitEnabled={false}
      />

      {/* Convert Existing Transaction to Multi-Person Split */}
      <SplitExpenseModal
        isOpen={Boolean(convertTx)}
        onClose={() => setConvertTx(null)}
        mode="convert"
        initialConvertTx={convertTx ?? undefined}
        defaultSplitEnabled={true}
      />
    </div>
  );
}
