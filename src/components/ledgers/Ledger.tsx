import { useMemo, useState } from 'react';
import {
  Users,
  Inbox,
  Plus,
  Trash2,
  Split,
  Ban,
  RotateCcw,
  Search,
} from 'lucide-react';
import { useAppStore, type Transaction } from '../../store/useStore';
import type { SpendingClassification } from '../../types/models';
import { getEffectiveTransactionAmount } from '../../utils/martEngine';
import { classifyTransaction } from '../../utils/warRoomEngine';
import { TransactionRow } from '../ui/TransactionRow';
import { EmptyState } from '../ui/EmptyState';
import { SplitExpenseModal } from '../splits/SplitExpenseModal';

export function Ledger({
  onOpenSplitLedger,
}: {
  onOpenSplitLedger?: () => void;
}) {
  const transactions = useAppStore((s) => s.transactions);
  const categories = useAppStore((s) => s.categories);
  const isBrokeMode = useAppStore((s) => s.isBrokeMode);
  const removeTransaction = useAppStore((s) => s.removeTransaction);
  const cancelTransaction = useAppStore((s) => s.cancelTransaction);
  const refundTransaction = useAppStore((s) => s.refundTransaction);
  const updateTransactionClassification = useAppStore(
    (s) => s.updateTransactionClassification
  );
  const sharedExpenses = useAppStore((s) => s.sharedExpenses);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [convertTx, setConvertTx] = useState<Transaction | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sourceStatusFilter, setSourceStatusFilter] = useState('all');

  const availableCategories = useMemo(() => {
    const set = new Set<string>(categories);
    for (const tx of transactions) {
      if (tx.category) set.add(tx.category);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [categories, transactions]);

  const sortedTx = useMemo(
    () =>
      [...transactions].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    [transactions]
  );

  const filteredTx = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortedTx.filter((tx) => {
      if (q) {
        const matchesText =
          tx.name.toLowerCase().includes(q) ||
          tx.category.toLowerCase().includes(q) ||
          (tx.source ? tx.source.toLowerCase().includes(q) : false);
        if (!matchesText) return false;
      }
      if (categoryFilter !== 'all' && tx.category !== categoryFilter) {
        return false;
      }
      const isInactive = tx.status === 'cancelled' || tx.status === 'refunded';
      switch (sourceStatusFilter) {
        case 'active':
          return !isInactive;
        case 'inactive':
          return isInactive;
        case 'mart':
          return tx.source === 'mart';
        case 'audit':
          return tx.source === 'audit';
        case 'manual':
          return (
            tx.source === 'manual' || tx.source === 'ledger' || !tx.source
          );
        default:
          return true;
      }
    });
  }, [sortedTx, searchQuery, categoryFilter, sourceStatusFilter]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    categoryFilter !== 'all' ||
    sourceStatusFilter !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setSourceStatusFilter('all');
  };

  return (
    <div className="space-y-4">
      {/* Filter Toolbar + Primary CTA */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 py-3 border-y border-[#E7EAF0]">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
          <div className="relative flex-1 min-w-[190px] sm:max-w-[260px]">
            <Search className="w-3.5 h-3.5 text-[#929BAB] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search expenses…"
              aria-label="Search expenses"
              className="input-field w-full pl-8 pr-3 py-1.5 text-[12.5px]"
            />
          </div>

          <select
            aria-label="Filter expenses by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field px-2.5 py-1.5 text-[12.5px] font-medium max-w-[180px]"
          >
            <option value="all">All Categories</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter expenses by status or source"
            value={sourceStatusFilter}
            onChange={(e) => setSourceStatusFilter(e.target.value)}
            className="input-field px-2.5 py-1.5 text-[12.5px] font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Cancelled / Refunded</option>
            <option value="mart">Quick Mart</option>
            <option value="audit">Receipt Audit</option>
            <option value="manual">Manual / Ledger</option>
          </select>

          {sortedTx.length > 0 && (
            <span className="text-[11.5px] font-medium text-[#697386] whitespace-nowrap">
              {hasActiveFilters
                ? `${filteredTx.length} of ${sortedTx.length} shown`
                : `${sortedTx.length} ${sortedTx.length === 1 ? 'entry' : 'entries'}`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 self-start lg:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="btn-primary px-3.5 py-2 text-[13px] whitespace-nowrap"
          >
            <Plus className="w-4 h-4" strokeWidth={2.2} />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Hairline-Divided List-First Ledger */}
      <div className="bg-white border border-[#E7EAF0] rounded-2xl px-5">
        {sortedTx.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No personal expenses yet"
            description="Check out from your shopping cart, scan a receipt, or click Add Expense above."
            action={
              <button
                type="button"
                onClick={() => setAddModalOpen(true)}
                className="btn-primary px-4 py-2 text-[13px]"
              >
                <Plus className="w-4 h-4" strokeWidth={2.2} />
                <span>Add First Expense</span>
              </button>
            }
          />
        ) : filteredTx.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No expenses match these filters"
            description="Try clearing the search query or switching category and status filters."
            action={
              <button
                type="button"
                onClick={resetFilters}
                className="btn-secondary px-3.5 py-2 text-[13px]"
              >
                Reset filters
              </button>
            }
          />
        ) : (
          <div className="divide-y divide-[#E7EAF0]">
            {filteredTx.map((tx) => {
              const linkedShared = tx.linkedSharedExpenseId
                ? sharedExpenses.find((e) => e.id === tx.linkedSharedExpenseId)
                : undefined;
              const effectiveAmt = getEffectiveTransactionAmount(tx);
              const isInactive =
                tx.status === 'cancelled' || tx.status === 'refunded';
              const classifiedInfo = classifyTransaction(tx, transactions);
              const isNonEssential = classifiedInfo.classification !== 'essential';
              const brokeHighlighted =
                isBrokeMode && !isInactive && isNonEssential;

              const dateLabel = new Date(tx.timestamp).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              const statusText =
                tx.status === 'cancelled'
                  ? 'Cancelled'
                  : tx.status === 'refunded'
                    ? 'Refunded'
                    : brokeHighlighted
                      ? 'Watched'
                      : undefined;

              return (
                <TransactionRow
                  key={tx.id}
                  title={tx.name}
                  metadata={`${tx.category} · ${dateLabel}${
                    tx.source ? ` · ${tx.source}` : ''
                  }`}
                  amount={isInactive ? tx.amount : effectiveAmt}
                  inactive={isInactive}
                  statusText={statusText}
                  actions={
                    <div className="flex items-center gap-0.5">
                      {!isInactive && (
                        <>
                          <button
                            type="button"
                            onClick={() => refundTransaction(tx.id)}
                            aria-label={`Mark transaction ${tx.name} refunded`}
                            title="Mark refunded (excludes from budget & price trends)"
                            className="text-[#929BAB] hover:text-[#C7851F] transition-colors p-1.5 rounded-lg hover:bg-[#FEF6E7]"
                          >
                            <RotateCcw className="w-3.5 h-3.5" strokeWidth={2} />
                          </button>
                          <button
                            type="button"
                            onClick={() => cancelTransaction(tx.id)}
                            aria-label={`Cancel transaction ${tx.name}`}
                            title="Cancel transaction"
                            className="text-[#929BAB] hover:text-[#C7851F] transition-colors p-1.5 rounded-lg hover:bg-[#FEF6E7]"
                          >
                            <Ban className="w-3.5 h-3.5" strokeWidth={2} />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => removeTransaction(tx.id)}
                        aria-label={`Delete transaction ${tx.name}`}
                        title="Delete transaction"
                        className="text-[#929BAB] hover:text-[#DE5252] transition-colors p-1.5 rounded-lg hover:bg-[#FDECEC]"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                      </button>
                    </div>
                  }
                  secondaryRow={
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {!isInactive ? (
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
                            classifiedInfo.classificationSource === 'user'
                              ? 'User confirmed'
                              : 'Auto-predicted'
                          })`}
                          className={`text-[11.5px] font-medium px-2 py-1 rounded-lg border bg-[#F7F8FA] outline-none cursor-pointer ${
                            classifiedInfo.classification === 'essential'
                              ? 'text-[#15966B] border-[#B7E4D3]'
                              : classifiedInfo.classification === 'impulsive'
                                ? 'text-[#DE5252] border-[#F6B8B8]'
                                : 'text-[#9E6614] border-[#F3D8A8]'
                          }`}
                        >
                          <option value="essential">
                            Essential (
                            {classifiedInfo.classificationSource === 'user'
                              ? 'Confirmed'
                              : 'Auto'}
                            )
                          </option>
                          <option value="non_essential">
                            Non-Essential (
                            {classifiedInfo.classificationSource === 'user'
                              ? 'Confirmed'
                              : 'Auto'}
                            )
                          </option>
                          <option value="impulsive">
                            Impulsive (
                            {classifiedInfo.classificationSource === 'user'
                              ? 'Confirmed'
                              : 'Auto'}
                            )
                          </option>
                        </select>
                      ) : (
                        <span className="text-[11.5px] text-[#929BAB]">
                          Excluded from budget &amp; trends
                        </span>
                      )}

                      {linkedShared ? (
                        <button
                          type="button"
                          onClick={onOpenSplitLedger}
                          className="text-[12px] font-medium text-[#365FE8] hover:underline inline-flex items-center gap-1 whitespace-nowrap"
                        >
                          <Split className="w-3.5 h-3.5" />
                          <span>Split ({linkedShared.participants.length} ppl)</span>
                        </button>
                      ) : (
                        !isInactive && (
                          <button
                            type="button"
                            onClick={() => setConvertTx(tx)}
                            className="text-[12px] font-medium text-[#697386] hover:text-[#365FE8] inline-flex items-center gap-1 whitespace-nowrap transition-colors"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>Split bill</span>
                          </button>
                        )
                      )}
                    </div>
                  }
                />
              );
            })}
          </div>
        )}
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
