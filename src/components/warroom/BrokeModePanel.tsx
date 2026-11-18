import { useState, useEffect } from 'react';
import { ShieldAlert, ShieldOff, Check, AlertTriangle, Calendar, Zap } from 'lucide-react';
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
  const [dailyAllowance, setDailyAllowance] = useState(String(config.dailyAllowance));
  const [weeklyAllowance, setWeeklyAllowance] = useState(String(config.weeklyAllowance));
  const [monthlyAllowance, setMonthlyAllowance] = useState(String(config.monthlyAllowance));
  const [maxNonEssential, setMaxNonEssential] = useState(String(config.maxNonEssentialSpend));
  const [warningThreshold, setWarningThreshold] = useState(String(config.warningThresholdPct));
  const [durationDays, setDurationDays] = useState(String(config.durationDays));
  const [restricted, setRestricted] = useState<string[]>(config.restrictedCategories);
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
      dailyAllowance: Math.max(50, Number(dailyAllowance) || config.dailyAllowance),
      weeklyAllowance: Math.max(100, Number(weeklyAllowance) || config.weeklyAllowance),
      monthlyAllowance: Math.max(200, Number(monthlyAllowance) || config.monthlyAllowance),
      maxNonEssentialSpend: Math.max(0, Number(maxNonEssential) || 0),
      warningThresholdPct: Math.min(99, Math.max(20, Number(warningThreshold) || 75)),
      durationDays: Math.min(90, Math.max(1, Number(durationDays) || 14)),
      restrictedCategories: restricted,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Control Banner */}
      <div
        className={`rounded-2xl border p-5 transition-all ${
          status.enabled
            ? 'bg-amber-500/[0.08] border-amber-500/35'
            : 'glass border-white/[0.08]'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                status.enabled
                  ? 'bg-amber-500/20 border border-amber-400/40 text-amber-300'
                  : 'bg-white/[0.05] border border-white/[0.08] text-zinc-400'
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
                <h3 className="text-base font-extrabold text-white">
                  Broke Mode Financial Boundary
                </h3>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                    status.enabled
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/35'
                      : 'bg-white/[0.05] text-zinc-400 border-white/[0.08]'
                  }`}
                >
                  {status.enabled ? 'Active' : 'Standby'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed max-w-2xl">
                {status.enabled
                  ? 'Non-essential & watched category purchases receive extra warnings in Quick Mart, Checkout, and Recent Ledger while legitimate essential purchases remain unblocked.'
                  : 'Activate Broke Mode with sensible defaults or customize your allowance, non-essential cap, and watched categories below.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleBrokeMode}
            className={`px-5 py-3 rounded-xl font-extrabold text-xs tracking-wide flex items-center justify-center gap-2 whitespace-nowrap transition-all ${
              status.enabled
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-brand-500 hover:bg-brand-400 text-ink-950'
            }`}
          >
            <Zap className="w-4 h-4" />
            {status.enabled ? 'Deactivate Broke Mode' : 'Activate Broke Mode'}
          </button>
        </div>
      </div>

      {/* Dedicated 8-Metric Broke Mode Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            1. Remaining Allowance
          </p>
          <p
            className={`text-2xl font-extrabold font-mono tabular-nums mt-2 ${
              status.remaining > 0 ? 'text-brand-400' : 'text-red-400'
            }`}
          >
            ₹{formatCurrencyExact(status.remaining)}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1 font-mono tabular-nums">
            Safe pace: ₹{formatCurrencyExact(status.dailySafeAllowance)}/day
          </p>
        </div>

        <div className="glass rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            2. Already Spent ({status.periodLabel})
          </p>
          <p className="text-2xl font-extrabold font-mono tabular-nums text-white mt-2">
            ₹{formatCurrencyExact(status.spent)}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1">
            3. Limit: ₹{formatCurrencyExact(status.limit)}
          </p>
        </div>

        <div className="glass rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            4. Essential vs Non-Essential
          </p>
          <p className="text-lg font-extrabold font-mono tabular-nums text-brand-300 mt-2">
            ₹{formatCurrencyExact(status.essentialSpent)}{' '}
            <span className="text-zinc-500 text-xs font-sans">essential</span>
          </p>
          <p className="text-xs font-bold font-mono tabular-nums text-amber-300 mt-0.5">
            ₹{formatCurrencyExact(status.totalJunkSpent)}{' '}
            <span className="text-zinc-500 text-[11px] font-sans">
              non-essential (cap ₹{formatCurrencyExact(status.nonEssentialLimit)})
            </span>
          </p>
        </div>

        <div className="glass rounded-2xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            5 & 6. Period & Utilisation
          </p>
          <div className="flex items-baseline justify-between gap-2 mt-2">
            <span
              className={`text-2xl font-extrabold font-mono tabular-nums ${
                status.utilisationPct > 100
                  ? 'text-red-400'
                  : status.utilisationPct >= config.warningThresholdPct
                  ? 'text-amber-300'
                  : 'text-brand-400'
              }`}
            >
              {status.utilisationPct}%
            </span>
            <span className="text-xs font-bold text-zinc-300 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              {status.remainingDays}d left
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            {status.durationRemainingDays !== null
              ? `Mode window: ${status.durationRemainingDays}/${status.durationDays}d remaining`
              : `Configured window: ${status.durationDays} days`}
          </p>
        </div>
      </div>

      {/* Progress Bars & Warnings + Configuration Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Progress & Alerts (Items 7 & 8) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass rounded-2xl p-4 space-y-4">
            <h4 className="text-sm font-extrabold text-white">
              7 & 8. Boundaries, Target Progress & Warnings
            </h4>

            {/* Overall Allowance Utilisation */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-zinc-300">Overall Period Allowance</span>
                <span className="font-mono font-bold tabular-nums text-zinc-200">
                  {status.utilisationPct}%
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-ink-900 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    status.utilisationPct > 100
                      ? 'bg-red-500'
                      : status.utilisationPct >= config.warningThresholdPct
                      ? 'bg-amber-400'
                      : 'bg-brand-500'
                  }`}
                  style={{ width: `${Math.min(100, status.utilisationPct)}%` }}
                />
              </div>
            </div>

            {/* Non-Essential Cap Utilisation */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-zinc-300">
                  Non-Essential Cap (₹{formatCurrencyExact(status.totalJunkSpent)} / ₹
                  {formatCurrencyExact(status.nonEssentialLimit)})
                </span>
                <span className="font-mono font-bold tabular-nums text-amber-300">
                  {status.nonEssentialUtilisationPct}%
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-ink-900 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    status.nonEssentialUtilisationPct > 100
                      ? 'bg-red-500'
                      : status.nonEssentialUtilisationPct >= config.warningThresholdPct
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, status.nonEssentialUtilisationPct)}%` }}
                />
              </div>
              <p className="text-[11px] text-zinc-500">
                Non-essential allowance remaining: ₹
                {formatCurrencyExact(status.nonEssentialRemaining)} · Boundary compliance:{' '}
                <span className="text-zinc-300 font-bold">{status.targetProgressPct}%</span>
              </p>
            </div>

            {/* Active Warnings */}
            <div className="pt-2 border-t border-white/[0.06] space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Spending Alerts ({status.warnings.length})
              </p>
              {status.warnings.length === 0 ? (
                <p className="text-xs text-zinc-500">
                  All Broke Mode boundaries are comfortably within safe range.
                </p>
              ) : (
                <div className="space-y-2">
                  {status.warnings.map((w) => (
                    <div
                      key={w.id}
                      className={`rounded-xl p-3 border text-xs ${
                        w.severity === 'critical'
                          ? 'bg-red-500/10 border-red-500/30 text-red-200'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      }`}
                    >
                      <p className="font-extrabold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        {w.title}
                      </p>
                      <p className="text-[11px] opacity-85 mt-1">{w.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Configuration Form */}
        <form onSubmit={handleSaveConfig} className="lg:col-span-7 glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-extrabold text-white">
                Configure Financial Boundaries
              </h4>
              <p className="text-[11px] text-zinc-500">
                Sensible defaults are pre-filled; adjust any restriction to match your goal.
              </p>
            </div>
            {savedNotice && (
              <span className="text-xs font-bold text-brand-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Saved
              </span>
            )}
          </div>

          {/* Active Tracking Period */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
              Active Allowance Period
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`py-2 rounded-xl text-xs font-bold capitalize border transition-colors ${
                    period === p
                      ? 'bg-brand-500/20 border-brand-500/40 text-brand-300'
                      : 'bg-ink-900 border-white/[0.06] text-zinc-400 hover:text-white'
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
                className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1"
              >
                Daily Allowance (₹)
              </label>
              <input
                id="broke-daily-allowance"
                type="number"
                min="50"
                value={dailyAllowance}
                onChange={(e) => setDailyAllowance(e.target.value)}
                className="w-full bg-ink-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-brand-500/40"
              />
            </div>
            <div>
              <label
                htmlFor="broke-weekly-allowance"
                className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1"
              >
                Weekly Allowance (₹)
              </label>
              <input
                id="broke-weekly-allowance"
                type="number"
                min="100"
                value={weeklyAllowance}
                onChange={(e) => setWeeklyAllowance(e.target.value)}
                className="w-full bg-ink-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-brand-500/40"
              />
            </div>
            <div>
              <label
                htmlFor="broke-monthly-allowance"
                className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1"
              >
                Monthly Allowance (₹)
              </label>
              <input
                id="broke-monthly-allowance"
                type="number"
                min="200"
                value={monthlyAllowance}
                onChange={(e) => setMonthlyAllowance(e.target.value)}
                className="w-full bg-ink-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-brand-500/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="broke-max-nonessential"
                className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1"
              >
                Max Non-Essential (₹)
              </label>
              <input
                id="broke-max-nonessential"
                type="number"
                min="0"
                value={maxNonEssential}
                onChange={(e) => setMaxNonEssential(e.target.value)}
                className="w-full bg-ink-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-brand-500/40"
              />
            </div>
            <div>
              <label
                htmlFor="broke-warning-pct"
                className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1"
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
                className="w-full bg-ink-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-brand-500/40"
              />
            </div>
            <div>
              <label
                htmlFor="broke-duration-days"
                className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1"
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
                className="w-full bg-ink-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-brand-500/40"
              />
            </div>
          </div>

          {/* Monitored Categories */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
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
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      selected
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-200'
                        : 'bg-ink-900 border-white/[0.06] text-zinc-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-ink-950 text-xs font-extrabold transition-colors"
          >
            Save Broke Mode Settings
          </button>
        </form>
      </div>
    </div>
  );
}
