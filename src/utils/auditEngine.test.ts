import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SAMPLE_RECEIPT_TEXT,
  detectCartSurcharges,
  detectFees,
  detectReceiptFees,
  detectTransactionFees,
  enrichReceiptWithCatalog,
  normalizeScannedReceipt,
  parseReceiptText,
} from './auditEngine';
import { inferCategoryFromName } from './priceTrackerEngine';

test('parseReceiptText extracts merchant, items, fees, taxes, and grand total', () => {
  const parsed = parseReceiptText(SAMPLE_RECEIPT_TEXT);

  assert.equal(parsed.merchant, 'Blinkit');
  assert.equal(parsed.items.length, 4);
  assert.equal(parsed.items[0].name, 'Amul Taaza Milk 500ml');
  assert.equal(parsed.items[0].price, 27);
  assert.equal(parsed.items[0].category, 'Dairy & Bakery');
  assert.equal(parsed.items[0].unit, '500 ml');
  assert.equal(parsed.subtotal, 240);
  assert.equal(parsed.deliveryFee, 40); // Handling 15 + Delivery 25
  assert.equal(parsed.taxTotal, 18.5);
  assert.equal(parsed.total, 298.5);
});

test('parseReceiptText handles multi-line quick-commerce receipts and strikethrough MRP', () => {
  const multiline = `Swiggy Instamart
  Amul Taaza Toned Milk
  500 ml
  ₹27
  Paracetamol 650mg Strip
  ₹35
  Lay's Magic Masala ₹30 ₹20
  Handling charge
  ₹15
  Grand total
  ₹97`;

  const parsed = parseReceiptText(multiline);
  assert.equal(parsed.merchant, 'Swiggy Instamart');
  assert.equal(parsed.items.length, 3);
  assert.equal(parsed.items[0].name, 'Amul Taaza Toned Milk 500 ml');
  assert.equal(parsed.items[0].price, 27);
  assert.equal(parsed.items[0].category, 'Dairy & Bakery');
  assert.equal(parsed.items[1].name, 'Paracetamol 650mg Strip');
  assert.equal(parsed.items[1].price, 35);
  assert.equal(parsed.items[1].category, 'Medicines & Healthcare');
  assert.equal(parsed.items[2].name, "Lay's Magic Masala");
  assert.equal(parsed.items[2].price, 20);
  assert.equal(parsed.deliveryFee, 15);
  assert.equal(parsed.total, 97);
});

test('parseReceiptText strips quantity prefixes, parses [Category] tags, and computes total when omitted', () => {
  const raw = `Zepto Express
  2 x Farm Eggs 6pc Rs. 140
  Artisan Ceramic Mug [Home Decor] Rs. 299
  Rain Surge Fee ₹20
  CGST ₹7.00`;

  const parsed = parseReceiptText(raw);
  assert.equal(parsed.merchant, 'Zepto');
  assert.equal(parsed.items.length, 2);
  assert.equal(parsed.items[0].name, 'Farm Eggs 6pc');
  assert.equal(parsed.items[0].price, 140);
  assert.equal(parsed.items[0].category, 'Meat & Eggs');
  assert.equal(parsed.items[1].name, 'Artisan Ceramic Mug');
  assert.equal(parsed.items[1].category, 'Home Decor');
  assert.equal(parsed.deliveryFee, 20);
  assert.equal(parsed.taxTotal, 7);
  assert.equal(parsed.total, 466);
});

test('normalizeScannedReceipt sanitizes AI vision JSON, preserves categories/units, and computes missing totals', () => {
  const normalized = normalizeScannedReceipt({
    merchant: '  Zepto  ',
    date: '',
    items: [
      { name: ' Amul Butter 100g ', price: 58, category: 'Dairy & Bakery', unit: '100g', brand: 'Amul' },
      { name: 'Paracetamol 650mg Strip', price: 35 },
      { name: '', price: 10 },
      { name: 'Bad Negative', price: -5 },
    ],
    subtotal: 0,
    taxTotal: 5.5,
    deliveryFee: 25,
    total: 0,
  });

  assert.equal(normalized.merchant, 'Zepto');
  assert.equal(normalized.items.length, 2);
  assert.equal(normalized.items[0].name, 'Amul Butter 100g');
  assert.equal(normalized.items[0].category, 'Dairy & Bakery');
  assert.equal(normalized.items[0].unit, '100g');
  assert.equal(normalized.items[1].category, 'Medicines & Healthcare');
  assert.equal(normalized.subtotal, 93);
  assert.equal(normalized.taxTotal, 5.5);
  assert.equal(normalized.deliveryFee, 25);
  assert.equal(normalized.total, 123.5);
});

test('inferCategoryFromName covers Electronics, Medicines, Stationery, Clothing, and Entertainment', () => {
  assert.equal(inferCategoryFromName('USB-C Fast Charger Cable'), 'Electronics');
  assert.equal(inferCategoryFromName('Dolo 650 Tablet'), 'Medicines & Healthcare');
  assert.equal(inferCategoryFromName('Classmate Spiral Notebook'), 'Stationery');
  assert.equal(inferCategoryFromName('Men Cotton T-Shirt'), 'Clothing & Accessories');
  assert.equal(inferCategoryFromName('IMAX Movie Ticket'), 'Entertainment');
});

test('enrichReceiptWithCatalog distinguishes known catalog items from new custom items', () => {
  const catalog = [
    {
      id: 'item-milk',
      name: 'Amul Taaza Milk',
      price: 54,
      category: 'Dairy & Bakery',
      unit: '1 L',
      icon: 'milk',
      quantity: 0,
    },
  ];

  const receipt = parseReceiptText(`Apollo Store
  Amul Taaza Milk 500ml    ₹27.00
  Paracetamol 650mg        ₹35.00
  USB-C Charger Cable      ₹499.00`);

  const enriched = enrichReceiptWithCatalog(receipt, catalog, [], [
    'Dairy & Bakery',
    'Medicines & Healthcare',
    'Electronics',
    'Other Expenses',
  ]);

  assert.equal(enriched.items[0].matchedProductId, 'item-milk');
  assert.equal(enriched.items[0].isNewCatalogItem, false);
  assert.equal(enriched.items[0].category, 'Dairy & Bakery');

  assert.equal(enriched.items[1].matchedProductId, undefined);
  assert.equal(enriched.items[1].isNewCatalogItem, true);
  assert.equal(enriched.items[1].category, 'Medicines & Healthcare');

  assert.equal(enriched.items[2].matchedProductId, undefined);
  assert.equal(enriched.items[2].isNewCatalogItem, true);
  assert.equal(enriched.items[2].category, 'Electronics');
});

test('detectFees flags handling fees, subscriptions, and high junk/snack/utility prices', () => {
  const flags = detectFees([
    { id: '1', name: 'Platform Handling Fee', price: 15, category: 'Bills', icon: '📦', quantity: 1 },
    { id: '2', name: 'Netflix Monthly Subscription', price: 649, category: 'Bills', icon: '🎬', quantity: 1 },
    { id: '3', name: 'Imported Truffle Chips', price: 250, category: 'Junk', icon: '🍟', quantity: 1 },
    { id: '4', name: 'Fiber Broadband Plan', price: 799, category: 'Mobile & Internet Bills', icon: '📶', quantity: 1 },
    { id: '5', name: 'Cold Brew Pack', price: 180, category: 'Snacks & Beverages', icon: '☕', quantity: 1 },
  ]);

  assert.ok(flags.some((f) => f.type === 'handling_fee' && f.severity === 'critical'));
  assert.ok(flags.some((f) => f.type === 'subscription_trap'));
  assert.ok(flags.some((f) => f.type === 'hidden_charge' && f.itemId === '2'));
  assert.ok(flags.some((f) => f.type === 'hidden_charge' && f.itemId === '4'));
  assert.ok(flags.some((f) => f.type === 'deceptive_pricing' && f.itemId === '3'));
  assert.ok(flags.some((f) => f.type === 'deceptive_pricing' && f.itemId === '5'));
});

test('detectCartSurcharges warns on sub-199 quick-commerce orders and detectReceiptFees flags receipt fees', () => {
  const smallCartFlags = detectCartSurcharges([
    { id: 'm1', name: 'Amul Milk', price: 60, category: 'Groceries', icon: '🥛', quantity: 1 },
  ]);
  assert.ok(smallCartFlags.some((f) => f.itemId === 'cart-small-order-risk'));

  const parsed = parseReceiptText(SAMPLE_RECEIPT_TEXT);
  const receiptFlags = detectReceiptFees([parsed]);
  assert.ok(receiptFlags.some((f) => f.type === 'handling_fee' && f.estimatedCost === 40));
});

test('detectTransactionFees audits logged subscriptions and ignores cancelled transactions', () => {
  const flags = detectTransactionFees([
    {
      id: 't1',
      name: 'Spotify Monthly Subscription',
      amount: 119,
      category: 'Entertainment',
      timestamp: new Date().toISOString(),
      source: 'manual',
      status: 'active',
    },
    {
      id: 't2',
      name: 'Cancelled Platform Fee',
      amount: 35,
      category: 'Other Expenses',
      timestamp: new Date().toISOString(),
      source: 'manual',
      status: 'cancelled',
    },
  ]);

  assert.equal(flags.length, 1);
  assert.equal(flags[0].type, 'subscription_trap');
  assert.equal(flags[0].itemId, 't1');
});
