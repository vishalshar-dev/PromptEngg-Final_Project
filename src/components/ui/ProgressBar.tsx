interface ProgressBarProps {
  value: number; // 0 to 100+
  tone?: 'brand' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  label?: string;
}

const barColors: Record<NonNullable<ProgressBarProps['tone']>, string> = {
  brand: 'bg-[#365FE8]',
  success: 'bg-[#15966B]',
  warning: 'bg-[#C7851F]',
  danger: 'bg-[#DE5252]',
};

export function ProgressBar({
  value,
  tone = 'brand',
  size = 'md',
  label,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const heightClass = size === 'sm' ? 'h-1.5' : 'h-2';

  return (
    <div
      className={`w-full ${heightClass} rounded-full bg-[#F1F3F6] tactile-well overflow-hidden`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
    >
      <div
        className={`h-full rounded-full transition-all duration-300 ${barColors[tone]}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
