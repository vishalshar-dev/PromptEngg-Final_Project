import { useEffect, useRef, useState } from 'react';
import { ScanLine, Scale, LineChart, ArrowRight } from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { ReceiptUploader } from './ReceiptUploader';
import { FeeDetector } from './FeeDetector';
import { ExportReport } from './ExportReport';
import { BudgetGuardrail } from './BudgetGuardrail';
import { AuditHistory } from './AuditHistory';
import { DataBackup } from './DataBackup';
import { CartComparator } from './CartComparator';

export type ScannerTab = 'scan' | 'tools';

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

  const hasToolsTab =
    featureSettings.showAuditComparator || featureSettings.showAuditExportBackup;
  const [activeTab, setActiveTab] = useState<ScannerTab>('scan');

  useEffect(() => {
    if (!hasToolsTab && activeTab === 'tools') {
      setActiveTab('scan');
    }
  }, [hasToolsTab, activeTab]);

  useEffect(() => {
    if (focusTarget === 'comparator' && featureSettings.showAuditComparator) {
      setActiveTab('tools');
      const timer = window.setTimeout(() => {
        comparatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return () => window.clearTimeout(timer);
    }
  }, [focusTarget, focusSignal, featureSettings.showAuditComparator]);

  const showRightScanCol =
    featureSettings.showAuditFeeScanner || featureSettings.showAuditHistory;

  return (
    <div className="space-y-5">
      {/* Header + Integrated Underline Tab Strip */}
      <div className="border-b border-[var(--border-subtle)]">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4">
          <div className="min-w-0">
            <h1 className="font-display text-[22px] sm:text-[26px] font-bold tracking-tight text-[var(--text-primary)] leading-tight">
              Receipt Scanner
            </h1>
            <p className="text-[13.5px] text-[var(--text-secondary)] mt-1 max-w-2xl leading-relaxed">
              Scan receipts with AI vision, detect hidden checkout fees, compare quick-commerce carts, and export backups.
            </p>
          </div>
          {featureSettings.showPriceTracker &&
            featureSettings.showInsights &&
            onOpenPriceTracker && (
              <button
                type="button"
                onClick={onOpenPriceTracker}
                className="text-[12.5px] font-semibold text-[var(--accent-ink)] hover:opacity-80 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 self-start sm:self-auto"
              >
                <LineChart className="w-4 h-4" />
                <span>Price Intelligence</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
        </div>

        <div
          role="tablist"
          aria-label="Receipt scanner views"
          className="flex items-center gap-6 -mb-px overflow-x-auto no-scrollbar"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'scan'}
            onClick={() => setActiveTab('scan')}
            className={`flex items-center gap-2 pb-3 text-[13.5px] font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'scan'
                ? 'border-[var(--accent-primary)] text-[var(--accent-ink)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <ScanLine className="w-4 h-4" />
            Scan &amp; Audit
          </button>

          {hasToolsTab && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'tools'}
              onClick={() => setActiveTab('tools')}
              className={`flex items-center gap-2 pb-3 text-[13.5px] font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'tools'
                  ? 'border-[var(--accent-primary)] text-[var(--accent-ink)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Scale className="w-4 h-4" />
              Comparator &amp; Exports
            </button>
          )}
        </div>
      </div>

      {activeTab === 'scan' ? (
        <div
          className={`grid grid-cols-1 ${showRightScanCol ? 'lg:grid-cols-12' : ''} gap-6 items-start`}
        >
          <div className={`${showRightScanCol ? 'lg:col-span-7' : ''} space-y-6`}>
            {featureSettings.showAuditGuardrail && <BudgetGuardrail />}
            <div className="surface-card p-5">
              <ReceiptUploader />
            </div>
          </div>

          {showRightScanCol && (
            <div className="lg:col-span-5 space-y-6">
              {featureSettings.showAuditFeeScanner && (
                <div className="surface-card p-5">
                  <FeeDetector />
                </div>
              )}
              {featureSettings.showAuditHistory && (
                <div className="surface-card p-5">
                  <AuditHistory />
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {featureSettings.showAuditComparator && (
            <div
              id="cart-comparator"
              ref={comparatorRef}
              className={`${
                featureSettings.showAuditExportBackup ? 'lg:col-span-7' : 'lg:col-span-12'
              } surface-card p-5 scroll-mt-16`}
            >
              <CartComparator />
            </div>
          )}

          {featureSettings.showAuditExportBackup && (
            <div
              className={`${
                featureSettings.showAuditComparator ? 'lg:col-span-5' : 'lg:col-span-12'
              } surface-card p-5 divide-y divide-[var(--border-subtle)] space-y-6`}
            >
              <ExportReport />
              <div className="pt-6">
                <DataBackup />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
