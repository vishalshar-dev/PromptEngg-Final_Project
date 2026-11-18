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
          <History className="w-4 h-4 text-[#697386]" strokeWidth={2.2} />
          <h4 className="text-sm font-bold text-[#151922]">Recorded Purchase History</h4>
        </div>
        <span className="text-xs font-mono text-[#697386]">
          {sortedDesc.length} {sortedDesc.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {sortedDesc.length === 0 ? (
        <p className="text-xs text-[#697386] py-4 text-center">No observations recorded yet.</p>
      ) : (
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-[#E7EAF0] text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
                <th className="py-2 pr-3">Date &amp; Month</th>
                <th className="py-2 px-3">Package &amp; Qty</th>
                <th className="py-2 px-3">Paid</th>
                <th className="py-2 px-3">Unit Price (₹/{preferredUnit})</th>
                <th className="py-2 px-3">Source &amp; Kind</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 pl-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7EAF0] text-xs">
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
                  <tr key={obs.id} className={isInactive ? 'opacity-60' : 'hover:bg-[#F7F8FA]'}>
                    <td className="py-2.5 pr-3 whitespace-nowrap">
                      <p className={`font-semibold ${isInactive ? 'line-through text-[#697386]' : 'text-[#151922]'}`}>
                        {dateDisplay}
                      </p>
                      <p className="text-[11px] text-[#929BAB]">{monthDisplay}</p>
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="font-mono font-semibold text-[#151922]">
                        {obs.quantity} × {obs.packageSize}
                      </p>
                      {obs.brand && (
                        <p className="text-[11px] text-[#697386]">{obs.brand}</p>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-[#151922] tabular-nums">
                      ₹{formatCurrencyExact(obs.totalPrice)}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-[#365FE8] tabular-nums">
                      ₹{formatCurrencyExact(obs.unitPrice)}/{obs.unitOfMeasurement}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5 text-[#151922]">
                        <SourceIcon className="w-3.5 h-3.5 text-[#697386]" />
                        <span className="font-medium truncate max-w-[120px]">{sourceText}</span>
                      </div>
                      <p className="text-[11px] text-[#929BAB]">
                        {obs.entryKind === 'manual_estimate' ? 'Manual Estimate' : 'Actual Purchase'}
                      </p>
                    </td>
                    <td className="py-2.5 px-3">
                      {obs.status === 'active' ? (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#E8F7F1] text-[#15966B] border border-[#B7E4D3]">
                          Active
                        </span>
                      ) : obs.status === 'cancelled' ? (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#FDECEC] text-[#DE5252] border border-[#F6B8B8]">
                          Cancelled
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#FEF6E7] text-[#9E6614] border border-[#F3D8A8]">
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
                              className="text-[11px] font-semibold text-[#9E6614] hover:text-[#784D0E] px-2 py-1 rounded-md bg-[#FEF6E7] border border-[#F3D8A8]"
                            >
                              Refund
                            </button>
                            <button
                              type="button"
                              onClick={() => cancelTransaction(obs.transactionId!)}
                              className="text-[11px] font-semibold text-[#DE5252] hover:text-[#B93B3B] px-2 py-1 rounded-md bg-[#FDECEC] border border-[#F6B8B8]"
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
                            className="p-1 text-[#697386] hover:text-[#DE5252] rounded hover:bg-[#FDECEC]"
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
