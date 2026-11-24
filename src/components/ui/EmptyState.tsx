import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
  framed?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  framed = false,
}: EmptyStateProps) {
  return (
    <div
      className={`text-center flex flex-col items-center justify-center ${
        framed ? 'surface-card' : ''
      } ${compact ? 'px-4 py-6' : 'px-6 py-10'}`}
    >
      <div className="w-10 h-10 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] mb-3">
        <Icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
      </div>
      <h3 className="text-[14.5px] font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="text-[12.5px] text-[var(--text-secondary)] max-w-sm mt-1 leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
