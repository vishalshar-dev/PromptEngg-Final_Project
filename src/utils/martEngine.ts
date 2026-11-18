import type {
  CartItem,
  CategoryConfig,
  PricePoint,
  PriceSource,
  RecurrenceConfig,
  Transaction,
} from '../types/models';
import { roundCurrency } from './splitLedgerEngine';

export type UnitFamily = 'weight' | 'volume' | 'count' | 'duration' | 'container' | 'unknown';

export interface ParsedUnitSpec {
  raw: string;
  qty: number;
  unitToken: string;
  family: UnitFamily;
  canonicalAmount: number; // amount expressed in canonical family unit (kg, L, pc, mo, or container count)
}

const WEIGHT_FACTORS: Record<string, number> = {
  mg: 0.000001,
  g: 0.001,
  gm: 0.001,
  gms: 0.001,
  gram: 0.001,
  grams: 0.001,
  kg: 1,
  kgs: 1,
  kilogram: 1,
  kilograms: 1,
};

const VOLUME_FACTORS: Record<string, number> = {
  ml: 0.001,
  millilitre: 0.001,
  millilitres: 0.001,
  milliliter: 0.001,
  milliliters: 0.001,
  l: 1,
  ltr: 1,
  ltrs: 1,
  litre: 1,
  litres: 1,
  liter: 1,
  liters: 1,
};

const COUNT_FACTORS: Record<string, number> = {
  pc: 1,
  pcs: 1,
  piece: 1,
  pieces: 1,
  egg: 1,
  eggs: 1,
  tab: 1,
  tabs: 1,
  tablet: 1,
  tablets: 1,
  unit: 1,
  units: 1,
  dozen: 12,
};

const DURATION_FACTORS: Record<string, number> = {
  d: 1 / 30,
  day: 1 / 30,
  days: 1 / 30,
  wk: 7 / 30,
  week: 7 / 30,
  weeks: 7 / 30,
  mo: 1,
  mon: 1,
  month: 1,
  months: 1,
  yr: 12,
  year: 12,
  years: 12,
};

const CONTAINER_TOKENS = new Set([
  'pack',
  'packs',
  'pkt',
  'pkts',
  'packet',
  'packets',
  'bottle',
  'bottles',
  'btl',
  'bar',
  'bars',
  'box',
  'boxes',
  'can',
  'cans',
  'pouch',
  'jar',
  'tube',
  'roll',
  'rolls',
  'pair',
  'pairs',
  'ticket',
  'tickets',
  'ride',
  'trip',
  'bill',
]);

function normalizeContainerToken(token: string): string {
  if (token.endsWith('es') && CONTAINER_TOKENS.has(token.slice(0, -2))) return token.slice(0, -2);
  if (token.endsWith('s') && CONTAINER_TOKENS.has(token.slice(0, -1))) return token.slice(0, -1);
  if (token === 'pkt' || token === 'pkts' || token === 'packet') return 'pack';
  if (token === 'btl') return 'bottle';
  return token;
}

export function parseUnitSpec(unit?: string | null): ParsedUnitSpec {
  const raw = (unit ?? '').trim();
  if (!raw) {
    return { raw: '1 unit', qty: 1, unitToken: 'unit', family: 'count', canonicalAmount: 1 };
  }

  const normalized = raw.toLowerCase().replace(/\s+/g, ' ');
  const match = normalized.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?$/i);
  const qty = match ? Math.max(0.0001, Number(match[1]) || 1) : 1;
  const rawToken = match ? (match[2] ?? 'unit') : normalized.replace(/[^a-z]/g, '') || 'unit';

  if (rawToken in WEIGHT_FACTORS) {
    return {
      raw,
      qty,
      unitToken: rawToken,
      family: 'weight',
      canonicalAmount: qty * WEIGHT_FACTORS[rawToken],
    };
  }
  if (rawToken in VOLUME_FACTORS) {
    return {
      raw,
      qty,
      unitToken: rawToken,
      family: 'volume',
      canonicalAmount: qty * VOLUME_FACTORS[rawToken],
    };
  }
  if (rawToken in COUNT_FACTORS) {
    return {
      raw,
      qty,
      unitToken: rawToken,
      family: 'count',
      canonicalAmount: qty * COUNT_FACTORS[rawToken],
    };
  }
  if (rawToken in DURATION_FACTORS) {
    return {
      raw,
      qty,
      unitToken: rawToken,
      family: 'duration',
      canonicalAmount: qty * DURATION_FACTORS[rawToken],
    };
  }
  if (CONTAINER_TOKENS.has(rawToken)) {
    return {
      raw,
      qty,
      unitToken: normalizeContainerToken(rawToken),
      family: 'container',
      canonicalAmount: qty,
    };
  }
  return {
    raw,
    qty,
    unitToken: rawToken,
    family: 'unknown',
    canonicalAmount: qty,
  };
}

export interface UnitCompatibilityResult {
  compatible: boolean;
  reason?: string;
  conversionMultiplier?: number; // multiply price of unitA by this to get equivalent price for unitB
}

export function areUnitsCompatible(unitA?: string | null, unitB?: string | null): UnitCompatibilityResult {
  if (!unitA && !unitB) {
    return { compatible: true, conversionMultiplier: 1 };
  }
  if (!unitA || !unitB) {
    // When a legacy point has no explicit unit, treat it as matching the target item unit
    return { compatible: true, conversionMultiplier: 1 };
  }

  const parsedA = parseUnitSpec(unitA);
  const parsedB = parseUnitSpec(unitB);

  if (parsedA.family !== parsedB.family) {
    return {
      compatible: false,
      reason: `Incompatible units: "${unitA}" (${parsedA.family}) vs "${unitB}" (${parsedB.family})`,
    };
  }

  if (parsedA.family === 'container' && parsedA.unitToken !== parsedB.unitToken) {
    return {
      compatible: false,
      reason: `Incompatible package types: "${unitA}" vs "${unitB}"`,
    };
  }

  if (parsedA.family === 'unknown' && parsedA.unitToken !== parsedB.unitToken) {
    return {
      compatible: false,
      reason: `Incompatible custom units: "${unitA}" vs "${unitB}"`,
    };
  }

  const conversionMultiplier = parsedB.canonicalAmount / parsedA.canonicalAmount;
  return { compatible: true, conversionMultiplier };
}

export interface NormalizedPricePoint extends PricePoint {
  normalizedPrice: number;
  effectiveSource: PriceSource;
}

export interface UnitPriceStats {
  compatiblePoints: NormalizedPricePoint[];
  excludedIncompatibleCount: number;
  userPurchaseCount: number;
  referenceCount: number;
  average: number;
  min: number;
  max: number;
  first: number;
  latest: number;
  deltaFromFirst: number;
  deltaPctFromFirst: number;
  deltaFromAvg: number;
  deltaPctFromAvg: number;
}

export function computeUnitPriceStats(
  points: PricePoint[],
  targetUnit?: string
): UnitPriceStats | null {
  if (!points || points.length === 0) return null;

  const compatiblePoints: NormalizedPricePoint[] = [];
  let excludedIncompatibleCount = 0;

  for (const pt of points) {
    const compat = areUnitsCompatible(pt.unit, targetUnit);
    if (!compat.compatible) {
      excludedIncompatibleCount += 1;
      continue;
    }
    const multiplier = compat.conversionMultiplier ?? 1;
    compatiblePoints.push({
      ...pt,
      normalizedPrice: roundCurrency(pt.price * multiplier),
      effectiveSource: pt.source ?? 'market_verified',
    });
  }

  if (compatiblePoints.length === 0) {
    return {
      compatiblePoints: [],
      excludedIncompatibleCount,
      userPurchaseCount: 0,
      referenceCount: 0,
      average: 0,
      min: 0,
      max: 0,
      first: 0,
      latest: 0,
      deltaFromFirst: 0,
      deltaPctFromFirst: 0,
      deltaFromAvg: 0,
      deltaPctFromAvg: 0,
    };
  }

  const sorted = [...compatiblePoints].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const prices = sorted.map((p) => p.normalizedPrice);
  const sum = prices.reduce((acc, p) => acc + p, 0);
  const average = roundCurrency(sum / prices.length);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const first = prices[0];
  const latest = prices[prices.length - 1];
  const deltaFromFirst = roundCurrency(latest - first);
  const deltaPctFromFirst = first > 0 ? roundCurrency((deltaFromFirst / first) * 100) : 0;
  const deltaFromAvg = roundCurrency(latest - average);
  const deltaPctFromAvg = average > 0 ? roundCurrency((deltaFromAvg / average) * 100) : 0;

  const userPurchaseCount = sorted.filter((p) => p.effectiveSource === 'user_purchase').length;
  const referenceCount = sorted.length - userPurchaseCount;

  return {
    compatiblePoints: sorted,
    excludedIncompatibleCount,
    userPurchaseCount,
    referenceCount,
    average,
    min,
    max,
    first,
    latest,
    deltaFromFirst,
    deltaPctFromFirst,
    deltaFromAvg,
    deltaPctFromAvg,
  };
}

export type ProductSortOption = 'default' | 'price_asc' | 'price_desc' | 'alpha_asc' | 'recent';

export interface ProductFilterOptions {
  query?: string;
  category?: string; // 'All' or category name
  minPrice?: number | null;
  maxPrice?: number | null;
  onlyFavourites?: boolean;
  onlyFrequent?: boolean;
  onlyRecent?: boolean;
  onlyRecurring?: boolean;
  sortBy?: ProductSortOption;
}

export function filterAndSortProducts(
  items: CartItem[],
  filters: ProductFilterOptions
): CartItem[] {
  const query = (filters.query ?? '').trim().toLowerCase();
  const category = filters.category && filters.category !== 'All' ? filters.category : null;
  const minPrice = filters.minPrice ?? null;
  const maxPrice = filters.maxPrice ?? null;

  const filtered = items.filter((item) => {
    if (category && item.category !== category) return false;
    if (minPrice !== null && item.price < minPrice) return false;
    if (maxPrice !== null && item.price > maxPrice) return false;
    if (filters.onlyFavourites && !item.isFavourite) return false;
    if (filters.onlyFrequent && !item.isFrequent && (item.purchaseCount ?? 0) < 2) return false;
    if (filters.onlyRecent && !item.lastPurchasedAt) return false;
    if (filters.onlyRecurring && !item.recurrence) return false;

    if (query) {
      const haystack = [
        item.name,
        item.category,
        item.productType ?? '',
        item.unit ?? '',
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });

  const sortBy = filters.sortBy ?? 'default';
  if (sortBy === 'default') return filtered;

  return [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'price_asc':
        return a.price - b.price || a.name.localeCompare(b.name);
      case 'price_desc':
        return b.price - a.price || a.name.localeCompare(b.name);
      case 'alpha_asc':
        return a.name.localeCompare(b.name);
      case 'recent': {
        const tA = a.lastPurchasedAt ? new Date(a.lastPurchasedAt).getTime() : 0;
        const tB = b.lastPurchasedAt ? new Date(b.lastPurchasedAt).getTime() : 0;
        return tB - tA || (b.purchaseCount ?? 0) - (a.purchaseCount ?? 0);
      }
      default:
        return 0;
    }
  });
}

export function getRecurrenceIntervalDays(recurrence: RecurrenceConfig): number {
  switch (recurrence.frequency) {
    case 'daily':
      return 1;
    case 'weekly':
      return 7;
    case 'monthly':
      return 30;
    case 'custom':
      return Math.max(1, Math.round(recurrence.intervalDays ?? 7));
  }
}

export function toLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getNextDueDateString(
  recurrence: RecurrenceConfig,
  fromDate: Date = new Date()
): string {
  const days = getRecurrenceIntervalDays(recurrence);
  const next = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate() + days);
  return toLocalDateKey(next);
}

export function isRecurringItemDue(item: CartItem, now: Date = new Date()): boolean {
  if (!item.recurrence) return false;
  const todayKey = toLocalDateKey(now);

  if (item.recurrence.nextDueDate) {
    return item.recurrence.nextDueDate.slice(0, 10) <= todayKey;
  }

  if (item.recurrence.lastAddedAt) {
    const last = new Date(item.recurrence.lastAddedAt);
    const diffDays = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= getRecurrenceIntervalDays(item.recurrence);
  }

  return true;
}

export function getDueRecurringItems(items: CartItem[], now: Date = new Date()): CartItem[] {
  return items.filter((item) => isRecurringItemDue(item, now));
}

export function calculateMonthlyShoppingSpend(
  transactions: Transaction[],
  now: Date = new Date()
): number {
  const targetYear = now.getFullYear();
  const targetMonth = now.getMonth();
  let total = 0;
  for (const tx of transactions) {
    const d = new Date(tx.timestamp);
    if (!Number.isNaN(d.getTime()) && d.getFullYear() === targetYear && d.getMonth() === targetMonth) {
      total += tx.amount;
    }
  }
  return roundCurrency(total);
}

export interface CheckoutBreakdown {
  items: CartItem[];
  totalAmount: number;
  totalCount: number;
  categoryTotals: Record<string, number>;
  dominantCategory: string;
  summaryTitle: string;
}

export function buildCheckoutBreakdown(items: CartItem[]): CheckoutBreakdown {
  const cartItems = items.filter((i) => i.quantity > 0);
  const categoryTotals: Record<string, number> = {};
  let totalAmount = 0;
  let totalCount = 0;

  for (const item of cartItems) {
    const sub = roundCurrency(item.price * item.quantity);
    totalAmount += sub;
    totalCount += item.quantity;
    categoryTotals[item.category] = roundCurrency((categoryTotals[item.category] ?? 0) + sub);
  }

  totalAmount = roundCurrency(totalAmount);

  let dominantCategory = cartItems[0]?.category ?? 'Groceries';
  let bestVal = -1;
  for (const [cat, amt] of Object.entries(categoryTotals)) {
    if (amt > bestVal) {
      bestVal = amt;
      dominantCategory = cat;
    }
  }

  const labelItems = cartItems.slice(0, 3).map((i) => i.name).join(', ');
  const summaryTitle =
    cartItems.length === 0
      ? 'Empty Cart'
      : cartItems.length > 3
      ? `Mart: ${labelItems} +${cartItems.length - 3}`
      : `Mart: ${labelItems}`;

  return {
    items: cartItems,
    totalAmount,
    totalCount,
    categoryTotals,
    dominantCategory,
    summaryTitle,
  };
}

export function buildCheckoutSignature(
  items: CartItem[],
  splitSignature?: string
): string {
  const itemPart = items
    .filter((i) => i.quantity > 0)
    .map((i) => `${i.id}:${i.quantity}@${i.price}`)
    .sort()
    .join('|');
  return `${itemPart}__${splitSignature ?? 'nosplit'}`;
}

export function isDuplicateCheckoutAttempt(
  lastMeta: { signature: string; at: number } | null | undefined,
  signature: string,
  nowMs: number,
  windowMs: number = 3000
): boolean {
  if (!lastMeta) return false;
  return lastMeta.signature === signature && nowMs - lastMeta.at <= windowMs;
}

export function reorderCategoryList(
  configs: CategoryConfig[],
  fromIndex: number,
  toIndex: number
): CategoryConfig[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= configs.length ||
    toIndex >= configs.length ||
    fromIndex === toIndex
  ) {
    return configs;
  }
  const copy = [...configs];
  const [moved] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, moved);
  return copy.map((cat, idx) => ({ ...cat, order: idx }));
}
