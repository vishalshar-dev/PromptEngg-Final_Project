import { useState, useEffect, useRef } from 'react';
import { Radar, TrendingDown, Wallet, Target, PieChart, Pencil, Check, X, AlertOctagon } from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { getCategoryStyle, formatCurrency } from '../../utils/categoryStyles';
import { getEffectiveTransactionAmount } from '../../utils/martEngine';
import { MonthlyTrendsChart } from './MonthlyTrendsChart';

export function RadarDashboard() {
  const transactions = useAppStore((s) => s.transactions);
  const totalBudget = useAppStore((s) => s.totalBudget);
  const setTotalBudget = useAppStore((s) => s.setTotalBudget);
  const categoryCaps = useAppStore((s) => s.categoryCaps);
  const setCategoryCap = useAppStore((s) => s.setCategoryCap);

  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const budgetInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingBudget) {
      setBudgetInput(String(totalBudget));
      setTimeout(() => budgetInputRef.current?.focus(), 50);
    }
  }, [editingBudget, totalBudget]);

  const handleBudgetSave = () => {
    const val = Number(budgetInput);
    if (budgetInput && val > 0) {
      setTotalBudget(val);
    }
    setEditingBudget(false);
  };

  const handleBudgetKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleBudgetSave();
    if (e.key === 'Escape') setEditingBudget(false);
  };

  const activeTransactions = transactions.filter((tx) => tx.status !== 'cancelled');
  const totalSpent = transactions.reduce(
    (sum, tx) => sum + getEffectiveTransactionAmount(tx),
    0
  );
  const remaining = totalBudget - totalSpent;
  const percentage = Math.min((totalSpent / totalBudget) * 100, 100);
  const remainingPct = Math.max(100 - percentage, 0);

  const categoryTotals = transactions.reduce(
    (acc, tx) => {
      const effective = getEffectiveTransactionAmount(tx);
      if (effective <= 0) return acc;
      acc[tx.category] = (acc[tx.category] || 0) + effective;
      return acc;
    },
    {} as Record<string, number>
  );

  const sortedCategories = Object.entries(categoryTotals).sort(
    (a, b) => b[1] - a[1]
  );
  const maxCategoryAmount = sortedCategories[0]?.[1] ?? 1;

  const isOverBudget = remaining < 0;
  const isWarning = remaining > 0 && remaining < totalBudget * 0.2;

  // Circle progress math
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (percentage / 100) * circumference;

  const statusColor = isOverBudget ? '#ef4444' : isWarning ? '#f97316' : '#10b981';
  const statusGlow = isOverBudget
    ? 'drop-shadow(0 0 6px rgba(239,68,68,0.5))'
    : isWarning
    ? 'drop-shadow(0 0 6px rgba(249,115,22,0.5))'
    : 'drop-shadow(0 0 6px rgba(16,185,129,0.5))';

  return (
    <div className="space-y-4">
      {/* Page Title */}
      <div className="flex items-center gap-2">
        <Radar className="w-5 h-5 text-brand-400" strokeWidth={2.5} />
        <h2 className="text-lg font-extrabold tracking-tight">Budget Radar</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Main Budget Ring Card */}
        <div className="lg:col-span-5 glass rounded-2xl p-5 shadow-xl animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              Monthly Budget
            </p>
            {editingBudget ? (
              <div className="flex items-center gap-1.5 mt-0.5 animate-scale-in">
                <span className="text-2xl font-extrabold font-mono text-brand-400">₹</span>
                <input
                  ref={budgetInputRef}
                  type="number"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  onKeyDown={handleBudgetKeyDown}
                  className="w-28 bg-ink-900 border border-brand-500/40 rounded-lg px-2 py-0.5 text-2xl font-extrabold font-mono tabular-nums text-white outline-none text-center"
                />
                <button
                  onClick={handleBudgetSave}
                  className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-ink-950 hover:bg-brand-400 transition-colors"
                >
                  <Check className="w-4 h-4" strokeWidth={3} />
                </button>
                <button
                  onClick={() => setEditingBudget(false)}
                  className="w-8 h-8 bg-white/[0.06] rounded-lg flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" strokeWidth={3} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mt-0.5 group">
                <p className="text-2xl font-extrabold font-mono tabular-nums">
                  ₹{formatCurrency(totalBudget)}
                </p>
                <button
                  onClick={() => setEditingBudget(true)}
                  className="text-zinc-600 hover:text-brand-400 transition-colors"
                  aria-label="Edit budget"
                >
                  <Pencil className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
              </div>
            )}
          </div>
          <div
            className={`text-[11px] font-extrabold px-3 py-1.5 rounded-lg border ${
              isOverBudget
                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                : isWarning
                ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                : 'bg-brand-500/10 text-brand-400 border-brand-500/20'
            }`}
          >
            {isOverBudget
              ? 'OVER BUDGET'
              : isWarning
              ? 'LOW BALANCE'
              : 'ON TRACK'}
          </div>
        </div>

        {/* Circular Progress Ring */}
        <div className="flex items-center justify-center py-2">
          <div className="relative w-36 h-36">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="8"
              />
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={statusColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                style={{
                  transition: 'stroke-dashoffset 0.8s ease-out',
                  filter: statusGlow,
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Spent
              </p>
              <p
                className={`text-2xl font-extrabold font-mono tabular-nums ${
                  isOverBudget ? 'text-red-400' : 'text-white'
                }`}
              >
                {Math.round(percentage)}%
              </p>
              <p className="text-[11px] font-medium text-zinc-500 mt-0.5">
                of budget
              </p>
            </div>
          </div>
        </div>

        {/* Remaining Bar */}
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-xs font-bold text-zinc-400">Remaining</span>
            <span
              className={`text-base font-extrabold font-mono tabular-nums ${
                isOverBudget
                  ? 'text-red-400'
                  : isWarning
                  ? 'text-orange-400'
                  : 'text-brand-400'
              }`}
            >
              ₹{formatCurrency(Math.abs(remaining))}
              {isOverBudget && ' over'}
            </span>
          </div>
          <div className="h-2 w-full bg-ink-900 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                isOverBudget
                  ? 'bg-red-500'
                  : isWarning
                  ? 'bg-orange-500'
                  : 'bg-gradient-to-r from-brand-500 to-brand-400'
              }`}
              style={{ width: `${remainingPct}%` }}
            />
          </div>
        </div>
        </div>

        {/* Right Column: Stats + Category Breakdown */}
        <div className="lg:col-span-7 space-y-4">
          {/* Stat Cards */}
          <div className="grid grid-cols-3 gap-2.5 animate-fade-in-up">
        <StatCard
          icon={Wallet}
          label="Spent"
          value={`₹${formatCurrency(totalSpent)}`}
          color="text-red-400"
          delay={0}
        />
        <StatCard
          icon={Target}
          label="Budget"
          value={`₹${formatCurrency(totalBudget)}`}
          color="text-white"
          delay={40}
        />
        <StatCard
          icon={TrendingDown}
          label="Txns"
          value={String(activeTransactions.length)}
          color="text-brand-400"
          delay={80}
        />
      </div>

      {/* Category Breakdown */}
      <div className="glass rounded-2xl p-4 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="w-4 h-4 text-zinc-400" strokeWidth={2.5} />
          <h3 className="text-sm font-extrabold tracking-tight">
            Spend by Category
          </h3>
        </div>

        <div className="space-y-3.5">
          {sortedCategories.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-zinc-600 text-sm font-medium">
                No spending data yet
              </p>
              <p className="text-zinc-700 text-xs mt-1">
                Check out from your cart to see analytics
              </p>
            </div>
          ) : (
            sortedCategories.map(([cat, amount], index) => {
              const catStyle = getCategoryStyle(cat);
              const cap = categoryCaps[cat] ?? null;
              const hasCap = cap !== null && cap > 0;

              // Determine bar width and color based on cap or relative max
              const widthPct = hasCap
                ? Math.min((amount / cap) * 100, 100)
                : (amount / maxCategoryAmount) * 100;

              const capUsagePct = hasCap ? (amount / cap) * 100 : 0;
              const isOverCap = hasCap && amount > cap;
              const isWarningCap = hasCap && capUsagePct >= 80 && !isOverCap;

              const barColor = isOverCap
                ? 'bg-red-500'
                : isWarningCap
                ? 'bg-orange-500'
                : catStyle.dot;

              const sharePct = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;

              return (
                <div
                  key={cat}
                  style={{ animationDelay: `${index * 60}ms` }}
                  className="animate-fade-in-up"
                >
                  <CategoryRow
                    category={cat}
                    amount={amount}
                    sharePct={sharePct}
                    cap={cap}
                    hasCap={hasCap}
                    isOverCap={isOverCap}
                    widthPct={widthPct}
                    barColor={barColor}
                    catStyle={catStyle}
                    onSetCap={setCategoryCap}
                  />
                </div>
              );
            })
          )}
            </div>
          </div>
        </div>
      </div>

      <MonthlyTrendsChart />
    </div>
  );
}

function CategoryRow({
  category,
  amount,
  sharePct,
  cap,
  hasCap,
  isOverCap,
  widthPct,
  barColor,
  catStyle,
  onSetCap,
}: {
  category: string;
  amount: number;
  sharePct: number;
  cap: number | null;
  hasCap: boolean;
  isOverCap: boolean;
  widthPct: number;
  barColor: string;
  catStyle: ReturnType<typeof getCategoryStyle>;
  onSetCap: (category: string, amount: number | null) => void;
}) {
  const [editingCap, setEditingCap] = useState(false);
  const [capInput, setCapInput] = useState('');
  const capInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingCap) {
      setCapInput(hasCap ? String(cap) : '');
      setTimeout(() => capInputRef.current?.focus(), 50);
    }
  }, [editingCap, hasCap, cap]);

  const handleCapSave = () => {
    const val = Number(capInput);
    if (capInput && val > 0) {
      onSetCap(category, val);
    } else if (!capInput) {
      onSetCap(category, null);
    }
    setEditingCap(false);
  };

  const handleCapKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCapSave();
    if (e.key === 'Escape') setEditingCap(false);
  };

  const handleRemoveCap = () => {
    onSetCap(category, null);
    setEditingCap(false);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${catStyle.dot}`} />
          <span className="text-sm font-bold text-white">{category}</span>
          <span className="text-[10px] font-bold text-zinc-600 font-mono">
            {Math.round(sharePct)}%
          </span>
          {isOverCap && (
            <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1 animate-fade-in">
              <AlertOctagon className="w-2.5 h-2.5" strokeWidth={2.5} />
              Over Cap
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-extrabold text-zinc-300 font-mono tabular-nums">
            ₹{formatCurrency(amount)}
          </span>
          {editingCap ? (
            <div className="flex items-center gap-1 animate-scale-in">
              <span className="text-xs font-bold text-brand-400">₹</span>
              <input
                ref={capInputRef}
                type="number"
                value={capInput}
                onChange={(e) => setCapInput(e.target.value)}
                onKeyDown={handleCapKeyDown}
                placeholder="Cap"
                className="w-16 bg-ink-900 border border-brand-500/40 rounded-lg px-2 py-1 text-xs text-white text-center outline-none font-mono"
              />
              <button
                onClick={handleCapSave}
                className="w-6 h-6 bg-brand-500 rounded-md flex items-center justify-center text-ink-950 hover:bg-brand-400 transition-colors"
              >
                <Check className="w-3 h-3" strokeWidth={3} />
              </button>
              <button
                onClick={() => setEditingCap(false)}
                className="w-6 h-6 bg-white/[0.06] rounded-md flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-3 h-3" strokeWidth={3} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingCap(true)}
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-all whitespace-nowrap ${
                hasCap
                  ? 'text-brand-400/70 hover:text-brand-400 bg-brand-500/5 hover:bg-brand-500/10'
                  : 'text-zinc-600 hover:text-zinc-300'
              }`}
            >
              {hasCap ? `cap ₹${formatCurrency(cap!)}` : '+ cap'}
            </button>
          )}
        </div>
      </div>
      <div className="h-1.5 w-full bg-ink-900 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
      {hasCap && !editingCap && (
        <div className="flex items-center justify-between mt-1">
          <p className="text-[10px] text-zinc-600 font-medium">
            {isOverCap
              ? `Over cap by ₹${formatCurrency(amount - cap!)}`
              : `₹${formatCurrency(cap! - amount)} remaining`}
          </p>
          <button
            onClick={handleRemoveCap}
            className="text-[10px] font-bold text-zinc-600 hover:text-red-400 transition-colors"
          >
            Remove cap
          </button>
        </div>
      )}
    </>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  delay,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  color: string;
  delay: number;
}) {
  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className="glass rounded-xl p-3 animate-fade-in-up"
    >
      <Icon className="w-3.5 h-3.5 text-zinc-500 mb-1.5" strokeWidth={2.5} />
      <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-0.5">
        {label}
      </p>
      <p className={`text-sm font-extrabold font-mono tabular-nums ${color}`}>
        {value}
      </p>
    </div>
  );
}
