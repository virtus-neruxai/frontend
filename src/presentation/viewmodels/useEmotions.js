/**
 * useEmotions Hook
 * 
 * Domain: Emotions tracking and calendar navigation
 * 
 * Purpose:
 * - Manage emotions CRUD operations
 * - Handle calendar navigation (month/week/day)
 * - Fetch emotions for date ranges
 * - Fetch recent emotions
 * 
 * Mobile Migration:
 * - Android: EmotionsViewModel.kt with StateFlow
 * - iOS: EmotionsViewModel.swift with @Published properties
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import { toast } from 'sonner';
import { emotionsApi } from '../../lib/emotionApi';

const formatDateKey = (value) => format(value, 'yyyy-MM-dd');

export function useEmotions() {
  const { view: routeView } = useParams();
  const navigate = useNavigate();
  const view = routeView || 'month';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [entries, setEntries] = useState([]);
  const [recentEntries, setRecentEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  /**
   * Calculate date range based on current view
   * 
   * Android equivalent:
   * fun calculateRange(view: ViewType, date: Date): DateRange {
   *   return when(view) {
   *     ViewType.MONTH -> MonthRange(date)
   *     ViewType.WEEK -> WeekRange(date)
   *     ViewType.DAY -> DayRange(date)
   *   }
   * }
   */
  const range = useMemo(() => {
    if (view === 'week') {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 }),
      };
    }
    if (view === 'day') {
      return { start: currentDate, end: currentDate };
    }
    return {
      start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }),
    };
  }, [currentDate, view]);

  /**
   * Group entries by date for efficient lookup
   * 
   * Android: Use Flow<Map<String, List<Emotion>>>
   */
  const groupedEntries = useMemo(() => {
    return entries.reduce((acc, entry) => {
      acc[entry.date] = acc[entry.date] || [];
      acc[entry.date].push(entry);
      return acc;
    }, {});
  }, [entries]);

  /**
   * Generate array of days in current range
   * 
   * Android: extension function on DateRange
   */
  const daysInRange = useMemo(() => {
    const days = [];
    let cursor = range.start;
    while (cursor <= range.end) {
      days.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return days;
  }, [range]);

  /**
   * Fetch emotions for current date range
   */
  const fetchEntries = useCallback(async () => {
    try {
      const response = await emotionsApi.getRange({
        from: formatDateKey(range.start),
        to: formatDateKey(range.end),
      });
      setEntries(response.data);
    } catch (error) {
      toast.error('Error al cargar emociones');
    } finally {
      setLoading(false);
    }
  }, [range]);

  /**
   * Fetch recent emotions (for sidebar)
   */
  const fetchRecentEntries = useCallback(async () => {
    try {
      const response = await emotionsApi.getRecent(5);
      setRecentEntries(response.data);
    } catch (error) {
      toast.error('Error al cargar emociones recientes');
    }
  }, []);

  /**
   * Refresh all data
   */
  const refreshData = useCallback(async () => {
    await Promise.all([fetchEntries(), fetchRecentEntries()]);
  }, [fetchEntries, fetchRecentEntries]);

  // Load data on mount and when range changes
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  /**
   * Navigate to previous period
   * 
   * Android: fun navigatePrevious()
   */
  const handlePrev = useCallback(() => {
    if (view === 'week') {
      setCurrentDate((prev) => subWeeks(prev, 1));
    } else if (view === 'day') {
      setCurrentDate((prev) => addDays(prev, -1));
    } else {
      setCurrentDate((prev) => subMonths(prev, 1));
    }
  }, [view]);

  /**
   * Navigate to next period
   */
  const handleNext = useCallback(() => {
    if (view === 'week') {
      setCurrentDate((prev) => addWeeks(prev, 1));
    } else if (view === 'day') {
      setCurrentDate((prev) => addDays(prev, 1));
    } else {
      setCurrentDate((prev) => addMonths(prev, 1));
    }
  }, [view]);

  /**
   * Navigate to today
   */
  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  /**
   * Change view type
   */
  const handleViewChange = useCallback((newView) => {
    navigate(`/emotions/${newView}`);
  }, [navigate]);

  /**
   * Create new emotion
   * 
   * Android: suspend fun createEmotion(payload: EmotionPayload)
   */
  const createEmotion = useCallback(async (payload) => {
    try {
      await emotionsApi.create(payload);
      toast.success('Emoción registrada');
      await refreshData();
      return true;
    } catch (error) {
      toast.error('Error al registrar emoción');
      return false;
    }
  }, [refreshData]);

  /**
   * Update existing emotion
   */
  const updateEmotion = useCallback(async (id, payload) => {
    try {
      await emotionsApi.update(id, payload);
      toast.success('Emoción actualizada');
      await refreshData();
      return true;
    } catch (error) {
      toast.error('Error al actualizar emoción');
      return false;
    }
  }, [refreshData]);

  /**
   * Delete emotion
   */
  const deleteEmotion = useCallback(async (id) => {
    try {
      await emotionsApi.delete(id);
      toast.success('Emoción eliminada');
      await refreshData();
      return true;
    } catch (error) {
      toast.error('Error al eliminar emoción');
      return false;
    }
  }, [refreshData]);

  return {
    // State
    view,
    currentDate,
    entries,
    recentEntries,
    loading,
    range,
    
    // Computed
    groupedEntries,
    daysInRange,
    
    // Navigation
    handlePrev,
    handleNext,
    handleToday,
    handleViewChange,
    
    // CRUD operations
    createEmotion,
    updateEmotion,
    deleteEmotion,
    refresh: refreshData,
  };
}
