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

export interface GroupedCommitmentsAgenda {
  overdueOrToday: UpcomingCommitmentItem[];
  next7Days: UpcomingCommitmentItem[];
  later: UpcomingCommitmentItem[];
}

export function groupCommitmentsAgenda(
  commitments: UpcomingCommitmentItem[]
): GroupedCommitmentsAgenda {
  const overdueOrToday: UpcomingCommitmentItem[] = [];
  const next7Days: UpcomingCommitmentItem[] = [];
  const later: UpcomingCommitmentItem[] = [];

  for (const item of commitments) {
    if (item.kind === 'split_payable' || (item.daysUntilDue ?? 0) <= 0) {
      overdueOrToday.push(item);
    } else if ((item.daysUntilDue ?? 0) <= 7) {
      next7Days.push(item);
    } else if ((item.daysUntilDue ?? 0) <= 30) {
      later.push(item);
    }
  }

  return { overdueOrToday, next7Days, later };
}

const OFFLINE_CATEGORY_KEYWORDS: Array<{ keywords: string[]; hints: string[] }> = [
  { keywords: ['milk', 'curd', 'paneer', 'cheese', 'butter', 'bread', 'egg'], hints: ['dairy', 'grocer', 'breakfast'] },
  { keywords: ['coffee', 'tea', 'chai', 'snack', 'chips', 'burger', 'pizza', 'cake', 'soda', 'cola', 'juice', 'chocolate'], hints: ['snack', 'junk', 'beverage', 'dining', 'food'] },
  { keywords: ['petrol', 'diesel', 'fuel', 'uber', 'ola', 'cab', 'auto', 'metro', 'bus', 'toll', 'parking'], hints: ['fuel', 'transport', 'travel'] },
  { keywords: ['wifi', 'broadband', 'internet', 'electricity', 'power', 'water', 'gas', 'recharge', 'bill', 'rent', 'netflix', 'spotify'], hints: ['bill', 'utilit', 'mobile', 'internet', 'entertainment'] },
  { keywords: ['rice', 'atta', 'dal', 'oil', 'sugar', 'salt', 'onion', 'tomato', 'potato', 'fruit', 'apple', 'banana', 'vegetable', 'grocery', 'groceries'], hints: ['grocer', 'fruit', 'vegetable'] },
  { keywords: ['medicine', 'pharmacy', 'doctor', 'clinic', 'tablet', 'vitamin'], hints: ['health', 'medical', 'wellness'] },
];

export function parseQuickExpenseLocally(
  rawText: string,
  categories: string[],
  todayDate: string = toLocalDateKey(new Date())
): PennyProposedAction | null {
  const text = rawText.trim();
  if (!text) return null;

  const amountMatch = text.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:[.,]\d{1,2})?)/i);
  if (!amountMatch) return null;

  const numericStr = amountMatch[1].replace(/,/g, '');
  const amount = roundCurrency(Number(numericStr));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const lower = text.toLowerCase();
  let dateKey = todayDate;
  if (/\byesterday\b/i.test(lower)) {
    const baseMs = parseDateKeyToLocalMiddayMs(todayDate);
    if (baseMs) {
      dateKey = toLocalDateKey(new Date(baseMs - 24 * 60 * 60 * 1000));
    }
  }

  let matchedCategory = categories[0] || 'Groceries';
  // First check direct category name mentions
  const directMatch = categories.find((c) => lower.includes(c.toLowerCase()));
  if (directMatch) {
    matchedCategory = directMatch;
  } else {
    for (const rule of OFFLINE_CATEGORY_KEYWORDS) {
      if (rule.keywords.some((kw) => lower.includes(kw))) {
        const candidate = categories.find((c) =>
          rule.hints.some((h) => c.toLowerCase().includes(h))
        );
        if (candidate) {
          matchedCategory = candidate;
          break;
        }
      }
    }
  }

  const cleanedName = text
    .replace(amountMatch[0], ' ')
    .replace(/\b(spent|paid|for|on|at|today|yesterday|rs|inr|rupees)\b/gi, ' ')
    .replace(/₹/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const itemName = cleanedName
    ? cleanedName.charAt(0).toUpperCase() + cleanedName.slice(1)
    : `${matchedCategory} Expense`;

  return {
    id: `offline-exp-${Date.now()}`,
    type: 'log_expense',
    title: `Log ₹${amount} — ${itemName}`,
    summary: `${matchedCategory} · ${dateKey} (instant offline parse)`,
    status: 'pending',
    expense: {
      name: itemName,
      amount,
      category: matchedCategory,
      date: dateKey,
    },
  };
}

export interface PennyLocalReply {
  answer: string;
  highlights: Array<{ label: string; value: string }>;
  proposedActions: PennyProposedAction[];
  followUpQuestions: string[];
}

function formatInrCompact(amount: number): string {
  const rounded = roundCurrency(amount);
  const abs = Math.abs(rounded);
  const str = Number.isInteger(abs) ? abs.toLocaleString('en-IN') : abs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${rounded < 0 ? '-' : ''}₹${str}`;
}

export function answerPennyLocally(params: {
  question: string;
  context: PennyContextSnapshot;
  items: CartItem[];
  basketTemplates: BasketTemplate[];
  categories: string[];
}): PennyLocalReply {
  const { question, context, items, basketTemplates, categories } = params;
  const trimmed = question.trim();
  const lower = trimmed.toLowerCase();
  const nowTs = Date.now();
  const budget = context.budgetOverview;
  const fc = context.futureCommitments;

  // 1. Split bill creation command: e.g. "Split 600 dinner with Rahul"
  if (/\bsplit\b/i.test(lower) && /\d/.test(lower) && /\bwith\b/i.test(lower)) {
    const amtMatch = trimmed.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:[.,]\d{1,2})?)/i);
    const withMatch = trimmed.match(/\bwith\s+([a-zA-Z][a-zA-Z\s,&]{0,60})$/i);
    if (amtMatch && withMatch) {
      const totalAmount = roundCurrency(Number(amtMatch[1].replace(/,/g, '')));
      const participantNames = withMatch[1]
        .split(/,|&|\band\b/i)
        .map((n) => n.trim())
        .filter(Boolean)
        .slice(0, 6);
      if (totalAmount > 0 && participantNames.length > 0) {
        const cleanTitle = trimmed
          .replace(amtMatch[0], ' ')
          .replace(withMatch[0], ' ')
          .replace(/\b(split|bill|equally|please|for|with|me)\b/gi, ' ')
          .replace(/₹/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        const title = cleanTitle
          ? cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1)
          : 'Shared Expense';
        const matchedCat =
          categories.find((c) => lower.includes(c.toLowerCase())) ??
          categories.find((c) => c.toLowerCase().includes('snack') || c.toLowerCase().includes('grocer')) ??
          categories[0] ??
          'Other Expenses';

        return {
          answer: `Got it — I prepared a ${formatInrCompact(totalAmount)} equal split for "${title}" with ${participantNames.join(', ')}. Review or confirm below to add it to your Split Ledger.`,
          highlights: [
            { label: 'Split Total', value: formatInrCompact(totalAmount) },
            { label: 'Participants', value: `${participantNames.length + 1} people` },
          ],
          proposedActions: [
            {
              id: `local-split-${nowTs}`,
              type: 'add_split',
              title: `Split ${formatInrCompact(totalAmount)} — ${title}`,
              summary: `Equal split with ${participantNames.join(', ')} · ${matchedCat}`,
              status: 'pending',
              split: {
                name: title,
                totalAmount,
                category: matchedCat,
                paidBy: 'self',
                participantNames,
                includeSelf: true,
              },
            },
          ],
          followUpQuestions: [
            'Who do I owe in Splits right now?',
            'How much can I safely spend per day?',
          ],
        };
      }
    }
  }

  // 2. Direct expense logging command
  if (
    /\b(log|add|paid|spent|bought|expense|record)\b/i.test(lower) &&
    !/\b(recurring|due|cart|budget|cap|limit|broke)\b/i.test(lower)
  ) {
    const localExpense = parseQuickExpenseLocally(trimmed, categories, context.asOfDate);
    if (localExpense?.expense) {
      return {
        answer: `I parsed that expense locally for you — verify the title, amount, or category below and tap Confirm & Apply to save it to your ledger.`,
        highlights: [
          { label: 'Amount', value: formatInrCompact(localExpense.expense.amount) },
          { label: 'Category', value: localExpense.expense.category },
        ],
        proposedActions: [localExpense],
        followUpQuestions: [
          'How much budget is left this month?',
          'Show my top spending categories',
        ],
      };
    }
  }

  // 3. Set monthly budget command
  if (/\b(set|change|update|make)\b.*\bbudget\b/i.test(lower)) {
    const amtMatch = trimmed.match(/(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d{1,2})?)/i);
    const nextBudget = amtMatch ? roundCurrency(Number(amtMatch[1].replace(/,/g, ''))) : 0;
    if (nextBudget > 0) {
      return {
        answer: `Ready to update your monthly budget cap from ${formatInrCompact(budget.monthlyBudget)} to ${formatInrCompact(nextBudget)}. Confirm below to apply it across CartAudit.`,
        highlights: [
          { label: 'Current Budget', value: formatInrCompact(budget.monthlyBudget) },
          { label: 'New Budget', value: formatInrCompact(nextBudget) },
        ],
        proposedActions: [
          {
            id: `local-budget-${nowTs}`,
            type: 'set_budget',
            title: `Set Monthly Budget to ${formatInrCompact(nextBudget)}`,
            summary: `Replaces ${formatInrCompact(budget.monthlyBudget)} cap`,
            status: 'pending',
            totalBudget: nextBudget,
          },
        ],
        followUpQuestions: ['How much can I safely spend per day?'],
      };
    }
  }

  // 4. Category cap command
  if (/\b(cap|limit)\b/i.test(lower) && /\d/.test(lower)) {
    const amtMatch = trimmed.match(/(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d{1,2})?)/i);
    const limitAmount = amtMatch ? roundCurrency(Number(amtMatch[1].replace(/,/g, ''))) : 0;
    if (limitAmount > 0) {
      const period: 'daily' | 'weekly' | 'monthly' = /\bdaily\b/i.test(lower)
        ? 'daily'
        : /\bweekly\b/i.test(lower)
          ? 'weekly'
          : 'monthly';
      const matchedCat =
        categories.find((c) => lower.includes(c.toLowerCase())) ??
        categories.find((c) =>
          c
            .toLowerCase()
            .split(/[\s&]+/)
            .some((word) => word.length > 3 && lower.includes(word))
        ) ??
        categories[0] ??
        'Groceries';

      return {
        answer: `Prepared a ${period} cap of ${formatInrCompact(limitAmount)} for ${matchedCat}. You can tweak the category, amount, or period below before applying.`,
        highlights: [
          { label: 'Category', value: matchedCat },
          { label: 'Limit', value: `${formatInrCompact(limitAmount)}/${period}` },
        ],
        proposedActions: [
          {
            id: `local-cap-${nowTs}`,
            type: 'set_category_limit',
            title: `Cap ${matchedCat} at ${formatInrCompact(limitAmount)}/${period}`,
            summary: `Creates or updates ${period} guardrail`,
            status: 'pending',
            categoryLimit: {
              category: matchedCat,
              limitAmount,
              period,
            },
          },
        ],
        followUpQuestions: ['Should I turn Broke Mode on right now?'],
      };
    }
  }

  // 5. Broke Mode check or toggle
  if (/\bbroke mode\b/i.test(lower)) {
    const wantsOff = /\b(off|disable|turn off|stop)\b/i.test(lower);
    const wantsOn = /\b(on|enable|turn on|start|activate)\b/i.test(lower);
    const shouldRecommendOn = !budget.isBrokeMode && (fc.trueSafeToSpend < 1500 || budget.budgetUsedPct >= 75);
    const targetEnabled = wantsOff ? false : wantsOn ? true : !budget.isBrokeMode && shouldRecommendOn;

    const reason =
      budget.isBrokeMode && !wantsOff
        ? `Broke Mode is already ON, protecting your ${formatInrCompact(fc.trueSafeToSpend)} true safe-to-spend balance (${budget.budgetUsedPct}% of budget used).`
        : shouldRecommendOn
          ? `Yes — with ${budget.budgetUsedPct}% of your monthly budget used and ${formatInrCompact(fc.trueSafeToSpend)} true safe-to-spend remaining, turning Broke Mode ON will tighten non-essential alerts.`
          : `Right now you have ${formatInrCompact(fc.trueSafeToSpend)} true safe-to-spend (${budget.budgetUsedPct}% budget used). Broke Mode is optional unless you want stricter guardrails.`;

    return {
      answer: reason,
      highlights: [
        { label: 'Broke Mode', value: budget.isBrokeMode ? 'Currently ON' : 'Currently OFF' },
        { label: 'True Safe', value: formatInrCompact(fc.trueSafeToSpend) },
        { label: 'Budget Used', value: `${budget.budgetUsedPct}%` },
      ],
      proposedActions:
        targetEnabled !== budget.isBrokeMode || wantsOn || wantsOff
          ? [
              {
                id: `local-broke-${nowTs}`,
                type: 'toggle_broke_mode',
                title: targetEnabled ? 'Enable Broke Mode' : 'Turn Off Broke Mode',
                summary: targetEnabled
                  ? 'Activates strict allowance guardrails & non-essential warnings'
                  : 'Restores standard budget tracking',
                status: 'pending',
                brokeModeEnabled: targetEnabled,
              },
            ]
          : [],
      followUpQuestions: [
        'How much can I safely spend per day?',
        'Open Financial Wellness',
      ],
    };
  }

  // 6. Build a Quick Mart cart under ₹X
  if (/\b(build|make|create|suggest)\b.*\bcart\b/i.test(lower) || /\bcombo\b/i.test(lower)) {
    const capMatch = trimmed.match(/(?:under|within|below|max|for|₹|rs\.?|inr)\s*(?:₹|rs\.?|inr)?\s*(\d+)/i);
    const targetCap = capMatch ? Math.max(50, Number(capMatch[1])) : 250;
    const isBreakfast = /\bbreakfast|morning|tea|coffee|milk|bread|egg\b/i.test(lower);
    const isDinner = /\bdinner|lunch|meal|rice|dal|atta|paneer\b/i.test(lower);

    const scored = items
      .map((item) => {
        const { price } = getEffectivePriceAndUnit(item, item.selectedVariantId);
        let score = 0;
        const nameCat = `${item.name} ${item.category}`.toLowerCase();
        if (isBreakfast && /(milk|bread|egg|butter|banana|coffee|tea|oats|dairy|breakfast)/.test(nameCat)) score += 5;
        if (isDinner && /(rice|dal|atta|paneer|tomato|onion|oil|curd|grocer|vegetable)/.test(nameCat)) score += 5;
        if (!isBreakfast && !isDinner && /(milk|bread|rice|banana|tomato|egg|grocer|dairy|fruit)/.test(nameCat)) score += 2;
        if (item.isFavourite) score += 2;
        return { item, price: roundCurrency(price), score };
      })
      .filter((entry) => entry.price > 0 && entry.price <= targetCap)
      .sort((a, b) => b.score - a.score || a.price - b.price);

    const chosen: NonNullable<PennyProposedAction['cartItems']> = [];
    let running = 0;
    for (const entry of scored) {
      if (chosen.length >= 4) break;
      if (running + entry.price <= targetCap) {
        chosen.push({
          itemId: entry.item.id,
          itemName: entry.item.name,
          quantity: 1,
          variantId: entry.item.selectedVariantId,
          unitPrice: entry.price,
        });
        running = roundCurrency(running + entry.price);
      }
    }

    if (chosen.length > 0) {
      return {
        answer: `Here is a ${chosen.length}-item Quick Mart cart totaling ${formatInrCompact(running)} (within your ${formatInrCompact(targetCap)} target): ${chosen.map((c) => `${c.itemName} (${formatInrCompact(c.unitPrice ?? 0)})`).join(', ')}.`,
        highlights: [
          { label: 'Cart Estimate', value: formatInrCompact(running) },
          { label: 'Target Cap', value: formatInrCompact(targetCap) },
          { label: 'Items', value: `${chosen.length}` },
        ],
        proposedActions: [
          {
            id: `local-cart-${nowTs}`,
            type: 'build_cart',
            title: `Add ${chosen.length} items (~${formatInrCompact(running)})`,
            summary: chosen.map((c) => c.itemName).join(', '),
            status: 'pending',
            cartItems: chosen,
          },
        ],
        followUpQuestions: [
          'Can I safely afford this cart today?',
          'What recurring refills are due?',
        ],
      };
    }
  }

  // 7. Current cart affordability
  if (/\b(afford|safe)\b.*\bcart\b/i.test(lower) || /\bcurrent cart\b/i.test(lower)) {
    const cartAmt = context.currentCart.totalAmount;
    if (cartAmt <= 0) {
      return {
        answer: `Your Quick Mart cart is currently empty. You have ${formatInrCompact(budget.rawRemainingBudget)} remaining in your monthly budget (${formatInrCompact(fc.trueSafeToSpend)} true safe-to-spend after 30d commitments).`,
        highlights: [
          { label: 'Cart Total', value: '₹0' },
          { label: 'Remaining', value: formatInrCompact(budget.rawRemainingBudget) },
          { label: 'True Safe', value: formatInrCompact(fc.trueSafeToSpend) },
        ],
        proposedActions: [],
        followUpQuestions: ['Build me a grocery cart under ₹200'],
      };
    }
    const afterCartRaw = roundCurrency(budget.rawRemainingBudget - cartAmt);
    const afterCartSafe = roundCurrency(fc.trueSafeToSpend - cartAmt);
    const verdict =
      afterCartSafe >= 0
        ? `Yes — your ${formatInrCompact(cartAmt)} cart fits comfortably. Even after upcoming 30-day bills and splits, you'll still have ${formatInrCompact(afterCartSafe)} true safe-to-spend left.`
        : afterCartRaw >= 0
          ? `Caution — your ${formatInrCompact(cartAmt)} cart fits inside your raw remaining budget (${formatInrCompact(afterCartRaw)} left), but it puts your true safe-to-spend at ${formatInrCompact(afterCartSafe)} once ${formatInrCompact(fc.committedUpcoming30d)} in upcoming bills & splits are reserved.`
          : `Over budget — checking out ${formatInrCompact(cartAmt)} now will exceed your remaining monthly cap by ${formatInrCompact(Math.abs(afterCartRaw))}.`;

    return {
      answer: verdict,
      highlights: [
        { label: 'Cart Total', value: formatInrCompact(cartAmt) },
        { label: 'After Checkout', value: formatInrCompact(afterCartRaw) },
        { label: 'After Commitments', value: formatInrCompact(afterCartSafe) },
      ],
      proposedActions: [
        {
          id: `local-nav-shop-${nowTs}`,
          type: 'navigate',
          title: 'Open Shopping Cart',
          summary: 'Review quantities or swap items in Quick Mart',
          status: 'pending',
          destination: { section: 'shopping', subTab: 'home' },
        },
      ],
      followUpQuestions: ['What upcoming payments & refills do I have?'],
    };
  }

  // 8. Splits / Who do I owe
  if (/\b(owe|owed|split|splits|settle|settlement)\b/i.test(lower)) {
    const iOwePeople = context.pendingSplitsByPerson.filter((p) => p.iOwe > 0);
    const owedToMePeople = context.pendingSplitsByPerson.filter((p) => p.owedToMe > 0);
    const lines: string[] = [];
    if (iOwePeople.length > 0) {
      lines.push(
        `You owe ${formatInrCompact(fc.totalIOweSplits)} across ${iOwePeople.map((p) => `${p.personName} (${formatInrCompact(p.iOwe)})`).join(', ')}.`
      );
    } else {
      lines.push('You do not owe anyone in Splits right now.');
    }
    if (owedToMePeople.length > 0) {
      lines.push(
        `Owed back to you: ${formatInrCompact(fc.totalOwedToMeSplits)} from ${owedToMePeople.map((p) => `${p.personName} (${formatInrCompact(p.owedToMe)})`).join(', ')}.`
      );
    }

    return {
      answer: lines.join('\n'),
      highlights: [
        { label: 'You Owe', value: formatInrCompact(fc.totalIOweSplits) },
        { label: 'Owed to You', value: formatInrCompact(fc.totalOwedToMeSplits) },
        { label: 'Net Splits', value: formatInrCompact(fc.totalOwedToMeSplits - fc.totalIOweSplits) },
      ],
      proposedActions: [
        {
          id: `local-nav-splits-${nowTs}`,
          type: 'navigate',
          title: 'Open Expenses & Splits',
          summary: 'View person ledgers or record a UPI settlement',
          status: 'pending',
          destination: { section: 'expenses' },
        },
      ],
      followUpQuestions: [
        'How much can I safely spend per day?',
        'What upcoming payments & refills do I have?',
      ],
    };
  }

  // 9. Upcoming payments, refills, due recurring
  if (/\b(upcoming|recurring|refill|refills|due|bill|bills|payment|payments)\b/i.test(lower)) {
    const dueNow = fc.items.filter((i) => (i.daysUntilDue ?? 1) <= 0);
    const soon = fc.items.slice(0, 4);
    const summaryText =
      soon.length > 0
        ? `You have ${formatInrCompact(fc.committedUpcoming30d)} committed over the next 30 days (${formatInrCompact(fc.upcoming30DaysRecurringTotal)} recurring + ${formatInrCompact(fc.totalIOweSplits)} splits):\n` +
          soon.map((i) => `• ${i.title}: ${formatInrCompact(i.amount)} (${i.status})`).join('\n')
        : 'No upcoming recurring bills, refills, or unsettled split payables are scheduled in the next 30 days.';

    return {
      answer: summaryText,
      highlights: [
        { label: '7-Day Total', value: formatInrCompact(fc.upcoming7DaysTotal) },
        { label: '30-Day Total', value: formatInrCompact(fc.committedUpcoming30d) },
        { label: 'Due Now', value: `${dueNow.length} item${dueNow.length === 1 ? '' : 's'}` },
      ],
      proposedActions:
        dueNow.some((d) => d.kind !== 'split_payable')
          ? [
              {
                id: `local-due-${nowTs}`,
                type: 'add_due_recurring',
                title: 'Add Due Recurring Items to Cart',
                summary: 'Queue overdue & due-today bills or refills into Quick Mart',
                status: 'pending',
              },
            ]
          : [],
      followUpQuestions: [
        'How much can I safely spend per day?',
        'Which saved basket saves me money?',
      ],
    };
  }

  // 10. Saved baskets
  if (/\b(basket|baskets|template)\b/i.test(lower)) {
    const best = [...context.savedBaskets].sort((a, b) => a.priceDiff - b.priceDiff)[0];
    const answer = best
      ? `Your "${best.name}" basket (${best.itemCount} items) is currently ${formatInrCompact(best.currentTotal)} (${best.priceDiff < 0 ? `down ${formatInrCompact(Math.abs(best.priceDiff))} vs. saved` : best.priceDiff > 0 ? `up ${formatInrCompact(best.priceDiff)} vs. saved` : 'same as saved'}).`
      : 'You do not have any saved baskets yet. Save any cart in Shopping to track basket price changes.';

    return {
      answer,
      highlights: best
        ? [
            { label: 'Best Basket', value: best.name },
            { label: 'Current Price', value: formatInrCompact(best.currentTotal) },
          ]
        : [],
      proposedActions: best
        ? [
            {
              id: `local-basket-${nowTs}`,
              type: 'load_basket',
              title: `Load ${best.name}`,
              summary: `${best.itemCount} items · ${formatInrCompact(best.currentTotal)}`,
              status: 'pending',
              basketId: best.id,
            },
          ]
        : [],
      followUpQuestions: ['Can I safely afford my current cart today?'],
    };
  }

  // 11. Conversational greetings & capability overview
  if (/^(hi+|hello+|hey+|yo|hola|namaste|good\s+(morning|afternoon|evening)|who are you|what can you do|help)\b[!.?,\s]*(penny)?[!.?,\s]*$/i.test(trimmed)) {
    return {
      answer: `Hey! I'm Penny, your CartAudit money co-pilot. Right now you have ${formatInrCompact(budget.rawRemainingBudget)} remaining in your monthly budget (${formatInrCompact(fc.safeDailySpend)}/day safe to spend).\nEven when cloud AI is busy, I can split bills, log expenses, build Quick Mart carts under a budget, check upcoming refills, or toggle Broke Mode in one click.`,
      highlights: [
        { label: 'Remaining', value: formatInrCompact(budget.rawRemainingBudget) },
        { label: 'Safe / Day', value: `${formatInrCompact(fc.safeDailySpend)}/day` },
        { label: '30d Bills & Splits', value: formatInrCompact(fc.committedUpcoming30d) },
      ],
      proposedActions: [],
      followUpQuestions: [
        'How am I doing this month?',
        'Who do I owe in Splits right now?',
        'Build a quick grocery cart under ₹200',
      ],
    };
  }

  // 12. Savings advice / cut expenses / financial checkup
  if (/\b(save|saving|savings|cut|reduce|tip|tips|advice|how am i doing|health|review|status)\b/i.test(lower)) {
    const topCategory = context.categoryBreakdownThisMonth[0];
    const digest = context.monthlyDigest;
    const priceSpikes = context.priceHighlights.filter((p) => p.deltaPctFromAvg >= 10);
    const tips: string[] = [];

    if (topCategory && topCategory.spent > 0) {
      tips.push(
        `• Biggest spend driver: ${topCategory.category} at ${formatInrCompact(topCategory.spent)} (${topCategory.sharePct}% of this month). Tightening a cap here gives the fastest savings.`
      );
    }
    if (digest.feeLeaksDetected > 0) {
      tips.push(
        `• Fee leaks spotted: ${formatInrCompact(digest.feeLeaksDetected)} across ${digest.auditCount} scanned checkout${digest.auditCount === 1 ? '' : 's'} — bundling items into fewer orders cuts extra delivery & handling fees.`
      );
    }
    if (priceSpikes.length > 0) {
      const spike = priceSpikes[0];
      tips.push(
        `• Price spike watch: ${spike.productName} is ${Math.round(spike.deltaPctFromAvg)}% above its average unit price (${formatInrCompact(spike.latestUnitPrice)}/${spike.unit}).`
      );
    }
    if (fc.committedUpcoming30d > 0) {
      tips.push(
        `• Reserve ${formatInrCompact(fc.committedUpcoming30d)} for upcoming 30-day refills and unsettled splits, leaving ${formatInrCompact(fc.safeDailySpend)}/day truly safe.`
      );
    }
    if (tips.length === 0) {
      tips.push(
        `• Your month is clean so far (${formatInrCompact(budget.currentMonthSpent)} spent of ${formatInrCompact(budget.monthlyBudget)}). Keeping daily spends under ${formatInrCompact(fc.safeDailySpend)}/day preserves your buffer.`
      );
    }

    const actions: PennyProposedAction[] = [];
    if (!budget.isBrokeMode && (budget.budgetUsedPct >= 65 || fc.trueSafeToSpend < 1500)) {
      actions.push({
        id: `local-save-broke-${nowTs}`,
        type: 'toggle_broke_mode',
        title: 'Enable Broke Mode Guardrails',
        summary: 'Protect essentials & warn before non-essential spending',
        status: 'pending',
        brokeModeEnabled: true,
      });
    } else if (topCategory && topCategory.spent > 0 && topCategory.cap === null) {
      const suggestedCap = Math.max(200, Math.round((topCategory.spent * 0.85) / 50) * 50);
      actions.push({
        id: `local-save-cap-${nowTs}`,
        type: 'set_category_limit',
        title: `Cap ${topCategory.category} at ${formatInrCompact(suggestedCap)}/monthly`,
        summary: 'Suggested 15% trim based on this month’s spend',
        status: 'pending',
        categoryLimit: {
          category: topCategory.category,
          limitAmount: suggestedCap,
          period: 'monthly',
        },
      });
    }

    return {
      answer: [
        `Monthly Checkup — ${budget.budgetUsedPct}% of your ${formatInrCompact(budget.monthlyBudget)} budget used (${formatInrCompact(fc.trueSafeToSpend)} true safe over ${fc.remainingDaysInMonth}d):`,
        ...tips,
      ].join('\n'),
      highlights: [
        { label: 'Safe Daily', value: `${formatInrCompact(fc.safeDailySpend)}/day` },
        { label: 'Top Category', value: topCategory ? topCategory.category : 'None yet' },
        {
          label: 'Vs Last Month',
          value:
            digest.vsLastMonthDelta === 0
              ? 'Flat ₹0'
              : `${digest.vsLastMonthDelta > 0 ? '+' : '-'}${formatInrCompact(Math.abs(digest.vsLastMonthDelta))}`,
        },
      ],
      proposedActions: actions,
      followUpQuestions: [
        'Should I turn Broke Mode on right now?',
        'What upcoming payments & refills do I have?',
      ],
    };
  }

  // 13. Safe daily spend / Remaining budget / Category summary / Wellness / General fallback
  const topCats = context.categoryBreakdownThisMonth
    .slice(0, 3)
    .map((c) => `${c.category} (${formatInrCompact(c.spent)}, ${c.sharePct}%)`)
    .join(', ');

  const isDailyOrBudgetQuery = /\b(daily|safe|budget|left|remaining|spend|category|categories|summary|digest|score|discipline|price)\b/i.test(lower);

  const leadLine = isDailyOrBudgetQuery
    ? `You can safely spend ${formatInrCompact(fc.safeDailySpend)}/day across the remaining ${fc.remainingDaysInMonth} days of this month after reserving ${formatInrCompact(fc.committedUpcoming30d)} in upcoming bills & splits.`
    : `Here is your live CartAudit snapshot (Local Engine):`;

  const details = [
    leadLine,
    `• Month spent: ${formatInrCompact(budget.currentMonthSpent)} of ${formatInrCompact(budget.monthlyBudget)} (${budget.budgetUsedPct}% used, ${formatInrCompact(budget.rawRemainingBudget)} raw left)`,
    `• True safe-to-spend: ${formatInrCompact(fc.trueSafeToSpend)} over ${fc.remainingDaysInMonth}d`,
    topCats ? `• Top categories: ${topCats}` : '• No category spending recorded yet this month.',
  ];

  if (!isDailyOrBudgetQuery) {
    details.push(
      'Tip: Ask me to "Log ₹180 coffee", "Split ₹600 dinner with Rahul", "Build a cart under ₹200", or "How can I save money?"'
    );
  }

  return {
    answer: details.join('\n'),
    highlights: [
      { label: 'Safe Daily', value: `${formatInrCompact(fc.safeDailySpend)}/day` },
      { label: 'True Safe', value: formatInrCompact(fc.trueSafeToSpend) },
      { label: 'Budget Used', value: `${budget.budgetUsedPct}%` },
    ],
    proposedActions: [],
    followUpQuestions: [
      'Who do I owe in Splits right now?',
      'What upcoming payments & refills do I have?',
      'Build a quick grocery cart under ₹200',
    ],
  };
}



