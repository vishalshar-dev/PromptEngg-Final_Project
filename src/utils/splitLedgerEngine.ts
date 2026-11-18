import {
  SELF_PERSON_ID,
  type ExpenseParticipantShare,
  type Person,
  type Settlement,
  type SharedExpense,
  type SplitMethod,
} from '../types/models';

export function toPaise(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

export function fromPaise(paise: number): number {
  return Math.round(paise) / 100;
}

export function roundCurrency(amount: number): number {
  return fromPaise(toPaise(amount));
}

export interface SplitParticipantInput {
  personId: string;
  amount?: number;
  percentage?: number;
}

export interface SplitValidationResult {
  valid: boolean;
  error?: string;
  shares: ExpenseParticipantShare[];
  allocatedAmount: number;
  remainingAmount: number;
  allocatedPct: number;
  remainingPct: number;
}

export function calculateEqualShares(
  totalAmount: number,
  participantIds: string[]
): ExpenseParticipantShare[] {
  const uniqueIds = Array.from(new Set(participantIds));
  if (uniqueIds.length === 0) return [];
  const totalPaise = Math.max(0, toPaise(totalAmount));
  const basePaise = Math.floor(totalPaise / uniqueIds.length);
  const remainder = totalPaise - basePaise * uniqueIds.length;

  return uniqueIds.map((personId, index) => ({
    personId,
    amount: fromPaise(basePaise + (index < remainder ? 1 : 0)),
  }));
}

export function calculatePercentageShares(
  totalAmount: number,
  entries: { personId: string; percentage: number }[]
): ExpenseParticipantShare[] {
  if (entries.length === 0) return [];
  const totalPaise = Math.max(0, toPaise(totalAmount));

  const raw = entries.map((entry, idx) => {
    const pct = Number.isFinite(entry.percentage) ? Math.max(0, entry.percentage) : 0;
    const exactPaise = (totalPaise * pct) / 100;
    const floored = Math.floor(exactPaise);
    return {
      idx,
      personId: entry.personId,
      percentage: Math.round(pct * 100) / 100,
      floored,
      fraction: exactPaise - floored,
    };
  });

  const flooredSum = raw.reduce((s, item) => s + item.floored, 0);
  let remainder = totalPaise - flooredSum;

  // Distribute remaining paise using largest remainder
  const byFraction = [...raw].sort((a, b) => b.fraction - a.fraction || a.idx - b.idx);
  const extraPaise = new Map<number, number>();
  for (const item of byFraction) {
    if (remainder <= 0) break;
    extraPaise.set(item.idx, 1);
    remainder -= 1;
  }

  return raw.map((item) => ({
    personId: item.personId,
    amount: fromPaise(item.floored + (extraPaise.get(item.idx) ?? 0)),
    percentage: item.percentage,
  }));
}

export function validateAndBuildShares(
  totalAmount: number,
  splitMethod: SplitMethod,
  paidById: string,
  inputs: SplitParticipantInput[]
): SplitValidationResult {
  const totalPaise = toPaise(totalAmount);
  if (!Number.isFinite(totalAmount) || totalPaise <= 0) {
    return {
      valid: false,
      error: 'Total expense amount must be greater than ₹0.',
      shares: [],
      allocatedAmount: 0,
      remainingAmount: 0,
      allocatedPct: 0,
      remainingPct: 100,
    };
  }

  if (inputs.length === 0) {
    return {
      valid: false,
      error: 'Select at least one participant for this expense.',
      shares: [],
      allocatedAmount: 0,
      remainingAmount: fromPaise(totalPaise),
      allocatedPct: 0,
      remainingPct: 100,
    };
  }

  const hasOtherBesidesPayer = inputs.some((p) => p.personId !== paidById);
  if (!hasOtherBesidesPayer) {
    return {
      valid: false,
      error: 'Include at least one other person besides who paid.',
      shares: [],
      allocatedAmount: 0,
      remainingAmount: fromPaise(totalPaise),
      allocatedPct: 0,
      remainingPct: 100,
    };
  }

  if (splitMethod === 'equal') {
    const shares = calculateEqualShares(
      fromPaise(totalPaise),
      inputs.map((i) => i.personId)
    );
    return {
      valid: true,
      shares,
      allocatedAmount: fromPaise(totalPaise),
      remainingAmount: 0,
      allocatedPct: 100,
      remainingPct: 0,
    };
  }

  if (splitMethod === 'custom') {
    let allocatedPaise = 0;
    const shares: ExpenseParticipantShare[] = [];

    for (const entry of inputs) {
      const amt = entry.amount ?? 0;
      if (!Number.isFinite(amt) || amt < 0) {
        return {
          valid: false,
          error: 'Individual share amounts cannot be negative.',
          shares: [],
          allocatedAmount: fromPaise(allocatedPaise),
          remainingAmount: fromPaise(totalPaise - allocatedPaise),
          allocatedPct: 0,
          remainingPct: 100,
        };
      }
      const p = toPaise(amt);
      allocatedPaise += p;
      shares.push({ personId: entry.personId, amount: fromPaise(p) });
    }

    const diffPaise = totalPaise - allocatedPaise;
    if (diffPaise !== 0) {
      return {
        valid: false,
        error:
          diffPaise > 0
            ? `Shares are short by ₹${fromPaise(diffPaise).toFixed(2)}.`
            : `Shares exceed total by ₹${fromPaise(Math.abs(diffPaise)).toFixed(2)}.`,
        shares,
        allocatedAmount: fromPaise(allocatedPaise),
        remainingAmount: fromPaise(diffPaise),
        allocatedPct: 0,
        remainingPct: 100,
      };
    }

    return {
      valid: true,
      shares,
      allocatedAmount: fromPaise(allocatedPaise),
      remainingAmount: 0,
      allocatedPct: 100,
      remainingPct: 0,
    };
  }

  // Percentage split
  let allocatedBps = 0; // percentage in basis points (100% = 10000)
  const pctEntries: { personId: string; percentage: number }[] = [];

  for (const entry of inputs) {
    const pct = entry.percentage ?? 0;
    if (!Number.isFinite(pct) || pct < 0) {
      return {
        valid: false,
        error: 'Percentages cannot be negative.',
        shares: [],
        allocatedAmount: 0,
        remainingAmount: fromPaise(totalPaise),
        allocatedPct: allocatedBps / 100,
        remainingPct: (10000 - allocatedBps) / 100,
      };
    }
    const bps = Math.round(pct * 100);
    allocatedBps += bps;
    pctEntries.push({ personId: entry.personId, percentage: bps / 100 });
  }

  const shares = calculatePercentageShares(fromPaise(totalPaise), pctEntries);
  const diffBps = 10000 - allocatedBps;

  if (diffBps !== 0) {
    return {
      valid: false,
      error:
        diffBps > 0
          ? `Percentages sum to ${(allocatedBps / 100).toFixed(2)}% (${(diffBps / 100).toFixed(2)}% remaining).`
          : `Percentages exceed 100% by ${(Math.abs(diffBps) / 100).toFixed(2)}%.`,
      shares,
      allocatedAmount: shares.reduce((s, sh) => roundCurrency(s + sh.amount), 0),
      remainingAmount: 0,
      allocatedPct: allocatedBps / 100,
      remainingPct: diffBps / 100,
    };
  }

  return {
    valid: true,
    shares,
    allocatedAmount: fromPaise(totalPaise),
    remainingAmount: 0,
    allocatedPct: 100,
    remainingPct: 0,
  };
}

export type SettlementStatus = 'settled' | 'partial' | 'unsettled';
export type ExpenseDirection = 'owed_to_me' | 'i_owe' | 'even';

export interface SharedExpenseView {
  expense: SharedExpense;
  paidByName: string;
  userShare: number;
  originalOwedAmount: number;
  settledAmount: number;
  remainingAmount: number;
  direction: ExpenseDirection;
  status: SettlementStatus;
  participantNames: string[];
}

export interface PersonExpenseView {
  expenseId: string;
  name: string;
  category: string;
  date: string;
  totalAmount: number;
  paidById: string;
  paidByName: string;
  personShare: number;
  userShare: number;
  originalOwed: number;
  settledAmount: number;
  remainingOwed: number;
  direction: 'owed_to_me' | 'i_owe' | 'none';
  status: SettlementStatus;
}

export interface PersonLedgerSummary {
  person: Person;
  owedToMe: number;
  iOwe: number;
  netBalance: number; // +ve: they owe user, -ve: user owes them
  unsettledCount: number;
  transactions: PersonExpenseView[];
  settlements: Settlement[];
}

export interface LedgerDashboardSummary {
  totalIOwe: number;
  totalOwedToMe: number;
  overallNetBalance: number;
  unsettledCount: number;
  settledCount: number;
  totalSharedCount: number;
}

export interface ComputedLedgerState {
  dashboard: LedgerDashboardSummary;
  personSummaries: Record<string, PersonLedgerSummary>;
  expenseViews: SharedExpenseView[];
  personNameMap: Record<string, string>;
}

interface Obligation {
  expenseId: string;
  debtorId: string;
  creditorId: string;
  originalPaise: number;
  remainingPaise: number;
  dateMs: number;
}

export function computeLedgerState(
  people: Person[],
  sharedExpenses: SharedExpense[],
  settlements: Settlement[]
): ComputedLedgerState {
  const personNameMap: Record<string, string> = {
    [SELF_PERSON_ID]: 'You',
  };
  for (const person of people) {
    personNameMap[person.id] = person.name;
  }

  // Sort expenses chronologically so FIFO settlement allocation is deterministic
  const sortedExpenses = [...sharedExpenses].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const obligations: Obligation[] = [];
  const expenseObligationsMap = new Map<string, Obligation[]>();

  for (const expense of sortedExpenses) {
    const expObs: Obligation[] = [];
    const dateMs = new Date(expense.date).getTime() || 0;

    if (expense.paidById === SELF_PERSON_ID) {
      for (const share of expense.participants) {
        if (share.personId === SELF_PERSON_ID) continue;
        const paise = Math.max(0, toPaise(share.amount));
        if (paise <= 0) continue;
        const ob: Obligation = {
          expenseId: expense.id,
          debtorId: share.personId,
          creditorId: SELF_PERSON_ID,
          originalPaise: paise,
          remainingPaise: paise,
          dateMs,
        };
        obligations.push(ob);
        expObs.push(ob);
      }
    } else {
      const selfParticipant = expense.participants.find(
        (p) => p.personId === SELF_PERSON_ID
      );
      const selfPaise = selfParticipant ? Math.max(0, toPaise(selfParticipant.amount)) : 0;
      if (selfPaise > 0) {
        const ob: Obligation = {
          expenseId: expense.id,
          debtorId: SELF_PERSON_ID,
          creditorId: expense.paidById,
          originalPaise: selfPaise,
          remainingPaise: selfPaise,
          dateMs,
        };
        obligations.push(ob);
        expObs.push(ob);
      }
    }

    expenseObligationsMap.set(expense.id, expObs);
  }

  // Sort settlements chronologically
  const sortedSettlements = [...settlements].sort((a, b) => {
    const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (diff !== 0) return diff;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  // Pass 1: Apply settlements tied to a specific expenseId first
  for (const st of sortedSettlements) {
    if (!st.expenseId) continue;
    let remainingPayPaise = Math.max(0, toPaise(st.amount));
    if (remainingPayPaise <= 0) continue;

    for (const ob of obligations) {
      if (
        ob.expenseId === st.expenseId &&
        ob.debtorId === st.fromPersonId &&
        ob.creditorId === st.toPersonId &&
        ob.remainingPaise > 0
      ) {
        const applied = Math.min(ob.remainingPaise, remainingPayPaise);
        ob.remainingPaise -= applied;
        remainingPayPaise -= applied;
      }
    }

    // Overflow spills FIFO to any other open obligations in same direction
    if (remainingPayPaise > 0) {
      for (const ob of obligations) {
        if (
          ob.debtorId === st.fromPersonId &&
          ob.creditorId === st.toPersonId &&
          ob.remainingPaise > 0
        ) {
          const applied = Math.min(ob.remainingPaise, remainingPayPaise);
          ob.remainingPaise -= applied;
          remainingPayPaise -= applied;
          if (remainingPayPaise <= 0) break;
        }
      }
    }
  }

  // Pass 2: Apply general settlements in FIFO chronological order
  for (const st of sortedSettlements) {
    if (st.expenseId) continue;
    let remainingPayPaise = Math.max(0, toPaise(st.amount));
    if (remainingPayPaise <= 0) continue;

    for (const ob of obligations) {
      if (
        ob.debtorId === st.fromPersonId &&
        ob.creditorId === st.toPersonId &&
        ob.remainingPaise > 0
      ) {
        const applied = Math.min(ob.remainingPaise, remainingPayPaise);
        ob.remainingPaise -= applied;
        remainingPayPaise -= applied;
        if (remainingPayPaise <= 0) break;
      }
    }
  }

  // Build SharedExpenseView list
  const expenseViews: SharedExpenseView[] = sharedExpenses.map((expense) => {
    const expObs = expenseObligationsMap.get(expense.id) ?? [];
    const originalOwedPaise = expObs.reduce((s, o) => s + o.originalPaise, 0);
    const remainingPaise = expObs.reduce((s, o) => s + o.remainingPaise, 0);
    const settledPaise = Math.max(0, originalOwedPaise - remainingPaise);

    const selfParticipant = expense.participants.find(
      (p) => p.personId === SELF_PERSON_ID
    );
    const userShare = selfParticipant ? roundCurrency(selfParticipant.amount) : 0;

    let status: SettlementStatus = 'unsettled';
    if (originalOwedPaise === 0 || remainingPaise === 0) {
      status = 'settled';
    } else if (settledPaise > 0) {
      status = 'partial';
    }

    let direction: ExpenseDirection = 'even';
    if (expense.paidById === SELF_PERSON_ID && originalOwedPaise > 0) {
      direction = 'owed_to_me';
    } else if (expense.paidById !== SELF_PERSON_ID && originalOwedPaise > 0) {
      direction = 'i_owe';
    }

    return {
      expense,
      paidByName: personNameMap[expense.paidById] ?? 'Unknown',
      userShare,
      originalOwedAmount: fromPaise(originalOwedPaise),
      settledAmount: fromPaise(settledPaise),
      remainingAmount: fromPaise(remainingPaise),
      direction,
      status,
      participantNames: expense.participants.map(
        (p) => personNameMap[p.personId] ?? 'Unknown'
      ),
    };
  });

  // Build PersonLedgerSummary for every person
  const personSummaries: Record<string, PersonLedgerSummary> = {};

  for (const person of people) {
    const personObs = obligations.filter(
      (o) => o.debtorId === person.id || o.creditorId === person.id
    );

    const owedToMePaise = personObs
      .filter((o) => o.debtorId === person.id && o.creditorId === SELF_PERSON_ID)
      .reduce((s, o) => s + o.remainingPaise, 0);

    const iOwePaise = personObs
      .filter((o) => o.debtorId === SELF_PERSON_ID && o.creditorId === person.id)
      .reduce((s, o) => s + o.remainingPaise, 0);

    const transactions: PersonExpenseView[] = [];

    for (const expense of sharedExpenses) {
      const personShareObj = expense.participants.find(
        (p) => p.personId === person.id
      );
      const involvesPerson =
        expense.paidById === person.id || personShareObj !== undefined;

      if (!involvesPerson) continue;

      const userShareObj = expense.participants.find(
        (p) => p.personId === SELF_PERSON_ID
      );
      const expObs = (expenseObligationsMap.get(expense.id) ?? []).filter(
        (o) => o.debtorId === person.id || o.creditorId === person.id
      );

      const originalPaise = expObs.reduce((s, o) => s + o.originalPaise, 0);
      const remainingPaise = expObs.reduce((s, o) => s + o.remainingPaise, 0);
      const settledPaise = Math.max(0, originalPaise - remainingPaise);

      let direction: PersonExpenseView['direction'] = 'none';
      if (expense.paidById === SELF_PERSON_ID && originalPaise > 0) {
        direction = 'owed_to_me';
      } else if (expense.paidById === person.id && originalPaise > 0) {
        direction = 'i_owe';
      }

      let status: SettlementStatus = 'settled';
      if (remainingPaise > 0) {
        status = settledPaise > 0 ? 'partial' : 'unsettled';
      }

      transactions.push({
        expenseId: expense.id,
        name: expense.name,
        category: expense.category,
        date: expense.date,
        totalAmount: expense.totalAmount,
        paidById: expense.paidById,
        paidByName: personNameMap[expense.paidById] ?? 'Unknown',
        personShare: personShareObj ? roundCurrency(personShareObj.amount) : 0,
        userShare: userShareObj ? roundCurrency(userShareObj.amount) : 0,
        originalOwed: fromPaise(originalPaise),
        settledAmount: fromPaise(settledPaise),
        remainingOwed: fromPaise(remainingPaise),
        direction,
        status,
      });
    }

    transactions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const personSettlements = settlements
      .filter((s) => s.fromPersonId === person.id || s.toPersonId === person.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    personSummaries[person.id] = {
      person,
      owedToMe: fromPaise(owedToMePaise),
      iOwe: fromPaise(iOwePaise),
      netBalance: fromPaise(owedToMePaise - iOwePaise),
      unsettledCount: transactions.filter((t) => t.remainingOwed > 0).length,
      transactions,
      settlements: personSettlements,
    };
  }

  const totalOwedToMePaise = Object.values(personSummaries).reduce(
    (s, p) => s + toPaise(p.owedToMe),
    0
  );
  const totalIOwePaise = Object.values(personSummaries).reduce(
    (s, p) => s + toPaise(p.iOwe),
    0
  );
  const unsettledCount = expenseViews.filter((e) => e.remainingAmount > 0).length;
  const settledCount = expenseViews.filter((e) => e.remainingAmount === 0).length;

  return {
    dashboard: {
      totalIOwe: fromPaise(totalIOwePaise),
      totalOwedToMe: fromPaise(totalOwedToMePaise),
      overallNetBalance: fromPaise(totalOwedToMePaise - totalIOwePaise),
      unsettledCount,
      settledCount,
      totalSharedCount: sharedExpenses.length,
    },
    personSummaries,
    expenseViews,
    personNameMap,
  };
}

export type LedgerFilter =
  | 'all'
  | 'i_owe'
  | 'owed_to_me'
  | 'settled'
  | 'unsettled';
export type LedgerSortBy = 'date' | 'amount';
export type LedgerSortOrder = 'desc' | 'asc';

export function filterAndSortExpenses(
  expenseViews: SharedExpenseView[],
  filter: LedgerFilter,
  sortBy: LedgerSortBy,
  sortOrder: LedgerSortOrder
): SharedExpenseView[] {
  const filtered = expenseViews.filter((view) => {
    switch (filter) {
      case 'i_owe':
        return view.direction === 'i_owe';
      case 'owed_to_me':
        return view.direction === 'owed_to_me';
      case 'settled':
        return view.status === 'settled';
      case 'unsettled':
        return view.status !== 'settled';
      case 'all':
      default:
        return true;
    }
  });

  return [...filtered].sort((a, b) => {
    const valA =
      sortBy === 'date'
        ? new Date(a.expense.date).getTime()
        : a.expense.totalAmount;
    const valB =
      sortBy === 'date'
        ? new Date(b.expense.date).getTime()
        : b.expense.totalAmount;
    return sortOrder === 'desc' ? valB - valA : valA - valB;
  });
}

export function getOutstandingDirectionAmount(
  ledger: ComputedLedgerState,
  fromPersonId: string,
  toPersonId: string
): number {
  if (fromPersonId === SELF_PERSON_ID && toPersonId !== SELF_PERSON_ID) {
    return ledger.personSummaries[toPersonId]?.iOwe ?? 0;
  }
  if (toPersonId === SELF_PERSON_ID && fromPersonId !== SELF_PERSON_ID) {
    return ledger.personSummaries[fromPersonId]?.owedToMe ?? 0;
  }
  return 0;
}

export function isDuplicateSettlement(
  existing: Settlement[],
  candidate: {
    fromPersonId: string;
    toPersonId: string;
    amount: number;
    expenseId?: string;
    note?: string;
  },
  nowMs: number = Date.now(),
  windowMs: number = 4000
): boolean {
  const candPaise = toPaise(candidate.amount);
  const candNote = (candidate.note ?? '').trim();

  return existing.some((s) => {
    const createdMs = new Date(s.createdAt).getTime();
    if (Number.isNaN(createdMs) || nowMs - createdMs > windowMs) return false;
    return (
      s.fromPersonId === candidate.fromPersonId &&
      s.toPersonId === candidate.toPersonId &&
      toPaise(s.amount) === candPaise &&
      (s.expenseId ?? '') === (candidate.expenseId ?? '') &&
      (s.note ?? '').trim() === candNote
    );
  });
}
