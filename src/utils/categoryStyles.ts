export interface CategoryStyle {
  text: string;
  bg: string;
  border: string;
  dot: string;
  gradient: string;
}

const categoryMap: Record<string, CategoryStyle> = {
  Groceries: {
    text: 'text-emerald-300',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-400',
    gradient: 'from-emerald-500/15 to-emerald-500/5',
  },
  Junk: {
    text: 'text-orange-300',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    dot: 'bg-orange-400',
    gradient: 'from-orange-500/15 to-orange-500/5',
  },
  Fuel: {
    text: 'text-sky-300',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
    dot: 'bg-sky-400',
    gradient: 'from-sky-500/15 to-sky-500/5',
  },
  Bills: {
    text: 'text-violet-300',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    dot: 'bg-violet-400',
    gradient: 'from-violet-500/15 to-violet-500/5',
  },
};

const fallback: CategoryStyle = {
  text: 'text-zinc-300',
  bg: 'bg-zinc-500/10',
  border: 'border-zinc-500/20',
  dot: 'bg-zinc-400',
  gradient: 'from-zinc-500/15 to-zinc-500/5',
};

export function getCategoryStyle(category: string): CategoryStyle {
  return categoryMap[category] ?? fallback;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompact(amount: number): string {
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}k`;
  }
  return String(amount);
}
