import { useState, useCallback, useEffect } from 'react';
import { healthAgentApi, draftTypeFromAction } from '../../lib/api';
import { apiErrorMessage } from '../../lib/quotaError';
import { toast } from 'sonner';

const STORAGE_KEY = 'agent_session_id_health';

const generateSessionId = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });

/**
 * Health Mentor chat.
 *
 * Two deliberate differences from `useAgentChat`, both structural rather than
 * cosmetic:
 *
 * 1. **One session key, no profile suffix.** On the general Mentor the profile
 *    partitions memory into five conversations. Health data belongs to the body,
 *    not to the persona: a knee operated on under "calm" is the same knee under
 *    "performance". Keying by profile would also drop every answered slot on a
 *    voice switch, which is the repetition the product rules forbid.
 * 2. **Two toggles, not three.** "Datos de la app" lives only in Mentor
 *    `<perfil>`. The backend returns 422 if `user_data_qa` arrives here, so this
 *    hook has no way to send it.
 */
export const useHealthChat = () => {
  const [chatMessage, setChatMessage] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [chatMetadata, setChatMetadata] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [deepReasoning, setDeepReasoningState] = useState(false);
  const [projectPlan, setProjectPlanState] = useState(false);

  // Deep and Plan are mutually exclusive — mirrors HealthChatRequest's
  // validate_exclusive_explicit_modes, which returns 422 if both arrive.
  const setDeepReasoning = useCallback((checked) => {
    setDeepReasoningState(Boolean(checked));
    if (checked) setProjectPlanState(false);
  }, []);

  const setProjectPlan = useCallback((checked) => {
    setProjectPlanState(Boolean(checked));
    if (checked) setDeepReasoningState(false);
  }, []);

  // Runs once. Unlike useAgentChat this has no profile dependency, so changing
  // the mentor voice never re-runs it: the conversation and its slots survive.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setSessionId(stored);
      return;
    }
    const newId = generateSessionId();
    setSessionId(newId);
    localStorage.setItem(STORAGE_KEY, newId);
  }, []);

  /**
   * Explicit reset: clears the mentor's stored slots for this session.
   * The persisted history is untouched — only what it is currently holding.
   *
   * The backend short-circuits on `reset_session=true` before the quota check
   * and before the graph runs: no LLM call, no turn added to the history. The
   * placeholder text below exists only because `message` has min_length=1 on
   * the request contract — the backend never reads it for a reset.
   */
  const resetSession = useCallback(async () => {
    if (!sessionId) return;
    setChatLoading(true);
    try {
      const response = await healthAgentApi.chat('(reset)', sessionId, false, false, true);
      setChatResponse(response.data.response);
      setChatMetadata(response.data.metadata || null);
      setChatMessage('');
      toast.success('Conversación reiniciada');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'No se pudo reiniciar la conversación'));
    } finally {
      setChatLoading(false);
    }
  }, [sessionId]);

  /**
   * Redirects future messages into an existing conversation, so the health
   * history is browsable the same way the general Mentor's is.
   */
  const selectConversation = useCallback((newSessionId) => {
    setSessionId(newSessionId);
    localStorage.setItem(STORAGE_KEY, newSessionId);
    setChatResponse('');
    setChatMetadata(null);
  }, []);

  const startNewConversation = useCallback(() => {
    const newId = generateSessionId();
    setSessionId(newId);
    localStorage.setItem(STORAGE_KEY, newId);
    setChatResponse('');
    setChatMetadata(null);
    setChatMessage('');
    toast.success('Nueva conversación iniciada');
  }, []);

  /**
   * @param {string} message
   * @param {Function} onDraftReceived - called when the turn returns a draft.
   *   Health proposes tasks, routines and projects — never missions.
   */
  const sendMessage = useCallback(async (message, onDraftReceived) => {
    if (!message.trim() || !sessionId) return;

    setChatLoading(true);
    try {
      const response = await healthAgentApi.chat(
        message, sessionId, deepReasoning, projectPlan,
      );
      setChatResponse(response.data.response);
      setChatMetadata(response.data.metadata || null);
      setChatMessage('');

      if (response.data.draft_id && response.data.ui_action && onDraftReceived) {
        onDraftReceived({
          draftId: response.data.draft_id,
          uiAction: response.data.ui_action,
          // Health never returns a mission draft, so the general helper's
          // mission branch is simply dead code here rather than a divergence.
          type: draftTypeFromAction(response.data.ui_action.action),
        });
      }

      return response.data;
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Error al comunicarse con el mentor de salud'));
      throw error;
    } finally {
      setChatLoading(false);
    }
  }, [sessionId, deepReasoning, projectPlan]);

  const clearResponse = useCallback(() => setChatResponse(''), []);

  return {
    chatMessage,
    chatResponse,
    chatMetadata,
    chatLoading,
    sessionId,
    deepReasoning,
    setDeepReasoning,
    projectPlan,
    setProjectPlan,
    sendMessage,
    setChatMessage,
    setChatResponse,
    clearResponse,
    resetSession,
    startNewConversation,
    selectConversation,
  };
};
