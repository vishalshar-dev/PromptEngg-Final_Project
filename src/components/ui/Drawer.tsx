import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  headerAction?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  maxWidthClass?: string;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  headerAction,
  footer,
  children,
  maxWidthClass = 'lg:max-w-[440px]',
}: DrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-stretch justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="fixed inset-0 bg-[#151922]/35 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />

      <div
        className={`relative z-10 w-full ${maxWidthClass} bg-white border-t lg:border-t-0 lg:border-l border-[#E7EAF0] rounded-t-2xl lg:rounded-none shadow-modal flex flex-col max-h-[88vh] lg:max-h-screen lg:h-full animate-slide-up lg:animate-fade-in`}
      >
        {/* Mobile sheet drag handle */}
        <div className="lg:hidden flex justify-center pt-2.5 pb-1">
          <span className="w-9 h-1 rounded-full bg-[#D5DBE5]" aria-hidden="true" />
        </div>

        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-[#E7EAF0] flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2 className="text-[17px] font-semibold tracking-tight text-[#151922] truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[12.5px] text-[#697386] mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerAction}
            <button
              type="button"
              onClick={onClose}
              aria-label={`Close ${title}`}
              className="w-8 h-8 rounded-lg text-[#697386] hover:text-[#151922] hover:bg-[#F1F3F6] flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4">
          {children}
        </div>

        {/* Sticky Footer */}
        {footer && (
          <div className="px-5 py-4 border-t border-[#E7EAF0] bg-[#FFFFFF] shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
