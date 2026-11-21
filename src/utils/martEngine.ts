import type {
  BasketTemplate,
  BasketTemplateItem,
  CartItem,
  CartLineItem,
  CategoryConfig,
  PriceHistory,
  PricePoint,
  PriceSource,
  ProductVariant,
  PurchaseSession,
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

export function roundQuantity(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value * 100) / 100);
}

export function getDefaultQuantityStep(
  item: Pick<CartItem, 'allowDecimalQuantity' | 'quantityStep'>
): number {
  if (typeof item.quantityStep === 'number' && Number.isFinite(item.quantityStep) && item.quantityStep > 0) {
    return roundQuantity(item.quantityStep);
  }
  return item.allowDecimalQuantity ? 0.5 : 1;
}

export function getActiveVariant(
  item: Pick<CartItem, 'variants' | 'selectedVariantId'>,
  variantId?: string | null
): ProductVariant | null {
  if (!item.variants || item.variants.length === 0) return null;
  const targetId = variantId ?? item.selectedVariantId;
  if (targetId) {
    const found = item.variants.find((v) => v.id === targetId);
    if (found) return found;
  }
  return item.variants[0];
}

export function getEffectivePriceAndUnit(
  item: CartItem,
  variantId?: string | null
): { price: number; unit: string; variant: ProductVariant | null } {
  const variant = getActiveVariant(item, variantId);
  if (variant) {
    return {
      price: variant.price,
      unit: variant.unit,
      variant,
    };
  }
  return {
    price: item.price,
    unit: item.unit || '1 unit',
    variant: null,
  };
}

export function getItemVariantCartQty(item: CartItem, variantId?: string | null): number {
  if (!item.variants || item.variants.length === 0) {
    return roundQuantity(item.quantity);
  }
  const active = getActiveVariant(item, variantId);
  if (!active) return roundQuantity(item.quantity);
  if (item.variantQuantities && active.id in item.variantQuantities) {
    return roundQuantity(item.variantQuantities[active.id] ?? 0);
  }
  // Backward compat if an item with variants has quantity > 0 without variantQuantities map
  if (
    item.quantity > 0 &&
    (!item.variantQuantities || Object.keys(item.variantQuantities).length === 0) &&
    active.id === (item.selectedVariantId ?? item.variants[0].id)
  ) {
    return roundQuantity(item.quantity);
  }
  return 0;
}

export function expandCartLines(items: CartItem[]): CartLineItem[] {
  const lines: CartLineItem[] = [];
  for (const item of items) {
    if (item.variants && item.variants.length > 0 && item.variantQuantities) {
      let matchedAnyVariant = false;
      for (const variant of item.variants) {
        const qty = roundQuantity(item.variantQuantities[variant.id] ?? 0);
        if (qty > 0) {
          matchedAnyVariant = true;
          lines.push({
            lineKey: `${item.id}::${variant.id}`,
            item,
            variantId: variant.id,
            variantLabel: variant.label,
            unit: variant.unit,
            price: variant.price,
            quantity: qty,
            subtotal: roundCurrency(variant.price * qty),
          });
        }
      }
      if (matchedAnyVariant) continue;
    }

    const qty = roundQuantity(item.quantity);
    if (qty > 0) {
      const variant = getActiveVariant(item);
      const price = variant ? variant.price : item.price;
      const unit = variant ? variant.unit : item.unit || '1 unit';
      lines.push({
        lineKey: variant ? `${item.id}::${variant.id}` : item.id,
        item,
        variantId: variant?.id,
        variantLabel: variant?.label,
        unit,
        price,
        quantity: qty,
        subtotal: roundCurrency(price * qty),
      });
    }
  }
  return lines;
}

export function calculateCartTotals(items: CartItem[]): {
  lines: CartLineItem[];
  totalAmount: number;
  totalUnits: number;
  lineCount: number;
  uniqueProducts: number;
} {
  const lines = expandCartLines(items);
  const totalAmount = roundCurrency(lines.reduce((s, l) => s + l.subtotal, 0));
  const totalUnits = roundQuantity(lines.reduce((s, l) => s + l.quantity, 0));
  const uniqueProducts = new Set(lines.map((l) => l.item.id)).size;
  return {
    lines,
    totalAmount,
    totalUnits,
    lineCount: lines.length,
    uniqueProducts,
  };
}

export function getPriceHistoryKey(itemId: string, variantId?: string | null): string {
  return variantId ? `${itemId}::${variantId}` : itemId;
}

export function getPriceHistoryPointsForItem(
  priceHistory: PriceHistory,
  item: Pick<CartItem, 'id' | 'variants' | 'selectedVariantId'>,
  variantId?: string | null
): PricePoint[] {
  const active = getActiveVariant(item, variantId);
  if (active) {
    const scopedKey = getPriceHistoryKey(item.id, active.id);
    if (priceHistory[scopedKey] && priceHistory[scopedKey].length > 0) {
      return priceHistory[scopedKey];
    }
    const isPrimary = item.variants && item.variants[0]?.id === active.id;
    if (isPrimary && priceHistory[item.id] && priceHistory[item.id].length > 0) {
      return priceHistory[item.id];
    }
    return [];
  }
  return priceHistory[item.id] ?? [];
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

export type ProductSortOption =
  | 'default'
  | 'price_asc'
  | 'price_desc'
  | 'alpha_asc'
  | 'recent'
  | 'frequent'
  | 'newest';

export interface ProductFilterOptions {
  query?: string;
  category?: string; // 'All' or category name
  subcategory?: string; // 'All' or subcategory name
  brand?: string; // 'All' or brand name
  productType?: string; // 'All' or productType
  minPrice?: number | null;
  maxPrice?: number | null;
  onlyFavourites?: boolean;
  onlyFrequent?: boolean;
  onlyRecent?: boolean;
  onlyRecurring?: boolean;
  sortBy?: ProductSortOption;
}

export function getSearchableProductText(item: CartItem): string {
  const variantText = (item.variants ?? []).map((v) => `${v.label} ${v.unit}`).join(' ');
  const tagText = (item.tags ?? []).join(' ');
  return [
    item.name,
    item.brand ?? '',
    item.category,
    item.subcategory ?? '',
    item.productType ?? '',
    item.description ?? '',
    item.unit ?? '',
    tagText,
    variantText,
  ]
    .join(' ')
    .toLowerCase();
}

export function filterAndSortProducts(
  items: CartItem[],
  filters: ProductFilterOptions
): CartItem[] {
  const rawQuery = (filters.query ?? '').trim().toLowerCase();
  const queryTokens = rawQuery ? rawQuery.split(/\s+/).filter(Boolean) : [];
  const category = filters.category && filters.category !== 'All' ? filters.category : null;
  const subcategory =
    filters.subcategory && filters.subcategory !== 'All' ? filters.subcategory : null;
  const brand = filters.brand && filters.brand !== 'All' ? filters.brand : null;
  const productType =
    filters.productType && filters.productType !== 'All' ? filters.productType : null;
  const minPrice = filters.minPrice ?? null;
  const maxPrice = filters.maxPrice ?? null;

  const filtered = items.filter((item) => {
    if (category && item.category !== category) return false;
    if (subcategory && (item.subcategory ?? '').toLowerCase() !== subcategory.toLowerCase()) {
      return false;
    }
    if (brand && (item.brand ?? '').toLowerCase() !== brand.toLowerCase()) return false;
    if (productType && (item.productType ?? '').toLowerCase() !== productType.toLowerCase()) {
      return false;
    }

    const { price: effectivePrice } = getEffectivePriceAndUnit(item);
    if (minPrice !== null && effectivePrice < minPrice) return false;
    if (maxPrice !== null && effectivePrice > maxPrice) return false;
    if (filters.onlyFavourites && !item.isFavourite) return false;
    if (filters.onlyFrequent && !item.isFrequent && (item.purchaseCount ?? 0) < 2) return false;
    if (filters.onlyRecent && !item.lastPurchasedAt) return false;
    if (filters.onlyRecurring && !item.recurrence) return false;

    if (queryTokens.length > 0) {
      const haystack = getSearchableProductText(item);
      if (!queryTokens.every((token) => haystack.includes(token))) return false;
    }

    return true;
  });

  const sortBy = filters.sortBy ?? 'default';
  if (sortBy === 'default') return filtered;

  return [...filtered].sort((a, b) => {
    const priceA = getEffectivePriceAndUnit(a).price;
    const priceB = getEffectivePriceAndUnit(b).price;
    switch (sortBy) {
      case 'price_asc':
        return priceA - priceB || a.name.localeCompare(b.name);
      case 'price_desc':
        return priceB - priceA || a.name.localeCompare(b.name);
      case 'alpha_asc':
        return a.name.localeCompare(b.name);
      case 'frequent':
        return (
          (b.purchaseCount ?? 0) - (a.purchaseCount ?? 0) ||
          Number(Boolean(b.isFrequent)) - Number(Boolean(a.isFrequent)) ||
          a.name.localeCompare(b.name)
        );
      case 'newest': {
        const cA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const cB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return cB - cA || Number(Boolean(b.isCustom)) - Number(Boolean(a.isCustom));
      }
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

export interface SearchSuggestion {
  type: 'product' | 'category' | 'brand';
  label: string;
  sublabel?: string;
  query: string;
  item?: CartItem;
}

export function getSearchSuggestions(
  items: CartItem[],
  query: string,
  limit: number = 8
): SearchSuggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const suggestions: SearchSuggestion[] = [];
  const seenLabels = new Set<string>();

  for (const item of items) {
    if (item.name.toLowerCase().includes(q) || (item.tags ?? []).some((t) => t.toLowerCase().includes(q))) {
      const key = `p:${item.id}`;
      if (!seenLabels.has(key)) {
        seenLabels.add(key);
        suggestions.push({
          type: 'product',
          label: item.name,
          sublabel: [item.brand, item.category].filter(Boolean).join(' · '),
          query: item.name,
          item,
        });
      }
    }
    if (suggestions.length >= limit) return suggestions;
  }

  for (const item of items) {
    if (item.brand && item.brand.toLowerCase().includes(q)) {
      const key = `b:${item.brand.toLowerCase()}`;
      if (!seenLabels.has(key)) {
        seenLabels.add(key);
        suggestions.push({
          type: 'brand',
          label: item.brand,
          sublabel: 'Brand',
          query: item.brand,
        });
      }
    }
    if (item.category.toLowerCase().includes(q)) {
      const key = `c:${item.category.toLowerCase()}`;
      if (!seenLabels.has(key)) {
        seenLabels.add(key);
        suggestions.push({
          type: 'category',
          label: item.category,
          sublabel: 'Category',
          query: item.category,
        });
      }
    }
    if (suggestions.length >= limit) break;
  }

  return suggestions.slice(0, limit);
}

export interface FrequentlyPurchasedInsight {
  item: CartItem;
  purchaseCount: number;
  orderCount: number;
  lastPurchasedAt: string;
  lastPaidPrice: number;
  currentPrice: number;
  priceDiff: number;
  lastVariantId?: string;
  lastVariantLabel?: string;
}

export function computeFrequentlyPurchasedInsights(
  items: CartItem[],
  purchaseHistory: PurchaseSession[],
  limit: number = 8
): FrequentlyPurchasedInsight[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const agg = new Map<
    string,
    {
      item: CartItem;
      purchaseCount: number;
      orderCount: number;
      lastPurchasedAt: string;
      lastPaidPrice: number;
      lastVariantId?: string;
      lastVariantLabel?: string;
    }
  >();

  // Sort oldest-to-newest so latest purchase naturally overwrites lastPaidPrice & lastVariant
  const sortedSessions = [...purchaseHistory].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  for (const session of sortedSessions) {
    const seenInSession = new Set<string>();
    for (const sItem of session.items) {
      const catalogItem = byId.get(sItem.itemId);
      if (!catalogItem) continue;
      const existing = agg.get(sItem.itemId);
      const isNewOrder = !seenInSession.has(sItem.itemId);
      seenInSession.add(sItem.itemId);

      if (!existing) {
        agg.set(sItem.itemId, {
          item: catalogItem,
          purchaseCount: roundQuantity(sItem.quantity),
          orderCount: 1,
          lastPurchasedAt: session.timestamp,
          lastPaidPrice: sItem.price,
          lastVariantId: sItem.variantId,
          lastVariantLabel: sItem.variantLabel,
        });
      } else {
        agg.set(sItem.itemId, {
          item: catalogItem,
          purchaseCount: roundQuantity(existing.purchaseCount + sItem.quantity),
          orderCount: existing.orderCount + (isNewOrder ? 1 : 0),
          lastPurchasedAt: session.timestamp,
          lastPaidPrice: sItem.price,
          lastVariantId: sItem.variantId ?? existing.lastVariantId,
          lastVariantLabel: sItem.variantLabel ?? existing.lastVariantLabel,
        });
      }
    }
  }

  // Fallback for items that recorded lastPurchasedAt / purchaseCount on item itself without session history
  for (const item of items) {
    if (!agg.has(item.id) && (item.purchaseCount ?? 0) > 0 && item.lastPurchasedAt) {
      const { price, variant } = getEffectivePriceAndUnit(item);
      agg.set(item.id, {
        item,
        purchaseCount: roundQuantity(item.purchaseCount ?? 1),
        orderCount: 1,
        lastPurchasedAt: item.lastPurchasedAt,
        lastPaidPrice: price,
        lastVariantId: variant?.id,
        lastVariantLabel: variant?.label,
      });
    }
  }

  return Array.from(agg.values())
    .map((entry) => {
      const { price: currentPrice } = getEffectivePriceAndUnit(
        entry.item,
        entry.lastVariantId
      );
      return {
        ...entry,
        currentPrice,
        priceDiff: roundCurrency(currentPrice - entry.lastPaidPrice),
      };
    })
    .sort(
      (a, b) =>
        b.orderCount - a.orderCount ||
        b.purchaseCount - a.purchaseCount ||
        new Date(b.lastPurchasedAt).getTime() - new Date(a.lastPurchasedAt).getTime()
    )
    .slice(0, limit);
}

export function computeRecentlyPurchasedItems(
  items: CartItem[],
  purchaseHistory: PurchaseSession[],
  limit: number = 8
): FrequentlyPurchasedInsight[] {
  const allPurchased = computeFrequentlyPurchasedInsights(items, purchaseHistory, 200);
  return allPurchased
    .sort(
      (a, b) =>
        new Date(b.lastPurchasedAt).getTime() - new Date(a.lastPurchasedAt).getTime()
    )
    .slice(0, limit);
}

export function isRecurringBillItem(item: CartItem): boolean {
  const catLower = item.category.toLowerCase();
  const typeLower = (item.productType ?? '').toLowerCase();
  return (
    catLower.includes('bill') ||
    catLower.includes('utilit') ||
    catLower.includes('entertainment') ||
    typeLower.includes('bill') ||
    typeLower.includes('subscription') ||
    typeLower.includes('telecom') ||
    typeLower.includes('broadband')
  );
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

export interface RunningLowItem {
  item: CartItem;
  daysUntilDue: number;
  statusLabel: string;
}

export function computeRunningLowItems(
  items: CartItem[],
  now: Date = new Date()
): RunningLowItem[] {
  const todayMidday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0).getTime();
  const dayMs = 1000 * 60 * 60 * 24;
  const results: RunningLowItem[] = [];

  for (const item of items) {
    if (!item.recurrence) continue;
    let dueMidday: number;
    if (item.recurrence.nextDueDate) {
      const m = item.recurrence.nextDueDate.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!m) continue;
      dueMidday = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0).getTime();
    } else if (item.recurrence.lastAddedAt) {
      const last = new Date(item.recurrence.lastAddedAt);
      const interval = getRecurrenceIntervalDays(item.recurrence);
      dueMidday = new Date(
        last.getFullYear(),
        last.getMonth(),
        last.getDate() + interval,
        12,
        0,
        0,
        0
      ).getTime();
    } else {
      dueMidday = todayMidday;
    }

    const daysUntilDue = Math.round((dueMidday - todayMidday) / dayMs);
    if (daysUntilDue <= 2) {
      const statusLabel =
        daysUntilDue < 0
          ? `Overdue ${Math.abs(daysUntilDue)}d`
          : daysUntilDue === 0
            ? 'Due today'
            : daysUntilDue === 1
              ? 'Due tomorrow'
              : `Due in ${daysUntilDue}d`;
      results.push({ item, daysUntilDue, statusLabel });
    }
  }

  return results.sort(
    (a, b) => a.daysUntilDue - b.daysUntilDue || a.item.name.localeCompare(b.item.name)
  );
}

export function getEffectiveTransactionAmount(tx: Transaction): number {
  if (!tx) return 0;
  if (tx.status === 'cancelled') return 0;
  if (tx.status === 'refunded') {
    const refunded = typeof tx.refundAmount === 'number' && Number.isFinite(tx.refundAmount)
      ? tx.refundAmount
      : tx.amount;
    return roundCurrency(Math.max(0, tx.amount - refunded));
  }
  return Number.isFinite(tx.amount) ? roundCurrency(Math.max(0, tx.amount)) : 0;
}

export function calculateMonthlyShoppingSpend(
  transactions: Transaction[],
  now: Date = new Date()
): number {
  const targetYear = now.getFullYear();
  const targetMonth = now.getMonth();
  let total = 0;
  for (const tx of transactions) {
    const effective = getEffectiveTransactionAmount(tx);
    if (effective <= 0 && tx.status === 'cancelled') continue;
    const d = new Date(tx.timestamp);
    if (!Number.isNaN(d.getTime()) && d.getFullYear() === targetYear && d.getMonth() === targetMonth) {
      total += effective;
    }
  }
  return roundCurrency(total);
}

export interface CheckoutBreakdown {
  items: CartItem[];
  lines: CartLineItem[];
  totalAmount: number;
  totalCount: number;
  categoryTotals: Record<string, number>;
  dominantCategory: string;
  summaryTitle: string;
}

export function buildCheckoutBreakdown(items: CartItem[]): CheckoutBreakdown {
  const lines = expandCartLines(items);
  const cartItems = items.filter((i) => i.quantity > 0);
  const categoryTotals: Record<string, number> = {};
  let totalAmount = 0;
  let totalCount = 0;

  for (const line of lines) {
    totalAmount += line.subtotal;
    totalCount = roundQuantity(totalCount + line.quantity);
    categoryTotals[line.item.category] = roundCurrency(
      (categoryTotals[line.item.category] ?? 0) + line.subtotal
    );
  }

  totalAmount = roundCurrency(totalAmount);

  let dominantCategory = lines[0]?.item.category ?? cartItems[0]?.category ?? 'Groceries';
  let bestVal = -1;
  for (const [cat, amt] of Object.entries(categoryTotals)) {
    if (amt > bestVal) {
      bestVal = amt;
      dominantCategory = cat;
    }
  }

  const labelItems = lines
    .slice(0, 3)
    .map((l) => (l.variantLabel ? `${l.item.name} (${l.variantLabel})` : l.item.name))
    .join(', ');
  const summaryTitle =
    lines.length === 0
      ? 'Empty Cart'
      : lines.length > 3
      ? `Mart: ${labelItems} +${lines.length - 3}`
      : `Mart: ${labelItems}`;

  return {
    items: cartItems,
    lines,
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
  const lines = expandCartLines(items);
  const itemPart = lines
    .map((l) => `${l.lineKey}:${l.quantity}@${l.price}`)
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

export interface EvaluatedBasketLine {
  templateItem: BasketTemplateItem;
  catalogItem: CartItem | null;
  currentPrice: number;
  savedPrice: number;
  currentSubtotal: number;
  savedSubtotal: number;
  unitPriceDiff: number;
  lineDiff: number;
  isMissingFromCatalog: boolean;
}

export interface EvaluatedBasketTemplate {
  basket: BasketTemplate;
  lines: EvaluatedBasketLine[];
  savedTotal: number;
  currentTotal: number;
  priceDiff: number;
  priceDiffPct: number;
  totalUnits: number;
  lineCount: number;
  missingItemsCount: number;
}

export function computeBasketSavedTotal(basketItems: BasketTemplateItem[]): number {
  return roundCurrency(
    basketItems.reduce((sum, item) => sum + item.savedPrice * roundQuantity(item.quantity), 0)
  );
}

export function buildBasketItemsFromCart(items: CartItem[]): BasketTemplateItem[] {
  const lines = expandCartLines(items);
  return lines.map((line) => ({
    itemId: line.item.id,
    name: line.item.name,
    brand: line.item.brand,
    category: line.item.category,
    subcategory: line.item.subcategory,
    variantId: line.variantId,
    variantLabel: line.variantLabel,
    unit: line.unit,
    quantity: roundQuantity(line.quantity),
    savedPrice: line.price,
  }));
}

export function buildBasketItemsFromSession(
  session: PurchaseSession,
  catalogItems: CartItem[]
): BasketTemplateItem[] {
  const byId = new Map(catalogItems.map((i) => [i.id, i]));
  return session.items.map((sItem) => {
    const catalog = byId.get(sItem.itemId);
    const variant = catalog ? getActiveVariant(catalog, sItem.variantId) : null;
    return {
      itemId: sItem.itemId,
      name: catalog?.name ?? sItem.name,
      brand: catalog?.brand ?? sItem.brand,
      category: catalog?.category ?? sItem.category,
      subcategory: catalog?.subcategory ?? sItem.subcategory,
      variantId: variant?.id ?? sItem.variantId,
      variantLabel: variant?.label ?? sItem.variantLabel,
      unit: variant?.unit ?? sItem.unit ?? catalog?.unit ?? '1 unit',
      quantity: roundQuantity(sItem.quantity),
      savedPrice: sItem.price,
    };
  });
}

export function evaluateBasketTemplate(
  basket: BasketTemplate,
  catalogItems: CartItem[]
): EvaluatedBasketTemplate {
  const byId = new Map(catalogItems.map((i) => [i.id, i]));
  let savedTotal = 0;
  let currentTotal = 0;
  let totalUnits = 0;
  let missingItemsCount = 0;

  const lines: EvaluatedBasketLine[] = basket.items.map((tplItem) => {
    const qty = roundQuantity(tplItem.quantity);
    const catalogItem = byId.get(tplItem.itemId) ?? null;
    const isMissingFromCatalog = !catalogItem;
    if (isMissingFromCatalog) {
      missingItemsCount += 1;
    }

    let currentPrice = tplItem.savedPrice;
    if (catalogItem) {
      const resolvedVariant = tplItem.variantId
        ? catalogItem.variants?.find((v) => v.id === tplItem.variantId) ?? null
        : null;
      if (resolvedVariant) {
        currentPrice = resolvedVariant.price;
      } else if (!tplItem.variantId) {
        currentPrice = getEffectivePriceAndUnit(catalogItem).price;
      } else {
        // Specific saved variant was removed even if product exists; use effective catalog price
        currentPrice = getEffectivePriceAndUnit(catalogItem).price;
      }
    }

    const savedSubtotal = roundCurrency(tplItem.savedPrice * qty);
    const currentSubtotal = roundCurrency(currentPrice * qty);
    savedTotal += savedSubtotal;
    currentTotal += currentSubtotal;
    totalUnits = roundQuantity(totalUnits + qty);

    return {
      templateItem: tplItem,
      catalogItem,
      currentPrice,
      savedPrice: tplItem.savedPrice,
      currentSubtotal,
      savedSubtotal,
      unitPriceDiff: roundCurrency(currentPrice - tplItem.savedPrice),
      lineDiff: roundCurrency(currentSubtotal - savedSubtotal),
      isMissingFromCatalog,
    };
  });

  savedTotal = roundCurrency(savedTotal);
  currentTotal = roundCurrency(currentTotal);
  const priceDiff = roundCurrency(currentTotal - savedTotal);
  const priceDiffPct = savedTotal > 0 ? roundCurrency((priceDiff / savedTotal) * 100) : 0;

  return {
    basket,
    lines,
    savedTotal,
    currentTotal,
    priceDiff,
    priceDiffPct,
    totalUnits,
    lineCount: lines.length,
    missingItemsCount,
  };
}

export function applyBasketTemplateToItems(
  catalogItems: CartItem[],
  basket: BasketTemplate,
  mode: 'merge' | 'replace' = 'merge'
): { nextItems: CartItem[]; loadedLinesCount: number } {
  const working: CartItem[] = catalogItems.map((item) =>
    mode === 'replace'
      ? { ...item, quantity: 0, variantQuantities: undefined }
      : {
          ...item,
          variantQuantities: item.variantQuantities ? { ...item.variantQuantities } : undefined,
        }
  );

  const indexById = new Map(working.map((item, idx) => [item.id, idx]));
  let loadedLinesCount = 0;

  for (const tplItem of basket.items) {
    const qtyToAdd = roundQuantity(tplItem.quantity);
    if (qtyToAdd <= 0) continue;
    loadedLinesCount += 1;

    const existingIdx = indexById.get(tplItem.itemId);
    if (existingIdx !== undefined) {
      const existing = working[existingIdx];
      const matchedVariant = tplItem.variantId
        ? existing.variants?.find((v) => v.id === tplItem.variantId) ?? getActiveVariant(existing)
        : getActiveVariant(existing);

      if (matchedVariant && existing.variants && existing.variants.length > 0) {
        const prevMap = { ...(existing.variantQuantities ?? {}) };
        if (
          mode === 'merge' &&
          existing.quantity > 0 &&
          Object.keys(prevMap).length === 0
        ) {
          const legacyVarId = existing.selectedVariantId ?? existing.variants[0].id;
          prevMap[legacyVarId] = existing.quantity;
        }
        prevMap[matchedVariant.id] = roundQuantity((prevMap[matchedVariant.id] ?? 0) + qtyToAdd);
        const total = roundQuantity(Object.values(prevMap).reduce((s, q) => s + q, 0));
        working[existingIdx] = {
          ...existing,
          selectedVariantId: matchedVariant.id,
          price: matchedVariant.price,
          unit: matchedVariant.unit,
          variantQuantities: prevMap,
          quantity: total,
        };
      } else {
        working[existingIdx] = {
          ...existing,
          quantity: roundQuantity(existing.quantity + qtyToAdd),
        };
      }
    } else {
      const recreated: CartItem = {
        id: tplItem.itemId,
        name: tplItem.name,
        brand: tplItem.brand,
        price: tplItem.savedPrice,
        category: tplItem.category,
        subcategory: tplItem.subcategory,
        icon: '📦',
        unit: tplItem.unit || '1 unit',
        quantity: qtyToAdd,
        isCustom: true,
        selectedVariantId: tplItem.variantId,
        variants: tplItem.variantId
          ? [
              {
                id: tplItem.variantId,
                label: tplItem.variantLabel || tplItem.unit || 'Standard',
                unit: tplItem.unit || '1 unit',
                price: tplItem.savedPrice,
              },
            ]
          : undefined,
        variantQuantities: tplItem.variantId ? { [tplItem.variantId]: qtyToAdd } : undefined,
      };
      working.unshift(recreated);
      indexById.clear();
      working.forEach((it, idx) => indexById.set(it.id, idx));
    }
  }

  return { nextItems: working, loadedLinesCount };
}

