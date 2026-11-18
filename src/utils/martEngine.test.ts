import test from 'node:test';
import assert from 'node:assert/strict';
import type { CartItem, CategoryConfig, PricePoint, Transaction } from '../types/models';
import {
  areUnitsCompatible,
  buildCheckoutBreakdown,
  buildCheckoutSignature,
  calculateMonthlyShoppingSpend,
  computeUnitPriceStats,
  filterAndSortProducts,
  getDueRecurringItems,
  getNextDueDateString,
  isDuplicateCheckoutAttempt,
  isRecurringItemDue,
  parseUnitSpec,
  reorderCategoryList,
} from './martEngine';

test('parseUnitSpec parses weight, volume, count, and duration accurately', () => {
  const halfLitre = parseUnitSpec('500 ml');
  assert.equal(halfLitre.family, 'volume');
  assert.equal(halfLitre.canonicalAmount, 0.5);

  const oneLitre = parseUnitSpec('1 litre');
  assert.equal(oneLitre.family, 'volume');
  assert.equal(oneLitre.canonicalAmount, 1);

  const halfKg = parseUnitSpec('500 g');
  assert.equal(halfKg.family, 'weight');
  assert.equal(halfKg.canonicalAmount, 0.5);

  const dozen = parseUnitSpec('1 dozen');
  assert.equal(dozen.family, 'count');
  assert.equal(dozen.canonicalAmount, 12);
});

test('areUnitsCompatible allows cross-scale units within same family and blocks mismatches', () => {
  const mlToL = areUnitsCompatible('500 ml', '1 L');
  assert.equal(mlToL.compatible, true);
  assert.equal(mlToL.conversionMultiplier, 2);

  const gToKg = areUnitsCompatible('250 g', '1 kg');
  assert.equal(gToKg.compatible, true);
  assert.equal(gToKg.conversionMultiplier, 4);

  const mismatch = areUnitsCompatible('1 kg', '6 pcs');
  assert.equal(mismatch.compatible, false);
  assert.match(mismatch.reason ?? '', /Incompatible/);
});

test('computeUnitPriceStats normalizes compatible units, excludes incompatible units, and distinguishes sources', () => {
  const points: PricePoint[] = [
    { date: '2026-01-10T00:00:00.000Z', price: 56, unit: '1 L', source: 'market_verified' },
    { date: '2026-02-10T00:00:00.000Z', price: 32, unit: '500 ml', source: 'user_purchase' }, // normalized -> 64 for 1 L
    { date: '2026-03-10T00:00:00.000Z', price: 999, unit: '1 kg', source: 'estimated' }, // incompatible!
    { date: '2026-04-10T00:00:00.000Z', price: 66, unit: '1 L', source: 'user_purchase' },
  ];

  const stats = computeUnitPriceStats(points, '1 L');
  assert.ok(stats);
  assert.equal(stats.compatiblePoints.length, 3);
  assert.equal(stats.excludedIncompatibleCount, 1);
  assert.equal(stats.userPurchaseCount, 2);
  assert.equal(stats.referenceCount, 1);
  assert.equal(stats.min, 56);
  assert.equal(stats.max, 66);
  assert.equal(stats.average, 62); // (56 + 64 + 66) / 3
  assert.equal(stats.deltaFromFirst, 10);
});

test('filterAndSortProducts searches name/category/type, filters flags, and sorts reliably', () => {
  const sample: CartItem[] = [
    { id: '1', name: 'Basmati Rice', price: 120, category: 'Groceries', icon: '🍚', quantity: 0, unit: '1 kg', productType: 'Staple Grain', isFavourite: true, purchaseCount: 4, lastPurchasedAt: '2026-04-01T10:00:00.000Z' },
    { id: '2', name: 'Milk', price: 60, category: 'Dairy & Bakery', icon: '🥛', quantity: 0, unit: '1 L', productType: 'Dairy', isFrequent: true, recurrence: { frequency: 'daily' }, lastPurchasedAt: '2026-04-10T10:00:00.000Z' },
    { id: '3', name: 'Dark Chocolate', price: 50, category: 'Snacks & Beverages', icon: '🍫', quantity: 0, unit: '1 bar', productType: 'Confectionery' },
  ];

  assert.equal(filterAndSortProducts(sample, { query: 'grain' }).length, 1);
  assert.equal(filterAndSortProducts(sample, { query: 'dairy' }).length, 1);
  assert.equal(filterAndSortProducts(sample, { onlyFavourites: true })[0].id, '1');
  assert.equal(filterAndSortProducts(sample, { onlyRecurring: true })[0].id, '2');
  assert.equal(filterAndSortProducts(sample, { minPrice: 55, maxPrice: 100 })[0].id, '2');

  const sortedAsc = filterAndSortProducts(sample, { sortBy: 'price_asc' });
  assert.deepEqual(sortedAsc.map((i) => i.id), ['3', '2', '1']);

  const sortedRecent = filterAndSortProducts(sample, { sortBy: 'recent' });
  assert.equal(sortedRecent[0].id, '2');
});

test('recurring schedule evaluation identifies due items and advances nextDueDate cleanly', () => {
  const now = new Date('2026-04-12T09:00:00.000Z');
  const dueItem: CartItem = {
    id: 'milk',
    name: 'Milk',
    price: 60,
    category: 'Dairy & Bakery',
    icon: '🥛',
    quantity: 0,
    recurrence: { frequency: 'daily', nextDueDate: '2026-04-12' },
  };
  const futureItem: CartItem = {
    id: 'rice',
    name: 'Rice',
    price: 90,
    category: 'Groceries',
    icon: '🍚',
    quantity: 0,
    recurrence: { frequency: 'monthly', nextDueDate: '2026-05-01' },
  };

  assert.equal(isRecurringItemDue(dueItem, now), true);
  assert.equal(isRecurringItemDue(futureItem, now), false);
  assert.deepEqual(getDueRecurringItems([dueItem, futureItem], now).map((i) => i.id), ['milk']);
  assert.equal(getNextDueDateString({ frequency: 'weekly' }, new Date(2026, 3, 12)), '2026-04-19');
});

test('checkout breakdown and idempotency guard compute totals and block rapid double submits', () => {
  const items: CartItem[] = [
    { id: '1', name: 'Milk', price: 60, category: 'Dairy & Bakery', icon: '🥛', quantity: 2 },
    { id: '2', name: 'Rice', price: 90, category: 'Groceries', icon: '🍚', quantity: 1 },
    { id: '3', name: 'Unused', price: 100, category: 'Groceries', icon: '📦', quantity: 0 },
  ];

  const summary = buildCheckoutBreakdown(items);
  assert.equal(summary.totalAmount, 210);
  assert.equal(summary.totalCount, 3);
  assert.equal(summary.dominantCategory, 'Dairy & Bakery');

  const sig = buildCheckoutSignature(items, 'nosplit');
  assert.equal(isDuplicateCheckoutAttempt({ signature: sig, at: 1000 }, sig, 2000), true);
  assert.equal(isDuplicateCheckoutAttempt({ signature: sig, at: 1000 }, sig, 6000), false);
});

test('calculateMonthlyShoppingSpend sums only current month transactions and reorderCategoryList updates order', () => {
  const txs: Transaction[] = [
    { id: 'a', name: 'Milk', amount: 120, category: 'Dairy & Bakery', timestamp: '2026-04-05T10:00:00.000Z' },
    { id: 'b', name: 'Old', amount: 500, category: 'Groceries', timestamp: '2026-03-05T10:00:00.000Z' },
  ];
  assert.equal(calculateMonthlyShoppingSpend(txs, new Date('2026-04-15T10:00:00.000Z')), 120);

  const cats: CategoryConfig[] = [
    { id: '1', name: 'A', iconKey: 'wheat', accent: 'emerald', order: 0 },
    { id: '2', name: 'B', iconKey: 'apple', accent: 'lime', order: 1 },
    { id: '3', name: 'C', iconKey: 'milk', accent: 'sky', order: 2 },
  ];
  const reordered = reorderCategoryList(cats, 2, 0);
  assert.deepEqual(reordered.map((c) => c.id), ['3', '1', '2']);
  assert.deepEqual(reordered.map((c) => c.order), [0, 1, 2]);
});
