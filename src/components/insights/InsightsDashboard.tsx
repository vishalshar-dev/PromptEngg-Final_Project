import { useState, useEffect } from 'react';
import { Radar, LineChart } from 'lucide-react';
import { PageHeader } from '../ui/PageHeader';
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
  const [activeTab, setActiveTab] = useState<InsightsTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insights"
        description="Analyze category budgets, spending velocity, anomalies, and product unit-price trends."
        actions={
          <div
            role="tablist"
            aria-label="Insights sections"
            className="inline-flex items-center p-1 rounded-xl bg-white border border-[#E7EAF0] shadow-xs"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'radar'}
              onClick={() => setActiveTab('radar')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'radar'
                  ? 'bg-[#365FE8] text-white'
                  : 'text-[#697386] hover:text-[#151922]'
              }`}
            >
              <Radar className="w-4 h-4" />
              Smart Radar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'prices'}
              onClick={() => setActiveTab('prices')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'prices'
                  ? 'bg-[#365FE8] text-white'
                  : 'text-[#697386] hover:text-[#151922]'
              }`}
            >
              <LineChart className="w-4 h-4" />
              Price Intelligence
            </button>
          </div>
        }
      />

      {activeTab === 'radar' ? (
        <RadarDashboard onOpenLedger={onOpenExpenses} />
      ) : (
        <PriceTrackerDashboard />
      )}
    </div>
  );
}
