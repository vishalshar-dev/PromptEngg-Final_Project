import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import type { WarRoomPeriod } from '../../types/models';
import { formatCurrencyExact } from '../../utils/categoryStyles';
import type {
  EvaluatedCategoryLimit,
  SmartAlert,
} from '../../utils/warRoomEngine';
import { ProgressBar } from '../ui/ProgressBar';
import { SectionHeader } from '../ui/SectionHeader';

interface LimitsAlertsPanelProps {
  categories: string[];
  evaluatedLimits: EvaluatedCategoryLimit[];
  activeAlerts: SmartAlert[];
  dismissedCount: number;
  prefillLimitCategory?: { category: string; nonce: number } | null;
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
  prefillLimitCategory,
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
  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!prefillLimitCategory?.category) return;
    setEditingId(null);
    setCategory(prefillLimitCategory.category);
    setPeriod('monthly');
    setFormError(null);
    setTimeout(() => {
      amountInputRef.current?.focus();
    }, 30);
  }, [prefillLimitCategory]);

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

  const categoryChoices = categories.includes(category)
    ? categories
    : [category, ...categories];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left: Category Spending Limits */}
      <div className="lg:col-span-7 space-y-6">
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-[#E7EAF0] rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[15px] font-semibold text-[#151922]">
              {editingId
                ? 'Edit Category Spending Limit'
                : 'Set Category Spending Limit'}
            </h3>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-[12.5px] font-medium text-[#697386] hover:text-[#151922]"
              >
                Cancel edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label
                htmlFor="limit-category"
                className="text-[11px] font-medium uppercase tracking-wider text-[#697386] block mb-1"
              >
                Category
              </label>
              <select
                id="limit-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-field w-full px-3 py-2 text-[13px] font-medium"
              >
                {categoryChoices.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="limit-period"
                className="text-[11px] font-medium uppercase tracking-wider text-[#697386] block mb-1"
              >
                Period
              </label>
              <select
                id="limit-period"
                value={period}
                onChange={(e) => setPeriod(e.target.value as WarRoomPeriod)}
                className="input-field w-full px-3 py-2 text-[13px] font-medium"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="limit-amount"
                className="text-[11px] font-medium uppercase tracking-wider text-[#697386] block mb-1"
              >
                Cap (₹)
              </label>
              <input
                ref={amountInputRef}
                id="limit-amount"
                type="number"
                min="1"
                step="any"
                value={limitAmount}
                onChange={(e) => setLimitAmount(e.target.value)}
                className="input-field w-full px-3 py-2 text-[13px] font-mono"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="w-full sm:w-44">
              <label
                htmlFor="limit-warning-pct"
                className="text-[11px] font-medium uppercase tracking-wider text-[#697386] block mb-1"
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
                className="input-field w-full px-3 py-2 text-[13px] font-mono"
              />
            </div>

            <button
              type="submit"
              className="btn-primary px-4 py-2.5 text-[12.5px] inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
              {editingId ? 'Update Limit' : 'Save Category Limit'}
            </button>
          </div>

          {formError && <p className="text-[12.5px] text-[#DE5252]">{formError}</p>}
          <p className="text-[12px] text-[#697386]">
            Monthly limits sync with Smart Radar category caps and reset by calendar day, week, or month.
          </p>
        </form>

        {/* Active Limits List */}
        <section className="space-y-3">
          <SectionHeader title={`Configured Limits (${evaluatedLimits.length})`} />

          {evaluatedLimits.length === 0 ? (
            <p className="text-[13px] text-[#697386] py-4 border-t border-[#E7EAF0]">
              No category spending limits set yet. Add one above to monitor category discipline.
            </p>
          ) : (
            <div className="border-t border-[#E7EAF0] divide-y divide-[#E7EAF0]">
              {evaluatedLimits.map((ev) => {
                const statusColor =
                  ev.status === 'exceeded'
                    ? 'text-[#DE5252]'
                    : ev.status === 'reached' || ev.status === 'approaching'
                    ? 'text-[#C7851F]'
                    : 'text-[#15966B]';

                const statusText =
                  ev.status === 'exceeded'
                    ? 'Exceeded'
                    : ev.status === 'reached'
                    ? 'Reached (100%)'
                    : ev.status === 'approaching'
                    ? 'Approaching'
                    : 'Normal';

                return (
                  <div key={ev.limit.id} className="py-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[14px] font-semibold text-[#151922]">
                          {ev.limit.category}{' '}
                          <span className="text-[12px] font-normal text-[#697386] capitalize">
                            · {ev.limit.period} ({ev.periodLabel}) ·{' '}
                          </span>
                          <span className={`text-[12px] font-semibold ${statusColor}`}>
                            {ev.limit.enabled ? statusText : 'Paused'}
                          </span>
                        </p>
                        <p className="text-[12px] text-[#697386] font-mono tabular-nums mt-0.5">
                          Spent ₹{formatCurrencyExact(ev.spent)} of ₹
                          {formatCurrencyExact(ev.limit.limitAmount)} · Remaining ₹
                          {formatCurrencyExact(ev.remaining)} ({ev.utilisationPct}%)
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            onUpsertLimit({
                              ...ev.limit,
                              enabled: !ev.limit.enabled,
                            })
                          }
                          className="btn-secondary px-2.5 py-1 text-[11.5px]"
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

                    <ProgressBar
                      value={ev.utilisationPct}
                      tone={
                        ev.status === 'exceeded'
                          ? 'danger'
                          : ev.status === 'reached' || ev.status === 'approaching'
                          ? 'warning'
                          : 'success'
                      }
                    />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Right: Smart Spending Alerts Feed */}
      <section className="lg:col-span-5 space-y-3">
        <SectionHeader
          title={`Smart Alerts (${activeAlerts.length})`}
          subtitle="Live warnings from transactions, caps, and week-over-week trends"
          action={
            dismissedCount > 0 ? (
              <button
                type="button"
                onClick={onRestoreDismissedAlerts}
                className="text-[12px] font-medium text-[#365FE8] hover:text-[#274CC8] inline-flex items-center gap-1 whitespace-nowrap"
              >
                <RotateCcw className="w-3 h-3" />
                Restore ({dismissedCount})
              </button>
            ) : undefined
          }
        />

        {activeAlerts.length === 0 ? (
          <div className="py-10 text-center space-y-2 border-t border-[#E7EAF0]">
            <CheckCircle2 className="w-6 h-6 text-[#15966B] mx-auto" />
            <p className="text-[14px] font-semibold text-[#151922]">All clear</p>
            <p className="text-[12.5px] text-[#697386]">
              No active approaching limits, spikes, or repeated small-purchase alerts.
            </p>
          </div>
        ) : (
          <div className="border-t border-[#E7EAF0] divide-y divide-[#E7EAF0]">
            {activeAlerts.map((alert) => (
              <div
                key={alert.signature}
                className="py-3.5 flex items-start justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <AlertTriangle
                      className={`w-3.5 h-3.5 shrink-0 ${
                        alert.severity === 'critical'
                          ? 'text-[#DE5252]'
                          : alert.severity === 'warning'
                          ? 'text-[#C7851F]'
                          : 'text-[#15966B]'
                      }`}
                    />
                    <span className="text-[13px] font-semibold text-[#151922]">
                      {alert.title}
                    </span>
                    {alert.metricValue && (
                      <span className="text-[11.5px] font-mono font-semibold text-[#151922]">
                        {alert.metricValue}
                      </span>
                    )}
                  </div>
                  <p className="text-[12.5px] text-[#697386] leading-relaxed">
                    {alert.reason}
                  </p>
                  <p className="text-[11.5px] text-[#929BAB]">
                    {alert.category ? `${alert.category} · ` : ''}
                    {alert.periodLabel}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onDismissAlert(alert.signature)}
                  aria-label={`Dismiss alert ${alert.title}`}
                  className="p-1 rounded-lg text-[#929BAB] hover:text-[#151922] hover:bg-[#F1F3F6] shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
