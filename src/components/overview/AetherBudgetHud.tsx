import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  CircleSlash,
  Clock,
  Gauge,
  Pencil,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { formatCurrency, formatCurrencyExact } from '../../utils/categoryStyles';
import { computeLedgerState } from '../../utils/splitLedgerEngine';
import type { AppSection } from '../ui/AppShell';
import { ProgressBar } from '../ui/ProgressBar';
import { ConnectedBudgetCapsule } from './ConnectedBudgetCapsule';
import { deriveCapsuleBudgetState } from './capsule/capsuleBudgetState';
import {
  deriveAetherHudModel,
  type AetherHudStateKey,
  type AetherHudTone,
} from './capsule/aetherHudModel';
import {
  deriveAetherIntelligence,
  type AetherIntelligenceTone,
} from './capsule/aetherIntelligence';
import { useAnimatedNumber } from './capsule/useAnimatedNumber';
import type { UpcomingCommitmentsSummary } from '../../utils/pennyEngine';
import {
  buildTrajectorySubtitle,
  formatCycleDayCounter,
  formatSafeDailySubtext,
  formatTrajectoryProjectionTitle,
} from './overviewTextFormatters';

interface AetherBudgetHudProps {
  onNavigate?: (section: AppSection, subTab?: string) => void;
  commitmentsSummary?: UpcomingCommitmentsSummary;
}

function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setPrefersReduced(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return prefersReduced;
}

function useStoreHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => {
    try {
      return useAppStore.persist?.hasHydrated?.() ?? true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const persistApi = useAppStore.persist;
    if (!persistApi || persistApi.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = persistApi.onFinishHydration(() => setHydrated(true));
    return () => unsub();
  }, []);

  return hydrated;
}

function formatAnimatedCurrency(animated: number, target: number): string {
  if (Math.abs(animated - target) < 0.05) {
    return formatCurrencyExact(target);
  }
  const hasTargetDecimals = Math.abs(target % 1) > 0.001;
  return hasTargetDecimals
    ? formatCurrencyExact(animated)
    : formatCurrency(Math.round(animated));
}

const TONE_CLASSES: Record<
  AetherHudTone,
  {
    statusText: string;
    balanceText: string;
    progressTone: 'brand' | 'success' | 'warning' | 'danger';
  }
> = {
  success: {
    statusText: 'text-[var(--accent-success-ink)]',
    balanceText: 'text-[var(--accent-success-ink)]',
    progressTone: 'success',
  },
  warning: {
    statusText: 'text-[var(--accent-warning-ink)]',
    balanceText: 'text-[var(--accent-warning-ink)]',
    progressTone: 'warning',
  },
  danger: {
    statusText: 'text-[var(--accent-danger-ink)]',
    balanceText: 'text-[var(--accent-danger-ink)]',
    progressTone: 'danger',
  },
  neutral: {
    statusText: 'text-[var(--text-secondary)]',
    balanceText: 'text-[var(--text-primary)]',
    progressTone: 'brand',
  },
};

const INTEL_TONE_INK: Record<AetherIntelligenceTone, string> = {
  success: 'text-[var(--accent-success-ink)]',
  warning: 'text-[var(--accent-warning-ink)]',
  danger: 'text-[var(--accent-danger-ink)]',
  neutral: 'text-[var(--text-secondary)]',
};

function StatusIcon({ stateKey }: { stateKey: AetherHudStateKey }) {
  switch (stateKey) {
    case 'healthy':
      return <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />;
    case 'caution':
      return <Gauge className="w-4 h-4 shrink-0" aria-hidden="true" />;
    case 'critical':
    case 'overspent':
      return <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />;
    case 'depleted':
      return <CircleSlash className="w-4 h-4 shrink-0" aria-hidden="true" />;
    case 'unconfigured':
      return <SlidersHorizontal className="w-4 h-4 shrink-0" aria-hidden="true" />;
    case 'loading':
      return <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />;
    case 'invalid':
    default:
      return <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />;
  }
}

export function AetherBudgetHud({
  onNavigate,
  commitmentsSummary,
}: AetherBudgetHudProps = {}) {
  const transactions = useAppStore((s) => s.transactions);
  const totalBudget = useAppStore((s) => s.totalBudget);
  const setTotalBudget = useAppStore((s) => s.setTotalBudget);
  const budgetResetDay = useAppStore((s) => s.budgetResetDay);
  const budgetRolloverEnabled = useAppStore((s) => s.budgetRolloverEnabled);
  const categoryLimits = useAppStore((s) => s.categoryLimits);
  const categoryCaps = useAppStore((s) => s.categoryCaps);
  const people = useAppStore((s) => s.people);
  const sharedExpenses = useAppStore((s) => s.sharedExpenses);
  const settlements = useAppStore((s) => s.settlements);

  const isHydrated = useStoreHydrated();
  const reducedMotion = usePrefersReducedMotion();

  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState(() =>
    totalBudget > 0 ? String(totalBudget) : ''
  );
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const budgetState = useMemo(
    () =>
      deriveCapsuleBudgetState({
        transactions,
        totalBudget,
        budgetResetDay,
        budgetRolloverEnabled,
      }),
    [transactions, totalBudget, budgetResetDay, budgetRolloverEnabled]
  );

  const hud = useMemo(
    () => deriveAetherHudModel(budgetState, { isHydrated }),
    [budgetState, isHydrated]
  );

  const intelligence = useMemo(
    () =>
      deriveAetherIntelligence({
        budgetState,
        transactions,
        categoryLimits,
        categoryCaps,
      }),
    [budgetState, transactions, categoryLimits, categoryCaps]
  );

  const ledgerDashboard = useMemo(
    () => computeLedgerState(people, sharedExpenses, settlements).dashboard,
    [people, sharedExpenses, settlements]
  );

  const animatedPrimary = useAnimatedNumber(hud.primaryAmount, reducedMotion);
  const animatedSpent = useAnimatedNumber(hud.activeSpent, reducedMotion);
  const animatedOverspend = useAnimatedNumber(hud.overspendAmount, reducedMotion);

  const effectiveStatusLabel =
    hud.stateKey === 'healthy' && intelligence.pace?.status === 'ahead'
      ? 'Early pace elevated'
      : hud.statusLabel;
  const effectiveStatusStateKey: AetherHudStateKey =
    hud.stateKey === 'healthy' && intelligence.pace?.status === 'ahead'
      ? 'caution'
      : hud.stateKey;
  const effectiveTone: AetherHudTone =
    hud.stateKey === 'healthy' && intelligence.pace?.status === 'ahead'
      ? 'warning'
      : hud.tone;
  const toneStyle = TONE_CLASSES[effectiveTone];

  const handleOpenEditBudget = () => {
    setBudgetDraft(
      Number.isFinite(totalBudget) && totalBudget > 0 ? String(totalBudget) : ''
    );
    setBudgetError(null);
    setEditingBudget(true);
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(budgetDraft);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setBudgetError('Enter a valid amount greater than ₹0.');
      return;
    }
    setTotalBudget(Math.round(parsed));
    setBudgetError(null);
    setEditingBudget(false);
  };

  const remainingPctDisplay =
    hud.remainingPct > 0 && hud.remainingPct < 1
      ? '<1'
      : String(Math.round(hud.remainingPct));

  const aetherStatusLine =
    hud.stateKey === 'unconfigured'
      ? 'No monthly budget set'
      : hud.stateKey === 'invalid'
        ? 'Financial data unavailable'
        : hud.stateKey === 'loading'
          ? 'Synchronizing balance…'
          : effectiveStatusLabel;

  const hasSharedBalances =
    ledgerDashboard.totalSharedCount > 0 &&
    (ledgerDashboard.totalIOwe > 0 || ledgerDashboard.totalOwedToMe > 0);

  const showProjectionStandby =
    Boolean(intelligence.pace) &&
    !intelligence.projection &&
    !intelligence.categoryAttention &&
    Boolean(intelligence.omittedReasons.projection);

  const intelCount =
    (intelligence.pace ? 1 : 0) +
    (intelligence.projection || showProjectionStandby ? 1 : 0) +
    (intelligence.categoryAttention ? 1 : 0);
  const intelGridClass =
    intelCount >= 3
      ? 'md:grid-cols-3'
      : intelCount === 2
        ? 'md:grid-cols-2'
        : 'md:grid-cols-1';

  const trajectorySubtitle = useMemo(
    () =>
      buildTrajectorySubtitle({
        hasPace: Boolean(intelligence.pace),
        hasProjection: Boolean(intelligence.projection),
        hasCategory: Boolean(intelligence.categoryAttention),
      }),
    [intelligence.pace, intelligence.projection, intelligence.categoryAttention]
  );

  const cycleCounterLabel = useMemo(
    () =>
      formatCycleDayCounter(
        budgetState.daysElapsed,
        budgetState.daysTotal,
        budgetState.daysRemaining
      ),
    [budgetState.daysElapsed, budgetState.daysTotal, budgetState.daysRemaining]
  );

  const safeDailySubtext = useMemo(() => {
    if (!intelligence.pace) return cycleCounterLabel;
    return formatSafeDailySubtext(
      intelligence.pace.remainingFutureDays,
      budgetState.daysElapsed,
      budgetState.daysTotal
    );
  }, [intelligence.pace, cycleCounterLabel, budgetState.daysElapsed, budgetState.daysTotal]);

  const burnBarRatioPct = useMemo(() => {
    if (!intelligence.pace || intelligence.pace.dailyBudgetAllowance <= 0) return 0;
    return Math.min(
      140,
      Math.round(
        (intelligence.pace.actualDailyAverage /
          intelligence.pace.dailyBudgetAllowance) *
          100
      )
    );
  }, [intelligence.pace]);

  return (
    <div className="space-y-5">
      {/* 1. FLAGSHIP FINANCIAL HERO */}
      <section
        aria-label="Budget overview"
        data-testid="aether-budget-hud"
        data-hud-state={hud.stateKey}
        className="hero-deck p-5 sm:p-7 flex flex-col gap-5 overflow-hidden"
      >
        {/* Subtle atmospheric accent glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full opacity-50 blur-3xl"
          style={{ background: 'var(--accent-primary-soft)' }}
        />

        {/* Top Metadata & Live Health Status */}
        <div className="relative flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[var(--border-subtle)]">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px]">
            <span className="font-semibold text-[var(--text-primary)] tracking-tight">
              Budget Snapshot
            </span>
            {hud.showCycleMetadata && hud.cyclePeriodText && (
              <>
                <span className="text-[var(--text-muted)]" aria-hidden="true">
                  ·
                </span>
                <span
                  data-testid="overview-cycle-window"
                  className="font-mono font-medium text-[var(--text-secondary)] tabular-nums"
                >
                  {hud.cyclePeriodText}
                </span>
              </>
            )}
            {hud.showCycleMetadata && hud.rolloverText && (
              <>
                <span className="text-[var(--text-muted)]" aria-hidden="true">
                  ·
                </span>
                <span
                  data-testid="overview-rollover-badge"
                  className={`font-mono font-semibold tabular-nums ${
                    budgetState.rolloverDelta > 0
                      ? 'text-[var(--accent-success-ink)]'
                      : 'text-[var(--accent-warning-ink)]'
                  }`}
                >
                  {hud.rolloverText}
                </span>
              </>
            )}
          </div>

          <div
            role="status"
            aria-live="polite"
            data-testid="aether-hud-status"
            className={`inline-flex items-center gap-1.5 text-[12.5px] font-semibold transition-colors duration-200 ${toneStyle.statusText}`}
          >
            <StatusIcon stateKey={effectiveStatusStateKey} />
            <span>{effectiveStatusLabel}</span>
          </div>
        </div>

        {/* Hero Main Content: Primary Balance (Left) + Supporting Metrics & Dual Progress (Right) */}
        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Primary Balance & Contextual Status */}
          <div className="lg:col-span-6 min-w-0 space-y-3">
            {hud.stateKey === 'loading' ? (
              <div className="space-y-3" aria-busy="true">
                <div className="h-3.5 w-28 rounded bg-[var(--bg-subtle)]" />
                <div className="h-12 w-52 rounded-lg bg-[var(--bg-subtle)]" />
                <div className="h-4 w-64 rounded bg-[var(--bg-subtle)]" />
              </div>
            ) : hud.stateKey === 'unconfigured' || hud.stateKey === 'invalid' ? (
              <div className="space-y-3">
                <p className="text-[12.5px] font-medium text-[var(--text-secondary)]">
                  {hud.stateKey === 'invalid'
                    ? 'Budget reserve status'
                    : 'Monthly budget setup'}
                </p>
                <h2 className="text-[26px] sm:text-[30px] font-bold font-display tracking-tight text-[var(--text-primary)] leading-tight text-balance">
                  {hud.stateKey === 'invalid'
                    ? 'Financial data unavailable'
                    : 'No monthly budget configured'}
                </h2>
                <p className="text-[13.5px] text-[var(--text-secondary)] leading-relaxed max-w-xl">
                  {hud.statusDescription}
                </p>

                {!editingBudget ? (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleOpenEditBudget}
                      data-testid="aether-setup-budget-btn"
                      className="btn-primary px-4 py-2.5 text-[13px] min-h-[44px]"
                    >
                      <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>
                        {hud.stateKey === 'invalid'
                          ? 'Restore monthly budget'
                          : 'Set monthly budget'}
                      </span>
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={handleSaveBudget}
                    className="pt-1 max-w-sm space-y-2"
                  >
                    <label
                      htmlFor="aether-setup-budget-input"
                      className="block text-[12px] font-semibold text-[var(--text-secondary)]"
                    >
                      Monthly budget (₹)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="aether-setup-budget-input"
                        type="number"
                        min="1"
                        step="1"
                        placeholder="e.g. 25000"
                        aria-label="Monthly budget amount"
                        value={budgetDraft}
                        onChange={(e) => setBudgetDraft(e.target.value)}
                        autoFocus
                        className="input-field flex-1 min-w-0 min-h-[44px] px-3 py-2 text-[15px] font-mono font-semibold tabular-nums"
                      />
                      <button
                        type="submit"
                        aria-label="Save budget"
                        className="btn-primary min-h-[44px] px-4 py-2 text-[13px]"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        aria-label="Cancel budget edit"
                        onClick={() => {
                          setEditingBudget(false);
                          setBudgetError(null);
                        }}
                        className="btn-secondary min-h-[44px] px-3 py-2 text-[13px]"
                      >
                        Cancel
                      </button>
                    </div>
                    {budgetError && (
                      <p className="text-[12px] font-medium text-[var(--accent-danger-ink)]">
                        {budgetError}
                      </p>
                    )}
                  </form>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[12.5px] font-medium text-[var(--text-secondary)]">
                  {hud.primaryLabel}
                </p>

                <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
                  <p
                    data-testid="overview-remaining-balance"
                    aria-label={`${hud.primaryLabel}: ₹${formatCurrencyExact(hud.primaryAmount)}`}
                    className={`text-[38px] sm:text-[46px] xl:text-[50px] font-bold font-mono tabular-nums tracking-tight leading-none break-words transition-colors duration-200 ${
                      hud.stateKey === 'overspent' || hud.stateKey === 'depleted'
                        ? 'text-[var(--accent-danger-ink)]'
                        : toneStyle.balanceText
                    }`}
                  >
                    ₹{formatAnimatedCurrency(animatedPrimary, hud.primaryAmount)}
                  </p>
                  <span className="text-[14px] font-mono font-semibold tabular-nums text-[var(--text-secondary)]">
                    {remainingPctDisplay}% remaining
                  </span>
                </div>

                {intelligence.isAvailable && intelligence.contextualStatus && (
                  <p
                    data-testid="aether-contextual-status"
                    className={`text-[13.5px] leading-snug max-w-lg transition-colors duration-200 ${
                      intelligence.contextualTone === 'danger'
                        ? 'text-[var(--accent-danger-ink)] font-medium'
                        : intelligence.contextualTone === 'warning'
                          ? 'text-[var(--accent-warning-ink)] font-medium'
                          : 'text-[var(--text-tertiary)]'
                    }`}
                  >
                    {intelligence.contextualStatus}
                  </p>
                )}

                {hasSharedBalances && (
                  <div className="pt-1.5">
                    <button
                      type="button"
                      onClick={() => onNavigate?.('expenses', 'splits')}
                      className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 px-3 py-1.5 rounded-lg bg-[var(--bg-subtle)]/75 hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[12px] transition-colors"
                    >
                      <Users className="w-3.5 h-3.5 text-[var(--accent-ink)] shrink-0" />
                      <span className="font-medium text-[var(--text-secondary)]">
                        Splits
                      </span>
                      {ledgerDashboard.totalIOwe > 0 && (
                        <span className="font-mono font-semibold tabular-nums text-[var(--accent-warning-ink)]">
                          Owe ₹{formatCurrencyExact(ledgerDashboard.totalIOwe)}
                        </span>
                      )}
                      {ledgerDashboard.totalIOwe > 0 && ledgerDashboard.totalOwedToMe > 0 && (
                        <span className="text-[var(--text-muted)]" aria-hidden="true">
                          ·
                        </span>
                      )}
                      {ledgerDashboard.totalOwedToMe > 0 && (
                        <span className="font-mono font-semibold tabular-nums text-[var(--accent-success-ink)]">
                          Owed ₹{formatCurrencyExact(ledgerDashboard.totalOwedToMe)}
                        </span>
                      )}
                      {onNavigate && (
                        <ArrowRight className="w-3 h-3 text-[var(--accent-ink)] shrink-0" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Supporting Pillars & Strictly Separated Consumption vs. Cycle Elapsed Bars */}
          <div className="lg:col-span-6 min-w-0 space-y-4 lg:pl-6 lg:border-l lg:border-[var(--border-subtle)]">
            {hud.stateKey === 'loading' ? (
              <div className="grid grid-cols-3 gap-4">
                <div className="h-14 rounded bg-[var(--bg-subtle)]" />
                <div className="h-14 rounded bg-[var(--bg-subtle)]" />
                <div className="h-14 rounded bg-[var(--bg-subtle)]" />
              </div>
            ) : hud.showFinancialNumbers ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-3.5">
                  <div className="min-w-0">
                    <div className="h-5 flex items-center">
                      <span className="text-[12px] font-medium text-[var(--text-secondary)]">
                        Spent this cycle
                      </span>
                    </div>
                    <p
                      data-testid="overview-total-spent"
                      className="text-[19px] sm:text-[21px] font-bold font-mono tabular-nums text-[var(--text-primary)] mt-1 whitespace-nowrap"
                    >
                      ₹{formatAnimatedCurrency(animatedSpent, hud.activeSpent)}
                    </p>
                    <p className="text-[12px] font-mono text-[var(--text-secondary)] tabular-nums mt-0.5">
                      <span data-testid="overview-utilization">{hud.consumedPct}%</span> used
                    </p>
                  </div>

                  <div className="min-w-0 sm:pl-4 sm:border-l sm:border-[var(--border-subtle)]">
                    <div className="h-5 flex items-center gap-1.5">
                      <span className="text-[12px] font-medium text-[var(--text-secondary)] whitespace-nowrap">
                        Cycle budget
                      </span>
                      {!editingBudget && (
                        <button
                          type="button"
                          onClick={handleOpenEditBudget}
                          aria-label="Edit total budget"
                          className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[var(--text-secondary)] hover:text-[var(--accent-ink)] hover:bg-[var(--accent-primary-soft)] transition-colors shrink-0"
                        >
                          <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>

                    {!editingBudget ? (
                      <>
                        <p
                          data-testid="overview-total-budget"
                          className="text-[19px] sm:text-[21px] font-bold font-mono tabular-nums text-[var(--text-primary)] mt-1 whitespace-nowrap"
                        >
                          ₹{formatCurrency(hud.effectiveBudget)}
                        </p>
                        <p className="text-[12px] text-[var(--text-secondary)] mt-0.5 truncate">
                          {budgetState.activeTransactionCount} expense
                          {budgetState.activeTransactionCount === 1 ? '' : 's'}
                        </p>
                      </>
                    ) : (
                      <form onSubmit={handleSaveBudget} className="mt-1 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            aria-label="Monthly budget amount"
                            value={budgetDraft}
                            onChange={(e) => setBudgetDraft(e.target.value)}
                            autoFocus
                            className="input-field w-24 sm:w-28 min-h-[36px] px-2.5 py-1 text-[14px] font-mono font-semibold tabular-nums"
                          />
                          <button
                            type="submit"
                            aria-label="Save budget"
                            className="w-8 h-8 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white flex items-center justify-center shrink-0 transition-colors"
                          >
                            <Check className="w-4 h-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            aria-label="Cancel budget edit"
                            onClick={() => {
                              setEditingBudget(false);
                              setBudgetError(null);
                            }}
                            className="w-8 h-8 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] flex items-center justify-center shrink-0 transition-colors"
                          >
                            <X className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </div>
                        {budgetError && (
                          <p className="text-[12px] font-medium text-[var(--accent-danger-ink)]">
                            {budgetError}
                          </p>
                        )}
                      </form>
                    )}
                  </div>

                  <div className="col-span-2 sm:col-span-1 min-w-0 sm:pl-4 sm:border-l sm:border-[var(--border-subtle)]">
                    <div className="h-5 flex items-center">
                      <span className="text-[12px] font-medium text-[var(--text-secondary)]">
                        Safe daily room
                      </span>
                    </div>
                    <p className="text-[19px] sm:text-[21px] font-bold font-mono tabular-nums text-[var(--text-primary)] mt-1 whitespace-nowrap">
                      {intelligence.pace
                        ? `₹${formatCurrency(intelligence.pace.safeDailyRemaining)}/d`
                        : `${hud.cycleElapsedPct}% elapsed`}
                    </p>
                    <p className="text-[11.5px] font-mono text-[var(--text-secondary)] tabular-nums mt-0.5 whitespace-nowrap truncate">
                      {safeDailySubtext}
                    </p>
                  </div>
                </div>

                {/* Two Distinct Progress Bars: Budget Consumption vs. Cycle Time Elapsed */}
                <div
                  className="pt-3.5 border-t border-[var(--border-subtle)] grid grid-cols-1 sm:grid-cols-2 gap-4"
                  data-testid="overview-budget-progress"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-[12px]">
                      <span className="font-medium text-[var(--text-secondary)]">
                        Budget consumption
                      </span>
                      <span className="font-mono font-semibold tabular-nums text-[var(--text-primary)]">
                        {hud.consumedPct}%
                      </span>
                    </div>
                    <ProgressBar
                      value={hud.cycleBarPct}
                      tone={toneStyle.progressTone}
                      size="md"
                      label={`Budget consumption: ${hud.consumedPct}% of cycle budget spent`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[12px]">
                      <span className="font-medium text-[var(--text-secondary)] whitespace-nowrap">
                        Cycle elapsed
                      </span>
                      <span className="font-mono font-semibold tabular-nums text-[var(--text-secondary)] whitespace-nowrap">
                        {cycleCounterLabel} · {hud.cycleElapsedPct}%
                      </span>
                    </div>
                    <ProgressBar
                      value={hud.cycleElapsedPct}
                      tone="brand"
                      size="md"
                      label={`Cycle elapsed: ${hud.cycleElapsedPct}% (${cycleCounterLabel})`}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                {hud.stateKey === 'unconfigured'
                  ? 'Spending tracking, consumption pacing, and cycle projections activate once your monthly budget is configured.'
                  : 'Existing expenses remain preserved in your Expenses ledger.'}
              </div>
            )}
          </div>
        </div>

        {/* Overspend Alert Footer */}
        {hud.stateKey === 'overspent' && (
          <div
            role="alert"
            data-testid="aether-overspend-alert"
            className="relative rounded-xl px-4 py-2.5 bg-[var(--accent-danger-soft)] border border-[var(--accent-danger-border)] flex flex-wrap items-center justify-between gap-2 transition-colors duration-200"
          >
            <div className="flex items-center gap-2 text-[var(--accent-danger-ink)] font-semibold text-[13px]">
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                Over budget by{' '}
                <span className="font-mono tabular-nums">
                  ₹{formatAnimatedCurrency(animatedOverspend, hud.overspendAmount)}
                </span>
              </span>
            </div>
            <span className="text-[12.5px] font-mono font-semibold tabular-nums text-[var(--accent-danger-ink)]">
              Net balance -₹{formatCurrencyExact(hud.overspendAmount)}
            </span>
          </div>
        )}
      </section>

      {/* 2. DEDICATED AETHER RESERVE EXPERIENCE */}
      <section
        aria-label="AETHER interactive reserve"
        data-testid="aether-dedicated-showcase"
        className="aether-stage-card overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch"
      >
        {/* Spacious Optical Chamber */}
        <div className="lg:col-span-7 xl:col-span-8 p-3 sm:p-4 bg-[var(--bg-well)]/35 flex items-center">
          <ConnectedBudgetCapsule
            embedded
            showStageHeader={false}
            budgetState={budgetState}
            className="w-full h-[250px] sm:h-[300px] lg:h-[330px]"
          />
        </div>

        {/* Clean Minimal Studio Console */}
        <div className="lg:col-span-5 xl:col-span-4 border-t lg:border-t-0 lg:border-l border-[var(--border-subtle)] p-5 sm:p-6 flex flex-col justify-between gap-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-bold font-display tracking-tight text-[var(--text-primary)]">
                AETHER
              </h2>
              <p className="text-[12.5px] text-[var(--text-secondary)] mt-0.5">
                Interactive 3D cycle reserve
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 text-[12px] font-semibold whitespace-nowrap shrink-0 ${toneStyle.statusText}`}
            >
              <StatusIcon stateKey={effectiveStatusStateKey} />
              <span>{aetherStatusLine}</span>
            </span>
          </div>

          <div className="space-y-3 py-3 border-y border-[var(--border-subtle)]">
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-[32px] sm:text-[36px] font-bold font-mono tabular-nums leading-none tracking-tight ${
                    hud.stateKey === 'unconfigured' || hud.stateKey === 'invalid'
                      ? 'text-[var(--text-secondary)]'
                      : toneStyle.balanceText
                  }`}
                >
                  {hud.stateKey === 'unconfigured' || hud.stateKey === 'invalid'
                    ? 'Standby'
                    : hud.stateKey === 'loading'
                      ? 'Syncing'
                      : `${remainingPctDisplay}%`}
                </span>
                {hud.showFinancialNumbers && (
                  <span className="text-[12.5px] font-medium text-[var(--text-secondary)]">
                    reserve left
                  </span>
                )}
              </div>
              {hud.showFinancialNumbers && (
                <span className="text-[12px] font-mono tabular-nums text-[var(--text-secondary)]">
                  Target ₹{formatCurrency(hud.effectiveBudget)}
                </span>
              )}
            </div>

            {hud.showFinancialNumbers ? (
              <dl className="divide-y divide-[var(--border-subtle)] text-[12.5px]">
                {commitmentsSummary && commitmentsSummary.committedUpcoming30d > 0 ? (
                  <div className="py-2 flex items-center justify-between gap-3">
                    <dt className="text-[var(--text-secondary)]">
                      Safe after bills & splits
                    </dt>
                    <dd className="font-mono font-bold tabular-nums text-[var(--text-primary)]">
                      ₹{formatCurrencyExact(commitmentsSummary.trueSafeToSpend)}
                    </dd>
                  </div>
                ) : (
                  <div className="py-2 flex items-center justify-between gap-3">
                    <dt className="text-[var(--text-secondary)]">Liquid reserve</dt>
                    <dd className="font-mono font-bold tabular-nums text-[var(--text-primary)]">
                      ₹{formatCurrencyExact(hud.primaryAmount)}
                    </dd>
                  </div>
                )}

                {intelligence.pace && (
                  <div className="py-2 flex items-center justify-between gap-3">
                    <dt className="text-[var(--text-secondary)]">Daily burn vs. plan</dt>
                    <dd className="font-mono font-semibold tabular-nums text-[var(--text-primary)]">
                      ₹{formatCurrency(intelligence.pace.actualDailyAverage)}/d{' '}
                      <span className="text-[var(--text-muted)] font-normal">
                        / ₹{formatCurrency(intelligence.pace.dailyBudgetAllowance)}/d
                      </span>
                    </dd>
                  </div>
                )}

                {hud.cyclePeriodText && (
                  <div className="pt-2 flex items-center justify-between gap-3">
                    <dt className="text-[var(--text-secondary)]">Active cycle</dt>
                    <dd className="font-mono font-medium tabular-nums text-[var(--text-secondary)]">
                      {hud.cyclePeriodText}
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-[12.5px] text-[var(--text-secondary)] leading-relaxed">
                {hud.statusDescription}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 text-[11.5px] text-[var(--text-muted)]">
            <span className="truncate">Drag or arrow keys to orbit</span>
            <span className="font-mono shrink-0">R / double-click reset</span>
          </div>
        </div>
      </section>

      {/* 3. BUDGET TRAJECTORY (Pacing, Daily Burn Comparison, Cycle-End Projection, Category Watch) */}
      {hud.showFinancialNumbers && intelligence.isAvailable && intelligence.hasAnyDetails && (
        <section
          aria-label="Budget trajectory"
          data-testid="aether-intelligence-panel"
          className="surface-card p-5 sm:p-6 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-[16px] font-semibold font-display tracking-tight text-[var(--text-primary)]">
                Budget Trajectory
              </h2>
              <p className="text-[12.5px] text-[var(--text-secondary)] mt-0.5">
                {trajectorySubtitle}
              </p>
            </div>
            <button
              type="button"
              data-testid="aether-intelligence-toggle"
              aria-expanded={showDetails}
              aria-controls="aether-intelligence-details"
              onClick={() => setShowDetails((prev) => !prev)}
              className="inline-flex items-center gap-1.5 min-h-[34px] px-3 rounded-xl text-[12px] font-semibold text-[var(--accent-ink)] bg-[var(--accent-primary-soft)] hover:bg-[var(--accent-primary-soft-hover)] border border-[var(--accent-border)] transition-colors whitespace-nowrap shrink-0"
            >
              <span>{showDetails ? 'Hide details' : 'How it’s calculated'}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-150 ${
                  showDetails ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </button>
          </div>

          <dl
            className={`border-t border-[var(--border-subtle)] pt-3.5 grid grid-cols-1 ${intelGridClass} divide-y md:divide-y-0 md:divide-x divide-[var(--border-subtle)]`}
          >
            {intelligence.pace && (
              <div
                data-testid="aether-insight-pace"
                className="py-2.5 md:py-0.5 md:pr-5 first:pt-0.5 space-y-2"
              >
                <div>
                  <dt className="text-[12px] font-medium text-[var(--text-secondary)]">
                    Spending pace
                  </dt>
                  <dd
                    className={`font-mono text-[15px] font-bold tabular-nums mt-0.5 ${
                      INTEL_TONE_INK[intelligence.pace.tone]
                    }`}
                  >
                    {intelligence.pace.metricText}
                  </dd>
                  <dd className="text-[12.5px] text-[var(--text-primary)] font-medium mt-0.5">
                    {intelligence.pace.summary}
                    <span className="text-[var(--text-secondary)] font-normal">
                      {' '}
                      ({hud.consumedPct}% used vs {hud.cycleElapsedPct}% elapsed)
                    </span>
                  </dd>
                </div>

                {intelligence.pace.dailyBudgetAllowance > 0 && (
                  <div className="space-y-1 pt-1 max-w-md">
                    <div className="flex items-center justify-between text-[11.5px] font-mono tabular-nums text-[var(--text-secondary)]">
                      <span>Actual ₹{formatCurrency(intelligence.pace.actualDailyAverage)}/d</span>
                      <span>Plan ₹{formatCurrency(intelligence.pace.dailyBudgetAllowance)}/d</span>
                    </div>
                    <ProgressBar
                      value={Math.min(100, burnBarRatioPct)}
                      tone={
                        intelligence.pace.tone === 'danger'
                          ? 'danger'
                          : intelligence.pace.tone === 'warning'
                            ? 'warning'
                            : 'success'
                      }
                      size="sm"
                      label="Daily burn rate compared to daily budget allowance"
                    />
                  </div>
                )}
              </div>
            )}

            {intelligence.projection ? (
              <div
                data-testid="aether-insight-projection"
                className="py-2.5 md:py-0.5 md:px-5 space-y-1"
              >
                <dt className="text-[12px] font-medium text-[var(--text-secondary)]">
                  {formatTrajectoryProjectionTitle(intelligence.projection.outcome)}
                </dt>
                <dd
                  className={`font-mono text-[15px] font-bold tabular-nums mt-0.5 ${
                    INTEL_TONE_INK[intelligence.projection.tone]
                  }`}
                >
                  {intelligence.projection.valueText}
                </dd>
                <dd className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                  At ₹{formatCurrency(intelligence.projection.dailyAverage)}/day across{' '}
                  {intelligence.projection.remainingFutureDays} remaining day
                  {intelligence.projection.remainingFutureDays === 1 ? '' : 's'}.
                </dd>
              </div>
            ) : (
              showProjectionStandby && (
                <div className="py-2.5 md:py-0.5 md:pl-5 space-y-1">
                  <dt className="text-[12px] font-medium text-[var(--text-secondary)]">
                    Cycle-end projection
                  </dt>
                  <dd className="font-mono text-[14px] font-semibold text-[var(--text-secondary)] mt-0.5">
                    Pending spending history
                  </dd>
                  <dd className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                    {intelligence.omittedReasons.projection}
                  </dd>
                </div>
              )
            )}

            {intelligence.categoryAttention && (
              <div
                data-testid="aether-insight-category"
                className="py-2.5 md:py-0.5 md:pl-5 last:pb-0.5 space-y-1.5"
              >
                <div>
                  <dt className="text-[12px] font-medium text-[var(--text-secondary)]">
                    Category watch
                  </dt>
                  <dd
                    className={`font-mono text-[15px] font-bold tabular-nums mt-0.5 ${
                      INTEL_TONE_INK[intelligence.categoryAttention.tone]
                    }`}
                  >
                    {intelligence.categoryAttention.metricText}
                  </dd>
                  <dd className="text-[12.5px] text-[var(--text-primary)] font-medium mt-0.5">
                    {intelligence.categoryAttention.summary}
                  </dd>
                </div>
                {onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('insights', 'radar')}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--accent-ink)] hover:underline"
                  >
                    <span>Review category</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </dl>

          {showDetails && (
            <div
              id="aether-intelligence-details"
              data-testid="aether-intelligence-details"
              className="aether-disclosure-panel rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] px-4 py-3 space-y-2 text-[12.5px] leading-relaxed text-[var(--text-tertiary)]"
            >
              {intelligence.pace && (
                <p>
                  <span className="font-semibold text-[var(--text-primary)]">Pace: </span>
                  {intelligence.pace.explanation}
                </p>
              )}
              {intelligence.projection ? (
                <p>
                  <span className="font-semibold text-[var(--text-primary)]">
                    Cycle-end estimate:{' '}
                  </span>
                  {intelligence.projection.assumption}
                </p>
              ) : (
                intelligence.omittedReasons.projection &&
                budgetState.status === 'active' && (
                  <p>
                    <span className="font-semibold text-[var(--text-primary)]">
                      Cycle-end estimate:{' '}
                    </span>
                    {intelligence.omittedReasons.projection}
                  </p>
                )
              )}
              {intelligence.categoryAttention && (
                <p>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {intelligence.categoryAttention.category}:{' '}
                  </span>
                  {intelligence.categoryAttention.explanation}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {/* Screen-reader summary of integrated budget state */}
      <span className="sr-only">{hud.ariaAnnouncement}</span>
    </div>
  );
}

export default AetherBudgetHud;
