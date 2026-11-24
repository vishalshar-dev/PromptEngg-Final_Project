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
          <div className="w-9 h-9 rounded-xl bg-[var(--accent-primary-soft)] border border-[var(--accent-border)] text-[var(--accent-ink)] flex items-center justify-center">
            <History className="w-4 h-4" strokeWidth={2.25} />
          </div>
          <div>
            <h3 className="font-display text-[15px] font-bold text-[var(--text-primary)] tracking-tight">
              Saved Audit History
            </h3>
            <p className="text-[12px] text-[var(--text-secondary)]">
              Review archived receipt &amp; cart fee audits
            </p>
          </div>
        </div>
        {savedAudits.length > 0 && (
          <button
            type="button"
            onClick={clearSavedAudits}
            className="text-[12px] font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-danger-ink)] transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={2.25} />
            Clear All
          </button>
        )}
      </div>

      {savedAudits.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5">
          <div className="surface-well p-3">
            <p className="text-[12px] font-medium text-[var(--text-secondary)]">
              Audits Saved
            </p>
            <p className="text-base font-bold font-mono tabular-nums text-[var(--text-primary)] mt-0.5">
              {savedAudits.length}
            </p>
          </div>
          <div className="surface-well p-3">
            <p className="text-[12px] font-medium text-[var(--text-secondary)]">
              Extra Fees Spotted
            </p>
            <p className="text-base font-bold font-mono tabular-nums text-[var(--accent-warning-ink)] mt-0.5">
              ₹{formatCurrency(totalExtraFees)}
            </p>
          </div>
        </div>
      )}

      {savedAudits.length === 0 ? (
        <div className="py-5 text-center">
          <div className="w-10 h-10 rounded-xl bg-[var(--bg-well)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto mb-2.5">
            <History className="w-4 h-4 text-[var(--text-secondary)]" strokeWidth={2} />
          </div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">No saved audits yet</p>
          <p className="text-[12px] text-[var(--text-secondary)] mt-1">
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
                className="surface-well overflow-hidden border border-[var(--border-subtle)]"
              >
                <button
                  type="button"
                  onClick={() => toggleExpand(audit.id)}
                  className="w-full flex items-center justify-between p-3.5 hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                        isReceiptAudit
                          ? 'bg-[var(--accent-primary-soft)] border-[var(--accent-border)] text-[var(--accent-ink)]'
                          : 'bg-[var(--accent-warning-soft)] border-[var(--accent-warning-border)] text-[var(--accent-warning-ink)]'
                      }`}
                    >
                      {isReceiptAudit ? (
                        <Receipt className="w-4 h-4" strokeWidth={2.25} />
                      ) : (
                        <ScanSearch className="w-4 h-4" strokeWidth={2.25} />
                      )}
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                        {audit.source}
                      </p>
                      <p className="text-[12px] text-[var(--text-secondary)] font-medium">
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
                      <p className="text-sm font-bold text-[var(--text-primary)] font-mono tabular-nums">
                        ₹{formatCurrency(audit.total)}
                      </p>
                      {audit.extraFees > 0 && (
                        <p className="text-[12px] font-semibold text-[var(--accent-warning-ink)] font-mono tabular-nums">
                          +₹{formatCurrency(audit.extraFees)} fees
                        </p>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[var(--text-secondary)]" strokeWidth={2.25} />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" strokeWidth={2.25} />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-3.5 pb-3.5 pt-3 border-t border-[var(--border-subtle)] space-y-3">
                    <div className="grid grid-cols-3 divide-x divide-[var(--border-subtle)] py-1">
                      <div className="px-2 text-center">
                        <p className="text-[12px] font-medium text-[var(--text-secondary)]">
                          Subtotal
                        </p>
                        <p className="text-xs font-bold text-[var(--text-primary)] font-mono tabular-nums mt-0.5">
                          ₹{formatCurrency(audit.subtotal)}
                        </p>
                      </div>
                      <div className="px-2 text-center">
                        <p className="text-[12px] font-medium text-[var(--text-secondary)]">
                          Extra Fees
                        </p>
                        <p
                          className={`text-xs font-bold font-mono tabular-nums mt-0.5 ${
                            audit.extraFees > 0 ? 'text-[var(--accent-warning-ink)]' : 'text-[var(--text-secondary)]'
                          }`}
                        >
                          ₹{formatCurrency(audit.extraFees)}
                        </p>
                      </div>
                      <div className="px-2 text-center">
                        <p className="text-[12px] font-medium text-[var(--text-secondary)]">
                          Total
                        </p>
                        <p className="text-xs font-bold text-[var(--text-primary)] font-mono tabular-nums mt-0.5">
                          ₹{formatCurrency(audit.total)}
                        </p>
                      </div>
                    </div>

                    {hasFlags ? (
                      <div className="space-y-1.5 pt-2 border-t border-[var(--border-subtle)]">
                        <p className="text-[12px] font-semibold text-[var(--text-secondary)]">
                          Flagged Warnings
                        </p>
                        {audit.flags.map((flag, fi) => (
                          <div
                            key={fi}
                            className={`rounded-lg p-2.5 border flex items-start gap-2 ${
                              flag.severity === 'critical'
                                ? 'bg-[var(--accent-danger-soft)] border-[var(--accent-danger-border)]'
                                : 'bg-[var(--accent-warning-soft)] border-[var(--accent-warning-border)]'
                            }`}
                          >
                            <AlertOctagon
                              className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                                flag.severity === 'critical'
                                  ? 'text-[var(--accent-danger-ink)]'
                                  : 'text-[var(--accent-warning-ink)]'
                              }`}
                              strokeWidth={2.25}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span
                                  className={`text-[12px] font-bold ${
                                    flag.severity === 'critical'
                                      ? 'text-[var(--accent-danger-ink)]'
                                      : 'text-[var(--accent-warning-ink)]'
                                  }`}
                                >
                                  {flag.type}
                                </span>
                                <span className="text-[12px] font-semibold text-[var(--text-secondary)] font-mono tabular-nums">
                                  · ₹{formatCurrency(flag.estimatedCost)}
                                </span>
                              </div>
                              <p className="text-[12px] text-[var(--text-tertiary)] leading-relaxed">
                                {flag.message}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[12px] text-[var(--text-secondary)] text-center py-1">
                        No flags — clean audit
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => removeSavedAudit(audit.id)}
                      className="w-full text-[12px] font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-danger-ink)] transition-colors flex items-center justify-center gap-1.5 py-1.5"
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
