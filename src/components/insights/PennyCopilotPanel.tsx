import { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { formatCurrency, formatCurrencyExact } from '../../utils/categoryStyles';
import {
  buildSmartActionNudges,
  computeMonthlyDigest,
  computeUpcomingCommitments,
  type PennyActionType,
} from '../../utils/pennyEngine';
import { PennyChatCore } from '../penny/PennyChatCore';
import type { AppSection } from '../ui/AppShell';
import type { InsightsTab } from './InsightsDashboard';

interface PennyCopilotPanelProps {
  onSwitchInsightsTab: (tab: InsightsTab) => void;
  onOpenExpenses?: () => void;
  onOpenShopping?: (subTab?: 'home' | 'baskets') => void;
  onOpenScanner?: () => void;
  onOpenWellness?: () => void;
}

export function PennyCopilotPanel({
  onSwitchInsightsTab,
  onOpenExpenses,
  onOpenShopping,
  onOpenScanner,
  onOpenWellness,
}: PennyCopilotPanelProps) {
  const items = useAppStore((s) => s.items);
  const transactions = useAppStore((s) => s.transactions);
  const totalBudget = useAppStore((s) => s.totalBudget);
  const categories = useAppStore((s) => s.categories);
  const categoryCaps = useAppStore((s) => s.categoryCaps);
  const people = useAppStore((s) => s.people);
  const sharedExpenses = useAppStore((s) => s.sharedExpenses);
  const settlements = useAppStore((s) => s.settlements);
  const basketTemplates = useAppStore((s) => s.basketTemplates);
  const priceObservations = useAppStore((s) => s.priceObservations);
  const savedAudits = useAppStore((s) => s.savedAudits);
  const isBrokeMode = useAppStore((s) => s.isBrokeMode);
  const disciplineCheckIns = useAppStore((s) => s.disciplineCheckIns);

  const addDueRecurringToCart = useAppStore((s) => s.addDueRecurringToCart);
  const quickReorderItem = useAppStore((s) => s.quickReorderItem);
  const loadBasketTemplateToCart = useAppStore((s) => s.loadBasketTemplateToCart);

  const [showUpcomingTimeline, setShowUpcomingTimeline] = useState(true);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const commitmentsSummary = useMemo(
    () =>
      computeUpcomingCommitments({
        items,
        people,
        sharedExpenses,
        settlements,
        transactions,
        totalBudget,
      }),
    [items, people, sharedExpenses, settlements, transactions, totalBudget]
  );

  const smartNudges = useMemo(
    () =>
      buildSmartActionNudges({
        commitmentsSummary,
        items,
        basketTemplates,
        priceObservations,
        savedAudits,
      }),
    [commitmentsSummary, items, basketTemplates, priceObservations, savedAudits]
  );

  const monthlyDigest = useMemo(
    () =>
      computeMonthlyDigest({
        transactions,
        totalBudget,
        categories,
        categoryCaps,
        savedAudits,
        people,
        sharedExpenses,
        settlements,
        isBrokeMode,
        disciplineCheckIns,
      }),
    [
      transactions,
      totalBudget,
      categories,
      categoryCaps,
      savedAudits,
      people,
      sharedExpenses,
      settlements,
      isBrokeMode,
      disciplineCheckIns,
    ]
  );

  const showTempFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => {
      setActionFeedback((curr) => (curr === msg ? null : curr));
    }, 3500);
  };

  const handleCoreNavigate = (section: AppSection, subTab?: string) => {
    if (section === 'expenses') onOpenExpenses?.();
    else if (section === 'shopping') onOpenShopping?.(subTab === 'baskets' ? 'baskets' : 'home');
    else if (section === 'scanner') onOpenScanner?.();
    else if (section === 'wellness') onOpenWellness?.();
    else if (section === 'insights' && (subTab === 'radar' || subTab === 'prices' || subTab === 'penny')) {
      onSwitchInsightsTab(subTab);
    }
  };

  const executeSuggestedAction = (
    actionType: PennyActionType,
    targetId?: string,
    variantId?: string
  ) => {
    switch (actionType) {
      case 'add_due_recurring': {
        const addedCount = addDueRecurringToCart();
        if (addedCount > 0) {
          showTempFeedback(
            `Added ${addedCount} due recurring ${addedCount === 1 ? 'item' : 'items'} to your Quick Mart cart.`
          );
        } else {
          showTempFeedback('No overdue recurring items are due right now.');
        }
        break;
      }
      case 'quick_reorder_item': {
        if (targetId && quickReorderItem(targetId, variantId, 1)) {
          showTempFeedback('Queued recurring item in your Quick Mart cart.');
        }
        break;
      }
      case 'load_basket': {
        if (targetId) {
          const count = loadBasketTemplateToCart(targetId, 'merge');
          showTempFeedback(
            count > 0
              ? `Merged ${count} ${count === 1 ? 'item' : 'items'} from basket into your cart.`
              : 'Could not load that basket into your cart.'
          );
        } else {
          onOpenShopping?.('baskets');
        }
        break;
      }
      case 'open_expenses':
        onOpenExpenses?.();
        break;
      case 'open_shopping':
        onOpenShopping?.('baskets');
        break;
      case 'open_prices':
        onSwitchInsightsTab('prices');
        break;
      case 'open_scanner':
        onOpenScanner?.();
        break;
      case 'open_wellness':
        onOpenWellness?.();
        break;
      default:
        break;
    }
  };

  const isNegativeSafe = commitmentsSummary.trueSafeToSpend < 0;

  return (
    <div className="space-y-5">
      {actionFeedback && (
        <div
          role="status"
          className="surface-card px-4 py-2.5 flex items-center justify-between gap-3 border-[#B7E4D3] bg-[#E8F7F1] text-[#0D5E43] text-xs font-semibold"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionFeedback}</span>
          </span>
          {onOpenShopping && (
            <button
              type="button"
              onClick={() => onOpenShopping('home')}
              className="underline whitespace-nowrap shrink-0"
            >
              View Cart
            </button>
          )}
        </div>
      )}

      {/* Section 1: Safe-to-Spend Forecast & Upcoming Payments */}
      <section aria-label="Safe-to-spend and upcoming payments" className="surface-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-[15px] font-bold text-[#151922]">
              Safe-to-Spend &amp; Upcoming Payments
            </h2>
            <p className="text-xs text-[#697386] mt-0.5">
              Subtracts upcoming 30-day recurring items and unsettled split payables from your remaining monthly budget.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowUpcomingTimeline((v) => !v)}
            aria-expanded={showUpcomingTimeline}
            className="text-xs font-semibold text-[#365FE8] hover:text-[#294FCC] inline-flex items-center gap-1 whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            <CalendarClock className="w-3.5 h-3.5" />
            <span>
              {showUpcomingTimeline ? 'Hide' : 'Show'} Commitments (
              {commitmentsSummary.commitments.length})
            </span>
            {showUpcomingTimeline ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-[#E7EAF0] pt-3 gap-y-4 lg:gap-y-0 lg:divide-x lg:divide-[#E7EAF0]">
          <div className="pr-3 lg:pr-4">
            <p className="text-[11px] font-semibold text-[#697386]">
              Remaining Budget
            </p>
            <p
              data-testid="penny-raw-remaining"
              className="text-lg font-bold font-mono tabular-nums text-[#151922] mt-1"
            >
              {commitmentsSummary.rawRemainingBudget < 0 ? '-' : ''}₹
              {formatCurrencyExact(Math.abs(commitmentsSummary.rawRemainingBudget))}
            </p>
            <p className="text-[11px] text-[#697386] mt-0.5 font-mono tabular-nums">
              of ₹{formatCurrency(commitmentsSummary.monthlyBudget)} cap
            </p>
          </div>

          <div className="pl-3 lg:px-4">
            <p className="text-[11px] font-semibold text-[#697386]">
              Upcoming Refills (30d)
            </p>
            <p
              data-testid="penny-upcoming-recurring"
              className="text-lg font-bold font-mono tabular-nums text-[#151922] mt-1"
            >
              ₹{formatCurrencyExact(commitmentsSummary.upcoming30DaysRecurringTotal)}
            </p>
            <p className="text-[11px] text-[#697386] mt-0.5">
              {commitmentsSummary.dueOrOverdueRecurring.length > 0
                ? `${commitmentsSummary.dueOrOverdueRecurring.length} due or overdue now`
                : 'Scheduled recurring items'}
            </p>
          </div>

          <div className="pr-3 lg:px-4">
            <p className="text-[11px] font-semibold text-[#697386]">
              Splits You Owe
            </p>
            <p
              data-testid="penny-splits-owe"
              className={`text-lg font-bold font-mono tabular-nums mt-1 ${
                commitmentsSummary.totalIOweSplits > 0 ? 'text-[#9E6614]' : 'text-[#151922]'
              }`}
            >
              ₹{formatCurrencyExact(commitmentsSummary.totalIOweSplits)}
            </p>
            <p className="text-[11px] text-[#697386] mt-0.5 font-mono tabular-nums">
              ₹{formatCurrencyExact(commitmentsSummary.totalOwedToMeSplits)} owed back to you
            </p>
          </div>

          <div className="pl-3 lg:pl-4">
            <p className="text-[11px] font-semibold text-[#365FE8]">
              True Safe Daily Spend
            </p>
            <p
              data-testid="penny-safe-daily"
              className={`text-lg font-bold font-mono tabular-nums mt-1 ${
                isNegativeSafe ? 'text-[#DE5252]' : 'text-[#15966B]'
              }`}
            >
              ₹{formatCurrencyExact(commitmentsSummary.safeDailySpend)}/day
            </p>
            <p className="text-[11px] text-[#697386] mt-0.5 font-mono tabular-nums">
              {isNegativeSafe
                ? `Short by ₹${formatCurrencyExact(Math.abs(commitmentsSummary.trueSafeToSpend))}`
                : `₹${formatCurrencyExact(commitmentsSummary.trueSafeToSpend)} over ${commitmentsSummary.remainingDaysInMonth}d`}
            </p>
          </div>
        </div>

        {showUpcomingTimeline && (
          <div className="pt-3 border-t border-[#E7EAF0]">
            {commitmentsSummary.commitments.length === 0 ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#697386] py-1">
                <span>
                  No upcoming recurring bills/restocks or unpaid split balances right now.
                </span>
                {onOpenShopping && (
                  <button
                    type="button"
                    onClick={() => onOpenShopping('home')}
                    className="font-semibold text-[#365FE8] hover:text-[#294FCC] whitespace-nowrap self-start sm:self-auto"
                  >
                    Set up recurring items in Shopping
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-[#E7EAF0]">
                {commitmentsSummary.commitments.slice(0, 6).map((c) => (
                  <div
                    key={c.id}
                    className="py-2.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#151922] truncate">
                        {c.title}
                      </p>
                      <p className="text-xs text-[#697386] truncate">
                        {c.kind === 'split_payable'
                          ? 'Shared Split'
                          : c.kind === 'recurring_bill'
                            ? 'Recurring Bill'
                            : 'Scheduled Restock'}{' '}
                        · {c.subtitle}
                        {c.dueDateKey ? ` · ${c.dueDateKey}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[13px] font-bold font-mono tabular-nums text-[#151922]">
                        ₹{formatCurrencyExact(c.amount)}
                      </span>
                      {c.kind === 'split_payable' ? (
                        onOpenExpenses && (
                          <button
                            type="button"
                            onClick={onOpenExpenses}
                            className="btn-secondary px-2.5 py-1 text-xs whitespace-nowrap"
                          >
                            Settle
                          </button>
                        )
                      ) : (
                        c.itemId && (
                          <button
                            type="button"
                            onClick={() =>
                              executeSuggestedAction('quick_reorder_item', c.itemId, c.variantId)
                            }
                            className="btn-secondary px-2.5 py-1 text-xs whitespace-nowrap"
                          >
                            Add to Cart
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Section 2: Main 2-Column Split — Penny Co-Pilot + Nudges/Digest */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: Penny AI Co-Pilot & Quick Expense Parser (Synced with Floating Window) */}
        <section
          aria-label="Penny AI co-pilot"
          className="lg:col-span-7 surface-card p-5 flex flex-col gap-3 min-h-[500px]"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#365FE8] text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-[18px] h-[18px]" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <h2 className="text-[15px] font-bold text-[#151922] leading-tight">
                Penny — Your Money Co-Pilot
              </h2>
              <p className="text-xs text-[#697386] mt-0.5 truncate">
                Synced with your global Penny companion · asks, adapts &amp; executes actions
              </p>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
            <PennyChatCore
              activeScreen="insights"
              onNavigate={handleCoreNavigate}
              inputId="penny-insights-chat-input"
            />
          </div>
        </section>

        {/* Right: Smart Actionable Nudges + Monthly Money Digest */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Actionable Nudges */}
          <section aria-label="Smart action nudges" className="surface-card p-5 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-[15px] font-bold text-[#151922]">
                  Smart Nudges
                </h2>
                <p className="text-xs text-[#697386] mt-0.5">
                  One-click actions from your live recurring, price, and basket data
                </p>
              </div>
              <ShoppingBag className="w-4 h-4 text-[#697386] shrink-0" />
            </div>

            {smartNudges.length === 0 ? (
              <div className="py-4 text-xs text-[#697386] space-y-2">
                <p>
                  No urgent refills, price drops, or unpaid splits detected right now.
                </p>
                {onOpenShopping && (
                  <button
                    type="button"
                    onClick={() => onOpenShopping('baskets')}
                    className="btn-secondary px-3 py-1.5 text-xs"
                  >
                    Browse Saved Baskets
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-[#E7EAF0]">
                {smartNudges.map((nudge) => (
                  <div
                    key={nudge.id}
                    className="py-3 first:pt-0 last:pb-0 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-semibold text-[#151922] leading-snug">
                        {nudge.title}
                      </p>
                      <span
                        className={`text-xs font-bold font-mono tabular-nums shrink-0 ${
                          nudge.tone === 'positive'
                            ? 'text-[#15966B]'
                            : nudge.tone === 'warning'
                              ? 'text-[#9E6614]'
                              : 'text-[#365FE8]'
                        }`}
                      >
                        {nudge.metricLabel}
                      </span>
                    </div>
                    <p className="text-xs text-[#697386] leading-relaxed">
                      {nudge.description}
                    </p>
                    <div>
                      <button
                        type="button"
                        onClick={() =>
                          executeSuggestedAction(
                            nudge.actionType,
                            nudge.targetId,
                            nudge.variantId
                          )
                        }
                        className="text-xs font-semibold text-[#365FE8] hover:text-[#294FCC] inline-flex items-center gap-1"
                      >
                        <span>{nudge.actionLabel}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Monthly Money Digest */}
          <section
            aria-label="Monthly money digest"
            className="surface-card p-5 flex-1 flex flex-col justify-between gap-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-[15px] font-bold text-[#151922]">
                  {monthlyDigest.monthLabel} Digest
                </h2>
                <p className="text-xs text-[#697386] mt-0.5">
                  Live monthly performance scorecard
                </p>
              </div>
              <Wallet className="w-4 h-4 text-[#697386] shrink-0" />
            </div>

            <div className="divide-y divide-[#E7EAF0] text-xs">
              <div className="py-2.5 flex items-center justify-between gap-2">
                <span className="text-[#697386]">Total Spent / Budget</span>
                <span className="font-mono tabular-nums font-bold text-[#151922]">
                  ₹{formatCurrencyExact(monthlyDigest.totalSpent)} / ₹
                  {formatCurrency(monthlyDigest.monthlyBudget)} ({monthlyDigest.budgetUsedPct}%)
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between gap-2">
                <span className="text-[#697386]">Vs. Last Month</span>
                <span
                  className={`font-mono tabular-nums font-bold inline-flex items-center gap-1 ${
                    monthlyDigest.vsLastMonthDelta > 0
                      ? 'text-[#9E6614]'
                      : monthlyDigest.vsLastMonthDelta < 0
                        ? 'text-[#15966B]'
                        : 'text-[#151922]'
                  }`}
                >
                  {monthlyDigest.vsLastMonthDelta > 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : monthlyDigest.vsLastMonthDelta < 0 ? (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  ) : null}
                  {monthlyDigest.vsLastMonthDelta >= 0 ? '+' : '-'}₹
                  {formatCurrencyExact(Math.abs(monthlyDigest.vsLastMonthDelta))}
                  {monthlyDigest.vsLastMonthPct !== null
                    ? ` (${monthlyDigest.vsLastMonthPct > 0 ? '+' : ''}${monthlyDigest.vsLastMonthPct}%)`
                    : ''}
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between gap-2">
                <span className="text-[#697386]">Top Category</span>
                <span className="font-semibold text-[#151922] truncate max-w-[60%] text-right">
                  {monthlyDigest.topCategory
                    ? `${monthlyDigest.topCategory.name} · ₹${formatCurrencyExact(
                        monthlyDigest.topCategory.amount
                      )} (${monthlyDigest.topCategory.sharePct}%)`
                    : 'No expenses yet'}
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between gap-2">
                <span className="text-[#697386]">Net Split Balance</span>
                <span
                  className={`font-mono tabular-nums font-bold ${
                    monthlyDigest.netSplitBalance < 0
                      ? 'text-[#9E6614]'
                      : monthlyDigest.netSplitBalance > 0
                        ? 'text-[#15966B]'
                        : 'text-[#151922]'
                  }`}
                >
                  {monthlyDigest.netSplitBalance < 0
                    ? `You owe ₹${formatCurrencyExact(Math.abs(monthlyDigest.netSplitBalance))}`
                    : monthlyDigest.netSplitBalance > 0
                      ? `Owed to you ₹${formatCurrencyExact(monthlyDigest.netSplitBalance)}`
                      : 'Settled ₹0'}
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between gap-2">
                <span className="text-[#697386]">Fees Caught / Check-ins</span>
                <span className="font-mono tabular-nums font-semibold text-[#151922]">
                  ₹{formatCurrencyExact(monthlyDigest.feeLeaksDetected)} ({monthlyDigest.auditCount}) ·{' '}
                  {monthlyDigest.disciplineCheckInsCount} check-ins
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
