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
        framed ? 'rounded-2xl border border-[#E7EAF0] bg-white' : ''
      } ${compact ? 'px-4 py-6' : 'px-6 py-10'}`}
    >
      <div className="w-10 h-10 rounded-xl bg-[#F1F3F6] border border-[#E7EAF0] flex items-center justify-center text-[#697386] mb-3">
        <Icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
      </div>
      <h3 className="text-[14.5px] font-semibold text-[#151922]">{title}</h3>
      <p className="text-[12.5px] text-[#697386] max-w-sm mt-1 leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
