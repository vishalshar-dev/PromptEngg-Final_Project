import type { CartItem, CategoryCaps, CategoryConfig, PriceHistory } from '../types/models';
import { toLocalDateKey } from '../utils/martEngine';

import groceriesImg from '../assets/images/product_groceries_staples_1794985498688.jpg';
import produceImg from '../assets/images/product_fresh_produce_1794985499454.jpg';
import dairyBakeryImg from '../assets/images/product_dairy_bakery_1794985499371.jpg';
import snacksBevImg from '../assets/images/product_snacks_beverages_1794985499430.jpg';

export const CATEGORY_IMAGES: Record<string, string> = {
  Groceries: groceriesImg,
  'Fruits & Vegetables': produceImg,
  'Dairy & Bakery': dairyBakeryImg,
  'Snacks & Beverages': snacksBevImg,
};

export const CATEGORY_ICON_KEYS = [
  'wheat',
  'apple',
  'milk',
  'coffee',
  'drumstick',
  'sparkles',
  'home',
  'spray',
  'cpu',
  'shirt',
  'heart-pulse',
  'pen-tool',
  'wifi',
  'zap',
  'fuel',
  'film',
  'package',
] as const;

export const INITIAL_CATEGORY_CONFIGS: CategoryConfig[] = [
  { id: 'cat-groceries', name: 'Groceries', iconKey: 'wheat', accent: 'emerald', imageUrl: groceriesImg, isCustom: false, order: 0 },
  { id: 'cat-produce', name: 'Fruits & Vegetables', iconKey: 'apple', accent: 'lime', imageUrl: produceImg, isCustom: false, order: 1 },
  { id: 'cat-dairy-bakery', name: 'Dairy & Bakery', iconKey: 'milk', accent: 'sky', imageUrl: dairyBakeryImg, isCustom: false, order: 2 },
  { id: 'cat-snacks', name: 'Snacks & Beverages', iconKey: 'coffee', accent: 'amber', imageUrl: snacksBevImg, isCustom: false, order: 3 },
  { id: 'cat-meat-eggs', name: 'Meat & Eggs', iconKey: 'drumstick', accent: 'rose', isCustom: false, order: 4 },
  { id: 'cat-personal-care', name: 'Personal Care', iconKey: 'sparkles', accent: 'pink', isCustom: false, order: 5 },
  { id: 'cat-household', name: 'Household Essentials', iconKey: 'home', accent: 'teal', isCustom: false, order: 6 },
  { id: 'cat-cleaning', name: 'Cleaning Supplies', iconKey: 'spray', accent: 'cyan', isCustom: false, order: 7 },
  { id: 'cat-electronics', name: 'Electronics', iconKey: 'cpu', accent: 'indigo', isCustom: false, order: 8 },
  { id: 'cat-clothing', name: 'Clothing & Accessories', iconKey: 'shirt', accent: 'violet', isCustom: false, order: 9 },
  { id: 'cat-healthcare', name: 'Medicines & Healthcare', iconKey: 'heart-pulse', accent: 'red', isCustom: false, order: 10 },
  { id: 'cat-stationery', name: 'Stationery', iconKey: 'pen-tool', accent: 'amber', isCustom: false, order: 11 },
  { id: 'cat-telecom', name: 'Mobile & Internet Bills', iconKey: 'wifi', accent: 'sky', isCustom: false, order: 12 },
  { id: 'cat-utilities', name: 'Electricity & Utilities', iconKey: 'zap', accent: 'yellow', isCustom: false, order: 13 },
  { id: 'cat-fuel', name: 'Fuel & Transportation', iconKey: 'fuel', accent: 'orange', isCustom: false, order: 14 },
  { id: 'cat-entertainment', name: 'Entertainment', iconKey: 'film', accent: 'violet', isCustom: false, order: 15 },
  { id: 'cat-other', name: 'Other Expenses', iconKey: 'package', accent: 'slate', isCustom: false, order: 16 },
];

export const INITIAL_MART_CATEGORIES: string[] = INITIAL_CATEGORY_CONFIGS.map((c) => c.name);

export const INITIAL_MART_CATEGORY_CAPS: CategoryCaps = Object.fromEntries(
  INITIAL_MART_CATEGORIES.map((name) => [name, null])
);

const todayKey = toLocalDateKey(new Date());

export const INITIAL_MART_ITEMS: CartItem[] = [
  // Groceries (Staples)
  {
    id: 'item-rice',
    name: 'Basmati Rice',
    price: 90,
    category: 'Groceries',
    icon: '🍚',
    quantity: 0,
    unit: '1 kg',
    productType: 'Staple Grain',
    imageUrl: groceriesImg,
    isFrequent: true,
    isFavourite: true,
    recurrence: { frequency: 'monthly', nextDueDate: todayKey },
  },
  {
    id: 'item-wheat-flour',
    name: 'Wheat Flour (Atta)',
    price: 230,
    category: 'Groceries',
    icon: '🌾',
    quantity: 0,
    unit: '5 kg',
    productType: 'Staple Flour',
    imageUrl: groceriesImg,
    isFrequent: true,
  },
  {
    id: 'item-sugar',
    name: 'Refined Sugar',
    price: 48,
    category: 'Groceries',
    icon: '🧂',
    quantity: 0,
    unit: '1 kg',
    productType: 'Pantry Staple',
    imageUrl: groceriesImg,
  },
  {
    id: 'item-salt',
    name: 'Iodized Salt',
    price: 28,
    category: 'Groceries',
    icon: '🧂',
    quantity: 0,
    unit: '1 kg',
    productType: 'Pantry Staple',
    imageUrl: groceriesImg,
  },
  {
    id: 'item-cooking-oil',
    name: 'Sunflower Cooking Oil',
    price: 155,
    category: 'Groceries',
    icon: '🫒',
    quantity: 0,
    unit: '1 L',
    productType: 'Cooking Oil',
    imageUrl: groceriesImg,
    isFrequent: true,
  },
  {
    id: 'item-pulses',
    name: 'Toor Dal (Pulses)',
    price: 165,
    category: 'Groceries',
    icon: '🫘',
    quantity: 0,
    unit: '1 kg',
    productType: 'Lentils & Pulses',
    imageUrl: groceriesImg,
  },

  // Fruits & Vegetables
  {
    id: 'item-tomatoes',
    name: 'Fresh Tomatoes',
    price: 45,
    category: 'Fruits & Vegetables',
    icon: '🍅',
    quantity: 0,
    unit: '1 kg',
    productType: 'Fresh Vegetable',
    imageUrl: produceImg,
    isFrequent: true,
  },
  {
    id: 'item-onions',
    name: 'Red Onions',
    price: 40,
    category: 'Fruits & Vegetables',
    icon: '🧅',
    quantity: 0,
    unit: '1 kg',
    productType: 'Fresh Vegetable',
    imageUrl: produceImg,
  },
  {
    id: 'item-bananas',
    name: 'Robusta Bananas',
    price: 60,
    category: 'Fruits & Vegetables',
    icon: '🍌',
    quantity: 0,
    unit: '1 dozen',
    productType: 'Fresh Fruit',
    imageUrl: produceImg,
    isFavourite: true,
  },
  {
    id: 'item-apples',
    name: 'Shimla Apples',
    price: 180,
    category: 'Fruits & Vegetables',
    icon: '🍎',
    quantity: 0,
    unit: '1 kg',
    productType: 'Fresh Fruit',
    imageUrl: produceImg,
  },

  // Dairy & Bakery
  {
    id: 'item-milk',
    name: 'Fresh Milk',
    price: 60,
    category: 'Dairy & Bakery',
    icon: '🥛',
    quantity: 0,
    unit: '1 L',
    productType: 'Dairy',
    imageUrl: dairyBakeryImg,
    isFrequent: true,
    isFavourite: true,
    recurrence: { frequency: 'daily', nextDueDate: todayKey },
  },
  {
    id: 'item-bread',
    name: 'Whole Wheat Bread',
    price: 50,
    category: 'Dairy & Bakery',
    icon: '🍞',
    quantity: 0,
    unit: '1 pack',
    productType: 'Bakery',
    imageUrl: dairyBakeryImg,
    isFrequent: true,
  },
  {
    id: 'item-butter',
    name: 'Salted Table Butter',
    price: 275,
    category: 'Dairy & Bakery',
    icon: '🧈',
    quantity: 0,
    unit: '500 g',
    productType: 'Dairy',
    imageUrl: dairyBakeryImg,
  },
  {
    id: 'item-cheese',
    name: 'Cheddar Cheese Block',
    price: 145,
    category: 'Dairy & Bakery',
    icon: '🧀',
    quantity: 0,
    unit: '200 g',
    productType: 'Dairy',
    imageUrl: dairyBakeryImg,
  },

  // Snacks & Beverages
  {
    id: 'item-chips',
    name: 'Salted Kettle Chips',
    price: 30,
    category: 'Snacks & Beverages',
    icon: '🥔',
    quantity: 0,
    unit: '150 g',
    productType: 'Snack',
    imageUrl: snacksBevImg,
  },
  {
    id: 'item-soda',
    name: 'Sparkling Cola',
    price: 40,
    category: 'Snacks & Beverages',
    icon: '🥤',
    quantity: 0,
    unit: '750 ml',
    productType: 'Beverage',
    imageUrl: snacksBevImg,
  },
  {
    id: 'item-chocolate',
    name: 'Dark Roast Chocolate',
    price: 50,
    category: 'Snacks & Beverages',
    icon: '🍫',
    quantity: 0,
    unit: '1 bar',
    productType: 'Confectionery',
    imageUrl: snacksBevImg,
  },
  {
    id: 'item-coffee',
    name: 'Filter Ground Coffee',
    price: 240,
    category: 'Snacks & Beverages',
    icon: '☕',
    quantity: 0,
    unit: '250 g',
    productType: 'Beverage',
    imageUrl: snacksBevImg,
    isFavourite: true,
  },

  // Meat & Eggs
  {
    id: 'item-eggs',
    name: 'Farm Fresh Eggs',
    price: 70,
    category: 'Meat & Eggs',
    icon: '🥚',
    quantity: 0,
    unit: '6 pcs',
    productType: 'Poultry & Eggs',
    isFrequent: true,
    recurrence: { frequency: 'weekly', nextDueDate: todayKey },
  },
  {
    id: 'item-chicken',
    name: 'Chicken Breast Boneless',
    price: 260,
    category: 'Meat & Eggs',
    icon: '🍗',
    quantity: 0,
    unit: '500 g',
    productType: 'Fresh Meat',
  },

  // Personal Care
  {
    id: 'item-bodywash',
    name: 'Herbal Body Wash',
    price: 210,
    category: 'Personal Care',
    icon: '🧴',
    quantity: 0,
    unit: '250 ml',
    productType: 'Bath & Body',
  },
  {
    id: 'item-toothpaste',
    name: 'Mint Toothpaste',
    price: 95,
    category: 'Personal Care',
    icon: '🪥',
    quantity: 0,
    unit: '150 g',
    productType: 'Oral Care',
  },

  // Household Essentials
  {
    id: 'item-tissue-rolls',
    name: 'Kitchen Tissue Towels',
    price: 135,
    category: 'Household Essentials',
    icon: '🧻',
    quantity: 0,
    unit: '4 rolls',
    productType: 'Paper Goods',
  },
  {
    id: 'item-garbage-bags',
    name: 'Biodegradable Trash Bags',
    price: 110,
    category: 'Household Essentials',
    icon: '🛍️',
    quantity: 0,
    unit: '30 pcs',
    productType: 'Utility',
  },

  // Cleaning Supplies
  {
    id: 'item-detergent',
    name: 'Liquid Laundry Detergent',
    price: 280,
    category: 'Cleaning Supplies',
    icon: '🫧',
    quantity: 0,
    unit: '1 L',
    productType: 'Laundry Care',
  },
  {
    id: 'item-dishwash',
    name: 'Lemon Dishwash Gel',
    price: 120,
    category: 'Cleaning Supplies',
    icon: '🧼',
    quantity: 0,
    unit: '500 ml',
    productType: 'Kitchen Care',
  },

  // Electronics
  {
    id: 'item-usbc-cable',
    name: 'Braided USB-C Fast Cable',
    price: 349,
    category: 'Electronics',
    icon: '🔌',
    quantity: 0,
    unit: '1 pc',
    productType: 'Accessory',
  },
  {
    id: 'item-aa-batteries',
    name: 'Alkaline AA Batteries',
    price: 160,
    category: 'Electronics',
    icon: '🔋',
    quantity: 0,
    unit: '4 pcs',
    productType: 'Power',
  },

  // Clothing & Accessories
  {
    id: 'item-cotton-socks',
    name: 'Combed Cotton Socks',
    price: 299,
    category: 'Clothing & Accessories',
    icon: '🧦',
    quantity: 0,
    unit: '3 pairs',
    productType: 'Apparel',
  },
  {
    id: 'item-tshirt',
    name: 'Essential Crew T-Shirt',
    price: 499,
    category: 'Clothing & Accessories',
    icon: '👕',
    quantity: 0,
    unit: '1 pc',
    productType: 'Apparel',
  },

  // Medicines & Healthcare
  {
    id: 'item-vitaminc',
    name: 'Vitamin C + Zinc Tablets',
    price: 185,
    category: 'Medicines & Healthcare',
    icon: '💊',
    quantity: 0,
    unit: '20 tabs',
    productType: 'Supplement',
  },
  {
    id: 'item-firstaid',
    name: 'Antiseptic Adhesive Bandages',
    price: 85,
    category: 'Medicines & Healthcare',
    icon: '🩹',
    quantity: 0,
    unit: '25 pcs',
    productType: 'First Aid',
  },

  // Stationery
  {
    id: 'item-notebook',
    name: 'Grid Ruled A5 Notebook',
    price: 120,
    category: 'Stationery',
    icon: '📓',
    quantity: 0,
    unit: '1 pc',
    productType: 'Paper & Notes',
  },
  {
    id: 'item-gel-pens',
    name: 'Fine-Tip Gel Pens',
    price: 90,
    category: 'Stationery',
    icon: '🖊️',
    quantity: 0,
    unit: '5 pcs',
    productType: 'Writing',
  },

  // Mobile & Internet Bills
  {
    id: 'item-wifi',
    name: 'Home Fiber Wi-Fi Plan',
    price: 500,
    category: 'Mobile & Internet Bills',
    icon: '📶',
    quantity: 0,
    unit: '1 mo',
    productType: 'Broadband Bill',
    isFrequent: true,
    recurrence: { frequency: 'monthly', nextDueDate: todayKey },
  },
  {
    id: 'item-mobile-recharge',
    name: 'Mobile Prepaid Recharge',
    price: 299,
    category: 'Mobile & Internet Bills',
    icon: '📱',
    quantity: 0,
    unit: '1 mo',
    productType: 'Telecom Bill',
    recurrence: { frequency: 'monthly', nextDueDate: todayKey },
  },

  // Electricity & Utilities
  {
    id: 'item-electricity-bill',
    name: 'Monthly Electricity Bill',
    price: 1450,
    category: 'Electricity & Utilities',
    icon: '⚡',
    quantity: 0,
    unit: '1 mo',
    productType: 'Utility Bill',
  },
  {
    id: 'item-lpg-cylinder',
    name: 'Cooking Gas Refill',
    price: 905,
    category: 'Electricity & Utilities',
    icon: '🔥',
    quantity: 0,
    unit: '14 kg',
    productType: 'Cooking Gas',
  },

  // Fuel & Transportation
  {
    id: 'item-petrol',
    name: 'Unleaded Petrol',
    price: 105,
    category: 'Fuel & Transportation',
    icon: '⛽',
    quantity: 0,
    unit: '1 L',
    productType: 'Vehicle Fuel',
    isFrequent: true,
  },
  {
    id: 'item-metro-pass',
    name: 'Metro Transit Card Top-Up',
    price: 200,
    category: 'Fuel & Transportation',
    icon: '🚇',
    quantity: 0,
    unit: '1 trip',
    productType: 'Transit',
  },

  // Entertainment
  {
    id: 'item-movie-ticket',
    name: 'Cinema Ticket',
    price: 280,
    category: 'Entertainment',
    icon: '🎬',
    quantity: 0,
    unit: '1 ticket',
    productType: 'Movies',
  },
  {
    id: 'item-streaming-sub',
    name: 'Music & Video Streaming',
    price: 199,
    category: 'Entertainment',
    icon: '🎵',
    quantity: 0,
    unit: '1 mo',
    productType: 'Subscription',
  },

  // Other Expenses
  {
    id: 'item-parcel-courier',
    name: 'Local Courier / Misc Fee',
    price: 75,
    category: 'Other Expenses',
    icon: '📦',
    quantity: 0,
    unit: '1 unit',
    productType: 'Miscellaneous',
  },
];

const INITIAL_BY_ID = new Map(INITIAL_MART_ITEMS.map((item) => [item.id, item]));

const LEGACY_CATEGORY_MAP: Record<string, string> = {
  Junk: 'Snacks & Beverages',
  Fuel: 'Fuel & Transportation',
  Bills: 'Mobile & Internet Bills',
};

export function generateSeededMarketHistory(
  item: Pick<CartItem, 'name' | 'price' | 'unit'>,
  now: Date = new Date()
) {
  const points = [];
  for (let i = 5; i >= 1; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 15);
    const variance = (Math.sin(i * 1.7) + Math.cos(i * 0.9)) * 0.06;
    const trend = (5 - i) * 0.015;
    const price = Math.round(item.price * (0.9 + trend + variance) * 100) / 100;
    points.push({
      date: d.toISOString(),
      price,
      unit: item.unit ?? '1 unit',
      source: 'market_verified' as const,
      productName: item.name,
    });
  }
  points.push({
    date: now.toISOString(),
    price: item.price,
    unit: item.unit ?? '1 unit',
    source: 'market_verified' as const,
    productName: item.name,
  });
  return points;
}

export function ensureCatalogPriceHistory(
  items: CartItem[],
  existing: PriceHistory = {}
): PriceHistory {
  const next: PriceHistory = { ...existing };
  for (const item of items) {
    if (!next[item.id] || next[item.id].length === 0) {
      next[item.id] = generateSeededMarketHistory(item);
    } else {
      next[item.id] = next[item.id].map((pt) => ({
        ...pt,
        unit: pt.unit ?? item.unit,
        source: pt.source ?? 'market_verified',
        productName: pt.productName ?? item.name,
      }));
    }
  }
  return next;
}

export function migratePersistedMartItems(persistedItems: CartItem[] | undefined): CartItem[] {
  if (!persistedItems || persistedItems.length === 0) {
    return INITIAL_MART_ITEMS;
  }

  const resultMap = new Map<string, CartItem>();
  // First seed all default catalog items
  for (const catalogItem of INITIAL_MART_ITEMS) {
    resultMap.set(catalogItem.id, { ...catalogItem });
  }

  // Merge persisted user items & modified prices/quantities/favourites/recurrences
  for (const saved of persistedItems) {
    if (!saved || typeof saved.id !== 'string') continue;
    const seedMatch = INITIAL_BY_ID.get(saved.id);
    const mappedCategory = LEGACY_CATEGORY_MAP[saved.category] ?? saved.category;

    if (seedMatch) {
      resultMap.set(saved.id, {
        ...seedMatch,
        ...saved,
        // Preserve upgraded name/category/image/unit when saved item didn't customize them
        category: mappedCategory || seedMatch.category,
        unit: saved.unit ?? seedMatch.unit,
        productType: saved.productType ?? seedMatch.productType,
        imageUrl: saved.imageUrl ?? seedMatch.imageUrl,
        recurrence: saved.recurrence !== undefined ? saved.recurrence : seedMatch.recurrence,
        isFavourite: saved.isFavourite ?? seedMatch.isFavourite,
        isFrequent: saved.isFrequent ?? seedMatch.isFrequent,
      });
    } else {
      resultMap.set(saved.id, {
        ...saved,
        category: mappedCategory || 'Other Expenses',
        unit: saved.unit || '1 unit',
        isCustom: saved.isCustom ?? true,
      });
    }
  }

  return Array.from(resultMap.values());
}

export function migrateCategoryConfigs(
  persistedConfigs: CategoryConfig[] | undefined,
  persistedCategories: string[] | undefined,
  items: CartItem[],
  transactions: { category: string }[]
): CategoryConfig[] {
  const baseConfigs =
    persistedConfigs && persistedConfigs.length > 0
      ? [...persistedConfigs].sort((a, b) => a.order - b.order)
      : [...INITIAL_CATEGORY_CONFIGS];

  const byName = new Map<string, CategoryConfig>();
  for (const cfg of baseConfigs) {
    byName.set(cfg.name.toLowerCase(), cfg);
  }

  // Ensure any default imageUrl is filled for initial categories if missing
  for (const init of INITIAL_CATEGORY_CONFIGS) {
    const existing = byName.get(init.name.toLowerCase());
    if (!existing) {
      byName.set(init.name.toLowerCase(), { ...init, order: byName.size });
    } else if (!existing.imageUrl && init.imageUrl) {
      byName.set(init.name.toLowerCase(), { ...existing, imageUrl: init.imageUrl });
    }
  }

  const extraNames = [
    ...(persistedCategories ?? []),
    ...items.map((i) => i.category),
    ...transactions.map((t) => t.category),
  ];

  for (const rawName of extraNames) {
    const trimmed = rawName?.trim();
    if (!trimmed) continue;
    // Do not resurrect legacy short names if they were replaced, unless user has transactions using them
    if (trimmed in LEGACY_CATEGORY_MAP && !transactions.some((t) => t.category === trimmed)) {
      continue;
    }
    if (!byName.has(trimmed.toLowerCase())) {
      byName.set(trimmed.toLowerCase(), {
        id: `cat-custom-${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name: trimmed,
        iconKey: 'package',
        accent: 'teal',
        isCustom: true,
        order: byName.size,
      });
    }
  }

  return Array.from(byName.values())
    .sort((a, b) => a.order - b.order)
    .map((cfg, idx) => ({ ...cfg, order: idx }));
}
