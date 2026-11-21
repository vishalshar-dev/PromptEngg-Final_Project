export interface CategoryStyle {
  text: string;
  bg: string;
  border: string;
  dot: string;
  gradient: string;
}

const accentPalette: Record<string, CategoryStyle> = {
  emerald: {
    text: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-500/15',
    border: 'border-emerald-200 dark:border-emerald-500/30',
    dot: 'bg-emerald-500',
    gradient: 'from-emerald-50 to-white dark:from-emerald-950/60 dark:to-[#11141B]',
  },
  lime: {
    text: 'text-lime-700 dark:text-lime-400',
    bg: 'bg-lime-50 dark:bg-lime-500/15',
    border: 'border-lime-200 dark:border-lime-500/30',
    dot: 'bg-lime-500',
    gradient: 'from-lime-50 to-white dark:from-lime-950/60 dark:to-[#11141B]',
  },
  sky: {
    text: 'text-sky-700 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-500/15',
    border: 'border-sky-200 dark:border-sky-500/30',
    dot: 'bg-sky-500',
    gradient: 'from-sky-50 to-white dark:from-sky-950/60 dark:to-[#11141B]',
  },
  amber: {
    text: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/15',
    border: 'border-amber-200 dark:border-amber-500/30',
    dot: 'bg-amber-500',
    gradient: 'from-amber-50 to-white dark:from-amber-950/60 dark:to-[#11141B]',
  },
  orange: {
    text: 'text-orange-700 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-500/15',
    border: 'border-orange-200 dark:border-orange-500/30',
    dot: 'bg-orange-500',
    gradient: 'from-orange-50 to-white dark:from-orange-950/60 dark:to-[#11141B]',
  },
  rose: {
    text: 'text-rose-700 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-500/15',
    border: 'border-rose-200 dark:border-rose-500/30',
    dot: 'bg-rose-500',
    gradient: 'from-rose-50 to-white dark:from-rose-950/60 dark:to-[#11141B]',
  },
  pink: {
    text: 'text-pink-700 dark:text-pink-400',
    bg: 'bg-pink-50 dark:bg-pink-500/15',
    border: 'border-pink-200 dark:border-pink-500/30',
    dot: 'bg-pink-500',
    gradient: 'from-pink-50 to-white dark:from-pink-950/60 dark:to-[#11141B]',
  },
  teal: {
    text: 'text-teal-700 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-500/15',
    border: 'border-teal-200 dark:border-teal-500/30',
    dot: 'bg-teal-500',
    gradient: 'from-teal-50 to-white dark:from-teal-950/60 dark:to-[#11141B]',
  },
  cyan: {
    text: 'text-cyan-700 dark:text-cyan-400',
    bg: 'bg-cyan-50 dark:bg-cyan-500/15',
    border: 'border-cyan-200 dark:border-cyan-500/30',
    dot: 'bg-cyan-500',
    gradient: 'from-cyan-50 to-white dark:from-cyan-950/60 dark:to-[#11141B]',
  },
  indigo: {
    text: 'text-indigo-700 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-500/15',
    border: 'border-indigo-200 dark:border-indigo-500/30',
    dot: 'bg-indigo-500',
    gradient: 'from-indigo-50 to-white dark:from-indigo-950/60 dark:to-[#11141B]',
  },
  violet: {
    text: 'text-violet-700 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-500/15',
    border: 'border-violet-200 dark:border-violet-500/30',
    dot: 'bg-violet-500',
    gradient: 'from-violet-50 to-white dark:from-violet-950/60 dark:to-[#11141B]',
  },
  red: {
    text: 'text-red-700 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-500/15',
    border: 'border-red-200 dark:border-red-500/30',
    dot: 'bg-red-500',
    gradient: 'from-red-50 to-white dark:from-red-950/60 dark:to-[#11141B]',
  },
  yellow: {
    text: 'text-yellow-700 dark:text-yellow-400',
    bg: 'bg-yellow-50 dark:bg-yellow-500/15',
    border: 'border-yellow-200 dark:border-yellow-500/30',
    dot: 'bg-yellow-500',
    gradient: 'from-yellow-50 to-white dark:from-yellow-950/60 dark:to-[#11141B]',
  },
  slate: {
    text: 'text-slate-700 dark:text-slate-300',
    bg: 'bg-slate-100 dark:bg-slate-500/15',
    border: 'border-slate-200 dark:border-slate-500/30',
    dot: 'bg-slate-500',
    gradient: 'from-slate-50 to-white dark:from-slate-900 dark:to-[#11141B]',
  },
};

const categoryAccentMap: Record<string, string> = {
  Groceries: 'emerald',
  'Fruits & Vegetables': 'lime',
  'Dairy & Bakery': 'sky',
  'Breakfast & Instant Food': 'orange',
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
