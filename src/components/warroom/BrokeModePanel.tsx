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
        className={`bg-white border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
          status.enabled ? 'border-[#F3D8A8] bg-[#FEF6E7]/40' : 'border-[#E7EAF0]'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              status.enabled
                ? 'bg-[#FEF6E7] border-[#F3D8A8] text-[#C7851F]'
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
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-[15px] font-semibold text-[#151922]">
                Broke Mode Financial Boundary
              </h3>
              <span
                className={`text-[11.5px] font-semibold ${
                  status.enabled ? 'text-[#C7851F]' : 'text-[#697386]'
                }`}
              >
                · {status.enabled ? 'Active' : 'Standby'}
              </span>
            </div>
            <p className="text-[12.5px] text-[#697386] mt-1 leading-relaxed max-w-2xl">
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
              ? 'bg-[#DE5252] hover:bg-[#C74343] text-white border-[#DE5252]'
              : 'btn-primary border-[#365FE8]'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          {status.enabled ? 'Deactivate Broke Mode' : 'Activate Broke Mode'}
        </button>
      </div>

      {/* Single Hairline Summary Strip */}
      <div className="bg-white border border-[#E7EAF0] rounded-2xl grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 sm:divide-x divide-[#E7EAF0]">
        <div className="p-5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#697386]">
            Remaining Allowance
          </p>
          <p
            className={`text-[22px] font-bold font-mono tabular-nums mt-1.5 ${
              status.remaining > 0 ? 'text-[#15966B]' : 'text-[#DE5252]'
            }`}
          >
            ₹{formatCurrencyExact(status.remaining)}
          </p>
          <p className="text-[12px] text-[#697386] mt-1 font-mono tabular-nums">
            Safe pace ₹{formatCurrencyExact(status.dailySafeAllowance)}/day
          </p>
        </div>

        <div className="p-5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#697386]">
            Spent ({status.periodLabel})
          </p>
          <p className="text-[22px] font-bold font-mono tabular-nums text-[#151922] mt-1.5">
            ₹{formatCurrencyExact(status.spent)}
          </p>
          <p className="text-[12px] text-[#697386] mt-1 tabular-nums">
            Limit ₹{formatCurrencyExact(status.limit)}
          </p>
        </div>

        <div className="p-5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#697386]">
            Essential vs Non-Ess
          </p>
          <p className="text-[17px] font-bold font-mono tabular-nums text-[#15966B] mt-1.5">
            ₹{formatCurrencyExact(status.essentialSpent)}{' '}
            <span className="text-[#697386] text-[12px] font-sans font-normal">
              essential
            </span>
          </p>
          <p className="text-[12px] font-mono tabular-nums text-[#C7851F] mt-1">
            ₹{formatCurrencyExact(status.totalJunkSpent)}{' '}
            <span className="text-[#697386] font-sans">
              non-ess (cap ₹{formatCurrencyExact(status.nonEssentialLimit)})
            </span>
          </p>
        </div>

        <div className="p-5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#697386]">
            Utilisation &amp; Window
          </p>
          <p
            className={`text-[22px] font-bold font-mono tabular-nums mt-1.5 ${
              status.utilisationPct > 100
                ? 'text-[#DE5252]'
                : status.utilisationPct >= config.warningThresholdPct
                ? 'text-[#C7851F]'
                : 'text-[#15966B]'
            }`}
          >
            {status.utilisationPct}%
          </p>
          <p className="text-[12px] text-[#697386] mt-1 tabular-nums">
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
          <div className="bg-white border border-[#E7EAF0] rounded-2xl p-5 space-y-4">
            <h4 className="text-[15px] font-semibold text-[#151922]">
              Boundaries &amp; Warnings
            </h4>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[12.5px]">
                <span className="font-medium text-[#151922]">
                  Overall Period Allowance
                </span>
                <span className="font-mono font-semibold tabular-nums text-[#151922]">
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
                <span className="font-medium text-[#151922]">
                  Non-Essential Cap (₹{formatCurrencyExact(status.totalJunkSpent)}{' '}
                  / ₹{formatCurrencyExact(status.nonEssentialLimit)})
                </span>
                <span className="font-mono font-semibold tabular-nums text-[#C7851F]">
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
              <p className="text-[12px] text-[#697386]">
                Remaining: ₹{formatCurrencyExact(status.nonEssentialRemaining)} ·
                Compliance{' '}
                <span className="text-[#151922] font-semibold">
                  {status.targetProgressPct}%
                </span>
              </p>
            </div>

            <div className="pt-3 border-t border-[#E7EAF0] space-y-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#697386]">
                Spending Alerts ({status.warnings.length})
              </p>
              {status.warnings.length === 0 ? (
                <p className="text-[12.5px] text-[#697386]">
                  All Broke Mode boundaries are within safe range.
                </p>
              ) : (
                <div className="divide-y divide-[#E7EAF0]">
                  {status.warnings.map((w) => (
                    <div key={w.id} className="py-2.5 first:pt-0 last:pb-0">
                      <p
                        className={`text-[12.5px] font-semibold flex items-center gap-1.5 ${
                          w.severity === 'critical'
                            ? 'text-[#DE5252]'
                            : 'text-[#C7851F]'
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        {w.title}
                      </p>
                      <p className="text-[12px] text-[#697386] mt-1">
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
          className="lg:col-span-7 bg-white border border-[#E7EAF0] rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="text-[15px] font-semibold text-[#151922]">
                Configure Financial Boundaries
              </h4>
              <p className="text-[12.5px] text-[#697386]">
                Defaults are pre-filled; adjust allowances and watched categories.
              </p>
            </div>
            {savedNotice && (
              <span className="text-[12.5px] font-semibold text-[#15966B] inline-flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Saved
              </span>
            )}
          </div>

          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider text-[#697386] block mb-1.5">
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
                className="text-[11px] font-medium uppercase tracking-wider text-[#697386] block mb-1"
              >
                Daily Allowance (₹)
              </label>
              <input
                id="broke-daily-allowance"
                type="number"
                min="50"
                value={dailyAllowance}
                onChange={(e) => setDailyAllowance(e.target.value)}
                className="input-field w-full px-3 py-2 text-[13px] font-mono"
              />
            </div>
            <div>
              <label
                htmlFor="broke-weekly-allowance"
                className="text-[11px] font-medium uppercase tracking-wider text-[#697386] block mb-1"
              >
                Weekly Allowance (₹)
              </label>
              <input
                id="broke-weekly-allowance"
                type="number"
                min="100"
                value={weeklyAllowance}
                onChange={(e) => setWeeklyAllowance(e.target.value)}
                className="input-field w-full px-3 py-2 text-[13px] font-mono"
              />
            </div>
            <div>
              <label
                htmlFor="broke-monthly-allowance"
                className="text-[11px] font-medium uppercase tracking-wider text-[#697386] block mb-1"
              >
                Monthly Allowance (₹)
              </label>
              <input
                id="broke-monthly-allowance"
                type="number"
                min="200"
                value={monthlyAllowance}
                onChange={(e) => setMonthlyAllowance(e.target.value)}
                className="input-field w-full px-3 py-2 text-[13px] font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="broke-max-nonessential"
                className="text-[11px] font-medium uppercase tracking-wider text-[#697386] block mb-1"
              >
                Max Non-Essential (₹)
              </label>
              <input
                id="broke-max-nonessential"
                type="number"
                min="0"
                value={maxNonEssential}
                onChange={(e) => setMaxNonEssential(e.target.value)}
                className="input-field w-full px-3 py-2 text-[13px] font-mono"
              />
            </div>
            <div>
              <label
                htmlFor="broke-warning-pct"
                className="text-[11px] font-medium uppercase tracking-wider text-[#697386] block mb-1"
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
                className="input-field w-full px-3 py-2 text-[13px] font-mono"
              />
            </div>
            <div>
              <label
                htmlFor="broke-duration-days"
                className="text-[11px] font-medium uppercase tracking-wider text-[#697386] block mb-1"
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
                className="input-field w-full px-3 py-2 text-[13px] font-mono"
              />
            </div>
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#697386] mb-1.5">
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
                        ? 'bg-[#FEF6E7] border-[#F3D8A8] text-[#9E6614] font-semibold'
                        : 'bg-[#F7F8FA] border-[#E7EAF0] text-[#697386] hover:text-[#151922]'
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
