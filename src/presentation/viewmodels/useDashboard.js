import { useState, useEffect, useCallback, useMemo } from 'react';
import { statsApi, characterApi, tasksApi, missionsApi, profileApi, behaviorsApi } from '../../lib/api';
import { buildRelativeDateRange } from '../../lib/dateRangeUtils';
import { toast } from 'sonner';
import {
  filterTasksByDomain,
  getDashboardItemsByCategory,
  getDashboardMissionsByCategory,
  getTasksByDomain,
} from '../../lib/dashboardTaskFilters';

const FRICTIONS_RANGE_OPTIONS = [
  { value: '7',  label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' },
];

const EMOTIONAL_PATTERNS_RANGE_OPTIONS = [
  { value: '7',  label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' },
];

const RANGE_OPTIONS = [
  { value: '7', label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' }
];

export function useDashboard(initialProfile) {
  const initialTotalStatsRange = buildRelativeDateRange(30);

  // Stats state
  const [summary, setSummary] = useState(null);
  const [timeseries, setTimeseries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30');

  // Raw tasks/missions backing the KPI cards, so a card click can show the matching list.
  const [allTasks, setAllTasks] = useState([]);
  const [allMissions, setAllMissions] = useState([]);

  // "Tareas por Estado" card has its own profile filter, independent from the
  // rest of the Dashboard (KPI cards + "Distribución por Estado" stay unfiltered).
  // Defaults to the settings-active profile but can be switched locally.
  const [statusProfile, setStatusProfile] = useState(initialProfile || null);
  const [statusSummary, setStatusSummary] = useState(null);
  const [statusSummaryLoading, setStatusSummaryLoading] = useState(true);

  // Total stats evolution state — also has its own
  // independent profile filter, decoupled from "Tareas por Estado".
  const [totalStatsHistory, setTotalStatsHistory] = useState([]);
  const [statsInfo, setStatsInfo] = useState({});
  const [totalStatsRange, setTotalStatsRange] = useState('30');
  const [totalStatsFromDate, setTotalStatsFromDate] = useState(initialTotalStatsRange.fromDate);
  const [totalStatsToDate, setTotalStatsToDate] = useState(initialTotalStatsRange.toDate);
  const [totalStatsLoading, setTotalStatsLoading] = useState(false);
  const [evolutionProfile, setEvolutionProfile] = useState(initialProfile || null);

  // Friction patterns state
  const [frictions, setFrictions] = useState(null);
  const [frictionsLoading, setFrictionsLoading] = useState(false);
  const [frictionsRange, setFrictionsRange] = useState('7');

  // Emotional patterns state
  const [learnedResponses, setLearnedResponses] = useState(null);
  const [learnedResponsesLoading, setLearnedResponsesLoading] = useState(false);
  const [emotionalPatterns, setEmotionalPatterns] = useState(null);
  const [emotionalPatternsLoading, setEmotionalPatternsLoading] = useState(false);
  const [emotionalPatternsRange, setEmotionalPatternsRange] = useState('7');

  // Mission lenses state — materialized semantic lenses derived from the profile.
  const [missionLenses, setMissionLenses] = useState(null);
  const [missionLensesLoading, setMissionLensesLoading] = useState(false);

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
        missionsApi.getAll({ all_profiles: true }),
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

  const fetchStatusSummary = useCallback(async () => {
    setStatusSummaryLoading(true);
    try {
      const days = parseInt(range);
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      const res = await statsApi.getSummary({
        from_date: fromDate.toISOString(),
        profile: statusProfile || undefined,
      });
      setStatusSummary(res.data);
    } catch (error) {
      toast.error('Error al cargar tareas por estado');
      console.error('Error fetching status summary:', error);
    } finally {
      setStatusSummaryLoading(false);
    }
  }, [range, statusProfile]);

  const getTasksByCategory = useCallback((category) => {
    return getDashboardItemsByCategory({
      category,
      tasks: allTasks,
      rangeDays: parseInt(range, 10),
    });
  }, [allTasks, range]);

  const getMissionsByCategory = useCallback((category) => {
    return getDashboardMissionsByCategory({
      category,
      missions: allMissions,
      rangeDays: parseInt(range, 10),
    });
  }, [allMissions, range]);

  const taskKpiCounts = useMemo(() => ({
    total: getTasksByCategory('total').length,
    completed: getTasksByCategory('completed').length,
    in_progress: getTasksByCategory('in_progress').length,
    blocked: getTasksByCategory('blocked').length,
  }), [getTasksByCategory]);

  const missionKpiCounts = useMemo(() => ({
    total: getMissionsByCategory('total').length,
    completed: getMissionsByCategory('completed').length,
    in_progress: getMissionsByCategory('in_progress').length,
    overdue: getMissionsByCategory('overdue').length,
  }), [getMissionsByCategory]);

  const domainData = useMemo(
    () => getTasksByDomain(allTasks, parseInt(range, 10)),
    [allTasks, range]
  );

  const getTasksForDomain = useCallback(
    (domain) => filterTasksByDomain(allTasks, domain, parseInt(range, 10)),
    [allTasks, range]
  );

  const fetchTotalStatsData = useCallback(async () => {
    setTotalStatsLoading(true);
    try {
      const [historyRes, statsInfoRes] = await Promise.all([
        statsApi.getEvolution({
          source: 'all',
          from_date: totalStatsFromDate,
          to_date: totalStatsToDate,
          profile: evolutionProfile || undefined,
        }),
        characterApi.getStatsInfo({ profile: evolutionProfile || undefined }),
      ]);

      setTotalStatsHistory(historyRes.data.history || []);
      setStatsInfo(statsInfoRes.data || {});
    } catch (error) {
      toast.error('Error al cargar evolución de stats');
      console.error('Error fetching total stats:', error);
    } finally {
      setTotalStatsLoading(false);
    }
  }, [totalStatsFromDate, totalStatsToDate, evolutionProfile]);

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

  const fetchEmotionalPatterns = useCallback(async () => {
    setEmotionalPatternsLoading(true);
    try {
      const res = await statsApi.getEmotionalPatterns({ days: parseInt(emotionalPatternsRange), limit: 500 });
      setEmotionalPatterns(res.data);
    } catch (error) {
      console.error('Error fetching emotional patterns:', error);
    } finally {
      setEmotionalPatternsLoading(false);
    }
  }, [emotionalPatternsRange]);

  const acknowledgeEmotionalPattern = useCallback(async (patternKey, data) => {
    await statsApi.acknowledgeEmotionalPattern(patternKey, data);
    await fetchEmotionalPatterns();
  }, [fetchEmotionalPatterns]);

  // NRRM — conductas adoptadas. Fail-soft: si la feature está apagada o el
  // endpoint no existe todavía, el panel simplemente no se muestra.
  const fetchLearnedResponses = useCallback(async () => {
    setLearnedResponsesLoading(true);
    try {
      const res = await behaviorsApi.list();
      setLearnedResponses(res.data);
    } catch (error) {
      setLearnedResponses(null);
    } finally {
      setLearnedResponsesLoading(false);
    }
  }, []);

  // §8.6 — one application the user reported. Refetch so the derived state and
  // the aggregates come from backend, never from a local guess.
  const recordBehaviorApplication = useCallback(async (responseKey, data) => {
    await behaviorsApi.recordApplication(responseKey, data);
    await fetchLearnedResponses();
  }, [fetchLearnedResponses]);

  // §8.5 — the half of the lifecycle the user owns. Resuming recomputes the
  // derived state in backend instead of resetting it, so a pause never costs
  // them their history.
  const setBehaviorStatus = useCallback(async (responseKey, status) => {
    await behaviorsApi.setStatus(responseKey, status);
    await fetchLearnedResponses();
  }, [fetchLearnedResponses]);

  const fetchMissionLenses = useCallback(async () => {
    setMissionLensesLoading(true);
    try {
      const res = await profileApi.getMissionLenses();
      setMissionLenses(res.data || null);
    } catch (error) {
      console.error('Error fetching mission lenses:', error);
      setMissionLenses(null);
    } finally {
      setMissionLensesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchStatusSummary();
  }, [fetchStatusSummary]);

  useEffect(() => {
    fetchTotalStatsData();
  }, [fetchTotalStatsData]);

  useEffect(() => {
    fetchFrictions();
  }, [fetchFrictions]);

  useEffect(() => {
    fetchEmotionalPatterns();
  }, [fetchEmotionalPatterns]);

  useEffect(() => {
    fetchMissionLenses();
  }, [fetchMissionLenses]);

  useEffect(() => {
    fetchLearnedResponses();
  }, [fetchLearnedResponses]);

  return {
    summary,
    timeseries,
    loading,
    range,
    setRange,
    rangeOptions: RANGE_OPTIONS,
    getTasksByCategory,
    getMissionsByCategory,
    getTasksForDomain,
    domainData,
    taskKpiCounts,
    missionKpiCounts,
    allTasks,
    statusSummary,
    statusSummaryLoading,
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
    emotionalPatterns,
    emotionalPatternsLoading,
    emotionalPatternsRange,
    setEmotionalPatternsRange,
    emotionalPatternsRangeOptions: EMOTIONAL_PATTERNS_RANGE_OPTIONS,
    acknowledgeEmotionalPattern,
    refreshEmotionalPatterns: fetchEmotionalPatterns,
    learnedResponses,
    learnedResponsesLoading,
    refreshLearnedResponses: fetchLearnedResponses,
    recordBehaviorApplication,
    setBehaviorStatus,
    missionLenses,
    missionLensesLoading,
    refreshMissionLenses: fetchMissionLenses,
  };
}
