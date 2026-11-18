import test from 'node:test';
import assert from 'node:assert/strict';
import type {
  CartItem,
  CategoryConfig,
  PriceHistory,
  PricePoint,
  PurchaseSession,
  Transaction,
} from '../types/models';
import {
  areUnitsCompatible,
  buildCheckoutBreakdown,
  buildCheckoutSignature,
  calculateCartTotals,
  calculateMonthlyShoppingSpend,
  computeFrequentlyPurchasedInsights,
  computeRecentlyPurchasedItems,
  computeUnitPriceStats,
  expandCartLines,
  filterAndSortProducts,
  getActiveVariant,
  getDueRecurringItems,
  getItemVariantCartQty,
  getNextDueDateString,
  getPriceHistoryPointsForItem,
  getSearchSuggestions,
  isDuplicateCheckoutAttempt,
  isRecurringBillItem,
  isRecurringItemDue,
  parseUnitSpec,
  reorderCategoryList,
  roundQuantity,
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
    { date: '2026-02-10T00:00:00.000Z', price: 32, unit: '500 ml', source: 'user_purchase' },
    { date: '2026-03-10T00:00:00.000Z', price: 999, unit: '1 kg', source: 'estimated' },
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
  assert.equal(stats.average, 62);
  assert.equal(stats.deltaFromFirst, 10);
});

test('filterAndSortProducts searches name/brand/subcategory/tags, filters facets, and sorts reliably', () => {
  const sample: CartItem[] = [
    {
      id: '1',
      name: 'Basmati Rice',
      brand: 'India Gate',
      price: 120,
      category: 'Groceries',
      subcategory: 'Rice & Grains',
      tags: ['biryani', 'staple'],
      icon: '🍚',
      quantity: 0,
      unit: '1 kg',
      productType: 'Essential',
      isFavourite: true,
      purchaseCount: 4,
      createdAt: '2026-04-01T10:00:00.000Z',
      lastPurchasedAt: '2026-04-01T10:00:00.000Z',
    },
    {
      id: '2',
      name: 'Fresh Milk',
      brand: 'Amul',
      price: 60,
      category: 'Dairy & Bakery',
      subcategory: 'Milk',
      icon: '🥛',
      quantity: 0,
      unit: '1 L',
      productType: 'Essential',
      isFrequent: true,
      recurrence: { frequency: 'daily' },
      purchaseCount: 8,
      createdAt: '2026-04-05T10:00:00.000Z',
      lastPurchasedAt: '2026-04-10T10:00:00.000Z',
    },
    {
      id: '3',
      name: 'Dark Chocolate',
      brand: 'Amul',
      price: 50,
      category: 'Snacks & Beverages',
      subcategory: 'Chocolates',
      icon: '🍫',
      quantity: 0,
      unit: '1 bar',
      productType: 'Snack',
      createdAt: '2026-04-12T10:00:00.000Z',
    },
  ];

  assert.equal(filterAndSortProducts(sample, { query: 'biryani' }).length, 1);
  assert.equal(filterAndSortProducts(sample, { query: 'amul' }).length, 2);
  assert.equal(filterAndSortProducts(sample, { brand: 'India Gate' })[0].id, '1');
  assert.equal(filterAndSortProducts(sample, { subcategory: 'Chocolates' })[0].id, '3');
  assert.equal(filterAndSortProducts(sample, { onlyFavourites: true })[0].id, '1');
  assert.equal(filterAndSortProducts(sample, { onlyRecurring: true })[0].id, '2');
  assert.equal(filterAndSortProducts(sample, { minPrice: 55, maxPrice: 100 })[0].id, '2');

  const sortedAsc = filterAndSortProducts(sample, { sortBy: 'price_asc' });
  assert.deepEqual(sortedAsc.map((i) => i.id), ['3', '2', '1']);

  const sortedFreq = filterAndSortProducts(sample, { sortBy: 'frequent' });
  assert.equal(sortedFreq[0].id, '2');

  const sortedNewest = filterAndSortProducts(sample, { sortBy: 'newest' });
  assert.equal(sortedNewest[0].id, '3');
});

test('multi-variant cart lines, decimal weight totals, and breakdown isolate package sizes accurately', () => {
  const rice: CartItem = {
    id: 'rice',
    name: 'Basmati Rice',
    brand: 'Daawat',
    price: 60,
    category: 'Groceries',
    icon: '🌾',
    unit: '1 kg',
    allowDecimalQuantity: true,
    quantityStep: 0.5,
    quantity: 2.5,
  };

  const milk: CartItem = {
    id: 'milk',
    name: 'Fresh Milk',
    brand: 'Amul',
    price: 30,
    category: 'Dairy & Bakery',
    icon: '🥛',
    unit: '500 ml',
    quantity: 3,
    variants: [
      { id: 'v-500ml', label: '500 ml', unit: '500 ml', price: 30 },
      { id: 'v-1l', label: '1 L', unit: '1 L', price: 58 },
    ],
    selectedVariantId: 'v-500ml',
    variantQuantities: {
      'v-500ml': 2,
      'v-1l': 1,
    },
  };

  assert.equal(getActiveVariant(milk, 'v-1l')?.price, 58);
  assert.equal(getItemVariantCartQty(milk, 'v-500ml'), 2);
  assert.equal(getItemVariantCartQty(milk, 'v-1l'), 1);

  const lines = expandCartLines([rice, milk]);
  assert.equal(lines.length, 3);
  assert.equal(lines[0].subtotal, 150); // 2.5 kg * 60 = 150
  assert.equal(lines[1].subtotal, 60);  // 2 * 30 = 60
  assert.equal(lines[2].subtotal, 58);  // 1 * 58 = 58

  const totals = calculateCartTotals([rice, milk]);
  assert.equal(totals.lineCount, 3);
  assert.equal(totals.uniqueProducts, 2);
  assert.equal(totals.totalUnits, 5.5);
  assert.equal(totals.totalAmount, 268);

  const breakdown = buildCheckoutBreakdown([rice, milk]);
  assert.equal(breakdown.totalAmount, 268);
  assert.equal(breakdown.lines.length, 3);
  assert.equal(roundQuantity(2.4999), 2.5);
});

test('real purchase personalization returns empty for no history and computes frequency + priceDiff accurately', () => {
  const catalog: CartItem[] = [
    {
      id: 'milk',
      name: 'Fresh Milk',
      brand: 'Amul',
      price: 34, // rose from 30 -> priceDiff should be +4
      category: 'Dairy & Bakery',
      icon: '🥛',
      unit: '500 ml',
      quantity: 0,
      variants: [
        { id: 'v-500', label: '500 ml', unit: '500 ml', price: 34 },
        { id: 'v-1l', label: '1 L', unit: '1 L', price: 66 },
      ],
    },
    {
      id: 'eggs',
      name: 'Farm Eggs',
      price: 48,
      category: 'Meat & Eggs',
      icon: '🥚',
      unit: '6 pcs',
      quantity: 0,
    },
  ];

  // Zero history -> zero fabricated insights
  assert.deepEqual(computeFrequentlyPurchasedInsights(catalog, []), []);
  assert.deepEqual(computeRecentlyPurchasedItems(catalog, []), []);

  const history: PurchaseSession[] = [
    {
      id: 's1',
      timestamp: '2026-04-01T08:00:00.000Z',
      items: [
        { itemId: 'milk', name: 'Fresh Milk', category: 'Dairy & Bakery', variantId: 'v-500', variantLabel: '500 ml', unit: '500 ml', price: 30, quantity: 2, subtotal: 60 },
      ],
      totalAmount: 60,
      personalShare: 60,
      categoryTotals: { 'Dairy & Bakery': 60 },
      isSplit: false,
    },
    {
      id: 's2',
      timestamp: '2026-04-08T08:00:00.000Z',
      items: [
        { itemId: 'milk', name: 'Fresh Milk', category: 'Dairy & Bakery', variantId: 'v-500', variantLabel: '500 ml', unit: '500 ml', price: 30, quantity: 1, subtotal: 30 },
        { itemId: 'eggs', name: 'Farm Eggs', category: 'Meat & Eggs', unit: '6 pcs', price: 48, quantity: 1, subtotal: 48 },
      ],
      totalAmount: 78,
      personalShare: 78,
      categoryTotals: { 'Dairy & Bakery': 30, 'Meat & Eggs': 48 },
      isSplit: false,
    },
  ];

  const freq = computeFrequentlyPurchasedInsights(catalog, history);
  assert.equal(freq[0].item.id, 'milk');
  assert.equal(freq[0].orderCount, 2);
  assert.equal(freq[0].purchaseCount, 3);
  assert.equal(freq[0].lastPaidPrice, 30);
  assert.equal(freq[0].currentPrice, 34);
  assert.equal(freq[0].priceDiff, 4);

  const recent = computeRecentlyPurchasedItems(catalog, history);
  assert.equal(recent.length, 2);
});

test('getPriceHistoryPointsForItem isolates variant price trends and getSearchSuggestions finds products, brands, and categories', () => {
  const milk: CartItem = {
    id: 'milk',
    name: 'Fresh Milk',
    brand: 'Amul',
    price: 30,
    category: 'Dairy & Bakery',
    tags: ['daily'],
    icon: '🥛',
    quantity: 0,
    variants: [
      { id: 'v-500', label: '500 ml', unit: '500 ml', price: 30 },
      { id: 'v-1l', label: '1 L', unit: '1 L', price: 58 },
    ],
  };
  const history: PriceHistory = {
    'milk::v-500': [{ date: '2026-04-01T00:00:00.000Z', price: 30, unit: '500 ml', source: 'market_verified' }],
    'milk::v-1l': [{ date: '2026-04-01T00:00:00.000Z', price: 58, unit: '1 L', source: 'market_verified' }],
  };

  assert.equal(getPriceHistoryPointsForItem(history, milk, 'v-500')[0].price, 30);
  assert.equal(getPriceHistoryPointsForItem(history, milk, 'v-1l')[0].price, 58);

  const suggestions = getSearchSuggestions([milk], 'amul');
  assert.ok(suggestions.some((s) => s.type === 'brand' && s.label === 'Amul'));

  assert.equal(isRecurringBillItem({ id: 'b1', name: 'Electricity', price: 1200, category: 'Utilities & Bills', icon: '⚡', quantity: 0 }), true);
  assert.equal(isRecurringBillItem(milk), false);
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
