import { useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  Bell,
  LayoutDashboard,
  Shield,
  ShieldAlert,
} from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { toLocalDateKey } from '../../utils/martEngine';
import {
  classifyTransactions,
  computeBehaviourAnalytics,
  computeBrokeModeStatus,
  computeDisciplineScore,
  computeJunkIntelligence,
  evaluateCategoryLimits,
  evaluateChallenges,
  evaluateFinancialTargets,
  generateSmartAlerts,
} from '../../utils/warRoomEngine';
import { PageHeader } from '../ui/PageHeader';
import { BrokeModePanel } from '../warroom/BrokeModePanel';
import { DisciplineChallengesPanel } from '../warroom/DisciplineChallengesPanel';
import { JunkBehaviourPanel } from '../warroom/JunkBehaviourPanel';
import { LimitsAlertsPanel } from '../warroom/LimitsAlertsPanel';
import {
  WarRoomOverview,
  type WarRoomSection,
} from '../warroom/WarRoomOverview';

export function SurvivalSandbox() {
  const [section, setSection] = useState<WarRoomSection>('overview');

  const transactions = useAppStore((s) => s.transactions);
  const totalBudget = useAppStore((s) => s.totalBudget);
  const categories = useAppStore((s) => s.categories);
  const brokeModeConfig = useAppStore((s) => s.brokeModeConfig);
  const categoryLimits = useAppStore((s) => s.categoryLimits);
  const warRoomChallenges = useAppStore((s) => s.warRoomChallenges);
  const warRoomTargets = useAppStore((s) => s.warRoomTargets);
  const dismissedWarRoomAlerts = useAppStore((s) => s.dismissedWarRoomAlerts);
  const disciplineCheckIns = useAppStore((s) => s.disciplineCheckIns);

  const toggleBrokeMode = useAppStore((s) => s.toggleBrokeMode);
  const updateBrokeModeConfig = useAppStore((s) => s.updateBrokeModeConfig);
  const updateTransactionClassification = useAppStore(
    (s) => s.updateTransactionClassification
  );
  const upsertCategoryLimit = useAppStore((s) => s.upsertCategoryLimit);
  const deleteCategoryLimit = useAppStore((s) => s.deleteCategoryLimit);
  const dismissWarRoomAlert = useAppStore((s) => s.dismissWarRoomAlert);
  const restoreDismissedWarRoomAlerts = useAppStore(
    (s) => s.restoreDismissedWarRoomAlerts
  );
  const startWarRoomChallenge = useAppStore((s) => s.startWarRoomChallenge);
  const completeWarRoomChallenge = useAppStore(
    (s) => s.completeWarRoomChallenge
  );
  const deleteWarRoomChallenge = useAppStore((s) => s.deleteWarRoomChallenge);
  const recordDisciplineCheckIn = useAppStore((s) => s.recordDisciplineCheckIn);
  const addFinancialTarget = useAppStore((s) => s.addFinancialTarget);
  const logTargetSavingsTransfer = useAppStore(
    (s) => s.logTargetSavingsTransfer
  );
  const deleteFinancialTarget = useAppStore((s) => s.deleteFinancialTarget);

  const classifiedTxs = useMemo(
    () => classifyTransactions(transactions),
    [transactions]
  );

  const brokeStatus = useMemo(
    () => computeBrokeModeStatus(transactions, brokeModeConfig),
    [transactions, brokeModeConfig]
  );

  const junkIntel = useMemo(
    () => computeJunkIntelligence(transactions),
    [transactions]
  );

  const evaluatedLimits = useMemo(
    () => evaluateCategoryLimits(categoryLimits, transactions),
    [categoryLimits, transactions]
  );

  const alertsResult = useMemo(
    () =>
      generateSmartAlerts({
        transactions,
        evaluatedLimits,
        brokeModeStatus: brokeStatus,
        totalBudget,
        dismissedSignatures: dismissedWarRoomAlerts,
      }),
    [
      transactions,
      evaluatedLimits,
      brokeStatus,
      totalBudget,
      dismissedWarRoomAlerts,
    ]
  );

  const disciplineScore = useMemo(
    () =>
      computeDisciplineScore({
        transactions,
        totalBudget,
        evaluatedLimits,
        challenges: warRoomChallenges,
        disciplineCheckIns,
      }),
    [
      transactions,
      totalBudget,
      evaluatedLimits,
      warRoomChallenges,
      disciplineCheckIns,
    ]
  );

  const challengeResult = useMemo(
    () =>
      evaluateChallenges(warRoomChallenges, transactions, disciplineCheckIns),
    [warRoomChallenges, transactions, disciplineCheckIns]
  );

  const behaviour = useMemo(
    () => computeBehaviourAnalytics(transactions, totalBudget),
    [transactions, totalBudget]
  );

  const evaluatedTargets = useMemo(
    () => evaluateFinancialTargets(warRoomTargets, transactions),
    [warRoomTargets, transactions]
  );

  const todayKey = toLocalDateKey(new Date());
  const todayCheckedIn = disciplineCheckIns.includes(todayKey);

  const navItems: {
    id: WarRoomSection;
    label: string;
    icon: typeof Shield;
    badge?: number;
  }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'broke', label: 'Broke Mode', icon: ShieldAlert },
    { id: 'junk', label: 'Junk & Behaviour', icon: BarChart3 },
    {
      id: 'limits',
      label: 'Limits & Alerts',
      icon: Bell,
      badge: alertsResult.activeAlerts.length || undefined,
    },
    { id: 'discipline', label: 'Score & Goals', icon: Award },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Wellness"
        description="Track your spending discipline, Broke Mode guardrails, category caps, and behavioural insights."
        actions={
          <div className="flex items-center gap-2.5 flex-wrap">
            <span
              className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border ${
                brokeStatus.enabled
                  ? 'bg-[#FEF6E7] text-[#9E6614] border-[#F3D8A8]'
                  : 'bg-[#F1F3F6] text-[#697386] border-[#E7EAF0]'
              }`}
            >
              {brokeStatus.enabled ? 'Broke Mode Active' : 'Normal Oversight'}
            </span>
            <button
              type="button"
              onClick={toggleBrokeMode}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap ${
                brokeStatus.enabled
                  ? 'bg-[#FDECEC] hover:bg-[#FADADA] text-[#DE5252] border-[#F6B8B8]'
                  : 'btn-primary border-[#365FE8]'
              }`}
            >
              {brokeStatus.enabled ? 'Deactivate Broke Mode' : 'Activate Broke Mode'}
            </button>
          </div>
        }
      />

      {/* Sub-view Switcher */}
      <div className="surface-card p-2">
        <div
          role="tablist"
          aria-label="Financial Wellness sections"
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSection(item.id)}
                className={`flex-1 min-w-fit py-2 px-3.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-[#365FE8] text-white'
                    : 'text-[#697386] hover:text-[#151922] hover:bg-[#F7F8FA]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2.25} />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-[#FEF6E7] text-[#9E6614]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Sub-View */}
      {section === 'overview' && (
        <WarRoomOverview
          brokeStatus={brokeStatus}
          disciplineScore={disciplineScore}
          junkIntel={junkIntel}
          evaluatedLimits={evaluatedLimits}
          activeAlerts={alertsResult.activeAlerts}
          evaluatedChallenges={challengeResult.evaluated}
          verifiedStreak={challengeResult.verifiedOverallStreak}
          todayCheckedIn={todayCheckedIn}
          classifiedTxs={classifiedTxs}
          onNavigate={setSection}
          onToggleBrokeMode={toggleBrokeMode}
          onDismissAlert={dismissWarRoomAlert}
          onCheckInToday={() => recordDisciplineCheckIn()}
          onReclassify={updateTransactionClassification}
        />
      )}

      {section === 'broke' && (
        <BrokeModePanel
          config={brokeModeConfig}
          status={brokeStatus}
          categories={categories}
          onToggleBrokeMode={toggleBrokeMode}
          onUpdateConfig={updateBrokeModeConfig}
        />
      )}

      {section === 'junk' && (
        <JunkBehaviourPanel
          junkIntel={junkIntel}
          behaviour={behaviour}
          classifiedTxs={classifiedTxs}
          onReclassify={updateTransactionClassification}
        />
      )}

      {section === 'limits' && (
        <LimitsAlertsPanel
          categories={categories}
          evaluatedLimits={evaluatedLimits}
          activeAlerts={alertsResult.activeAlerts}
          dismissedCount={
            alertsResult.allAlerts.length - alertsResult.activeAlerts.length
          }
          onUpsertLimit={upsertCategoryLimit}
          onDeleteLimit={deleteCategoryLimit}
          onDismissAlert={dismissWarRoomAlert}
          onRestoreDismissedAlerts={restoreDismissedWarRoomAlerts}
        />
      )}

      {section === 'discipline' && (
        <DisciplineChallengesPanel
          categories={categories}
          disciplineScore={disciplineScore}
          behaviour={behaviour}
          evaluatedChallenges={challengeResult.evaluated}
          verifiedStreak={challengeResult.verifiedOverallStreak}
          todayCheckedIn={todayCheckedIn}
          evaluatedTargets={evaluatedTargets}
          onCheckInToday={() => recordDisciplineCheckIn()}
          onStartChallenge={startWarRoomChallenge}
          onCompleteChallenge={completeWarRoomChallenge}
          onDeleteChallenge={deleteWarRoomChallenge}
          onAddTarget={addFinancialTarget}
          onLogSavingsTransfer={logTargetSavingsTransfer}
          onDeleteTarget={deleteFinancialTarget}
        />
      )}
    </div>
  );
}
