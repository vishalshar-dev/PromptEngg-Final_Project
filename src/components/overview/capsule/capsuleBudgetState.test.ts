import test from 'node:test';
import assert from 'node:assert/strict';
import type { Transaction } from '../../../types/models';
import { deriveCapsuleBudgetState } from './capsuleBudgetState';

const NOW = new Date('2026-11-24T10:00:00.000Z');
const IN_CYCLE_ISO = '2026-11-20T10:00:00.000Z';
const PREV_CYCLE_ISO = '2026-10-20T10:00:00.000Z';

function makeTx(overrides: Partial<Transaction>): Transaction {
  return {
    id: overrides.id ?? 'tx-1',
    name: overrides.name ?? 'Groceries',
    amount: overrides.amount ?? 100,
    category: overrides.category ?? 'Groceries',
    timestamp: overrides.timestamp ?? IN_CYCLE_ISO,
    status: overrides.status ?? 'active',
    refundAmount: overrides.refundAmount,
    source: overrides.source ?? 'manual',
  };
}

test('1. no budget configured returns unconfigured neutral standby state', () => {
  const result = deriveCapsuleBudgetState({
    transactions: [makeTx({ amount: 500 })],
    totalBudget: 0,
    now: NOW,
  });

  assert.equal(result.status, 'unconfigured');
  assert.equal(result.visualState, 'unconfigured');
  assert.equal(result.fillRatio, 0);
  assert.equal(result.remainingPct, 0);
});

test('2. invalid top-level financial inputs return invalid standby state instead of 0% depleted', () => {
  const nanBudget = deriveCapsuleBudgetState({
    transactions: [],
    totalBudget: Number.NaN,
    now: NOW,
  });
  assert.equal(nanBudget.status, 'invalid');
  assert.equal(nanBudget.visualState, 'invalid');

  const negativeBudget = deriveCapsuleBudgetState({
    transactions: [],
    totalBudget: -2500,
    now: NOW,
  });
  assert.equal(negativeBudget.status, 'invalid');
  assert.equal(negativeBudget.visualState, 'invalid');

  const malformedList = deriveCapsuleBudgetState({
    transactions: null as unknown as Transaction[],
    totalBudget: 5000,
    now: NOW,
  });
  assert.equal(malformedList.status, 'invalid');
  assert.equal(malformedList.visualState, 'invalid');
});

test('3. zero spending leaves capsule 100% healthy', () => {
  const result = deriveCapsuleBudgetState({
    transactions: [],
    totalBudget: 5000,
    now: NOW,
  });

  assert.equal(result.status, 'active');
  assert.equal(result.visualState, 'normal');
  assert.equal(result.healthState, 'healthy');
  assert.equal(result.fillRatio, 1);
  assert.equal(result.remainingPct, 100);
  assert.equal(result.activeSpent, 0);
  assert.equal(result.rawRemainingAmount, 5000);
});

test('4. partial spending reflects exact remaining percentage and health tier', () => {
  const result = deriveCapsuleBudgetState({
    transactions: [
      makeTx({ id: 'a', amount: 1500 }),
      makeTx({ id: 'b', amount: 1500 }),
    ],
    totalBudget: 5000,
    now: NOW,
  });

  assert.equal(result.status, 'active');
  assert.equal(result.healthState, 'caution');
  assert.equal(result.activeSpent, 3000);
  assert.equal(result.rawRemainingAmount, 2000);
  assert.equal(result.remainingPct, 40);
  assert.ok(Math.abs(result.fillRatio - 0.4) < 1e-6);
  assert.equal(result.overspendAmount, 0);
});

test('5. fully exhausted budget sits at 0% exhausted without overspend', () => {
  const result = deriveCapsuleBudgetState({
    transactions: [makeTx({ amount: 5000 })],
    totalBudget: 5000,
    now: NOW,
  });

  assert.equal(result.status, 'exhausted');
  assert.equal(result.visualState, 'normal');
  assert.equal(result.healthState, 'depleted');
  assert.equal(result.fillRatio, 0);
  assert.equal(result.remainingPct, 0);
  assert.equal(result.rawRemainingAmount, 0);
  assert.equal(result.overspendAmount, 0);
});

test('6. overspending clamps visual fill to 0 while preserving negative raw remaining and overspend amount', () => {
  const result = deriveCapsuleBudgetState({
    transactions: [makeTx({ amount: 6400 })],
    totalBudget: 5000,
    now: NOW,
  });

  assert.equal(result.status, 'exceeded');
  assert.equal(result.visualState, 'normal');
  assert.equal(result.healthState, 'depleted');
  assert.equal(result.fillRatio, 0);
  assert.equal(result.remainingPct, 0);
  assert.equal(result.clampedRemainingAmount, 0);
  assert.equal(result.rawRemainingAmount, -1400);
  assert.equal(result.overspendAmount, 1400);
});

test('7. partial refund counts only net non-refunded spending', () => {
  const result = deriveCapsuleBudgetState({
    transactions: [
      makeTx({
        id: 'partial-ref',
        amount: 1000,
        status: 'refunded',
        refundAmount: 400,
      }),
    ],
    totalBudget: 5000,
    now: NOW,
  });

  assert.equal(result.activeSpent, 600);
  assert.equal(result.rawRemainingAmount, 4400);
  assert.equal(result.remainingPct, 88);
  assert.equal(result.activeTransactionCount, 1);
});

test('8. full refund counts 0 spending whether refundAmount equals amount or is omitted', () => {
  const result = deriveCapsuleBudgetState({
    transactions: [
      makeTx({
        id: 'full-explicit',
        amount: 1000,
        status: 'refunded',
        refundAmount: 1000,
      }),
      makeTx({
        id: 'full-implicit',
        amount: 800,
        status: 'refunded',
      }),
    ],
    totalBudget: 5000,
    now: NOW,
  });

  assert.equal(result.activeSpent, 0);
  assert.equal(result.rawRemainingAmount, 5000);
  assert.equal(result.fillRatio, 1);
  assert.equal(result.activeTransactionCount, 0);
});

test('9. cancelled transactions are excluded completely', () => {
  const result = deriveCapsuleBudgetState({
    transactions: [
      makeTx({ id: 'ok', amount: 1000, status: 'active' }),
      makeTx({ id: 'c1', amount: 2500, status: 'cancelled' }),
      makeTx({
        id: 'c2',
        amount: 900,
        status: 'Cancelled' as unknown as Transaction['status'],
      }),
    ],
    totalBudget: 5000,
    now: NOW,
  });

  assert.equal(result.activeSpent, 1000);
  assert.equal(result.rawRemainingAmount, 4000);
  assert.equal(result.remainingPct, 80);
  assert.equal(result.activeTransactionCount, 1);
});

test('10. invalid transaction entries and corrupted fields are ignored safely', () => {
  const result = deriveCapsuleBudgetState({
    transactions: [
      makeTx({ id: 'valid', amount: 1250 }),
      makeTx({
        id: 'bad-status',
        amount: 999,
        status: 'invalid' as unknown as Transaction['status'],
      }),
      makeTx({ id: 'bad-amt', amount: Number.NaN }),
      makeTx({ id: 'neg-amt', amount: -300 }),
      makeTx({ id: 'bad-date', amount: 400, timestamp: 'not-a-date' }),
    ],
    totalBudget: 5000,
    now: NOW,
  });

  assert.equal(result.status, 'active');
  assert.equal(result.activeSpent, 1250);
  assert.equal(result.rawRemainingAmount, 3750);
  assert.equal(result.remainingPct, 75);
});

test('11. budget cycle resetDay and rollover adjustments match authoritative cycle summary', () => {
  // NOW is Nov 24; with resetDay=15, current cycle is Nov 15 - Dec 14, prev cycle is Oct 15 - Nov 14
  const result = deriveCapsuleBudgetState({
    transactions: [
      makeTx({ id: 'prev', amount: 4000, timestamp: PREV_CYCLE_ISO }),
      makeTx({ id: 'curr', amount: 2000, timestamp: IN_CYCLE_ISO }),
    ],
    totalBudget: 5000,
    budgetResetDay: 15,
    budgetRolloverEnabled: true,
    now: NOW,
  });

  // Rollover delta = 5000 - 4000 = +1000 -> effective budget = 6000, spent = 2000, remaining = 4000
  assert.equal(result.rolloverDelta, 1000);
  assert.equal(result.effectiveBudget, 6000);
  assert.equal(result.activeSpent, 2000);
  assert.equal(result.rawRemainingAmount, 4000);
  assert.ok(Math.abs(result.fillRatio - 4000 / 6000) < 1e-6);
});

test('12. slightly below/above budget boundaries preserve exact active vs exceeded status', () => {
  const slightlyBelow = deriveCapsuleBudgetState({
    transactions: [makeTx({ amount: 4999.5 })],
    totalBudget: 5000,
    now: NOW,
  });
  assert.equal(slightlyBelow.status, 'active');
  assert.equal(slightlyBelow.healthState, 'critical');
  assert.equal(slightlyBelow.rawRemainingAmount, 0.5);
  assert.equal(slightlyBelow.overspendAmount, 0);
  assert.ok(slightlyBelow.fillRatio > 0 && slightlyBelow.fillRatio < 0.001);

  const slightlyAbove = deriveCapsuleBudgetState({
    transactions: [makeTx({ amount: 5000.5 })],
    totalBudget: 5000,
    now: NOW,
  });
  assert.equal(slightlyAbove.status, 'exceeded');
  assert.equal(slightlyAbove.healthState, 'depleted');
  assert.equal(slightlyAbove.fillRatio, 0);
  assert.equal(slightlyAbove.rawRemainingAmount, -0.5);
  assert.equal(slightlyAbove.overspendAmount, 0.5);
});

test('13. very small and very large monetary values maintain numerical precision', () => {
  const micro = deriveCapsuleBudgetState({
    transactions: [makeTx({ amount: 0.5 })],
    totalBudget: 1,
    now: NOW,
  });
  assert.equal(micro.status, 'active');
  assert.equal(micro.healthState, 'healthy');
  assert.equal(micro.remainingPct, 50);
  assert.equal(micro.rawRemainingAmount, 0.5);

  const crore = deriveCapsuleBudgetState({
    transactions: [makeTx({ amount: 2500000 })],
    totalBudget: 10000000,
    now: NOW,
  });
  assert.equal(crore.status, 'active');
  assert.equal(crore.healthState, 'healthy');
  assert.equal(crore.remainingPct, 75);
  assert.equal(crore.rawRemainingAmount, 7500000);
});

test('14. cycle boundary timestamps and negative rollover zeroing handle transitions accurately', () => {
  const cycleStartLocal = new Date(2026, 10, 1, 0, 0, 0, 0).toISOString();
  const prevEndLocal = new Date(2026, 9, 31, 23, 59, 59, 999).toISOString();

  const rolloverZeroWithSpend = deriveCapsuleBudgetState({
    transactions: [
      makeTx({ id: 'prev-over', amount: 12000, timestamp: prevEndLocal }),
      makeTx({ id: 'curr-start', amount: 200, timestamp: cycleStartLocal }),
    ],
    totalBudget: 5000,
    budgetRolloverEnabled: true,
    now: NOW,
  });
  assert.equal(rolloverZeroWithSpend.effectiveBudget, 0);
  assert.equal(rolloverZeroWithSpend.activeSpent, 200);
  assert.equal(rolloverZeroWithSpend.status, 'exceeded');
  assert.equal(rolloverZeroWithSpend.overspendAmount, 200);

  const rolloverZeroNoSpend = deriveCapsuleBudgetState({
    transactions: [
      makeTx({ id: 'prev-over', amount: 12000, timestamp: prevEndLocal }),
    ],
    totalBudget: 5000,
    budgetRolloverEnabled: true,
    now: NOW,
  });
  assert.equal(rolloverZeroNoSpend.effectiveBudget, 0);
  assert.equal(rolloverZeroNoSpend.activeSpent, 0);
  assert.equal(rolloverZeroNoSpend.status, 'exhausted');
});
