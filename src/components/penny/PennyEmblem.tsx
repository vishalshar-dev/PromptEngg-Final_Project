interface PennyEmblemProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  thinking?: boolean;
  variant?: 'accent' | 'subtle';
}

const SIZE_CLASSES: Record<NonNullable<PennyEmblemProps['size']>, string> = {
  xs: 'w-6 h-6 rounded-lg',
  sm: 'w-8 h-8 rounded-xl',
  md: 'w-9 h-9 rounded-xl',
  lg: 'w-11 h-11 rounded-2xl',
};

const ICON_SIZES: Record<NonNullable<PennyEmblemProps['size']>, string> = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-4.5 h-4.5',
  lg: 'w-5 h-5',
};

export function PennyEmblem({
  size = 'md',
  thinking = false,
  variant = 'accent',
}: PennyEmblemProps) {
  const isAccent = variant === 'accent';

  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex items-center justify-center shrink-0 select-none transition-transform duration-200 ${SIZE_CLASSES[size]} ${
        isAccent
          ? 'bg-[var(--accent-primary)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_2px_6px_rgba(0,0,0,0.14)]'
          : 'bg-[var(--accent-primary-soft)] text-[var(--accent-ink)] border border-[var(--accent-border)]'
      } ${thinking ? 'animate-pulse' : ''}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={ICON_SIZES[size]}
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="8.25" strokeOpacity="0.92" />
        <path d="M9.75 15.5V8.75H13a2.25 2.25 0 0 1 0 4.5H9.75" />
        <circle cx="16.75" cy="7.25" r="1.15" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}
