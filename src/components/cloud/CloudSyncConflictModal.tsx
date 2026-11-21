import { Cloud, GitMerge, Laptop, Smartphone } from 'lucide-react';
import { useCloudSync } from '../../contexts/CloudSyncContext';

export function CloudSyncConflictModal() {
  const { pendingConflict, resolveConflict, syncStatus } = useCloudSync();

  if (!pendingConflict) return null;

  const isBusy = syncStatus === 'syncing';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cloud-conflict-title"
    >
      <div className="fixed inset-0 bg-[#151922]/55 backdrop-blur-[2px] animate-fade-in" />

      <div className="relative z-10 w-full max-w-lg bg-white border border-[#E7EAF0] rounded-t-3xl sm:rounded-2xl shadow-modal p-5 space-y-4 animate-slide-up">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EDF2FF] border border-[#D4E0FF] text-[#365FE8] flex items-center justify-center shrink-0">
            <Cloud className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2
              id="cloud-conflict-title"
              className="text-base font-bold text-[#151922] tracking-tight"
            >
              Sync Data Found on Both Devices
            </h2>
            <p className="text-xs text-[#697386] mt-0.5 leading-relaxed">
              This browser has unsynced activity and your Google account already has a cloud workspace. Choose how to combine them:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="surface-subtle p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#151922]">
              <Smartphone className="w-3.5 h-3.5 text-[#365FE8]" />
              <span>This Device</span>
            </div>
            <p className="text-[11.5px] text-[#697386] font-mono tabular-nums">
              {pendingConflict.localTransactionCount} expenses · {pendingConflict.localSplitsCount} splits · {pendingConflict.localPennyCount} chats
            </p>
          </div>

          <div className="surface-subtle p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#151922]">
              <Laptop className="w-3.5 h-3.5 text-[#15966B]" />
              <span className="truncate">{pendingConflict.cloudDeviceName}</span>
            </div>
            <p className="text-[11.5px] text-[#697386] font-mono tabular-nums">
              {pendingConflict.cloudTransactionCount} expenses · {pendingConflict.cloudSplitsCount} splits · {pendingConflict.cloudPennyCount} chats
            </p>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void resolveConflict('merge')}
            className="btn-primary w-full px-4 py-2.5 text-xs justify-between"
          >
            <span className="flex items-center gap-2">
              <GitMerge className="w-4 h-4" />
              <span>Smart Merge Both Devices (Recommended)</span>
            </span>
            <span className="text-[11px] opacity-85">Keep all records</span>
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void resolveConflict('cloud')}
              className="btn-secondary px-3 py-2 text-xs"
            >
              Use Cloud Workspace
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void resolveConflict('local')}
              className="btn-secondary px-3 py-2 text-xs"
            >
              Keep This Device
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
