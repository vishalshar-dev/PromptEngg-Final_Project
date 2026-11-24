import { formatCurrency, formatCurrencyExact } from '../../../utils/categoryStyles';
import type { CapsuleBudgetState } from './capsuleBudgetState';

export type AetherHudTone = 'success' | 'warning' | 'danger' | 'neutral';

export type AetherHudStateKey =
  | 'loading'
  | 'invalid'
  | 'unconfigured'
  | 'healthy'
  | 'caution'
  | 'critical'
  | 'depleted'
  | 'overspent';

export interface AetherHudModel {
  stateKey: AetherHudStateKey;
  tone: AetherHudTone;
  statusLabel: string;
  statusDescription: string;
  showFinancialNumbers: boolean;
  showSetupAction: boolean;
  showCycleMetadata: boolean;
  primaryLabel: string;
  primaryAmount: number;
  effectiveBudget: number;
  activeSpent: number;
  overspendAmount: number;
  rawRemainingAmount: number;
  remainingPct: number;
  consumedPct: number;
  cyclePeriodText: string;
  cyclePaceText: string;
  cycleBarPct: number;
  cycleElapsedPct: number;
  rolloverText: string | null;
  ariaAnnouncement: string;
}

export function formatHudCyclePeriod(
  startIso: string,
  endIso: string,
  fallbackLabel: string
): string {
  if (!startIso || !endIso) return fallbackLabel;
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return fallbackLabel;
  }

  const sameYear = start.getFullYear() === end.getFullYear();
  const fmt = (d: Date, includeYear: boolean) =>
    d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      ...(includeYear ? { year: 'numeric' } : {}),
    });

  if (!sameYear) {
    return `${fmt(start, true)} – ${fmt(end, true)}`;
  }
  return fallbackLabel || `${fmt(start, false)} – ${fmt(end, false)}`;
}

export function deriveAetherHudModel(
  budgetState: CapsuleBudgetState,
  options: { isLoading?: boolean; isHydrated?: boolean } = {}
): AetherHudModel {
  const isHydrated = options.isHydrated ?? true;
  const isLoading = Boolean(options.isLoading) || !isHydrated;

  if (isLoading) {
    return {
      stateKey: 'loading',
      tone: 'neutral',
      statusLabel: 'Syncing ledger',
      statusDescription: 'Loading current budget cycle and transaction records.',
      showFinancialNumbers: false,
      showSetupAction: false,
      showCycleMetadata: false,
      primaryLabel: 'Available balance',
      primaryAmount: 0,
      effectiveBudget: 0,
      activeSpent: 0,
      overspendAmount: 0,
      rawRemainingAmount: 0,
      remainingPct: 0,
      consumedPct: 0,
      cyclePeriodText: '',
      cyclePaceText: '',
      cycleBarPct: 0,
      cycleElapsedPct: 0,
      rolloverText: null,
      ariaAnnouncement: 'Budget intelligence is loading.',
    };
  }

  if (budgetState.status === 'invalid') {
    return {
      stateKey: 'invalid',
      tone: 'neutral',
      statusLabel: 'Data unavailable',
      statusDescription:
        'Stored budget or transaction values could not be validated. Update your budget target to restore tracking.',
      showFinancialNumbers: false,
      showSetupAction: true,
      showCycleMetadata: false,
      primaryLabel: 'Available balance',
      primaryAmount: 0,
      effectiveBudget: 0,
      activeSpent: 0,
      overspendAmount: 0,
      rawRemainingAmount: 0,
      remainingPct: 0,
      consumedPct: 0,
      cyclePeriodText: '',
      cyclePaceText: '',
      cycleBarPct: 0,
      cycleElapsedPct: 0,
      rolloverText: null,
      ariaAnnouncement: 'Budget intelligence unavailable due to invalid financial data.',
    };
  }

  if (budgetState.status === 'unconfigured') {
    return {
      stateKey: 'unconfigured',
      tone: 'neutral',
      statusLabel: 'Budget not set',
      statusDescription:
        'Set a monthly budget target to activate the Aether reserve and cycle spending telemetry.',
      showFinancialNumbers: false,
      showSetupAction: true,
      showCycleMetadata: false,
      primaryLabel: 'Monthly budget',
      primaryAmount: 0,
      effectiveBudget: 0,
      activeSpent: 0,
      overspendAmount: 0,
      rawRemainingAmount: 0,
      remainingPct: 0,
      consumedPct: 0,
      cyclePeriodText: '',
      cyclePaceText: '',
      cycleBarPct: 0,
      cycleElapsedPct: 0,
      rolloverText: null,
      ariaAnnouncement: 'No monthly budget configured.',
    };
  }

  const cyclePeriodText = formatHudCyclePeriod(
    budgetState.cycleStartIso,
    budgetState.cycleEndIso,
    budgetState.cycleLabel
  );
  const cyclePaceText =
    budgetState.daysTotal > 0
      ? `Day ${budgetState.daysElapsed} of ${budgetState.daysTotal} · ${budgetState.daysRemaining}d left`
      : '';
  const rolloverText =
    budgetState.rolloverDelta !== 0
      ? `${budgetState.rolloverDelta > 0 ? '+' : '-'}₹${formatCurrency(Math.abs(budgetState.rolloverDelta))} rollover`
      : null;

  const rawConsumedPct =
    budgetState.effectiveBudget > 0
      ? (budgetState.activeSpent / budgetState.effectiveBudget) * 100
      : budgetState.activeSpent > 0
        ? 100
        : 0;
  const cycleBarPct = Math.max(0, Math.min(100, rawConsumedPct));
  const consumedPct = budgetState.utilizationPct;

  if (budgetState.status === 'exceeded') {
    const overStr = formatCurrencyExact(budgetState.overspendAmount);
    return {
      stateKey: 'overspent',
      tone: 'danger',
      statusLabel: 'Over budget',
      statusDescription: `Spending has exceeded this cycle's budget by ₹${overStr}.`,
      showFinancialNumbers: true,
      showSetupAction: false,
      showCycleMetadata: true,
      primaryLabel: 'Available balance',
      primaryAmount: 0,
      effectiveBudget: budgetState.effectiveBudget,
      activeSpent: budgetState.activeSpent,
      overspendAmount: budgetState.overspendAmount,
      rawRemainingAmount: budgetState.rawRemainingAmount,
      remainingPct: 0,
      consumedPct,
      cyclePeriodText,
      cyclePaceText,
      cycleBarPct: 100,
      cycleElapsedPct: budgetState.cycleElapsedPct,
      rolloverText,
      ariaAnnouncement: `Over budget by ₹${overStr}. ₹0 available of ₹${formatCurrency(budgetState.effectiveBudget)} budget.`,
    };
  }

  if (budgetState.status === 'exhausted') {
    return {
      stateKey: 'depleted',
      tone: 'danger',
      statusLabel: 'Budget exhausted',
      statusDescription:
        'Your available cycle reserve has reached ₹0 with no overspending.',
      showFinancialNumbers: true,
      showSetupAction: false,
      showCycleMetadata: true,
      primaryLabel: 'Available balance',
      primaryAmount: 0,
      effectiveBudget: budgetState.effectiveBudget,
      activeSpent: budgetState.activeSpent,
      overspendAmount: 0,
      rawRemainingAmount: 0,
      remainingPct: 0,
      consumedPct: 100,
      cyclePeriodText,
      cyclePaceText,
      cycleBarPct: 100,
      cycleElapsedPct: budgetState.cycleElapsedPct,
      rolloverText,
      ariaAnnouncement: `Budget exhausted. ₹0 remaining of ₹${formatCurrency(budgetState.effectiveBudget)}.`,
    };
  }

  const remainingPctRounded = Math.round(budgetState.remainingPct);
  const availStr = formatCurrencyExact(budgetState.clampedRemainingAmount);
  const budgetStr = formatCurrency(budgetState.effectiveBudget);

  if (budgetState.healthState === 'critical') {
    return {
      stateKey: 'critical',
      tone: 'danger',
      statusLabel: 'Low balance',
      statusDescription: `Only ${remainingPctRounded}% of your cycle reserve remains.`,
      showFinancialNumbers: true,
      showSetupAction: false,
      showCycleMetadata: true,
      primaryLabel: 'Available balance',
      primaryAmount: budgetState.clampedRemainingAmount,
      effectiveBudget: budgetState.effectiveBudget,
      activeSpent: budgetState.activeSpent,
      overspendAmount: 0,
      rawRemainingAmount: budgetState.rawRemainingAmount,
      remainingPct: budgetState.remainingPct,
      consumedPct,
      cyclePeriodText,
      cyclePaceText,
      cycleBarPct,
      cycleElapsedPct: budgetState.cycleElapsedPct,
      rolloverText,
      ariaAnnouncement: `Low balance: ₹${availStr} remaining of ₹${budgetStr} (${remainingPctRounded}% remaining).`,
    };
  }

  if (budgetState.healthState === 'caution') {
    return {
      stateKey: 'caution',
      tone: 'warning',
      statusLabel: 'Moderate usage',
      statusDescription: 'More than half of your cycle budget has been used.',
      showFinancialNumbers: true,
      showSetupAction: false,
      showCycleMetadata: true,
      primaryLabel: 'Available balance',
      primaryAmount: budgetState.clampedRemainingAmount,
      effectiveBudget: budgetState.effectiveBudget,
      activeSpent: budgetState.activeSpent,
      overspendAmount: 0,
      rawRemainingAmount: budgetState.rawRemainingAmount,
      remainingPct: budgetState.remainingPct,
      consumedPct,
      cyclePeriodText,
      cyclePaceText,
      cycleBarPct,
      cycleElapsedPct: budgetState.cycleElapsedPct,
      rolloverText,
      ariaAnnouncement: `Moderate budget usage: ₹${availStr} remaining of ₹${budgetStr} (${remainingPctRounded}% remaining).`,
    };
  }

  return {
    stateKey: 'healthy',
    tone: 'success',
    statusLabel: 'Comfortable range',
    statusDescription: 'Spending is well within your budget reserve for this cycle.',
    showFinancialNumbers: true,
    showSetupAction: false,
    showCycleMetadata: true,
    primaryLabel: 'Available balance',
    primaryAmount: budgetState.clampedRemainingAmount,
    effectiveBudget: budgetState.effectiveBudget,
    activeSpent: budgetState.activeSpent,
    overspendAmount: 0,
    rawRemainingAmount: budgetState.rawRemainingAmount,
    remainingPct: budgetState.remainingPct,
    consumedPct,
    cyclePeriodText,
    cyclePaceText,
    cycleBarPct,
    cycleElapsedPct: budgetState.cycleElapsedPct,
    rolloverText,
    ariaAnnouncement: `Comfortable range: ₹${availStr} remaining of ₹${budgetStr} (${remainingPctRounded}% remaining).`,
  };
}
