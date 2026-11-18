import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  SELF_PERSON_ID,
  type BackupData,
  type CartItem,
  type CategoryCaps,
  type CategoryConfig,
  type ExpenseParticipantShare,
  type FeeFlag,
  type ParsedReceipt,
  type Person,
  type PriceHistory,
  type PurchaseSession,
  type RecurrenceConfig,
  type SavedAudit,
  type Settlement,
  type SharedExpense,
  type SplitMethod,
  type Transaction,
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
} from '../utils/martEngine';
import { isDuplicateSettlement, roundCurrency } from '../utils/splitLedgerEngine';

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
  PriceHistory,
  PricePoint,
  PriceSource,
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

export interface AppState {
  items: CartItem[];
  transactions: Transaction[];
  totalBudget: number;
  sessionBudget: number | null;
  isBrokeMode: boolean;
  categories: string[];
  categoryConfigs: CategoryConfig[];
  categoryCaps: CategoryCaps;
  priceHistory: PriceHistory;
  purchaseHistory: PurchaseSession[];
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
  removeTransaction: (id: string) => void;
  toggleBrokeMode: () => void;
  setTransactions: (txs: Transaction[]) => void;
  setItems: (items: CartItem[]) => void;

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

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      items: INITIAL_MART_ITEMS,
      transactions: [],
      totalBudget: 5000,
      sessionBudget: null,
      isBrokeMode: false,
      categories: INITIAL_MART_CATEGORIES,
      categoryConfigs: INITIAL_CATEGORY_CONFIGS,
      categoryCaps: INITIAL_MART_CATEGORY_CAPS,
      priceHistory: ensureCatalogPriceHistory(INITIAL_MART_ITEMS),
      purchaseHistory: [],
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
          }));

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
            lastCheckoutMeta: { signature, at: nowMs },
          });
          return true;
        }

        // Split Checkout: create ONE SharedExpense and at most ONE linked personal Transaction
        // for the user's own share so personal budget never counts others' shares or duplicates!
        const sharedId = crypto.randomUUID();
        const userShare = getUserShareFromParticipants(splitConfig.participants);
        const txId = userShare > 0 ? crypto.randomUUID() : null;

        const newSharedExpense: SharedExpense = {
          id: sharedId,
          name: splitConfig.name.trim(),
          totalAmount: roundCurrency(splitConfig.totalAmount),
          category: splitConfig.category,
          date: splitConfig.date || nowIso,
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
                  timestamp: splitConfig.date || nowIso,
                  linkedSharedExpenseId: sharedId,
                },
                ...current.transactions,
              ]
            : current.transactions;

        const session: PurchaseSession = {
          id: crypto.randomUUID(),
          timestamp: splitConfig.date || nowIso,
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
            },
            ...state.transactions,
          ],
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
          };
        }),

      toggleBrokeMode: () => set((state) => ({ isBrokeMode: !state.isBrokeMode })),
      setTransactions: (txs) => set({ transactions: txs }),
      setItems: (items) => set({ items }),

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
        set((state) => ({
          categoryCaps: { ...state.categoryCaps, [category]: amount },
        })),
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
          return {
            transactions: data.transactions,
            items: mergedItems,
            categoryConfigs: mergedConfigs,
            categories: mergedConfigs.map((c) => c.name),
            priceHistory: mergedHistory,
            purchaseHistory: data.purchaseHistory ?? [],
            totalBudget: data.totalBudget,
            sessionBudget: data.sessionBudget,
            categoryCaps: data.categoryCaps,
            savedAudits: data.savedAudits,
            people: data.people ?? [],
            sharedExpenses: data.sharedExpenses ?? [],
            settlements: data.settlements ?? [],
          };
        }),
    }),
    {
      name: 'cartaudit-store',
      partialize: (state) => ({
        totalBudget: state.totalBudget,
        sessionBudget: state.sessionBudget,
        isBrokeMode: state.isBrokeMode,
        categories: state.categories,
        categoryConfigs: state.categoryConfigs,
        categoryCaps: state.categoryCaps,
        transactions: state.transactions,
        savedAudits: state.savedAudits,
        items: state.items,
        priceHistory: state.priceHistory,
        purchaseHistory: state.purchaseHistory,
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
          useAppStore.setState({
            items: migratedItems,
            categoryConfigs: migratedConfigs,
            categories: migratedConfigs.map((c) => c.name),
            priceHistory: patchedHistory,
            purchaseHistory: Array.isArray(state.purchaseHistory) ? state.purchaseHistory : [],
          });
        }
      },
    }
  )
);
