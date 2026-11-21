import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSplitReminderMessage,
  buildUpiPaymentUri,
  buildWhatsAppShareUrl,
  extractPhoneDigitsForWhatsApp,
  isValidUpiId,
  normalizeUpiId,
} from './upiEngine';

test('normalizeUpiId and isValidUpiId accept standard VPAs and reject malformed ones', () => {
  assert.equal(normalizeUpiId('  Vishal.Pay@OKAxis '), 'vishal.pay@okaxis');
  assert.equal(isValidUpiId('vishal@okicici'), true);
  assert.equal(isValidUpiId('9876543210@ybl'), true);
  assert.equal(isValidUpiId('team-split_1@hdfcbank'), true);

  assert.equal(isValidUpiId(''), false);
  assert.equal(isValidUpiId('no-at-symbol'), false);
  assert.equal(isValidUpiId('a@b'), false);
  assert.equal(isValidUpiId('bad..dots@okaxis'), false);
  assert.equal(isValidUpiId('has space@okaxis'), false);
});

test('buildUpiPaymentUri constructs valid INR deep links and rejects invalid UPI IDs', () => {
  const invalid = buildUpiPaymentUri({ pa: 'invalid', am: 100 });
  assert.equal(invalid.ok, false);

  const valid = buildUpiPaymentUri({
    pa: 'Vishal@okaxis',
    pn: 'Vishal Sharma',
    am: 320.5,
    tn: 'Dinner & Groceries split',
  });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.normalizedUpiId, 'vishal@okaxis');
    assert.ok(valid.uri.startsWith('upi://pay?'));
    assert.ok(valid.uri.includes('pa=vishal%40okaxis'));
    assert.ok(valid.uri.includes('am=320.50'));
    assert.ok(valid.uri.includes('cu=INR'));
  }
});

test('buildSplitReminderMessage includes itemized bills, formatted rupees, and UPI URI when collecting', () => {
  const msg = buildSplitReminderMessage({
    personName: 'Rahul',
    amount: 450,
    direction: 'they_pay',
    payeeUpiId: 'vishal@okaxis',
    payeeName: 'Vishal',
    unsettledItems: [
      { name: 'Dinner', remainingAmount: 300 },
      { name: 'Groceries', remainingAmount: 150 },
    ],
  });

  assert.ok(msg.includes('Rahul'));
  assert.ok(msg.includes('₹450'));
  assert.ok(msg.includes('Dinner (₹300)'));
  assert.ok(msg.includes('UPI ID: vishal@okaxis'));
  assert.ok(msg.includes('upi://pay?'));
});

test('extractPhoneDigitsForWhatsApp and buildWhatsAppShareUrl handle 10-digit Indian numbers and emails safely', () => {
  assert.equal(extractPhoneDigitsForWhatsApp('98765-43210'), '919876543210');
  assert.equal(extractPhoneDigitsForWhatsApp('+91 98765 43210'), '919876543210');
  assert.equal(extractPhoneDigitsForWhatsApp('rahul@gmail.com'), null);

  const withPhone = buildWhatsAppShareUrl('Pay ₹300', '9876543210');
  assert.ok(withPhone.startsWith('https://wa.me/919876543210?text='));

  const withoutPhone = buildWhatsAppShareUrl('Pay ₹300', 'rahul@gmail.com');
  assert.ok(withoutPhone.startsWith('https://wa.me/?text='));
});
