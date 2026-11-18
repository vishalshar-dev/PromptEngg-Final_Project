import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  SELF_PERSON_ID,
  type BackupData,
  type BrokeModeConfig,
  type CartItem,
  type CategoryCaps,
  type CategoryConfig,
  type CategorySpendingLimit,
  type ExpenseParticipantShare,
  type FeeFlag,
  type FinancialChallenge,
  type FinancialChallengeTemplateId,
  type FinancialTarget,
  type FinancialTargetType,
  type ParsedReceipt,
  type Person,
  type PriceAlert,
  type PriceEntryKind,
  type PriceHistory,
  type PriceObservation,
  type PriceObservationSource,
  type PriceTimeframe,
  type PurchaseSession,
  type RecurrenceConfig,
  type SavedAudit,
  type Settlement,
  type SharedExpense,
  type SpendingClassification,
  type SplitMethod,
  type Transaction,
  type TransactionStatus,
  type TriggeredPriceAlert,
  type WarRoomPeriod,
} from '../types/models';
import {
  clampQuantity,
  mergeBackupItems,
  mergeCategories,
} from '../utils/storeHelpers';
import {
  INITIAL_CATEGORY_CONFIGS,
  INITIAL_MART_CATEGORIES,
  INITIAL_MART_CATEGORY_CAPS,
  INITIAL_MART_ITEMS,
  ensureCatalogPriceHistory,
  migrateCategoryConfigs,
  migratePersistedMartItems,
} from '../data/martCatalog';
import {
  buildCheckoutBreakdown,
  buildCheckoutSignature,
  getDueRecurringItems,
  getNextDueDateString,
  isDuplicateCheckoutAttempt,
  reorderCategoryList,
  toLocalDateKey,
} from '../utils/martEngine';
import { isDuplicateSettlement, roundCurrency } from '../utils/splitLedgerEngine';
import { DEFAULT_BROKE_MODE_CONFIG } from '../utils/warRoomEngine';

import {
  buildPriceObservation,
  buildProductPriceSummaries,
  buildReceiptFingerprint,
  evaluatePriceAlerts,
  inferCategoryFromName,
} from '../utils/priceTrackerEngine';

export type {
  BackupData,
  CartItem,
  CategoryCaps,
  CategoryConfig,
  ExpenseParticipantShare,
  FeeFlag,
  ParsedReceipt,
  ParsedReceiptItem,
  Person,
  PriceAlert,
  PriceEntryKind,
  PriceHistory,
  PriceObservation,
  PriceObservationSource,
  PricePoint,
  PriceSource,
  PriceTimeframe,
  PurchaseSession,
  PurchaseSessionItem,
  RecurrenceConfig,
  RecurrenceFrequency,
  SavedAudit,
  SavedAuditFlag,
  Settlement,
  SharedExpense,
  SplitMethod,
  Transaction,
  TransactionStatus,
  TriggeredPriceAlert,
} from '../types/models';

export interface SharedExpenseInput {
  name: string;
  totalAmount: number;
  category: string;
  date: string;
  paidById: string;
  splitMethod: SplitMethod;
  participants: ExpenseParticipantShare[];
  source?: 'mart' | 'manual' | 'ledger';
}

export interface SettlementInput {
  fromPersonId: string;
  toPersonId: string;
  amount: number;
  date: string;
  note?: string;
  expenseId?: string;
}

export interface CategoryInput {
  name: string;
  iconKey?: string;
  accent?: string;
  imageUrl?: string;
}

export interface ManualPricePurchaseInput {
  productName: string;
  explicitProductId?: string;
  category?: string;
  brand?: string;
  quantity: number;
  packageSize: string;
  totalPrice: number;
  purchaseDate: string;
  entryKind: PriceEntryKind;
  logExpense?: boolean;
}

export interface PriceAlertInput {
  productId: string;
  productName: string;
  unitOfMeasurement: string;
  targetUnitPrice?: number | null;
  increaseThresholdPct?: number | null;
}

export interface AppState {
  items: CartItem[];
  transactions: Transaction[];
  totalBudget: number;
  sessionBudget: number | null;
  isBrokeMode: boolean;
  brokeModeConfig: BrokeModeConfig;
  categoryLimits: CategorySpendingLimit[];
  warRoomChallenges: FinancialChallenge[];
  warRoomTargets: FinancialTarget[];
  dismissedWarRoomAlerts: string[];
  disciplineCheckIns: string[];
  categories: string[];
  categoryConfigs: CategoryConfig[];
  categoryCaps: CategoryCaps;
  priceHistory: PriceHistory;
  purchaseHistory: PurchaseSession[];
  priceObservations: PriceObservation[];
  priceAlerts: PriceAlert[];
  triggeredPriceAlerts: TriggeredPriceAlert[];
  lastCheckoutMeta: { signature: string; at: number } | null;
  feeFlags: FeeFlag[];
  parsedReceipts: ParsedReceipt[];
  savedAudits: SavedAudit[];

  people: Person[];
  sharedExpenses: SharedExpense[];
  settlements: Settlement[];

  addCategory: (categoryName: string) => void;
  addCategoryConfig: (input: CategoryInput) => CategoryConfig | null;
  renameCategoryConfig: (id: string, newName: string) => void;
  updateCategoryAppearance: (
    id: string,
    patch: { iconKey?: string; accent?: string; imageUrl?: string }
  ) => void;
  deleteCategoryConfig: (id: string) => boolean;
  reorderCategories: (fromIndex: number, toIndex: number) => void;

  addCustomItem: (item: Omit<CartItem, 'quantity'>) => void;
  updateProduct: (id: string, patch: Partial<Omit<CartItem, 'id'>>) => void;
  removeCustomItem: (id: string) => void;
  removeProduct: (id: string) => void;
  updateItemPrice: (id: string, newPrice: number) => void;
  toggleFavourite: (id: string) => void;
  setProductRecurrence: (id: string, recurrence: RecurrenceConfig | null) => void;
  addDueRecurringToCart: () => number;

  addToCart: (item: Omit<CartItem, 'quantity'> | CartItem, amount?: number) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  setItemQuantity: (id: string, quantity: number) => void;
  checkoutCart: (splitConfig?: Omit<SharedExpenseInput, 'source'>) => boolean;
  clearCart: () => void;
  repeatPurchaseSession: (sessionId: string) => number;

  addTransaction: (tx: Omit<Transaction, 'id' | 'timestamp'> & { timestamp?: string }) => void;
  updateTransaction: (
    id: string,
    patch: Partial<Pick<Transaction, 'name' | 'amount' | 'category' | 'timestamp'>>
  ) => void;
  removeTransaction: (id: string) => void;
  cancelTransaction: (id: string) => void;
  refundTransaction: (id: string, refundAmount?: number) => void;
  updateTransactionClassification: (id: string, classification: SpendingClassification) => void;
  toggleBrokeMode: () => void;
  updateBrokeModeConfig: (patch: Partial<BrokeModeConfig>) => void;
  upsertCategoryLimit: (input: {
    id?: string;
    category: string;
    period: WarRoomPeriod;
    limitAmount: number;
    warningThresholdPct?: number;
    enabled?: boolean;
  }) => CategorySpendingLimit;
  deleteCategoryLimit: (id: string) => void;
  dismissWarRoomAlert: (signature: string) => void;
  restoreDismissedWarRoomAlerts: () => void;
  startWarRoomChallenge: (input: {
    templateId: FinancialChallengeTemplateId;
    title: string;
    description: string;
    targetDays: number;
    targetCategory?: string | null;
    maxAllowedSpend?: number | null;
    isCustom?: boolean;
  }) => FinancialChallenge;
  completeWarRoomChallenge: (id: string) => void;
  deleteWarRoomChallenge: (id: string) => void;
  recordDisciplineCheckIn: (dateKey?: string) => void;
  addFinancialTarget: (input: {
    title: string;
    type: FinancialTargetType;
    period: 'weekly' | 'monthly';
    targetValue: number;
    baselineValue?: number | null;
  }) => FinancialTarget;
  logTargetSavingsTransfer: (id: string, amount: number) => void;
  deleteFinancialTarget: (id: string) => void;
  setTransactions: (txs: Transaction[]) => void;
  setItems: (items: CartItem[]) => void;

  recordReceiptAsTransaction: (receipt: ParsedReceipt) => {
    ok: boolean;
    error?: string;
    transactionId?: string;
    observationsCount?: number;
    triggeredAlertsCount?: number;
  };
  recordManualPricePurchase: (input: ManualPricePurchaseInput) => {
    observation: PriceObservation;
    triggeredAlertsCount: number;
  };
  deletePriceObservation: (id: string) => void;
  addPriceAlert: (input: PriceAlertInput) => PriceAlert;
  updatePriceAlert: (id: string, patch: Partial<Omit<PriceAlert, 'id' | 'createdAt'>>) => void;
  togglePriceAlert: (id: string) => void;
  deletePriceAlert: (id: string) => void;
  dismissTriggeredAlert: (id: string) => void;
  clearTriggeredAlerts: () => void;

  addPerson: (name: string, contact?: string) => Person;
  updatePerson: (id: string, name: string, contact?: string) => void;
  removePerson: (id: string) => boolean;

  addSharedExpense: (input: SharedExpenseInput) => SharedExpense;
  updateSharedExpense: (id: string, input: SharedExpenseInput) => void;
  removeSharedExpense: (id: string) => void;
  convertTransactionToSplit: (transactionId: string, input: SharedExpenseInput) => void;

  recordSettlement: (input: SettlementInput) => { ok: boolean; error?: string; settlement?: Settlement };
  removeSettlement: (id: string) => void;

  setSessionBudget: (amount: number | null) => void;
  setTotalBudget: (amount: number) => void;
  setCategoryCap: (category: string, amount: number | null) => void;
  setFeeFlags: (flags: FeeFlag[]) => void;
  addParsedReceipt: (receipt: ParsedReceipt) => void;
  clearParsedReceipts: () => void;

  addSavedAudit: (audit: Omit<SavedAudit, 'id' | 'timestamp'>) => void;
  removeSavedAudit: (id: string) => void;
  clearSavedAudits: () => void;
  importBackupData: (data: BackupData) => void;
}

function getUserShareFromParticipants(participants: ExpenseParticipantShare[]): number {
  const selfEntry = participants.find((p) => p.personId === SELF_PERSON_ID);
  return selfEntry ? roundCurrency(Math.max(0, selfEntry.amount)) : 0;
}

function formatSharedTxName(name: string, totalAmount: number): string {
  return `${name} (My share of ₹${roundCurrency(totalAmount)})`;
}

function migratePurchaseSessionsToObservations(
  sessions: PurchaseSession[],
  items: CartItem[]
): PriceObservation[] {
  const migrated: PriceObservation[] = [];
  for (const session of sessions) {
    for (const sItem of session.items) {
      migrated.push(
        buildPriceObservation({
          id: `migrated-${session.id}-${sItem.itemId}`,
          rawName: sItem.name,
          explicitProductId: sItem.itemId,
          category: sItem.category,
          quantity: sItem.quantity,
          packageSize: sItem.unit || '1 unit',
          totalPrice: sItem.subtotal,
          purchaseDate: session.timestamp,
          purchaseSource: 'mart',
          entryKind: 'actual_purchase',
          transactionId: session.linkedSharedExpenseId ?? null,
          catalogItems: items,
          existingObservations: migrated,
        })
      );
    }
  }
  return migrated;
}

function appendObservationsAndEvaluateAlerts(
  current: Pick<AppState, 'priceObservations' | 'priceAlerts' | 'triggeredPriceAlerts' | 'items'>,
  candidates: PriceObservation[],
  nowIso: string = new Date().toISOString()
): {
  priceObservations: PriceObservation[];
  priceAlerts: PriceAlert[];
  triggeredPriceAlerts: TriggeredPriceAlert[];
  triggeredCount: number;
} {
  const dedupedNew = candidates.filter(
    (c) =>
      !current.priceObservations.some(
        (existing) =>
          existing.id === c.id ||
          (c.transactionId != null &&
            existing.transactionId === c.transactionId &&
            existing.productId === c.productId &&
            existing.packageSize === c.packageSize &&
            existing.totalPrice === c.totalPrice)
      )
  );

  if (dedupedNew.length === 0) {
    return {
      priceObservations: current.priceObservations,
      priceAlerts: current.priceAlerts,
      triggeredPriceAlerts: current.triggeredPriceAlerts,
      triggeredCount: 0,
    };
  }

  const priorSummaries = buildProductPriceSummaries(current.priceObservations, current.items);
  const { triggered, updatedAlerts } = evaluatePriceAlerts(
    dedupedNew,
    priorSummaries,
    current.priceAlerts,
    nowIso
  );

  return {
    priceObservations: [...dedupedNew, ...current.priceObservations],
    priceAlerts: updatedAlerts,
    triggeredPriceAlerts: [...triggered, ...current.triggeredPriceAlerts].slice(0, 50),
    triggeredCount: triggered.length,
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      items: INITIAL_MART_ITEMS,
      transactions: [],
      totalBudget: 5000,
      sessionBudget: null,
      isBrokeMode: false,
      brokeModeConfig: { ...DEFAULT_BROKE_MODE_CONFIG },
      categoryLimits: [],
      warRoomChallenges: [],
      warRoomTargets: [],
      dismissedWarRoomAlerts: [],
      disciplineCheckIns: [],
      categories: INITIAL_MART_CATEGORIES,
      categoryConfigs: INITIAL_CATEGORY_CONFIGS,
      categoryCaps: INITIAL_MART_CATEGORY_CAPS,
      priceHistory: ensureCatalogPriceHistory(INITIAL_MART_ITEMS),
      purchaseHistory: [],
      priceObservations: [],
      priceAlerts: [],
      triggeredPriceAlerts: [],
      lastCheckoutMeta: null,
      feeFlags: [],
      parsedReceipts: [],
      savedAudits: [],

      people: [],
      sharedExpenses: [],
      settlements: [],

      addCategory: (categoryName) => {
        get().addCategoryConfig({ name: categoryName });
      },

      addCategoryConfig: (input) => {
        const trimmed = input.name.trim();
        if (!trimmed) return null;
        const state = get();
        const duplicate = state.categoryConfigs.find(
          (c) => c.name.toLowerCase() === trimmed.toLowerCase()
        );
        if (duplicate) return duplicate;

        const created: CategoryConfig = {
          id: `cat-custom-${crypto.randomUUID().slice(0, 8)}`,
          name: trimmed,
          iconKey: input.iconKey || 'package',
          accent: input.accent || 'teal',
          imageUrl: input.imageUrl?.trim() || undefined,
          isCustom: true,
          order: state.categoryConfigs.length,
        };

        const nextConfigs = [...state.categoryConfigs, created];
        set({
          categoryConfigs: nextConfigs,
          categories: nextConfigs.map((c) => c.name),
          categoryCaps: { ...state.categoryCaps, [trimmed]: state.categoryCaps[trimmed] ?? null },
        });
        return created;
      },

      renameCategoryConfig: (id, newName) =>
        set((state) => {
          const trimmed = newName.trim();
          if (!trimmed) return state;
          const target = state.categoryConfigs.find((c) => c.id === id);
          if (!target || target.name === trimmed) return state;
          const collision = state.categoryConfigs.some(
            (c) => c.id !== id && c.name.toLowerCase() === trimmed.toLowerCase()
          );
          if (collision) return state;

          const oldName = target.name;
          const nextConfigs = state.categoryConfigs.map((c) =>
            c.id === id ? { ...c, name: trimmed } : c
          );
          const nextCaps = { ...state.categoryCaps };
          if (oldName in nextCaps) {
            nextCaps[trimmed] = nextCaps[oldName];
            delete nextCaps[oldName];
          }

          return {
            categoryConfigs: nextConfigs,
            categories: nextConfigs.map((c) => c.name),
            categoryCaps: nextCaps,
            items: state.items.map((item) =>
              item.category === oldName ? { ...item, category: trimmed } : item
            ),
            transactions: state.transactions.map((tx) =>
              tx.category === oldName ? { ...tx, category: trimmed } : tx
            ),
            sharedExpenses: state.sharedExpenses.map((se) =>
              se.category === oldName ? { ...se, category: trimmed } : se
            ),
            purchaseHistory: state.purchaseHistory.map((session) => {
              const nextCatTotals = { ...session.categoryTotals };
              if (oldName in nextCatTotals) {
                nextCatTotals[trimmed] =
                  roundCurrency((nextCatTotals[trimmed] ?? 0) + nextCatTotals[oldName]);
                delete nextCatTotals[oldName];
              }
              return {
                ...session,
                categoryTotals: nextCatTotals,
                items: session.items.map((it) =>
                  it.category === oldName ? { ...it, category: trimmed } : it
                ),
              };
            }),
          };
        }),

      updateCategoryAppearance: (id, patch) =>
        set((state) => ({
          categoryConfigs: state.categoryConfigs.map((c) =>
            c.id === id
              ? {
                  ...c,
                  iconKey: patch.iconKey ?? c.iconKey,
                  accent: patch.accent ?? c.accent,
                  imageUrl: patch.imageUrl !== undefined ? patch.imageUrl || undefined : c.imageUrl,
                }
              : c
          ),
        })),

      deleteCategoryConfig: (id) => {
        const state = get();
        const target = state.categoryConfigs.find((c) => c.id === id);
        if (!target || !target.isCustom) return false;

        const fallbackCategory =
          state.categoryConfigs.find((c) => c.id !== id && c.name === 'Other Expenses')?.name ??
          state.categoryConfigs.find((c) => c.id !== id)?.name ??
          'Other Expenses';

        const nextConfigs = state.categoryConfigs
          .filter((c) => c.id !== id)
          .map((c, idx) => ({ ...c, order: idx }));

        set({
          categoryConfigs: nextConfigs,
          categories: nextConfigs.map((c) => c.name),
          items: state.items.map((item) =>
            item.category === target.name ? { ...item, category: fallbackCategory } : item
          ),
        });
        return true;
      },

      reorderCategories: (fromIndex, toIndex) =>
        set((state) => {
          const nextConfigs = reorderCategoryList(state.categoryConfigs, fromIndex, toIndex);
          return {
            categoryConfigs: nextConfigs,
            categories: nextConfigs.map((c) => c.name),
          };
        }),

      addCustomItem: (item) =>
        set((state) => {
          const nowIso = new Date().toISOString();
          const created: CartItem = {
            ...item,
            quantity: 0,
            unit: item.unit?.trim() || '1 unit',
            isCustom: item.isCustom ?? true,
          };
          const nextItems = [created, ...state.items];
          const hasCat = state.categoryConfigs.some(
            (c) => c.name.toLowerCase() === item.category.toLowerCase()
          );
          const nextConfigs = hasCat
            ? state.categoryConfigs
            : [
                ...state.categoryConfigs,
                {
                  id: `cat-custom-${crypto.randomUUID().slice(0, 8)}`,
                  name: item.category,
                  iconKey: 'package',
                  accent: 'teal',
                  isCustom: true,
                  order: state.categoryConfigs.length,
                },
              ];

          return {
            items: nextItems,
            categoryConfigs: nextConfigs,
            categories: nextConfigs.map((c) => c.name),
            priceHistory: {
              ...state.priceHistory,
              [item.id]: [
                {
                  date: nowIso,
                  price: item.price,
                  unit: created.unit,
                  source: 'user_purchase',
                  productName: item.name,
                },
              ],
            },
          };
        }),

      updateProduct: (id, patch) =>
        set((state) => {
          const existing = state.items.find((i) => i.id === id);
          if (!existing) return state;

          const nextPrice =
            typeof patch.price === 'number' && patch.price > 0 ? patch.price : existing.price;
          const nextUnit = patch.unit !== undefined ? patch.unit.trim() || '1 unit' : existing.unit;
          const nextName = patch.name !== undefined ? patch.name.trim() || existing.name : existing.name;
          const priceChanged = Math.abs(nextPrice - existing.price) > 0.001;

          const nextHistory = priceChanged
            ? {
                ...state.priceHistory,
                [id]: [
                  ...(state.priceHistory[id] ?? []),
                  {
                    date: new Date().toISOString(),
                    price: nextPrice,
                    unit: nextUnit,
                    source: 'user_purchase' as const,
                    productName: nextName,
                  },
                ],
              }
            : state.priceHistory;

          return {
            items: state.items.map((item) =>
              item.id === id
                ? {
                    ...item,
                    ...patch,
                    name: nextName,
                    price: nextPrice,
                    unit: nextUnit,
                  }
                : item
            ),
            priceHistory: nextHistory,
          };
        }),

      removeCustomItem: (id) => {
        get().removeProduct(id);
      },

      removeProduct: (id) =>
        set((state) => {
          const nextHistory = { ...state.priceHistory };
          delete nextHistory[id];
          return {
            items: state.items.filter((i) => i.id !== id),
            priceHistory: nextHistory,
          };
        }),

      updateItemPrice: (id, newPrice) =>
        set((state) => {
          if (!Number.isFinite(newPrice) || newPrice <= 0) return state;
          const target = state.items.find((i) => i.id === id);
          return {
            items: state.items.map((i) => (i.id === id ? { ...i, price: newPrice } : i)),
            priceHistory: {
              ...state.priceHistory,
              [id]: [
                ...(state.priceHistory[id] ?? []),
                {
                  date: new Date().toISOString(),
                  price: newPrice,
                  unit: target?.unit ?? '1 unit',
                  source: 'user_purchase',
                  productName: target?.name,
                },
              ],
            },
          };
        }),

      toggleFavourite: (id) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, isFavourite: !i.isFavourite } : i
          ),
        })),

      setProductRecurrence: (id, recurrence) =>
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, recurrence } : i)),
        })),

      addDueRecurringToCart: () => {
        const state = get();
        const now = new Date();
        const nowIso = now.toISOString();
        const dueItems = getDueRecurringItems(state.items, now);
        if (dueItems.length === 0) return 0;

        const dueIds = new Set(dueItems.map((i) => i.id));
        set({
          items: state.items.map((item) => {
            if (!dueIds.has(item.id)) return item;
            return {
              ...item,
              quantity: Math.max(item.quantity, 1),
              recurrence: item.recurrence
                ? { ...item.recurrence, lastAddedAt: nowIso }
                : item.recurrence,
            };
          }),
        });
        return dueItems.length;
      },

      addToCart: (item, amount = 1) =>
        set((state) => {
          const step = Math.max(1, Math.round(amount));
          const existingIndex = state.items.findIndex((i) => i.id === item.id);
          if (existingIndex > -1) {
            const newItems = [...state.items];
            newItems[existingIndex] = {
              ...newItems[existingIndex],
              quantity: newItems[existingIndex].quantity + step,
            };
            return { items: newItems };
          }
          const newItem: CartItem = {
            ...item,
            quantity: ('quantity' in item ? item.quantity : 0) + step,
            unit: item.unit || '1 unit',
          };
          return {
            items: [newItem, ...state.items],
            priceHistory: {
              ...state.priceHistory,
              [newItem.id]:
                state.priceHistory[newItem.id] ?? [
                  {
                    date: new Date().toISOString(),
                    price: newItem.price,
                    unit: newItem.unit,
                    source: 'user_purchase',
                    productName: newItem.name,
                  },
                ],
            },
          };
        }),

      removeFromCart: (id) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, quantity: Math.max(i.quantity - 1, 0) } : i
          ),
        })),

      updateQuantity: (id, delta) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, quantity: clampQuantity(i.quantity, delta) } : i
          ),
        })),

      setItemQuantity: (id, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, quantity: Math.max(0, Math.round(quantity)) } : i
          ),
        })),

      checkoutCart: (splitConfig) => {
        const current = get();
        const checkedOut = current.items.filter((i) => i.quantity > 0);
        if (checkedOut.length === 0) return false;

        const now = new Date();
        const nowMs = now.getTime();
        const nowIso = now.toISOString();

        const splitSig = splitConfig
          ? `${splitConfig.paidById}:${splitConfig.splitMethod}:${splitConfig.participants
              .map((p) => `${p.personId}=${p.amount}`)
              .join(',')}`
          : 'nosplit';
        const signature = buildCheckoutSignature(checkedOut, splitSig);

        if (isDuplicateCheckoutAttempt(current.lastCheckoutMeta, signature, nowMs)) {
          return false;
        }

        const breakdown = buildCheckoutBreakdown(checkedOut);
        const checkedOutIds = new Set(checkedOut.map((i) => i.id));

        const updatedItems: CartItem[] = current.items.map((item) => {
          if (!checkedOutIds.has(item.id)) return item;
          return {
            ...item,
            quantity: 0,
            lastPurchasedAt: nowIso,
            purchaseCount: (item.purchaseCount ?? 0) + item.quantity,
            recurrence: item.recurrence
              ? {
                  ...item.recurrence,
                  lastAddedAt: nowIso,
                  nextDueDate: getNextDueDateString(item.recurrence, now),
                }
              : item.recurrence,
          };
        });

        const nextPriceHistory: PriceHistory = { ...current.priceHistory };
        for (const item of checkedOut) {
          const prevPoints = nextPriceHistory[item.id] ?? [];
          nextPriceHistory[item.id] = [
            ...prevPoints,
            {
              date: nowIso,
              price: item.price,
              unit: item.unit ?? '1 unit',
              source: 'user_purchase',
              productName: item.name,
            },
          ];
        }

        const sessionItems = checkedOut.map((item) => ({
          itemId: item.id,
          name: item.name,
          category: item.category,
          unit: item.unit,
          price: item.price,
          quantity: item.quantity,
          subtotal: roundCurrency(item.price * item.quantity),
        }));

        if (!splitConfig) {
          const newTransactions = checkedOut.map((item) => ({
            id: crypto.randomUUID(),
            name: `${item.name} (x${item.quantity})`,
            amount: roundCurrency(item.price * item.quantity),
            category: item.category,
            timestamp: nowIso,
            source: 'mart' as const,
            status: 'active' as const,
          }));

          const newObs: PriceObservation[] = checkedOut.map((item, idx) =>
            buildPriceObservation({
              rawName: item.name,
              explicitProductId: item.id,
              category: item.category,
              quantity: item.quantity,
              packageSize: item.unit || '1 unit',
              totalPrice: roundCurrency(item.price * item.quantity),
              purchaseDate: nowIso,
              purchaseSource: 'mart',
              entryKind: 'actual_purchase',
              transactionId: newTransactions[idx].id,
              catalogItems: current.items,
              existingObservations: current.priceObservations,
            })
          );

          const obsResult = appendObservationsAndEvaluateAlerts(current, newObs, nowIso);

          const session: PurchaseSession = {
            id: crypto.randomUUID(),
            timestamp: nowIso,
            items: sessionItems,
            totalAmount: breakdown.totalAmount,
            personalShare: breakdown.totalAmount,
            categoryTotals: breakdown.categoryTotals,
            isSplit: false,
          };

          set({
            transactions: [...newTransactions, ...current.transactions],
            items: updatedItems,
            priceHistory: nextPriceHistory,
            purchaseHistory: [session, ...current.purchaseHistory].slice(0, 100),
            priceObservations: obsResult.priceObservations,
            priceAlerts: obsResult.priceAlerts,
            triggeredPriceAlerts: obsResult.triggeredPriceAlerts,
            lastCheckoutMeta: { signature, at: nowMs },
          });
          return true;
        }

        // Split Checkout: create ONE SharedExpense and at most ONE linked personal Transaction
        // for the user's own share so personal budget never counts others' shares or duplicates!
        const sharedId = crypto.randomUUID();
        const userShare = getUserShareFromParticipants(splitConfig.participants);
        const txId = userShare > 0 ? crypto.randomUUID() : null;
        const purchaseTimestamp = splitConfig.date || nowIso;

        const newSharedExpense: SharedExpense = {
          id: sharedId,
          name: splitConfig.name.trim(),
          totalAmount: roundCurrency(splitConfig.totalAmount),
          category: splitConfig.category,
          date: purchaseTimestamp,
          paidById: splitConfig.paidById,
          splitMethod: splitConfig.splitMethod,
          participants: splitConfig.participants,
          source: 'mart',
          linkedTransactionId: txId,
          createdAt: nowIso,
        };

        const nextTransactions =
          txId && userShare > 0
            ? [
                {
                  id: txId,
                  name: formatSharedTxName(splitConfig.name.trim(), splitConfig.totalAmount),
                  amount: userShare,
                  category: splitConfig.category,
                  timestamp: purchaseTimestamp,
                  linkedSharedExpenseId: sharedId,
                  source: 'mart' as const,
                  status: 'active' as const,
                },
                ...current.transactions,
              ]
            : current.transactions;

        const newObs: PriceObservation[] = checkedOut.map((item) =>
          buildPriceObservation({
            rawName: item.name,
            explicitProductId: item.id,
            category: item.category,
            quantity: item.quantity,
            packageSize: item.unit || '1 unit',
            totalPrice: roundCurrency(item.price * item.quantity),
            purchaseDate: purchaseTimestamp,
            purchaseSource: 'mart',
            entryKind: 'actual_purchase',
            transactionId: txId,
            catalogItems: current.items,
            existingObservations: current.priceObservations,
          })
        );

        const obsResult = appendObservationsAndEvaluateAlerts(current, newObs, nowIso);

        const session: PurchaseSession = {
          id: crypto.randomUUID(),
          timestamp: purchaseTimestamp,
          items: sessionItems,
          totalAmount: roundCurrency(splitConfig.totalAmount),
          personalShare: userShare,
          categoryTotals: breakdown.categoryTotals,
          isSplit: true,
          linkedSharedExpenseId: sharedId,
          splitSummaryText: `Split among ${splitConfig.participants.length} (${splitConfig.splitMethod})`,
        };

        set({
          sharedExpenses: [newSharedExpense, ...current.sharedExpenses],
          transactions: nextTransactions,
          items: updatedItems,
          priceHistory: nextPriceHistory,
          purchaseHistory: [session, ...current.purchaseHistory].slice(0, 100),
          priceObservations: obsResult.priceObservations,
          priceAlerts: obsResult.priceAlerts,
          triggeredPriceAlerts: obsResult.triggeredPriceAlerts,
          lastCheckoutMeta: { signature, at: nowMs },
        });
        return true;
      },

      clearCart: () =>
        set((state) => ({ items: state.items.map((i) => ({ ...i, quantity: 0 })) })),

      repeatPurchaseSession: (sessionId) => {
        const state = get();
        const session = state.purchaseHistory.find((s) => s.id === sessionId);
        if (!session) return 0;

        const itemQtyMap = new Map<string, number>();
        for (const sItem of session.items) {
          itemQtyMap.set(sItem.itemId, (itemQtyMap.get(sItem.itemId) ?? 0) + sItem.quantity);
        }

        const existingIds = new Set(state.items.map((i) => i.id));
        const restoredMissing: CartItem[] = [];

        for (const sItem of session.items) {
          if (!existingIds.has(sItem.itemId)) {
            restoredMissing.push({
              id: sItem.itemId,
              name: sItem.name,
              price: sItem.price,
              category: sItem.category,
              icon: '📦',
              unit: sItem.unit || '1 unit',
              quantity: sItem.quantity,
              isCustom: true,
            });
            existingIds.add(sItem.itemId);
          }
        }

        const updatedExisting = state.items.map((item) => {
          const addQty = itemQtyMap.get(item.id);
          if (!addQty) return item;
          return { ...item, quantity: item.quantity + addQty };
        });

        set({ items: [...restoredMissing, ...updatedExisting] });
        return session.items.reduce((sum, i) => sum + i.quantity, 0);
      },

      addTransaction: (tx) =>
        set((state) => ({
          transactions: [
            {
              ...tx,
              amount: roundCurrency(tx.amount),
              id: crypto.randomUUID(),
              timestamp: tx.timestamp ?? new Date().toISOString(),
              status: tx.status ?? 'active',
              source: tx.source ?? 'manual',
            },
            ...state.transactions,
          ],
        })),

      updateTransaction: (id, patch) =>
        set((state) => ({
          transactions: state.transactions.map((tx) => {
            if (tx.id !== id) return tx;
            const nextAmount =
              typeof patch.amount === 'number' && Number.isFinite(patch.amount) && patch.amount > 0
                ? roundCurrency(patch.amount)
                : tx.amount;
            const nextName =
              typeof patch.name === 'string' && patch.name.trim()
                ? patch.name.trim()
                : tx.name;
            const nextCategory =
              typeof patch.category === 'string' && patch.category.trim()
                ? patch.category.trim()
                : tx.category;
            const nextTimestamp =
              typeof patch.timestamp === 'string' && !Number.isNaN(new Date(patch.timestamp).getTime())
                ? patch.timestamp
                : tx.timestamp;
            return {
              ...tx,
              name: nextName,
              amount: nextAmount,
              category: nextCategory,
              timestamp: nextTimestamp,
            };
          }),
        })),

      removeTransaction: (id) =>
        set((state) => {
          const target = state.transactions.find((t) => t.id === id);
          const nextShared = target?.linkedSharedExpenseId
            ? state.sharedExpenses.map((se) =>
                se.id === target.linkedSharedExpenseId
                  ? { ...se, linkedTransactionId: null }
                  : se
              )
            : state.sharedExpenses;
          return {
            transactions: state.transactions.filter((tx) => tx.id !== id),
            sharedExpenses: nextShared,
            priceObservations: state.priceObservations.filter((obs) => obs.transactionId !== id),
          };
        }),

      cancelTransaction: (id) =>
        set((state) => ({
          transactions: state.transactions.map((tx) =>
            tx.id === id ? { ...tx, status: 'cancelled' } : tx
          ),
          priceObservations: state.priceObservations.map((obs) =>
            obs.transactionId === id ? { ...obs, status: 'cancelled' } : obs
          ),
        })),

      refundTransaction: (id, refundAmount) =>
        set((state) => ({
          transactions: state.transactions.map((tx) =>
            tx.id === id
              ? {
                  ...tx,
                  status: 'refunded',
                  refundAmount:
                    typeof refundAmount === 'number' && Number.isFinite(refundAmount)
                      ? roundCurrency(Math.min(tx.amount, Math.max(0, refundAmount)))
                      : tx.amount,
                }
              : tx
          ),
          priceObservations: state.priceObservations.map((obs) =>
            obs.transactionId === id ? { ...obs, status: 'refunded' } : obs
          ),
        })),

      updateTransactionClassification: (id, classification) =>
        set((state) => ({
          transactions: state.transactions.map((tx) =>
            tx.id === id
              ? { ...tx, classification, classificationSource: 'user' as const }
              : tx
          ),
        })),

      toggleBrokeMode: () =>
        set((state) => {
          const nextEnabled = !state.isBrokeMode;
          return {
            isBrokeMode: nextEnabled,
            brokeModeConfig: {
              ...state.brokeModeConfig,
              enabled: nextEnabled,
              activatedAt: nextEnabled ? new Date().toISOString() : null,
            },
          };
        }),

      updateBrokeModeConfig: (patch) =>
        set((state) => {
          const nextEnabled =
            patch.enabled !== undefined ? patch.enabled : state.brokeModeConfig.enabled;
          return {
            isBrokeMode: nextEnabled,
            brokeModeConfig: {
              ...state.brokeModeConfig,
              ...patch,
              enabled: nextEnabled,
              activatedAt:
                patch.enabled === true && !state.brokeModeConfig.activatedAt
                  ? new Date().toISOString()
                  : patch.enabled === false
                  ? null
                  : patch.activatedAt !== undefined
                  ? patch.activatedAt
                  : state.brokeModeConfig.activatedAt,
            },
          };
        }),

      upsertCategoryLimit: (input) => {
        const nowIso = new Date().toISOString();
        const cat = input.category.trim();
        const threshold = Math.min(99, Math.max(10, Math.round(input.warningThresholdPct ?? 80)));
        const limitAmount = roundCurrency(Math.max(1, input.limitAmount));
        const enabled = input.enabled ?? true;
        const state = get();
        const existing = input.id
          ? state.categoryLimits.find((l) => l.id === input.id)
          : state.categoryLimits.find(
              (l) =>
                l.category.toLowerCase() === cat.toLowerCase() && l.period === input.period
            );

        const nextLimit: CategorySpendingLimit = existing
          ? {
              ...existing,
              category: cat,
              period: input.period,
              limitAmount,
              warningThresholdPct: threshold,
              enabled,
              updatedAt: nowIso,
            }
          : {
              id: `catlim-${crypto.randomUUID().slice(0, 8)}`,
              category: cat,
              period: input.period,
              limitAmount,
              warningThresholdPct: threshold,
              enabled,
              createdAt: nowIso,
              updatedAt: nowIso,
            };

        const nextLimits = existing
          ? state.categoryLimits.map((l) => (l.id === existing.id ? nextLimit : l))
          : [nextLimit, ...state.categoryLimits];

        const nextCaps = { ...state.categoryCaps };
        if (input.period === 'monthly') {
          nextCaps[cat] = enabled ? limitAmount : null;
        }

        set({ categoryLimits: nextLimits, categoryCaps: nextCaps });
        return nextLimit;
      },

      deleteCategoryLimit: (id) =>
        set((state) => {
          const target = state.categoryLimits.find((l) => l.id === id);
          const nextLimits = state.categoryLimits.filter((l) => l.id !== id);
          const nextCaps = { ...state.categoryCaps };
          if (target && target.period === 'monthly') {
            const hasRemainingMonthly = nextLimits.some(
              (l) =>
                l.enabled &&
                l.period === 'monthly' &&
                l.category.toLowerCase() === target.category.toLowerCase()
            );
            if (!hasRemainingMonthly) {
              nextCaps[target.category] = null;
            }
          }
          return { categoryLimits: nextLimits, categoryCaps: nextCaps };
        }),

      dismissWarRoomAlert: (signature) =>
        set((state) => ({
          dismissedWarRoomAlerts: state.dismissedWarRoomAlerts.includes(signature)
            ? state.dismissedWarRoomAlerts
            : [signature, ...state.dismissedWarRoomAlerts].slice(0, 100),
        })),

      restoreDismissedWarRoomAlerts: () => set({ dismissedWarRoomAlerts: [] }),

      startWarRoomChallenge: (input) => {
        const challenge: FinancialChallenge = {
          id: `chal-${crypto.randomUUID().slice(0, 8)}`,
          templateId: input.templateId,
          title: input.title.trim(),
          description: input.description.trim(),
          targetDays: Math.max(1, Math.min(90, Math.round(input.targetDays))),
          targetCategory: input.targetCategory ?? null,
          maxAllowedSpend:
            typeof input.maxAllowedSpend === 'number' && Number.isFinite(input.maxAllowedSpend)
              ? roundCurrency(Math.max(0, input.maxAllowedSpend))
              : null,
          startedAt: new Date().toISOString(),
          status: 'active',
          completedAt: null,
          isCustom: input.isCustom ?? input.templateId === 'custom',
        };
        set((state) => ({
          warRoomChallenges: [challenge, ...state.warRoomChallenges],
        }));
        return challenge;
      },

      completeWarRoomChallenge: (id) =>
        set((state) => ({
          warRoomChallenges: state.warRoomChallenges.map((c) =>
            c.id === id
              ? { ...c, status: 'completed' as const, completedAt: new Date().toISOString() }
              : c
          ),
        })),

      deleteWarRoomChallenge: (id) =>
        set((state) => ({
          warRoomChallenges: state.warRoomChallenges.filter((c) => c.id !== id),
        })),

      recordDisciplineCheckIn: (dateKey) =>
        set((state) => {
          const key = dateKey || toLocalDateKey(new Date());
          if (state.disciplineCheckIns.includes(key)) return state;
          return {
            disciplineCheckIns: [key, ...state.disciplineCheckIns].slice(0, 90),
          };
        }),

      addFinancialTarget: (input) => {
        const nowIso = new Date().toISOString();
        const target: FinancialTarget = {
          id: `tgt-${crypto.randomUUID().slice(0, 8)}`,
          title: input.title.trim(),
          type: input.type,
          period: input.period,
          targetValue: roundCurrency(Math.max(1, input.targetValue)),
          baselineValue:
            typeof input.baselineValue === 'number' && Number.isFinite(input.baselineValue)
              ? roundCurrency(Math.max(0, input.baselineValue))
              : null,
          transferredSavings: 0,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        set((state) => ({
          warRoomTargets: [target, ...state.warRoomTargets],
        }));
        return target;
      },

      logTargetSavingsTransfer: (id, amount) =>
        set((state) => {
          const addAmt = roundCurrency(Math.max(0, amount));
          if (addAmt <= 0) return state;
          return {
            warRoomTargets: state.warRoomTargets.map((t) =>
              t.id === id
                ? {
                    ...t,
                    transferredSavings: roundCurrency((t.transferredSavings || 0) + addAmt),
                    updatedAt: new Date().toISOString(),
                  }
                : t
            ),
          };
        }),

      deleteFinancialTarget: (id) =>
        set((state) => ({
          warRoomTargets: state.warRoomTargets.filter((t) => t.id !== id),
        })),

      setTransactions: (txs) => set({ transactions: txs }),
      setItems: (items) => set({ items }),

      recordReceiptAsTransaction: (receipt) => {
        const current = get();
        const fingerprint = buildReceiptFingerprint(receipt);
        const alreadyRecorded = current.transactions.some(
          (tx) => tx.receiptFingerprint === fingerprint && tx.status !== 'cancelled'
        );
        if (alreadyRecorded) {
          return {
            ok: false,
            error: 'This receipt has already been recorded in your centralized ledger.',
          };
        }

        const txId = crypto.randomUUID();
        const nowIso = new Date().toISOString();
        const purchaseDate = receipt.date || nowIso;

        const createdObservations: PriceObservation[] = [];
        for (const item of receipt.items) {
          if (!item.name.trim() || item.price <= 0) continue;
          const obs = buildPriceObservation({
            rawName: item.name,
            totalPrice: item.price,
            purchaseDate,
            purchaseSource: 'audit',
            entryKind: 'actual_purchase',
            transactionId: txId,
            receiptRef: {
              merchant: receipt.merchant,
              receiptDate: purchaseDate,
              receiptTotal: roundCurrency(receipt.total),
              fingerprint,
            },
            catalogItems: current.items,
            existingObservations: [...createdObservations, ...current.priceObservations],
          });
          createdObservations.push(obs);
        }

        // Determine dominant category from matched receipt items
        const catTotals = new Map<string, number>();
        for (const obs of createdObservations) {
          catTotals.set(obs.category, (catTotals.get(obs.category) ?? 0) + obs.totalPrice);
        }
        let dominantCategory = 'Groceries';
        let bestAmt = -1;
        for (const [cat, amt] of catTotals.entries()) {
          if (amt > bestAmt) {
            bestAmt = amt;
            dominantCategory = cat;
          }
        }

        const totalAmt = roundCurrency(
          receipt.total > 0
            ? receipt.total
            : receipt.subtotal + receipt.taxTotal + receipt.deliveryFee
        );

        const newTx: Transaction = {
          id: txId,
          name: `${receipt.merchant} Receipt (${receipt.items.length} items)`,
          amount: totalAmt,
          category: dominantCategory,
          timestamp: purchaseDate,
          source: 'audit',
          status: 'active',
          receiptFingerprint: fingerprint,
        };

        const obsResult = appendObservationsAndEvaluateAlerts(current, createdObservations, nowIso);

        set({
          transactions: [newTx, ...current.transactions],
          priceObservations: obsResult.priceObservations,
          priceAlerts: obsResult.priceAlerts,
          triggeredPriceAlerts: obsResult.triggeredPriceAlerts,
        });

        return {
          ok: true,
          transactionId: txId,
          observationsCount: createdObservations.length,
          triggeredAlertsCount: obsResult.triggeredCount,
        };
      },

      recordManualPricePurchase: (input) => {
        const current = get();
        const nowIso = new Date().toISOString();
        const purchaseDate = input.purchaseDate || nowIso;
        const shouldLogTransaction =
          input.entryKind === 'actual_purchase' && input.logExpense !== false;
        const txId = shouldLogTransaction ? crypto.randomUUID() : null;

        const obs = buildPriceObservation({
          rawName: input.productName,
          explicitProductId: input.explicitProductId,
          category: input.category || inferCategoryFromName(input.productName),
          brand: input.brand,
          quantity: input.quantity,
          packageSize: input.packageSize,
          totalPrice: input.totalPrice,
          purchaseDate,
          purchaseSource: 'manual',
          entryKind: input.entryKind,
          transactionId: txId,
          catalogItems: current.items,
          existingObservations: current.priceObservations,
        });

        const obsResult = appendObservationsAndEvaluateAlerts(current, [obs], nowIso);

        const nextTransactions =
          txId && shouldLogTransaction
            ? [
                {
                  id: txId,
                  name: `${obs.productName} (${obs.quantity} x ${obs.packageSize})`,
                  amount: obs.totalPrice,
                  category: obs.category,
                  timestamp: purchaseDate,
                  source: 'manual' as const,
                  status: 'active' as const,
                },
                ...current.transactions,
              ]
            : current.transactions;

        set({
          transactions: nextTransactions,
          priceObservations: obsResult.priceObservations,
          priceAlerts: obsResult.priceAlerts,
          triggeredPriceAlerts: obsResult.triggeredPriceAlerts,
        });

        return {
          observation: obs,
          triggeredAlertsCount: obsResult.triggeredCount,
        };
      },

      deletePriceObservation: (id) =>
        set((state) => ({
          priceObservations: state.priceObservations.filter((o) => o.id !== id),
        })),

      addPriceAlert: (input) => {
        const created: PriceAlert = {
          id: crypto.randomUUID(),
          productId: input.productId,
          productName: input.productName,
          unitOfMeasurement: input.unitOfMeasurement,
          targetUnitPrice:
            typeof input.targetUnitPrice === 'number' && input.targetUnitPrice > 0
              ? roundCurrency(input.targetUnitPrice)
              : null,
          increaseThresholdPct:
            typeof input.increaseThresholdPct === 'number' && input.increaseThresholdPct > 0
              ? input.increaseThresholdPct
              : null,
          enabled: true,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          priceAlerts: [created, ...state.priceAlerts],
        }));
        return created;
      },

      updatePriceAlert: (id, patch) =>
        set((state) => ({
          priceAlerts: state.priceAlerts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        })),

      togglePriceAlert: (id) =>
        set((state) => ({
          priceAlerts: state.priceAlerts.map((a) =>
            a.id === id ? { ...a, enabled: !a.enabled } : a
          ),
        })),

      deletePriceAlert: (id) =>
        set((state) => ({
          priceAlerts: state.priceAlerts.filter((a) => a.id !== id),
        })),

      dismissTriggeredAlert: (id) =>
        set((state) => ({
          triggeredPriceAlerts: state.triggeredPriceAlerts.map((t) =>
            t.id === id ? { ...t, dismissed: true } : t
          ),
        })),

      clearTriggeredAlerts: () => set({ triggeredPriceAlerts: [] }),

      addPerson: (name, contact) => {
        const trimmedName = name.trim();
        const trimmedContact = contact?.trim() || undefined;
        const newPerson: Person = {
          id: crypto.randomUUID(),
          name: trimmedName,
          contact: trimmedContact,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          people: [...state.people, newPerson],
        }));
        return newPerson;
      },

      updatePerson: (id, name, contact) =>
        set((state) => ({
          people: state.people.map((p) =>
            p.id === id
              ? {
                  ...p,
                  name: name.trim() || p.name,
                  contact: contact?.trim() || undefined,
                }
              : p
          ),
        })),

      removePerson: (id) => {
        const state = get();
        const isReferencedInExpense = state.sharedExpenses.some(
          (exp) =>
            exp.paidById === id ||
            exp.participants.some((part) => part.personId === id)
        );
        const isReferencedInSettlement = state.settlements.some(
          (st) => st.fromPersonId === id || st.toPersonId === id
        );
        if (isReferencedInExpense || isReferencedInSettlement) {
          return false;
        }
        set((s) => ({
          people: s.people.filter((p) => p.id !== id),
        }));
        return true;
      },

      addSharedExpense: (input) => {
        const sharedId = crypto.randomUUID();
        const nowIso = new Date().toISOString();
        const userShare = getUserShareFromParticipants(input.participants);
        const txId = userShare > 0 ? crypto.randomUUID() : null;

        const newExpense: SharedExpense = {
          id: sharedId,
          name: input.name.trim(),
          totalAmount: roundCurrency(input.totalAmount),
          category: input.category,
          date: input.date || nowIso,
          paidById: input.paidById,
          splitMethod: input.splitMethod,
          participants: input.participants,
          source: input.source ?? 'ledger',
          linkedTransactionId: txId,
          createdAt: nowIso,
        };

        set((state) => ({
          sharedExpenses: [newExpense, ...state.sharedExpenses],
          transactions:
            txId && userShare > 0
              ? [
                  {
                    id: txId,
                    name: formatSharedTxName(input.name.trim(), input.totalAmount),
                    amount: userShare,
                    category: input.category,
                    timestamp: input.date || nowIso,
                    linkedSharedExpenseId: sharedId,
                  },
                  ...state.transactions,
                ]
              : state.transactions,
        }));

        return newExpense;
      },

      updateSharedExpense: (id, input) =>
        set((state) => {
          const existing = state.sharedExpenses.find((e) => e.id === id);
          if (!existing) return state;

          const userShare = getUserShareFromParticipants(input.participants);
          const nowIso = new Date().toISOString();
          let nextLinkedTxId = existing.linkedTransactionId ?? null;
          let nextTransactions = [...state.transactions];

          if (nextLinkedTxId) {
            if (userShare > 0) {
              const txExists = nextTransactions.some((t) => t.id === nextLinkedTxId);
              if (txExists) {
                nextTransactions = nextTransactions.map((t) =>
                  t.id === nextLinkedTxId
                    ? {
                        ...t,
                        name: formatSharedTxName(input.name.trim(), input.totalAmount),
                        amount: userShare,
                        category: input.category,
                        timestamp: input.date || t.timestamp,
                      }
                    : t
                );
              } else {
                nextLinkedTxId = crypto.randomUUID();
                nextTransactions = [
                  {
                    id: nextLinkedTxId,
                    name: formatSharedTxName(input.name.trim(), input.totalAmount),
                    amount: userShare,
                    category: input.category,
                    timestamp: input.date || nowIso,
                    linkedSharedExpenseId: id,
                  },
                  ...nextTransactions,
                ];
              }
            } else {
              nextTransactions = nextTransactions.filter(
                (t) => t.id !== nextLinkedTxId
              );
              nextLinkedTxId = null;
            }
          } else if (userShare > 0) {
            nextLinkedTxId = crypto.randomUUID();
            nextTransactions = [
              {
                id: nextLinkedTxId,
                name: formatSharedTxName(input.name.trim(), input.totalAmount),
                amount: userShare,
                category: input.category,
                timestamp: input.date || nowIso,
                linkedSharedExpenseId: id,
              },
              ...nextTransactions,
            ];
          }

          return {
            sharedExpenses: state.sharedExpenses.map((e) =>
              e.id === id
                ? {
                    ...e,
                    name: input.name.trim(),
                    totalAmount: roundCurrency(input.totalAmount),
                    category: input.category,
                    date: input.date || e.date,
                    paidById: input.paidById,
                    splitMethod: input.splitMethod,
                    participants: input.participants,
                    linkedTransactionId: nextLinkedTxId,
                    updatedAt: nowIso,
                  }
                : e
            ),
            transactions: nextTransactions,
          };
        }),

      removeSharedExpense: (id) =>
        set((state) => {
          const target = state.sharedExpenses.find((e) => e.id === id);
          return {
            sharedExpenses: state.sharedExpenses.filter((e) => e.id !== id),
            transactions: target?.linkedTransactionId
              ? state.transactions.filter((t) => t.id !== target.linkedTransactionId)
              : state.transactions,
            settlements: state.settlements.filter((s) => s.expenseId !== id),
          };
        }),

      convertTransactionToSplit: (transactionId, input) =>
        set((state) => {
          const existingTx = state.transactions.find((t) => t.id === transactionId);
          if (!existingTx) return state;

          const sharedId = crypto.randomUUID();
          const nowIso = new Date().toISOString();
          const userShare = getUserShareFromParticipants(input.participants);

          const newExpense: SharedExpense = {
            id: sharedId,
            name: input.name.trim(),
            totalAmount: roundCurrency(input.totalAmount),
            category: input.category,
            date: input.date || existingTx.timestamp,
            paidById: input.paidById,
            splitMethod: input.splitMethod,
            participants: input.participants,
            source: 'manual',
            linkedTransactionId: userShare > 0 ? transactionId : null,
            createdAt: nowIso,
          };

          const nextTransactions =
            userShare > 0
              ? state.transactions.map((t) =>
                  t.id === transactionId
                    ? {
                        ...t,
                        name: formatSharedTxName(input.name.trim(), input.totalAmount),
                        amount: userShare,
                        category: input.category,
                        timestamp: input.date || t.timestamp,
                        splitWith: null,
                        linkedSharedExpenseId: sharedId,
                      }
                    : t
                )
              : state.transactions.filter((t) => t.id !== transactionId);

          return {
            sharedExpenses: [newExpense, ...state.sharedExpenses],
            transactions: nextTransactions,
          };
        }),

      recordSettlement: (input) => {
        const state = get();
        const amount = roundCurrency(input.amount);
        if (amount <= 0) {
          return { ok: false, error: 'Repayment amount must be greater than ₹0.' };
        }
        if (input.fromPersonId === input.toPersonId) {
          return { ok: false, error: 'Payer and recipient must be different people.' };
        }
        if (isDuplicateSettlement(state.settlements, { ...input, amount })) {
          return {
            ok: false,
            error: 'Duplicate repayment detected. This payment was just recorded.',
          };
        }

        const nowIso = new Date().toISOString();
        const settlement: Settlement = {
          id: crypto.randomUUID(),
          fromPersonId: input.fromPersonId,
          toPersonId: input.toPersonId,
          amount,
          date: input.date || nowIso,
          note: input.note?.trim() || undefined,
          expenseId: input.expenseId,
          createdAt: nowIso,
        };

        set((s) => ({
          settlements: [settlement, ...s.settlements],
        }));

        return { ok: true, settlement };
      },

      removeSettlement: (id) =>
        set((state) => ({
          settlements: state.settlements.filter((s) => s.id !== id),
        })),

      setSessionBudget: (amount) => set({ sessionBudget: amount }),
      setTotalBudget: (amount) => set({ totalBudget: amount }),
      setCategoryCap: (category, amount) =>
        set((state) => {
          const nextCaps = { ...state.categoryCaps, [category]: amount };
          const existingMonthly = state.categoryLimits.find(
            (l) =>
              l.period === 'monthly' &&
              l.category.toLowerCase() === category.toLowerCase()
          );
          let nextLimits = state.categoryLimits;
          const nowIso = new Date().toISOString();
          if (typeof amount === 'number' && amount > 0) {
            if (existingMonthly) {
              nextLimits = state.categoryLimits.map((l) =>
                l.id === existingMonthly.id
                  ? { ...l, limitAmount: roundCurrency(amount), enabled: true, updatedAt: nowIso }
                  : l
              );
            } else {
              nextLimits = [
                {
                  id: `catlim-${crypto.randomUUID().slice(0, 8)}`,
                  category,
                  period: 'monthly',
                  limitAmount: roundCurrency(amount),
                  warningThresholdPct: 80,
                  enabled: true,
                  createdAt: nowIso,
                  updatedAt: nowIso,
                },
                ...state.categoryLimits,
              ];
            }
          } else if (existingMonthly) {
            nextLimits = state.categoryLimits.map((l) =>
              l.id === existingMonthly.id ? { ...l, enabled: false, updatedAt: nowIso } : l
            );
          }
          return {
            categoryCaps: nextCaps,
            categoryLimits: nextLimits,
          };
        }),
      setFeeFlags: (flags) => set({ feeFlags: flags }),
      addParsedReceipt: (receipt) =>
        set((state) => ({ parsedReceipts: [receipt, ...state.parsedReceipts].slice(0, 10) })),
      clearParsedReceipts: () => set({ parsedReceipts: [] }),

      addSavedAudit: (audit) =>
        set((state) => ({
          savedAudits: [
            { ...audit, id: crypto.randomUUID(), timestamp: new Date().toISOString() },
            ...state.savedAudits,
          ].slice(0, 50),
        })),
      removeSavedAudit: (id) =>
        set((state) => ({
          savedAudits: state.savedAudits.filter((a) => a.id !== id),
        })),
      clearSavedAudits: () => set({ savedAudits: [] }),

      importBackupData: (data) =>
        set(() => {
          const mergedItems = migratePersistedMartItems(
            mergeBackupItems(data.customItems, INITIAL_MART_ITEMS)
          );
          const mergedConfigs = migrateCategoryConfigs(
            data.categoryConfigs,
            mergeCategories(data.categories, mergedItems, data.transactions),
            mergedItems,
            data.transactions
          );
          const mergedHistory = ensureCatalogPriceHistory(mergedItems, data.priceHistory ?? {});
          const sessions = data.purchaseHistory ?? [];
          const restoredObs =
            Array.isArray(data.priceObservations) && data.priceObservations.length > 0
              ? data.priceObservations
              : migratePurchaseSessionsToObservations(sessions, mergedItems);

          const restoredBrokeConfig: BrokeModeConfig = {
            ...DEFAULT_BROKE_MODE_CONFIG,
            ...(data.brokeModeConfig ?? {}),
            enabled:
              typeof data.isBrokeMode === 'boolean'
                ? data.isBrokeMode
                : data.brokeModeConfig?.enabled ?? false,
          };

          return {
            transactions: data.transactions,
            items: mergedItems,
            categoryConfigs: mergedConfigs,
            categories: mergedConfigs.map((c) => c.name),
            priceHistory: mergedHistory,
            purchaseHistory: sessions,
            priceObservations: restoredObs,
            priceAlerts: Array.isArray(data.priceAlerts) ? data.priceAlerts : [],
            triggeredPriceAlerts: [],
            totalBudget: data.totalBudget,
            sessionBudget: data.sessionBudget,
            categoryCaps: data.categoryCaps,
            savedAudits: data.savedAudits,
            people: data.people ?? [],
            sharedExpenses: data.sharedExpenses ?? [],
            settlements: data.settlements ?? [],
            isBrokeMode: restoredBrokeConfig.enabled,
            brokeModeConfig: restoredBrokeConfig,
            categoryLimits: Array.isArray(data.categoryLimits) ? data.categoryLimits : [],
            warRoomChallenges: Array.isArray(data.warRoomChallenges) ? data.warRoomChallenges : [],
            warRoomTargets: Array.isArray(data.warRoomTargets) ? data.warRoomTargets : [],
            dismissedWarRoomAlerts: Array.isArray(data.dismissedWarRoomAlerts)
              ? data.dismissedWarRoomAlerts
              : [],
            disciplineCheckIns: Array.isArray(data.disciplineCheckIns)
              ? data.disciplineCheckIns
              : [],
          };
        }),
    }),
    {
      name: 'cartaudit-store',
      partialize: (state) => ({
        totalBudget: state.totalBudget,
        sessionBudget: state.sessionBudget,
        isBrokeMode: state.isBrokeMode,
        brokeModeConfig: state.brokeModeConfig,
        categoryLimits: state.categoryLimits,
        warRoomChallenges: state.warRoomChallenges,
        warRoomTargets: state.warRoomTargets,
        dismissedWarRoomAlerts: state.dismissedWarRoomAlerts,
        disciplineCheckIns: state.disciplineCheckIns,
        categories: state.categories,
        categoryConfigs: state.categoryConfigs,
        categoryCaps: state.categoryCaps,
        transactions: state.transactions,
        savedAudits: state.savedAudits,
        items: state.items,
        priceHistory: state.priceHistory,
        purchaseHistory: state.purchaseHistory,
        priceObservations: state.priceObservations,
        priceAlerts: state.priceAlerts,
        triggeredPriceAlerts: state.triggeredPriceAlerts,
        people: state.people,
        sharedExpenses: state.sharedExpenses,
        settlements: state.settlements,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const migratedItems = migratePersistedMartItems(state.items);
          const migratedConfigs = migrateCategoryConfigs(
            state.categoryConfigs,
            state.categories,
            migratedItems,
            state.transactions
          );
          const patchedHistory = ensureCatalogPriceHistory(migratedItems, state.priceHistory);
          const sessions = Array.isArray(state.purchaseHistory) ? state.purchaseHistory : [];
          const existingObs = Array.isArray(state.priceObservations)
            ? state.priceObservations
            : [];
          const migratedObs =
            existingObs.length > 0
              ? existingObs
              : migratePurchaseSessionsToObservations(sessions, migratedItems);

          const mergedBrokeConfig: BrokeModeConfig = {
            ...DEFAULT_BROKE_MODE_CONFIG,
            ...(state.brokeModeConfig ?? {}),
            enabled: Boolean(state.isBrokeMode || state.brokeModeConfig?.enabled),
          };

          const existingLimits = Array.isArray(state.categoryLimits) ? state.categoryLimits : [];
          const seededLimits: CategorySpendingLimit[] = [...existingLimits];
          for (const [cat, cap] of Object.entries(state.categoryCaps ?? {})) {
            if (typeof cap === 'number' && cap > 0) {
              const hasMonthly = seededLimits.some(
                (l) => l.period === 'monthly' && l.category.toLowerCase() === cat.toLowerCase()
              );
              if (!hasMonthly) {
                seededLimits.push({
                  id: `catlim-seed-${cat.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
                  category: cat,
                  period: 'monthly',
                  limitAmount: roundCurrency(cap),
                  warningThresholdPct: 80,
                  enabled: true,
                  createdAt: new Date().toISOString(),
                });
              }
            }
          }

          useAppStore.setState({
            items: migratedItems,
            categoryConfigs: migratedConfigs,
            categories: migratedConfigs.map((c) => c.name),
            priceHistory: patchedHistory,
            purchaseHistory: sessions,
            priceObservations: migratedObs,
            priceAlerts: Array.isArray(state.priceAlerts) ? state.priceAlerts : [],
            triggeredPriceAlerts: Array.isArray(state.triggeredPriceAlerts)
              ? state.triggeredPriceAlerts
              : [],
            isBrokeMode: mergedBrokeConfig.enabled,
            brokeModeConfig: mergedBrokeConfig,
            categoryLimits: seededLimits,
            warRoomChallenges: Array.isArray(state.warRoomChallenges) ? state.warRoomChallenges : [],
            warRoomTargets: Array.isArray(state.warRoomTargets) ? state.warRoomTargets : [],
            dismissedWarRoomAlerts: Array.isArray(state.dismissedWarRoomAlerts)
              ? state.dismissedWarRoomAlerts
              : [],
            disciplineCheckIns: Array.isArray(state.disciplineCheckIns)
              ? state.disciplineCheckIns
              : [],
          });
        }
      },
    }
  )
);
