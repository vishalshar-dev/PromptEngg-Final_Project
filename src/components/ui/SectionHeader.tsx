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
        <h2 className="text-[16px] font-semibold text-[#151922] tracking-tight leading-snug">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[12.5px] text-[#697386] mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
