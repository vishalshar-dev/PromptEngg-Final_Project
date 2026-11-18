import { useMemo, useState } from 'react';
import {
  Ban,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Pencil,
  Printer,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import type { Transaction } from '../../types/models';
import { formatCurrencyExact } from '../../utils/categoryStyles';
import {
  buildRadarFinancialReport,
  buildRadarReportCsv,
  buildRadarReportHtml,
  queryRadarTransactions,
  type ReportPeriodPreset,
  type TransactionSortBy,
} from '../../utils/radarEngine';

interface RadarExplorerReportsTabProps {
  initialCategoryFilter?: string;
  onOpenLedger?: () => void;
}

export function RadarExplorerReportsTab({
  initialCategoryFilter = 'all',
  onOpenLedger,
}: RadarExplorerReportsTabProps) {
  const transactions = useAppStore((s) => s.transactions);
  const categories = useAppStore((s) => s.categories);
  const categoryCaps = useAppStore((s) => s.categoryCaps);
  const totalBudget = useAppStore((s) => s.totalBudget);
  const updateTransaction = useAppStore((s) => s.updateTransaction);
  const refundTransaction = useAppStore((s) => s.refundTransaction);
  const cancelTransaction = useAppStore((s) => s.cancelTransaction);
  const removeTransaction = useAppStore((s) => s.removeTransaction);

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>(initialCategoryFilter);
  const [statusFilter, setStatusFilter] = useState<
    'active_only' | 'all' | 'refunded' | 'cancelled'
  >('active_only');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<TransactionSortBy>('date_desc');

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDate, setEditDate] = useState('');

  const [reportPreset, setReportPreset] = useState<ReportPeriodPreset>('monthly');

  const categoryChoices = useMemo(() => {
    const set = new Set<string>(categories);
    for (const tx of transactions) {
      if (tx.category) set.add(tx.category);
    }
    return Array.from(set);
  }, [categories, transactions]);

  const txQueryResult = useMemo(
    () =>
      queryRadarTransactions(transactions, {
        search,
        category: catFilter,
        status: statusFilter,
        startDate,
        endDate,
        sortBy,
      }),
    [transactions, search, catFilter, statusFilter, startDate, endDate, sortBy]
  );

  const report = useMemo(
    () =>
      buildRadarFinancialReport({
        transactions,
        categories: categoryChoices,
        categoryCaps,
        totalBudget,
        periodPreset: reportPreset,
      }),
    [transactions, categoryChoices, categoryCaps, totalBudget, reportPreset]
  );

  const openEditor = (tx: Transaction) => {
    setEditingTx(tx);
    setEditName(tx.name);
    setEditAmount(String(tx.amount));
    setEditCategory(tx.category);
    const d = new Date(tx.timestamp);
    if (!Number.isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setEditDate(`${y}-${m}-${day}`);
    } else {
      setEditDate('');
    }
  };

  const handleSaveEdit = () => {
    if (!editingTx) return;
    const amt = Number(editAmount);
    if (!editName.trim() || !Number.isFinite(amt) || amt <= 0) return;
    let nextTimestamp = editingTx.timestamp;
    if (editDate) {
      const orig = new Date(editingTx.timestamp);
      const [y, m, d] = editDate.split('-').map(Number);
      if (y && m && d) {
        const merged = new Date(
          y,
          m - 1,
          d,
          Number.isNaN(orig.getTime()) ? 12 : orig.getHours(),
          Number.isNaN(orig.getTime()) ? 0 : orig.getMinutes()
        );
        nextTimestamp = merged.toISOString();
      }
    }
    updateTransaction(editingTx.id, {
      name: editName.trim(),
      amount: amt,
      category: editCategory,
      timestamp: nextTimestamp,
    });
    setEditingTx(null);
  };

  const handleDownloadCsv = () => {
    const csv = buildRadarReportCsv(report, transactions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `radar-report-${report.periodPreset}-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadHtmlReport = () => {
    const html = buildRadarReportHtml(report);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `radar-report-${report.periodPreset}-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Financial Reports & Export */}
      <section className="surface-card p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#365FE8]" />
              <h3 className="text-sm font-bold text-[#151922]">
                Structured Financial Reports
              </h3>
            </div>
            <p className="text-xs text-[#697386] mt-0.5">
              Period: <strong className="text-[#151922]">{report.periodLabel}</strong> · Baseline:{' '}
              {report.comparisonLabel}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex items-center bg-[#F1F3F6] border border-[#E7EAF0] rounded-xl p-0.5"
              role="group"
              aria-label="Report period preset"
            >
              {(
                [
                  ['weekly', 'Weekly'],
                  ['monthly', 'Monthly'],
                  ['quarterly', 'Quarterly'],
                  ['yearly', 'Yearly'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setReportPreset(id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    reportPreset === id
                      ? 'bg-[#365FE8] text-white shadow-xs'
                      : 'text-[#697386] hover:text-[#151922]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleDownloadCsv}
              className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={handleDownloadHtmlReport}
              className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              HTML / PDF Report
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="surface-subtle px-3.5 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
              Period Expenditure
            </p>
            <p className="text-base font-bold font-mono tabular-nums text-[#151922] mt-0.5">
              ₹{formatCurrencyExact(report.totalExpenditure)}
            </p>
            <p className="text-[11px] text-[#929BAB] mt-0.5 font-mono tabular-nums">
              {report.expenditureChangePct !== null
                ? `${report.expenditureChangePct > 0 ? '+' : ''}${report.expenditureChangePct}% vs prior`
                : 'No prior baseline'}
            </p>
          </div>
          <div className="surface-subtle px-3.5 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
              Avg Daily Spending
            </p>
            <p className="text-base font-bold font-mono tabular-nums text-[#151922] mt-0.5">
              ₹{formatCurrencyExact(report.avgDailySpending)}
            </p>
            <p className="text-[11px] text-[#929BAB] mt-0.5">{report.transactionCount} transactions</p>
          </div>
          <div className="surface-subtle px-3.5 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
              Budget Performance
            </p>
            <p className="text-base font-bold font-mono tabular-nums text-[#15966B] mt-0.5">
              {report.monthlyBudgetUtilisationPct}%
            </p>
            <p className="text-[11px] text-[#929BAB] mt-0.5 font-mono tabular-nums">
              Remaining ₹{formatCurrencyExact(report.monthlyBudgetRemaining)}
            </p>
          </div>
          <div className="surface-subtle px-3.5 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#697386]">
              Top Expense
            </p>
            <p className="text-base font-bold font-mono tabular-nums text-[#151922] mt-0.5">
              {report.largestTransactions[0]
                ? `₹${formatCurrencyExact(report.largestTransactions[0].amount)}`
                : '—'}
            </p>
            <p className="text-[11px] text-[#929BAB] mt-0.5 truncate">
              {report.largestTransactions[0]?.name ?? 'No expenses in range'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
          <div className="surface-subtle p-3.5">
            <p className="font-semibold uppercase tracking-wider text-[#697386] text-[11px] mb-2">
              Report Highlights &amp; Trend Summary
            </p>
            <p className="text-[#151922] mb-2">{report.trendSummary}</p>
            <ul className="space-y-1 text-[#697386] list-disc pl-4">
              {report.keyInsights.slice(0, 4).map((ins, i) => (
                <li key={i}>{ins}</li>
              ))}
            </ul>
          </div>

          <div className="surface-subtle p-3.5">
            <p className="font-semibold uppercase tracking-wider text-[#697386] text-[11px] mb-2">
              Largest Transactions in Report
            </p>
            {report.largestTransactions.length === 0 ? (
              <p className="text-[#697386]">No transactions recorded during {report.periodLabel}.</p>
            ) : (
              <div className="divide-y divide-[#E7EAF0]">
                {report.largestTransactions.map((t) => (
                  <div key={t.id} className="py-1.5 flex items-center justify-between gap-2">
                    <span className="truncate text-[#151922] font-medium">
                      {t.name} <span className="text-[#697386]">· {t.category}</span>
                    </span>
                    <span className="font-mono tabular-nums font-bold text-[#151922] shrink-0">
                      ₹{formatCurrencyExact(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Transaction-Level Analytics Explorer */}
      <section className="surface-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#151922]">
              Transaction-Level Explorer ({txQueryResult.items.length})
            </h3>
            <p className="text-xs text-[#697386] mt-0.5">
              Reads &amp; updates your centralized transaction ledger directly
            </p>
          </div>
          {onOpenLedger && (
            <button
              type="button"
              onClick={onOpenLedger}
              className="text-xs font-semibold text-[#365FE8] hover:text-[#294FCC] inline-flex items-center gap-1 whitespace-nowrap"
            >
              Open Full Expenses Ledger
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search & Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 mb-4">
          <div className="lg:col-span-2 relative">
            <Search className="w-3.5 h-3.5 text-[#929BAB] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              aria-label="Search transactions"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, category, source..."
              className="input-field w-full pl-8 pr-3 py-2 text-xs"
            />
          </div>

          <select
            aria-label="Filter by category"
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="input-field px-2.5 py-2 text-xs"
          >
            <option value="all">All Categories</option>
            {categoryChoices.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by transaction status"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value as 'active_only' | 'all' | 'refunded' | 'cancelled'
              )
            }
            className="input-field px-2.5 py-2 text-xs"
          >
            <option value="active_only">Active &amp; Partial Refunds</option>
            <option value="all">All Statuses</option>
            <option value="refunded">Refunded Only</option>
            <option value="cancelled">Cancelled Only</option>
          </select>

          <select
            aria-label="Sort transactions"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as TransactionSortBy)}
            className="input-field px-2.5 py-2 text-xs"
          >
            <option value="date_desc">Date: Newest First</option>
            <option value="date_asc">Date: Oldest First</option>
            <option value="amount_desc">Amount: Highest First</option>
            <option value="amount_asc">Amount: Lowest First</option>
          </select>

          <div className="flex items-center gap-1.5">
            <input
              type="date"
              aria-label="Explorer start date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field w-1/2 px-2 py-2 text-[11px]"
            />
            <input
              type="date"
              aria-label="Explorer end date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-field w-1/2 px-2 py-2 text-[11px]"
            />
          </div>
        </div>

        {/* Highlights Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 text-xs">
          <div className="surface-subtle px-3 py-2.5">
            <span className="text-[#697386]">Filtered Spend: </span>
            <strong className="font-mono tabular-nums text-[#151922]">
              ₹{formatCurrencyExact(txQueryResult.totalEffectiveSpend)}
            </strong>
          </div>
          <div className="surface-subtle px-3 py-2.5 truncate">
            <span className="text-[#697386]">Highest Value: </span>
            <strong className="text-[#151922]">
              {txQueryResult.highestTransactions[0]
                ? `${txQueryResult.highestTransactions[0].tx.name} (₹${formatCurrencyExact(txQueryResult.highestTransactions[0].effectiveAmount)})`
                : '—'}
            </strong>
          </div>
          <div className="surface-subtle px-3 py-2.5 truncate">
            <span className="text-[#697386]">Most Frequent: </span>
            <strong className="text-[#151922]">
              {txQueryResult.mostFrequentCategories[0]
                ? `${txQueryResult.mostFrequentCategories[0].category} (${txQueryResult.mostFrequentCategories[0].count}x)`
                : '—'}
            </strong>
          </div>
        </div>

        {/* Inline Edit Drawer if editingTx */}
        {editingTx && (
          <div className="mb-4 rounded-xl bg-[#EDF2FF] border border-[#D4E0FF] p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-xs font-bold text-[#151922]">
                Edit Centralized Transaction
              </p>
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                aria-label="Close transaction editor"
                className="text-[#697386] hover:text-[#151922]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <input
                type="text"
                aria-label="Transaction name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="input-field px-2.5 py-1.5 text-xs"
              />
              <input
                type="number"
                min={1}
                step="0.01"
                aria-label="Transaction amount"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="input-field px-2.5 py-1.5 text-xs font-mono"
              />
              <select
                aria-label="Transaction category"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="input-field px-2.5 py-1.5 text-xs"
              >
                {categoryChoices.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                type="date"
                aria-label="Transaction date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="input-field px-2.5 py-1.5 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="btn-secondary px-3 py-1.5 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="btn-primary px-3 py-1.5 text-xs"
              >
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* Transactions Table */}
        {txQueryResult.items.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-[#D5DBE6] bg-[#F7F8FA] rounded-xl">
            <p className="text-sm font-semibold text-[#151922]">No matching transactions</p>
            <p className="text-xs text-[#697386] mt-1">
              Clear your search or date filters to view all recorded expenses.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b border-[#E7EAF0] text-[11px] uppercase tracking-wider text-[#697386]">
                  <th className="py-2 pr-3 font-semibold">Description</th>
                  <th className="py-2 px-3 font-semibold">Category</th>
                  <th className="py-2 px-3 font-semibold">Date</th>
                  <th className="py-2 px-3 font-semibold">Status</th>
                  <th className="py-2 px-3 font-semibold text-right">Amount</th>
                  <th className="py-2 pl-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7EAF0] text-xs">
                {txQueryResult.items.map(({ tx, effectiveAmount }) => {
                  const inactive = tx.status === 'cancelled' || tx.status === 'refunded';
                  return (
                    <tr key={tx.id} className="hover:bg-[#F7F8FA]">
                      <td className="py-2.5 pr-3">
                        <p className="font-semibold text-[#151922]">{tx.name}</p>
                        <p className="text-[11px] text-[#929BAB]">{tx.source ?? 'manual'}</p>
                      </td>
                      <td className="py-2.5 px-3 text-[#697386]">{tx.category}</td>
                      <td className="py-2.5 px-3 text-[#697386] font-mono tabular-nums">
                        {new Date(tx.timestamp).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`font-semibold ${
                            tx.status === 'cancelled'
                              ? 'text-[#DE5252]'
                              : tx.status === 'refunded'
                                ? 'text-[#9E6614]'
                                : 'text-[#15966B]'
                          }`}
                        >
                          {tx.status === 'cancelled'
                            ? 'Cancelled'
                            : tx.status === 'refunded'
                              ? 'Refunded'
                              : 'Active'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-[#151922]">
                        ₹{formatCurrencyExact(inactive ? tx.amount : effectiveAmount)}
                      </td>
                      <td className="py-2.5 pl-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditor(tx)}
                            aria-label={`Edit transaction ${tx.name}`}
                            className="p-1.5 rounded-lg text-[#697386] hover:text-[#365FE8] hover:bg-[#EDF2FF]"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {!inactive && (
                            <>
                              <button
                                type="button"
                                onClick={() => refundTransaction(tx.id)}
                                aria-label={`Refund transaction ${tx.name}`}
                                className="p-1.5 rounded-lg text-[#697386] hover:text-[#9E6614] hover:bg-[#FEF6E7]"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => cancelTransaction(tx.id)}
                                aria-label={`Cancel transaction ${tx.name}`}
                                className="p-1.5 rounded-lg text-[#697386] hover:text-[#9E6614] hover:bg-[#FEF6E7]"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => removeTransaction(tx.id)}
                            aria-label={`Delete transaction ${tx.name}`}
                            className="p-1.5 rounded-lg text-[#697386] hover:text-[#DE5252] hover:bg-[#FDECEC]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
