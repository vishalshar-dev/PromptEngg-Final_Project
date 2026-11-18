import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  BrokeModeConfig,
  CategorySpendingLimit,
  FinancialChallenge,
  FinancialTarget,
  Transaction,
} from '../types/models';
import {
  DEFAULT_BROKE_MODE_CONFIG,
  classifyTransaction,
  classifyTransactions,
  computeBehaviourAnalytics,
  computeBrokeModeStatus,
  computeDisciplineScore,
  computeJunkIntelligence,
  detectSpendingLeakages,
  evaluateCategoryLimits,
  evaluateChallenges,
  evaluateFinancialTargets,
  generateSmartAlerts,
  getPeriodBounds,
  getPreviousPeriodBounds,
} from './warRoomEngine';

const FIXED_NOW = new Date(2025, 4, 15, 14, 0, 0, 0); // Thu May 15, 2025 14:00 local

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: `tx-${Math.random().toString(36).slice(2, 8)}`,
    name: 'Test Item',
    amount: 100,
    category: 'Groceries',
    timestamp: new Date(2025, 4, 15, 11, 0, 0, 0).toISOString(),
    status: 'active',
    ...overrides,
  };
}

test('Classification predicts essential vs non-essential vs impulsive and preserves user overrides', () => {
  const milk = tx({ id: 't1', name: 'Mart: Milk', category: 'Groceries', amount: 60 });
  const chips = tx({ id: 't2', name: 'Mart: Chips', category: 'Junk', amount: 30 });
  const lateNightTreat = tx({
    id: 't3',
    name: 'Chocolate Brownie',
    category: 'Snacks & Beverages',
    amount: 180,
    timestamp: new Date(2025, 4, 15, 23, 30, 0, 0).toISOString(),
  });
  const userOverridden = tx({
    id: 't4',
    name: 'Mart: Chips',
    category: 'Junk',
    amount: 30,
    classification: 'essential',
    classificationSource: 'user',
  });

  const all = [milk, chips, lateNightTreat, userOverridden];

  const c1 = classifyTransaction(milk, all);
  assert.equal(c1.classification, 'essential');
  assert.equal(c1.classificationSource, 'predicted');

  const c2 = classifyTransaction(chips, all);
  assert.equal(c2.classification, 'non_essential');
  assert.equal(c2.classificationSource, 'predicted');

  const c3 = classifyTransaction(lateNightTreat, all);
  assert.equal(c3.classification, 'impulsive');
  assert.equal(c3.classificationSource, 'predicted');

  const c4 = classifyTransaction(userOverridden, all);
  assert.equal(c4.classification, 'essential');
  assert.equal(c4.classificationSource, 'user');
});

test('Cancelled and refunded transactions are accurately reflected in War Room metrics', () => {
  const transactions: Transaction[] = [
    tx({ id: 'a1', name: 'Chips', category: 'Junk', amount: 100, status: 'active' }),
    tx({ id: 'a2', name: 'Soda', category: 'Junk', amount: 500, status: 'cancelled' }),
    tx({ id: 'a3', name: 'Chocolate', category: 'Junk', amount: 200, status: 'refunded', refundAmount: 150 }),
  ];

  const classified = classifyTransactions(transactions);
  assert.equal(classified.length, 2); // cancelled excluded
  const totalJunk = classified.reduce((s, i) => s + i.effectiveAmount, 0);
  assert.equal(totalJunk, 150); // 100 + (200 - 150)
});

test('Broke Mode allowance, remaining, utilisation, essential vs non-essential, and warnings work cleanly', () => {
  const config: BrokeModeConfig = {
    ...DEFAULT_BROKE_MODE_CONFIG,
    enabled: true,
    period: 'monthly',
    monthlyAllowance: 4000,
    maxNonEssentialSpend: 2000,
    warningThresholdPct: 75,
    restrictedCategories: ['Junk'],
    activatedAt: new Date(2025, 4, 10, 9, 0, 0, 0).toISOString(),
    durationDays: 14,
  };

  const transactions: Transaction[] = [
    tx({ id: 'b1', name: 'Rice 5kg', category: 'Groceries', amount: 600 }),
    tx({ id: 'b2', name: 'Chips & Soda', category: 'Junk', amount: 1500 }),
  ];

  const status = computeBrokeModeStatus(transactions, config, FIXED_NOW);
  assert.equal(status.enabled, true);
  assert.equal(status.limit, 4000);
  assert.equal(status.spent, 2100);
  assert.equal(status.remaining, 1900);
  assert.equal(status.utilisationPct, 52.5);
  assert.equal(status.essentialSpent, 600);
  assert.equal(status.totalJunkSpent, 1500);
  assert.equal(status.nonEssentialLimit, 2000);
  assert.equal(status.nonEssentialRemaining, 500);
  assert.equal(status.nonEssentialUtilisationPct, 75);
  assert.equal(status.remainingDays, 17); // May 15..May 31 inclusive
  assert.equal(status.durationRemainingDays, 9); // 14 - 5 days elapsed
  assert.ok(status.warnings.some((w) => w.id === 'broke-nonessential-approaching'));
  assert.ok(status.warnings.some((w) => w.id === 'broke-restricted-Junk'));
});

test('Junk leakage detector strictly requires >= 2 occurrences and estimates monthly impact', () => {
  const oneOff: Transaction[] = [
    tx({
      id: 'l1',
      name: 'Iced Coffee',
      category: 'Dining',
      amount: 120,
      timestamp: new Date(2025, 4, 14, 10, 0, 0, 0).toISOString(),
    }),
  ];
  assert.equal(detectSpendingLeakages(oneOff, FIXED_NOW).length, 0);

  const repeated: Transaction[] = [
    tx({
      id: 'l1',
      name: 'Iced Coffee',
      category: 'Dining',
      amount: 120,
      timestamp: new Date(2025, 4, 14, 10, 0, 0, 0).toISOString(),
    }),
    tx({
      id: 'l2',
      name: 'Mart: Iced Coffee',
      category: 'Dining',
      amount: 130,
      timestamp: new Date(2025, 4, 10, 10, 0, 0, 0).toISOString(),
    }),
    tx({
      id: 'l3',
      name: 'Iced Coffee',
      category: 'Dining',
      amount: 120,
      timestamp: new Date(2025, 4, 5, 10, 0, 0, 0).toISOString(),
    }),
  ];
  const leaks = detectSpendingLeakages(repeated, FIXED_NOW);
  assert.equal(leaks.length, 1);
  assert.equal(leaks[0].occurrences, 3);
  assert.equal(leaks[0].totalSpent, 370);
  assert.ok(leaks[0].projected30DayCost > leaks[0].totalSpent);
});

test('Category limits reset properly across daily/weekly/monthly boundaries and trigger accurate statuses', () => {
  const limits: CategorySpendingLimit[] = [
    {
      id: 'lim-junk-daily',
      category: 'Junk',
      period: 'daily',
      limitAmount: 100,
      warningThresholdPct: 80,
      enabled: true,
      createdAt: FIXED_NOW.toISOString(),
    },
    {
      id: 'lim-groc-month',
      category: 'Groceries',
      period: 'monthly',
      limitAmount: 1000,
      warningThresholdPct: 80,
      enabled: true,
      createdAt: FIXED_NOW.toISOString(),
    },
  ];

  const yesterdayJunk = tx({
    id: 'yd1',
    name: 'Chips',
    category: 'Junk',
    amount: 500,
    timestamp: new Date(2025, 4, 14, 16, 0, 0, 0).toISOString(),
  });
  const todayJunk = tx({
    id: 'td1',
    name: 'Soda',
    category: 'Junk',
    amount: 85,
    timestamp: new Date(2025, 4, 15, 12, 0, 0, 0).toISOString(),
  });
  const monthGroc = tx({
    id: 'mg1',
    name: 'Groceries Pack',
    category: 'Groceries',
    amount: 1150,
    timestamp: new Date(2025, 4, 3, 12, 0, 0, 0).toISOString(),
  });

  const evaluated = evaluateCategoryLimits(limits, [yesterdayJunk, todayJunk, monthGroc], FIXED_NOW);
  const junkEval = evaluated.find((e) => e.limit.id === 'lim-junk-daily')!;
  const grocEval = evaluated.find((e) => e.limit.id === 'lim-groc-month')!;

  assert.equal(junkEval.spent, 85); // Yesterday excluded!
  assert.equal(junkEval.status, 'approaching');
  assert.equal(grocEval.spent, 1150);
  assert.equal(grocEval.status, 'exceeded');
});

test('Smart Alerts detect approaching, exceeded, unusual week-over-week spike, repeated purchase, improvement & respect dismissal', () => {
  const limits: CategorySpendingLimit[] = [
    {
      id: 'lim-1',
      category: 'Junk',
      period: 'weekly',
      limitAmount: 200,
      warningThresholdPct: 75,
      enabled: true,
      createdAt: FIXED_NOW.toISOString(),
    },
  ];

  const transactions: Transaction[] = [
    // Last week (May 5..May 11)
    tx({
      id: 'pw1',
      name: 'Burger',
      category: 'Dining',
      amount: 100,
      timestamp: new Date(2025, 4, 7, 13, 0, 0, 0).toISOString(),
    }),
    // This week (May 12..May 15): huge spike in Dining + Junk limit exceeded + 3x Coffee
    tx({
      id: 'cw1',
      name: 'Burger Combo',
      category: 'Dining',
      amount: 450,
      timestamp: new Date(2025, 4, 14, 13, 0, 0, 0).toISOString(),
    }),
    tx({
      id: 'cw2',
      name: 'Chips',
      category: 'Junk',
      amount: 250,
      timestamp: new Date(2025, 4, 15, 11, 0, 0, 0).toISOString(),
    }),
    tx({ id: 'rep1', name: 'Cold Coffee', category: 'Dining', amount: 80, timestamp: new Date(2025, 4, 12, 10, 0, 0, 0).toISOString() }),
    tx({ id: 'rep2', name: 'Cold Coffee', category: 'Dining', amount: 80, timestamp: new Date(2025, 4, 13, 10, 0, 0, 0).toISOString() }),
    tx({ id: 'rep3', name: 'Cold Coffee', category: 'Dining', amount: 80, timestamp: new Date(2025, 4, 15, 10, 0, 0, 0).toISOString() }),
  ];

  const evaluatedLimits = evaluateCategoryLimits(limits, transactions, FIXED_NOW);
  const brokeModeStatus = computeBrokeModeStatus(transactions, DEFAULT_BROKE_MODE_CONFIG, FIXED_NOW);

  const res = generateSmartAlerts({
    transactions,
    evaluatedLimits,
    brokeModeStatus,
    totalBudget: 5000,
    now: FIXED_NOW,
  });

  assert.ok(res.allAlerts.some((a) => a.type === 'budget_exceeded' && a.category === 'Junk'));
  assert.ok(res.allAlerts.some((a) => a.type === 'unusual_spending' && a.category === 'Dining'));
  assert.ok(res.allAlerts.some((a) => a.type === 'repeated_purchase'));

  const firstSig = res.allAlerts[0].signature;
  const afterDismiss = generateSmartAlerts({
    transactions,
    evaluatedLimits,
    brokeModeStatus,
    totalBudget: 5000,
    dismissedSignatures: [firstSig],
    now: FIXED_NOW,
  });
  assert.equal(afterDismiss.activeAlerts.length, res.allAlerts.length - 1);
});

test('Discipline Score refuses fake scores on insufficient history and never penalizes pure essential spend', () => {
  const emptyRes = computeDisciplineScore({
    transactions: [],
    totalBudget: 5000,
    evaluatedLimits: [],
    challenges: [],
    disciplineCheckIns: [],
    now: FIXED_NOW,
  });
  assert.equal(emptyRes.hasSufficientHistory, false);
  assert.equal(emptyRes.score, null);
  assert.equal(emptyRes.grade, 'Insufficient Data');

  const essentialOnly: Transaction[] = [
    tx({ id: 'e1', name: 'Milk', category: 'Groceries', amount: 60 }),
    tx({ id: 'e2', name: 'Rice 5kg', category: 'Groceries', amount: 450 }),
    tx({ id: 'e3', name: 'Electricity Bill', category: 'Bills', amount: 1200 }),
  ];
  const healthyScore = computeDisciplineScore({
    transactions: essentialOnly,
    totalBudget: 5000,
    evaluatedLimits: [],
    challenges: [],
    disciplineCheckIns: [],
    now: FIXED_NOW,
  });

  const impulsiveHeavy: Transaction[] = [
    tx({ id: 'j1', name: 'Late Night Chocolate', category: 'Junk', amount: 400, timestamp: new Date(2025, 4, 15, 23, 0, 0, 0).toISOString() }),
    tx({ id: 'j2', name: 'Impulse Candy', category: 'Junk', amount: 500 }),
    tx({ id: 'j3', name: 'Soda & Chips', category: 'Junk', amount: 600 }),
  ];
  const unhealthyScore = computeDisciplineScore({
    transactions: impulsiveHeavy,
    totalBudget: 5000,
    evaluatedLimits: [],
    challenges: [],
    disciplineCheckIns: [],
    now: FIXED_NOW,
  });

  assert.equal(healthyScore.hasSufficientHistory, true);
  assert.ok((healthyScore.score ?? 0) >= 85);
  assert.ok((healthyScore.score ?? 0) > (unhealthyScore.score ?? 100) + 25);
});

test('Challenge streak strictly ignores empty no-data days unless verified by transaction or check-in', () => {
  const challenge: FinancialChallenge = {
    id: 'ch-1',
    templateId: 'no_junk_3d',
    title: 'No Junk for 3 Days',
    description: 'Zero junk for 3 days',
    targetDays: 3,
    startedAt: new Date(2025, 4, 13, 9, 0, 0, 0).toISOString(),
    status: 'active',
  };

  // No transactions and no check-ins across May 13, 14, 15 => 0 verified clean days (NOT 3!)
  const noDataEval = evaluateChallenges([challenge], [], [], FIXED_NOW);
  assert.equal(noDataEval.evaluated[0].verifiedCleanDays, 0);
  assert.equal(noDataEval.evaluated[0].isEligibleToComplete, false);
  assert.equal(noDataEval.verifiedOverallStreak, 0);

  // Add essential purchase on May 13, clean check-in on May 14, essential purchase on May 15 => 3 verified clean days!
  const cleanTxs: Transaction[] = [
    tx({ id: 'd1', name: 'Milk', category: 'Groceries', amount: 60, timestamp: new Date(2025, 4, 13, 10, 0, 0, 0).toISOString() }),
    tx({ id: 'd3', name: 'Eggs', category: 'Groceries', amount: 70, timestamp: new Date(2025, 4, 15, 10, 0, 0, 0).toISOString() }),
  ];
  const verifiedEval = evaluateChallenges([challenge], cleanTxs, ['2025-05-14'], FIXED_NOW);
  assert.equal(verifiedEval.evaluated[0].verifiedCleanDays, 3);
  assert.equal(verifiedEval.evaluated[0].violated, false);
  assert.equal(verifiedEval.evaluated[0].isEligibleToComplete, true);
  assert.equal(verifiedEval.verifiedOverallStreak, 3);
});

test('Behaviour analytics and Financial Targets distinguish spend reduction, estimate, and actual savings transfer', () => {
  const prevMonthTx = tx({
    id: 'pm1',
    name: 'Chips',
    category: 'Junk',
    amount: 1000,
    timestamp: new Date(2025, 3, 12, 14, 0, 0, 0).toISOString(), // April 2025
  });
  const currMonthTx = tx({
    id: 'cm1',
    name: 'Chips',
    category: 'Junk',
    amount: 400,
    timestamp: new Date(2025, 4, 12, 14, 0, 0, 0).toISOString(), // May 2025
  });

  const analytics = computeBehaviourAnalytics([prevMonthTx, currMonthTx], 5000, FIXED_NOW);
  assert.equal(analytics.monthComparison.previousJunk, 1000);
  assert.equal(analytics.monthComparison.currentJunk, 400);
  assert.equal(analytics.monthComparison.junkDeltaPct, -60);

  const junkIntel = computeJunkIntelligence([prevMonthTx, currMonthTx], FIXED_NOW);
  assert.equal(junkIntel.potentialSavings.isEstimate, true);
  assert.ok(junkIntel.potentialSavings.balancedMonthlySavings > 0);

  const target: FinancialTarget = {
    id: 'tgt-1',
    title: 'Cut monthly junk by ₹500',
    type: 'reduce_junk_by_amount',
    period: 'monthly',
    targetValue: 500,
    transferredSavings: 200,
    createdAt: FIXED_NOW.toISOString(),
  };

  const [evaluatedTarget] = evaluateFinancialTargets([target], [prevMonthTx, currMonthTx], FIXED_NOW);
  assert.equal(evaluatedTarget.spendReduction, 600); // 1000 - 400 real reduction
  assert.equal(evaluatedTarget.transferredSavings, 200); // explicit user savings transfer kept distinct
  assert.equal(evaluatedTarget.achieved, true);

  // Sanity check period bounds helper
  const weekBounds = getPeriodBounds('weekly', FIXED_NOW);
  const prevWeekBounds = getPreviousPeriodBounds('weekly', FIXED_NOW);
  assert.equal(weekBounds.start.getDay(), 1); // Monday
  assert.equal(prevWeekBounds.start.getDay(), 1);
  assert.ok(prevWeekBounds.endMs < weekBounds.startMs);
});
