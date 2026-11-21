import {
  SELF_PERSON_ID,
  type BrokeModeConfig,
  type CartItem,
  type CategorySpendingLimit,
  type FeeFlag,
  type FinancialChallenge,
  type FinancialTarget,
  type ParsedReceipt,
  type PennyChatMessage,
  type Person,
  type PriceAlert,
  type PriceObservation,
  type PurchaseSession,
  type SavedAudit,
  type Settlement,
  type SharedExpense,
  type Transaction,
  type TriggeredPriceAlert,
} from '../types/models';
import { toLocalDateKey } from './martEngine';
import { buildPriceObservation } from './priceTrackerEngine';
import { DEFAULT_BROKE_MODE_CONFIG } from './warRoomEngine';

export interface SampleMonthDataset {
  totalBudget: number;
  sessionBudget: number | null;
  transactions: Transaction[];
  purchaseHistory: PurchaseSession[];
  people: Person[];
  sharedExpenses: SharedExpense[];
  settlements: Settlement[];
  priceObservations: PriceObservation[];
  priceAlerts: PriceAlert[];
  triggeredPriceAlerts: TriggeredPriceAlert[];
  savedAudits: SavedAudit[];
  categoryLimits: CategorySpendingLimit[];
  warRoomChallenges: FinancialChallenge[];
  warRoomTargets: FinancialTarget[];
  disciplineCheckIns: string[];
  isSampleDataLoaded: true;
}

export interface EmptyWorkspacePatch {
  transactions: Transaction[];
  purchaseHistory: PurchaseSession[];
  people: Person[];
  sharedExpenses: SharedExpense[];
  settlements: Settlement[];
  priceObservations: PriceObservation[];
  priceAlerts: PriceAlert[];
  triggeredPriceAlerts: TriggeredPriceAlert[];
  feeFlags: FeeFlag[];
  parsedReceipts: ParsedReceipt[];
  savedAudits: SavedAudit[];
  totalBudget: number;
  sessionBudget: number | null;
  isBrokeMode: boolean;
  brokeModeConfig: BrokeModeConfig;
  categoryLimits: CategorySpendingLimit[];
  warRoomChallenges: FinancialChallenge[];
  warRoomTargets: FinancialTarget[];
  dismissedWarRoomAlerts: string[];
  disciplineCheckIns: string[];
  lastCheckoutMeta: { signature: string; at: number } | null;
  pennyMessages: PennyChatMessage[];
  isSampleDataLoaded: false;
}

/**
 * Computes an ISO timestamp inside the current calendar month whenever `daysAgo` fits
 * cleanly, or otherwise distributes earlier slots inside [monthStart, referenceDate]
 * so the sample month populates current-cycle charts & KPIs on any day of the month.
 */
function resolveCurrentMonthIso(
  referenceDate: Date,
  daysAgo: number,
  hour = 13,
  minute = 15
): string {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const currentDay = referenceDate.getDate();

  let targetDay = currentDay - Math.max(0, Math.round(daysAgo));
  if (targetDay < 1) {
    // Spread smoothly across day 1..currentDay when early in the month
    targetDay = currentDay > 1 ? Math.max(1, ((daysAgo % (currentDay - 1)) + 1)) : 1;
  }

  const d = new Date(year, month, targetDay, hour, minute, 0, 0);
  if (d.getTime() > referenceDate.getTime()) {
    return new Date(
      year,
      month,
      currentDay,
      Math.max(0, Math.min(referenceDate.getHours(), hour)),
      0,
      0,
      0
    ).toISOString();
  }
  return d.toISOString();
}

function resolveDaysBackIso(referenceDate: Date, daysBack: number, hour = 14): string {
  const d = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate() - Math.max(0, Math.round(daysBack)),
    hour,
    20,
    0,
    0
  );
  return d.toISOString();
}

export function buildSampleMonthDataset(
  referenceDate: Date = new Date(),
  catalogItems: CartItem[] = []
): SampleMonthDataset {
  const nowIso = referenceDate.toISOString();

  // People (contacts for Split Ledger)
  const rohanId = 'sample-person-rohan';
  const ananyaId = 'sample-person-ananya';
  const kabirId = 'sample-person-kabir';

  const people: Person[] = [
    {
      id: rohanId,
      name: 'Rohan Mehta',
      contact: '+91 98201 44120',
      upiId: 'rohan.mehta@okaxis',
      createdAt: resolveDaysBackIso(referenceDate, 45, 10),
    },
    {
      id: ananyaId,
      name: 'Ananya Sharma',
      contact: '+91 98114 77290',
      upiId: 'ananya.sharma@ybl',
      createdAt: resolveDaysBackIso(referenceDate, 45, 10),
    },
    {
      id: kabirId,
      name: 'Kabir Verma',
      contact: '+91 99002 18340',
      upiId: 'kabir.verma@okicici',
      createdAt: resolveDaysBackIso(referenceDate, 32, 11),
    },
  ];

  // Shared Expenses + 1 Settlement
  const splitDinnerId = 'sample-split-dinner';
  const splitWifiId = 'sample-split-wifi';
  const splitGroceryId = 'sample-split-grocery';

  const dinnerIso = resolveCurrentMonthIso(referenceDate, 3, 21, 10);
  const wifiIso = resolveCurrentMonthIso(referenceDate, 7, 11, 5);
  const grocerySplitIso = resolveCurrentMonthIso(referenceDate, 5, 18, 40);

  const txSplitDinnerId = 'sample-tx-split-dinner';
  const txSplitWifiId = 'sample-tx-split-wifi';
  const txSplitGroceryId = 'sample-tx-split-grocery';

  const sharedExpenses: SharedExpense[] = [
    {
      id: splitDinnerId,
      name: 'Burma Burma Team Dinner',
      totalAmount: 1680,
      category: 'Snacks & Beverages',
      date: dinnerIso,
      paidById: SELF_PERSON_ID,
      splitMethod: 'equal',
      participants: [
        { personId: SELF_PERSON_ID, amount: 560 },
        { personId: rohanId, amount: 560 },
        { personId: ananyaId, amount: 560 },
      ],
      source: 'ledger',
      linkedTransactionId: txSplitDinnerId,
      createdAt: dinnerIso,
    },
    {
      id: splitWifiId,
      name: 'Airtel Xstream Fiber (Monthly)',
      totalAmount: 999,
      category: 'Mobile & Internet Bills',
      date: wifiIso,
      paidById: rohanId,
      splitMethod: 'equal',
      participants: [
        { personId: SELF_PERSON_ID, amount: 499.5 },
        { personId: rohanId, amount: 499.5 },
      ],
      source: 'ledger',
      linkedTransactionId: txSplitWifiId,
      createdAt: wifiIso,
    },
    {
      id: splitGroceryId,
      name: 'Weekend Kitchen & Milk Haul',
      totalAmount: 960,
      category: 'Groceries',
      date: grocerySplitIso,
      paidById: SELF_PERSON_ID,
      splitMethod: 'equal',
      participants: [
        { personId: SELF_PERSON_ID, amount: 480 },
        { personId: kabirId, amount: 480 },
      ],
      source: 'mart',
      linkedTransactionId: txSplitGroceryId,
      createdAt: grocerySplitIso,
    },
  ];

  const settlements: Settlement[] = [
    {
      id: 'sample-settlement-kabir-1',
      fromPersonId: kabirId,
      toPersonId: SELF_PERSON_ID,
      amount: 320,
      date: resolveCurrentMonthIso(referenceDate, 2, 16, 0),
      note: 'UPI transfer for weekend groceries',
      expenseId: splitGroceryId,
      createdAt: resolveCurrentMonthIso(referenceDate, 2, 16, 0),
    },
  ];

  // Transactions spanning current cycle + last month for MoM trends
  const txMart1Date = resolveCurrentMonthIso(referenceDate, 1, 10, 30);
  const txMart2Date = resolveCurrentMonthIso(referenceDate, 9, 17, 45);
  const txAuditBlinkitDate = resolveCurrentMonthIso(referenceDate, 2, 19, 15);
  const txAuditZeptoDate = resolveCurrentMonthIso(referenceDate, 6, 20, 5);

  const transactions: Transaction[] = [
    {
      id: 'sample-tx-morning-dairy',
      name: 'Amul Taaza Milk & Eggs Basket',
      amount: 196,
      category: 'Dairy & Bakery',
      timestamp: txMart1Date,
      source: 'mart',
      classification: 'essential',
      classificationSource: 'predicted',
    },
    {
      id: 'sample-tx-blinkit-audit',
      name: 'Blinkit Quick Grocery Receipt',
      amount: 642,
      category: 'Groceries',
      timestamp: txAuditBlinkitDate,
      source: 'audit',
      classification: 'essential',
      classificationSource: 'predicted',
    },
    {
      id: 'sample-tx-coffee-brew',
      name: 'Nescafe Coffee & Evening Cold Brew',
      amount: 245,
      category: 'Snacks & Beverages',
      timestamp: resolveCurrentMonthIso(referenceDate, 2, 15, 20),
      source: 'manual',
      classification: 'non_essential',
      classificationSource: 'predicted',
    },
    {
      id: txSplitDinnerId,
      name: 'Burma Burma Team Dinner (My share of ₹1,680)',
      amount: 560,
      category: 'Snacks & Beverages',
      timestamp: dinnerIso,
      linkedSharedExpenseId: splitDinnerId,
      source: 'ledger',
      classification: 'non_essential',
      classificationSource: 'user',
    },
    {
      id: 'sample-tx-fuel-metro',
      name: 'Metro Card & Auto Commute Top-up',
      amount: 520,
      category: 'Fuel & Transportation',
      timestamp: resolveCurrentMonthIso(referenceDate, 4, 9, 10),
      source: 'manual',
      classification: 'essential',
      classificationSource: 'predicted',
    },
    {
      id: txSplitGroceryId,
      name: 'Weekend Kitchen & Milk Haul (My share of ₹960)',
      amount: 480,
      category: 'Groceries',
      timestamp: grocerySplitIso,
      linkedSharedExpenseId: splitGroceryId,
      source: 'mart',
      classification: 'essential',
      classificationSource: 'predicted',
    },
    {
      id: 'sample-tx-zepto-snacks',
      name: 'Zepto Midnight Munchies Order',
      amount: 348,
      category: 'Snacks & Beverages',
      timestamp: txAuditZeptoDate,
      source: 'audit',
      classification: 'impulsive',
      classificationSource: 'predicted',
    },
    {
      id: txSplitWifiId,
      name: 'Airtel Xstream Fiber (My share of ₹999)',
      amount: 499.5,
      category: 'Mobile & Internet Bills',
      timestamp: wifiIso,
      linkedSharedExpenseId: splitWifiId,
      source: 'ledger',
      classification: 'essential',
      classificationSource: 'predicted',
    },
    {
      id: 'sample-tx-staples-stockup',
      name: 'India Gate Basmati & Aashirvaad Atta',
      amount: 995,
      category: 'Groceries',
      timestamp: txMart2Date,
      source: 'mart',
      classification: 'essential',
      classificationSource: 'predicted',
    },
    {
      id: 'sample-tx-produce-fresh',
      name: 'Fresh Tomatoes, Onions & Bananas',
      amount: 310,
      category: 'Fruits & Vegetables',
      timestamp: resolveCurrentMonthIso(referenceDate, 10, 11, 40),
      source: 'mart',
      classification: 'essential',
      classificationSource: 'predicted',
    },
    {
      id: 'sample-tx-electricity',
      name: 'BESCOM Electricity Bill',
      amount: 1420,
      category: 'Electricity & Utilities',
      timestamp: resolveCurrentMonthIso(referenceDate, 11, 12, 0),
      source: 'manual',
      classification: 'essential',
      classificationSource: 'predicted',
    },
    {
      id: 'sample-tx-movie-night',
      name: 'IMAX Movie Tickets & Popcorn',
      amount: 790,
      category: 'Entertainment',
      timestamp: resolveCurrentMonthIso(referenceDate, 8, 20, 30),
      source: 'manual',
      classification: 'non_essential',
      classificationSource: 'predicted',
    },
    {
      id: 'sample-tx-refunded-bakery',
      name: 'Cold Brew & Croissant Combo (Delayed Order)',
      amount: 280,
      category: 'Snacks & Beverages',
      timestamp: resolveCurrentMonthIso(referenceDate, 5, 16, 15),
      status: 'refunded',
      refundAmount: 280,
      source: 'manual',
      classification: 'impulsive',
      classificationSource: 'predicted',
    },
    // Previous month entries so Monthly Trends & Cycle Rollover render comparison bars immediately
    {
      id: 'sample-tx-prev-groceries',
      name: 'Monthly Kirana & Dal Refill',
      amount: 3250,
      category: 'Groceries',
      timestamp: resolveDaysBackIso(referenceDate, 34, 18),
      source: 'mart',
      classification: 'essential',
      classificationSource: 'predicted',
    },
    {
      id: 'sample-tx-prev-utilities',
      name: 'Electricity & Broadband Bundle',
      amount: 2180,
      category: 'Electricity & Utilities',
      timestamp: resolveDaysBackIso(referenceDate, 38, 13),
      source: 'manual',
      classification: 'essential',
      classificationSource: 'predicted',
    },
    {
      id: 'sample-tx-prev-snacks',
      name: 'Cafe & Weekend Delivery Orders',
      amount: 1460,
      category: 'Snacks & Beverages',
      timestamp: resolveDaysBackIso(referenceDate, 41, 20),
      source: 'audit',
      classification: 'non_essential',
      classificationSource: 'predicted',
    },
  ];

  // Purchase Sessions for Mart Order History & Buy Again
  const purchaseHistory: PurchaseSession[] = [
    {
      id: 'sample-session-1',
      timestamp: txMart1Date,
      items: [
        {
          itemId: 'item-milk',
          name: 'Taaza Toned Fresh Milk',
          brand: 'Amul',
          category: 'Dairy & Bakery',
          unit: '1 L',
          price: 63,
          quantity: 2,
          subtotal: 126,
        },
        {
          itemId: 'item-eggs',
          name: 'Farm Fresh White Eggs',
          brand: 'Keggs',
          category: 'Meat & Eggs',
          unit: '6 pcs',
          price: 70,
          quantity: 1,
          subtotal: 70,
        },
      ],
      totalAmount: 196,
      personalShare: 196,
      categoryTotals: { 'Dairy & Bakery': 126, 'Meat & Eggs': 70 },
      isSplit: false,
    },
    {
      id: 'sample-session-2',
      timestamp: txMart2Date,
      items: [
        {
          itemId: 'item-rice',
          name: 'Basmati Rice',
          brand: 'India Gate',
          category: 'Groceries',
          variantId: 'var-rice-5kg',
          variantLabel: '5 kg Bag',
          unit: '5 kg',
          price: 535,
          quantity: 1,
          subtotal: 535,
        },
        {
          itemId: 'item-wheat-flour',
          name: 'Whole Wheat Atta',
          brand: 'Aashirvaad',
          category: 'Groceries',
          variantId: 'var-atta-5kg',
          variantLabel: '5 kg Pack',
          unit: '5 kg',
          price: 230,
          quantity: 2,
          subtotal: 460,
        },
      ],
      totalAmount: 995,
      personalShare: 995,
      categoryTotals: { Groceries: 995 },
      isSplit: false,
    },
    {
      id: 'sample-session-3',
      timestamp: resolveCurrentMonthIso(referenceDate, 8, 9, 15),
      items: [
        {
          itemId: 'item-milk',
          name: 'Taaza Toned Fresh Milk',
          brand: 'Amul',
          category: 'Dairy & Bakery',
          unit: '1 L',
          price: 60,
          quantity: 2,
          subtotal: 120,
        },
      ],
      totalAmount: 120,
      personalShare: 120,
      categoryTotals: { 'Dairy & Bakery': 120 },
      isSplit: false,
    },
  ];

  // Price Observations across real catalog items over past 75 days
  const priceObservations: PriceObservation[] = [
    buildPriceObservation({
      id: 'sample-obs-rice-1',
      rawName: 'Basmati Rice',
      explicitProductId: 'item-rice',
      category: 'Groceries',
      brand: 'India Gate',
      quantity: 1,
      packageSize: '5 kg',
      totalPrice: 565,
      purchaseDate: resolveDaysBackIso(referenceDate, 62),
      purchaseSource: 'mart',
      entryKind: 'actual_purchase',
      catalogItems,
    }),
    buildPriceObservation({
      id: 'sample-obs-rice-2',
      rawName: 'Basmati Rice',
      explicitProductId: 'item-rice',
      category: 'Groceries',
      brand: 'India Gate',
      quantity: 1,
      packageSize: '5 kg',
      totalPrice: 545,
      purchaseDate: resolveDaysBackIso(referenceDate, 31),
      purchaseSource: 'audit',
      entryKind: 'actual_purchase',
      catalogItems,
    }),
    buildPriceObservation({
      id: 'sample-obs-rice-3',
      rawName: 'Basmati Rice',
      explicitProductId: 'item-rice',
      category: 'Groceries',
      brand: 'India Gate',
      quantity: 1,
      packageSize: '5 kg',
      totalPrice: 535,
      purchaseDate: txMart2Date,
      purchaseSource: 'mart',
      entryKind: 'actual_purchase',
      catalogItems,
    }),
    buildPriceObservation({
      id: 'sample-obs-milk-1',
      rawName: 'Taaza Toned Fresh Milk',
      explicitProductId: 'item-milk',
      category: 'Dairy & Bakery',
      brand: 'Amul',
      quantity: 2,
      packageSize: '1 L',
      totalPrice: 112,
      purchaseDate: resolveDaysBackIso(referenceDate, 48),
      purchaseSource: 'mart',
      entryKind: 'actual_purchase',
      catalogItems,
    }),
    buildPriceObservation({
      id: 'sample-obs-milk-2',
      rawName: 'Taaza Toned Fresh Milk',
      explicitProductId: 'item-milk',
      category: 'Dairy & Bakery',
      brand: 'Amul',
      quantity: 2,
      packageSize: '1 L',
      totalPrice: 120,
      purchaseDate: resolveDaysBackIso(referenceDate, 19),
      purchaseSource: 'audit',
      entryKind: 'actual_purchase',
      catalogItems,
    }),
    buildPriceObservation({
      id: 'sample-obs-milk-3',
      rawName: 'Taaza Toned Fresh Milk',
      explicitProductId: 'item-milk',
      category: 'Dairy & Bakery',
      brand: 'Amul',
      quantity: 2,
      packageSize: '1 L',
      totalPrice: 126,
      purchaseDate: txMart1Date,
      purchaseSource: 'mart',
      entryKind: 'actual_purchase',
      catalogItems,
    }),
    buildPriceObservation({
      id: 'sample-obs-coffee-1',
      rawName: 'Classic Instant Coffee',
      explicitProductId: 'item-coffee',
      category: 'Snacks & Beverages',
      brand: 'Nescafe',
      quantity: 1,
      packageSize: '100 g',
      totalPrice: 175,
      purchaseDate: resolveDaysBackIso(referenceDate, 55),
      purchaseSource: 'mart',
      entryKind: 'actual_purchase',
      catalogItems,
    }),
    buildPriceObservation({
      id: 'sample-obs-coffee-2',
      rawName: 'Classic Instant Coffee',
      explicitProductId: 'item-coffee',
      category: 'Snacks & Beverages',
      brand: 'Nescafe',
      quantity: 1,
      packageSize: '100 g',
      totalPrice: 185,
      purchaseDate: resolveDaysBackIso(referenceDate, 24),
      purchaseSource: 'manual',
      entryKind: 'actual_purchase',
      catalogItems,
    }),
    buildPriceObservation({
      id: 'sample-obs-coffee-3',
      rawName: 'Classic Instant Coffee',
      explicitProductId: 'item-coffee',
      category: 'Snacks & Beverages',
      brand: 'Nescafe',
      quantity: 1,
      packageSize: '100 g',
      totalPrice: 192,
      purchaseDate: txAuditZeptoDate,
      purchaseSource: 'audit',
      entryKind: 'actual_purchase',
      catalogItems,
    }),
  ];

  const priceAlerts: PriceAlert[] = [
    {
      id: 'sample-alert-milk',
      productId: 'item-milk',
      productName: 'Taaza Toned Fresh Milk',
      unitOfMeasurement: 'L',
      targetUnitPrice: 58,
      increaseThresholdPct: 8,
      enabled: true,
      createdAt: resolveDaysBackIso(referenceDate, 30),
      lastTriggeredAt: txMart1Date,
      lastTriggerMessage: 'Unit price rose to ₹63.00/L (+12.5% above baseline ₹56.00/L)',
    },
  ];

  const triggeredPriceAlerts: TriggeredPriceAlert[] = [
    {
      id: 'sample-trig-milk',
      alertId: 'sample-alert-milk',
      productId: 'item-milk',
      productName: 'Taaza Toned Fresh Milk',
      reason: 'price_spike',
      message: 'Taaza Toned Fresh Milk climbed to ₹63.00/L (up 12.5% from your ₹56.00/L baseline).',
      recordedUnitPrice: 63,
      unitOfMeasurement: 'L',
      triggeredAt: txMart1Date,
      dismissed: false,
    },
  ];

  // Saved Fee Audits (Blinkit & Zepto)
  const savedAudits: SavedAudit[] = [
    {
      id: 'sample-audit-blinkit',
      timestamp: txAuditBlinkitDate,
      source: 'Blinkit Order #BLK-4921',
      subtotal: 605,
      extraFees: 37,
      total: 642,
      flags: [
        {
          type: 'handling_fee',
          severity: 'warning',
          message: 'Handling & packaging charge added (₹12)',
          estimatedCost: 12,
        },
        {
          type: 'hidden_charge',
          severity: 'warning',
          message: 'Platform fee + rain surge surcharge detected (₹25)',
          estimatedCost: 25,
        },
      ],
    },
    {
      id: 'sample-audit-zepto',
      timestamp: txAuditZeptoDate,
      source: 'Zepto Late-Night Cart #ZEP-8840',
      subtotal: 299,
      extraFees: 49,
      total: 348,
      flags: [
        {
          type: 'handling_fee',
          severity: 'critical',
          message: 'Small cart fee + late-night surge (16.4% markup over item subtotal)',
          estimatedCost: 49,
        },
      ],
    },
  ];

  // Financial Wellness (War Room) state
  const categoryLimits: CategorySpendingLimit[] = [
    {
      id: 'sample-limit-snacks',
      category: 'Snacks & Beverages',
      period: 'weekly',
      limitAmount: 900,
      warningThresholdPct: 75,
      enabled: true,
      createdAt: resolveDaysBackIso(referenceDate, 20),
    },
    {
      id: 'sample-limit-groceries',
      category: 'Groceries',
      period: 'monthly',
      limitAmount: 4500,
      warningThresholdPct: 80,
      enabled: true,
      createdAt: resolveDaysBackIso(referenceDate, 20),
    },
  ];

  const warRoomChallenges: FinancialChallenge[] = [
    {
      id: 'sample-challenge-no-impulsive',
      templateId: 'cut_impulsive_7d',
      title: '7-Day Zero Late-Night Impulse Orders',
      description: 'Keep unplanned delivery orders under ₹350 all week.',
      targetDays: 7,
      targetCategory: 'Snacks & Beverages',
      maxAllowedSpend: 350,
      startedAt: resolveDaysBackIso(referenceDate, 3, 9),
      status: 'active',
      completedAt: null,
    },
  ];

  const warRoomTargets: FinancialTarget[] = [
    {
      id: 'sample-target-monthly-cap',
      title: 'Monthly Non-Essential Cap',
      type: 'cap_non_essential_amount',
      period: 'monthly',
      targetValue: 2500,
      baselineValue: 3200,
      transferredSavings: 650,
      createdAt: resolveDaysBackIso(referenceDate, 14),
      updatedAt: nowIso,
    },
  ];

  const disciplineCheckIns = [
    toLocalDateKey(new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() - 2)),
    toLocalDateKey(new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() - 1)),
    toLocalDateKey(referenceDate),
  ];

  return {
    totalBudget: 12000,
    sessionBudget: 1500,
    transactions,
    purchaseHistory,
    people,
    sharedExpenses,
    settlements,
    priceObservations,
    priceAlerts,
    triggeredPriceAlerts,
    savedAudits,
    categoryLimits,
    warRoomChallenges,
    warRoomTargets,
    disciplineCheckIns,
    isSampleDataLoaded: true,
  };
}

export function buildEmptyWorkspacePatch(): EmptyWorkspacePatch {
  return {
    transactions: [],
    purchaseHistory: [],
    people: [],
    sharedExpenses: [],
    settlements: [],
    priceObservations: [],
    priceAlerts: [],
    triggeredPriceAlerts: [],
    feeFlags: [],
    parsedReceipts: [],
    savedAudits: [],
    totalBudget: 5000,
    sessionBudget: null,
    isBrokeMode: false,
    brokeModeConfig: { ...DEFAULT_BROKE_MODE_CONFIG },
    categoryLimits: [],
    warRoomChallenges: [],
    warRoomTargets: [],
    dismissedWarRoomAlerts: [],
    disciplineCheckIns: [],
    lastCheckoutMeta: null,
    pennyMessages: [],
    isSampleDataLoaded: false,
  };
}
