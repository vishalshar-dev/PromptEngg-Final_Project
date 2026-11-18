import { useState, useRef } from 'react';
import { Download, Upload, Database, Check, AlertCircle } from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { formatCurrency } from '../../utils/categoryStyles';
import { normalizeBackupPayload } from '../../utils/storeHelpers';

type ToastState = { type: 'success' | 'error'; message: string } | null;

export function DataBackup() {
  const transactions = useAppStore((s) => s.transactions);
  const items = useAppStore((s) => s.items);
  const categories = useAppStore((s) => s.categories);
  const categoryConfigs = useAppStore((s) => s.categoryConfigs);
  const priceHistory = useAppStore((s) => s.priceHistory);
  const purchaseHistory = useAppStore((s) => s.purchaseHistory);
  const totalBudget = useAppStore((s) => s.totalBudget);
  const sessionBudget = useAppStore((s) => s.sessionBudget);
  const categoryCaps = useAppStore((s) => s.categoryCaps);
  const savedAudits = useAppStore((s) => s.savedAudits);
  const people = useAppStore((s) => s.people);
  const sharedExpenses = useAppStore((s) => s.sharedExpenses);
  const settlements = useAppStore((s) => s.settlements);
  const importBackupData = useAppStore((s) => s.importBackupData);

  const [toast, setToast] = useState<ToastState>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleExport = () => {
    const customItems = items;
    const backup = {
      version: 1 as const,
      exportedAt: new Date().toISOString(),
      transactions,
      customItems,
      categories,
      categoryConfigs,
      priceHistory,
      purchaseHistory,
      totalBudget,
      sessionBudget,
      categoryCaps,
      savedAudits,
      people,
      sharedExpenses,
      settlements,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cartaudit-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
    <div className="relative space-y-3">
      <div className="flex items-center gap-2">
        <Database className="w-4 h-4 text-violet-400" strokeWidth={2.5} />
        <h3 className="text-sm font-extrabold tracking-tight">Data Backup</h3>
      </div>

      <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">
        Export a full JSON backup of your transactions, custom items, categories, budgets, and saved audits. Restore from a previous backup file anytime.
      </p>

      {/* Backup Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="glass rounded-lg p-2 text-center">
          <p className="text-[8px] font-bold uppercase tracking-wider text-zinc-600">Txns</p>
          <p className="text-xs font-bold text-zinc-300 font-mono">{transactions.length}</p>
        </div>
        <div className="glass rounded-lg p-2 text-center">
          <p className="text-[8px] font-bold uppercase tracking-wider text-zinc-600">Audits</p>
          <p className="text-xs font-bold text-zinc-300 font-mono">{savedAudits.length}</p>
        </div>
        <div className="glass rounded-lg p-2 text-center">
          <p className="text-[8px] font-bold uppercase tracking-wider text-zinc-600">Budget</p>
          <p className="text-xs font-bold text-zinc-300 font-mono">₹{formatCurrency(totalBudget)}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={handleExport}
          className="bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 border border-white/[0.06] hover:border-violet-500/30"
        >
          <Download className="w-4 h-4" strokeWidth={2.5} />
          Export Data
        </button>
        <button
          type="button"
          onClick={handleImportClick}
          className="bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 border border-white/[0.06] hover:border-violet-500/30"
        >
          <Upload className="w-4 h-4" strokeWidth={2.5} />
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

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl border shadow-2xl animate-slide-up flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-ink-850 border-brand-500/30 glow-brand'
              : 'bg-ink-850 border-red-500/30 glow-red'
          }`}
        >
          {toast.type === 'success' ? (
            <Check className="w-4 h-4 text-brand-400" strokeWidth={2.5} />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400" strokeWidth={2.5} />
          )}
          <span className={`text-sm font-bold ${toast.type === 'success' ? 'text-brand-400' : 'text-red-400'}`}>
            {toast.message}
          </span>
        </div>
      )}
    </div>
  );
}
