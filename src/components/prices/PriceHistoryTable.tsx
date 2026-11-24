import { History, Trash2, Receipt, Store, Edit3 } from 'lucide-react';
import { useAppStore, type PriceObservation } from '../../store/useStore';
import { formatCurrencyExact } from '../../utils/categoryStyles';

interface PriceHistoryTableProps {
  observations: PriceObservation[];
  preferredUnit: string;
}

export function PriceHistoryTable({ observations, preferredUnit }: PriceHistoryTableProps) {
  const deletePriceObservation = useAppStore((s) => s.deletePriceObservation);
  const cancelTransaction = useAppStore((s) => s.cancelTransaction);
  const refundTransaction = useAppStore((s) => s.refundTransaction);

  const sortedDesc = [...observations].sort(
    (a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
  );

  return (
    <div className="surface-card p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[var(--text-secondary)]" strokeWidth={2.2} />
          <h4 className="font-display text-sm font-bold text-[var(--text-primary)]">
            Recorded Purchase History
          </h4>
        </div>
        <span className="text-[12px] font-mono text-[var(--text-secondary)] tabular-nums">
          {sortedDesc.length} {sortedDesc.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {sortedDesc.length === 0 ? (
        <p className="text-[12.5px] text-[var(--text-secondary)] py-4 text-center">
          No observations recorded yet.
        </p>
      ) : (
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-[620px]">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-[12px] font-medium text-[var(--text-secondary)]">
                <th className="py-2.5 pr-3">Date &amp; Month</th>
                <th className="py-2.5 px-3">Package &amp; Qty</th>
                <th className="py-2.5 px-3">Paid</th>
                <th className="py-2.5 px-3">Unit Price (₹/{preferredUnit})</th>
                <th className="py-2.5 px-3">Source &amp; Kind</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 pl-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] text-[12.5px]">
              {sortedDesc.map((obs) => {
                const isInactive = obs.status !== 'active';
                const dt = new Date(obs.purchaseDate);
                const dateDisplay = Number.isNaN(dt.getTime())
                  ? obs.purchaseDate
                  : dt.toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });
                const monthDisplay = Number.isNaN(dt.getTime())
                  ? ''
                  : dt.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

                const SourceIcon =
                  obs.purchaseSource === 'mart'
                    ? Store
                    : obs.purchaseSource === 'audit'
                    ? Receipt
                    : Edit3;

                const sourceText =
                  obs.purchaseSource === 'mart'
                    ? 'Quick Mart'
                    : obs.purchaseSource === 'audit'
                    ? obs.receiptRef?.merchant || 'Receipt Scan'
                    : 'Manual';

                return (
                  <tr
                    key={obs.id}
                    className={
                      isInactive ? 'opacity-60' : 'hover:bg-[var(--bg-hover)] transition-colors'
                    }
                  >
                    <td className="py-2.5 pr-3 whitespace-nowrap">
                      <p
                        className={`font-semibold ${
                          isInactive
                            ? 'line-through text-[var(--text-secondary)]'
                            : 'text-[var(--text-primary)]'
                        }`}
                      >
                        {dateDisplay}
                      </p>
                      <p className="text-[11.5px] text-[var(--text-muted)]">{monthDisplay}</p>
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="font-mono font-semibold text-[var(--text-primary)] tabular-nums">
                        {obs.quantity} × {obs.packageSize}
                      </p>
                      {obs.brand && (
                        <p className="text-[11.5px] text-[var(--text-secondary)]">{obs.brand}</p>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-[var(--text-primary)] tabular-nums">
                      ₹{formatCurrencyExact(obs.totalPrice)}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-[var(--accent-ink)] tabular-nums">
                      ₹{formatCurrencyExact(obs.unitPrice)}/{obs.unitOfMeasurement}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5 text-[var(--text-primary)]">
                        <SourceIcon className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                        <span className="font-medium truncate max-w-[120px]">{sourceText}</span>
                      </div>
                      <p className="text-[11.5px] text-[var(--text-muted)]">
                        {obs.entryKind === 'manual_estimate' ? 'Manual Estimate' : 'Actual Purchase'}
                      </p>
                    </td>
                    <td className="py-2.5 px-3">
                      {obs.status === 'active' ? (
                        <span className="text-[12px] font-semibold text-[var(--accent-success-ink)]">
                          Active
                        </span>
                      ) : obs.status === 'cancelled' ? (
                        <span className="text-[12px] font-semibold text-[var(--accent-danger-ink)]">
                          Cancelled
                        </span>
                      ) : (
                        <span className="text-[12px] font-semibold text-[var(--accent-warning-ink)]">
                          Refunded
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pl-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {obs.status === 'active' && obs.transactionId && (
                          <>
                            <button
                              type="button"
                              onClick={() => refundTransaction(obs.transactionId!)}
                              className="text-[12px] font-semibold text-[var(--accent-warning-ink)] px-2.5 py-1 rounded-lg bg-[var(--accent-warning-soft)] border border-[var(--accent-warning-border)] hover:opacity-90"
                            >
                              Refund
                            </button>
                            <button
                              type="button"
                              onClick={() => cancelTransaction(obs.transactionId!)}
                              className="text-[12px] font-semibold text-[var(--accent-danger-ink)] px-2.5 py-1 rounded-lg bg-[var(--accent-danger-soft)] border border-[var(--accent-danger-border)] hover:opacity-90"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {(!obs.transactionId || isInactive) && (
                          <button
                            type="button"
                            onClick={() => deletePriceObservation(obs.id)}
                            aria-label="Delete price observation"
                            title="Delete observation"
                            className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--accent-danger-ink)] rounded-lg hover:bg-[var(--accent-danger-soft)]"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
