interface ProgressBarProps {
  value: number; // 0 to 100+
  tone?: 'brand' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  markerPct?: number;
  markerLabel?: string;
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
  markerPct,
  markerLabel,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const heightClass = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2';
  const showMarker =
    typeof markerPct === 'number' &&
    Number.isFinite(markerPct) &&
    markerPct > 0 &&
    markerPct < 100;
  const clampedMarker = showMarker
    ? Math.max(1, Math.min(99, markerPct))
    : 0;

  return (
    <div
      className={`relative w-full ${heightClass} rounded-full bg-[#F1F3F6] tactile-well overflow-hidden`}
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
      {showMarker && (
        <span
          aria-hidden="true"
          title={markerLabel}
          className="absolute inset-y-0 w-[2px] -translate-x-1/2 pointer-events-none"
          style={{
            left: `${clampedMarker}%`,
            backgroundColor: 'var(--text-primary)',
            opacity: 0.4,
          }}
        />
      )}
    </div>
  );
}

