import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ShieldAlert, Check, ScanSearch, Save } from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import {
  detectCartSurcharges,
  detectReceiptFees,
  detectTransactionFees,
  FEE_TYPE_LABELS,
  FEE_SEVERITY_STYLES,
} from '../../utils/auditEngine';
import { formatCurrency } from '../../utils/categoryStyles';
import { calculateCartTotals } from '../../utils/martEngine';

export function FeeDetector() {
  const items = useAppStore((s) => s.items);
  const parsedReceipts = useAppStore((s) => s.parsedReceipts);
  const transactions = useAppStore((s) => s.transactions);
  const setFeeFlags = useAppStore((s) => s.setFeeFlags);
  const addSavedAudit = useAppStore((s) => s.addSavedAudit);

  const [savedFlash, setSavedFlash] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);

  const cartItems = useMemo(() => items.filter((i) => i.quantity > 0), [items]);
  const activeTransactions = useMemo(
    () => transactions.filter((t) => t.status !== 'cancelled' && t.status !== 'refunded'),
    [transactions]
  );

  const detectedFlags = useMemo(() => {
    const cartFlags = detectCartSurcharges(cartItems);
    const receiptFlags = detectReceiptFees(parsedReceipts);
    const txFlags = detectTransactionFees(activeTransactions);
    return [...cartFlags, ...receiptFlags, ...txFlags];
  }, [cartItems, parsedReceipts, activeTransactions]);

  // Reset manual scan confirmation when cart, receipts, and transactions are all empty
  useEffect(() => {
    if (
      cartItems.length === 0 &&
      parsedReceipts.length === 0 &&
      activeTransactions.length === 0
    ) {
      setHasScanned(false);
      setFeeFlags([]);
    }
  }, [cartItems.length, parsedReceipts.length, activeTransactions.length, setFeeFlags]);

  const canScan =
    cartItems.length > 0 ||
    parsedReceipts.length > 0 ||
    activeTransactions.length > 0;
  const showResults = hasScanned || detectedFlags.length > 0;

  const totalEstimatedCost = detectedFlags.reduce(
    (sum, f) => sum + f.estimatedCost,
    0
  );
  const criticalCount = detectedFlags.filter(
    (f) => f.severity === 'critical'
  ).length;
  const warningCount = detectedFlags.filter(
    (f) => f.severity === 'warning'
  ).length;

  const runScan = () => {
    setFeeFlags(detectedFlags);
    setHasScanned(true);
  };

  const handleSaveAudit = () => {
    const cartTotal = calculateCartTotals(items).totalAmount;
    const receiptTotal = parsedReceipts.reduce((sum, r) => sum + r.total, 0);
    const recentTxTotal = activeTransactions
      .slice(0, 10)
      .reduce((sum, t) => sum + t.amount, 0);
    const auditTotal =
      cartTotal > 0 ? cartTotal : receiptTotal > 0 ? receiptTotal : recentTxTotal;
    const sourceLabel =
      cartItems.length > 0 && parsedReceipts.length > 0
        ? 'Cart & Receipt Audit'
        : cartItems.length > 0
          ? 'Cart Audit'
          : parsedReceipts.length > 0
            ? `${parsedReceipts[0]?.merchant || 'Receipt'} Fee Audit`
            : 'Expenses Audit';

    addSavedAudit({
      source: sourceLabel,
      subtotal: Math.max(0, auditTotal - totalEstimatedCost),
      extraFees: totalEstimatedCost,
      total: auditTotal,
      flags: detectedFlags.map((f) => ({
        type: FEE_TYPE_LABELS[f.type],
        severity: f.severity,
        message: f.message,
        estimatedCost: f.estimatedCost,
      })),
    });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const scanButtonLabel =
    cartItems.length > 0 && parsedReceipts.length > 0
      ? 'Scan cart, receipts & expenses for hidden fees'
      : cartItems.length > 0
        ? 'Scan cart & expenses for hidden fees'
        : parsedReceipts.length > 0
          ? 'Scan parsed receipt & expenses for hidden fees'
          : 'Scan logged expenses for hidden fees & subscriptions';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#FEF6E7] border border-[#F3D8A8] text-[#C7851F] flex items-center justify-center">
            <ShieldAlert className="w-4 h-4" strokeWidth={2.25} />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-[#151922] tracking-tight">
              Fee &amp; Dark Pattern Scanner
            </h3>
            <p className="text-xs text-[#697386]">
              Inspect your cart, scanned receipts, and logged expenses for hidden surcharges
            </p>
          </div>
        </div>
        {detectedFlags.length > 0 && (
          <span className="text-xs font-bold font-mono tabular-nums text-[#9E6614] shrink-0">
            {detectedFlags.length} flag{detectedFlags.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Scan Control or Empty State */}
      {!canScan ? (
        <div className="py-4 text-center space-y-1">
          <p className="text-xs font-semibold text-[#151922]">
            Nothing queued to audit yet
          </p>
          <p className="text-xs text-[#697386]">
            Add items in Shopping, log an expense, or scan a receipt above to inspect for small-cart fees, subscriptions, and handling surcharges.
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={runScan}
          className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 border ${
            detectedFlags.length > 0
              ? 'bg-[#FEF6E7] text-[#9E6614] border-[#F3D8A8] hover:bg-[#FDF0D5]'
              : 'btn-secondary'
          }`}
        >
          <ScanSearch className="w-4 h-4" strokeWidth={2.25} />
          {scanButtonLabel}
        </button>
      )}

      {/* Hairline Summary Stats */}
      {detectedFlags.length > 0 && (
        <div className="grid grid-cols-3 divide-x divide-[#E7EAF0] border-y border-[#E7EAF0] py-2.5">
          <div className="text-center px-2">
            <p className="text-base font-bold font-mono tabular-nums text-[#DE5252]">
              {criticalCount}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#697386]">
              Critical
            </p>
          </div>
          <div className="text-center px-2">
            <p className="text-base font-bold font-mono tabular-nums text-[#9E6614]">
              {warningCount}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#697386]">
              Warning
            </p>
          </div>
          <div className="text-center px-2">
            <p className="text-base font-bold font-mono tabular-nums text-[#151922]">
              ₹{formatCurrency(totalEstimatedCost)}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#697386]">
              Est. Cost
            </p>
          </div>
        </div>
      )}

      {/* Flag List or Clean Result */}
      {detectedFlags.length > 0 ? (
        <div className="divide-y divide-[#E7EAF0]">
          {detectedFlags.map((flag) => {
            const sevStyle = FEE_SEVERITY_STYLES[flag.severity];
            return (
              <div
                key={flag.id}
                className="py-3 first:pt-1 last:pb-1 flex items-start gap-2.5"
              >
                <div
                  className={`w-7 h-7 rounded-lg ${sevStyle.bg} flex items-center justify-center shrink-0 mt-0.5`}
                >
                  {flag.severity === 'critical' ? (
                    <AlertTriangle
                      className={`w-3.5 h-3.5 ${sevStyle.text}`}
                      strokeWidth={2.25}
                    />
                  ) : (
                    <ShieldAlert
                      className={`w-3.5 h-3.5 ${sevStyle.text}`}
                      strokeWidth={2.25}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-[#151922] truncate">
                      {flag.itemName}
                    </p>
                    <span className={`text-xs font-bold font-mono tabular-nums shrink-0 ${sevStyle.text}`}>
                      ₹{formatCurrency(flag.estimatedCost)}
                    </span>
                  </div>
                  <p className={`text-[11px] font-semibold uppercase tracking-wide mt-0.5 ${sevStyle.text}`}>
                    {FEE_TYPE_LABELS[flag.type]} · {flag.severity}
                  </p>
                  <p className="text-xs text-[#697386] leading-relaxed mt-0.5">
                    {flag.message}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : canScan && showResults ? (
        <div className="surface-subtle p-5 text-center">
          <div className="w-10 h-10 rounded-xl bg-[#E8F7F1] border border-[#B7E4D3] flex items-center justify-center mx-auto mb-2">
            <Check className="w-5 h-5 text-[#15966B]" strokeWidth={2.5} />
          </div>
          <p className="text-sm font-bold text-[#15966B]">Audit clean</p>
          <p className="text-xs text-[#697386] mt-1">
            No hidden fees, high GST markups, or dark patterns detected
          </p>
        </div>
      ) : null}

      {/* Save Audit Button */}
      {canScan && showResults && (
        <button
          type="button"
          onClick={handleSaveAudit}
          className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border ${
            savedFlash
              ? 'bg-[#E8F7F1] text-[#15966B] border-[#B7E4D3]'
              : 'btn-secondary'
          }`}
        >
          {savedFlash ? (
            <>
              <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> Saved to History
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" strokeWidth={2.25} /> Save Audit to History
            </>
          )}
        </button>
      )}
    </div>
  );
}
