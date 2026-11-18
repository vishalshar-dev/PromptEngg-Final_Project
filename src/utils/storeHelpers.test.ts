import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_ITEMS,
  clampQuantity,
  ensurePriceHistory,
  mergeBackupItems,
  mergeCategories,
  normalizeBackupPayload,
} from './storeHelpers';

test('clampQuantity never goes below zero', () => {
  assert.equal(clampQuantity(0, -1), 0);
  assert.equal(clampQuantity(1, -1), 0);
  assert.equal(clampQuantity(2, 1), 3);
  assert.equal(clampQuantity(2, -5), 0);
});

test('ensurePriceHistory preserves existing history and populates missing items', () => {
  const customHistory = [{ date: '2026-01-01T00:00:00.000Z', price: 99 }];
  const result = ensurePriceHistory(DEFAULT_ITEMS, { 'item-milk': customHistory });
  assert.deepEqual(result['item-milk'], customHistory);
  assert.ok(result['item-eggs'].length >= 2);
});

test('mergeBackupItems preserves default mart items when restoring custom items', () => {
  const merged = mergeBackupItems([
    { id: 'custom-coffee', name: 'Cold Brew', price: 180, category: 'Cafe', icon: '☕', quantity: 0 },
    { id: 'item-milk', name: 'Milk', price: 65, category: 'Groceries', icon: '🥛', quantity: 0 },
  ]);

  assert.equal(merged.length, DEFAULT_ITEMS.length + 1);
  const milk = merged.find((i) => i.id === 'item-milk');
  assert.equal(milk?.price, 65);
  assert.ok(merged.some((i) => i.id === 'item-wifi'));
  assert.ok(merged.some((i) => i.id === 'custom-coffee'));
});

test('mergeCategories combines defaults, imported categories, and item/transaction categories', () => {
  const merged = mergeCategories(
    ['Cafe'],
    [{ id: '1', name: 'Matcha', price: 200, category: 'Drinks', icon: '🍵', quantity: 0 }],
    [{ category: 'Health' }]
  );
  assert.deepEqual(merged, ['Groceries', 'Junk', 'Fuel', 'Bills', 'Cafe', 'Drinks', 'Health']);
});

test('normalizeBackupPayload validates required fields and fills defaults', () => {
  assert.throws(() => normalizeBackupPayload({ foo: 'bar' }), /Invalid backup file/);
  const normalized = normalizeBackupPayload({
    version: 1,
    transactions: [],
  });
  assert.equal(normalized.totalBudget, 5000);
  assert.equal(normalized.sessionBudget, null);
  assert.deepEqual(normalized.customItems, []);
});
