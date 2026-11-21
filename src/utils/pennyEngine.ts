import type {
  BasketTemplate,
  BrokeModeConfig,
  CartItem,
  CategoryCaps,
  CategorySpendingLimit,
  PennyChatMessage,
  PennyFocusTopic,
  PennyInteractionProfile,
  PennyProposedAction,
  PennyTonePreference,
  Person,
  PriceObservation,
  PurchaseSession,
  SavedAudit,
  Settlement,
  SharedExpense,
  Transaction,
} from '../types/models';
import {
  calculateCartTotals,
  calculateMonthlyShoppingSpend,
  evaluateBasketTemplate,
  getEffectivePriceAndUnit,
  getEffectiveTransactionAmount,
  isRecurringBillItem,
  toLocalDateKey,
} from './martEngine';
import {
  buildProductPriceSummaries,
} from './priceTrackerEngine';
import {
  computeCategoryAnalytics,
  computePeriodComparison,
  computeRadarOverview,
  resolveRadarWindow,
} from './radarEngine';
import { computeLedgerState, roundCurrency } from './splitLedgerEngine';

export type UpcomingCommitmentKind = 'recurring_bill' | 'recurring_restock' | 'split_payable';

export interface UpcomingCommitmentItem {
  id: string;
  kind: UpcomingCommitmentKind;
  title: string;
  subtitle: string;
  amount: number;
  dueDateKey: string | null; // YYYY-MM-DD or null for open split payable
  daysUntilDue: number | null; // negative = overdue
  isOverdue: boolean;
  isDueWithin7Days: boolean;
  isDueWithin30Days: boolean;
  itemId?: string;
  variantId?: string;
  personId?: string;
  category?: string;
}

export interface UpcomingCommitmentsSummary {
  commitments: UpcomingCommitmentItem[];
  dueOrOverdueRecurring: UpcomingCommitmentItem[];
  upcoming7DaysTotal: number;
  upcoming30DaysRecurringTotal: number;
  totalIOweSplits: number;
  totalOwedToMeSplits: number;
  committedUpcoming30d: number;
  monthlyBudget: number;
  currentMonthSpent: number;
  rawRemainingBudget: number;
  trueSafeToSpend: number;
  remainingDaysInMonth: number;
  safeDailySpend: number;
}

export type PennyActionType =
  | 'add_due_recurring'
  | 'quick_reorder_item'
  | 'load_basket'
  | 'open_expenses'
  | 'open_shopping'
  | 'open_prices'
  | 'open_wellness'
  | 'open_scanner'
  | 'none';

export interface SmartActionNudge {
  id: string;
  title: string;
  description: string;
  metricLabel: string;
  tone: 'positive' | 'warning' | 'neutral';
  actionType: PennyActionType;
  actionLabel: string;
  targetId?: string;
  variantId?: string;
}

export interface MonthlyMoneyDigest {
  monthLabel: string;
  totalSpent: number;
  monthlyBudget: number;
  budgetUsedPct: number;
  vsLastMonthDelta: number;
  vsLastMonthPct: number | null;
  topCategory: { name: string; amount: number; sharePct: number } | null;
  feeLeaksDetected: number;
  auditCount: number;
  netSplitBalance: number;
  txCount: number;
  isBrokeMode: boolean;
  disciplineCheckInsCount: number;
}

export interface PennyContextSnapshot {
  asOfDate: string;
  activeScreen: string;
  currency: 'INR';
  availableCategories: string[];
  budgetOverview: {
    monthlyBudget: number;
    currentMonthSpent: number;
    rawRemainingBudget: number;
    budgetUsedPct: number;
    isBrokeMode: boolean;
    brokeModeMonthlyAllowance: number | null;
  };
  currentCart: {
    lineCount: number;
    totalUnits: number;
    totalAmount: number;
    lines: Array<{
      itemId: string;
      name: string;
      quantity: number;
      unit: string;
      price: number;
      subtotal: number;
      category: string;
    }>;
  };
  futureCommitments: {
    committedUpcoming30d: number;
    upcoming7DaysTotal: number;
    upcoming30DaysRecurringTotal: number;
    totalIOweSplits: number;
    totalOwedToMeSplits: number;
    trueSafeToSpend: number;
    remainingDaysInMonth: number;
    safeDailySpend: number;
    items: Array<{
      kind: UpcomingCommitmentKind;
      title: string;
      amount: number;
      dueDate: string | null;
      daysUntilDue: number | null;
      status: string;
    }>;
  };
  categoryBreakdownThisMonth: Array<{
    category: string;
    spent: number;
    sharePct: number;
    cap: number | null;
    txCount: number;
  }>;
  recentTransactions: Array<{
    name: string;
    amount: number;
    category: string;
    date: string;
    classification?: string;
    source?: string;
  }>;
  recentOrders: Array<{
    date: string;
    totalAmount: number;
    personalShare: number;
    items: Array<{ name: string; unit?: string; quantity: number; price: number }>;
  }>;
  savedBaskets: Array<{
    id: string;
    name: string;
    savedTotal: number;
    currentTotal: number;
    priceDiff: number;
    itemCount: number;
  }>;
  catalogItems: Array<{
    id: string;
    name: string;
    category: string;
    price: number;
    unit: string;
    isRecurring: boolean;
    isBill: boolean;
  }>;
  peopleList: Array<{
    id: string;
    name: string;
  }>;
  priceHighlights: Array<{
    productName: string;
    latestUnitPrice: number;
    unit: string;
    deltaPctFromAvg: number;
  }>;
  pendingSplitsByPerson: Array<{
    personName: string;
    iOwe: number;
    owedToMe: number;
  }>;
  monthlyDigest: MonthlyMoneyDigest;
}

function parseDateKeyToLocalMiddayMs(dateKey: string): number | null {
  const match = dateKey.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const d = new Date(year, month, day, 12, 0, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

export function getRemainingDaysInMonthCount(now: Date = new Date()): number {
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Math.max(1, lastDay - now.getDate() + 1);
}

export function computeUpcomingCommitments(params: {
  items: CartItem[];
  people: Person[];
  sharedExpenses: SharedExpense[];
  settlements: Settlement[];
  transactions: Transaction[];
  totalBudget: number;
  now?: Date;
}): UpcomingCommitmentsSummary {
  const now = params.now ?? new Date();
  const todayMidday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    12,
    0,
    0,
    0
  ).getTime();

  const commitments: UpcomingCommitmentItem[] = [];

  for (const item of params.items) {
    if (!item.recurrence) continue;
    const { price, variant, unit } = getEffectivePriceAndUnit(item, item.selectedVariantId);
    const dueKey = item.recurrence.nextDueDate
      ? item.recurrence.nextDueDate.slice(0, 10)
      : toLocalDateKey(now);
    const dueMs = parseDateKeyToLocalMiddayMs(dueKey) ?? todayMidday;
    const daysUntilDue = Math.round((dueMs - todayMidday) / (1000 * 60 * 60 * 24));
    const isOverdue = daysUntilDue < 0;
    const isDueTodayOrOverdue = daysUntilDue <= 0;
    const isDueWithin7Days = daysUntilDue <= 7;
    const isDueWithin30Days = daysUntilDue <= 30;
    const isBill = isRecurringBillItem(item);

    const statusLabel = isOverdue
      ? `Overdue by ${Math.abs(daysUntilDue)}d`
      : daysUntilDue === 0
        ? 'Due today'
        : `Due in ${daysUntilDue}d`;

    commitments.push({
      id: `rec-${item.id}`,
      kind: isBill ? 'recurring_bill' : 'recurring_restock',
      title: variant ? `${item.name} (${variant.label})` : item.name,
      subtitle: `${item.recurrence.frequency} · ${unit} · ${statusLabel}`,
      amount: roundCurrency(price),
      dueDateKey: dueKey,
      daysUntilDue,
      isOverdue: isDueTodayOrOverdue,
      isDueWithin7Days,
      isDueWithin30Days,
      itemId: item.id,
      variantId: variant?.id,
      category: item.category,
    });
  }

  const ledger = computeLedgerState(
    params.people,
    params.sharedExpenses,
    params.settlements
  );

  for (const summary of Object.values(ledger.personSummaries)) {
    if (summary.iOwe > 0) {
      commitments.push({
        id: `split-owe-${summary.person.id}`,
        kind: 'split_payable',
        title: `Settle split with ${summary.person.name}`,
        subtitle: `${summary.unsettledCount} unsettled shared expense${
          summary.unsettledCount === 1 ? '' : 's'
        }`,
        amount: roundCurrency(summary.iOwe),
        dueDateKey: null,
        daysUntilDue: 0,
        isOverdue: false,
        isDueWithin7Days: true,
        isDueWithin30Days: true,
        personId: summary.person.id,
      });
    }
  }

  commitments.sort((a, b) => {
    const aDays = a.daysUntilDue ?? 999;
    const bDays = b.daysUntilDue ?? 999;
    if (aDays !== bDays) return aDays - bDays;
    return b.amount - a.amount;
  });

  const dueOrOverdueRecurring = commitments.filter(
    (c) => c.kind !== 'split_payable' && (c.daysUntilDue ?? 1) <= 0
  );

  const upcoming30DaysRecurringTotal = roundCurrency(
    commitments
      .filter((c) => c.kind !== 'split_payable' && c.isDueWithin30Days)
      .reduce((sum, c) => sum + c.amount, 0)
  );

  const upcoming7DaysRecurringTotal = roundCurrency(
    commitments
      .filter((c) => c.kind !== 'split_payable' && c.isDueWithin7Days)
      .reduce((sum, c) => sum + c.amount, 0)
  );

  const totalIOweSplits = roundCurrency(ledger.dashboard.totalIOwe);
  const totalOwedToMeSplits = roundCurrency(ledger.dashboard.totalOwedToMe);
  const upcoming7DaysTotal = roundCurrency(upcoming7DaysRecurringTotal + totalIOweSplits);
  const committedUpcoming30d = roundCurrency(upcoming30DaysRecurringTotal + totalIOweSplits);

  const monthlyBudget = roundCurrency(Math.max(0, params.totalBudget));
  const currentMonthSpent = calculateMonthlyShoppingSpend(params.transactions, now);
  const rawRemainingBudget = roundCurrency(monthlyBudget - currentMonthSpent);
  const trueSafeToSpend = roundCurrency(rawRemainingBudget - committedUpcoming30d);
  const remainingDaysInMonth = getRemainingDaysInMonthCount(now);
  const safeDailySpend = roundCurrency(
    Math.max(0, trueSafeToSpend) / remainingDaysInMonth
  );

  return {
    commitments,
    dueOrOverdueRecurring,
    upcoming7DaysTotal,
    upcoming30DaysRecurringTotal,
    totalIOweSplits,
    totalOwedToMeSplits,
    committedUpcoming30d,
    monthlyBudget,
    currentMonthSpent,
    rawRemainingBudget,
    trueSafeToSpend,
    remainingDaysInMonth,
    safeDailySpend,
  };
}

export function buildSmartActionNudges(params: {
  commitmentsSummary: UpcomingCommitmentsSummary;
  items: CartItem[];
  basketTemplates: BasketTemplate[];
  priceObservations: PriceObservation[];
  savedAudits: SavedAudit[];
}): SmartActionNudge[] {
  const nudges: SmartActionNudge[] = [];

  if (params.commitmentsSummary.dueOrOverdueRecurring.length > 0) {
    const dueTotal = roundCurrency(
      params.commitmentsSummary.dueOrOverdueRecurring.reduce(
        (s, c) => s + c.amount,
        0
      )
    );
    const count = params.commitmentsSummary.dueOrOverdueRecurring.length;
    nudges.push({
      id: 'nudge-due-recurring',
      title: `${count} recurring ${count === 1 ? 'item is' : 'items are'} due now`,
      description: `Queue due refills/bills (${params.commitmentsSummary.dueOrOverdueRecurring
        .slice(0, 2)
        .map((c) => c.title)
        .join(', ')}) into your cart in one click.`,
      metricLabel: `₹${dueTotal}`,
      tone: 'warning',
      actionType: 'add_due_recurring',
      actionLabel: 'Add Due to Cart',
    });
  } else {
    const nextSoon = params.commitmentsSummary.commitments.find(
      (c) => c.kind !== 'split_payable' && c.isDueWithin7Days && c.itemId
    );
    if (nextSoon && nextSoon.itemId) {
      nudges.push({
        id: `nudge-soon-${nextSoon.itemId}`,
        title: `Upcoming refill: ${nextSoon.title}`,
        description: nextSoon.subtitle,
        metricLabel: `₹${nextSoon.amount}`,
        tone: 'neutral',
        actionType: 'quick_reorder_item',
        actionLabel: 'Queue in Cart',
        targetId: nextSoon.itemId,
        variantId: nextSoon.variantId,
      });
    }
  }

  if (params.commitmentsSummary.totalIOweSplits > 0) {
    nudges.push({
      id: 'nudge-splits-owe',
      title: 'Pending split settlements to pay',
      description: `You owe ₹${params.commitmentsSummary.totalIOweSplits} across shared bills. Clearing them keeps your safe-to-spend accurate.`,
      metricLabel: `₹${params.commitmentsSummary.totalIOweSplits}`,
      tone: 'warning',
      actionType: 'open_expenses',
      actionLabel: 'Open Splits',
    });
  }

  const priceSummaries = buildProductPriceSummaries(
    params.priceObservations,
    params.items
  );
  const bestDrop = priceSummaries
    .filter((s) => s.purchaseCount >= 2 && s.vsAveragePct !== null && s.vsAveragePct <= -4)
    .sort((a, b) => (a.vsAveragePct ?? 0) - (b.vsAveragePct ?? 0))[0];

  if (bestDrop && bestDrop.vsAveragePct !== null) {
    nudges.push({
      id: `nudge-price-drop-${bestDrop.productId}`,
      title: `Price drop on ${bestDrop.productName}`,
      description: `Currently ₹${bestDrop.latestPrice}/${bestDrop.unitOfMeasurement}, ${Math.abs(
        bestDrop.vsAveragePct
      )}% below your tracked average.`,
      metricLabel: `${bestDrop.vsAveragePct}%`,
      tone: 'positive',
      actionType: 'open_prices',
      actionLabel: 'Inspect Price',
    });
  }

  const discountedBasket = params.basketTemplates
    .map((b) => evaluateBasketTemplate(b, params.items))
    .filter((ev) => ev.priceDiff < -5)
    .sort((a, b) => a.priceDiff - b.priceDiff)[0];

  if (discountedBasket) {
    nudges.push({
      id: `nudge-basket-save-${discountedBasket.basket.id}`,
      title: `${discountedBasket.basket.name} is cheaper now`,
      description: `Live catalog total is ₹${Math.abs(
        discountedBasket.priceDiff
      )} lower than your saved baseline.`,
      metricLabel: `-₹${Math.abs(discountedBasket.priceDiff)}`,
      tone: 'positive',
      actionType: 'load_basket',
      actionLabel: 'Load Basket',
      targetId: discountedBasket.basket.id,
    });
  }

  const totalFeesCaught = roundCurrency(
    params.savedAudits.reduce((sum, a) => sum + (a.extraFees || 0), 0)
  );
  if (totalFeesCaught > 0) {
    nudges.push({
      id: 'nudge-fee-leaks',
      title: `₹${totalFeesCaught} in extra fees audited`,
      description:
        'Batch small top-up orders into your saved baskets to avoid repeat delivery and handling fees.',
      metricLabel: `${params.savedAudits.length} audits`,
      tone: 'neutral',
      actionType: 'open_shopping',
      actionLabel: 'Open Baskets',
    });
  }

  return nudges.slice(0, 4);
}

export function computeMonthlyDigest(params: {
  transactions: Transaction[];
  totalBudget: number;
  categories: string[];
  categoryCaps: CategoryCaps;
  savedAudits: SavedAudit[];
  people: Person[];
  sharedExpenses: SharedExpense[];
  settlements: Settlement[];
  isBrokeMode: boolean;
  disciplineCheckIns: string[];
  now?: Date;
}): MonthlyMoneyDigest {
  const now = params.now ?? new Date();
  const monthWindow = resolveRadarWindow('this_month', undefined, undefined, now);
  const overview = computeRadarOverview({
    transactions: params.transactions,
    totalBudget: params.totalBudget,
    window: monthWindow,
    now,
  });
  const comparison = computePeriodComparison({
    transactions: params.transactions,
    preset: 'month_over_month',
    selectedWindow: monthWindow,
    now,
  });
  const ledger = computeLedgerState(
    params.people,
    params.sharedExpenses,
    params.settlements
  );
  const feeLeaksDetected = roundCurrency(
    params.savedAudits.reduce((sum, a) => sum + Math.max(0, a.extraFees || 0), 0)
  );

  return {
    monthLabel: now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    totalSpent: overview.currentMonthSpent,
    monthlyBudget: overview.monthlyBudget,
    budgetUsedPct: overview.budgetUtilisationPct,
    vsLastMonthDelta: comparison.amountDiff,
    vsLastMonthPct: comparison.pctChange,
    topCategory: overview.highestCategory
      ? {
          name: overview.highestCategory.category,
          amount: overview.highestCategory.amount,
          sharePct: overview.highestCategory.sharePct,
        }
      : null,
    feeLeaksDetected,
    auditCount: params.savedAudits.length,
    netSplitBalance: ledger.dashboard.overallNetBalance,
    txCount: overview.txCount,
    isBrokeMode: params.isBrokeMode,
    disciplineCheckInsCount: params.disciplineCheckIns.length,
  };
}

export function buildPennyContextSnapshot(params: {
  items: CartItem[];
  transactions: Transaction[];
  purchaseHistory: PurchaseSession[];
  totalBudget: number;
  categories: string[];
  categoryCaps: CategoryCaps;
  categoryLimits: CategorySpendingLimit[];
  people: Person[];
  sharedExpenses: SharedExpense[];
  settlements: Settlement[];
  basketTemplates: BasketTemplate[];
  priceObservations: PriceObservation[];
  savedAudits: SavedAudit[];
  isBrokeMode: boolean;
  brokeModeConfig: BrokeModeConfig;
  disciplineCheckIns: string[];
  activeScreen?: string;
  now?: Date;
}): PennyContextSnapshot {
  const now = params.now ?? new Date();
  const commitments = computeUpcomingCommitments({
    items: params.items,
    people: params.people,
    sharedExpenses: params.sharedExpenses,
    settlements: params.settlements,
    transactions: params.transactions,
    totalBudget: params.totalBudget,
    now,
  });
  const monthlyDigest = computeMonthlyDigest({
    transactions: params.transactions,
    totalBudget: params.totalBudget,
    categories: params.categories,
    categoryCaps: params.categoryCaps,
    savedAudits: params.savedAudits,
    people: params.people,
    sharedExpenses: params.sharedExpenses,
    settlements: params.settlements,
    isBrokeMode: params.isBrokeMode,
    disciplineCheckIns: params.disciplineCheckIns,
    now,
  });

  const monthWindow = resolveRadarWindow('this_month', undefined, undefined, now);
  const categoryAnalytics = computeCategoryAnalytics({
    transactions: params.transactions,
    categories: params.categories,
    categoryCaps: params.categoryCaps,
    window: monthWindow,
    now,
  });

  const ledger = computeLedgerState(
    params.people,
    params.sharedExpenses,
    params.settlements
  );

  const priceSummaries = buildProductPriceSummaries(
    params.priceObservations,
    params.items
  );

  const cartTotals = calculateCartTotals(params.items);

  const recentTransactions = [...params.transactions]
    .filter((tx) => tx.status !== 'cancelled')
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, 25)
    .map((tx) => ({
      name: tx.name,
      amount: getEffectiveTransactionAmount(tx),
      category: tx.category,
      date: tx.timestamp.slice(0, 10),
      classification: tx.classification,
      source: tx.source,
    }));

  const recentOrders = [...params.purchaseHistory]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, 8)
    .map((order) => ({
      date: order.timestamp.slice(0, 10),
      totalAmount: order.totalAmount,
      personalShare: order.personalShare,
      items: order.items.slice(0, 8).map((i) => ({
        name: i.name,
        unit: i.unit,
        quantity: i.quantity,
        price: i.subtotal,
      })),
    }));

  const savedBaskets = params.basketTemplates.slice(0, 10).map((b) => {
    const ev = evaluateBasketTemplate(b, params.items);
    return {
      id: b.id,
      name: b.name,
      savedTotal: ev.savedTotal,
      currentTotal: ev.currentTotal,
      priceDiff: ev.priceDiff,
      itemCount: ev.lineCount,
    };
  });

  const catalogItems = [...params.items]
    .sort((a, b) => {
      const aWeight = (a.quantity > 0 ? 4 : 0) + (a.isFavourite ? 2 : 0) + (a.isFrequent ? 1 : 0);
      const bWeight = (b.quantity > 0 ? 4 : 0) + (b.isFavourite ? 2 : 0) + (b.isFrequent ? 1 : 0);
      if (aWeight !== bWeight) return bWeight - aWeight;
      return (b.purchaseCount ?? 0) - (a.purchaseCount ?? 0);
    })
    .slice(0, 48)
    .map((item) => {
      const { price, unit } = getEffectivePriceAndUnit(item, item.selectedVariantId);
      return {
        id: item.id,
        name: item.name,
        category: item.category,
        price: roundCurrency(price),
        unit,
        isRecurring: Boolean(item.recurrence),
        isBill: isRecurringBillItem(item),
      };
    });

  return {
    asOfDate: toLocalDateKey(now),
    activeScreen: params.activeScreen || 'overview',
    currency: 'INR',
    availableCategories: params.categories.slice(0, 30),
    budgetOverview: {
      monthlyBudget: commitments.monthlyBudget,
      currentMonthSpent: commitments.currentMonthSpent,
      rawRemainingBudget: commitments.rawRemainingBudget,
      budgetUsedPct: monthlyDigest.budgetUsedPct,
      isBrokeMode: params.isBrokeMode,
      brokeModeMonthlyAllowance: params.isBrokeMode
        ? params.brokeModeConfig.monthlyAllowance
        : null,
    },
    currentCart: {
      lineCount: cartTotals.lineCount,
      totalUnits: cartTotals.totalUnits,
      totalAmount: roundCurrency(cartTotals.totalAmount),
      lines: cartTotals.lines.slice(0, 16).map((l) => ({
        itemId: l.item.id,
        name: l.variantLabel ? `${l.item.name} (${l.variantLabel})` : l.item.name,
        quantity: l.quantity,
        unit: l.unit,
        price: l.price,
        subtotal: l.subtotal,
        category: l.item.category,
      })),
    },
    futureCommitments: {
      committedUpcoming30d: commitments.committedUpcoming30d,
      upcoming7DaysTotal: commitments.upcoming7DaysTotal,
      upcoming30DaysRecurringTotal: commitments.upcoming30DaysRecurringTotal,
      totalIOweSplits: commitments.totalIOweSplits,
      totalOwedToMeSplits: commitments.totalOwedToMeSplits,
      trueSafeToSpend: commitments.trueSafeToSpend,
      remainingDaysInMonth: commitments.remainingDaysInMonth,
      safeDailySpend: commitments.safeDailySpend,
      items: commitments.commitments.slice(0, 20).map((c) => ({
        kind: c.kind,
        title: c.title,
        amount: c.amount,
        dueDate: c.dueDateKey,
        daysUntilDue: c.daysUntilDue,
        status: c.subtitle,
      })),
    },
    categoryBreakdownThisMonth: categoryAnalytics.categories
      .filter((c) => c.totalSpent > 0 || c.allocatedCap !== null)
      .slice(0, 14)
      .map((c) => ({
        category: c.category,
        spent: c.totalSpent,
        sharePct: c.sharePct,
        cap: c.allocatedCap,
        txCount: c.txCount,
      })),
    recentTransactions,
    recentOrders,
    savedBaskets,
    catalogItems,
    peopleList: params.people.slice(0, 25).map((p) => ({ id: p.id, name: p.name })),
    priceHighlights: priceSummaries
      .filter((p) => p.purchaseCount >= 1)
      .slice(0, 12)
      .map((p) => ({
        productName: p.productName,
        latestUnitPrice: p.latestPrice,
        unit: p.unitOfMeasurement,
        deltaPctFromAvg: p.vsAveragePct ?? 0,
      })),
    pendingSplitsByPerson: Object.values(ledger.personSummaries)
      .filter((p) => p.iOwe > 0 || p.owedToMe > 0)
      .map((p) => ({
        personName: p.person.name,
        iOwe: p.iOwe,
        owedToMe: p.owedToMe,
      })),
    monthlyDigest,
  };
}

const DEFAULT_FOCUS_WEIGHTS: Record<PennyFocusTopic, number> = {
  general: 0,
  groceries: 0,
  splits: 0,
  budgets: 0,
  discipline: 0,
  prices: 0,
};

export const DEFAULT_PENNY_PROFILE: PennyInteractionProfile = {
  tonePreference: 'auto',
  messageCount: 0,
  avgUserWords: 10,
  conciseBias: 50,
  casualBias: 55,
  focusWeights: { ...DEFAULT_FOCUS_WEIGHTS },
  topFocus: 'general',
  resolvedSummary: 'Auto · Balanced · Warm',
};

const TOPIC_KEYWORDS: Record<Exclude<PennyFocusTopic, 'general'>, string[]> = {
  groceries: [
    'milk',
    'eggs',
    'rice',
    'grocery',
    'groceries',
    'cart',
    'basket',
    'recipe',
    'meal',
    'cook',
    'dinner',
    'breakfast',
    'lunch',
    'snack',
    'snacks',
    'mart',
    'refill',
    'reorder',
    'order',
    'veggies',
    'fruits',
    'item',
  ],
  splits: [
    'split',
    'owe',
    'owes',
    'owed',
    'settle',
    'settlement',
    'shared',
    'roommate',
    'friend',
    'friends',
    'duo',
    'divide',
    'pay back',
  ],
  budgets: [
    'budget',
    'spend',
    'spent',
    'spending',
    'remaining',
    'left',
    'safe',
    'allowance',
    'cap',
    'limit',
    'afford',
    'daily',
    'monthly',
    'upcoming',
    'bill',
    'bills',
    'payment',
    'payments',
  ],
  discipline: [
    'broke mode',
    'broke',
    'junk',
    'impulse',
    'impulsive',
    'save',
    'saving',
    'savings',
    'streak',
    'challenge',
    'cut',
    'discipline',
    'frugal',
    'war room',
  ],
  prices: [
    'price',
    'prices',
    'cheaper',
    'expensive',
    'costly',
    'rate',
    'inflation',
    'alert',
    'track',
    'drop',
    'spike',
    'unit',
  ],
};

const CASUAL_CUES = [
  'yo',
  'hey',
  'hi',
  'bro',
  'dude',
  'pls',
  'plz',
  'thx',
  'thanks',
  'lol',
  'haha',
  'ok',
  'okay',
  'cool',
  'gonna',
  'wanna',
  'rn',
  'tbh',
  'ya',
  'yep',
  'nope',
];

const FORMAL_CUES = [
  'please',
  'kindly',
  'analyze',
  'analysis',
  'breakdown',
  'summarize',
  'summary',
  'recommend',
  'recommendation',
  'regarding',
  'detailed',
  'comprehensive',
  'explain',
];

const TOPIC_DISPLAY_LABELS: Record<PennyFocusTopic, string> = {
  general: 'General',
  groceries: 'Cart & Meals',
  splits: 'Splits',
  budgets: 'Budgets',
  discipline: 'Savings & Control',
  prices: 'Prices',
};

export function describePennyStyle(
  profile: PennyInteractionProfile,
  isBrokeMode: boolean = false
): string {
  const parts: string[] = [];

  if (profile.tonePreference === 'strict_coach') {
    parts.push('Strict Coach');
  } else if (profile.tonePreference === 'friendly') {
    parts.push('Friendly');
  } else if (profile.tonePreference === 'crisp') {
    parts.push('Crisp');
  } else {
    parts.push('Auto');
    parts.push(
      profile.conciseBias >= 65
        ? 'Concise'
        : profile.conciseBias <= 35
          ? 'Detailed'
          : 'Balanced'
    );
    parts.push(
      profile.casualBias >= 65
        ? 'Casual'
        : profile.casualBias <= 35
          ? 'Formal'
          : 'Warm'
    );
  }

  if (isBrokeMode && profile.tonePreference === 'auto') {
    parts.push('Broke-Mode Guard');
  }

  if (profile.topFocus !== 'general' && profile.messageCount > 0) {
    parts.push(`Focus: ${TOPIC_DISPLAY_LABELS[profile.topFocus]}`);
  }

  return parts.join(' · ');
}

export function evolvePennyProfile(
  current: PennyInteractionProfile,
  userText: string,
  options?: { isBrokeMode?: boolean; nowIso?: string }
): PennyInteractionProfile {
  const trimmed = userText.trim();
  if (!trimmed) return current;

  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const lower = trimmed.toLowerCase();
  const nextCount = current.messageCount + 1;
  const prevAvg = current.avgUserWords || 10;
  const nextAvgWords = Math.round(((prevAvg * current.messageCount + wordCount) / nextCount) * 10) / 10;

  // Shift conciseness smoothly based on user message length
  let conciseDelta = 0;
  if (wordCount <= 7) conciseDelta = 12;
  else if (wordCount <= 12) conciseDelta = 4;
  else if (wordCount >= 24) conciseDelta = -14;
  else if (wordCount >= 16) conciseDelta = -7;

  if (lower.includes('short') || lower.includes('quick') || lower.includes('tldr') || lower.includes('brief')) {
    conciseDelta += 14;
  }
  if (lower.includes('detail') || lower.includes('explain') || lower.includes('step by step') || lower.includes('why')) {
    conciseDelta -= 14;
  }

  const nextConcise = Math.min(100, Math.max(0, Math.round(current.conciseBias + conciseDelta)));

  // Shift casual vs formal tone
  let casualDelta = 0;
  const tokenWords = lower.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  for (const cue of CASUAL_CUES) {
    if (tokenWords.includes(cue)) casualDelta += 8;
  }
  for (const cue of FORMAL_CUES) {
    if (lower.includes(cue)) casualDelta -= 9;
  }
  if (trimmed.includes('!') || /[\u{1F300}-\u{1FAFF}]/u.test(trimmed)) {
    casualDelta += 5;
  }
  if (wordCount <= 6 && !FORMAL_CUES.some((c) => lower.includes(c))) {
    casualDelta += 3;
  }
  const nextCasual = Math.min(100, Math.max(0, Math.round(current.casualBias + casualDelta)));

  // Update focus topic weights
  const nextWeights: Record<PennyFocusTopic, number> = {
    ...DEFAULT_FOCUS_WEIGHTS,
    ...current.focusWeights,
  };

  let matchedAnyTopic = false;
  (Object.keys(TOPIC_KEYWORDS) as Array<Exclude<PennyFocusTopic, 'general'>>).forEach((topic) => {
    let hits = 0;
    for (const kw of TOPIC_KEYWORDS[topic]) {
      if (kw.includes(' ')) {
        if (lower.includes(kw)) hits += 1;
      } else if (tokenWords.includes(kw) || lower.includes(kw)) {
        hits += 1;
      }
    }
    if (hits > 0) {
      nextWeights[topic] = (nextWeights[topic] ?? 0) + Math.min(3, hits);
      matchedAnyTopic = true;
    }
  });

  if (!matchedAnyTopic) {
    nextWeights.general = (nextWeights.general ?? 0) + 1;
  }

  let topFocus: PennyFocusTopic = current.topFocus;
  let bestWeight = 0;
  for (const topic of ['groceries', 'splits', 'budgets', 'discipline', 'prices'] as PennyFocusTopic[]) {
    if ((nextWeights[topic] ?? 0) > bestWeight) {
      bestWeight = nextWeights[topic];
      topFocus = topic;
    }
  }
  if (bestWeight === 0) topFocus = 'general';

  const draft: PennyInteractionProfile = {
    ...current,
    messageCount: nextCount,
    avgUserWords: nextAvgWords,
    conciseBias: nextConcise,
    casualBias: nextCasual,
    focusWeights: nextWeights,
    topFocus,
    resolvedSummary: '',
    lastUpdatedAt: options?.nowIso ?? new Date().toISOString(),
  };

  draft.resolvedSummary = describePennyStyle(draft, Boolean(options?.isBrokeMode));
  return draft;
}

const VALID_TONES: Set<PennyTonePreference> = new Set([
  'auto',
  'friendly',
  'strict_coach',
  'crisp',
]);

export function sanitizePennyProfile(raw: unknown): PennyInteractionProfile {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_PENNY_PROFILE, focusWeights: { ...DEFAULT_FOCUS_WEIGHTS } };
  }
  const obj = raw as Partial<PennyInteractionProfile>;
  const tonePreference: PennyTonePreference =
    obj.tonePreference && VALID_TONES.has(obj.tonePreference)
      ? obj.tonePreference
      : 'auto';
  const focusWeights: Record<PennyFocusTopic, number> = {
    general: Number(obj.focusWeights?.general) || 0,
    groceries: Number(obj.focusWeights?.groceries) || 0,
    splits: Number(obj.focusWeights?.splits) || 0,
    budgets: Number(obj.focusWeights?.budgets) || 0,
    discipline: Number(obj.focusWeights?.discipline) || 0,
    prices: Number(obj.focusWeights?.prices) || 0,
  };
  let topFocus: PennyFocusTopic = 'general';
  let best = 0;
  for (const t of ['groceries', 'splits', 'budgets', 'discipline', 'prices'] as PennyFocusTopic[]) {
    if (focusWeights[t] > best) {
      best = focusWeights[t];
      topFocus = t;
    }
  }
  const sanitized: PennyInteractionProfile = {
    tonePreference,
    messageCount: Math.max(0, Math.round(Number(obj.messageCount) || 0)),
    avgUserWords: Math.max(1, Number(obj.avgUserWords) || 10),
    conciseBias: Math.min(100, Math.max(0, Math.round(Number(obj.conciseBias ?? 50)))),
    casualBias: Math.min(100, Math.max(0, Math.round(Number(obj.casualBias ?? 55)))),
    focusWeights,
    topFocus,
    resolvedSummary: '',
    lastUpdatedAt: typeof obj.lastUpdatedAt === 'string' ? obj.lastUpdatedAt : undefined,
  };
  sanitized.resolvedSummary = describePennyStyle(sanitized, false);
  return sanitized;
}

export function sanitizePennyMessages(raw: unknown): PennyChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const cleaned: PennyChatMessage[] = [];
  for (const entry of raw.slice(-50)) {
    if (!entry || typeof entry !== 'object') continue;
    const msg = entry as Partial<PennyChatMessage>;
    if ((msg.role !== 'user' && msg.role !== 'assistant') || typeof msg.text !== 'string') {
      continue;
    }
    cleaned.push({
      id: typeof msg.id === 'string' && msg.id ? msg.id : `p-${cleaned.length}`,
      role: msg.role,
      text: msg.text,
      highlights: Array.isArray(msg.highlights)
        ? msg.highlights
            .filter(
              (h) =>
                Boolean(h) &&
                typeof h.label === 'string' &&
                typeof h.value === 'string'
            )
            .slice(0, 3)
        : undefined,
      proposedActions: Array.isArray(msg.proposedActions)
        ? msg.proposedActions.slice(0, 4)
        : undefined,
      followUpQuestions: Array.isArray(msg.followUpQuestions)
        ? msg.followUpQuestions.filter((q): q is string => typeof q === 'string').slice(0, 3)
        : undefined,
      timestamp: typeof msg.timestamp === 'string' ? msg.timestamp : new Date().toISOString(),
      pageContext: typeof msg.pageContext === 'string' ? msg.pageContext : undefined,
    });
  }
  return cleaned;
}

const VALID_SECTIONS = new Set([
  'overview',
  'shopping',
  'insights',
  'expenses',
  'scanner',
  'wellness',
]);

export function normalizePennyProposals(
  rawProposals: unknown,
  deps: {
    items: CartItem[];
    basketTemplates: BasketTemplate[];
    categories: string[];
  }
): PennyProposedAction[] {
  if (!Array.isArray(rawProposals)) return [];

  const result: PennyProposedAction[] = [];
  const itemsById = new Map(deps.items.map((i) => [i.id, i]));
  const itemsByName = new Map(deps.items.map((i) => [i.name.trim().toLowerCase(), i]));
  const basketsById = new Map(deps.basketTemplates.map((b) => [b.id, b]));
  const fallbackCategory = deps.categories[0] || 'Groceries';

  const matchCategory = (rawCat: unknown): string => {
    if (typeof rawCat !== 'string' || !rawCat.trim()) return fallbackCategory;
    const found = deps.categories.find(
      (c) => c.toLowerCase() === rawCat.trim().toLowerCase()
    );
    return found ?? fallbackCategory;
  };

  for (let idx = 0; idx < rawProposals.length && result.length < 3; idx++) {
    const raw = rawProposals[idx];
    if (!raw || typeof raw !== 'object') continue;
    const p = raw as Record<string, unknown>;
    const type = typeof p.type === 'string' ? p.type : '';
    const title = typeof p.title === 'string' && p.title.trim() ? p.title.trim() : '';
    const summary = typeof p.summary === 'string' ? p.summary.trim() : '';
    const id = `act-${Date.now()}-${idx}`;

    if (type === 'log_expense' && p.expense && typeof p.expense === 'object') {
      const ex = p.expense as Record<string, unknown>;
      const name = typeof ex.name === 'string' ? ex.name.trim() : '';
      const amount = Number(ex.amount);
      if (!name || !Number.isFinite(amount) || amount <= 0) continue;
      const dateStr =
        typeof ex.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ex.date)
          ? ex.date
          : undefined;
      result.push({
        id,
        type: 'log_expense',
        title: title || `Log ₹${roundCurrency(amount)} expense`,
        summary: summary || `${name} · ${matchCategory(ex.category)}`,
        status: 'pending',
        expense: {
          name,
          amount: roundCurrency(amount),
          category: matchCategory(ex.category),
          date: dateStr,
        },
      });
    } else if (type === 'add_split' && p.split && typeof p.split === 'object') {
      const sp = p.split as Record<string, unknown>;
      const name = typeof sp.name === 'string' ? sp.name.trim() : '';
      const totalAmount = Number(sp.totalAmount);
      const participantNames = Array.isArray(sp.participantNames)
        ? sp.participantNames
            .filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
            .map((n) => n.trim())
        : [];
      if (!name || !Number.isFinite(totalAmount) || totalAmount <= 0 || participantNames.length === 0) {
        continue;
      }
      result.push({
        id,
        type: 'add_split',
        title: title || `Split ₹${roundCurrency(totalAmount)}`,
        summary: summary || `${name} with ${participantNames.join(', ')}`,
        status: 'pending',
        split: {
          name,
          totalAmount: roundCurrency(totalAmount),
          category: matchCategory(sp.category),
          paidBy: typeof sp.paidBy === 'string' && sp.paidBy.trim() ? sp.paidBy.trim() : 'self',
          participantNames,
          includeSelf: sp.includeSelf !== false,
        },
      });
    } else if (type === 'settle_split' && p.settlement && typeof p.settlement === 'object') {
      const st = p.settlement as Record<string, unknown>;
      const personName = typeof st.personName === 'string' ? st.personName.trim() : '';
      const amount = Number(st.amount);
      if (!personName || !Number.isFinite(amount) || amount <= 0) continue;
      result.push({
        id,
        type: 'settle_split',
        title: title || `Settle ₹${roundCurrency(amount)} with ${personName}`,
        summary:
          summary ||
          (st.direction === 'they_pay'
            ? `${personName} pays you ₹${roundCurrency(amount)}`
            : `You pay ${personName} ₹${roundCurrency(amount)}`),
        status: 'pending',
        settlement: {
          personName,
          direction: st.direction === 'they_pay' ? 'they_pay' : 'i_pay',
          amount: roundCurrency(amount),
          note: typeof st.note === 'string' ? st.note.trim() : undefined,
        },
      });
    } else if (type === 'build_cart' && Array.isArray(p.cartItems)) {
      const validLines: NonNullable<PennyProposedAction['cartItems']> = [];
      for (const lineRaw of p.cartItems) {
        if (!lineRaw || typeof lineRaw !== 'object') continue;
        const lr = lineRaw as Record<string, unknown>;
        const qty = Math.max(1, Math.round(Number(lr.quantity) || 1));
        const byId = typeof lr.itemId === 'string' ? itemsById.get(lr.itemId) : undefined;
        const byName =
          !byId && typeof lr.itemName === 'string'
            ? itemsByName.get(lr.itemName.trim().toLowerCase())
            : undefined;
        const matched = byId ?? byName;
        if (!matched) continue;
        const { price } = getEffectivePriceAndUnit(matched, matched.selectedVariantId);
        validLines.push({
          itemId: matched.id,
          itemName: matched.name,
          quantity: qty,
          variantId: matched.selectedVariantId,
          unitPrice: roundCurrency(price),
        });
      }
      if (validLines.length === 0) continue;
      const estimatedTotal = roundCurrency(
        validLines.reduce((s, l) => s + (l.unitPrice ?? 0) * l.quantity, 0)
      );
      result.push({
        id,
        type: 'build_cart',
        title: title || `Add ${validLines.length} item${validLines.length === 1 ? '' : 's'} to Cart`,
        summary:
          summary ||
          `${validLines.map((l) => `${l.itemName} ×${l.quantity}`).join(', ')} (~₹${estimatedTotal})`,
        status: 'pending',
        cartItems: validLines,
      });
    } else if (type === 'load_basket' && typeof p.basketId === 'string' && basketsById.has(p.basketId)) {
      const b = basketsById.get(p.basketId)!;
      result.push({
        id,
        type: 'load_basket',
        title: title || `Load ${b.name}`,
        summary: summary || `${b.items.length} items into Quick Mart cart`,
        status: 'pending',
        basketId: b.id,
      });
    } else if (type === 'add_due_recurring') {
      result.push({
        id,
        type: 'add_due_recurring',
        title: title || 'Add Due Recurring Items to Cart',
        summary: summary || 'Queue overdue & due-today recurring bills/refills into cart',
        status: 'pending',
      });
    } else if (type === 'set_budget') {
      const budget = Number(p.totalBudget);
      if (!Number.isFinite(budget) || budget <= 0) continue;
      result.push({
        id,
        type: 'set_budget',
        title: title || `Set Monthly Budget to ₹${roundCurrency(budget)}`,
        summary: summary || 'Updates your monthly spending budget cap across CartAudit',
        status: 'pending',
        totalBudget: roundCurrency(budget),
      });
    } else if (type === 'set_category_limit' && p.categoryLimit && typeof p.categoryLimit === 'object') {
      const cl = p.categoryLimit as Record<string, unknown>;
      const limitAmount = Number(cl.limitAmount);
      if (!Number.isFinite(limitAmount) || limitAmount <= 0) continue;
      const cat = matchCategory(cl.category);
      const period =
        cl.period === 'daily' || cl.period === 'weekly' || cl.period === 'monthly'
          ? cl.period
          : 'monthly';
      result.push({
        id,
        type: 'set_category_limit',
        title: title || `Cap ${cat} at ₹${roundCurrency(limitAmount)}/${period}`,
        summary: summary || `Creates or updates ${period} limit in Wellness & Radar`,
        status: 'pending',
        categoryLimit: {
          category: cat,
          limitAmount: roundCurrency(limitAmount),
          period,
        },
      });
    } else if (type === 'toggle_broke_mode' && typeof p.brokeModeEnabled === 'boolean') {
      result.push({
        id,
        type: 'toggle_broke_mode',
        title: title || (p.brokeModeEnabled ? 'Enable Broke Mode' : 'Turn Off Broke Mode'),
        summary:
          summary ||
          (p.brokeModeEnabled
            ? 'Activates strict allowance guardrails & non-essential warnings'
            : 'Disables strict Broke Mode guardrails'),
        status: 'pending',
        brokeModeEnabled: p.brokeModeEnabled,
      });
    } else if (type === 'set_recurrence' && p.recurrence && typeof p.recurrence === 'object') {
      const rc = p.recurrence as Record<string, unknown>;
      const byId = typeof rc.itemId === 'string' ? itemsById.get(rc.itemId) : undefined;
      const byName =
        !byId && typeof rc.itemName === 'string'
          ? itemsByName.get(rc.itemName.trim().toLowerCase())
          : undefined;
      const matched = byId ?? byName;
      if (!matched) continue;
      const freq =
        rc.frequency === 'daily' ||
        rc.frequency === 'weekly' ||
        rc.frequency === 'monthly' ||
        rc.frequency === 'custom'
          ? rc.frequency
          : 'weekly';
      result.push({
        id,
        type: 'set_recurrence',
        title: title || `Set ${matched.name} as ${freq}`,
        summary: summary || `Schedules recurring ${freq} reminders for ${matched.name}`,
        status: 'pending',
        recurrence: {
          itemId: matched.id,
          itemName: matched.name,
          frequency: freq,
          intervalDays:
            freq === 'custom' && Number(rc.intervalDays) > 0
              ? Math.round(Number(rc.intervalDays))
              : undefined,
        },
      });
    } else if (type === 'add_price_alert' && p.priceAlert && typeof p.priceAlert === 'object') {
      const pa = p.priceAlert as Record<string, unknown>;
      const byId = typeof pa.productId === 'string' ? itemsById.get(pa.productId) : undefined;
      const byName =
        !byId && typeof pa.productName === 'string'
          ? itemsByName.get(pa.productName.trim().toLowerCase())
          : undefined;
      const matched = byId ?? byName;
      const productId = matched?.id ?? (typeof pa.productId === 'string' ? pa.productId.trim() : '');
      const productName =
        matched?.name ?? (typeof pa.productName === 'string' ? pa.productName.trim() : '');
      if (!productId || !productName) continue;
      const targetUnitPrice =
        Number(pa.targetUnitPrice) > 0 ? roundCurrency(Number(pa.targetUnitPrice)) : undefined;
      const increaseThresholdPct =
        Number(pa.increaseThresholdPct) > 0 ? Math.round(Number(pa.increaseThresholdPct)) : undefined;
      if (!targetUnitPrice && !increaseThresholdPct) continue;
      result.push({
        id,
        type: 'add_price_alert',
        title: title || `Alert for ${productName}`,
        summary:
          summary ||
          (targetUnitPrice
            ? `Notify when unit price reaches ₹${targetUnitPrice}`
            : `Notify if price spikes ≥${increaseThresholdPct}%`),
        status: 'pending',
        priceAlert: {
          productId,
          productName,
          unitOfMeasurement:
            typeof pa.unitOfMeasurement === 'string' && pa.unitOfMeasurement.trim()
              ? pa.unitOfMeasurement.trim()
              : matched?.unit || 'unit',
          targetUnitPrice,
          increaseThresholdPct,
        },
      });
    } else if (type === 'navigate' && p.destination && typeof p.destination === 'object') {
      const dest = p.destination as Record<string, unknown>;
      const sec = typeof dest.section === 'string' ? dest.section : '';
      if (!VALID_SECTIONS.has(sec)) continue;
      result.push({
        id,
        type: 'navigate',
        title: title || `Open ${sec.charAt(0).toUpperCase() + sec.slice(1)}`,
        summary: summary || `Jump directly to the ${sec} workspace`,
        status: 'pending',
        destination: {
          section: sec as NonNullable<PennyProposedAction['destination']>['section'],
          subTab: typeof dest.subTab === 'string' ? dest.subTab : undefined,
        },
      });
    }
  }

  return result;
}

