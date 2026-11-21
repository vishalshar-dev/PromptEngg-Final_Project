import { useEffect } from 'react';
import { Minimize2, Sparkles, X } from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import type { AppSection } from '../ui/AppShell';
import { PennyChatCore } from './PennyChatCore';

interface PennyFloatingCompanionProps {
  activeScreen: AppSection;
  hasCartBarVisible: boolean;
  onNavigate: (section: AppSection, subTab?: string) => void;
}

const SCREEN_LABELS: Record<AppSection, string> = {
  overview: 'Overview',
  shopping: 'Shopping',
  insights: 'Insights',
  expenses: 'Expenses',
  scanner: 'Receipt Scanner',
  wellness: 'Financial Wellness',
};

export function PennyFloatingCompanion({
  activeScreen,
  hasCartBarVisible,
  onNavigate,
}: PennyFloatingCompanionProps) {
  const isPennyOpen = useAppStore((s) => s.isPennyOpen);
  const setPennyOpen = useAppStore((s) => s.setPennyOpen);
  const pennyMessages = useAppStore((s) => s.pennyMessages);
  const showPennyCompanion = useAppStore((s) => s.featureSettings.showPennyCompanion);

  useEffect(() => {
    if (!isPennyOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPennyOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPennyOpen, setPennyOpen]);

  if (!showPennyCompanion) return null;

  return (
    <>
      {/* Floating Docked Chat Window */}
      {isPennyOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-[#151922]/35 sm:bg-transparent backdrop-blur-[1px] sm:backdrop-blur-none sm:pointer-events-none"
            onClick={() => setPennyOpen(false)}
          />
          <section
            role="dialog"
            aria-label="Penny AI companion window"
            data-testid="penny-floating-window"
            className="fixed z-50 inset-x-2.5 bottom-2.5 top-16 sm:inset-auto sm:bottom-5 sm:right-5 sm:w-[410px] sm:h-[580px] sm:max-h-[calc(100vh-2.5rem)] flex flex-col bg-white border border-[#E7EAF0] rounded-2xl shadow-modal overflow-hidden animate-slide-up"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-[#E7EAF0] flex items-center justify-between gap-2 shrink-0 bg-[#FFFFFF]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#365FE8] text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[14px] font-bold text-[#151922] leading-tight truncate">
                      Penny AI
                    </h2>
                    <span className="text-[11px] font-semibold text-[#697386] truncate">
                      · {SCREEN_LABELS[activeScreen]}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#697386] truncate">
                    Adaptive companion · Ask or act anywhere
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setPennyOpen(false)}
                  aria-label="Minimize Penny chat"
                  className="w-7 h-7 rounded-lg bg-[#F1F3F6] hover:bg-[#E7EAF0] text-[#697386] hover:text-[#151922] flex items-center justify-center transition-colors"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPennyOpen(false)}
                  aria-label="Close Penny window"
                  className="w-7 h-7 rounded-lg bg-[#F1F3F6] hover:bg-[#E7EAF0] text-[#697386] hover:text-[#151922] flex items-center justify-center transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Shared Conversational Core */}
            <div className="flex-1 min-h-0 p-3.5 flex flex-col">
              <PennyChatCore
                activeScreen={activeScreen}
                onNavigate={onNavigate}
                compact
                inputId="penny-floating-input"
              />
            </div>
          </section>
        </>
      )}

      {/* Compact Global Floating Launcher */}
      {!isPennyOpen && (
        <button
          type="button"
          onClick={() => setPennyOpen(true)}
          aria-label="Open Penny AI assistant (Cmd or Ctrl + K)"
          title="Ask Penny (⌘K / Ctrl+K)"
          data-testid="penny-floating-launcher"
          className={`fixed right-4 lg:right-6 z-40 h-11 px-4 rounded-2xl bg-[#365FE8] hover:bg-[#294FCC] text-white shadow-modal flex items-center gap-2 text-xs font-bold whitespace-nowrap transition-all ${
            hasCartBarVisible ? 'bottom-[84px] lg:bottom-6' : 'bottom-4 lg:bottom-6'
          }`}
        >
          <Sparkles className="w-4 h-4 shrink-0" strokeWidth={2.2} />
          <span>Ask Penny</span>
          {pennyMessages.length > 0 ? (
            <span className="font-mono tabular-nums text-[11px] text-white/85">
              ({pennyMessages.length})
            </span>
          ) : (
            <span className="hidden sm:inline text-[10px] font-mono text-white/75 ml-0.5">
              ⌘K
            </span>
          )}
        </button>
      )}
    </>
  );
}
