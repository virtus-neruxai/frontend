import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { CheckCircle2, Clock, Target, XCircle, ListTodo, Sparkles, Activity, Flame, Brain } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useDashboard } from '../presentation/viewmodels/useDashboard';
import { KPICard } from '../presentation/components/dashboard/KPICard';
import { StatusDistributionChart } from '../presentation/components/dashboard/StatusDistributionChart';
import { StatusBarChart } from '../presentation/components/dashboard/StatusBarChart';
import { TimeseriesChart } from '../presentation/components/dashboard/TimeseriesChart';
import { EventsList } from '../presentation/components/dashboard/EventsList';
import { TotalStatsEvolutionChart } from '../presentation/components/dashboard/TotalStatsEvolutionChart';
import { QuadrantDistributionChart } from '../presentation/components/dashboard/QuadrantDistributionChart';
import { RoutinesTable } from '../presentation/components/dashboard/RoutinesTable';

function MentorProgressChart({ data = [] }) {
  return (
    <Card className="border-[#E4E4E7]">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Evolución del Mentor
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="mentorActive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="mentorConsistent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22C55E" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" vertical={false} />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#71717A', fontSize: 11 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getDate()}/${date.getMonth() + 1}`;
                }}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 12 }} />
              <Tooltip />
              <Area type="monotone" dataKey="active" stroke="#3B82F6" fill="url(#mentorActive)" strokeWidth={2} />
              <Area type="monotone" dataKey="consistent" stroke="#22C55E" fill="url(#mentorConsistent)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function MentorCoverageChart({ data = [] }) {
  const chartData = (data || []).map((item) => ({
    name: item.label,
    coverage: Math.round(item.coverage_score || 0),
  }));

  return (
    <Card className="border-[#E4E4E7]">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Cobertura por Objetivo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" horizontal vertical={false} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#71717A', fontSize: 12 }}
                width={140}
              />
              <Tooltip />
              <Bar dataKey="coverage" fill="#F97316" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPageRefactored() {
  const {
    summary,
    timeseries,
    loading,
    range,
    setRange,
    rangeOptions,
    taskEvents,
    eventsLoading,
    eventsDate,
    setEventsDate,
    eventType,
    setEventType,
    clearEventFilters,
    hasActiveFilters,
    totalStatsHistory,
    statsInfo,
    totalStatsRange,
    totalStatsFromDate,
    totalStatsToDate,
    totalStatsLoading,
    handleTotalStatsRangeChange,
    handleTotalStatsFromDateChange,
    handleTotalStatsToDateChange,
    quadrantDistribution,
    quadrantRange,
    setQuadrantRange,
    quadrantLoading,
    routinesDashboard,
    mentorDashboard,
    mentorLoading,
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

        {loading ? (
          <div className="h-96 flex items-center justify-center">
            <div className="animate-pulse text-[#71717A]">Cargando estadísticas...</div>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-[#F4F4F5] p-1 rounded-full w-fit">
              <TabsTrigger value="overview" className="rounded-full data-[state=active]:bg-white">
                Resumen
              </TabsTrigger>
              <TabsTrigger value="events" className="rounded-full data-[state=active]:bg-white">
                Eventos
              </TabsTrigger>
              <TabsTrigger value="mentor" className="rounded-full data-[state=active]:bg-white">
                Mentor
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
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
                  title="Falladas"
                  value={summary?.failed || 0}
                  subtitle="Tareas no completadas a tiempo"
                  icon={XCircle}
                  iconColor="#EF4444"
                  iconBg="#FEF2F2"
                  testId="kpi-failed"
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
                  title="Prom. Intentos"
                  value={summary?.avg_attempts || 0}
                  icon={Target}
                  iconColor="#F97316"
                  iconBg="#FFF7ED"
                  testId="kpi-avg-attempts"
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

              <QuadrantDistributionChart
                distribution={quadrantDistribution}
                range={quadrantRange}
                onRangeChange={setQuadrantRange}
                loading={quadrantLoading}
              />

              <RoutinesTable routines={routinesDashboard} />
            </TabsContent>

            <TabsContent value="events" className="space-y-4">
              <EventsList
                taskEvents={taskEvents}
                eventsLoading={eventsLoading}
                eventsDate={eventsDate}
                setEventsDate={setEventsDate}
                eventType={eventType}
                setEventType={setEventType}
                clearEventFilters={clearEventFilters}
                hasActiveFilters={hasActiveFilters}
              />
            </TabsContent>

            <TabsContent value="mentor" className="space-y-6">
              {mentorLoading ? (
                <div className="h-64 flex items-center justify-center text-[#71717A]">
                  Cargando mentor background...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <KPICard
                      title="Objetivos Activos"
                      value={mentorDashboard?.kpis?.active_objectives || 0}
                      icon={Sparkles}
                      iconColor="#8B5CF6"
                      iconBg="#F3E8FF"
                      testId="mentor-kpi-objectives"
                    />
                    <KPICard
                      title="Items Cubiertos"
                      value={mentorDashboard?.kpis?.covered_items || 0}
                      icon={Target}
                      iconColor="#F97316"
                      iconBg="#FFF7ED"
                      testId="mentor-kpi-covered"
                    />
                    <KPICard
                      title="Items Consistentes"
                      value={mentorDashboard?.kpis?.consistent_items || 0}
                      icon={Flame}
                      iconColor="#22C55E"
                      iconBg="#DCFCE7"
                      testId="mentor-kpi-consistent"
                    />
                    <KPICard
                      title="Items Estancados"
                      value={mentorDashboard?.kpis?.stalled_items || 0}
                      icon={Brain}
                      iconColor="#EF4444"
                      iconBg="#FEF2F2"
                      testId="mentor-kpi-stalled"
                    />
                    <KPICard
                      title="Aceptación"
                      value={`${mentorDashboard?.kpis?.proposal_acceptance_rate || 0}%`}
                      icon={Activity}
                      iconColor="#3B82F6"
                      iconBg="#DBEAFE"
                      testId="mentor-kpi-acceptance"
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <MentorProgressChart data={mentorDashboard?.progress_timeseries || []} />
                    <MentorCoverageChart data={mentorDashboard?.coverage_breakdown || []} />
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="xl:col-span-2 space-y-4">
                      {(mentorDashboard?.objective_cards || []).map((objective) => (
                        <Card key={objective.objective_key} className="border-[#E4E4E7]">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>
                              {objective.title}
                            </CardTitle>
                            <p className="text-sm text-[#71717A]">
                              Estado: {objective.status} · Progreso {Math.round(objective.progress_score || 0)}% · Cobertura {Math.round(objective.coverage_score || 0)}%
                            </p>
                            {objective.next_gap ? (
                              <p className="text-sm text-[#71717A]">Siguiente gap: {objective.next_gap}</p>
                            ) : null}
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {(objective.items || []).map((item) => (
                              <div key={item.item_key} className="rounded-xl border border-[#E4E4E7] p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="font-medium text-[#18181B]">{item.label}</p>
                                    <p className="text-sm text-[#71717A]">
                                      {item.status} · progreso {Math.round(item.progress_score || 0)}% · cobertura {Math.round(item.coverage_score || 0)}%
                                    </p>
                                  </div>
                                  <span className="text-xs uppercase tracking-wide text-[#71717A]">
                                    {item.strategy_type}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <Card className="border-[#E4E4E7]">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          Episodios Recientes
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {(mentorDashboard?.recent_episodes || []).slice(0, 8).map((episode) => (
                          <div key={episode.id} className="rounded-xl border border-[#E4E4E7] p-3">
                            <p className="text-sm font-medium text-[#18181B]">
                              {episode.summary || episode.suggestion_type}
                            </p>
                            <p className="text-xs text-[#71717A] mt-1">
                              {episode.status} · {episode.proposal_family} · {episode.proposal_cluster || 'sin cluster'}
                            </p>
                          </div>
                        ))}
                        {!(mentorDashboard?.recent_episodes || []).length ? (
                          <p className="text-sm text-[#71717A]">Todavía no hay episodios registrados para este perfil.</p>
                        ) : null}
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Layout>
  );
}
