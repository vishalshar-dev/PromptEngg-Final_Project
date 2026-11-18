import { useMemo, useState } from 'react';
import { AlertTriangle, ShieldAlert, Check, ScanSearch, Save } from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import {
  detectFees,
  FEE_TYPE_LABELS,
  FEE_SEVERITY_STYLES,
} from '../../utils/auditEngine';
import { formatCurrency } from '../../utils/categoryStyles';

export function FeeDetector() {
  const items = useAppStore((s) => s.items);
  const feeFlags = useAppStore((s) => s.feeFlags);
  const setFeeFlags = useAppStore((s) => s.setFeeFlags);
  const addSavedAudit = useAppStore((s) => s.addSavedAudit);
  const [savedFlash, setSavedFlash] = useState(false);

  const cartItems = items.filter((i) => i.quantity > 0);
  const detectedFlags = useMemo(() => detectFees(cartItems), [cartItems]);

  const hasRun = feeFlags.length > 0 || detectedFlags.length > 0;
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
  };

  const handleSaveAudit = () => {
    const cartTotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    addSavedAudit({
      source: 'Cart Audit',
      subtotal: cartTotal - totalEstimatedCost,
      extraFees: totalEstimatedCost,
      total: cartTotal,
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
              Inspect your active cart for hidden surcharges
            </p>
          </div>
        </div>
        {detectedFlags.length > 0 && (
          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#FEF6E7] text-[#9E6614] border border-[#F3D8A8]">
            {detectedFlags.length} flag{detectedFlags.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Scan Button */}
      <button
        type="button"
        onClick={runScan}
        disabled={cartItems.length === 0}
        className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 border ${
          cartItems.length === 0
            ? 'bg-[#F1F3F6] text-[#929BAB] border-[#E7EAF0] cursor-not-allowed'
            : detectedFlags.length > 0
            ? 'bg-[#FEF6E7] text-[#9E6614] border-[#F3D8A8] hover:bg-[#FDF0D5]'
            : 'btn-secondary'
        }`}
      >
        <ScanSearch className="w-4 h-4" strokeWidth={2.25} />
        {cartItems.length === 0 ? 'Add items to scan' : 'Scan cart for hidden fees'}
      </button>

      {/* Summary Stats */}
      {detectedFlags.length > 0 && (
        <div className="grid grid-cols-3 gap-2.5">
          <div className="surface-subtle p-3 text-center">
            <p className="text-lg font-bold font-mono tabular-nums text-[#DE5252]">
              {criticalCount}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#697386]">
              Critical
            </p>
          </div>
          <div className="surface-subtle p-3 text-center">
            <p className="text-lg font-bold font-mono tabular-nums text-[#9E6614]">
              {warningCount}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#697386]">
              Warning
            </p>
          </div>
          <div className="surface-subtle p-3 text-center">
            <p className="text-lg font-bold font-mono tabular-nums text-[#151922]">
              ₹{formatCurrency(totalEstimatedCost)}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#697386]">
              Est. Cost
            </p>
          </div>
        </div>
      )}

      {/* Flag List */}
      {detectedFlags.length > 0 ? (
        <div className="space-y-2.5">
          {detectedFlags.map((flag) => {
            const sevStyle = FEE_SEVERITY_STYLES[flag.severity];
            return (
              <div
                key={flag.id}
                className={`rounded-xl p-3.5 border ${sevStyle.bg} ${sevStyle.border}`}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-lg bg-[#FFFFFF] ${sevStyle.border} border flex items-center justify-center shrink-0`}
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
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FFFFFF] ${sevStyle.text} border ${sevStyle.border}`}
                      >
                        {FEE_TYPE_LABELS[flag.type]}
                      </span>
                      <span className={`text-[10px] font-bold uppercase ${sevStyle.text}`}>
                        {flag.severity}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[#151922] mb-0.5">
                      {flag.itemName}
                    </p>
                    <p className="text-xs text-[#4F5869] leading-relaxed">
                      {flag.message}
                    </p>
                    <p className={`text-xs font-bold font-mono tabular-nums mt-1.5 ${sevStyle.text}`}>
                      Est. cost: ₹{formatCurrency(flag.estimatedCost)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : hasRun ? (
        <div className="surface-subtle p-5 text-center">
          <div className="w-10 h-10 rounded-xl bg-[#E8F7F1] border border-[#B7E4D3] flex items-center justify-center mx-auto mb-2">
            <Check className="w-5 h-5 text-[#15966B]" strokeWidth={2.5} />
          </div>
          <p className="text-sm font-bold text-[#15966B]">Cart is clean</p>
          <p className="text-xs text-[#697386] mt-1">
            No hidden fees or dark patterns detected
          </p>
        </div>
      ) : null}

      {/* Save Audit Button */}
      {detectedFlags.length > 0 && (
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
