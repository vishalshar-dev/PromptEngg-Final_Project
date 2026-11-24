import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  sublabel?: string;
  icon?: LucideIcon;
  tone?: 'default' | 'brand' | 'success' | 'warning' | 'danger';
  className?: string;
}

const toneClasses: Record<
  NonNullable<MetricCardProps['tone']>,
  { value: string; iconWrap: string }
> = {
  default: {
    value: 'text-[var(--text-primary)]',
    iconWrap: 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)]',
  },
  brand: {
    value: 'text-[var(--accent-ink)]',
    iconWrap: 'bg-[var(--accent-primary-soft)] text-[var(--accent-ink)] border-[var(--accent-border)]',
  },
  success: {
    value: 'text-[var(--accent-success-ink)]',
    iconWrap: 'bg-[var(--accent-success-soft)] text-[var(--accent-success-ink)] border-[var(--accent-success-border)]',
  },
  warning: {
    value: 'text-[var(--accent-warning-ink)]',
    iconWrap: 'bg-[var(--accent-warning-soft)] text-[var(--accent-warning-ink)] border-[var(--accent-warning-border)]',
  },
  danger: {
    value: 'text-[var(--accent-danger-ink)]',
    iconWrap: 'bg-[var(--accent-danger-soft)] text-[var(--accent-danger-ink)] border-[var(--accent-danger-border)]',
  },
};

export function MetricCard({
  label,
  value,
  sublabel,
  icon: Icon,
  tone = 'default',
  className = '',
}: MetricCardProps) {
  const styles = toneClasses[tone];
  return (
    <div className={`surface-card p-4 sm:p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12.5px] font-medium text-[var(--text-secondary)]">{label}</p>
          <p
            className={`text-[21px] sm:text-[23px] font-bold font-mono tabular-nums tracking-tight mt-1 ${styles.value}`}
          >
            {value}
          </p>
          {sublabel && (
            <p className="text-[12px] text-[var(--text-secondary)] mt-1 truncate">{sublabel}</p>
          )}
        </div>
        {Icon && (
          <div
            className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${styles.iconWrap}`}
          >
            <Icon className="w-[18px] h-[18px]" strokeWidth={1.9} />
          </div>
        )}
      </div>
    </div>
  );
}
