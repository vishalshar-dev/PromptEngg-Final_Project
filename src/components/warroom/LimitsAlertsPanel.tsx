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
import type { EvaluatedCategoryLimit, SmartAlert } from '../../utils/warRoomEngine';

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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Left: Category Spending Limits */}
      <div className="lg:col-span-7 space-y-4">
        <form onSubmit={handleSubmit} className="glass rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-brand-400" />
              <h3 className="text-sm font-extrabold text-white">
                {editingId ? 'Edit Category Spending Limit' : 'Set Category Spending Limit'}
              </h3>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-bold text-zinc-400 hover:text-white"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <div className="sm:col-span-2">
              <label
                htmlFor="limit-category"
                className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1"
              >
                Category
              </label>
              <select
                id="limit-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-ink-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none"
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
                className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1"
              >
                Period
              </label>
              <select
                id="limit-period"
                value={period}
                onChange={(e) => setPeriod(e.target.value as WarRoomPeriod)}
                className="w-full bg-ink-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="limit-amount"
                className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1"
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
                className="w-full bg-ink-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-white outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="w-full sm:w-44">
              <label
                htmlFor="limit-warning-pct"
                className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1"
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
                className="w-full bg-ink-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-white outline-none"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-ink-950 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={3} />
              {editingId ? 'Update Limit' : 'Save Category Limit'}
            </button>
          </div>

          {formError && <p className="text-xs text-red-400">{formError}</p>}
          <p className="text-[11px] text-zinc-500">
            Monthly category limits automatically sync with Radar Room category caps. Periods reset cleanly by local calendar day, week, or month.
          </p>
        </form>

        {/* Active Limits List */}
        <div className="glass rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-extrabold text-white">
            Configured Limits ({evaluatedLimits.length})
          </h3>

          {evaluatedLimits.length === 0 ? (
            <p className="text-xs text-zinc-500 py-4">
              No category spending limits set yet. Add a daily, weekly, or monthly limit above to track category discipline.
            </p>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {evaluatedLimits.map((ev) => {
                const statusBadge =
                  ev.status === 'exceeded'
                    ? 'bg-red-500/15 text-red-300 border-red-500/35'
                    : ev.status === 'reached'
                    ? 'bg-orange-500/15 text-orange-300 border-orange-500/35'
                    : ev.status === 'approaching'
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/35'
                    : 'bg-brand-500/15 text-brand-300 border-brand-500/30';

                const statusText =
                  ev.status === 'exceeded'
                    ? 'Exceeded'
                    : ev.status === 'reached'
                    ? 'Reached (100%)'
                    : ev.status === 'approaching'
                    ? 'Approaching'
                    : 'Normal';

                return (
                  <div key={ev.limit.id} className="py-3.5 first:pt-0 last:pb-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-extrabold text-white">
                            {ev.limit.category}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/[0.05] text-zinc-300">
                            {ev.limit.period} · {ev.periodLabel}
                          </span>
                          <span
                            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${statusBadge}`}
                          >
                            {ev.limit.enabled ? statusText : 'Paused'}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 font-mono tabular-nums mt-1">
                          Spent ₹{formatCurrencyExact(ev.spent)} of ₹
                          {formatCurrencyExact(ev.limit.limitAmount)} · Remaining ₹
                          {formatCurrencyExact(ev.remaining)} ({ev.utilisationPct}%)
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
                          className="px-2 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-[10px] font-bold text-zinc-300"
                        >
                          {ev.limit.enabled ? 'Pause' : 'Resume'}
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(ev)}
                          aria-label={`Edit limit for ${ev.limit.category}`}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06]"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteLimit(ev.limit.id)}
                          aria-label={`Delete limit for ${ev.limit.category}`}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="h-2 rounded-full bg-ink-900 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          ev.status === 'exceeded'
                            ? 'bg-red-500'
                            : ev.status === 'reached' || ev.status === 'approaching'
                            ? 'bg-amber-400'
                            : 'bg-brand-500'
                        }`}
                        style={{ width: `${Math.min(100, ev.utilisationPct)}%` }}
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
      <div className="lg:col-span-5 glass rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-extrabold text-white">
              Smart Alerts ({activeAlerts.length})
            </h3>
          </div>
          {dismissedCount > 0 && (
            <button
              type="button"
              onClick={onRestoreDismissedAlerts}
              className="text-[11px] font-bold text-zinc-400 hover:text-white flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Restore ({dismissedCount})
            </button>
          )}
        </div>

        <p className="text-[11px] text-zinc-500">
          Rule-based alerts generated dynamically from your live transactions, limits, and week-over-week trends.
        </p>

        {activeAlerts.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="w-7 h-7 text-brand-400 mx-auto" />
            <p className="text-xs font-bold text-zinc-300">All Clear</p>
            <p className="text-[11px] text-zinc-500">
              No active approaching limits, unusual spikes, or repeated small purchase alerts.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {activeAlerts.map((alert) => (
              <div
                key={alert.signature}
                className={`rounded-xl p-3 border flex items-start justify-between gap-2.5 ${
                  alert.severity === 'critical'
                    ? 'bg-red-500/10 border-red-500/30'
                    : alert.severity === 'warning'
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-brand-500/10 border-brand-500/30'
                }`}
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <AlertTriangle
                      className={`w-3.5 h-3.5 flex-shrink-0 ${
                        alert.severity === 'critical'
                          ? 'text-red-400'
                          : alert.severity === 'warning'
                          ? 'text-amber-300'
                          : 'text-brand-400'
                      }`}
                    />
                    <span className="text-xs font-extrabold text-white">{alert.title}</span>
                    {alert.metricValue && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-ink-950/60 text-zinc-200">
                        {alert.metricValue}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">{alert.reason}</p>
                  <p className="text-[10px] font-bold text-zinc-500">
                    {alert.category ? `${alert.category} · ` : ''}
                    {alert.periodLabel}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onDismissAlert(alert.signature)}
                  aria-label={`Dismiss alert ${alert.title}`}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] flex-shrink-0"
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
