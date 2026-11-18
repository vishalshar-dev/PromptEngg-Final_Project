import type { Transaction } from '../types/models';

export interface MonthlySpendPoint {
  monthKey: string; // YYYY-MM
  label: string; // e.g. "Nov" or "Jan '26"
  fullLabel: string; // e.g. "Nov 2026"
  spent: number;
  budget: number;
  remaining: number;
  txCount: number;
  isOverBudget: boolean;
  topCategory: string | null;
}

export interface MonthlyTrendsSummary {
  points: MonthlySpendPoint[];
  avgMonthlySpend: number;
  peakMonth: MonthlySpendPoint | null;
  overBudgetCount: number;
  underBudgetCount: number;
  activeMonthsCount: number;
  momDeltaPct: number | null;
  hasAnyTransactions: boolean;
}

function getMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function buildMonthlySpendingSeries(
  transactions: Transaction[],
  totalBudget: number,
  monthCount: number = 6,
  now: Date = new Date()
): MonthlyTrendsSummary {
  const safeBudget = Number.isFinite(totalBudget) && totalBudget > 0 ? totalBudget : 0;
  const count = Math.max(1, Math.floor(monthCount));

  // Build ordered month buckets ending at `now`'s month
  const buckets: {
    monthKey: string;
    date: Date;
    spent: number;
    txCount: number;
    categoryTotals: Record<string, number>;
  }[] = [];
  const bucketMap = new Map<string, (typeof buckets)[number]>();

  const startYear = now.getFullYear();
  const startMonth = now.getMonth();

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(startYear, startMonth - i, 1);
    const key = getMonthKey(d);
    const bucket = {
      monthKey: key,
      date: d,
      spent: 0,
      txCount: 0,
      categoryTotals: {} as Record<string, number>,
    };
    buckets.push(bucket);
    bucketMap.set(key, bucket);
  }

  // Aggregate transactions into buckets
  for (const tx of transactions) {
    const parsed = new Date(tx.timestamp);
    if (Number.isNaN(parsed.getTime())) continue;
    const key = getMonthKey(parsed);
    const bucket = bucketMap.get(key);
    if (!bucket) continue;

    const amount = Number.isFinite(tx.amount) ? tx.amount : 0;
    bucket.spent += amount;
    bucket.txCount += 1;
    if (tx.category) {
      bucket.categoryTotals[tx.category] =
        (bucket.categoryTotals[tx.category] || 0) + amount;
    }
  }

  const spansMultipleYears =
    buckets.length > 1 &&
    buckets[0].date.getFullYear() !== buckets[buckets.length - 1].date.getFullYear();

  const points: MonthlySpendPoint[] = buckets.map((b) => {
    const shortMonth = b.date.toLocaleDateString('en-IN', { month: 'short' });
    const shortYear = String(b.date.getFullYear()).slice(-2);
    const label = spansMultipleYears && b.date.getMonth() === 0
      ? `${shortMonth} '${shortYear}`
      : shortMonth;
    const fullLabel = b.date.toLocaleDateString('en-IN', {
      month: 'short',
      year: 'numeric',
    });

    const spent = Math.round(b.spent * 100) / 100;
    const remaining = Math.round((safeBudget - spent) * 100) / 100;
    const isOverBudget = safeBudget > 0 && spent > safeBudget;

    let topCategory: string | null = null;
    let topCategoryAmt = -1;
    for (const [cat, amt] of Object.entries(b.categoryTotals)) {
      if (amt > topCategoryAmt) {
        topCategoryAmt = amt;
        topCategory = cat;
      }
    }

    return {
      monthKey: b.monthKey,
      label,
      fullLabel,
      spent,
      budget: safeBudget,
      remaining,
      txCount: b.txCount,
      isOverBudget,
      topCategory,
    };
  });

  const activeMonths = points.filter((p) => p.txCount > 0);
  const totalWindowSpend = activeMonths.reduce((s, p) => s + p.spent, 0);
  const avgMonthlySpend =
    activeMonths.length > 0
      ? Math.round((totalWindowSpend / activeMonths.length) * 100) / 100
      : 0;

  let peakMonth: MonthlySpendPoint | null = null;
  for (const p of activeMonths) {
    if (!peakMonth || p.spent > peakMonth.spent) {
      peakMonth = p;
    }
  }

  const overBudgetCount = activeMonths.filter((p) => p.isOverBudget).length;
  const underBudgetCount = activeMonths.filter((p) => !p.isOverBudget).length;

  let momDeltaPct: number | null = null;
  if (points.length >= 2) {
    const prev = points[points.length - 2].spent;
    const curr = points[points.length - 1].spent;
    if (prev > 0) {
      momDeltaPct = Math.round(((curr - prev) / prev) * 1000) / 10;
    }
  }

  return {
    points,
    avgMonthlySpend,
    peakMonth,
    overBudgetCount,
    underBudgetCount,
    activeMonthsCount: activeMonths.length,
    momDeltaPct,
    hasAnyTransactions: activeMonths.length > 0,
  };
}
