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
    <div className="glass rounded-2xl p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-zinc-400" strokeWidth={2.5} />
          <h4 className="text-sm font-extrabold text-white">Recorded Purchase History</h4>
        </div>
        <span className="text-[11px] font-mono text-zinc-500">
          {sortedDesc.length} {sortedDesc.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {sortedDesc.length === 0 ? (
        <p className="text-xs text-zinc-500 py-4 text-center">No observations recorded yet.</p>
      ) : (
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-white/[0.06] text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                <th className="py-2 pr-3">Date & Month</th>
                <th className="py-2 px-3">Package & Qty</th>
                <th className="py-2 px-3">Paid</th>
                <th className="py-2 px-3">Unit Price (₹/{preferredUnit})</th>
                <th className="py-2 px-3">Source & Kind</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 pl-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-xs">
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
                  <tr key={obs.id} className={isInactive ? 'opacity-55' : 'hover:bg-white/[0.02]'}>
                    <td className="py-2.5 pr-3 whitespace-nowrap">
                      <p className={`font-bold ${isInactive ? 'line-through text-zinc-400' : 'text-white'}`}>
                        {dateDisplay}
                      </p>
                      <p className="text-[10px] text-zinc-500">{monthDisplay}</p>
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="font-mono font-semibold text-zinc-200">
                        {obs.quantity} × {obs.packageSize}
                      </p>
                      {obs.brand && (
                        <p className="text-[10px] text-zinc-500">{obs.brand}</p>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-zinc-300 tabular-nums">
                      ₹{formatCurrencyExact(obs.totalPrice)}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-extrabold text-brand-400 tabular-nums">
                      ₹{formatCurrencyExact(obs.unitPrice)}/{obs.unitOfMeasurement}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5 text-zinc-300">
                        <SourceIcon className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="font-semibold truncate max-w-[120px]">{sourceText}</span>
                      </div>
                      <p className="text-[10px] text-zinc-500">
                        {obs.entryKind === 'manual_estimate' ? 'Manual Estimate' : 'Actual Purchase'}
                      </p>
                    </td>
                    <td className="py-2.5 px-3">
                      {obs.status === 'active' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-500/15 text-brand-400 border border-brand-500/25">
                          Active
                        </span>
                      ) : obs.status === 'cancelled' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/25">
                          Cancelled
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25">
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
                              className="text-[10px] font-bold text-amber-300 hover:text-amber-200 px-1.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20"
                            >
                              Refund
                            </button>
                            <button
                              type="button"
                              onClick={() => cancelTransaction(obs.transactionId!)}
                              className="text-[10px] font-bold text-orange-300 hover:text-orange-200 px-1.5 py-1 rounded bg-orange-500/10 hover:bg-orange-500/20"
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
                            className="p-1 text-zinc-500 hover:text-red-400 rounded hover:bg-red-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
