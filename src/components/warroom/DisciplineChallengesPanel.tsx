import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  Award,
  CheckCircle2,
  Flame,
  PiggyBank,
  Plus,
  Target,
  Trash2,
  Trophy,
} from 'lucide-react';
import type {
  FinancialChallengeTemplateId,
  FinancialTargetType,
} from '../../types/models';
import { useAppStore } from '../../store/useStore';
import { formatCurrencyExact } from '../../utils/categoryStyles';
import { getChartThemeTokens } from '../../utils/settingsEngine';
import {
  CHALLENGE_TEMPLATES,
  type BehaviourAnalyticsSummary,
  type DisciplineScoreResult,
  type EvaluatedChallenge,
  type EvaluatedFinancialTarget,
} from '../../utils/warRoomEngine';

interface DisciplineChallengesPanelProps {
  categories: string[];
  disciplineScore: DisciplineScoreResult;
  behaviour: BehaviourAnalyticsSummary;
  evaluatedChallenges: EvaluatedChallenge[];
  verifiedStreak: number;
  todayCheckedIn: boolean;
  evaluatedTargets: EvaluatedFinancialTarget[];
  onCheckInToday: () => void;
  onStartChallenge: (input: {
    templateId: FinancialChallengeTemplateId;
    title: string;
    description: string;
    targetDays: number;
    targetCategory?: string | null;
    maxAllowedSpend?: number | null;
    isCustom?: boolean;
  }) => void;
  onCompleteChallenge: (id: string) => void;
  onDeleteChallenge: (id: string) => void;
  onAddTarget: (input: {
    title: string;
    type: FinancialTargetType;
    period: 'weekly' | 'monthly';
    targetValue: number;
    baselineValue?: number | null;
  }) => void;
  onLogSavingsTransfer: (id: string, amount: number) => void;
  onDeleteTarget: (id: string) => void;
}

export function DisciplineChallengesPanel({
  categories,
  disciplineScore,
  behaviour,
  evaluatedChallenges,
  verifiedStreak,
  todayCheckedIn,
  evaluatedTargets,
  onCheckInToday,
  onStartChallenge,
  onCompleteChallenge,
  onDeleteChallenge,
  onAddTarget,
  onLogSavingsTransfer,
  onDeleteTarget,
}: DisciplineChallengesPanelProps) {
  const theme = useAppStore((s) => s.theme);
  const visualTheme = useAppStore((s) => s.visualTheme);
  const chartTokens = getChartThemeTokens(theme, visualTheme.mood);
  const [customTitle, setCustomTitle] = useState('');
  const [customDays, setCustomDays] = useState('7');
  const [customCategory, setCustomCategory] = useState('');
  const [customMaxSpend, setCustomMaxSpend] = useState('');

  const [targetTitle, setTargetTitle] = useState('');
  const [targetType, setTargetType] =
    useState<FinancialTargetType>('reduce_junk_by_amount');
  const [targetPeriod, setTargetPeriod] = useState<'weekly' | 'monthly'>(
    'monthly'
  );
  const [targetValue, setTargetValue] = useState('500');
  const [transferInputs, setTransferInputs] = useState<Record<string, string>>(
    {}
  );

  const handleCreateCustomChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;
    onStartChallenge({
      templateId: 'custom',
      title: customTitle.trim(),
      description: customCategory
        ? `Keep ${customCategory} disciplined for ${customDays} days.`
        : `Complete ${customDays}-day personal financial control sprint.`,
      targetDays: Number(customDays) || 7,
      targetCategory: customCategory || null,
      maxAllowedSpend: customMaxSpend ? Number(customMaxSpend) : null,
      isCustom: true,
    });
    setCustomTitle('');
    setCustomMaxSpend('');
  };

  const handleCreateTarget = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(targetValue);
    if (!targetTitle.trim() || !Number.isFinite(val) || val <= 0) return;
    onAddTarget({
      title: targetTitle.trim(),
      type: targetType,
      period: targetPeriod,
      targetValue: val,
    });
    setTargetTitle('');
  };

  const handleTransfer = (targetId: string) => {
    const amt = Number(transferInputs[targetId]);
    if (!Number.isFinite(amt) || amt <= 0) return;
    onLogSavingsTransfer(targetId, amt);
    setTransferInputs((prev) => ({ ...prev, [targetId]: '' }));
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Discipline Score & History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-6 surface-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[var(--accent-ink)]" />
              <h3 className="font-display text-base font-bold text-[var(--text-primary)]">
                Financial Discipline Score
              </h3>
            </div>
            <span className="text-[12px] font-semibold px-2.5 py-1 rounded-lg bg-[var(--bg-well)] text-[var(--text-tertiary)] border border-[var(--border-subtle)]">
              {disciplineScore.grade}
            </span>
          </div>

          {!disciplineScore.hasSufficientHistory ||
          disciplineScore.score === null ||
          !disciplineScore.breakdown ? (
            <div className="surface-well p-4 space-y-2">
              <p className="text-sm font-bold text-[var(--text-primary)]">
                Insufficient Transaction History
              </p>
              <p className="text-[12.5px] text-[var(--text-secondary)] leading-relaxed">
                {disciplineScore.explanation[0]} Wellness Radar never awards artificial 100/100 scores for empty histories.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold font-mono tabular-nums text-[var(--text-primary)]">
                      {disciplineScore.score}
                    </span>
                    <span className="text-sm font-semibold text-[var(--text-secondary)]">
                      / 100
                    </span>
                  </div>
                  <p className="text-[12px] text-[var(--text-secondary)] mt-1">
                    {disciplineScore.previousScore !== null ? (
                      <>
                        Previous window:{' '}
                        <span className="font-mono tabular-nums font-semibold text-[var(--text-primary)]">
                          {disciplineScore.previousScore}
                        </span>{' '}
                        ·{' '}
                        <span
                          className={`font-mono tabular-nums font-bold ${
                            (disciplineScore.scoreDelta ?? 0) >= 0
                              ? 'text-[var(--accent-success-ink)]'
                              : 'text-[var(--accent-danger-ink)]'
                          }`}
                        >
                          {(disciplineScore.scoreDelta ?? 0) >= 0 ? '+' : ''}
                          {disciplineScore.scoreDelta} pts
                        </span>
                      </>
                    ) : (
                      'Based on 5 transparent measurable pillars'
                    )}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 pt-3 border-t border-[var(--border-subtle)]">
                {(
                  [
                    [
                      'Budget & Limit Adherence',
                      disciplineScore.breakdown.adherence,
                      30,
                    ],
                    [
                      'Essential Priority Balance',
                      disciplineScore.breakdown.essentialBalance,
                      25,
                    ],
                    [
                      'Impulsive Purchase Control',
                      disciplineScore.breakdown.impulsiveControl,
                      20,
                    ],
                    [
                      'Period-over-Period Progress',
                      disciplineScore.breakdown.periodImprovement,
                      15,
                    ],
                    [
                      'Challenges & Check-In Consistency',
                      disciplineScore.breakdown.consistency,
                      10,
                    ],
                  ] as const
                ).map(([label, pts, max]) => (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between text-[12px]">
                      <span className="text-[var(--text-tertiary)] font-semibold">
                        {label}
                      </span>
                      <span className="font-mono font-bold text-[var(--text-primary)] tabular-nums">
                        {pts} / {max}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full tactile-well bg-[var(--bg-well)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--accent-primary)]"
                        style={{ width: `${Math.round((pts / max) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 border-t border-[var(--border-subtle)] text-[12px]">
                <div className="rounded-xl bg-[var(--accent-success-soft)] border border-[var(--accent-success-border)] p-3">
                  <p className="text-[12px] font-semibold text-[var(--accent-success-ink)]">
                    Strongest Habit
                  </p>
                  <p className="font-bold text-[var(--text-primary)] mt-0.5">
                    {disciplineScore.strongestHabit}
                  </p>
                </div>
                <div className="rounded-xl bg-[var(--accent-warning-soft)] border border-[var(--accent-warning-border)] p-3">
                  <p className="text-[12px] font-semibold text-[var(--accent-warning-ink)]">
                    Biggest Improvement Area
                  </p>
                  <p className="font-bold text-[var(--text-primary)] mt-0.5">
                    {disciplineScore.biggestImprovementArea}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right: 6-Week Discipline Score History Chart */}
        <div className="lg:col-span-6 surface-card p-5 space-y-3">
          <div>
            <h4 className="font-display text-[15px] font-bold text-[var(--text-primary)]">
              Discipline Score History (Weekly Trend)
            </h4>
            <p className="text-[12px] text-[var(--text-secondary)]">
              Calculated from actual recorded weeks; weeks with zero data remain blank.
            </p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={behaviour.disciplineTrend}
                margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={chartTokens.gridStroke} />
                <XAxis
                  dataKey="label"
                  tick={{
                    fill: chartTokens.tickColor,
                    fontSize: 11,
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                />
                <YAxis
                  width={36}
                  domain={[0, 100]}
                  tick={{
                    fill: chartTokens.tickColor,
                    fontSize: 11,
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                />
                <Tooltip
                  cursor={{ stroke: chartTokens.gridStroke }}
                  contentStyle={chartTokens.tooltipStyle}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  name="Discipline Score"
                  stroke={chartTokens.accent}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: chartTokens.accent }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Section 2: Financial Challenges & Verified Streaks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 surface-card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-[var(--accent-warning-ink)]" />
              <h4 className="font-display text-[15px] font-bold text-[var(--text-primary)]">
                Active &amp; Completed Challenges ({evaluatedChallenges.length})
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-mono tabular-nums font-bold text-[var(--accent-warning-ink)]">
                Streak: {verifiedStreak}d
              </span>
              <button
                type="button"
                disabled={todayCheckedIn}
                onClick={onCheckInToday}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold flex items-center gap-1 border transition-colors ${
                  todayCheckedIn
                    ? 'bg-[var(--accent-success-soft)] text-[var(--accent-success-ink)] border-[var(--accent-success-border)]'
                    : 'btn-primary border-transparent'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {todayCheckedIn ? 'Today Verified' : 'Check In Clean Day'}
              </button>
            </div>
          </div>

          <p className="text-[12px] text-[var(--text-secondary)]">
            Streaks and challenge days only increment on days with verified clean spending or an explicit clean-day check-in — empty no-data days do not count.
          </p>

          {evaluatedChallenges.length === 0 ? (
            <p className="text-[12.5px] text-[var(--text-secondary)] py-3">
              No challenges active. Pick a preset discipline challenge or create your own on the right.
            </p>
          ) : (
            <div className="space-y-3">
              {evaluatedChallenges.map((ev) => (
                <div
                  key={ev.challenge.id}
                  className={`rounded-xl p-4 border space-y-2.5 ${
                    ev.challenge.status === 'completed'
                      ? 'bg-[var(--accent-success-soft)] border-[var(--accent-success-border)]'
                      : ev.violated
                      ? 'bg-[var(--accent-danger-soft)] border-[var(--accent-danger-border)]'
                      : 'surface-well border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Trophy
                          className={`w-3.5 h-3.5 ${
                            ev.challenge.status === 'completed'
                              ? 'text-[var(--accent-success-ink)]'
                              : 'text-[var(--accent-warning-ink)]'
                          }`}
                        />
                        <span className="text-[13px] font-bold text-[var(--text-primary)]">
                          {ev.challenge.title}
                        </span>
                        <span
                          className={`text-[12px] font-semibold ${
                            ev.challenge.status === 'completed'
                              ? 'text-[var(--accent-success-ink)]'
                              : ev.violated
                              ? 'text-[var(--accent-danger-ink)]'
                              : 'text-[var(--accent-ink)]'
                          }`}
                        >
                          ·{' '}
                          {ev.challenge.status === 'completed'
                            ? 'Completed'
                            : ev.violated
                            ? 'Violated'
                            : 'Active'}
                        </span>
                      </div>
                      <p className="text-[12px] text-[var(--text-secondary)] mt-1">
                        {ev.challenge.description}
                      </p>
                      {ev.violated && ev.violationReason && (
                        <p className="text-[12px] font-semibold text-[var(--accent-danger-ink)] mt-1">
                          {ev.violationReason}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {ev.isEligibleToComplete && (
                        <button
                          type="button"
                          onClick={() => onCompleteChallenge(ev.challenge.id)}
                          className="btn-primary px-2.5 py-1 text-[12px]"
                        >
                          Claim Complete
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteChallenge(ev.challenge.id)}
                        aria-label={`Delete challenge ${ev.challenge.title}`}
                        className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent-danger-ink)] hover:bg-[var(--accent-danger-soft)]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[12px] font-mono tabular-nums text-[var(--text-secondary)]">
                      <span>
                        Verified Clean: {ev.verifiedCleanDays}/
                        {ev.challenge.targetDays} days · Day {ev.elapsedDays}
                      </span>
                      <span>{ev.progressPct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--bg-surface)] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          ev.violated ? 'bg-[var(--accent-danger)]' : 'bg-[var(--accent-success)]'
                        }`}
                        style={{ width: `${Math.min(100, ev.progressPct)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preset + Custom Challenge Creator */}
        <div className="lg:col-span-5 surface-card p-5 space-y-4">
          <h4 className="font-display text-[15px] font-bold text-[var(--text-primary)]">
            Start a Financial Challenge
          </h4>
          <div className="space-y-2">
            {CHALLENGE_TEMPLATES.map((tpl) => (
              <div
                key={tpl.templateId}
                className="surface-well p-3 flex items-center justify-between gap-2.5"
              >
                <div className="min-w-0">
                  <p className="text-[12.5px] font-bold text-[var(--text-primary)]">{tpl.title}</p>
                  <p className="text-[12px] text-[var(--text-secondary)] line-clamp-2">
                    {tpl.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onStartChallenge({
                      templateId: tpl.templateId,
                      title: tpl.title,
                      description: tpl.description,
                      targetDays: tpl.targetDays,
                      targetCategory: tpl.defaultCategory ?? null,
                      maxAllowedSpend: tpl.defaultMaxSpend ?? null,
                    })
                  }
                  className="btn-secondary px-3 py-1.5 text-[12px] shrink-0"
                >
                  Start
                </button>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleCreateCustomChallenge}
            className="pt-3 border-t border-[var(--border-subtle)] space-y-2.5"
          >
            <p className="text-[12px] font-semibold text-[var(--text-secondary)]">
              Custom Challenge
            </p>
            <input
              type="text"
              placeholder="e.g., No food delivery for 5 days"
              aria-label="Custom challenge title"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="input-field w-full px-3 py-2 text-[12.5px]"
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                min="1"
                max="90"
                placeholder="Days"
                aria-label="Custom challenge target days"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                className="input-field px-2.5 py-2 text-[12.5px] font-mono tabular-nums"
              />
              <select
                aria-label="Custom challenge category"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="input-field px-2 py-2 text-[12.5px]"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                placeholder="Max ₹"
                aria-label="Custom challenge max spend"
                value={customMaxSpend}
                onChange={(e) => setCustomMaxSpend(e.target.value)}
                className="input-field px-2.5 py-2 text-[12.5px] font-mono tabular-nums"
              />
            </div>
            <button
              type="submit"
              className="btn-primary w-full py-2.5 text-[12.5px] flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
              Launch Custom Challenge
            </button>
          </form>
        </div>
      </div>

      {/* Section 3: Financial Targets & Real Savings Motivation */}
      <div className="surface-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[var(--accent-ink)]" />
            <div>
              <h4 className="font-display text-[15px] font-bold text-[var(--text-primary)]">
                Financial Targets &amp; Savings Tracker
              </h4>
              <p className="text-[12px] text-[var(--text-secondary)]">
                Tracks observed spend reduction separately from estimated savings and actual money you transfer into savings.
              </p>
            </div>
          </div>
        </div>

        {/* Create Target Form */}
        <form
          onSubmit={handleCreateTarget}
          className="surface-well grid grid-cols-1 sm:grid-cols-12 gap-2.5 p-3.5"
        >
          <input
            type="text"
            placeholder="Target title (e.g., Cut monthly junk by ₹500)"
            aria-label="Financial target title"
            value={targetTitle}
            onChange={(e) => setTargetTitle(e.target.value)}
            className="input-field sm:col-span-4 px-3 py-2 text-[12.5px]"
          />
          <select
            aria-label="Financial target rule"
            value={targetType}
            onChange={(e) =>
              setTargetType(e.target.value as FinancialTargetType)
            }
            className="input-field sm:col-span-3 px-2.5 py-2 text-[12.5px]"
          >
            <option value="reduce_junk_by_amount">Reduce Junk By (₹)</option>
            <option value="reduce_impulsive_pct">Reduce Impulsive By (%)</option>
            <option value="cap_non_essential_amount">
              Cap Non-Essential Under (₹)
            </option>
          </select>
          <select
            aria-label="Financial target period"
            value={targetPeriod}
            onChange={(e) =>
              setTargetPeriod(e.target.value as 'weekly' | 'monthly')
            }
            className="input-field sm:col-span-2 px-2.5 py-2 text-[12.5px]"
          >
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
          </select>
          <input
            type="number"
            min="1"
            aria-label="Financial target value"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            className="input-field sm:col-span-1 px-2.5 py-2 text-[12.5px] font-mono tabular-nums"
          />
          <button
            type="submit"
            className="btn-primary sm:col-span-2 py-2 px-3 text-[12.5px] flex items-center justify-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            Add Target
          </button>
        </form>

        {evaluatedTargets.length === 0 ? (
          <p className="text-[12.5px] text-[var(--text-secondary)] py-2">
            No savings or reduction targets created yet. Add one above to measure real reduction vs transferred savings.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {evaluatedTargets.map((ev) => (
              <div key={ev.target.id} className="surface-well p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-bold text-[var(--text-primary)]">
                      {ev.target.title}
                    </p>
                    <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                      {ev.statusLabel}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteTarget(ev.target.id)}
                    aria-label={`Delete target ${ev.target.title}`}
                    className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--accent-danger-ink)]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="h-2 rounded-full bg-[var(--bg-surface)] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      ev.achieved ? 'bg-[var(--accent-success)]' : 'bg-[var(--accent-warning)]'
                    }`}
                    style={{ width: `${Math.min(100, ev.progressPct)}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[var(--border-subtle)] text-[12px]">
                  <div>
                    <p className="text-[12px] font-medium text-[var(--text-secondary)]">
                      Spend Reduction
                    </p>
                    <p className="font-mono font-bold text-[var(--accent-success-ink)] tabular-nums mt-0.5">
                      ₹{formatCurrencyExact(ev.spendReduction)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-[var(--text-secondary)]">
                      Target Est.
                    </p>
                    <p className="font-mono font-bold text-[var(--accent-ink)] tabular-nums mt-0.5">
                      ₹{formatCurrencyExact(ev.estimatedSavings)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-[var(--text-secondary)]">
                      Transferred
                    </p>
                    <p className="font-mono font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
                      ₹{formatCurrencyExact(ev.transferredSavings)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <PiggyBank className="w-4 h-4 text-[var(--accent-success-ink)] shrink-0" />
                  <input
                    type="number"
                    min="1"
                    placeholder="Log actual ₹ saved"
                    aria-label={`Log actual savings transfer for ${ev.target.title}`}
                    value={transferInputs[ev.target.id] ?? ''}
                    onChange={(e) =>
                      setTransferInputs((prev) => ({
                        ...prev,
                        [ev.target.id]: e.target.value,
                      }))
                    }
                    className="input-field flex-1 min-w-0 px-2.5 py-1.5 text-[12px] font-mono tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => handleTransfer(ev.target.id)}
                    className="btn-secondary px-3 py-1.5 text-[12px]"
                  >
                    Record Transfer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
