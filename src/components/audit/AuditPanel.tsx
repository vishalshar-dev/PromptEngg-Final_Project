import { useEffect, useRef } from 'react';
import { PageHeader } from '../ui/PageHeader';
import { useAppStore } from '../../store/useStore';
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
  focusTarget,
  focusSignal,
}: {
  onOpenPriceTracker?: () => void;
  focusTarget?: 'comparator';
  focusSignal?: number;
}) {
  const featureSettings = useAppStore((s) => s.featureSettings);
  const comparatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focusTarget === 'comparator' && featureSettings.showAuditComparator) {
      const timer = window.setTimeout(() => {
        comparatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
      return () => window.clearTimeout(timer);
    }
  }, [focusTarget, focusSignal, featureSettings.showAuditComparator]);

  const showRightCol =
    featureSettings.showAuditComparator ||
    featureSettings.showPriceTracker ||
    featureSettings.showAuditExportBackup;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Receipt Scanner"
        description="Scan receipts with AI vision, detect hidden checkout fees, compare quick-commerce carts, and export backups."
      />

      {/* Responsive 2-column grid on desktop */}
      <div className={`grid grid-cols-1 ${showRightCol ? 'lg:grid-cols-2' : ''} gap-6 items-start`}>
        <div className="space-y-6">
          {/* Session Budget Guardrail */}
          {featureSettings.showAuditGuardrail && <BudgetGuardrail />}

          {/* Receipt OCR Scanner */}
          <div className="surface-card p-5">
            <ReceiptUploader />
          </div>

          {/* Fee Detector */}
          {featureSettings.showAuditFeeScanner && (
            <div className="surface-card p-5">
              <FeeDetector />
            </div>
          )}

          {/* Saved Audit History */}
          {featureSettings.showAuditHistory && (
            <div className="surface-card p-5">
              <AuditHistory />
            </div>
          )}
        </div>

        {showRightCol && (
          <div className="space-y-6">
            {/* Multi-App Cart Comparator */}
            {featureSettings.showAuditComparator && (
              <div id="cart-comparator" ref={comparatorRef} className="surface-card p-5 scroll-mt-16">
                <CartComparator />
              </div>
            )}

            {/* Price Trends */}
            {featureSettings.showPriceTracker && (
              <div className="surface-card p-5">
                <PriceTrendTracker onOpenPriceTracker={onOpenPriceTracker} />
              </div>
            )}

            {/* Export Report */}
            {featureSettings.showAuditExportBackup && (
              <>
                <div className="surface-card p-5">
                  <ExportReport />
                </div>

                {/* Data Backup & Restore */}
                <div className="surface-card p-5">
                  <DataBackup />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
