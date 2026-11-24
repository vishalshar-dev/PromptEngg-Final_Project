import { useEffect } from 'react';
import { Maximize2, X } from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import type { AppSection } from '../ui/AppShell';
import { PennyChatCore } from './PennyChatCore';
import { PennyEmblem } from './PennyEmblem';

interface PennyFloatingCompanionProps {
  activeScreen: AppSection;
  hasCartBarVisible: boolean;
  hideLauncher?: boolean;
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
  hideLauncher = false,
  onNavigate,
}: PennyFloatingCompanionProps) {
  const isPennyOpen = useAppStore((s) => s.isPennyOpen);
  const setPennyOpen = useAppStore((s) => s.setPennyOpen);
  const pennyMessages = useAppStore((s) => s.pennyMessages);
  const showPennyCompanion = useAppStore((s) => s.featureSettings.showPennyCompanion);
  const showInsights = useAppStore((s) => s.featureSettings.showInsights);

  useEffect(() => {
    if (!isPennyOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPennyOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPennyOpen, setPennyOpen]);

  if (!showPennyCompanion) return null;

  const handleExpandToStudio = () => {
    setPennyOpen(false);
    onNavigate('insights', 'penny');
  };

  return (
    <>
      {/* Floating Docked Assistant Sheet */}
      {isPennyOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-[var(--backdrop-scrim)] sm:bg-transparent backdrop-blur-[1px] sm:backdrop-blur-none sm:pointer-events-none"
            onClick={() => setPennyOpen(false)}
          />
          <section
            role="dialog"
            aria-label="Penny AI companion window"
            data-testid="penny-floating-window"
            className="fixed z-50 inset-x-2.5 bottom-2.5 top-16 sm:inset-auto sm:bottom-5 sm:right-5 sm:w-[436px] sm:h-[620px] sm:max-h-[calc(100vh-2.25rem)] flex flex-col modal-panel rounded-2xl overflow-hidden animate-slide-up"
          >
            {/* Streamlined Single Header */}
            <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <PennyEmblem size="sm" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-[14px] font-bold text-[var(--text-primary)] tracking-tight leading-tight">
                      Penny
                    </h2>
                    <span className="text-[var(--text-muted)] text-xs" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-[11.5px] font-medium text-[var(--text-secondary)] truncate">
                      {SCREEN_LABELS[activeScreen]}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] truncate">
                    Money co-pilot · ask or confirm 1-click actions
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {showInsights && (
                  <button
                    type="button"
                    onClick={handleExpandToStudio}
                    aria-label="Open full Penny Co-Pilot workspace"
                    title="Expand to Insights → Penny"
                    className="w-8 h-8 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPennyOpen(false)}
                  aria-label="Close Penny window"
                  className="w-8 h-8 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Shared Conversational Core */}
            <div className="flex-1 min-h-0 p-3.5 flex flex-col bg-[var(--bg-surface)]">
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

      {/* Sleek Tactile Floating Launcher */}
      {!isPennyOpen && !hideLauncher && (
        <button
          type="button"
          onClick={() => setPennyOpen(true)}
          aria-label="Open Penny AI assistant (Cmd or Ctrl + K)"
          title="Ask Penny (⌘K / Ctrl+K)"
          data-testid="penny-floating-launcher"
          className={`fixed z-40 h-11 rounded-2xl bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-strong)] shadow-[var(--shadow-raised)] flex items-center justify-center gap-2 text-xs font-semibold whitespace-nowrap transition-all ${
            hasCartBarVisible
              ? 'right-3 sm:right-4 lg:right-6 bottom-[84px] lg:bottom-6 w-11 sm:w-auto px-0 sm:px-3.5'
              : 'right-4 lg:right-6 bottom-4 lg:bottom-6 px-3.5'
          }`}
        >
          <PennyEmblem size="xs" />
          <span className={hasCartBarVisible ? 'hidden sm:inline' : ''}>Ask Penny</span>
          {pennyMessages.length > 0 ? (
            <span
              className={`font-mono tabular-nums text-[11px] text-[var(--accent-ink)] ${
                hasCartBarVisible ? 'hidden sm:inline' : ''
              }`}
            >
              · {pennyMessages.length}
            </span>
          ) : (
            <kbd className="hidden sm:inline text-[10px] font-mono text-[var(--text-muted)] ml-0.5">
              ⌘K
            </kbd>
          )}
        </button>
      )}
    </>
  );
}
