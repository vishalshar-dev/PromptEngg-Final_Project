import type {
  BrokeModeConfig,
  CategorySpendingLimit,
  ClassificationSource,
  FinancialChallenge,
  FinancialChallengeTemplateId,
  FinancialTarget,
  LimitStatus,
  SpendingClassification,
  Transaction,
  WarRoomPeriod,
} from '../types/models';
import { getEffectiveTransactionAmount, toLocalDateKey } from './martEngine';
import { roundCurrency } from './splitLedgerEngine';

export const DEFAULT_BROKE_MODE_CONFIG: BrokeModeConfig = {
  enabled: false,
  period: 'monthly',
  dailyAllowance: 250,
  weeklyAllowance: 1500,
  monthlyAllowance: 4000,
  maxNonEssentialSpend: 1200,
  warningThresholdPct: 75,
  durationDays: 14,
  restrictedCategories: ['Junk', 'Snacks & Beverages'],
  activatedAt: null,
};

export interface PeriodBounds {
  period: WarRoomPeriod;
  start: Date;
  end: Date;
  startMs: number;
  endMs: number;
  label: string;
}

export function getPeriodBounds(period: WarRoomPeriod, now: Date = new Date()): PeriodBounds {
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();

  if (period === 'daily') {
    const start = new Date(year, month, date, 0, 0, 0, 0);
    const end = new Date(year, month, date, 23, 59, 59, 999);
    return {
      period,
      start,
      end,
      startMs: start.getTime(),
      endMs: end.getTime(),
      label: 'Today',
    };
  }

  if (period === 'weekly') {
    const day = now.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
    const diffToMon = day === 0 ? -6 : 1 - day;
    const start = new Date(year, month, date + diffToMon, 0, 0, 0, 0);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
    return {
      period,
      start,
      end,
      startMs: start.getTime(),
      endMs: end.getTime(),
      label: 'This Week',
    };
  }

  const start = new Date(year, month, 1, 0, 0, 0, 0);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return {
    period: 'monthly',
    start,
    end,
    startMs: start.getTime(),
    endMs: end.getTime(),
    label: start.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
  };
}

export function getPreviousPeriodBounds(period: WarRoomPeriod, now: Date = new Date()): PeriodBounds {
  const current = getPeriodBounds(period, now);
  if (period === 'daily') {
    const prevRef = new Date(
      current.start.getFullYear(),
      current.start.getMonth(),
      current.start.getDate() - 1,
      12,
      0,
      0,
      0
    );
    return { ...getPeriodBounds('daily', prevRef), label: 'Yesterday' };
  }
  if (period === 'weekly') {
    const prevRef = new Date(
      current.start.getFullYear(),
      current.start.getMonth(),
      current.start.getDate() - 7,
      12,
      0,
      0,
      0
    );
    return { ...getPeriodBounds('weekly', prevRef), label: 'Last Week' };
  }
  const prevRef = new Date(current.start.getFullYear(), current.start.getMonth() - 1, 15, 12, 0, 0, 0);
  const bounds = getPeriodBounds('monthly', prevRef);
  return { ...bounds, label: 'Last Month' };
}

export function getRemainingDaysInPeriod(period: WarRoomPeriod, now: Date = new Date()): number {
  const bounds = getPeriodBounds(period, now);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endStart = new Date(
    bounds.end.getFullYear(),
    bounds.end.getMonth(),
    bounds.end.getDate(),
    0,
    0,
    0,
    0
  );
  const diffDays = Math.round((endStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

export function isTimestampInBounds(timestamp: string, bounds: PeriodBounds): boolean {
  const ms = new Date(timestamp).getTime();
  if (!Number.isFinite(ms)) return false;
  return ms >= bounds.startMs && ms <= bounds.endMs;
}

export function getActiveTransactions(transactions: Transaction[]): Transaction[] {
  return transactions.filter((tx) => {
    if (!tx || tx.status === 'cancelled') return false;
    return getEffectiveTransactionAmount(tx) > 0;
  });
}

// ---------- CLASSIFICATION ENGINE ----------

const ESSENTIAL_CATEGORIES = new Set([
  'groceries',
  'groceries & staples',
  'fresh produce',
  'dairy & bakery',
  'fuel',
  'bills',
  'utilities',
  'rent',
  'medical',
  'health',
  'healthcare',
  'medicine',
  'pharmacy',
  'transport',
  'commute',
  'education',
]);

const NON_ESSENTIAL_CATEGORIES = new Set([
  'junk',
  'snacks & beverages',
  'snacks',
  'beverages',
  'entertainment',
  'dining',
  'food delivery',
  'shopping',
  'lifestyle',
  'subscriptions',
  'impulse',
]);

const ESSENTIAL_KEYWORDS = [
  'milk',
  'egg',
  'rice',
  'atta',
  'flour',
  'bread',
  'dal',
  'lentil',
  'oil',
  'vegetable',
  'tomato',
  'onion',
  'potato',
  'fruit',
  'paneer',
  'curd',
  'yogurt',
  'petrol',
  'diesel',
  'fuel',
  'wi-fi',
  'wifi',
  'electricity',
  'water bill',
  'gas',
  'rent',
  'medicine',
  'pharmacy',
  'soap',
  'detergent',
  'toothpaste',
];

const IMPULSIVE_KEYWORDS = [
  'impulse',
  'craving',
  'chocolate',
  'candy',
  'ice cream',
  'sundae',
  'donut',
  'pastry',
  'cake',
  'boba',
  'energy drink',
  'red bull',
  'monster',
  'gaming',
  'skin',
  'treat',
  'dessert',
  'late night',
  'midnight',
  'flash sale',
];

const NON_ESSENTIAL_KEYWORDS = [
  'chips',
  'soda',
  'cola',
  'coke',
  'pepsi',
  'fries',
  'burger',
  'pizza',
  'coffee',
  'latte',
  'cafe',
  'snack',
  'biscuit',
  'cookie',
  'cookies',
  'nachos',
  'popcorn',
  'cold drink',
  'mojito',
  'shake',
  'movie',
  'netflix',
  'spotify',
  'swiggy',
  'zomato',
];

export interface ClassifiedTransaction {
  transaction: Transaction;
  effectiveAmount: number;
  classification: SpendingClassification;
  classificationSource: ClassificationSource;
  reason: string;
}

export function normalizePurchaseLabel(name: string): string {
  return name
    .toLowerCase()
    .replace(/^mart:\s*/i, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function classifyTransaction(
  tx: Transaction,
  allTransactions: Transaction[] = []
): ClassifiedTransaction {
  const effectiveAmount = getEffectiveTransactionAmount(tx);

  // Preserve user-confirmed classification
  if (
    tx.classification &&
    (tx.classification === 'essential' ||
      tx.classification === 'non_essential' ||
      tx.classification === 'impulsive') &&
    tx.classificationSource === 'user'
  ) {
    return {
      transaction: tx,
      effectiveAmount,
      classification: tx.classification,
      classificationSource: 'user',
      reason: 'Confirmed by user',
    };
  }

  const catLower = (tx.category ?? '').trim().toLowerCase();
  const nameLower = (tx.name ?? '').toLowerCase();
  const normalizedLabel = normalizePurchaseLabel(tx.name ?? '');
  const txDate = new Date(tx.timestamp);
  const hour = Number.isNaN(txDate.getTime()) ? 12 : txDate.getHours();
  const isLateNight = hour >= 22 || hour < 5;

  const hasEssentialKeyword = ESSENTIAL_KEYWORDS.some((kw) => nameLower.includes(kw));
  const hasImpulsiveKeyword = IMPULSIVE_KEYWORDS.some((kw) => nameLower.includes(kw));
  const hasNonEssentialKeyword = NON_ESSENTIAL_KEYWORDS.some((kw) => nameLower.includes(kw));

  // Count similar recent non-essential purchases within 7 days prior to tx
  const txMs = txDate.getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const recentRepeatCount =
    Number.isFinite(txMs) && normalizedLabel
      ? allTransactions.filter((other) => {
          if (other.id === tx.id || other.status === 'cancelled') return false;
          if (getEffectiveTransactionAmount(other) <= 0) return false;
          const otherMs = new Date(other.timestamp).getTime();
          if (!Number.isFinite(otherMs)) return false;
          const diff = txMs - otherMs;
          if (diff < 0 || diff > sevenDaysMs) return false;
          return normalizePurchaseLabel(other.name ?? '') === normalizedLabel;
        }).length
      : 0;

  let classification: SpendingClassification = 'non_essential';
  let reason = 'Discretionary category expense';

  if (hasImpulsiveKeyword) {
    classification = 'impulsive';
    reason = 'Matched impulsive treat or craving pattern';
  } else if (
    (NON_ESSENTIAL_CATEGORIES.has(catLower) || hasNonEssentialKeyword) &&
    !hasEssentialKeyword
  ) {
    if (isLateNight) {
      classification = 'impulsive';
      reason = 'Late-night discretionary purchase (after 10 PM)';
    } else if (recentRepeatCount >= 2 && effectiveAmount <= 350) {
      classification = 'impulsive';
      reason = `Repeated discretionary purchase (${recentRepeatCount + 1}x within 7 days)`;
    } else {
      classification = 'non_essential';
      reason = NON_ESSENTIAL_CATEGORIES.has(catLower)
        ? `Predicted non-essential from "${tx.category}" category`
        : 'Matched non-essential snack, beverage, or lifestyle item';
    }
  } else if (ESSENTIAL_CATEGORIES.has(catLower) || hasEssentialKeyword) {
    classification = 'essential';
    reason = ESSENTIAL_CATEGORIES.has(catLower)
      ? `Core household/utility category (${tx.category})`
      : 'Matched everyday staple or utility keyword';
  } else {
    // Unknown custom category fallback
    classification = isLateNight ? 'impulsive' : 'non_essential';
    reason = isLateNight
      ? 'Late-night uncategorized purchase'
      : 'Discretionary or uncategorized purchase — review if essential';
  }

  return {
    transaction: tx,
    effectiveAmount,
    classification,
    classificationSource: 'predicted',
    reason,
  };
}

export function classifyTransactions(transactions: Transaction[]): ClassifiedTransaction[] {
  const active = getActiveTransactions(transactions);
  return active
    .map((tx) => classifyTransaction(tx, active))
    .sort((a, b) => new Date(b.transaction.timestamp).getTime() - new Date(a.transaction.timestamp).getTime());
}

// ---------- BROKE MODE ENGINE ----------

export interface BrokeModeWarning {
  id: string;
  severity: 'warning' | 'critical';
  title: string;
  message: string;
}

export interface BrokeModeStatus {
  enabled: boolean;
  period: WarRoomPeriod;
  periodLabel: string;
  limit: number;
  spent: number;
  remaining: number;
  utilisationPct: number;
  essentialSpent: number;
  nonEssentialSpent: number;
  impulsiveSpent: number;
  totalJunkSpent: number;
  nonEssentialLimit: number;
  nonEssentialRemaining: number;
  nonEssentialUtilisationPct: number;
  remainingDays: number;
  durationDays: number;
  durationRemainingDays: number | null;
  dailySafeAllowance: number;
  targetProgressPct: number;
  restrictedCategoryBreakdown: Array<{ category: string; spent: number }>;
  warnings: BrokeModeWarning[];
}

export function getBrokeModePeriodLimit(config: BrokeModeConfig): number {
  switch (config.period) {
    case 'daily':
      return Math.max(0, config.dailyAllowance);
    case 'weekly':
      return Math.max(0, config.weeklyAllowance);
    case 'monthly':
      return Math.max(0, config.monthlyAllowance);
  }
}

export function computeBrokeModeStatus(
  transactions: Transaction[],
  config: BrokeModeConfig,
  now: Date = new Date()
): BrokeModeStatus {
  const bounds = getPeriodBounds(config.period, now);
  const classified = classifyTransactions(transactions).filter((item) =>
    isTimestampInBounds(item.transaction.timestamp, bounds)
  );

  let spent = 0;
  let essentialSpent = 0;
  let nonEssentialSpent = 0;
  let impulsiveSpent = 0;

  const restrictedMap = new Map<string, number>();
  for (const cat of config.restrictedCategories) {
    restrictedMap.set(cat.trim().toLowerCase(), 0);
  }

  for (const item of classified) {
    spent += item.effectiveAmount;
    if (item.classification === 'essential') {
      essentialSpent += item.effectiveAmount;
    } else if (item.classification === 'non_essential') {
      nonEssentialSpent += item.effectiveAmount;
    } else {
      impulsiveSpent += item.effectiveAmount;
    }

    const catKey = (item.transaction.category ?? '').trim().toLowerCase();
    if (restrictedMap.has(catKey)) {
      restrictedMap.set(catKey, roundCurrency((restrictedMap.get(catKey) ?? 0) + item.effectiveAmount));
    }
  }

  spent = roundCurrency(spent);
  essentialSpent = roundCurrency(essentialSpent);
  nonEssentialSpent = roundCurrency(nonEssentialSpent);
  impulsiveSpent = roundCurrency(impulsiveSpent);
  const totalJunkSpent = roundCurrency(nonEssentialSpent + impulsiveSpent);

  const limit = getBrokeModePeriodLimit(config);
  const remaining = roundCurrency(Math.max(0, limit - spent));
  const utilisationPct = limit > 0 ? roundCurrency((spent / limit) * 100) : 0;

  const nonEssentialLimit = Math.max(0, config.maxNonEssentialSpend);
  const nonEssentialRemaining = roundCurrency(Math.max(0, nonEssentialLimit - totalJunkSpent));
  const nonEssentialUtilisationPct =
    nonEssentialLimit > 0 ? roundCurrency((totalJunkSpent / nonEssentialLimit) * 100) : 0;

  const remainingDays = getRemainingDaysInPeriod(config.period, now);
  const dailySafeAllowance = roundCurrency(remaining / Math.max(1, remainingDays));

  let durationRemainingDays: number | null = null;
  if (config.enabled && config.activatedAt && config.durationDays > 0) {
    const startMs = new Date(config.activatedAt).getTime();
    if (Number.isFinite(startMs)) {
      const elapsedDays = Math.floor((now.getTime() - startMs) / (1000 * 60 * 60 * 24));
      durationRemainingDays = Math.max(0, config.durationDays - elapsedDays);
    }
  }

  // Target progress reflects how well non-essential & total spending stays inside boundary
  const maxRatio = Math.max(utilisationPct, nonEssentialUtilisationPct);
  const targetProgressPct = roundCurrency(Math.max(0, Math.min(100, 100 - Math.max(0, maxRatio - 50) * 1.2)));

  const restrictedCategoryBreakdown = config.restrictedCategories.map((cat) => ({
    category: cat,
    spent: restrictedMap.get(cat.trim().toLowerCase()) ?? 0,
  }));

  const warnings: BrokeModeWarning[] = [];
  const threshold = config.warningThresholdPct || 75;

  if (limit > 0 && spent > limit) {
    warnings.push({
      id: 'broke-overall-exceeded',
      severity: 'critical',
      title: `${bounds.label} Allowance Exceeded`,
      message: `Spent ₹${spent.toLocaleString('en-IN')} against your ₹${limit.toLocaleString('en-IN')} ${config.period} allowance (₹${roundCurrency(spent - limit).toLocaleString('en-IN')} over).`,
    });
  } else if (limit > 0 && utilisationPct >= threshold) {
    warnings.push({
      id: 'broke-overall-approaching',
      severity: 'warning',
      title: `Approaching ${bounds.label} Limit (${utilisationPct}%)`,
      message: `₹${remaining.toLocaleString('en-IN')} remaining across ${remainingDays} day(s) — keep daily spend under ₹${dailySafeAllowance.toLocaleString('en-IN')}.`,
    });
  }

  if (nonEssentialLimit > 0 && totalJunkSpent > nonEssentialLimit) {
    warnings.push({
      id: 'broke-nonessential-exceeded',
      severity: 'critical',
      title: 'Non-Essential Cap Breached',
      message: `Non-essential + impulsive spend hit ₹${totalJunkSpent.toLocaleString('en-IN')} vs ₹${nonEssentialLimit.toLocaleString('en-IN')} cap. Essential purchases remain unaffected.`,
    });
  } else if (nonEssentialLimit > 0 && nonEssentialUtilisationPct >= threshold) {
    warnings.push({
      id: 'broke-nonessential-approaching',
      severity: 'warning',
      title: `Non-Essential Cap at ${nonEssentialUtilisationPct}%`,
      message: `Only ₹${nonEssentialRemaining.toLocaleString('en-IN')} left for discretionary items this period.`,
    });
  }

  for (const rc of restrictedCategoryBreakdown) {
    if (rc.spent > 0 && config.enabled) {
      warnings.push({
        id: `broke-restricted-${rc.category}`,
        severity: rc.spent >= Math.max(250, nonEssentialLimit * 0.4) ? 'critical' : 'warning',
        title: `Watched Category Activity: ${rc.category}`,
        message: `₹${rc.spent.toLocaleString('en-IN')} recorded in monitored category "${rc.category}" this period.`,
      });
    }
  }

  return {
    enabled: config.enabled,
    period: config.period,
    periodLabel: bounds.label,
    limit,
    spent,
    remaining,
    utilisationPct,
    essentialSpent,
    nonEssentialSpent,
    impulsiveSpent,
    totalJunkSpent,
    nonEssentialLimit,
    nonEssentialRemaining,
    nonEssentialUtilisationPct,
    remainingDays,
    durationDays: config.durationDays,
    durationRemainingDays,
    dailySafeAllowance,
    targetProgressPct,
    restrictedCategoryBreakdown,
    warnings,
  };
}

// ---------- JUNK SPENDING INTELLIGENCE & LEAKAGE ----------

export interface CategoryJunkSummary {
  category: string;
  essential: number;
  nonEssential: number;
  impulsive: number;
  totalJunk: number;
  totalSpend: number;
  shareOfJunkPct: number;
  count: number;
}

export interface SpendingLeakage {
  id: string;
  itemName: string;
  category: string;
  occurrences: number;
  averageAmount: number;
  totalSpent: number;
  projectedWeeklyCost: number;
  projected30DayCost: number;
  lastPurchasedAt: string;
}

export interface PotentialSavingsEstimate {
  isEstimate: true;
  disclaimer: string;
  monthlyJunkBaseline: number;
  monthlyImpulsiveBaseline: number;
  conservativeMonthlySavings: number;
  balancedMonthlySavings: number;
  strictMonthlySavings: number;
}

export interface JunkIntelligenceSummary {
  weeklySpend: number;
  weeklyJunkSpend: number;
  weeklyImpulsiveSpend: number;
  prevWeeklyJunkSpend: number;
  weeklyJunkChangePct: number | null;
  monthlySpend: number;
  monthlyEssentialSpend: number;
  monthlyNonEssentialSpend: number;
  monthlyImpulsiveSpend: number;
  monthlyJunkSpend: number;
  prevMonthlyJunkSpend: number;
  monthlyJunkChangePct: number | null;
  junkShareOfMonthPct: number;
  allTimeJunkSpend: number;
  allTimeImpulsiveSpend: number;
  allTimeEssentialSpend: number;
  topJunkCategories: CategoryJunkSummary[];
  leakages: SpendingLeakage[];
  potentialSavings: PotentialSavingsEstimate;
}

function calculatePctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return roundCurrency(((current - previous) / previous) * 100);
}

export function detectSpendingLeakages(
  transactions: Transaction[],
  now: Date = new Date()
): SpendingLeakage[] {
  const classified = classifyTransactions(transactions);
  const thirtyDaysAgoMs = now.getTime() - 30 * 24 * 60 * 60 * 1000;

  const grouped = new Map<
    string,
    {
      displayName: string;
      category: string;
      items: ClassifiedTransaction[];
    }
  >();

  for (const item of classified) {
    if (item.classification === 'essential') continue;
    const ms = new Date(item.transaction.timestamp).getTime();
    if (!Number.isFinite(ms) || ms < thirtyDaysAgoMs || ms > now.getTime() + 86400000) continue;

    const cleanName = item.transaction.name.replace(/^Mart:\s*/i, '').trim();
    const key = normalizePurchaseLabel(cleanName);
    if (!key) continue;

    const existing = grouped.get(key);
    if (existing) {
      existing.items.push(item);
    } else {
      grouped.set(key, {
        displayName: cleanName,
        category: item.transaction.category,
        items: [item],
      });
    }
  }

  const leakages: SpendingLeakage[] = [];
  for (const [key, group] of grouped.entries()) {
    // Require >= 2 genuine occurrences — never fabricate leakage from a single purchase
    if (group.items.length < 2) continue;

    const totalSpent = roundCurrency(
      group.items.reduce((sum, item) => sum + item.effectiveAmount, 0)
    );
    const occurrences = group.items.length;
    const averageAmount = roundCurrency(totalSpent / occurrences);

    const timestamps = group.items
      .map((i) => new Date(i.transaction.timestamp).getTime())
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
    const earliest = timestamps[0] ?? now.getTime();
    const observedSpanDays = Math.max(
      7,
      Math.min(30, Math.ceil((now.getTime() - earliest) / (1000 * 60 * 60 * 24)) || 7)
    );
    const dailyRate = totalSpent / observedSpanDays;
    const projectedWeeklyCost = roundCurrency(dailyRate * 7);
    const projected30DayCost = roundCurrency(dailyRate * 30);

    leakages.push({
      id: `leak-${key}`,
      itemName: group.displayName,
      category: group.category,
      occurrences,
      averageAmount,
      totalSpent,
      projectedWeeklyCost,
      projected30DayCost,
      lastPurchasedAt: group.items[0].transaction.timestamp,
    });
  }

  return leakages.sort((a, b) => b.totalSpent - a.totalSpent || b.occurrences - a.occurrences);
}

export function computePotentialSavings(
  classified: ClassifiedTransaction[],
  now: Date = new Date()
): PotentialSavingsEstimate {
  const thisMonth = getPeriodBounds('monthly', now);
  const thirtyDaysAgoMs = now.getTime() - 30 * 24 * 60 * 60 * 1000;

  let monthNonEssential = 0;
  let monthImpulsive = 0;
  let rollingNonEssential = 0;
  let rollingImpulsive = 0;

  for (const item of classified) {
    if (item.classification === 'essential') continue;
    const ms = new Date(item.transaction.timestamp).getTime();
    if (isTimestampInBounds(item.transaction.timestamp, thisMonth)) {
      if (item.classification === 'non_essential') monthNonEssential += item.effectiveAmount;
      else monthImpulsive += item.effectiveAmount;
    }
    if (Number.isFinite(ms) && ms >= thirtyDaysAgoMs) {
      if (item.classification === 'non_essential') rollingNonEssential += item.effectiveAmount;
      else rollingImpulsive += item.effectiveAmount;
    }
  }

  const nonEssentialBase = Math.max(monthNonEssential, rollingNonEssential);
  const impulsiveBase = Math.max(monthImpulsive, rollingImpulsive);
  const monthlyJunkBaseline = roundCurrency(nonEssentialBase + impulsiveBase);

  return {
    isEstimate: true,
    disclaimer:
      'Projected monthly savings estimate based on cutting observed non-essential and impulsive spending — not actual money saved yet.',
    monthlyJunkBaseline,
    monthlyImpulsiveBaseline: roundCurrency(impulsiveBase),
    conservativeMonthlySavings: roundCurrency(nonEssentialBase * 0.2 + impulsiveBase * 0.5),
    balancedMonthlySavings: roundCurrency(nonEssentialBase * 0.4 + impulsiveBase * 0.75),
    strictMonthlySavings: roundCurrency(nonEssentialBase * 0.6 + impulsiveBase * 1.0),
  };
}

export function computeJunkIntelligence(
  transactions: Transaction[],
  now: Date = new Date()
): JunkIntelligenceSummary {
  const classified = classifyTransactions(transactions);
  const thisWeek = getPeriodBounds('weekly', now);
  const prevWeek = getPreviousPeriodBounds('weekly', now);
  const thisMonth = getPeriodBounds('monthly', now);
  const prevMonth = getPreviousPeriodBounds('monthly', now);

  let weeklySpend = 0;
  let weeklyJunkSpend = 0;
  let weeklyImpulsiveSpend = 0;
  let prevWeeklyJunkSpend = 0;

  let monthlySpend = 0;
  let monthlyEssentialSpend = 0;
  let monthlyNonEssentialSpend = 0;
  let monthlyImpulsiveSpend = 0;
  let prevMonthlyJunkSpend = 0;

  let allTimeJunkSpend = 0;
  let allTimeImpulsiveSpend = 0;
  let allTimeEssentialSpend = 0;

  const categoryMap = new Map<string, CategoryJunkSummary>();

  for (const item of classified) {
    const amt = item.effectiveAmount;
    const isJunk = item.classification !== 'essential';
    const isImpulsive = item.classification === 'impulsive';

    if (item.classification === 'essential') allTimeEssentialSpend += amt;
    else allTimeJunkSpend += amt;
    if (isImpulsive) allTimeImpulsiveSpend += amt;

    if (isTimestampInBounds(item.transaction.timestamp, thisWeek)) {
      weeklySpend += amt;
      if (isJunk) weeklyJunkSpend += amt;
      if (isImpulsive) weeklyImpulsiveSpend += amt;
    } else if (isTimestampInBounds(item.transaction.timestamp, prevWeek)) {
      if (isJunk) prevWeeklyJunkSpend += amt;
    }

    if (isTimestampInBounds(item.transaction.timestamp, thisMonth)) {
      monthlySpend += amt;
      if (item.classification === 'essential') monthlyEssentialSpend += amt;
      else if (item.classification === 'non_essential') monthlyNonEssentialSpend += amt;
      else monthlyImpulsiveSpend += amt;

      const cat = item.transaction.category || 'Uncategorized';
      const existing = categoryMap.get(cat) ?? {
        category: cat,
        essential: 0,
        nonEssential: 0,
        impulsive: 0,
        totalJunk: 0,
        totalSpend: 0,
        shareOfJunkPct: 0,
        count: 0,
      };
      existing.totalSpend = roundCurrency(existing.totalSpend + amt);
      if (item.classification === 'essential') {
        existing.essential = roundCurrency(existing.essential + amt);
      } else if (item.classification === 'non_essential') {
        existing.nonEssential = roundCurrency(existing.nonEssential + amt);
        existing.totalJunk = roundCurrency(existing.totalJunk + amt);
      } else {
        existing.impulsive = roundCurrency(existing.impulsive + amt);
        existing.totalJunk = roundCurrency(existing.totalJunk + amt);
      }
      if (isJunk) existing.count += 1;
      categoryMap.set(cat, existing);
    } else if (isTimestampInBounds(item.transaction.timestamp, prevMonth)) {
      if (isJunk) prevMonthlyJunkSpend += amt;
    }
  }

  const monthlyJunkSpend = roundCurrency(monthlyNonEssentialSpend + monthlyImpulsiveSpend);

  // If this month has no category entries yet, populate from all-time so chart/table stay informative
  if (categoryMap.size === 0 && classified.length > 0) {
    for (const item of classified) {
      const cat = item.transaction.category || 'Uncategorized';
      const existing = categoryMap.get(cat) ?? {
        category: cat,
        essential: 0,
        nonEssential: 0,
        impulsive: 0,
        totalJunk: 0,
        totalSpend: 0,
        shareOfJunkPct: 0,
        count: 0,
      };
      existing.totalSpend = roundCurrency(existing.totalSpend + item.effectiveAmount);
      if (item.classification === 'essential') existing.essential += item.effectiveAmount;
      else if (item.classification === 'non_essential') {
        existing.nonEssential += item.effectiveAmount;
        existing.totalJunk += item.effectiveAmount;
        existing.count += 1;
      } else {
        existing.impulsive += item.effectiveAmount;
        existing.totalJunk += item.effectiveAmount;
        existing.count += 1;
      }
      categoryMap.set(cat, existing);
    }
  }

  const junkDenominator = Array.from(categoryMap.values()).reduce((s, c) => s + c.totalJunk, 0);
  const topJunkCategories = Array.from(categoryMap.values())
    .map((c) => ({
      ...c,
      essential: roundCurrency(c.essential),
      nonEssential: roundCurrency(c.nonEssential),
      impulsive: roundCurrency(c.impulsive),
      totalJunk: roundCurrency(c.totalJunk),
      totalSpend: roundCurrency(c.totalSpend),
      shareOfJunkPct: junkDenominator > 0 ? roundCurrency((c.totalJunk / junkDenominator) * 100) : 0,
    }))
    .sort((a, b) => b.totalJunk - a.totalJunk || b.totalSpend - a.totalSpend);

  return {
    weeklySpend: roundCurrency(weeklySpend),
    weeklyJunkSpend: roundCurrency(weeklyJunkSpend),
    weeklyImpulsiveSpend: roundCurrency(weeklyImpulsiveSpend),
    prevWeeklyJunkSpend: roundCurrency(prevWeeklyJunkSpend),
    weeklyJunkChangePct: calculatePctChange(weeklyJunkSpend, prevWeeklyJunkSpend),
    monthlySpend: roundCurrency(monthlySpend),
    monthlyEssentialSpend: roundCurrency(monthlyEssentialSpend),
    monthlyNonEssentialSpend: roundCurrency(monthlyNonEssentialSpend),
    monthlyImpulsiveSpend: roundCurrency(monthlyImpulsiveSpend),
    monthlyJunkSpend,
    prevMonthlyJunkSpend: roundCurrency(prevMonthlyJunkSpend),
    monthlyJunkChangePct: calculatePctChange(monthlyJunkSpend, prevMonthlyJunkSpend),
    junkShareOfMonthPct:
      monthlySpend > 0 ? roundCurrency((monthlyJunkSpend / monthlySpend) * 100) : 0,
    allTimeJunkSpend: roundCurrency(allTimeJunkSpend),
    allTimeImpulsiveSpend: roundCurrency(allTimeImpulsiveSpend),
    allTimeEssentialSpend: roundCurrency(allTimeEssentialSpend),
    topJunkCategories,
    leakages: detectSpendingLeakages(transactions, now),
    potentialSavings: computePotentialSavings(classified, now),
  };
}

// ---------- CATEGORY SPENDING LIMITS ----------

export interface EvaluatedCategoryLimit {
  limit: CategorySpendingLimit;
  spent: number;
  remaining: number;
  utilisationPct: number;
  status: LimitStatus;
  periodLabel: string;
  transactionCount: number;
}

export function evaluateCategoryLimits(
  limits: CategorySpendingLimit[],
  transactions: Transaction[],
  now: Date = new Date()
): EvaluatedCategoryLimit[] {
  const active = getActiveTransactions(transactions);

  return limits.map((limit) => {
    const bounds = getPeriodBounds(limit.period, now);
    const targetCat = limit.category.trim().toLowerCase();

    const matching = active.filter((tx) => {
      if ((tx.category ?? '').trim().toLowerCase() !== targetCat) return false;
      return isTimestampInBounds(tx.timestamp, bounds);
    });

    const spent = roundCurrency(
      matching.reduce((sum, tx) => sum + getEffectiveTransactionAmount(tx), 0)
    );
    const cap = Math.max(0, limit.limitAmount);
    const remaining = roundCurrency(Math.max(0, cap - spent));
    const utilisationPct = cap > 0 ? roundCurrency((spent / cap) * 100) : 0;

    let status: LimitStatus = 'normal';
    if (limit.enabled && cap > 0) {
      if (spent > cap) {
        status = 'exceeded';
      } else if (spent >= cap) {
        status = 'reached';
      } else if (utilisationPct >= (limit.warningThresholdPct || 80)) {
        status = 'approaching';
      }
    }

    return {
      limit,
      spent,
      remaining,
      utilisationPct,
      status,
      periodLabel: bounds.label,
      transactionCount: matching.length,
    };
  });
}

// ---------- SMART SPENDING ALERTS ----------

export type SmartAlertType =
  | 'budget_approaching'
  | 'budget_exceeded'
  | 'unusual_spending'
  | 'repeated_purchase'
  | 'spending_improvement';

export interface SmartAlert {
  id: string;
  signature: string;
  type: SmartAlertType;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  reason: string;
  category?: string;
  periodLabel: string;
  metricValue?: string;
}

export interface SmartAlertInput {
  transactions: Transaction[];
  evaluatedLimits: EvaluatedCategoryLimit[];
  brokeModeStatus: BrokeModeStatus;
  totalBudget: number;
  dismissedSignatures?: string[];
  now?: Date;
}

export function generateSmartAlerts(input: SmartAlertInput): {
  activeAlerts: SmartAlert[];
  allAlerts: SmartAlert[];
} {
  const now = input.now ?? new Date();
  const dismissed = new Set(input.dismissedSignatures ?? []);
  const classified = classifyTransactions(input.transactions);
  const alerts: SmartAlert[] = [];
  const seenSignatures = new Set<string>();

  const pushAlert = (alert: SmartAlert) => {
    if (seenSignatures.has(alert.signature)) return;
    seenSignatures.add(alert.signature);
    alerts.push(alert);
  };

  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const weekBounds = getPeriodBounds('weekly', now);
  const weekKey = toLocalDateKey(weekBounds.start);
  const dayKey = toLocalDateKey(now);

  // 1. Category Limit Exceeded / Reached / Approaching
  for (const ev of input.evaluatedLimits) {
    if (!ev.limit.enabled) continue;
    const pKey =
      ev.limit.period === 'daily' ? dayKey : ev.limit.period === 'weekly' ? weekKey : monthKey;

    if (ev.status === 'exceeded') {
      const over = roundCurrency(ev.spent - ev.limit.limitAmount);
      pushAlert({
        id: `alert-limit-exceeded-${ev.limit.id}`,
        signature: `limit_exceeded:${ev.limit.id}:${pKey}`,
        type: 'budget_exceeded',
        severity: 'critical',
        title: `${ev.limit.category} Limit Exceeded`,
        reason: `You spent ₹${ev.spent.toLocaleString('en-IN')} vs your ${ev.limit.period} limit of ₹${ev.limit.limitAmount.toLocaleString('en-IN')} (₹${over.toLocaleString('en-IN')} over).`,
        category: ev.limit.category,
        periodLabel: ev.periodLabel,
        metricValue: `${ev.utilisationPct}%`,
      });
    } else if (ev.status === 'reached') {
      pushAlert({
        id: `alert-limit-reached-${ev.limit.id}`,
        signature: `limit_reached:${ev.limit.id}:${pKey}`,
        type: 'budget_approaching',
        severity: 'warning',
        title: `${ev.limit.category} Limit Reached (100%)`,
        reason: `You have hit 100% of your ₹${ev.limit.limitAmount.toLocaleString('en-IN')} ${ev.limit.period} cap for ${ev.limit.category}.`,
        category: ev.limit.category,
        periodLabel: ev.periodLabel,
        metricValue: '100%',
      });
    } else if (ev.status === 'approaching') {
      pushAlert({
        id: `alert-limit-approaching-${ev.limit.id}`,
        signature: `limit_approaching:${ev.limit.id}:${pKey}`,
        type: 'budget_approaching',
        severity: 'warning',
        title: `${ev.limit.category} Approaching Limit`,
        reason: `${ev.utilisationPct}% used (₹${ev.spent.toLocaleString('en-IN')} of ₹${ev.limit.limitAmount.toLocaleString('en-IN')}) — ₹${ev.remaining.toLocaleString('en-IN')} left for ${ev.periodLabel}.`,
        category: ev.limit.category,
        periodLabel: ev.periodLabel,
        metricValue: `${ev.utilisationPct}%`,
      });
    }
  }

  // 2. Overall Monthly Budget Approaching / Exceeded
  const thisMonth = getPeriodBounds('monthly', now);
  const monthlySpend = roundCurrency(
    classified
      .filter((item) => isTimestampInBounds(item.transaction.timestamp, thisMonth))
      .reduce((sum, item) => sum + item.effectiveAmount, 0)
  );
  if (input.totalBudget > 0 && monthlySpend > 0) {
    const pct = roundCurrency((monthlySpend / input.totalBudget) * 100);
    if (monthlySpend > input.totalBudget) {
      pushAlert({
        id: 'alert-monthly-budget-exceeded',
        signature: `total_exceeded:${monthKey}`,
        type: 'budget_exceeded',
        severity: 'critical',
        title: 'Monthly Budget Exceeded',
        reason: `Total monthly spend ₹${monthlySpend.toLocaleString('en-IN')} surpassed your ₹${input.totalBudget.toLocaleString('en-IN')} monthly radar budget.`,
        periodLabel: thisMonth.label,
        metricValue: `${pct}%`,
      });
    } else if (pct >= 80) {
      pushAlert({
        id: 'alert-monthly-budget-approaching',
        signature: `total_approaching:${monthKey}`,
        type: 'budget_approaching',
        severity: 'warning',
        title: 'Monthly Budget Above 80%',
        reason: `₹${monthlySpend.toLocaleString('en-IN')} of ₹${input.totalBudget.toLocaleString('en-IN')} spent so far this month.`,
        periodLabel: thisMonth.label,
        metricValue: `${pct}%`,
      });
    }
  }

  // 3. Broke Mode Cap Alert
  if (input.brokeModeStatus.enabled && input.brokeModeStatus.nonEssentialLimit > 0) {
    const bm = input.brokeModeStatus;
    if (bm.totalJunkSpent > bm.nonEssentialLimit) {
      pushAlert({
        id: 'alert-broke-cap-exceeded',
        signature: `broke_nonessential_exceeded:${bm.period}:${monthKey}`,
        type: 'budget_exceeded',
        severity: 'critical',
        title: 'Broke Mode Non-Essential Cap Exceeded',
        reason: `Non-essential & impulsive spend reached ₹${bm.totalJunkSpent.toLocaleString('en-IN')} against your ₹${bm.nonEssentialLimit.toLocaleString('en-IN')} strict cap.`,
        periodLabel: bm.periodLabel,
        metricValue: `${bm.nonEssentialUtilisationPct}%`,
      });
    }
  }

  // 4. Unusual Spending Alert (This Week vs Last Week per category)
  const prevWeek = getPreviousPeriodBounds('weekly', now);
  const thisWeekByCat = new Map<string, number>();
  const prevWeekByCat = new Map<string, number>();

  for (const item of classified) {
    const cat = item.transaction.category || 'Other';
    if (isTimestampInBounds(item.transaction.timestamp, weekBounds)) {
      thisWeekByCat.set(cat, roundCurrency((thisWeekByCat.get(cat) ?? 0) + item.effectiveAmount));
    } else if (isTimestampInBounds(item.transaction.timestamp, prevWeek)) {
      prevWeekByCat.set(cat, roundCurrency((prevWeekByCat.get(cat) ?? 0) + item.effectiveAmount));
    }
  }

  for (const [cat, currAmt] of thisWeekByCat.entries()) {
    const prevAmt = prevWeekByCat.get(cat) ?? 0;
    if (prevAmt >= 50 && currAmt >= prevAmt * 1.4 && currAmt - prevAmt >= 100) {
      const surgePct = roundCurrency(((currAmt - prevAmt) / prevAmt) * 100);
      pushAlert({
        id: `alert-unusual-${cat}`,
        signature: `unusual:${cat}:${weekKey}`,
        type: 'unusual_spending',
        severity: 'warning',
        title: `Unusual Spike in ${cat}`,
        reason: `${cat} spend is up +${surgePct}% this week (₹${currAmt.toLocaleString('en-IN')} vs ₹${prevAmt.toLocaleString('en-IN')} last week).`,
        category: cat,
        periodLabel: 'This Week',
        metricValue: `+${surgePct}%`,
      });
    }
  }

  // 5. Repeated Small Purchase Alert (>= 3 occurrences of non-essential item in 14 days)
  const fourteenDaysAgoMs = now.getTime() - 14 * 24 * 60 * 60 * 1000;
  const repeatGroups = new Map<string, { label: string; category: string; count: number; total: number }>();
  for (const item of classified) {
    if (item.classification === 'essential') continue;
    const ms = new Date(item.transaction.timestamp).getTime();
    if (!Number.isFinite(ms) || ms < fourteenDaysAgoMs) continue;
    const clean = item.transaction.name.replace(/^Mart:\s*/i, '').trim();
    const key = normalizePurchaseLabel(clean);
    if (!key) continue;
    const prev = repeatGroups.get(key) ?? {
      label: clean,
      category: item.transaction.category,
      count: 0,
      total: 0,
    };
    prev.count += 1;
    prev.total = roundCurrency(prev.total + item.effectiveAmount);
    repeatGroups.set(key, prev);
  }
  for (const [key, grp] of repeatGroups.entries()) {
    if (grp.count >= 3) {
      pushAlert({
        id: `alert-repeat-${key}`,
        signature: `repeat:${key}:${grp.count}:${weekKey}`,
        type: 'repeated_purchase',
        severity: 'warning',
        title: `Repeated Leakage: ${grp.label}`,
        reason: `Purchased ${grp.count} times in the last 14 days totaling ₹${grp.total.toLocaleString('en-IN')}.`,
        category: grp.category,
        periodLabel: 'Last 14 Days',
        metricValue: `${grp.count}x`,
      });
    }
  }

  // 6. Spending Improvement Alert (This Week vs Last Week junk drop >= 15%, when prev >= 100)
  let thisWeekJunk = 0;
  let prevWeekJunk = 0;
  for (const item of classified) {
    if (item.classification === 'essential') continue;
    if (isTimestampInBounds(item.transaction.timestamp, weekBounds)) {
      thisWeekJunk += item.effectiveAmount;
    } else if (isTimestampInBounds(item.transaction.timestamp, prevWeek)) {
      prevWeekJunk += item.effectiveAmount;
    }
  }
  if (prevWeekJunk >= 100 && thisWeekJunk < prevWeekJunk) {
    const dropPct = roundCurrency(((prevWeekJunk - thisWeekJunk) / prevWeekJunk) * 100);
    if (dropPct >= 15) {
      pushAlert({
        id: 'alert-spending-improvement',
        signature: `improvement:${weekKey}`,
        type: 'spending_improvement',
        severity: 'info',
        title: `Junk Spend Down ${dropPct}% This Week`,
        reason: `Non-essential & impulsive spending dropped from ₹${roundCurrency(prevWeekJunk).toLocaleString('en-IN')} last week to ₹${roundCurrency(thisWeekJunk).toLocaleString('en-IN')} this week.`,
        periodLabel: 'This Week vs Last',
        metricValue: `-${dropPct}%`,
      });
    }
  }

  const severityOrder: Record<SmartAlert['severity'], number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    allAlerts: alerts,
    activeAlerts: alerts.filter((a) => !dismissed.has(a.signature)),
  };
}

// ---------- FINANCIAL DISCIPLINE SCORE ----------

export interface DisciplineScoreBreakdown {
  adherence: number; // max 30
  essentialBalance: number; // max 25
  impulsiveControl: number; // max 20
  periodImprovement: number; // max 15
  consistency: number; // max 10
}

export interface DisciplineScoreResult {
  hasSufficientHistory: boolean;
  transactionCount: number;
  requiredTransactions: number;
  score: number | null;
  previousScore: number | null;
  scoreDelta: number | null;
  grade: 'Elite' | 'Strong' | 'Steady' | 'At Risk' | 'Critical' | 'Insufficient Data';
  breakdown: DisciplineScoreBreakdown | null;
  explanation: string[];
  strongestHabit: string | null;
  biggestImprovementArea: string | null;
}

function scoreWindow(
  windowTxs: ClassifiedTransaction[],
  priorTxs: ClassifiedTransaction[],
  totalBudget: number,
  evaluatedLimits: EvaluatedCategoryLimit[],
  challenges: FinancialChallenge[],
  disciplineCheckIns: string[]
): { score: number; breakdown: DisciplineScoreBreakdown } {
  const totalSpend = windowTxs.reduce((s, i) => s + i.effectiveAmount, 0);
  const essentialSpend = windowTxs
    .filter((i) => i.classification === 'essential')
    .reduce((s, i) => s + i.effectiveAmount, 0);
  const impulsiveSpend = windowTxs
    .filter((i) => i.classification === 'impulsive')
    .reduce((s, i) => s + i.effectiveAmount, 0);
  const junkSpend = Math.max(0, totalSpend - essentialSpend);

  // 1. Adherence (0-30): Monthly budget + enabled category limits compliance
  let adherence = 30;
  if (totalBudget > 0 && totalSpend > totalBudget) {
    const overRatio = Math.min(1, (totalSpend - totalBudget) / totalBudget);
    adherence -= Math.round(overRatio * 18);
  }
  const activeLimits = evaluatedLimits.filter((l) => l.limit.enabled);
  if (activeLimits.length > 0) {
    const exceededCount = activeLimits.filter((l) => l.status === 'exceeded').length;
    const approachingCount = activeLimits.filter((l) => l.status === 'approaching' || l.status === 'reached').length;
    adherence -= Math.min(15, exceededCount * 6 + approachingCount * 2);
  }
  adherence = Math.max(0, Math.min(30, adherence));

  // 2. Essential vs Non-Essential Balance (0-25): essential purchases NEVER penalized
  const essentialRatio = totalSpend > 0 ? essentialSpend / totalSpend : 1;
  // At 80%+ essential => full 25 pts; 0% essential => 0 pts
  const essentialBalance = Math.max(
    0,
    Math.min(25, Math.round(Math.min(1, essentialRatio / 0.8) * 25))
  );

  // 3. Impulsive Control (0-20): penalized by impulsive spend ratio & count
  const impulsiveRatio = totalSpend > 0 ? impulsiveSpend / totalSpend : 0;
  const impulsiveCount = windowTxs.filter((i) => i.classification === 'impulsive').length;
  const impulsivePenalty = Math.min(20, impulsiveRatio * 35 + Math.max(0, impulsiveCount - 1) * 1.5);
  const impulsiveControl = Math.max(0, Math.min(20, Math.round(20 - impulsivePenalty)));

  // 4. Period Improvement Trend (0-15): only rewards/penalizes if prior period has real spend
  let periodImprovement = 8; // neutral baseline when prior history absent
  const priorSpend = priorTxs.reduce((s, i) => s + i.effectiveAmount, 0);
  if (priorSpend > 0 && priorTxs.length >= 2) {
    const priorJunk = priorTxs
      .filter((i) => i.classification !== 'essential')
      .reduce((s, i) => s + i.effectiveAmount, 0);
    const priorJunkRatio = priorJunk / priorSpend;
    const currJunkRatio = totalSpend > 0 ? junkSpend / totalSpend : 0;
    const ratioDelta = priorJunkRatio - currJunkRatio; // positive = improved
    periodImprovement = Math.max(0, Math.min(15, Math.round(8 + ratioDelta * 25)));
  }

  // 5. Consistency & Challenge Bonus (0-10)
  const completedChallenges = challenges.filter((c) => c.status === 'completed').length;
  const activeHealthyChallenges = challenges.filter((c) => c.status === 'active').length;
  const recentCheckIns = disciplineCheckIns.length;
  const consistency = Math.max(
    0,
    Math.min(10, 3 + Math.min(4, completedChallenges * 2 + activeHealthyChallenges) + Math.min(3, recentCheckIns))
  );

  const score = Math.max(
    0,
    Math.min(100, adherence + essentialBalance + impulsiveControl + periodImprovement + consistency)
  );

  return {
    score,
    breakdown: {
      adherence,
      essentialBalance,
      impulsiveControl,
      periodImprovement,
      consistency,
    },
  };
}

export function computeDisciplineScore(params: {
  transactions: Transaction[];
  totalBudget: number;
  evaluatedLimits: EvaluatedCategoryLimit[];
  challenges: FinancialChallenge[];
  disciplineCheckIns: string[];
  now?: Date;
}): DisciplineScoreResult {
  const now = params.now ?? new Date();
  const classified = classifyTransactions(params.transactions);
  const requiredTransactions = 3;

  if (classified.length < requiredTransactions) {
    return {
      hasSufficientHistory: false,
      transactionCount: classified.length,
      requiredTransactions,
      score: null,
      previousScore: null,
      scoreDelta: null,
      grade: 'Insufficient Data',
      breakdown: null,
      explanation: [
        `Record at least ${requiredTransactions} active transactions to unlock your 0–100 Discipline Score (${classified.length}/${requiredTransactions} logged).`,
      ],
      strongestHabit: null,
      biggestImprovementArea: null,
    };
  }

  // Evaluate current 30-day rolling window (or all if user only has older seeded history)
  const thirtyDaysAgoMs = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  const sixtyDaysAgoMs = now.getTime() - 60 * 24 * 60 * 60 * 1000;

  let currentTxs = classified.filter((i) => new Date(i.transaction.timestamp).getTime() >= thirtyDaysAgoMs);
  if (currentTxs.length === 0) {
    currentTxs = classified;
  }
  const priorTxs = classified.filter((i) => {
    const ms = new Date(i.transaction.timestamp).getTime();
    return ms >= sixtyDaysAgoMs && ms < thirtyDaysAgoMs;
  });

  const { score, breakdown } = scoreWindow(
    currentTxs,
    priorTxs,
    params.totalBudget,
    params.evaluatedLimits,
    params.challenges,
    params.disciplineCheckIns
  );

  let previousScore: number | null = null;
  let scoreDelta: number | null = null;
  if (priorTxs.length >= 2) {
    const prevResult = scoreWindow(
      priorTxs,
      [],
      params.totalBudget,
      [],
      [],
      []
    );
    previousScore = prevResult.score;
    scoreDelta = score - previousScore;
  }

  let grade: DisciplineScoreResult['grade'] = 'Steady';
  if (score >= 85) grade = 'Elite';
  else if (score >= 70) grade = 'Strong';
  else if (score >= 55) grade = 'Steady';
  else if (score >= 35) grade = 'At Risk';
  else grade = 'Critical';

  const pillars: Array<{ key: string; label: string; pct: number; detail: string }> = [
    {
      key: 'adherence',
      label: 'Budget & Limit Adherence',
      pct: breakdown.adherence / 30,
      detail: `Adherence earned ${breakdown.adherence}/30 based on monthly budget and enabled category caps.`,
    },
    {
      key: 'essentialBalance',
      label: 'Essential Priority Balance',
      pct: breakdown.essentialBalance / 25,
      detail: `Essential balance scored ${breakdown.essentialBalance}/25 by keeping core needs above discretionary spend.`,
    },
    {
      key: 'impulsiveControl',
      label: 'Impulsive Purchase Control',
      pct: breakdown.impulsiveControl / 20,
      detail: `Impulsive control scored ${breakdown.impulsiveControl}/20 based on craving/late-night frequency.`,
    },
    {
      key: 'periodImprovement',
      label: 'Period-over-Period Progress',
      pct: breakdown.periodImprovement / 15,
      detail:
        priorTxs.length >= 2
          ? `Trend scored ${breakdown.periodImprovement}/15 compared against the previous 30-day window.`
          : `Trend at neutral ${breakdown.periodImprovement}/15 until prior-month history builds up.`,
    },
    {
      key: 'consistency',
      label: 'Challenges & Check-In Consistency',
      pct: breakdown.consistency / 10,
      detail: `Consistency scored ${breakdown.consistency}/10 from completed challenges and verified check-ins.`,
    },
  ];

  const sortedBest = [...pillars].sort((a, b) => b.pct - a.pct);
  const sortedWorst = [...pillars].sort((a, b) => a.pct - b.pct);

  return {
    hasSufficientHistory: true,
    transactionCount: classified.length,
    requiredTransactions,
    score,
    previousScore,
    scoreDelta,
    grade,
    breakdown,
    explanation: pillars.map((p) => p.detail),
    strongestHabit: `${sortedBest[0].label} (${Math.round(sortedBest[0].pct * 100)}%)`,
    biggestImprovementArea:
      sortedWorst[0].pct < 0.85
        ? `${sortedWorst[0].label} (${Math.round(sortedWorst[0].pct * 100)}%)`
        : 'Maintain current habits — all pillars above 85%',
  };
}

// ---------- CHALLENGES & VERIFIED STREAKS ----------

export interface ChallengeTemplate {
  templateId: Exclude<FinancialChallengeTemplateId, 'custom'>;
  title: string;
  description: string;
  targetDays: number;
  defaultCategory?: string;
  defaultMaxSpend?: number;
}

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  {
    templateId: 'no_junk_3d',
    title: 'No Junk for 3 Days',
    description: 'Log essential purchases or daily clean check-ins for 3 days with ₹0 spent on junk or impulsive items.',
    targetDays: 3,
  },
  {
    templateId: 'weekly_budget_guard',
    title: '7-Day Weekly Budget Guard',
    description: 'Stay strictly inside your weekly spending limit across all categories for 7 consecutive days.',
    targetDays: 7,
    defaultMaxSpend: 1500,
  },
  {
    templateId: 'cut_impulsive_7d',
    title: '7-Day Zero Impulse Challenge',
    description: 'Eliminate impulsive late-night treats and craving purchases for a full 7-day stretch.',
    targetDays: 7,
  },
  {
    templateId: 'category_control_7d',
    title: 'Category Lock: Snacks & Junk',
    description: 'Keep Junk spending under ₹200 across a 7-day discipline sprint.',
    targetDays: 7,
    defaultCategory: 'Junk',
    defaultMaxSpend: 200,
  },
  {
    templateId: 'non_essential_cap_14d',
    title: '14-Day Non-Essential Cap',
    description: 'Restrict total non-essential and impulsive spending under ₹800 over 14 days.',
    targetDays: 14,
    defaultMaxSpend: 800,
  },
];

export interface EvaluatedChallenge {
  challenge: FinancialChallenge;
  elapsedDays: number;
  remainingDays: number;
  verifiedCleanDays: number;
  progressPct: number;
  violated: boolean;
  violationReason: string | null;
  spentDuringChallenge: number;
  isEligibleToComplete: boolean;
}

export function evaluateChallenges(
  challenges: FinancialChallenge[],
  transactions: Transaction[],
  disciplineCheckIns: string[],
  now: Date = new Date()
): {
  evaluated: EvaluatedChallenge[];
  verifiedOverallStreak: number;
} {
  const classified = classifyTransactions(transactions);
  const checkInSet = new Set(disciplineCheckIns);

  // Build day index map of transactions
  const dayMap = new Map<
    string,
    {
      hasAnyTx: boolean;
      hasJunk: boolean;
      hasImpulsive: boolean;
      totalSpend: number;
      junkSpend: number;
      byCat: Map<string, number>;
    }
  >();

  for (const item of classified) {
    const d = new Date(item.transaction.timestamp);
    if (Number.isNaN(d.getTime())) continue;
    const key = toLocalDateKey(d);
    const entry = dayMap.get(key) ?? {
      hasAnyTx: false,
      hasJunk: false,
      hasImpulsive: false,
      totalSpend: 0,
      junkSpend: 0,
      byCat: new Map<string, number>(),
    };
    entry.hasAnyTx = true;
    entry.totalSpend = roundCurrency(entry.totalSpend + item.effectiveAmount);
    if (item.classification !== 'essential') {
      entry.hasJunk = true;
      entry.junkSpend = roundCurrency(entry.junkSpend + item.effectiveAmount);
    }
    if (item.classification === 'impulsive') {
      entry.hasImpulsive = true;
    }
    const catKey = (item.transaction.category ?? '').trim().toLowerCase();
    entry.byCat.set(catKey, roundCurrency((entry.byCat.get(catKey) ?? 0) + item.effectiveAmount));
    dayMap.set(key, entry);
  }

  // Verified overall discipline streak walking backward from today
  // STRICT RULE: Only reward confirmed clean days (tx with no impulsive violation OR explicit check-in), NEVER empty no-data days!
  let verifiedOverallStreak = 0;
  for (let offset = 0; offset < 60; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    const key = toLocalDateKey(d);
    const dayEntry = dayMap.get(key);
    const hasCheckIn = checkInSet.has(key);

    if (dayEntry?.hasImpulsive) {
      break;
    }
    if (dayEntry?.hasAnyTx || hasCheckIn) {
      verifiedOverallStreak += 1;
    } else {
      // If today simply hasn't had activity yet, allow streak from yesterday to inspect, otherwise break on empty no-data gap
      if (offset === 0) continue;
      break;
    }
  }

  const evaluated: EvaluatedChallenge[] = challenges.map((challenge) => {
    const started = new Date(challenge.startedAt);
    const startDay = new Date(started.getFullYear(), started.getMonth(), started.getDate());
    const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const elapsedDays = Math.max(
      1,
      Math.floor((todayDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
    const remainingDays = Math.max(0, challenge.targetDays - elapsedDays);

    let verifiedCleanDays = 0;
    let violated = false;
    let violationReason: string | null = null;
    let spentDuringChallenge = 0;

    const targetCatLower = challenge.targetCategory?.trim().toLowerCase() ?? null;
    const daysToScan = Math.min(challenge.targetDays, elapsedDays);

    for (let i = 0; i < daysToScan; i++) {
      const d = new Date(startDay.getFullYear(), startDay.getMonth(), startDay.getDate() + i);
      const key = toLocalDateKey(d);
      const dayEntry = dayMap.get(key);
      const hasCheckIn = checkInSet.has(key);

      let dayRelevantSpend = 0;
      let dayViolated = false;

      if (dayEntry) {
        if (challenge.templateId === 'no_junk_3d') {
          dayRelevantSpend = dayEntry.junkSpend;
          if (dayEntry.hasJunk) {
            dayViolated = true;
            violationReason = `Junk/non-essential purchase logged on ${key}.`;
          }
        } else if (challenge.templateId === 'cut_impulsive_7d') {
          dayRelevantSpend = dayEntry.junkSpend;
          if (dayEntry.hasImpulsive) {
            dayViolated = true;
            violationReason = `Impulsive purchase logged on ${key}.`;
          }
        } else if (challenge.templateId === 'category_control_7d' && targetCatLower) {
          dayRelevantSpend = dayEntry.byCat.get(targetCatLower) ?? 0;
        } else if (challenge.templateId === 'non_essential_cap_14d') {
          dayRelevantSpend = dayEntry.junkSpend;
        } else {
          dayRelevantSpend = dayEntry.totalSpend;
        }
      }

      spentDuringChallenge = roundCurrency(spentDuringChallenge + dayRelevantSpend);

      if (dayViolated) {
        violated = true;
      } else if (dayEntry?.hasAnyTx || hasCheckIn) {
        verifiedCleanDays += 1;
      }
    }

    if (
      !violated &&
      typeof challenge.maxAllowedSpend === 'number' &&
      challenge.maxAllowedSpend >= 0 &&
      spentDuringChallenge > challenge.maxAllowedSpend
    ) {
      violated = true;
      violationReason = `Spent ₹${spentDuringChallenge.toLocaleString('en-IN')} against ₹${challenge.maxAllowedSpend.toLocaleString('en-IN')} challenge ceiling.`;
    }

    const effectiveVerified = Math.min(challenge.targetDays, verifiedCleanDays);
    const progressPct =
      challenge.status === 'completed'
        ? 100
        : roundCurrency((effectiveVerified / Math.max(1, challenge.targetDays)) * 100);

    const isEligibleToComplete =
      challenge.status === 'active' &&
      !violated &&
      effectiveVerified >= challenge.targetDays;

    return {
      challenge,
      elapsedDays,
      remainingDays,
      verifiedCleanDays: effectiveVerified,
      progressPct,
      violated,
      violationReason,
      spentDuringChallenge,
      isEligibleToComplete,
    };
  });

  return { evaluated, verifiedOverallStreak };
}

// ---------- SPENDING BEHAVIOUR ANALYTICS & INSIGHTS ----------

export interface BehaviourTimeBucket {
  label: string;
  essential: number;
  nonEssential: number;
  impulsive: number;
  totalJunk: number;
  total: number;
}

export interface PeriodComparisonSummary {
  currentLabel: string;
  previousLabel: string;
  currentTotal: number;
  previousTotal: number;
  totalDeltaPct: number | null;
  currentJunk: number;
  previousJunk: number;
  junkDeltaPct: number | null;
  currentEssential: number;
  previousEssential: number;
  currentImpulsive: number;
  previousImpulsive: number;
}

export interface BehaviourInsight {
  id: string;
  tone: 'positive' | 'caution' | 'neutral';
  title: string;
  detail: string;
  metric?: string;
}

export interface DisciplineHistoryPoint {
  label: string;
  score: number | null;
  essentialPct: number;
}

export interface BehaviourAnalyticsSummary {
  dailySeries: BehaviourTimeBucket[]; // last 14 days
  weeklySeries: BehaviourTimeBucket[]; // last 6 weeks
  monthlySeries: BehaviourTimeBucket[]; // last 6 months
  weekComparison: PeriodComparisonSummary;
  monthComparison: PeriodComparisonSummary;
  disciplineTrend: DisciplineHistoryPoint[];
  insights: BehaviourInsight[];
}

function summarizeBounds(
  classified: ClassifiedTransaction[],
  bounds: PeriodBounds
): { essential: number; nonEssential: number; impulsive: number; totalJunk: number; total: number } {
  let essential = 0;
  let nonEssential = 0;
  let impulsive = 0;
  for (const item of classified) {
    if (!isTimestampInBounds(item.transaction.timestamp, bounds)) continue;
    if (item.classification === 'essential') essential += item.effectiveAmount;
    else if (item.classification === 'non_essential') nonEssential += item.effectiveAmount;
    else impulsive += item.effectiveAmount;
  }
  const totalJunk = roundCurrency(nonEssential + impulsive);
  const total = roundCurrency(essential + totalJunk);
  return {
    essential: roundCurrency(essential),
    nonEssential: roundCurrency(nonEssential),
    impulsive: roundCurrency(impulsive),
    totalJunk,
    total,
  };
}

export function computeBehaviourAnalytics(
  transactions: Transaction[],
  totalBudget: number,
  now: Date = new Date()
): BehaviourAnalyticsSummary {
  const classified = classifyTransactions(transactions);

  // 14-day daily series
  const dailySeries: BehaviourTimeBucket[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 12, 0, 0, 0);
    const bounds = getPeriodBounds('daily', d);
    const summary = summarizeBounds(classified, bounds);
    dailySeries.push({
      label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      ...summary,
    });
  }

  // 6-week weekly series + discipline history
  const weeklySeries: BehaviourTimeBucket[] = [];
  const disciplineTrend: DisciplineHistoryPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const ref = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7, 12, 0, 0, 0);
    const bounds = getPeriodBounds('weekly', ref);
    const summary = summarizeBounds(classified, bounds);
    const label = bounds.start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    weeklySeries.push({ label, ...summary });

    const weekTxs = classified.filter((item) => isTimestampInBounds(item.transaction.timestamp, bounds));
    if (weekTxs.length > 0 && summary.total > 0) {
      const scored = scoreWindow(weekTxs, [], totalBudget, [], [], []);
      disciplineTrend.push({
        label,
        score: scored.score,
        essentialPct: roundCurrency((summary.essential / summary.total) * 100),
      });
    } else {
      disciplineTrend.push({
        label,
        score: null,
        essentialPct: 0,
      });
    }
  }

  // 6-month monthly series
  const monthlySeries: BehaviourTimeBucket[] = [];
  for (let i = 5; i >= 0; i--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 15, 12, 0, 0, 0);
    const bounds = getPeriodBounds('monthly', ref);
    const summary = summarizeBounds(classified, bounds);
    monthlySeries.push({
      label: ref.toLocaleDateString(undefined, { month: 'short' }),
      ...summary,
    });
  }

  const thisWeek = getPeriodBounds('weekly', now);
  const lastWeek = getPreviousPeriodBounds('weekly', now);
  const wCurr = summarizeBounds(classified, thisWeek);
  const wPrev = summarizeBounds(classified, lastWeek);

  const thisMonth = getPeriodBounds('monthly', now);
  const lastMonth = getPreviousPeriodBounds('monthly', now);
  const mCurr = summarizeBounds(classified, thisMonth);
  const mPrev = summarizeBounds(classified, lastMonth);

  const weekComparison: PeriodComparisonSummary = {
    currentLabel: 'This Week',
    previousLabel: 'Last Week',
    currentTotal: wCurr.total,
    previousTotal: wPrev.total,
    totalDeltaPct: calculatePctChange(wCurr.total, wPrev.total),
    currentJunk: wCurr.totalJunk,
    previousJunk: wPrev.totalJunk,
    junkDeltaPct: calculatePctChange(wCurr.totalJunk, wPrev.totalJunk),
    currentEssential: wCurr.essential,
    previousEssential: wPrev.essential,
    currentImpulsive: wCurr.impulsive,
    previousImpulsive: wPrev.impulsive,
  };

  const monthComparison: PeriodComparisonSummary = {
    currentLabel: thisMonth.label,
    previousLabel: lastMonth.label,
    currentTotal: mCurr.total,
    previousTotal: mPrev.total,
    totalDeltaPct: calculatePctChange(mCurr.total, mPrev.total),
    currentJunk: mCurr.totalJunk,
    previousJunk: mPrev.totalJunk,
    junkDeltaPct: calculatePctChange(mCurr.totalJunk, mPrev.totalJunk),
    currentEssential: mCurr.essential,
    previousEssential: mPrev.essential,
    currentImpulsive: mCurr.impulsive,
    previousImpulsive: mPrev.impulsive,
  };

  const insights: BehaviourInsight[] = [];
  if (classified.length > 0) {
    // Insight 1: Top non-essential driver
    const catJunk = new Map<string, number>();
    for (const item of classified) {
      if (item.classification === 'essential') continue;
      catJunk.set(
        item.transaction.category,
        roundCurrency((catJunk.get(item.transaction.category) ?? 0) + item.effectiveAmount)
      );
    }
    const topCat = Array.from(catJunk.entries()).sort((a, b) => b[1] - a[1])[0];
    if (topCat && topCat[1] > 0) {
      insights.push({
        id: 'insight-top-junk',
        tone: 'caution',
        title: `Primary Discretionary Driver: ${topCat[0]}`,
        detail: `${topCat[0]} accounts for ₹${topCat[1].toLocaleString('en-IN')} of non-essential and impulsive spending across your recorded history.`,
        metric: `₹${topCat[1].toLocaleString('en-IN')}`,
      });
    }

    // Insight 2: Week-over-week junk trend
    if (weekComparison.junkDeltaPct !== null) {
      const improved = weekComparison.junkDeltaPct <= 0;
      insights.push({
        id: 'insight-week-junk',
        tone: improved ? 'positive' : 'caution',
        title: improved ? 'Weekly Junk Control Improving' : 'Weekly Junk Spending Rising',
        detail: improved
          ? `Non-essential spend dropped ${Math.abs(weekComparison.junkDeltaPct)}% vs last week (₹${wCurr.totalJunk.toLocaleString('en-IN')} vs ₹${wPrev.totalJunk.toLocaleString('en-IN')}).`
          : `Non-essential spend climbed +${weekComparison.junkDeltaPct}% vs last week (₹${wCurr.totalJunk.toLocaleString('en-IN')} vs ₹${wPrev.totalJunk.toLocaleString('en-IN')}).`,
        metric: `${weekComparison.junkDeltaPct > 0 ? '+' : ''}${weekComparison.junkDeltaPct}%`,
      });
    }

    // Insight 3: Essential ratio health
    const totalAll = classified.reduce((s, i) => s + i.effectiveAmount, 0);
    const essentialAll = classified
      .filter((i) => i.classification === 'essential')
      .reduce((s, i) => s + i.effectiveAmount, 0);
    if (totalAll > 0) {
      const essentialPct = roundCurrency((essentialAll / totalAll) * 100);
      insights.push({
        id: 'insight-essential-ratio',
        tone: essentialPct >= 70 ? 'positive' : essentialPct >= 50 ? 'neutral' : 'caution',
        title:
          essentialPct >= 70
            ? 'Strong Essential Allocation'
            : essentialPct >= 50
              ? 'Balanced Essential Ratio'
              : 'High Discretionary Allocation',
        detail: `${essentialPct}% of all tracked spend went to essential groceries, fuel, and bills (₹${roundCurrency(essentialAll).toLocaleString('en-IN')} of ₹${roundCurrency(totalAll).toLocaleString('en-IN')}).`,
        metric: `${essentialPct}%`,
      });
    }

    // Insight 4: Late-night impulsive window check
    const lateNightItems = classified.filter((i) => {
      if (i.classification === 'essential') return false;
      const h = new Date(i.transaction.timestamp).getHours();
      return h >= 21 || h < 5;
    });
    if (lateNightItems.length >= 2) {
      const lateSum = roundCurrency(lateNightItems.reduce((s, i) => s + i.effectiveAmount, 0));
      insights.push({
        id: 'insight-late-night',
        tone: 'caution',
        title: 'Late-Night Ordering Pattern Detected',
        detail: `${lateNightItems.length} non-essential purchases happened after 9 PM, totaling ₹${lateSum.toLocaleString('en-IN')}. Setting an after-9-PM pause rule helps curb impulsive orders.`,
        metric: `${lateNightItems.length}x`,
      });
    }
  }

  return {
    dailySeries,
    weeklySeries,
    monthlySeries,
    weekComparison,
    monthComparison,
    disciplineTrend,
    insights,
  };
}

// ---------- FINANCIAL TARGETS & SAVINGS SEPARATION ----------

export interface EvaluatedFinancialTarget {
  target: FinancialTarget;
  currentSpend: number;
  previousSpend: number;
  spendReduction: number; // Real observed drop vs prior period or baseline
  estimatedSavings: number; // Projected potential savings if target met
  transferredSavings: number; // Real money explicitly logged as transferred to savings
  progressPct: number;
  achieved: boolean;
  statusLabel: string;
}

export function evaluateFinancialTargets(
  targets: FinancialTarget[],
  transactions: Transaction[],
  now: Date = new Date()
): EvaluatedFinancialTarget[] {
  const classified = classifyTransactions(transactions);

  return targets.map((target) => {
    const currBounds = getPeriodBounds(target.period, now);
    const prevBounds = getPreviousPeriodBounds(target.period, now);

    const currSummary = summarizeBounds(classified, currBounds);
    const prevSummary = summarizeBounds(classified, prevBounds);

    if (target.type === 'cap_non_essential_amount') {
      const cap = Math.max(1, target.targetValue);
      const currentSpend = currSummary.totalJunk;
      const previousSpend = target.baselineValue ?? prevSummary.totalJunk;
      const spendReduction = roundCurrency(Math.max(0, previousSpend - currentSpend));
      const remainingHeadroom = Math.max(0, cap - currentSpend);
      const achieved = currentSpend <= cap;
      const progressPct =
        currentSpend <= cap
          ? roundCurrency(Math.min(100, Math.max(0, ((cap - currentSpend) / cap) * 100 + 25)))
          : roundCurrency(Math.max(0, (cap / currentSpend) * 100));

      return {
        target,
        currentSpend,
        previousSpend,
        spendReduction,
        estimatedSavings: roundCurrency(remainingHeadroom),
        transferredSavings: roundCurrency(target.transferredSavings || 0),
        progressPct: Math.min(100, progressPct),
        achieved,
        statusLabel: achieved
          ? `On track: ₹${currentSpend.toLocaleString('en-IN')} / ₹${cap.toLocaleString('en-IN')} cap`
          : `Over cap by ₹${roundCurrency(currentSpend - cap).toLocaleString('en-IN')}`,
      };
    }

    if (target.type === 'reduce_impulsive_pct') {
      const baseline = Math.max(0, target.baselineValue ?? prevSummary.impulsive);
      const currentSpend = currSummary.impulsive;
      const spendReduction = roundCurrency(Math.max(0, baseline - currentSpend));
      const targetReductionAmount = roundCurrency(baseline * (target.targetValue / 100));
      const progressPct =
        targetReductionAmount > 0
          ? roundCurrency(Math.min(100, (spendReduction / targetReductionAmount) * 100))
          : currentSpend === 0
          ? 100
          : 0;
      const achieved =
        baseline > 0 ? spendReduction >= targetReductionAmount : currentSpend === 0;

      return {
        target,
        currentSpend,
        previousSpend: baseline,
        spendReduction,
        estimatedSavings: targetReductionAmount,
        transferredSavings: roundCurrency(target.transferredSavings || 0),
        progressPct,
        achieved,
        statusLabel:
          baseline > 0
            ? `Reduced ₹${spendReduction.toLocaleString('en-IN')} of ₹${targetReductionAmount.toLocaleString('en-IN')} goal`
            : 'No prior impulsive baseline yet — keep impulsive at ₹0',
      };
    }

    // reduce_junk_by_amount
    const baseline = Math.max(0, target.baselineValue ?? prevSummary.totalJunk);
    const currentSpend = currSummary.totalJunk;
    const spendReduction = roundCurrency(Math.max(0, baseline - currentSpend));
    const goalAmt = Math.max(1, target.targetValue);
    const progressPct =
      baseline > 0
        ? roundCurrency(Math.min(100, (spendReduction / goalAmt) * 100))
        : currentSpend === 0
        ? 100
        : 0;
    const achieved = baseline > 0 ? spendReduction >= goalAmt : currentSpend === 0;

    return {
      target,
      currentSpend,
      previousSpend: baseline,
      spendReduction,
      estimatedSavings: goalAmt,
      transferredSavings: roundCurrency(target.transferredSavings || 0),
      progressPct,
      achieved,
      statusLabel:
        baseline > 0
          ? `Cut ₹${spendReduction.toLocaleString('en-IN')} vs ₹${goalAmt.toLocaleString('en-IN')} goal`
          : `Monitoring current period junk spend (₹${currentSpend.toLocaleString('en-IN')})`,
    };
  });
}
