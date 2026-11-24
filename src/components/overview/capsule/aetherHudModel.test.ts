import test from 'node:test';
import assert from 'node:assert/strict';
import type { Transaction } from '../../../types/models';
import { deriveCapsuleBudgetState } from './capsuleBudgetState';
import { deriveAetherHudModel, formatHudCyclePeriod } from './aetherHudModel';

const NOW = new Date('2026-11-24T10:00:00.000Z');
const IN_CYCLE_ISO = '2026-11-20T10:00:00.000Z';

function makeTx(amount: number, id = 'tx-1'): Transaction {
  return {
    id,
    name: 'Groceries',
    amount,
    category: 'Groceries',
    timestamp: IN_CYCLE_ISO,
    status: 'active',
  };
}

test('HUD loading state hides financial figures and cycle metadata', () => {
  const budgetState = deriveCapsuleBudgetState({
    transactions: [],
    totalBudget: 30000,
    now: NOW,
  });
  const hud = deriveAetherHudModel(budgetState, { isHydrated: false });
  assert.equal(hud.stateKey, 'loading');
  assert.equal(hud.showFinancialNumbers, false);
  assert.equal(hud.showCycleMetadata, false);
});

test('HUD unconfigured state never shows ₹0 exhausted and exposes setup action', () => {
  const budgetState = deriveCapsuleBudgetState({
    transactions: [],
    totalBudget: 0,
    now: NOW,
  });
  const hud = deriveAetherHudModel(budgetState);
  assert.equal(hud.stateKey, 'unconfigured');
  assert.equal(hud.tone, 'neutral');
  assert.equal(hud.showFinancialNumbers, false);
  assert.equal(hud.showSetupAction, true);
  assert.equal(hud.showCycleMetadata, false);
});

test('HUD invalid state shows unavailable status without fake numbers', () => {
  const budgetState = deriveCapsuleBudgetState({
    transactions: [],
    totalBudget: Number.NaN,
    now: NOW,
  });
  const hud = deriveAetherHudModel(budgetState);
  assert.equal(hud.stateKey, 'invalid');
  assert.equal(hud.tone, 'neutral');
  assert.equal(hud.showFinancialNumbers, false);
  assert.equal(hud.showCycleMetadata, false);
});

test('HUD healthy, caution, critical, depleted, and overspent states map accurately', () => {
  const healthy = deriveAetherHudModel(
    deriveCapsuleBudgetState({
      transactions: [makeTx(10000)],
      totalBudget: 30000,
      now: NOW,
    })
  );
  assert.equal(healthy.stateKey, 'healthy');
  assert.equal(healthy.tone, 'success');
  assert.equal(healthy.primaryAmount, 20000);
  assert.equal(healthy.activeSpent, 10000);

  const caution = deriveAetherHudModel(
    deriveCapsuleBudgetState({
      transactions: [makeTx(18000)],
      totalBudget: 30000,
      now: NOW,
    })
  );
  assert.equal(caution.stateKey, 'caution');
  assert.equal(caution.tone, 'warning');
  assert.equal(caution.primaryAmount, 12000);

  const critical = deriveAetherHudModel(
    deriveCapsuleBudgetState({
      transactions: [makeTx(26000)],
      totalBudget: 30000,
      now: NOW,
    })
  );
  assert.equal(critical.stateKey, 'critical');
  assert.equal(critical.tone, 'danger');
  assert.equal(critical.primaryAmount, 4000);

  const depleted = deriveAetherHudModel(
    deriveCapsuleBudgetState({
      transactions: [makeTx(30000)],
      totalBudget: 30000,
      now: NOW,
    })
  );
  assert.equal(depleted.stateKey, 'depleted');
  assert.equal(depleted.tone, 'danger');
  assert.equal(depleted.primaryAmount, 0);
  assert.equal(depleted.overspendAmount, 0);

  const overspent = deriveAetherHudModel(
    deriveCapsuleBudgetState({
      transactions: [makeTx(34250)],
      totalBudget: 30000,
      now: NOW,
    })
  );
  assert.equal(overspent.stateKey, 'overspent');
  assert.equal(overspent.tone, 'danger');
  assert.equal(overspent.primaryAmount, 0);
  assert.equal(overspent.overspendAmount, 4250);
  assert.equal(overspent.rawRemainingAmount, -4250);
});

test('HUD formats cross-year budget cycles with explicit years', () => {
  const formatted = formatHudCyclePeriod(
    '2026-12-15T00:00:00.000Z',
    '2027-01-14T23:59:59.000Z',
    '15 Dec – 14 Jan'
  );
  assert.ok(formatted.includes('2026'));
  assert.ok(formatted.includes('2027'));
});
