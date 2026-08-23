import { useState, useCallback } from 'react';
import { challengesApi, tasksApi } from '../../lib/api';
import { apiErrorMessage } from '../../lib/quotaError';
import { toast } from 'sonner';

/**
 * Custom hook for managing challenges (desafíos) state and operations.
 *
 * A challenge is a recurring goal that the ChallengeEngine turns into a routine
 * draft. The user reviews/edits the draft (days, time, cadence) and confirms it,
 * which creates a challenge + linked calendar routine.
 */
export const useChallenges = () => {
  const [challenges, setChallenges] = useState([]);
  const [finishedChallenges, setFinishedChallenges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generatingType, setGeneratingType] = useState(null);

  // Draft modal state
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draft, setDraft] = useState(null); // { challenge_type, prompt, data }
  const [confirming, setConfirming] = useState(false);

  const fetchChallenges = useCallback(async () => {
    setLoading(true);
    try {
      const response = await challengesApi.getAll();
      const list = Array.isArray(response.data) ? response.data : [];
      setChallenges(list);
      return list;
    } catch (error) {
      toast.error('Error al cargar desafíos');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFinishedChallenges = useCallback(async () => {
    try {
      const response = await challengesApi.getAll({ status: 'completed' });
      const list = Array.isArray(response.data) ? response.data : [];
      setFinishedChallenges(list);
      return list;
    } catch (error) {
      toast.error('Error al cargar el historial de desafíos');
      throw error;
    }
  }, []);

  /**
   * Generate a routine draft for a challenge of the given type from a prompt.
   */
  const generateChallenge = useCallback(async (challengeType, prompt) => {
    if (!prompt?.trim()) {
      toast.warning('Escribe tu desafío antes de generarlo');
      return;
    }
    setGeneratingType(challengeType);
    try {
      const response = await challengesApi.generate({
        challenge_type: challengeType,
        prompt: prompt.trim(),
      });
      setDraft({
        challenge_type: challengeType,
        prompt: prompt.trim(),
        data: response.data?.draft || {},
        metadata: response.data?.metadata || {},
      });
      setShowDraftModal(true);
      return response.data;
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Error al generar el desafío'));
      throw error;
    } finally {
      setGeneratingType(null);
    }
  }, []);

  /**
   * Confirm an edited draft -> creates challenge + routine.
   */
  const confirmChallenge = useCallback(async (editedDraft, onSuccess) => {
    if (!draft) return;
    setConfirming(true);
    try {
      // Build the routine start from the chosen LOCAL time so the calendar shows
      // it at the right hour/day (sending an ISO string avoids the backend
      // interpreting the time as UTC).
      const suggestedTime = editedDraft.suggested_time || '08:00';
      const [hh, mm] = suggestedTime.split(':').map((n) => parseInt(n, 10) || 0);
      const localStart = new Date();
      localStart.setHours(hh, mm, 0, 0);

      const payload = {
        challenge_type: draft.challenge_type,
        prompt: draft.prompt,
        title: editedDraft.title,
        description: editedDraft.description || '',
        domain: editedDraft.domain || 'Hábitos',
        target_stats: editedDraft.target_stats || [],
        stat_rewards: editedDraft.stat_rewards || {},
        recurrence_rule: editedDraft.recurrence_rule,
        suggested_time: suggestedTime,
        estimated_minutes: editedDraft.estimated_minutes || 30,
        start_date: editedDraft.start_date || localStart.toISOString(),
      };
      await challengesApi.confirm(payload);
      toast.success('Desafío creado');
      setShowDraftModal(false);
      setDraft(null);
      await fetchChallenges();
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error('Error al confirmar el desafío');
      throw error;
    } finally {
      setConfirming(false);
    }
  }, [draft, fetchChallenges]);

  const rejectDraft = useCallback(() => {
    setShowDraftModal(false);
    setDraft(null);
  }, []);

  /**
   * Mark a routine occurrence as completed (from the Desafíos tab or calendar).
   */
  const completeOccurrence = useCallback(async (routineId, date = null) => {
    try {
      await tasksApi.completeOccurrence(routineId, date);
      toast.success('Ocurrencia completada');
      await fetchChallenges();
    } catch (error) {
      toast.error('Error al completar la ocurrencia');
      throw error;
    }
  }, [fetchChallenges]);

  /**
   * Finalize a whole challenge (close it). Stops the linked routine going forward.
   */
  const completeChallenge = useCallback(async (challengeId) => {
    try {
      await challengesApi.complete(challengeId);
      toast.success('Desafío completado');
      await Promise.all([fetchChallenges(), fetchFinishedChallenges()]);
    } catch (error) {
      toast.error('Error al completar el desafío');
      throw error;
    }
  }, [fetchChallenges, fetchFinishedChallenges]);

  const deleteChallenge = useCallback(async (challengeId) => {
    try {
      await challengesApi.remove(challengeId);
      setChallenges((prev) => prev.filter((c) => c.id !== challengeId));
      toast.success('Desafío eliminado');
    } catch (error) {
      toast.error('Error al eliminar el desafío');
      throw error;
    }
  }, []);

  return {
    // State
    challenges,
    finishedChallenges,
    loading,
    generatingType,
    showDraftModal,
    draft,
    confirming,
    // Actions
    fetchChallenges,
    fetchFinishedChallenges,
    generateChallenge,
    confirmChallenge,
    rejectDraft,
    completeOccurrence,
    completeChallenge,
    deleteChallenge,
    setShowDraftModal,
  };
};
