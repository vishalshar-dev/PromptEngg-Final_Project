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
  const basketTemplates = useAppStore((s) => s.basketTemplates);
  const basketTemplatesSeeded = useAppStore((s) => s.basketTemplatesSeeded);
  const totalBudget = useAppStore((s) => s.totalBudget);
  const sessionBudget = useAppStore((s) => s.sessionBudget);
  const categoryCaps = useAppStore((s) => s.categoryCaps);
  const savedAudits = useAppStore((s) => s.savedAudits);
  const people = useAppStore((s) => s.people);
  const sharedExpenses = useAppStore((s) => s.sharedExpenses);
  const settlements = useAppStore((s) => s.settlements);
  const priceObservations = useAppStore((s) => s.priceObservations);
  const priceAlerts = useAppStore((s) => s.priceAlerts);
  const isBrokeMode = useAppStore((s) => s.isBrokeMode);
  const brokeModeConfig = useAppStore((s) => s.brokeModeConfig);
  const categoryLimits = useAppStore((s) => s.categoryLimits);
  const warRoomChallenges = useAppStore((s) => s.warRoomChallenges);
  const warRoomTargets = useAppStore((s) => s.warRoomTargets);
  const dismissedWarRoomAlerts = useAppStore((s) => s.dismissedWarRoomAlerts);
  const disciplineCheckIns = useAppStore((s) => s.disciplineCheckIns);
  const theme = useAppStore((s) => s.theme);
  const visualTheme = useAppStore((s) => s.visualTheme);
  const budgetResetDay = useAppStore((s) => s.budgetResetDay);
  const budgetRolloverEnabled = useAppStore((s) => s.budgetRolloverEnabled);
  const featureSettings = useAppStore((s) => s.featureSettings);
  const pennyMessages = useAppStore((s) => s.pennyMessages);
  const pennyProfile = useAppStore((s) => s.pennyProfile);
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
      basketTemplates,
      basketTemplatesSeeded,
      priceObservations,
      priceAlerts,
      totalBudget,
      budgetResetDay,
      budgetRolloverEnabled,
      sessionBudget,
      categoryCaps,
      savedAudits,
      people,
      sharedExpenses,
      settlements,
      isBrokeMode,
      brokeModeConfig,
      categoryLimits,
      warRoomChallenges,
      warRoomTargets,
      dismissedWarRoomAlerts,
      disciplineCheckIns,
      theme,
      visualTheme,
      featureSettings,
      pennyMessages,
      pennyProfile,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    });
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
    <div className="relative space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-[#EDF2FF] border border-[#D4E0FF] text-[#365FE8] flex items-center justify-center">
          <Database className="w-4 h-4" strokeWidth={2.25} />
        </div>
        <div>
          <h3 className="text-[15px] font-bold text-[#151922] tracking-tight">
            Data Backup &amp; Restore
          </h3>
          <p className="text-xs text-[#697386]">
            Export or restore a full JSON snapshot of your data
          </p>
        </div>
      </div>

      {/* Backup Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="surface-subtle p-2.5 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#697386]">
            Txns
          </p>
          <p className="text-xs font-bold text-[#151922] font-mono tabular-nums mt-0.5">
            {transactions.length}
          </p>
        </div>
        <div className="surface-subtle p-2.5 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#697386]">
            Audits
          </p>
          <p className="text-xs font-bold text-[#151922] font-mono tabular-nums mt-0.5">
            {savedAudits.length}
          </p>
        </div>
        <div className="surface-subtle p-2.5 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#697386]">
            Budget
          </p>
          <p className="text-xs font-bold text-[#151922] font-mono tabular-nums mt-0.5">
            ₹{formatCurrency(totalBudget)}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={handleExport}
          className="btn-secondary py-2.5 px-4 text-xs flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" strokeWidth={2.25} />
          Export Data
        </button>
        <button
          type="button"
          onClick={handleImportClick}
          className="btn-secondary py-2.5 px-4 text-xs flex items-center justify-center gap-2"
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
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl border shadow-lg flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-[#E8F7F1] border-[#B7E4D3] text-[#15966B]'
              : 'bg-[#FDECEC] border-[#F6B8B8] text-[#DE5252]'
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
