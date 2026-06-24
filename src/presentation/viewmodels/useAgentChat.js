import { useState, useCallback, useEffect } from 'react';
import { agentApi } from '../../lib/api';
import { toast } from 'sonner';

/**
 * Custom hook for managing agent chat interactions
 * 
 * This hook encapsulates all agent-related business logic including:
 * - Sending messages to the agent
 * - Handling agent responses
 * - Managing draft confirmations (tasks and missions)
 * - UI action handling
 * - Session management (conversation continuity)
 * 
 * @returns {Object} Agent chat state and operations
 */
export const useAgentChat = () => {
  const [chatMessage, setChatMessage] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  
  // Initialize or restore session_id from localStorage
  useEffect(() => {
    const storedSessionId = localStorage.getItem('agent_session_id');
    if (storedSessionId) {
      setSessionId(storedSessionId);
    } else {
      const newSessionId = generateSessionId();
      setSessionId(newSessionId);
      localStorage.setItem('agent_session_id', newSessionId);
    }
  }, []);
  
  /**
   * Generates a new session ID (UUID v4)
   */
  const generateSessionId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
  
  /**
   * Starts a new conversation (new session_id)
   */
  const startNewConversation = useCallback(() => {
    const newSessionId = generateSessionId();
    setSessionId(newSessionId);
    localStorage.setItem('agent_session_id', newSessionId);
    setChatResponse('');
    setChatMessage('');
    toast.success('Nueva conversación iniciada');
  }, []);
  
  /**
   * Sends a message to the agent and handles the response
   * @param {string} message - Message to send to the agent
   * @param {Function} onDraftReceived - Callback when draft is received
   * @returns {Object} Agent response
   */
  const sendMessage = useCallback(async (message, onDraftReceived) => {
    if (!message.trim() || !sessionId) return;
    
    setChatLoading(true);
    try {
      const response = await agentApi.chat(message, sessionId);
      setChatResponse(response.data.response);
      setChatMessage('');
      
      // If there's a draft, trigger callback with draft data
      if (response.data.draft_id && response.data.ui_action) {
        if (onDraftReceived) {
          // Determine draft type based on UI action
          let draftType = 'task'; // default
          if (response.data.ui_action.action === 'SHOW_MISSION_CONFIRMATION_MODAL') {
            draftType = 'mission';
          } else if (response.data.ui_action.action === 'SHOW_TASK_CONFIRMATION_MODAL') {
            draftType = 'task';
          }
          
          onDraftReceived({
            draftId: response.data.draft_id,
            uiAction: response.data.ui_action,
            type: draftType
          });
        }
      }
      
      return response.data;
    } catch (error) {
      toast.error('Error al comunicarse con el agente');
      throw error;
    } finally {
      setChatLoading(false);
    }
  }, [sessionId]);

  /**
   * Clears the current chat response
   */
  const clearResponse = useCallback(() => {
    setChatResponse('');
  }, []);

  return {
    // State
    chatMessage,
    chatResponse,
    chatLoading,
    sessionId,
    
    // Actions
    sendMessage,
    setChatMessage,
    setChatResponse,
    clearResponse,
    startNewConversation,
  };
};
