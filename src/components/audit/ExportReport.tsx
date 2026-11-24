import { useState } from 'react';
import {
  FileText,
  Download,
  FileDown,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import {
  generateReportText,
  downloadTextReport,
  downloadHtmlReport,
} from '../../utils/reportGenerator';
import { formatCurrency } from '../../utils/categoryStyles';
import { calculateCartTotals } from '../../utils/martEngine';

export function ExportReport() {
  const items = useAppStore((s) => s.items);
  const transactions = useAppStore((s) => s.transactions);
  const totalBudget = useAppStore((s) => s.totalBudget);
  const sessionBudget = useAppStore((s) => s.sessionBudget);
  const parsedReceipts = useAppStore((s) => s.parsedReceipts);
  const feeFlags = useAppStore((s) => s.feeFlags);

  const [exporting, setExporting] = useState<'text' | 'html' | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const cartTotal = calculateCartTotals(items).totalAmount;
  const totalFees = feeFlags.reduce((sum, f) => sum + f.estimatedCost, 0);

  const reportText = generateReportText({
    items,
    transactions,
    totalBudget,
    sessionBudget,
    parsedReceipts,
    feeFlags,
  });

  const handleExportText = () => {
    setExporting('text');
    setTimeout(() => {
      downloadTextReport(reportText);
      setExporting(null);
    }, 600);
  };

  const handleExportHtml = () => {
    setExporting('html');
    setTimeout(() => {
      downloadHtmlReport(reportText);
      setExporting(null);
    }, 600);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-[var(--accent-primary-soft)] border border-[var(--accent-border)] text-[var(--accent-ink)] flex items-center justify-center">
          <FileText className="w-4 h-4" strokeWidth={2.25} />
        </div>
        <div>
          <h3 className="font-display text-[15px] font-bold text-[var(--text-primary)] tracking-tight">
            Export Audit Report
          </h3>
          <p className="text-[12px] text-[var(--text-secondary)]">
            Download structured text or printable HTML summary
          </p>
        </div>
      </div>

      {/* Hairline Quick Stats */}
      <div className="grid grid-cols-2 divide-x divide-[var(--border-subtle)] border-y border-[var(--border-subtle)] py-2.5">
        <div className="text-center px-2">
          <p className="text-[12px] font-medium text-[var(--text-secondary)]">
            Cart Value
          </p>
          <p className="text-sm font-bold font-mono tabular-nums text-[var(--text-primary)] mt-0.5">
            ₹{formatCurrency(cartTotal)}
          </p>
        </div>
        <div className="text-center px-2">
          <p className="text-[12px] font-medium text-[var(--text-secondary)]">
            Est. Fee Exposure
          </p>
          <p className="text-sm font-bold font-mono tabular-nums text-[var(--accent-success-ink)] mt-0.5">
            ₹{formatCurrency(totalFees)}
          </p>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={handleExportText}
          disabled={exporting !== null}
          className="btn-secondary py-2.5 px-4 text-[12.5px] flex items-center justify-center gap-2"
        >
          {exporting === 'text' ? (
            <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.25} />
          ) : (
            <Download className="w-4 h-4" strokeWidth={2.25} />
          )}
          Export .TXT
        </button>
        <button
          type="button"
          onClick={handleExportHtml}
          disabled={exporting !== null}
          className="btn-secondary py-2.5 px-4 text-[12.5px] flex items-center justify-center gap-2"
        >
          {exporting === 'html' ? (
            <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.25} />
          ) : (
            <FileDown className="w-4 h-4" strokeWidth={2.25} />
          )}
          Export .HTML
        </button>
      </div>

      {/* Preview Toggle */}
      <button
        type="button"
        onClick={() => setShowPreview(!showPreview)}
        className="w-full text-[12.5px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center justify-center gap-1.5 py-1.5"
      >
        <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.25} />
        {showPreview ? 'Hide preview' : 'Preview report'}
      </button>

      {showPreview && (
        <div className="surface-well p-3.5 max-h-72 overflow-y-auto scrollbar-thin">
          <pre className="text-[12px] leading-relaxed text-[var(--text-secondary)] font-mono whitespace-pre-wrap break-words">
            {reportText}
          </pre>
        </div>
      )}
    </div>
  );
}
