import test from 'node:test';
import assert from 'node:assert/strict';
import type { Transaction } from '../types/models';
import {
  clampBudgetResetDay,
  computeBudgetCycleSummary,
  getActiveBudgetCycleWindow,
} from './budgetCycle';

test('getActiveBudgetCycleWindow handles calendar month and custom reset day boundaries', () => {
  const winDefault = getActiveBudgetCycleWindow(1, new Date(2026, 10, 21, 12, 0));
  assert.equal(winDefault.resetDay, 1);
  assert.equal(winDefault.start.getMonth(), 10);
  assert.equal(winDefault.start.getDate(), 1);
  assert.equal(winDefault.end.getMonth(), 10);
  assert.equal(winDefault.end.getDate(), 30);

  // On Nov 21 with resetDay = 15, active cycle is Nov 15 - Dec 14
  const winMid = getActiveBudgetCycleWindow(15, new Date(2026, 10, 21, 12, 0));
  assert.equal(winMid.start.getMonth(), 10);
  assert.equal(winMid.start.getDate(), 15);
  assert.equal(winMid.end.getMonth(), 11);
  assert.equal(winMid.end.getDate(), 14);

  // On Nov 10 with resetDay = 15, active cycle is Oct 15 - Nov 14
  const winBefore = getActiveBudgetCycleWindow(15, new Date(2026, 10, 10, 12, 0));
  assert.equal(winBefore.start.getMonth(), 9);
  assert.equal(winBefore.start.getDate(), 15);
  assert.equal(winBefore.end.getMonth(), 10);
  assert.equal(winBefore.end.getDate(), 14);

  assert.equal(clampBudgetResetDay(99), 28);
  assert.equal(clampBudgetResetDay(0), 1);
});

test('computeBudgetCycleSummary scopes spending to custom cycle and computes rollover only when prior history exists', () => {
  const now = new Date(2026, 10, 21, 12, 0); // Nov 21
  const txs: Transaction[] = [
    {
      id: 'tx-prev',
      name: 'Oct Groceries',
      amount: 3800,
      category: 'Groceries',
      timestamp: new Date(2026, 9, 25, 10, 0).toISOString(), // Oct 25 -> inside Oct 15 - Nov 14 cycle
      status: 'active',
    },
    {
      id: 'tx-curr',
      name: 'Nov Groceries',
      amount: 1200,
      category: 'Groceries',
      timestamp: new Date(2026, 10, 18, 10, 0).toISOString(), // Nov 18 -> inside Nov 15 - Dec 14 cycle
      status: 'active',
    },
    {
      id: 'tx-cancel',
      name: 'Cancelled',
      amount: 900,
      category: 'Groceries',
      timestamp: new Date(2026, 10, 19, 10, 0).toISOString(),
      status: 'cancelled',
    },
  ];

  // Without rollover
  const baseSummary = computeBudgetCycleSummary({
    transactions: txs,
    totalBudget: 5000,
    resetDay: 15,
    rolloverEnabled: false,
    now,
  });
  assert.equal(baseSummary.currentSpent, 1200);
  assert.equal(baseSummary.effectiveBudget, 5000);
  assert.equal(baseSummary.rolloverDelta, 0);
  assert.equal(baseSummary.remainingBudget, 3800);

  // With rollover: prev spent 3800 out of 5000 -> +1200 surplus -> effective 6200
  const rolloverSummary = computeBudgetCycleSummary({
    transactions: txs,
    totalBudget: 5000,
    resetDay: 15,
    rolloverEnabled: true,
    now,
  });
  assert.equal(rolloverSummary.previousCycleSpent, 3800);
  assert.equal(rolloverSummary.rolloverDelta, 1200);
  assert.equal(rolloverSummary.effectiveBudget, 6200);
  assert.equal(rolloverSummary.remainingBudget, 5000);

  // Deficit rollover clamps effectiveBudget >= 0
  const deficitSummary = computeBudgetCycleSummary({
    transactions: [
      {
        id: 'tx-big-prev',
        name: 'Big Spend',
        amount: 6500,
        category: 'Bills',
        timestamp: new Date(2026, 9, 25, 10, 0).toISOString(),
        status: 'active',
      },
    ],
    totalBudget: 5000,
    resetDay: 15,
    rolloverEnabled: true,
    now,
  });
  assert.equal(deficitSummary.rolloverDelta, -1500);
  assert.equal(deficitSummary.effectiveBudget, 3500);

  // Brand-new user with no prior transactions should not get phantom rollover surplus
  const newUserSummary = computeBudgetCycleSummary({
    transactions: [txs[1]],
    totalBudget: 5000,
    resetDay: 15,
    rolloverEnabled: true,
    now,
  });
  assert.equal(newUserSummary.rolloverDelta, 0);
  assert.equal(newUserSummary.effectiveBudget, 5000);
});
