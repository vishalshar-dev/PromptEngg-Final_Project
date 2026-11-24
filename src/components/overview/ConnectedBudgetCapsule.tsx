import { useMemo } from 'react';
import { useAppStore } from '../../store/useStore';
import { BudgetCapsule3D } from './BudgetCapsule3D';
import {
  deriveCapsuleBudgetState,
  type CapsuleBudgetState,
} from './capsule/capsuleBudgetState';

export interface ConnectedBudgetCapsuleProps {
  className?: string;
  minHeight?: number | string;
  embedded?: boolean;
  showStageHeader?: boolean;
  budgetState?: CapsuleBudgetState;
}

export function ConnectedBudgetCapsule({
  className = '',
  minHeight,
  embedded = false,
  showStageHeader = true,
  budgetState: budgetStateProp,
}: ConnectedBudgetCapsuleProps) {
  const transactions = useAppStore((s) => s.transactions);
  const totalBudget = useAppStore((s) => s.totalBudget);
  const budgetResetDay = useAppStore((s) => s.budgetResetDay);
  const budgetRolloverEnabled = useAppStore((s) => s.budgetRolloverEnabled);
  const theme = useAppStore((s) => s.theme);

  const derivedState = useMemo(() => {
    if (budgetStateProp) return budgetStateProp;
    return deriveCapsuleBudgetState({
      transactions,
      totalBudget,
      budgetResetDay,
      budgetRolloverEnabled,
    });
  }, [
    budgetStateProp,
    transactions,
    totalBudget,
    budgetResetDay,
    budgetRolloverEnabled,
  ]);

  const ariaSummary =
    derivedState.status === 'unconfigured'
      ? 'Monthly budget capsule: no monthly budget configured.'
      : derivedState.status === 'invalid'
        ? 'Monthly budget capsule: financial data unavailable.'
        : derivedState.status === 'exceeded'
          ? `Monthly budget capsule: 0% remaining, exceeded by ₹${derivedState.overspendAmount}.`
          : `Monthly budget capsule: ${Math.round(derivedState.remainingPct)}% remaining (₹${derivedState.clampedRemainingAmount} of ₹${derivedState.effectiveBudget}).`;

  return (
    <div
      data-testid="connected-budget-capsule"
      data-budget-status={derivedState.status}
      data-remaining-pct={String(derivedState.remainingPct)}
      data-remaining-amount={String(derivedState.rawRemainingAmount)}
      data-overspend-amount={String(derivedState.overspendAmount)}
      data-effective-budget={String(derivedState.effectiveBudget)}
      data-active-spent={String(derivedState.activeSpent)}
      className={className}
    >
      <BudgetCapsule3D
        fillRatio={derivedState.fillRatio}
        visualState={derivedState.visualState}
        themeMode={theme}
        minHeight={minHeight}
        embedded={embedded}
        showStageHeader={showStageHeader}
        ariaLabel={ariaSummary}
      />
    </div>
  );
}

export default ConnectedBudgetCapsule;
