export interface CategoryStyle {
  text: string;
  bg: string;
  border: string;
  dot: string;
  gradient: string;
}

const accentPalette: Record<string, CategoryStyle> = {
  emerald: {
    text: 'text-emerald-300',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-400',
    gradient: 'from-emerald-500/15 to-emerald-500/5',
  },
  lime: {
    text: 'text-lime-300',
    bg: 'bg-lime-500/10',
    border: 'border-lime-500/20',
    dot: 'bg-lime-400',
    gradient: 'from-lime-500/15 to-lime-500/5',
  },
  sky: {
    text: 'text-sky-300',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
    dot: 'bg-sky-400',
    gradient: 'from-sky-500/15 to-sky-500/5',
  },
  amber: {
    text: 'text-amber-300',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    dot: 'bg-amber-400',
    gradient: 'from-amber-500/15 to-amber-500/5',
  },
  orange: {
    text: 'text-orange-300',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    dot: 'bg-orange-400',
    gradient: 'from-orange-500/15 to-orange-500/5',
  },
  rose: {
    text: 'text-rose-300',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    dot: 'bg-rose-400',
    gradient: 'from-rose-500/15 to-rose-500/5',
  },
  pink: {
    text: 'text-pink-300',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
    dot: 'bg-pink-400',
    gradient: 'from-pink-500/15 to-pink-500/5',
  },
  teal: {
    text: 'text-teal-300',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/20',
    dot: 'bg-teal-400',
    gradient: 'from-teal-500/15 to-teal-500/5',
  },
  cyan: {
    text: 'text-cyan-300',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    dot: 'bg-cyan-400',
    gradient: 'from-cyan-500/15 to-cyan-500/5',
  },
  indigo: {
    text: 'text-indigo-300',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
    dot: 'bg-indigo-400',
    gradient: 'from-indigo-500/15 to-indigo-500/5',
  },
  violet: {
    text: 'text-violet-300',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    dot: 'bg-violet-400',
    gradient: 'from-violet-500/15 to-violet-500/5',
  },
  red: {
    text: 'text-red-300',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    dot: 'bg-red-400',
    gradient: 'from-red-500/15 to-red-500/5',
  },
  yellow: {
    text: 'text-yellow-300',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    dot: 'bg-yellow-400',
    gradient: 'from-yellow-500/15 to-yellow-500/5',
  },
  slate: {
    text: 'text-zinc-300',
    bg: 'bg-zinc-500/10',
    border: 'border-zinc-500/20',
    dot: 'bg-zinc-400',
    gradient: 'from-zinc-500/15 to-zinc-500/5',
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
