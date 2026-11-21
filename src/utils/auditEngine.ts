import type {
  CartItem,
  ParsedReceipt,
  ParsedReceiptItem,
  FeeFlag,
  PriceObservation,
  Transaction,
} from '../types/models';
import {
  extractProductInfo,
  inferCategoryFromName,
  resolveCanonicalProduct,
} from './priceTrackerEngine';

const KNOWN_MERCHANTS = [
  'Swiggy Instamart',
  'Amazon Fresh',
  'Flipkart Quick',
  'Blinkit',
  'Zepto',
  'BigBasket',
  'JioMart',
  'Dunzo',
  'Instamart',
  'Swiggy',
  'Zomato',
  'DMart',
  'Reliance Smart',
];

export const SAMPLE_RECEIPT_TEXT = `Blinkit Order #BL-49281
Date: 17/11/2026
Amul Taaza Milk 500ml    ₹27.00
Lay's Classic Salted     ₹20.00
Britannia Brown Bread    ₹48.00
Fortune Sunflower Oil 1L ₹145.00
Item Total               ₹240.00
Handling Charge          ₹15.00
Delivery Fee             ₹25.00
GST & Taxes              ₹18.50
Grand Total              ₹298.50`;

function cleanAmount(raw: string): number {
  const cleaned = raw.replace(/[,₹\s]/g, '').replace(/^rs\.?/i, '');
  const val = Number.parseFloat(cleaned);
  return Number.isFinite(val) ? Math.round(val * 100) / 100 : 0;
}

function detectMerchant(lines: string[], fallbackMerchant?: string): string {
  const fullText = lines.join('\n').toLowerCase();
  for (const merchant of KNOWN_MERCHANTS) {
    if (fullText.includes(merchant.toLowerCase())) {
      return merchant;
    }
  }
  for (const line of lines.slice(0, 4)) {
    const trimmed = line.replace(/order\s*#?[\w-]+/gi, '').trim();
    if (
      trimmed.length >= 3 &&
      trimmed.length <= 40 &&
      !/^\d/.test(trimmed) &&
      !/date|invoice|receipt|tax|gst|total|bill/i.test(trimmed)
    ) {
      return trimmed;
    }
  }
  return fallbackMerchant?.trim() || 'Receipt Scan';
}

function detectDate(text: string): string {
  const isoMatch = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    const d = new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T12:00:00Z`);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  const dmyMatch = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    let year = Number(dmyMatch[3]);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
  }
  return new Date().toISOString();
}

const FEE_KEYWORDS = [
  'delivery',
  'handling',
  'packaging',
  'platform fee',
  'convenience',
  'surge',
  'rain fee',
  'small cart',
  'late night',
  'tip',
];

const TAX_KEYWORDS = ['gst', 'cgst', 'sgst', 'igst', 'tax', 'vat', 'cess'];

const SUMMARY_KEYWORDS = [
  'grand total',
  'total payable',
  'amount paid',
  'to pay',
  'net total',
  'bill total',
  'subtotal',
  'sub total',
  'sub-total',
  'item total',
  'items total',
  'discount',
  'coupon',
  'savings',
  'you saved',
  'cashback',
  'round off',
  'rounded',
];

const STANDALONE_PRICE_RE =
  /^(?:[-−]\s*)?(?:₹|rs\.?|inr|¥)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:\/-)?$/i;
const UNIT_OR_QTY_ONLY_RE =
  /^(?:qty\s*[:.]?\s*\d+|\d+\s*[x×]\s*\d*|\d+(?:\.\d+)?\s*(?:ml|l|ltr|litre|litres|g|gm|gms|kg|kgs|pc|pcs|piece|pieces|pack|packs|unit|units|tab|tabs|tablet|tablets|cap|caps|capsule|capsules|strip|strips|bottle|bottles|can|cans|box|boxes))$/i;

function isMetadataLabel(label: string): boolean {
  return /^(order|invoice|bill\s*no|receipt|phone|mobile|pin|gstin|fssai|upi|txn|transaction\s*id|date|time|delivered|status|payment)/i.test(
    label
  );
}

export function parseReceiptText(text: string, fallbackMerchant?: string): ParsedReceipt {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const merchant = detectMerchant(lines, fallbackMerchant);
  const date = detectDate(text);

  const items: ParsedReceiptItem[] = [];
  let taxTotal = 0;
  let deliveryFee = 0;
  let explicitSubtotal: number | null = null;
  let explicitTotal: number | null = null;

  let pendingLines: string[] = [];

  const classifyAndPush = (rawLabel: string, amount: number) => {
    // Clean trailing separators and any strikethrough MRP price earlier in the line (e.g. "Milk ₹30 ₹27" -> label="Milk")
    let label = rawLabel
      .replace(/(?:₹|rs\.?|inr|¥)\s*[\d,]+(?:\.\d{1,2})?\s*$/i, '')
      .replace(/[:\-–—]+$/, '')
      .trim();

    if (!label || amount <= 0 || amount > 1000000) return;
    if (isMetadataLabel(label)) return;

    const lower = label.toLowerCase();

    if (TAX_KEYWORDS.some((kw) => lower.includes(kw))) {
      taxTotal = Math.round((taxTotal + amount) * 100) / 100;
      return;
    }

    if (FEE_KEYWORDS.some((kw) => lower.includes(kw))) {
      deliveryFee = Math.round((deliveryFee + amount) * 100) / 100;
      return;
    }

    if (/^(subtotal|sub[\s-]?total|item\s*total|items\s*total)$/i.test(lower)) {
      explicitSubtotal = amount;
      return;
    }

    if (
      /^(total|grand\s*total|net\s*total|bill\s*total|total\s*payable|amount\s*paid|to\s*pay|paid)$/i.test(
        lower
      )
    ) {
      explicitTotal = amount;
      return;
    }

    if (SUMMARY_KEYWORDS.some((kw) => lower.includes(kw))) {
      return;
    }

    // Clean quantity prefix like "2 x Milk" or "2x Milk"
    label = label.replace(/^\d+\s*[xX×]\s+/, '').trim();
    if (label.length < 2) return;

    // Optional explicit bracketed category tag e.g. "USB Cable [Electronics]"
    let explicitCat: string | undefined;
    const catTagMatch = label.match(/\s*\[([^\]]{2,40})\]\s*$/);
    if (catTagMatch) {
      explicitCat = catTagMatch[1].trim();
      label = label.slice(0, catTagMatch.index).trim();
    }
    if (label.length < 2) return;

    const info = extractProductInfo(label);
    items.push({
      name: label,
      price: amount,
      category: explicitCat || inferCategoryFromName(label, 'Other Expenses'),
      unit: info.packageSize !== '1 unit' ? info.packageSize : undefined,
      brand: info.brand,
    });
  };

  for (const line of lines) {
    // Case 1: Standalone currency price line (common in Blinkit/Zepto/Instamart multi-line OCR)
    const standalone = line.match(STANDALONE_PRICE_RE);
    if (standalone && pendingLines.length > 0) {
      const amount = cleanAmount(standalone[1]);
      const combinedLabel = pendingLines
        .filter((pl) => !/^qty\s*[:.]?\s*\d+$/i.test(pl))
        .join(' ')
        .trim();
      pendingLines = [];
      if (combinedLabel) {
        classifyAndPush(combinedLabel, amount);
      }
      continue;
    }

    // Case 2: Single-line "Item Name   ₹145.00" (or "Item Name ₹160 ₹145.00" or "Item Name 145.00")
    const match = line.match(
      /^(.+?)\s+(?:[-−]\s*)?(?:₹|rs\.?|inr|¥)?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:\/-)?$/i
    );
    if (match && !UNIT_OR_QTY_ONLY_RE.test(line)) {
      const candidateLabel = match[1].replace(/[:\-–—]+$/, '').trim();
      const amount = cleanAmount(match[2]);
      // Avoid mis-parsing lines like "Order #12345" or "19/11/2026"
      if (
        candidateLabel &&
        amount > 0 &&
        !isMetadataLabel(candidateLabel) &&
        !/\d[\/\-]\d/.test(line)
      ) {
        pendingLines = [];
        classifyAndPush(candidateLabel, amount);
        continue;
      }
    }

    // Buffer non-price lines (potential item name / pack size before a standalone ₹ price)
    if (!isMetadataLabel(line) && line.length >= 2) {
      pendingLines.push(line);
      if (pendingLines.length > 2) {
        pendingLines = pendingLines.slice(-2);
      }
    } else {
      pendingLines = [];
    }
  }

  const computedSubtotal =
    items.length > 0
      ? items.reduce((sum, item) => sum + item.price, 0)
      : explicitSubtotal ?? 0;

  const subtotal = Math.round(computedSubtotal * 100) / 100;
  const roundedTax = Math.round(taxTotal * 100) / 100;
  const roundedDelivery = Math.round(deliveryFee * 100) / 100;
  const total =
    explicitTotal !== null
      ? Math.round(explicitTotal * 100) / 100
      : Math.round((subtotal + roundedTax + roundedDelivery) * 100) / 100;

  return {
    merchant,
    date,
    items,
    subtotal,
    taxTotal: roundedTax,
    deliveryFee: roundedDelivery,
    total,
    rawText: text,
  };
}

export function detectFees(items: CartItem[]): FeeFlag[] {
  const flags: FeeFlag[] = [];

  items.forEach((item) => {
    const qty = Math.max(1, item.quantity || 1);
    const lineTotal = Math.round(item.price * qty * 100) / 100;
    const nameLower = item.name.toLowerCase();
    const catLower = (item.category || '').toLowerCase();

    const isBillCategory =
      catLower === 'bills' ||
      catLower.includes('bill') ||
      catLower.includes('utilit');
    const isSnackCategory =
      catLower === 'junk' ||
      catLower.includes('snack') ||
      catLower.includes('beverage');
    const isEntertainment = catLower.includes('entertainment');

    if (
      nameLower.includes('subscription') ||
      nameLower.includes('netflix') ||
      nameLower.includes('spotify') ||
      nameLower.includes('prime') ||
      nameLower.includes('hotstar') ||
      nameLower.includes('membership') ||
      (item.recurrence && (isBillCategory || isEntertainment))
    ) {
      flags.push({
        id: crypto.randomUUID(),
        itemId: item.id,
        itemName: item.name,
        type: 'subscription_trap',
        severity: 'warning',
        message: 'Subscription item — recurring charge detected. Check if auto-renewal is on.',
        estimatedCost: Math.round(lineTotal * 12 * 100) / 100,
      });
    }

    if (lineTotal > 400 && isBillCategory) {
      flags.push({
        id: crypto.randomUUID(),
        itemId: item.id,
        itemName: item.name,
        type: 'hidden_charge',
        severity: 'warning',
        message: 'High-value bill — verify for hidden payment gateway or convenience fees.',
        estimatedCost: Math.round(lineTotal * 0.05),
      });
    }

    if (
      nameLower.includes('delivery') ||
      nameLower.includes('handling') ||
      nameLower.includes('convenience') ||
      nameLower.includes('platform fee') ||
      nameLower.includes('packaging') ||
      nameLower.includes('surge') ||
      nameLower.includes('small cart')
    ) {
      flags.push({
        id: crypto.randomUUID(),
        itemId: item.id,
        itemName: item.name,
        type: 'handling_fee',
        severity: 'critical',
        message: 'Unnotified handling charge — this fee was not shown in the product listing.',
        estimatedCost: lineTotal,
      });
    }

    if ((item.price > 100 || lineTotal > 150) && isSnackCategory) {
      flags.push({
        id: crypto.randomUUID(),
        itemId: item.id,
        itemName: item.name,
        type: 'deceptive_pricing',
        severity: 'warning',
        message: 'Premium pricing on impulse snacks — "discount" may be inflated from MRP.',
        estimatedCost: Math.round(lineTotal * 0.15),
      });
    }

    if (
      nameLower.includes('tax') ||
      nameLower.includes('gst') ||
      nameLower.includes('cgst') ||
      nameLower.includes('sgst')
    ) {
      flags.push({
        id: crypto.randomUUID(),
        itemId: item.id,
        itemName: item.name,
        type: 'inflated_tax',
        severity: 'critical',
        message: 'Tax line item — verify GST rate matches the 5%/12%/18% slab.',
        estimatedCost: lineTotal,
      });
    }
  });

  return flags;
}

export function detectCartSurcharges(items: CartItem[]): FeeFlag[] {
  const activeItems = items.filter((i) => i.quantity > 0);
  const flags = detectFees(activeItems);

  const nonBillItems = activeItems.filter((i) => {
    const c = (i.category || '').toLowerCase();
    return c !== 'bills' && !c.includes('bill') && !c.includes('utilit');
  });
  const deliveryCartTotal = nonBillItems.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  );

  if (
    nonBillItems.length > 0 &&
    deliveryCartTotal > 0 &&
    deliveryCartTotal < 199 &&
    !flags.some((f) => f.type === 'handling_fee')
  ) {
    flags.push({
      id: crypto.randomUUID(),
      itemId: 'cart-small-order-risk',
      itemName: 'Active Cart (Under ₹199)',
      type: 'handling_fee',
      severity: 'warning',
      message:
        'Cart value is below ₹199 — quick-commerce apps commonly add a ₹20–₹35 small-cart or delivery fee at checkout.',
      estimatedCost: 25,
    });
  }

  return flags;
}

export function detectReceiptFees(receipts: ParsedReceipt[]): FeeFlag[] {
  const flags: FeeFlag[] = [];

  receipts.forEach((receipt, idx) => {
    const subtotal =
      receipt.subtotal > 0
        ? receipt.subtotal
        : receipt.items.reduce((s, i) => s + i.price, 0);

    if (receipt.deliveryFee > 0) {
      const feeRatio = subtotal > 0 ? receipt.deliveryFee / subtotal : 0;
      const pctText =
        subtotal > 0 ? ` (${(feeRatio * 100).toFixed(1)}% of item subtotal)` : '';
      flags.push({
        id: `receipt-fee-${idx}-${receipt.merchant}`,
        itemId: `receipt-${idx}`,
        itemName: `${receipt.merchant} Receipt — Delivery & Handling`,
        type: 'handling_fee',
        severity: feeRatio >= 0.12 || receipt.deliveryFee >= 30 ? 'critical' : 'warning',
        message: `Extra delivery, handling, or platform charges of ₹${receipt.deliveryFee.toFixed(
          2
        ).replace(/\.00$/, '')}${pctText} detected on scanned receipt.`,
        estimatedCost: receipt.deliveryFee,
      });
    }

    if (receipt.taxTotal > 0 && subtotal > 0) {
      const taxRatio = receipt.taxTotal / subtotal;
      if (taxRatio > 0.185) {
        const excess = Math.round((receipt.taxTotal - subtotal * 0.18) * 100) / 100;
        flags.push({
          id: `receipt-tax-${idx}-${receipt.merchant}`,
          itemId: `receipt-${idx}`,
          itemName: `${receipt.merchant} Receipt — High Tax Rate`,
          type: 'inflated_tax',
          severity: 'critical',
          message: `Tax is ${(taxRatio * 100).toFixed(
            1
          )}% of subtotal — above the standard 18% GST slab.`,
          estimatedCost: excess > 0 ? excess : receipt.taxTotal,
        });
      }
    }
  });

  return flags;
}

export function detectTransactionFees(transactions: Transaction[]): FeeFlag[] {
  const flags: FeeFlag[] = [];
  const activeTxs = transactions.filter(
    (tx) => tx.status !== 'cancelled' && tx.status !== 'refunded' && tx.amount > 0
  );

  for (const tx of activeTxs.slice(0, 40)) {
    const nameLower = tx.name.toLowerCase();
    const catLower = (tx.category || '').toLowerCase();

    if (
      nameLower.includes('subscription') ||
      nameLower.includes('netflix') ||
      nameLower.includes('spotify') ||
      nameLower.includes('prime') ||
      nameLower.includes('hotstar') ||
      nameLower.includes('membership')
    ) {
      flags.push({
        id: `tx-sub-${tx.id}`,
        itemId: tx.id,
        itemName: tx.name,
        type: 'subscription_trap',
        severity: 'warning',
        message: 'Logged subscription expense — review auto-renewal before next billing cycle.',
        estimatedCost: Math.round(tx.amount * 12 * 100) / 100,
      });
      continue;
    }

    if (
      nameLower.includes('handling') ||
      nameLower.includes('delivery') ||
      nameLower.includes('platform fee') ||
      nameLower.includes('surge') ||
      nameLower.includes('convenience')
    ) {
      flags.push({
        id: `tx-fee-${tx.id}`,
        itemId: tx.id,
        itemName: tx.name,
        type: 'handling_fee',
        severity: 'critical',
        message: 'Recorded expense looks like a delivery, surge, or platform surcharge.',
        estimatedCost: tx.amount,
      });
      continue;
    }

    if (
      tx.amount > 500 &&
      (catLower.includes('bill') || catLower.includes('utilit'))
    ) {
      flags.push({
        id: `tx-bill-${tx.id}`,
        itemId: tx.id,
        itemName: tx.name,
        type: 'hidden_charge',
        severity: 'warning',
        message: 'High-value utility/telecom bill — verify for convenience or payment gateway fees.',
        estimatedCost: Math.round(tx.amount * 0.03),
      });
    } else if (
      tx.amount > 250 &&
      (catLower.includes('snack') || catLower.includes('junk'))
    ) {
      flags.push({
        id: `tx-snack-${tx.id}`,
        itemId: tx.id,
        itemName: tx.name,
        type: 'deceptive_pricing',
        severity: 'warning',
        message: 'High single-order snack spend — compare unit prices in Quick Mart.',
        estimatedCost: Math.round(tx.amount * 0.15),
      });
    }
  }

  return flags;
}

export const FEE_TYPE_LABELS: Record<FeeFlag['type'], string> = {
  hidden_charge: 'Hidden Charge',
  subscription_trap: 'Subscription Trap',
  deceptive_pricing: 'Deceptive Pricing',
  handling_fee: 'Handling Fee',
  inflated_tax: 'Inflated Tax',
};

export const FEE_SEVERITY_STYLES: Record<
  FeeFlag['severity'],
  { text: string; bg: string; border: string }
> = {
  warning: {
    text: 'text-amber-800 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-500/15',
    border: 'border-amber-200 dark:border-amber-500/30',
  },
  critical: {
    text: 'text-red-700 dark:text-red-300',
    bg: 'bg-red-50 dark:bg-red-500/15',
    border: 'border-red-200 dark:border-red-500/30',
  },
};

function round2(n: unknown): number {
  const num = typeof n === 'number' ? n : Number(n);
  return Number.isFinite(num) && num >= 0 ? Math.round(num * 100) / 100 : 0;
}

function resolveKnownCategoryName(
  candidate: string | undefined,
  availableCategories: string[]
): string | undefined {
  const trimmed = candidate?.trim();
  if (!trimmed) return undefined;
  const exact = availableCategories.find(
    (c) => c.toLowerCase() === trimmed.toLowerCase()
  );
  return exact ?? trimmed;
}

export function normalizeScannedReceipt(raw: unknown): ParsedReceipt {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const rawItems = Array.isArray(data.items) ? data.items : [];
  const items: ParsedReceiptItem[] = rawItems
    .map((item): ParsedReceiptItem | null => {
      const entry = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
      const name = typeof entry.name === 'string' ? entry.name.trim() : '';
      const price = round2(entry.price);
      if (!name || price <= 0) return null;
      const rawCat = typeof entry.category === 'string' ? entry.category.trim() : '';
      const rawUnit = typeof entry.unit === 'string' ? entry.unit.trim() : '';
      const rawBrand = typeof entry.brand === 'string' ? entry.brand.trim() : '';
      const info = extractProductInfo(name, rawBrand || undefined, rawUnit || undefined);

      return {
        name,
        price,
        category: rawCat || inferCategoryFromName(name, 'Other Expenses'),
        unit: rawUnit || (info.packageSize !== '1 unit' ? info.packageSize : undefined),
        brand: rawBrand || info.brand,
      };
    })
    .filter((x): x is ParsedReceiptItem => x !== null);

  const computedSubtotal = round2(items.reduce((sum, i) => sum + i.price, 0));
  const subtotal = round2(data.subtotal) || computedSubtotal;
  const taxTotal = round2(data.taxTotal);
  const deliveryFee = round2(data.deliveryFee);
  const total = round2(data.total) || round2(subtotal + taxTotal + deliveryFee);

  const rawDate = typeof data.date === 'string' ? data.date.trim() : '';
  const parsedDate = rawDate ? new Date(rawDate) : null;
  const date =
    parsedDate && !Number.isNaN(parsedDate.getTime())
      ? parsedDate.toISOString()
      : new Date().toISOString();

  const merchant =
    typeof data.merchant === 'string' && data.merchant.trim()
      ? data.merchant.trim()
      : 'Receipt Scan';

  return {
    merchant,
    date,
    items,
    subtotal,
    taxTotal,
    deliveryFee,
    total,
  };
}

export function enrichReceiptWithCatalog(
  receipt: ParsedReceipt,
  catalogItems: CartItem[],
  existingObservations: PriceObservation[] = [],
  availableCategories: string[] = []
): ParsedReceipt {
  const enrichedItems: ParsedReceiptItem[] = receipt.items.map((item) => {
    const info = extractProductInfo(item.name, item.brand, item.unit);
    const resolved = resolveCanonicalProduct(
      item.name,
      catalogItems,
      existingObservations,
      {
        explicitCategory: item.category,
        explicitBrand: item.brand,
        explicitPackageSize: item.unit,
      }
    );

    const matchedCatalog = resolved.matchedExisting
      ? catalogItems.find((c) => c.id === resolved.productId)
      : undefined;

    const rawPreferredCat = matchedCatalog
      ? item.category || matchedCatalog.category
      : item.category || inferCategoryFromName(item.name, 'Other Expenses');

    const normalizedCategory =
      resolveKnownCategoryName(rawPreferredCat, availableCategories) ||
      inferCategoryFromName(item.name, 'Other Expenses');

    return {
      ...item,
      category: normalizedCategory,
      unit: item.unit || (info.packageSize !== '1 unit' ? info.packageSize : matchedCatalog?.unit),
      brand: item.brand || info.brand || matchedCatalog?.brand,
      matchedProductId: matchedCatalog?.id,
      isNewCatalogItem: !matchedCatalog,
    };
  });

  return {
    ...receipt,
    items: enrichedItems,
  };
}

