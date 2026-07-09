import { useState } from 'react';
import Layout from '../components/Layout';
import TaskModal from '../components/TaskModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { CheckCircle2, Clock, Target, ListTodo } from 'lucide-react';
import { useDashboard } from '../presentation/viewmodels/useDashboard';
import { KPICard } from '../presentation/components/dashboard/KPICard';
import { TaskListDialog } from '../presentation/components/dashboard/TaskListDialog';
import { ChallengesCard } from '../presentation/components/dashboard/ChallengesCard';
import { StatusDistributionChart } from '../presentation/components/dashboard/StatusDistributionChart';
import { StatusBarChart } from '../presentation/components/dashboard/StatusBarChart';
import { TimeseriesChart } from '../presentation/components/dashboard/TimeseriesChart';
import { TotalStatsEvolutionChart } from '../presentation/components/dashboard/TotalStatsEvolutionChart';
import { DomainDistributionChart } from '../presentation/components/dashboard/DomainDistributionChart';
import { DetectedPatternsPanel } from '../presentation/components/dashboard/DetectedPatternsPanel';
import { EmotionalPatternsPanel } from '../presentation/components/dashboard/EmotionalPatternsPanel';
import { ProfileHeroCard } from '../presentation/components/profile-theme/ProfileHeroCard';
import { KPI_TOKENS } from '../theme/semanticTokens';
import { useProfileTheme } from '../theme/useProfileTheme';

const KPI_LIST_TITLES = {
  total: 'Total tareas',
  completed: 'Tareas completadas',
  in_progress: 'Tareas en progreso',
  overdue: 'Tareas vencidas',
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
    getTasksForDomain,
    domainData,
    overdueCount,
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

        {/* Challenges — seguimiento de cumplimiento de desafíos */}
        <ChallengesCard />

        {loading ? (
          <div className="h-96 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Cargando estadísticas...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <KPICard
                title="Total Tareas"
                value={summary?.total || 0}
                icon={ListTodo}
                iconColor={KPI_TOKENS.total.color}
                iconBg={KPI_TOKENS.total.background}
                testId="kpi-total"
                onClick={() => openTaskList('total')}
              />
              <KPICard
                title="Completadas"
                value={summary?.completed || 0}
                subtitle={`${summary?.completion_rate || 0}% del total`}
                icon={CheckCircle2}
                iconColor={KPI_TOKENS.completed.color}
                iconBg={KPI_TOKENS.completed.background}
                testId="kpi-completed"
                onClick={() => openTaskList('completed')}
              />
              <KPICard
                title="En Progreso"
                value={summary?.in_progress || 0}
                icon={Clock}
                iconColor={KPI_TOKENS.inProgress.color}
                iconBg={KPI_TOKENS.inProgress.background}
                testId="kpi-in-progress"
                onClick={() => openTaskList('in_progress')}
              />
              <KPICard
                title="Vencidas"
                value={overdueCount}
                subtitle="Filtro de vencimiento aplicado"
                icon={Target}
                iconColor={KPI_TOKENS.overdue.color}
                iconBg={KPI_TOKENS.overdue.background}
                testId="kpi-overdue"
                onClick={() => openTaskList('overdue')}
              />
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
