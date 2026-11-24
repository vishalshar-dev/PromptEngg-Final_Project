import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CircleSlash,
  Clock,
  Gauge,
  Pencil,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { formatCurrency, formatCurrencyExact } from '../../utils/categoryStyles';
import { ProgressBar } from '../ui/ProgressBar';
import { ConnectedBudgetCapsule } from './ConnectedBudgetCapsule';
import { deriveCapsuleBudgetState } from './capsule/capsuleBudgetState';
import {
  deriveAetherHudModel,
  type AetherHudStateKey,
  type AetherHudTone,
} from './capsule/aetherHudModel';
import { useAnimatedNumber } from './capsule/useAnimatedNumber';

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
    statusText: 'text-[#0D5E43]',
    balanceText: 'text-[#0D5E43]',
    progressTone: 'success',
  },
  warning: {
    statusText: 'text-[#9E6614]',
    balanceText: 'text-[#C7851F]',
    progressTone: 'warning',
  },
  danger: {
    statusText: 'text-[#C23838]',
    balanceText: 'text-[#DE5252]',
    progressTone: 'danger',
  },
  neutral: {
    statusText: 'text-[#697386]',
    balanceText: 'text-[#151922]',
    progressTone: 'brand',
  },
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

export function AetherBudgetHud() {
  const transactions = useAppStore((s) => s.transactions);
  const totalBudget = useAppStore((s) => s.totalBudget);
  const setTotalBudget = useAppStore((s) => s.setTotalBudget);
  const budgetResetDay = useAppStore((s) => s.budgetResetDay);
  const budgetRolloverEnabled = useAppStore((s) => s.budgetRolloverEnabled);

  const isHydrated = useStoreHydrated();
  const reducedMotion = usePrefersReducedMotion();

  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState(() =>
    totalBudget > 0 ? String(totalBudget) : ''
  );
  const [budgetError, setBudgetError] = useState<string | null>(null);

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

  const animatedPrimary = useAnimatedNumber(hud.primaryAmount, reducedMotion);
  const animatedSpent = useAnimatedNumber(hud.activeSpent, reducedMotion);
  const animatedOverspend = useAnimatedNumber(hud.overspendAmount, reducedMotion);

  const toneStyle = TONE_CLASSES[hud.tone];

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

  return (
    <section
      aria-label="Budget overview"
      data-testid="aether-budget-hud"
      data-hud-state={hud.stateKey}
      className="hero-deck p-5 sm:p-7"
    >
      {/* Instrument Identity & Live Status Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E7EAF0]">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px]">
          <span className="font-semibold text-[#151922] tracking-tight">
            Aether Budget Intelligence
          </span>
          {hud.showCycleMetadata && hud.cyclePeriodText && (
            <>
              <span className="text-[#929BAB]" aria-hidden="true">
                ·
              </span>
              <span
                data-testid="overview-cycle-window"
                className="font-mono font-medium text-[#697386] tabular-nums"
              >
                {hud.cyclePeriodText}
              </span>
            </>
          )}
          {hud.showCycleMetadata && hud.rolloverText && (
            <>
              <span className="text-[#929BAB]" aria-hidden="true">
                ·
              </span>
              <span
                data-testid="overview-rollover-badge"
                className={`font-mono font-semibold tabular-nums ${
                  budgetState.rolloverDelta > 0
                    ? 'text-[#0D5E43]'
                    : 'text-[#9E6614]'
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
          className={`inline-flex items-center gap-1.5 text-[12.5px] font-semibold transition-opacity duration-200 ${toneStyle.statusText}`}
        >
          <StatusIcon stateKey={hud.stateKey} />
          <span>{hud.statusLabel}</span>
        </div>
      </div>

      {/* Balanced Instrument Grid: Primary Balance + 3D Capsule Centerpiece + Spending Intelligence */}
      <div className="mt-4 sm:mt-6 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-x-8 lg:gap-y-6 items-start">
        {/* Slot 1: Primary Financial Display */}
        <div className="lg:col-span-7 min-w-0 space-y-3.5 sm:space-y-4">
          {hud.stateKey === 'loading' ? (
            <div className="space-y-3" aria-busy="true">
              <div className="h-3.5 w-28 rounded bg-[#E7EAF0]" />
              <div className="h-11 w-48 rounded-lg bg-[#E7EAF0]" />
              <div className="h-4 w-56 rounded bg-[#E7EAF0]" />
            </div>
          ) : hud.stateKey === 'unconfigured' || hud.stateKey === 'invalid' ? (
            <div className="space-y-3.5">
              <p className="text-[12.5px] font-medium text-[#697386]">
                {hud.stateKey === 'invalid' ? 'Budget reserve status' : 'Monthly budget setup'}
              </p>
              <h2 className="text-[24px] sm:text-[28px] font-bold tracking-tight text-[#151922] leading-tight text-balance">
                {hud.stateKey === 'invalid'
                  ? 'Financial data unavailable'
                  : 'No monthly budget configured'}
              </h2>
              <p className="text-[13.5px] text-[#697386] leading-relaxed max-w-xl">
                {hud.statusDescription}
              </p>

              {!editingBudget ? (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleOpenEditBudget}
                    data-testid="aether-setup-budget-btn"
                    className="btn-primary px-4 py-2.5 text-[13px] min-h-[44px] whitespace-nowrap"
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
                    className="block text-[12px] font-semibold text-[#697386]"
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
                      className="btn-primary min-h-[44px] px-4 py-2 text-[13px] whitespace-nowrap shrink-0"
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
                      className="btn-secondary min-h-[44px] px-3 py-2 text-[13px] shrink-0"
                    >
                      Cancel
                    </button>
                  </div>
                  {budgetError && (
                    <p className="text-[12px] font-medium text-[#DE5252]">
                      {budgetError}
                    </p>
                  )}
                </form>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="text-[12.5px] font-medium text-[#697386]">
                {hud.primaryLabel}
              </p>

              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p
                  data-testid="overview-remaining-balance"
                  aria-label={`${hud.primaryLabel}: ₹${formatCurrencyExact(hud.primaryAmount)}`}
                  className={`text-[36px] sm:text-[44px] xl:text-[48px] font-bold font-mono tabular-nums tracking-tight leading-none break-words ${
                    hud.stateKey === 'overspent' || hud.stateKey === 'depleted'
                      ? 'text-[#DE5252]'
                      : toneStyle.balanceText
                  }`}
                >
                  ₹{formatAnimatedCurrency(animatedPrimary, hud.primaryAmount)}
                </p>
                <span className="text-[13.5px] font-mono font-semibold tabular-nums text-[#697386]">
                  {remainingPctDisplay}% remaining
                </span>
              </div>

              <p className="text-[13.5px] text-[#697386] leading-snug">
                of{' '}
                <span className="font-mono font-semibold text-[#151922] tabular-nums">
                  ₹{formatCurrency(hud.effectiveBudget)}
                </span>{' '}
                {budgetState.rolloverDelta !== 0 ? 'effective cycle budget' : 'monthly budget'}
                <span className="text-[#929BAB]" aria-hidden="true">
                  {' '}
                  ·{' '}
                </span>
                <span>{hud.statusDescription}</span>
              </p>

              {hud.stateKey === 'overspent' && (
                <div
                  role="alert"
                  data-testid="aether-overspend-alert"
                  className="mt-2 rounded-xl px-3.5 py-2.5 bg-[#FDECEC] border border-[#F6B8B8] flex flex-wrap items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 text-[#B93B3B] font-semibold text-[13px]">
                    <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>
                      Over budget by{' '}
                      <span className="font-mono tabular-nums">
                        ₹{formatAnimatedCurrency(animatedOverspend, hud.overspendAmount)}
                      </span>
                    </span>
                  </div>
                  <span className="text-[12px] font-mono font-semibold tabular-nums text-[#B93B3B]">
                    Net balance -₹{formatCurrencyExact(hud.overspendAmount)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Slot 2: 3D Bioluminescent Energy Capsule Centerpiece */}
        <div className="lg:col-span-5 lg:row-span-2 lg:self-center w-full">
          <ConnectedBudgetCapsule
            embedded
            showStageHeader={false}
            budgetState={budgetState}
            className="w-full h-[244px] sm:h-[305px] lg:h-[360px]"
          />
        </div>

        {/* Slot 3: Spending Intelligence & Cycle Pace */}
        <div className="lg:col-span-7 min-w-0 pt-4 sm:pt-5 border-t border-[#E7EAF0] space-y-4 sm:space-y-5">
          {hud.stateKey === 'loading' ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="h-12 rounded bg-[#E7EAF0]" />
              <div className="h-12 rounded bg-[#E7EAF0]" />
              <div className="h-12 rounded bg-[#E7EAF0]" />
            </div>
          ) : hud.showFinancialNumbers ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-4">
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-[#697386]">
                    Spent this cycle
                  </p>
                  <p
                    data-testid="overview-total-spent"
                    className="text-[18px] sm:text-[20px] font-bold font-mono tabular-nums text-[#151922] mt-1 whitespace-nowrap"
                  >
                    ₹{formatAnimatedCurrency(animatedSpent, hud.activeSpent)}
                  </p>
                  <p className="text-[11.5px] font-mono text-[#697386] tabular-nums mt-0.5">
                    <span data-testid="overview-utilization">{hud.consumedPct}%</span> consumed
                  </p>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] font-medium text-[#697386] whitespace-nowrap">
                      Monthly budget
                    </span>
                    {!editingBudget && (
                      <button
                        type="button"
                        onClick={handleOpenEditBudget}
                        aria-label="Edit total budget"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-[#697386] hover:text-[#365FE8] hover:bg-[#EDF2FF] transition-colors shrink-0"
                      >
                        <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>

                  {!editingBudget ? (
                    <>
                      <p
                        data-testid="overview-total-budget"
                        className="text-[18px] sm:text-[20px] font-bold font-mono tabular-nums text-[#151922] mt-1 whitespace-nowrap"
                      >
                        ₹{formatCurrency(hud.effectiveBudget)}
                      </p>
                      <p className="text-[11.5px] text-[#697386] mt-0.5 truncate">
                        {budgetState.activeTransactionCount} active expense
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
                          className="input-field w-24 sm:w-28 min-h-[38px] px-2.5 py-1.5 text-[14px] font-mono font-semibold tabular-nums"
                        />
                        <button
                          type="submit"
                          aria-label="Save budget"
                          className="w-9 h-9 rounded-lg bg-[#365FE8] hover:bg-[#294FCC] text-white flex items-center justify-center shrink-0"
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
                          className="w-9 h-9 rounded-lg bg-[#F1F3F6] hover:bg-[#E7EAF0] text-[#697386] flex items-center justify-center shrink-0"
                        >
                          <X className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                      {budgetError && (
                        <p className="text-[11px] font-medium text-[#DE5252]">
                          {budgetError}
                        </p>
                      )}
                    </form>
                  )}
                </div>

                <div className="col-span-2 sm:col-span-1 min-w-0">
                  <p className="text-[12px] font-medium text-[#697386]">
                    Cycle progress
                  </p>
                  <p className="text-[16px] sm:text-[18px] font-bold font-mono tabular-nums text-[#151922] mt-1 whitespace-nowrap">
                    {hud.cycleElapsedPct}% elapsed
                  </p>
                  <p className="text-[11.5px] font-mono text-[#697386] tabular-nums mt-0.5">
                    {hud.cyclePaceText}
                  </p>
                </div>
              </div>

              {/* Complementary Spend vs. Elapsed Cycle Pace Indicator */}
              <div
                className="pt-4 border-t border-[#E7EAF0] space-y-2"
                data-testid="overview-budget-progress"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
                  <span className="font-medium text-[#697386]">
                    Spending vs. cycle pace
                  </span>
                  <span className="font-mono font-semibold tabular-nums text-[#151922]">
                    ₹{formatCurrencyExact(hud.activeSpent)} / ₹
                    {formatCurrency(hud.effectiveBudget)}
                  </span>
                </div>

                <ProgressBar
                  value={hud.cycleBarPct}
                  tone={toneStyle.progressTone}
                  size="md"
                  label="Current spend against cycle budget and elapsed days"
                  markerPct={hud.effectiveBudget > 0 ? hud.cycleElapsedPct : undefined}
                  markerLabel={`Cycle pace: ${hud.cycleElapsedPct}% elapsed (${hud.cyclePaceText})`}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-[#697386]">
              <span>
                {hud.stateKey === 'unconfigured'
                  ? 'Spending telemetry and cycle tracking activate once a budget target is set.'
                  : 'Existing expenses remain preserved in your Expenses ledger.'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Screen-reader summary of integrated instrument */}
      <span className="sr-only">{hud.ariaAnnouncement}</span>
    </section>
  );
}

export default AetherBudgetHud;
