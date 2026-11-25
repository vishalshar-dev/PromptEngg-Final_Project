import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PENNY_PROFILE,
  buildPennyContextSnapshot,
  buildSmartActionNudges,
  computeMonthlyDigest,
  computeUpcomingCommitments,
  describePennyStyle,
  evolvePennyProfile,
  groupCommitmentsAgenda,
  normalizePennyProposals,
  parseQuickExpenseLocally,
  parseQuickExpensesLocally,
  sanitizePennyProfile,
} from './pennyEngine';
import { SELF_PERSON_ID, type CartItem, type Person, type SharedExpense, type Transaction } from '../types/models';

const NOW = new Date(2026, 10, 21, 12, 0, 0); // 2026-11-21 (10 days left incl today: 21..30 = 10)

const sampleItems: CartItem[] = [
  {
    id: 'milk-1',
    name: 'Amul Taaza Milk',
    price: 54,
    category: 'Dairy & Bakery',
    icon: '🥛',
    quantity: 0,
    unit: '1 L',
    recurrence: {
      frequency: 'weekly',
      nextDueDate: '2026-11-20', // 1 day overdue
    },
  },
  {
    id: 'wifi-1',
    name: 'Fiber Broadband Bill',
    price: 799,
    category: 'Mobile & Internet Bills',
    productType: 'Broadband Subscription',
    icon: '📶',
    quantity: 0,
    unit: '1 month',
    recurrence: {
      frequency: 'monthly',
      nextDueDate: '2026-11-26', // 5 days from now
    },
  },
  {
    id: 'rice-1',
    name: 'Basmati Rice',
    price: 420,
    category: 'Groceries',
    icon: '🍚',
    quantity: 0,
    unit: '5 kg',
    recurrence: {
      frequency: 'monthly',
      nextDueDate: '2026-12-30', // >30 days out
    },
  },
];

const people: Person[] = [
  { id: 'rahul', name: 'Rahul', createdAt: '2026-11-01T10:00:00.000Z' },
  { id: 'ananya', name: 'Ananya', createdAt: '2026-11-01T10:00:00.000Z' },
];

const sharedExpenses: SharedExpense[] = [
  {
    id: 'exp-1',
    name: 'Dinner with Rahul',
    totalAmount: 1000,
    category: 'Snacks & Beverages',
    date: '2026-11-18T19:00:00.000Z',
    paidById: 'rahul',
    splitMethod: 'equal',
    participants: [
      { personId: SELF_PERSON_ID, amount: 500 },
      { personId: 'rahul', amount: 500 },
    ],
    source: 'manual',
    createdAt: '2026-11-18T19:00:00.000Z',
  },
  {
    id: 'exp-2',
    name: 'Cab with Ananya',
    totalAmount: 400,
    category: 'Fuel & Transportation',
    date: '2026-11-19T12:00:00.000Z',
    paidById: SELF_PERSON_ID,
    splitMethod: 'equal',
    participants: [
      { personId: SELF_PERSON_ID, amount: 200 },
      { personId: 'ananya', amount: 200 },
    ],
    source: 'manual',
    createdAt: '2026-11-19T12:00:00.000Z',
  },
];

const transactions: Transaction[] = [
  {
    id: 'tx-1',
    name: 'Weekly Groceries',
    amount: 1200,
    category: 'Groceries',
    timestamp: '2026-11-10T10:00:00.000Z',
    status: 'active',
    source: 'mart',
  },
  {
    id: 'tx-2',
    name: 'Evening Snacks',
    amount: 300,
    category: 'Snacks & Beverages',
    timestamp: '2026-11-15T18:00:00.000Z',
    status: 'active',
    source: 'manual',
  },
  {
    id: 'tx-cancelled',
    name: 'Cancelled Order',
    amount: 999,
    category: 'Groceries',
    timestamp: '2026-11-16T12:00:00.000Z',
    status: 'cancelled',
    source: 'mart',
  },
];

test('computeUpcomingCommitments separates overdue/30d recurring items, splits owed, and safe daily spend', () => {
  const result = computeUpcomingCommitments({
    items: sampleItems,
    people,
    sharedExpenses,
    settlements: [],
    transactions,
    totalBudget: 5000,
    now: NOW,
  });

  assert.equal(result.currentMonthSpent, 1500);
  assert.equal(result.rawRemainingBudget, 3500);
  assert.equal(result.dueOrOverdueRecurring.length, 1);
  assert.equal(result.dueOrOverdueRecurring[0].itemId, 'milk-1');

  // 30d recurring includes milk (54) + wifi (799) = 853 (rice is >30d out on Dec 30)
  assert.equal(result.upcoming30DaysRecurringTotal, 853);
  assert.equal(result.totalIOweSplits, 500);
  assert.equal(result.totalOwedToMeSplits, 200);
  assert.equal(result.committedUpcoming30d, 1353); // 853 + 500
  assert.equal(result.trueSafeToSpend, 2147); // 3500 - 1353
  assert.equal(result.remainingDaysInMonth, 10);
  assert.equal(result.safeDailySpend, 214.7);
});

test('computeUpcomingCommitments clamps safeDailySpend at 0 when commitments exceed remaining budget', () => {
  const result = computeUpcomingCommitments({
    items: sampleItems,
    people,
    sharedExpenses,
    settlements: [],
    transactions,
    totalBudget: 2000, // remaining = 500, commitments = 1353 -> trueSafeToSpend = -853
    now: NOW,
  });

  assert.equal(result.trueSafeToSpend, -853);
  assert.equal(result.safeDailySpend, 0);
});

test('buildSmartActionNudges creates actionable due-recurring, split payable, and fee leak nudges', () => {
  const summary = computeUpcomingCommitments({
    items: sampleItems,
    people,
    sharedExpenses,
    settlements: [],
    transactions,
    totalBudget: 5000,
    now: NOW,
  });

  const nudges = buildSmartActionNudges({
    commitmentsSummary: summary,
    items: sampleItems,
    basketTemplates: [],
    priceObservations: [],
    savedAudits: [
      {
        id: 'aud-1',
        timestamp: '2026-11-12T10:00:00.000Z',
        source: 'Blinkit',
        subtotal: 400,
        extraFees: 65,
        total: 465,
        flags: [],
      },
    ],
  });

  assert.ok(nudges.some((n) => n.actionType === 'add_due_recurring'));
  assert.ok(nudges.some((n) => n.actionType === 'open_expenses'));
  assert.ok(nudges.some((n) => n.actionType === 'open_shopping'));
});

test('computeMonthlyDigest and buildPennyContextSnapshot derive grounded totals, active screen, cart, and catalog', () => {
  const itemsWithCart = sampleItems.map((it) =>
    it.id === 'milk-1' ? { ...it, quantity: 2 } : it
  );

  const digest = computeMonthlyDigest({
    transactions,
    totalBudget: 5000,
    categories: ['Groceries', 'Snacks & Beverages'],
    categoryCaps: {},
    savedAudits: [],
    people,
    sharedExpenses,
    settlements: [],
    isBrokeMode: false,
    disciplineCheckIns: ['2026-11-20', '2026-11-21'],
    now: NOW,
  });

  assert.equal(digest.totalSpent, 1500);
  assert.equal(digest.topCategory?.name, 'Groceries');
  assert.equal(digest.topCategory?.amount, 1200);
  assert.equal(digest.netSplitBalance, -300); // owed 200 - owe 500
  assert.equal(digest.disciplineCheckInsCount, 2);

  const snapshot = buildPennyContextSnapshot({
    items: itemsWithCart,
    transactions,
    purchaseHistory: [],
    totalBudget: 5000,
    categories: ['Groceries', 'Snacks & Beverages'],
    categoryCaps: {},
    categoryLimits: [],
    people,
    sharedExpenses,
    settlements: [],
    basketTemplates: [],
    priceObservations: [],
    savedAudits: [],
    isBrokeMode: false,
    brokeModeConfig: {
      enabled: false,
      period: 'monthly',
      dailyAllowance: 250,
      weeklyAllowance: 1500,
      monthlyAllowance: 4000,
      maxNonEssentialSpend: 1200,
      warningThresholdPct: 75,
      durationDays: 14,
      restrictedCategories: ['Junk'],
      activatedAt: null,
    },
    disciplineCheckIns: ['2026-11-20', '2026-11-21'],
    activeScreen: 'shopping',
    now: NOW,
  });

  assert.equal(snapshot.asOfDate, '2026-11-21');
  assert.equal(snapshot.activeScreen, 'shopping');
  assert.equal(snapshot.currentCart.lineCount, 1);
  assert.equal(snapshot.currentCart.totalAmount, 108); // 2 * 54
  assert.equal(snapshot.catalogItems.length, 3);
  assert.equal(snapshot.peopleList.length, 2);
  assert.equal(snapshot.futureCommitments.totalIOweSplits, 500);
  assert.equal(snapshot.recentTransactions.length, 2); // cancelled excluded
});

test('evolvePennyProfile adapts tone, conciseness, and focus from user prompts cleanly', () => {
  let profile = { ...DEFAULT_PENNY_PROFILE };
  profile = evolvePennyProfile(profile, 'yo quick check, who owes me on split rn?');
  profile = evolvePennyProfile(profile, 'thx bro, settle Rahul split');

  assert.equal(profile.messageCount, 2);
  assert.ok(profile.casualBias > DEFAULT_PENNY_PROFILE.casualBias);
  assert.ok(profile.conciseBias > DEFAULT_PENNY_PROFILE.conciseBias);
  assert.equal(profile.topFocus, 'splits');
  assert.ok(profile.resolvedSummary.includes('Focus: Splits'));

  // Manual override takes precedence in describePennyStyle
  const strict = { ...profile, tonePreference: 'strict_coach' as const };
  assert.ok(describePennyStyle(strict, true).startsWith('Strict Coach'));

  // Sanitizer handles invalid/corrupt state safely
  const clean = sanitizePennyProfile({ tonePreference: 'unknown', conciseBias: 999 });
  assert.equal(clean.tonePreference, 'auto');
  assert.equal(clean.conciseBias, 100);
});

test('normalizePennyProposals filters invalid actions and resolves real catalog items & categories', () => {
  const proposals = normalizePennyProposals(
    [
      {
        type: 'build_cart',
        title: 'Quick breakfast cart',
        cartItems: [
          { itemId: 'milk-1', itemName: 'Milk', quantity: 2 },
          { itemId: 'does-not-exist', itemName: 'Ghost Item', quantity: 1 },
        ],
      },
      {
        type: 'log_expense',
        expense: { name: 'Bad Negative', amount: -50, category: 'Groceries' },
      },
      {
        type: 'log_expense',
        expense: { name: 'Coffee', amount: 140, category: 'Unknown Category' },
      },
      {
        type: 'toggle_broke_mode',
        brokeModeEnabled: true,
      },
    ],
    {
      items: sampleItems,
      basketTemplates: [],
      categories: ['Groceries', 'Snacks & Beverages'],
    }
  );

  assert.equal(proposals.length, 3);
  assert.equal(proposals[0].type, 'build_cart');
  assert.equal(proposals[0].cartItems?.length, 1);
  assert.equal(proposals[0].cartItems?.[0].itemId, 'milk-1');
  assert.equal(proposals[0].cartItems?.[0].unitPrice, 54);

  assert.equal(proposals[1].type, 'log_expense');
  assert.equal(proposals[1].expense?.category, 'Groceries'); // matched fallback category

  assert.equal(proposals[2].type, 'toggle_broke_mode');
  assert.equal(proposals[2].brokeModeEnabled, true);

  // Batch log_expenses and merging multiple log_expense entries
  const batchProposals = normalizePennyProposals(
    [
      {
        type: 'log_expenses',
        expenses: [
          { name: 'Coffee', amount: 180, category: 'Snacks & Beverages' },
          { name: 'Zero item', amount: 0, category: 'Groceries' },
          { name: 'Uber', amount: 240, category: 'Unknown Category' },
        ],
      },
    ],
    {
      items: sampleItems,
      basketTemplates: [],
      categories: ['Groceries', 'Snacks & Beverages'],
    }
  );
  assert.equal(batchProposals.length, 1);
  assert.equal(batchProposals[0].type, 'log_expenses');
  assert.equal(batchProposals[0].expenses?.length, 2);
  assert.equal(batchProposals[0].expenses?.[1].category, 'Groceries');
});

test('groupCommitmentsAgenda buckets commitments into Overdue/Today, Next 7 Days, and Later', () => {
  const summary = computeUpcomingCommitments({
    items: [
      ...sampleItems,
      {
        id: 'gas-1',
        name: 'Cooking Gas',
        price: 900,
        category: 'Utilities & Bills',
        icon: '🔥',
        quantity: 0,
        recurrence: { frequency: 'monthly', nextDueDate: '2026-12-08' }, // +17d
      },
    ],
    people,
    sharedExpenses,
    settlements: [],
    transactions,
    totalBudget: 5000,
    now: NOW,
  });

  const grouped = groupCommitmentsAgenda(summary.commitments);
  assert.equal(grouped.overdueOrToday.length, 2); // overdue milk + split payable with Rahul
  assert.equal(grouped.next7Days.length, 1); // fiber broadband in 5d
  assert.equal(grouped.later.length, 1); // cooking gas in 17d
});

test('parseQuickExpenseLocally parses amounts, inferred categories, and relative dates cleanly', () => {
  const cats = ['Groceries', 'Snacks & Beverages', 'Fuel & Transportation', 'Utilities & Bills'];
  const p1 = parseQuickExpenseLocally('coffee 180', cats, '2026-11-21');
  assert.ok(p1?.expense);
  assert.equal(p1.expense.amount, 180);
  assert.equal(p1.expense.category, 'Snacks & Beverages');
  assert.equal(p1.expense.date, '2026-11-21');

  const p2 = parseQuickExpenseLocally('spent ₹450 on petrol yesterday', cats, '2026-11-21');
  assert.ok(p2?.expense);
  assert.equal(p2.expense.amount, 450);
  assert.equal(p2.expense.category, 'Fuel & Transportation');
  assert.equal(p2.expense.date, '2026-11-20');

  assert.equal(parseQuickExpenseLocally('just some text without numbers', cats, '2026-11-21'), null);
});

test('parseQuickExpensesLocally parses comma, conjunction, newline, and quantity multi-item lists without splitting combined totals', () => {
  const cats = ['Groceries', 'Snacks & Beverages', 'Fuel & Transportation', 'Utilities & Bills'];

  const multi = parseQuickExpensesLocally(
    'coffee 180, petrol 450 yesterday and milk 65',
    cats,
    '2026-11-21'
  );
  assert.equal(multi.length, 3);
  assert.equal(multi[0].expense?.amount, 180);
  assert.equal(multi[0].expense?.category, 'Snacks & Beverages');
  assert.equal(multi[1].expense?.amount, 450);
  assert.equal(multi[1].expense?.date, '2026-11-20');
  assert.equal(multi[2].expense?.amount, 65);
  assert.equal(multi[2].expense?.category, 'Groceries');

  const lines = parseQuickExpensesLocally('180 coffee\n2 coffees at 120\n1.5k wifi bill', cats, '2026-11-21');
  assert.equal(lines.length, 3);
  assert.equal(lines[0].expense?.amount, 180);
  assert.equal(lines[1].expense?.amount, 240);
  assert.equal(lines[2].expense?.amount, 1500);
  assert.equal(lines[2].expense?.category, 'Utilities & Bills');

  // Combined total should NOT be split when second noun has no amount
  const combined = parseQuickExpensesLocally(
    'Paid 240 for cold coffee and sandwich',
    cats,
    '2026-11-21'
  );
  assert.equal(combined.length, 1);
  assert.equal(combined[0].expense?.amount, 240);
});

import { answerPennyLocally } from './pennyEngine';

test('answerPennyLocally handles splits, cart building, budget commands, and safe daily spend offline', () => {
  const cats = ['Groceries', 'Snacks & Beverages', 'Dairy & Bakery', 'Fuel & Transportation'];
  const snapshot = buildPennyContextSnapshot({
    items: sampleItems,
    transactions,
    purchaseHistory: [],
    totalBudget: 5000,
    categories: cats,
    categoryCaps: {},
    categoryLimits: [],
    people,
    sharedExpenses,
    settlements: [],
    basketTemplates: [],
    priceObservations: [],
    savedAudits: [],
    isBrokeMode: false,
    brokeModeConfig: {
      enabled: false,
      period: 'monthly',
      dailyAllowance: 250,
      weeklyAllowance: 1500,
      monthlyAllowance: 4000,
      maxNonEssentialSpend: 1200,
      warningThresholdPct: 75,
      durationDays: 14,
      restrictedCategories: ['Junk'],
      activatedAt: null,
    },
    disciplineCheckIns: [],
    activeScreen: 'overview',
    now: NOW,
  });

  const splitLookup = answerPennyLocally({
    question: 'Who do I owe in Splits right now?',
    context: snapshot,
    items: sampleItems,
    basketTemplates: [],
    categories: cats,
  });
  assert.ok(splitLookup.answer.includes('Rahul'));
  assert.equal(splitLookup.proposedActions[0]?.type, 'navigate');

  const cartBuild = answerPennyLocally({
    question: 'Build me a breakfast cart under ₹100',
    context: snapshot,
    items: sampleItems,
    basketTemplates: [],
    categories: cats,
  });
  assert.equal(cartBuild.proposedActions[0]?.type, 'build_cart');
  assert.equal(cartBuild.proposedActions[0]?.cartItems?.[0]?.itemId, 'milk-1');

  const addSplit = answerPennyLocally({
    question: 'Split ₹600 dinner with Rahul',
    context: snapshot,
    items: sampleItems,
    basketTemplates: [],
    categories: cats,
  });
  assert.equal(addSplit.proposedActions[0]?.type, 'add_split');
  assert.equal(addSplit.proposedActions[0]?.split?.totalAmount, 600);
  assert.deepEqual(addSplit.proposedActions[0]?.split?.participantNames, ['Rahul']);

  const dailySafe = answerPennyLocally({
    question: 'How much can I safely spend per day?',
    context: snapshot,
    items: sampleItems,
    basketTemplates: [],
    categories: cats,
  });
  assert.ok(dailySafe.answer.includes('/day'));
  assert.equal(dailySafe.highlights.length, 3);

  const greeting = answerPennyLocally({
    question: 'Hey Penny',
    context: snapshot,
    items: sampleItems,
    basketTemplates: [],
    categories: cats,
  });
  assert.ok(greeting.answer.includes("I'm Penny"));
  assert.equal(greeting.followUpQuestions.length, 3);

  const savingsCheckup = answerPennyLocally({
    question: 'How am I doing and how can I save money?',
    context: snapshot,
    items: sampleItems,
    basketTemplates: [],
    categories: cats,
  });
  assert.ok(savingsCheckup.answer.includes('Monthly Checkup'));
});



