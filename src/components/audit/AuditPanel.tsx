import { ScanSearch } from 'lucide-react';
import { ReceiptUploader } from './ReceiptUploader';
import { FeeDetector } from './FeeDetector';
import { PriceTrendTracker } from './PriceTrendTracker';
import { ExportReport } from './ExportReport';
import { BudgetGuardrail } from './BudgetGuardrail';

export function AuditPanel() {
  return (
    <div className="space-y-5">
      {/* Page Title */}
      <div className="flex items-center gap-2">
        <ScanSearch className="w-5 h-5 text-brand-400" strokeWidth={2.5} />
        <h2 className="text-lg font-extrabold tracking-tight">Audit Lab</h2>
      </div>

      {/* Session Budget Guardrail */}
      <BudgetGuardrail />

      {/* Receipt OCR Scanner */}
      <div className="glass rounded-2xl p-4">
        <ReceiptUploader />
      </div>

      {/* Fee Detector */}
      <div className="glass rounded-2xl p-4">
        <FeeDetector />
      </div>

      {/* Price Trends */}
      <div className="glass rounded-2xl p-4">
        <PriceTrendTracker />
      </div>

      {/* Export Report */}
      <div className="glass rounded-2xl p-4">
        <ExportReport />
      </div>
    </div>
  );
}
