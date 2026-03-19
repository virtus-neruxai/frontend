import { useState, useCallback } from 'react';
import { agentApi } from '../../lib/api';
import { toast } from 'sonner';

/**
 * Custom hook for managing agent draft confirmations
 * 
 * This hook encapsulates draft-related business logic including:
 * - Managing task draft modal state
 * - Managing emotion draft modal state
 * - Confirming drafts (both tasks and emotions)
 * - Rejecting drafts
 * 
 * @returns {Object} Draft state and operations
 */
export const useDrafts = () => {
  const [showTaskDraftModal, setShowTaskDraftModal] = useState(false);
  const [showEmotionDraftModal, setShowEmotionDraftModal] = useState(false);
  const [showMissionDraftModal, setShowMissionDraftModal] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState(null);
  const [currentDraftData, setCurrentDraftData] = useState(null);

  const getDraftErrorMessage = useCallback((error, fallbackMessage) => {
    const status = error?.response?.status;
    const detail = error?.response?.data?.detail;

    if (status === 404) {
      return 'La propuesta ya no está disponible (expirada o confirmada). Pide una nueva.';
    }
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }
    return fallbackMessage;
  }, []);

  /**
   * Opens the appropriate draft modal based on draft type
   * @param {Object} params - Draft parameters
   * @param {string} params.draftId - Draft ID
   * @param {Object} params.uiAction - UI action data
   * @param {string} params.type - Draft type ('task', 'emotion', or 'mission')
   */
  const openDraftModal = useCallback(({ draftId, uiAction, type }) => {
    setCurrentDraftId(draftId);
    setCurrentDraftData(uiAction);
    
    if (type === 'emotion') {
      setShowEmotionDraftModal(true);
    } else if (type === 'mission') {
      setShowMissionDraftModal(true);
    } else if (type === 'task') {
      setShowTaskDraftModal(true);
    }
  }, []);

  /**
   * Confirms a task draft with optional edits
   * @param {Object} editedData - Edited task data
   * @param {Function} onSuccess - Callback to execute on success
   */
  const confirmTaskDraft = useCallback(async (editedData, onSuccess) => {
    try {
      const response = await agentApi.confirmDraft({
        draft_id: currentDraftId,
        confirmed: true,
        edited_data: editedData
      });
      
      if (response.data.success) {
        const taskAction = editedData?.task_action || currentDraftData?.data?.task_action || 'CREATE_DRAFT';
        toast.success(taskAction === 'EDIT_EXISTING_DRAFT' ? 'Tarea modificada exitosamente' : 'Tarea creada exitosamente');
        setShowTaskDraftModal(false);
        setCurrentDraftId(null);
        setCurrentDraftData(null);
        
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      toast.error(getDraftErrorMessage(error, 'Error al confirmar la tarea'));
      throw error;
    }
  }, [currentDraftId, currentDraftData, getDraftErrorMessage]);

  /**
   * Rejects a task draft
   */
  const rejectTaskDraft = useCallback(async () => {
    try {
      await agentApi.confirmDraft({
        draft_id: currentDraftId,
        confirmed: false
      });
      
      toast.info('Propuesta de tarea rechazada');
      setShowTaskDraftModal(false);
      setCurrentDraftId(null);
      setCurrentDraftData(null);
    } catch (error) {
      toast.error(getDraftErrorMessage(error, 'Error al rechazar la tarea'));
      throw error;
    }
  }, [currentDraftId, getDraftErrorMessage]);

  /**
   * Confirms an emotion draft with optional edits
   * @param {Object} editedData - Edited emotion data
   * @param {Function} onSuccess - Callback to execute on success
   */
  const confirmEmotionDraft = useCallback(async (editedData, onSuccess) => {
    try {
      const response = await agentApi.confirmDraft({
        draft_id: currentDraftId,
        confirmed: true,
        edited_data: editedData
      });
      
      if (response.data.success) {
        toast.success('Emoción registrada exitosamente');
        setShowEmotionDraftModal(false);
        setCurrentDraftId(null);
        setCurrentDraftData(null);
        
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      toast.error(getDraftErrorMessage(error, 'Error al confirmar la emoción'));
      throw error;
    }
  }, [currentDraftId, getDraftErrorMessage]);

  /**
   * Rejects an emotion draft
   */
  const rejectEmotionDraft = useCallback(async () => {
    try {
      await agentApi.confirmDraft({
        draft_id: currentDraftId,
        confirmed: false
      });
      
      toast.info('Propuesta de emoción rechazada');
      setShowEmotionDraftModal(false);
      setCurrentDraftId(null);
      setCurrentDraftData(null);
    } catch (error) {
      toast.error(getDraftErrorMessage(error, 'Error al rechazar la emoción'));
      throw error;
    }
  }, [currentDraftId, getDraftErrorMessage]);

  /**
   * Confirms a mission draft with optional edits
   * @param {Object} editedData - Edited mission data
   * @param {Function} onSuccess - Callback to execute on success
   */
  const confirmMissionDraft = useCallback(async (editedData, onSuccess) => {
    try {
      const response = await agentApi.confirmDraft({
        draft_id: currentDraftId,
        confirmed: true,
        edited_data: editedData
      });
      
      if (response.data.success) {
        toast.success('Misión aceptada exitosamente');
        setShowMissionDraftModal(false);
        setCurrentDraftId(null);
        setCurrentDraftData(null);
        
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      toast.error(getDraftErrorMessage(error, 'Error al confirmar la misión'));
      throw error;
    }
  }, [currentDraftId, getDraftErrorMessage]);

  /**
   * Rejects a mission draft
   */
  const rejectMissionDraft = useCallback(async () => {
    try {
      await agentApi.confirmDraft({
        draft_id: currentDraftId,
        confirmed: false
      });
      
      toast.info('Misión rechazada');
      setShowMissionDraftModal(false);
      setCurrentDraftId(null);
      setCurrentDraftData(null);
    } catch (error) {
      toast.error(getDraftErrorMessage(error, 'Error al rechazar la misión'));
      throw error;
    }
  }, [currentDraftId, getDraftErrorMessage]);

  /**
   * Closes all draft modals and clears state
   */
  const closeDraftModals = useCallback(() => {
    setShowTaskDraftModal(false);
    setShowEmotionDraftModal(false);
    setShowMissionDraftModal(false);
    setCurrentDraftId(null);
    setCurrentDraftData(null);
  }, []);

  return {
    // State
    showTaskDraftModal,
    showEmotionDraftModal,
    showMissionDraftModal,
    currentDraftId,
    currentDraftData,
    
    // Actions
    openDraftModal,
    confirmTaskDraft,
    rejectTaskDraft,
    confirmEmotionDraft,
    rejectEmotionDraft,
    confirmMissionDraft,
    rejectMissionDraft,
    closeDraftModals,
    setShowTaskDraftModal,
    setShowEmotionDraftModal,
    setShowMissionDraftModal,
  };
};
