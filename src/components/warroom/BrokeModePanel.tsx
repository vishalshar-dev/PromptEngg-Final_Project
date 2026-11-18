import { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldOff,
  Check,
  AlertTriangle,
  Calendar,
  Zap,
} from 'lucide-react';
import type { BrokeModeConfig, WarRoomPeriod } from '../../types/models';
import { formatCurrencyExact } from '../../utils/categoryStyles';
import type { BrokeModeStatus } from '../../utils/warRoomEngine';

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
    <div className="space-y-6">
      {/* Control Banner */}
      <div
        className={`surface-card p-5 transition-colors ${
          status.enabled ? 'bg-[#FFFDF7] border-[#F3D8A8]' : ''
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                status.enabled
                  ? 'bg-[#FEF6E7] border-[#F3D8A8] text-[#9E6614]'
                  : 'bg-[#F1F3F6] border-[#E7EAF0] text-[#697386]'
              }`}
            >
              {status.enabled ? (
                <ShieldAlert className="w-5 h-5" />
              ) : (
                <ShieldOff className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-[#151922]">
                  Broke Mode Financial Boundary
                </h3>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                    status.enabled
                      ? 'bg-[#FEF6E7] text-[#9E6614] border-[#F3D8A8]'
                      : 'bg-[#F1F3F6] text-[#697386] border-[#E7EAF0]'
                  }`}
                >
                  {status.enabled ? 'Active' : 'Standby'}
                </span>
              </div>
              <p className="text-xs text-[#697386] mt-1 leading-relaxed max-w-2xl">
                {status.enabled
                  ? 'Non-essential & watched category purchases receive extra warnings in Shopping, Checkout, and Expenses while legitimate essential purchases remain unblocked.'
                  : 'Activate Broke Mode with sensible defaults or customize your allowance, non-essential cap, and watched categories below.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleBrokeMode}
            className={`px-5 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 whitespace-nowrap transition-colors border ${
              status.enabled
                ? 'bg-[#DE5252] hover:bg-[#C63D3D] text-white border-[#DE5252]'
                : 'btn-primary border-[#365FE8]'
            }`}
          >
            <Zap className="w-4 h-4" />
            {status.enabled ? 'Deactivate Broke Mode' : 'Activate Broke Mode'}
          </button>
        </div>
      </div>

      {/* Dedicated 8-Metric Broke Mode Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="surface-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
            1. Remaining Allowance
          </p>
          <p
            className={`text-2xl font-bold font-mono tabular-nums mt-2 ${
              status.remaining > 0 ? 'text-[#15966B]' : 'text-[#DE5252]'
            }`}
          >
            ₹{formatCurrencyExact(status.remaining)}
          </p>
          <p className="text-xs text-[#697386] mt-1 font-mono tabular-nums">
            Safe pace: ₹{formatCurrencyExact(status.dailySafeAllowance)}/day
          </p>
        </div>

        <div className="surface-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
            2. Already Spent ({status.periodLabel})
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums text-[#151922] mt-2">
            ₹{formatCurrencyExact(status.spent)}
          </p>
          <p className="text-xs text-[#697386] mt-1">
            3. Limit: ₹{formatCurrencyExact(status.limit)}
          </p>
        </div>

        <div className="surface-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
            4. Essential vs Non-Essential
          </p>
          <p className="text-lg font-bold font-mono tabular-nums text-[#15966B] mt-2">
            ₹{formatCurrencyExact(status.essentialSpent)}{' '}
            <span className="text-[#697386] text-xs font-sans font-normal">
              essential
            </span>
          </p>
          <p className="text-xs font-bold font-mono tabular-nums text-[#9E6614] mt-0.5">
            ₹{formatCurrencyExact(status.totalJunkSpent)}{' '}
            <span className="text-[#697386] text-[11px] font-sans font-normal">
              non-essential (cap ₹{formatCurrencyExact(status.nonEssentialLimit)})
            </span>
          </p>
        </div>

        <div className="surface-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
            5 &amp; 6. Period &amp; Utilisation
          </p>
          <div className="flex items-baseline justify-between gap-2 mt-2">
            <span
              className={`text-2xl font-bold font-mono tabular-nums ${
                status.utilisationPct > 100
                  ? 'text-[#DE5252]'
                  : status.utilisationPct >= config.warningThresholdPct
                  ? 'text-[#9E6614]'
                  : 'text-[#15966B]'
              }`}
            >
              {status.utilisationPct}%
            </span>
            <span className="text-xs font-semibold text-[#4F5869] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#929BAB]" />
              {status.remainingDays}d left
            </span>
          </div>
          <p className="text-xs text-[#697386] mt-1">
            {status.durationRemainingDays !== null
              ? `Mode window: ${status.durationRemainingDays}/${status.durationDays}d remaining`
              : `Configured window: ${status.durationDays} days`}
          </p>
        </div>
      </div>

      {/* Progress Bars & Warnings + Configuration Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 space-y-4">
          <div className="surface-card p-5 space-y-4">
            <h4 className="text-[15px] font-bold text-[#151922]">
              7 &amp; 8. Boundaries, Target Progress &amp; Warnings
            </h4>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[#151922]">
                  Overall Period Allowance
                </span>
                <span className="font-mono font-bold tabular-nums text-[#151922]">
                  {status.utilisationPct}%
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-[#ECEFF4] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    status.utilisationPct > 100
                      ? 'bg-[#DE5252]'
                      : status.utilisationPct >= config.warningThresholdPct
                      ? 'bg-[#E5A23B]'
                      : 'bg-[#15966B]'
                  }`}
                  style={{ width: `${Math.min(100, status.utilisationPct)}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[#151922]">
                  Non-Essential Cap (₹{formatCurrencyExact(status.totalJunkSpent)}{' '}
                  / ₹{formatCurrencyExact(status.nonEssentialLimit)})
                </span>
                <span className="font-mono font-bold tabular-nums text-[#9E6614]">
                  {status.nonEssentialUtilisationPct}%
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-[#ECEFF4] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    status.nonEssentialUtilisationPct > 100
                      ? 'bg-[#DE5252]'
                      : status.nonEssentialUtilisationPct >=
                        config.warningThresholdPct
                      ? 'bg-[#E5A23B]'
                      : 'bg-[#15966B]'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      status.nonEssentialUtilisationPct
                    )}%`,
                  }}
                />
              </div>
              <p className="text-xs text-[#697386]">
                Non-essential allowance remaining: ₹
                {formatCurrencyExact(status.nonEssentialRemaining)} · Boundary
                compliance:{' '}
                <span className="text-[#151922] font-bold">
                  {status.targetProgressPct}%
                </span>
              </p>
            </div>

            <div className="pt-3 border-t border-[#E7EAF0] space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#697386]">
                Spending Alerts ({status.warnings.length})
              </p>
              {status.warnings.length === 0 ? (
                <p className="text-xs text-[#697386]">
                  All Broke Mode boundaries are comfortably within safe range.
                </p>
              ) : (
                <div className="space-y-2">
                  {status.warnings.map((w) => (
                    <div
                      key={w.id}
                      className={`rounded-xl p-3 border text-xs ${
                        w.severity === 'critical'
                          ? 'bg-[#FDECEC] border-[#F6B8B8] text-[#DE5252]'
                          : 'bg-[#FEF6E7] border-[#F3D8A8] text-[#9E6614]'
                      }`}
                    >
                      <p className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        {w.title}
                      </p>
                      <p className="text-xs text-[#4F5869] mt-1">{w.message}</p>
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
              <h4 className="text-[15px] font-bold text-[#151922]">
                Configure Financial Boundaries
              </h4>
              <p className="text-xs text-[#697386]">
                Sensible defaults are pre-filled; adjust any restriction to match your goal.
              </p>
            </div>
            {savedNotice && (
              <span className="text-xs font-bold text-[#15966B] flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Saved
              </span>
            )}
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#697386] block mb-1.5">
              Active Allowance Period
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`py-2 rounded-xl text-xs font-semibold capitalize border transition-colors ${
                    period === p
                      ? 'bg-[#365FE8] border-[#365FE8] text-white'
                      : 'bg-[#F7F8FA] border-[#E7EAF0] text-[#697386] hover:text-[#151922]'
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
                className="text-[11px] font-semibold uppercase tracking-wider text-[#697386] block mb-1"
              >
                Daily Allowance (₹)
              </label>
              <input
                id="broke-daily-allowance"
                type="number"
                min="50"
                value={dailyAllowance}
                onChange={(e) => setDailyAllowance(e.target.value)}
                className="input-field w-full px-3 py-2 text-xs font-mono"
              />
            </div>
            <div>
              <label
                htmlFor="broke-weekly-allowance"
                className="text-[11px] font-semibold uppercase tracking-wider text-[#697386] block mb-1"
              >
                Weekly Allowance (₹)
              </label>
              <input
                id="broke-weekly-allowance"
                type="number"
                min="100"
                value={weeklyAllowance}
                onChange={(e) => setWeeklyAllowance(e.target.value)}
                className="input-field w-full px-3 py-2 text-xs font-mono"
              />
            </div>
            <div>
              <label
                htmlFor="broke-monthly-allowance"
                className="text-[11px] font-semibold uppercase tracking-wider text-[#697386] block mb-1"
              >
                Monthly Allowance (₹)
              </label>
              <input
                id="broke-monthly-allowance"
                type="number"
                min="200"
                value={monthlyAllowance}
                onChange={(e) => setMonthlyAllowance(e.target.value)}
                className="input-field w-full px-3 py-2 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="broke-max-nonessential"
                className="text-[11px] font-semibold uppercase tracking-wider text-[#697386] block mb-1"
              >
                Max Non-Essential (₹)
              </label>
              <input
                id="broke-max-nonessential"
                type="number"
                min="0"
                value={maxNonEssential}
                onChange={(e) => setMaxNonEssential(e.target.value)}
                className="input-field w-full px-3 py-2 text-xs font-mono"
              />
            </div>
            <div>
              <label
                htmlFor="broke-warning-pct"
                className="text-[11px] font-semibold uppercase tracking-wider text-[#697386] block mb-1"
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
                className="input-field w-full px-3 py-2 text-xs font-mono"
              />
            </div>
            <div>
              <label
                htmlFor="broke-duration-days"
                className="text-[11px] font-semibold uppercase tracking-wider text-[#697386] block mb-1"
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
                className="input-field w-full px-3 py-2 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#697386] mb-1.5">
              Monitored / Restricted Categories
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
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      selected
                        ? 'bg-[#FEF6E7] border-[#F3D8A8] text-[#9E6614]'
                        : 'bg-[#F7F8FA] border-[#E7EAF0] text-[#697386] hover:text-[#151922]'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <button type="submit" className="btn-primary w-full py-2.5 text-xs">
            Save Broke Mode Settings
          </button>
        </form>
      </div>
    </div>
  );
}
