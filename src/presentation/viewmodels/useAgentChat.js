import { useState, useCallback, useEffect } from 'react';
import { agentApi } from '../../lib/api';
import { apiErrorMessage } from '../../lib/quotaError';
import { toast } from 'sonner';

const generateSessionId = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });

/**
 * Custom hook for managing agent chat interactions.
 *
 * Session IDs are stored per-profile in localStorage so switching profiles
 * automatically restores the last session used in each profile.
 *
 * @param {string} profileId - Active profile ID (e.g. 'stoic', 'performance')
 */
export const useAgentChat = (profileId = 'default') => {
  const storageKey = `agent_session_id_${profileId}`;

  const [chatMessage, setChatMessage] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [chatMetadata, setChatMetadata] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [deepReasoning, setDeepReasoningState] = useState(false);
  const [userDataQa, setUserDataQaState] = useState(false);
  const [projectPlan, setProjectPlanState] = useState(false);

  // The three explicit modes are mutually exclusive — mirrors agent-service's
  // validate_exclusive_explicit_modes (deep_reasoning / user_data_qa /
  // project_plan). Turning one on clears the other two.
  const setDeepReasoning = useCallback((checked) => {
    setDeepReasoningState(Boolean(checked));
    if (checked) {
      setUserDataQaState(false);
      setProjectPlanState(false);
    }
  }, []);

  const setUserDataQa = useCallback((checked) => {
    setUserDataQaState(Boolean(checked));
    if (checked) {
      setDeepReasoningState(false);
      setProjectPlanState(false);
    }
  }, []);

  const setProjectPlan = useCallback((checked) => {
    setProjectPlanState(Boolean(checked));
    if (checked) {
      setDeepReasoningState(false);
      setUserDataQaState(false);
    }
  }, []);

  // Re-initialize whenever the profile changes: restore that profile's last
  // session or create a fresh one.
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      setSessionId(stored);
    } else {
      const newId = generateSessionId();
      setSessionId(newId);
      localStorage.setItem(storageKey, newId);
    }
    // Clear the visible response when switching profiles so old content
    // from a different profile doesn't bleed through.
    setChatResponse('');
    setChatMetadata(null);
    setChatMessage('');
  }, [storageKey]);

  /**
   * Starts a new conversation (generates a fresh session_id).
   */
  const startNewConversation = useCallback(() => {
    const newId = generateSessionId();
    setSessionId(newId);
    localStorage.setItem(storageKey, newId);
    setChatResponse('');
    setChatMetadata(null);
    setChatMessage('');
    toast.success('Nueva conversación iniciada');
  }, [storageKey]);

  /**
   * Selects an existing conversation by session_id.
   * All subsequent messages will be sent under this session.
   */
  const selectConversation = useCallback((newSessionId) => {
    setSessionId(newSessionId);
    localStorage.setItem(storageKey, newSessionId);
    setChatResponse('');
    setChatMetadata(null);
  }, [storageKey]);

  /**
   * Sends a message to the agent and handles the response.
   * @param {string} message - Message to send
   * @param {Function} onDraftReceived - Called when agent returns a draft
   */
  const sendMessage = useCallback(async (message, onDraftReceived) => {
    if (!message.trim() || !sessionId) return;

    setChatLoading(true);
    try {
      const response = await agentApi.chat(message, sessionId, deepReasoning, userDataQa, projectPlan);
      setChatResponse(response.data.response);
      setChatMetadata(response.data.metadata || null);
      setChatMessage('');

      if (response.data.draft_id && response.data.ui_action) {
        if (onDraftReceived) {
          let draftType = 'task';
          if (response.data.ui_action.action === 'SHOW_MISSION_CONFIRMATION_MODAL') {
            draftType = 'mission';
          } else if (response.data.ui_action.action === 'SHOW_PROJECT_CONFIRMATION_MODAL') {
            draftType = 'project';
          } else if (response.data.ui_action.action === 'SHOW_TASK_CONFIRMATION_MODAL') {
            draftType = 'task';
          }
          onDraftReceived({
            draftId: response.data.draft_id,
            uiAction: response.data.ui_action,
            type: draftType,
          });
        }
      }

      return response.data;
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Error al comunicarse con el agente'));
      throw error;
    } finally {
      setChatLoading(false);
    }
  }, [sessionId, deepReasoning, userDataQa, projectPlan]);

  const clearResponse = useCallback(() => {
    setChatResponse('');
  }, []);

  return {
    chatMessage,
    chatResponse,
    chatMetadata,
    chatLoading,
    sessionId,
    deepReasoning,
    setDeepReasoning,
    userDataQa,
    setUserDataQa,
    projectPlan,
    setProjectPlan,
    sendMessage,
    setChatMessage,
    setChatResponse,
    clearResponse,
    startNewConversation,
    selectConversation,
  };
};
