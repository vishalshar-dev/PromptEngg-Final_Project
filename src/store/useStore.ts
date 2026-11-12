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

export interface AppState {
  items: CartItem[];
  transactions: Transaction[];
  totalBudget: number;
  isBrokeMode: boolean;
  categories: string[];

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
  isBrokeMode: false,
  categories: ['Groceries', 'Junk', 'Fuel', 'Bills'],

  addCategory: (categoryName) =>
    set((state) =>
      state.categories.includes(categoryName)
        ? state
        : { categories: [...state.categories, categoryName] }
    ),

  addCustomItem: (item) =>
    set((state) => ({ items: [...state.items, { ...item, quantity: 0 }] })),

  updateItemPrice: (id, newPrice) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, price: newPrice } : i
      ),
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
        .map((i) =>
          i.id === id ? { ...i, quantity: i.quantity + delta } : i
        )
        .filter((i) => i.quantity > 0),
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

  toggleBrokeMode: () =>
    set((state) => ({ isBrokeMode: !state.isBrokeMode })),

  setTransactions: (txs) => set({ transactions: txs }),
  setItems: (items) => set({ items }),
}));
