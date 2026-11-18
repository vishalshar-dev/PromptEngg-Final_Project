import { useMemo, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Check,
  Info,
  Lightbulb,
  Pencil,
  ShieldCheck,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { formatCurrency, formatCurrencyExact } from '../../utils/categoryStyles';
import type {
  RadarBudgetMonitorResult,
  RadarFinancialInsight,
  RadarInsightKind,
  RadarSpendingAnomaly,
} from '../../utils/radarEngine';

interface RadarBudgetAnomaliesTabProps {
  budgetResult: RadarBudgetMonitorResult;
  anomalies: RadarSpendingAnomaly[];
  insights: RadarFinancialInsight[];
}

export function RadarBudgetAnomaliesTab({
  budgetResult,
  anomalies,
  insights,
}: RadarBudgetAnomaliesTabProps) {
  const setCategoryCap = useAppStore((s) => s.setCategoryCap);
  const setTotalBudget = useAppStore((s) => s.setTotalBudget);

  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetVal, setBudgetVal] = useState(String(budgetResult.totalBudget));
  const [editingCapCat, setEditingCapCat] = useState<string | null>(null);
  const [capInputVal, setCapInputVal] = useState('');
  const [insightFilter, setInsightFilter] = useState<'all' | RadarInsightKind>('all');

  const filteredInsights = useMemo(
    () =>
      insightFilter === 'all'
        ? insights
        : insights.filter((i) => i.kind === insightFilter),
    [insights, insightFilter]
  );

  const handleSaveTotalBudget = () => {
    const n = Number(budgetVal);
    if (Number.isFinite(n) && n > 0) setTotalBudget(n);
    setEditingBudget(false);
  };

  const handleSaveCap = (category: string) => {
    const n = Number(capInputVal);
    if (capInputVal.trim() === '') {
      setCategoryCap(category, null);
    } else if (Number.isFinite(n) && n > 0) {
      setCategoryCap(category, n);
    }
    setEditingCapCat(null);
  };

  return (
    <div className="space-y-5">
      {/* Budget Performance Monitor */}
      <section className="surface-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-[#365FE8]" />
              <h3 className="text-sm font-bold text-[#151922]">
                Budget Performance Monitor ({budgetResult.monthLabel})
              </h3>
            </div>
            <p className="text-xs text-[#697386] mt-0.5">
              Connected directly to your monthly budget &amp; category caps
            </p>
          </div>

          {editingBudget ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#365FE8]">₹</span>
              <input
                type="number"
                min={1}
                aria-label="Monthly budget input"
                value={budgetVal}
                onChange={(e) => setBudgetVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTotalBudget();
                  if (e.key === 'Escape') setEditingBudget(false);
                }}
                className="input-field w-28 px-2.5 py-1 text-xs font-mono"
              />
              <button
                type="button"
                onClick={handleSaveTotalBudget}
                aria-label="Save budget target"
                className="btn-primary px-2.5 py-1 text-xs"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditingBudget(false)}
                className="btn-secondary px-2 py-1 text-xs"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setBudgetVal(String(budgetResult.totalBudget));
                setEditingBudget(true);
              }}
              className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 text-xs whitespace-nowrap"
            >
              <Pencil className="w-3.5 h-3.5 text-[#365FE8]" />
              Edit Monthly Budget
            </button>
          )}
        </div>

        {/* Top Budget Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
          <MiniStat label="Monthly Budget" value={`₹${formatCurrency(budgetResult.totalBudget)}`} />
          <MiniStat
            label="Month Spent"
            value={`₹${formatCurrencyExact(budgetResult.totalMonthSpent)}`}
            valueClass={budgetResult.isOverBudget ? 'text-[#DE5252]' : 'text-[#151922]'}
          />
          <MiniStat
            label="Remaining"
            value={`${budgetResult.remainingBudget < 0 ? '-' : ''}₹${formatCurrencyExact(Math.abs(budgetResult.remainingBudget))}`}
            valueClass={budgetResult.isOverBudget ? 'text-[#DE5252]' : 'text-[#15966B]'}
          />
          <MiniStat
            label="Utilisation"
            value={`${budgetResult.utilisationPct}%`}
            valueClass={
              budgetResult.isOverBudget
                ? 'text-[#DE5252]'
                : budgetResult.utilisationPct >= 80
                  ? 'text-[#9E6614]'
                  : 'text-[#15966B]'
            }
          />
          <MiniStat
            label="Over Cap"
            value={String(budgetResult.categoriesExceedingCount)}
            valueClass={budgetResult.categoriesExceedingCount > 0 ? 'text-[#DE5252]' : 'text-[#151922]'}
          />
          <MiniStat
            label="Within Cap"
            value={String(budgetResult.categoriesWithinCapCount)}
            valueClass="text-[#15966B]"
          />
        </div>

        {/* Budget Performance Observations */}
        {budgetResult.insights.length > 0 && (
          <div className="surface-subtle p-3.5 mb-4 space-y-1.5">
            {budgetResult.insights.map((msg, i) => (
              <p key={i} className="text-xs text-[#151922] flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-[#365FE8] shrink-0 mt-0.5" />
                <span>{msg}</span>
              </p>
            ))}
          </div>
        )}

        {/* Category Budget Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[680px]">
            <thead>
              <tr className="border-b border-[#E7EAF0] text-[11px] uppercase tracking-wider text-[#697386]">
                <th className="py-2 pr-3 font-semibold">Category</th>
                <th className="py-2 px-3 font-semibold text-right">Allocated Cap</th>
                <th className="py-2 px-3 font-semibold text-right">Actual ({budgetResult.monthLabel})</th>
                <th className="py-2 px-3 font-semibold text-right">Remaining</th>
                <th className="py-2 px-3 font-semibold text-right">Utilisation</th>
                <th className="py-2 px-3 font-semibold text-right">vs {budgetResult.previousMonthLabel}</th>
                <th className="py-2 pl-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7EAF0] text-xs">
              {budgetResult.rows.map((row) => {
                const isEditing = editingCapCat === row.category;
                const statusBadge =
                  row.status === 'exceeded'
                    ? 'text-[#DE5252]'
                    : row.status === 'approaching'
                      ? 'text-[#9E6614]'
                      : row.status === 'within'
                        ? 'text-[#15966B]'
                        : 'text-[#929BAB]';

                return (
                  <tr key={row.category} className="hover:bg-[#F7F8FA]">
                    <td className="py-2.5 pr-3 font-semibold text-[#151922]">{row.category}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#151922]">
                      {isEditing ? (
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            aria-label={`Cap amount for ${row.category}`}
                            value={capInputVal}
                            onChange={(e) => setCapInputVal(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveCap(row.category);
                              if (e.key === 'Escape') setEditingCapCat(null);
                            }}
                            className="input-field w-20 px-2 py-0.5 text-xs font-mono text-right"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveCap(row.category)}
                            aria-label={`Save cap for ${row.category}`}
                            className="p-1 text-[#15966B] hover:text-[#107855]"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCapCat(null)}
                            aria-label={`Cancel cap edit for ${row.category}`}
                            className="p-1 text-[#697386] hover:text-[#151922]"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : row.allocatedBudget !== null ? (
                        `₹${formatCurrency(row.allocatedBudget)}`
                      ) : (
                        <span className="text-[#929BAB]">Unallocated</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-[#151922]">
                      ₹{formatCurrencyExact(row.actualSpend)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono tabular-nums font-semibold ${
                        row.remaining === null
                          ? 'text-[#929BAB]'
                          : row.remaining < 0
                            ? 'text-[#DE5252]'
                            : 'text-[#15966B]'
                      }`}
                    >
                      {row.remaining === null
                        ? '—'
                        : `${row.remaining < 0 ? '-' : ''}₹${formatCurrencyExact(Math.abs(row.remaining))}`}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-mono tabular-nums font-semibold ${statusBadge}`}>
                      {row.utilisationPct !== null ? `${row.utilisationPct}%` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#697386]">
                      {row.deltaFromPrevPct !== null
                        ? `${row.deltaFromPrevPct > 0 ? '+' : ''}${row.deltaFromPrevPct}%`
                        : row.previousMonthSpend > 0
                          ? `₹${formatCurrencyExact(row.previousMonthSpend)}`
                          : 'No prior'}
                    </td>
                    <td className="py-2.5 pl-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCapCat(row.category);
                            setCapInputVal(
                              row.allocatedBudget !== null ? String(row.allocatedBudget) : ''
                            );
                          }}
                          className="text-xs font-semibold text-[#365FE8] hover:text-[#294FCC] whitespace-nowrap"
                        >
                          {row.allocatedBudget !== null ? 'Edit cap' : '+ Cap'}
                        </button>
                        {row.allocatedBudget !== null && (
                          <button
                            type="button"
                            onClick={() => setCategoryCap(row.category, null)}
                            aria-label={`Remove cap for ${row.category}`}
                            className="p-1 text-[#929BAB] hover:text-[#DE5252]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Statistical Unusual Spending Detection */}
      <section className="surface-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#C7851F]" />
              <h3 className="text-sm font-bold text-[#151922]">
                Unusual Spending Observations ({anomalies.length})
              </h3>
            </div>
            <p className="text-xs text-[#697386] mt-0.5">
              Explainable statistical deviations (median &amp; standard deviation baselines) — not fraud detection.
            </p>
          </div>
        </div>

        {anomalies.length === 0 ? (
          <div className="rounded-xl bg-[#F7F8FA] border border-dashed border-[#D5DBE6] p-5 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#15966B] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-[#151922]">
                No statistically unusual spending detected in this period
              </p>
              <p className="text-xs text-[#697386] mt-1">
                Insights requires established category or daily history (4+ active records) and significant statistical deviation before flagging an anomaly so normal fluctuations do not create false alarms.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {anomalies.map((a) => {
              const sevColor =
                a.severity === 'high'
                  ? 'border-[#F6B8B8] bg-[#FDECEC]'
                  : a.severity === 'moderate'
                    ? 'border-[#F3D8A8] bg-[#FEF6E7]'
                    : 'border-[#D4E0FF] bg-[#EDF2FF]';
              const sevText =
                a.severity === 'high'
                  ? 'text-[#DE5252]'
                  : a.severity === 'moderate'
                    ? 'text-[#9E6614]'
                    : 'text-[#365FE8]';
              return (
                <div key={a.id} className={`rounded-xl border p-3.5 ${sevColor}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`text-xs font-bold uppercase tracking-wider ${sevText}`}>
                        {a.severity} deviation · +{a.deviationPct}%
                      </p>
                      <p className="text-sm font-bold text-[#151922] mt-0.5 truncate">
                        {a.subject}
                      </p>
                    </div>
                    <span className="font-mono tabular-nums font-bold text-sm text-[#151922] shrink-0">
                      ₹{formatCurrencyExact(a.amount)}
                    </span>
                  </div>
                  <p className="text-xs text-[#151922] mt-2">{a.reason}</p>
                  <p className="text-[11px] text-[#697386] mt-2">
                    {a.baselineLabel} ·{' '}
                    {new Date(a.date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Financial Insights Engine */}
      <section className="surface-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-[#365FE8]" />
              <h3 className="text-sm font-bold text-[#151922]">
                Financial Insights Engine
              </h3>
            </div>
            <p className="text-xs text-[#697386] mt-0.5">
              Deterministic observations backed by live records; potential savings are clearly labeled as estimates
            </p>
          </div>

          <div
            className="inline-flex flex-wrap items-center bg-[#F1F3F6] border border-[#E7EAF0] rounded-xl p-0.5"
            role="group"
            aria-label="Filter insights by category"
          >
            {(
              [
                ['all', 'All'],
                ['spending', 'Spending'],
                ['trend', 'Trends'],
                ['budget', 'Budgets'],
                ['behaviour', 'Patterns'],
                ['savings_estimate', 'Estimates'],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setInsightFilter(k)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  insightFilter === k
                    ? 'bg-[#365FE8] text-white shadow-xs'
                    : 'text-[#697386] hover:text-[#151922]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredInsights.map((ins) => (
            <div
              key={ins.id}
              className="surface-subtle p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-[#697386]">
                    {ins.periodLabel}
                    {ins.isEstimate ? ' · ESTIMATE ONLY' : ''}
                  </span>
                  {ins.metricLabel && (
                    <span
                      className={`font-mono tabular-nums text-xs font-bold ${
                        ins.tone === 'positive'
                          ? 'text-[#15966B]'
                          : ins.tone === 'caution'
                            ? 'text-[#9E6614]'
                            : 'text-[#151922]'
                      }`}
                    >
                      {ins.metricLabel}
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold text-[#151922] mt-1.5 flex items-center gap-1.5">
                  {ins.tone === 'caution' && (
                    <AlertOctagon className="w-3.5 h-3.5 text-[#C7851F] shrink-0" />
                  )}
                  <span>{ins.title}</span>
                </p>
                <p className="text-xs text-[#697386] mt-1.5 leading-relaxed">
                  {ins.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function MiniStat({
  label,
  value,
  valueClass = 'text-[#151922]',
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="surface-subtle px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#697386] truncate">{label}</p>
      <p className={`text-base font-bold font-mono tabular-nums mt-0.5 ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}
