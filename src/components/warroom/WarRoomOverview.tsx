import {
  CheckCircle2,
  X,
  ArrowRight,
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
import { SectionHeader } from '../ui/SectionHeader';
import { ProgressBar } from '../ui/ProgressBar';

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
  onQuickCapCategory?: (category: string) => void;
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
  onQuickCapCategory,
}: WarRoomOverviewProps) {
  const activeChallenges = evaluatedChallenges.filter(
    (c) => c.challenge.status === 'active'
  );
  const recentTxs = classifiedTxs.slice(0, 5);
  const topLimits = evaluatedLimits.filter((l) => l.limit.enabled).slice(0, 4);

  return (
    <div className="space-y-8">
      {/* Calm Baseline Strip when insufficient history */}
      {!disciplineScore.hasSufficientHistory && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E7EAF0]">
          <div className="space-y-0.5 max-w-2xl">
            <p className="text-[13.5px] font-semibold text-[#151922]">
              {classifiedTxs.length === 0
                ? 'Wellness Radar standing by'
                : `Building discipline baseline (${classifiedTxs.length}/${disciplineScore.requiredTransactions} transactions)`}
            </p>
            <p className="text-[12.5px] text-[#697386]">
              Log purchases in Shopping, Receipt Scanner, or Expenses to unlock your 0–100 Discipline Score and leakage patterns.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('limits')}
              className="btn-secondary px-3.5 py-2 text-[12.5px] whitespace-nowrap shrink-0"
            >
              Configure Limits
            </button>
            <button
              type="button"
              onClick={() => onNavigate('broke')}
              className="btn-primary px-3.5 py-2 text-[12.5px] whitespace-nowrap shrink-0"
            >
              Setup Broke Mode
            </button>
          </div>
        </div>
      )}

      {/* Single Hairline Summary Strip */}
      <section className="bg-white border border-[#E7EAF0] rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E7EAF0]">
        {/* 1. Discipline Score */}
        <div className="p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#697386]">
              Discipline Score
            </span>
            <button
              type="button"
              onClick={() => onNavigate('discipline')}
              className="text-[12px] font-medium text-[#365FE8] hover:text-[#274CC8] inline-flex items-center gap-1 whitespace-nowrap"
            >
              Details <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div>
            {disciplineScore.hasSufficientHistory &&
            disciplineScore.score !== null ? (
              <div className="flex items-baseline gap-2">
                <span className="text-[28px] leading-none font-bold font-mono tabular-nums text-[#151922]">
                  {disciplineScore.score}
                </span>
                <span className="text-[12.5px] text-[#697386]">/ 100</span>
                <span
                  className={`ml-auto text-[11.5px] font-semibold ${
                    disciplineScore.score >= 70
                      ? 'text-[#15966B]'
                      : disciplineScore.score >= 50
                      ? 'text-[#C7851F]'
                      : 'text-[#DE5252]'
                  }`}
                >
                  {disciplineScore.grade}
                </span>
              </div>
            ) : (
              <div>
                <p className="text-[18px] font-semibold text-[#151922] tabular-nums">
                  {classifiedTxs.length}/{disciplineScore.requiredTransactions}{' '}
                  <span className="text-[12.5px] font-normal text-[#697386]">
                    logged
                  </span>
                </p>
                <p className="text-[12px] text-[#697386] mt-0.5">
                  Needs {disciplineScore.requiredTransactions} transactions
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 2. Broke Mode */}
        <div className="p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#697386]">
              Broke Mode ({brokeStatus.period})
            </span>
            <button
              type="button"
              onClick={() => onNavigate('broke')}
              className="text-[12px] font-medium text-[#697386] hover:text-[#151922] whitespace-nowrap"
            >
              Configure
            </button>
          </div>
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-[24px] leading-none font-bold font-mono tabular-nums text-[#151922]">
                ₹{formatCurrency(brokeStatus.remaining)}
              </p>
              <p className="text-[12px] text-[#697386] mt-1 tabular-nums">
                of ₹{formatCurrency(brokeStatus.limit)} · {brokeStatus.remainingDays}d left
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleBrokeMode}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap shrink-0 border transition-colors ${
                brokeStatus.enabled
                  ? 'bg-[#FDECEC] text-[#DE5252] border-[#F6B8B8] hover:bg-[#FADADA]'
                  : 'btn-primary border-[#365FE8]'
              }`}
            >
              {brokeStatus.enabled ? 'Turn Off' : 'Turn On'}
            </button>
          </div>
        </div>

        {/* 3. Non-Essential Month */}
        <div className="p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#697386]">
              Non-Essential (Month)
            </span>
            <button
              type="button"
              onClick={() => onNavigate('junk')}
              className="text-[12px] font-medium text-[#365FE8] hover:text-[#274CC8] inline-flex items-center gap-1 whitespace-nowrap"
            >
              Review <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div>
            <p className="text-[24px] leading-none font-bold font-mono tabular-nums text-[#C7851F]">
              ₹{formatCurrencyExact(junkIntel.monthlyJunkSpend)}
            </p>
            <p className="text-[12px] text-[#697386] mt-1 tabular-nums">
              {junkIntel.junkShareOfMonthPct}% of month · Essential ₹
              {formatCurrency(junkIntel.monthlyEssentialSpend)}
            </p>
          </div>
        </div>

        {/* 4. Verified Clean Streak */}
        <div className="p-5 flex flex-col justify-between gap-3">
          <span className="text-[11px] font-medium uppercase tracking-wider text-[#697386]">
            Verified Clean Streak
          </span>
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-[24px] leading-none font-bold font-mono tabular-nums text-[#151922]">
                {verifiedStreak} {verifiedStreak === 1 ? 'day' : 'days'}
              </p>
              <p className="text-[12px] text-[#697386] mt-1">
                Confirmed clean days
              </p>
            </div>
            <button
              type="button"
              disabled={todayCheckedIn}
              onClick={onCheckInToday}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold inline-flex items-center gap-1 whitespace-nowrap shrink-0 border transition-colors ${
                todayCheckedIn
                  ? 'bg-[#E8F7F1] text-[#15966B] border-[#B7E4D3] cursor-default'
                  : 'btn-primary border-[#365FE8]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {todayCheckedIn ? 'Checked In' : 'Check In'}
            </button>
          </div>
        </div>
      </section>

      {/* Open Two-Column Decision Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Alerts & Category Limits */}
        <div className="lg:col-span-6 space-y-8">
          <section className="space-y-3">
            <SectionHeader
              title={`Smart Spending Alerts (${activeAlerts.length})`}
              action={
                <button
                  type="button"
                  onClick={() => onNavigate('limits')}
                  className="text-[12.5px] font-medium text-[#365FE8] hover:text-[#274CC8] whitespace-nowrap"
                >
                  View all
                </button>
              }
            />

            {activeAlerts.length === 0 ? (
              <p className="text-[13px] text-[#697386] py-4 border-t border-[#E7EAF0]">
                No active budget breaches, spending spikes, or repeated leakage warnings.
              </p>
            ) : (
              <div className="border-t border-[#E7EAF0] divide-y divide-[#E7EAF0]">
                {activeAlerts.slice(0, 3).map((alert) => (
                  <div
                    key={alert.signature}
                    className="py-3.5 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#151922]">
                        <span
                          className={`text-[11px] font-semibold uppercase tracking-wider mr-2 ${
                            alert.severity === 'critical'
                              ? 'text-[#DE5252]'
                              : alert.severity === 'warning'
                              ? 'text-[#C7851F]'
                              : 'text-[#15966B]'
                          }`}
                        >
                          {alert.periodLabel}
                        </span>
                        {alert.title}
                      </p>
                      <p className="text-[12.5px] text-[#697386] mt-1 leading-relaxed">
                        {alert.reason}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {alert.category && onQuickCapCategory && (
                        <button
                          type="button"
                          onClick={() => onQuickCapCategory(alert.category!)}
                          className="text-[11.5px] font-semibold text-[#365FE8] hover:text-[#274CC8] bg-[#EDF2FF] hover:bg-[#DFE8FF] border border-[#D4E0FF] px-2 py-1 rounded-lg whitespace-nowrap transition-colors"
                        >
                          Cap Category
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDismissAlert(alert.signature)}
                        aria-label={`Dismiss alert ${alert.title}`}
                        className="text-[#929BAB] hover:text-[#151922] p-1 rounded-lg hover:bg-[#F1F3F6] shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <SectionHeader
              title="Active Category Limits"
              action={
                <button
                  type="button"
                  onClick={() => onNavigate('limits')}
                  className="text-[12.5px] font-medium text-[#365FE8] hover:text-[#274CC8] whitespace-nowrap"
                >
                  Manage limits
                </button>
              }
            />

            {topLimits.length === 0 ? (
              <div className="py-4 border-t border-[#E7EAF0] flex items-center justify-between gap-3">
                <p className="text-[13px] text-[#697386]">
                  No category caps configured yet.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('limits')}
                  className="text-[12.5px] font-semibold text-[#365FE8] hover:text-[#274CC8] whitespace-nowrap shrink-0"
                >
                  + Add limit
                </button>
              </div>
            ) : (
              <div className="border-t border-[#E7EAF0] divide-y divide-[#E7EAF0]">
                {topLimits.map((ev) => (
                  <div key={ev.limit.id} className="py-3.5 space-y-2">
                    <div className="flex items-center justify-between text-[13px] gap-2">
                      <span className="font-medium text-[#151922]">
                        {ev.limit.category}{' '}
                        <span className="text-[12px] text-[#697386] capitalize">
                          · {ev.limit.period}
                        </span>
                      </span>
                      <span className="font-mono tabular-nums font-semibold text-[#151922]">
                        ₹{formatCurrency(ev.spent)} / ₹
                        {formatCurrency(ev.limit.limitAmount)}{' '}
                        <span
                          className={
                            ev.status === 'exceeded'
                              ? 'text-[#DE5252]'
                              : ev.status === 'approaching' ||
                                ev.status === 'reached'
                              ? 'text-[#C7851F]'
                              : 'text-[#15966B]'
                          }
                        >
                          ({ev.utilisationPct}%)
                        </span>
                      </span>
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
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right: Active Challenges & Classification Review */}
        <div className="lg:col-span-6 space-y-8">
          <section className="space-y-3">
            <SectionHeader
              title={`Active Challenges (${activeChallenges.length})`}
              action={
                <button
                  type="button"
                  onClick={() => onNavigate('discipline')}
                  className="text-[12.5px] font-medium text-[#365FE8] hover:text-[#274CC8] whitespace-nowrap"
                >
                  Challenges &amp; goals
                </button>
              }
            />

            {activeChallenges.length === 0 ? (
              <div className="py-4 border-t border-[#E7EAF0] flex items-center justify-between gap-3">
                <p className="text-[13px] text-[#697386]">
                  No active discipline sprint running.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('discipline')}
                  className="text-[12.5px] font-semibold text-[#365FE8] hover:text-[#274CC8] whitespace-nowrap shrink-0"
                >
                  + Start challenge
                </button>
              </div>
            ) : (
              <div className="border-t border-[#E7EAF0] divide-y divide-[#E7EAF0]">
                {activeChallenges.slice(0, 3).map((item) => (
                  <div key={item.challenge.id} className="py-3.5 space-y-2">
                    <div className="flex items-center justify-between text-[13px] gap-2">
                      <span className="font-medium text-[#151922] truncate">
                        {item.challenge.title}
                      </span>
                      <span
                        className={`font-mono text-[12px] font-semibold whitespace-nowrap ${
                          item.violated ? 'text-[#DE5252]' : 'text-[#15966B]'
                        }`}
                      >
                        {item.violated
                          ? 'Rule violated'
                          : `${item.verifiedCleanDays}/${item.challenge.targetDays} clean days`}
                      </span>
                    </div>
                    <ProgressBar
                      value={item.progressPct}
                      tone={item.violated ? 'danger' : 'success'}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <SectionHeader
              title="Expense Classification Review"
              action={
                <button
                  type="button"
                  onClick={() => onNavigate('junk')}
                  className="text-[12.5px] font-medium text-[#365FE8] hover:text-[#274CC8] whitespace-nowrap"
                >
                  Full ledger
                </button>
              }
            />

            {recentTxs.length === 0 ? (
              <p className="text-[13px] text-[#697386] py-4 border-t border-[#E7EAF0]">
                Transactions from Shopping, Receipt Scanner, or Expenses appear here for review.
              </p>
            ) : (
              <div className="border-t border-[#E7EAF0] divide-y divide-[#E7EAF0]">
                {recentTxs.map((item) => (
                  <div
                    key={item.transaction.id}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-medium text-[#151922] truncate">
                        {item.transaction.name}
                      </p>
                      <p className="text-[12px] text-[#697386] mt-0.5 tabular-nums">
                        {item.transaction.category} ·{' '}
                        <span className="font-mono font-semibold text-[#151922]">
                          ₹{formatCurrencyExact(item.effectiveAmount)}
                        </span>{' '}
                        ·{' '}
                        {item.classificationSource === 'user'
                          ? 'Confirmed'
                          : 'Predicted'}
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
                      className={`text-[12px] font-semibold px-2.5 py-1.5 rounded-lg border outline-none cursor-pointer shrink-0 ${
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
