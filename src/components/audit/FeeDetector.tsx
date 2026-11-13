import { useMemo } from 'react';
import { AlertTriangle, ShieldAlert, Check, ScanSearch } from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { detectFees, FEE_TYPE_LABELS, FEE_SEVERITY_STYLES } from '../../utils/auditEngine';
import { formatCurrency } from '../../utils/categoryStyles';

export function FeeDetector() {
  const items = useAppStore((s) => s.items);
  const feeFlags = useAppStore((s) => s.feeFlags);
  const setFeeFlags = useAppStore((s) => s.setFeeFlags);

  const cartItems = items.filter((i) => i.quantity > 0);

  const detectedFlags = useMemo(() => detectFees(cartItems), [cartItems]);

  const hasRun = feeFlags.length > 0 || detectedFlags.length > 0;
  const totalEstimatedCost = detectedFlags.reduce((sum, f) => sum + f.estimatedCost, 0);
  const criticalCount = detectedFlags.filter((f) => f.severity === 'critical').length;
  const warningCount = detectedFlags.filter((f) => f.severity === 'warning').length;

  const runScan = () => {
    setFeeFlags(detectedFlags);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-orange-400" strokeWidth={2.5} />
          <h3 className="text-sm font-extrabold tracking-tight">Fee & Dark Pattern Scanner</h3>
        </div>
        {detectedFlags.length > 0 && (
          <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
            {detectedFlags.length} flag{detectedFlags.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Scan Button */}
      <button
        onClick={runScan}
        disabled={cartItems.length === 0}
        className={`w-full py-3 rounded-2xl text-sm font-extrabold transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98] ${
          cartItems.length === 0
            ? 'bg-white/[0.03] text-zinc-600 cursor-not-allowed'
            : detectedFlags.length > 0
            ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/15'
            : 'bg-white/[0.06] text-zinc-200 hover:bg-white/[0.1] border border-white/[0.06]'
        }`}
      >
        <ScanSearch className="w-4 h-4" strokeWidth={2.5} />
        {cartItems.length === 0 ? 'Add items to scan' : 'Scan cart for hidden fees'}
      </button>

      {/* Summary Stats */}
      {detectedFlags.length > 0 && (
        <div className="grid grid-cols-3 gap-2.5 animate-fade-in-up">
          <div className="glass rounded-xl p-2.5 text-center">
            <p className="text-lg font-extrabold font-mono text-red-400">{criticalCount}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Critical</p>
          </div>
          <div className="glass rounded-xl p-2.5 text-center">
            <p className="text-lg font-extrabold font-mono text-orange-400">{warningCount}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Warning</p>
          </div>
          <div className="glass rounded-xl p-2.5 text-center">
            <p className="text-lg font-extrabold font-mono text-white">₹{formatCurrency(totalEstimatedCost)}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Est. Cost</p>
          </div>
        </div>
      )}

      {/* Flag List */}
      {detectedFlags.length > 0 ? (
        <div className="space-y-2">
          {detectedFlags.map((flag, index) => {
            const sevStyle = FEE_SEVERITY_STYLES[flag.severity];
            return (
              <div
                key={flag.id}
                style={{ animationDelay: `${index * 50}ms` }}
                className={`rounded-xl p-3 border ${sevStyle.bg} ${sevStyle.border} animate-fade-in-up`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`w-7 h-7 rounded-lg ${sevStyle.bg} ${sevStyle.border} border flex items-center justify-center flex-shrink-0`}>
                    {flag.severity === 'critical' ? (
                      <AlertTriangle className={`w-3.5 h-3.5 ${sevStyle.text}`} strokeWidth={2.5} />
                    ) : (
                      <ShieldAlert className={`w-3.5 h-3.5 ${sevStyle.text}`} strokeWidth={2.5} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded ${sevStyle.bg} ${sevStyle.text} border ${sevStyle.border}`}>
                        {FEE_TYPE_LABELS[flag.type]}
                      </span>
                      <span className={`text-[9px] font-bold uppercase ${sevStyle.text}`}>
                        {flag.severity}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-white mb-1">{flag.itemName}</p>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">{flag.message}</p>
                    <p className={`text-[11px] font-bold font-mono mt-1.5 ${sevStyle.text}`}>
                      Est. cost: ₹{formatCurrency(flag.estimatedCost)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : hasRun ? (
        <div className="glass rounded-xl p-5 text-center animate-fade-in">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mx-auto mb-2">
            <Check className="w-5 h-5 text-brand-400" strokeWidth={2.5} />
          </div>
          <p className="text-sm font-bold text-brand-400">Cart is clean</p>
          <p className="text-[11px] text-zinc-500 mt-1">No hidden fees or dark patterns detected</p>
        </div>
      ) : null}
    </div>
  );
}
