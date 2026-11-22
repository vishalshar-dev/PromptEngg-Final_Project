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
    value: 'text-[#151922]',
    iconWrap: 'bg-[#F1F3F6] text-[#697386]',
  },
  brand: {
    value: 'text-[#365FE8]',
    iconWrap: 'bg-[#EDF2FF] text-[#365FE8]',
  },
  success: {
    value: 'text-[#15966B]',
    iconWrap: 'bg-[#E8F7F1] text-[#15966B]',
  },
  warning: {
    value: 'text-[#C7851F]',
    iconWrap: 'bg-[#FEF6E7] text-[#C7851F]',
  },
  danger: {
    value: 'text-[#DE5252]',
    iconWrap: 'bg-[#FDECEC] text-[#DE5252]',
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
          <p className="text-[12px] font-medium text-[#697386]">{label}</p>
          <p
            className={`text-[20px] sm:text-[22px] font-bold font-mono tabular-nums tracking-tight mt-1 ${styles.value}`}
          >
            {value}
          </p>
          {sublabel && (
            <p className="text-[12px] text-[#697386] mt-1 truncate">{sublabel}</p>
          )}
        </div>
        {Icon && (
          <div
            className={`w-9 h-9 rounded-xl border border-[#E7EAF0] flex items-center justify-center shrink-0 ${styles.iconWrap}`}
          >
            <Icon className="w-[18px] h-[18px]" strokeWidth={2} />
          </div>
        )}
      </div>
    </div>
  );
}
