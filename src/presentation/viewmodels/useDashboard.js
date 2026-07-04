import { useState, useEffect, useCallback } from 'react';
import { statsApi, characterApi, tasksApi, missionsApi } from '../../lib/api';
import { buildRelativeDateRange } from '../../lib/dateRangeUtils';
import { toast } from 'sonner';

const FRICTIONS_RANGE_OPTIONS = [
  { value: '7',  label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' },
];

const RANGE_OPTIONS = [
  { value: '7', label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' }
];

export function useDashboard() {
  const initialTotalStatsRange = buildRelativeDateRange(30);

  // Stats state
  const [summary, setSummary] = useState(null);
  const [timeseries, setTimeseries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30');

  // Raw tasks/missions backing the KPI cards, so a card click can show the matching list.
  const [allTasks, setAllTasks] = useState([]);
  const [allMissions, setAllMissions] = useState([]);

  // Total stats evolution state (missions + reflections)
  const [totalStatsHistory, setTotalStatsHistory] = useState([]);
  const [statsInfo, setStatsInfo] = useState({});
  const [totalStatsRange, setTotalStatsRange] = useState('30');
  const [totalStatsFromDate, setTotalStatsFromDate] = useState(initialTotalStatsRange.fromDate);
  const [totalStatsToDate, setTotalStatsToDate] = useState(initialTotalStatsRange.toDate);
  const [totalStatsLoading, setTotalStatsLoading] = useState(false);

  // Friction patterns state
  const [frictions, setFrictions] = useState(null);
  const [frictionsLoading, setFrictionsLoading] = useState(false);
  const [frictionsRange, setFrictionsRange] = useState('7');

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const days = parseInt(range);
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      const [summaryRes, timeseriesRes, tasksRes, missionsRes] = await Promise.all([
        statsApi.getSummary({ from_date: fromDate.toISOString() }),
        statsApi.getTimeseries(days),
        tasksApi.getAll({}),
        missionsApi.getAll({}),
      ]);

      setSummary(summaryRes.data);
      setTimeseries(timeseriesRes.data);
      setAllTasks(tasksRes.data || []);
      setAllMissions(missionsRes.data || []);
    } catch (error) {
      toast.error('Error al cargar estadísticas');
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, [range]);

  // Mirrors the backend's /stats/summary bucketing so the drill-down list matches the KPI count.
  const getTasksByCategory = useCallback((category) => {
    const days = parseInt(range);
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const now = new Date();
    // Tasks get a 1-day grace period past date_end before counting as overdue; missions don't.
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const inRange = allTasks.filter((task) => !task.date_start || new Date(task.date_start) >= fromDate);

    switch (category) {
      case 'completed':
        return inRange.filter((task) => task.status === 'done' || task.is_complete);
      case 'in_progress':
        return inRange.filter((task) => task.status === 'in_progress');
      case 'overdue': {
        // Only in-progress/blocked tasks (routines excluded — their date_end isn't a real deadline).
        const overdueTasks = inRange.filter((task) => (
          task.task_kind !== 'routine'
          && ['in_progress', 'blocked'].includes(task.status)
          && task.date_end
          && new Date(task.date_end) < oneDayAgo
        ));
        // Missions past their expiration that weren't completed successfully.
        const overdueMissions = allMissions
          .filter((mission) => mission.expires_at && new Date(mission.expires_at) < now && mission.status !== 'completed')
          .map((mission) => ({
            id: `mission-${mission.id}`,
            title: mission.title,
            status: mission.status,
            date_end: mission.expires_at,
            _isMission: true,
            _linkedTaskId: mission.linked_task_id || null,
          }));
        return [...overdueMissions, ...overdueTasks];
      }
      case 'total':
      default:
        return inRange;
    }
  }, [allTasks, allMissions, range]);

  const fetchTotalStatsData = useCallback(async () => {
    setTotalStatsLoading(true);
    try {
      const [historyRes, statsInfoRes] = await Promise.all([
        statsApi.getEvolution({
          source: 'all',
          from_date: totalStatsFromDate,
          to_date: totalStatsToDate,
        }),
        characterApi.getStatsInfo(),
      ]);

      setTotalStatsHistory(historyRes.data.history || []);
      setStatsInfo(statsInfoRes.data || {});
    } catch (error) {
      toast.error('Error al cargar evolución de stats');
      console.error('Error fetching total stats:', error);
    } finally {
      setTotalStatsLoading(false);
    }
  }, [totalStatsFromDate, totalStatsToDate]);

  const handleTotalStatsRangeChange = useCallback((newRange) => {
    const nextRange = buildRelativeDateRange(parseInt(newRange, 10));
    setTotalStatsRange(newRange);
    setTotalStatsFromDate(nextRange.fromDate);
    setTotalStatsToDate(nextRange.toDate);
  }, []);

  const handleTotalStatsFromDateChange = useCallback((newDate) => {
    setTotalStatsRange('custom');
    setTotalStatsFromDate(newDate);
  }, []);

  const handleTotalStatsToDateChange = useCallback((newDate) => {
    setTotalStatsRange('custom');
    setTotalStatsToDate(newDate);
  }, []);

  const fetchFrictions = useCallback(async () => {
    setFrictionsLoading(true);
    try {
      const res = await statsApi.getFrictions({ days: parseInt(frictionsRange), limit: 500 });
      setFrictions(res.data);
    } catch (error) {
      console.error('Error fetching frictions:', error);
    } finally {
      setFrictionsLoading(false);
    }
  }, [frictionsRange]);

  const acknowledgeFriction = useCallback(async (friction, data) => {
    await statsApi.acknowledgeFriction(friction, data);
    await fetchFrictions();
  }, [fetchFrictions]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchTotalStatsData();
  }, [fetchTotalStatsData]);

  useEffect(() => {
    fetchFrictions();
  }, [fetchFrictions]);

  return {
    summary,
    timeseries,
    loading,
    range,
    setRange,
    rangeOptions: RANGE_OPTIONS,
    getTasksByCategory,
    allTasks,
    totalStatsHistory,
    statsInfo,
    totalStatsRange,
    totalStatsFromDate,
    totalStatsToDate,
    totalStatsLoading,
    refreshStats: fetchStats,
    refreshTotalStats: fetchTotalStatsData,
    handleTotalStatsRangeChange,
    handleTotalStatsFromDateChange,
    handleTotalStatsToDateChange,
    frictions,
    frictionsLoading,
    frictionsRange,
    setFrictionsRange,
    frictionsRangeOptions: FRICTIONS_RANGE_OPTIONS,
    acknowledgeFriction,
    refreshFrictions: fetchFrictions,
  };
}
