import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-[#D8DEE8] bg-[#F7F8FA]/60 text-center flex flex-col items-center justify-center ${
        compact ? 'px-4 py-7' : 'px-6 py-12'
      }`}
    >
      <div className="w-11 h-11 rounded-2xl bg-white border border-[#E7EAF0] flex items-center justify-center text-[#697386] mb-3 shadow-xs">
        <Icon className="w-5 h-5" strokeWidth={1.8} />
      </div>
      <h3 className="text-[15px] font-semibold text-[#151922]">{title}</h3>
      <p className="text-[13px] text-[#697386] max-w-sm mt-1 leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
