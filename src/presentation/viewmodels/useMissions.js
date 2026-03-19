import { useState, useCallback } from 'react';
import { missionsApi, statsApi, tasksApi } from '../../lib/api';
import { toast } from 'sonner';

/**
 * Custom hook for managing missions state and operations
 * 
 * This hook encapsulates all mission-related business logic including:
 * - Fetching missions
 * - Generating new missions
 * - Completing missions
 * - Scheduling missions to calendar
 * - Nightly review
 * - Mission events tracking
 * 
 * @returns {Object} Missions state and operations
 */
export const useMissions = () => {
  const [missions, setMissions] = useState([]);
  const [generatingMissions, setGeneratingMissions] = useState(false);
  const [nightlyReviewLoading, setNightlyReviewLoading] = useState(false);
  const [nightlyReviewResult, setNightlyReviewResult] = useState(null);
  const [missionStatsHistory, setMissionStatsHistory] = useState([]);
  const [missionStatsLoading, setMissionStatsLoading] = useState(false);
  
  // Confirmation modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [proposedMissions, setProposedMissions] = useState([]);
  const [confirmingMissions, setConfirmingMissions] = useState(false);
  
  // Schedule modal states
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [missionToSchedule, setMissionToSchedule] = useState(null);
  const [scheduleDateTime, setScheduleDateTime] = useState('');

  /**
   * Fetches active missions from the API
   */
  const fetchMissions = useCallback(async () => {
    try {
      const response = await missionsApi.getAll({ status: 'active' });
      setMissions(response.data);
      return response.data;
    } catch (error) {
      toast.error('Error al cargar misiones');
      throw error;
    }
  }, []);

  /**
   * Generates new missions and shows confirmation modal
   */
  const generateMissions = useCallback(async () => {
    setGeneratingMissions(true);
    try {
      const response = await missionsApi.generate({ schedule_to_calendar: false });
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const missionsWithDates = response.data.map((m, i) => ({
        ...m,
        addToCalendar: true,
        scheduled_datetime: new Date(tomorrow.setHours(
          m.mission_type === 'reflection' ? 8 + i : 14 + i, 0, 0, 0
        )).toISOString()
      }));
      
      setProposedMissions(missionsWithDates);
      setShowConfirmModal(true);
      return missionsWithDates;
    } catch (error) {
      toast.error('Error al generar misiones');
      throw error;
    } finally {
      setGeneratingMissions(false);
    }
  }, []);

  /**
   * Performs nightly review and generates proposed missions
   */
  const performNightlyReview = useCallback(async () => {
    setNightlyReviewLoading(true);
    try {
      const response = await missionsApi.nightlyReview();
      setNightlyReviewResult(response.data);
      
      const missionsWithDates = (response.data.proposed_missions || []).map(m => ({
        ...m,
        addToCalendar: true,
        scheduled_datetime: m.suggested_datetime
      }));
      
      if (missionsWithDates.length > 0) {
        setProposedMissions(missionsWithDates);
        setShowConfirmModal(true);
      }
      
      toast.success('Revisión nocturna completada');
      return response.data;
    } catch (error) {
      toast.error('Error al generar revisión nocturna');
      throw error;
    } finally {
      setNightlyReviewLoading(false);
    }
  }, []);

  /**
   * Confirms and creates proposed missions
   * @param {Function} onSuccess - Callback to refresh character data after confirmation
   */
  const confirmMissions = useCallback(async (onSuccess) => {
    setConfirmingMissions(true);
    try {
      const existingMissions = proposedMissions.filter(m => m.id);
      const newMissions = proposedMissions.filter(m => !m.id);

      if (newMissions.length > 0) {
        const missionsToCreate = newMissions.map(m => ({
          title: m.title,
          description: m.description,
          mission_type: m.mission_type || 'daily',
          stat_rewards: m.stat_rewards || {},
          stat_penalties: m.stat_penalties || {},
          difficulty: m.difficulty || 1,
          attempt_number: 1,
          prompt_profile: m.prompt_profile || null,
          scheduled_datetime: m.addToCalendar ? m.scheduled_datetime : null,
          addToCalendar: m.addToCalendar
        }));

        await missionsApi.confirmMissions(missionsToCreate);
      }

      const missionsToSchedule = existingMissions.filter(m => m.addToCalendar && m.scheduled_datetime);
      if (missionsToSchedule.length > 0) {
        await Promise.all(missionsToSchedule.map(m => {
          const start = new Date(m.scheduled_datetime);
          const end = new Date(start.getTime() + 60 * 60 * 1000);
          return missionsApi.schedule(m.id, {
            mission_id: m.id,
            date_start: start.toISOString(),
            date_end: end.toISOString()
          });
        }));
      }
      
      toast.success(`${proposedMissions.length} misiones creadas`);
      setShowConfirmModal(false);
      setProposedMissions([]);
      
      if (onSuccess) onSuccess();
      await fetchMissions();
    } catch (error) {
      console.error('Error confirming missions:', error);
      toast.error('Error al confirmar misiones');
      throw error;
    } finally {
      setConfirmingMissions(false);
    }
  }, [proposedMissions, fetchMissions]);

  /**
   * Completes a mission with success or failure
   * @param {string} missionId - Mission ID
   * @param {boolean} success - Whether mission was successful
   * @param {string} reflection - Optional reflection text
   * @param {string} reason - Optional reason for failure
   * @returns {Object} Updated character stats
   */
  const completeMission = useCallback(async (missionId, success, reflection = null, reason = null) => {
    try {
      const response = await missionsApi.complete(missionId, {
        success,
        reflection,
        reason
      });
      
      if (response.data.ai_response) {
        toast.info(response.data.ai_response, { duration: 6000 });
      }
      
      if (success) {
        toast.success('¡Misión completada!');
      } else {
        toast.error('Misión fallida. Sigue adelante.');
      }
      
      await fetchMissions();
      return response.data;
    } catch (error) {
      toast.error('Error al completar misión');
      throw error;
    }
  }, [fetchMissions]);

  /**
   * Deletes a mission
   * @param {string} missionId - Mission ID to delete
   */
  const deleteMission = useCallback(async (missionId) => {
    try {
      await missionsApi.remove(missionId);
      setMissions((prev) => prev.filter((mission) => mission.id !== missionId));
      toast.success('Misión eliminada');
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.detail) {
        toast.error(error.response.data.detail);
      } else {
        toast.error('Error al eliminar la misión');
      }
      throw error;
    }
  }, []);

  /**
   * Schedules a mission to the calendar
   * @param {Function} onSuccess - Callback to refresh data after scheduling
   */
  const scheduleMission = useCallback(async (onSuccess) => {
    if (!missionToSchedule || !scheduleDateTime) return;
    
    try {
      const start = new Date(scheduleDateTime);
      const end = new Date(start.getTime() + 60 * 60 * 1000);

      if (missionToSchedule.linked_task_id) {
        await tasksApi.patch(missionToSchedule.linked_task_id, {
          date_start: start.toISOString(),
          date_end: end.toISOString()
        });
        toast.success('Misión reprogramada en el calendario');
      } else {
        await missionsApi.schedule(missionToSchedule.id, {
          mission_id: missionToSchedule.id,
          date_start: start.toISOString(),
          date_end: end.toISOString()
        });
        toast.success('Misión añadida al calendario');
      }
      
      setShowScheduleModal(false);
      setMissionToSchedule(null);
      setScheduleDateTime('');
      
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error('Error al programar misión');
      throw error;
    }
  }, [missionToSchedule, scheduleDateTime]);

  /**
   * Opens schedule modal for a mission
   * @param {Object} mission - Mission to schedule
   * @param {string|null} preferredDateTimeIso - Optional suggested datetime in ISO format
   */
  const openScheduleModal = useCallback((mission, preferredDateTimeIso = null) => {
    setMissionToSchedule(mission);
    const parsedPreferred = preferredDateTimeIso ? new Date(preferredDateTimeIso) : null;
    const initialDate = parsedPreferred && !Number.isNaN(parsedPreferred.getTime())
      ? parsedPreferred
      : (() => {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(9, 0, 0, 0);
          return tomorrow;
        })();
    setScheduleDateTime(initialDate.toISOString().slice(0, 16));
    setShowScheduleModal(true);
  }, []);

  /**
   * Updates a proposed mission field
   * @param {number} index - Mission index in proposed missions array
   * @param {string} field - Field name to update
   * @param {any} value - New value
   */
  const updateProposedMission = useCallback((index, field, value) => {
    setProposedMissions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  /**
   * Fetches mission-only stats evolution from the canonical stats endpoint.
   * @param {Object} params
   * @param {number} params.days - Relative range in days when from/to are not provided
   * @param {string} params.fromDate - YYYY-MM-DD
   * @param {string} params.toDate - YYYY-MM-DD
   */
  const fetchMissionEvolution = useCallback(async ({ days = 30, fromDate, toDate } = {}) => {
    setMissionStatsLoading(true);
    try {
      const params = { source: 'missions' };
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      if (!fromDate && !toDate) params.days = days;

      const response = await statsApi.getEvolution(params);
      const historyArray = response.data?.history || [];
      setMissionStatsHistory(historyArray);
      return response.data;
    } catch (error) {
      toast.error('Error al cargar evolución de misiones');
      throw error;
    } finally {
      setMissionStatsLoading(false);
    }
  }, []);

  return {
    // State
    missions,
    generatingMissions,
    nightlyReviewLoading,
    nightlyReviewResult,
    missionStatsHistory,
    missionStatsLoading,
    showConfirmModal,
    proposedMissions,
    confirmingMissions,
    showScheduleModal,
    missionToSchedule,
    scheduleDateTime,
    
    // Actions
    fetchMissions,
    generateMissions,
    performNightlyReview,
    confirmMissions,
    completeMission,
    deleteMission,
    scheduleMission,
    openScheduleModal,
    updateProposedMission,
    fetchMissionEvolution,
    setShowConfirmModal,
    setShowScheduleModal,
    setScheduleDateTime,
  };
};
