import { useState } from 'react';
import { BookOpen, Users, TrendingDown, Inbox, Check, X } from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { useSyncStore } from '../../utils/db';
import { getCategoryStyle, formatCurrency } from '../../utils/categoryStyles';

export function Ledger() {
  useSyncStore();

  const transactions = useAppStore((s) => s.transactions);
  const setTransactions = useAppStore((s) => s.setTransactions);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [splitName, setSplitName] = useState('');

  const totalOwedToMe = transactions.reduce(
    (sum, tx) => sum + (tx.splitWith ? tx.amount : 0),
    0
  );
  const totalSpent = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  const handleSplitSubmit = (id: string) => {
    const updated = transactions.map((tx) =>
      tx.id === id ? { ...tx, splitWith: splitName.trim() || null } : tx
    );
    setTransactions(updated);
    setEditingId(null);
    setSplitName('');
  };

  const handleRemoveSplit = (id: string) => {
    const updated = transactions.map((tx) =>
      tx.id === id ? { ...tx, splitWith: null } : tx
    );
    setTransactions(updated);
  };

  const sortedTx = [...transactions].sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-zinc-400" strokeWidth={2.5} />
          <h2 className="text-lg font-extrabold tracking-tight">Ledger</h2>
        </div>
        {transactions.length > 0 && (
          <span className="text-[11px] font-bold text-zinc-500 bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.06]">
            {transactions.length} txns
          </span>
        )}
      </div>

      {/* Stats Row */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 animate-fade-in-up">
          <div className="glass rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingDown className="w-3.5 h-3.5 text-red-400" strokeWidth={2.5} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Total Spent
              </span>
            </div>
            <p className="text-lg font-extrabold font-mono tabular-nums text-white">
              ₹{formatCurrency(totalSpent)}
            </p>
          </div>
          <div className="glass rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="w-3.5 h-3.5 text-brand-400" strokeWidth={2.5} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Owed to Me
              </span>
            </div>
            <p className="text-lg font-extrabold font-mono tabular-nums text-brand-400">
              ₹{formatCurrency(totalOwedToMe)}
            </p>
          </div>
        </div>
      )}

      {/* Transactions List */}
      <div className="glass rounded-2xl p-4">
        <div className="space-y-2.5 max-h-[50vh] overflow-y-auto scrollbar-thin pr-1">
          {sortedTx.length === 0 ? (
            <div className="text-center py-10 animate-fade-in">
              <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
                <Inbox className="w-6 h-6 text-zinc-600" strokeWidth={2} />
              </div>
              <p className="text-zinc-500 text-sm font-medium">
                No transactions yet
              </p>
              <p className="text-zinc-600 text-xs mt-1">
                Check out from your cart to record spending
              </p>
            </div>
          ) : (
            sortedTx.map((tx, index) => {
              const catStyle = getCategoryStyle(tx.category);
              return (
                <div
                  key={tx.id}
                  style={{ animationDelay: `${index * 30}ms` }}
                  className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04] hover:border-white/[0.08] transition-all animate-fade-in-up"
                >
                  <div className="flex justify-between items-start mb-2.5">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className={`w-2 h-2 rounded-full ${catStyle.dot} mt-1.5 flex-shrink-0`}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {tx.name}
                        </p>
                        <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
                          {new Date(tx.timestamp).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-extrabold text-red-400 font-mono tabular-nums flex-shrink-0">
                      -₹{formatCurrency(tx.amount)}
                    </p>
                  </div>

                  {/* Bottom Row: Category + Split */}
                  {editingId === tx.id ? (
                    <div className="flex gap-2 mt-2.5 animate-scale-in">
                      <input
                        type="text"
                        placeholder="Who owes you this?"
                        className="flex-1 bg-ink-900 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-brand-500/40 transition-colors placeholder:text-zinc-600"
                        value={splitName}
                        onChange={(e) => setSplitName(e.target.value)}
                        autoFocus
                      />
                      <button
                        onClick={() => handleSplitSubmit(tx.id)}
                        className="bg-brand-500 text-ink-950 px-3 py-2 rounded-lg text-xs font-extrabold flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setSplitName('');
                        }}
                        className="bg-white/[0.06] text-zinc-400 px-3 py-2 rounded-lg text-xs"
                      >
                        <X className="w-3.5 h-3.5" strokeWidth={3} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center gap-2 mt-2 pt-2.5 border-t border-white/[0.04]">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${catStyle.bg} ${catStyle.text} border ${catStyle.border} flex items-center gap-1.5`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${catStyle.dot}`}
                        />
                        {tx.category}
                      </span>

                      {tx.splitWith ? (
                        <button
                          onClick={() => setEditingId(tx.id)}
                          className="text-[11px] font-bold text-brand-400 bg-brand-500/10 border border-brand-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5 hover:bg-brand-500/15 transition-colors"
                        >
                          <Users className="w-3 h-3" strokeWidth={2.5} />
                          {tx.splitWith}
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveSplit(tx.id);
                            }}
                            className="ml-1 text-zinc-500 hover:text-red-400"
                          >
                            <X className="w-3 h-3" strokeWidth={3} />
                          </span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(tx.id);
                            setSplitName('');
                          }}
                          className="text-[11px] font-bold text-zinc-500 hover:text-brand-400 transition-colors flex items-center gap-1"
                        >
                          <Users className="w-3 h-3" strokeWidth={2.5} />
                          Split bill
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
