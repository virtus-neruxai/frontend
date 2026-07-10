import { useState, useCallback } from 'react';
import { missionsApi, statsApi, tasksApi, reflectionsApi, notificationsApi } from '../../lib/api';
import { toast } from 'sonner';

const sortMissionsByCreatedAt = (items = []) => [...items].sort((a, b) => {
  const aTime = a?.created_at ? new Date(a.created_at).getTime() : 0;
  const bTime = b?.created_at ? new Date(b.created_at).getTime() : 0;
  return bTime - aTime;
});

const mergeMissionsById = (current = [], incoming = []) => {
  const missionMap = new Map();

  current.forEach((mission) => {
    if (mission?.id) {
      missionMap.set(mission.id, mission);
    }
  });

  incoming.forEach((mission) => {
    if (mission?.id) {
      missionMap.set(mission.id, {
        ...missionMap.get(mission.id),
        ...mission,
      });
    }
  });

  return sortMissionsByCreatedAt(Array.from(missionMap.values()));
};

const buildMissionConfirmPayload = (mission) => ({
  title: mission.title,
  description: mission.description,
  mission_type: mission.mission_type || 'daily',
  stat_rewards: mission.stat_rewards || {},
  stat_penalties: mission.stat_penalties || {},
  difficulty: mission.difficulty || 1,
  domain: mission.domain || 'Hábitos',
  estimated_minutes: mission.estimated_minutes || 30,
  prompt_profile: mission.prompt_profile || null,
  mentor_context: mission.mentor_context || null,
  base_template_id: mission.base_template_id || null,
  semantic_fingerprint: mission.semantic_fingerprint || null,
  related_to: mission.related_to || null,
  scheduled_datetime: mission.addToCalendar === false ? null : (mission.scheduled_datetime || mission.start_date || null),
  addToCalendar: mission.addToCalendar !== false,
  expires_at: mission.due_date || mission.expires_at || null,
});

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
  const [completedMissions, setCompletedMissions] = useState([]);
  const [generatingMissions, setGeneratingMissions] = useState(false);
  const [nightlyReviewLoading, setNightlyReviewLoading] = useState(false);
  const [nightlyReviewResult, setNightlyReviewResult] = useState(null);
  const [activeNightlyReviewDate, setActiveNightlyReviewDate] = useState(null);
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
      const activeMissions = Array.isArray(response.data) ? response.data : [];
      setMissions(sortMissionsByCreatedAt(activeMissions));
      return activeMissions;
    } catch (error) {
      toast.error('Error al cargar misiones');
      throw error;
    }
  }, []);

  /**
   * Fetches completed (finished) missions for the history view.
   */
  const fetchCompletedMissions = useCallback(async () => {
    try {
      const response = await missionsApi.getAll({ status: 'done' });
      const done = Array.isArray(response.data) ? response.data : [];
      setCompletedMissions(sortMissionsByCreatedAt(done));
      return done;
    } catch (error) {
      toast.error('Error al cargar el historial de misiones');
      throw error;
    }
  }, []);

  /**
   * Generates new missions and shows confirmation modal
   */
  const generateMissions = useCallback(async () => {
    setGeneratingMissions(true);
    try {
      const response = await missionsApi.generate({});
      // generate-with-context returns { drafts: [...], metadata: {...} }
      const drafts = response.data?.drafts || (Array.isArray(response.data) ? response.data : []);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const missionsWithDates = drafts.map((m, i) => ({
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
   * Hydrates the NightlyReview result into the same state used by the manual button flow.
   */
  const hydrateNightlyReviewResult = useCallback((result) => {
    if (!result) return [];
    setNightlyReviewResult(result);
    setActiveNightlyReviewDate(result.review_date || null);

    const missionsWithDates = (result.proposed_missions || []).map(m => ({
      ...m,
      addToCalendar: true,
      scheduled_datetime: m.suggested_datetime
    }));

    setProposedMissions(missionsWithDates);
    setShowConfirmModal(missionsWithDates.length > 0);
    return missionsWithDates;
  }, []);

  const markActiveNightlyReviewProposalStatus = useCallback(async (status) => {
    if (!activeNightlyReviewDate) return;

    try {
      await notificationsApi.markNightlyReviewProposalStatus({
        review_date: activeNightlyReviewDate,
        status,
      });
    } catch (error) {
      console.error('Error updating NightlyReview proposal status:', error);
    }
  }, [activeNightlyReviewDate]);

  /**
   * Performs nightly review and generates proposed missions
   */
  const performNightlyReview = useCallback(async () => {
    setNightlyReviewLoading(true);
    try {
      const response = await missionsApi.nightlyReview();
      hydrateNightlyReviewResult(response.data);
      
      toast.success('Revisión nocturna completada');
      return response.data;
    } catch (error) {
      toast.error('Error al generar revisión nocturna');
      throw error;
    } finally {
      setNightlyReviewLoading(false);
    }
  }, [hydrateNightlyReviewResult]);

  /**
   * Confirms and creates proposed missions
   * @param {Function} onSuccess - Callback to refresh character data after confirmation
   */
  const confirmMissions = useCallback(async (editedData, onSuccess) => {
    setConfirmingMissions(true);
    try {
      const currentMission = proposedMissions[0];
      if (!currentMission) return;

      const missionToConfirm = {
        ...currentMission,
        ...editedData,
        scheduled_datetime: editedData?.start_date || currentMission.scheduled_datetime,
      };

      if (missionToConfirm.id) {
        if (missionToConfirm.addToCalendar !== false && missionToConfirm.scheduled_datetime) {
          const start = new Date(missionToConfirm.scheduled_datetime);
          const end = new Date(start.getTime() + (missionToConfirm.estimated_minutes || 60) * 60 * 1000);
          await missionsApi.schedule(missionToConfirm.id, {
            mission_id: missionToConfirm.id,
            date_start: start.toISOString(),
            date_end: end.toISOString()
          });
        }
      } else {
        await missionsApi.confirmMissions([buildMissionConfirmPayload(missionToConfirm)]);
      }

      const remainingMissions = proposedMissions.slice(1);
      toast.success('Misión creada');
      await markActiveNightlyReviewProposalStatus('confirmed');
      setProposedMissions(remainingMissions);
      setShowConfirmModal(remainingMissions.length > 0);

      await fetchMissions();
      if (onSuccess) await onSuccess();
    } catch (error) {
      console.error('Error confirming missions:', error);
      toast.error('Error al confirmar misiones');
      throw error;
    } finally {
      setConfirmingMissions(false);
    }
  }, [proposedMissions, fetchMissions, markActiveNightlyReviewProposalStatus]);

  const rejectProposedMission = useCallback(async () => {
    const remainingMissions = proposedMissions.slice(1);
    await markActiveNightlyReviewProposalStatus('rejected');
    setProposedMissions(remainingMissions);
    setShowConfirmModal(remainingMissions.length > 0);
    toast.info('Misión rechazada');
  }, [proposedMissions, markActiveNightlyReviewProposalStatus]);

  /**
   * Completes a mission with success or failure
   * @param {string} missionId - Mission ID
   * @param {boolean} success - Whether mission was successful
   * @param {Object} options - Optional reflection and mission context
   * @param {string|null} options.reflection - Optional reflection text
   * @param {Object|null} options.emotionSnapshot - Optional structured emotion
   * @param {string|null} options.reason - Optional reason for failure
   * @param {Object} options.missionContext - Mission metadata for the reflection
   * @returns {Object} Updated character stats
   */
  const completeMission = useCallback(async (
    missionId,
    success,
    {
      reflection = null,
      emotionSnapshot = null,
      reason = null,
      missionContext = {},
    } = {},
  ) => {
    try {
      const response = await missionsApi.complete(missionId, { success, reason });
      const reflectionContent = typeof reflection === 'string' ? reflection.trim() : '';
      if (reflectionContent) {
        try {
          await reflectionsApi.create({
            content: reflectionContent,
            reflection_type: 'mission',
            mission_id: missionId,
            task_id: missionContext.linked_task_id || null,
            source_item_title: missionContext.title || null,
            source_prompt: missionContext.description || null,
            ...(emotionSnapshot ? { emotion_snapshot: emotionSnapshot } : {}),
          });
        } catch (reflectionError) {
          toast.warning('La misión se registró, pero no se pudo guardar la reflexión');
        }
      }

      if (success) {
        toast.success('¡Misión completada!');
      } else {
        toast.error('Misión fallida. Sigue adelante.');
      }

      await Promise.all([fetchMissions(), fetchCompletedMissions()]);
      return response.data;
    } catch (error) {
      toast.error('Error al completar misión');
      throw error;
    }
  }, [fetchMissions, fetchCompletedMissions]);

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
    completedMissions,
    generatingMissions,
    nightlyReviewLoading,
    nightlyReviewResult,
    missionStatsHistory,
    missionStatsLoading,
    showConfirmModal,
    proposedMissions,
    showScheduleModal,
    missionToSchedule,
    scheduleDateTime,
    
    // Actions
    fetchMissions,
    fetchCompletedMissions,
    generateMissions,
    performNightlyReview,
    hydrateNightlyReviewResult,
    confirmMissions,
    rejectProposedMission,
    completeMission,
    deleteMission,
    scheduleMission,
    openScheduleModal,
    fetchMissionEvolution,
    setShowConfirmModal,
    setShowScheduleModal,
    setScheduleDateTime,
  };
};
