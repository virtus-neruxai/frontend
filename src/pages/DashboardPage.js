import Layout from '../components/Layout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { CheckCircle2, Clock, Target, ListTodo } from 'lucide-react';
import { useDashboard } from '../presentation/viewmodels/useDashboard';
import { KPICard } from '../presentation/components/dashboard/KPICard';
import { NorthStarCard } from '../presentation/components/dashboard/NorthStarCard';
import { StatusDistributionChart } from '../presentation/components/dashboard/StatusDistributionChart';
import { StatusBarChart } from '../presentation/components/dashboard/StatusBarChart';
import { TimeseriesChart } from '../presentation/components/dashboard/TimeseriesChart';
import { TotalStatsEvolutionChart } from '../presentation/components/dashboard/TotalStatsEvolutionChart';

export default function DashboardPageRefactored() {
  const {
    summary,
    timeseries,
    loading,
    range,
    setRange,
    rangeOptions,
    totalStatsHistory,
    statsInfo,
    totalStatsRange,
    totalStatsFromDate,
    totalStatsToDate,
    totalStatsLoading,
    handleTotalStatsRangeChange,
    handleTotalStatsFromDateChange,
    handleTotalStatsToDateChange,
  } = useDashboard();

  return (
    <Layout>
      <div className="space-y-6" data-testid="dashboard-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-2xl font-bold text-[#18181B] dark:text-white"
              style={{ fontFamily: 'Manrope, sans-serif' }}
              data-testid="dashboard-title"
            >
              Dashboard
            </h1>
            <p className="text-[#71717A] mt-1">Visualiza el progreso de tus tareas</p>
          </div>

          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-48 rounded-full border-[#E4E4E7]" data-testid="range-selector">
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
        </div>

        {/* North Star — direction at a glance */}
        <NorthStarCard />

        {loading ? (
          <div className="h-96 flex items-center justify-center">
            <div className="animate-pulse text-[#71717A]">Cargando estadísticas...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <KPICard
                title="Total Tareas"
                value={summary?.total || 0}
                icon={ListTodo}
                iconColor="#71717A"
                iconBg="#F4F4F5"
                testId="kpi-total"
              />
              <KPICard
                title="Completadas"
                value={summary?.completed || 0}
                subtitle={`${summary?.completion_rate || 0}% del total`}
                icon={CheckCircle2}
                iconColor="#22C55E"
                iconBg="#DCFCE7"
                testId="kpi-completed"
              />
              <KPICard
                title="En Progreso"
                value={summary?.in_progress || 0}
                icon={Clock}
                iconColor="#3B82F6"
                iconBg="#DBEAFE"
                testId="kpi-in-progress"
              />
              <KPICard
                title="Vencidas"
                value={summary?.overdue || 0}
                subtitle="Tareas con fecha pasada"
                icon={Target}
                iconColor="#F97316"
                iconBg="#FFF7ED"
                testId="kpi-overdue"
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <StatusDistributionChart summary={summary} />
              <StatusBarChart summary={summary} />
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
            />
          </div>
        )}
      </div>
    </Layout>
  );
}
