import test from 'node:test';
import assert from 'node:assert/strict';
import type { CartItem, ParsedReceipt, PriceAlert, PriceObservation } from '../types/models';
import {
  buildPriceObservation,
  buildProductPriceSummaries,
  buildReceiptFingerprint,
  calcPercentageChange,
  computeCategoryPriceAnalytics,
  evaluatePriceAlerts,
  extractProductInfo,
  filterAndSortProductSummaries,
  filterObservationsByTimeframe,
  generatePriceInsights,
  normalizeObservationUnit,
  resolveCanonicalProduct,
} from './priceTrackerEngine';

const SAMPLE_CATALOG: CartItem[] = [
  {
    id: 'item-milk',
    name: 'Fresh Milk',
    price: 60,
    category: 'Dairy & Bakery',
    icon: '🥛',
    quantity: 0,
    unit: '1 L',
  },
  {
    id: 'item-rice',
    name: 'Basmati Rice',
    price: 90,
    category: 'Groceries',
    icon: '🍚',
    quantity: 0,
    unit: '1 kg',
  },
  {
    id: 'item-cooking-oil',
    name: 'Sunflower Cooking Oil',
    price: 155,
    category: 'Groceries',
    icon: '🫒',
    quantity: 0,
    unit: '1 L',
  },
  {
    id: 'item-bread',
    name: 'Whole Wheat Bread',
    price: 50,
    category: 'Dairy & Bakery',
    icon: '🍞',
    quantity: 0,
    unit: '1 pack',
  },
];

test('extractProductInfo and resolveCanonicalProduct match branded/sized items to canonical products', () => {
  const info = extractProductInfo('Amul Taaza Milk 500ml');
  assert.equal(info.brand, 'Amul');
  assert.equal(info.packageSize, '500 ml');

  const resolved = resolveCanonicalProduct('Amul Taaza Milk 500ml', SAMPLE_CATALOG);
  assert.equal(resolved.productId, 'item-milk');
  assert.equal(resolved.productName, 'Fresh Milk');
  assert.equal(resolved.category, 'Dairy & Bakery');
  assert.equal(resolved.brand, 'Amul');
  assert.equal(resolved.packageSize, '500 ml');
  assert.equal(resolved.matchedExisting, true);

  const oilResolved = resolveCanonicalProduct('Fortune Sunflower Oil 1L', SAMPLE_CATALOG);
  assert.equal(oilResolved.productId, 'item-cooking-oil');
  assert.equal(oilResolved.brand, 'Fortune');
  assert.equal(oilResolved.packageSize, '1 L');
});

test('normalizeObservationUnit computes consistent per-unit price across 500 ml and 1 L packages', () => {
  const halfLitre = normalizeObservationUnit(1, '500 ml', 27);
  assert.equal(halfLitre.unitOfMeasurement, 'L');
  assert.equal(halfLitre.normalizedQuantity, 0.5);
  assert.equal(halfLitre.unitPrice, 54);

  const twoHalfLitres = normalizeObservationUnit(2, '500 ml', 60);
  assert.equal(twoHalfLitres.unitOfMeasurement, 'L');
  assert.equal(twoHalfLitres.normalizedQuantity, 1);
  assert.equal(twoHalfLitres.unitPrice, 60);

  const halfKg = normalizeObservationUnit(1, '500 g', 55);
  assert.equal(halfKg.unitOfMeasurement, 'kg');
  assert.equal(halfKg.normalizedQuantity, 0.5);
  assert.equal(halfKg.unitPrice, 110);
});

test('calcPercentageChange uses ((New - Old) / Old) * 100 and handles zero/null safely', () => {
  assert.equal(calcPercentageChange(50, 60), 20);
  assert.equal(calcPercentageChange(80, 60), -25);
  assert.equal(calcPercentageChange(0, 60), null);
  assert.equal(calcPercentageChange(null, 60), null);
});

test('buildProductPriceSummaries excludes cancelled/refunded transactions and handles single purchase cleanly', () => {
  const o1 = buildPriceObservation({
    id: 'o1',
    rawName: 'Amul Taaza Milk 500ml',
    totalPrice: 27,
    purchaseDate: '2026-01-05T10:00:00.000Z',
    purchaseSource: 'audit',
    transactionId: 'tx-1',
    catalogItems: SAMPLE_CATALOG,
  });
  const o2 = buildPriceObservation({
    id: 'o2',
    rawName: 'Fresh Milk',
    totalPrice: 60,
    packageSize: '1 L',
    purchaseDate: '2026-02-05T10:00:00.000Z',
    purchaseSource: 'mart',
    transactionId: 'tx-2',
    catalogItems: SAMPLE_CATALOG,
  });
  const oCancelled: PriceObservation = {
    ...buildPriceObservation({
      id: 'o3',
      rawName: 'Fresh Milk',
      totalPrice: 120,
      packageSize: '1 L',
      purchaseDate: '2026-03-05T10:00:00.000Z',
      purchaseSource: 'mart',
      transactionId: 'tx-3',
      catalogItems: SAMPLE_CATALOG,
    }),
    status: 'cancelled',
  };
  const singleRice = buildPriceObservation({
    id: 'o4',
    rawName: 'Basmati Rice',
    totalPrice: 90,
    packageSize: '1 kg',
    purchaseDate: '2026-02-10T10:00:00.000Z',
    purchaseSource: 'mart',
    transactionId: 'tx-4',
    catalogItems: SAMPLE_CATALOG,
  });

  const summaries = buildProductPriceSummaries(
    [o1, o2, oCancelled, singleRice],
    SAMPLE_CATALOG
  );

  const milk = summaries.find((s) => s.productId === 'item-milk');
  assert.ok(milk);
  assert.equal(milk.purchaseCount, 2);
  assert.equal(milk.cancelledOrRefundedCount, 1);
  assert.equal(milk.firstPrice, 54); // 27 for 0.5L => 54/L
  assert.equal(milk.latestPrice, 60);
  assert.equal(milk.averagePrice, 57);
  assert.equal(milk.vsPreviousDiff, 6);
  assert.equal(milk.vsPreviousPct, 11.1);
  assert.equal(milk.trendDirection, 'increasing');

  const rice = summaries.find((s) => s.productId === 'item-rice');
  assert.ok(rice);
  assert.equal(rice.purchaseCount, 1);
  assert.equal(rice.trendDirection, 'single');
  assert.equal(rice.vsPreviousPct, null);
  assert.equal(rice.overallChangePct, null);
});

test('generatePriceInsights returns empty for single-purchase data and avoids fabricating insights', () => {
  const singleObs = [
    buildPriceObservation({
      id: 's1',
      rawName: 'Basmati Rice',
      totalPrice: 90,
      packageSize: '1 kg',
      purchaseDate: '2026-04-01T10:00:00.000Z',
      purchaseSource: 'mart',
      catalogItems: SAMPLE_CATALOG,
    }),
  ];
  const summaries = buildProductPriceSummaries(singleObs, SAMPLE_CATALOG);
  const categories = computeCategoryPriceAnalytics(summaries);
  assert.deepEqual(generatePriceInsights(summaries, categories), []);
  assert.equal(categories[0].avgPriceChangePct, null);
});

test('computeCategoryPriceAnalytics averages per-product % change instead of raw prices across products', () => {
  const obs: PriceObservation[] = [
    // Basmati Rice: 100 -> 120 (+20%)
    buildPriceObservation({
      id: 'r1',
      rawName: 'Basmati Rice',
      totalPrice: 100,
      packageSize: '1 kg',
      purchaseDate: '2026-01-01T10:00:00.000Z',
      purchaseSource: 'mart',
      catalogItems: SAMPLE_CATALOG,
    }),
    buildPriceObservation({
      id: 'r2',
      rawName: 'Basmati Rice',
      totalPrice: 120,
      packageSize: '1 kg',
      purchaseDate: '2026-02-01T10:00:00.000Z',
      purchaseSource: 'mart',
      catalogItems: SAMPLE_CATALOG,
    }),
    // Oil: 200 -> 180 (-10%)
    buildPriceObservation({
      id: 'oil1',
      rawName: 'Sunflower Cooking Oil',
      totalPrice: 200,
      packageSize: '1 L',
      purchaseDate: '2026-01-01T10:00:00.000Z',
      purchaseSource: 'mart',
      catalogItems: SAMPLE_CATALOG,
    }),
    buildPriceObservation({
      id: 'oil2',
      rawName: 'Sunflower Cooking Oil',
      totalPrice: 180,
      packageSize: '1 L',
      purchaseDate: '2026-02-01T10:00:00.000Z',
      purchaseSource: 'mart',
      catalogItems: SAMPLE_CATALOG,
    }),
  ];

  const summaries = buildProductPriceSummaries(obs, SAMPLE_CATALOG);
  const cats = computeCategoryPriceAnalytics(summaries);
  const groceries = cats.find((c) => c.category === 'Groceries');
  assert.ok(groceries);
  assert.equal(groceries.trackedProducts, 2);
  assert.equal(groceries.increasingCount, 1);
  assert.equal(groceries.decreasingCount, 1);
  assert.equal(groceries.avgPriceChangePct, 5); // (+20% + -10%) / 2 = +5%

  const insights = generatePriceInsights(summaries, cats);
  assert.ok(insights.length >= 2);
  assert.ok(insights.some((i) => i.kind === 'increase' && i.productId === 'item-rice'));
  assert.ok(insights.some((i) => i.kind === 'decrease' && i.productId === 'item-cooking-oil'));
});

test('evaluatePriceAlerts triggers only for enabled alerts on new actual purchases', () => {
  const prevObs = buildPriceObservation({
    id: 'm1',
    rawName: 'Fresh Milk',
    totalPrice: 55,
    packageSize: '1 L',
    purchaseDate: '2026-01-01T10:00:00.000Z',
    purchaseSource: 'mart',
    catalogItems: SAMPLE_CATALOG,
  });
  const prevSummaries = buildProductPriceSummaries([prevObs], SAMPLE_CATALOG);

  const alerts: PriceAlert[] = [
    {
      id: 'a1',
      productId: 'item-milk',
      productName: 'Fresh Milk',
      unitOfMeasurement: 'L',
      targetUnitPrice: 50,
      increaseThresholdPct: 15,
      enabled: true,
      createdAt: '2026-01-01T10:00:00.000Z',
    },
  ];

  // New purchase jumps from 55 to 66 (+20% >= 15%)
  const spikeObs = buildPriceObservation({
    id: 'm2',
    rawName: 'Fresh Milk',
    totalPrice: 66,
    packageSize: '1 L',
    purchaseDate: '2026-02-01T10:00:00.000Z',
    purchaseSource: 'mart',
    catalogItems: SAMPLE_CATALOG,
  });

  const { triggered } = evaluatePriceAlerts([spikeObs], prevSummaries, alerts);
  assert.equal(triggered.length, 1);
  assert.equal(triggered[0].reason, 'price_spike');

  // Target price reached via 500ml at 24 (48/L <= 50)
  const dropObs = buildPriceObservation({
    id: 'm3',
    rawName: 'Amul Taaza Milk 500ml',
    totalPrice: 24,
    purchaseDate: '2026-03-01T10:00:00.000Z',
    purchaseSource: 'audit',
    catalogItems: SAMPLE_CATALOG,
  });
  const { triggered: dropTriggered } = evaluatePriceAlerts([dropObs], prevSummaries, alerts);
  assert.equal(dropTriggered.length, 1);
  assert.equal(dropTriggered[0].reason, 'target_reached');

  // Manual estimate must NOT trigger purchase alerts
  const estimateObs = buildPriceObservation({
    id: 'm4',
    rawName: 'Fresh Milk',
    totalPrice: 40,
    packageSize: '1 L',
    purchaseSource: 'manual',
    entryKind: 'manual_estimate',
    catalogItems: SAMPLE_CATALOG,
  });
  const { triggered: estTriggered } = evaluatePriceAlerts([estimateObs], prevSummaries, alerts);
  assert.equal(estTriggered.length, 0);
});

test('filterObservationsByTimeframe, filterAndSortProductSummaries, and buildReceiptFingerprint behave deterministically', () => {
  const now = new Date('2026-05-01T12:00:00.000Z');
  const obs: PriceObservation[] = [
    buildPriceObservation({
      id: 't1',
      rawName: 'Fresh Milk',
      totalPrice: 54,
      packageSize: '1 L',
      purchaseDate: '2025-01-01T10:00:00.000Z',
      purchaseSource: 'mart',
      catalogItems: SAMPLE_CATALOG,
    }),
    buildPriceObservation({
      id: 't2',
      rawName: 'Fresh Milk',
      totalPrice: 60,
      packageSize: '1 L',
      purchaseDate: '2026-04-20T10:00:00.000Z',
      purchaseSource: 'mart',
      catalogItems: SAMPLE_CATALOG,
    }),
  ];

  assert.equal(filterObservationsByTimeframe(obs, '30d', now).length, 1);
  assert.equal(filterObservationsByTimeframe(obs, 'all', now).length, 2);

  const summaries = buildProductPriceSummaries(obs, SAMPLE_CATALOG);
  const searched = filterAndSortProductSummaries(summaries, { query: 'milk', trendFilter: 'increasing' });
  assert.equal(searched.length, 1);

  const r1: ParsedReceipt = {
    merchant: 'Blinkit',
    date: '2026-11-17T12:00:00.000Z',
    items: [
      { name: 'Amul Taaza Milk 500ml', price: 27 },
      { name: 'Bread', price: 48 },
    ],
    subtotal: 75,
    taxTotal: 0,
    deliveryFee: 0,
    total: 75,
  };
  const r2: ParsedReceipt = {
    ...r1,
    items: [...r1.items].reverse(),
  };
  assert.equal(buildReceiptFingerprint(r1), buildReceiptFingerprint(r2));
});
