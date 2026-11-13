import { useState } from 'react';
import { FileText, Download, FileDown, CheckCircle2, Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { generateReportText, downloadTextReport, downloadHtmlReport } from '../../utils/reportGenerator';
import { formatCurrency } from '../../utils/categoryStyles';

export function ExportReport() {
  const items = useAppStore((s) => s.items);
  const transactions = useAppStore((s) => s.transactions);
  const totalBudget = useAppStore((s) => s.totalBudget);
  const sessionBudget = useAppStore((s) => s.sessionBudget);
  const parsedReceipts = useAppStore((s) => s.parsedReceipts);
  const feeFlags = useAppStore((s) => s.feeFlags);

  const [exporting, setExporting] = useState<'text' | 'html' | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const cartItems = items.filter((i) => i.quantity > 0);
  const cartTotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalFees = feeFlags.reduce((sum, f) => sum + f.estimatedCost, 0);

  const reportText = generateReportText({
    items, transactions, totalBudget, sessionBudget, parsedReceipts, feeFlags,
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
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-violet-400" strokeWidth={2.5} />
        <h3 className="text-sm font-extrabold tracking-tight">Export Audit Report</h3>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="glass rounded-xl p-2.5">
          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Cart Value</p>
          <p className="text-sm font-extrabold font-mono text-white">₹{formatCurrency(cartTotal)}</p>
        </div>
        <div className="glass rounded-xl p-2.5">
          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Est. Savings</p>
          <p className="text-sm font-extrabold font-mono text-brand-400">₹{formatCurrency(totalFees)}</p>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={handleExportText}
          disabled={exporting !== null}
          className="bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 border border-white/[0.06] hover:border-violet-500/30 disabled:opacity-50"
        >
          {exporting === 'text' ? (
            <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} />
          ) : (
            <Download className="w-4 h-4" strokeWidth={2.5} />
          )}
          .TXT
        </button>
        <button
          onClick={handleExportHtml}
          disabled={exporting !== null}
          className="bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 border border-white/[0.06] hover:border-violet-500/30 disabled:opacity-50"
        >
          {exporting === 'html' ? (
            <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} />
          ) : (
            <FileDown className="w-4 h-4" strokeWidth={2.5} />
          )}
          .HTML
        </button>
      </div>

      {/* Preview Toggle */}
      <button
        onClick={() => setShowPreview(!showPreview)}
        className="w-full text-xs font-bold text-zinc-500 hover:text-white transition-colors flex items-center justify-center gap-1.5 py-2"
      >
        <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} />
        {showPreview ? 'Hide preview' : 'Preview report'}
      </button>

      {showPreview && (
        <div className="glass rounded-xl p-3.5 max-h-72 overflow-y-auto scrollbar-thin animate-scale-in">
          <pre className="text-[10px] leading-relaxed text-zinc-400 font-mono whitespace-pre-wrap break-words">
            {reportText}
          </pre>
        </div>
      )}
    </div>
  );
}
