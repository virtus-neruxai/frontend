import { useState, useEffect, useCallback } from 'react';
import { statsApi, characterApi } from '../../lib/api';
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

  // Total stats evolution state (missions + reflections)
  const [totalStatsHistory, setTotalStatsHistory] = useState([]);
  const [statsInfo, setStatsInfo] = useState({});
  const [totalStatsRange, setTotalStatsRange] = useState('30');
  const [totalStatsFromDate, setTotalStatsFromDate] = useState(initialTotalStatsRange.fromDate);
  const [totalStatsToDate, setTotalStatsToDate] = useState(initialTotalStatsRange.toDate);
  const [totalStatsLoading, setTotalStatsLoading] = useState(false);

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

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchTotalStatsData();
  }, [fetchTotalStatsData]);

  return {
    summary,
    timeseries,
    loading,
    range,
    setRange,
    rangeOptions: RANGE_OPTIONS,
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
  };
}
