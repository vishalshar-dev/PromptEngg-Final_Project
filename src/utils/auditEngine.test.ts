import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SAMPLE_RECEIPT_TEXT,
  detectFees,
  normalizeScannedReceipt,
  parseReceiptText,
} from './auditEngine';

test('parseReceiptText extracts merchant, items, fees, taxes, and grand total', () => {
  const parsed = parseReceiptText(SAMPLE_RECEIPT_TEXT);

  assert.equal(parsed.merchant, 'Blinkit');
  assert.equal(parsed.items.length, 4);
  assert.equal(parsed.items[0].name, 'Amul Taaza Milk 500ml');
  assert.equal(parsed.items[0].price, 27);
  assert.equal(parsed.subtotal, 240);
  assert.equal(parsed.deliveryFee, 40); // Handling 15 + Delivery 25
  assert.equal(parsed.taxTotal, 18.5);
  assert.equal(parsed.total, 298.5);
});

test('parseReceiptText strips quantity prefixes and computes total when omitted', () => {
  const raw = `Zepto Express
  2 x Farm Eggs 6pc Rs. 140
  Rain Surge Fee ₹20
  CGST ₹7.00`;

  const parsed = parseReceiptText(raw);
  assert.equal(parsed.merchant, 'Zepto');
  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.items[0].name, 'Farm Eggs 6pc');
  assert.equal(parsed.items[0].price, 140);
  assert.equal(parsed.deliveryFee, 20);
  assert.equal(parsed.taxTotal, 7);
  assert.equal(parsed.total, 167);
});

test('normalizeScannedReceipt sanitizes AI vision JSON and computes missing totals', () => {
  const normalized = normalizeScannedReceipt({
    merchant: '  Zepto  ',
    date: '',
    items: [
      { name: ' Amul Butter 100g ', price: 58 },
      { name: '', price: 10 },
      { name: 'Bad Negative', price: -5 },
    ],
    subtotal: 0,
    taxTotal: 5.5,
    deliveryFee: 25,
    total: 0,
  });

  assert.equal(normalized.merchant, 'Zepto');
  assert.equal(normalized.items.length, 1);
  assert.equal(normalized.items[0].name, 'Amul Butter 100g');
  assert.equal(normalized.subtotal, 58);
  assert.equal(normalized.taxTotal, 5.5);
  assert.equal(normalized.deliveryFee, 25);
  assert.equal(normalized.total, 88.5);
});

test('detectFees flags handling fees, subscriptions, and high junk prices', () => {
  const flags = detectFees([
    { id: '1', name: 'Platform Handling Fee', price: 15, category: 'Bills', icon: '📦', quantity: 1 },
    { id: '2', name: 'Netflix Monthly Subscription', price: 649, category: 'Bills', icon: '🎬', quantity: 1 },
    { id: '3', name: 'Imported Truffle Chips', price: 250, category: 'Junk', icon: '🍟', quantity: 1 },
  ]);

  assert.ok(flags.some((f) => f.type === 'handling_fee' && f.severity === 'critical'));
  assert.ok(flags.some((f) => f.type === 'subscription_trap'));
  assert.ok(flags.some((f) => f.type === 'hidden_charge'));
  assert.ok(flags.some((f) => f.type === 'deceptive_pricing'));
});
