import type { Transaction, TransactionStatus } from '../../../types/models';
import { computeBudgetCycleSummary } from '../../../utils/budgetCycle';
import { getEffectiveTransactionAmount } from '../../../utils/martEngine';
import { roundCurrency } from '../../../utils/splitLedgerEngine';
import {
  resolveHealthState,
  type CapsuleHealthState,
  type CapsuleVisualState,
} from './capsuleConstants';

export type CapsuleFinancialStatus =
  | 'unconfigured'
  | 'invalid'
  | 'active'
  | 'exhausted'
  | 'exceeded';

export interface CapsuleBudgetInput {
  transactions: Transaction[];
  totalBudget: number;
  budgetResetDay?: number;
  budgetRolloverEnabled?: boolean;
  now?: Date;
}

export interface CapsuleBudgetState {
  status: CapsuleFinancialStatus;
  visualState: CapsuleVisualState;
  healthState: CapsuleHealthState;
  baseBudget: number;
  effectiveBudget: number;
  activeSpent: number;
  rawRemainingAmount: number;
  clampedRemainingAmount: number;
  overspendAmount: number;
  remainingPct: number;
  fillRatio: number;
  utilizationPct: number;
  rolloverDelta: number;
  cycleLabel: string;
  cycleStartIso: string;
  cycleEndIso: string;
  cycleResetDay: number;
  daysElapsed: number;
  daysTotal: number;
  daysRemaining: number;
  cycleElapsedPct: number;
  activeTransactionCount: number;
}

function sanitizeTransactionForCapsule(raw: unknown): Transaction | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Partial<Transaction> & {
    status?: unknown;
    refundedAmount?: unknown;
  };

  if (typeof record.amount !== 'number' || !Number.isFinite(record.amount) || record.amount < 0) {
    return null;
  }

  if (typeof record.timestamp !== 'string' || Number.isNaN(new Date(record.timestamp).getTime())) {
    return null;
  }

  const normalizedStatusRaw =
    record.status == null ? 'active' : String(record.status).trim().toLowerCase();

  if (normalizedStatusRaw === 'invalid') {
    return null;
  }

  let status: TransactionStatus = 'active';
  if (normalizedStatusRaw === 'cancelled') {
    status = 'cancelled';
  } else if (normalizedStatusRaw === 'refunded') {
    status = 'refunded';
  } else if (normalizedStatusRaw !== 'active') {
    return null;
  }

  const rawRefund =
    typeof record.refundAmount === 'number'
      ? record.refundAmount
      : typeof record.refundedAmount === 'number'
        ? record.refundedAmount
        : undefined;

  const safeRefund =
    typeof rawRefund === 'number' && Number.isFinite(rawRefund) && rawRefund >= 0
      ? rawRefund
      : undefined;

  return {
    id: typeof record.id === 'string' ? record.id : 'tx-sanitized',
    name: typeof record.name === 'string' ? record.name : 'Expense',
    amount: record.amount,
    category: typeof record.category === 'string' ? record.category : 'Other',
    timestamp: record.timestamp,
    splitWith: record.splitWith ?? null,
    linkedSharedExpenseId: record.linkedSharedExpenseId ?? null,
    status,
    refundAmount: safeRefund,
    source: record.source,
    receiptFingerprint: record.receiptFingerprint,
    classification: record.classification,
    classificationSource: record.classificationSource,
  };
}

export function deriveCapsuleBudgetState({
  transactions,
  totalBudget,
  budgetResetDay = 1,
  budgetRolloverEnabled = false,
  now,
}: CapsuleBudgetInput): CapsuleBudgetState {
  const isInvalidInputs =
    !Array.isArray(transactions) ||
    typeof totalBudget !== 'number' ||
    !Number.isFinite(totalBudget) ||
    totalBudget < 0;

  if (isInvalidInputs) {
    return {
      status: 'invalid',
      visualState: 'invalid',
      healthState: 'depleted',
      baseBudget: 0,
      effectiveBudget: 0,
      activeSpent: 0,
      rawRemainingAmount: 0,
      clampedRemainingAmount: 0,
      overspendAmount: 0,
      remainingPct: 0,
      fillRatio: 0,
      utilizationPct: 0,
      rolloverDelta: 0,
      cycleLabel: '',
      cycleStartIso: '',
      cycleEndIso: '',
      cycleResetDay: 1,
      daysElapsed: 0,
      daysTotal: 0,
      daysRemaining: 0,
      cycleElapsedPct: 0,
      activeTransactionCount: 0,
    };
  }

  const baseBudget = roundCurrency(totalBudget);

  if (baseBudget <= 0) {
    return {
      status: 'unconfigured',
      visualState: 'unconfigured',
      healthState: 'depleted',
      baseBudget: 0,
      effectiveBudget: 0,
      activeSpent: 0,
      rawRemainingAmount: 0,
      clampedRemainingAmount: 0,
      overspendAmount: 0,
      remainingPct: 0,
      fillRatio: 0,
      utilizationPct: 0,
      rolloverDelta: 0,
      cycleLabel: '',
      cycleStartIso: '',
      cycleEndIso: '',
      cycleResetDay: 1,
      daysElapsed: 0,
      daysTotal: 0,
      daysRemaining: 0,
      cycleElapsedPct: 0,
      activeTransactionCount: 0,
    };
  }

  const sanitizedTransactions: Transaction[] = [];
  for (const item of transactions) {
    const clean = sanitizeTransactionForCapsule(item);
    if (clean) sanitizedTransactions.push(clean);
  }

  const summary = computeBudgetCycleSummary({
    transactions: sanitizedTransactions,
    totalBudget: baseBudget,
    resetDay: budgetResetDay,
    rolloverEnabled: budgetRolloverEnabled,
    now,
  });

  const startMs = summary.window.start.getTime();
  const endMs = summary.window.end.getTime();
  let activeTransactionCount = 0;
  for (const tx of sanitizedTransactions) {
    if (tx.status === 'cancelled') continue;
    if (getEffectiveTransactionAmount(tx) <= 0) continue;
    const ms = new Date(tx.timestamp).getTime();
    if (ms >= startMs && ms <= endMs) {
      activeTransactionCount += 1;
    }
  }

  const effectiveBudget = summary.effectiveBudget;
  const activeSpent = summary.currentSpent;
  const rawRemainingAmount = summary.remainingBudget;
  const clampedRemainingAmount = roundCurrency(Math.max(0, rawRemainingAmount));
  const overspendAmount =
    rawRemainingAmount < 0 ? roundCurrency(Math.abs(rawRemainingAmount)) : 0;

  const remainingPct =
    effectiveBudget > 0
      ? Math.min(100, Math.max(0, (clampedRemainingAmount / effectiveBudget) * 100))
      : 0;
  const fillRatio = remainingPct / 100;

  let status: CapsuleFinancialStatus;
  if (rawRemainingAmount < 0 || (effectiveBudget === 0 && activeSpent > 0)) {
    status = 'exceeded';
  } else if (rawRemainingAmount === 0) {
    status = 'exhausted';
  } else {
    status = 'active';
  }

  const daysTotal = Math.max(1, summary.window.daysTotal);
  const daysElapsed = Math.min(daysTotal, Math.max(1, summary.window.daysElapsed));
  const cycleElapsedPct = Math.min(
    100,
    Math.max(0, Math.round((daysElapsed / daysTotal) * 100))
  );

  return {
    status,
    visualState: 'normal',
    healthState: resolveHealthState(fillRatio),
    baseBudget: summary.baseBudget,
    effectiveBudget,
    activeSpent,
    rawRemainingAmount,
    clampedRemainingAmount,
    overspendAmount,
    remainingPct: Math.round(remainingPct * 100) / 100,
    fillRatio,
    utilizationPct: summary.utilizationPct,
    rolloverDelta: summary.rolloverDelta,
    cycleLabel: summary.window.label,
    cycleStartIso: summary.window.start.toISOString(),
    cycleEndIso: summary.window.end.toISOString(),
    cycleResetDay: summary.window.resetDay,
    daysElapsed,
    daysTotal,
    daysRemaining: summary.window.daysRemaining,
    cycleElapsedPct,
    activeTransactionCount,
  };
}
