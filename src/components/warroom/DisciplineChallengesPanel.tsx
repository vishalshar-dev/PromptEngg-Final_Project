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
import { formatCurrencyExact } from '../../utils/categoryStyles';
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
  // Custom Challenge form
  const [customTitle, setCustomTitle] = useState('');
  const [customDays, setCustomDays] = useState('7');
  const [customCategory, setCustomCategory] = useState('');
  const [customMaxSpend, setCustomMaxSpend] = useState('');

  // Target form
  const [targetTitle, setTargetTitle] = useState('');
  const [targetType, setTargetType] = useState<FinancialTargetType>('reduce_junk_by_amount');
  const [targetPeriod, setTargetPeriod] = useState<'weekly' | 'monthly'>('monthly');
  const [targetValue, setTargetValue] = useState('500');
  const [transferInputs, setTransferInputs] = useState<Record<string, string>>({});

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
    <div className="space-y-5">
      {/* Section 1: Discipline Score & History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-6 glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-brand-400" />
              <h3 className="text-base font-extrabold text-white">
                Financial Discipline Score
              </h3>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white/[0.05] text-zinc-300 border border-white/[0.08]">
              {disciplineScore.grade}
            </span>
          </div>

          {!disciplineScore.hasSufficientHistory || disciplineScore.score === null || !disciplineScore.breakdown ? (
            <div className="rounded-xl bg-ink-900/70 border border-white/[0.06] p-4 space-y-2">
              <p className="text-sm font-extrabold text-zinc-200">
                Insufficient Transaction History
              </p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {disciplineScore.explanation[0]} War Room never awards artificial 100/100 scores for empty histories.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-extrabold font-mono tabular-nums text-white">
                      {disciplineScore.score}
                    </span>
                    <span className="text-sm font-bold text-zinc-500">/ 100</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    {disciplineScore.previousScore !== null ? (
                      <>
                        Previous window: <span className="font-mono text-zinc-200">{disciplineScore.previousScore}</span> ·{' '}
                        <span
                          className={`font-mono font-bold ${
                            (disciplineScore.scoreDelta ?? 0) >= 0 ? 'text-brand-400' : 'text-rose-400'
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

              {/* Transparent Formula Breakdown */}
              <div className="space-y-2.5 pt-2 border-t border-white/[0.06]">
                {(
                  [
                    ['Budget & Limit Adherence', disciplineScore.breakdown.adherence, 30],
                    ['Essential Priority Balance', disciplineScore.breakdown.essentialBalance, 25],
                    ['Impulsive Purchase Control', disciplineScore.breakdown.impulsiveControl, 20],
                    ['Period-over-Period Progress', disciplineScore.breakdown.periodImprovement, 15],
                    ['Challenges & Check-In Consistency', disciplineScore.breakdown.consistency, 10],
                  ] as const
                ).map(([label, pts, max]) => (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-300 font-semibold">{label}</span>
                      <span className="font-mono font-bold text-white tabular-nums">
                        {pts} / {max}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-ink-900 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${Math.round((pts / max) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-white/[0.06] text-xs">
                <div className="rounded-xl bg-brand-500/10 border border-brand-500/25 p-3">
                  <p className="text-[10px] font-bold uppercase text-brand-300">Strongest Habit</p>
                  <p className="font-bold text-white mt-0.5">{disciplineScore.strongestHabit}</p>
                </div>
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-3">
                  <p className="text-[10px] font-bold uppercase text-amber-300">
                    Biggest Improvement Area
                  </p>
                  <p className="font-bold text-white mt-0.5">
                    {disciplineScore.biggestImprovementArea}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right: 6-Week Discipline Score History Chart */}
        <div className="lg:col-span-6 glass rounded-2xl p-5 space-y-3">
          <div>
            <h4 className="text-sm font-extrabold text-white">
              Discipline Score History (Weekly Trend)
            </h4>
            <p className="text-[11px] text-zinc-500">
              Calculated from actual recorded weeks; weeks with zero data remain blank.
            </p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={behaviour.disciplineTrend}
                margin={{ top: 10, right: 12, left: -16, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111116',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  name="Discipline Score"
                  stroke="#22c55e"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#22c55e' }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Section 2: Financial Challenges & Verified Streaks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7 glass rounded-2xl p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <h4 className="text-sm font-extrabold text-white">
                Active & Completed Challenges ({evaluatedChallenges.length})
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-orange-300">
                Streak: {verifiedStreak}d
              </span>
              <button
                type="button"
                disabled={todayCheckedIn}
                onClick={onCheckInToday}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold flex items-center gap-1 ${
                  todayCheckedIn
                    ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30'
                    : 'bg-brand-500 hover:bg-brand-400 text-ink-950'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {todayCheckedIn ? 'Today Verified' : 'Check In Clean Day'}
              </button>
            </div>
          </div>

          <p className="text-[11px] text-zinc-500">
            Streaks and challenge days only increment on days with verified clean spending or an explicit clean-day check-in — empty no-data days do not count.
          </p>

          {evaluatedChallenges.length === 0 ? (
            <p className="text-xs text-zinc-500 py-4">
              No challenges active. Pick a preset discipline challenge or create your own on the right.
            </p>
          ) : (
            <div className="space-y-3">
              {evaluatedChallenges.map((ev) => (
                <div
                  key={ev.challenge.id}
                  className={`rounded-xl p-3.5 border space-y-2 ${
                    ev.challenge.status === 'completed'
                      ? 'bg-brand-500/10 border-brand-500/30'
                      : ev.violated
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-ink-900/60 border-white/[0.06]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Trophy
                          className={`w-3.5 h-3.5 ${
                            ev.challenge.status === 'completed' ? 'text-brand-400' : 'text-amber-300'
                          }`}
                        />
                        <span className="text-xs font-extrabold text-white">
                          {ev.challenge.title}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-300">
                          {ev.challenge.status === 'completed'
                            ? 'Completed'
                            : ev.violated
                            ? 'Violated'
                            : 'Active'}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1">{ev.challenge.description}</p>
                      {ev.violated && ev.violationReason && (
                        <p className="text-[11px] font-bold text-red-300 mt-1">
                          {ev.violationReason}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {ev.isEligibleToComplete && (
                        <button
                          type="button"
                          onClick={() => onCompleteChallenge(ev.challenge.id)}
                          className="px-2.5 py-1 rounded-lg bg-brand-500 hover:bg-brand-400 text-ink-950 text-[11px] font-extrabold"
                        >
                          Claim Complete
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteChallenge(ev.challenge.id)}
                        aria-label={`Delete challenge ${ev.challenge.title}`}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono tabular-nums text-zinc-400">
                      <span>
                        Verified Clean: {ev.verifiedCleanDays}/{ev.challenge.targetDays} days ·
                        Day {ev.elapsedDays}
                      </span>
                      <span>{ev.progressPct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-ink-950 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          ev.violated ? 'bg-red-500' : 'bg-brand-500'
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
        <div className="lg:col-span-5 glass rounded-2xl p-4 space-y-4">
          <h4 className="text-sm font-extrabold text-white">Start a Financial Challenge</h4>
          <div className="space-y-2">
            {CHALLENGE_TEMPLATES.map((tpl) => (
              <div
                key={tpl.templateId}
                className="rounded-xl bg-ink-900/60 border border-white/[0.06] p-3 flex items-center justify-between gap-2.5"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white">{tpl.title}</p>
                  <p className="text-[11px] text-zinc-500 line-clamp-2">{tpl.description}</p>
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
                  className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-brand-500 hover:text-ink-950 text-xs font-extrabold text-white flex-shrink-0 transition-colors"
                >
                  Start
                </button>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleCreateCustomChallenge}
            className="pt-3 border-t border-white/[0.06] space-y-2.5"
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Custom Challenge
            </p>
            <input
              type="text"
              placeholder="e.g., No food delivery for 5 days"
              aria-label="Custom challenge title"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="w-full bg-ink-900 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white outline-none"
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
                className="bg-ink-900 border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs font-mono text-white outline-none"
              />
              <select
                aria-label="Custom challenge category"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="bg-ink-900 border border-white/[0.08] rounded-xl px-2 py-2 text-xs text-white outline-none"
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
                className="bg-ink-900 border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs font-mono text-white outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-ink-950 text-xs font-extrabold flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={3} />
              Launch Custom Challenge
            </button>
          </form>
        </div>
      </div>

      {/* Section 3: Financial Targets & Real Savings Motivation */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-brand-400" />
            <div>
              <h4 className="text-sm font-extrabold text-white">
                Financial Targets & Savings Tracker
              </h4>
              <p className="text-[11px] text-zinc-500">
                Tracks observed spend reduction separately from estimated savings and actual money you transfer into savings.
              </p>
            </div>
          </div>
        </div>

        {/* Create Target Form */}
        <form
          onSubmit={handleCreateTarget}
          className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 bg-ink-900/60 border border-white/[0.06] rounded-xl p-3"
        >
          <input
            type="text"
            placeholder="Target title (e.g., Cut monthly junk by ₹500)"
            aria-label="Financial target title"
            value={targetTitle}
            onChange={(e) => setTargetTitle(e.target.value)}
            className="sm:col-span-4 bg-ink-950 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none"
          />
          <select
            aria-label="Financial target rule"
            value={targetType}
            onChange={(e) => setTargetType(e.target.value as FinancialTargetType)}
            className="sm:col-span-3 bg-ink-950 border border-white/[0.08] rounded-lg px-2.5 py-2 text-xs text-white outline-none"
          >
            <option value="reduce_junk_by_amount">Reduce Junk By (₹)</option>
            <option value="reduce_impulsive_pct">Reduce Impulsive By (%)</option>
            <option value="cap_non_essential_amount">Cap Non-Essential Under (₹)</option>
          </select>
          <select
            aria-label="Financial target period"
            value={targetPeriod}
            onChange={(e) => setTargetPeriod(e.target.value as 'weekly' | 'monthly')}
            className="sm:col-span-2 bg-ink-950 border border-white/[0.08] rounded-lg px-2.5 py-2 text-xs text-white outline-none"
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
            className="sm:col-span-1 bg-ink-950 border border-white/[0.08] rounded-lg px-2.5 py-2 text-xs font-mono text-white outline-none"
          />
          <button
            type="submit"
            className="sm:col-span-2 py-2 px-3 rounded-lg bg-brand-500 hover:bg-brand-400 text-ink-950 text-xs font-extrabold flex items-center justify-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={3} />
            Add Target
          </button>
        </form>

        {evaluatedTargets.length === 0 ? (
          <p className="text-xs text-zinc-500 py-2">
            No savings or reduction targets created yet. Add one above to measure real reduction vs transferred savings.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {evaluatedTargets.map((ev) => (
              <div
                key={ev.target.id}
                className="rounded-xl bg-ink-900/60 border border-white/[0.06] p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-extrabold text-white">{ev.target.title}</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{ev.statusLabel}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteTarget(ev.target.id)}
                    aria-label={`Delete target ${ev.target.title}`}
                    className="p-1 rounded-lg text-zinc-500 hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="h-2 rounded-full bg-ink-950 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      ev.achieved ? 'bg-brand-500' : 'bg-amber-400'
                    }`}
                    style={{ width: `${Math.min(100, ev.progressPct)}%` }}
                  />
                </div>

                {/* Strict 3-Way Distinction */}
                <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-zinc-500">
                      Spend Reduction
                    </p>
                    <p className="font-mono font-extrabold text-brand-400 tabular-nums mt-0.5">
                      ₹{formatCurrencyExact(ev.spendReduction)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-zinc-500">
                      Target Est.
                    </p>
                    <p className="font-mono font-extrabold text-sky-300 tabular-nums mt-0.5">
                      ₹{formatCurrencyExact(ev.estimatedSavings)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-zinc-500">
                      Transferred
                    </p>
                    <p className="font-mono font-extrabold text-white tabular-nums mt-0.5">
                      ₹{formatCurrencyExact(ev.transferredSavings)}
                    </p>
                  </div>
                </div>

                {/* Explicit Savings Transfer Logger */}
                <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                  <PiggyBank className="w-4 h-4 text-brand-400 flex-shrink-0" />
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
                    className="flex-1 min-w-0 bg-ink-950 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleTransfer(ev.target.id)}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-brand-500 hover:text-ink-950 text-[11px] font-extrabold text-white transition-colors"
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
