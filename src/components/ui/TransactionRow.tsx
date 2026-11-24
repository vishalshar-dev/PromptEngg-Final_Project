import type { ReactNode } from 'react';
import { formatCurrencyExact } from '../../utils/categoryStyles';

interface TransactionRowProps {
  title: string;
  metadata: string;
  amount: number;
  inactive?: boolean;
  prefix?: string;
  amountTone?: 'default' | 'positive' | 'negative' | 'muted';
  statusText?: string;
  actions?: ReactNode;
  secondaryRow?: ReactNode;
}

export function TransactionRow({
  title,
  metadata,
  amount,
  inactive = false,
  prefix = '-₹',
  amountTone = 'default',
  statusText,
  actions,
  secondaryRow,
}: TransactionRowProps) {
  const toneClass = inactive
    ? 'line-through text-[var(--text-muted)]'
    : amountTone === 'positive'
      ? 'text-[var(--accent-success-ink)]'
      : amountTone === 'negative'
        ? 'text-[var(--accent-danger-ink)]'
        : amountTone === 'muted'
          ? 'text-[var(--text-secondary)]'
          : 'text-[var(--text-primary)]';

  return (
    <div className={`py-3.5 transition-colors ${inactive ? 'opacity-65' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className={`text-[14px] font-medium truncate ${
                inactive ? 'line-through text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'
              }`}
            >
              {title}
            </p>
            {statusText && (
              <span className="text-[12px] font-medium text-[var(--accent-warning-ink)]">
                · {statusText}
              </span>
            )}
          </div>
          <p className="text-[12.5px] text-[var(--text-secondary)] mt-0.5 truncate">
            {metadata}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-[14px] font-semibold font-mono tabular-nums ${toneClass}`}
          >
            {prefix}
            {formatCurrencyExact(amount)}
          </span>
          {actions}
        </div>
      </div>

      {secondaryRow && <div className="mt-2.5">{secondaryRow}</div>}
    </div>
  );
}
