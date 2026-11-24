import { useState, useMemo } from 'react';
import {
  Scale,
  ShoppingBag,
  TrendingDown,
  Award,
  Save,
  Check,
  Package,
  CloudRain,
  ShoppingCart,
} from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { formatCurrency } from '../../utils/categoryStyles';
import { calculateCartTotals } from '../../utils/martEngine';

const PLATFORMS = [
  'Zepto',
  'Blinkit',
  'Swiggy Instamart',
  'BigBasket',
  'Amazon Fresh',
  'JioMart',
];

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

function calcEffective(cart: CartInput): {
  total: number;
  overheadPct: number;
  extraFees: number;
} {
  const extraFees = cart.handlingFee + cart.surgeFee + cart.smallCartFee;
  const total = cart.baseTotal + extraFees - cart.discount;
  const overheadPct =
    cart.baseTotal > 0 ? (extraFees / cart.baseTotal) * 100 : 0;
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

  const cartTotal = useMemo(() => calculateCartTotals(items).totalAmount, [items]);
  const resultA = useMemo(() => calcEffective(cartA), [cartA]);
  const resultB = useMemo(() => calcEffective(cartB), [cartB]);

  const winner = resultA.total <= resultB.total ? 'A' : 'B';
  const winnerCart = winner === 'A' ? cartA : cartB;
  const winnerResult = winner === 'A' ? resultA : resultB;
  const loserResult = winner === 'A' ? resultB : resultA;
  const savings = loserResult.total - winnerResult.total;
  const isTie = Math.abs(resultA.total - resultB.total) < 0.01;

  const updateCart = (
    side: 'A' | 'B',
    field: keyof CartInput,
    value: string | number
  ) => {
    const setter = side === 'A' ? setCartA : setCartB;
    setter((prev) => ({ ...prev, [field]: value }));
  };

  const loadCurrentCart = (side: 'A' | 'B') => {
    const setter = side === 'A' ? setCartA : setCartB;
    setter((prev) => ({ ...prev, baseTotal: cartTotal }));
  };

  const handleLog = () => {
    const flags: {
      type: string;
      severity: 'warning' | 'critical';
      message: string;
      estimatedCost: number;
    }[] = [];

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
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-[var(--accent-primary-soft)] border border-[var(--accent-border)] text-[var(--accent-ink)] flex items-center justify-center">
          <Scale className="w-4 h-4" strokeWidth={2.25} />
        </div>
        <div>
          <h3 className="font-display text-[15px] font-bold text-[var(--text-primary)] tracking-tight">
            Multi-App Cart Comparator
          </h3>
          <p className="text-[12px] text-[var(--text-secondary)]">
            Compare effective checkout totals across quick-commerce platforms
          </p>
        </div>
      </div>

      {/* Side-by-Side Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        <div className="rounded-2xl border border-[var(--accent-success-border)] bg-[var(--accent-success-soft)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[var(--bg-surface)] border border-[var(--accent-success-border)] flex items-center justify-center text-[var(--accent-success-ink)]">
                <Award className="w-5 h-5" strokeWidth={2.25} />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-[var(--accent-success-ink)]">
                  Best Deal
                </p>
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  {winnerCart.platform}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[12px] font-medium text-[var(--text-secondary)]">
                You Save
              </p>
              <p className="text-lg font-bold font-mono tabular-nums text-[var(--accent-success-ink)]">
                ₹{formatCurrency(savings)}
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[var(--accent-success-border)] flex items-center justify-between text-[12px]">
            <span className="text-[var(--text-secondary)] font-medium">
              {winnerCart.platform}:{' '}
              <span className="font-mono tabular-nums font-bold text-[var(--text-primary)]">
                ₹{formatCurrency(winnerResult.total)}
              </span>
            </span>
            <span className="text-[var(--text-secondary)] font-medium">
              {(winner === 'A' ? cartB : cartA).platform}:{' '}
              <span className="font-mono tabular-nums font-semibold text-[var(--text-secondary)]">
                ₹{formatCurrency(loserResult.total)}
              </span>
            </span>
          </div>
        </div>
      )}

      {hasData && isTie && (
        <div className="surface-well p-3.5 text-center">
          <p className="text-sm font-bold text-[var(--text-primary)]">
            Both apps cost the same
          </p>
          <p className="text-[12px] text-[var(--text-secondary)] mt-0.5 tabular-nums">
            ₹{formatCurrency(resultA.total)} each — pick either one
          </p>
        </div>
      )}

      {hasData && (
        <button
          type="button"
          onClick={handleLog}
          className={`w-full py-2.5 px-4 rounded-xl text-[12.5px] font-semibold transition-colors flex items-center justify-center gap-1.5 border ${
            loggedFlash
              ? 'bg-[var(--accent-success-soft)] text-[var(--accent-success-ink)] border-[var(--accent-success-border)]'
              : 'btn-secondary'
          }`}
        >
          {loggedFlash ? (
            <>
              <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> Logged to Audit History
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" strokeWidth={2.25} /> Log Comparison to History
            </>
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
      className={`rounded-xl border p-3.5 space-y-2.5 transition-colors ${
        isWinner
          ? 'border-[var(--accent-success-border)] bg-[var(--accent-success-soft)]'
          : isLoser
          ? 'border-[var(--accent-danger-border)] bg-[var(--accent-danger-soft)]'
          : 'surface-well border-[var(--border-subtle)]'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold text-[var(--text-secondary)]">
          {label}
        </span>
        {isWinner && (
          <span className="text-[12px] font-semibold text-[var(--accent-success-ink)] flex items-center gap-1">
            <Award className="w-3.5 h-3.5" strokeWidth={2.25} />
            Best
          </span>
        )}
      </div>

      <select
        aria-label={`${label} platform`}
        value={cart.platform}
        onChange={(e) => onUpdate('platform', e.target.value)}
        className="input-field w-full px-2.5 py-2 text-[12.5px] font-semibold"
      >
        {PLATFORMS.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      <div>
        <label className="text-[12px] font-medium text-[var(--text-secondary)] block mb-1">
          Base Item Total
        </label>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[var(--text-secondary)]">
            ₹
          </span>
          <input
            aria-label={`${label} base item total`}
            {...numField('baseTotal', '0')}
            className="input-field w-full pl-7 pr-2 py-2 text-[12.5px] font-mono tabular-nums"
          />
        </div>
        {cartTotal > 0 && (
          <button
            type="button"
            onClick={onLoadCart}
            className="w-full mt-1.5 text-[12px] font-semibold text-[var(--accent-ink)] bg-[var(--accent-primary-soft)] hover:bg-[var(--accent-primary-soft-hover)] py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 border border-[var(--accent-border)]"
          >
            <ShoppingBag className="w-3 h-3" strokeWidth={2.25} />
            Load Cart (₹{formatCurrency(cartTotal)})
          </button>
        )}
      </div>

      <FeeInput
        label="Handling / Packaging"
        icon={Package}
        ariaLabel={`${label} handling fee`}
        {...numField('handlingFee', '0')}
      />
      <FeeInput
        label="Rain / Surge"
        icon={CloudRain}
        ariaLabel={`${label} surge fee`}
        {...numField('surgeFee', '0')}
      />
      <FeeInput
        label="Small-Cart Fee"
        icon={ShoppingCart}
        ariaLabel={`${label} small cart fee`}
        {...numField('smallCartFee', '0')}
      />

      <div>
        <label className="text-[12px] font-medium text-[var(--accent-success-ink)] block mb-1">
          Coupon / Wallet Discount
        </label>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[var(--accent-success-ink)]">
            −₹
          </span>
          <input
            aria-label={`${label} discount`}
            {...numField('discount', '0')}
            className="input-field w-full pl-9 pr-2 py-2 text-[12.5px] font-mono tabular-nums border-[var(--accent-success-border)]"
          />
        </div>
      </div>

      <div
        className={`pt-2.5 border-t ${
          isWinner ? 'border-[var(--accent-success-border)]' : 'border-[var(--border-subtle)]'
        }`}
      >
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[12px] font-medium text-[var(--text-secondary)]">
            Effective Total
          </span>
          {result.overheadPct > 0 && (
            <span
              className={`text-[12px] font-bold font-mono tabular-nums flex items-center gap-0.5 ${
                result.overheadPct > 15
                  ? 'text-[var(--accent-danger-ink)]'
                  : result.overheadPct > 5
                  ? 'text-[var(--accent-warning-ink)]'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              <TrendingDown className="w-3 h-3" strokeWidth={2.25} />
              {result.overheadPct.toFixed(1)}%
            </span>
          )}
        </div>
        <p
          className={`text-lg font-bold font-mono tabular-nums ${
            isWinner ? 'text-[var(--accent-success-ink)]' : 'text-[var(--text-primary)]'
          }`}
        >
          ₹{formatCurrency(result.total)}
        </p>
        {result.extraFees > 0 && (
          <p className="text-[12px] text-[var(--accent-warning-ink)] font-mono tabular-nums mt-0.5">
            +₹{formatCurrency(result.extraFees)} in fees
          </p>
        )}
      </div>
    </div>
  );
}

function FeeInput({
  label,
  icon: Icon,
  ariaLabel,
  ...inputProps
}: {
  label: string;
  icon: typeof Package;
  ariaLabel: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="text-[12px] font-medium text-[var(--text-secondary)] flex items-center gap-1 mb-1">
        <Icon className="w-3 h-3 text-[var(--text-muted)]" strokeWidth={2.25} />
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[var(--text-secondary)]">
          ₹
        </span>
        <input
          aria-label={ariaLabel}
          {...inputProps}
          className="input-field w-full pl-7 pr-2 py-2 text-[12.5px] font-mono tabular-nums"
        />
      </div>
    </div>
  );
}
