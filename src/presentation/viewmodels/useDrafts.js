import { useState, useCallback } from 'react';
import { agentApi } from '../../lib/api';
import { apiErrorMessage } from '../../lib/quotaError';
import { toast } from 'sonner';

export const useDrafts = () => {
  const [showTaskDraftModal, setShowTaskDraftModal] = useState(false);
  const [showMissionDraftModal, setShowMissionDraftModal] = useState(false);
  const [showProjectDraftModal, setShowProjectDraftModal] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState(null);
  const [currentDraftData, setCurrentDraftData] = useState(null);

  const getDraftErrorMessage = useCallback((error, fallbackMessage) => {
    // El 404 se queda aquí: es propio de los drafts (el borrador caduca a las
    // 48 h) y el mensaje de la API no lo explicaría igual de bien. El resto ya
    // lo cubre el helper compartido, cuota incluida.
    if (error?.response?.status === 404) {
      return 'La propuesta ya no está disponible (expirada o confirmada). Pide una nueva.';
    }
    return apiErrorMessage(error, fallbackMessage);
  }, []);

  const openDraftModal = useCallback(({ draftId, uiAction, type }) => {
    setCurrentDraftId(draftId);
    setCurrentDraftData(uiAction);
    if (type === 'mission') {
      setShowMissionDraftModal(true);
    } else if (type === 'project') {
      setShowProjectDraftModal(true);
    } else if (type === 'task') {
      setShowTaskDraftModal(true);
    }
  }, []);

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

  const rejectTaskDraft = useCallback(async () => {
    try {
      await agentApi.confirmDraft({ draft_id: currentDraftId, confirmed: false });
      toast.info('Propuesta de tarea rechazada');
      setShowTaskDraftModal(false);
      setCurrentDraftId(null);
      setCurrentDraftData(null);
    } catch (error) {
      toast.error(getDraftErrorMessage(error, 'Error al rechazar la tarea'));
      throw error;
    }
  }, [currentDraftId, getDraftErrorMessage]);

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

  const rejectMissionDraft = useCallback(async () => {
    try {
      await agentApi.confirmDraft({ draft_id: currentDraftId, confirmed: false });
      toast.info('Misión rechazada');
      setShowMissionDraftModal(false);
      setCurrentDraftId(null);
      setCurrentDraftData(null);
    } catch (error) {
      toast.error(getDraftErrorMessage(error, 'Error al rechazar la misión'));
      throw error;
    }
  }, [currentDraftId, getDraftErrorMessage]);

  const confirmProjectDraft = useCallback(async (editedData, onSuccess) => {
    try {
      const response = await agentApi.confirmDraft({
        draft_id: currentDraftId,
        confirmed: true,
        edited_data: editedData,
      });
      if (response.data.success) {
        toast.success(response.data.message || 'Proyecto creado exitosamente');
        setShowProjectDraftModal(false);
        setCurrentDraftId(null);
        setCurrentDraftData(null);
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      toast.error(getDraftErrorMessage(error, 'Error al confirmar el proyecto'));
      throw error;
    }
  }, [currentDraftId, getDraftErrorMessage]);

  const rejectProjectDraft = useCallback(async () => {
    try {
      await agentApi.confirmDraft({ draft_id: currentDraftId, confirmed: false });
      toast.info('Plan descartado');
      setShowProjectDraftModal(false);
      setCurrentDraftId(null);
      setCurrentDraftData(null);
    } catch (error) {
      toast.error(getDraftErrorMessage(error, 'Error al descartar el plan'));
      throw error;
    }
  }, [currentDraftId, getDraftErrorMessage]);

  const closeDraftModals = useCallback(() => {
    setShowTaskDraftModal(false);
    setShowMissionDraftModal(false);
    setShowProjectDraftModal(false);
    setCurrentDraftId(null);
    setCurrentDraftData(null);
  }, []);

  return {
    showTaskDraftModal,
    showMissionDraftModal,
    showProjectDraftModal,
    currentDraftId,
    currentDraftData,
    openDraftModal,
    confirmTaskDraft,
    rejectTaskDraft,
    confirmMissionDraft,
    rejectMissionDraft,
    confirmProjectDraft,
    rejectProjectDraft,
    closeDraftModals,
    setShowTaskDraftModal,
    setShowMissionDraftModal,
    setShowProjectDraftModal,
  };
};
