import { Shield, ShieldOff, Lock, Zap, AlertTriangle, TrendingUp } from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { getCategoryStyle, formatCurrency } from '../../utils/categoryStyles';

export function SurvivalSandbox() {
  const isBrokeMode = useAppStore((s) => s.isBrokeMode);
  const toggleBrokeMode = useAppStore((s) => s.toggleBrokeMode);
  const transactions = useAppStore((s) => s.transactions);

  const junkTransactions = transactions.filter((tx) => tx.category === 'Junk');
  const junkTotal = junkTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const totalSpent = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const junkShare = totalSpent > 0 ? (junkTotal / totalSpent) * 100 : 0;

  const junkStyle = getCategoryStyle('Junk');

  return (
    <div className="space-y-4">
      {/* Page Title */}
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-zinc-400" strokeWidth={2.5} />
        <h2 className="text-lg font-extrabold tracking-tight">War Room</h2>
      </div>

      {/* Main Control Card */}
      <div
        className={`relative overflow-hidden rounded-2xl border p-6 transition-all duration-500 animate-fade-in-up ${
          isBrokeMode
            ? 'bg-red-950/20 border-red-500/20 glow-red-lg'
            : 'glass border-white/[0.06]'
        }`}
      >
        {/* Animated Background Pulse */}
        {isBrokeMode && (
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-red-500/10 rounded-full blur-3xl animate-pulse-glow" />
          </div>
        )}

        <div className="relative">
          {/* Status Indicator */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${
                  isBrokeMode
                    ? 'bg-red-500/20 border border-red-500/30'
                    : 'bg-white/[0.04] border border-white/[0.06]'
                }`}
              >
                {isBrokeMode ? (
                  <Lock className="w-5 h-5 text-red-400" strokeWidth={2.5} />
                ) : (
                  <ShieldOff className="w-5 h-5 text-zinc-400" strokeWidth={2.5} />
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Defense Status
                </p>
                <p
                  className={`text-sm font-extrabold ${
                    isBrokeMode ? 'text-red-400' : 'text-zinc-300'
                  }`}
                >
                  {isBrokeMode ? 'DEFCON 1 — Active' : 'Standby'}
                </p>
              </div>
            </div>

            {/* Status Dot */}
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isBrokeMode ? 'bg-red-400 animate-pulse' : 'bg-zinc-600'
                }`}
              />
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                {isBrokeMode ? 'Armed' : 'Idle'}
              </span>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-zinc-400 leading-relaxed mb-5">
            {isBrokeMode
              ? 'Broke Mode is live. All junk-food purchases are locked in the Mart. Stay disciplined — your wallet will thank you.'
              : 'Activate Broke Mode to instantly lock all non-essential "Junk" category purchases. A nuclear option for when spending needs to stop — now.'}
          </p>

          {/* Toggle Button */}
          <button
            onClick={toggleBrokeMode}
            className={`w-full py-4 rounded-2xl font-extrabold tracking-wider transition-all duration-300 flex items-center justify-center gap-2.5 active:scale-[0.98] ${
              isBrokeMode
                ? 'bg-red-600 hover:bg-red-500 text-white glow-red'
                : 'bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.06]'
            }`}
          >
            <Zap
              className={`w-5 h-5 transition-transform duration-300 ${
                isBrokeMode ? 'scale-110' : ''
              }`}
              strokeWidth={2.5}
            />
            {isBrokeMode ? 'DEACTIVATE BROKE MODE' : 'ACTIVATE BROKE MODE'}
          </button>
        </div>
      </div>

      {/* Junk Spending Insight */}
      <div className="glass rounded-2xl p-4 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-orange-400" strokeWidth={2.5} />
          <h3 className="text-sm font-extrabold tracking-tight">
            Junk Spending Audit
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
              Total Junk
            </p>
            <p className="text-base font-extrabold font-mono tabular-nums text-orange-400">
              ₹{formatCurrency(junkTotal)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
              Share
            </p>
            <p className="text-base font-extrabold font-mono tabular-nums text-white">
              {Math.round(junkShare)}%
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
              Purchases
            </p>
            <p className="text-base font-extrabold font-mono tabular-nums text-white">
              {junkTransactions.length}
            </p>
          </div>
        </div>

        {/* Junk Share Bar */}
        <div className="h-2 w-full bg-ink-900 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-700"
            style={{ width: `${junkShare}%` }}
          />
        </div>
        <p className="text-[11px] text-zinc-500 font-medium mt-2">
          {junkShare > 30
            ? 'Junk spending is above 30% — consider activating Broke Mode.'
            : junkTotal > 0
            ? 'Junk spending is controlled. Keep it up.'
            : 'No junk spending recorded. Spotless.'}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="glass rounded-2xl p-4 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-brand-400" strokeWidth={2.5} />
          <h3 className="text-sm font-extrabold tracking-tight">
            Discipline Score
          </h3>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-4xl font-extrabold font-mono tabular-nums text-white">
              {Math.max(0, Math.round(100 - junkShare))}
            </p>
            <p className="text-[11px] text-zinc-500 font-bold mt-1">
              out of 100
            </p>
          </div>
          <div
            className={`text-[11px] font-extrabold px-3 py-1.5 rounded-lg border ${
              junkShare < 15
                ? 'bg-brand-500/10 text-brand-400 border-brand-500/20'
                : junkShare < 35
                ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}
          >
            {junkShare < 15
              ? 'ELITE'
              : junkShare < 35
              ? 'MODERATE'
              : 'AT RISK'}
          </div>
        </div>
      </div>
    </div>
  );
}
