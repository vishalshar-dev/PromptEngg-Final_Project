import type { Transaction } from '../types/models';
import { getEffectiveTransactionAmount } from './martEngine';
import { roundCurrency } from './splitLedgerEngine';

export interface BudgetCycleWindow {
  resetDay: number;
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
  label: string;
  previousLabel: string;
  daysTotal: number;
  daysElapsed: number;
  daysRemaining: number;
}

export interface BudgetCycleSummary {
  window: BudgetCycleWindow;
  baseBudget: number;
  rolloverEnabled: boolean;
  rolloverDelta: number;
  hasPreviousHistory: boolean;
  previousCycleSpent: number;
  effectiveBudget: number;
  currentSpent: number;
  remainingBudget: number;
  utilizationPct: number;
}

export function clampBudgetResetDay(day: unknown): number {
  const num = typeof day === 'number' ? day : Number(day);
  if (!Number.isFinite(num)) return 1;
  return Math.min(28, Math.max(1, Math.round(num)));
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function getActiveBudgetCycleWindow(
  resetDayInput: number = 1,
  now: Date = new Date()
): BudgetCycleWindow {
  const resetDay = clampBudgetResetDay(resetDayInput);
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayDate = now.getDate();

  let start: Date;
  let nextCycleStart: Date;
  let previousStart: Date;

  if (resetDay === 1) {
    start = new Date(year, month, 1, 0, 0, 0, 0);
    nextCycleStart = new Date(year, month + 1, 1, 0, 0, 0, 0);
    previousStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
  } else if (todayDate >= resetDay) {
    start = new Date(year, month, resetDay, 0, 0, 0, 0);
    nextCycleStart = new Date(year, month + 1, resetDay, 0, 0, 0, 0);
    previousStart = new Date(year, month - 1, resetDay, 0, 0, 0, 0);
  } else {
    start = new Date(year, month - 1, resetDay, 0, 0, 0, 0);
    nextCycleStart = new Date(year, month, resetDay, 0, 0, 0, 0);
    previousStart = new Date(year, month - 2, resetDay, 0, 0, 0, 0);
  }

  const end = new Date(nextCycleStart.getTime() - 1);
  const previousEnd = new Date(start.getTime() - 1);

  const dayMs = 1000 * 60 * 60 * 24;
  const startDayMidnight = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  ).getTime();
  const nextStartMidnight = new Date(
    nextCycleStart.getFullYear(),
    nextCycleStart.getMonth(),
    nextCycleStart.getDate()
  ).getTime();
  const todayMidnight = new Date(year, month, todayDate).getTime();

  const daysTotal = Math.max(1, Math.round((nextStartMidnight - startDayMidnight) / dayMs));
  const daysElapsed = Math.min(
    daysTotal,
    Math.max(1, Math.round((todayMidnight - startDayMidnight) / dayMs) + 1)
  );
  const daysRemaining = Math.max(1, Math.round((nextStartMidnight - todayMidnight) / dayMs));

  return {
    resetDay,
    start,
    end,
    previousStart,
    previousEnd,
    label: `${formatShortDate(start)} – ${formatShortDate(end)}`,
    previousLabel: `${formatShortDate(previousStart)} – ${formatShortDate(previousEnd)}`,
    daysTotal,
    daysElapsed,
    daysRemaining,
  };
}

export function computeBudgetCycleSummary(params: {
  transactions: Transaction[];
  totalBudget: number;
  resetDay?: number;
  rolloverEnabled?: boolean;
  now?: Date;
}): BudgetCycleSummary {
  const now = params.now ?? new Date();
  const window = getActiveBudgetCycleWindow(params.resetDay ?? 1, now);
  const baseBudget = roundCurrency(Math.max(0, params.totalBudget || 0));
  const rolloverEnabled = Boolean(params.rolloverEnabled);

  const startMs = window.start.getTime();
  const endMs = window.end.getTime();
  const prevStartMs = window.previousStart.getTime();
  const prevEndMs = window.previousEnd.getTime();

  let currentSpent = 0;
  let previousCycleSpent = 0;
  let hasPreviousHistory = false;

  for (const tx of params.transactions) {
    if (tx.status === 'cancelled') continue;
    const effective = getEffectiveTransactionAmount(tx);
    if (effective <= 0) continue;
    const ms = new Date(tx.timestamp).getTime();
    if (Number.isNaN(ms)) continue;

    if (ms >= startMs && ms <= endMs) {
      currentSpent += effective;
    } else if (ms >= prevStartMs && ms <= prevEndMs) {
      previousCycleSpent += effective;
      hasPreviousHistory = true;
    } else if (ms < startMs) {
      hasPreviousHistory = true;
    }
  }

  currentSpent = roundCurrency(currentSpent);
  previousCycleSpent = roundCurrency(previousCycleSpent);

  const rolloverDelta =
    rolloverEnabled && hasPreviousHistory
      ? roundCurrency(baseBudget - previousCycleSpent)
      : 0;

  const effectiveBudget = Math.max(0, roundCurrency(baseBudget + rolloverDelta));
  const remainingBudget = roundCurrency(effectiveBudget - currentSpent);
  const utilizationPct =
    effectiveBudget > 0 ? Math.min(999, Math.round((currentSpent / effectiveBudget) * 100)) : 0;

  return {
    window,
    baseBudget,
    rolloverEnabled,
    rolloverDelta,
    hasPreviousHistory,
    previousCycleSpent,
    effectiveBudget,
    currentSpent,
    remainingBudget,
    utilizationPct,
  };
}

export interface CycleProgressMetrics {
  spent: number;
  budget: number;
  remaining: number;
  utilizationPct: number;
  barWidthPct: number;
  availablePct: number;
  cycleElapsedPct: number;
  tone: 'success' | 'warning' | 'danger';
  isExceeded: boolean;
}

export function computeCycleProgressMetrics(
  summary: BudgetCycleSummary
): CycleProgressMetrics {
  const spent = Math.max(0, summary.currentSpent);
  const budget = Math.max(0, summary.effectiveBudget);
  const remaining = summary.remainingBudget;
  const rawPct =
    budget > 0 ? (spent / budget) * 100 : spent > 0 ? 100 : 0;
  const utilizationPct =
    budget > 0 ? summary.utilizationPct : spent > 0 ? 100 : 0;
  const barWidthPct = Math.max(0, Math.min(100, rawPct));
  const availablePct = Math.max(0, Math.round((100 - utilizationPct) * 10) / 10);
  const daysTotal = Math.max(1, summary.window.daysTotal);
  const daysElapsed = Math.min(daysTotal, Math.max(1, summary.window.daysElapsed));
  const cycleElapsedPct = Math.min(
    100,
    Math.max(0, Math.round((daysElapsed / daysTotal) * 100))
  );
  const isExceeded = budget > 0 ? remaining < 0 : spent > 0;
  const tone: CycleProgressMetrics['tone'] = isExceeded
    ? 'danger'
    : utilizationPct >= 80
      ? 'warning'
      : 'success';

  return {
    spent,
    budget,
    remaining,
    utilizationPct,
    barWidthPct,
    availablePct,
    cycleElapsedPct,
    tone,
    isExceeded,
  };
}

