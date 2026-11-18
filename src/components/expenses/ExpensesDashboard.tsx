import { useMemo, useState } from 'react';
import { Receipt, Users, Wallet, TrendingDown } from 'lucide-react';
import { PageHeader } from '../ui/PageHeader';
import { MetricCard } from '../ui/MetricCard';
import { Ledger } from '../ledgers/Ledger';
import { SplitLedgerDashboard } from '../splits/SplitLedgerDashboard';
import { useAppStore } from '../../store/useStore';
import { formatCurrencyExact } from '../../utils/categoryStyles';
import { getEffectiveTransactionAmount } from '../../utils/martEngine';
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
  const people = useAppStore((s) => s.people);
  const sharedExpenses = useAppStore((s) => s.sharedExpenses);
  const settlements = useAppStore((s) => s.settlements);

  const totalSpent = useMemo(
    () =>
      transactions.reduce(
        (sum, tx) => sum + getEffectiveTransactionAmount(tx),
        0
      ),
    [transactions]
  );

  const activeCount = useMemo(
    () => transactions.filter((t) => t.status !== 'cancelled').length,
    [transactions]
  );

  const remaining = totalBudget - totalSpent;

  const ledgerState = useMemo(
    () => computeLedgerState(people, sharedExpenses, settlements),
    [people, sharedExpenses, settlements]
  );

  const netSplit =
    ledgerState.dashboard.totalOwedToMe - ledgerState.dashboard.totalIOwe;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Manage personal transactions, classify spending, and settle shared group bills."
        actions={
          <div
            role="tablist"
            aria-label="Expenses views"
            className="inline-flex items-center p-1 rounded-xl bg-white border border-[#E7EAF0] shadow-xs"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'transactions'}
              onClick={() => setActiveTab('transactions')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'transactions'
                  ? 'bg-[#365FE8] text-white'
                  : 'text-[#697386] hover:text-[#151922]'
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
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'splits'
                  ? 'bg-[#365FE8] text-white'
                  : 'text-[#697386] hover:text-[#151922]'
              }`}
            >
              <Users className="w-4 h-4" />
              Shared Splits ({sharedExpenses.length})
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Total Spent"
          value={`₹${formatCurrencyExact(totalSpent)}`}
          sublabel={`${activeCount} active transactions`}
          icon={TrendingDown}
          tone="default"
        />
        <MetricCard
          label="Budget Remaining"
          value={`${remaining < 0 ? '-' : ''}₹${formatCurrencyExact(Math.abs(remaining))}`}
          sublabel={`of ₹${formatCurrencyExact(totalBudget)}`}
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
