import { useMemo, useState } from 'react';
import { Receipt, Users, Wallet, TrendingDown } from 'lucide-react';
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

      {/* Single hairline summary strip shown only on Transactions; Shared Splits shows its own split balance strip */}
      {activeTab === 'transactions' && (
        <div className="bg-white border border-[#E7EAF0] rounded-2xl grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E7EAF0]">
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
                Cycle Spent
              </span>
              <TrendingDown className="w-4 h-4 text-[#929BAB]" />
            </div>
            <p className="text-xl font-bold font-mono tabular-nums text-[#151922] mt-1.5">
              ₹{formatCurrencyExact(cycleSpent)}
            </p>
            <p className="text-[11.5px] text-[#697386] mt-0.5 truncate">
              {cycleSummary.window.label} · {activeCount} logged
            </p>
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
                Budget Remaining
              </span>
              <Wallet className="w-4 h-4 text-[#929BAB]" />
            </div>
            <p
              className={`text-xl font-bold font-mono tabular-nums mt-1.5 ${
                remaining < 0 ? 'text-[#DE5252]' : 'text-[#15966B]'
              }`}
            >
              {remaining < 0 ? '-' : ''}₹{formatCurrencyExact(Math.abs(remaining))}
            </p>
            <p className="text-[11.5px] text-[#697386] mt-0.5 truncate">
              of ₹{formatCurrencyExact(effectiveBudget)}
            </p>
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
                Owed to You
              </span>
              <Users className="w-4 h-4 text-[#929BAB]" />
            </div>
            <p className="text-xl font-bold font-mono tabular-nums text-[#365FE8] mt-1.5">
              ₹{formatCurrencyExact(ledgerState.dashboard.totalOwedToMe)}
            </p>
            <p className="text-[11.5px] text-[#697386] mt-0.5 truncate">
              {people.length} tracked contacts
            </p>
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
                Net Split Position
              </span>
              <Receipt className="w-4 h-4 text-[#929BAB]" />
            </div>
            <p
              className={`text-xl font-bold font-mono tabular-nums mt-1.5 ${
                netSplit >= 0 ? 'text-[#15966B]' : 'text-[#9E6614]'
              }`}
            >
              {netSplit >= 0 ? '+' : '-'}₹{formatCurrencyExact(Math.abs(netSplit))}
            </p>
            <p className="text-[11.5px] text-[#697386] mt-0.5 truncate">
              {netSplit >= 0 ? 'Net receivable' : 'Net payable'}
            </p>
          </div>
        </div>
      )}

      {activeTab === 'transactions' ? (
        <Ledger onOpenSplitLedger={() => setActiveTab('splits')} />
      ) : (
        <SplitLedgerDashboard />
      )}
    </div>
  );
}
