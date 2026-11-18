import { useState } from 'react';
import {
  History,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertOctagon,
  Receipt,
  ScanSearch,
} from 'lucide-react';
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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#EDF2FF] border border-[#D4E0FF] text-[#365FE8] flex items-center justify-center">
            <History className="w-4 h-4" strokeWidth={2.25} />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-[#151922] tracking-tight">
              Saved Audit History
            </h3>
            <p className="text-xs text-[#697386]">
              Review archived receipt &amp; cart fee audits
            </p>
          </div>
        </div>
        {savedAudits.length > 0 && (
          <button
            type="button"
            onClick={clearSavedAudits}
            className="text-xs font-semibold text-[#697386] hover:text-[#DE5252] transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={2.25} />
            Clear All
          </button>
        )}
      </div>

      {savedAudits.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5">
          <div className="surface-subtle p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#697386]">
              Audits Saved
            </p>
            <p className="text-base font-bold font-mono tabular-nums text-[#151922] mt-0.5">
              {savedAudits.length}
            </p>
          </div>
          <div className="surface-subtle p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#697386]">
              Extra Fees Spotted
            </p>
            <p className="text-base font-bold font-mono tabular-nums text-[#9E6614] mt-0.5">
              ₹{formatCurrency(totalExtraFees)}
            </p>
          </div>
        </div>
      )}

      {savedAudits.length === 0 ? (
        <div className="surface-subtle p-6 text-center">
          <div className="w-10 h-10 rounded-xl bg-[#FFFFFF] border border-[#E7EAF0] flex items-center justify-center mx-auto mb-2">
            <History className="w-5 h-5 text-[#929BAB]" strokeWidth={2} />
          </div>
          <p className="text-sm font-bold text-[#151922]">No saved audits yet</p>
          <p className="text-xs text-[#697386] mt-1">
            Scan a receipt or run a cart audit, then save it here
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {savedAudits.map((audit) => {
            const isExpanded = expandedId === audit.id;
            const isReceiptAudit = audit.source !== 'Cart Audit';
            const hasFlags = audit.flags.length > 0;

            return (
              <div
                key={audit.id}
                className="rounded-xl border border-[#E7EAF0] bg-[#F7F8FA] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleExpand(audit.id)}
                  className="w-full flex items-center justify-between p-3.5 hover:bg-[#F1F3F6] transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                        isReceiptAudit
                          ? 'bg-[#EDF2FF] border-[#D4E0FF] text-[#365FE8]'
                          : 'bg-[#FEF6E7] border-[#F3D8A8] text-[#9E6614]'
                      }`}
                    >
                      {isReceiptAudit ? (
                        <Receipt className="w-4 h-4" strokeWidth={2.25} />
                      ) : (
                        <ScanSearch className="w-4 h-4" strokeWidth={2.25} />
                      )}
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-sm font-bold text-[#151922] truncate">
                        {audit.source}
                      </p>
                      <p className="text-[11px] text-[#697386] font-medium">
                        {new Date(audit.timestamp).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#151922] font-mono tabular-nums">
                        ₹{formatCurrency(audit.total)}
                      </p>
                      {audit.extraFees > 0 && (
                        <p className="text-[11px] font-semibold text-[#9E6614] font-mono tabular-nums">
                          +₹{formatCurrency(audit.extraFees)} fees
                        </p>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[#697386]" strokeWidth={2.25} />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#697386]" strokeWidth={2.25} />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-3.5 pb-3.5 pt-3 bg-[#FFFFFF] border-t border-[#E7EAF0] space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="surface-subtle p-2 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#697386]">
                          Subtotal
                        </p>
                        <p className="text-xs font-bold text-[#151922] font-mono tabular-nums mt-0.5">
                          ₹{formatCurrency(audit.subtotal)}
                        </p>
                      </div>
                      <div className="surface-subtle p-2 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#697386]">
                          Extra Fees
                        </p>
                        <p
                          className={`text-xs font-bold font-mono tabular-nums mt-0.5 ${
                            audit.extraFees > 0 ? 'text-[#9E6614]' : 'text-[#697386]'
                          }`}
                        >
                          ₹{formatCurrency(audit.extraFees)}
                        </p>
                      </div>
                      <div className="surface-subtle p-2 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#697386]">
                          Total
                        </p>
                        <p className="text-xs font-bold text-[#151922] font-mono tabular-nums mt-0.5">
                          ₹{formatCurrency(audit.total)}
                        </p>
                      </div>
                    </div>

                    {hasFlags ? (
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
                          Flagged Warnings
                        </p>
                        {audit.flags.map((flag, fi) => (
                          <div
                            key={fi}
                            className={`rounded-lg p-2.5 border flex items-start gap-2 ${
                              flag.severity === 'critical'
                                ? 'bg-[#FDECEC] border-[#F6B8B8]'
                                : 'bg-[#FEF6E7] border-[#F3D8A8]'
                            }`}
                          >
                            <AlertOctagon
                              className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                                flag.severity === 'critical'
                                  ? 'text-[#DE5252]'
                                  : 'text-[#9E6614]'
                              }`}
                              strokeWidth={2.25}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span
                                  className={`text-[10px] font-bold uppercase tracking-wider ${
                                    flag.severity === 'critical'
                                      ? 'text-[#DE5252]'
                                      : 'text-[#9E6614]'
                                  }`}
                                >
                                  {flag.type}
                                </span>
                                <span className="text-[10px] font-semibold text-[#697386] font-mono">
                                  ₹{formatCurrency(flag.estimatedCost)}
                                </span>
                              </div>
                              <p className="text-xs text-[#4F5869] leading-relaxed">
                                {flag.message}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#697386] text-center py-1">
                        No flags — clean audit
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => removeSavedAudit(audit.id)}
                      className="w-full text-xs font-semibold text-[#697386] hover:text-[#DE5252] transition-colors flex items-center justify-center gap-1.5 py-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={2.25} />
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
