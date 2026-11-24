import type {
  CategoryCaps,
  CategorySpendingLimit,
  Transaction,
} from '../../../types/models';
import { getActiveBudgetCycleWindow } from '../../../utils/budgetCycle';
import { formatCurrency, formatCurrencyExact } from '../../../utils/categoryStyles';
import {
  getEffectiveTransactionAmount,
  toLocalDateKey,
} from '../../../utils/martEngine';
import { roundCurrency } from '../../../utils/splitLedgerEngine';
import { evaluateCategoryLimits } from '../../../utils/warRoomEngine';
import {
  sanitizeTransactionForCapsule,
  type CapsuleBudgetState,
} from './capsuleBudgetState';

export type AetherIntelligenceTone = 'success' | 'warning' | 'danger' | 'neutral';

export type SpendingPaceStatus =
  | 'no_spend'
  | 'early'
  | 'ahead'
  | 'below'
  | 'aligned'
  | 'final_day'
  | 'exhausted'
  | 'exceeded';

export interface AetherSpendingPace {
  status: SpendingPaceStatus;
  tone: AetherIntelligenceTone;
  summary: string;
  metricText: string;
  explanation: string;
  elapsedRatio: number;
  spendingRatio: number;
  paceDiffPct: number;
  dailyBudgetAllowance: number;
  actualDailyAverage: number;
  safeDailyRemaining: number;
  remainingFutureDays: number;
}

export interface AetherProjectedBalance {
  outcome: 'remaining' | 'even' | 'overspend';
  tone: AetherIntelligenceTone;
  label: string;
  valueText: string;
  projectedCycleSpend: number;
  projectedEndBalance: number;
  dailyAverage: number;
  remainingFutureDays: number;
  assumption: string;
}

export type CategoryAttentionKind =
  | 'limit_exceeded'
  | 'limit_approaching'
  | 'historical_increase'
  | 'concentration';

export interface AetherCategoryAttention {
  kind: CategoryAttentionKind;
  tone: AetherIntelligenceTone;
  category: string;
  summary: string;
  metricText: string;
  explanation: string;
  currentSpent: number;
}

export interface AetherOmittedReasons {
  pace: string | null;
  projection: string | null;
  categoryAttention: string | null;
}

export interface AetherContextualIntelligence {
  isAvailable: boolean;
  contextualStatus: string;
  contextualTone: AetherIntelligenceTone;
  pace: AetherSpendingPace | null;
  projection: AetherProjectedBalance | null;
  categoryAttention: AetherCategoryAttention | null;
  omittedReasons: AetherOmittedReasons;
  hasAnyDetails: boolean;
}

export interface AetherIntelligenceInput {
  budgetState: CapsuleBudgetState;
  transactions: Transaction[];
  categoryLimits?: CategorySpendingLimit[];
  categoryCaps?: CategoryCaps;
  now?: Date;
}

interface CycleCategoryBucket {
  category: string;
  spent: number;
  count: number;
}

function buildEffectiveLimits(
  categoryLimits: CategorySpendingLimit[] | undefined,
  categoryCaps: CategoryCaps | undefined
): CategorySpendingLimit[] {
  const activeLimits = (categoryLimits ?? []).filter(
    (l) => l && l.enabled && typeof l.limitAmount === 'number' && Number.isFinite(l.limitAmount) && l.limitAmount > 0
  );

  const coveredMonthlyCats = new Set(
    activeLimits
      .filter((l) => l.period === 'monthly')
      .map((l) => l.category.trim().toLowerCase())
  );

  const capLimits: CategorySpendingLimit[] = [];
  if (categoryCaps && typeof categoryCaps === 'object') {
    for (const [category, rawAmount] of Object.entries(categoryCaps)) {
      if (typeof rawAmount !== 'number' || !Number.isFinite(rawAmount) || rawAmount <= 0) {
        continue;
      }
      const key = category.trim().toLowerCase();
      if (!key || coveredMonthlyCats.has(key)) continue;
      coveredMonthlyCats.add(key);
      capLimits.push({
        id: `cap-${key}`,
        category,
        period: 'monthly',
        limitAmount: rawAmount,
        warningThresholdPct: 80,
        enabled: true,
        createdAt: '',
      });
    }
  }

  return [...activeLimits, ...capLimits];
}

function deriveContextualStatus(
  budgetState: CapsuleBudgetState,
  pace: AetherSpendingPace | null
): { message: string; tone: AetherIntelligenceTone } {
  if (budgetState.status === 'invalid') {
    return {
      message: 'Stored budget or transaction figures could not be validated.',
      tone: 'neutral',
    };
  }

  if (budgetState.status === 'unconfigured') {
    return {
      message: 'Set a budget to start tracking your available balance.',
      tone: 'neutral',
    };
  }

  if (budgetState.status === 'exceeded') {
    return {
      message: `You've exceeded your planned budget by ₹${formatCurrencyExact(budgetState.overspendAmount)}.`,
      tone: 'danger',
    };
  }

  if (budgetState.status === 'exhausted') {
    return {
      message:
        pace && pace.remainingFutureDays > 0
          ? `Your cycle reserve is fully used with ${pace.remainingFutureDays} day${pace.remainingFutureDays === 1 ? '' : 's'} remaining.`
          : 'Your planned cycle budget is completely used.',
      tone: 'danger',
    };
  }

  if (budgetState.activeSpent === 0 || budgetState.activeTransactionCount === 0) {
    return {
      message: 'No spending recorded yet this cycle — your full reserve is untouched.',
      tone: 'success',
    };
  }

  const remainingPctRounded = Math.round(budgetState.remainingPct);
  const consumedPct = Math.round(
    budgetState.effectiveBudget > 0
      ? (budgetState.activeSpent / budgetState.effectiveBudget) * 100
      : 0
  );
  const daysLeft = pace ? pace.remainingFutureDays : Math.max(0, budgetState.daysTotal - budgetState.daysElapsed);

  if (budgetState.healthState === 'critical') {
    return {
      message:
        daysLeft > 0
          ? `Your available balance is getting low (${remainingPctRounded}% left for ${daysLeft} remaining day${daysLeft === 1 ? '' : 's'}).`
          : `Your available balance is getting low on the final day of the cycle.`,
      tone: 'danger',
    };
  }

  if (budgetState.healthState === 'caution') {
    if (pace?.status === 'ahead') {
      return {
        message: "You've used a significant portion of your allowance ahead of schedule.",
        tone: 'warning',
      };
    }
    if (pace?.status === 'below') {
      return {
        message: 'More than half your budget is used, while spending stays below cycle pace.',
        tone: 'neutral',
      };
    }
    if (daysLeft <= 4) {
      return {
        message: `You've used ${consumedPct}% of your budget, with the cycle ending soon.`,
        tone: 'warning',
      };
    }
    return {
      message: "You've used more than half of your cycle allowance, broadly on pace.",
      tone: 'neutral',
    };
  }

  // healthState === 'healthy' (> 50% remaining): guard against misleading reassurance early in cycle
  if (pace?.status === 'ahead') {
    return {
      message: `You've already used ${consumedPct}% of your budget early in the cycle.`,
      tone: 'warning',
    };
  }

  if (pace?.status === 'early') {
    return {
      message: "Early in the cycle — you're well within your available reserve.",
      tone: 'success',
    };
  }

  return {
    message: "You're comfortably within your budget for this point in the cycle.",
    tone: 'success',
  };
}

export function deriveAetherIntelligence(
  input: AetherIntelligenceInput
): AetherContextualIntelligence {
  const { budgetState, transactions, categoryLimits, categoryCaps } = input;
  const now = input.now ?? new Date();

  if (budgetState.status === 'invalid') {
    const status = deriveContextualStatus(budgetState, null);
    return {
      isAvailable: false,
      contextualStatus: status.message,
      contextualTone: status.tone,
      pace: null,
      projection: null,
      categoryAttention: null,
      omittedReasons: {
        pace: 'Unavailable because budget or transaction data is invalid.',
        projection: 'Unavailable because budget or transaction data is invalid.',
        categoryAttention: 'Unavailable because budget or transaction data is invalid.',
      },
      hasAnyDetails: false,
    };
  }

  if (budgetState.status === 'unconfigured') {
    const status = deriveContextualStatus(budgetState, null);
    return {
      isAvailable: false,
      contextualStatus: status.message,
      contextualTone: status.tone,
      pace: null,
      projection: null,
      categoryAttention: null,
      omittedReasons: {
        pace: 'No monthly budget configured.',
        projection: 'No monthly budget configured.',
        categoryAttention: 'No monthly budget configured.',
      },
      hasAnyDetails: false,
    };
  }

  const window = getActiveBudgetCycleWindow(budgetState.cycleResetDay, now);
  const startMs = budgetState.cycleStartIso
    ? new Date(budgetState.cycleStartIso).getTime()
    : window.start.getTime();
  const endMs = budgetState.cycleEndIso
    ? new Date(budgetState.cycleEndIso).getTime()
    : window.end.getTime();
  const prevStartMs = window.previousStart.getTime();
  const prevEndMs = window.previousEnd.getTime();

  const sanitized: Transaction[] = [];
  if (Array.isArray(transactions)) {
    for (const raw of transactions) {
      const clean = sanitizeTransactionForCapsule(raw);
      if (clean) sanitized.push(clean);
    }
  }

  const inCycleTxs: Array<{ tx: Transaction; amount: number; dateKey: string }> = [];
  const currCategoryMap = new Map<string, CycleCategoryBucket>();
  const prevCategoryMap = new Map<string, CycleCategoryBucket>();

  for (const tx of sanitized) {
    if (tx.status === 'cancelled') continue;
    const amount = getEffectiveTransactionAmount(tx);
    if (amount <= 0) continue;
    const ms = new Date(tx.timestamp).getTime();
    if (Number.isNaN(ms)) continue;

    const categoryName = tx.category.trim() || 'Other';
    const catKey = categoryName.toLowerCase();

    if (ms >= startMs && ms <= endMs) {
      const dateKey = toLocalDateKey(new Date(ms));
      inCycleTxs.push({ tx, amount, dateKey });

      const existing = currCategoryMap.get(catKey);
      if (existing) {
        existing.spent = roundCurrency(existing.spent + amount);
        existing.count += 1;
      } else {
        currCategoryMap.set(catKey, {
          category: categoryName,
          spent: roundCurrency(amount),
          count: 1,
        });
      }
    } else if (ms >= prevStartMs && ms <= prevEndMs) {
      const existing = prevCategoryMap.get(catKey);
      if (existing) {
        existing.spent = roundCurrency(existing.spent + amount);
        existing.count += 1;
      } else {
        prevCategoryMap.set(catKey, {
          category: categoryName,
          spent: roundCurrency(amount),
          count: 1,
        });
      }
    }
  }

  // 1. SPENDING PACE INTELLIGENCE
  const daysTotal = Math.max(1, budgetState.daysTotal);
  const daysElapsed = Math.min(daysTotal, Math.max(1, budgetState.daysElapsed));
  const remainingFutureDays = Math.max(0, daysTotal - daysElapsed);
  const elapsedRatio = daysElapsed / daysTotal;
  const effectiveBudget = Math.max(0, budgetState.effectiveBudget);
  const activeSpent = Math.max(0, budgetState.activeSpent);
  const spendingRatio =
    effectiveBudget > 0 ? activeSpent / effectiveBudget : activeSpent > 0 ? 1 : 0;
  const paceDiffPct = Math.round((spendingRatio - elapsedRatio) * 100);
  const dailyBudgetAllowance = roundCurrency(effectiveBudget / daysTotal);
  const actualDailyAverage = roundCurrency(activeSpent / daysElapsed);
  const safeDailyRemaining =
    remainingFutureDays > 0
      ? roundCurrency(budgetState.clampedRemainingAmount / remainingFutureDays)
      : budgetState.clampedRemainingAmount;
  const consumedPctRounded =
    effectiveBudget > 0 ? Math.round((activeSpent / effectiveBudget) * 100) : activeSpent > 0 ? 100 : 0;
  const elapsedPctRounded = Math.round(elapsedRatio * 100);

  let pace: AetherSpendingPace | null = null;
  let omittedPace: string | null = null;

  if (effectiveBudget <= 0 && activeSpent === 0) {
    omittedPace = 'Effective budget for this cycle is ₹0 with no spending recorded.';
  } else if (activeSpent === 0 || inCycleTxs.length === 0) {
    pace = {
      status: 'no_spend',
      tone: 'neutral',
      summary: 'No active spending recorded yet this cycle',
      metricText: `Day ${daysElapsed} of ${daysTotal}`,
      explanation: `0% of your ₹${formatCurrency(effectiveBudget)} target used across ${elapsedPctRounded}% of the cycle (Day ${daysElapsed} of ${daysTotal}).`,
      elapsedRatio,
      spendingRatio: 0,
      paceDiffPct: -elapsedPctRounded,
      dailyBudgetAllowance,
      actualDailyAverage: 0,
      safeDailyRemaining,
      remainingFutureDays,
    };
  } else if (budgetState.status === 'exceeded') {
    pace = {
      status: 'exceeded',
      tone: 'danger',
      summary: 'Cycle spending has exceeded your budget',
      metricText: `${consumedPctRounded}% used`,
      explanation: `${consumedPctRounded}% of your effective budget spent by Day ${daysElapsed} of ${daysTotal} (${elapsedPctRounded}% elapsed · avg ₹${formatCurrency(actualDailyAverage)}/day vs ₹${formatCurrency(dailyBudgetAllowance)}/day plan).`,
      elapsedRatio,
      spendingRatio,
      paceDiffPct,
      dailyBudgetAllowance,
      actualDailyAverage,
      safeDailyRemaining: 0,
      remainingFutureDays,
    };
  } else if (budgetState.status === 'exhausted') {
    pace = {
      status: 'exhausted',
      tone: 'danger',
      summary:
        remainingFutureDays > 0
          ? 'Cycle budget exhausted before reset'
          : 'Cycle budget fully used on the final day',
      metricText: '100% used',
      explanation: `100% of your ₹${formatCurrency(effectiveBudget)} budget has been spent on Day ${daysElapsed} of ${daysTotal}.`,
      elapsedRatio,
      spendingRatio: 1,
      paceDiffPct,
      dailyBudgetAllowance,
      actualDailyAverage,
      safeDailyRemaining: 0,
      remainingFutureDays,
    };
  } else if (daysElapsed === 1 && daysTotal > 1) {
    const heavyDay1 = spendingRatio >= 0.4;
    pace = {
      status: heavyDay1 ? 'ahead' : 'early',
      tone: heavyDay1 ? 'warning' : 'neutral',
      summary: heavyDay1
        ? `Heavy opening-day spend (${consumedPctRounded}% used)`
        : 'Early in cycle — pace builds over several days',
      metricText: `Day 1 of ${daysTotal}`,
      explanation: `₹${formatCurrencyExact(activeSpent)} recorded on Day 1 (${consumedPctRounded}% of ₹${formatCurrency(effectiveBudget)}). Calendar pace is measured more reliably after several active days.`,
      elapsedRatio,
      spendingRatio,
      paceDiffPct,
      dailyBudgetAllowance,
      actualDailyAverage,
      safeDailyRemaining,
      remainingFutureDays,
    };
  } else if (daysElapsed === daysTotal) {
    const endTone: AetherIntelligenceTone =
      paceDiffPct <= -10 ? 'success' : 'neutral';
    pace = {
      status: 'final_day',
      tone: endTone,
      summary:
        remainingFutureDays === 0 && budgetState.clampedRemainingAmount > 0
          ? 'Final day of cycle within budget'
          : 'Final day of cycle',
      metricText: `${consumedPctRounded}% used`,
      explanation: `${consumedPctRounded}% of your ₹${formatCurrency(effectiveBudget)} budget used on the final day of the cycle (${window.label}).`,
      elapsedRatio: 1,
      spendingRatio,
      paceDiffPct,
      dailyBudgetAllowance,
      actualDailyAverage,
      safeDailyRemaining,
      remainingFutureDays: 0,
    };
  } else if (paceDiffPct >= 10) {
    pace = {
      status: 'ahead',
      tone: paceDiffPct >= 25 ? 'danger' : 'warning',
      summary: 'Spending is running ahead of the cycle',
      metricText: `${paceDiffPct}% ahead`,
      explanation: `${consumedPctRounded}% of budget used across ${elapsedPctRounded}% of the cycle (avg ₹${formatCurrency(actualDailyAverage)}/day vs ₹${formatCurrency(dailyBudgetAllowance)}/day plan; ₹${formatCurrency(safeDailyRemaining)}/day remaining room).`,
      elapsedRatio,
      spendingRatio,
      paceDiffPct,
      dailyBudgetAllowance,
      actualDailyAverage,
      safeDailyRemaining,
      remainingFutureDays,
    };
  } else if (paceDiffPct <= -10) {
    pace = {
      status: 'below',
      tone: 'success',
      summary: 'Spending is below the expected pace',
      metricText: `${Math.abs(paceDiffPct)}% below`,
      explanation: `${consumedPctRounded}% of budget used across ${elapsedPctRounded}% of the cycle (avg ₹${formatCurrency(actualDailyAverage)}/day vs ₹${formatCurrency(dailyBudgetAllowance)}/day plan).`,
      elapsedRatio,
      spendingRatio,
      paceDiffPct,
      dailyBudgetAllowance,
      actualDailyAverage,
      safeDailyRemaining,
      remainingFutureDays,
    };
  } else {
    pace = {
      status: 'aligned',
      tone: 'neutral',
      summary: 'Spending is broadly aligned with the cycle',
      metricText: 'On pace',
      explanation: `${consumedPctRounded}% of budget used across ${elapsedPctRounded}% of the cycle (avg ₹${formatCurrency(actualDailyAverage)}/day vs ₹${formatCurrency(dailyBudgetAllowance)}/day plan).`,
      elapsedRatio,
      spendingRatio,
      paceDiffPct,
      dailyBudgetAllowance,
      actualDailyAverage,
      safeDailyRemaining,
      remainingFutureDays,
    };
  }

  // 2. PROJECTED END-OF-CYCLE BALANCE (Strict Reliability Gate)
  let projection: AetherProjectedBalance | null = null;
  let omittedProjection: string | null = null;

  const distinctSpendDays = new Set(inCycleTxs.map((entry) => entry.dateKey)).size;
  const cycleStartDateKey = toLocalDateKey(new Date(startMs));
  let largestTxAmount = 0;
  let day1Spent = 0;
  for (const entry of inCycleTxs) {
    if (entry.amount > largestTxAmount) largestTxAmount = entry.amount;
    if (entry.dateKey === cycleStartDateKey) day1Spent += entry.amount;
  }
  const largestTxShare = activeSpent > 0 ? largestTxAmount / activeSpent : 0;
  const day1Share = activeSpent > 0 ? day1Spent / activeSpent : 0;

  if (budgetState.status !== 'active' || effectiveBudget <= 0) {
    omittedProjection =
      budgetState.status === 'exceeded'
        ? 'Cycle budget is already exceeded.'
        : 'Cycle reserve is exhausted.';
  } else if (remainingFutureDays < 1) {
    omittedProjection = 'Today is the final day of the cycle.';
  } else if (daysElapsed < 4) {
    omittedProjection =
      'Omitted on Days 1–3 because early spending extrapolates unreliably.';
  } else if (activeSpent <= 0 || inCycleTxs.length < 3 || distinctSpendDays < 2) {
    omittedProjection =
      'Insufficient active spending days in this cycle to estimate a steady rate.';
  } else if (largestTxShare > 0.55) {
    omittedProjection =
      'Omitted because one large purchase dominates current spending and would skew a linear forecast.';
  } else if (day1Share >= 0.65 && daysElapsed < 10) {
    omittedProjection =
      'Omitted because opening-day purchases make up most of current spending.';
  } else {
    const rawDailyAvg = activeSpent / daysElapsed;
    const projectedCycleSpend = roundCurrency(
      activeSpent + rawDailyAvg * remainingFutureDays
    );
    const projectedEndBalance = roundCurrency(effectiveBudget - projectedCycleSpend);
    const dailyAverageRounded = roundCurrency(rawDailyAvg);

    const outcome: AetherProjectedBalance['outcome'] =
      projectedEndBalance > 0
        ? 'remaining'
        : projectedEndBalance < 0
          ? 'overspend'
          : 'even';

    const tone: AetherIntelligenceTone =
      outcome === 'overspend'
        ? 'danger'
        : projectedEndBalance < effectiveBudget * 0.1
          ? 'warning'
          : 'success';

    const valueText =
      outcome === 'remaining'
        ? `~₹${formatCurrency(projectedEndBalance)} remaining`
        : outcome === 'overspend'
          ? `~₹${formatCurrency(Math.abs(projectedEndBalance))} over`
          : '~₹0 break-even';

    projection = {
      outcome,
      tone,
      label:
        outcome === 'overspend'
          ? 'Estimated cycle-end overspend'
          : 'Estimated cycle-end balance',
      valueText,
      projectedCycleSpend,
      projectedEndBalance,
      dailyAverage: dailyAverageRounded,
      remainingFutureDays,
      assumption: `Estimate based on your ₹${formatCurrency(dailyAverageRounded)}/day average over Days 1–${daysElapsed}, assuming a similar daily rate across the remaining ${remainingFutureDays} day${remainingFutureDays === 1 ? '' : 's'}. One-off bills will change this figure.`,
    };
  }

  // 3. CATEGORY ATTENTION (At Most 1 Meaningful Observation)
  let categoryAttention: AetherCategoryAttention | null = null;
  let omittedCategory: string | null = null;

  const effectiveLimits = buildEffectiveLimits(categoryLimits, categoryCaps);
  const evaluatedLimits =
    effectiveLimits.length > 0 && inCycleTxs.length > 0
      ? evaluateCategoryLimits(
          effectiveLimits,
          sanitized,
          now
        ).filter((item) => item.spent > 0)
      : [];

  const breachedLimits = evaluatedLimits
    .filter((item) => item.status === 'exceeded' || item.status === 'reached')
    .sort((a, b) => b.utilisationPct - a.utilisationPct);

  const approachingLimits = evaluatedLimits
    .filter((item) => item.status === 'approaching')
    .sort((a, b) => b.utilisationPct - a.utilisationPct);

  if (breachedLimits.length > 0) {
    const top = breachedLimits[0];
    const pctRounded = Math.round(top.utilisationPct);
    const capStr = formatCurrency(top.limit.limitAmount);
    const spentStr = formatCurrency(top.spent);
    categoryAttention = {
      kind: 'limit_exceeded',
      tone: 'danger',
      category: top.limit.category,
      summary:
        top.status === 'exceeded'
          ? `${top.limit.category} exceeded its ${top.limit.period} limit`
          : `${top.limit.category} reached its ${top.limit.period} limit`,
      metricText: `${pctRounded}% of ₹${capStr}`,
      explanation: `₹${spentStr} spent against your ₹${capStr} ${top.limit.period} limit (${top.periodLabel}).`,
      currentSpent: top.spent,
    };
  } else if (approachingLimits.length > 0) {
    const top = approachingLimits[0];
    const pctRounded = Math.round(top.utilisationPct);
    const capStr = formatCurrency(top.limit.limitAmount);
    const spentStr = formatCurrency(top.spent);
    categoryAttention = {
      kind: 'limit_approaching',
      tone: 'warning',
      category: top.limit.category,
      summary: `${top.limit.category} is nearing its ${top.limit.period} limit`,
      metricText: `${pctRounded}% of ₹${capStr}`,
      explanation: `₹${spentStr} spent against your ₹${capStr} ${top.limit.period} limit (${top.periodLabel}).`,
      currentSpent: top.spent,
    };
  } else if (daysElapsed >= 5 && prevCategoryMap.size > 0 && currCategoryMap.size > 0) {
    // Priority C: Compare current cycle categories against completed previous cycle categories
    let topHistoricalJump: {
      category: string;
      currSpent: number;
      prevSpent: number;
      increasePct: number;
    } | null = null;

    for (const [key, currBucket] of currCategoryMap.entries()) {
      const prevBucket = prevCategoryMap.get(key);
      if (!prevBucket || prevBucket.spent < 250) continue;
      const diff = currBucket.spent - prevBucket.spent;
      const increasePct = Math.round((diff / prevBucket.spent) * 100);
      if (diff >= 300 && increasePct >= 35) {
        if (!topHistoricalJump || increasePct > topHistoricalJump.increasePct) {
          topHistoricalJump = {
            category: currBucket.category,
            currSpent: currBucket.spent,
            prevSpent: prevBucket.spent,
            increasePct,
          };
        }
      }
    }

    if (topHistoricalJump) {
      categoryAttention = {
        kind: 'historical_increase',
        tone: 'warning',
        category: topHistoricalJump.category,
        summary: `${topHistoricalJump.category} is higher than your previous cycle`,
        metricText: `+${topHistoricalJump.increasePct}%`,
        explanation: `₹${formatCurrency(topHistoricalJump.currSpent)} spent this cycle vs ₹${formatCurrency(topHistoricalJump.prevSpent)} in ${window.previousLabel}.`,
        currentSpent: topHistoricalJump.currSpent,
      };
    }
  }

  if (!categoryAttention) {
    const sortedBuckets = [...currCategoryMap.values()].sort(
      (a, b) => b.spent - a.spent
    );
    const distinctCategories = sortedBuckets.length;

    if (
      activeSpent > 0 &&
      effectiveBudget > 0 &&
      inCycleTxs.length >= 3 &&
      distinctCategories >= 2 &&
      activeSpent >= Math.min(1000, effectiveBudget * 0.15)
    ) {
      // Prefer explicit named category unless 'Other' dominates strongly
      const candidate =
        sortedBuckets.find(
          (b) => b.category.toLowerCase() !== 'other' && b.count >= 2
        ) ?? sortedBuckets[0];

      const shareOfSpendPct = Math.round((candidate.spent / activeSpent) * 100);
      const shareOfBudgetPct = Math.round((candidate.spent / effectiveBudget) * 100);
      const isGenericOther = candidate.category.toLowerCase() === 'other';
      const meetsThreshold = isGenericOther
        ? shareOfSpendPct >= 45 && candidate.count >= 2
        : (shareOfSpendPct >= 38 && candidate.count >= 2) || shareOfBudgetPct >= 25;

      if (meetsThreshold) {
        categoryAttention = {
          kind: 'concentration',
          tone: shareOfBudgetPct >= 35 ? 'warning' : 'neutral',
          category: candidate.category,
          summary: `${candidate.category} accounts for ${shareOfSpendPct}% of this cycle's spending`,
          metricText: `₹${formatCurrency(candidate.spent)}`,
          explanation: `${candidate.count} transaction${candidate.count === 1 ? '' : 's'} totaling ₹${formatCurrencyExact(candidate.spent)} (${shareOfBudgetPct}% of your cycle budget).`,
          currentSpent: candidate.spent,
        };
      }
    }

    if (!categoryAttention) {
      omittedCategory =
        inCycleTxs.length === 0
          ? 'No category spending recorded this cycle.'
          : 'No category stands out against limits, prior cycles, or total spend share.';
    }
  }

  const contextual = deriveContextualStatus(budgetState, pace);

  return {
    isAvailable: true,
    contextualStatus: contextual.message,
    contextualTone: contextual.tone,
    pace,
    projection,
    categoryAttention,
    omittedReasons: {
      pace: omittedPace,
      projection: omittedProjection,
      categoryAttention: omittedCategory,
    },
    hasAnyDetails: Boolean(pace || projection || categoryAttention),
  };
}
