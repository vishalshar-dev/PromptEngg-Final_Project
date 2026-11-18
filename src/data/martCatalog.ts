import type {
  BasketTemplate,
  BasketTemplateItem,
  CartItem,
  CategoryCaps,
  CategoryConfig,
  PriceHistory,
} from '../types/models';
import {
  computeBasketSavedTotal,
  getEffectivePriceAndUnit,
  getPriceHistoryKey,
  toLocalDateKey,
} from '../utils/martEngine';

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
  {
    id: 'cat-groceries',
    name: 'Groceries',
    iconKey: 'wheat',
    accent: 'emerald',
    imageUrl: groceriesImg,
    subcategories: [
      'Rice & Grains',
      'Atta & Flours',
      'Dals & Pulses',
      'Cooking Oils & Ghee',
      'Spices & Condiments',
      'Sugar & Salt',
    ],
    isCustom: false,
    order: 0,
  },
  {
    id: 'cat-produce',
    name: 'Fruits & Vegetables',
    iconKey: 'apple',
    accent: 'lime',
    imageUrl: produceImg,
    subcategories: ['Fresh Vegetables', 'Leafy Greens & Herbs', 'Fresh Fruits', 'Seasonings'],
    isCustom: false,
    order: 1,
  },
  {
    id: 'cat-dairy-bakery',
    name: 'Dairy & Bakery',
    iconKey: 'milk',
    accent: 'sky',
    imageUrl: dairyBakeryImg,
    subcategories: ['Milk & Cream', 'Curd, Paneer & Cheese', 'Butter & Spreads', 'Bread & Buns'],
    isCustom: false,
    order: 2,
  },
  {
    id: 'cat-snacks',
    name: 'Snacks & Beverages',
    iconKey: 'coffee',
    accent: 'amber',
    imageUrl: snacksBevImg,
    subcategories: [
      'Chips & Namkeen',
      'Biscuits & Cookies',
      'Chocolates & Sweets',
      'Soft Drinks & Juices',
      'Tea & Coffee',
    ],
    isCustom: false,
    order: 3,
  },
  {
    id: 'cat-meat-eggs',
    name: 'Meat & Eggs',
    iconKey: 'drumstick',
    accent: 'rose',
    subcategories: ['Eggs', 'Chicken & Poultry', 'Seafood'],
    isCustom: false,
    order: 4,
  },
  {
    id: 'cat-personal-care',
    name: 'Personal Care',
    iconKey: 'sparkles',
    accent: 'pink',
    subcategories: ['Hair Care', 'Oral Care', 'Bath & Body', 'Skin & Grooming'],
    isCustom: false,
    order: 5,
  },
  {
    id: 'cat-household',
    name: 'Household Essentials',
    iconKey: 'home',
    accent: 'teal',
    subcategories: ['Paper & Disposables', 'Utility & Bags', 'Power & Lighting'],
    isCustom: false,
    order: 6,
  },
  {
    id: 'cat-kitchen-home',
    name: 'Kitchen & Home',
    iconKey: 'home',
    accent: 'cyan',
    subcategories: ['Storage Containers', 'Cookware & Utensils', 'Bottles & Flasks'],
    isCustom: false,
    order: 7,
  },
  {
    id: 'cat-cleaning',
    name: 'Cleaning Supplies',
    iconKey: 'spray',
    accent: 'cyan',
    subcategories: ['Laundry Care', 'Dishwash & Kitchen', 'Floor & Bathroom'],
    isCustom: false,
    order: 8,
  },
  {
    id: 'cat-electronics',
    name: 'Electronics',
    iconKey: 'cpu',
    accent: 'indigo',
    subcategories: ['Cables & Chargers', 'Batteries & Power', 'Audio & Peripherals'],
    isCustom: false,
    order: 9,
  },
  {
    id: 'cat-clothing',
    name: 'Clothing & Accessories',
    iconKey: 'shirt',
    accent: 'violet',
    subcategories: ['Innerwear & Socks', 'Casual Tees', 'Everyday Basics'],
    isCustom: false,
    order: 10,
  },
  {
    id: 'cat-healthcare',
    name: 'Medicines & Healthcare',
    iconKey: 'heart-pulse',
    accent: 'red',
    subcategories: ['Supplements', 'First Aid', 'OTC Pain & Cold'],
    isCustom: false,
    order: 11,
  },
  {
    id: 'cat-stationery',
    name: 'Stationery',
    iconKey: 'pen-tool',
    accent: 'amber',
    subcategories: ['Notebooks & Paper', 'Pens & Markers', 'Desk Supplies'],
    isCustom: false,
    order: 12,
  },
  {
    id: 'cat-telecom',
    name: 'Mobile & Internet Bills',
    iconKey: 'wifi',
    accent: 'sky',
    subcategories: ['Broadband Fiber', 'Mobile Recharge', 'DTH & Landline'],
    isCustom: false,
    order: 13,
  },
  {
    id: 'cat-utilities',
    name: 'Electricity & Utilities',
    iconKey: 'zap',
    accent: 'yellow',
    subcategories: ['Electricity', 'Cooking Gas', 'Water & Maintenance'],
    isCustom: false,
    order: 14,
  },
  {
    id: 'cat-fuel',
    name: 'Fuel & Transportation',
    iconKey: 'fuel',
    accent: 'orange',
    subcategories: ['Vehicle Fuel', 'Public Transit', 'Cabs & Tolls'],
    isCustom: false,
    order: 15,
  },
  {
    id: 'cat-entertainment',
    name: 'Entertainment',
    iconKey: 'film',
    accent: 'violet',
    subcategories: ['Cinema & Events', 'OTT & Music', 'Gaming'],
    isCustom: false,
    order: 16,
  },
  {
    id: 'cat-other',
    name: 'Other Expenses',
    iconKey: 'package',
    accent: 'slate',
    subcategories: ['Courier & Delivery', 'Repairs', 'General Misc'],
    isCustom: false,
    order: 17,
  },
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
    brand: 'India Gate',
    category: 'Groceries',
    subcategory: 'Rice & Grains',
    description: 'Aged long-grain Rozana basmati rice for daily biryanis and steamed meals.',
    tags: ['basmati', 'rice', 'grain', 'staple', 'india gate'],
    price: 115,
    icon: '🌾',
    quantity: 0,
    unit: '1 kg',
    productType: 'essential',
    imageUrl: groceriesImg,
    isFrequent: true,
    isPopular: true,
    isFavourite: true,
    allowDecimalQuantity: true,
    quantityStep: 0.5,
    selectedVariantId: 'var-rice-1kg',
    variants: [
      { id: 'var-rice-1kg', label: '1 kg Pack', unit: '1 kg', price: 115 },
      { id: 'var-rice-5kg', label: '5 kg Bag', unit: '5 kg', price: 540 },
      { id: 'var-rice-10kg', label: '10 kg Family', unit: '10 kg', price: 1020 },
    ],
    recurrence: { frequency: 'monthly', nextDueDate: todayKey },
  },
  {
    id: 'item-wheat-flour',
    name: 'Whole Wheat Atta',
    brand: 'Aashirvaad',
    category: 'Groceries',
    subcategory: 'Atta & Flours',
    description: '100% chakki-ground MP sharbati wheat flour for soft rotis.',
    tags: ['atta', 'flour', 'wheat', 'roti', 'aashirvaad'],
    price: 230,
    icon: '🌾',
    quantity: 0,
    unit: '5 kg',
    productType: 'essential',
    imageUrl: groceriesImg,
    isFrequent: true,
    isPopular: true,
    selectedVariantId: 'var-atta-5kg',
    variants: [
      { id: 'var-atta-1kg', label: '1 kg Trial', unit: '1 kg', price: 54 },
      { id: 'var-atta-5kg', label: '5 kg Pack', unit: '5 kg', price: 230 },
      { id: 'var-atta-10kg', label: '10 kg Value', unit: '10 kg', price: 445 },
    ],
  },
  {
    id: 'item-sugar',
    name: 'Sulphur-Free Sugar',
    brand: 'Trust Classic',
    category: 'Groceries',
    subcategory: 'Sugar & Salt',
    description: 'Fine crystalline sparkling white sugar for tea, coffee, and desserts.',
    tags: ['sugar', 'sweetener', 'pantry'],
    price: 48,
    icon: '🍚',
    quantity: 0,
    unit: '1 kg',
    productType: 'essential',
    imageUrl: groceriesImg,
    allowDecimalQuantity: true,
    quantityStep: 0.5,
  },
  {
    id: 'item-salt',
    name: 'Iodized Vacuum Salt',
    brand: 'Tata Salt',
    category: 'Groceries',
    subcategory: 'Sugar & Salt',
    description: 'Pure vacuum-evaporated iodized crystal salt.',
    tags: ['salt', 'tata', 'iodized', 'seasoning'],
    price: 28,
    icon: '🧂',
    quantity: 0,
    unit: '1 kg',
    productType: 'essential',
    imageUrl: groceriesImg,
    isPopular: true,
  },
  {
    id: 'item-cooking-oil',
    name: 'Sunflower Cooking Oil',
    brand: 'Fortune',
    category: 'Groceries',
    subcategory: 'Cooking Oils & Ghee',
    description: 'Light refined sunflower oil fortified with Vitamin A & D.',
    tags: ['oil', 'cooking oil', 'sunflower', 'fortune'],
    price: 155,
    icon: '🫒',
    quantity: 0,
    unit: '1 L',
    productType: 'essential',
    imageUrl: groceriesImg,
    isFrequent: true,
    isPopular: true,
    selectedVariantId: 'var-oil-1l',
    variants: [
      { id: 'var-oil-1l', label: '1 L Pouch', unit: '1 L', price: 155 },
      { id: 'var-oil-2l', label: '2 L Bottle', unit: '2 L', price: 305 },
      { id: 'var-oil-5l', label: '5 L Can', unit: '5 L', price: 745 },
    ],
  },
  {
    id: 'item-pulses',
    name: 'Unpolished Toor Dal',
    brand: 'Tata Sampann',
    category: 'Groceries',
    subcategory: 'Dals & Pulses',
    description: 'Farm-sourced unpolished protein-rich arhar/toor dal.',
    tags: ['dal', 'pulses', 'lentils', 'toor', 'tata sampann'],
    price: 165,
    icon: '🫘',
    quantity: 0,
    unit: '1 kg',
    productType: 'essential',
    imageUrl: groceriesImg,
    allowDecimalQuantity: true,
    quantityStep: 0.5,
    selectedVariantId: 'var-dal-500g',
    variants: [
      { id: 'var-dal-500g', label: '500 g', unit: '500 g', price: 86 },
      { id: 'var-dal-1kg', label: '1 kg', unit: '1 kg', price: 165 },
    ],
  },
  {
    id: 'item-cow-ghee',
    name: 'Pure Cow Ghee',
    brand: 'Amul',
    category: 'Groceries',
    subcategory: 'Cooking Oils & Ghee',
    description: 'Aromatic granular pure cow ghee for cooking and tadka.',
    tags: ['ghee', 'amul', 'clarified butter'],
    price: 335,
    icon: '🧈',
    quantity: 0,
    unit: '500 ml',
    productType: 'essential',
    imageUrl: groceriesImg,
    selectedVariantId: 'var-ghee-500ml',
    variants: [
      { id: 'var-ghee-500ml', label: '500 ml Jar', unit: '500 ml', price: 335 },
      { id: 'var-ghee-1l', label: '1 L Tin', unit: '1 L', price: 645 },
    ],
  },
  {
    id: 'item-masala-turmeric',
    name: 'Turmeric & Masala Combo',
    brand: 'Everest',
    category: 'Groceries',
    subcategory: 'Spices & Condiments',
    description: 'Haldi powder, red chilli & garam masala pantry spice trio.',
    tags: ['spices', 'masala', 'haldi', 'turmeric', 'everest'],
    price: 112,
    icon: '🌶️',
    quantity: 0,
    unit: '200 g',
    productType: 'essential',
    imageUrl: groceriesImg,
  },

  // Fruits & Vegetables (decimal loose weights supported!)
  {
    id: 'item-tomatoes',
    name: 'Fresh Hybrid Tomatoes',
    brand: 'Local Farm',
    category: 'Fruits & Vegetables',
    subcategory: 'Fresh Vegetables',
    description: 'Farm-fresh vine tomatoes sold by loose weight.',
    tags: ['tomato', 'tomatoes', 'vegetable', 'produce', 'sabzi'],
    price: 45,
    icon: '🍅',
    quantity: 0,
    unit: '1 kg',
    productType: 'essential',
    imageUrl: produceImg,
    isFrequent: true,
    isPopular: true,
    allowDecimalQuantity: true,
    quantityStep: 0.5,
  },
  {
    id: 'item-onions',
    name: 'Nashik Red Onions',
    brand: 'Local Farm',
    category: 'Fruits & Vegetables',
    subcategory: 'Fresh Vegetables',
    description: 'Crisp medium-sized red onions for daily curries and salads.',
    tags: ['onion', 'onions', 'pyaz', 'vegetable'],
    price: 40,
    icon: '🧅',
    quantity: 0,
    unit: '1 kg',
    productType: 'essential',
    imageUrl: produceImg,
    isPopular: true,
    allowDecimalQuantity: true,
    quantityStep: 0.5,
  },
  {
    id: 'item-potatoes',
    name: 'Fresh Jyoti Potatoes',
    brand: 'Local Farm',
    category: 'Fruits & Vegetables',
    subcategory: 'Fresh Vegetables',
    description: 'Washed everyday cooking potatoes sourced directly from mandis.',
    tags: ['potato', 'potatoes', 'aloo', 'vegetable'],
    price: 36,
    icon: '🥔',
    quantity: 0,
    unit: '1 kg',
    productType: 'essential',
    imageUrl: produceImg,
    allowDecimalQuantity: true,
    quantityStep: 0.5,
  },
  {
    id: 'item-spinach',
    name: 'Fresh Palak (Spinach)',
    brand: 'HydroGreen',
    category: 'Fruits & Vegetables',
    subcategory: 'Leafy Greens & Herbs',
    description: 'Clean trimmed tender spinach leaves, pre-rinsed batch.',
    tags: ['spinach', 'palak', 'greens', 'leafy'],
    price: 32,
    icon: '🥬',
    quantity: 0,
    unit: '250 g',
    productType: 'essential',
    imageUrl: produceImg,
  },
  {
    id: 'item-bananas',
    name: 'Robusta Bananas',
    brand: 'FreshHarvest',
    category: 'Fruits & Vegetables',
    subcategory: 'Fresh Fruits',
    description: 'Naturally ripened sweet bananas rich in potassium.',
    tags: ['banana', 'bananas', 'fruit'],
    price: 60,
    icon: '🍌',
    quantity: 0,
    unit: '1 dozen',
    productType: 'essential',
    imageUrl: produceImg,
    isFavourite: true,
    isPopular: true,
    selectedVariantId: 'var-ban-6',
    variants: [
      { id: 'var-ban-6', label: '6 pcs', unit: '6 pcs', price: 32 },
      { id: 'var-ban-12', label: '1 dozen', unit: '1 dozen', price: 60 },
    ],
  },
  {
    id: 'item-apples',
    name: 'Shimla Royal Apples',
    brand: 'Himachal Orchards',
    category: 'Fruits & Vegetables',
    subcategory: 'Fresh Fruits',
    description: 'Crisp juicy mountain apples, hand-graded.',
    tags: ['apple', 'apples', 'shimla', 'fruit'],
    price: 180,
    icon: '🍎',
    quantity: 0,
    unit: '1 kg',
    productType: 'essential',
    imageUrl: produceImg,
    allowDecimalQuantity: true,
    quantityStep: 0.5,
  },

  // Dairy & Bakery
  {
    id: 'item-milk',
    name: 'Taaza Toned Fresh Milk',
    brand: 'Amul',
    category: 'Dairy & Bakery',
    subcategory: 'Milk & Cream',
    description: 'Pasteurized double-toned daily milk pouch or tetra pack.',
    tags: ['milk', 'amul', 'taaza', 'dairy'],
    price: 56,
    icon: '🥛',
    quantity: 0,
    unit: '1 L',
    productType: 'essential',
    imageUrl: dairyBakeryImg,
    isFrequent: true,
    isPopular: true,
    isFavourite: true,
    selectedVariantId: 'var-milk-1l',
    variants: [
      { id: 'var-milk-500ml', label: '500 ml', unit: '500 ml', price: 29 },
      { id: 'var-milk-1l', label: '1 L', unit: '1 L', price: 56 },
      { id: 'var-milk-2l', label: '2 L Family', unit: '2 L', price: 108 },
    ],
    recurrence: { frequency: 'daily', nextDueDate: todayKey },
  },
  {
    id: 'item-curd',
    name: 'Masti Set Curd (Dahi)',
    brand: 'Mother Dairy',
    category: 'Dairy & Bakery',
    subcategory: 'Curd, Paneer & Cheese',
    description: 'Thick creamy probiotic set curd in sealed tub.',
    tags: ['curd', 'dahi', 'yogurt', 'mother dairy'],
    price: 45,
    icon: '🥣',
    quantity: 0,
    unit: '400 g',
    productType: 'essential',
    imageUrl: dairyBakeryImg,
    selectedVariantId: 'var-curd-400g',
    variants: [
      { id: 'var-curd-400g', label: '400 g Cup', unit: '400 g', price: 45 },
      { id: 'var-curd-1kg', label: '1 kg Tub', unit: '1 kg', price: 98 },
    ],
  },
  {
    id: 'item-paneer',
    name: 'Malai Fresh Paneer',
    brand: 'Amul',
    category: 'Dairy & Bakery',
    subcategory: 'Curd, Paneer & Cheese',
    description: 'Soft creamy cottage cheese block packed fresh.',
    tags: ['paneer', 'cottage cheese', 'amul', 'protein'],
    price: 95,
    icon: '🧀',
    quantity: 0,
    unit: '200 g',
    productType: 'essential',
    imageUrl: dairyBakeryImg,
    selectedVariantId: 'var-paneer-200g',
    variants: [
      { id: 'var-paneer-200g', label: '200 g', unit: '200 g', price: 95 },
      { id: 'var-paneer-400g', label: '400 g', unit: '400 g', price: 185 },
    ],
  },
  {
    id: 'item-bread',
    name: 'Whole Wheat Brown Bread',
    brand: 'Harvest Gold',
    category: 'Dairy & Bakery',
    subcategory: 'Bread & Buns',
    description: 'Zero-maida wholesome sliced brown bread loaf.',
    tags: ['bread', 'brown bread', 'wheat', 'harvest gold', 'bakery'],
    price: 50,
    icon: '🍞',
    quantity: 0,
    unit: '400 g',
    productType: 'essential',
    imageUrl: dairyBakeryImg,
    isFrequent: true,
    isPopular: true,
  },
  {
    id: 'item-butter',
    name: 'Salted Table Butter',
    brand: 'Amul',
    category: 'Dairy & Bakery',
    subcategory: 'Butter & Spreads',
    description: 'Classic salted pasteurized butter for toast and parathas.',
    tags: ['butter', 'amul', 'spread'],
    price: 58,
    icon: '🧈',
    quantity: 0,
    unit: '100 g',
    productType: 'essential',
    imageUrl: dairyBakeryImg,
    selectedVariantId: 'var-butter-100g',
    variants: [
      { id: 'var-butter-100g', label: '100 g', unit: '100 g', price: 58 },
      { id: 'var-butter-500g', label: '500 g', unit: '500 g', price: 275 },
    ],
  },
  {
    id: 'item-cheese',
    name: 'Cheddar Cheese Block',
    brand: 'Britannia',
    category: 'Dairy & Bakery',
    subcategory: 'Curd, Paneer & Cheese',
    description: 'Rich processed cheddar block great for sandwiches & pasta.',
    tags: ['cheese', 'cheddar', 'britannia'],
    price: 145,
    icon: '🧀',
    quantity: 0,
    unit: '200 g',
    productType: 'discretionary',
    imageUrl: dairyBakeryImg,
  },

  // Snacks & Beverages
  {
    id: 'item-chips',
    name: "India's Magic Masala Chips",
    brand: "Lay's",
    category: 'Snacks & Beverages',
    subcategory: 'Chips & Namkeen',
    description: 'Crunchy masala potato chips for movie nights & tea breaks.',
    tags: ['chips', 'lays', 'snack', 'namkeen'],
    price: 30,
    icon: '🍟',
    quantity: 0,
    unit: '73 g',
    productType: 'discretionary',
    imageUrl: snacksBevImg,
    selectedVariantId: 'var-chips-73g',
    variants: [
      { id: 'var-chips-50g', label: 'Small 50g', unit: '50 g', price: 20 },
      { id: 'var-chips-73g', label: 'Party 73g', unit: '73 g', price: 30 },
      { id: 'var-chips-150g', label: 'Family 150g', unit: '150 g', price: 50 },
    ],
  },
  {
    id: 'item-biscuits',
    name: 'Marie Gold Wheat Biscuits',
    brand: 'Britannia',
    category: 'Snacks & Beverages',
    subcategory: 'Biscuits & Cookies',
    description: 'Light crisp tea-time wheat biscuits, low fat.',
    tags: ['biscuits', 'marie', 'britannia', 'cookies'],
    price: 35,
    icon: '🍪',
    quantity: 0,
    unit: '250 g',
    productType: 'discretionary',
    imageUrl: snacksBevImg,
    isPopular: true,
    selectedVariantId: 'var-biscuit-250g',
    variants: [
      { id: 'var-biscuit-250g', label: 'Regular 250g', unit: '250 g', price: 35 },
      { id: 'var-biscuit-500g', label: 'Family 500g', unit: '500 g', price: 65 },
    ],
  },
  {
    id: 'item-soda',
    name: 'Zero Sugar Cola',
    brand: 'Coca-Cola',
    category: 'Snacks & Beverages',
    subcategory: 'Soft Drinks & Juices',
    description: 'Chilled sparkling cola beverage bottle.',
    tags: ['cola', 'soda', 'soft drink', 'beverage', 'coca cola'],
    price: 40,
    icon: '🥤',
    quantity: 0,
    unit: '750 ml',
    productType: 'discretionary',
    imageUrl: snacksBevImg,
  },
  {
    id: 'item-orange-juice',
    name: '100% Valencia Orange Juice',
    brand: 'Tropicana',
    category: 'Snacks & Beverages',
    subcategory: 'Soft Drinks & Juices',
    description: 'No added sugar orange breakfast juice tetra pack.',
    tags: ['juice', 'orange juice', 'beverage', 'tropicana'],
    price: 125,
    icon: '🧃',
    quantity: 0,
    unit: '1 L',
    productType: 'discretionary',
    imageUrl: snacksBevImg,
  },
  {
    id: 'item-chocolate',
    name: 'Roasted Almond Silk',
    brand: 'Cadbury',
    category: 'Snacks & Beverages',
    subcategory: 'Chocolates & Sweets',
    description: 'Smooth chocolate bar packed with crunchy roasted almonds.',
    tags: ['chocolate', 'cadbury', 'sweet', 'dessert'],
    price: 80,
    icon: '🍫',
    quantity: 0,
    unit: '1 bar',
    productType: 'discretionary',
    imageUrl: snacksBevImg,
  },
  {
    id: 'item-coffee',
    name: 'Classic Instant Coffee',
    brand: 'Nescafe',
    category: 'Snacks & Beverages',
    subcategory: 'Tea & Coffee',
    description: 'Rich slow-roasted instant coffee jar.',
    tags: ['coffee', 'nescafe', 'tea', 'beverage'],
    price: 240,
    icon: '☕',
    quantity: 0,
    unit: '200 g',
    productType: 'essential',
    imageUrl: snacksBevImg,
    isFavourite: true,
    selectedVariantId: 'var-coffee-90g',
    variants: [
      { id: 'var-coffee-90g', label: '90 g Jar', unit: '90 g', price: 185 },
      { id: 'var-coffee-200g', label: '200 g Jar', unit: '200 g', price: 360 },
    ],
  },
  {
    id: 'item-tata-tea',
    name: 'Assam Gold Leaf Tea',
    brand: 'Tata Tea',
    category: 'Snacks & Beverages',
    subcategory: 'Tea & Coffee',
    description: 'Aromatic long-leaf Assam chai blend.',
    tags: ['tea', 'chai', 'tata tea', 'beverage'],
    price: 155,
    icon: '🍵',
    quantity: 0,
    unit: '250 g',
    productType: 'essential',
    imageUrl: snacksBevImg,
  },

  // Meat & Eggs
  {
    id: 'item-eggs',
    name: 'Farm Fresh White Eggs',
    brand: 'Keggs',
    category: 'Meat & Eggs',
    subcategory: 'Eggs',
    description: 'Antibiotic-free high-protein farm eggs packed in protective tray.',
    tags: ['eggs', 'egg', 'protein', 'breakfast'],
    price: 70,
    icon: '🥚',
    quantity: 0,
    unit: '6 pcs',
    productType: 'essential',
    isFrequent: true,
    isPopular: true,
    selectedVariantId: 'var-eggs-6',
    variants: [
      { id: 'var-eggs-6', label: '6 pcs', unit: '6 pcs', price: 70 },
      { id: 'var-eggs-12', label: '12 pcs', unit: '12 pcs', price: 135 },
      { id: 'var-eggs-30', label: '30 pcs Tray', unit: '30 pcs', price: 310 },
    ],
    recurrence: { frequency: 'weekly', nextDueDate: todayKey },
  },
  {
    id: 'item-chicken',
    name: 'Chicken Breast Boneless',
    brand: 'Licious',
    category: 'Meat & Eggs',
    subcategory: 'Chicken & Poultry',
    description: 'Skinless chilled boneless chicken breast fillets.',
    tags: ['chicken', 'meat', 'protein', 'licious'],
    price: 260,
    icon: '🍗',
    quantity: 0,
    unit: '500 g',
    productType: 'essential',
  },

  // Personal Care
  {
    id: 'item-bodywash',
    name: 'Herbal Moisturizing Body Wash',
    brand: 'Dove',
    category: 'Personal Care',
    subcategory: 'Bath & Body',
    description: 'Gentle sulfate-free nourishing body cleanser.',
    tags: ['body wash', 'soap', 'bath', 'dove'],
    price: 210,
    icon: '🧴',
    quantity: 0,
    unit: '250 ml',
    productType: 'essential',
  },
  {
    id: 'item-shampoo',
    name: 'Anti-Hairfall Shampoo',
    brand: 'Loreal',
    category: 'Personal Care',
    subcategory: 'Hair Care',
    description: 'Arginine strengthening daily shampoo.',
    tags: ['shampoo', 'hair', 'haircare', 'loreal'],
    price: 295,
    icon: '🧴',
    quantity: 0,
    unit: '340 ml',
    productType: 'essential',
    isPopular: true,
    selectedVariantId: 'var-shampoo-340ml',
    variants: [
      { id: 'var-shampoo-180ml', label: '180 ml', unit: '180 ml', price: 175 },
      { id: 'var-shampoo-340ml', label: '340 ml', unit: '340 ml', price: 295 },
      { id: 'var-shampoo-650ml', label: '650 ml', unit: '650 ml', price: 499 },
    ],
  },
  {
    id: 'item-toothpaste',
    name: 'Strong Teeth Mint Toothpaste',
    brand: 'Colgate',
    category: 'Personal Care',
    subcategory: 'Oral Care',
    description: 'Amino-shakti anticavity toothpaste pack.',
    tags: ['toothpaste', 'colgate', 'oral care'],
    price: 95,
    icon: '🪥',
    quantity: 0,
    unit: '150 g',
    productType: 'essential',
  },
  {
    id: 'item-facewash',
    name: 'Oil Control Face Wash',
    brand: 'Nivea',
    category: 'Personal Care',
    subcategory: 'Skin & Grooming',
    description: 'Gentle cooling daily face cleanser for fresh skin.',
    tags: ['face wash', 'skincare', 'nivea'],
    price: 189,
    icon: '✨',
    quantity: 0,
    unit: '100 ml',
    productType: 'essential',
  },

  // Household Essentials
  {
    id: 'item-tissue-rolls',
    name: 'Kitchen Tissue Towels',
    brand: 'Origami',
    category: 'Household Essentials',
    subcategory: 'Paper & Disposables',
    description: '2-ply high-absorbency kitchen paper towel rolls.',
    tags: ['tissue', 'paper towel', 'kitchen'],
    price: 135,
    icon: '🧻',
    quantity: 0,
    unit: '4 rolls',
    productType: 'essential',
  },
  {
    id: 'item-garbage-bags',
    name: 'Biodegradable Trash Bags',
    brand: 'Presto',
    category: 'Household Essentials',
    subcategory: 'Utility & Bags',
    description: 'Leak-proof medium compostable dustbin liner roll.',
    tags: ['trash bags', 'garbage bags', 'bin'],
    price: 110,
    icon: '🛍️',
    quantity: 0,
    unit: '30 pcs',
    productType: 'essential',
  },
  {
    id: 'item-led-bulb',
    name: '9W Cool Daylight LED Bulb',
    brand: 'Philips',
    category: 'Household Essentials',
    subcategory: 'Power & Lighting',
    description: 'Energy-efficient B22 base warm/daylight LED bulb.',
    tags: ['bulb', 'led', 'lighting', 'philips'],
    price: 129,
    icon: '💡',
    quantity: 0,
    unit: '1 pc',
    productType: 'essential',
  },

  // Kitchen & Home
  {
    id: 'item-storage-containers',
    name: 'Airtight Pantry Container Set',
    brand: 'cello',
    category: 'Kitchen & Home',
    subcategory: 'Storage Containers',
    description: 'BPA-free modular stackable kitchen jar set for pulses & snacks.',
    tags: ['container', 'storage', 'jars', 'kitchen'],
    price: 399,
    icon: '🥣',
    quantity: 0,
    unit: '4 pcs',
    productType: 'essential',
  },
  {
    id: 'item-steel-bottle',
    name: 'Insulated Steel Water Bottle',
    brand: 'Milton',
    category: 'Kitchen & Home',
    subcategory: 'Bottles & Flasks',
    description: 'Double-walled 304 stainless steel thermosteel 1L bottle.',
    tags: ['bottle', 'flask', 'milton', 'steel'],
    price: 549,
    icon: '🍶',
    quantity: 0,
    unit: '1 L',
    productType: 'essential',
  },

  // Cleaning Supplies
  {
    id: 'item-detergent',
    name: 'Matic Liquid Laundry Detergent',
    brand: 'Surf Excel',
    category: 'Cleaning Supplies',
    subcategory: 'Laundry Care',
    description: 'Front & top load stain-removal liquid wash.',
    tags: ['detergent', 'surf excel', 'laundry', 'washing'],
    price: 280,
    icon: '🫧',
    quantity: 0,
    unit: '1 L',
    productType: 'essential',
    isPopular: true,
    selectedVariantId: 'var-surf-1l',
    variants: [
      { id: 'var-surf-1l', label: '1 L Bottle', unit: '1 L', price: 280 },
      { id: 'var-surf-2l', label: '2 L Refill', unit: '2 L', price: 510 },
    ],
  },
  {
    id: 'item-dishwash',
    name: 'Lemon Dishwash Concentrate',
    brand: 'Vim',
    category: 'Cleaning Supplies',
    subcategory: 'Dishwash & Kitchen',
    description: 'Power-degreasing lemon gel for spotless cookware.',
    tags: ['dishwash', 'vim', 'utensils', 'kitchen clean'],
    price: 120,
    icon: '🧼',
    quantity: 0,
    unit: '500 ml',
    productType: 'essential',
  },
  {
    id: 'item-floor-cleaner',
    name: 'Disinfectant Surface Cleaner',
    brand: 'Lizol',
    category: 'Cleaning Supplies',
    subcategory: 'Floor & Bathroom',
    description: 'Citrus pine floor cleaner killing 99.9% germs.',
    tags: ['floor cleaner', 'lizol', 'disinfectant'],
    price: 215,
    icon: '🧹',
    quantity: 0,
    unit: '1 L',
    productType: 'essential',
  },

  // Electronics
  {
    id: 'item-usbc-cable',
    name: 'Braided USB-C 60W Fast Cable',
    brand: 'Anker',
    category: 'Electronics',
    subcategory: 'Cables & Chargers',
    description: '1.5m nylon braided PD fast charging data cable.',
    tags: ['usb-c', 'cable', 'charger', 'anker'],
    price: 349,
    icon: '🔌',
    quantity: 0,
    unit: '1 pc',
    productType: 'discretionary',
  },
  {
    id: 'item-aa-batteries',
    name: 'Alkaline AA Power Batteries',
    brand: 'Duracell',
    category: 'Electronics',
    subcategory: 'Batteries & Power',
    description: 'Long-lasting alkaline cells for remotes and wireless gear.',
    tags: ['batteries', 'aa', 'duracell'],
    price: 160,
    icon: '🔋',
    quantity: 0,
    unit: '4 pcs',
    productType: 'essential',
  },

  // Clothing & Accessories
  {
    id: 'item-cotton-socks',
    name: 'Combed Cotton Ankle Socks',
    brand: 'Jockey',
    category: 'Clothing & Accessories',
    subcategory: 'Innerwear & Socks',
    description: 'Breathable cushioned cotton sock value pack.',
    tags: ['socks', 'cotton', 'jockey'],
    price: 299,
    icon: '🧦',
    quantity: 0,
    unit: '3 pairs',
    productType: 'essential',
  },
  {
    id: 'item-tshirt',
    name: 'Essential Crew Cotton T-Shirt',
    brand: 'BasicCo',
    category: 'Clothing & Accessories',
    subcategory: 'Casual Tees',
    description: '180 GSM bio-washed everyday casual tee.',
    tags: ['tshirt', 't-shirt', 'apparel'],
    price: 499,
    icon: '👕',
    quantity: 0,
    unit: '1 pc',
    productType: 'discretionary',
  },

  // Medicines & Healthcare
  {
    id: 'item-vitaminc',
    name: 'Vitamin C + Zinc Immunity Tabs',
    brand: 'Limcee',
    category: 'Medicines & Healthcare',
    subcategory: 'Supplements',
    description: 'Chewable antioxidant Vitamin C & Zinc tablets.',
    tags: ['vitamin c', 'immunity', 'supplement'],
    price: 185,
    icon: '💊',
    quantity: 0,
    unit: '20 tabs',
    productType: 'essential',
  },
  {
    id: 'item-firstaid',
    name: 'Washproof Adhesive Bandages',
    brand: 'Hansaplast',
    category: 'Medicines & Healthcare',
    subcategory: 'First Aid',
    description: 'Flexible breathable antiseptic bandage strips.',
    tags: ['bandages', 'first aid', 'medical'],
    price: 85,
    icon: '🩹',
    quantity: 0,
    unit: '25 pcs',
    productType: 'essential',
  },

  // Stationery
  {
    id: 'item-notebook',
    name: 'Grid Ruled A5 Spiral Notebook',
    brand: 'Classmate',
    category: 'Stationery',
    subcategory: 'Notebooks & Paper',
    description: '160-page thick GSM paper notebook for notes & journaling.',
    tags: ['notebook', 'diary', 'stationery'],
    price: 120,
    icon: '📓',
    quantity: 0,
    unit: '1 pc',
    productType: 'essential',
  },
  {
    id: 'item-gel-pens',
    name: 'Smooth Fine-Tip Gel Pens',
    brand: 'Pilot',
    category: 'Stationery',
    subcategory: 'Pens & Markers',
    description: 'Waterproof ink 0.5mm black/blue gel pen pack.',
    tags: ['pens', 'gel pen', 'stationery'],
    price: 90,
    icon: '🖊️',
    quantity: 0,
    unit: '5 pcs',
    productType: 'essential',
  },

  // Mobile & Internet Bills (clearly tagged as Bills & Recurring)
  {
    id: 'item-wifi',
    name: 'Home Fiber Wi-Fi Plan',
    brand: 'Airtel Xstream',
    category: 'Mobile & Internet Bills',
    subcategory: 'Broadband Fiber',
    description: 'Monthly unlimited 100 Mbps fiber broadband internet bill.',
    tags: ['wifi', 'broadband', 'internet', 'bill'],
    price: 500,
    icon: '📶',
    quantity: 0,
    unit: '1 mo',
    productType: 'bill',
    isFrequent: true,
    recurrence: { frequency: 'monthly', nextDueDate: todayKey },
  },
  {
    id: 'item-mobile-recharge',
    name: 'Mobile Prepaid Recharge',
    brand: 'Jio',
    category: 'Mobile & Internet Bills',
    subcategory: 'Mobile Recharge',
    description: 'Monthly 5G data + unlimited voice recharge.',
    tags: ['mobile', 'recharge', 'jio', 'bill'],
    price: 299,
    icon: '📱',
    quantity: 0,
    unit: '1 mo',
    productType: 'bill',
    recurrence: { frequency: 'monthly', nextDueDate: todayKey },
  },

  // Electricity & Utilities
  {
    id: 'item-electricity-bill',
    name: 'Monthly Electricity Bill',
    brand: 'Power Grid',
    category: 'Electricity & Utilities',
    subcategory: 'Electricity',
    description: 'Monthly domestic meter power bill.',
    tags: ['electricity', 'power', 'bill', 'utility'],
    price: 1450,
    icon: '⚡',
    quantity: 0,
    unit: '1 mo',
    productType: 'bill',
  },
  {
    id: 'item-lpg-cylinder',
    name: 'Cooking Gas Refill (14.2 kg)',
    brand: 'Indane',
    category: 'Electricity & Utilities',
    subcategory: 'Cooking Gas',
    description: 'Domestic LPG cooking cylinder refill.',
    tags: ['gas', 'lpg', 'cylinder', 'utility'],
    price: 905,
    icon: '🔥',
    quantity: 0,
    unit: '14 kg',
    productType: 'essential',
  },

  // Fuel & Transportation
  {
    id: 'item-petrol',
    name: 'Unleaded Petrol',
    brand: 'IndianOil',
    category: 'Fuel & Transportation',
    subcategory: 'Vehicle Fuel',
    description: 'Regular octane petrol entered by litres.',
    tags: ['petrol', 'fuel', 'gasoline', 'bike', 'car'],
    price: 105,
    icon: '⛽',
    quantity: 0,
    unit: '1 L',
    productType: 'essential',
    isFrequent: true,
    allowDecimalQuantity: true,
    quantityStep: 0.5,
  },
  {
    id: 'item-metro-pass',
    name: 'Metro Transit Card Top-Up',
    brand: 'Metro Rail',
    category: 'Fuel & Transportation',
    subcategory: 'Public Transit',
    description: 'Smart card commute balance recharge.',
    tags: ['metro', 'transit', 'travel', 'commute'],
    price: 200,
    icon: '🚇',
    quantity: 0,
    unit: '1 trip',
    productType: 'essential',
  },

  // Entertainment
  {
    id: 'item-movie-ticket',
    name: 'Cinema Multiplex Ticket',
    brand: 'PVR Inox',
    category: 'Entertainment',
    subcategory: 'Cinema & Events',
    description: 'Standard weekend/weekday movie pass.',
    tags: ['movie', 'cinema', 'ticket', 'entertainment'],
    price: 280,
    icon: '🎬',
    quantity: 0,
    unit: '1 ticket',
    productType: 'discretionary',
  },
  {
    id: 'item-streaming-sub',
    name: 'Music & Video Streaming Plan',
    brand: 'Spotify / OTT',
    category: 'Entertainment',
    subcategory: 'OTT & Music',
    description: 'Monthly entertainment subscription.',
    tags: ['streaming', 'spotify', 'ott', 'subscription', 'bill'],
    price: 199,
    icon: '🎵',
    quantity: 0,
    unit: '1 mo',
    productType: 'bill',
  },

  // Other Expenses
  {
    id: 'item-parcel-courier',
    name: 'Local Courier / Misc Fee',
    brand: 'Express Post',
    category: 'Other Expenses',
    subcategory: 'Courier & Delivery',
    description: 'Local parcel dispatch or miscellaneous errand.',
    tags: ['courier', 'misc', 'parcel'],
    price: 75,
    icon: '📦',
    quantity: 0,
    unit: '1 unit',
    productType: 'essential',
  },
];

const INITIAL_BY_ID = new Map(INITIAL_MART_ITEMS.map((item) => [item.id, item]));
const INITIAL_CAT_BY_NAME = new Map(
  INITIAL_CATEGORY_CONFIGS.map((cfg) => [cfg.name.toLowerCase(), cfg])
);

const LEGACY_CATEGORY_MAP: Record<string, string> = {
  Junk: 'Snacks & Beverages',
  Fuel: 'Fuel & Transportation',
  Bills: 'Mobile & Internet Bills',
};

export function generateSeededMarketHistory(
  item: Pick<CartItem, 'name' | 'price' | 'unit' | 'brand'>,
  now: Date = new Date(),
  variant?: { id?: string; label?: string; unit?: string; price?: number }
) {
  const effectivePrice = variant?.price ?? item.price;
  const effectiveUnit = variant?.unit ?? item.unit ?? '1 unit';
  const points = [];
  for (let i = 5; i >= 1; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 15);
    const variance = (Math.sin(i * 1.7) + Math.cos(i * 0.9)) * 0.06;
    const trend = (5 - i) * 0.015;
    const price = Math.round(effectivePrice * (0.9 + trend + variance) * 100) / 100;
    points.push({
      date: d.toISOString(),
      price,
      unit: effectiveUnit,
      source: 'market_verified' as const,
      productName: item.name,
      variantId: variant?.id,
      variantLabel: variant?.label,
      brand: item.brand,
    });
  }
  points.push({
    date: now.toISOString(),
    price: effectivePrice,
    unit: effectiveUnit,
    source: 'market_verified' as const,
    productName: item.name,
    variantId: variant?.id,
    variantLabel: variant?.label,
    brand: item.brand,
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

    if (item.variants && item.variants.length > 0) {
      for (const variant of item.variants) {
        const key = getPriceHistoryKey(item.id, variant.id);
        if (!next[key] || next[key].length === 0) {
          next[key] = generateSeededMarketHistory(item, new Date(), variant);
        }
      }
    }
  }
  return next;
}

export function migratePersistedMartItems(persistedItems: CartItem[] | undefined): CartItem[] {
  if (!persistedItems || persistedItems.length === 0) {
    return INITIAL_MART_ITEMS;
  }

  const resultMap = new Map<string, CartItem>();
  // Seed upgraded default catalog items
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
        category: mappedCategory || seedMatch.category,
        subcategory: saved.subcategory ?? seedMatch.subcategory,
        brand: saved.brand ?? seedMatch.brand,
        description: saved.description ?? seedMatch.description,
        tags: saved.tags && saved.tags.length > 0 ? saved.tags : seedMatch.tags,
        variants: saved.variants && saved.variants.length > 0 ? saved.variants : seedMatch.variants,
        selectedVariantId: saved.selectedVariantId ?? seedMatch.selectedVariantId,
        allowDecimalQuantity: saved.allowDecimalQuantity ?? seedMatch.allowDecimalQuantity,
        quantityStep: saved.quantityStep ?? seedMatch.quantityStep,
        unit: saved.unit ?? seedMatch.unit,
        productType: saved.productType ?? seedMatch.productType,
        imageUrl: saved.imageUrl ?? seedMatch.imageUrl,
        recurrence: saved.recurrence !== undefined ? saved.recurrence : seedMatch.recurrence,
        isFavourite: saved.isFavourite ?? seedMatch.isFavourite,
        isFrequent: saved.isFrequent ?? seedMatch.isFrequent,
        isPopular: saved.isPopular ?? seedMatch.isPopular,
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
    const initMatch = INITIAL_CAT_BY_NAME.get(cfg.name.toLowerCase());
    const mergedSubs = Array.from(
      new Set([...(cfg.subcategories ?? []), ...(initMatch?.subcategories ?? [])])
    );
    byName.set(cfg.name.toLowerCase(), {
      ...cfg,
      subcategories: mergedSubs.length > 0 ? mergedSubs : cfg.subcategories,
    });
  }

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

function buildPresetBasket(
  id: string,
  name: string,
  description: string,
  specs: { itemId: string; variantId?: string; quantity: number }[]
): BasketTemplate {
  const catalogMap = new Map(INITIAL_MART_ITEMS.map((item) => [item.id, item]));
  const nowIso = new Date().toISOString();
  const basketItems: BasketTemplateItem[] = [];

  for (const spec of specs) {
    const item = catalogMap.get(spec.itemId);
    if (!item) continue;
    const { price, unit, variant } = getEffectivePriceAndUnit(item, spec.variantId);
    basketItems.push({
      itemId: item.id,
      name: item.name,
      brand: item.brand,
      category: item.category,
      subcategory: item.subcategory,
      variantId: variant?.id,
      variantLabel: variant?.label,
      unit,
      quantity: spec.quantity,
      savedPrice: price,
    });
  }

  return {
    id,
    name,
    description,
    items: basketItems,
    savedTotal: computeBasketSavedTotal(basketItems),
    createdAt: nowIso,
    updatedAt: nowIso,
    lastLoadedAt: null,
    isPreset: true,
  };
}

export const INITIAL_BASKET_TEMPLATES: BasketTemplate[] = [
  buildPresetBasket(
    'basket-weekly-kitchen',
    'Weekly Kitchen Essentials',
    'Dairy, fresh produce & protein staples for a standard week',
    [
      { itemId: 'item-milk', variantId: 'var-milk-1l', quantity: 2 },
      { itemId: 'item-eggs', variantId: 'var-eggs-6', quantity: 1 },
      { itemId: 'item-bread', quantity: 1 },
      { itemId: 'item-tomatoes', quantity: 1.5 },
      { itemId: 'item-onions', quantity: 1 },
      { itemId: 'item-bananas', variantId: 'var-ban-6', quantity: 1 },
    ]
  ),
  buildPresetBasket(
    'basket-monthly-staples',
    'Monthly Staples Bulk',
    'Bulk grains, atta, cooking oil, dal & salt pantry refill',
    [
      { itemId: 'item-rice', variantId: 'var-rice-5kg', quantity: 1 },
      { itemId: 'item-wheat-flour', variantId: 'var-atta-5kg', quantity: 1 },
      { itemId: 'item-cooking-oil', variantId: 'var-oil-2l', quantity: 1 },
      { itemId: 'item-pulses', variantId: 'var-dal-1kg', quantity: 1 },
      { itemId: 'item-salt', quantity: 1 },
    ]
  ),
  buildPresetBasket(
    'basket-breakfast-chai',
    'Breakfast & Chai Refill',
    'Morning bread, butter, milk pouches, chai & sugar',
    [
      { itemId: 'item-milk', variantId: 'var-milk-500ml', quantity: 2 },
      { itemId: 'item-butter', variantId: 'var-butter-100g', quantity: 1 },
      { itemId: 'item-bread', quantity: 1 },
      { itemId: 'item-tata-tea', quantity: 1 },
      { itemId: 'item-sugar', quantity: 1 },
    ]
  ),
];

