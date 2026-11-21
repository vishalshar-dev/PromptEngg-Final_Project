import test from 'node:test';
import assert from 'node:assert/strict';
import type {
  BasketTemplate,
  CartItem,
  CategoryConfig,
  PriceHistory,
  PricePoint,
  PurchaseSession,
  Transaction,
} from '../types/models';
import {
  applyAutoRecurrenceToItems,
  applyBasketTemplateToItems,
  areUnitsCompatible,
  buildBasketItemsFromCart,
  buildBasketItemsFromSession,
  buildCheckoutBreakdown,
  buildCheckoutSignature,
  buildReceiptPurchaseSession,
  calculateCartTotals,
  calculateMonthlyShoppingSpend,
  computeBasketSavedTotal,
  computeFrequentlyPurchasedInsights,
  computeRecentlyPurchasedItems,
  computeRunningLowItems,
  computeUnitPriceStats,
  evaluateBasketTemplate,
  expandCartLines,
  filterAndSortProducts,
  getActiveVariant,
  getDueRecurringItems,
  getItemVariantCartQty,
  getNextDueDateString,
  getPriceHistoryPointsForItem,
  getSearchSuggestions,
  inferRecurrenceFromHistory,
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

test('basket template helpers preserve multi-variant & decimal lines, evaluate inflation diffs, and load in merge vs replace modes', () => {
  const catalogBefore: CartItem[] = [
    {
      id: 'milk',
      name: 'Fresh Milk',
      brand: 'Amul',
      price: 56,
      category: 'Dairy & Bakery',
      icon: '🥛',
      quantity: 3,
      selectedVariantId: 'v-1l',
      variants: [
        { id: 'v-500', label: '500 ml', unit: '500 ml', price: 29 },
        { id: 'v-1l', label: '1 L', unit: '1 L', price: 56 },
      ],
      variantQuantities: { 'v-500': 1, 'v-1l': 2 },
    },
    {
      id: 'tomatoes',
      name: 'Tomatoes',
      price: 40,
      category: 'Fruits & Vegetables',
      icon: '🍅',
      quantity: 1.5,
      unit: '1 kg',
      allowDecimalQuantity: true,
      quantityStep: 0.5,
    },
  ];

  const tplItems = buildBasketItemsFromCart(catalogBefore);
  assert.equal(tplItems.length, 3);
  assert.equal(computeBasketSavedTotal(tplItems), 29 + 56 * 2 + 40 * 1.5); // 201

  const basket: BasketTemplate = {
    id: 'b-weekly',
    name: 'Weekly Test',
    items: [
      ...tplItems,
      {
        itemId: 'deleted-custom',
        name: 'Artisan Jam',
        category: 'Groceries',
        unit: '250 g',
        quantity: 1,
        savedPrice: 120,
      },
    ],
    savedTotal: 321,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  };

  // Catalog prices changed: Milk 1L went 56 -> 60 (+4/unit = +8 total), Tomatoes 40 -> 36 (-4/kg = -6 total)
  const catalogUpdated: CartItem[] = [
    {
      ...catalogBefore[0],
      quantity: 1,
      variantQuantities: { 'v-1l': 1 },
      variants: [
        { id: 'v-500', label: '500 ml', unit: '500 ml', price: 29 },
        { id: 'v-1l', label: '1 L', unit: '1 L', price: 60 },
      ],
    },
    { ...catalogBefore[1], price: 36, quantity: 0 },
  ];

  const evaluated = evaluateBasketTemplate(basket, catalogUpdated);
  assert.equal(evaluated.savedTotal, 321);
  assert.equal(evaluated.currentTotal, 323); // 201 + 8 - 6 + 120
  assert.equal(evaluated.priceDiff, 2);
  assert.equal(evaluated.missingItemsCount, 1);

  // Merge mode adds onto existing 1x Milk 1L -> Milk 1L becomes 3, Milk 500ml becomes 1, Tomatoes 1.5, custom recreated 1
  const merged = applyBasketTemplateToItems(catalogUpdated, basket, 'merge');
  assert.equal(merged.loadedLinesCount, 4);
  const mergedMilk = merged.nextItems.find((i) => i.id === 'milk')!;
  assert.equal(getItemVariantCartQty(mergedMilk, 'v-1l'), 3);
  assert.equal(getItemVariantCartQty(mergedMilk, 'v-500'), 1);
  assert.equal(merged.nextItems.find((i) => i.id === 'tomatoes')?.quantity, 1.5);
  assert.equal(merged.nextItems.find((i) => i.id === 'deleted-custom')?.quantity, 1);

  // Replace mode resets existing cart first
  const replaced = applyBasketTemplateToItems(catalogUpdated, basket, 'replace');
  const replacedMilk = replaced.nextItems.find((i) => i.id === 'milk')!;
  assert.equal(getItemVariantCartQty(replacedMilk, 'v-1l'), 2);
  assert.equal(getItemVariantCartQty(replacedMilk, 'v-500'), 1);

  // Build from purchase session
  const session: PurchaseSession = {
    id: 'ps-1',
    timestamp: '2026-11-10T10:00:00.000Z',
    items: [
      {
        itemId: 'milk',
        name: 'Fresh Milk',
        category: 'Dairy & Bakery',
        variantId: 'v-500',
        variantLabel: '500 ml',
        unit: '500 ml',
        price: 29,
        quantity: 2,
        subtotal: 58,
      },
    ],
    totalAmount: 58,
    personalShare: 58,
    categoryTotals: { 'Dairy & Bakery': 58 },
    isSplit: false,
  };
  const fromSession = buildBasketItemsFromSession(session, catalogUpdated);
  assert.equal(fromSession.length, 1);
  assert.equal(fromSession[0].variantId, 'v-500');
  assert.equal(fromSession[0].quantity, 2);
  assert.equal(fromSession[0].savedPrice, 29);
});

test('computeRunningLowItems finds recurring items due within 2 days or overdue sorted by urgency', () => {
  const now = new Date(2026, 10, 21, 12, 0, 0); // 2026-11-21
  const items: CartItem[] = [
    {
      id: 'far',
      name: 'Rice',
      price: 100,
      category: 'Groceries',
      icon: '🍚',
      quantity: 0,
      recurrence: { frequency: 'monthly', nextDueDate: '2026-11-30' },
    },
    {
      id: 'soon',
      name: 'Bread',
      price: 45,
      category: 'Dairy & Bakery',
      icon: '🍞',
      quantity: 0,
      recurrence: { frequency: 'weekly', nextDueDate: '2026-11-23' }, // +2d
    },
    {
      id: 'overdue',
      name: 'Milk',
      price: 60,
      category: 'Dairy & Bakery',
      icon: '🥛',
      quantity: 0,
      recurrence: { frequency: 'daily', nextDueDate: '2026-11-19' }, // -2d
    },
  ];

  const runningLow = computeRunningLowItems(items, now);
  assert.equal(runningLow.length, 2);
  assert.equal(runningLow[0].item.id, 'overdue');
  assert.equal(runningLow[0].statusLabel, 'Overdue 2d');
  assert.equal(runningLow[1].item.id, 'soon');
  assert.equal(runningLow[1].statusLabel, 'Due in 2d');
});

test('inferRecurrenceFromHistory and applyAutoRecurrenceToItems auto-detect repeat purchases while respecting manual schedules and dismissals', () => {
  const makeSession = (id: string, timestamp: string, itemIds: string[]): PurchaseSession => ({
    id,
    timestamp,
    items: itemIds.map((itemId) => ({
      itemId,
      name: itemId,
      category: itemId === 'wifi' ? 'Utilities & Bills' : 'Dairy & Bakery',
      unit: '1 unit',
      price: 50,
      quantity: 1,
      subtotal: 50,
    })),
    totalAmount: 50 * itemIds.length,
    personalShare: 50 * itemIds.length,
    categoryTotals: {},
    isSplit: false,
  });

  const milk: CartItem = {
    id: 'milk',
    name: 'Taaza Toned Fresh Milk',
    price: 56,
    category: 'Dairy & Bakery',
    icon: '🥛',
    quantity: 0,
  };
  const bread: CartItem = {
    id: 'bread',
    name: 'Brown Bread',
    price: 45,
    category: 'Dairy & Bakery',
    icon: '🍞',
    quantity: 0,
  };
  const wifi: CartItem = {
    id: 'wifi',
    name: 'Fiber Broadband Bill',
    price: 999,
    category: 'Utilities & Bills',
    productType: 'Broadband',
    icon: '📡',
    quantity: 0,
  };
  const coffeeManual: CartItem = {
    id: 'coffee',
    name: 'Classic Coffee',
    price: 185,
    category: 'Snacks & Beverages',
    icon: '☕',
    quantity: 0,
    recurrence: { frequency: 'monthly', source: 'manual', nextDueDate: '2026-12-01' },
  };
  const dismissedEggs: CartItem = {
    id: 'eggs',
    name: 'Farm Eggs',
    price: 84,
    category: 'Meat & Eggs',
    icon: '🥚',
    quantity: 0,
    autoRecurrenceDismissed: true,
  };

  // 0 orders -> null
  assert.equal(inferRecurrenceFromHistory(milk, []), null);

  // 1 order -> null (not recurring on single buy)
  const oneOrder = [makeSession('s1', '2026-11-01T08:00:00.000Z', ['milk', 'bread'])];
  assert.equal(inferRecurrenceFromHistory(milk, oneOrder), null);

  // 2 orders on same day -> non-bill defaults to weekly, bill defaults to monthly
  const sameDay = [
    makeSession('s1', '2026-11-01T08:00:00.000Z', ['milk', 'wifi']),
    makeSession('s2', '2026-11-01T18:00:00.000Z', ['milk', 'wifi']),
  ];
  const milkSameDay = inferRecurrenceFromHistory(milk, sameDay);
  assert.equal(milkSameDay?.frequency, 'weekly');
  assert.equal(milkSameDay?.source, 'auto');
  assert.equal(milkSameDay?.detectedOrderCount, 2);

  const wifiSameDay = inferRecurrenceFromHistory(wifi, sameDay);
  assert.equal(wifiSameDay?.frequency, 'monthly');
  assert.equal(wifiSameDay?.source, 'auto');

  // Multi-day intervals: daily (1d), weekly (7d), monthly (30d), custom (14d)
  const dailyHistory = [
    makeSession('d1', '2026-11-01T08:00:00.000Z', ['milk']),
    makeSession('d2', '2026-11-02T08:00:00.000Z', ['milk']),
    makeSession('d3', '2026-11-03T08:00:00.000Z', ['milk']),
  ];
  assert.equal(inferRecurrenceFromHistory(milk, dailyHistory)?.frequency, 'daily');

  const weeklyHistory = [
    makeSession('w1', '2026-11-01T08:00:00.000Z', ['milk']),
    makeSession('w2', '2026-11-08T08:00:00.000Z', ['milk']),
  ];
  assert.equal(inferRecurrenceFromHistory(milk, weeklyHistory)?.frequency, 'weekly');

  const monthlyHistory = [
    makeSession('m1', '2026-10-01T08:00:00.000Z', ['wifi']),
    makeSession('m2', '2026-10-31T08:00:00.000Z', ['wifi']),
  ];
  assert.equal(inferRecurrenceFromHistory(wifi, monthlyHistory)?.frequency, 'monthly');

  const customHistory = [
    makeSession('c1', '2026-10-01T08:00:00.000Z', ['bread']),
    makeSession('c2', '2026-10-15T08:00:00.000Z', ['bread']),
  ];
  const customInf = inferRecurrenceFromHistory(bread, customHistory);
  assert.equal(customInf?.frequency, 'custom');
  assert.equal(customInf?.intervalDays, 14);

  // applyAutoRecurrenceToItems preserves manual, respects dismissed, and auto-detects repeat items
  const combinedHistory = [
    ...weeklyHistory,
    makeSession('e1', '2026-11-01T09:00:00.000Z', ['eggs', 'coffee', 'bread']),
    makeSession('e2', '2026-11-05T09:00:00.000Z', ['eggs', 'coffee']),
  ];
  const updated = applyAutoRecurrenceToItems(
    [milk, bread, wifi, coffeeManual, dismissedEggs],
    combinedHistory
  );
  assert.equal(updated.find((i) => i.id === 'milk')?.recurrence?.source, 'auto');
  assert.equal(updated.find((i) => i.id === 'milk')?.recurrence?.frequency, 'weekly');
  assert.equal(updated.find((i) => i.id === 'bread')?.recurrence ?? null, null);
  assert.equal(updated.find((i) => i.id === 'coffee')?.recurrence?.source, 'manual');
  assert.equal(updated.find((i) => i.id === 'coffee')?.recurrence?.nextDueDate, '2026-12-01');
  assert.equal(updated.find((i) => i.id === 'eggs')?.recurrence ?? null, null);
});

test('buildReceiptPurchaseSession turns matched scanned receipt items into sessions for auto-recurring detection', () => {
  const milk: CartItem = {
    id: 'item-milk',
    name: 'Taaza Toned Fresh Milk',
    brand: 'Amul',
    price: 56,
    category: 'Dairy & Bakery',
    icon: '🥛',
    unit: '1 L',
    quantity: 0,
  };

  assert.equal(
    buildReceiptPurchaseSession({
      id: 'ps-empty',
      timestamp: '2026-11-01T10:00:00.000Z',
      merchant: 'Blinkit',
      transactionId: 'tx-0',
      totalAmount: 100,
      matchedItems: [],
    }),
    null
  );

  const s1 = buildReceiptPurchaseSession({
    id: 'ps-r1',
    timestamp: '2026-11-01T10:00:00.000Z',
    merchant: 'Blinkit',
    transactionId: 'tx-1',
    totalAmount: 112,
    matchedItems: [{ item: milk, quantity: 2, subtotal: 112, unitPrice: 56, category: 'Dairy & Bakery' }],
  });
  const s2 = buildReceiptPurchaseSession({
    id: 'ps-r2',
    timestamp: '2026-11-08T10:00:00.000Z',
    merchant: 'Zepto',
    transactionId: 'tx-2',
    totalAmount: 58,
    matchedItems: [{ item: milk, quantity: 1, subtotal: 58, unitPrice: 58, category: 'Dairy & Bakery' }],
  });

  assert.ok(s1 && s2);
  assert.equal(s1.source, 'receipt');
  assert.equal(s1.merchantLabel, 'Blinkit');
  assert.equal(s1.linkedTransactionId, 'tx-1');

  const afterOne = applyAutoRecurrenceToItems([milk], [s1]);
  assert.equal(afterOne[0].recurrence ?? null, null);

  const afterTwo = applyAutoRecurrenceToItems([milk], [s2, s1]);
  assert.equal(afterTwo[0].recurrence?.source, 'auto');
  assert.equal(afterTwo[0].recurrence?.frequency, 'weekly');
  assert.equal(afterTwo[0].recurrence?.detectedOrderCount, 2);
});



