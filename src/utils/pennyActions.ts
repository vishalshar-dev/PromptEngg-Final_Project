import { useAppStore } from '../store/useStore';
import {
  SELF_PERSON_ID,
  type ExpenseParticipantShare,
  type PennyProposedAction,
  type Person,
} from '../types/models';
import type { AppSection } from '../components/ui/AppShell';
import { getNextDueDateString } from './martEngine';
import { roundCurrency } from './splitLedgerEngine';
import { formatCurrencyExact } from './categoryStyles';

export interface PennyActionExecutionResult {
  ok: boolean;
  message: string;
}

function buildEqualParticipants(
  participantIds: string[],
  totalAmount: number
): ExpenseParticipantShare[] {
  const count = participantIds.length;
  if (count === 0) return [];
  const totalPaise = Math.round(totalAmount * 100);
  const basePaise = Math.floor(totalPaise / count);
  let remainder = totalPaise - basePaise * count;

  return participantIds.map((personId) => {
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder -= 1;
    return {
      personId,
      amount: (basePaise + extra) / 100,
    };
  });
}

export function executePennyProposal(
  proposal: PennyProposedAction,
  onNavigate?: (section: AppSection, subTab?: string) => void
): PennyActionExecutionResult {
  const store = useAppStore.getState();

  switch (proposal.type) {
    case 'log_expense': {
      const ex = proposal.expense;
      if (!ex || !ex.name.trim() || ex.amount <= 0) {
        return { ok: false, message: 'Expense title or amount is invalid.' };
      }
      const timestamp =
        ex.date && /^\d{4}-\d{2}-\d{2}$/.test(ex.date)
          ? `${ex.date}T12:00:00.000Z`
          : new Date().toISOString();
      store.addTransaction({
        name: ex.name.trim(),
        amount: roundCurrency(ex.amount),
        category: ex.category || store.categories[0] || 'Groceries',
        timestamp,
        source: 'manual',
      });
      return {
        ok: true,
        message: `Logged "${ex.name.trim()}" (₹${formatCurrencyExact(ex.amount)}) under ${ex.category}.`,
      };
    }

    case 'add_split': {
      const sp = proposal.split;
      if (!sp || !sp.name.trim() || sp.totalAmount <= 0 || sp.participantNames.length === 0) {
        return { ok: false, message: 'Split expense details are incomplete.' };
      }

      const resolveOrCreatePerson = (rawName: string): Person => {
        const clean = rawName.trim();
        const existing = useAppStore
          .getState()
          .people.find((p) => p.name.toLowerCase() === clean.toLowerCase());
        return existing ?? useAppStore.getState().addPerson(clean);
      };

      const participantIds: string[] = [];
      if (sp.includeSelf !== false) {
        participantIds.push(SELF_PERSON_ID);
      }

      for (const name of sp.participantNames) {
        if (!name.trim() || name.trim().toLowerCase() === 'self' || name.trim().toLowerCase() === 'me') {
          if (!participantIds.includes(SELF_PERSON_ID)) participantIds.push(SELF_PERSON_ID);
          continue;
        }
        const p = resolveOrCreatePerson(name);
        if (!participantIds.includes(p.id)) {
          participantIds.push(p.id);
        }
      }

      let paidById: string = SELF_PERSON_ID;
      if (sp.paidBy && sp.paidBy.toLowerCase() !== 'self' && sp.paidBy.toLowerCase() !== 'me') {
        const payer = resolveOrCreatePerson(sp.paidBy);
        paidById = payer.id;
        if (!participantIds.includes(payer.id)) {
          participantIds.push(payer.id);
        }
      }

      const shares = buildEqualParticipants(participantIds, roundCurrency(sp.totalAmount));
      store.addSharedExpense({
        name: sp.name.trim(),
        totalAmount: roundCurrency(sp.totalAmount),
        category: sp.category || store.categories[0] || 'Groceries',
        date: new Date().toISOString(),
        paidById,
        splitMethod: 'equal',
        participants: shares,
        source: 'ledger',
      });

      return {
        ok: true,
        message: `Added split "${sp.name.trim()}" (₹${formatCurrencyExact(sp.totalAmount)}) across ${participantIds.length} people.`,
      };
    }

    case 'settle_split': {
      const st = proposal.settlement;
      if (!st || !st.personName.trim() || st.amount <= 0) {
        return { ok: false, message: 'Settlement amount or person is invalid.' };
      }
      const person = store.people.find(
        (p) => p.name.toLowerCase() === st.personName.trim().toLowerCase()
      );
      if (!person) {
        return {
          ok: false,
          message: `No split contact named "${st.personName.trim()}" found in your ledger.`,
        };
      }
      const res = store.recordSettlement({
        fromPersonId: st.direction === 'they_pay' ? person.id : SELF_PERSON_ID,
        toPersonId: st.direction === 'they_pay' ? SELF_PERSON_ID : person.id,
        amount: roundCurrency(st.amount),
        date: new Date().toISOString(),
        note: st.note || 'Settled via Penny',
      });
      if (!res.ok) {
        return { ok: false, message: res.error || 'Could not record settlement.' };
      }
      return {
        ok: true,
        message: `Recorded ₹${formatCurrencyExact(st.amount)} settlement with ${person.name}.`,
      };
    }

    case 'build_cart': {
      const lines = proposal.cartItems ?? [];
      let addedCount = 0;
      for (const line of lines) {
        const match =
          store.items.find((i) => i.id === line.itemId) ??
          store.items.find((i) => i.name.toLowerCase() === line.itemName.toLowerCase());
        if (!match) continue;
        store.addToCart(match, Math.max(1, line.quantity), line.variantId ?? match.selectedVariantId);
        addedCount += Math.max(1, line.quantity);
      }
      if (addedCount === 0) {
        return { ok: false, message: 'None of those catalog items matched your Quick Mart list.' };
      }
      return {
        ok: true,
        message: `Added ${addedCount} unit${addedCount === 1 ? '' : 's'} to your Quick Mart cart.`,
      };
    }

    case 'load_basket': {
      if (!proposal.basketId) {
        return { ok: false, message: 'No basket selected.' };
      }
      const count = store.loadBasketTemplateToCart(proposal.basketId, 'merge');
      return count > 0
        ? { ok: true, message: `Merged ${count} basket line${count === 1 ? '' : 's'} into your cart.` }
        : { ok: false, message: 'Could not load that basket into your cart.' };
    }

    case 'add_due_recurring': {
      const count = store.addDueRecurringToCart();
      return count > 0
        ? {
            ok: true,
            message: `Queued ${count} due recurring ${count === 1 ? 'item' : 'items'} in your cart.`,
          }
        : { ok: false, message: 'No recurring items are currently overdue or due today.' };
    }

    case 'set_budget': {
      const amt = Number(proposal.totalBudget);
      if (!Number.isFinite(amt) || amt <= 0) {
        return { ok: false, message: 'Monthly budget must be greater than ₹0.' };
      }
      store.setTotalBudget(roundCurrency(amt));
      return {
        ok: true,
        message: `Updated monthly budget to ₹${formatCurrencyExact(amt)}.`,
      };
    }

    case 'set_category_limit': {
      const cl = proposal.categoryLimit;
      if (!cl || !cl.category || cl.limitAmount <= 0) {
        return { ok: false, message: 'Invalid category limit details.' };
      }
      store.upsertCategoryLimit({
        category: cl.category,
        period: cl.period,
        limitAmount: roundCurrency(cl.limitAmount),
      });
      return {
        ok: true,
        message: `Set ${cl.category} ${cl.period} limit to ₹${formatCurrencyExact(cl.limitAmount)}.`,
      };
    }

    case 'toggle_broke_mode': {
      const target = Boolean(proposal.brokeModeEnabled);
      if (store.isBrokeMode !== target) {
        store.toggleBrokeMode();
      }
      return {
        ok: true,
        message: target
          ? 'Broke Mode is now ON — strict allowance guardrails active.'
          : 'Broke Mode turned OFF.',
      };
    }

    case 'set_recurrence': {
      const rc = proposal.recurrence;
      if (!rc) return { ok: false, message: 'Missing recurrence config.' };
      const item =
        store.items.find((i) => i.id === rc.itemId) ??
        store.items.find((i) => i.name.toLowerCase() === rc.itemName.toLowerCase());
      if (!item) {
        return { ok: false, message: `Could not find "${rc.itemName}" in your catalog.` };
      }
      const nextDueDate = getNextDueDateString({
        frequency: rc.frequency,
        intervalDays: rc.intervalDays,
      });
      store.setProductRecurrence(item.id, {
        frequency: rc.frequency,
        intervalDays: rc.intervalDays,
        nextDueDate,
      });
      return {
        ok: true,
        message: `Scheduled ${item.name} as ${rc.frequency} (next due ${nextDueDate}).`,
      };
    }

    case 'add_price_alert': {
      const pa = proposal.priceAlert;
      if (!pa || !pa.productId || !pa.productName) {
        return { ok: false, message: 'Missing price alert details.' };
      }
      store.addPriceAlert({
        productId: pa.productId,
        productName: pa.productName,
        unitOfMeasurement: pa.unitOfMeasurement || 'unit',
        targetUnitPrice: pa.targetUnitPrice,
        increaseThresholdPct: pa.increaseThresholdPct,
      });
      return {
        ok: true,
        message: `Created price alert for ${pa.productName}.`,
      };
    }

    case 'navigate': {
      if (!proposal.destination) {
        return { ok: false, message: 'No destination specified.' };
      }
      onNavigate?.(proposal.destination.section, proposal.destination.subTab);
      return {
        ok: true,
        message: `Opened ${proposal.destination.section}.`,
      };
    }

    default:
      return { ok: false, message: 'Unsupported action.' };
  }
}
