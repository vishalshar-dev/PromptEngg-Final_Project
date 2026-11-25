import { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Info,
  Receipt,
  Sparkles,
  TrendingDown,
  Users,
} from 'lucide-react';
import type { Transaction } from '../../types/models';
import type { AppSection } from '../ui/AppShell';
import { SectionHeader } from '../ui/SectionHeader';
import { EmptyState } from '../ui/EmptyState';
import {
  formatCurrencyExact,
  getCategoryStyle,
} from '../../utils/categoryStyles';
import { getEffectiveTransactionAmount } from '../../utils/martEngine';
import type { UpcomingCommitmentsSummary } from '../../utils/pennyEngine';
import type { LedgerDashboardSummary } from '../../utils/splitLedgerEngine';
import type { SmartAlert } from '../../utils/warRoomEngine';
import type {
  RadarFinancialInsight,
  RadarSpendingAnomaly,
} from '../../utils/radarEngine';
import type { PriceInsight } from '../../utils/priceTrackerEngine';
import {
  cleanAttentionSignalCopy,
  formatRecurringSubtitle,
} from './overviewTextFormatters';

interface AttentionSignal {
  id: string;
  title: string;
  description: string;
  metric?: string;
  tone: 'critical' | 'warning' | 'positive' | 'neutral';
  actionLabel: string;
  targetSection: AppSection;
  targetSubTab?: string;
}

interface OverviewAttentionSectionProps {
  showAttentionCenter: boolean;
  showInsightsFeature: boolean;
  smartAlerts: SmartAlert[];
  radarInsights: RadarFinancialInsight[];
  priceInsights: PriceInsight[];
  anomalies: RadarSpendingAnomaly[];
  ledgerDashboard: LedgerDashboardSummary;
  commitmentsSummary: UpcomingCommitmentsSummary;
  recentTransactions: Transaction[];
  totalActiveCount?: number;
  highlightCategory?: string | null;
  onAddExpense: () => void;
  onNavigate: (section: AppSection, subTab?: string) => void;
}

export function OverviewAttentionSection({
  showAttentionCenter,
  showInsightsFeature,
  smartAlerts,
  radarInsights,
  priceInsights,
  anomalies,
  ledgerDashboard,
  commitmentsSummary,
  recentTransactions,
  totalActiveCount,
  highlightCategory,
  onAddExpense,
  onNavigate,
}: OverviewAttentionSectionProps) {
  const attentionSignals = useMemo<AttentionSignal[]>(() => {
    const signals: AttentionSignal[] = [];
    const seenKeys = new Set<string>();
    const normalizedHighlightedCat = highlightCategory?.trim().toLowerCase() ?? '';

    // 1. Prioritize Smart Alerts from Financial Wellness (limits, broke mode, leakage, spikes)
    for (const alert of smartAlerts) {
      if (
        normalizedHighlightedCat &&
        alert.category?.trim().toLowerCase() === normalizedHighlightedCat &&
        alert.type === 'unusual_spending'
      ) {
        continue;
      }
      const key = `alert:${alert.signature}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      signals.push({
        id: alert.id,
        title: alert.title,
        description: alert.reason,
        metric: alert.metricValue,
        tone:
          alert.severity === 'critical'
            ? 'critical'
            : alert.severity === 'warning'
              ? 'warning'
              : alert.type === 'spending_improvement'
                ? 'positive'
                : 'neutral',
        actionLabel: 'Open Wellness',
        targetSection: 'wellness',
      });
      if (signals.length >= 2) break;
    }

    // 2. Unsettled Split Ledger obligations (if shared balances exist)
    if (ledgerDashboard.totalIOwe > 0 || ledgerDashboard.totalOwedToMe > 0) {
      const iOwe = ledgerDashboard.totalIOwe;
      const owedMe = ledgerDashboard.totalOwedToMe;
      signals.push({
        id: 'attention-splits',
        title:
          iOwe > 0
            ? `₹${formatCurrencyExact(iOwe)} in pending split payables`
            : `₹${formatCurrencyExact(owedMe)} owed to you in Splits`,
        description:
          iOwe > 0 && owedMe > 0
            ? `You owe ₹${formatCurrencyExact(iOwe)} and are owed ₹${formatCurrencyExact(owedMe)} across ${ledgerDashboard.unsettledCount} unsettled shared expense${ledgerDashboard.unsettledCount === 1 ? '' : 's'}.`
            : `${ledgerDashboard.unsettledCount} unsettled shared expense${ledgerDashboard.unsettledCount === 1 ? '' : 's'} active in your Split Ledger.`,
        metric: iOwe > 0 ? `-₹${formatCurrencyExact(iOwe)}` : `+₹${formatCurrencyExact(owedMe)}`,
        tone: iOwe > 0 ? 'warning' : 'positive',
        actionLabel: 'View Splits',
        targetSection: 'expenses',
        targetSubTab: 'splits',
      });
    }

    // 3. Unusual Spending Anomaly (deduplicated)
    for (const anomaly of anomalies) {
      if (signals.length >= 4) break;
      const key = `anomaly:${anomaly.category.toLowerCase()}:${anomaly.kind}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      signals.push({
        id: anomaly.id,
        title: anomaly.subject,
        description: anomaly.reason,
        metric: `+${Math.round(anomaly.deviationPct)}%`,
        tone: anomaly.severity === 'high' ? 'critical' : 'warning',
        actionLabel: 'Inspect Radar',
        targetSection: showInsightsFeature ? 'insights' : 'expenses',
        targetSubTab: showInsightsFeature ? 'radar' : undefined,
      });
    }

    // 4. Radar Insights
    for (const r of radarInsights) {
      if (signals.length >= 4) break;
      const key = `radar:${r.title.toLowerCase()}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      signals.push({
        id: r.id,
        title: r.title,
        description: r.description,
        metric: r.metricLabel,
        tone:
          r.tone === 'positive'
            ? 'positive'
            : r.tone === 'caution'
              ? 'warning'
              : 'neutral',
        actionLabel: 'Open Radar',
        targetSection: showInsightsFeature ? 'insights' : 'expenses',
        targetSubTab: showInsightsFeature ? 'radar' : undefined,
      });
    }

    // 5. Price Tracker Insights
    for (const p of priceInsights) {
      if (signals.length >= 4) break;
      const key = `price:${p.id}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      signals.push({
        id: p.id,
        title: p.title,
        description: p.description,
        metric: p.metricBadge,
        tone:
          p.tone === 'positive'
            ? 'positive'
            : p.tone === 'warning'
              ? 'warning'
              : 'neutral',
        actionLabel: 'Price Tracker',
        targetSection: showInsightsFeature ? 'insights' : 'shopping',
        targetSubTab: showInsightsFeature ? 'prices' : undefined,
      });
    }

    return signals.slice(0, 4);
  }, [
    smartAlerts,
    ledgerDashboard,
    anomalies,
    radarInsights,
    priceInsights,
    highlightCategory,
    showInsightsFeature,
  ]);

  const upcomingRecurring = useMemo(
    () =>
      commitmentsSummary.commitments
        .filter((c) => c.kind !== 'split_payable')
        .slice(0, 3),
    [commitmentsSummary.commitments]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
      {/* Financial Attention Center (7 cols when enabled) */}
      {showAttentionCenter && (
        <section
          aria-label="Financial attention center"
          data-testid="overview-attention-center"
          className="lg:col-span-7 surface-card p-5 sm:p-6 flex flex-col justify-between gap-4"
        >
          <div className="space-y-4">
            <SectionHeader
              title="Financial Attention Center"
              subtitle="Prioritized cap alerts, spending anomalies, price moves, and shared dues"
              action={
                showInsightsFeature ? (
                  <button
                    type="button"
                    onClick={() => onNavigate('insights', 'radar')}
                    className="text-[12.5px] font-semibold text-[var(--accent-ink)] hover:underline inline-flex items-center gap-1 whitespace-nowrap"
                  >
                    <span>Open Radar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : undefined
              }
            />

            {attentionSignals.length === 0 && upcomingRecurring.length === 0 ? (
              <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--accent-primary-soft)] text-[var(--accent-ink)] flex items-center justify-center shrink-0">
                    <Sparkles className="w-[18px] h-[18px]" />
                  </div>
                  <div>
                    <p className="text-[13.5px] font-semibold text-[var(--text-primary)]">
                      No urgent financial signals
                    </p>
                    <p className="text-[12.5px] text-[var(--text-secondary)] mt-0.5">
                      Log expenses, set category caps, or scan receipts to surface anomalies, price shifts, and budget alerts here.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onAddExpense}
                  className="btn-primary px-4 py-2 text-[12.5px] self-start sm:self-auto"
                >
                  Add Expense
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
                {attentionSignals.map((sig) => {
                  const Icon =
                    sig.id === 'attention-splits'
                      ? Users
                      : sig.tone === 'positive'
                        ? TrendingDown
                        : sig.tone === 'critical' || sig.tone === 'warning'
                          ? AlertTriangle
                          : Info;

                  const toneClass =
                    sig.tone === 'critical'
                      ? 'text-[var(--accent-danger-ink)]'
                      : sig.tone === 'warning'
                        ? 'text-[var(--accent-warning-ink)]'
                        : sig.tone === 'positive'
                          ? 'text-[var(--accent-success-ink)]'
                          : 'text-[var(--accent-ink)]';

                  const iconBg =
                    sig.tone === 'critical'
                      ? 'bg-[var(--accent-danger-soft)]'
                      : sig.tone === 'warning'
                        ? 'bg-[var(--accent-warning-soft)]'
                        : sig.tone === 'positive'
                          ? 'bg-[var(--accent-success-soft)]'
                          : 'bg-[var(--accent-primary-soft)]';

                  const clean = cleanAttentionSignalCopy({
                    title: sig.title,
                    description: sig.description,
                    metric: sig.metric,
                  });

                  return (
                    <div
                      key={sig.id}
                      className="py-3 first:pt-3.5 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div
                          className={`w-8 h-8 rounded-xl ${iconBg} ${toneClass} flex items-center justify-center shrink-0 mt-0.5`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13.5px] font-semibold text-[var(--text-primary)] leading-snug">
                            {clean.title}
                          </p>
                          <p className="text-[12.5px] text-[var(--text-secondary)] leading-relaxed mt-0.5 line-clamp-2">
                            {clean.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center sm:flex-col sm:items-end justify-between gap-2 sm:gap-0.5 pl-11 sm:pl-0 shrink-0">
                        {clean.metric && (
                          <span
                            className={`text-[13px] font-bold font-mono tabular-nums ${toneClass}`}
                          >
                            {clean.metric}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            onNavigate(sig.targetSection, sig.targetSubTab)
                          }
                          className="text-[12px] font-semibold text-[var(--accent-ink)] hover:underline inline-flex items-center gap-1 whitespace-nowrap"
                        >
                          <span>{sig.actionLabel}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Real Upcoming Commitments (ONLY rendered when user has real scheduled recurring items) */}
          {upcomingRecurring.length > 0 && (
            <div
              data-testid="overview-upcoming-commitments"
              className="pt-3.5 border-t border-[var(--border-subtle)] space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--text-primary)]">
                  <CalendarClock className="w-3.5 h-3.5 text-[var(--accent-ink)]" />
                  <span>Upcoming Recurring Items</span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('shopping')}
                  className="text-[12px] font-semibold text-[var(--accent-ink)] hover:underline whitespace-nowrap"
                >
                  Manage in Shopping
                </button>
              </div>
              <div
                className={`grid grid-cols-1 gap-2.5 ${
                  upcomingRecurring.length === 1
                    ? ''
                    : upcomingRecurring.length === 2
                      ? 'sm:grid-cols-2'
                      : 'sm:grid-cols-3'
                }`}
              >
                {upcomingRecurring.map((item) => {
                  const formattedSub = formatRecurringSubtitle(item.subtitle, item.title);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onNavigate('shopping')}
                      className="text-left rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] px-3 py-2 transition-colors min-w-0"
                    >
                      <p className="text-[12.5px] font-semibold text-[var(--text-primary)] truncate">
                        {item.title}
                      </p>
                      <div className="flex items-center justify-between gap-2 mt-1 text-[11.5px]">
                        <span
                          className={`truncate ${
                            item.isOverdue
                              ? 'text-[var(--accent-warning-ink)] font-semibold'
                              : 'text-[var(--text-secondary)]'
                          }`}
                        >
                          {formattedSub}
                        </span>
                        <span className="font-mono font-bold tabular-nums text-[var(--text-primary)] shrink-0">
                          ₹{formatCurrencyExact(item.amount)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Recent Activity Card */}
      <section
        aria-label="Recent activity"
        data-testid="overview-recent-activity"
        className={`${
          showAttentionCenter ? 'lg:col-span-5' : 'lg:col-span-12'
        } surface-card p-5 sm:p-6 flex flex-col justify-between gap-4`}
      >
        <div className="space-y-4">
          <SectionHeader
            title="Recent Activity"
            subtitle="Latest recorded expenses"
            action={
              <button
                type="button"
                onClick={() => onNavigate('expenses')}
                className="text-[12.5px] font-semibold text-[var(--accent-ink)] hover:underline flex items-center gap-1 transition-colors whitespace-nowrap"
              >
                View all
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            }
          />

          {recentTransactions.length === 0 ? (
            <EmptyState
              compact
              icon={Receipt}
              title="No recent transactions"
              description="Your recent cart checkouts, scanned receipts, and manual expenses will show up here."
              action={
                <button
                  type="button"
                  onClick={() => onNavigate('shopping')}
                  className="btn-secondary px-4 py-2 text-[13px]"
                >
                  Open Shopping
                </button>
              }
            />
          ) : (
            <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
              {recentTransactions.map((tx) => {
                const catStyle = getCategoryStyle(tx.category);
                const effectiveAmt = getEffectiveTransactionAmount(tx);
                const isInactive =
                  tx.status === 'cancelled' || tx.status === 'refunded';
                return (
                  <div
                    key={tx.id}
                    className="py-2.5 first:pt-3 last:pb-1 -mx-2 px-2 rounded-xl hover:bg-[var(--bg-hover)]/65 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${catStyle.dot}`}
                      />
                      <div className="min-w-0">
                        <p
                          className={`text-[13.5px] font-semibold truncate ${
                            isInactive
                              ? 'line-through text-[var(--text-muted)]'
                              : 'text-[var(--text-primary)]'
                          }`}
                        >
                          {tx.name}
                        </p>
                        <p className="text-[12px] text-[var(--text-secondary)] truncate">
                          {tx.category} ·{' '}
                          {new Date(tx.timestamp).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                          {tx.status && tx.status !== 'active'
                            ? ` · ${tx.status}`
                            : ''}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[13.5px] font-bold font-mono tabular-nums shrink-0 ${
                        isInactive
                          ? 'line-through text-[var(--text-muted)]'
                          : 'text-[var(--text-primary)]'
                      }`}
                    >
                      -₹{formatCurrencyExact(isInactive ? tx.amount : effectiveAmt)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {recentTransactions.length > 0 && (
          <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2 text-[12px]">
            <span className="text-[var(--text-secondary)] truncate">
              Showing latest {recentTransactions.length}
              {typeof totalActiveCount === 'number' && totalActiveCount > recentTransactions.length
                ? ` of ${totalActiveCount} expenses`
                : ' recorded'}
            </span>
            <button
              type="button"
              onClick={() => onNavigate('expenses')}
              className="font-semibold text-[var(--accent-ink)] hover:underline whitespace-nowrap shrink-0"
            >
              Open full ledger
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
