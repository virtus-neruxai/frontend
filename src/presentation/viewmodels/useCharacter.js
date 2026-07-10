import { useState, useCallback, useRef } from 'react';
import { characterApi, statsApi } from '../../lib/api';
import { toast } from 'sonner';
import { calculateReflectionKPIsForProfile } from './reflectionKpiUtils';

/**
 * Custom hook for managing character state and operations
 *
 * This hook encapsulates all character-related business logic including:
 * - Fetching character data
 * - Fetching profile-aware stats metadata (statsInfo)
 * - Managing character stats history
 * - Loading states
 * 
 * @returns {Object} Character state and operations
 * @property {Object|null} character - Current character data
 * @property {Array} statsHistory - Historical stats data
 * @property {Object} reflectionKPIs - KPIs for reflections (total, gained, lost, balance)
 * @property {boolean} loading - Initial loading state
 * @property {boolean} historyLoading - History loading state
 * @property {Function} fetchCharacter - Fetch current character data
 * @property {Function} fetchStatsHistory - Fetch character stats history
 * @property {Function} calculateReflectionKPIs - Calculate reflection KPIs from reflections data
 */
export const useCharacter = () => {
  const [character, setCharacter] = useState(null);
  const [statsInfo, setStatsInfo] = useState({});
  const [statsHistory, setStatsHistory] = useState([]);
  // Uncapped cumulative stat totals combining missions + diary, per stat.
  const [cumulativeTotals, setCumulativeTotals] = useState({});
  const [reflectionKPIs, setReflectionKPIs] = useState({
    totalReflections: 0,
    pointsGained: 0,
    pointsLost: 0,
    netBalance: 0
  });
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [justLeveledUp, setJustLeveledUp] = useState(false);
  const previousLevelRef = useRef(null);

  /**
   * Fetches current character data from the API
   */
  const fetchCharacter = useCallback(async () => {
    try {
      const response = await characterApi.get();
      const prevLevel = previousLevelRef.current;
      if (prevLevel !== null && response.data.level > prevLevel) {
        setJustLeveledUp(true);
      }
      previousLevelRef.current = response.data.level;
      setCharacter(response.data);
      return response.data;
    } catch (error) {
      toast.error('Error al cargar datos del personaje');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const dismissLevelUp = useCallback(() => setJustLeveledUp(false), []);

  /**
   * Fetches stat metadata for the user's active profile (profile-aware labels)
   */
  const fetchStatsInfo = useCallback(async () => {
    try {
      const response = await characterApi.getStatsInfo();
      setStatsInfo(response.data);
      return response.data;
    } catch (error) {
      // Non-critical: fall back to raw stat keys
      console.error('Error fetching stats info:', error);
    }
  }, []);

  /**
   * Fetches reflection-only stats evolution from the canonical stats endpoint.
   * @param {Object} params
   * @param {number} params.days - Relative range in days when from/to are not provided
   * @param {string} params.fromDate - YYYY-MM-DD
   * @param {string} params.toDate - YYYY-MM-DD
   */
  const fetchStatsHistory = useCallback(async ({ days = 30, fromDate, toDate } = {}) => {
    setHistoryLoading(true);
    try {
      const params = { source: 'reflections' };
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      if (!fromDate && !toDate) params.days = days;

      const response = await statsApi.getEvolution(params);
      const historyArray = response.data?.history || [];
      setStatsHistory(historyArray);
      return response.data;
    } catch (error) {
      toast.error('Error al cargar historial de estadísticas');
      throw error;
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  /**
   * Fetches the all-time cumulative stat totals combining missions + diary
   * (uncapped net_changes), shown alongside the capped 0/10 stats.
   */
  const fetchCumulativeTotals = useCallback(async () => {
    try {
      // Wide range approximates "all time"; source=all combines missions and
      // standalone diary reflections (mission-linked reflections are excluded
      // server-side to avoid double counting).
      const response = await statsApi.getEvolution({ source: 'all', days: 3650 });
      setCumulativeTotals(response.data?.summary?.net_changes || {});
      return response.data;
    } catch (error) {
      // Non-critical: the capped stats still render without the cumulative badge.
      console.error('Error fetching cumulative totals:', error);
    }
  }, []);

  /**
   * Calculates KPIs from reflections data
   * @param {Array} reflections - Array of reflection objects with stat_changes
   */
  const calculateReflectionKPIs = useCallback((reflections, activeStatsInfo = {}) => {
    setReflectionKPIs(calculateReflectionKPIsForProfile(reflections, activeStatsInfo));
  }, []);

  return {
    character,
    statsInfo,
    statsHistory,
    cumulativeTotals,
    reflectionKPIs,
    loading,
    historyLoading,
    justLeveledUp,
    dismissLevelUp,
    fetchCharacter,
    fetchStatsInfo,
    fetchStatsHistory,
    fetchCumulativeTotals,
    calculateReflectionKPIs,
  };
};
