import { useMemo, useState } from 'react';
import {
  BookOpen,
  Users,
  TrendingDown,
  Inbox,
  Plus,
  Trash2,
  ArrowRight,
  Split,
} from 'lucide-react';
import { useAppStore, type Transaction } from '../../store/useStore';
import { getCategoryStyle, formatCurrencyExact } from '../../utils/categoryStyles';
import { computeLedgerState } from '../../utils/splitLedgerEngine';
import { SplitExpenseModal } from '../splits/SplitExpenseModal';

export function Ledger({
  onOpenSplitLedger,
}: {
  onOpenSplitLedger?: () => void;
}) {
  const transactions = useAppStore((s) => s.transactions);
  const removeTransaction = useAppStore((s) => s.removeTransaction);
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
  const totalSpent = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  const sortedTx = [...transactions].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-zinc-400" strokeWidth={2.5} />
          <h2 className="text-lg font-extrabold tracking-tight">Recent Ledger</h2>
          {transactions.length > 0 && (
            <span className="text-[11px] font-bold text-zinc-500 bg-white/[0.04] px-2 py-0.5 rounded-lg border border-white/[0.06]">
              {transactions.length}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="text-xs font-extrabold bg-brand-500/15 hover:bg-brand-500/25 text-brand-400 border border-brand-500/25 px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={3} />
          Add Expense
        </button>
      </div>

      {/* Stats Row */}
      {(transactions.length > 0 || sharedExpenses.length > 0) && (
        <div className="grid grid-cols-2 gap-2.5 animate-fade-in-up">
          <div className="glass rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingDown className="w-3.5 h-3.5 text-red-400" strokeWidth={2.5} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                My Spend
              </span>
            </div>
            <p className="text-lg font-extrabold font-mono tabular-nums text-white">
              ₹{formatCurrencyExact(totalSpent)}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenSplitLedger}
            className="glass hover:border-brand-500/30 rounded-xl p-3 text-left transition-all group"
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-brand-400" strokeWidth={2.5} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Owed to Me
                </span>
              </span>
              {onOpenSplitLedger && (
                <ArrowRight className="w-3 h-3 text-zinc-500 group-hover:text-brand-400 transition-colors" />
              )}
            </div>
            <p className="text-lg font-extrabold font-mono tabular-nums text-brand-400">
              ₹{formatCurrencyExact(totalOwedToMe)}
            </p>
          </button>
        </div>
      )}

      {/* Transactions List */}
      <div className="glass rounded-2xl p-4">
        <div className="space-y-2.5 max-h-[50vh] lg:max-h-[60vh] overflow-y-auto scrollbar-thin pr-1">
          {sortedTx.length === 0 ? (
            <div className="text-center py-10 animate-fade-in">
              <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
                <Inbox className="w-6 h-6 text-zinc-600" strokeWidth={2} />
              </div>
              <p className="text-zinc-500 text-sm font-medium">
                No transactions yet
              </p>
              <p className="text-zinc-600 text-xs mt-1">
                Check out from your cart or tap Add Expense above
              </p>
            </div>
          ) : (
            sortedTx.map((tx, index) => {
              const catStyle = getCategoryStyle(tx.category);
              const linkedShared = tx.linkedSharedExpenseId
                ? sharedExpenses.find((e) => e.id === tx.linkedSharedExpenseId)
                : undefined;

              return (
                <div
                  key={tx.id}
                  style={{ animationDelay: `${index * 30}ms` }}
                  className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04] hover:border-white/[0.08] transition-all animate-fade-in-up"
                >
                  <div className="flex justify-between items-start gap-2 mb-2.5">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className={`w-2 h-2 rounded-full ${catStyle.dot} mt-1.5 flex-shrink-0`}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {tx.name}
                        </p>
                        <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
                          {new Date(tx.timestamp).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <p className="text-sm font-extrabold text-red-400 font-mono tabular-nums">
                        -₹{formatCurrencyExact(tx.amount)}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeTransaction(tx.id)}
                        aria-label={`Delete transaction ${tx.name}`}
                        title="Delete transaction"
                        className="text-zinc-600 hover:text-red-400 transition-colors p-1 rounded-md hover:bg-red-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>

                  {/* Bottom Row: Category + Split */}
                  <div className="flex justify-between items-center gap-2 mt-2 pt-2.5 border-t border-white/[0.04]">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${catStyle.bg} ${catStyle.text} border ${catStyle.border} flex items-center gap-1.5`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${catStyle.dot}`}
                      />
                      {tx.category}
                    </span>

                    {linkedShared ? (
                      <button
                        type="button"
                        onClick={onOpenSplitLedger}
                        className="text-[11px] font-bold text-brand-400 bg-brand-500/10 hover:bg-brand-500/15 border border-brand-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <Split className="w-3 h-3" strokeWidth={2.5} />
                        Split ({linkedShared.participants.length} ppl)
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConvertTx(tx)}
                        className="text-[11px] font-bold text-zinc-400 hover:text-brand-400 transition-colors flex items-center gap-1"
                      >
                        <Users className="w-3 h-3" strokeWidth={2.5} />
                        Split bill
                      </button>
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
