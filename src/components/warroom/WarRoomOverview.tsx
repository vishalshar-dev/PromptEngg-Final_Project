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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border-subtle)]">
          <div className="space-y-0.5 max-w-2xl">
            <p className="text-[13.5px] font-semibold text-[var(--text-primary)]">
              {classifiedTxs.length === 0
                ? 'Wellness Radar standing by'
                : `Building discipline baseline (${classifiedTxs.length}/${disciplineScore.requiredTransactions} transactions)`}
            </p>
            <p className="text-[12.5px] text-[var(--text-secondary)]">
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
      <section className="surface-card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)] overflow-hidden">
        {/* 1. Discipline Score */}
        <div className="p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-medium text-[var(--text-secondary)]">
              Discipline Score
            </span>
            <button
              type="button"
              onClick={() => onNavigate('discipline')}
              className="text-[12px] font-medium text-[var(--accent-ink)] hover:opacity-80 inline-flex items-center gap-1 whitespace-nowrap"
            >
              Details <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div>
            {disciplineScore.hasSufficientHistory &&
            disciplineScore.score !== null ? (
              <div className="flex items-baseline gap-2">
                <span className="text-[28px] leading-none font-bold font-mono tabular-nums text-[var(--text-primary)]">
                  {disciplineScore.score}
                </span>
                <span className="text-[12.5px] text-[var(--text-secondary)]">/ 100</span>
                <span
                  className={`ml-auto text-[12px] font-semibold ${
                    disciplineScore.score >= 70
                      ? 'text-[var(--accent-success-ink)]'
                      : disciplineScore.score >= 50
                      ? 'text-[var(--accent-warning-ink)]'
                      : 'text-[var(--accent-danger-ink)]'
                  }`}
                >
                  {disciplineScore.grade}
                </span>
              </div>
            ) : (
              <div>
                <p className="text-[18px] font-semibold text-[var(--text-primary)] tabular-nums">
                  {classifiedTxs.length}/{disciplineScore.requiredTransactions}{' '}
                  <span className="text-[12.5px] font-normal text-[var(--text-secondary)]">
                    logged
                  </span>
                </p>
                <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                  Needs {disciplineScore.requiredTransactions} transactions
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 2. Broke Mode */}
        <div className="p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-medium text-[var(--text-secondary)]">
              Broke Mode ({brokeStatus.period})
            </span>
            <button
              type="button"
              onClick={() => onNavigate('broke')}
              className="text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] whitespace-nowrap"
            >
              Configure
            </button>
          </div>
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-[24px] leading-none font-bold font-mono tabular-nums text-[var(--text-primary)]">
                ₹{formatCurrency(brokeStatus.remaining)}
              </p>
              <p className="text-[12px] text-[var(--text-secondary)] mt-1 tabular-nums">
                of ₹{formatCurrency(brokeStatus.limit)} · {brokeStatus.remainingDays}d left
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleBrokeMode}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap shrink-0 border transition-colors ${
                brokeStatus.enabled
                  ? 'bg-[var(--accent-danger-soft)] text-[var(--accent-danger-ink)] border-[var(--accent-danger-border)] hover:opacity-90'
                  : 'btn-primary border-transparent'
              }`}
            >
              {brokeStatus.enabled ? 'Turn Off' : 'Turn On'}
            </button>
          </div>
        </div>

        {/* 3. Non-Essential Month */}
        <div className="p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-medium text-[var(--text-secondary)]">
              Non-Essential (Month)
            </span>
            <button
              type="button"
              onClick={() => onNavigate('junk')}
              className="text-[12px] font-medium text-[var(--accent-ink)] hover:opacity-80 inline-flex items-center gap-1 whitespace-nowrap"
            >
              Review <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div>
            <p className="text-[24px] leading-none font-bold font-mono tabular-nums text-[var(--accent-warning-ink)]">
              ₹{formatCurrencyExact(junkIntel.monthlyJunkSpend)}
            </p>
            <p className="text-[12px] text-[var(--text-secondary)] mt-1 tabular-nums">
              {junkIntel.junkShareOfMonthPct}% of month · Essential ₹
              {formatCurrency(junkIntel.monthlyEssentialSpend)}
            </p>
          </div>
        </div>

        {/* 4. Verified Clean Streak */}
        <div className="p-5 flex flex-col justify-between gap-3">
          <span className="text-[12px] font-medium text-[var(--text-secondary)]">
            Verified Clean Streak
          </span>
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-[24px] leading-none font-bold font-mono tabular-nums text-[var(--text-primary)]">
                {verifiedStreak} {verifiedStreak === 1 ? 'day' : 'days'}
              </p>
              <p className="text-[12px] text-[var(--text-secondary)] mt-1">
                Confirmed clean days
              </p>
            </div>
            <button
              type="button"
              disabled={todayCheckedIn}
              onClick={onCheckInToday}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold inline-flex items-center gap-1 whitespace-nowrap shrink-0 border transition-colors ${
                todayCheckedIn
                  ? 'bg-[var(--accent-success-soft)] text-[var(--accent-success-ink)] border-[var(--accent-success-border)] cursor-default'
                  : 'btn-primary border-transparent'
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
                  className="text-[12.5px] font-medium text-[var(--accent-ink)] hover:opacity-80 whitespace-nowrap"
                >
                  View all
                </button>
              }
            />

            {activeAlerts.length === 0 ? (
              <p className="text-[13px] text-[var(--text-secondary)] py-4 border-t border-[var(--border-subtle)]">
                No active budget breaches, spending spikes, or repeated leakage warnings.
              </p>
            ) : (
              <div className="border-t border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
                {activeAlerts.slice(0, 3).map((alert) => (
                  <div
                    key={alert.signature}
                    className="py-3.5 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                        <span
                          className={`text-[12px] font-semibold mr-2 ${
                            alert.severity === 'critical'
                              ? 'text-[var(--accent-danger-ink)]'
                              : alert.severity === 'warning'
                              ? 'text-[var(--accent-warning-ink)]'
                              : 'text-[var(--accent-success-ink)]'
                          }`}
                        >
                          {alert.periodLabel}
                        </span>{' '}
                        {alert.title}
                      </p>
                      <p className="text-[12.5px] text-[var(--text-secondary)] mt-1 leading-relaxed">
                        {alert.reason}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {alert.category && onQuickCapCategory && (
                        <button
                          type="button"
                          onClick={() => onQuickCapCategory(alert.category!)}
                          className="text-[12px] font-semibold text-[var(--accent-ink)] bg-[var(--accent-primary-soft)] hover:bg-[var(--accent-primary-soft-hover)] border border-[var(--accent-border)] px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors"
                        >
                          Cap Category
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDismissAlert(alert.signature)}
                        aria-label={`Dismiss alert ${alert.title}`}
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg hover:bg-[var(--bg-subtle)] shrink-0"
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
                  className="text-[12.5px] font-medium text-[var(--accent-ink)] hover:opacity-80 whitespace-nowrap"
                >
                  Manage limits
                </button>
              }
            />

            {topLimits.length === 0 ? (
              <div className="py-4 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
                <p className="text-[13px] text-[var(--text-secondary)]">
                  No category caps configured yet.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('limits')}
                  className="text-[12.5px] font-semibold text-[var(--accent-ink)] hover:opacity-80 whitespace-nowrap shrink-0"
                >
                  + Add limit
                </button>
              </div>
            ) : (
              <div className="border-t border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
                {topLimits.map((ev) => (
                  <div key={ev.limit.id} className="py-3.5 space-y-2">
                    <div className="flex items-center justify-between text-[13px] gap-2">
                      <span className="font-medium text-[var(--text-primary)]">
                        {ev.limit.category}{' '}
                        <span className="text-[12px] text-[var(--text-secondary)] capitalize">
                          · {ev.limit.period}
                        </span>
                      </span>
                      <span className="font-mono tabular-nums font-semibold text-[var(--text-primary)]">
                        ₹{formatCurrency(ev.spent)} / ₹
                        {formatCurrency(ev.limit.limitAmount)}{' '}
                        <span
                          className={
                            ev.status === 'exceeded'
                              ? 'text-[var(--accent-danger-ink)]'
                              : ev.status === 'approaching' ||
                                ev.status === 'reached'
                              ? 'text-[var(--accent-warning-ink)]'
                              : 'text-[var(--accent-success-ink)]'
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
                  className="text-[12.5px] font-medium text-[var(--accent-ink)] hover:opacity-80 whitespace-nowrap"
                >
                  Challenges &amp; goals
                </button>
              }
            />

            {activeChallenges.length === 0 ? (
              <div className="py-4 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
                <p className="text-[13px] text-[var(--text-secondary)]">
                  No active discipline sprint running.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('discipline')}
                  className="text-[12.5px] font-semibold text-[var(--accent-ink)] hover:opacity-80 whitespace-nowrap shrink-0"
                >
                  + Start challenge
                </button>
              </div>
            ) : (
              <div className="border-t border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
                {activeChallenges.slice(0, 3).map((item) => (
                  <div key={item.challenge.id} className="py-3.5 space-y-2">
                    <div className="flex items-center justify-between text-[13px] gap-2">
                      <span className="font-medium text-[var(--text-primary)] truncate">
                        {item.challenge.title}
                      </span>
                      <span
                        className={`font-mono tabular-nums text-[12px] font-semibold whitespace-nowrap ${
                          item.violated ? 'text-[var(--accent-danger-ink)]' : 'text-[var(--accent-success-ink)]'
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
                  className="text-[12.5px] font-medium text-[var(--accent-ink)] hover:opacity-80 whitespace-nowrap"
                >
                  Full ledger
                </button>
              }
            />

            {recentTxs.length === 0 ? (
              <p className="text-[13px] text-[var(--text-secondary)] py-4 border-t border-[var(--border-subtle)]">
                Transactions from Shopping, Receipt Scanner, or Expenses appear here for review.
              </p>
            ) : (
              <div className="border-t border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
                {recentTxs.map((item) => (
                  <div
                    key={item.transaction.id}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-medium text-[var(--text-primary)] truncate">
                        {item.transaction.name}
                      </p>
                      <p className="text-[12px] text-[var(--text-secondary)] mt-0.5 tabular-nums">
                        {item.transaction.category} ·{' '}
                        <span className="font-mono font-semibold text-[var(--text-primary)]">
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
                          ? 'bg-[var(--accent-success-soft)] text-[var(--accent-success-ink)] border-[var(--accent-success-border)]'
                          : item.classification === 'impulsive'
                          ? 'bg-[var(--accent-danger-soft)] text-[var(--accent-danger-ink)] border-[var(--accent-danger-border)]'
                          : 'bg-[var(--accent-warning-soft)] text-[var(--accent-warning-ink)] border-[var(--accent-warning-border)]'
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
