import { useState } from 'react';
import { History, Trash2, ChevronDown, ChevronUp, AlertOctagon, Receipt, ScanSearch } from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { formatCurrency } from '../../utils/categoryStyles';

export function AuditHistory() {
  const savedAudits = useAppStore((s) => s.savedAudits);
  const removeSavedAudit = useAppStore((s) => s.removeSavedAudit);
  const clearSavedAudits = useAppStore((s) => s.clearSavedAudits);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalExtraFees = savedAudits.reduce((sum, a) => sum + a.extraFees, 0);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-sky-400" strokeWidth={2.5} />
          <h3 className="text-sm font-extrabold tracking-tight">Saved Audit History</h3>
        </div>
        {savedAudits.length > 0 && (
          <button
            onClick={clearSavedAudits}
            className="text-[11px] font-bold text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" strokeWidth={2.5} />
            Clear All
          </button>
        )}
      </div>

      {/* Summary Stat */}
      {savedAudits.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 animate-fade-in-up">
          <div className="glass rounded-xl p-2.5">
            <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Audits Saved</p>
            <p className="text-sm font-extrabold font-mono text-white">{savedAudits.length}</p>
          </div>
          <div className="glass rounded-xl p-2.5">
            <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Total Extra Fees Spotted</p>
            <p className="text-sm font-extrabold font-mono text-orange-400">₹{formatCurrency(totalExtraFees)}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {savedAudits.length === 0 ? (
        <div className="glass rounded-xl p-5 text-center">
          <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-2">
            <History className="w-5 h-5 text-zinc-600" strokeWidth={2} />
          </div>
          <p className="text-sm font-bold text-zinc-400">No saved audits yet</p>
          <p className="text-[11px] text-zinc-600 mt-1">
            Scan a receipt or run a cart audit, then save it here
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {savedAudits.map((audit, index) => {
            const isExpanded = expandedId === audit.id;
            const isReceiptAudit = audit.source !== 'Cart Audit';
            const hasFlags = audit.flags.length > 0;

            return (
              <div
                key={audit.id}
                style={{ animationDelay: `${index * 40}ms` }}
                className="glass rounded-xl border border-white/[0.04] animate-fade-in-up overflow-hidden"
              >
                {/* Header Row */}
                <button
                  onClick={() => toggleExpand(audit.id)}
                  className="w-full flex items-center justify-between p-3 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isReceiptAudit
                        ? 'bg-brand-500/10 border border-brand-500/20'
                        : 'bg-orange-500/10 border border-orange-500/20'
                    }`}>
                      {isReceiptAudit ? (
                        <Receipt className="w-4 h-4 text-brand-400" strokeWidth={2.5} />
                      ) : (
                        <ScanSearch className="w-4 h-4 text-orange-400" strokeWidth={2.5} />
                      )}
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-sm font-bold text-white truncate">{audit.source}</p>
                      <p className="text-[10px] text-zinc-500 font-medium">
                        {new Date(audit.timestamp).toLocaleDateString('en-IN', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-white font-mono tabular-nums">
                        ₹{formatCurrency(audit.total)}
                      </p>
                      {audit.extraFees > 0 && (
                        <p className="text-[10px] font-bold text-orange-400 font-mono">
                          +₹{formatCurrency(audit.extraFees)} fees
                        </p>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-zinc-500" strokeWidth={2.5} />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-500" strokeWidth={2.5} />
                    )}
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-2.5 animate-fade-in">
                    <div className="h-px bg-white/[0.06]" />

                    {/* Breakdown */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <p className="text-[8px] font-bold uppercase tracking-wider text-zinc-600">Subtotal</p>
                        <p className="text-xs font-bold text-zinc-300 font-mono">₹{formatCurrency(audit.subtotal)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[8px] font-bold uppercase tracking-wider text-zinc-600">Extra Fees</p>
                        <p className={`text-xs font-bold font-mono ${audit.extraFees > 0 ? 'text-orange-400' : 'text-zinc-500'}`}>
                          ₹{formatCurrency(audit.extraFees)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[8px] font-bold uppercase tracking-wider text-zinc-600">Total</p>
                        <p className="text-xs font-bold text-white font-mono">₹{formatCurrency(audit.total)}</p>
                      </div>
                    </div>

                    {/* Flags */}
                    {hasFlags && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Flagged Warnings</p>
                        {audit.flags.map((flag, fi) => (
                          <div
                            key={fi}
                            className={`rounded-lg p-2 border flex items-start gap-2 ${
                              flag.severity === 'critical'
                                ? 'bg-red-500/10 border-red-500/20'
                                : 'bg-orange-500/10 border-orange-500/20'
                            }`}
                          >
                            {flag.severity === 'critical' ? (
                              <AlertOctagon className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                            ) : (
                              <AlertOctagon className="w-3 h-3 text-orange-400 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className={`text-[9px] font-extrabold uppercase tracking-wider ${
                                  flag.severity === 'critical' ? 'text-red-400' : 'text-orange-400'
                                }`}>
                                  {flag.type}
                                </span>
                                <span className="text-[9px] font-bold text-zinc-500 font-mono">
                                  ₹{formatCurrency(flag.estimatedCost)}
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-400 leading-relaxed">{flag.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {!hasFlags && (
                      <p className="text-[11px] text-zinc-500 text-center py-1">No flags — clean audit</p>
                    )}

                    {/* Delete Button */}
                    <button
                      onClick={() => removeSavedAudit(audit.id)}
                      className="w-full text-xs font-bold text-zinc-500 hover:text-red-400 transition-colors flex items-center justify-center gap-1.5 py-1.5"
                    >
                      <Trash2 className="w-3 h-3" strokeWidth={2.5} />
                      Delete this audit
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
