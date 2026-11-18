import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Flame,
  Shield,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  X,
} from 'lucide-react';
import type { SpendingClassification } from '../../types/models';
import { formatCurrency, formatCurrencyExact } from '../../utils/categoryStyles';
import type {
  BrokeModeStatus,
  ClassifiedTransaction,
  DisciplineScoreResult,
  EvaluatedCategoryLimit,
  EvaluatedChallenge,
  JunkIntelligenceSummary,
  SmartAlert,
} from '../../utils/warRoomEngine';

export type WarRoomSection = 'overview' | 'broke' | 'junk' | 'limits' | 'discipline';

interface WarRoomOverviewProps {
  brokeStatus: BrokeModeStatus;
  disciplineScore: DisciplineScoreResult;
  junkIntel: JunkIntelligenceSummary;
  evaluatedLimits: EvaluatedCategoryLimit[];
  activeAlerts: SmartAlert[];
  evaluatedChallenges: EvaluatedChallenge[];
  verifiedStreak: number;
  todayCheckedIn: boolean;
  classifiedTxs: ClassifiedTransaction[];
  onNavigate: (section: WarRoomSection) => void;
  onToggleBrokeMode: () => void;
  onDismissAlert: (signature: string) => void;
  onCheckInToday: () => void;
  onReclassify: (txId: string, classification: SpendingClassification) => void;
}

export function WarRoomOverview({
  brokeStatus,
  disciplineScore,
  junkIntel,
  evaluatedLimits,
  activeAlerts,
  evaluatedChallenges,
  verifiedStreak,
  todayCheckedIn,
  classifiedTxs,
  onNavigate,
  onToggleBrokeMode,
  onDismissAlert,
  onCheckInToday,
  onReclassify,
}: WarRoomOverviewProps) {
  const activeChallenges = evaluatedChallenges.filter((c) => c.challenge.status === 'active');
  const recentTxs = classifiedTxs.slice(0, 5);
  const topLimits = evaluatedLimits.filter((l) => l.limit.enabled).slice(0, 4);

  return (
    <div className="space-y-5">
      {/* Insufficient History / Onboarding State */}
      {!disciplineScore.hasSufficientHistory && (
        <div className="glass-strong rounded-2xl p-4 border border-brand-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-extrabold text-white">
              {classifiedTxs.length === 0
                ? 'War Room Standing By — No Transactions Recorded Yet'
                : `Building Baseline (${classifiedTxs.length}/${disciplineScore.requiredTransactions} Transactions Logged)`}
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Log purchases in Quick Mart, Receipt Audit, Split Ledger, or Recent Ledger to unlock your 0–100 Financial Discipline Score, leakage detection, and behaviour trends. Limits and Broke Mode boundaries can already be configured now.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('limits')}
              className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-bold text-zinc-200 whitespace-nowrap"
            >
              Configure Limits
            </button>
            <button
              type="button"
              onClick={() => onNavigate('broke')}
              className="px-3.5 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-ink-950 text-xs font-extrabold whitespace-nowrap"
            >
              Setup Broke Mode
            </button>
          </div>
        </div>
      )}

      {/* Top KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Discipline Score */}
        <button
          type="button"
          onClick={() => onNavigate('discipline')}
          className="glass hover:border-white/15 rounded-2xl p-4 text-left transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2 w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Discipline Score
            </span>
            <Award className="w-4 h-4 text-brand-400" />
          </div>
          <div className="mt-3">
            {disciplineScore.hasSufficientHistory && disciplineScore.score !== null ? (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono tabular-nums text-white">
                  {disciplineScore.score}
                </span>
                <span className="text-xs font-bold text-zinc-500">/ 100</span>
                <span
                  className={`ml-auto text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                    disciplineScore.score >= 70
                      ? 'bg-brand-500/15 text-brand-300 border-brand-500/30'
                      : disciplineScore.score >= 50
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-red-500/15 text-red-300 border-red-500/30'
                  }`}
                >
                  {disciplineScore.grade}
                </span>
              </div>
            ) : (
              <div>
                <p className="text-lg font-extrabold text-zinc-300">Insufficient Data</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {classifiedTxs.length}/{disciplineScore.requiredTransactions} transactions
                </p>
              </div>
            )}
          </div>
          <p className="text-[11px] text-zinc-500 mt-2 flex items-center justify-between w-full">
            <span>
              {disciplineScore.scoreDelta !== null
                ? `${disciplineScore.scoreDelta >= 0 ? '+' : ''}${disciplineScore.scoreDelta} vs prior period`
                : 'Weighted 5-pillar formula'}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
          </p>
        </button>

        {/* KPI 2: Broke Mode Control */}
        <div
          className={`rounded-2xl p-4 border flex flex-col justify-between transition-all ${
            brokeStatus.enabled
              ? 'bg-amber-500/[0.08] border-amber-500/35'
              : 'glass border-white/[0.08]'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Broke Mode ({brokeStatus.period})
            </span>
            {brokeStatus.enabled ? (
              <ShieldAlert className="w-4 h-4 text-amber-400" />
            ) : (
              <Shield className="w-4 h-4 text-zinc-500" />
            )}
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold font-mono tabular-nums text-white">
              ₹{formatCurrency(brokeStatus.remaining)}
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Remaining of ₹{formatCurrency(brokeStatus.limit)} · {brokeStatus.remainingDays}d left
            </p>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleBrokeMode}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-extrabold transition-colors ${
                brokeStatus.enabled
                  ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30'
                  : 'bg-brand-500 hover:bg-brand-400 text-ink-950'
              }`}
            >
              {brokeStatus.enabled ? 'Deactivate' : 'Activate'}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('broke')}
              className="py-1.5 px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-[11px] font-bold text-zinc-300"
            >
              Config
            </button>
          </div>
        </div>

        {/* KPI 3: Monthly Junk vs Essential */}
        <button
          type="button"
          onClick={() => onNavigate('junk')}
          className="glass hover:border-white/15 rounded-2xl p-4 text-left transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2 w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Non-Essential (Month)
            </span>
            {junkIntel.monthlyJunkChangePct !== null && junkIntel.monthlyJunkChangePct <= 0 ? (
              <TrendingDown className="w-4 h-4 text-brand-400" />
            ) : (
              <TrendingUp className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold font-mono tabular-nums text-amber-300">
              ₹{formatCurrencyExact(junkIntel.monthlyJunkSpend)}
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5 tabular-nums">
              {junkIntel.junkShareOfMonthPct}% of month · Essential ₹
              {formatCurrency(junkIntel.monthlyEssentialSpend)}
            </p>
          </div>
          <p className="text-[11px] text-zinc-500 mt-2 flex items-center justify-between w-full">
            <span>
              {junkIntel.leakages.length > 0
                ? `${junkIntel.leakages.length} recurring leakage pattern(s)`
                : 'Review junk & leakage intel'}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
          </p>
        </button>

        {/* KPI 4: Verified Discipline Streak */}
        <div className="glass rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Verified Clean Streak
            </span>
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold font-mono tabular-nums text-white">
              {verifiedStreak} {verifiedStreak === 1 ? 'day' : 'days'}
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Only confirmed clean activity days count
            </p>
          </div>
          <button
            type="button"
            disabled={todayCheckedIn}
            onClick={onCheckInToday}
            className={`mt-3 w-full py-1.5 px-2.5 rounded-lg text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition-colors ${
              todayCheckedIn
                ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30 cursor-default'
                : 'bg-white/[0.07] hover:bg-brand-500 hover:text-ink-950 text-zinc-200 border border-white/[0.08]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {todayCheckedIn ? 'Checked In Clean Today' : 'Check In Clean Day'}
          </button>
        </div>
      </div>

      {/* Main Two-Column Decision Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Smart Alerts & Category Limits */}
        <div className="lg:col-span-6 space-y-5">
          {/* Smart Alerts Snapshot */}
          <section className="glass rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-extrabold text-white">
                  Smart Spending Alerts ({activeAlerts.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('limits')}
                className="text-xs font-bold text-brand-400 hover:text-brand-300"
              >
                View All
              </button>
            </div>

            {activeAlerts.length === 0 ? (
              <p className="text-xs text-zinc-500 py-3">
                No active budget breaches, spending spikes, or repeated leakage warnings right now.
              </p>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {activeAlerts.slice(0, 3).map((alert) => (
                  <div key={alert.signature} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                            alert.severity === 'critical'
                              ? 'bg-red-500/15 text-red-300 border-red-500/30'
                              : alert.severity === 'warning'
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-brand-500/15 text-brand-300 border-brand-500/30'
                          }`}
                        >
                          {alert.periodLabel}
                        </span>
                        <p className="text-xs font-bold text-white">{alert.title}</p>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                        {alert.reason}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDismissAlert(alert.signature)}
                      aria-label={`Dismiss alert ${alert.title}`}
                      className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-white/[0.06] flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Category Limits Snapshot */}
          <section className="glass rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-white">
                Active Category Limits
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('limits')}
                className="text-xs font-bold text-brand-400 hover:text-brand-300"
              >
                Manage Limits
              </button>
            </div>

            {topLimits.length === 0 ? (
              <div className="py-3 space-y-2">
                <p className="text-xs text-zinc-500">
                  No category spending limits configured yet. Set daily, weekly, or monthly boundaries for categories like Junk or Dining.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('limits')}
                  className="text-xs font-extrabold text-brand-400 hover:text-brand-300"
                >
                  + Create Category Limit
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {topLimits.map((ev) => (
                  <div key={ev.limit.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="font-bold text-zinc-200">
                        {ev.limit.category}{' '}
                        <span className="text-[10px] font-normal text-zinc-500 capitalize">
                          ({ev.limit.period})
                        </span>
                      </span>
                      <span className="font-mono tabular-nums font-bold text-zinc-300">
                        ₹{formatCurrency(ev.spent)} / ₹{formatCurrency(ev.limit.limitAmount)} ·{' '}
                        <span
                          className={
                            ev.status === 'exceeded'
                              ? 'text-red-400'
                              : ev.status === 'approaching' || ev.status === 'reached'
                              ? 'text-amber-300'
                              : 'text-brand-400'
                          }
                        >
                          {ev.utilisationPct}%
                        </span>
                      </span>
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
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right: Active Challenges & Recent Transaction Classification */}
        <div className="lg:col-span-6 space-y-5">
          {/* Active Challenges */}
          <section className="glass rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-white">
                Active Financial Challenges ({activeChallenges.length})
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('discipline')}
                className="text-xs font-bold text-brand-400 hover:text-brand-300"
              >
                Challenges & Goals
              </button>
            </div>

            {activeChallenges.length === 0 ? (
              <div className="py-3 space-y-2">
                <p className="text-xs text-zinc-500">
                  No active discipline sprint running. Start a 3-day No Junk challenge or 7-day Budget Guard.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('discipline')}
                  className="text-xs font-extrabold text-brand-400 hover:text-brand-300"
                >
                  + Start a Challenge
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeChallenges.slice(0, 3).map((item) => (
                  <div key={item.challenge.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="font-bold text-white truncate">{item.challenge.title}</span>
                      <span
                        className={`font-mono text-[11px] font-bold ${
                          item.violated ? 'text-red-400' : 'text-brand-400'
                        }`}
                      >
                        {item.violated
                          ? 'Rule Violated'
                          : `${item.verifiedCleanDays}/${item.challenge.targetDays} clean days`}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-ink-900 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          item.violated ? 'bg-red-500' : 'bg-brand-500'
                        }`}
                        style={{ width: `${Math.min(100, item.progressPct)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent Expense Classifications */}
          <section className="glass rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-white">
                Recent Expense Classification Review
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('junk')}
                className="text-xs font-bold text-brand-400 hover:text-brand-300"
              >
                Full Ledger
              </button>
            </div>

            {recentTxs.length === 0 ? (
              <p className="text-xs text-zinc-500 py-3">
                No active expenses yet. Transactions from Quick Mart, Audit, Split Ledger, or Price Tracker appear here automatically.
              </p>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {recentTxs.map((item) => (
                  <div
                    key={item.transaction.id}
                    className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">
                        {item.transaction.name}
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {item.transaction.category} ·{' '}
                        <span className="font-mono text-zinc-300">
                          ₹{formatCurrencyExact(item.effectiveAmount)}
                        </span>{' '}
                        · {item.classificationSource === 'user' ? 'User confirmed' : 'Auto-predicted'}
                      </p>
                    </div>
                    <select
                      aria-label={`War Room classification for ${item.transaction.name}`}
                      value={item.classification}
                      onChange={(e) =>
                        onReclassify(
                          item.transaction.id,
                          e.target.value as SpendingClassification
                        )
                      }
                      className={`text-[11px] font-bold px-2 py-1 rounded-lg border bg-ink-900 outline-none cursor-pointer flex-shrink-0 ${
                        item.classification === 'essential'
                          ? 'text-brand-300 border-brand-500/30'
                          : item.classification === 'impulsive'
                          ? 'text-rose-300 border-rose-500/35'
                          : 'text-amber-300 border-amber-500/30'
                      }`}
                    >
                      <option value="essential">Essential</option>
                      <option value="non_essential">Non-Essential</option>
                      <option value="impulsive">Impulsive</option>
                    </select>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
