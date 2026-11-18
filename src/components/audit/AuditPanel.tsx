import { ScanSearch } from 'lucide-react';
import { ReceiptUploader } from './ReceiptUploader';
import { FeeDetector } from './FeeDetector';
import { PriceTrendTracker } from './PriceTrendTracker';
import { ExportReport } from './ExportReport';
import { BudgetGuardrail } from './BudgetGuardrail';
import { AuditHistory } from './AuditHistory';
import { DataBackup } from './DataBackup';
import { CartComparator } from './CartComparator';

export function AuditPanel() {
  return (
    <div className="space-y-5">
      {/* Page Title */}
      <div className="flex items-center gap-2">
        <ScanSearch className="w-5 h-5 text-brand-400" strokeWidth={2.5} />
        <h2 className="text-lg font-extrabold tracking-tight">Audit Lab</h2>
      </div>

      {/* Responsive 2-column grid on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <div className="space-y-5">
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

          {/* Saved Audit History */}
          <div className="glass rounded-2xl p-4">
            <AuditHistory />
          </div>
        </div>

        <div className="space-y-5">
          {/* Multi-App Cart Comparator */}
          <div className="glass rounded-2xl p-4">
            <CartComparator />
          </div>

          {/* Price Trends */}
          <div className="glass rounded-2xl p-4">
            <PriceTrendTracker />
          </div>

          {/* Export Report */}
          <div className="glass rounded-2xl p-4">
            <ExportReport />
          </div>

          {/* Data Backup & Restore */}
          <div className="glass rounded-2xl p-4">
            <DataBackup />
          </div>
        </div>
      </div>
    </div>
  );
}
