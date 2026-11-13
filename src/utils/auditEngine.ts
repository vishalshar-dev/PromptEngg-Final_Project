import type { ParsedReceipt, ParsedReceiptItem, FeeFlag, CartItem } from '../store/useStore';

const MERCHANTS = [
  'Blinkit', 'Zepto', 'Swiggy Instamart', 'BigBasket', 'Amazon Fresh',
  'Flipkart Quick', 'Dunzo', 'JioMart',
];

const SAMPLE_ITEMS: { name: string; price: number; category: string }[] = [
  { name: 'Amul Taaza Milk 500ml', price: 27, category: 'Groceries' },
  { name: 'Lay\'s Classic Salted', price: 20, category: 'Junk' },
  { name: 'Coca-Cola 750ml', price: 42, category: 'Junk' },
  { name: 'Britannia Bread', price: 45, category: 'Groceries' },
  { name: 'Fortune Sunflower Oil 1L', price: 145, category: 'Groceries' },
  { name: 'Dairy Milk Silk', price: 80, category: 'Junk' },
  { name: ' maggi Noodles 4-pack', price: 56, category: 'Groceries' },
  { name: 'Red Bull 250ml', price: 125, category: 'Junk' },
  { name: 'Haldiram Bhujia 200g', price: 35, category: 'Junk' },
  { name: 'Tata Salt 1kg', price: 28, category: 'Groceries' },
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function mockParseReceipt(fileName: string, fileSize: number): ParsedReceipt {
  const seed = fileName.length * 1000 + fileSize;
  const rand = seededRandom(seed);

  const merchant = MERCHANTS[Math.floor(rand() * MERCHANTS.length)];
  const itemCount = 2 + Math.floor(rand() * 4);
  const selectedIndices = new Set<number>();
  while (selectedIndices.size < itemCount) {
    selectedIndices.add(Math.floor(rand() * SAMPLE_ITEMS.length));
  }

  const items: ParsedReceiptItem[] = [];
  const usedNames = new Set<string>();

  selectedIndices.forEach((idx) => {
    const sample = SAMPLE_ITEMS[idx];
    if (usedNames.has(sample.name)) return;
    usedNames.add(sample.name);
    const priceVar = 0.9 + rand() * 0.25;
    const basePrice = Math.round(sample.price * priceVar * 100) / 100;
    const hasTax = rand() > 0.4;
    const taxRate = 0.05 + rand() * 0.13;
    const tax = hasTax ? Math.round(basePrice * taxRate * 100) / 100 : 0;
    const hasDelivery = rand() > 0.5;
    const deliveryFee = hasDelivery ? Math.round((10 + rand() * 35) * 100) / 100 : 0;

    items.push({
      name: sample.name.trim(),
      price: basePrice,
      tax: hasTax ? tax : undefined,
      deliveryFee: hasDelivery ? deliveryFee : undefined,
    });
  });

  const subtotal = items.reduce((sum, i) => sum + i.price, 0);
  const taxTotal = items.reduce((sum, i) => sum + (i.tax ?? 0), 0);
  const perItemDelivery = items.filter((i) => i.deliveryFee).length;
  const deliveryFee = items.reduce((sum, i) => sum + (i.deliveryFee ?? 0), 0);
  const total = Math.round((subtotal + taxTotal + deliveryFee) * 100) / 100;

  const date = new Date(Date.now() - Math.floor(rand() * 7 * 86400000)).toISOString();

  return {
    merchant,
    date,
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    taxTotal: Math.round(taxTotal * 100) / 100,
    deliveryFee: Math.round(deliveryFee * 100) / 100,
    total,
  };
}

export function detectFees(items: CartItem[]): FeeFlag[] {
  const flags: FeeFlag[] = [];

  items.forEach((item) => {
    const nameLower = item.name.toLowerCase();

    if (nameLower.includes('subscription') || nameLower.includes('netflix') ||
        nameLower.includes('spotify') || nameLower.includes('prime') ||
        nameLower.includes('hotstar')) {
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

    if (nameLower.includes('delivery') || nameLower.includes('handling') ||
        nameLower.includes('convenience')) {
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

export const FEE_SEVERITY_STYLES: Record<FeeFlag['severity'], { text: string; bg: string; border: string }> = {
  warning: {
    text: 'text-orange-300',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
  },
  critical: {
    text: 'text-red-300',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
  },
};
