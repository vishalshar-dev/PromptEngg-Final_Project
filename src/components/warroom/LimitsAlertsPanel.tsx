import { useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Pencil,
  Plus,
  RotateCcw,
  Sliders,
  Trash2,
  X,
} from 'lucide-react';
import type { WarRoomPeriod } from '../../types/models';
import { formatCurrencyExact } from '../../utils/categoryStyles';
import type {
  EvaluatedCategoryLimit,
  SmartAlert,
} from '../../utils/warRoomEngine';

interface LimitsAlertsPanelProps {
  categories: string[];
  evaluatedLimits: EvaluatedCategoryLimit[];
  activeAlerts: SmartAlert[];
  dismissedCount: number;
  onUpsertLimit: (input: {
    id?: string;
    category: string;
    period: WarRoomPeriod;
    limitAmount: number;
    warningThresholdPct?: number;
    enabled?: boolean;
  }) => void;
  onDeleteLimit: (id: string) => void;
  onDismissAlert: (signature: string) => void;
  onRestoreDismissedAlerts: () => void;
}

export function LimitsAlertsPanel({
  categories,
  evaluatedLimits,
  activeAlerts,
  dismissedCount,
  onUpsertLimit,
  onDeleteLimit,
  onDismissAlert,
  onRestoreDismissedAlerts,
}: LimitsAlertsPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [category, setCategory] = useState(categories[0] || 'Junk');
  const [period, setPeriod] = useState<WarRoomPeriod>('monthly');
  const [limitAmount, setLimitAmount] = useState('500');
  const [thresholdPct, setThresholdPct] = useState('80');
  const [formError, setFormError] = useState<string | null>(null);

  const startEdit = (ev: EvaluatedCategoryLimit) => {
    setEditingId(ev.limit.id);
    setCategory(ev.limit.category);
    setPeriod(ev.limit.period);
    setLimitAmount(String(ev.limit.limitAmount));
    setThresholdPct(String(ev.limit.warningThresholdPct));
    setFormError(null);
  };

  const resetForm = () => {
    setEditingId(null);
    setCategory(categories[0] || 'Junk');
    setPeriod('monthly');
    setLimitAmount('500');
    setThresholdPct('80');
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(limitAmount);
    const thr = Number(thresholdPct);
    if (!category.trim()) {
      setFormError('Select a category');
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setFormError('Enter a limit amount greater than ₹0');
      return;
    }
    onUpsertLimit({
      id: editingId ?? undefined,
      category: category.trim(),
      period,
      limitAmount: amt,
      warningThresholdPct: Number.isFinite(thr) ? thr : 80,
      enabled: true,
    });
    resetForm();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left: Category Spending Limits */}
      <div className="lg:col-span-7 space-y-5">
        <form onSubmit={handleSubmit} className="surface-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#365FE8]" />
              <h3 className="text-[15px] font-bold text-[#151922]">
                {editingId
                  ? 'Edit Category Spending Limit'
                  : 'Set Category Spending Limit'}
              </h3>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-semibold text-[#697386] hover:text-[#151922]"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label
                htmlFor="limit-category"
                className="text-[11px] font-semibold uppercase tracking-wider text-[#697386] block mb-1"
              >
                Category
              </label>
              <select
                id="limit-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-field w-full px-3 py-2 text-xs font-medium"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="limit-period"
                className="text-[11px] font-semibold uppercase tracking-wider text-[#697386] block mb-1"
              >
                Period
              </label>
              <select
                id="limit-period"
                value={period}
                onChange={(e) => setPeriod(e.target.value as WarRoomPeriod)}
                className="input-field w-full px-3 py-2 text-xs font-medium"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="limit-amount"
                className="text-[11px] font-semibold uppercase tracking-wider text-[#697386] block mb-1"
              >
                Cap (₹)
              </label>
              <input
                id="limit-amount"
                type="number"
                min="1"
                step="any"
                value={limitAmount}
                onChange={(e) => setLimitAmount(e.target.value)}
                className="input-field w-full px-3 py-2 text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="w-full sm:w-44">
              <label
                htmlFor="limit-warning-pct"
                className="text-[11px] font-semibold uppercase tracking-wider text-[#697386] block mb-1"
              >
                Warn At (%)
              </label>
              <input
                id="limit-warning-pct"
                type="number"
                min="10"
                max="99"
                value={thresholdPct}
                onChange={(e) => setThresholdPct(e.target.value)}
                className="input-field w-full px-3 py-2 text-xs font-mono"
              />
            </div>

            <button
              type="submit"
              className="btn-primary px-4 py-2.5 text-xs flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
              {editingId ? 'Update Limit' : 'Save Category Limit'}
            </button>
          </div>

          {formError && <p className="text-xs text-[#DE5252]">{formError}</p>}
          <p className="text-xs text-[#697386]">
            Monthly category limits automatically sync with Smart Radar category caps. Periods reset cleanly by local calendar day, week, or month.
          </p>
        </form>

        {/* Active Limits List */}
        <div className="surface-card p-5 space-y-3.5">
          <h3 className="text-[15px] font-bold text-[#151922]">
            Configured Limits ({evaluatedLimits.length})
          </h3>

          {evaluatedLimits.length === 0 ? (
            <p className="text-xs text-[#697386] py-3">
              No category spending limits set yet. Add a daily, weekly, or monthly limit above to track category discipline.
            </p>
          ) : (
            <div className="divide-y divide-[#E7EAF0]">
              {evaluatedLimits.map((ev) => {
                const statusBadge =
                  ev.status === 'exceeded'
                    ? 'bg-[#FDECEC] text-[#DE5252] border-[#F6B8B8]'
                    : ev.status === 'reached' || ev.status === 'approaching'
                    ? 'bg-[#FEF6E7] text-[#9E6614] border-[#F3D8A8]'
                    : 'bg-[#E8F7F1] text-[#15966B] border-[#B7E4D3]';

                const statusText =
                  ev.status === 'exceeded'
                    ? 'Exceeded'
                    : ev.status === 'reached'
                    ? 'Reached (100%)'
                    : ev.status === 'approaching'
                    ? 'Approaching'
                    : 'Normal';

                return (
                  <div
                    key={ev.limit.id}
                    className="py-3.5 first:pt-0 last:pb-0 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-[#151922]">
                            {ev.limit.category}
                          </span>
                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-[#F1F3F6] text-[#4F5869] border border-[#E7EAF0]">
                            {ev.limit.period} · {ev.periodLabel}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${statusBadge}`}
                          >
                            {ev.limit.enabled ? statusText : 'Paused'}
                          </span>
                        </div>
                        <p className="text-xs text-[#697386] font-mono tabular-nums mt-1">
                          Spent ₹{formatCurrencyExact(ev.spent)} of ₹
                          {formatCurrencyExact(ev.limit.limitAmount)} ·
                          Remaining ₹{formatCurrencyExact(ev.remaining)} (
                          {ev.utilisationPct}%)
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            onUpsertLimit({
                              ...ev.limit,
                              enabled: !ev.limit.enabled,
                            })
                          }
                          className="btn-secondary px-2.5 py-1 text-[11px]"
                        >
                          {ev.limit.enabled ? 'Pause' : 'Resume'}
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(ev)}
                          aria-label={`Edit limit for ${ev.limit.category}`}
                          className="p-1.5 rounded-lg text-[#697386] hover:text-[#151922] hover:bg-[#F1F3F6]"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteLimit(ev.limit.id)}
                          aria-label={`Delete limit for ${ev.limit.category}`}
                          className="p-1.5 rounded-lg text-[#697386] hover:text-[#DE5252] hover:bg-[#FDECEC]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="h-2 rounded-full bg-[#ECEFF4] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          ev.status === 'exceeded'
                            ? 'bg-[#DE5252]'
                            : ev.status === 'reached' ||
                              ev.status === 'approaching'
                            ? 'bg-[#E5A23B]'
                            : 'bg-[#15966B]'
                        }`}
                        style={{
                          width: `${Math.min(100, ev.utilisationPct)}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right: Smart Spending Alerts Feed */}
      <div className="lg:col-span-5 surface-card p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#C7851F]" />
            <h3 className="text-[15px] font-bold text-[#151922]">
              Smart Alerts ({activeAlerts.length})
            </h3>
          </div>
          {dismissedCount > 0 && (
            <button
              type="button"
              onClick={onRestoreDismissedAlerts}
              className="text-xs font-semibold text-[#365FE8] hover:text-[#294FCC] flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Restore ({dismissedCount})
            </button>
          )}
        </div>

        <p className="text-xs text-[#697386]">
          Rule-based alerts generated dynamically from your live transactions, limits, and week-over-week trends.
        </p>

        {activeAlerts.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="w-7 h-7 text-[#15966B] mx-auto" />
            <p className="text-sm font-bold text-[#151922]">All Clear</p>
            <p className="text-xs text-[#697386]">
              No active approaching limits, unusual spikes, or repeated small purchase alerts.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {activeAlerts.map((alert) => (
              <div
                key={alert.signature}
                className={`rounded-xl p-3.5 border flex items-start justify-between gap-2.5 ${
                  alert.severity === 'critical'
                    ? 'bg-[#FDECEC] border-[#F6B8B8]'
                    : alert.severity === 'warning'
                    ? 'bg-[#FEF6E7] border-[#F3D8A8]'
                    : 'bg-[#E8F7F1] border-[#B7E4D3]'
                }`}
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <AlertTriangle
                      className={`w-3.5 h-3.5 shrink-0 ${
                        alert.severity === 'critical'
                          ? 'text-[#DE5252]'
                          : alert.severity === 'warning'
                          ? 'text-[#9E6614]'
                          : 'text-[#15966B]'
                      }`}
                    />
                    <span className="text-xs font-bold text-[#151922]">
                      {alert.title}
                    </span>
                    {alert.metricValue && (
                      <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#FFFFFF] border border-[#E7EAF0] text-[#151922]">
                        {alert.metricValue}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#4F5869] leading-relaxed">
                    {alert.reason}
                  </p>
                  <p className="text-[11px] font-medium text-[#697386]">
                    {alert.category ? `${alert.category} · ` : ''}
                    {alert.periodLabel}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onDismissAlert(alert.signature)}
                  aria-label={`Dismiss alert ${alert.title}`}
                  className="p-1 rounded-lg text-[#697386] hover:text-[#151922] hover:bg-[#FFFFFF] shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
