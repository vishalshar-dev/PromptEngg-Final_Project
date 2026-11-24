import test from 'node:test';
import assert from 'node:assert/strict';
import type { CategorySpendingLimit, Transaction } from '../../../types/models';
import { deriveCapsuleBudgetState } from './capsuleBudgetState';
import { deriveAetherIntelligence } from './aetherIntelligence';

const NOV_24 = new Date('2026-11-24T12:00:00.000Z'); // Day 24 of Nov (resetDay 1)
const NOV_01 = new Date('2026-11-01T12:00:00.000Z'); // Day 1 of Nov
const NOV_06 = new Date('2026-11-06T12:00:00.000Z'); // Day 6 of Nov (20% elapsed)

function makeTx(overrides: Partial<Transaction>): Transaction {
  return {
    id: overrides.id ?? 'tx-1',
    name: overrides.name ?? 'Expense',
    amount: overrides.amount ?? 250,
    category: overrides.category ?? 'Groceries',
    timestamp: overrides.timestamp ?? '2026-11-20T10:00:00.000Z',
    status: overrides.status ?? 'active',
    refundAmount: overrides.refundAmount,
    source: overrides.source ?? 'manual',
  };
}

test('1. unconfigured budget returns setup guidance and omits all telemetry', () => {
  const budgetState = deriveCapsuleBudgetState({
    transactions: [makeTx({ amount: 500 })],
    totalBudget: 0,
    now: NOV_24,
  });
  const intel = deriveAetherIntelligence({
    budgetState,
    transactions: [makeTx({ amount: 500 })],
    now: NOV_24,
  });

  assert.equal(intel.isAvailable, false);
  assert.equal(intel.pace, null);
  assert.equal(intel.projection, null);
  assert.equal(intel.categoryAttention, null);
  assert.ok(intel.contextualStatus.toLowerCase().includes('set a budget'));
});

test('2. invalid financial data returns safe unavailable state with no NaN or crashes', () => {
  const budgetState = deriveCapsuleBudgetState({
    transactions: [],
    totalBudget: Number.NaN,
    now: NOV_24,
  });
  const intel = deriveAetherIntelligence({
    budgetState,
    transactions: null as unknown as Transaction[],
    now: NOV_24,
  });

  assert.equal(intel.isAvailable, false);
  assert.equal(intel.pace, null);
  assert.equal(intel.projection, null);
  assert.equal(intel.categoryAttention, null);
  assert.equal(intel.contextualTone, 'neutral');
});

test('3. zero spending shows no-spend pace and omits projection and category attention', () => {
  const budgetState = deriveCapsuleBudgetState({
    transactions: [],
    totalBudget: 12000,
    now: NOV_24,
  });
  const intel = deriveAetherIntelligence({
    budgetState,
    transactions: [],
    now: NOV_24,
  });

  assert.equal(intel.isAvailable, true);
  assert.equal(intel.contextualTone, 'success');
  assert.equal(intel.pace?.status, 'no_spend');
  assert.equal(intel.projection, null);
  assert.equal(intel.categoryAttention, null);
});

test('4. healthy spending on pace yields comfortable status and reliable cycle-end estimate', () => {
  // Day 24/30 = 80% elapsed; spent = 7500 / 10000 = 75% across 4 distinct days
  const txs = [
    makeTx({ id: 't1', amount: 1800, category: 'Groceries', timestamp: '2026-11-03T10:00:00.000Z' }),
    makeTx({ id: 't2', amount: 1900, category: 'Groceries', timestamp: '2026-11-09T10:00:00.000Z' }),
    makeTx({ id: 't3', amount: 1850, category: 'Electricity & Utilities', timestamp: '2026-11-15T10:00:00.000Z' }),
    makeTx({ id: 't4', amount: 1950, category: 'Fuel & Transportation', timestamp: '2026-11-22T10:00:00.000Z' }),
  ];
  const budgetState = deriveCapsuleBudgetState({
    transactions: txs,
    totalBudget: 10000,
    now: NOV_24,
  });
  const intel = deriveAetherIntelligence({
    budgetState,
    transactions: txs,
    now: NOV_24,
  });

  assert.equal(intel.pace?.status, 'aligned');
  assert.ok(intel.projection !== null);
  assert.equal(intel.projection?.outcome, 'remaining');
  assert.ok(intel.projection?.valueText.includes('remaining'));
  assert.ok(intel.projection?.assumption.toLowerCase().includes('estimate'));
});

test('5. early heavy spending avoids misleading reassurance even when remaining > 50%', () => {
  // Day 6 of 30 (20% elapsed); spent 4500 of 10000 (45% used, 55% still remaining)
  const txs = [
    makeTx({ id: 't1', amount: 1500, category: 'Snacks & Beverages', timestamp: '2026-11-02T10:00:00.000Z' }),
    makeTx({ id: 't2', amount: 1500, category: 'Snacks & Beverages', timestamp: '2026-11-04T10:00:00.000Z' }),
    makeTx({ id: 't3', amount: 1500, category: 'Groceries', timestamp: '2026-11-05T10:00:00.000Z' }),
  ];
  const budgetState = deriveCapsuleBudgetState({
    transactions: txs,
    totalBudget: 10000,
    now: NOV_06,
  });
  const intel = deriveAetherIntelligence({
    budgetState,
    transactions: txs,
    now: NOV_06,
  });

  assert.equal(budgetState.healthState, 'healthy');
  assert.equal(intel.pace?.status, 'ahead');
  assert.equal(intel.contextualTone, 'warning');
  assert.ok(!intel.contextualStatus.toLowerCase().includes('comfortably'));
  assert.equal(intel.projection?.outcome, 'overspend');
});

test('6. spending below expected pace classifies cleanly as below pace', () => {
  // Day 24 of 30 (80% elapsed); spent 4000 of 10000 (40% used) across 4 days
  const txs = [
    makeTx({ id: 't1', amount: 1000, category: 'Groceries', timestamp: '2026-11-03T10:00:00.000Z' }),
    makeTx({ id: 't2', amount: 1000, category: 'Fuel & Transportation', timestamp: '2026-11-08T10:00:00.000Z' }),
    makeTx({ id: 't3', amount: 1000, category: 'Dairy & Bakery', timestamp: '2026-11-14T10:00:00.000Z' }),
    makeTx({ id: 't4', amount: 1000, category: 'Fruits & Vegetables', timestamp: '2026-11-20T10:00:00.000Z' }),
  ];
  const budgetState = deriveCapsuleBudgetState({
    transactions: txs,
    totalBudget: 10000,
    now: NOV_24,
  });
  const intel = deriveAetherIntelligence({
    budgetState,
    transactions: txs,
    now: NOV_24,
  });

  assert.equal(intel.pace?.status, 'below');
  assert.equal(intel.pace?.tone, 'success');
  assert.equal(intel.contextualTone, 'success');
  // Balanced categories with <= 25% each -> categoryAttention omitted cleanly
  assert.equal(intel.categoryAttention, null);
});

test('7. critical budget state surfaces low balance guidance cleanly', () => {
  const txs = [
    makeTx({ id: 't1', amount: 3000, category: 'Groceries', timestamp: '2026-11-03T10:00:00.000Z' }),
    makeTx({ id: 't2', amount: 3000, category: 'Electricity & Utilities', timestamp: '2026-11-10T10:00:00.000Z' }),
    makeTx({ id: 't3', amount: 2800, category: 'Entertainment', timestamp: '2026-11-18T10:00:00.000Z' }),
  ];
  const budgetState = deriveCapsuleBudgetState({
    transactions: txs,
    totalBudget: 10000,
    now: NOV_24,
  });
  const intel = deriveAetherIntelligence({
    budgetState,
    transactions: txs,
    now: NOV_24,
  });

  assert.equal(budgetState.healthState, 'critical');
  assert.equal(intel.contextualTone, 'danger');
  assert.ok(intel.contextualStatus.toLowerCase().includes('low'));
});

test('8. overspent budget reports exact deficit and omits cycle-end forecast', () => {
  const txs = [makeTx({ id: 't1', amount: 11500, timestamp: '2026-11-10T10:00:00.000Z' })];
  const budgetState = deriveCapsuleBudgetState({
    transactions: txs,
    totalBudget: 10000,
    now: NOV_24,
  });
  const intel = deriveAetherIntelligence({
    budgetState,
    transactions: txs,
    now: NOV_24,
  });

  assert.equal(budgetState.status, 'exceeded');
  assert.equal(intel.contextualTone, 'danger');
  assert.equal(intel.pace?.status, 'exceeded');
  assert.equal(intel.projection, null);
  assert.ok(intel.contextualStatus.includes('1,500'));
});

test('9. insufficient history on Day 1 or single-large-expense skew omits projection honestly', () => {
  // Day 1 with small purchase should not trigger panic or projection
  const day1Txs = [makeTx({ id: 'd1', amount: 650, timestamp: '2026-11-01T09:00:00.000Z' })];
  const day1State = deriveCapsuleBudgetState({
    transactions: day1Txs,
    totalBudget: 10000,
    now: NOV_01,
  });
  const day1Intel = deriveAetherIntelligence({
    budgetState: day1State,
    transactions: day1Txs,
    now: NOV_01,
  });
  assert.equal(day1Intel.pace?.status, 'early');
  assert.equal(day1Intel.projection, null);

  // Single large rent-like outlier dominating >55% of spend should omit projection
  const outlierTxs = [
    makeTx({ id: 'o1', amount: 5000, category: 'Rent', timestamp: '2026-11-03T10:00:00.000Z' }),
    makeTx({ id: 'o2', amount: 300, category: 'Groceries', timestamp: '2026-11-08T10:00:00.000Z' }),
    makeTx({ id: 'o3', amount: 250, category: 'Dairy & Bakery', timestamp: '2026-11-14T10:00:00.000Z' }),
  ];
  const outlierState = deriveCapsuleBudgetState({
    transactions: outlierTxs,
    totalBudget: 12000,
    now: NOV_24,
  });
  const outlierIntel = deriveAetherIntelligence({
    budgetState: outlierState,
    transactions: outlierTxs,
    now: NOV_24,
  });
  assert.equal(outlierIntel.projection, null);
  assert.ok(outlierIntel.omittedReasons.projection?.includes('one large purchase'));
});

test('10. corrupted timestamps, cancelled, and refunded entries follow capsule sanitization without mismatch', () => {
  const mixedTxs = [
    makeTx({ id: 'good-1', amount: 1200, timestamp: '2026-11-05T10:00:00.000Z' }),
    makeTx({ id: 'partial-ref', amount: 1000, status: 'refunded', refundAmount: 400, timestamp: '2026-11-12T10:00:00.000Z' }),
    makeTx({ id: 'cancelled', amount: 4000, status: 'cancelled', timestamp: '2026-11-15T10:00:00.000Z' }),
    makeTx({ id: 'bad-date', amount: 2000, timestamp: 'not-valid-iso' }),
    makeTx({ id: 'bad-amt', amount: Number.NaN, timestamp: '2026-11-16T10:00:00.000Z' }),
  ];
  const budgetState = deriveCapsuleBudgetState({
    transactions: mixedTxs,
    totalBudget: 10000,
    now: NOV_24,
  });
  const intel = deriveAetherIntelligence({
    budgetState,
    transactions: mixedTxs,
    now: NOV_24,
  });

  // Only good-1 (1200) + partial-ref net (600) = 1800 active spent
  assert.equal(budgetState.activeSpent, 1800);
  assert.equal(budgetState.rawRemainingAmount, 8200);
  assert.equal(intel.pace?.status, 'below');
  assert.equal(intel.projection, null); // Only 2 valid transactions (< 3 minimum)
});

test('11. non-1st resetDay and rollover adjustments drive pace and category comparison accurately', () => {
  // With resetDay 15 on Nov 24: current cycle is Nov 15 - Dec 14 (10 elapsed of 30 total)
  // Previous cycle is Oct 15 - Nov 14: spent 4000 on budget 5000 -> +1000 rollover => effective 6000
  const txs = [
    makeTx({ id: 'prev', amount: 4000, category: 'Groceries', timestamp: '2026-10-20T10:00:00.000Z' }),
    makeTx({ id: 'c1', amount: 500, category: 'Dairy & Bakery', timestamp: '2026-11-16T10:00:00.000Z' }),
    makeTx({ id: 'c2', amount: 500, category: 'Groceries', timestamp: '2026-11-19T10:00:00.000Z' }),
    makeTx({ id: 'c3', amount: 500, category: 'Fuel & Transportation', timestamp: '2026-11-23T10:00:00.000Z' }),
  ];
  const budgetState = deriveCapsuleBudgetState({
    transactions: txs,
    totalBudget: 5000,
    budgetResetDay: 15,
    budgetRolloverEnabled: true,
    now: NOV_24,
  });
  const intel = deriveAetherIntelligence({
    budgetState,
    transactions: txs,
    now: NOV_24,
  });

  assert.equal(budgetState.effectiveBudget, 6000);
  // 1500 / 6000 = 25% spent across 10/30 = 33.3% elapsed -> aligned (-8%)
  assert.equal(intel.pace?.status, 'aligned');
  // 150/day over 10 days = 4500 projected over 30 days -> +1500 remaining
  assert.equal(intel.projection?.projectedEndBalance, 1500);
});

test('12. category attention surfaces breached limits first, then historical jumps, and omits noise', () => {
  const txs = [
    makeTx({ id: 's1', amount: 600, category: 'Snacks & Beverages', timestamp: '2026-11-23T10:00:00.000Z' }),
    makeTx({ id: 's2', amount: 450, category: 'Snacks & Beverages', timestamp: '2026-11-24T09:00:00.000Z' }),
    makeTx({ id: 'g1', amount: 1200, category: 'Groceries', timestamp: '2026-11-10T10:00:00.000Z' }),
  ];
  const limits: CategorySpendingLimit[] = [
    {
      id: 'lim-snacks',
      category: 'Snacks & Beverages',
      period: 'weekly',
      limitAmount: 900,
      warningThresholdPct: 75,
      enabled: true,
      createdAt: '2026-11-01T00:00:00.000Z',
    },
  ];
  const stateWithLimit = deriveCapsuleBudgetState({
    transactions: txs,
    totalBudget: 12000,
    now: NOV_24,
  });
  const limitIntel = deriveAetherIntelligence({
    budgetState: stateWithLimit,
    transactions: txs,
    categoryLimits: limits,
    now: NOV_24,
  });

  assert.equal(limitIntel.categoryAttention?.kind, 'limit_exceeded');
  assert.equal(limitIntel.categoryAttention?.category, 'Snacks & Beverages');
  assert.equal(limitIntel.categoryAttention?.tone, 'danger');

  // Historical category jump check without active limits
  const histTxs = [
    makeTx({ id: 'p1', amount: 800, category: 'Fuel & Transportation', timestamp: '2026-10-18T10:00:00.000Z' }),
    makeTx({ id: 'c1', amount: 700, category: 'Fuel & Transportation', timestamp: '2026-11-05T10:00:00.000Z' }),
    makeTx({ id: 'c2', amount: 700, category: 'Fuel & Transportation', timestamp: '2026-11-18T10:00:00.000Z' }),
    makeTx({ id: 'c3', amount: 900, category: 'Groceries', timestamp: '2026-11-12T10:00:00.000Z' }),
  ];
  const histState = deriveCapsuleBudgetState({
    transactions: histTxs,
    totalBudget: 12000,
    now: NOV_24,
  });
  const histIntel = deriveAetherIntelligence({
    budgetState: histState,
    transactions: histTxs,
    now: NOV_24,
  });

  assert.equal(histIntel.categoryAttention?.kind, 'historical_increase');
  assert.equal(histIntel.categoryAttention?.category, 'Fuel & Transportation');
  assert.equal(histIntel.categoryAttention?.metricText, '+75%');
});
