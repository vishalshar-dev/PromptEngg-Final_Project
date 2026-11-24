import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[var(--border-subtle)]">
      <div className="min-w-0">
        <h1 className="text-[24px] sm:text-[28px] font-bold font-display tracking-tight text-[var(--text-primary)] leading-tight">
          {title}
        </h1>
        {description && (
          <p className="text-[13.5px] text-[var(--text-secondary)] mt-1 max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
}
