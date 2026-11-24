import { useState, useRef } from 'react';
import { Download, Upload, Database, Check, AlertCircle } from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { formatCurrency } from '../../utils/categoryStyles';
import {
  buildWorkspaceBackupPayload,
  downloadWorkspaceBackup,
  normalizeBackupPayload,
} from '../../utils/storeHelpers';

type ToastState = { type: 'success' | 'error'; message: string } | null;

export function DataBackup() {
  const transactionsCount = useAppStore((s) => s.transactions.length);
  const savedAuditsCount = useAppStore((s) => s.savedAudits.length);
  const totalBudget = useAppStore((s) => s.totalBudget);
  const importBackupData = useAppStore((s) => s.importBackupData);

  const [toast, setToast] = useState<ToastState>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleExport = () => {
    const payload = buildWorkspaceBackupPayload(useAppStore.getState());
    downloadWorkspaceBackup(payload);
    showToast('success', 'Backup exported successfully');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = event.target?.result;
        if (typeof raw !== 'string') {
          showToast('error', 'Invalid file format');
          return;
        }
        const parsed = JSON.parse(raw);
        const normalized = normalizeBackupPayload(parsed);
        importBackupData(normalized);
        showToast('success', 'Backup restored successfully');
      } catch (err) {
        showToast(
          'error',
          err instanceof Error && err.message.startsWith('Invalid backup')
            ? err.message
            : 'Failed to parse backup file'
        );
      }
    };
    reader.onerror = () => showToast('error', 'Failed to read file');
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="relative space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-[var(--accent-primary-soft)] border border-[var(--accent-border)] text-[var(--accent-ink)] flex items-center justify-center">
          <Database className="w-4 h-4" strokeWidth={2.25} />
        </div>
        <div>
          <h3 className="font-display text-[15px] font-bold text-[var(--text-primary)] tracking-tight">
            Data Backup &amp; Restore
          </h3>
          <p className="text-[12px] text-[var(--text-secondary)]">
            Export or restore a full JSON snapshot of your data
          </p>
        </div>
      </div>

      {/* Hairline Backup Summary */}
      <div className="grid grid-cols-3 divide-x divide-[var(--border-subtle)] border-y border-[var(--border-subtle)] py-2.5">
        <div className="text-center px-2">
          <p className="text-[12px] font-medium text-[var(--text-secondary)]">
            Txns
          </p>
          <p className="text-xs font-bold text-[var(--text-primary)] font-mono tabular-nums mt-0.5">
            {transactionsCount}
          </p>
        </div>
        <div className="text-center px-2">
          <p className="text-[12px] font-medium text-[var(--text-secondary)]">
            Audits
          </p>
          <p className="text-xs font-bold text-[var(--text-primary)] font-mono tabular-nums mt-0.5">
            {savedAuditsCount}
          </p>
        </div>
        <div className="text-center px-2">
          <p className="text-[12px] font-medium text-[var(--text-secondary)]">
            Budget
          </p>
          <p className="text-xs font-bold text-[var(--text-primary)] font-mono tabular-nums mt-0.5">
            ₹{formatCurrency(totalBudget)}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={handleExport}
          className="btn-secondary py-2.5 px-4 text-[12.5px] flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" strokeWidth={2.25} />
          Export Data
        </button>
        <button
          type="button"
          onClick={handleImportClick}
          className="btn-secondary py-2.5 px-4 text-[12.5px] flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4" strokeWidth={2.25} />
          Import Backup
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        aria-label="Import backup JSON file"
        accept="application/json,.json"
        onChange={handleImportFile}
        className="hidden"
      />

      {toast && (
        <div
          role="status"
          className={`modal-panel fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl flex items-center gap-2 ${
            toast.type === 'success'
              ? 'border-[var(--accent-success-border)] text-[var(--accent-success-ink)]'
              : 'border-[var(--accent-danger-border)] text-[var(--accent-danger-ink)]'
          }`}
        >
          {toast.type === 'success' ? (
            <Check className="w-4 h-4 shrink-0" strokeWidth={2.5} />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={2.5} />
          )}
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
