import { Radar, TrendingDown, Wallet, Target, PieChart } from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { getCategoryStyle, formatCurrency } from '../../utils/categoryStyles';

export function RadarDashboard() {
  const transactions = useAppStore((s) => s.transactions);
  const totalBudget = useAppStore((s) => s.totalBudget);

  const totalSpent = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const remaining = totalBudget - totalSpent;
  const percentage = Math.min((totalSpent / totalBudget) * 100, 100);
  const remainingPct = Math.max(100 - percentage, 0);

  const categoryTotals = transactions.reduce(
    (acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
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
  const isHealthy = remaining >= totalBudget * 0.2;

  // Circle progress math
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="space-y-4">
      {/* Page Title */}
      <div className="flex items-center gap-2">
        <Radar className="w-5 h-5 text-brand-400" strokeWidth={2.5} />
        <h2 className="text-lg font-extrabold tracking-tight">Budget Radar</h2>
      </div>

      {/* Main Budget Ring Card */}
      <div className="glass rounded-2xl p-5 shadow-xl animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              Monthly Budget
            </p>
            <p className="text-2xl font-extrabold font-mono tabular-nums mt-0.5">
              ₹{formatCurrency(totalBudget)}
            </p>
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
              {/* Track */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="8"
              />
              {/* Progress */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={
                  isOverBudget
                    ? '#ef4444'
                    : isWarning
                    ? '#f97316'
                    : '#10b981'
                }
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                style={{
                  transition: 'stroke-dashoffset 0.8s ease-out',
                  filter: isOverBudget
                    ? 'drop-shadow(0 0 6px rgba(239,68,68,0.5))'
                    : isWarning
                    ? 'drop-shadow(0 0 6px rgba(249,115,22,0.5))'
                    : 'drop-shadow(0 0 6px rgba(16,185,129,0.5))',
                }}
              />
            </svg>
            {/* Center Label */}
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
          value={String(transactions.length)}
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
              const widthPct = (amount / maxCategoryAmount) * 100;
              const sharePct = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;

              return (
                <div
                  key={cat}
                  style={{ animationDelay: `${index * 60}ms` }}
                  className="animate-fade-in-up"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${catStyle.dot}`}
                      />
                      <span className="text-sm font-bold text-white">
                        {cat}
                      </span>
                      <span className="text-[10px] font-bold text-zinc-600 font-mono">
                        {Math.round(sharePct)}%
                      </span>
                    </div>
                    <span className="text-sm font-extrabold text-zinc-300 font-mono tabular-nums">
                      ₹{formatCurrency(amount)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-ink-900 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${catStyle.dot} transition-all duration-700`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
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
