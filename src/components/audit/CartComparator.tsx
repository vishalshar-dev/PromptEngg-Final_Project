import { useState, useMemo } from 'react';
import { Scale, ShoppingBag, TrendingDown, Award, Save, Check, Zap } from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { formatCurrency } from '../../utils/categoryStyles';

const PLATFORMS = ['Zepto', 'Blinkit', 'Swiggy Instamart', 'BigBasket', 'Amazon Fresh', 'JioMart'];

interface CartInput {
  platform: string;
  baseTotal: number;
  handlingFee: number;
  surgeFee: number;
  smallCartFee: number;
  discount: number;
}

const emptyCart: CartInput = {
  platform: '',
  baseTotal: 0,
  handlingFee: 0,
  surgeFee: 0,
  smallCartFee: 0,
  discount: 0,
};

function calcEffective(cart: CartInput): { total: number; overheadPct: number; extraFees: number } {
  const extraFees = cart.handlingFee + cart.surgeFee + cart.smallCartFee;
  const total = cart.baseTotal + extraFees - cart.discount;
  const overheadPct = cart.baseTotal > 0 ? (extraFees / cart.baseTotal) * 100 : 0;
  return { total: Math.max(total, 0), overheadPct, extraFees };
}

export function CartComparator() {
  const items = useAppStore((s) => s.items);
  const addSavedAudit = useAppStore((s) => s.addSavedAudit);

  const [cartA, setCartA] = useState<CartInput>({
    ...emptyCart,
    platform: PLATFORMS[0],
  });
  const [cartB, setCartB] = useState<CartInput>({
    ...emptyCart,
    platform: PLATFORMS[1],
  });
  const [loggedFlash, setLoggedFlash] = useState(false);

  const cartTotal = useMemo(
    () => items.filter((i) => i.quantity > 0).reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  );

  const resultA = useMemo(() => calcEffective(cartA), [cartA]);
  const resultB = useMemo(() => calcEffective(cartB), [cartB]);

  const winner = resultA.total <= resultB.total ? 'A' : 'B';
  const loser = winner === 'A' ? 'B' : 'A';
  const winnerCart = winner === 'A' ? cartA : cartB;
  const winnerResult = winner === 'A' ? resultA : resultB;
  const loserResult = winner === 'A' ? resultB : resultA;
  const savings = loserResult.total - winnerResult.total;
  const isTie = Math.abs(resultA.total - resultB.total) < 0.01;

  const updateCart = (side: 'A' | 'B', field: keyof CartInput, value: string | number) => {
    const setter = side === 'A' ? setCartA : setCartB;
    setter((prev) => ({ ...prev, [field]: value }));
  };

  const loadCurrentCart = (side: 'A' | 'B') => {
    const setter = side === 'A' ? setCartA : setCartB;
    setter((prev) => ({ ...prev, baseTotal: cartTotal }));
  };

  const handleLog = () => {
    const flags: { type: string; severity: 'warning' | 'critical'; message: string; estimatedCost: number }[] = [];

    const loserCart = winner === 'A' ? cartB : cartA;
    const loserExtra = winner === 'A' ? resultB.extraFees : resultA.extraFees;
    const winnerExtra = winner === 'A' ? resultA.extraFees : resultB.extraFees;

    if (loserExtra > 0) {
      flags.push({
        type: 'Fee Overhead',
        severity: 'warning',
        message: `${loserCart.platform} charges ₹${formatCurrency(loserExtra)} in extra fees (handling + surge + small-cart)`,
        estimatedCost: loserExtra,
      });
    }

    if (savings > 0) {
      flags.push({
        type: 'Savings Opportunity',
        severity: 'warning',
        message: `Choosing ${winnerCart.platform} over ${loserCart.platform} saves ₹${formatCurrency(savings)}`,
        estimatedCost: savings,
      });
    }

    if (winnerExtra > 0) {
      flags.push({
        type: 'Winner Fees',
        severity: 'warning',
        message: `Even the cheapest option (${winnerCart.platform}) has ₹${formatCurrency(winnerExtra)} in extra fees`,
        estimatedCost: winnerExtra,
      });
    }

    addSavedAudit({
      source: `Comparison: ${winnerCart.platform} vs ${loserCart.platform}`,
      subtotal: winnerCart.baseTotal,
      extraFees: winnerResult.extraFees,
      total: winnerResult.total,
      flags,
    });

    setLoggedFlash(true);
    setTimeout(() => setLoggedFlash(false), 2000);
  };

  const hasData = cartA.baseTotal > 0 || cartB.baseTotal > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Scale className="w-4 h-4 text-sky-400" strokeWidth={2.5} />
        <h3 className="text-sm font-extrabold tracking-tight">Multi-App Cart Comparator</h3>
      </div>

      <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">
        Compare effective checkout totals across quick-commerce platforms. Enter fees from each app to find the cheapest option.
      </p>

      {/* Side-by-Side Inputs */}
      <div className="grid grid-cols-2 gap-2.5">
        <CartColumn
          label="App A"
          cart={cartA}
          result={resultA}
          isWinner={winner === 'A' && !isTie && hasData}
          isLoser={winner === 'B' && !isTie && hasData}
          cartTotal={cartTotal}
          onUpdate={(field, value) => updateCart('A', field, value)}
          onLoadCart={() => loadCurrentCart('A')}
        />
        <CartColumn
          label="App B"
          cart={cartB}
          result={resultB}
          isWinner={winner === 'B' && !isTie && hasData}
          isLoser={winner === 'A' && !isTie && hasData}
          cartTotal={cartTotal}
          onUpdate={(field, value) => updateCart('B', field, value)}
          onLoadCart={() => loadCurrentCart('B')}
        />
      </div>

      {/* Winner Banner */}
      {hasData && !isTie && (
        <div className="rounded-2xl border border-brand-500/30 bg-brand-500/10 p-4 animate-scale-in glow-brand">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
                <Award className="w-5 h-5 text-brand-400" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-brand-400/70">
                  Best Deal
                </p>
                <p className="text-sm font-extrabold text-white">
                  {winnerCart.platform}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">You Save</p>
              <p className="text-lg font-extrabold font-mono text-brand-400">
                ₹{formatCurrency(savings)}
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-brand-500/20 flex items-center justify-between text-[11px]">
            <span className="text-zinc-400 font-medium">
              {winnerCart.platform}: <span className="font-mono text-white">₹{formatCurrency(winnerResult.total)}</span>
            </span>
            <span className="text-zinc-400 font-medium">
              {(winner === 'A' ? cartB : cartA).platform}: <span className="font-mono text-zinc-300">₹{formatCurrency(loserResult.total)}</span>
            </span>
          </div>
        </div>
      )}

      {hasData && isTie && (
        <div className="glass rounded-xl p-3 text-center animate-fade-in">
          <p className="text-sm font-bold text-zinc-300">Both apps cost the same</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">₹{formatCurrency(resultA.total)} each — pick either one</p>
        </div>
      )}

      {/* Log Button */}
      {hasData && (
        <button
          onClick={handleLog}
          className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
            loggedFlash
              ? 'bg-brand-500/20 text-brand-400 border-brand-500/30'
              : 'bg-white/[0.04] hover:bg-brand-500/15 text-zinc-300 hover:text-brand-400 border-white/[0.06] hover:border-brand-500/30'
          }`}
        >
          {loggedFlash ? (
            <><Check className="w-3.5 h-3.5" strokeWidth={2.5} /> Logged to Audit History</>
          ) : (
            <><Save className="w-3.5 h-3.5" strokeWidth={2.5} /> Log Comparison to History</>
          )}
        </button>
      )}
    </div>
  );
}

function CartColumn({
  label,
  cart,
  result,
  isWinner,
  isLoser,
  cartTotal,
  onUpdate,
  onLoadCart,
}: {
  label: string;
  cart: CartInput;
  result: { total: number; overheadPct: number; extraFees: number };
  isWinner: boolean;
  isLoser: boolean;
  cartTotal: number;
  onUpdate: (field: keyof CartInput, value: string | number) => void;
  onLoadCart: () => void;
}) {
  const numField = (field: keyof CartInput, placeholder: string) => ({
    type: 'number',
    value: cart[field] === 0 ? '' : String(cart[field]),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      onUpdate(field, e.target.value === '' ? 0 : Number(e.target.value)),
    placeholder,
  });

  return (
    <div
      className={`rounded-xl border p-3 space-y-2.5 transition-all duration-300 ${
        isWinner
          ? 'border-brand-500/30 bg-brand-500/5'
          : isLoser
          ? 'border-red-500/15 bg-red-500/[0.02]'
          : 'border-white/[0.06] bg-white/[0.02]'
      }`}
    >
      {/* Label + Winner Badge */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</span>
        {isWinner && (
          <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand-500/15 text-brand-400 border border-brand-500/25 flex items-center gap-0.5 animate-fade-in">
            <Award className="w-2.5 h-2.5" strokeWidth={2.5} />
            Best
          </span>
        )}
      </div>

      {/* Platform Selector */}
      <select
        value={cart.platform}
        onChange={(e) => onUpdate('platform', e.target.value)}
        className="w-full bg-ink-900 border border-white/[0.08] rounded-lg px-2.5 py-2 text-xs font-bold text-white outline-none focus:border-brand-500/40 transition-colors"
      >
        {PLATFORMS.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>

      {/* Base Total + Load Cart */}
      <div>
        <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-600 block mb-1">Base Item Total</label>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">₹</span>
          <input
            {...numField('baseTotal', '0')}
            className="w-full bg-ink-900 border border-white/[0.08] rounded-lg pl-7 pr-2 py-2 text-xs text-white outline-none focus:border-brand-500/40 transition-colors font-mono"
          />
        </div>
        {cartTotal > 0 && (
          <button
            onClick={onLoadCart}
            className="w-full mt-1.5 text-[10px] font-bold text-brand-400/70 hover:text-brand-400 bg-brand-500/5 hover:bg-brand-500/10 py-1.5 rounded-md transition-all flex items-center justify-center gap-1 border border-brand-500/15"
          >
            <ShoppingBag className="w-2.5 h-2.5" strokeWidth={2.5} />
            Load Current Cart (₹{formatCurrency(cartTotal)})
          </button>
        )}
      </div>

      {/* Fee Inputs */}
      <FeeInput label="Handling / Packaging" icon="📦" {...numField('handlingFee', '0')} />
      <FeeInput label="Rain / Surge" icon="🌧️" {...numField('surgeFee', '0')} />
      <FeeInput label="Small-Cart Fee" icon="🛒" {...numField('smallCartFee', '0')} />

      {/* Discount */}
      <div>
        <label className="text-[9px] font-bold uppercase tracking-wider text-emerald-500/60 block mb-1">Coupon / Wallet Discount</label>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-500">−₹</span>
          <input
            {...numField('discount', '0')}
            className="w-full bg-ink-900 border border-emerald-500/15 rounded-lg pl-9 pr-2 py-2 text-xs text-white outline-none focus:border-emerald-500/40 transition-colors font-mono"
          />
        </div>
      </div>

      {/* Result */}
      <div className={`pt-2.5 mt-0.5 border-t ${
        isWinner ? 'border-brand-500/20' : 'border-white/[0.06]'
      }`}>
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Effective Total</span>
          {result.overheadPct > 0 && (
            <span className={`text-[9px] font-bold font-mono flex items-center gap-0.5 ${
              result.overheadPct > 15 ? 'text-red-400' : result.overheadPct > 5 ? 'text-orange-400' : 'text-zinc-500'
            }`}>
              <TrendingDown className="w-2.5 h-2.5" strokeWidth={2.5} />
              {result.overheadPct.toFixed(1)}% overhead
            </span>
          )}
        </div>
        <p className={`text-lg font-extrabold font-mono tabular-nums ${
          isWinner ? 'text-brand-400' : 'text-white'
        }`}>
          ₹{formatCurrency(result.total)}
        </p>
        {result.extraFees > 0 && (
          <p className="text-[10px] text-orange-400/70 font-mono mt-0.5">
            +₹{formatCurrency(result.extraFees)} in fees
          </p>
        )}
      </div>
    </div>
  );
}

function FeeInput({
  label,
  icon,
  ...inputProps
}: {
  label: string;
  icon: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-600 block mb-1">
        {icon} {label}
      </label>
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">₹</span>
        <input
          {...inputProps}
          className="w-full bg-ink-900 border border-white/[0.08] rounded-lg pl-7 pr-2 py-2 text-xs text-white outline-none focus:border-brand-500/40 transition-colors font-mono"
        />
      </div>
    </div>
  );
}
