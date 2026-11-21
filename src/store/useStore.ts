import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  SELF_PERSON_ID,
  type BackupData,
  type BasketTemplate,
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
  type PennyChatMessage,
  type PennyInteractionProfile,
  type PennyTonePreference,
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
  type FeatureSettings,
  type SettingsPreset,
  type ThemeMode,
  type Transaction,
  type TransactionStatus,
  type TriggeredPriceAlert,
  type WarRoomPeriod,
} from '../types/models';
import {
  DEFAULT_FEATURE_SETTINGS,
  getPresetSettings,
  mergeFeatureSettings,
  sanitizeFeatureSettings,
  sanitizeThemeMode,
} from '../utils/settingsEngine';
import {
  DEFAULT_PENNY_PROFILE,
  describePennyStyle,
  evolvePennyProfile,
  sanitizePennyMessages,
  sanitizePennyProfile,
} from '../utils/pennyEngine';
import {
  clampQuantity,
  mergeBackupItems,
  mergeCategories,
} from '../utils/storeHelpers';
import {
  INITIAL_BASKET_TEMPLATES,
  INITIAL_CATEGORY_CONFIGS,
  INITIAL_MART_CATEGORIES,
  INITIAL_MART_CATEGORY_CAPS,
  INITIAL_MART_ITEMS,
  ensureCatalogPriceHistory,
  migrateCategoryConfigs,
  migratePersistedMartItems,
} from '../data/martCatalog';
import {
  applyAutoRecurrenceToItems,
  applyBasketTemplateToItems,
  buildBasketItemsFromCart,
  buildBasketItemsFromSession,
  buildCheckoutBreakdown,
  buildCheckoutSignature,
  buildReceiptPurchaseSession,
  computeBasketSavedTotal,
  evaluateBasketTemplate,
  getActiveVariant,
  getDueRecurringItems,
  getNextDueDateString,
  getPriceHistoryKey,
  isDuplicateCheckoutAttempt,
  reorderCategoryList,
  roundQuantity,
  toLocalDateKey,
  type ReceiptSessionItemInput,
} from '../utils/martEngine';
import { isDuplicateSettlement, roundCurrency } from '../utils/splitLedgerEngine';
import { DEFAULT_BROKE_MODE_CONFIG } from '../utils/warRoomEngine';

import {
  buildPriceObservation,
  buildProductPriceSummaries,
  buildReceiptFingerprint,
  evaluatePriceAlerts,
  extractProductInfo,
  inferCategoryFromName,
  resolveCanonicalProduct,
} from '../utils/priceTrackerEngine';
import {
  buildEmptyWorkspacePatch,
  buildSampleMonthDataset,
} from '../utils/demoDataEngine';

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
  subcategories?: string[];
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
  budgetResetDay: number;
  budgetRolloverEnabled: boolean;
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
  basketTemplates: BasketTemplate[];
  basketTemplatesSeeded: boolean;
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

  theme: ThemeMode;
  featureSettings: FeatureSettings;

  pennyMessages: PennyChatMessage[];
  pennyProfile: PennyInteractionProfile;
  isPennyOpen: boolean;
  isSampleDataLoaded: boolean;

  myUpiId: string;
  myUpiName: string;
  setMyUpiProfile: (upiId: string, name?: string) => void;

  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  applyFeaturePreset: (preset: Exclude<SettingsPreset, 'custom'>) => void;
  updateFeatureSettings: (patch: Partial<FeatureSettings>) => void;
  resetFeatureSettings: () => void;

  setPennyOpen: (open: boolean) => void;
  togglePennyOpen: () => void;
  appendPennyMessage: (msg: PennyChatMessage) => void;
  recordUserInteractionForPenny: (userText: string) => PennyInteractionProfile;
  setPennyProposalStatus: (
    messageId: string,
    proposalId: string,
    status: 'applied' | 'dismissed',
    appliedMessage?: string
  ) => void;
  setPennyTonePreference: (tone: PennyTonePreference) => void;
  clearPennyMessages: () => void;
  pruneOfflinePennyMessages: () => void;
  resetPennyProfile: () => void;

  addCategory: (categoryName: string) => void;
  addCategoryConfig: (input: CategoryInput) => CategoryConfig | null;
  renameCategoryConfig: (id: string, newName: string) => void;
  updateCategoryAppearance: (
    id: string,
    patch: { iconKey?: string; accent?: string; imageUrl?: string; subcategories?: string[] }
  ) => void;
  deleteCategoryConfig: (id: string, reassignToCategory?: string) => boolean;
  reorderCategories: (fromIndex: number, toIndex: number) => void;

  addCustomItem: (item: Omit<CartItem, 'quantity'>) => void;
  updateProduct: (id: string, patch: Partial<Omit<CartItem, 'id'>>) => void;
  removeCustomItem: (id: string) => void;
  removeProduct: (id: string) => void;
  updateItemPrice: (id: string, newPrice: number, variantId?: string) => void;
  selectProductVariant: (id: string, variantId: string) => void;
  toggleFavourite: (id: string) => void;
  setProductRecurrence: (id: string, recurrence: RecurrenceConfig | null) => void;
  addDueRecurringToCart: () => number;

  addToCart: (item: Omit<CartItem, 'quantity'> | CartItem, amount?: number, variantId?: string) => void;
  removeFromCart: (id: string, variantId?: string) => void;
  updateQuantity: (id: string, delta: number, variantId?: string) => void;
  setItemQuantity: (id: string, quantity: number, variantId?: string) => void;
  checkoutCart: (splitConfig?: Omit<SharedExpenseInput, 'source'>) => boolean;
  clearCart: () => void;
  repeatPurchaseSession: (sessionId: string) => number;
  quickReorderItem: (itemId: string, variantId?: string, quantity?: number) => boolean;

  saveCartAsBasket: (name: string, description?: string) => BasketTemplate | null;
  saveSessionAsBasket: (sessionId: string, name?: string) => BasketTemplate | null;
  loadBasketTemplateToCart: (basketId: string, mode?: 'merge' | 'replace') => number;
  updateBasketFromCart: (basketId: string) => boolean;
  refreshBasketBaselinePrices: (basketId: string) => boolean;
  renameBasketTemplate: (basketId: string, name: string, description?: string) => void;
  removeBasketTemplateItem: (basketId: string, itemId: string, variantId?: string) => void;
  deleteBasketTemplate: (basketId: string) => void;

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

  recordReceiptAsTransaction: (
    receipt: ParsedReceipt,
    options?: { saveNewItemsToCatalog?: boolean }
  ) => {
    ok: boolean;
    error?: string;
    transactionId?: string;
    observationsCount?: number;
    triggeredAlertsCount?: number;
    createdCustomItemsCount?: number;
    autoRecurringAddedCount?: number;
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

  addPerson: (name: string, contact?: string, upiId?: string) => Person;
  updatePerson: (id: string, name: string, contact?: string, upiId?: string) => void;
  removePerson: (id: string) => boolean;

  addSharedExpense: (input: SharedExpenseInput) => SharedExpense;
  updateSharedExpense: (id: string, input: SharedExpenseInput) => void;
  removeSharedExpense: (id: string) => void;
  convertTransactionToSplit: (transactionId: string, input: SharedExpenseInput) => void;

  recordSettlement: (input: SettlementInput) => { ok: boolean; error?: string; settlement?: Settlement };
  removeSettlement: (id: string) => void;

  setSessionBudget: (amount: number | null) => void;
  setTotalBudget: (amount: number) => void;
  setBudgetResetDay: (day: number) => void;
  setBudgetRolloverEnabled: (enabled: boolean) => void;
  setCategoryCap: (category: string, amount: number | null) => void;
  setFeeFlags: (flags: FeeFlag[]) => void;
  addParsedReceipt: (receipt: ParsedReceipt) => void;
  updateParsedReceipt: (index: number, receipt: ParsedReceipt) => void;
  clearParsedReceipts: () => void;

  addSavedAudit: (audit: Omit<SavedAudit, 'id' | 'timestamp'>) => void;
  removeSavedAudit: (id: string) => void;
  clearSavedAudits: () => void;
  importBackupData: (data: BackupData) => void;
  loadSampleMonth: () => void;
  clearWorkspaceData: () => void;
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
      budgetResetDay: 1,
      budgetRolloverEnabled: false,
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
      basketTemplates: INITIAL_BASKET_TEMPLATES,
      basketTemplatesSeeded: true,
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

      theme: 'light',
      featureSettings: { ...DEFAULT_FEATURE_SETTINGS },

      pennyMessages: [],
      pennyProfile: { ...DEFAULT_PENNY_PROFILE },
      isPennyOpen: false,
      isSampleDataLoaded: false,

      myUpiId: '',
      myUpiName: '',
      setMyUpiProfile: (upiId, name) =>
        set((state) => ({
          myUpiId: upiId.trim().toLowerCase(),
          myUpiName: name !== undefined ? name.trim() : state.myUpiName,
        })),

      setTheme: (theme) => set({ theme: sanitizeThemeMode(theme) }),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      applyFeaturePreset: (preset) =>
        set((state) => {
          const next = getPresetSettings(preset);
          return {
            featureSettings: next,
            isPennyOpen: next.showPennyCompanion ? state.isPennyOpen : false,
          };
        }),
      updateFeatureSettings: (patch) =>
        set((state) => {
          const next = mergeFeatureSettings(state.featureSettings, patch);
          return {
            featureSettings: next,
            isPennyOpen: next.showPennyCompanion ? state.isPennyOpen : false,
          };
        }),
      resetFeatureSettings: () =>
        set({ featureSettings: { ...DEFAULT_FEATURE_SETTINGS } }),

      setPennyOpen: (open) => set({ isPennyOpen: open }),
      togglePennyOpen: () => set((state) => ({ isPennyOpen: !state.isPennyOpen })),
      appendPennyMessage: (msg) =>
        set((state) => ({
          pennyMessages: [...state.pennyMessages, msg].slice(-50),
        })),
      recordUserInteractionForPenny: (userText) => {
        const current = get();
        const nextProfile = evolvePennyProfile(current.pennyProfile, userText, {
          isBrokeMode: current.isBrokeMode,
        });
        set({ pennyProfile: nextProfile });
        return nextProfile;
      },
      setPennyProposalStatus: (messageId, proposalId, status, appliedMessage) =>
        set((state) => ({
          pennyMessages: state.pennyMessages.map((m) =>
            m.id !== messageId || !m.proposedActions
              ? m
              : {
                  ...m,
                  proposedActions: m.proposedActions.map((act) =>
                    act.id === proposalId
                      ? { ...act, status, appliedMessage: appliedMessage ?? act.appliedMessage }
                      : act
                  ),
                }
          ),
        })),
      setPennyTonePreference: (tone) =>
        set((state) => {
          const next: PennyInteractionProfile = {
            ...state.pennyProfile,
            tonePreference: tone,
            resolvedSummary: '',
          };
          next.resolvedSummary = describePennyStyle(next, state.isBrokeMode);
          return { pennyProfile: next };
        }),
      clearPennyMessages: () => set({ pennyMessages: [] }),
      pruneOfflinePennyMessages: () =>
        set((state) => {
          const filtered = state.pennyMessages.filter(
            (m) =>
              !(
                m.role === 'assistant' &&
                (m.id.startsWith('a-offline-') ||
                  m.text.startsWith("Live Gemini reasoning isn't enabled yet") ||
                  m.text.startsWith('Gemini AI is on standby'))
              )
          );
          if (filtered.length === state.pennyMessages.length) return state;
          return { pennyMessages: filtered };
        }),
      resetPennyProfile: () =>
        set((state) => ({
          pennyProfile: {
            ...DEFAULT_PENNY_PROFILE,
            resolvedSummary: describePennyStyle(DEFAULT_PENNY_PROFILE, state.isBrokeMode),
          },
        })),

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

        const cleanSubs = Array.from(
          new Set((input.subcategories ?? []).map((s) => s.trim()).filter(Boolean))
        );

        const created: CategoryConfig = {
          id: `cat-custom-${crypto.randomUUID().slice(0, 8)}`,
          name: trimmed,
          iconKey: input.iconKey || 'package',
          accent: input.accent || 'teal',
          imageUrl: input.imageUrl?.trim() || undefined,
          subcategories: cleanSubs.length > 0 ? cleanSubs : undefined,
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
                  subcategories:
                    patch.subcategories !== undefined
                      ? Array.from(
                          new Set(patch.subcategories.map((s) => s.trim()).filter(Boolean))
                        )
                      : c.subcategories,
                }
              : c
          ),
        })),

      deleteCategoryConfig: (id, reassignToCategory) => {
        const state = get();
        const target = state.categoryConfigs.find((c) => c.id === id);
        if (!target || !target.isCustom) return false;

        const fallbackCategory =
          (reassignToCategory &&
            state.categoryConfigs.find(
              (c) => c.id !== id && c.name === reassignToCategory
            )?.name) ??
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
            item.category === target.name
              ? { ...item, category: fallbackCategory, subcategory: undefined }
              : item
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
          const primaryVariant = item.variants?.[0];
          const created: CartItem = {
            ...item,
            quantity: 0,
            unit: primaryVariant?.unit || item.unit?.trim() || '1 unit',
            price: primaryVariant?.price ?? item.price,
            selectedVariantId: item.selectedVariantId ?? primaryVariant?.id,
            createdAt: item.createdAt ?? nowIso,
            isCustom: item.isCustom ?? true,
          };
          const nextItems = [created, ...state.items];
          const subClean = created.subcategory?.trim();

          const hasCat = state.categoryConfigs.some(
            (c) => c.name.toLowerCase() === item.category.toLowerCase()
          );
          const nextConfigs = hasCat
            ? state.categoryConfigs.map((c) => {
                if (
                  c.name.toLowerCase() === item.category.toLowerCase() &&
                  subClean &&
                  !(c.subcategories ?? []).some((s) => s.toLowerCase() === subClean.toLowerCase())
                ) {
                  return { ...c, subcategories: [...(c.subcategories ?? []), subClean] };
                }
                return c;
              })
            : [
                ...state.categoryConfigs,
                {
                  id: `cat-custom-${crypto.randomUUID().slice(0, 8)}`,
                  name: item.category,
                  iconKey: 'package',
                  accent: 'teal',
                  subcategories: subClean ? [subClean] : undefined,
                  isCustom: true,
                  order: state.categoryConfigs.length,
                },
              ];

          const nextHistory: PriceHistory = {
            ...state.priceHistory,
            [created.id]: [
              {
                date: nowIso,
                price: created.price,
                unit: created.unit,
                source: 'user_purchase',
                productName: created.name,
                variantId: primaryVariant?.id,
                variantLabel: primaryVariant?.label,
                brand: created.brand,
              },
            ],
          };

          if (created.variants && created.variants.length > 0) {
            for (const variant of created.variants) {
              const key = getPriceHistoryKey(created.id, variant.id);
              nextHistory[key] = [
                {
                  date: nowIso,
                  price: variant.price,
                  unit: variant.unit,
                  source: 'user_purchase',
                  productName: created.name,
                  variantId: variant.id,
                  variantLabel: variant.label,
                  brand: created.brand,
                },
              ];
            }
          }

          return {
            items: nextItems,
            categoryConfigs: nextConfigs,
            categories: nextConfigs.map((c) => c.name),
            priceHistory: nextHistory,
          };
        }),

      updateProduct: (id, patch) =>
        set((state) => {
          const existing = state.items.find((i) => i.id === id);
          if (!existing) return state;

          const nowIso = new Date().toISOString();
          const nextVariants = patch.variants !== undefined ? patch.variants : existing.variants;
          const activeVariant =
            nextVariants && nextVariants.length > 0
              ? nextVariants.find(
                  (v) => v.id === (patch.selectedVariantId ?? existing.selectedVariantId)
                ) ?? nextVariants[0]
              : null;

          const nextPrice =
            activeVariant
              ? activeVariant.price
              : typeof patch.price === 'number' && patch.price > 0
              ? patch.price
              : existing.price;
          const nextUnit =
            activeVariant
              ? activeVariant.unit
              : patch.unit !== undefined
              ? patch.unit.trim() || '1 unit'
              : existing.unit;
          const nextName =
            patch.name !== undefined ? patch.name.trim() || existing.name : existing.name;
          const nextBrand = patch.brand !== undefined ? patch.brand.trim() || undefined : existing.brand;
          const priceChanged = Math.abs(nextPrice - existing.price) > 0.001;

          const nextHistory: PriceHistory = { ...state.priceHistory };
          if (priceChanged) {
            nextHistory[id] = [
              ...(nextHistory[id] ?? []),
              {
                date: nowIso,
                price: nextPrice,
                unit: nextUnit,
                source: 'user_purchase',
                productName: nextName,
                variantId: activeVariant?.id,
                variantLabel: activeVariant?.label,
                brand: nextBrand,
              },
            ];
          }
          if (nextVariants && nextVariants.length > 0) {
            for (const variant of nextVariants) {
              const key = getPriceHistoryKey(id, variant.id);
              const prevList = nextHistory[key] ?? [];
              const lastPt = prevList[prevList.length - 1];
              if (!lastPt || Math.abs(lastPt.price - variant.price) > 0.001) {
                nextHistory[key] = [
                  ...prevList,
                  {
                    date: nowIso,
                    price: variant.price,
                    unit: variant.unit,
                    source: 'user_purchase',
                    productName: nextName,
                    variantId: variant.id,
                    variantLabel: variant.label,
                    brand: nextBrand,
                  },
                ];
              }
            }
          }

          const nextSubclean = patch.subcategory?.trim();
          const nextCategory = patch.category ?? existing.category;
          const nextConfigs =
            nextSubclean
              ? state.categoryConfigs.map((c) => {
                  if (
                    c.name.toLowerCase() === nextCategory.toLowerCase() &&
                    !(c.subcategories ?? []).some(
                      (s) => s.toLowerCase() === nextSubclean.toLowerCase()
                    )
                  ) {
                    return { ...c, subcategories: [...(c.subcategories ?? []), nextSubclean] };
                  }
                  return c;
                })
              : state.categoryConfigs;

          return {
            items: state.items.map((item) =>
              item.id === id
                ? {
                    ...item,
                    ...patch,
                    name: nextName,
                    brand: nextBrand,
                    price: nextPrice,
                    unit: nextUnit,
                    variants: nextVariants,
                    selectedVariantId: activeVariant?.id ?? patch.selectedVariantId,
                  }
                : item
            ),
            categoryConfigs: nextConfigs,
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
          for (const key of Object.keys(nextHistory)) {
            if (key.startsWith(`${id}::`)) delete nextHistory[key];
          }
          return {
            items: state.items.filter((i) => i.id !== id),
            priceHistory: nextHistory,
          };
        }),

      selectProductVariant: (id, variantId) =>
        set((state) => ({
          items: state.items.map((item) => {
            if (item.id !== id || !item.variants?.length) return item;
            const found = item.variants.find((v) => v.id === variantId);
            if (!found) return item;
            return {
              ...item,
              selectedVariantId: found.id,
              price: found.price,
              unit: found.unit,
            };
          }),
        })),

      updateItemPrice: (id, newPrice, variantId) =>
        set((state) => {
          if (!Number.isFinite(newPrice) || newPrice <= 0) return state;
          const target = state.items.find((i) => i.id === id);
          if (!target) return state;

          const activeVariant = getActiveVariant(target, variantId);
          const nowIso = new Date().toISOString();
          const nextHistory: PriceHistory = { ...state.priceHistory };

          if (activeVariant) {
            const scopedKey = getPriceHistoryKey(id, activeVariant.id);
            nextHistory[scopedKey] = [
              ...(nextHistory[scopedKey] ?? []),
              {
                date: nowIso,
                price: newPrice,
                unit: activeVariant.unit,
                source: 'user_purchase',
                productName: target.name,
                variantId: activeVariant.id,
                variantLabel: activeVariant.label,
                brand: target.brand,
              },
            ];
            if (target.variants?.[0]?.id === activeVariant.id) {
              nextHistory[id] = [
                ...(nextHistory[id] ?? []),
                {
                  date: nowIso,
                  price: newPrice,
                  unit: activeVariant.unit,
                  source: 'user_purchase',
                  productName: target.name,
                  variantId: activeVariant.id,
                  variantLabel: activeVariant.label,
                  brand: target.brand,
                },
              ];
            }
          } else {
            nextHistory[id] = [
              ...(nextHistory[id] ?? []),
              {
                date: nowIso,
                price: newPrice,
                unit: target.unit ?? '1 unit',
                source: 'user_purchase',
                productName: target.name,
                brand: target.brand,
              },
            ];
          }

          return {
            items: state.items.map((item) => {
              if (item.id !== id) return item;
              if (activeVariant && item.variants) {
                const updatedVariants = item.variants.map((v) =>
                  v.id === activeVariant.id ? { ...v, price: newPrice } : v
                );
                const isSelected =
                  (item.selectedVariantId ?? item.variants[0]?.id) === activeVariant.id;
                return {
                  ...item,
                  variants: updatedVariants,
                  price: isSelected ? newPrice : item.price,
                };
              }
              return { ...item, price: newPrice };
            }),
            priceHistory: nextHistory,
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
          items: state.items.map((i) => {
            if (i.id !== id) return i;
            if (!recurrence) {
              return {
                ...i,
                recurrence: null,
                autoRecurrenceDismissed: true,
              };
            }
            return {
              ...i,
              recurrence: {
                ...recurrence,
                source: recurrence.source ?? 'manual',
              },
              autoRecurrenceDismissed: false,
            };
          }),
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
            const active = getActiveVariant(item);
            if (active && item.variants?.length) {
              const prevMap = item.variantQuantities ?? {};
              const curVarQty = prevMap[active.id] ?? 0;
              const nextMap = { ...prevMap, [active.id]: Math.max(curVarQty, 1) };
              const total = roundQuantity(
                Object.values(nextMap).reduce((s, q) => s + q, 0)
              );
              return {
                ...item,
                quantity: total,
                variantQuantities: nextMap,
                recurrence: item.recurrence
                  ? { ...item.recurrence, lastAddedAt: nowIso }
                  : item.recurrence,
              };
            }
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

      addToCart: (item, amount = 1, variantId) =>
        set((state) => {
          const step = roundQuantity(Math.max(0.01, amount));
          const existingIndex = state.items.findIndex((i) => i.id === item.id);
          if (existingIndex > -1) {
            const existing = state.items[existingIndex];
            const active = getActiveVariant(existing, variantId);
            const newItems = [...state.items];

            if (active && existing.variants?.length) {
              const prevMap = { ...(existing.variantQuantities ?? {}) };
              if (
                existing.quantity > 0 &&
                Object.keys(prevMap).length === 0 &&
                existing.variants[0]
              ) {
                const legacyVarId = existing.selectedVariantId ?? existing.variants[0].id;
                prevMap[legacyVarId] = existing.quantity;
              }
              prevMap[active.id] = roundQuantity((prevMap[active.id] ?? 0) + step);
              const total = roundQuantity(
                Object.values(prevMap).reduce((s, q) => s + q, 0)
              );
              newItems[existingIndex] = {
                ...existing,
                selectedVariantId: active.id,
                price: active.price,
                unit: active.unit,
                variantQuantities: prevMap,
                quantity: total,
              };
            } else {
              newItems[existingIndex] = {
                ...existing,
                quantity: roundQuantity(existing.quantity + step),
              };
            }
            return { items: newItems };
          }

          const newItem: CartItem = {
            ...item,
            quantity: roundQuantity(('quantity' in item ? item.quantity : 0) + step),
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
                    brand: newItem.brand,
                  },
                ],
            },
          };
        }),

      removeFromCart: (id, variantId) => {
        get().updateQuantity(id, -1, variantId);
      },

      updateQuantity: (id, delta, variantId) =>
        set((state) => ({
          items: state.items.map((item) => {
            if (item.id !== id) return item;
            const active = getActiveVariant(item, variantId);
            if (active && item.variants?.length) {
              const prevMap = { ...(item.variantQuantities ?? {}) };
              if (
                item.quantity > 0 &&
                Object.keys(prevMap).length === 0 &&
                item.variants[0]
              ) {
                const legacyVarId = item.selectedVariantId ?? item.variants[0].id;
                prevMap[legacyVarId] = item.quantity;
              }
              const nextVarQty = roundQuantity(Math.max(0, (prevMap[active.id] ?? 0) + delta));
              if (nextVarQty <= 0) {
                delete prevMap[active.id];
              } else {
                prevMap[active.id] = nextVarQty;
              }
              const total = roundQuantity(
                Object.values(prevMap).reduce((s, q) => s + q, 0)
              );
              return {
                ...item,
                variantQuantities: Object.keys(prevMap).length > 0 ? prevMap : undefined,
                quantity: total,
              };
            }
            return {
              ...item,
              quantity: roundQuantity(clampQuantity(item.quantity, delta)),
            };
          }),
        })),

      setItemQuantity: (id, quantity, variantId) =>
        set((state) => {
          const safeQty = roundQuantity(Math.max(0, quantity));
          return {
            items: state.items.map((item) => {
              if (item.id !== id) return item;
              const active = getActiveVariant(item, variantId);
              if (active && item.variants?.length) {
                const prevMap = { ...(item.variantQuantities ?? {}) };
                if (safeQty <= 0) {
                  delete prevMap[active.id];
                } else {
                  prevMap[active.id] = safeQty;
                }
                const total = roundQuantity(
                  Object.values(prevMap).reduce((s, q) => s + q, 0)
                );
                return {
                  ...item,
                  variantQuantities: Object.keys(prevMap).length > 0 ? prevMap : undefined,
                  quantity: total,
                };
              }
              return { ...item, quantity: safeQty };
            }),
          };
        }),

      checkoutCart: (splitConfig) => {
        const current = get();
        const breakdown = buildCheckoutBreakdown(current.items);
        if (breakdown.lines.length === 0) return false;

        const now = new Date();
        const nowMs = now.getTime();
        const nowIso = now.toISOString();

        const splitSig = splitConfig
          ? `${splitConfig.paidById}:${splitConfig.splitMethod}:${splitConfig.participants
              .map((p) => `${p.personId}=${p.amount}`)
              .join(',')}`
          : 'nosplit';
        const signature = buildCheckoutSignature(current.items, splitSig);

        if (isDuplicateCheckoutAttempt(current.lastCheckoutMeta, signature, nowMs)) {
          return false;
        }

        const checkedOutQtyByItem = new Map<string, number>();
        for (const line of breakdown.lines) {
          checkedOutQtyByItem.set(
            line.item.id,
            roundQuantity((checkedOutQtyByItem.get(line.item.id) ?? 0) + line.quantity)
          );
        }

        const updatedItems: CartItem[] = current.items.map((item) => {
          const boughtQty = checkedOutQtyByItem.get(item.id);
          if (!boughtQty) return item;
          return {
            ...item,
            quantity: 0,
            variantQuantities: undefined,
            lastPurchasedAt: nowIso,
            purchaseCount: roundQuantity((item.purchaseCount ?? 0) + boughtQty),
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
        for (const line of breakdown.lines) {
          const itemKey = getPriceHistoryKey(line.item.id, line.variantId);
          const point = {
            date: nowIso,
            price: line.price,
            unit: line.unit,
            source: 'user_purchase' as const,
            productName: line.item.name,
            variantId: line.variantId,
            variantLabel: line.variantLabel,
            brand: line.item.brand,
          };
          nextPriceHistory[itemKey] = [...(nextPriceHistory[itemKey] ?? []), point];
          if (line.variantId && (!line.item.variants || line.item.variants[0]?.id === line.variantId)) {
            nextPriceHistory[line.item.id] = [
              ...(nextPriceHistory[line.item.id] ?? []),
              point,
            ];
          }
        }

        const sessionItems = breakdown.lines.map((line) => ({
          itemId: line.item.id,
          name: line.item.name,
          brand: line.item.brand,
          category: line.item.category,
          subcategory: line.item.subcategory,
          variantId: line.variantId,
          variantLabel: line.variantLabel,
          unit: line.unit,
          price: line.price,
          quantity: line.quantity,
          subtotal: line.subtotal,
        }));

        if (!splitConfig) {
          const newTransactions = breakdown.lines.map((line) => {
            const label = line.variantLabel
              ? `${line.item.name} · ${line.variantLabel}`
              : line.item.name;
            return {
              id: crypto.randomUUID(),
              name: `${label} (x${line.quantity})`,
              amount: line.subtotal,
              category: line.item.category,
              timestamp: nowIso,
              source: 'mart' as const,
              status: 'active' as const,
            };
          });

          const newObs: PriceObservation[] = breakdown.lines.map((line, idx) =>
            buildPriceObservation({
              rawName: line.variantLabel
                ? `${line.item.name} ${line.variantLabel}`
                : line.item.name,
              explicitProductId: line.item.id,
              category: line.item.category,
              brand: line.item.brand,
              quantity: line.quantity,
              packageSize: line.unit || '1 unit',
              totalPrice: line.subtotal,
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

          const nextPurchaseHistory = [session, ...current.purchaseHistory].slice(0, 100);
          const autoCapturedItems = applyAutoRecurrenceToItems(
            updatedItems,
            nextPurchaseHistory
          );

          set({
            transactions: [...newTransactions, ...current.transactions],
            items: autoCapturedItems,
            priceHistory: nextPriceHistory,
            purchaseHistory: nextPurchaseHistory,
            priceObservations: obsResult.priceObservations,
            priceAlerts: obsResult.priceAlerts,
            triggeredPriceAlerts: obsResult.triggeredPriceAlerts,
            lastCheckoutMeta: { signature, at: nowMs },
          });
          return true;
        }

        // Split Checkout: create ONE SharedExpense and at most ONE linked personal Transaction
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

        const newObs: PriceObservation[] = breakdown.lines.map((line) =>
          buildPriceObservation({
            rawName: line.variantLabel
              ? `${line.item.name} ${line.variantLabel}`
              : line.item.name,
            explicitProductId: line.item.id,
            category: line.item.category,
            brand: line.item.brand,
            quantity: line.quantity,
            packageSize: line.unit || '1 unit',
            totalPrice: line.subtotal,
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

        const nextPurchaseHistory = [session, ...current.purchaseHistory].slice(0, 100);
        const autoCapturedItems = applyAutoRecurrenceToItems(
          updatedItems,
          nextPurchaseHistory
        );

        set({
          sharedExpenses: [newSharedExpense, ...current.sharedExpenses],
          transactions: nextTransactions,
          items: autoCapturedItems,
          priceHistory: nextPriceHistory,
          purchaseHistory: nextPurchaseHistory,
          priceObservations: obsResult.priceObservations,
          priceAlerts: obsResult.priceAlerts,
          triggeredPriceAlerts: obsResult.triggeredPriceAlerts,
          lastCheckoutMeta: { signature, at: nowMs },
        });
        return true;
      },

      clearCart: () =>
        set((state) => ({
          items: state.items.map((i) => ({ ...i, quantity: 0, variantQuantities: undefined })),
        })),

      repeatPurchaseSession: (sessionId) => {
        const state = get();
        const session = state.purchaseHistory.find((s) => s.id === sessionId);
        if (!session) return 0;

        for (const sItem of session.items) {
          const existing = state.items.find((i) => i.id === sItem.itemId);
          if (existing) {
            state.addToCart(existing, sItem.quantity, sItem.variantId);
          } else {
            state.addToCart(
              {
                id: sItem.itemId,
                name: sItem.name,
                brand: sItem.brand,
                price: sItem.price,
                category: sItem.category,
                subcategory: sItem.subcategory,
                icon: '📦',
                unit: sItem.unit || '1 unit',
                quantity: 0,
                isCustom: true,
              },
              sItem.quantity,
              sItem.variantId
            );
          }
        }
        return roundQuantity(session.items.reduce((sum, i) => sum + i.quantity, 0));
      },

      quickReorderItem: (itemId, variantId, quantity = 1) => {
        const state = get();
        const found = state.items.find((i) => i.id === itemId);
        if (!found) return false;
        state.addToCart(found, quantity, variantId);
        return true;
      },

      saveCartAsBasket: (name, description) => {
        const trimmedName = name.trim();
        if (!trimmedName) return null;
        const state = get();
        const basketItems = buildBasketItemsFromCart(state.items);
        if (basketItems.length === 0) return null;
        const nowIso = new Date().toISOString();
        const created: BasketTemplate = {
          id: `basket-${crypto.randomUUID().slice(0, 8)}`,
          name: trimmedName,
          description: description?.trim() || undefined,
          items: basketItems,
          savedTotal: computeBasketSavedTotal(basketItems),
          createdAt: nowIso,
          updatedAt: nowIso,
          lastLoadedAt: null,
          isPreset: false,
        };
        set((s) => ({
          basketTemplates: [created, ...s.basketTemplates],
          basketTemplatesSeeded: true,
        }));
        return created;
      },

      saveSessionAsBasket: (sessionId, name) => {
        const state = get();
        const session = state.purchaseHistory.find((s) => s.id === sessionId);
        if (!session || session.items.length === 0) return null;
        const basketItems = buildBasketItemsFromSession(session, state.items);
        if (basketItems.length === 0) return null;

        const nowIso = new Date().toISOString();
        const dateLabel = new Date(session.timestamp).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
        });
        const resolvedName = name?.trim() || `Order Basket (${dateLabel})`;
        const created: BasketTemplate = {
          id: `basket-${crypto.randomUUID().slice(0, 8)}`,
          name: resolvedName,
          description: `Saved from order on ${dateLabel}`,
          items: basketItems,
          savedTotal: computeBasketSavedTotal(basketItems),
          createdAt: nowIso,
          updatedAt: nowIso,
          lastLoadedAt: null,
          isPreset: false,
        };
        set((s) => ({
          basketTemplates: [created, ...s.basketTemplates],
          basketTemplatesSeeded: true,
        }));
        return created;
      },

      loadBasketTemplateToCart: (basketId, mode = 'merge') => {
        const state = get();
        const target = state.basketTemplates.find((b) => b.id === basketId);
        if (!target || target.items.length === 0) return 0;

        const { nextItems, loadedLinesCount } = applyBasketTemplateToItems(
          state.items,
          target,
          mode
        );
        if (loadedLinesCount === 0) return 0;

        const nowIso = new Date().toISOString();
        set({
          items: nextItems,
          basketTemplates: state.basketTemplates.map((b) =>
            b.id === basketId ? { ...b, lastLoadedAt: nowIso } : b
          ),
        });
        return loadedLinesCount;
      },

      updateBasketFromCart: (basketId) => {
        const state = get();
        const target = state.basketTemplates.find((b) => b.id === basketId);
        if (!target) return false;
        const basketItems = buildBasketItemsFromCart(state.items);
        if (basketItems.length === 0) return false;
        const nowIso = new Date().toISOString();
        set({
          basketTemplates: state.basketTemplates.map((b) =>
            b.id === basketId
              ? {
                  ...b,
                  items: basketItems,
                  savedTotal: computeBasketSavedTotal(basketItems),
                  updatedAt: nowIso,
                  isPreset: false,
                }
              : b
          ),
        });
        return true;
      },

      refreshBasketBaselinePrices: (basketId) => {
        const state = get();
        const target = state.basketTemplates.find((b) => b.id === basketId);
        if (!target) return false;
        const evaluated = evaluateBasketTemplate(target, state.items);
        const updatedItems = evaluated.lines.map((line) => ({
          ...line.templateItem,
          savedPrice: line.currentPrice,
        }));
        const nowIso = new Date().toISOString();
        set({
          basketTemplates: state.basketTemplates.map((b) =>
            b.id === basketId
              ? {
                  ...b,
                  items: updatedItems,
                  savedTotal: computeBasketSavedTotal(updatedItems),
                  updatedAt: nowIso,
                }
              : b
          ),
        });
        return true;
      },

      renameBasketTemplate: (basketId, name, description) =>
        set((state) => {
          const trimmed = name.trim();
          if (!trimmed) return state;
          const nowIso = new Date().toISOString();
          return {
            basketTemplates: state.basketTemplates.map((b) =>
              b.id === basketId
                ? {
                    ...b,
                    name: trimmed,
                    description:
                      description !== undefined ? description.trim() || undefined : b.description,
                    updatedAt: nowIso,
                  }
                : b
            ),
          };
        }),

      removeBasketTemplateItem: (basketId, itemId, variantId) =>
        set((state) => ({
          basketTemplates: state.basketTemplates.map((b) => {
            if (b.id !== basketId) return b;
            const filtered = b.items.filter(
              (it) => !(it.itemId === itemId && (it.variantId ?? '') === (variantId ?? ''))
            );
            return {
              ...b,
              items: filtered,
              savedTotal: computeBasketSavedTotal(filtered),
              updatedAt: new Date().toISOString(),
            };
          }),
        })),

      deleteBasketTemplate: (basketId) =>
        set((state) => ({
          basketTemplates: state.basketTemplates.filter((b) => b.id !== basketId),
          basketTemplatesSeeded: true,
        })),

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
          const nextPurchaseHistory = state.purchaseHistory.filter(
            (s) => s.linkedTransactionId !== id
          );
          const nextItems =
            nextPurchaseHistory.length !== state.purchaseHistory.length
              ? applyAutoRecurrenceToItems(state.items, nextPurchaseHistory)
              : state.items;
          return {
            transactions: state.transactions.filter((tx) => tx.id !== id),
            sharedExpenses: nextShared,
            priceObservations: state.priceObservations.filter((obs) => obs.transactionId !== id),
            purchaseHistory: nextPurchaseHistory,
            items: nextItems,
          };
        }),

      cancelTransaction: (id) =>
        set((state) => {
          const nextPurchaseHistory = state.purchaseHistory.filter(
            (s) => s.linkedTransactionId !== id
          );
          const nextItems =
            nextPurchaseHistory.length !== state.purchaseHistory.length
              ? applyAutoRecurrenceToItems(state.items, nextPurchaseHistory)
              : state.items;
          return {
            transactions: state.transactions.map((tx) =>
              tx.id === id ? { ...tx, status: 'cancelled' } : tx
            ),
            priceObservations: state.priceObservations.map((obs) =>
              obs.transactionId === id ? { ...obs, status: 'cancelled' } : obs
            ),
            purchaseHistory: nextPurchaseHistory,
            items: nextItems,
          };
        }),

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

      recordReceiptAsTransaction: (receipt, options) => {
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
        const saveNewItemsToCatalog = options?.saveNewItemsToCatalog === true;

        let nextItems = [...current.items];
        let nextConfigs = [...current.categoryConfigs];
        const nextCaps = { ...current.categoryCaps };
        const nextHistory = { ...current.priceHistory };
        let createdCustomItemsCount = 0;

        const createdObservations: PriceObservation[] = [];
        const matchedSessionInputs: ReceiptSessionItemInput[] = [];
        const matchedQtyById = new Map<string, number>();

        for (const item of receipt.items) {
          if (!item.name.trim() || item.price <= 0) continue;

          const extracted = extractProductInfo(item.name, item.brand, item.unit);
          const rawCat =
            item.category?.trim() || inferCategoryFromName(item.name, 'Other Expenses');
          const matchedCfg = nextConfigs.find(
            (c) => c.name.toLowerCase() === rawCat.toLowerCase()
          );
          const itemCategory = matchedCfg?.name ?? rawCat;
          const resolvedUnit =
            item.unit?.trim() ||
            (extracted.packageSize !== '1 unit' ? extracted.packageSize : undefined);
          const resolvedBrand = item.brand?.trim() || extracted.brand;

          const resolved = resolveCanonicalProduct(
            item.name,
            nextItems,
            [...createdObservations, ...current.priceObservations],
            {
              explicitProductId: item.matchedProductId,
              explicitCategory: itemCategory,
              explicitBrand: resolvedBrand,
              explicitPackageSize: resolvedUnit,
            }
          );

          let targetCatalogItem =
            (item.matchedProductId
              ? nextItems.find((c) => c.id === item.matchedProductId)
              : undefined) ??
            (resolved.matchedExisting
              ? nextItems.find((c) => c.id === resolved.productId)
              : undefined);

          let createdThisPass = false;
          if (!targetCatalogItem && saveNewItemsToCatalog) {
            if (!matchedCfg) {
              nextConfigs = [
                ...nextConfigs,
                {
                  id: `cat-custom-${crypto.randomUUID().slice(0, 8)}`,
                  name: itemCategory,
                  iconKey: 'package',
                  accent: 'teal',
                  isCustom: true,
                  order: nextConfigs.length,
                },
              ];
              if (!(itemCategory in nextCaps)) {
                nextCaps[itemCategory] = null;
              }
            }

            const newItemId = `custom-${crypto.randomUUID().slice(0, 8)}`;
            const cleanDisplayName = (extracted.cleanName || item.name.trim()).slice(0, 60);
            const catalogUnit = resolvedUnit || '1 unit';
            const unitPrice = roundCurrency(
              resolved.quantity > 1 ? item.price / resolved.quantity : item.price
            );

            targetCatalogItem = {
              id: newItemId,
              name: cleanDisplayName,
              price: unitPrice,
              category: itemCategory,
              unit: catalogUnit,
              brand: resolvedBrand,
              icon: 'shopping-bag',
              quantity: 0,
              isCustom: true,
              createdAt: nowIso,
              lastPurchasedAt: purchaseDate,
              purchaseCount: 0,
            };

            nextItems = [targetCatalogItem, ...nextItems];
            nextHistory[newItemId] = [
              {
                date: purchaseDate,
                price: unitPrice,
                unit: catalogUnit,
                source: 'user_purchase',
                productName: cleanDisplayName,
                brand: resolvedBrand,
              },
            ];
            createdCustomItemsCount += 1;
            createdThisPass = true;
          }

          if (targetCatalogItem) {
            const qty = resolved.quantity > 0 ? roundQuantity(resolved.quantity) : 1;
            const unitPrice = roundCurrency(qty > 0 ? item.price / qty : item.price);
            matchedSessionInputs.push({
              item: targetCatalogItem,
              quantity: qty,
              subtotal: item.price,
              unitPrice,
              category: itemCategory,
            });
            matchedQtyById.set(
              targetCatalogItem.id,
              roundQuantity((matchedQtyById.get(targetCatalogItem.id) ?? 0) + qty)
            );
            if (createdThisPass) {
              // Ensure initial purchaseCount reflects this receipt accurately
              nextItems = nextItems.map((it) =>
                it.id === targetCatalogItem!.id ? { ...it, purchaseCount: 0 } : it
              );
            }
          }

          const obs = buildPriceObservation({
            rawName: item.name,
            explicitProductId: targetCatalogItem?.id,
            category: itemCategory,
            brand: resolvedBrand,
            packageSize: resolvedUnit,
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
            catalogItems: nextItems,
            existingObservations: [...createdObservations, ...current.priceObservations],
          });
          createdObservations.push(obs);
        }

        // Determine dominant category from matched receipt items
        const catTotals = new Map<string, number>();
        for (const obs of createdObservations) {
          catTotals.set(obs.category, (catTotals.get(obs.category) ?? 0) + obs.totalPrice);
        }
        let dominantCategory = 'Other Expenses';
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

        const receiptSession = buildReceiptPurchaseSession({
          id: `ps-receipt-${txId.slice(0, 8)}`,
          timestamp: purchaseDate,
          merchant: receipt.merchant,
          transactionId: txId,
          totalAmount: totalAmt,
          matchedItems: matchedSessionInputs,
        });

        const nextPurchaseHistory = receiptSession
          ? [receiptSession, ...current.purchaseHistory]
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .slice(0, 100)
          : current.purchaseHistory;

        const prevAutoIds = new Set(
          current.items.filter((i) => i.recurrence?.source === 'auto').map((i) => i.id)
        );

        const updatedMatchedItems = nextItems.map((it) => {
          const addedQty = matchedQtyById.get(it.id);
          if (!addedQty) return it;
          const prevTs = it.lastPurchasedAt ? new Date(it.lastPurchasedAt).getTime() : 0;
          const nextTs = new Date(purchaseDate).getTime();
          const latestPurchasedAt =
            Number.isFinite(nextTs) && nextTs >= prevTs ? purchaseDate : it.lastPurchasedAt ?? purchaseDate;
          return {
            ...it,
            purchaseCount: roundQuantity((it.purchaseCount ?? 0) + addedQty),
            lastPurchasedAt: latestPurchasedAt,
          };
        });

        const syncedItems = receiptSession
          ? applyAutoRecurrenceToItems(updatedMatchedItems, nextPurchaseHistory)
          : updatedMatchedItems;

        const autoRecurringAddedCount = syncedItems.filter(
          (i) => i.recurrence?.source === 'auto' && !prevAutoIds.has(i.id)
        ).length;

        const obsResult = appendObservationsAndEvaluateAlerts(current, createdObservations, nowIso);

        set({
          transactions: [newTx, ...current.transactions],
          items: syncedItems,
          categoryConfigs: nextConfigs,
          categories: nextConfigs.map((c) => c.name),
          categoryCaps: nextCaps,
          priceHistory: nextHistory,
          purchaseHistory: nextPurchaseHistory,
          priceObservations: obsResult.priceObservations,
          priceAlerts: obsResult.priceAlerts,
          triggeredPriceAlerts: obsResult.triggeredPriceAlerts,
        });

        return {
          ok: true,
          transactionId: txId,
          observationsCount: createdObservations.length,
          triggeredAlertsCount: obsResult.triggeredCount,
          createdCustomItemsCount,
          autoRecurringAddedCount,
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

      addPerson: (name, contact, upiId) => {
        const trimmedName = name.trim();
        const trimmedContact = contact?.trim() || undefined;
        const trimmedUpi = upiId?.trim().toLowerCase() || undefined;
        const newPerson: Person = {
          id: crypto.randomUUID(),
          name: trimmedName,
          contact: trimmedContact,
          upiId: trimmedUpi,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          people: [...state.people, newPerson],
        }));
        return newPerson;
      },

      updatePerson: (id, name, contact, upiId) =>
        set((state) => ({
          people: state.people.map((p) =>
            p.id === id
              ? {
                  ...p,
                  name: name.trim() || p.name,
                  contact: contact?.trim() || undefined,
                  upiId: upiId !== undefined ? upiId.trim().toLowerCase() || undefined : p.upiId,
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
      setBudgetResetDay: (day) =>
        set({
          budgetResetDay: Number.isFinite(day)
            ? Math.min(28, Math.max(1, Math.round(day)))
            : 1,
        }),
      setBudgetRolloverEnabled: (enabled) => set({ budgetRolloverEnabled: Boolean(enabled) }),
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
      updateParsedReceipt: (index, receipt) =>
        set((state) => ({
          parsedReceipts: state.parsedReceipts.map((r, i) => (i === index ? receipt : r)),
        })),
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
          const sessions = data.purchaseHistory ?? [];
          const mergedItems = applyAutoRecurrenceToItems(
            migratePersistedMartItems(mergeBackupItems(data.customItems, INITIAL_MART_ITEMS)),
            sessions
          );
          const mergedConfigs = migrateCategoryConfigs(
            data.categoryConfigs,
            mergeCategories(data.categories, mergedItems, data.transactions),
            mergedItems,
            data.transactions
          );
          const mergedHistory = ensureCatalogPriceHistory(mergedItems, data.priceHistory ?? {});
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
            basketTemplates: Array.isArray(data.basketTemplates)
              ? data.basketTemplates
              : INITIAL_BASKET_TEMPLATES,
            basketTemplatesSeeded:
              typeof data.basketTemplatesSeeded === 'boolean'
                ? data.basketTemplatesSeeded
                : true,
            priceObservations: restoredObs,
            priceAlerts: Array.isArray(data.priceAlerts) ? data.priceAlerts : [],
            triggeredPriceAlerts: [],
            totalBudget: data.totalBudget,
            sessionBudget: data.sessionBudget,
            budgetResetDay:
              typeof data.budgetResetDay === 'number'
                ? Math.min(28, Math.max(1, Math.round(data.budgetResetDay)))
                : 1,
            budgetRolloverEnabled: Boolean(data.budgetRolloverEnabled),
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
            theme: data.theme ? sanitizeThemeMode(data.theme) : undefined,
            featureSettings: data.featureSettings
              ? sanitizeFeatureSettings(data.featureSettings)
              : undefined,
            pennyMessages: data.pennyMessages
              ? sanitizePennyMessages(data.pennyMessages)
              : undefined,
            pennyProfile: data.pennyProfile
              ? sanitizePennyProfile(data.pennyProfile)
              : undefined,
            myUpiId:
              typeof data.myUpiId === 'string' ? data.myUpiId.trim().toLowerCase() : undefined,
            myUpiName:
              typeof data.myUpiName === 'string' ? data.myUpiName.trim() : undefined,
            isSampleDataLoaded: false,
          };
        }),

      loadSampleMonth: () =>
        set((state) => {
          const sample = buildSampleMonthDataset(new Date(), state.items);
          const resetItems = state.items.map((item) => ({
            ...item,
            quantity: 0,
            variantQuantities: undefined,
            autoRecurrenceDismissed: false,
          }));
          return {
            ...sample,
            items: applyAutoRecurrenceToItems(resetItems, sample.purchaseHistory),
            feeFlags: [],
            parsedReceipts: [],
            dismissedWarRoomAlerts: [],
            lastCheckoutMeta: null,
          };
        }),

      clearWorkspaceData: () =>
        set((state) => {
          const empty = buildEmptyWorkspacePatch();
          return {
            ...empty,
            items: state.items.map((item) => ({
              ...item,
              quantity: 0,
              variantQuantities: undefined,
              isFavourite: false,
              recurrence: null,
              autoRecurrenceDismissed: false,
              lastPurchasedAt: undefined,
              purchaseCount: 0,
            })),
          };
        }),
    }),
    {
      name: 'cartaudit-store',
      version: 3,
      partialize: (state) => ({
        theme: state.theme,
        featureSettings: state.featureSettings,
        pennyMessages: state.pennyMessages.slice(-40),
        pennyProfile: state.pennyProfile,
        isSampleDataLoaded: state.isSampleDataLoaded,
        myUpiId: state.myUpiId,
        myUpiName: state.myUpiName,
        totalBudget: state.totalBudget,
        sessionBudget: state.sessionBudget,
        budgetResetDay: state.budgetResetDay,
        budgetRolloverEnabled: state.budgetRolloverEnabled,
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
        basketTemplates: state.basketTemplates,
        basketTemplatesSeeded: state.basketTemplatesSeeded,
        priceObservations: state.priceObservations,
        priceAlerts: state.priceAlerts,
        triggeredPriceAlerts: state.triggeredPriceAlerts,
        people: state.people,
        sharedExpenses: state.sharedExpenses,
        settlements: state.settlements,
      }),
      migrate: (persistedState, version) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return persistedState;
        }
        let persisted = persistedState as Partial<AppState>;
        if (version < 2) {
          const existingBaskets = Array.isArray(persisted.basketTemplates)
            ? persisted.basketTemplates
            : [];
          const existingIds = new Set(existingBaskets.map((b) => b.id));
          const mergedBaskets = [
            ...existingBaskets,
            ...INITIAL_BASKET_TEMPLATES.filter((tpl) => !existingIds.has(tpl.id)),
          ];
          persisted = {
            ...persisted,
            basketTemplates: mergedBaskets,
            basketTemplatesSeeded: true,
          };
        }
        if (version < 3 && Array.isArray(persisted.items)) {
          const legacySeedFavIds = new Set([
            'item-rice',
            'item-tomatoes',
            'item-bananas',
            'item-milk',
            'item-coffee',
          ]);
          const legacySeedRecurrenceIds = new Set([
            'item-rice',
            'item-milk',
            'item-eggs',
            'item-wifi',
            'item-mobile-recharge',
          ]);
          const sessions = Array.isArray(persisted.purchaseHistory)
            ? persisted.purchaseHistory
            : [];
          const noPurchasesYet = sessions.length === 0;

          const cleanedItems = persisted.items.map((item) => {
            if (!item || typeof item !== 'object') return item;
            let nextRecurrence = item.recurrence ?? null;
            if (nextRecurrence && !nextRecurrence.source) {
              nextRecurrence = legacySeedRecurrenceIds.has(item.id)
                ? null
                : { ...nextRecurrence, source: 'manual' };
            }
            const nextFav =
              noPurchasesYet && legacySeedFavIds.has(item.id)
                ? false
                : item.isFavourite;
            return {
              ...item,
              isFavourite: nextFav,
              recurrence: nextRecurrence,
            };
          });

          persisted = {
            ...persisted,
            items: applyAutoRecurrenceToItems(cleanedItems, sessions),
          };
        }
        return persisted;
      },
      merge: (persistedState, currentState) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return currentState;
        }
        const state = persistedState as Partial<AppState>;
        const persistedTransactions = Array.isArray(state.transactions)
          ? state.transactions
          : currentState.transactions;
        const migratedItems = migratePersistedMartItems(state.items);
        const migratedConfigs = migrateCategoryConfigs(
          state.categoryConfigs,
          state.categories,
          migratedItems,
          persistedTransactions
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

        const existingBaskets = Array.isArray(state.basketTemplates)
          ? state.basketTemplates
          : [];
        const mergedBaskets =
          existingBaskets.length > 0
            ? existingBaskets
            : INITIAL_BASKET_TEMPLATES;

        return {
          ...currentState,
          ...state,
          transactions: persistedTransactions,
          items: migratedItems,
          categoryConfigs: migratedConfigs,
          categories: migratedConfigs.map((c) => c.name),
          priceHistory: patchedHistory,
          purchaseHistory: sessions,
          basketTemplates: mergedBaskets,
          basketTemplatesSeeded: true,
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
          theme: sanitizeThemeMode(state.theme),
          featureSettings: sanitizeFeatureSettings(state.featureSettings),
          pennyMessages: sanitizePennyMessages(state.pennyMessages),
          pennyProfile: sanitizePennyProfile(state.pennyProfile),
          budgetResetDay:
            typeof state.budgetResetDay === 'number' && Number.isFinite(state.budgetResetDay)
              ? Math.min(28, Math.max(1, Math.round(state.budgetResetDay)))
              : 1,
          budgetRolloverEnabled: Boolean(state.budgetRolloverEnabled),
        };
      },
    }
  )
);
