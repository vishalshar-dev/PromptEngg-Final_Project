import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMonthlySpendingSeries } from './spendingTrends';
import type { Transaction } from '../types/models';

test('buildMonthlySpendingSeries returns empty window cleanly when no transactions exist', () => {
  const now = new Date('2026-11-17T12:00:00Z');
  const summary = buildMonthlySpendingSeries([], 5000, 6, now);

  assert.equal(summary.points.length, 6);
  assert.equal(summary.points[0].monthKey, '2026-06');
  assert.equal(summary.points[5].monthKey, '2026-11');
  assert.equal(summary.hasAnyTransactions, false);
  assert.equal(summary.avgMonthlySpend, 0);
  assert.equal(summary.peakMonth, null);
  assert.equal(summary.momDeltaPct, null);
});

test('buildMonthlySpendingSeries aggregates multi-month transactions across year boundaries', () => {
  const now = new Date('2026-02-15T12:00:00Z');
  const txs: Transaction[] = [
    { id: '1', name: 'Groceries', amount: 1200, category: 'Groceries', timestamp: '2025-11-10T10:00:00Z' },
    { id: '2', name: 'Fuel', amount: 800, category: 'Fuel', timestamp: '2025-11-22T10:00:00Z' },
    { id: '3', name: 'Wi-Fi', amount: 5500, category: 'Bills', timestamp: '2026-01-05T10:00:00Z' },
    { id: '4', name: 'Snacks', amount: 1100, category: 'Junk', timestamp: '2026-02-02T10:00:00Z' },
    { id: '5', name: 'Old Tx', amount: 9999, category: 'Bills', timestamp: '2024-01-01T10:00:00Z' },
    { id: '6', name: 'Bad Date', amount: 500, category: 'Bills', timestamp: 'not-a-date' },
  ];

  const summary = buildMonthlySpendingSeries(txs, 5000, 6, now);

  assert.equal(summary.points.length, 6);
  assert.equal(summary.points[0].monthKey, '2025-09');
  assert.equal(summary.points[4].monthKey, '2026-01');
  assert.equal(summary.points[5].monthKey, '2026-02');

  const nov = summary.points.find((p) => p.monthKey === '2025-11')!;
  assert.equal(nov.spent, 2000);
  assert.equal(nov.txCount, 2);
  assert.equal(nov.topCategory, 'Groceries');
  assert.equal(nov.isOverBudget, false);
  assert.equal(nov.remaining, 3000);

  const jan = summary.points.find((p) => p.monthKey === '2026-01')!;
  assert.equal(jan.spent, 5500);
  assert.equal(jan.isOverBudget, true);
  assert.equal(jan.remaining, -500);
  assert.ok(jan.label.includes('Jan'));

  assert.equal(summary.hasAnyTransactions, true);
  assert.equal(summary.activeMonthsCount, 3);
  assert.equal(summary.overBudgetCount, 1);
  assert.equal(summary.underBudgetCount, 2);
  assert.equal(summary.peakMonth?.monthKey, '2026-01');
  // Average across 3 active months: (2000 + 5500 + 1100) / 3 = 2866.67
  assert.equal(summary.avgMonthlySpend, 2866.67);
  // MoM from Jan (5500) to Feb (1100): -80%
  assert.equal(summary.momDeltaPct, -80);
});
