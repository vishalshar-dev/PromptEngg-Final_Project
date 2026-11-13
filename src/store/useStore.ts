import { create } from 'zustand';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  category: string;
  icon: string;
  quantity: number;
}

export interface Transaction {
  id: string;
  name: string;
  amount: number;
  category: string;
  timestamp: string;
  splitWith?: string | null;
}

export interface PricePoint {
  date: string;
  price: number;
}

export interface PriceHistory {
  [itemId: string]: PricePoint[];
}

export interface FeeFlag {
  id: string;
  itemId: string;
  itemName: string;
  type: 'hidden_charge' | 'subscription_trap' | 'deceptive_pricing' | 'handling_fee' | 'inflated_tax';
  severity: 'warning' | 'critical';
  message: string;
  estimatedCost: number;
}

export interface ParsedReceiptItem {
  name: string;
  price: number;
  tax?: number;
  deliveryFee?: number;
}

export interface ParsedReceipt {
  merchant: string;
  date: string;
  items: ParsedReceiptItem[];
  subtotal: number;
  taxTotal: number;
  deliveryFee: number;
  total: number;
}

export interface AppState {
  items: CartItem[];
  transactions: Transaction[];
  totalBudget: number;
  sessionBudget: number | null;
  isBrokeMode: boolean;
  categories: string[];
  priceHistory: PriceHistory;
  feeFlags: FeeFlag[];
  parsedReceipts: ParsedReceipt[];

  addCategory: (categoryName: string) => void;
  addCustomItem: (item: Omit<CartItem, 'quantity'>) => void;
  updateItemPrice: (id: string, newPrice: number) => void;

  addToCart: (item: Omit<CartItem, 'quantity'> | CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  checkoutCart: () => void;
  clearCart: () => void;

  addTransaction: (tx: Omit<Transaction, 'id' | 'timestamp'>) => void;
  toggleBrokeMode: () => void;
  setTransactions: (txs: Transaction[]) => void;
  setItems: (items: CartItem[]) => void;

  setSessionBudget: (amount: number | null) => void;
  setTotalBudget: (amount: number) => void;
  setFeeFlags: (flags: FeeFlag[]) => void;
  addParsedReceipt: (receipt: ParsedReceipt) => void;
  clearParsedReceipts: () => void;
}

function generatePriceHistory(basePrice: number): { date: string; price: number }[] {
  const now = new Date();
  const points: { date: string; price: number }[] = [];
  let currentPrice = basePrice * 0.82;
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 15);
    const variance = (Math.sin(i * 1.7) + Math.cos(i * 0.9)) * 0.08;
    const trend = (5 - i) * 0.02;
    const price = Math.round(basePrice * (0.82 + trend + variance) * 100) / 100;
    points.push({ date: d.toISOString(), price });
    currentPrice = price;
  }
  points.push({ date: now.toISOString(), price: basePrice });
  return points;
}

export const useAppStore = create<AppState>((set) => ({
  items: [
    { id: 'item-milk', name: 'Milk', price: 60, category: 'Groceries', icon: '🥛', quantity: 0 },
    { id: 'item-eggs', name: 'Eggs (6pc)', price: 70, category: 'Groceries', icon: '🥚', quantity: 0 },
    { id: 'item-rice', name: 'Rice 1kg', price: 90, category: 'Groceries', icon: '🍚', quantity: 0 },
    { id: 'item-chips', name: 'Chips', price: 30, category: 'Junk', icon: '🍟', quantity: 0 },
    { id: 'item-soda', name: 'Soda', price: 40, category: 'Junk', icon: '🥤', quantity: 0 },
    { id: 'item-chocolate', name: 'Chocolate', price: 50, category: 'Junk', icon: '🍫', quantity: 0 },
    { id: 'item-petrol', name: 'Petrol', price: 105, category: 'Fuel', icon: '⛽', quantity: 0 },
    { id: 'item-wifi', name: 'Wi-Fi Bill', price: 500, category: 'Bills', icon: '📶', quantity: 0 },
  ],
  transactions: [],
  totalBudget: 5000,
  sessionBudget: null,
  isBrokeMode: false,
  categories: ['Groceries', 'Junk', 'Fuel', 'Bills'],
  priceHistory: {},
  feeFlags: [],
  parsedReceipts: [],

  addCategory: (categoryName) =>
    set((state) =>
      state.categories.includes(categoryName)
        ? state
        : { categories: [...state.categories, categoryName] }
    ),

  addCustomItem: (item) =>
    set((state) => ({
      items: [...state.items, { ...item, quantity: 0 }],
      priceHistory: {
        ...state.priceHistory,
        [item.id]: generatePriceHistory(item.price),
      },
    })),

  updateItemPrice: (id, newPrice) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, price: newPrice } : i)),
      priceHistory: {
        ...state.priceHistory,
        [id]: [...(state.priceHistory[id] ?? []), { date: new Date().toISOString(), price: newPrice }],
      },
    })),

  addToCart: (item) =>
    set((state) => {
      const existingIndex = state.items.findIndex((i) => i.id === item.id);
      if (existingIndex > -1) {
        const newItems = [...state.items];
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          quantity: newItems[existingIndex].quantity + 1,
        };
        return { items: newItems };
      }
      return {
        items: [...state.items, { ...item, quantity: ('quantity' in item ? item.quantity : 0) + 1 }],
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
      items: state.items
        .map((i) => (i.id === id ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0 || state.items.find((x) => x.id === id)),
    })),

  checkoutCart: () => {
    set((state) => {
      const checkedOut = state.items.filter((i) => i.quantity > 0);
      const newTransactions = checkedOut.map((item) => ({
        id: crypto.randomUUID(),
        name: `${item.name} (x${item.quantity})`,
        amount: item.price * item.quantity,
        category: item.category,
        timestamp: new Date().toISOString(),
      }));
      return {
        transactions: [...newTransactions, ...state.transactions],
        items: state.items.map((i) => ({ ...i, quantity: 0 })),
      };
    });
  },

  clearCart: () =>
    set((state) => ({ items: state.items.map((i) => ({ ...i, quantity: 0 })) })),

  addTransaction: (tx) =>
    set((state) => ({
      transactions: [
        { ...tx, id: crypto.randomUUID(), timestamp: new Date().toISOString() },
        ...state.transactions,
      ],
    })),

  toggleBrokeMode: () => set((state) => ({ isBrokeMode: !state.isBrokeMode })),
  setTransactions: (txs) => set({ transactions: txs }),
  setItems: (items) => set({ items }),
  setSessionBudget: (amount) => set({ sessionBudget: amount }),
  setTotalBudget: (amount) => set({ totalBudget: amount }),
  setFeeFlags: (flags) => set({ feeFlags: flags }),
  addParsedReceipt: (receipt) =>
    set((state) => ({ parsedReceipts: [receipt, ...state.parsedReceipts].slice(0, 10) })),
  clearParsedReceipts: () => set({ parsedReceipts: [] }),
}));

const defaultItemIds = [
  'item-milk', 'item-eggs', 'item-rice', 'item-chips',
  'item-soda', 'item-chocolate', 'item-petrol', 'item-wifi',
];
const defaultPrices = [60, 70, 90, 30, 40, 50, 105, 500];

const initialHistory: PriceHistory = {};
defaultItemIds.forEach((id, i) => {
  initialHistory[id] = generatePriceHistory(defaultPrices[i]);
});
useAppStore.setState({ priceHistory: initialHistory });
