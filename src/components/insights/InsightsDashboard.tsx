import { useState, useEffect } from 'react';
import { Radar, LineChart, Sparkles } from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { RadarDashboard } from '../analytics/RadarDashboard';
import { PriceTrackerDashboard } from '../prices/PriceTrackerDashboard';
import { PennyCopilotPanel } from './PennyCopilotPanel';

export type InsightsTab = 'penny' | 'radar' | 'prices';

interface InsightsDashboardProps {
  initialTab?: InsightsTab;
  tabSignal?: number;
  onTabChange?: (tab: InsightsTab) => void;
  onOpenExpenses?: () => void;
  onOpenShopping?: (subTab?: 'home' | 'baskets') => void;
  onOpenScanner?: () => void;
  onOpenWellness?: () => void;
}

export function InsightsDashboard({
  initialTab = 'penny',
  tabSignal = 0,
  onTabChange,
  onOpenExpenses,
  onOpenShopping,
  onOpenScanner,
  onOpenWellness,
}: InsightsDashboardProps) {
  const showPriceTracker = useAppStore((s) => s.featureSettings.showPriceTracker);
  const [activeTab, setActiveTab] = useState<InsightsTab>(
    initialTab === 'prices' && !showPriceTracker ? 'radar' : initialTab
  );

  useEffect(() => {
    setActiveTab(initialTab === 'prices' && !showPriceTracker ? 'radar' : initialTab);
  }, [initialTab, tabSignal, showPriceTracker]);

  useEffect(() => {
    if (!showPriceTracker && activeTab === 'prices') {
      setActiveTab('radar');
    }
  }, [showPriceTracker, activeTab]);

  useEffect(() => {
    onTabChange?.(activeTab);
  }, [activeTab, onTabChange]);

  return (
    <div className="space-y-5">
      {/* Header + Integrated Underline Tab Strip */}
      <div className="border-b border-[var(--border-subtle)]">
        <div className="pb-4">
          <div className="min-w-0">
            <h1 className="font-display text-[24px] sm:text-[28px] font-bold tracking-tight text-[var(--text-primary)] leading-tight">
              Insights
            </h1>
            <p className="text-[13.5px] text-[var(--text-secondary)] mt-1 max-w-2xl leading-relaxed">
              Ask Penny about your spending &amp; upcoming bills, track category velocity, and monitor product unit prices.
            </p>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Insights sections"
          className="flex items-center gap-5 sm:gap-7 -mb-px overflow-x-auto no-scrollbar"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'penny'}
            onClick={() => setActiveTab('penny')}
            className={`flex items-center gap-2 pb-3 pt-1 text-[13.5px] font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'penny'
                ? 'border-[var(--accent-primary)] text-[var(--accent-ink)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Penny AI
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'radar'}
            onClick={() => setActiveTab('radar')}
            className={`flex items-center gap-2 pb-3 pt-1 text-[13.5px] font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'radar'
                ? 'border-[var(--accent-primary)] text-[var(--accent-ink)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Radar className="w-4 h-4" />
            Smart Radar
          </button>

          {showPriceTracker && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'prices'}
              onClick={() => setActiveTab('prices')}
              className={`flex items-center gap-2 pb-3 pt-1 text-[13.5px] font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'prices'
                  ? 'border-[var(--accent-primary)] text-[var(--accent-ink)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <LineChart className="w-4 h-4" />
              Price Intelligence
            </button>
          )}
        </div>
      </div>

      {activeTab === 'penny' ? (
        <PennyCopilotPanel
          onSwitchInsightsTab={setActiveTab}
          onOpenExpenses={onOpenExpenses}
          onOpenShopping={onOpenShopping}
          onOpenScanner={onOpenScanner}
          onOpenWellness={onOpenWellness}
        />
      ) : activeTab === 'prices' && showPriceTracker ? (
        <PriceTrackerDashboard />
      ) : (
        <RadarDashboard onOpenLedger={onOpenExpenses} />
      )}
    </div>
  );
}

