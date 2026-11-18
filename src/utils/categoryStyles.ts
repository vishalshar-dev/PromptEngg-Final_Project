export interface CategoryStyle {
  text: string;
  bg: string;
  border: string;
  dot: string;
  gradient: string;
}

const accentPalette: Record<string, CategoryStyle> = {
  emerald: {
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    gradient: 'from-emerald-50 to-white',
  },
  lime: {
    text: 'text-lime-700',
    bg: 'bg-lime-50',
    border: 'border-lime-200',
    dot: 'bg-lime-500',
    gradient: 'from-lime-50 to-white',
  },
  sky: {
    text: 'text-sky-700',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    dot: 'bg-sky-500',
    gradient: 'from-sky-50 to-white',
  },
  amber: {
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    gradient: 'from-amber-50 to-white',
  },
  orange: {
    text: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
    gradient: 'from-orange-50 to-white',
  },
  rose: {
    text: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
    gradient: 'from-rose-50 to-white',
  },
  pink: {
    text: 'text-pink-700',
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    dot: 'bg-pink-500',
    gradient: 'from-pink-50 to-white',
  },
  teal: {
    text: 'text-teal-700',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    dot: 'bg-teal-500',
    gradient: 'from-teal-50 to-white',
  },
  cyan: {
    text: 'text-cyan-700',
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    dot: 'bg-cyan-500',
    gradient: 'from-cyan-50 to-white',
  },
  indigo: {
    text: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    dot: 'bg-indigo-500',
    gradient: 'from-indigo-50 to-white',
  },
  violet: {
    text: 'text-violet-700',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    dot: 'bg-violet-500',
    gradient: 'from-violet-50 to-white',
  },
  red: {
    text: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    dot: 'bg-red-500',
    gradient: 'from-red-50 to-white',
  },
  yellow: {
    text: 'text-yellow-700',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    dot: 'bg-yellow-500',
    gradient: 'from-yellow-50 to-white',
  },
  slate: {
    text: 'text-slate-700',
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    dot: 'bg-slate-500',
    gradient: 'from-slate-50 to-white',
  },
};

const categoryAccentMap: Record<string, string> = {
  Groceries: 'emerald',
  'Fruits & Vegetables': 'lime',
  'Dairy & Bakery': 'sky',
  'Snacks & Beverages': 'amber',
  'Meat & Eggs': 'rose',
  'Personal Care': 'pink',
  'Household Essentials': 'teal',
  'Kitchen & Home': 'cyan',
  'Cleaning Supplies': 'cyan',
  Electronics: 'indigo',
  'Clothing & Accessories': 'violet',
  'Medicines & Healthcare': 'red',
  Stationery: 'amber',
  'Mobile & Internet Bills': 'sky',
  'Electricity & Utilities': 'yellow',
  'Fuel & Transportation': 'orange',
  Entertainment: 'violet',
  Beverages: 'amber',
  'Other Expenses': 'slate',
  // Legacy names
  Junk: 'orange',
  Fuel: 'sky',
  Bills: 'violet',
};

export const ACCENT_OPTIONS = Object.keys(accentPalette);

export function getCategoryStyle(category: string, accentOverride?: string): CategoryStyle {
  const accent = accentOverride ?? categoryAccentMap[category] ?? 'slate';
  return accentPalette[accent] ?? accentPalette.slate;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrencyExact(amount: number): string {
  const rounded = Math.round((Number.isFinite(amount) ? amount : 0) * 100) / 100;
  const hasDecimals = Math.abs(rounded % 1) > 0.001;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(rounded);
}

export function formatQuantity(qty: number): string {
  const safe = Number.isFinite(qty) ? Math.max(0, Math.round(qty * 100) / 100) : 0;
  return Number.isInteger(safe) ? String(safe) : String(Number(safe.toFixed(2)));
}

export function formatCompact(amount: number): string {
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}k`;
  }
  return String(amount);
}
