import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateEqualShares,
  calculatePercentageShares,
  computeLedgerState,
  filterAndSortExpenses,
  getOutstandingDirectionAmount,
  isDuplicateSettlement,
  validateAndBuildShares,
} from './splitLedgerEngine';
import {
  SELF_PERSON_ID,
  type Person,
  type Settlement,
  type SharedExpense,
} from '../types/models';

const rahul: Person = {
  id: 'p-rahul',
  name: 'Rahul',
  contact: 'rahul@example.com',
  createdAt: '2026-10-01T10:00:00Z',
};

const priya: Person = {
  id: 'p-priya',
  name: 'Priya',
  contact: '+91 9876543210',
  createdAt: '2026-10-01T10:05:00Z',
};

test('equal split divides Mart ₹180 into three exact ₹60 shares and handles odd paise cleanly', () => {
  const exact = calculateEqualShares(180, [SELF_PERSON_ID, rahul.id, priya.id]);
  assert.deepEqual(
    exact.map((s) => s.amount),
    [60, 60, 60]
  );

  const odd = calculateEqualShares(100, [SELF_PERSON_ID, rahul.id, priya.id]);
  const sum = odd.reduce((acc, s) => Math.round((acc + s.amount) * 100) / 100, 0);
  assert.equal(sum, 100);
  assert.deepEqual(
    odd.map((s) => s.amount),
    [33.34, 33.33, 33.33]
  );
});

test('custom split validates exact sum equality against total expense', () => {
  const invalid = validateAndBuildShares(500, 'custom', SELF_PERSON_ID, [
    { personId: SELF_PERSON_ID, amount: 200 },
    { personId: rahul.id, amount: 250 },
  ]);
  assert.equal(invalid.valid, false);
  assert.equal(invalid.remainingAmount, 50);

  const valid = validateAndBuildShares(500, 'custom', SELF_PERSON_ID, [
    { personId: SELF_PERSON_ID, amount: 200 },
    { personId: rahul.id, amount: 300 },
  ]);
  assert.equal(valid.valid, true);
  assert.deepEqual(
    valid.shares.map((s) => s.amount),
    [200, 300]
  );
});

test('percentage split ensures 100% total and allocates exact paise', () => {
  const invalid = validateAndBuildShares(1000, 'percentage', SELF_PERSON_ID, [
    { personId: SELF_PERSON_ID, percentage: 40 },
    { personId: rahul.id, percentage: 50 },
  ]);
  assert.equal(invalid.valid, false);

  const valid = validateAndBuildShares(250, 'percentage', SELF_PERSON_ID, [
    { personId: SELF_PERSON_ID, percentage: 33.34 },
    { personId: rahul.id, percentage: 33.33 },
    { personId: priya.id, percentage: 33.33 },
  ]);
  assert.equal(valid.valid, true);
  const sum = valid.shares.reduce((s, sh) => Math.round((s + sh.amount) * 100) / 100, 0);
  assert.equal(sum, 250);

  const simple = calculatePercentageShares(1000, [
    { personId: SELF_PERSON_ID, percentage: 50 },
    { personId: rahul.id, percentage: 30 },
    { personId: priya.id, percentage: 20 },
  ]);
  assert.deepEqual(
    simple.map((s) => s.amount),
    [500, 300, 200]
  );
});

test('partial and full repayments update dashboard and person ledgers accurately while preserving history', () => {
  const expenses: SharedExpense[] = [
    {
      id: 'exp-1',
      name: 'Dinner with Rahul',
      totalAmount: 1000,
      category: 'Junk',
      date: '2026-11-01T19:00:00Z',
      paidById: rahul.id,
      splitMethod: 'equal',
      participants: [
        { personId: SELF_PERSON_ID, amount: 500 },
        { personId: rahul.id, amount: 500 },
      ],
      source: 'manual',
      createdAt: '2026-11-01T19:00:00Z',
    },
    {
      id: 'exp-2',
      name: 'Mart Groceries',
      totalAmount: 180,
      category: 'Groceries',
      date: '2026-11-05T10:00:00Z',
      paidById: SELF_PERSON_ID,
      splitMethod: 'equal',
      participants: [
        { personId: SELF_PERSON_ID, amount: 60 },
        { personId: rahul.id, amount: 60 },
        { personId: priya.id, amount: 60 },
      ],
      source: 'mart',
      createdAt: '2026-11-05T10:00:00Z',
    },
  ];

  // Partial repayment: I owe Rahul ₹500 and repay ₹200 -> ₹300 remaining
  const partialSettlement: Settlement = {
    id: 'st-1',
    fromPersonId: SELF_PERSON_ID,
    toPersonId: rahul.id,
    amount: 200,
    date: '2026-11-06T12:00:00Z',
    note: 'UPI partial',
    createdAt: '2026-11-06T12:00:00Z',
  };

  const stateAfterPartial = computeLedgerState(
    [rahul, priya],
    expenses,
    [partialSettlement]
  );

  // Rahul owes me ₹60 (from Mart), I owe Rahul ₹300 (500 - 200) -> Rahul net = -240
  assert.equal(stateAfterPartial.personSummaries[rahul.id].iOwe, 300);
  assert.equal(stateAfterPartial.personSummaries[rahul.id].owedToMe, 60);
  assert.equal(stateAfterPartial.personSummaries[rahul.id].netBalance, -240);

  // Priya owes me ₹60
  assert.equal(stateAfterPartial.personSummaries[priya.id].owedToMe, 60);
  assert.equal(stateAfterPartial.personSummaries[priya.id].iOwe, 0);
  assert.equal(stateAfterPartial.personSummaries[priya.id].netBalance, 60);

  // Dashboard totals MUST equal sum of person ledgers
  assert.equal(stateAfterPartial.dashboard.totalIOwe, 300);
  assert.equal(stateAfterPartial.dashboard.totalOwedToMe, 120);
  assert.equal(stateAfterPartial.dashboard.overallNetBalance, -180);
  assert.equal(stateAfterPartial.dashboard.unsettledCount, 2);

  // Exp-1 status is 'partial' with 300 remaining
  const exp1View = stateAfterPartial.expenseViews.find((v) => v.expense.id === 'exp-1')!;
  assert.equal(exp1View.status, 'partial');
  assert.equal(exp1View.remainingAmount, 300);
  assert.equal(exp1View.settledAmount, 200);

  // Check directional max outstanding helper
  assert.equal(
    getOutstandingDirectionAmount(stateAfterPartial, SELF_PERSON_ID, rahul.id),
    300
  );
  assert.equal(
    getOutstandingDirectionAmount(stateAfterPartial, priya.id, SELF_PERSON_ID),
    60
  );

  // Full repayment of remaining ₹300 to Rahul
  const fullSettlement: Settlement = {
    id: 'st-2',
    fromPersonId: SELF_PERSON_ID,
    toPersonId: rahul.id,
    amount: 300,
    date: '2026-11-08T12:00:00Z',
    expenseId: 'exp-1',
    createdAt: '2026-11-08T12:00:00Z',
  };

  const stateAfterFull = computeLedgerState(
    [rahul, priya],
    expenses,
    [partialSettlement, fullSettlement]
  );

  assert.equal(stateAfterFull.personSummaries[rahul.id].iOwe, 0);
  assert.equal(stateAfterFull.dashboard.totalIOwe, 0);
  assert.equal(stateAfterFull.dashboard.totalOwedToMe, 120);
  assert.equal(stateAfterFull.dashboard.unsettledCount, 1);
  assert.equal(stateAfterFull.dashboard.settledCount, 1);
  // Preserved in history & marked settled
  const exp1Settled = stateAfterFull.expenseViews.find((v) => v.expense.id === 'exp-1')!;
  assert.equal(exp1Settled.status, 'settled');
  assert.equal(exp1Settled.remainingAmount, 0);
});

test('filterAndSortExpenses filters by direction/status and sorts by date and amount', () => {
  const expenses: SharedExpense[] = [
    {
      id: 'e1',
      name: 'Coffee',
      totalAmount: 200,
      category: 'Junk',
      date: '2026-11-01T10:00:00Z',
      paidById: rahul.id,
      splitMethod: 'equal',
      participants: [
        { personId: SELF_PERSON_ID, amount: 100 },
        { personId: rahul.id, amount: 100 },
      ],
      source: 'manual',
      createdAt: '2026-11-01T10:00:00Z',
    },
    {
      id: 'e2',
      name: 'Groceries',
      totalAmount: 600,
      category: 'Groceries',
      date: '2026-11-10T10:00:00Z',
      paidById: SELF_PERSON_ID,
      splitMethod: 'equal',
      participants: [
        { personId: SELF_PERSON_ID, amount: 300 },
        { personId: priya.id, amount: 300 },
      ],
      source: 'mart',
      createdAt: '2026-11-10T10:00:00Z',
    },
  ];
  const settlements: Settlement[] = [
    {
      id: 's1',
      fromPersonId: SELF_PERSON_ID,
      toPersonId: rahul.id,
      amount: 100,
      date: '2026-11-02T10:00:00Z',
      createdAt: '2026-11-02T10:00:00Z',
    },
  ];

  const ledger = computeLedgerState([rahul, priya], expenses, settlements);

  assert.equal(
    filterAndSortExpenses(ledger.expenseViews, 'i_owe', 'date', 'desc').length,
    1
  );
  assert.equal(
    filterAndSortExpenses(ledger.expenseViews, 'owed_to_me', 'date', 'desc').length,
    1
  );
  assert.equal(
    filterAndSortExpenses(ledger.expenseViews, 'settled', 'date', 'desc')[0].expense.id,
    'e1'
  );
  assert.equal(
    filterAndSortExpenses(ledger.expenseViews, 'unsettled', 'date', 'desc')[0].expense.id,
    'e2'
  );

  const byAmountAsc = filterAndSortExpenses(ledger.expenseViews, 'all', 'amount', 'asc');
  assert.deepEqual(
    byAmountAsc.map((v) => v.expense.id),
    ['e1', 'e2']
  );
});

test('isDuplicateSettlement detects rapid duplicate submissions', () => {
  const existing: Settlement[] = [
    {
      id: 's-1',
      fromPersonId: SELF_PERSON_ID,
      toPersonId: rahul.id,
      amount: 200,
      date: '2026-11-17T10:00:00Z',
      note: 'UPI',
      createdAt: '2026-11-17T10:00:00Z',
    },
  ];
  const now = new Date('2026-11-17T10:00:02Z').getTime();
  assert.equal(
    isDuplicateSettlement(
      existing,
      { fromPersonId: SELF_PERSON_ID, toPersonId: rahul.id, amount: 200, note: 'UPI' },
      now
    ),
    true
  );
  assert.equal(
    isDuplicateSettlement(
      existing,
      { fromPersonId: SELF_PERSON_ID, toPersonId: rahul.id, amount: 250, note: 'UPI' },
      now
    ),
    false
  );
});
