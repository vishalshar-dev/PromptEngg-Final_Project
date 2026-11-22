import { useMemo, useState } from 'react';
import { Receipt, Users, Wallet, TrendingDown } from 'lucide-react';
import { MetricCard } from '../ui/MetricCard';
import { Ledger } from '../ledgers/Ledger';
import { SplitLedgerDashboard } from '../splits/SplitLedgerDashboard';
import { useAppStore } from '../../store/useStore';
import { formatCurrencyExact } from '../../utils/categoryStyles';
import { computeBudgetCycleSummary } from '../../utils/budgetCycle';
import { computeLedgerState } from '../../utils/splitLedgerEngine';

export type ExpensesTab = 'transactions' | 'splits';

export function ExpensesDashboard({
  initialTab = 'transactions',
}: {
  initialTab?: ExpensesTab;
}) {
  const [activeTab, setActiveTab] = useState<ExpensesTab>(initialTab);
  const transactions = useAppStore((s) => s.transactions);
  const totalBudget = useAppStore((s) => s.totalBudget);
  const budgetResetDay = useAppStore((s) => s.budgetResetDay);
  const budgetRolloverEnabled = useAppStore((s) => s.budgetRolloverEnabled);
  const people = useAppStore((s) => s.people);
  const sharedExpenses = useAppStore((s) => s.sharedExpenses);
  const settlements = useAppStore((s) => s.settlements);

  const cycleSummary = useMemo(
    () =>
      computeBudgetCycleSummary({
        transactions,
        totalBudget,
        resetDay: budgetResetDay,
        rolloverEnabled: budgetRolloverEnabled,
      }),
    [transactions, totalBudget, budgetResetDay, budgetRolloverEnabled]
  );

  const activeCount = useMemo(
    () => transactions.filter((t) => t.status !== 'cancelled').length,
    [transactions]
  );

  const cycleSpent = cycleSummary.currentSpent;
  const effectiveBudget = cycleSummary.effectiveBudget;
  const remaining = cycleSummary.remainingBudget;

  const ledgerState = useMemo(
    () => computeLedgerState(people, sharedExpenses, settlements),
    [people, sharedExpenses, settlements]
  );

  const netSplit =
    ledgerState.dashboard.totalOwedToMe - ledgerState.dashboard.totalIOwe;

  return (
    <div className="space-y-5">
      {/* Header + Integrated Underline Tab Strip */}
      <div className="border-b border-[#E7EAF0]">
        <div className="pb-4">
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-[#151922] leading-tight">
            Expenses
          </h1>
          <p className="text-[13.5px] text-[#697386] mt-1 max-w-2xl leading-relaxed">
            Manage personal transactions, classify spending, and settle shared group bills.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Expenses views"
          className="flex items-center gap-6 -mb-px overflow-x-auto no-scrollbar"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'transactions'}
            onClick={() => setActiveTab('transactions')}
            className={`flex items-center gap-2 pb-3 text-[13.5px] font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'transactions'
                ? 'border-[#365FE8] text-[#365FE8]'
                : 'border-transparent text-[#697386] hover:text-[#151922]'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Transactions ({transactions.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'splits'}
            onClick={() => setActiveTab('splits')}
            className={`flex items-center gap-2 pb-3 text-[13.5px] font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'splits'
                ? 'border-[#365FE8] text-[#365FE8]'
                : 'border-transparent text-[#697386] hover:text-[#151922]'
            }`}
          >
            <Users className="w-4 h-4" />
            Shared Splits ({sharedExpenses.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Cycle Spent"
          value={`₹${formatCurrencyExact(cycleSpent)}`}
          sublabel={`${cycleSummary.window.label} · ${activeCount} logged`}
          icon={TrendingDown}
          tone="default"
        />
        <MetricCard
          label="Budget Remaining"
          value={`${remaining < 0 ? '-' : ''}₹${formatCurrencyExact(Math.abs(remaining))}`}
          sublabel={`of ₹${formatCurrencyExact(effectiveBudget)}`}
          icon={Wallet}
          tone={remaining < 0 ? 'danger' : 'success'}
        />
        <MetricCard
          label="Owed to You"
          value={`₹${formatCurrencyExact(ledgerState.dashboard.totalOwedToMe)}`}
          sublabel={`${people.length} tracked contacts`}
          icon={Users}
          tone="brand"
        />
        <MetricCard
          label="Net Split Position"
          value={`${netSplit >= 0 ? '+' : '-'}₹${formatCurrencyExact(Math.abs(netSplit))}`}
          sublabel={netSplit >= 0 ? 'Net receivable' : 'Net payable'}
          icon={Receipt}
          tone={netSplit >= 0 ? 'success' : 'warning'}
        />
      </div>

      {activeTab === 'transactions' ? (
        <Ledger onOpenSplitLedger={() => setActiveTab('splits')} />
      ) : (
        <SplitLedgerDashboard />
      )}
    </div>
  );
}
