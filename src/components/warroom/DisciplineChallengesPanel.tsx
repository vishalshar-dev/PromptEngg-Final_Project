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
              <Award className="w-5 h-5 text-[#365FE8]" />
              <h3 className="text-base font-bold text-[#151922]">
                Financial Discipline Score
              </h3>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#F1F3F6] text-[#4F5869] border border-[#E7EAF0]">
              {disciplineScore.grade}
            </span>
          </div>

          {!disciplineScore.hasSufficientHistory ||
          disciplineScore.score === null ||
          !disciplineScore.breakdown ? (
            <div className="surface-subtle p-4 space-y-2">
              <p className="text-sm font-bold text-[#151922]">
                Insufficient Transaction History
              </p>
              <p className="text-xs text-[#697386] leading-relaxed">
                {disciplineScore.explanation[0]} Wellness Radar never awards artificial 100/100 scores for empty histories.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold font-mono tabular-nums text-[#151922]">
                      {disciplineScore.score}
                    </span>
                    <span className="text-sm font-semibold text-[#697386]">
                      / 100
                    </span>
                  </div>
                  <p className="text-xs text-[#697386] mt-1">
                    {disciplineScore.previousScore !== null ? (
                      <>
                        Previous window:{' '}
                        <span className="font-mono font-semibold text-[#151922]">
                          {disciplineScore.previousScore}
                        </span>{' '}
                        ·{' '}
                        <span
                          className={`font-mono font-bold ${
                            (disciplineScore.scoreDelta ?? 0) >= 0
                              ? 'text-[#15966B]'
                              : 'text-[#DE5252]'
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

              <div className="space-y-2.5 pt-3 border-t border-[#E7EAF0]">
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
                    <div className="flex justify-between text-xs">
                      <span className="text-[#4F5869] font-semibold">
                        {label}
                      </span>
                      <span className="font-mono font-bold text-[#151922] tabular-nums">
                        {pts} / {max}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full tactile-well bg-[#ECEFF4] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#365FE8]"
                        style={{ width: `${Math.round((pts / max) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 border-t border-[#E7EAF0] text-xs">
                <div className="rounded-xl bg-[#E8F7F1] border border-[#B7E4D3] p-3">
                  <p className="text-[10px] font-bold uppercase text-[#15966B]">
                    Strongest Habit
                  </p>
                  <p className="font-bold text-[#151922] mt-0.5">
                    {disciplineScore.strongestHabit}
                  </p>
                </div>
                <div className="rounded-xl bg-[#FEF6E7] border border-[#F3D8A8] p-3">
                  <p className="text-[10px] font-bold uppercase text-[#9E6614]">
                    Biggest Improvement Area
                  </p>
                  <p className="font-bold text-[#151922] mt-0.5">
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
            <h4 className="text-[15px] font-bold text-[#151922]">
              Discipline Score History (Weekly Trend)
            </h4>
            <p className="text-xs text-[#697386]">
              Calculated from actual recorded weeks; weeks with zero data remain blank.
            </p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={behaviour.disciplineTrend}
                margin={{ top: 10, right: 12, left: -16, bottom: 0 }}
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
              <Flame className="w-4 h-4 text-[#C7851F]" />
              <h4 className="text-[15px] font-bold text-[#151922]">
                Active &amp; Completed Challenges ({evaluatedChallenges.length})
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#9E6614]">
                Streak: {verifiedStreak}d
              </span>
              <button
                type="button"
                disabled={todayCheckedIn}
                onClick={onCheckInToday}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-colors ${
                  todayCheckedIn
                    ? 'bg-[#E8F7F1] text-[#15966B] border-[#B7E4D3]'
                    : 'btn-primary border-[#365FE8]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {todayCheckedIn ? 'Today Verified' : 'Check In Clean Day'}
              </button>
            </div>
          </div>

          <p className="text-xs text-[#697386]">
            Streaks and challenge days only increment on days with verified clean spending or an explicit clean-day check-in — empty no-data days do not count.
          </p>

          {evaluatedChallenges.length === 0 ? (
            <p className="text-xs text-[#697386] py-3">
              No challenges active. Pick a preset discipline challenge or create your own on the right.
            </p>
          ) : (
            <div className="space-y-3">
              {evaluatedChallenges.map((ev) => (
                <div
                  key={ev.challenge.id}
                  className={`rounded-xl p-4 border space-y-2.5 ${
                    ev.challenge.status === 'completed'
                      ? 'bg-[#E8F7F1] border-[#B7E4D3]'
                      : ev.violated
                      ? 'bg-[#FDECEC] border-[#F6B8B8]'
                      : 'surface-subtle'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Trophy
                          className={`w-3.5 h-3.5 ${
                            ev.challenge.status === 'completed'
                              ? 'text-[#15966B]'
                              : 'text-[#C7851F]'
                          }`}
                        />
                        <span className="text-xs font-bold text-[#151922]">
                          {ev.challenge.title}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#FFFFFF] text-[#4F5869] border border-[#E7EAF0]">
                          {ev.challenge.status === 'completed'
                            ? 'Completed'
                            : ev.violated
                            ? 'Violated'
                            : 'Active'}
                        </span>
                      </div>
                      <p className="text-xs text-[#697386] mt-1">
                        {ev.challenge.description}
                      </p>
                      {ev.violated && ev.violationReason && (
                        <p className="text-xs font-bold text-[#DE5252] mt-1">
                          {ev.violationReason}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {ev.isEligibleToComplete && (
                        <button
                          type="button"
                          onClick={() => onCompleteChallenge(ev.challenge.id)}
                          className="btn-primary px-2.5 py-1 text-xs"
                        >
                          Claim Complete
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteChallenge(ev.challenge.id)}
                        aria-label={`Delete challenge ${ev.challenge.title}`}
                        className="p-1.5 rounded-lg text-[#697386] hover:text-[#DE5252] hover:bg-[#FDECEC]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono tabular-nums text-[#697386]">
                      <span>
                        Verified Clean: {ev.verifiedCleanDays}/
                        {ev.challenge.targetDays} days · Day {ev.elapsedDays}
                      </span>
                      <span>{ev.progressPct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#ECEFF4] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          ev.violated ? 'bg-[#DE5252]' : 'bg-[#15966B]'
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
          <h4 className="text-[15px] font-bold text-[#151922]">
            Start a Financial Challenge
          </h4>
          <div className="space-y-2">
            {CHALLENGE_TEMPLATES.map((tpl) => (
              <div
                key={tpl.templateId}
                className="surface-subtle p-3 flex items-center justify-between gap-2.5"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#151922]">{tpl.title}</p>
                  <p className="text-xs text-[#697386] line-clamp-2">
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
                  className="btn-secondary px-3 py-1.5 text-xs shrink-0"
                >
                  Start
                </button>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleCreateCustomChallenge}
            className="pt-3 border-t border-[#E7EAF0] space-y-2.5"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
              Custom Challenge
            </p>
            <input
              type="text"
              placeholder="e.g., No food delivery for 5 days"
              aria-label="Custom challenge title"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="input-field w-full px-3 py-2 text-xs"
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
                className="input-field px-2.5 py-2 text-xs font-mono"
              />
              <select
                aria-label="Custom challenge category"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="input-field px-2 py-2 text-xs"
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
                className="input-field px-2.5 py-2 text-xs font-mono"
              />
            </div>
            <button
              type="submit"
              className="btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-1.5"
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
            <Target className="w-4 h-4 text-[#365FE8]" />
            <div>
              <h4 className="text-[15px] font-bold text-[#151922]">
                Financial Targets &amp; Savings Tracker
              </h4>
              <p className="text-xs text-[#697386]">
                Tracks observed spend reduction separately from estimated savings and actual money you transfer into savings.
              </p>
            </div>
          </div>
        </div>

        {/* Create Target Form */}
        <form
          onSubmit={handleCreateTarget}
          className="surface-subtle grid grid-cols-1 sm:grid-cols-12 gap-2.5 p-3.5"
        >
          <input
            type="text"
            placeholder="Target title (e.g., Cut monthly junk by ₹500)"
            aria-label="Financial target title"
            value={targetTitle}
            onChange={(e) => setTargetTitle(e.target.value)}
            className="input-field sm:col-span-4 px-3 py-2 text-xs"
          />
          <select
            aria-label="Financial target rule"
            value={targetType}
            onChange={(e) =>
              setTargetType(e.target.value as FinancialTargetType)
            }
            className="input-field sm:col-span-3 px-2.5 py-2 text-xs"
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
            className="input-field sm:col-span-2 px-2.5 py-2 text-xs"
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
            className="input-field sm:col-span-1 px-2.5 py-2 text-xs font-mono"
          />
          <button
            type="submit"
            className="btn-primary sm:col-span-2 py-2 px-3 text-xs flex items-center justify-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            Add Target
          </button>
        </form>

        {evaluatedTargets.length === 0 ? (
          <p className="text-xs text-[#697386] py-2">
            No savings or reduction targets created yet. Add one above to measure real reduction vs transferred savings.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {evaluatedTargets.map((ev) => (
              <div key={ev.target.id} className="surface-subtle p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-[#151922]">
                      {ev.target.title}
                    </p>
                    <p className="text-xs text-[#697386] mt-0.5">
                      {ev.statusLabel}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteTarget(ev.target.id)}
                    aria-label={`Delete target ${ev.target.title}`}
                    className="p-1 rounded-lg text-[#697386] hover:text-[#DE5252]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="h-2 rounded-full bg-[#ECEFF4] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      ev.achieved ? 'bg-[#15966B]' : 'bg-[#E5A23B]'
                    }`}
                    style={{ width: `${Math.min(100, ev.progressPct)}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                  <div className="bg-[#FFFFFF] rounded-lg border border-[#E7EAF0] p-2">
                    <p className="text-[10px] font-semibold uppercase text-[#697386]">
                      Spend Reduction
                    </p>
                    <p className="font-mono font-bold text-[#15966B] tabular-nums mt-0.5">
                      ₹{formatCurrencyExact(ev.spendReduction)}
                    </p>
                  </div>
                  <div className="bg-[#FFFFFF] rounded-lg border border-[#E7EAF0] p-2">
                    <p className="text-[10px] font-semibold uppercase text-[#697386]">
                      Target Est.
                    </p>
                    <p className="font-mono font-bold text-[#365FE8] tabular-nums mt-0.5">
                      ₹{formatCurrencyExact(ev.estimatedSavings)}
                    </p>
                  </div>
                  <div className="bg-[#FFFFFF] rounded-lg border border-[#E7EAF0] p-2">
                    <p className="text-[10px] font-semibold uppercase text-[#697386]">
                      Transferred
                    </p>
                    <p className="font-mono font-bold text-[#151922] tabular-nums mt-0.5">
                      ₹{formatCurrencyExact(ev.transferredSavings)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#E7EAF0]">
                  <PiggyBank className="w-4 h-4 text-[#15966B] shrink-0" />
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
                    className="input-field flex-1 min-w-0 px-2.5 py-1.5 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleTransfer(ev.target.id)}
                    className="btn-secondary px-3 py-1.5 text-xs"
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
