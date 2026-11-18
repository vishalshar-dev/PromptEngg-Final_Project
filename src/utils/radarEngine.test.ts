import test from 'node:test';
import assert from 'node:assert/strict';
import type { Transaction } from '../types/models';
import {
  buildRadarFinancialReport,
  buildRadarReportCsv,
  buildRadarReportHtml,
  computeCategoryAnalytics,
  computePeriodComparison,
  computeRadarBudgetMonitor,
  computeRadarOverview,
  computeSpendingTrends,
  detectUnusualSpending,
  generateRadarInsights,
  queryRadarTransactions,
  resolveRadarWindow,
} from './radarEngine';

const NOW = new Date(2026, 10, 18, 14, 0, 0, 0); // Nov 18, 2026

function tx(
  id: string,
  name: string,
  amount: number,
  category: string,
  year: number,
  monthIdx: number,
  day: number,
  extra: Partial<Transaction> = {}
): Transaction {
  return {
    id,
    name,
    amount,
    category,
    timestamp: new Date(year, monthIdx, day, 12, 0, 0, 0).toISOString(),
    status: 'active',
    source: 'mart',
    ...extra,
  };
}

test('resolveRadarWindow uses fair elapsed-day comparison for incomplete current month and handles custom bounds', () => {
  const thisMonth = resolveRadarWindow('this_month', undefined, undefined, NOW);
  assert.equal(thisMonth.elapsedDays, 18);
  assert.equal(thisMonth.isIncompleteCurrentPeriod, true);
  assert.equal(thisMonth.comparisonIsElapsedMatch, true);
  assert.equal(thisMonth.comparisonStart.getMonth(), 9); // Oct
  assert.equal(thisMonth.comparisonStart.getDate(), 1);
  assert.equal(thisMonth.comparisonEnd.getDate(), 18);

  const lastMonth = resolveRadarWindow('last_month', undefined, undefined, NOW);
  assert.equal(lastMonth.isIncompleteCurrentPeriod, false);
  assert.equal(lastMonth.elapsedDays, 31); // Oct has 31 days

  const custom = resolveRadarWindow('custom', '2026-11-10', '2026-11-15', NOW);
  assert.equal(custom.elapsedDays, 6);
  assert.equal(custom.start.getDate(), 10);
  assert.equal(custom.end.getDate(), 15);
});

test('computeRadarOverview computes accurate spend, excluded cancelled/refunded, avg daily, and budget stats without fabricating income', () => {
  const sample: Transaction[] = [
    tx('t1', 'Basmati Rice', 600, 'Groceries', 2026, 10, 2),
    tx('t2', 'Cola Pack', 200, 'Snacks & Beverages', 2026, 10, 10),
    tx('t3', 'Refunded Item', 500, 'Electronics', 2026, 10, 12, { status: 'refunded', refundAmount: 350 }), // net 150
    tx('t4', 'Cancelled Item', 999, 'Groceries', 2026, 10, 14, { status: 'cancelled' }), // excluded
    // Prior month (Oct 1-18 elapsed match = 1200; Oct 25 excluded from elapsed match!)
    tx('p1', 'Oct Rice', 1200, 'Groceries', 2026, 9, 5),
    tx('p2', 'Oct Late Purchase', 900, 'Electronics', 2026, 9, 25),
  ];

  const window = resolveRadarWindow('this_month', undefined, undefined, NOW);
  const overview = computeRadarOverview({
    transactions: sample,
    totalBudget: 5000,
    window,
    now: NOW,
  });

  assert.equal(overview.totalSpent, 950);
  assert.equal(overview.prevTotalSpent, 1200);
  assert.equal(overview.spendDeltaAmount, -250);
  assert.equal(overview.spendDeltaPct, -20.83);
  assert.equal(overview.txCount, 3);
  assert.equal(overview.avgDailySpend, 52.78); // 950 / 18
  assert.equal(overview.highestCategory?.category, 'Groceries');
  assert.equal(overview.highestCategory?.amount, 600);
  assert.equal(overview.monthlyBudget, 5000);
  assert.equal(overview.remainingBudget, 4050);
  assert.equal(overview.budgetUtilisationPct, 19);
  assert.equal(overview.hasIncomeTracking, false);
});

test('computeCategoryAnalytics merges categories, computes shares, previous deltas, and cap statuses', () => {
  const sample: Transaction[] = [
    tx('1', 'Rice', 700, 'Groceries', 2026, 10, 3),
    tx('2', 'Dal', 300, 'Groceries', 2026, 10, 11),
    tx('3', 'Chips', 300, 'Snacks & Beverages', 2026, 10, 12),
    tx('4', 'Oct Chips', 200, 'Snacks & Beverages', 2026, 9, 4),
    tx('5', 'Oct Groceries', 1000, 'Groceries', 2026, 9, 5),
  ];

  const window = resolveRadarWindow('this_month', undefined, undefined, NOW);
  const res = computeCategoryAnalytics({
    transactions: sample,
    categories: ['Groceries', 'Snacks & Beverages', 'Fuel & Transportation'],
    categoryCaps: { 'Snacks & Beverages': 250, Groceries: 2000 },
    window,
    now: NOW,
  });

  const groc = res.categories.find((c) => c.category === 'Groceries')!;
  const snacks = res.categories.find((c) => c.category === 'Snacks & Beverages')!;

  assert.equal(groc.totalSpent, 1000);
  assert.equal(groc.sharePct, 76.92);
  assert.equal(groc.txCount, 2);
  assert.equal(groc.avgTxValue, 500);
  assert.equal(groc.trend, 'stable');
  assert.equal(groc.isOverCap, false);

  assert.equal(snacks.totalSpent, 300);
  assert.equal(snacks.deltaPct, 50);
  assert.equal(snacks.trend, 'increasing');
  assert.equal(snacks.isOverCap, true);
  assert.equal(snacks.capRemaining, -50);
  assert.ok(res.categoryInsights.length >= 2);
});

test('computeSpendingTrends calculates daily/weekly/monthly/yearly buckets, min/max days, and avoids over-labeling minor noise', () => {
  const sample: Transaction[] = [
    tx('1', 'Shop 1', 100, 'Groceries', 2026, 10, 2),
    tx('2', 'Shop 2', 105, 'Groceries', 2026, 10, 5),
    tx('3', 'Shop 3', 102, 'Groceries', 2026, 10, 10),
    tx('4', 'Shop 4', 98, 'Groceries', 2026, 10, 15),
  ];

  const window = resolveRadarWindow('this_month', undefined, undefined, NOW);
  const dailyTrends = computeSpendingTrends({
    transactions: sample,
    granularity: 'daily',
    window,
    now: NOW,
  });

  assert.equal(dailyTrends.highestSpendingDay?.amount, 105);
  assert.equal(dailyTrends.lowestActiveDay?.amount, 98);
  assert.equal(dailyTrends.overallTrend, 'stable');

  const yearlyTrends = computeSpendingTrends({
    transactions: sample,
    granularity: 'yearly',
    window,
    now: NOW,
  });
  assert.ok(yearlyTrends.points.some((p) => p.label === '2026' && p.spent === 405));
});

test('computePeriodComparison computes exact monthly reductions and handles zero baselines safely', () => {
  const sample: Transaction[] = [
    tx('c1', 'Nov Groceries', 400, 'Groceries', 2026, 10, 4),
    tx('c2', 'Nov Transport', 600, 'Fuel & Transportation', 2026, 10, 8),
    tx('p1', 'Oct Groceries', 1200, 'Groceries', 2026, 9, 4),
  ];

  const window = resolveRadarWindow('this_month', undefined, undefined, NOW);
  const comp = computePeriodComparison({
    transactions: sample,
    preset: 'month_over_month',
    selectedWindow: window,
    now: NOW,
  });

  assert.equal(comp.currentSpent, 1000);
  assert.equal(comp.previousSpent, 1200);
  assert.equal(comp.amountDiff, -200);
  assert.equal(comp.pctChange, -16.67);
  assert.ok(comp.fairElapsedNote !== null);

  const transportDelta = comp.categoryDeltas.find((d) => d.category === 'Fuel & Transportation')!;
  assert.equal(transportDelta.previousSpent, 0);
  assert.equal(transportDelta.pctChange, null); // safe zero baseline
});

test('computeRadarBudgetMonitor tracks budget utilisation, exceeded caps, and remaining allowances', () => {
  const sample: Transaction[] = [
    tx('1', 'Snacks A', 300, 'Snacks & Beverages', 2026, 10, 3),
    tx('2', 'Groceries A', 500, 'Groceries', 2026, 10, 5),
  ];
  const monitor = computeRadarBudgetMonitor({
    transactions: sample,
    totalBudget: 1000,
    categories: ['Groceries', 'Snacks & Beverages'],
    categoryCaps: { 'Snacks & Beverages': 200, Groceries: 800 },
    now: NOW,
  });

  assert.equal(monitor.totalMonthSpent, 800);
  assert.equal(monitor.remainingBudget, 200);
  assert.equal(monitor.utilisationPct, 80);
  assert.equal(monitor.categoriesExceedingCount, 1);
  assert.equal(monitor.categoriesWithinCapCount, 1);
  assert.ok(monitor.insights.some((i) => i.includes('exceeded by ₹100')));
});

test('detectUnusualSpending flags genuine statistical outliers while staying silent on sparse history', () => {
  const window = resolveRadarWindow('this_month', undefined, undefined, NOW);

  // Sparse history (< 4 transactions): must return 0 false anomalies
  const sparse = [
    tx('s1', 'First Setup', 1500, 'Electronics', 2026, 10, 2),
    tx('s2', 'Rice', 100, 'Groceries', 2026, 10, 3),
  ];
  assert.equal(detectUnusualSpending({ transactions: sparse, window, now: NOW }).length, 0);

  // Established history with one clear 5x outlier
  const rich: Transaction[] = [
    tx('g1', 'Milk & Bread', 90, 'Groceries', 2026, 9, 2),
    tx('g2', 'Eggs & Curd', 100, 'Groceries', 2026, 9, 9),
    tx('g3', 'Atta 5kg', 110, 'Groceries', 2026, 9, 16),
    tx('g4', 'Veggies', 95, 'Groceries', 2026, 9, 23),
    tx('g5', 'Mega Bulk Party Order', 950, 'Groceries', 2026, 10, 14),
  ];
  const anomalies = detectUnusualSpending({ transactions: rich, window, now: NOW });
  assert.ok(anomalies.some((a) => a.kind === 'transaction_outlier' && a.subject === 'Mega Bulk Party Order'));
});

test('generateRadarInsights grounds every number and marks savings opportunities as estimates', () => {
  const sample: Transaction[] = [
    tx('1', 'Chips', 200, 'Snacks & Beverages', 2026, 10, 2),
    tx('2', 'Chips', 200, 'Snacks & Beverages', 2026, 10, 6),
    tx('3', 'Rice', 600, 'Groceries', 2026, 10, 9),
  ];
  const window = resolveRadarWindow('this_month', undefined, undefined, NOW);
  const overview = computeRadarOverview({ transactions: sample, totalBudget: 2000, window, now: NOW });
  const cats = computeCategoryAnalytics({
    transactions: sample,
    categories: ['Groceries', 'Snacks & Beverages'],
    categoryCaps: {},
    window,
    now: NOW,
  });
  const trends = computeSpendingTrends({ transactions: sample, granularity: 'daily', window, now: NOW });
  const budget = computeRadarBudgetMonitor({
    transactions: sample,
    totalBudget: 2000,
    categories: ['Groceries', 'Snacks & Beverages'],
    categoryCaps: {},
    now: NOW,
  });
  const anomalies = detectUnusualSpending({ transactions: sample, window, now: NOW });
  const insights = generateRadarInsights({
    overview,
    categoriesResult: cats,
    trendsResult: trends,
    budgetResult: budget,
    anomalies,
  });

  const est = insights.find((i) => i.kind === 'savings_estimate');
  assert.ok(est);
  assert.equal(est.isEstimate, true);
  assert.ok(est.description.includes('₹40')); // 10% of 400 snacks
});

test('queryRadarTransactions supports search, category/date filter, sorting, and top stats', () => {
  const sample: Transaction[] = [
    tx('1', 'Basmati Rice', 400, 'Groceries', 2026, 10, 1),
    tx('2', 'Sparkling Cola', 80, 'Snacks & Beverages', 2026, 10, 5),
    tx('3', 'Cold Brew', 180, 'Snacks & Beverages', 2026, 10, 12),
    tx('4', 'Cancelled', 900, 'Electronics', 2026, 10, 15, { status: 'cancelled' }),
  ];

  const result = queryRadarTransactions(sample, {
    category: 'Snacks & Beverages',
    sortBy: 'amount_desc',
  });
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].tx.name, 'Cold Brew');
  assert.equal(result.totalEffectiveSpend, 260);
  assert.equal(result.mostFrequentCategories[0].category, 'Snacks & Beverages');
});

test('buildRadarFinancialReport, CSV export, and HTML report output accurate totals and escape commas cleanly', () => {
  const sample: Transaction[] = [
    tx('1', 'Rice, 5kg Pack', 500, 'Groceries', 2026, 10, 4),
    tx('2', 'Movie Night', 350, 'Entertainment', 2026, 10, 10),
  ];
  const report = buildRadarFinancialReport({
    transactions: sample,
    categories: ['Groceries', 'Entertainment'],
    categoryCaps: { Entertainment: 300 },
    totalBudget: 5000,
    periodPreset: 'monthly',
    now: NOW,
  });

  assert.equal(report.totalExpenditure, 850);
  assert.equal(report.transactionCount, 2);
  assert.equal(report.categoryBreakdown.length, 2);

  const csv = buildRadarReportCsv(report, sample);
  assert.ok(csv.includes('"Rice, 5kg Pack"'));
  assert.ok(csv.includes('850'));

  const html = buildRadarReportHtml(report);
  assert.ok(html.includes('CartAudit — Radar Room Financial Report'));
  assert.ok(html.includes('Movie Night'));
});
