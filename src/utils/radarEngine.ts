import type { CategoryCaps, Transaction } from '../types/models';
import { getEffectiveTransactionAmount, toLocalDateKey } from './martEngine';
import { roundCurrency } from './splitLedgerEngine';

export type RadarTimeframePreset =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'last_3m'
  | 'last_6m'
  | 'this_year'
  | 'custom';

export interface RadarDateWindow {
  preset: RadarTimeframePreset;
  start: Date;
  end: Date;
  startMs: number;
  endMs: number;
  label: string;
  elapsedDays: number;
  totalCalendarDays: number;
  isIncompleteCurrentPeriod: boolean;
  comparisonStart: Date;
  comparisonEnd: Date;
  comparisonStartMs: number;
  comparisonEndMs: number;
  comparisonLabel: string;
  comparisonIsElapsedMatch: boolean;
}

export interface RadarTransactionSlice {
  tx: Transaction;
  effectiveAmount: number;
  ms: number;
  dateKey: string;
}

export interface RadarOverviewMetrics {
  window: RadarDateWindow;
  totalSpent: number;
  prevTotalSpent: number;
  spendDeltaAmount: number;
  spendDeltaPct: number | null;
  txCount: number;
  prevTxCount: number;
  txCountDeltaPct: number | null;
  avgDailySpend: number;
  prevAvgDailySpend: number;
  avgDailyDeltaPct: number | null;
  avgTxValue: number;
  prevAvgTxValue: number;
  avgTxValueDeltaPct: number | null;
  highestCategory: {
    category: string;
    amount: number;
    sharePct: number;
  } | null;
  monthlyBudget: number;
  currentMonthSpent: number;
  remainingBudget: number;
  budgetUtilisationPct: number;
  isOverMonthlyBudget: boolean;
  hasIncomeTracking: false;
}

export type CategoryTrendDirection = 'increasing' | 'decreasing' | 'stable' | 'new' | 'no_data';

export interface RadarCategoryBreakdownItem {
  category: string;
  totalSpent: number;
  sharePct: number;
  txCount: number;
  avgTxValue: number;
  prevSpent: number;
  prevTxCount: number;
  deltaAmount: number;
  deltaPct: number | null;
  trend: CategoryTrendDirection;
  allocatedCap: number | null;
  monthSpentForCap: number;
  capRemaining: number | null;
  capUtilisationPct: number | null;
  isOverCap: boolean;
  isApproachingCap: boolean;
  transactions: RadarTransactionSlice[];
}

export interface RadarCategoryAnalyticsResult {
  categories: RadarCategoryBreakdownItem[];
  donutData: Array<{ name: string; value: number; sharePct: number }>;
  totalSpent: number;
  categoryInsights: string[];
}

export type TrendGranularity = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RadarTrendPoint {
  key: string;
  label: string;
  fullLabel: string;
  spent: number;
  txCount: number;
  avgPerTx: number;
  byCategory: Record<string, number>;
}

export type DetectedTrendLabel = 'increasing' | 'decreasing' | 'stable' | 'insufficient_data';

export interface RadarSpendingTrendsResult {
  granularity: TrendGranularity;
  points: RadarTrendPoint[];
  avgDailySpend: number;
  highestSpendingDay: { dateKey: string; label: string; amount: number; txCount: number } | null;
  lowestActiveDay: { dateKey: string; label: string; amount: number; txCount: number } | null;
  overallTrend: DetectedTrendLabel;
  trendSummary: string;
  trendChangePct: number | null;
  repeatedPatterns: Array<{
    itemName: string;
    category: string;
    occurrences: number;
    totalSpent: number;
    avgSpent: number;
  }>;
  availableCategories: string[];
}

export type RadarComparisonPreset =
  | 'month_over_month'
  | 'week_over_week'
  | 'year_over_year'
  | 'selected_window';

export interface RadarPeriodComparisonResult {
  preset: RadarComparisonPreset;
  currentLabel: string;
  previousLabel: string;
  fairElapsedNote: string | null;
  currentSpent: number;
  previousSpent: number;
  amountDiff: number;
  pctChange: number | null;
  currentTxCount: number;
  previousTxCount: number;
  txFreqDiff: number;
  txFreqPctChange: number | null;
  currentAvgTx: number;
  previousAvgTx: number;
  avgTxDiff: number;
  avgTxPctChange: number | null;
  currentDailyAvg: number;
  previousDailyAvg: number;
  dailyAvgDiff: number;
  dailyAvgPctChange: number | null;
  categoryDeltas: Array<{
    category: string;
    currentSpent: number;
    previousSpent: number;
    diff: number;
    pctChange: number | null;
  }>;
}

export interface RadarBudgetCategoryRow {
  category: string;
  allocatedBudget: number | null;
  actualSpend: number;
  previousMonthSpend: number;
  deltaFromPrevPct: number | null;
  remaining: number | null;
  utilisationPct: number | null;
  status: 'no_cap' | 'within' | 'approaching' | 'exceeded';
}

export interface RadarBudgetMonitorResult {
  monthLabel: string;
  previousMonthLabel: string;
  totalBudget: number;
  totalMonthSpent: number;
  remainingBudget: number;
  utilisationPct: number;
  isOverBudget: boolean;
  categoriesExceedingCount: number;
  categoriesWithinCapCount: number;
  totalAllocatedCategoryCaps: number;
  rows: RadarBudgetCategoryRow[];
  insights: string[];
}

export type AnomalySeverity = 'low' | 'moderate' | 'high';
export type AnomalyKind =
  | 'transaction_outlier'
  | 'category_spike'
  | 'daily_spend_spike'
  | 'frequency_spike';

export interface RadarSpendingAnomaly {
  id: string;
  kind: AnomalyKind;
  severity: AnomalySeverity;
  subject: string;
  category: string;
  amount: number;
  date: string;
  baselineLabel: string;
  deviationPct: number;
  reason: string;
}

export type RadarInsightKind = 'spending' | 'trend' | 'budget' | 'behaviour' | 'savings_estimate';

export interface RadarFinancialInsight {
  id: string;
  kind: RadarInsightKind;
  tone: 'positive' | 'caution' | 'neutral';
  periodLabel: string;
  title: string;
  description: string;
  metricLabel?: string;
  isEstimate?: boolean;
}

export type TransactionSortBy = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';

export interface RadarTransactionQueryOptions {
  search?: string;
  category?: string;
  status?: 'active_only' | 'all' | 'refunded' | 'cancelled';
  startDate?: string;
  endDate?: string;
  sortBy?: TransactionSortBy;
}

export interface RadarTransactionQueryResult {
  items: Array<{
    tx: Transaction;
    effectiveAmount: number;
  }>;
  totalEffectiveSpend: number;
  highestTransactions: Array<{
    tx: Transaction;
    effectiveAmount: number;
  }>;
  mostFrequentCategories: Array<{
    category: string;
    count: number;
    totalSpent: number;
  }>;
}

export type ReportPeriodPreset = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface RadarFinancialReport {
  generatedAt: string;
  periodPreset: ReportPeriodPreset;
  periodLabel: string;
  comparisonLabel: string;
  totalExpenditure: number;
  previousExpenditure: number;
  expenditureChangePct: number | null;
  transactionCount: number;
  avgDailySpending: number;
  monthlyBudget: number;
  monthlyBudgetSpend: number;
  monthlyBudgetRemaining: number;
  monthlyBudgetUtilisationPct: number;
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    sharePct: number;
    txCount: number;
    cap: number | null;
  }>;
  largestTransactions: Array<{
    id: string;
    name: string;
    category: string;
    amount: number;
    date: string;
  }>;
  trendSummary: string;
  keyInsights: string[];
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function parseLocalDateInput(raw?: string): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (ymd) {
    const y = Number(ymd[1]);
    const m = Number(ymd[2]) - 1;
    const day = Number(ymd[3]);
    const parsed = new Date(y, m, day, 12, 0, 0, 0);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function countInclusiveDays(start: Date, end: Date): number {
  const s = startOfDay(start).getTime();
  const e = startOfDay(end).getTime();
  return Math.max(1, Math.round((e - s) / 86400000) + 1);
}

export function calcPctChange(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous <= 0) return null;
  return roundCurrency(((current - previous) / previous) * 100);
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatShortDateWithYear(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function resolveRadarWindow(
  preset: RadarTimeframePreset,
  customStart?: string,
  customEnd?: string,
  now: Date = new Date()
): RadarDateWindow {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const todayEnd = endOfDay(now);

  if (preset === 'today') {
    const start = startOfDay(now);
    const end = todayEnd;
    const prevDate = new Date(y, m, d - 1);
    const compStart = startOfDay(prevDate);
    const compEnd = endOfDay(prevDate);
    return {
      preset,
      start,
      end,
      startMs: start.getTime(),
      endMs: end.getTime(),
      label: `Today (${formatShortDate(now)})`,
      elapsedDays: 1,
      totalCalendarDays: 1,
      isIncompleteCurrentPeriod: false,
      comparisonStart: compStart,
      comparisonEnd: compEnd,
      comparisonStartMs: compStart.getTime(),
      comparisonEndMs: compEnd.getTime(),
      comparisonLabel: `Yesterday (${formatShortDate(prevDate)})`,
      comparisonIsElapsedMatch: false,
    };
  }

  if (preset === 'this_week') {
    const day = now.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const start = new Date(y, m, d + diffToMon, 0, 0, 0, 0);
    const fullWeekEnd = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
    const end = todayEnd;
    const elapsedDays = countInclusiveDays(start, end);
    const compStart = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 7, 0, 0, 0, 0);
    const compEnd = new Date(compStart.getFullYear(), compStart.getMonth(), compStart.getDate() + elapsedDays - 1, 23, 59, 59, 999);
    const isPartial = elapsedDays < 7;
    return {
      preset,
      start,
      end,
      startMs: start.getTime(),
      endMs: end.getTime(),
      label: `This Week (${formatShortDate(start)}–${formatShortDate(end)})`,
      elapsedDays,
      totalCalendarDays: countInclusiveDays(start, fullWeekEnd),
      isIncompleteCurrentPeriod: isPartial,
      comparisonStart: compStart,
      comparisonEnd: compEnd,
      comparisonStartMs: compStart.getTime(),
      comparisonEndMs: compEnd.getTime(),
      comparisonLabel: isPartial
        ? `Prior Week Elapsed (${formatShortDate(compStart)}–${formatShortDate(compEnd)})`
        : `Last Week (${formatShortDate(compStart)}–${formatShortDate(compEnd)})`,
      comparisonIsElapsedMatch: isPartial,
    };
  }

  if (preset === 'this_month') {
    const start = new Date(y, m, 1, 0, 0, 0, 0);
    const monthFullEnd = new Date(y, m + 1, 0, 23, 59, 59, 999);
    const totalCalDays = monthFullEnd.getDate();
    const elapsedDays = d;
    const isPartial = elapsedDays < totalCalDays;
    const prevMonthLastDay = new Date(y, m, 0).getDate();
    const compDayCap = Math.min(elapsedDays, prevMonthLastDay);
    const compStart = new Date(y, m - 1, 1, 0, 0, 0, 0);
    const compEnd = new Date(y, m - 1, compDayCap, 23, 59, 59, 999);
    const monthTitle = start.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    return {
      preset,
      start,
      end: todayEnd,
      startMs: start.getTime(),
      endMs: todayEnd.getTime(),
      label: monthTitle,
      elapsedDays,
      totalCalendarDays: totalCalDays,
      isIncompleteCurrentPeriod: isPartial,
      comparisonStart: compStart,
      comparisonEnd: compEnd,
      comparisonStartMs: compStart.getTime(),
      comparisonEndMs: compEnd.getTime(),
      comparisonLabel: isPartial
        ? `${formatShortDate(compStart)}–${formatShortDate(compEnd)} (elapsed match)`
        : compStart.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
      comparisonIsElapsedMatch: isPartial,
    };
  }

  if (preset === 'last_month') {
    const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
    const end = new Date(y, m, 0, 23, 59, 59, 999);
    const compStart = new Date(y, m - 2, 1, 0, 0, 0, 0);
    const compEnd = new Date(y, m - 1, 0, 23, 59, 59, 999);
    const days = countInclusiveDays(start, end);
    return {
      preset,
      start,
      end,
      startMs: start.getTime(),
      endMs: end.getTime(),
      label: start.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
      elapsedDays: days,
      totalCalendarDays: days,
      isIncompleteCurrentPeriod: false,
      comparisonStart: compStart,
      comparisonEnd: compEnd,
      comparisonStartMs: compStart.getTime(),
      comparisonEndMs: compEnd.getTime(),
      comparisonLabel: compStart.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
      comparisonIsElapsedMatch: false,
    };
  }

  if (preset === 'last_3m' || preset === 'last_6m') {
    const monthsBack = preset === 'last_3m' ? 3 : 6;
    const start = new Date(y, m - (monthsBack - 1), 1, 0, 0, 0, 0);
    const end = todayEnd;
    const elapsedDays = countInclusiveDays(start, end);
    const compStart = new Date(y, m - (monthsBack * 2 - 1), 1, 0, 0, 0, 0);
    const compEnd = new Date(y, m - monthsBack + 1, 0, 23, 59, 59, 999);
    return {
      preset,
      start,
      end,
      startMs: start.getTime(),
      endMs: end.getTime(),
      label: preset === 'last_3m' ? 'Last 3 Months' : 'Last 6 Months',
      elapsedDays,
      totalCalendarDays: elapsedDays,
      isIncompleteCurrentPeriod: false,
      comparisonStart: compStart,
      comparisonEnd: compEnd,
      comparisonStartMs: compStart.getTime(),
      comparisonEndMs: compEnd.getTime(),
      comparisonLabel: `Prior ${monthsBack} Months`,
      comparisonIsElapsedMatch: false,
    };
  }

  if (preset === 'this_year') {
    const start = new Date(y, 0, 1, 0, 0, 0, 0);
    const end = todayEnd;
    const fullYearEnd = new Date(y, 11, 31, 23, 59, 59, 999);
    const elapsedDays = countInclusiveDays(start, end);
    const totalCalDays = countInclusiveDays(start, fullYearEnd);
    const isPartial = elapsedDays < totalCalDays;
    const compStart = new Date(y - 1, 0, 1, 0, 0, 0, 0);
    const compEndRaw = new Date(y - 1, m, d, 23, 59, 59, 999);
    const compEnd = isPartial ? compEndRaw : new Date(y - 1, 11, 31, 23, 59, 59, 999);
    return {
      preset,
      start,
      end,
      startMs: start.getTime(),
      endMs: end.getTime(),
      label: `Year ${y}`,
      elapsedDays,
      totalCalendarDays: totalCalDays,
      isIncompleteCurrentPeriod: isPartial,
      comparisonStart: compStart,
      comparisonEnd: compEnd,
      comparisonStartMs: compStart.getTime(),
      comparisonEndMs: compEnd.getTime(),
      comparisonLabel: isPartial
        ? `${y - 1} YTD (${formatShortDate(compStart)}–${formatShortDate(compEnd)})`
        : `Year ${y - 1}`,
      comparisonIsElapsedMatch: isPartial,
    };
  }

  // Custom date range
  const parsedStart = parseLocalDateInput(customStart) ?? new Date(y, m, 1);
  const parsedEnd = parseLocalDateInput(customEnd) ?? now;
  const start = startOfDay(parsedStart <= parsedEnd ? parsedStart : parsedEnd);
  const end = endOfDay(parsedStart <= parsedEnd ? parsedEnd : parsedStart);
  const spanDays = countInclusiveDays(start, end);
  const compEnd = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1, 23, 59, 59, 999);
  const compStart = new Date(compEnd.getFullYear(), compEnd.getMonth(), compEnd.getDate() - (spanDays - 1), 0, 0, 0, 0);

  return {
    preset: 'custom',
    start,
    end,
    startMs: start.getTime(),
    endMs: end.getTime(),
    label: `${formatShortDateWithYear(start)} – ${formatShortDateWithYear(end)}`,
    elapsedDays: spanDays,
    totalCalendarDays: spanDays,
    isIncompleteCurrentPeriod: false,
    comparisonStart: compStart,
    comparisonEnd: compEnd,
    comparisonStartMs: compStart.getTime(),
    comparisonEndMs: compEnd.getTime(),
    comparisonLabel: `${formatShortDate(compStart)} – ${formatShortDate(compEnd)}`,
    comparisonIsElapsedMatch: false,
  };
}

export function extractActiveSlices(transactions: Transaction[]): RadarTransactionSlice[] {
  const result: RadarTransactionSlice[] = [];
  for (const tx of transactions) {
    if (!tx || tx.status === 'cancelled') continue;
    const effective = getEffectiveTransactionAmount(tx);
    if (effective <= 0) continue;
    const parsed = new Date(tx.timestamp);
    const ms = parsed.getTime();
    if (!Number.isFinite(ms)) continue;
    result.push({
      tx,
      effectiveAmount: roundCurrency(effective),
      ms,
      dateKey: toLocalDateKey(parsed),
    });
  }
  return result.sort((a, b) => b.ms - a.ms);
}

export function filterSlicesByMs(
  slices: RadarTransactionSlice[],
  startMs: number,
  endMs: number
): RadarTransactionSlice[] {
  return slices.filter((s) => s.ms >= startMs && s.ms <= endMs);
}

// ---------- OVERVIEW METRICS ----------

export function computeRadarOverview(opts: {
  transactions: Transaction[];
  totalBudget: number;
  window: RadarDateWindow;
  now?: Date;
}): RadarOverviewMetrics {
  const { transactions, totalBudget, window, now = new Date() } = opts;
  const safeBudget = Number.isFinite(totalBudget) && totalBudget > 0 ? roundCurrency(totalBudget) : 0;
  const activeSlices = extractActiveSlices(transactions);

  const currSlices = filterSlicesByMs(activeSlices, window.startMs, window.endMs);
  const prevSlices = filterSlicesByMs(
    activeSlices,
    window.comparisonStartMs,
    window.comparisonEndMs
  );

  const totalSpent = roundCurrency(currSlices.reduce((s, i) => s + i.effectiveAmount, 0));
  const prevTotalSpent = roundCurrency(prevSlices.reduce((s, i) => s + i.effectiveAmount, 0));
  const spendDeltaAmount = roundCurrency(totalSpent - prevTotalSpent);
  const spendDeltaPct = calcPctChange(totalSpent, prevTotalSpent);

  const txCount = currSlices.length;
  const prevTxCount = prevSlices.length;
  const txCountDeltaPct = calcPctChange(txCount, prevTxCount);

  const avgDailySpend = roundCurrency(totalSpent / Math.max(1, window.elapsedDays));
  const compDays = countInclusiveDays(window.comparisonStart, window.comparisonEnd);
  const prevAvgDailySpend = roundCurrency(prevTotalSpent / Math.max(1, compDays));
  const avgDailyDeltaPct = calcPctChange(avgDailySpend, prevAvgDailySpend);

  const avgTxValue = txCount > 0 ? roundCurrency(totalSpent / txCount) : 0;
  const prevAvgTxValue = prevTxCount > 0 ? roundCurrency(prevTotalSpent / prevTxCount) : 0;
  const avgTxValueDeltaPct = calcPctChange(avgTxValue, prevAvgTxValue);

  const catMap = new Map<string, number>();
  for (const s of currSlices) {
    catMap.set(s.tx.category, roundCurrency((catMap.get(s.tx.category) ?? 0) + s.effectiveAmount));
  }
  let highestCategory: RadarOverviewMetrics['highestCategory'] = null;
  for (const [category, amount] of catMap.entries()) {
    if (!highestCategory || amount > highestCategory.amount) {
      highestCategory = {
        category,
        amount,
        sharePct: totalSpent > 0 ? roundCurrency((amount / totalSpent) * 100) : 0,
      };
    }
  }

  // Monthly budget metrics always anchor cleanly against current calendar month spend
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
  const currentMonthSpent = roundCurrency(
    filterSlicesByMs(activeSlices, monthStart, monthEnd).reduce((s, i) => s + i.effectiveAmount, 0)
  );
  const remainingBudget = roundCurrency(safeBudget - currentMonthSpent);
  const budgetUtilisationPct =
    safeBudget > 0 ? roundCurrency((currentMonthSpent / safeBudget) * 100) : 0;

  return {
    window,
    totalSpent,
    prevTotalSpent,
    spendDeltaAmount,
    spendDeltaPct,
    txCount,
    prevTxCount,
    txCountDeltaPct,
    avgDailySpend,
    prevAvgDailySpend,
    avgDailyDeltaPct,
    avgTxValue,
    prevAvgTxValue,
    avgTxValueDeltaPct,
    highestCategory,
    monthlyBudget: safeBudget,
    currentMonthSpent,
    remainingBudget,
    budgetUtilisationPct,
    isOverMonthlyBudget: safeBudget > 0 && currentMonthSpent > safeBudget,
    hasIncomeTracking: false,
  };
}

// ---------- CATEGORY ANALYTICS ----------

export function computeCategoryAnalytics(opts: {
  transactions: Transaction[];
  categories: string[];
  categoryCaps: CategoryCaps;
  window: RadarDateWindow;
  now?: Date;
}): RadarCategoryAnalyticsResult {
  const { transactions, categories, categoryCaps, window, now = new Date() } = opts;
  const activeSlices = extractActiveSlices(transactions);
  const currSlices = filterSlicesByMs(activeSlices, window.startMs, window.endMs);
  const prevSlices = filterSlicesByMs(
    activeSlices,
    window.comparisonStartMs,
    window.comparisonEndMs
  );

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
  const monthSlices = filterSlicesByMs(activeSlices, monthStart, monthEnd);

  const allCategoryNames = new Set<string>(categories);
  for (const s of currSlices) allCategoryNames.add(s.tx.category);
  for (const s of prevSlices) allCategoryNames.add(s.tx.category);
  for (const [cat, cap] of Object.entries(categoryCaps)) {
    if (typeof cap === 'number' && cap > 0) allCategoryNames.add(cat);
  }

  const totalSpent = roundCurrency(currSlices.reduce((s, i) => s + i.effectiveAmount, 0));

  const items: RadarCategoryBreakdownItem[] = [];
  for (const cat of allCategoryNames) {
    const catCurr = currSlices.filter((s) => s.tx.category === cat);
    const catPrev = prevSlices.filter((s) => s.tx.category === cat);
    const catMonth = monthSlices.filter((s) => s.tx.category === cat);

    const catSpent = roundCurrency(catCurr.reduce((s, i) => s + i.effectiveAmount, 0));
    const prevSpent = roundCurrency(catPrev.reduce((s, i) => s + i.effectiveAmount, 0));
    const monthSpentForCap = roundCurrency(catMonth.reduce((s, i) => s + i.effectiveAmount, 0));
    const rawCap = categoryCaps[cat];
    const allocatedCap = typeof rawCap === 'number' && rawCap > 0 ? roundCurrency(rawCap) : null;

    if (catCurr.length === 0 && catPrev.length === 0 && allocatedCap === null) {
      continue;
    }

    const sharePct = totalSpent > 0 ? roundCurrency((catSpent / totalSpent) * 100) : 0;
    const txCount = catCurr.length;
    const avgTxValue = txCount > 0 ? roundCurrency(catSpent / txCount) : 0;
    const deltaAmount = roundCurrency(catSpent - prevSpent);
    const deltaPct = calcPctChange(catSpent, prevSpent);

    let trend: CategoryTrendDirection = 'no_data';
    if (catSpent === 0 && prevSpent === 0) {
      trend = 'no_data';
    } else if (prevSpent === 0 && catSpent > 0) {
      trend = 'new';
    } else if (deltaPct !== null) {
      if (deltaPct >= 10) trend = 'increasing';
      else if (deltaPct <= -10) trend = 'decreasing';
      else trend = 'stable';
    }

    const capRemaining = allocatedCap !== null ? roundCurrency(allocatedCap - monthSpentForCap) : null;
    const capUtilisationPct =
      allocatedCap !== null ? roundCurrency((monthSpentForCap / allocatedCap) * 100) : null;

    items.push({
      category: cat,
      totalSpent: catSpent,
      sharePct,
      txCount,
      avgTxValue,
      prevSpent,
      prevTxCount: catPrev.length,
      deltaAmount,
      deltaPct,
      trend,
      allocatedCap,
      monthSpentForCap,
      capRemaining,
      capUtilisationPct,
      isOverCap: allocatedCap !== null && monthSpentForCap > allocatedCap,
      isApproachingCap:
        allocatedCap !== null &&
        monthSpentForCap <= allocatedCap &&
        (capUtilisationPct ?? 0) >= 80,
      transactions: catCurr,
    });
  }

  items.sort((a, b) => b.totalSpent - a.totalSpent || b.prevSpent - a.prevSpent || a.category.localeCompare(b.category));

  const activeCategories = items.filter((i) => i.totalSpent > 0);
  const top6 = activeCategories.slice(0, 6);
  const rest = activeCategories.slice(6);
  const donutData = top6.map((i) => ({
    name: i.category,
    value: i.totalSpent,
    sharePct: i.sharePct,
  }));
  if (rest.length > 0) {
    const otherVal = roundCurrency(rest.reduce((s, r) => s + r.totalSpent, 0));
    donutData.push({
      name: `Other (${rest.length})`,
      value: otherVal,
      sharePct: totalSpent > 0 ? roundCurrency((otherVal / totalSpent) * 100) : 0,
    });
  }

  const categoryInsights: string[] = [];
  if (activeCategories.length > 0) {
    const top1 = activeCategories[0];
    categoryInsights.push(
      `${top1.category} accounts for ${top1.sharePct}% of your total spending in ${window.label} (₹${top1.totalSpent.toLocaleString('en-IN')}).`
    );
    if (activeCategories.length >= 3) {
      const third = activeCategories[2];
      categoryInsights.push(
        `${third.category} is your third-highest expense category at ₹${third.totalSpent.toLocaleString('en-IN')} (${third.sharePct}%).`
      );
    }
    const biggestMover = activeCategories
      .filter((c) => c.deltaPct !== null && Math.abs(c.deltaPct) >= 12 && Math.abs(c.deltaAmount) >= 30)
      .sort((a, b) => Math.abs(b.deltaPct ?? 0) - Math.abs(a.deltaPct ?? 0))[0];
    if (biggestMover && biggestMover.deltaPct !== null) {
      const dir = biggestMover.deltaPct > 0 ? 'increased' : 'decreased';
      categoryInsights.push(
        `${biggestMover.category} spending ${dir} by ${Math.abs(biggestMover.deltaPct)}% compared with ${window.comparisonLabel}.`
      );
    }
  }

  return {
    categories: items,
    donutData,
    totalSpent,
    categoryInsights,
  };
}

// ---------- SPENDING TRENDS & HISTORICAL ANALYSIS ----------

function getIsoWeekStart(d: Date): Date {
  const day = d.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMon, 0, 0, 0, 0);
}

export function computeSpendingTrends(opts: {
  transactions: Transaction[];
  granularity: TrendGranularity;
  window: RadarDateWindow;
  now?: Date;
}): RadarSpendingTrendsResult {
  const { transactions, granularity, window, now = new Date() } = opts;
  const allActive = extractActiveSlices(transactions);
  const windowSlices = filterSlicesByMs(allActive, window.startMs, window.endMs);

  const buckets: Array<{
    key: string;
    label: string;
    fullLabel: string;
    spent: number;
    txCount: number;
    byCategory: Record<string, number>;
  }> = [];
  const bucketMap = new Map<string, (typeof buckets)[number]>();

  const anchorEnd = window.end > now && window.preset !== 'custom' ? now : window.end;

  if (granularity === 'daily') {
    // Use window span capped at 45 days for readable daily plotting
    const spanDays = Math.min(45, Math.max(7, window.elapsedDays));
    const plotStart =
      window.elapsedDays <= 45
        ? startOfDay(window.start)
        : new Date(
            anchorEnd.getFullYear(),
            anchorEnd.getMonth(),
            anchorEnd.getDate() - (spanDays - 1),
            0,
            0,
            0,
            0
          );
    const totalDays = countInclusiveDays(plotStart, anchorEnd);
    for (let i = 0; i < totalDays; i++) {
      const cur = new Date(plotStart.getFullYear(), plotStart.getMonth(), plotStart.getDate() + i);
      const key = toLocalDateKey(cur);
      const b = {
        key,
        label: cur.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        fullLabel: cur.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
        spent: 0,
        txCount: 0,
        byCategory: {} as Record<string, number>,
      };
      buckets.push(b);
      bucketMap.set(key, b);
    }

    for (const s of allActive) {
      if (s.ms < plotStart.getTime() || s.ms > anchorEnd.getTime()) continue;
      const bucket = bucketMap.get(s.dateKey);
      if (!bucket) continue;
      bucket.spent = roundCurrency(bucket.spent + s.effectiveAmount);
      bucket.txCount += 1;
      bucket.byCategory[s.tx.category] = roundCurrency(
        (bucket.byCategory[s.tx.category] ?? 0) + s.effectiveAmount
      );
    }
  } else if (granularity === 'weekly') {
    const weeksToPlot = window.preset === 'last_6m' ? 16 : window.preset === 'this_year' ? 20 : 10;
    const currentWeekStart = getIsoWeekStart(anchorEnd);
    for (let i = weeksToPlot - 1; i >= 0; i--) {
      const ws = new Date(
        currentWeekStart.getFullYear(),
        currentWeekStart.getMonth(),
        currentWeekStart.getDate() - i * 7
      );
      const we = new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + 6, 23, 59, 59, 999);
      const key = toLocalDateKey(ws);
      const b = {
        key,
        label: formatShortDate(ws),
        fullLabel: `${formatShortDate(ws)} – ${formatShortDate(we)}`,
        spent: 0,
        txCount: 0,
        byCategory: {} as Record<string, number>,
      };
      buckets.push(b);
      bucketMap.set(key, b);
    }

    for (const s of allActive) {
      const ws = getIsoWeekStart(new Date(s.ms));
      const key = toLocalDateKey(ws);
      const bucket = bucketMap.get(key);
      if (!bucket) continue;
      bucket.spent = roundCurrency(bucket.spent + s.effectiveAmount);
      bucket.txCount += 1;
      bucket.byCategory[s.tx.category] = roundCurrency(
        (bucket.byCategory[s.tx.category] ?? 0) + s.effectiveAmount
      );
    }
  } else if (granularity === 'monthly') {
    const monthsToPlot = window.preset === 'this_year' || window.preset === 'last_6m' ? 12 : 6;
    const endYear = anchorEnd.getFullYear();
    const endMonth = anchorEnd.getMonth();
    for (let i = monthsToPlot - 1; i >= 0; i--) {
      const d = new Date(endYear, endMonth - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const b = {
        key,
        label: d.toLocaleDateString('en-IN', { month: 'short' }),
        fullLabel: d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
        spent: 0,
        txCount: 0,
        byCategory: {} as Record<string, number>,
      };
      buckets.push(b);
      bucketMap.set(key, b);
    }

    for (const s of allActive) {
      const d = new Date(s.ms);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const bucket = bucketMap.get(key);
      if (!bucket) continue;
      bucket.spent = roundCurrency(bucket.spent + s.effectiveAmount);
      bucket.txCount += 1;
      bucket.byCategory[s.tx.category] = roundCurrency(
        (bucket.byCategory[s.tx.category] ?? 0) + s.effectiveAmount
      );
    }
  } else {
    // Yearly: last 3 years + any earlier observed year
    const minYearObserved = allActive.reduce(
      (minY, s) => Math.min(minY, new Date(s.ms).getFullYear()),
      anchorEnd.getFullYear()
    );
    const startYear = Math.min(anchorEnd.getFullYear() - 2, minYearObserved);
    for (let yr = startYear; yr <= anchorEnd.getFullYear(); yr++) {
      const key = String(yr);
      const b = {
        key,
        label: key,
        fullLabel: `Year ${key}`,
        spent: 0,
        txCount: 0,
        byCategory: {} as Record<string, number>,
      };
      buckets.push(b);
      bucketMap.set(key, b);
    }

    for (const s of allActive) {
      const key = String(new Date(s.ms).getFullYear());
      const bucket = bucketMap.get(key);
      if (!bucket) continue;
      bucket.spent = roundCurrency(bucket.spent + s.effectiveAmount);
      bucket.txCount += 1;
      bucket.byCategory[s.tx.category] = roundCurrency(
        (bucket.byCategory[s.tx.category] ?? 0) + s.effectiveAmount
      );
    }
  }

  const points: RadarTrendPoint[] = buckets.map((b) => ({
    ...b,
    avgPerTx: b.txCount > 0 ? roundCurrency(b.spent / b.txCount) : 0,
  }));

  // Daily high/low over selected window
  const dailyTotals = new Map<string, { date: Date; amount: number; txCount: number }>();
  for (const s of windowSlices) {
    const existing = dailyTotals.get(s.dateKey);
    if (existing) {
      existing.amount = roundCurrency(existing.amount + s.effectiveAmount);
      existing.txCount += 1;
    } else {
      dailyTotals.set(s.dateKey, {
        date: new Date(s.ms),
        amount: s.effectiveAmount,
        txCount: 1,
      });
    }
  }

  let highestSpendingDay: RadarSpendingTrendsResult['highestSpendingDay'] = null;
  let lowestActiveDay: RadarSpendingTrendsResult['lowestActiveDay'] = null;
  for (const [dateKey, info] of dailyTotals.entries()) {
    const label = info.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    if (!highestSpendingDay || info.amount > highestSpendingDay.amount) {
      highestSpendingDay = { dateKey, label, amount: info.amount, txCount: info.txCount };
    }
    if (!lowestActiveDay || info.amount < lowestActiveDay.amount) {
      lowestActiveDay = { dateKey, label, amount: info.amount, txCount: info.txCount };
    }
  }

  const totalWindowSpend = roundCurrency(windowSlices.reduce((s, i) => s + i.effectiveAmount, 0));
  const avgDailySpend = roundCurrency(totalWindowSpend / Math.max(1, window.elapsedDays));

  // Conservative trend detection requiring >= 3 active buckets & >= 10% change
  const activeBuckets = points.filter((p) => p.txCount > 0);
  let overallTrend: DetectedTrendLabel = 'insufficient_data';
  let trendChangePct: number | null = null;
  let trendSummary = 'Need at least 3 active periods of spending history to confirm a directional trend.';

  if (activeBuckets.length >= 3) {
    const splitIdx = Math.floor(activeBuckets.length / 2);
    const earlier = activeBuckets.slice(0, splitIdx);
    const recent = activeBuckets.slice(splitIdx);
    const earlierAvg = earlier.reduce((s, b) => s + b.spent, 0) / Math.max(1, earlier.length);
    const recentAvg = recent.reduce((s, b) => s + b.spent, 0) / Math.max(1, recent.length);
    trendChangePct = calcPctChange(recentAvg, earlierAvg);

    const unitLabel = {
      daily: 'day',
      weekly: 'week',
      monthly: 'month',
      yearly: 'year',
    }[granularity];

    if (trendChangePct !== null) {
      if (trendChangePct >= 10) {
        overallTrend = 'increasing';
        trendSummary = `Average spend per active ${unitLabel} increased by +${trendChangePct}% in the recent half of the window.`;
      } else if (trendChangePct <= -10) {
        overallTrend = 'decreasing';
        trendSummary = `Average spend per active ${unitLabel} decreased by ${Math.abs(trendChangePct)}% in the recent half of the window.`;
      } else {
        overallTrend = 'stable';
        trendSummary = `Spending remains steady within ±10% (${trendChangePct > 0 ? '+' : ''}${trendChangePct}%) across active ${unitLabel}s.`;
      }
    }
  }

  // Repeated spending patterns (>= 2 occurrences in selected window)
  const repeatMap = new Map<
    string,
    { itemName: string; category: string; occurrences: number; totalSpent: number }
  >();
  for (const s of windowSlices) {
    const clean = s.tx.name
      .replace(/^Mart:\s*/i, '')
      .replace(/\s*\(x\d+\)$/i, '')
      .trim();
    const normKey = clean.toLowerCase();
    if (!normKey) continue;
    const prev = repeatMap.get(normKey);
    if (prev) {
      prev.occurrences += 1;
      prev.totalSpent = roundCurrency(prev.totalSpent + s.effectiveAmount);
    } else {
      repeatMap.set(normKey, {
        itemName: clean,
        category: s.tx.category,
        occurrences: 1,
        totalSpent: s.effectiveAmount,
      });
    }
  }
  const repeatedPatterns = Array.from(repeatMap.values())
    .filter((r) => r.occurrences >= 2)
    .map((r) => ({
      ...r,
      avgSpent: roundCurrency(r.totalSpent / r.occurrences),
    }))
    .sort((a, b) => b.occurrences - a.occurrences || b.totalSpent - a.totalSpent)
    .slice(0, 6);

  const catTotalsForOrder = new Map<string, number>();
  for (const s of allActive) {
    catTotalsForOrder.set(s.tx.category, (catTotalsForOrder.get(s.tx.category) ?? 0) + s.effectiveAmount);
  }
  const availableCategories = Array.from(catTotalsForOrder.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c);

  return {
    granularity,
    points,
    avgDailySpend,
    highestSpendingDay,
    lowestActiveDay,
    overallTrend,
    trendSummary,
    trendChangePct,
    repeatedPatterns,
    availableCategories,
  };
}

// ---------- MONTHLY & PERIOD COMPARISON ----------

export function computePeriodComparison(opts: {
  transactions: Transaction[];
  preset: RadarComparisonPreset;
  selectedWindow: RadarDateWindow;
  now?: Date;
}): RadarPeriodComparisonResult {
  const { transactions, preset, selectedWindow, now = new Date() } = opts;

  let windowToCompare: RadarDateWindow;
  if (preset === 'month_over_month') {
    windowToCompare = resolveRadarWindow('this_month', undefined, undefined, now);
  } else if (preset === 'week_over_week') {
    windowToCompare = resolveRadarWindow('this_week', undefined, undefined, now);
  } else if (preset === 'year_over_year') {
    windowToCompare = resolveRadarWindow('this_year', undefined, undefined, now);
  } else {
    windowToCompare = selectedWindow;
  }

  const active = extractActiveSlices(transactions);
  const curr = filterSlicesByMs(active, windowToCompare.startMs, windowToCompare.endMs);
  const prev = filterSlicesByMs(
    active,
    windowToCompare.comparisonStartMs,
    windowToCompare.comparisonEndMs
  );

  const currDays = countInclusiveDays(windowToCompare.start, windowToCompare.end);
  const prevDays = countInclusiveDays(
    windowToCompare.comparisonStart,
    windowToCompare.comparisonEnd
  );

  const currentSpent = roundCurrency(curr.reduce((s, i) => s + i.effectiveAmount, 0));
  const previousSpent = roundCurrency(prev.reduce((s, i) => s + i.effectiveAmount, 0));
  const amountDiff = roundCurrency(currentSpent - previousSpent);
  const pctChange = calcPctChange(currentSpent, previousSpent);

  const currentTxCount = curr.length;
  const previousTxCount = prev.length;
  const txFreqDiff = currentTxCount - previousTxCount;
  const txFreqPctChange = calcPctChange(currentTxCount, previousTxCount);

  const currentAvgTx = currentTxCount > 0 ? roundCurrency(currentSpent / currentTxCount) : 0;
  const previousAvgTx = previousTxCount > 0 ? roundCurrency(previousSpent / previousTxCount) : 0;
  const avgTxDiff = roundCurrency(currentAvgTx - previousAvgTx);
  const avgTxPctChange = calcPctChange(currentAvgTx, previousAvgTx);

  const currentDailyAvg = roundCurrency(currentSpent / Math.max(1, currDays));
  const previousDailyAvg = roundCurrency(previousSpent / Math.max(1, prevDays));
  const dailyAvgDiff = roundCurrency(currentDailyAvg - previousDailyAvg);
  const dailyAvgPctChange = calcPctChange(currentDailyAvg, previousDailyAvg);

  const catCurr = new Map<string, number>();
  const catPrev = new Map<string, number>();
  for (const s of curr) {
    catCurr.set(s.tx.category, roundCurrency((catCurr.get(s.tx.category) ?? 0) + s.effectiveAmount));
  }
  for (const s of prev) {
    catPrev.set(s.tx.category, roundCurrency((catPrev.get(s.tx.category) ?? 0) + s.effectiveAmount));
  }
  const allCats = new Set([...catCurr.keys(), ...catPrev.keys()]);
  const categoryDeltas = Array.from(allCats)
    .map((category) => {
      const cAmt = catCurr.get(category) ?? 0;
      const pAmt = catPrev.get(category) ?? 0;
      return {
        category,
        currentSpent: cAmt,
        previousSpent: pAmt,
        diff: roundCurrency(cAmt - pAmt),
        pctChange: calcPctChange(cAmt, pAmt),
      };
    })
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff) || b.currentSpent - a.currentSpent);

  return {
    preset,
    currentLabel: windowToCompare.label,
    previousLabel: windowToCompare.comparisonLabel,
    fairElapsedNote: windowToCompare.comparisonIsElapsedMatch
      ? `Current period is in progress (${windowToCompare.elapsedDays} of ${windowToCompare.totalCalendarDays} days). Comparing against the equivalent first ${windowToCompare.elapsedDays} days of the previous period for accuracy.`
      : null,
    currentSpent,
    previousSpent,
    amountDiff,
    pctChange,
    currentTxCount,
    previousTxCount,
    txFreqDiff,
    txFreqPctChange,
    currentAvgTx,
    previousAvgTx,
    avgTxDiff,
    avgTxPctChange,
    currentDailyAvg,
    previousDailyAvg,
    dailyAvgDiff,
    dailyAvgPctChange,
    categoryDeltas,
  };
}

// ---------- BUDGET MONITORING ----------

export function computeRadarBudgetMonitor(opts: {
  transactions: Transaction[];
  totalBudget: number;
  categories: string[];
  categoryCaps: CategoryCaps;
  now?: Date;
}): RadarBudgetMonitorResult {
  const { transactions, totalBudget, categories, categoryCaps, now = new Date() } = opts;
  const safeBudget = Number.isFinite(totalBudget) && totalBudget > 0 ? roundCurrency(totalBudget) : 0;
  const monthWindow = resolveRadarWindow('this_month', undefined, undefined, now);
  const fullLastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0).getTime();
  const fullLastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime();
  const prevMonthLabel = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  });

  const active = extractActiveSlices(transactions);
  const currMonthSlices = filterSlicesByMs(active, monthWindow.startMs, monthWindow.endMs);
  const prevMonthSlices = filterSlicesByMs(active, fullLastMonthStart, fullLastMonthEnd);

  const totalMonthSpent = roundCurrency(currMonthSlices.reduce((s, i) => s + i.effectiveAmount, 0));
  const remainingBudget = roundCurrency(safeBudget - totalMonthSpent);
  const utilisationPct = safeBudget > 0 ? roundCurrency((totalMonthSpent / safeBudget) * 100) : 0;

  const allCats = new Set<string>(categories);
  for (const s of currMonthSlices) allCats.add(s.tx.category);
  for (const [c, cap] of Object.entries(categoryCaps)) {
    if (typeof cap === 'number' && cap > 0) allCats.add(c);
  }

  const rows: RadarBudgetCategoryRow[] = [];
  let totalAllocatedCategoryCaps = 0;

  for (const cat of allCats) {
    const rawCap = categoryCaps[cat];
    const cap = typeof rawCap === 'number' && rawCap > 0 ? roundCurrency(rawCap) : null;
    const actualSpend = roundCurrency(
      currMonthSlices.filter((s) => s.tx.category === cat).reduce((s, i) => s + i.effectiveAmount, 0)
    );
    const previousMonthSpend = roundCurrency(
      prevMonthSlices.filter((s) => s.tx.category === cat).reduce((s, i) => s + i.effectiveAmount, 0)
    );
    if (cap === null && actualSpend === 0) continue;

    if (cap !== null) totalAllocatedCategoryCaps = roundCurrency(totalAllocatedCategoryCaps + cap);

    const remaining = cap !== null ? roundCurrency(cap - actualSpend) : null;
    const catUtil = cap !== null ? roundCurrency((actualSpend / cap) * 100) : null;
    const status: RadarBudgetCategoryRow['status'] =
      cap === null
        ? 'no_cap'
        : actualSpend > cap
          ? 'exceeded'
          : (catUtil ?? 0) >= 80
            ? 'approaching'
            : 'within';

    rows.push({
      category: cat,
      allocatedBudget: cap,
      actualSpend,
      previousMonthSpend,
      deltaFromPrevPct: calcPctChange(actualSpend, previousMonthSpend),
      remaining,
      utilisationPct: catUtil,
      status,
    });
  }

  rows.sort((a, b) => {
    const rank = { exceeded: 0, approaching: 1, within: 2, no_cap: 3 };
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
    return b.actualSpend - a.actualSpend;
  });

  const categoriesExceedingCount = rows.filter((r) => r.status === 'exceeded').length;
  const categoriesWithinCapCount = rows.filter(
    (r) => r.status === 'within' || r.status === 'approaching'
  ).length;

  const insights: string[] = [];
  if (safeBudget > 0) {
    if (totalMonthSpent > safeBudget) {
      insights.push(
        `You have exceeded your ${monthWindow.label} budget of ₹${safeBudget.toLocaleString('en-IN')} by ₹${roundCurrency(totalMonthSpent - safeBudget).toLocaleString('en-IN')} (${utilisationPct}% utilised).`
      );
    } else {
      insights.push(
        `You have used ${utilisationPct}% of your ${monthWindow.label} budget (₹${remainingBudget.toLocaleString('en-IN')} remaining).`
      );
    }
  }
  for (const r of rows) {
    if (r.status === 'exceeded' && r.allocatedBudget !== null) {
      insights.push(
        `Your ${r.category} budget has been exceeded by ₹${roundCurrency(r.actualSpend - r.allocatedBudget).toLocaleString('en-IN')} (₹${r.actualSpend.toLocaleString('en-IN')} vs ₹${r.allocatedBudget.toLocaleString('en-IN')} cap).`
      );
    } else if (r.status === 'within' && r.allocatedBudget !== null && insights.length < 4) {
      insights.push(
        `Your ${r.category} spending (₹${r.actualSpend.toLocaleString('en-IN')}) is currently within its ₹${r.allocatedBudget.toLocaleString('en-IN')} budget.`
      );
    }
  }

  return {
    monthLabel: monthWindow.label,
    previousMonthLabel: prevMonthLabel,
    totalBudget: safeBudget,
    totalMonthSpent,
    remainingBudget,
    utilisationPct,
    isOverBudget: safeBudget > 0 && totalMonthSpent > safeBudget,
    categoriesExceedingCount,
    categoriesWithinCapCount,
    totalAllocatedCategoryCaps,
    rows,
    insights: insights.slice(0, 5),
  };
}

// ---------- UNUSUAL SPENDING DETECTION ----------

function computeMedianAndStats(values: number[]): {
  mean: number;
  median: number;
  stdDev: number;
} {
  if (values.length === 0) return { mean: 0, median: 0, stdDev: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance =
    values.reduce((s, v) => s + (v - mean) * (v - mean), 0) / values.length;
  return {
    mean: roundCurrency(mean),
    median: roundCurrency(median),
    stdDev: roundCurrency(Math.sqrt(variance)),
  };
}

export function detectUnusualSpending(opts: {
  transactions: Transaction[];
  window: RadarDateWindow;
  now?: Date;
}): RadarSpendingAnomaly[] {
  const { transactions, window, now = new Date() } = opts;
  const active = extractActiveSlices(transactions);
  if (active.length < 4) {
    // Refuse to fabricate anomalies on limited transaction history
    return [];
  }

  const windowSlices = filterSlicesByMs(active, window.startMs, window.endMs);
  if (windowSlices.length === 0) return [];

  const anomalies: RadarSpendingAnomaly[] = [];

  // 1. Transaction-level outlier detection within same category (needs >= 3 peer txns)
  const txByCategory = new Map<string, RadarTransactionSlice[]>();
  for (const s of active) {
    const arr = txByCategory.get(s.tx.category) ?? [];
    arr.push(s);
    txByCategory.set(s.tx.category, arr);
  }

  for (const s of windowSlices) {
    const categoryPeers = (txByCategory.get(s.tx.category) ?? []).filter((p) => p.tx.id !== s.tx.id);
    // Require at least 3 other transactions in the same category so a single initial setup expense isn't flagged unfairly
    if (categoryPeers.length < 3) continue;
    const peerValues = categoryPeers.map((p) => p.effectiveAmount);
    const { mean, median, stdDev } = computeMedianAndStats(peerValues);
    const baseline = Math.max(median, mean);
    if (baseline <= 0) continue;

    const statisticalCeiling = Math.max(median * 2.1, mean + 1.5 * stdDev);
    const deviationPct = roundCurrency(((s.effectiveAmount - baseline) / baseline) * 100);
    if (
      s.effectiveAmount > statisticalCeiling &&
      deviationPct >= 50 &&
      s.effectiveAmount - baseline >= 50
    ) {
      anomalies.push({
        id: `anom-tx-${s.tx.id}`,
        kind: 'transaction_outlier',
        severity: deviationPct >= 150 ? 'high' : deviationPct >= 90 ? 'moderate' : 'low',
        subject: s.tx.name,
        category: s.tx.category,
        amount: s.effectiveAmount,
        date: s.tx.timestamp,
        baselineLabel: `${s.tx.category} typical: ₹${baseline.toLocaleString('en-IN')} (median ₹${median.toLocaleString('en-IN')})`,
        deviationPct,
        reason: `This ₹${s.effectiveAmount.toLocaleString('en-IN')} expense is ${deviationPct}% above your usual ₹${baseline.toLocaleString('en-IN')} ${s.tx.category} purchase.`,
      });
    }
  }

  // 2. Category weekly spend vs trailing prior 4-week average
  const thisWeek = resolveRadarWindow('this_week', undefined, undefined, now);
  const currentWeekSlices = filterSlicesByMs(active, thisWeek.startMs, thisWeek.endMs);
  const priorWeeksBounds: Array<{ startMs: number; endMs: number }> = [];
  for (let w = 1; w <= 4; w++) {
    const ws = new Date(
      thisWeek.start.getFullYear(),
      thisWeek.start.getMonth(),
      thisWeek.start.getDate() - w * 7,
      0,
      0,
      0,
      0
    );
    const we = new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + 6, 23, 59, 59, 999);
    priorWeeksBounds.push({ startMs: ws.getTime(), endMs: we.getTime() });
  }

  const currWeekByCat = new Map<string, number>();
  for (const s of currentWeekSlices) {
    currWeekByCat.set(
      s.tx.category,
      roundCurrency((currWeekByCat.get(s.tx.category) ?? 0) + s.effectiveAmount)
    );
  }

  for (const [cat, currWeekSpend] of currWeekByCat.entries()) {
    const priorWeeklyValues: number[] = [];
    for (const wb of priorWeeksBounds) {
      const sum = filterSlicesByMs(active, wb.startMs, wb.endMs)
        .filter((s) => s.tx.category === cat)
        .reduce((acc, s) => acc + s.effectiveAmount, 0);
      if (sum > 0) priorWeeklyValues.push(roundCurrency(sum));
    }
    // Require at least 2 prior active weeks in this category for a fair historical baseline
    if (priorWeeklyValues.length < 2) continue;
    const { mean, stdDev } = computeMedianAndStats(priorWeeklyValues);
    if (mean <= 0) continue;
    const devPct = roundCurrency(((currWeekSpend - mean) / mean) * 100);
    if (currWeekSpend > mean + Math.max(stdDev * 1.25, mean * 0.35) && devPct >= 35 && currWeekSpend - mean >= 50) {
      anomalies.push({
        id: `anom-catweek-${cat}`,
        kind: 'category_spike',
        severity: devPct >= 100 ? 'high' : devPct >= 60 ? 'moderate' : 'low',
        subject: `${cat} Weekly Total`,
        category: cat,
        amount: currWeekSpend,
        date: now.toISOString(),
        baselineLabel: `Recent weekly avg: ₹${mean.toLocaleString('en-IN')} (${priorWeeklyValues.length} wks)`,
        deviationPct: devPct,
        reason: `Your ${cat} spending this week (₹${currWeekSpend.toLocaleString('en-IN')}) is ${devPct}% higher than your recent weekly average of ₹${mean.toLocaleString('en-IN')}.`,
      });
    }
  }

  // 3. Unexpected daily expenditure spike (>= 4 active days required)
  const dayTotals = new Map<string, { ms: number; amount: number }>();
  for (const s of active) {
    const prev = dayTotals.get(s.dateKey);
    if (prev) {
      prev.amount = roundCurrency(prev.amount + s.effectiveAmount);
    } else {
      dayTotals.set(s.dateKey, { ms: s.ms, amount: s.effectiveAmount });
    }
  }
  if (dayTotals.size >= 4) {
    const allDayAmounts = Array.from(dayTotals.values()).map((d) => d.amount);
    const { mean, median, stdDev } = computeMedianAndStats(allDayAmounts);
    const baseline = Math.max(median, mean);
    for (const [dateKey, info] of dayTotals.entries()) {
      if (info.ms < window.startMs || info.ms > window.endMs) continue;
      if (baseline <= 0) continue;
      const devPct = roundCurrency(((info.amount - baseline) / baseline) * 100);
      if (info.amount > Math.max(median * 2.1, mean + 1.5 * stdDev) && devPct >= 60 && info.amount - baseline >= 100) {
        const readableDate = new Date(info.ms).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
        anomalies.push({
          id: `anom-day-${dateKey}`,
          kind: 'daily_spend_spike',
          severity: devPct >= 150 ? 'high' : 'moderate',
          subject: `Daily Total (${readableDate})`,
          category: 'All Categories',
          amount: info.amount,
          date: new Date(info.ms).toISOString(),
          baselineLabel: `Typical day: ₹${baseline.toLocaleString('en-IN')} (median ₹${median.toLocaleString('en-IN')})`,
          deviationPct: devPct,
          reason: `Total expenditure on ${readableDate} reached ₹${info.amount.toLocaleString('en-IN')}, ${devPct}% above your typical active day.`,
        });
      }
    }
  }

  const severityOrder: Record<AnomalySeverity, number> = { high: 0, moderate: 1, low: 2 };
  return anomalies
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || b.deviationPct - a.deviationPct)
    .slice(0, 8);
}

// ---------- FINANCIAL INSIGHTS ENGINE ----------

export function generateRadarInsights(opts: {
  overview: RadarOverviewMetrics;
  categoriesResult: RadarCategoryAnalyticsResult;
  trendsResult: RadarSpendingTrendsResult;
  budgetResult: RadarBudgetMonitorResult;
  anomalies: RadarSpendingAnomaly[];
}): RadarFinancialInsight[] {
  const { overview, categoriesResult, trendsResult, budgetResult, anomalies } = opts;
  const insights: RadarFinancialInsight[] = [];
  const periodLabel = overview.window.label;

  if (overview.txCount === 0) {
    return [
      {
        id: 'insight-empty',
        kind: 'spending',
        tone: 'neutral',
        periodLabel,
        title: `No recorded expenditure in ${periodLabel}`,
        description: `Switch the timeframe or log transactions from Quick Mart, Audit, or Ledger to generate data-backed Radar Room insights.`,
      },
    ];
  }

  // 1. Largest category insight
  if (overview.highestCategory) {
    const top = overview.highestCategory;
    insights.push({
      id: 'insight-largest-cat',
      kind: 'spending',
      tone: top.sharePct >= 50 ? 'caution' : 'neutral',
      periodLabel,
      title: `${top.category} is your largest spending category`,
      description: `${top.category} accounts for ${top.sharePct}% of total expenditure (₹${top.amount.toLocaleString('en-IN')} across ${periodLabel}). Average daily expenditure is ₹${overview.avgDailySpend.toLocaleString('en-IN')}/day.`,
      metricLabel: `${top.sharePct}%`,
    });
  }

  // 2. Period comparison / Trend insight
  if (overview.spendDeltaPct !== null) {
    const reduced = overview.spendDeltaAmount < 0;
    const absAmt = Math.abs(overview.spendDeltaAmount).toLocaleString('en-IN');
    const absPct = Math.abs(overview.spendDeltaPct);
    insights.push({
      id: 'insight-period-delta',
      kind: 'trend',
      tone: reduced ? 'positive' : absPct >= 15 ? 'caution' : 'neutral',
      periodLabel,
      title: reduced
        ? `You spent ₹${absAmt} less than ${overview.window.comparisonLabel}`
        : `Expenditure rose ${absPct}% vs ${overview.window.comparisonLabel}`,
      description: reduced
        ? `Spending decreased by ${absPct}% (₹${overview.totalSpent.toLocaleString('en-IN')} vs ₹${overview.prevTotalSpent.toLocaleString('en-IN')}).`
        : `Spending increased by ₹${absAmt} (₹${overview.totalSpent.toLocaleString('en-IN')} vs ₹${overview.prevTotalSpent.toLocaleString('en-IN')}).`,
      metricLabel: `${overview.spendDeltaPct > 0 ? '+' : ''}${overview.spendDeltaPct}%`,
    });
  }

  // 3. Category mover insight (not duplicating top category if identical message)
  const mover = categoriesResult.categories
    .filter((c) => c.deltaPct !== null && Math.abs(c.deltaPct) >= 15 && Math.abs(c.deltaAmount) >= 30)
    .sort((a, b) => Math.abs(b.deltaPct ?? 0) - Math.abs(a.deltaPct ?? 0))[0];
  if (mover && mover.deltaPct !== null) {
    insights.push({
      id: `insight-cat-mover-${mover.category}`,
      kind: 'trend',
      tone: mover.deltaPct > 0 ? 'caution' : 'positive',
      periodLabel,
      title: `${mover.category} expenditure ${mover.deltaPct > 0 ? 'increased' : 'fell'} by ${Math.abs(mover.deltaPct)}%`,
      description: `${mover.category} moved from ₹${mover.prevSpent.toLocaleString('en-IN')} in ${overview.window.comparisonLabel} to ₹${mover.totalSpent.toLocaleString('en-IN')} in ${periodLabel}.`,
      metricLabel: `${mover.deltaPct > 0 ? '+' : ''}${mover.deltaPct}%`,
    });
  }

  // 4. Budget performance insight
  if (budgetResult.totalBudget > 0) {
    const exceededRow = budgetResult.rows.find((r) => r.status === 'exceeded');
    if (budgetResult.isOverBudget) {
      insights.push({
        id: 'insight-budget-over',
        kind: 'budget',
        tone: 'caution',
        periodLabel: budgetResult.monthLabel,
        title: `Monthly budget exceeded (${budgetResult.utilisationPct}%)`,
        description: `Monthly spend reached ₹${budgetResult.totalMonthSpent.toLocaleString('en-IN')} against your ₹${budgetResult.totalBudget.toLocaleString('en-IN')} monthly budget.`,
        metricLabel: `${budgetResult.utilisationPct}%`,
      });
    } else if (exceededRow && exceededRow.allocatedBudget !== null) {
      insights.push({
        id: `insight-cat-cap-${exceededRow.category}`,
        kind: 'budget',
        tone: 'caution',
        periodLabel: budgetResult.monthLabel,
        title: `${exceededRow.category} cap exceeded by ₹${roundCurrency(exceededRow.actualSpend - exceededRow.allocatedBudget).toLocaleString('en-IN')}`,
        description: `Overall monthly budget utilisation sits at ${budgetResult.utilisationPct}%, while ${exceededRow.category} exceeded its ₹${exceededRow.allocatedBudget.toLocaleString('en-IN')} cap.`,
        metricLabel: `${exceededRow.utilisationPct}%`,
      });
    } else {
      insights.push({
        id: 'insight-budget-ok',
        kind: 'budget',
        tone: budgetResult.utilisationPct >= 80 ? 'caution' : 'positive',
        periodLabel: budgetResult.monthLabel,
        title: `Used ${budgetResult.utilisationPct}% of ${budgetResult.monthLabel} budget`,
        description: `₹${budgetResult.remainingBudget.toLocaleString('en-IN')} remains from your ₹${budgetResult.totalBudget.toLocaleString('en-IN')} monthly allocation.`,
        metricLabel: `${budgetResult.utilisationPct}%`,
      });
    }
  }

  // 5. Behavioural repeated pattern or anomaly observation
  if (trendsResult.repeatedPatterns.length > 0) {
    const topRep = trendsResult.repeatedPatterns[0];
    insights.push({
      id: 'insight-repeat-pattern',
      kind: 'behaviour',
      tone: 'neutral',
      periodLabel,
      title: `Repeated purchases: ${topRep.itemName} (${topRep.occurrences}x)`,
      description: `Purchased ${topRep.occurrences} times in ${periodLabel} for ₹${topRep.totalSpent.toLocaleString('en-IN')} (avg ₹${topRep.avgSpent.toLocaleString('en-IN')} per order).`,
      metricLabel: `${topRep.occurrences}x`,
    });
  } else if (anomalies.length > 0) {
    insights.push({
      id: 'insight-top-anomaly',
      kind: 'behaviour',
      tone: 'caution',
      periodLabel,
      title: `Statistical spike observed in ${anomalies[0].subject}`,
      description: anomalies[0].reason,
      metricLabel: `+${anomalies[0].deviationPct}%`,
    });
  }

  // 6. Savings opportunity (explicitly labeled as Estimate Only)
  const discretionalCandidate =
    categoriesResult.categories.find(
      (c) =>
        c.totalSpent > 0 &&
        /snack|beverag|entertain|cloth|electron|other|shopping|dining/i.test(c.category)
    ) ?? categoriesResult.categories.find((c) => c.totalSpent >= 100);

  if (discretionalCandidate && discretionalCandidate.totalSpent >= 40) {
    const est10Pct = roundCurrency(discretionalCandidate.totalSpent * 0.1);
    insights.push({
      id: 'insight-savings-estimate',
      kind: 'savings_estimate',
      tone: 'positive',
      periodLabel,
      title: `Potential Savings Opportunity in ${discretionalCandidate.category} (Estimate)`,
      description: `Reducing ${discretionalCandidate.category} expenditure by 10% could save approximately ₹${est10Pct.toLocaleString('en-IN')} across ${periodLabel}. This is a mathematical projection, not actual saved cash.`,
      metricLabel: `~₹${est10Pct.toLocaleString('en-IN')}`,
      isEstimate: true,
    });
  }

  return insights;
}

// ---------- TRANSACTION-LEVEL ANALYTICS ----------

export function queryRadarTransactions(
  transactions: Transaction[],
  options: RadarTransactionQueryOptions = {}
): RadarTransactionQueryResult {
  const {
    search = '',
    category = 'all',
    status = 'active_only',
    startDate,
    endDate,
    sortBy = 'date_desc',
  } = options;

  const q = search.trim().toLowerCase();
  const startParsed = parseLocalDateInput(startDate);
  const endParsed = parseLocalDateInput(endDate);
  const startMs = startParsed ? startOfDay(startParsed).getTime() : null;
  const endMs = endParsed ? endOfDay(endParsed).getTime() : null;

  const filtered: Array<{ tx: Transaction; effectiveAmount: number; ms: number }> = [];

  for (const tx of transactions) {
    const txStatus = tx.status ?? 'active';
    if (status === 'active_only' && txStatus === 'cancelled') continue;
    if (status === 'refunded' && txStatus !== 'refunded') continue;
    if (status === 'cancelled' && txStatus !== 'cancelled') continue;

    if (category !== 'all' && tx.category !== category) continue;

    const ms = new Date(tx.timestamp).getTime();
    if (!Number.isFinite(ms)) continue;
    if (startMs !== null && ms < startMs) continue;
    if (endMs !== null && ms > endMs) continue;

    if (q) {
      const hay = `${tx.name} ${tx.category} ${tx.source ?? ''}`.toLowerCase();
      if (!hay.includes(q)) continue;
    }

    const effectiveAmount = roundCurrency(getEffectiveTransactionAmount(tx));
    if (status === 'active_only' && effectiveAmount <= 0) continue;

    filtered.push({ tx, effectiveAmount, ms });
  }

  filtered.sort((a, b) => {
    if (sortBy === 'amount_desc') return b.effectiveAmount - a.effectiveAmount || b.ms - a.ms;
    if (sortBy === 'amount_asc') return a.effectiveAmount - b.effectiveAmount || b.ms - a.ms;
    if (sortBy === 'date_asc') return a.ms - b.ms;
    return b.ms - a.ms;
  });

  const activeInSlice = filtered.filter((i) => i.tx.status !== 'cancelled' && i.effectiveAmount > 0);
  const totalEffectiveSpend = roundCurrency(
    activeInSlice.reduce((s, i) => s + i.effectiveAmount, 0)
  );

  const highestTransactions = [...activeInSlice]
    .sort((a, b) => b.effectiveAmount - a.effectiveAmount)
    .slice(0, 3)
    .map(({ tx, effectiveAmount }) => ({ tx, effectiveAmount }));

  const freqMap = new Map<string, { category: string; count: number; totalSpent: number }>();
  for (const i of activeInSlice) {
    const prev = freqMap.get(i.tx.category);
    if (prev) {
      prev.count += 1;
      prev.totalSpent = roundCurrency(prev.totalSpent + i.effectiveAmount);
    } else {
      freqMap.set(i.tx.category, {
        category: i.tx.category,
        count: 1,
        totalSpent: i.effectiveAmount,
      });
    }
  }
  const mostFrequentCategories = Array.from(freqMap.values())
    .sort((a, b) => b.count - a.count || b.totalSpent - a.totalSpent)
    .slice(0, 3);

  return {
    items: filtered.map(({ tx, effectiveAmount }) => ({ tx, effectiveAmount })),
    totalEffectiveSpend,
    highestTransactions,
    mostFrequentCategories,
  };
}

// ---------- FINANCIAL REPORTS & EXPORT ----------

export function resolveReportWindow(
  preset: ReportPeriodPreset,
  now: Date = new Date()
): RadarDateWindow {
  if (preset === 'weekly') return resolveRadarWindow('this_week', undefined, undefined, now);
  if (preset === 'monthly') return resolveRadarWindow('this_month', undefined, undefined, now);
  if (preset === 'yearly') return resolveRadarWindow('this_year', undefined, undefined, now);
  // Quarterly = current calendar quarter vs previous calendar quarter (elapsed matched if incomplete)
  const qMonthStart = Math.floor(now.getMonth() / 3) * 3;
  const start = new Date(now.getFullYear(), qMonthStart, 1, 0, 0, 0, 0);
  const end = endOfDay(now);
  const fullQEnd = new Date(now.getFullYear(), qMonthStart + 3, 0, 23, 59, 59, 999);
  const elapsedDays = countInclusiveDays(start, end);
  const totalCalendarDays = countInclusiveDays(start, fullQEnd);
  const isPartial = elapsedDays < totalCalendarDays;

  const compStart = new Date(now.getFullYear(), qMonthStart - 3, 1, 0, 0, 0, 0);
  const compEndFull = new Date(now.getFullYear(), qMonthStart, 0, 23, 59, 59, 999);
  const compEnd = isPartial
    ? new Date(
        Math.min(
          compEndFull.getTime(),
          new Date(
            compStart.getFullYear(),
            compStart.getMonth(),
            compStart.getDate() + elapsedDays - 1,
            23,
            59,
            59,
            999
          ).getTime()
        )
      )
    : compEndFull;

  const qNum = Math.floor(qMonthStart / 3) + 1;
  return {
    preset: 'custom',
    start,
    end,
    startMs: start.getTime(),
    endMs: end.getTime(),
    label: `Q${qNum} ${now.getFullYear()} (${formatShortDate(start)}–${formatShortDate(end)})`,
    elapsedDays,
    totalCalendarDays,
    isIncompleteCurrentPeriod: isPartial,
    comparisonStart: compStart,
    comparisonEnd: compEnd,
    comparisonStartMs: compStart.getTime(),
    comparisonEndMs: compEnd.getTime(),
    comparisonLabel: isPartial
      ? `Prior Quarter Elapsed (${formatShortDate(compStart)}–${formatShortDate(compEnd)})`
      : `Prior Quarter (${formatShortDate(compStart)}–${formatShortDate(compEndFull)})`,
    comparisonIsElapsedMatch: isPartial,
  };
}

export function buildRadarFinancialReport(opts: {
  transactions: Transaction[];
  categories: string[];
  categoryCaps: CategoryCaps;
  totalBudget: number;
  periodPreset: ReportPeriodPreset;
  now?: Date;
}): RadarFinancialReport {
  const {
    transactions,
    categories,
    categoryCaps,
    totalBudget,
    periodPreset,
    now = new Date(),
  } = opts;
  const window = resolveReportWindow(periodPreset, now);
  const overview = computeRadarOverview({ transactions, totalBudget, window, now });
  const catResult = computeCategoryAnalytics({
    transactions,
    categories,
    categoryCaps,
    window,
    now,
  });
  const trendsResult = computeSpendingTrends({
    transactions,
    granularity: periodPreset === 'weekly' ? 'daily' : periodPreset === 'monthly' ? 'weekly' : 'monthly',
    window,
    now,
  });
  const budgetResult = computeRadarBudgetMonitor({
    transactions,
    totalBudget,
    categories,
    categoryCaps,
    now,
  });
  const anomalies = detectUnusualSpending({ transactions, window, now });
  const insights = generateRadarInsights({
    overview,
    categoriesResult: catResult,
    trendsResult,
    budgetResult,
    anomalies,
  });

  const windowSlices = filterSlicesByMs(
    extractActiveSlices(transactions),
    window.startMs,
    window.endMs
  );
  const largestTransactions = [...windowSlices]
    .sort((a, b) => b.effectiveAmount - a.effectiveAmount)
    .slice(0, 5)
    .map((s) => ({
      id: s.tx.id,
      name: s.tx.name,
      category: s.tx.category,
      amount: s.effectiveAmount,
      date: s.tx.timestamp,
    }));

  return {
    generatedAt: now.toISOString(),
    periodPreset,
    periodLabel: window.label,
    comparisonLabel: window.comparisonLabel,
    totalExpenditure: overview.totalSpent,
    previousExpenditure: overview.prevTotalSpent,
    expenditureChangePct: overview.spendDeltaPct,
    transactionCount: overview.txCount,
    avgDailySpending: overview.avgDailySpend,
    monthlyBudget: budgetResult.totalBudget,
    monthlyBudgetSpend: budgetResult.totalMonthSpent,
    monthlyBudgetRemaining: budgetResult.remainingBudget,
    monthlyBudgetUtilisationPct: budgetResult.utilisationPct,
    categoryBreakdown: catResult.categories
      .filter((c) => c.totalSpent > 0 || c.allocatedCap !== null)
      .map((c) => ({
        category: c.category,
        amount: c.totalSpent,
        sharePct: c.sharePct,
        txCount: c.txCount,
        cap: c.allocatedCap,
      })),
    largestTransactions,
    trendSummary: trendsResult.trendSummary,
    keyInsights: insights.map((i) => `${i.title}: ${i.description}`),
  };
}

function escapeCsvCell(val: string | number | null | undefined): string {
  const s = val === null || val === undefined ? '' : String(val);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildRadarReportCsv(
  report: RadarFinancialReport,
  transactions: Transaction[]
): string {
  const rows: string[] = [];
  rows.push(['CartAudit Radar Room Financial Report'].map(escapeCsvCell).join(','));
  rows.push(['Reporting Period', report.periodLabel].map(escapeCsvCell).join(','));
  rows.push(['Comparison Baseline', report.comparisonLabel].map(escapeCsvCell).join(','));
  rows.push(['Generated At', new Date(report.generatedAt).toLocaleString('en-IN')].map(escapeCsvCell).join(','));
  rows.push('');

  rows.push(['Summary Metric', 'Value'].map(escapeCsvCell).join(','));
  rows.push(['Total Expenditure (INR)', report.totalExpenditure].map(escapeCsvCell).join(','));
  rows.push(['Previous Period Expenditure (INR)', report.previousExpenditure].map(escapeCsvCell).join(','));
  rows.push(['Change (%)', report.expenditureChangePct ?? 'N/A'].map(escapeCsvCell).join(','));
  rows.push(['Transaction Count', report.transactionCount].map(escapeCsvCell).join(','));
  rows.push(['Average Daily Spend (INR)', report.avgDailySpending].map(escapeCsvCell).join(','));
  rows.push(['Monthly Budget (INR)', report.monthlyBudget].map(escapeCsvCell).join(','));
  rows.push(['Monthly Budget Utilisation (%)', report.monthlyBudgetUtilisationPct].map(escapeCsvCell).join(','));
  rows.push('');

  rows.push(['Category', 'Spent (INR)', 'Share (%)', 'Transactions', 'Monthly Cap (INR)'].map(escapeCsvCell).join(','));
  for (const c of report.categoryBreakdown) {
    rows.push(
      [c.category, c.amount, c.sharePct, c.txCount, c.cap ?? 'No Cap'].map(escapeCsvCell).join(',')
    );
  }
  rows.push('');

  rows.push(['Transactions in Period', 'Category', 'Effective Amount (INR)', 'Status', 'Source', 'Timestamp'].map(escapeCsvCell).join(','));
  const window = resolveReportWindow(report.periodPreset, new Date(report.generatedAt));
  const slices = filterSlicesByMs(extractActiveSlices(transactions), window.startMs, window.endMs);
  for (const s of slices) {
    rows.push(
      [
        s.tx.name,
        s.tx.category,
        s.effectiveAmount,
        s.tx.status ?? 'active',
        s.tx.source ?? 'manual',
        s.tx.timestamp,
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  }
  rows.push('');

  rows.push(['Key Financial Insights'].map(escapeCsvCell).join(','));
  for (const ins of report.keyInsights) {
    rows.push([ins].map(escapeCsvCell).join(','));
  }

  return rows.join('\n');
}

export function buildRadarReportHtml(report: RadarFinancialReport): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const catRows = report.categoryBreakdown
    .map(
      (c) => `
      <tr>
        <td>${esc(c.category)}</td>
        <td class="num">₹${c.amount.toLocaleString('en-IN')}</td>
        <td class="num">${c.sharePct}%</td>
        <td class="num">${c.txCount}</td>
        <td class="num">${c.cap !== null ? `₹${c.cap.toLocaleString('en-IN')}` : '—'}</td>
      </tr>`
    )
    .join('');

  const topTxRows = report.largestTransactions
    .map(
      (t) => `
      <tr>
        <td>${esc(t.name)}</td>
        <td>${esc(t.category)}</td>
        <td class="num">₹${t.amount.toLocaleString('en-IN')}</td>
        <td>${esc(new Date(t.date).toLocaleDateString('en-IN'))}</td>
      </tr>`
    )
    .join('');

  const insightItems = report.keyInsights
    .map((ins) => `<li>${esc(ins)}</li>`)
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Radar Room Financial Report — ${esc(report.periodLabel)}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; margin: 36px auto; max-width: 820px; line-height: 1.5; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .meta { color: #475569; font-size: 13px; margin-bottom: 24px; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; }
  .label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; }
  .val { font-size: 18px; font-weight: 800; margin-top: 4px; font-variant-numeric: tabular-nums; }
  h2 { font-size: 15px; margin: 22px 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px; }
  th, td { text-align: left; padding: 7px 8px; border-bottom: 1px solid #e2e8f0; }
  th { font-size: 11px; text-transform: uppercase; color: #475569; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  ul { padding-left: 18px; font-size: 13px; }
  li { margin-bottom: 6px; }
  @media print { body { margin: 16px; } }
</style>
</head>
<body>
  <h1>CartAudit — Radar Room Financial Report</h1>
  <div class="meta">Period: <strong>${esc(report.periodLabel)}</strong> · Baseline: ${esc(report.comparisonLabel)} · Generated: ${esc(new Date(report.generatedAt).toLocaleString('en-IN'))}</div>
  <div class="grid">
    <div class="card"><div class="label">Total Expenditure</div><div class="val">₹${report.totalExpenditure.toLocaleString('en-IN')}</div></div>
    <div class="card"><div class="label">Avg Daily Spend</div><div class="val">₹${report.avgDailySpending.toLocaleString('en-IN')}</div></div>
    <div class="card"><div class="label">Transactions</div><div class="val">${report.transactionCount}</div></div>
    <div class="card"><div class="label">Month Budget Used</div><div class="val">${report.monthlyBudgetUtilisationPct}%</div></div>
  </div>
  <h2>Category Breakdown</h2>
  <table>
    <thead><tr><th>Category</th><th class="num">Spent</th><th class="num">Share</th><th class="num">Txns</th><th class="num">Monthly Cap</th></tr></thead>
    <tbody>${catRows || '<tr><td colspan="5">No category activity in this period.</td></tr>'}</tbody>
  </table>
  <h2>Largest Transactions</h2>
  <table>
    <thead><tr><th>Description</th><th>Category</th><th class="num">Amount</th><th>Date</th></tr></thead>
    <tbody>${topTxRows || '<tr><td colspan="4">No transactions recorded in this period.</td></tr>'}</tbody>
  </table>
  <h2>Trend &amp; Financial Insights</h2>
  <p style="font-size:13px;color:#334155;">${esc(report.trendSummary)}</p>
  <ul>${insightItems}</ul>
</body>
</html>`;
}
