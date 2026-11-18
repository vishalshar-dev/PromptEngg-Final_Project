import type {
  CartItem,
  ParsedReceipt,
  PriceAlert,
  PriceEntryKind,
  PriceObservation,
  PriceObservationSource,
  PriceTimeframe,
  TriggeredPriceAlert,
} from '../types/models';
import { areUnitsCompatible, parseUnitSpec } from './martEngine';
import { roundCurrency } from './splitLedgerEngine';

const KNOWN_BRANDS = [
  'Mother Dairy',
  'Harvest Gold',
  'India Gate',
  'Surf Excel',
  'Coca Cola',
  'Reliance',
  'Britannia',
  'Aashirvaad',
  'Haldiram\'s',
  'Haldiram',
  'Cadbury',
  'Nescafe',
  'Fortune',
  'Saffola',
  'Nandini',
  'Colgate',
  'Kurkure',
  'Daawat',
  'Dettol',
  'Nestle',
  'Aavin',
  'Lay\'s',
  'Lays',
  'Maggi',
  'Ariel',
  'Pepsi',
  'Amul',
  'Tata',
  'Tide',
  'Bru',
  'Vim',
];

const KEYWORD_SYNONYMS: Record<string, string[]> = {
  atta: ['wheat', 'flour'],
  milk: ['dairy', 'taaza', 'toned', 'full cream'],
  bread: ['wheat bread', 'brown bread', 'loaf'],
  oil: ['sunflower', 'cooking oil', 'refined oil'],
  dal: ['pulses', 'toor', 'lentils'],
  chips: ['lays', 'lay\'s', 'kettle', 'classic salted'],
  petrol: ['fuel', 'gasoline', 'unleaded'],
  wifi: ['broadband', 'fiber', 'internet'],
  rice: ['basmati', 'sona masoori'],
  butter: ['salted butter', 'table butter'],
  cheese: ['cheddar', 'mozzarella'],
  egg: ['eggs', 'poultry'],
  eggs: ['egg', 'poultry'],
  coffee: ['filter coffee', 'nescafe', 'bru'],
};

const STOP_WORDS = new Set([
  'the',
  'and',
  'with',
  'for',
  'pack',
  'fresh',
  'classic',
  'original',
  'regular',
  'standard',
  'gold',
  'taaza',
  'toned',
  'brown',
  'white',
  'salted',
]);

export interface ExtractedProductInfo {
  cleanName: string;
  brand?: string;
  packageSize: string;
  embeddedQuantity: number;
}

export function extractProductInfo(
  rawName: string,
  explicitBrand?: string,
  explicitPackageSize?: string
): ExtractedProductInfo {
  let working = rawName.trim().replace(/\s+/g, ' ');
  let embeddedQuantity = 1;

  // Detect leading "2 x " or "2x "
  const leadQtyMatch = working.match(/^(\d+)\s*[xX×]\s+(.+)$/);
  if (leadQtyMatch) {
    embeddedQuantity = Math.max(1, Number(leadQtyMatch[1]) || 1);
    working = leadQtyMatch[2].trim();
  }

  // Extract trailing/parenthetical package size like "500ml", "1 L", "1kg", "6 pcs", "(500 g)"
  let detectedSize: string | null = null;
  const sizeRegex =
    /(?:\(|\[)?\b(\d+(?:\.\d+)?)\s*(kg|kgs|kilogram|kilograms|g|gm|gms|gram|grams|mg|l|ltr|ltrs|litre|litres|liter|liters|ml|pc|pcs|piece|pieces|dozen|pack|packs|pkt|pkts|bottle|bottles|bar|bars|box|boxes|can|cans|roll|rolls|pair|pairs|tab|tabs|tablet|tablets|egg|eggs|mo|month|months|unit|units)\b(?:\)|\])?/i;

  const sizeMatch = working.match(sizeRegex);
  if (sizeMatch) {
    const qtyNum = sizeMatch[1];
    const unitToken = sizeMatch[2];
    detectedSize = `${qtyNum} ${normalizeDisplayUnitToken(unitToken)}`;
    working = working.replace(sizeMatch[0], ' ').replace(/\s+/g, ' ').trim();
  }

  // Extract brand if known
  let detectedBrand = explicitBrand?.trim() || undefined;
  if (!detectedBrand) {
    for (const candidate of KNOWN_BRANDS) {
      const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const brandRe = new RegExp(`(^|\\s)${escaped}(\\s|$)`, 'i');
      if (brandRe.test(working)) {
        detectedBrand = candidate;
        break;
      }
    }
  }

  const packageSize = explicitPackageSize?.trim() || detectedSize || '1 unit';
  const cleanName = working.replace(/[-–—,]+$/, '').trim() || rawName.trim();

  return {
    cleanName,
    brand: detectedBrand,
    packageSize,
    embeddedQuantity,
  };
}

function normalizeDisplayUnitToken(token: string): string {
  const lower = token.toLowerCase();
  if (['l', 'ltr', 'ltrs', 'litre', 'litres', 'liter', 'liters'].includes(lower)) return 'L';
  if (lower === 'ml' || lower.startsWith('millilit')) return 'ml';
  if (['kg', 'kgs', 'kilogram', 'kilograms'].includes(lower)) return 'kg';
  if (['g', 'gm', 'gms', 'gram', 'grams'].includes(lower)) return 'g';
  if (['pc', 'pcs', 'piece', 'pieces'].includes(lower)) return lower === 'pc' ? 'pc' : 'pcs';
  return lower;
}

export interface NormalizedUnitResult {
  unitOfMeasurement: string;
  normalizedQuantity: number;
  unitPrice: number;
  family: ReturnType<typeof parseUnitSpec>['family'];
}

export function normalizeObservationUnit(
  quantity: number,
  packageSize: string,
  totalPrice: number
): NormalizedUnitResult {
  const safeQty = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
  const safeTotal = Number.isFinite(totalPrice) && totalPrice >= 0 ? totalPrice : 0;
  const parsed = parseUnitSpec(packageSize || '1 unit');

  let unitOfMeasurement = 'unit';
  let basePerPackage = parsed.canonicalAmount;

  switch (parsed.family) {
    case 'weight':
      unitOfMeasurement = 'kg';
      break;
    case 'volume':
      unitOfMeasurement = 'L';
      break;
    case 'count':
      unitOfMeasurement = 'pc';
      break;
    case 'duration':
      unitOfMeasurement = 'mo';
      break;
    case 'container':
      unitOfMeasurement = parsed.unitToken;
      basePerPackage = parsed.qty;
      break;
    default:
      unitOfMeasurement = parsed.unitToken || 'unit';
      basePerPackage = parsed.qty;
      break;
  }

  const normalizedQuantity = Math.max(
    0.0001,
    Math.round(safeQty * basePerPackage * 10000) / 10000
  );
  const unitPrice = roundCurrency(safeTotal / normalizedQuantity);

  return {
    unitOfMeasurement,
    normalizedQuantity,
    unitPrice,
    family: parsed.family,
  };
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

function stripBrandWords(tokens: string[], brand?: string): string[] {
  if (!brand) return tokens;
  const brandTokens = new Set(tokenize(brand));
  return tokens.filter((t) => !brandTokens.has(t));
}

function slugifyProductId(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `obs-${cleaned || 'item'}`;
}

export function inferCategoryFromName(name: string, fallback: string = 'Groceries'): string {
  const lower = name.toLowerCase();
  if (/milk|curd|yogurt|paneer|butter|cheese|bread|bakery|bun/.test(lower)) return 'Dairy & Bakery';
  if (/tomato|onion|potato|apple|banana|fruit|veg|spinach|coriander/.test(lower))
    return 'Fruits & Vegetables';
  if (/rice|wheat|atta|flour|sugar|salt|oil|dal|pulse|lentil|spice/.test(lower)) return 'Groceries';
  if (/chip|lays|lay's|cola|soda|juice|chocolate|biscuit|cookie|coffee|tea|snack/.test(lower))
    return 'Snacks & Beverages';
  if (/egg|chicken|mutton|fish|meat|poultry/.test(lower)) return 'Meat & Eggs';
  if (/soap|shampoo|toothpaste|body wash|face|cream|deodorant/.test(lower)) return 'Personal Care';
  if (/detergent|dishwash|cleaner|bleach|vim|surf|ariel|tide/.test(lower))
    return 'Cleaning Supplies';
  if (/petrol|diesel|fuel|metro|cab|uber|ola/.test(lower)) return 'Fuel & Transportation';
  if (/wifi|broadband|recharge|mobile|internet|airtel|jio/.test(lower))
    return 'Mobile & Internet Bills';
  if (/electricity|power|gas|cylinder|utility/.test(lower)) return 'Electricity & Utilities';
  return fallback;
}

export interface CanonicalProductMatch {
  productId: string;
  productName: string;
  category: string;
  brand?: string;
  packageSize: string;
  quantity: number;
  matchedExisting: boolean;
}

export function resolveCanonicalProduct(
  rawName: string,
  catalogItems: CartItem[],
  existingObservations: PriceObservation[] = [],
  options?: {
    explicitProductId?: string;
    explicitCategory?: string;
    explicitBrand?: string;
    explicitPackageSize?: string;
    quantity?: number;
  }
): CanonicalProductMatch {
  const extracted = extractProductInfo(
    rawName,
    options?.explicitBrand,
    options?.explicitPackageSize
  );
  const quantity = options?.quantity ?? extracted.embeddedQuantity ?? 1;

  // 1. Explicit ID match
  if (options?.explicitProductId) {
    const byId = catalogItems.find((i) => i.id === options.explicitProductId);
    if (byId) {
      return {
        productId: byId.id,
        productName: byId.name,
        category: options.explicitCategory ?? byId.category,
        brand: extracted.brand,
        packageSize: options.explicitPackageSize ?? byId.unit ?? extracted.packageSize,
        quantity,
        matchedExisting: true,
      };
    }
    const prevObs = existingObservations.find((o) => o.productId === options.explicitProductId);
    if (prevObs) {
      return {
        productId: prevObs.productId,
        productName: prevObs.productName,
        category: options.explicitCategory ?? prevObs.category,
        brand: extracted.brand ?? prevObs.brand,
        packageSize: options.explicitPackageSize ?? extracted.packageSize ?? prevObs.packageSize,
        quantity,
        matchedExisting: true,
      };
    }
  }

  // 2. Exact case-insensitive match against catalog items
  const normalizedClean = extracted.cleanName.toLowerCase();
  const exactCatalog = catalogItems.find(
    (i) => i.name.toLowerCase() === rawName.trim().toLowerCase() || i.name.toLowerCase() === normalizedClean
  );
  if (exactCatalog) {
    return {
      productId: exactCatalog.id,
      productName: exactCatalog.name,
      category: options?.explicitCategory ?? exactCatalog.category,
      brand: extracted.brand,
      packageSize: options?.explicitPackageSize ?? (extracted.packageSize !== '1 unit' ? extracted.packageSize : exactCatalog.unit || '1 unit'),
      quantity,
      matchedExisting: true,
    };
  }

  // 3. Token & synonym match against catalog items (guarding unit compatibility when explicit sizes exist)
  const queryTokens = stripBrandWords(tokenize(extracted.cleanName), extracted.brand);
  const expandedQuery = new Set(queryTokens);
  for (const t of queryTokens) {
    for (const syn of KEYWORD_SYNONYMS[t] ?? []) {
      for (const st of tokenize(syn)) expandedQuery.add(st);
    }
  }

  const parsedInputUnit = parseUnitSpec(extracted.packageSize);
  let bestCatalog: { item: CartItem; score: number } | null = null;

  for (const item of catalogItems) {
    const itemTokens = tokenize(item.name);
    if (itemTokens.length === 0) continue;

    // Unit compatibility guard: if user supplied a weight/volume/duration size, avoid cross-family collisions
    if (
      extracted.packageSize !== '1 unit' &&
      item.unit &&
      parsedInputUnit.family !== 'unknown'
    ) {
      const itemUnit = parseUnitSpec(item.unit);
      if (
        itemUnit.family !== 'unknown' &&
        itemUnit.family !== parsedInputUnit.family &&
        !(itemUnit.family === 'container' && parsedInputUnit.family === 'count')
      ) {
        continue;
      }
    }

    let overlap = 0;
    for (const it of itemTokens) {
      if (expandedQuery.has(it)) overlap += 1;
    }

    if (overlap === 0) continue;

    // Require strong match: either > 50% of item tokens matched or exact key noun matched
    const coverage = overlap / itemTokens.length;
    const score = overlap * 2 + coverage;
    if (coverage >= 0.5 && (!bestCatalog || score > bestCatalog.score)) {
      bestCatalog = { item, score };
    }
  }

  if (bestCatalog) {
    return {
      productId: bestCatalog.item.id,
      productName: bestCatalog.item.name,
      category: options?.explicitCategory ?? bestCatalog.item.category,
      brand: extracted.brand,
      packageSize:
        options?.explicitPackageSize ??
        (extracted.packageSize !== '1 unit'
          ? extracted.packageSize
          : bestCatalog.item.unit || '1 unit'),
      quantity,
      matchedExisting: true,
    };
  }

  // 4. Match against previously observed non-catalog products (ignoring brand/size differences)
  const coreCleanName = queryTokens.join(' ') || normalizedClean;
  const obsProductMatch = existingObservations.find((o) => {
    const oTokens = stripBrandWords(tokenize(o.productName), o.brand);
    const oCore = oTokens.join(' ');
    if (o.productName.toLowerCase() === normalizedClean) return true;
    if (coreCleanName && oCore && coreCleanName === oCore) return true;
    return false;
  });

  if (obsProductMatch) {
    return {
      productId: obsProductMatch.productId,
      productName: obsProductMatch.productName,
      category: options?.explicitCategory ?? obsProductMatch.category,
      brand: extracted.brand ?? obsProductMatch.brand,
      packageSize: options?.explicitPackageSize ?? extracted.packageSize,
      quantity,
      matchedExisting: true,
    };
  }

  // 5. New canonical product derived cleanly from cleaned name (without pack size)
  const displayName = extracted.cleanName;
  const slugBase = coreCleanName || displayName;
  return {
    productId: slugifyProductId(slugBase),
    productName: displayName,
    category: options?.explicitCategory ?? inferCategoryFromName(rawName),
    brand: extracted.brand,
    packageSize: options?.explicitPackageSize ?? extracted.packageSize,
    quantity,
    matchedExisting: false,
  };
}

export function buildPriceObservation(params: {
  id?: string;
  rawName: string;
  totalPrice: number;
  quantity?: number;
  packageSize?: string;
  category?: string;
  brand?: string;
  purchaseDate?: string;
  purchaseSource: PriceObservationSource;
  entryKind?: PriceEntryKind;
  transactionId?: string | null;
  receiptRef?: PriceObservation['receiptRef'];
  explicitProductId?: string;
  catalogItems: CartItem[];
  existingObservations?: PriceObservation[];
}): PriceObservation {
  const resolved = resolveCanonicalProduct(
    params.rawName,
    params.catalogItems,
    params.existingObservations ?? [],
    {
      explicitProductId: params.explicitProductId,
      explicitCategory: params.category,
      explicitBrand: params.brand,
      explicitPackageSize: params.packageSize,
      quantity: params.quantity,
    }
  );

  const normalized = normalizeObservationUnit(
    resolved.quantity,
    resolved.packageSize,
    params.totalPrice
  );

  return {
    id: params.id ?? crypto.randomUUID(),
    productId: resolved.productId,
    productName: resolved.productName,
    category: resolved.category,
    brand: resolved.brand,
    quantity: resolved.quantity,
    packageSize: resolved.packageSize,
    unitOfMeasurement: normalized.unitOfMeasurement,
    normalizedQuantity: normalized.normalizedQuantity,
    totalPrice: roundCurrency(params.totalPrice),
    unitPrice: normalized.unitPrice,
    purchaseDate: params.purchaseDate ?? new Date().toISOString(),
    purchaseSource: params.purchaseSource,
    entryKind: params.entryKind ?? 'actual_purchase',
    transactionId: params.transactionId ?? null,
    receiptRef: params.receiptRef ?? null,
    status: 'active',
  };
}

export function buildReceiptFingerprint(receipt: ParsedReceipt): string {
  const datePart = (receipt.date || '').slice(0, 10);
  const merchantPart = (receipt.merchant || '').trim().toLowerCase();
  const totalPart = roundCurrency(receipt.total).toFixed(2);
  const itemsPart = receipt.items
    .map((i) => `${i.name.trim().toLowerCase()}:${roundCurrency(i.price).toFixed(2)}`)
    .sort()
    .join('|');
  return `${merchantPart}__${datePart}__${totalPart}__${itemsPart}`;
}

export function calcPercentageChange(oldPrice: number | null, newPrice: number | null): number | null {
  if (
    oldPrice === null ||
    newPrice === null ||
    !Number.isFinite(oldPrice) ||
    !Number.isFinite(newPrice) ||
    oldPrice <= 0
  ) {
    return null;
  }
  const pct = ((newPrice - oldPrice) / oldPrice) * 100;
  return Math.round(pct * 10) / 10;
}

export type TrendDirection = 'increasing' | 'decreasing' | 'stable' | 'single';

export interface ProductPriceSummary {
  productId: string;
  productName: string;
  category: string;
  unitOfMeasurement: string;
  compatibleObservations: PriceObservation[]; // chronological ascending, active only
  allObservations: PriceObservation[]; // includes cancelled/refunded/incompatible for transparent table
  excludedIncompatibleCount: number;
  cancelledOrRefundedCount: number;
  purchaseCount: number;
  actualPurchaseCount: number;
  estimateCount: number;
  latestPrice: number;
  previousPrice: number | null;
  firstPrice: number;
  averagePrice: number;
  highestPrice: number;
  lowestPrice: number;
  latestObservation: PriceObservation;
  previousObservation: PriceObservation | null;
  firstObservation: PriceObservation;
  highestObservation: PriceObservation;
  lowestObservation: PriceObservation;
  vsPreviousDiff: number | null;
  vsPreviousPct: number | null;
  vsAverageDiff: number | null;
  vsAveragePct: number | null;
  vsHighestDiff: number | null;
  vsHighestPct: number | null;
  vsLowestDiff: number | null;
  vsLowestPct: number | null;
  overallChangeDiff: number | null;
  overallChangePct: number | null;
  trendDirection: TrendDirection;
  totalSpend: number;
  brands: string[];
  packageSizes: string[];
  mostRecentDate: string;
}

export function buildProductPriceSummaries(
  observations: PriceObservation[],
  catalogItems: CartItem[] = []
): ProductPriceSummary[] {
  const byProduct = new Map<string, PriceObservation[]>();
  for (const obs of observations) {
    const list = byProduct.get(obs.productId) ?? [];
    list.push(obs);
    byProduct.set(obs.productId, list);
  }

  const catalogById = new Map(catalogItems.map((i) => [i.id, i]));
  const summaries: ProductPriceSummary[] = [];

  for (const [productId, rawList] of byProduct.entries()) {
    const sortedAll = [...rawList].sort(
      (a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()
    );

    const activeObs = sortedAll.filter((o) => o.status === 'active');
    const cancelledOrRefundedCount = sortedAll.length - activeObs.length;

    // Do not include products that only have cancelled/refunded transactions in active analytics
    if (activeObs.length === 0) continue;

    const catalogItem = catalogById.get(productId);
    const preferredUnit = catalogItem?.unit
      ? normalizeObservationUnit(1, catalogItem.unit, 0).unitOfMeasurement
      : activeObs[activeObs.length - 1].unitOfMeasurement;

    const compatible: PriceObservation[] = [];
    let excludedIncompatibleCount = 0;

    for (const obs of activeObs) {
      if (obs.unitOfMeasurement === preferredUnit) {
        compatible.push(obs);
        continue;
      }
      // Attempt unit conversion if compatible (e.g., unitOfMeasurement stored as g/kg or ml/L)
      const compat = areUnitsCompatible(`1 ${obs.unitOfMeasurement}`, `1 ${preferredUnit}`);
      if (compat.compatible && compat.conversionMultiplier) {
        compatible.push({
          ...obs,
          unitOfMeasurement: preferredUnit,
          normalizedQuantity: obs.normalizedQuantity / compat.conversionMultiplier,
          unitPrice: roundCurrency(obs.unitPrice * compat.conversionMultiplier),
        });
      } else {
        excludedIncompatibleCount += 1;
      }
    }

    if (compatible.length === 0) continue;

    const prices = compatible.map((o) => o.unitPrice);
    const sumUnitPrices = prices.reduce((s, p) => s + p, 0);
    const averagePrice = roundCurrency(sumUnitPrices / compatible.length);

    let highestObs = compatible[0];
    let lowestObs = compatible[0];
    for (const o of compatible) {
      if (o.unitPrice > highestObs.unitPrice) highestObs = o;
      if (o.unitPrice < lowestObs.unitPrice) lowestObs = o;
    }

    const firstObs = compatible[0];
    const latestObs = compatible[compatible.length - 1];
    const previousObs = compatible.length >= 2 ? compatible[compatible.length - 2] : null;

    const hasMultiple = compatible.length >= 2;

    const vsPreviousDiff = previousObs
      ? roundCurrency(latestObs.unitPrice - previousObs.unitPrice)
      : null;
    const vsPreviousPct = previousObs
      ? calcPercentageChange(previousObs.unitPrice, latestObs.unitPrice)
      : null;

    const vsAverageDiff = hasMultiple
      ? roundCurrency(latestObs.unitPrice - averagePrice)
      : null;
    const vsAveragePct = hasMultiple
      ? calcPercentageChange(averagePrice, latestObs.unitPrice)
      : null;

    const vsHighestDiff = hasMultiple
      ? roundCurrency(latestObs.unitPrice - highestObs.unitPrice)
      : null;
    const vsHighestPct = hasMultiple
      ? calcPercentageChange(highestObs.unitPrice, latestObs.unitPrice)
      : null;

    const vsLowestDiff = hasMultiple
      ? roundCurrency(latestObs.unitPrice - lowestObs.unitPrice)
      : null;
    const vsLowestPct = hasMultiple
      ? calcPercentageChange(lowestObs.unitPrice, latestObs.unitPrice)
      : null;

    const overallChangeDiff = hasMultiple
      ? roundCurrency(latestObs.unitPrice - firstObs.unitPrice)
      : null;
    const overallChangePct = hasMultiple
      ? calcPercentageChange(firstObs.unitPrice, latestObs.unitPrice)
      : null;

    const actualPurchaseCount = compatible.filter((o) => o.entryKind === 'actual_purchase').length;
    const estimateCount = compatible.length - actualPurchaseCount;

    let trendDirection: TrendDirection = 'single';
    if (compatible.length >= 2 && overallChangePct !== null) {
      if (overallChangePct >= 1) trendDirection = 'increasing';
      else if (overallChangePct <= -1) trendDirection = 'decreasing';
      else trendDirection = 'stable';
    }

    const brands = Array.from(
      new Set(compatible.map((o) => o.brand?.trim()).filter((b): b is string => Boolean(b)))
    );
    const packageSizes = Array.from(new Set(compatible.map((o) => o.packageSize)));
    const totalSpend = roundCurrency(compatible.reduce((s, o) => s + o.totalPrice, 0));

    summaries.push({
      productId,
      productName: catalogItem?.name ?? latestObs.productName,
      category: catalogItem?.category ?? latestObs.category,
      unitOfMeasurement: preferredUnit,
      compatibleObservations: compatible,
      allObservations: sortedAll,
      excludedIncompatibleCount,
      cancelledOrRefundedCount,
      purchaseCount: compatible.length,
      actualPurchaseCount,
      estimateCount,
      latestPrice: latestObs.unitPrice,
      previousPrice: previousObs ? previousObs.unitPrice : null,
      firstPrice: firstObs.unitPrice,
      averagePrice,
      highestPrice: highestObs.unitPrice,
      lowestPrice: lowestObs.unitPrice,
      latestObservation: latestObs,
      previousObservation: previousObs,
      firstObservation: firstObs,
      highestObservation: highestObs,
      lowestObservation: lowestObs,
      vsPreviousDiff,
      vsPreviousPct,
      vsAverageDiff,
      vsAveragePct,
      vsHighestDiff,
      vsHighestPct,
      vsLowestDiff,
      vsLowestPct,
      overallChangeDiff,
      overallChangePct,
      trendDirection,
      totalSpend,
      brands,
      packageSizes,
      mostRecentDate: latestObs.purchaseDate,
    });
  }

  return summaries;
}

export function filterObservationsByTimeframe(
  observations: PriceObservation[],
  timeframe: PriceTimeframe,
  now: Date = new Date()
): PriceObservation[] {
  if (timeframe === 'all') return observations;

  const cutoff = new Date(now.getTime());
  switch (timeframe) {
    case '7d':
      cutoff.setDate(cutoff.getDate() - 7);
      break;
    case '30d':
      cutoff.setDate(cutoff.getDate() - 30);
      break;
    case '3m':
      cutoff.setMonth(cutoff.getMonth() - 3);
      break;
    case '6m':
      cutoff.setMonth(cutoff.getMonth() - 6);
      break;
    case '12m':
      cutoff.setFullYear(cutoff.getFullYear() - 1);
      break;
  }

  const cutoffMs = cutoff.getTime();
  return observations.filter((o) => {
    const t = new Date(o.purchaseDate).getTime();
    return Number.isFinite(t) && t >= cutoffMs;
  });
}

export type ProductTrendFilter = 'all' | 'increasing' | 'decreasing' | 'recent' | 'frequent';
export type ProductTrendSort =
  | 'latest_purchase'
  | 'highest_increase'
  | 'highest_decrease'
  | 'most_frequent'
  | 'alpha';

export function filterAndSortProductSummaries(
  summaries: ProductPriceSummary[],
  options: {
    query?: string;
    category?: string;
    trendFilter?: ProductTrendFilter;
    sortBy?: ProductTrendSort;
  }
): ProductPriceSummary[] {
  const q = (options.query ?? '').trim().toLowerCase();
  const cat = options.category && options.category !== 'All' ? options.category : null;
  const filter = options.trendFilter ?? 'all';
  const sortBy = options.sortBy ?? 'latest_purchase';

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const filtered = summaries.filter((s) => {
    if (cat && s.category !== cat) return false;
    if (filter === 'increasing' && s.trendDirection !== 'increasing') return false;
    if (filter === 'decreasing' && s.trendDirection !== 'decreasing') return false;
    if (filter === 'frequent' && s.purchaseCount < 2) return false;
    if (filter === 'recent' && new Date(s.mostRecentDate).getTime() < thirtyDaysAgo) return false;

    if (q) {
      const hay = [s.productName, s.category, ...s.brands, ...s.packageSizes]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }

    return true;
  });

  return [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'highest_increase': {
        const aVal = a.overallChangePct ?? -Infinity;
        const bVal = b.overallChangePct ?? -Infinity;
        return bVal - aVal || b.purchaseCount - a.purchaseCount;
      }
      case 'highest_decrease': {
        const aVal = a.overallChangePct ?? Infinity;
        const bVal = b.overallChangePct ?? Infinity;
        return aVal - bVal || b.purchaseCount - a.purchaseCount;
      }
      case 'most_frequent':
        return (
          b.purchaseCount - a.purchaseCount ||
          new Date(b.mostRecentDate).getTime() - new Date(a.mostRecentDate).getTime()
        );
      case 'alpha':
        return a.productName.localeCompare(b.productName);
      case 'latest_purchase':
      default:
        return (
          new Date(b.mostRecentDate).getTime() - new Date(a.mostRecentDate).getTime() ||
          a.productName.localeCompare(b.productName)
        );
    }
  });
}

export interface CategoryPriceAnalyticsRow {
  category: string;
  trackedProducts: number;
  multiPurchaseProducts: number;
  increasingCount: number;
  decreasingCount: number;
  stableOrSingleCount: number;
  avgPriceChangePct: number | null;
  totalSpend: number;
  totalPurchases: number;
  topMover: ProductPriceSummary | null;
}

export function computeCategoryPriceAnalytics(
  summaries: ProductPriceSummary[]
): CategoryPriceAnalyticsRow[] {
  const byCategory = new Map<string, ProductPriceSummary[]>();
  for (const s of summaries) {
    const list = byCategory.get(s.category) ?? [];
    list.push(s);
    byCategory.set(s.category, list);
  }

  const rows: CategoryPriceAnalyticsRow[] = [];

  for (const [category, items] of byCategory.entries()) {
    const increasingCount = items.filter((s) => s.trendDirection === 'increasing').length;
    const decreasingCount = items.filter((s) => s.trendDirection === 'decreasing').length;
    const stableOrSingleCount = items.length - increasingCount - decreasingCount;
    const totalSpend = roundCurrency(items.reduce((sum, s) => sum + s.totalSpend, 0));
    const totalPurchases = items.reduce((sum, s) => sum + s.purchaseCount, 0);

    // Compute category average % change ONLY across products that have >= 2 purchases (never mixing raw prices)
    const pctValues = items
      .filter((s) => s.purchaseCount >= 2 && s.overallChangePct !== null)
      .map((s) => s.overallChangePct as number);

    const avgPriceChangePct =
      pctValues.length > 0
        ? Math.round((pctValues.reduce((a, b) => a + b, 0) / pctValues.length) * 10) / 10
        : null;

    let topMover: ProductPriceSummary | null = null;
    for (const item of items) {
      if (item.purchaseCount < 2 || item.overallChangePct === null) continue;
      if (
        !topMover ||
        Math.abs(item.overallChangePct) > Math.abs(topMover.overallChangePct ?? 0)
      ) {
        topMover = item;
      }
    }

    rows.push({
      category,
      trackedProducts: items.length,
      multiPurchaseProducts: pctValues.length,
      increasingCount,
      decreasingCount,
      stableOrSingleCount,
      avgPriceChangePct,
      totalSpend,
      totalPurchases,
      topMover,
    });
  }

  return rows.sort((a, b) => b.totalSpend - a.totalSpend || b.trackedProducts - a.trackedProducts);
}

export interface PriceInsight {
  id: string;
  kind: 'increase' | 'decrease' | 'frequent' | 'savings' | 'category';
  title: string;
  description: string;
  productId?: string;
  metricBadge: string;
  tone: 'warning' | 'positive' | 'info';
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function generatePriceInsights(
  summaries: ProductPriceSummary[],
  categoryRows: CategoryPriceAnalyticsRow[]
): PriceInsight[] {
  // Never generate insights when there are fewer than 2 actual purchases on a product
  const eligible = summaries.filter((s) => s.actualPurchaseCount >= 2 && s.purchaseCount >= 2);
  if (eligible.length === 0) return [];

  const insights: PriceInsight[] = [];

  // 1. Largest price increase
  const risers = eligible
    .filter((s) => (s.overallChangePct ?? 0) >= 1 && (s.overallChangeDiff ?? 0) > 0)
    .sort((a, b) => (b.overallChangePct ?? 0) - (a.overallChangePct ?? 0));

  if (risers[0]) {
    const top = risers[0];
    insights.push({
      id: `insight-inc-${top.productId}`,
      kind: 'increase',
      productId: top.productId,
      title: `${top.productName} up ${top.overallChangePct}%`,
      description: `Rose from ₹${top.firstPrice.toFixed(2)}/${top.unitOfMeasurement} (${shortDate(
        top.firstObservation.purchaseDate
      )}) to ₹${top.latestPrice.toFixed(2)}/${top.unitOfMeasurement} (${shortDate(
        top.latestObservation.purchaseDate
      )}).`,
      metricBadge: `+₹${Math.abs(top.overallChangeDiff ?? 0).toFixed(2)}/${top.unitOfMeasurement}`,
      tone: 'warning',
    });
  }

  // 2. Largest price decrease
  const droppers = eligible
    .filter((s) => (s.overallChangePct ?? 0) <= -1 && (s.overallChangeDiff ?? 0) < 0)
    .sort((a, b) => (a.overallChangePct ?? 0) - (b.overallChangePct ?? 0));

  if (droppers[0]) {
    const best = droppers[0];
    insights.push({
      id: `insight-dec-${best.productId}`,
      kind: 'decrease',
      productId: best.productId,
      title: `${best.productName} down ${Math.abs(best.overallChangePct ?? 0)}%`,
      description: `Dropped from ₹${best.firstPrice.toFixed(2)}/${best.unitOfMeasurement} (${shortDate(
        best.firstObservation.purchaseDate
      )}) to ₹${best.latestPrice.toFixed(2)}/${best.unitOfMeasurement} (${shortDate(
        best.latestObservation.purchaseDate
      )}).`,
      metricBadge: `-₹${Math.abs(best.overallChangeDiff ?? 0).toFixed(2)}/${best.unitOfMeasurement}`,
      tone: 'positive',
    });
  }

  // 3. Most frequently purchased tracked item
  const mostFrequent = [...eligible].sort(
    (a, b) => b.actualPurchaseCount - a.actualPurchaseCount || b.totalSpend - a.totalSpend
  )[0];
  if (mostFrequent) {
    insights.push({
      id: `insight-freq-${mostFrequent.productId}`,
      kind: 'frequent',
      productId: mostFrequent.productId,
      title: `Most tracked: ${mostFrequent.productName}`,
      description: `${mostFrequent.actualPurchaseCount} recorded purchases totaling ₹${mostFrequent.totalSpend.toFixed(
        2
      )} (avg ₹${mostFrequent.averagePrice.toFixed(2)}/${mostFrequent.unitOfMeasurement}).`,
      metricBadge: `${mostFrequent.actualPurchaseCount} buys`,
      tone: 'info',
    });
  }

  // 4. Below peak price on latest purchase
  const belowPeak = eligible
    .filter((s) => s.latestPrice < s.highestPrice - 0.5)
    .sort((a, b) => Math.abs(b.vsHighestDiff ?? 0) - Math.abs(a.vsHighestDiff ?? 0));

  if (belowPeak[0]) {
    const item = belowPeak[0];
    insights.push({
      id: `insight-save-${item.productId}`,
      kind: 'savings',
      productId: item.productId,
      title: `Paid below peak for ${item.productName}`,
      description: `Latest ₹${item.latestPrice.toFixed(2)}/${item.unitOfMeasurement} is ₹${Math.abs(
        item.vsHighestDiff ?? 0
      ).toFixed(2)} cheaper than your ₹${item.highestPrice.toFixed(2)} peak on ${shortDate(
        item.highestObservation.purchaseDate
      )}.`,
      metricBadge: `${item.vsHighestPct}% vs peak`,
      tone: 'positive',
    });
  }

  // 5. Category trend highlight
  const risingCategory = categoryRows
    .filter((c) => c.multiPurchaseProducts >= 1 && (c.avgPriceChangePct ?? 0) >= 2)
    .sort((a, b) => (b.avgPriceChangePct ?? 0) - (a.avgPriceChangePct ?? 0))[0];

  if (risingCategory) {
    insights.push({
      id: `insight-cat-${risingCategory.category}`,
      kind: 'category',
      title: `${risingCategory.category} trending higher`,
      description: `Average price change of +${risingCategory.avgPriceChangePct}% across ${risingCategory.multiPurchaseProducts} repeatedly purchased item${
        risingCategory.multiPurchaseProducts === 1 ? '' : 's'
      }.`,
      metricBadge: `+${risingCategory.avgPriceChangePct}% avg`,
      tone: 'warning',
    });
  }

  return insights;
}

export function evaluatePriceAlerts(
  newObservations: PriceObservation[],
  previousSummaries: ProductPriceSummary[],
  alerts: PriceAlert[],
  nowIso: string = new Date().toISOString()
): { triggered: TriggeredPriceAlert[]; updatedAlerts: PriceAlert[] } {
  const triggered: TriggeredPriceAlert[] = [];
  const prevByProduct = new Map(previousSummaries.map((s) => [s.productId, s]));
  const alertPatchById = new Map<string, { lastTriggeredAt: string; lastTriggerMessage: string }>();

  for (const obs of newObservations) {
    if (obs.status !== 'active' || obs.entryKind !== 'actual_purchase') continue;
    const prevSummary = prevByProduct.get(obs.productId);

    for (const alert of alerts) {
      if (!alert.enabled || alert.productId !== obs.productId) continue;

      // Ensure unit compatibility before comparing unitPrice
      const compat = areUnitsCompatible(`1 ${obs.unitOfMeasurement}`, `1 ${alert.unitOfMeasurement}`);
      if (!compat.compatible || !compat.conversionMultiplier) continue;
      const comparableUnitPrice = roundCurrency(obs.unitPrice * compat.conversionMultiplier);

      if (
        typeof alert.targetUnitPrice === 'number' &&
        alert.targetUnitPrice > 0 &&
        comparableUnitPrice <= alert.targetUnitPrice
      ) {
        const message = `${obs.productName} hit ₹${comparableUnitPrice.toFixed(2)}/${alert.unitOfMeasurement} (target ≤ ₹${alert.targetUnitPrice.toFixed(2)})`;
        triggered.push({
          id: crypto.randomUUID(),
          alertId: alert.id,
          productId: obs.productId,
          productName: obs.productName,
          reason: 'target_reached',
          message,
          recordedUnitPrice: comparableUnitPrice,
          unitOfMeasurement: alert.unitOfMeasurement,
          triggeredAt: nowIso,
        });
        alertPatchById.set(alert.id, { lastTriggeredAt: nowIso, lastTriggerMessage: message });
      }

      if (
        typeof alert.increaseThresholdPct === 'number' &&
        alert.increaseThresholdPct > 0 &&
        prevSummary &&
        prevSummary.latestPrice > 0
      ) {
        const pct = calcPercentageChange(prevSummary.latestPrice, comparableUnitPrice);
        if (pct !== null && pct >= alert.increaseThresholdPct) {
          const message = `${obs.productName} jumped +${pct}% to ₹${comparableUnitPrice.toFixed(2)}/${alert.unitOfMeasurement} (threshold +${alert.increaseThresholdPct}%)`;
          triggered.push({
            id: crypto.randomUUID(),
            alertId: alert.id,
            productId: obs.productId,
            productName: obs.productName,
            reason: 'price_spike',
            message,
            recordedUnitPrice: comparableUnitPrice,
            unitOfMeasurement: alert.unitOfMeasurement,
            triggeredAt: nowIso,
          });
          alertPatchById.set(alert.id, { lastTriggeredAt: nowIso, lastTriggerMessage: message });
        }
      }
    }
  }

  const updatedAlerts = alerts.map((a) => {
    const patch = alertPatchById.get(a.id);
    return patch ? { ...a, ...patch } : a;
  });

  return { triggered, updatedAlerts };
}
