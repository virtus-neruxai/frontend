import { useState, useEffect, useCallback } from 'react';
import { eventsApi, statsApi, characterApi, graphAnalyticsApi, routinesApi, proactiveApi } from '../../lib/api';
import { buildRelativeDateRange } from '../../lib/dateRangeUtils';
import { toast } from 'sonner';

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

  // Events state
  const [taskEvents, setTaskEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsDate, setEventsDate] = useState('');
  const [eventType, setEventType] = useState('all');
  
  // Total stats evolution state (missions + reflections)
  const [totalStatsHistory, setTotalStatsHistory] = useState([]);
  const [statsInfo, setStatsInfo] = useState({});
  const [totalStatsRange, setTotalStatsRange] = useState('30');
  const [totalStatsFromDate, setTotalStatsFromDate] = useState(initialTotalStatsRange.fromDate);
  const [totalStatsToDate, setTotalStatsToDate] = useState(initialTotalStatsRange.toDate);
  const [totalStatsLoading, setTotalStatsLoading] = useState(false);

  // Quadrant distribution chart state (Neo4j graph-query-service)
  const [quadrantDistribution, setQuadrantDistribution] = useState(null);
  const [quadrantRange, setQuadrantRange] = useState('30');
  const [quadrantLoading, setQuadrantLoading] = useState(false);
  const [routinesDashboard, setRoutinesDashboard] = useState([]);
  const [mentorDashboard, setMentorDashboard] = useState(null);
  const [mentorLoading, setMentorLoading] = useState(false);

  // Fetch statistics
  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const days = parseInt(range);
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      
      const [summaryRes, timeseriesRes] = await Promise.all([
        statsApi.getSummary({ from_date: fromDate.toISOString() }),
        statsApi.getTimeseries(days)
      ]);
      
      setSummary(summaryRes.data);
      setTimeseries(timeseriesRes.data);
    } catch (error) {
      toast.error('Error al cargar estadísticas');
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, [range]);

  // Fetch task events
  const fetchTaskEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const params = {
        ...(eventsDate ? { date: eventsDate } : {}),
        ...(eventType !== 'all' ? { event_type: eventType } : {}),
      };
      const response = await eventsApi.getTaskEvents(params);
      setTaskEvents(response.data);
    } catch (error) {
      toast.error('Error al cargar eventos');
      console.error('Error fetching events:', error);
    } finally {
      setEventsLoading(false);
    }
  }, [eventsDate, eventType]);

  // Clear event filters
  const clearEventFilters = useCallback(() => {
    setEventsDate('');
    setEventType('all');
  }, []);
  
  // Fetch total stats evolution data (missions + reflections)
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

  // Fetch quadrant distribution data (Q1-Q4)
  const fetchQuadrantDistribution = useCallback(async () => {
    setQuadrantLoading(true);
    try {
      const days = parseInt(quadrantRange, 10);
      const response = await graphAnalyticsApi.getQuadrantDistribution(days);
      setQuadrantDistribution(response.data);
    } catch (error) {
      toast.error('Error al cargar distribución por cuadrantes');
      console.error('Error fetching quadrant distribution:', error);
    } finally {
      setQuadrantLoading(false);
    }
  }, [quadrantRange]);

  const fetchRoutinesDashboard = useCallback(async () => {
    try {
      const response = await routinesApi.getDashboard();
      setRoutinesDashboard(response.data?.routines || []);
    } catch (error) {
      toast.error('Error al cargar dashboard de rutinas');
      console.error('Error fetching routines dashboard:', error);
    }
  }, []);

  const fetchMentorDashboard = useCallback(async () => {
    setMentorLoading(true);
    try {
      const days = parseInt(range, 10);
      const response = await proactiveApi.getMentorDashboard({ days_back: days });
      setMentorDashboard(response.data);
    } catch (error) {
      toast.error('Error al cargar dashboard del mentor');
      console.error('Error fetching mentor dashboard:', error);
    } finally {
      setMentorLoading(false);
    }
  }, [range]);

  // Effects
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchTaskEvents();
  }, [fetchTaskEvents]);
  
  useEffect(() => {
    fetchTotalStatsData();
  }, [fetchTotalStatsData]);

  useEffect(() => {
    fetchQuadrantDistribution();
  }, [fetchQuadrantDistribution]);

  useEffect(() => {
    fetchRoutinesDashboard();
  }, [fetchRoutinesDashboard]);

  useEffect(() => {
    fetchMentorDashboard();
  }, [fetchMentorDashboard]);

  return {
    // Stats
    summary,
    timeseries,
    loading,
    range,
    setRange,
    rangeOptions: RANGE_OPTIONS,

    // Events
    taskEvents,
    eventsLoading,
    eventsDate,
    setEventsDate,
    eventType,
    setEventType,
    clearEventFilters,
    hasActiveFilters: eventsDate || eventType !== 'all',
    
    // Total stats evolution
    totalStatsHistory,
    statsInfo,
    totalStatsRange,
    totalStatsFromDate,
    totalStatsToDate,
    totalStatsLoading,

    // Quadrants
    quadrantDistribution,
    quadrantRange,
    setQuadrantRange,
    quadrantLoading,
    routinesDashboard,
    mentorDashboard,
    mentorLoading,

    // Actions
    refreshStats: fetchStats,
    refreshEvents: fetchTaskEvents,
    refreshTotalStats: fetchTotalStatsData,
    refreshQuadrants: fetchQuadrantDistribution,
    refreshRoutinesDashboard: fetchRoutinesDashboard,
    refreshMentorDashboard: fetchMentorDashboard,
    handleTotalStatsRangeChange,
    handleTotalStatsFromDateChange,
    handleTotalStatsToDateChange,
  };
}
