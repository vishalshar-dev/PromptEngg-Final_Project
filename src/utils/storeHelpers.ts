import { sanitizeFeatureSettings, sanitizeThemeMode } from './settingsEngine';
import { sanitizePennyMessages, sanitizePennyProfile } from './pennyEngine';
import type {
  BackupData,
  CartItem,
  CategoryCaps,
  PriceHistory,
  PricePoint,
} from '../types/models';

export const DEFAULT_CATEGORIES: string[] = ['Groceries', 'Junk', 'Fuel', 'Bills'];

export const DEFAULT_ITEMS: CartItem[] = [
  { id: 'item-milk', name: 'Milk', price: 60, category: 'Groceries', icon: '🥛', quantity: 0 },
  { id: 'item-eggs', name: 'Eggs (6pc)', price: 70, category: 'Groceries', icon: '🥚', quantity: 0 },
  { id: 'item-rice', name: 'Rice 1kg', price: 90, category: 'Groceries', icon: '🍚', quantity: 0 },
  { id: 'item-chips', name: 'Chips', price: 30, category: 'Junk', icon: '🍟', quantity: 0 },
  { id: 'item-soda', name: 'Soda', price: 40, category: 'Junk', icon: '🥤', quantity: 0 },
  { id: 'item-chocolate', name: 'Chocolate', price: 50, category: 'Junk', icon: '🍫', quantity: 0 },
  { id: 'item-petrol', name: 'Petrol', price: 105, category: 'Fuel', icon: '⛽', quantity: 0 },
  { id: 'item-wifi', name: 'Wi-Fi Bill', price: 500, category: 'Bills', icon: '📶', quantity: 0 },
];

export const DEFAULT_CATEGORY_CAPS: CategoryCaps = {
  Groceries: null,
  Junk: null,
  Fuel: null,
  Bills: null,
};

export function generatePriceHistory(basePrice: number, now: Date = new Date()): PricePoint[] {
  const points: PricePoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 15);
    const variance = (Math.sin(i * 1.7) + Math.cos(i * 0.9)) * 0.08;
    const trend = (5 - i) * 0.02;
    const price = Math.round(basePrice * (0.82 + trend + variance) * 100) / 100;
    points.push({ date: d.toISOString(), price });
  }
  points.push({ date: now.toISOString(), price: basePrice });
  return points;
}

export function ensurePriceHistory(items: CartItem[], existing: PriceHistory = {}): PriceHistory {
  const next: PriceHistory = { ...existing };
  for (const item of items) {
    if (!next[item.id] || next[item.id].length === 0) {
      next[item.id] = generatePriceHistory(item.price);
    }
  }
  return next;
}

export function clampQuantity(current: number, delta: number): number {
  return Math.max(0, current + delta);
}

export function mergeBackupItems(
  importedCustomItems: CartItem[],
  defaults: CartItem[] = DEFAULT_ITEMS
): CartItem[] {
  const byId = new Map<string, CartItem>();
  for (const item of defaults) {
    byId.set(item.id, { ...item, quantity: 0 });
  }
  for (const item of importedCustomItems) {
    if (item && typeof item.id === 'string' && typeof item.name === 'string') {
      byId.set(item.id, {
        ...item,
        quantity: typeof item.quantity === 'number' && item.quantity >= 0 ? item.quantity : 0,
      });
    }
  }
  return Array.from(byId.values());
}

export function mergeCategories(
  importedCategories: string[] | undefined,
  items: CartItem[],
  transactions: { category: string }[]
): string[] {
  const set = new Set<string>(DEFAULT_CATEGORIES);
  for (const cat of importedCategories ?? []) {
    if (typeof cat === 'string' && cat.trim()) set.add(cat.trim());
  }
  for (const item of items) {
    if (item.category?.trim()) set.add(item.category.trim());
  }
  for (const tx of transactions) {
    if (tx.category?.trim()) set.add(tx.category.trim());
  }
  return Array.from(set);
}

export function normalizeBackupPayload(raw: unknown): BackupData {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid backup file format');
  }
  const data = raw as Partial<BackupData>;
  if (!data.version || !Array.isArray(data.transactions)) {
    throw new Error('Invalid backup file — missing required fields');
  }
  return {
    version: 1,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : new Date().toISOString(),
    transactions: data.transactions,
    customItems: Array.isArray(data.customItems) ? data.customItems : [],
    categories: Array.isArray(data.categories) ? data.categories : undefined,
    categoryConfigs: Array.isArray(data.categoryConfigs) ? data.categoryConfigs : undefined,
    priceHistory:
      data.priceHistory && typeof data.priceHistory === 'object' ? data.priceHistory : undefined,
    purchaseHistory: Array.isArray(data.purchaseHistory) ? data.purchaseHistory : undefined,
    totalBudget: typeof data.totalBudget === 'number' && data.totalBudget > 0 ? data.totalBudget : 5000,
    sessionBudget:
      typeof data.sessionBudget === 'number' && data.sessionBudget > 0 ? data.sessionBudget : null,
    categoryCaps:
      data.categoryCaps && typeof data.categoryCaps === 'object' ? data.categoryCaps : {},
    savedAudits: Array.isArray(data.savedAudits) ? data.savedAudits : [],
    people: Array.isArray(data.people) ? data.people : [],
    sharedExpenses: Array.isArray(data.sharedExpenses) ? data.sharedExpenses : [],
    settlements: Array.isArray(data.settlements) ? data.settlements : [],
    priceObservations: Array.isArray(data.priceObservations) ? data.priceObservations : undefined,
    priceAlerts: Array.isArray(data.priceAlerts) ? data.priceAlerts : undefined,
    isBrokeMode: typeof data.isBrokeMode === 'boolean' ? data.isBrokeMode : undefined,
    brokeModeConfig:
      data.brokeModeConfig && typeof data.brokeModeConfig === 'object'
        ? data.brokeModeConfig
        : undefined,
    categoryLimits: Array.isArray(data.categoryLimits) ? data.categoryLimits : undefined,
    warRoomChallenges: Array.isArray(data.warRoomChallenges) ? data.warRoomChallenges : undefined,
    warRoomTargets: Array.isArray(data.warRoomTargets) ? data.warRoomTargets : undefined,
    dismissedWarRoomAlerts: Array.isArray(data.dismissedWarRoomAlerts)
      ? data.dismissedWarRoomAlerts
      : undefined,
    disciplineCheckIns: Array.isArray(data.disciplineCheckIns) ? data.disciplineCheckIns : undefined,
    basketTemplates: Array.isArray(data.basketTemplates) ? data.basketTemplates : undefined,
    basketTemplatesSeeded:
      typeof data.basketTemplatesSeeded === 'boolean' ? data.basketTemplatesSeeded : undefined,
    theme: data.theme !== undefined ? sanitizeThemeMode(data.theme) : undefined,
    featureSettings:
      data.featureSettings !== undefined ? sanitizeFeatureSettings(data.featureSettings) : undefined,
    pennyMessages:
      data.pennyMessages !== undefined ? sanitizePennyMessages(data.pennyMessages) : undefined,
    pennyProfile:
      data.pennyProfile !== undefined ? sanitizePennyProfile(data.pennyProfile) : undefined,
    myUpiId: typeof data.myUpiId === 'string' ? data.myUpiId.trim().toLowerCase() : undefined,
    myUpiName: typeof data.myUpiName === 'string' ? data.myUpiName.trim() : undefined,
  };
}

