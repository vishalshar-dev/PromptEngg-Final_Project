import type { ParsedReceipt, ParsedReceiptItem, FeeFlag, CartItem } from '../types/models';

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

  for (const line of lines) {
    // Match a trailing price such as "₹145.00", "Rs. 45", "45.50", "-₹20"
    const match = line.match(
      /^(.+?)\s+(?:[-−]\s*)?(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)\s*$/i
    );
    if (!match) continue;

    let label = match[1].replace(/[:\-–—]+$/, '').trim();
    const amount = cleanAmount(match[2]);
    if (!label || amount <= 0 || amount > 1000000) continue;

    // Skip metadata lines with numbers like "Order #12345" or "Phone 9876543210"
    if (/^(order|invoice|bill\s*no|receipt|phone|mobile|pin|gstin|fssai|upi|txn)/i.test(label)) {
      continue;
    }

    const lower = label.toLowerCase();

    if (TAX_KEYWORDS.some((kw) => lower.includes(kw))) {
      taxTotal = Math.round((taxTotal + amount) * 100) / 100;
      continue;
    }

    if (FEE_KEYWORDS.some((kw) => lower.includes(kw))) {
      deliveryFee = Math.round((deliveryFee + amount) * 100) / 100;
      continue;
    }

    if (/^(subtotal|sub[\s-]?total|item\s*total|items\s*total)$/i.test(lower)) {
      explicitSubtotal = amount;
      continue;
    }

    if (
      /^(total|grand\s*total|net\s*total|bill\s*total|total\s*payable|amount\s*paid|to\s*pay|paid)$/i.test(
        lower
      )
    ) {
      explicitTotal = amount;
      continue;
    }

    if (SUMMARY_KEYWORDS.some((kw) => lower.includes(kw))) {
      continue;
    }

    // Clean quantity prefix like "2 x Milk" or "2x Milk"
    label = label.replace(/^\d+\s*[xX×]\s+/, '').trim();
    if (label.length < 2) continue;

    items.push({
      name: label,
      price: amount,
    });
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
    const nameLower = item.name.toLowerCase();

    if (
      nameLower.includes('subscription') ||
      nameLower.includes('netflix') ||
      nameLower.includes('spotify') ||
      nameLower.includes('prime') ||
      nameLower.includes('hotstar')
    ) {
      flags.push({
        id: crypto.randomUUID(),
        itemId: item.id,
        itemName: item.name,
        type: 'subscription_trap',
        severity: 'warning',
        message: 'Subscription item — recurring charge detected. Check if auto-renewal is on.',
        estimatedCost: item.price * 12,
      });
    }

    if (item.price > 400 && item.category === 'Bills') {
      flags.push({
        id: crypto.randomUUID(),
        itemId: item.id,
        itemName: item.name,
        type: 'hidden_charge',
        severity: 'warning',
        message: 'High-value bill — verify for hidden surcharges or convenience fees.',
        estimatedCost: Math.round(item.price * 0.05),
      });
    }

    if (
      nameLower.includes('delivery') ||
      nameLower.includes('handling') ||
      nameLower.includes('convenience')
    ) {
      flags.push({
        id: crypto.randomUUID(),
        itemId: item.id,
        itemName: item.name,
        type: 'handling_fee',
        severity: 'critical',
        message: 'Unnotified handling charge — this fee was not shown in the product listing.',
        estimatedCost: item.price,
      });
    }

    if (item.price > 100 && item.category === 'Junk') {
      flags.push({
        id: crypto.randomUUID(),
        itemId: item.id,
        itemName: item.name,
        type: 'deceptive_pricing',
        severity: 'warning',
        message: 'Premium pricing on junk food — "discount" may be inflated from MSRP.',
        estimatedCost: Math.round(item.price * 0.15),
      });
    }

    if (nameLower.includes('tax') || nameLower.includes('gst')) {
      flags.push({
        id: crypto.randomUUID(),
        itemId: item.id,
        itemName: item.name,
        type: 'inflated_tax',
        severity: 'critical',
        message: 'Tax line item — verify GST rate matches the 5%/12%/18% slab.',
        estimatedCost: item.price,
      });
    }
  });

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
    text: 'text-amber-800',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  critical: {
    text: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
};

function round2(n: unknown): number {
  const num = typeof n === 'number' ? n : Number(n);
  return Number.isFinite(num) && num >= 0 ? Math.round(num * 100) / 100 : 0;
}

export function normalizeScannedReceipt(raw: unknown): ParsedReceipt {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const rawItems = Array.isArray(data.items) ? data.items : [];
  const items: ParsedReceiptItem[] = rawItems
    .map((item) => {
      const entry = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
      const name = typeof entry.name === 'string' ? entry.name.trim() : '';
      const price = round2(entry.price);
      if (!name || price <= 0) return null;
      return { name, price };
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

