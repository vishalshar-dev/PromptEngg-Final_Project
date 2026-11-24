import { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldOff,
  Check,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import type { BrokeModeConfig, WarRoomPeriod } from '../../types/models';
import { formatCurrencyExact } from '../../utils/categoryStyles';
import type { BrokeModeStatus } from '../../utils/warRoomEngine';
import { ProgressBar } from '../ui/ProgressBar';

interface BrokeModePanelProps {
  config: BrokeModeConfig;
  status: BrokeModeStatus;
  categories: string[];
  onToggleBrokeMode: () => void;
  onUpdateConfig: (patch: Partial<BrokeModeConfig>) => void;
}

export function BrokeModePanel({
  config,
  status,
  categories,
  onToggleBrokeMode,
  onUpdateConfig,
}: BrokeModePanelProps) {
  const [period, setPeriod] = useState<WarRoomPeriod>(config.period);
  const [dailyAllowance, setDailyAllowance] = useState(
    String(config.dailyAllowance)
  );
  const [weeklyAllowance, setWeeklyAllowance] = useState(
    String(config.weeklyAllowance)
  );
  const [monthlyAllowance, setMonthlyAllowance] = useState(
    String(config.monthlyAllowance)
  );
  const [maxNonEssential, setMaxNonEssential] = useState(
    String(config.maxNonEssentialSpend)
  );
  const [warningThreshold, setWarningThreshold] = useState(
    String(config.warningThresholdPct)
  );
  const [durationDays, setDurationDays] = useState(String(config.durationDays));
  const [restricted, setRestricted] = useState<string[]>(
    config.restrictedCategories
  );
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    setPeriod(config.period);
    setDailyAllowance(String(config.dailyAllowance));
    setWeeklyAllowance(String(config.weeklyAllowance));
    setMonthlyAllowance(String(config.monthlyAllowance));
    setMaxNonEssential(String(config.maxNonEssentialSpend));
    setWarningThreshold(String(config.warningThresholdPct));
    setDurationDays(String(config.durationDays));
    setRestricted(config.restrictedCategories);
  }, [config]);

  const toggleCategoryRestriction = (cat: string) => {
    setRestricted((prev) =>
      prev.some((c) => c.toLowerCase() === cat.toLowerCase())
        ? prev.filter((c) => c.toLowerCase() !== cat.toLowerCase())
        : [...prev, cat]
    );
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      period,
      dailyAllowance: Math.max(
        50,
        Number(dailyAllowance) || config.dailyAllowance
      ),
      weeklyAllowance: Math.max(
        100,
        Number(weeklyAllowance) || config.weeklyAllowance
      ),
      monthlyAllowance: Math.max(
        200,
        Number(monthlyAllowance) || config.monthlyAllowance
      ),
      maxNonEssentialSpend: Math.max(0, Number(maxNonEssential) || 0),
      warningThresholdPct: Math.min(
        99,
        Math.max(20, Number(warningThreshold) || 75)
      ),
      durationDays: Math.min(90, Math.max(1, Number(durationDays) || 14)),
      restrictedCategories: restricted,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Control Banner */}
      <div
        className={`surface-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
          status.enabled
            ? 'border-[var(--accent-warning-border)] bg-[var(--accent-warning-soft)]'
            : ''
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              status.enabled
                ? 'bg-[var(--bg-surface)] border-[var(--accent-warning-border)] text-[var(--accent-warning-ink)]'
                : 'bg-[var(--bg-well)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
            }`}
          >
            {status.enabled ? (
              <ShieldAlert className="w-5 h-5" />
            ) : (
              <ShieldOff className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-display text-[15px] font-semibold text-[var(--text-primary)]">
                Broke Mode Financial Boundary
              </h3>
              <span
                className={`text-[12px] font-semibold ${
                  status.enabled ? 'text-[var(--accent-warning-ink)]' : 'text-[var(--text-secondary)]'
                }`}
              >
                · {status.enabled ? 'Active' : 'Standby'}
              </span>
            </div>
            <p className="text-[12.5px] text-[var(--text-secondary)] mt-1 leading-relaxed max-w-2xl">
              {status.enabled
                ? 'Non-essential and watched category purchases trigger warnings in Shopping, Checkout, and Expenses while essential purchases stay unblocked.'
                : 'Enable Broke Mode with default guardrails or customize your allowance, non-essential cap, and watched categories below.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleBrokeMode}
          className={`px-4 py-2.5 rounded-xl font-semibold text-[12.5px] inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-colors border ${
            status.enabled
              ? 'bg-[var(--accent-danger)] hover:opacity-90 text-white border-transparent'
              : 'btn-primary border-transparent'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          {status.enabled ? 'Deactivate Broke Mode' : 'Activate Broke Mode'}
        </button>
      </div>

      {/* Single Hairline Summary Strip */}
      <div className="surface-card grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 sm:divide-x divide-[var(--border-subtle)] overflow-hidden">
        <div className="p-5">
          <p className="text-[12px] font-medium text-[var(--text-secondary)]">
            Remaining Allowance
          </p>
          <p
            className={`text-[22px] font-bold font-mono tabular-nums mt-1.5 ${
              status.remaining > 0 ? 'text-[var(--accent-success-ink)]' : 'text-[var(--accent-danger-ink)]'
            }`}
          >
            ₹{formatCurrencyExact(status.remaining)}
          </p>
          <p className="text-[12px] text-[var(--text-secondary)] mt-1 font-mono tabular-nums">
            Safe pace ₹{formatCurrencyExact(status.dailySafeAllowance)}/day
          </p>
        </div>

        <div className="p-5">
          <p className="text-[12px] font-medium text-[var(--text-secondary)]">
            Spent ({status.periodLabel})
          </p>
          <p className="text-[22px] font-bold font-mono tabular-nums text-[var(--text-primary)] mt-1.5">
            ₹{formatCurrencyExact(status.spent)}
          </p>
          <p className="text-[12px] text-[var(--text-secondary)] mt-1 tabular-nums">
            Limit ₹{formatCurrencyExact(status.limit)}
          </p>
        </div>

        <div className="p-5">
          <p className="text-[12px] font-medium text-[var(--text-secondary)]">
            Essential vs Non-Ess
          </p>
          <p className="text-[17px] font-bold font-mono tabular-nums text-[var(--accent-success-ink)] mt-1.5">
            ₹{formatCurrencyExact(status.essentialSpent)}{' '}
            <span className="text-[var(--text-secondary)] text-[12px] font-sans font-normal">
              essential
            </span>
          </p>
          <p className="text-[12px] font-mono tabular-nums text-[var(--accent-warning-ink)] mt-1">
            ₹{formatCurrencyExact(status.totalJunkSpent)}{' '}
            <span className="text-[var(--text-secondary)] font-sans">
              non-ess (cap ₹{formatCurrencyExact(status.nonEssentialLimit)})
            </span>
          </p>
        </div>

        <div className="p-5">
          <p className="text-[12px] font-medium text-[var(--text-secondary)]">
            Utilisation &amp; Window
          </p>
          <p
            className={`text-[22px] font-bold font-mono tabular-nums mt-1.5 ${
              status.utilisationPct > 100
                ? 'text-[var(--accent-danger-ink)]'
                : status.utilisationPct >= config.warningThresholdPct
                ? 'text-[var(--accent-warning-ink)]'
                : 'text-[var(--accent-success-ink)]'
            }`}
          >
            {status.utilisationPct}%
          </p>
          <p className="text-[12px] text-[var(--text-secondary)] mt-1 tabular-nums">
            {status.remainingDays}d left ·{' '}
            {status.durationRemainingDays !== null
              ? `${status.durationRemainingDays}/${status.durationDays}d window`
              : `${status.durationDays}d window`}
          </p>
        </div>
      </div>

      {/* Boundaries & Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 space-y-5">
          <div className="surface-card p-5 space-y-4">
            <h4 className="font-display text-[15px] font-semibold text-[var(--text-primary)]">
              Boundaries &amp; Warnings
            </h4>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[12.5px]">
                <span className="font-medium text-[var(--text-primary)]">
                  Overall Period Allowance
                </span>
                <span className="font-mono font-semibold tabular-nums text-[var(--text-primary)]">
                  {status.utilisationPct}%
                </span>
              </div>
              <ProgressBar
                value={status.utilisationPct}
                tone={
                  status.utilisationPct > 100
                    ? 'danger'
                    : status.utilisationPct >= config.warningThresholdPct
                    ? 'warning'
                    : 'success'
                }
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[12.5px]">
                <span className="font-medium text-[var(--text-primary)]">
                  Non-Essential Cap (₹{formatCurrencyExact(status.totalJunkSpent)}{' '}
                  / ₹{formatCurrencyExact(status.nonEssentialLimit)})
                </span>
                <span className="font-mono font-semibold tabular-nums text-[var(--accent-warning-ink)]">
                  {status.nonEssentialUtilisationPct}%
                </span>
              </div>
              <ProgressBar
                value={status.nonEssentialUtilisationPct}
                tone={
                  status.nonEssentialUtilisationPct > 100
                    ? 'danger'
                    : status.nonEssentialUtilisationPct >=
                      config.warningThresholdPct
                    ? 'warning'
                    : 'success'
                }
              />
              <p className="text-[12px] text-[var(--text-secondary)] tabular-nums">
                Remaining: ₹{formatCurrencyExact(status.nonEssentialRemaining)} ·
                Compliance{' '}
                <span className="text-[var(--text-primary)] font-semibold">
                  {status.targetProgressPct}%
                </span>
              </p>
            </div>

            <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2.5">
              <p className="text-[12px] font-medium text-[var(--text-secondary)]">
                Spending Alerts ({status.warnings.length})
              </p>
              {status.warnings.length === 0 ? (
                <p className="text-[12.5px] text-[var(--text-secondary)]">
                  All Broke Mode boundaries are within safe range.
                </p>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {status.warnings.map((w) => (
                    <div key={w.id} className="py-2.5 first:pt-0 last:pb-0">
                      <p
                        className={`text-[12.5px] font-semibold flex items-center gap-1.5 ${
                          w.severity === 'critical'
                            ? 'text-[var(--accent-danger-ink)]'
                            : 'text-[var(--accent-warning-ink)]'
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        {w.title}
                      </p>
                      <p className="text-[12px] text-[var(--text-secondary)] mt-1">
                        {w.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Configuration Form */}
        <form
          onSubmit={handleSaveConfig}
          className="lg:col-span-7 surface-card p-5 space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="font-display text-[15px] font-semibold text-[var(--text-primary)]">
                Configure Financial Boundaries
              </h4>
              <p className="text-[12.5px] text-[var(--text-secondary)]">
                Defaults are pre-filled; adjust allowances and watched categories.
              </p>
            </div>
            {savedNotice && (
              <span className="text-[12.5px] font-semibold text-[var(--accent-success-ink)] inline-flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Saved
              </span>
            )}
          </div>

          <div>
            <label className="text-[12px] font-medium text-[var(--text-secondary)] block mb-1.5">
              Active Allowance Period
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`py-2 rounded-xl text-[12.5px] font-semibold capitalize border transition-colors ${
                    period === p
                      ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white'
                      : 'bg-[var(--bg-well)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="broke-daily-allowance"
                className="text-[12px] font-medium text-[var(--text-secondary)] block mb-1"
              >
                Daily Allowance (₹)
              </label>
              <input
                id="broke-daily-allowance"
                type="number"
                min="50"
                value={dailyAllowance}
                onChange={(e) => setDailyAllowance(e.target.value)}
                className="input-field w-full px-3 py-2 text-[13px] font-mono tabular-nums"
              />
            </div>
            <div>
              <label
                htmlFor="broke-weekly-allowance"
                className="text-[12px] font-medium text-[var(--text-secondary)] block mb-1"
              >
                Weekly Allowance (₹)
              </label>
              <input
                id="broke-weekly-allowance"
                type="number"
                min="100"
                value={weeklyAllowance}
                onChange={(e) => setWeeklyAllowance(e.target.value)}
                className="input-field w-full px-3 py-2 text-[13px] font-mono tabular-nums"
              />
            </div>
            <div>
              <label
                htmlFor="broke-monthly-allowance"
                className="text-[12px] font-medium text-[var(--text-secondary)] block mb-1"
              >
                Monthly Allowance (₹)
              </label>
              <input
                id="broke-monthly-allowance"
                type="number"
                min="200"
                value={monthlyAllowance}
                onChange={(e) => setMonthlyAllowance(e.target.value)}
                className="input-field w-full px-3 py-2 text-[13px] font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="broke-max-nonessential"
                className="text-[12px] font-medium text-[var(--text-secondary)] block mb-1"
              >
                Max Non-Essential (₹)
              </label>
              <input
                id="broke-max-nonessential"
                type="number"
                min="0"
                value={maxNonEssential}
                onChange={(e) => setMaxNonEssential(e.target.value)}
                className="input-field w-full px-3 py-2 text-[13px] font-mono tabular-nums"
              />
            </div>
            <div>
              <label
                htmlFor="broke-warning-pct"
                className="text-[12px] font-medium text-[var(--text-secondary)] block mb-1"
              >
                Warning Threshold (%)
              </label>
              <input
                id="broke-warning-pct"
                type="number"
                min="20"
                max="99"
                value={warningThreshold}
                onChange={(e) => setWarningThreshold(e.target.value)}
                className="input-field w-full px-3 py-2 text-[13px] font-mono tabular-nums"
              />
            </div>
            <div>
              <label
                htmlFor="broke-duration-days"
                className="text-[12px] font-medium text-[var(--text-secondary)] block mb-1"
              >
                Duration (Days)
              </label>
              <input
                id="broke-duration-days"
                type="number"
                min="1"
                max="90"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                className="input-field w-full px-3 py-2 text-[13px] font-mono tabular-nums"
              />
            </div>
          </div>

          <div>
            <p className="text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">
              Monitored Categories
            </p>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => {
                const selected = restricted.some(
                  (c) => c.toLowerCase() === cat.toLowerCase()
                );
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategoryRestriction(cat)}
                    className={`px-2.5 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${
                      selected
                        ? 'bg-[var(--accent-warning-soft)] border-[var(--accent-warning-border)] text-[var(--accent-warning-ink)] font-semibold'
                        : 'bg-[var(--bg-well)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <button type="submit" className="btn-primary w-full py-2.5 text-[13px]">
            Save Broke Mode Settings
          </button>
        </form>
      </div>
    </div>
  );
}
