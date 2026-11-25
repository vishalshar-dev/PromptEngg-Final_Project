import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chooseGroqModelCandidates,
  normalizePennyChatPayload,
  normalizePennyExpensePayload,
  normalizePennyExpensesPayload,
  normalizeReceiptScanPayload,
  parseJsonObjectFromLlm,
} from './aiPayloadNormalizer';

test('parseJsonObjectFromLlm strips code fences and surrounding prose safely', () => {
  const raw = `Here is the JSON result:\n\`\`\`json\n{"answer": "You have ₹1,200 left.", "highlights": []}\n\`\`\`\nHope that helps!`;
  assert.deepEqual(parseJsonObjectFromLlm(raw), {
    answer: 'You have ₹1,200 left.',
    highlights: [],
  });
  assert.deepEqual(parseJsonObjectFromLlm('not json at all'), {});
});

test('normalizePennyChatPayload enforces highlights, proposedActions, and followUpQuestions shapes', () => {
  const normalized = normalizePennyChatPayload({
    response: 'Your budget is healthy.',
    highlights: [
      { label: 'Remaining', value: 1200 },
      { label: '', value: 'ignored' },
      { label: 'Safe/Day', value: '₹150' },
      { label: 'Spent', value: '₹800' },
      { label: 'Extra', value: 'clipped' },
    ],
    proposedActions: [
      { type: 'set_budget', title: 'Update Budget', summary: 'Set ₹5000', totalBudget: 5000 },
      { bad: 'missing type' },
    ],
    followUpQuestions: ['Q1', ' ', 'Q2', 'Q3', 'Q4'],
  });

  assert.equal(normalized.answer, 'Your budget is healthy.');
  assert.equal(normalized.highlights.length, 3);
  assert.equal(normalized.highlights[0].value, '1200');
  assert.equal(normalized.proposedActions.length, 1);
  assert.deepEqual(normalized.followUpQuestions, ['Q1', 'Q2', 'Q3']);
});

test('normalizePennyExpensePayload resolves allowed category case-insensitively and validates date', () => {
  const normalized = normalizePennyExpensePayload(
    {
      name: 'Cold Coffee',
      amount: '180.5',
      category: 'snacks & beverages',
      date: 'invalid-date',
      isSplitHint: true,
      splitPersonHint: 'Rahul',
    },
    ['Groceries', 'Snacks & Beverages', 'Other Expenses'],
    '2026-11-24',
    'Paid 180.50 for cold coffee with Rahul'
  );

  assert.deepEqual(normalized, {
    name: 'Cold Coffee',
    amount: 180.5,
    category: 'Snacks & Beverages',
    date: '2026-11-24',
    isSplitHint: true,
    splitPersonHint: 'Rahul',
  });
});

test('normalizePennyExpensesPayload extracts multiple expenses, drops zero/empty entries, and wraps legacy single object', () => {
  const cats = ['Groceries', 'Snacks & Beverages', 'Fuel & Transportation', 'Other Expenses'];
  const multi = normalizePennyExpensesPayload(
    {
      expenses: [
        { name: 'Cold Coffee', amount: 180, category: 'snacks & beverages', date: '2026-11-25' },
        { name: 'Zero promo', amount: 0, category: 'Groceries' },
        { name: 'Petrol', amount: 450, category: 'fuel & transportation', date: '2026-11-24' },
        { name: 'Milk & Bread', amount: 110, category: 'groceries', isSplitHint: true, splitPersonHint: 'Aman' },
      ],
    },
    cats,
    '2026-11-25',
    'coffee 180, petrol 450 yesterday, milk & bread 110 with Aman'
  );

  assert.equal(multi.expenses.length, 3);
  assert.equal(multi.expenses[0].name, 'Cold Coffee');
  assert.equal(multi.expenses[0].category, 'Snacks & Beverages');
  assert.equal(multi.expenses[1].date, '2026-11-24');
  assert.equal(multi.expenses[2].isSplitHint, true);
  assert.equal(multi.expenses[2].splitPersonHint, 'Aman');
  assert.equal(multi.amount, 180);

  const legacySingle = normalizePennyExpensesPayload(
    { name: 'Tea', amount: 30, category: 'Snacks & Beverages' },
    cats,
    '2026-11-25',
    'Tea 30'
  );
  assert.equal(legacySingle.expenses.length, 1);
  assert.equal(legacySingle.expenses[0].amount, 30);

  const noAmount = normalizePennyExpensesPayload(
    { expenses: [] },
    cats,
    '2026-11-25',
    'just coffee'
  );
  assert.equal(noAmount.expenses.length, 0);
  assert.equal(noAmount.amount, 0);
});

test('normalizeReceiptScanPayload computes fallback subtotal and total and drops zero-price lines', () => {
  const normalized = normalizeReceiptScanPayload({
    merchant: 'Blinkit',
    items: [
      { name: 'Amul Milk 500ml', price: 27, category: 'Dairy & Bakery' },
      { name: 'Zero promo', price: 0 },
    ],
    taxTotal: 5,
    deliveryFee: 15,
  });

  assert.equal(normalized.merchant, 'Blinkit');
  assert.equal(normalized.items.length, 1);
  assert.equal(normalized.subtotal, 27);
  assert.equal(normalized.total, 47);
});

test('chooseGroqModelCandidates preserves preferred active models and filters out whisper/guard', () => {
  const chat = chooseGroqModelCandidates(
    ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'],
    ['whisper-large-v3', 'meta-llama/llama-prompt-guard-2-86m', 'openai/gpt-oss-20b', 'llama-3.1-8b-instant'],
    'chat'
  );
  assert.deepEqual(chat, ['openai/gpt-oss-20b', 'llama-3.1-8b-instant']);

  const vision = chooseGroqModelCandidates(
    ['qwen/qwen3.8-27b'],
    ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b'],
    'vision'
  );
  assert.deepEqual(vision, ['qwen/qwen3.8-27b']);
});
