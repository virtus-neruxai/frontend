import { useState } from 'react';
import Layout from '../components/Layout';
import TaskModal from '../components/TaskModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { AlertTriangle, CheckCircle2, CircleSlash, Clock, Flag, ListTodo, Target } from 'lucide-react';
import { useDashboard } from '../presentation/viewmodels/useDashboard';
import { KPICard } from '../presentation/components/dashboard/KPICard';
import { TaskListDialog } from '../presentation/components/dashboard/TaskListDialog';
import { ChallengesCard } from '../presentation/components/dashboard/ChallengesCard';
import { MissionLensesPanel } from '../presentation/components/dashboard/MissionLensesPanel';
import { StatusDistributionChart } from '../presentation/components/dashboard/StatusDistributionChart';
import { StatusBarChart } from '../presentation/components/dashboard/StatusBarChart';
import { TimeseriesChart } from '../presentation/components/dashboard/TimeseriesChart';
import { TotalStatsEvolutionChart } from '../presentation/components/dashboard/TotalStatsEvolutionChart';
import { DomainDistributionChart } from '../presentation/components/dashboard/DomainDistributionChart';
import { DetectedPatternsPanel } from '../presentation/components/dashboard/DetectedPatternsPanel';
import { EmotionalPatternsPanel } from '../presentation/components/dashboard/EmotionalPatternsPanel';
import { LearnedResponsesPanel } from '../presentation/components/dashboard/LearnedResponsesPanel';
import { HealthPracticesPanel } from '../presentation/components/dashboard/HealthPracticesPanel';
import { PositiveHealthSignalsPanel } from '../presentation/components/dashboard/PositiveHealthSignalsPanel';
import { ProfileHeroCard } from '../presentation/components/profile-theme/ProfileHeroCard';
import { KPI_TOKENS } from '../theme/semanticTokens';
import { useProfileTheme } from '../theme/useProfileTheme';

const KPI_LIST_TITLES = {
  total: 'Total tareas',
  completed: 'Tareas completadas',
  in_progress: 'Tareas en progreso',
  blocked: 'Tareas bloqueadas',
  overdue: 'Tareas vencidas',
  'mission:total': 'Total misiones',
  'mission:completed': 'Misiones completadas',
  'mission:in_progress': 'Misiones en progreso',
  'mission:overdue': 'Misiones vencidas',
};

export default function DashboardPageRefactored() {
  const { theme, persistedProfileId } = useProfileTheme();
  const [listCategory, setListCategory] = useState(null);
  const [listOpen, setListOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const {
    summary,
    timeseries,
    loading,
    range,
    setRange,
    rangeOptions,
    getTasksByCategory,
    getMissionsByCategory,
    getTasksForDomain,
    domainData,
    taskKpiCounts,
    missionKpiCounts,
    allTasks,
    refreshStats,
    statusSummary,
    statusProfile,
    setStatusProfile,
    totalStatsHistory,
    statsInfo,
    totalStatsRange,
    totalStatsFromDate,
    totalStatsToDate,
    totalStatsLoading,
    evolutionProfile,
    setEvolutionProfile,
    handleTotalStatsRangeChange,
    handleTotalStatsFromDateChange,
    handleTotalStatsToDateChange,
    frictions,
    frictionsLoading,
    frictionsRange,
    setFrictionsRange,
    acknowledgeFriction,
    emotionalPatterns,
    emotionalPatternsLoading,
    emotionalPatternsRange,
    setEmotionalPatternsRange,
    acknowledgeEmotionalPattern,
    learnedResponses,
    learnedResponsesLoading,
    recordBehaviorApplication,
    setBehaviorStatus,
    healthPractices,
    healthPracticesLoading,
    recordHealthPracticeApplication,
    setHealthPracticeStatus,
    positiveHealthSignals,
    positiveHealthSignalsLoading,
    positiveHealthSignalsError,
    positiveHealthSignalsRange,
    setPositiveHealthSignalsRange,
    positiveHealthSignalsRangeOptions,
    refreshPositiveHealthSignals,
    missionLenses,
    missionLensesLoading,
  } = useDashboard(persistedProfileId);

  const openTaskList = (category) => {
    setListCategory(category);
    setListOpen(true);
  };

  const openDomainTaskList = (domain) => {
    setListCategory(`domain:${domain}`);
    setListOpen(true);
  };

  const listTasks = listCategory?.startsWith('domain:')
    ? getTasksForDomain(listCategory.slice('domain:'.length))
    : listCategory?.startsWith('mission:')
    ? getMissionsByCategory(listCategory.slice('mission:'.length))
    : (listCategory ? getTasksByCategory(listCategory) : []);
  const listTitle = listCategory?.startsWith('domain:')
    ? `Tareas · ${listCategory.slice('domain:'.length)}`
    : (KPI_LIST_TITLES[listCategory] || '');

  const handleTaskListItemClick = (item) => {
    let task = item;
    if (item._isMission) {
      task = allTasks.find((t) => t.id === item._linkedTaskId);
      if (!task) return;
    }
    setListOpen(false);
    setEditingTask(task);
    setTaskModalOpen(true);
  };

  const handleTaskModalClose = () => {
    setTaskModalOpen(false);
    setEditingTask(null);
    setListOpen(true);
  };

  const handleTaskModalSaved = async () => {
    setTaskModalOpen(false);
    setEditingTask(null);
    await refreshStats();
    setListOpen(true);
  };

  const handleTaskModalDeleted = async () => {
    setTaskModalOpen(false);
    setEditingTask(null);
    await refreshStats();
    setListOpen(true);
  };

  return (
    <Layout ambient>
      <div className="space-y-6" data-testid="dashboard-page">
        <ProfileHeroCard
          title="Dashboard"
          titleAs="h1"
          titleTestId="dashboard-title"
          description={`Visualiza el progreso de tus tareas con el perfil ${theme.name}.`}
          action={
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-full rounded-full sm:w-48" data-testid="range-selector">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rangeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        {/* Mission lenses — lecturas semánticas de la misión */}
        <MissionLensesPanel data={missionLenses} loading={missionLensesLoading} />

        {/* Challenges — seguimiento de cumplimiento de desafíos */}
        <ChallengesCard />

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Conductas psicológicas y prácticas sanitarias son entidades hermanas,
              pero nunca comparten almacenamiento ni semántica. */}
          <LearnedResponsesPanel
            data={learnedResponses}
            loading={learnedResponsesLoading}
            onRecordApplication={recordBehaviorApplication}
            onSetStatus={setBehaviorStatus}
          />
          <HealthPracticesPanel
            data={healthPractices}
            loading={healthPracticesLoading}
            onRecordApplication={recordHealthPracticeApplication}
            onSetStatus={setHealthPracticeStatus}
          />
        </div>

        {loading ? (
          <div className="h-96 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Cargando estadísticas...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tareas</p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <KPICard
                    title="Total Tareas"
                    value={taskKpiCounts.total}
                    icon={ListTodo}
                    iconColor={KPI_TOKENS.total.color}
                    iconBg={KPI_TOKENS.total.background}
                    testId="kpi-total"
                    onClick={() => openTaskList('total')}
                  />
                  <KPICard
                    title="Completadas"
                    value={taskKpiCounts.completed}
                    subtitle={`${summary?.completion_rate || 0}% del total`}
                    icon={CheckCircle2}
                    iconColor={KPI_TOKENS.completed.color}
                    iconBg={KPI_TOKENS.completed.background}
                    testId="kpi-completed"
                    onClick={() => openTaskList('completed')}
                  />
                  <KPICard
                    title="En Progreso"
                    value={taskKpiCounts.in_progress}
                    icon={Clock}
                    iconColor={KPI_TOKENS.inProgress.color}
                    iconBg={KPI_TOKENS.inProgress.background}
                    testId="kpi-in-progress"
                    onClick={() => openTaskList('in_progress')}
                  />
                  <KPICard
                    title="Bloqueadas"
                    value={taskKpiCounts.blocked}
                    icon={CircleSlash}
                    iconColor={KPI_TOKENS.blocked.color}
                    iconBg={KPI_TOKENS.blocked.background}
                    testId="kpi-blocked"
                    onClick={() => openTaskList('blocked')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Misiones · todos los perfiles</p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <KPICard
                    title="Total Misiones"
                    value={missionKpiCounts.total}
                    icon={Flag}
                    iconColor={KPI_TOKENS.total.color}
                    iconBg={KPI_TOKENS.total.background}
                    testId="kpi-missions-total"
                    onClick={() => openTaskList('mission:total')}
                  />
                  <KPICard
                    title="Completadas"
                    value={missionKpiCounts.completed}
                    icon={CheckCircle2}
                    iconColor={KPI_TOKENS.completed.color}
                    iconBg={KPI_TOKENS.completed.background}
                    testId="kpi-missions-completed"
                    onClick={() => openTaskList('mission:completed')}
                  />
                  <KPICard
                    title="En Progreso"
                    value={missionKpiCounts.in_progress}
                    icon={Target}
                    iconColor={KPI_TOKENS.inProgress.color}
                    iconBg={KPI_TOKENS.inProgress.background}
                    testId="kpi-missions-in-progress"
                    onClick={() => openTaskList('mission:in_progress')}
                  />
                  <KPICard
                    title="Vencidas"
                    value={missionKpiCounts.overdue}
                    subtitle="Fallidas o fuera de plazo"
                    icon={AlertTriangle}
                    iconColor={KPI_TOKENS.overdue.color}
                    iconBg={KPI_TOKENS.overdue.background}
                    testId="kpi-missions-overdue"
                    onClick={() => openTaskList('mission:overdue')}
                  />
                </div>
              </div>
            </div>

            {/* First chart: task totals grouped by domain */}
            <DomainDistributionChart data={domainData} onDomainClick={openDomainTaskList} />

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <StatusDistributionChart summary={summary} />
              <StatusBarChart
                summary={statusSummary}
                profile={statusProfile}
                onProfileChange={setStatusProfile}
              />
            </div>

            {/* Timeseries Chart */}
            <TimeseriesChart timeseries={timeseries} />

            {/* Total Stats Evolution Chart (Missions + Reflections) */}
            <TotalStatsEvolutionChart
              data={totalStatsHistory}
              statsInfo={statsInfo}
              range={totalStatsRange}
              onRangeChange={handleTotalStatsRangeChange}
              fromDate={totalStatsFromDate}
              toDate={totalStatsToDate}
              onFromDateChange={handleTotalStatsFromDateChange}
              onToDateChange={handleTotalStatsToDateChange}
              loading={totalStatsLoading}
              profile={evolutionProfile}
              onProfileChange={setEvolutionProfile}
            />

            {/* Detected Patterns Panel */}
            <DetectedPatternsPanel
              data={frictions}
              loading={frictionsLoading}
              range={frictionsRange}
              onRangeChange={setFrictionsRange}
              onAcknowledge={acknowledgeFriction}
            />

            {/* Emotional Patterns Panel */}
            <EmotionalPatternsPanel
              data={emotionalPatterns}
              loading={emotionalPatternsLoading}
              range={emotionalPatternsRange}
              onRangeChange={setEmotionalPatternsRange}
              onAcknowledge={acknowledgeEmotionalPattern}
            />
          </div>
        )}

        <PositiveHealthSignalsPanel
          data={positiveHealthSignals}
          loading={positiveHealthSignalsLoading}
          error={positiveHealthSignalsError}
          range={positiveHealthSignalsRange}
          rangeOptions={positiveHealthSignalsRangeOptions}
          onRangeChange={setPositiveHealthSignalsRange}
          onRetry={refreshPositiveHealthSignals}
        />
      </div>

      <TaskListDialog
        open={listOpen}
        onClose={() => setListOpen(false)}
        title={listTitle}
        tasks={listTasks}
        onTaskClick={handleTaskListItemClick}
      />

      <TaskModal
        open={taskModalOpen}
        onClose={handleTaskModalClose}
        task={editingTask}
        onSaved={handleTaskModalSaved}
        onDeleted={handleTaskModalDeleted}
      />
    </Layout>
  );
}
