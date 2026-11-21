import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEmptyWorkspacePatch, buildSampleMonthDataset } from './demoDataEngine';
import { computeLedgerState } from './splitLedgerEngine';
import type { CartItem } from '../types/models';

const TEST_CATALOG_ITEMS: CartItem[] = [
  {
    id: 'item-rice',
    name: 'Basmati Rice',
    brand: 'India Gate',
    price: 115,
    category: 'Groceries',
    icon: '🌾',
    quantity: 0,
    unit: '1 kg',
  },
  {
    id: 'item-milk',
    name: 'Taaza Toned Fresh Milk',
    brand: 'Amul',
    price: 56,
    category: 'Dairy & Bakery',
    icon: '🥛',
    quantity: 0,
    unit: '1 L',
  },
  {
    id: 'item-coffee',
    name: 'Classic Instant Coffee',
    brand: 'Nescafe',
    price: 185,
    category: 'Snacks & Beverages',
    icon: '☕',
    quantity: 0,
    unit: '100 g',
  },
];

test('buildSampleMonthDataset anchors current-month transactions on any day of month', () => {
  const earlyMonthRef = new Date(2026, 10, 2, 10, 30, 0); // Nov 2
  const earlyData = buildSampleMonthDataset(earlyMonthRef, TEST_CATALOG_ITEMS);

  const novTxs = earlyData.transactions.filter((tx) => {
    const d = new Date(tx.timestamp);
    return d.getFullYear() === 2026 && d.getMonth() === 10 && tx.status !== 'cancelled' && tx.status !== 'refunded';
  });
  assert.ok(novTxs.length >= 10, 'Early-month sample should still populate current month activity');
  for (const tx of earlyData.transactions) {
    assert.ok(
      new Date(tx.timestamp).getTime() <= earlyMonthRef.getTime(),
      `Transaction ${tx.id} should never be in the future`
    );
  }
});

test('buildSampleMonthDataset generates valid categories, catalog price observations, and balanced splits', () => {
  const ref = new Date(2026, 10, 21, 14, 0, 0);
  const sample = buildSampleMonthDataset(ref, TEST_CATALOG_ITEMS);
  const validItemIds = new Set(TEST_CATALOG_ITEMS.map((i) => i.id));

  assert.equal(sample.isSampleDataLoaded, true);
  assert.equal(sample.totalBudget, 12000);
  assert.ok(sample.transactions.length >= 14);
  assert.ok(sample.savedAudits.length >= 2);
  assert.ok(sample.priceObservations.length >= 9);
  assert.ok(sample.priceAlerts.length >= 1);

  for (const tx of sample.transactions) {
    assert.ok(tx.category.trim().length > 0);
    assert.ok(Number.isFinite(tx.amount) && tx.amount > 0);
  }

  for (const obs of sample.priceObservations) {
    assert.ok(validItemIds.has(obs.productId), `Invalid catalog item id: ${obs.productId}`);
    assert.ok(obs.unitPrice > 0);
  }

  for (const exp of sample.sharedExpenses) {
    const sumShares = exp.participants.reduce((acc, p) => acc + p.amount, 0);
    assert.ok(Math.abs(sumShares - exp.totalAmount) < 0.05, `Unbalanced split: ${exp.name}`);
  }

  const ledger = computeLedgerState(sample.people, sample.sharedExpenses, sample.settlements);
  assert.equal(Object.keys(ledger.personSummaries).length, 3);
  // Rohan paid 999 Wi-Fi (499.5 share) & user paid dinner 1680 (560 share) -> owes user 60.50
  const rohan = ledger.personSummaries['sample-person-rohan'];
  assert.ok(rohan && Math.abs(rohan.netBalance - 60.5) < 0.01);
  // Kabir owed 480 for groceries, repaid 320 -> owes 160
  const kabir = ledger.personSummaries['sample-person-kabir'];
  assert.ok(kabir && Math.abs(kabir.netBalance - 160) < 0.01);
});

test('buildEmptyWorkspacePatch returns clean empty defaults', () => {
  const patch = buildEmptyWorkspacePatch();
  assert.equal(patch.isSampleDataLoaded, false);
  assert.equal(patch.totalBudget, 5000);
  assert.deepEqual(patch.transactions, []);
  assert.deepEqual(patch.people, []);
  assert.deepEqual(patch.sharedExpenses, []);
  assert.deepEqual(patch.priceObservations, []);
  assert.deepEqual(patch.savedAudits, []);
  assert.equal(patch.isBrokeMode, false);
});
