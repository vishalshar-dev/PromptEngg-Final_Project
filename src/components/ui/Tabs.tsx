import type { LucideIcon } from 'lucide-react';

export interface TabOption<T extends string = string> {
  id: T;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

interface TabsProps<T extends string = string> {
  items: ReadonlyArray<TabOption<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
  variant?: 'underline' | 'segmented';
}

export function Tabs<T extends string = string>({
  items,
  value,
  onChange,
  ariaLabel = 'Sections',
  variant = 'underline',
}: TabsProps<T>) {
  if (variant === 'segmented') {
    return (
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="inline-flex items-center p-1 rounded-xl bg-[#F1F3F6] border border-[#E7EAF0] overflow-x-auto no-scrollbar max-w-full"
      >
        {items.map((item) => {
          const Icon = item.icon;
          const active = value === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(item.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                active
                  ? 'bg-white text-[#151922] font-semibold shadow-card'
                  : 'text-[#697386] hover:text-[#151922]'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />}
              <span>{item.label}</span>
              {item.count !== undefined && (
                <span className="font-mono tabular-nums text-[11px] text-[#697386]">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex items-center gap-6 border-b border-[#E7EAF0] overflow-x-auto no-scrollbar"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={`relative inline-flex items-center gap-2 pb-3 text-[13.5px] whitespace-nowrap shrink-0 transition-colors ${
              active
                ? 'text-[#151922] font-semibold'
                : 'text-[#697386] font-medium hover:text-[#151922]'
            }`}
          >
            {Icon && <Icon className="w-4 h-4 shrink-0" strokeWidth={active ? 2.2 : 1.8} />}
            <span>{item.label}</span>
            {item.count !== undefined && item.count > 0 && (
              <span className="font-mono tabular-nums text-[11px] text-[#697386]">
                {item.count}
              </span>
            )}
            {active && (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-[2px] bg-[#365FE8] rounded-full"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
