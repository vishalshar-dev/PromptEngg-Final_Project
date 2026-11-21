import { useState, useEffect } from 'react';
import { Radar, LineChart } from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { RadarDashboard } from '../analytics/RadarDashboard';
import { PriceTrackerDashboard } from '../prices/PriceTrackerDashboard';

export type InsightsTab = 'radar' | 'prices';

interface InsightsDashboardProps {
  initialTab?: InsightsTab;
  onOpenExpenses?: () => void;
}

export function InsightsDashboard({
  initialTab = 'radar',
  onOpenExpenses,
}: InsightsDashboardProps) {
  const showPriceTracker = useAppStore((s) => s.featureSettings.showPriceTracker);
  const [activeTab, setActiveTab] = useState<InsightsTab>(
    initialTab === 'prices' && !showPriceTracker ? 'radar' : initialTab
  );

  useEffect(() => {
    setActiveTab(initialTab === 'prices' && !showPriceTracker ? 'radar' : initialTab);
  }, [initialTab, showPriceTracker]);

  useEffect(() => {
    if (!showPriceTracker && activeTab === 'prices') {
      setActiveTab('radar');
    }
  }, [showPriceTracker, activeTab]);

  return (
    <div className="space-y-5">
      {/* Header + Integrated Underline Tab Strip */}
      <div className="border-b border-[#E7EAF0]">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4">
          <div className="min-w-0">
            <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-[#151922] leading-tight">
              Insights
            </h1>
            <p className="text-[13.5px] text-[#697386] mt-1 max-w-2xl leading-relaxed">
              Analyze category budgets, spending velocity, anomalies, and product unit-price trends.
            </p>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Insights sections"
          className="flex items-center gap-6 -mb-px overflow-x-auto no-scrollbar"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'radar'}
            onClick={() => setActiveTab('radar')}
            className={`flex items-center gap-2 pb-3 text-[13.5px] font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'radar'
                ? 'border-[#365FE8] text-[#365FE8]'
                : 'border-transparent text-[#697386] hover:text-[#151922]'
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
              className={`flex items-center gap-2 pb-3 text-[13.5px] font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'prices'
                  ? 'border-[#365FE8] text-[#365FE8]'
                  : 'border-transparent text-[#697386] hover:text-[#151922]'
              }`}
            >
              <LineChart className="w-4 h-4" />
              Price Intelligence
            </button>
          )}
        </div>
      </div>

      {activeTab === 'radar' || !showPriceTracker ? (
        <RadarDashboard onOpenLedger={onOpenExpenses} />
      ) : (
        <PriceTrackerDashboard />
      )}
    </div>
  );
}
