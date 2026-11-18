import { PageHeader } from '../ui/PageHeader';
import { ReceiptUploader } from './ReceiptUploader';
import { FeeDetector } from './FeeDetector';
import { PriceTrendTracker } from './PriceTrendTracker';
import { ExportReport } from './ExportReport';
import { BudgetGuardrail } from './BudgetGuardrail';
import { AuditHistory } from './AuditHistory';
import { DataBackup } from './DataBackup';
import { CartComparator } from './CartComparator';

export function AuditPanel({
  onOpenPriceTracker,
}: {
  onOpenPriceTracker?: () => void;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Receipt Scanner"
        description="Scan receipts with AI vision, detect hidden checkout fees, compare quick-commerce carts, and export backups."
      />

      {/* Responsive 2-column grid on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          {/* Session Budget Guardrail */}
          <BudgetGuardrail />

          {/* Receipt OCR Scanner */}
          <div className="surface-card p-5">
            <ReceiptUploader />
          </div>

          {/* Fee Detector */}
          <div className="surface-card p-5">
            <FeeDetector />
          </div>

          {/* Saved Audit History */}
          <div className="surface-card p-5">
            <AuditHistory />
          </div>
        </div>

        <div className="space-y-6">
          {/* Multi-App Cart Comparator */}
          <div className="surface-card p-5">
            <CartComparator />
          </div>

          {/* Price Trends */}
          <div className="surface-card p-5">
            <PriceTrendTracker onOpenPriceTracker={onOpenPriceTracker} />
          </div>

          {/* Export Report */}
          <div className="surface-card p-5">
            <ExportReport />
          </div>

          {/* Data Backup & Restore */}
          <div className="surface-card p-5">
            <DataBackup />
          </div>
        </div>
      </div>
    </div>
  );
}
