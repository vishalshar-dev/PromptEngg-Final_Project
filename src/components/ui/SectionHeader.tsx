import type { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start sm:items-center justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-[16px] font-semibold font-display text-[var(--text-primary)] tracking-tight leading-snug">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[12.5px] text-[var(--text-secondary)] mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
