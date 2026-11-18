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
  const activeChallenges = evaluatedChallenges.filter(
    (c) => c.challenge.status === 'active'
  );
  const recentTxs = classifiedTxs.slice(0, 5);
  const topLimits = evaluatedLimits.filter((l) => l.limit.enabled).slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Insufficient History / Onboarding State */}
      {!disciplineScore.hasSufficientHistory && (
        <div className="surface-card p-5 border-[#D4E0FF] bg-[#F8FAFF] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-bold text-[#151922]">
              {classifiedTxs.length === 0
                ? 'Wellness Radar Standing By — No Transactions Recorded Yet'
                : `Building Baseline (${classifiedTxs.length}/${disciplineScore.requiredTransactions} Transactions Logged)`}
            </p>
            <p className="text-xs text-[#697386] leading-relaxed">
              Log purchases in Shopping, Receipt Scanner, or Expenses to unlock your 0–100 Financial Discipline Score, leakage detection, and behaviour trends. Limits and Broke Mode boundaries can already be configured now.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('limits')}
              className="btn-secondary px-3.5 py-2 text-xs whitespace-nowrap"
            >
              Configure Limits
            </button>
            <button
              type="button"
              onClick={() => onNavigate('broke')}
              className="btn-primary px-3.5 py-2 text-xs whitespace-nowrap"
            >
              Setup Broke Mode
            </button>
          </div>
        </div>
      )}

      {/* Top KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Discipline Score */}
        <button
          type="button"
          onClick={() => onNavigate('discipline')}
          className="surface-card hover:border-[#D4E0FF] p-4 text-left transition-colors flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2 w-full">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
              Discipline Score
            </span>
            <Award className="w-4 h-4 text-[#365FE8]" />
          </div>
          <div className="mt-3">
            {disciplineScore.hasSufficientHistory &&
            disciplineScore.score !== null ? (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono tabular-nums text-[#151922]">
                  {disciplineScore.score}
                </span>
                <span className="text-xs font-semibold text-[#697386]">/ 100</span>
                <span
                  className={`ml-auto text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                    disciplineScore.score >= 70
                      ? 'bg-[#E8F7F1] text-[#15966B] border-[#B7E4D3]'
                      : disciplineScore.score >= 50
                      ? 'bg-[#FEF6E7] text-[#9E6614] border-[#F3D8A8]'
                      : 'bg-[#FDECEC] text-[#DE5252] border-[#F6B8B8]'
                  }`}
                >
                  {disciplineScore.grade}
                </span>
              </div>
            ) : (
              <div>
                <p className="text-lg font-bold text-[#151922]">
                  Insufficient Data
                </p>
                <p className="text-xs text-[#697386] mt-0.5">
                  {classifiedTxs.length}/{disciplineScore.requiredTransactions} transactions
                </p>
              </div>
            )}
          </div>
          <p className="text-xs text-[#697386] mt-2 flex items-center justify-between w-full">
            <span>
              {disciplineScore.scoreDelta !== null
                ? `${disciplineScore.scoreDelta >= 0 ? '+' : ''}${disciplineScore.scoreDelta} vs prior period`
                : 'Weighted 5-pillar formula'}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-[#929BAB]" />
          </p>
        </button>

        {/* KPI 2: Broke Mode Control */}
        <div
          className={`surface-card p-4 flex flex-col justify-between transition-colors ${
            brokeStatus.enabled ? 'bg-[#FFFDF7] border-[#F3D8A8]' : ''
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
              Broke Mode ({brokeStatus.period})
            </span>
            {brokeStatus.enabled ? (
              <ShieldAlert className="w-4 h-4 text-[#C7851F]" />
            ) : (
              <Shield className="w-4 h-4 text-[#929BAB]" />
            )}
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold font-mono tabular-nums text-[#151922]">
              ₹{formatCurrency(brokeStatus.remaining)}
            </p>
            <p className="text-xs text-[#697386] mt-0.5">
              Remaining of ₹{formatCurrency(brokeStatus.limit)} ·{' '}
              {brokeStatus.remainingDays}d left
            </p>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleBrokeMode}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-colors border ${
                brokeStatus.enabled
                  ? 'bg-[#FDECEC] hover:bg-[#FADADA] text-[#DE5252] border-[#F6B8B8]'
                  : 'btn-primary border-[#365FE8]'
              }`}
            >
              {brokeStatus.enabled ? 'Deactivate' : 'Activate'}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('broke')}
              className="btn-secondary py-1.5 px-2.5 text-xs"
            >
              Config
            </button>
          </div>
        </div>

        {/* KPI 3: Monthly Junk vs Essential */}
        <button
          type="button"
          onClick={() => onNavigate('junk')}
          className="surface-card hover:border-[#D4E0FF] p-4 text-left transition-colors flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2 w-full">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
              Non-Essential (Month)
            </span>
            {junkIntel.monthlyJunkChangePct !== null &&
            junkIntel.monthlyJunkChangePct <= 0 ? (
              <TrendingDown className="w-4 h-4 text-[#15966B]" />
            ) : (
              <TrendingUp className="w-4 h-4 text-[#C7851F]" />
            )}
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold font-mono tabular-nums text-[#9E6614]">
              ₹{formatCurrencyExact(junkIntel.monthlyJunkSpend)}
            </p>
            <p className="text-xs text-[#697386] mt-0.5 tabular-nums">
              {junkIntel.junkShareOfMonthPct}% of month · Essential ₹
              {formatCurrency(junkIntel.monthlyEssentialSpend)}
            </p>
          </div>
          <p className="text-xs text-[#697386] mt-2 flex items-center justify-between w-full">
            <span>
              {junkIntel.leakages.length > 0
                ? `${junkIntel.leakages.length} recurring leakage pattern(s)`
                : 'Review junk & leakage intel'}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-[#929BAB]" />
          </p>
        </button>

        {/* KPI 4: Verified Discipline Streak */}
        <div className="surface-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
              Verified Clean Streak
            </span>
            <Flame className="w-4 h-4 text-[#C7851F]" />
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold font-mono tabular-nums text-[#151922]">
              {verifiedStreak} {verifiedStreak === 1 ? 'day' : 'days'}
            </p>
            <p className="text-xs text-[#697386] mt-0.5">
              Only confirmed clean activity days count
            </p>
          </div>
          <button
            type="button"
            disabled={todayCheckedIn}
            onClick={onCheckInToday}
            className={`mt-3 w-full py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border ${
              todayCheckedIn
                ? 'bg-[#E8F7F1] text-[#15966B] border-[#B7E4D3] cursor-default'
                : 'btn-primary border-[#365FE8]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {todayCheckedIn ? 'Checked In Clean Today' : 'Check In Clean Day'}
          </button>
        </div>
      </div>

      {/* Main Two-Column Decision Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Smart Alerts & Category Limits */}
        <div className="lg:col-span-6 space-y-6">
          <section className="surface-card p-5 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#C7851F]" />
                <h3 className="text-[15px] font-bold text-[#151922]">
                  Smart Spending Alerts ({activeAlerts.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('limits')}
                className="text-xs font-semibold text-[#365FE8] hover:text-[#294FCC]"
              >
                View All
              </button>
            </div>

            {activeAlerts.length === 0 ? (
              <p className="text-xs text-[#697386] py-2">
                No active budget breaches, spending spikes, or repeated leakage warnings right now.
              </p>
            ) : (
              <div className="divide-y divide-[#E7EAF0]">
                {activeAlerts.slice(0, 3).map((alert) => (
                  <div
                    key={alert.signature}
                    className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                            alert.severity === 'critical'
                              ? 'bg-[#FDECEC] text-[#DE5252] border-[#F6B8B8]'
                              : alert.severity === 'warning'
                              ? 'bg-[#FEF6E7] text-[#9E6614] border-[#F3D8A8]'
                              : 'bg-[#E8F7F1] text-[#15966B] border-[#B7E4D3]'
                          }`}
                        >
                          {alert.periodLabel}
                        </span>
                        <p className="text-xs font-bold text-[#151922]">
                          {alert.title}
                        </p>
                      </div>
                      <p className="text-xs text-[#697386] mt-1 leading-relaxed">
                        {alert.reason}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDismissAlert(alert.signature)}
                      aria-label={`Dismiss alert ${alert.title}`}
                      className="text-[#929BAB] hover:text-[#151922] p-1 rounded-lg hover:bg-[#F1F3F6] shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="surface-card p-5 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[15px] font-bold text-[#151922]">
                Active Category Limits
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('limits')}
                className="text-xs font-semibold text-[#365FE8] hover:text-[#294FCC]"
              >
                Manage Limits
              </button>
            </div>

            {topLimits.length === 0 ? (
              <div className="py-2 space-y-2">
                <p className="text-xs text-[#697386]">
                  No category spending limits configured yet. Set daily, weekly, or monthly boundaries for categories like Junk or Dining.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('limits')}
                  className="text-xs font-semibold text-[#365FE8] hover:text-[#294FCC]"
                >
                  + Create Category Limit
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {topLimits.map((ev) => (
                  <div key={ev.limit.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="font-bold text-[#151922]">
                        {ev.limit.category}{' '}
                        <span className="text-[11px] font-normal text-[#697386] capitalize">
                          ({ev.limit.period})
                        </span>
                      </span>
                      <span className="font-mono tabular-nums font-bold text-[#4F5869]">
                        ₹{formatCurrency(ev.spent)} / ₹
                        {formatCurrency(ev.limit.limitAmount)} ·{' '}
                        <span
                          className={
                            ev.status === 'exceeded'
                              ? 'text-[#DE5252]'
                              : ev.status === 'approaching' ||
                                ev.status === 'reached'
                              ? 'text-[#9E6614]'
                              : 'text-[#15966B]'
                          }
                        >
                          {ev.utilisationPct}%
                        </span>
                      </span>
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
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right: Active Challenges & Recent Transaction Classification */}
        <div className="lg:col-span-6 space-y-6">
          <section className="surface-card p-5 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[15px] font-bold text-[#151922]">
                Active Financial Challenges ({activeChallenges.length})
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('discipline')}
                className="text-xs font-semibold text-[#365FE8] hover:text-[#294FCC]"
              >
                Challenges &amp; Goals
              </button>
            </div>

            {activeChallenges.length === 0 ? (
              <div className="py-2 space-y-2">
                <p className="text-xs text-[#697386]">
                  No active discipline sprint running. Start a 3-day No Junk challenge or 7-day Budget Guard.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('discipline')}
                  className="text-xs font-semibold text-[#365FE8] hover:text-[#294FCC]"
                >
                  + Start a Challenge
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeChallenges.slice(0, 3).map((item) => (
                  <div key={item.challenge.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="font-bold text-[#151922] truncate">
                        {item.challenge.title}
                      </span>
                      <span
                        className={`font-mono text-xs font-bold ${
                          item.violated ? 'text-[#DE5252]' : 'text-[#15966B]'
                        }`}
                      >
                        {item.violated
                          ? 'Rule Violated'
                          : `${item.verifiedCleanDays}/${item.challenge.targetDays} clean days`}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[#ECEFF4] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          item.violated ? 'bg-[#DE5252]' : 'bg-[#15966B]'
                        }`}
                        style={{ width: `${Math.min(100, item.progressPct)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="surface-card p-5 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[15px] font-bold text-[#151922]">
                Recent Expense Classification Review
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('junk')}
                className="text-xs font-semibold text-[#365FE8] hover:text-[#294FCC]"
              >
                Full Ledger
              </button>
            </div>

            {recentTxs.length === 0 ? (
              <p className="text-xs text-[#697386] py-2">
                No active expenses yet. Transactions from Shopping, Receipt Scanner, or Expenses appear here automatically.
              </p>
            ) : (
              <div className="divide-y divide-[#E7EAF0]">
                {recentTxs.map((item) => (
                  <div
                    key={item.transaction.id}
                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#151922] truncate">
                        {item.transaction.name}
                      </p>
                      <p className="text-[11px] text-[#697386] mt-0.5">
                        {item.transaction.category} ·{' '}
                        <span className="font-mono font-semibold text-[#151922]">
                          ₹{formatCurrencyExact(item.effectiveAmount)}
                        </span>{' '}
                        ·{' '}
                        {item.classificationSource === 'user'
                          ? 'User confirmed'
                          : 'Auto-predicted'}
                      </p>
                    </div>
                    <select
                      aria-label={`Classification for ${item.transaction.name}`}
                      value={item.classification}
                      onChange={(e) =>
                        onReclassify(
                          item.transaction.id,
                          e.target.value as SpendingClassification
                        )
                      }
                      className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border outline-none cursor-pointer shrink-0 ${
                        item.classification === 'essential'
                          ? 'bg-[#E8F7F1] text-[#15966B] border-[#B7E4D3]'
                          : item.classification === 'impulsive'
                          ? 'bg-[#FDECEC] text-[#DE5252] border-[#F6B8B8]'
                          : 'bg-[#FEF6E7] text-[#9E6614] border-[#F3D8A8]'
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
