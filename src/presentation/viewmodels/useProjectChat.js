import { useState, useCallback, useEffect, useRef } from 'react';
import { projectApi } from '../../lib/api';
import { toast } from 'sonner';

const SESSION_STORAGE_KEY = 'project_chat_session_id';

export const useProjectChat = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [phase, setPhase] = useState('INTAKE');
  const [plan, setPlan] = useState(null);
  const [draftId, setDraftId] = useState(null);
  const [attachedFiles, setAttachedFiles] = useState([]);

  // Track if initial restore has been attempted to avoid double-loading
  const restoredRef = useRef(false);

  const generateSessionId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const loadSession = useCallback(async (sid, options = {}) => {
    const { silent = false } = options;
    try {
      const res = await projectApi.getSession(sid);
      const session = res.data;
      if (session && session.turns) {
        setSessionId(sid);
        localStorage.setItem(SESSION_STORAGE_KEY, sid);
        setMessages(
          session.turns.map((t) => ({
            role: t.role,
            content: t.content,
            timestamp: t.timestamp,
          }))
        );
        setPhase(session.phase || 'INTAKE');
        setPlan(session.current_plan || null);
        setAttachedFiles(session.attached_files || []);
        setDraftId(null);
        return true;
      }
      return false;
    } catch {
      if (!silent) {
        toast.error('No se pudo cargar esa conversación');
      }
      return false;
    }
  }, []);

  // Initialize or restore session on mount
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const restoreSession = async () => {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        const restored = await loadSession(stored, { silent: true });
        if (restored) return;
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }

      try {
        const res = await projectApi.getSessions({ limit: 20 });
        const latestSessionId = res.data?.[0]?.session_id;
        if (latestSessionId) {
          const recovered = await loadSession(latestSessionId, { silent: true });
          if (recovered) return;
        }
      } catch {
        // Fall through to a new local session id.
      }

      const newId = generateSessionId();
      setSessionId(newId);
      localStorage.setItem(SESSION_STORAGE_KEY, newId);
    };

    restoreSession();
  }, [loadSession]);

  const startNewConversation = useCallback(() => {
    const newId = generateSessionId();
    setSessionId(newId);
    localStorage.setItem(SESSION_STORAGE_KEY, newId);
    setMessages([]);
    setInputMessage('');
    setPhase('INTAKE');
    setPlan(null);
    setDraftId(null);
    setAttachedFiles([]);
    toast.success('Nueva conversación de proyecto iniciada');
  }, []);

  const sendMessage = useCallback(
    async (message, file = null) => {
      if (!message.trim() || !sessionId) return;

      const userMsg = { role: 'user', content: message, timestamp: new Date().toISOString() };
      setMessages((prev) => [...prev, userMsg]);
      setInputMessage('');
      setLoading(true);

      try {
        let response;
        if (file) {
          response = await projectApi.chatWithFile(message, sessionId, file);
        } else {
          response = await projectApi.chat(message, sessionId);
        }

        const data = response.data;

        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.response, timestamp: new Date().toISOString() },
        ]);

        if (data.phase) setPhase(data.phase);
        if (data.plan) setPlan(data.plan);
        if (data.draft_id) setDraftId(data.draft_id);
        if (data.attached_files?.length > 0) setAttachedFiles(data.attached_files);

        return data;
      } catch (error) {
        toast.error('Error al comunicarse con el planificador de proyectos');
        setMessages((prev) => prev.slice(0, -1));
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [sessionId]
  );

  const confirmDraft = useCallback(
    async (projectData = null) => {
      if (!draftId) return;
      try {
        const res = await projectApi.confirmDraft(draftId, projectData);
        toast.success('Proyecto confirmado y añadido al calendario');
        setDraftId(null);
        setPhase('CONFIRMED');
        if (sessionId) {
          await loadSession(sessionId, { silent: true });
        }
        return res.data;
      } catch (error) {
        toast.error('Error al confirmar el proyecto');
        throw error;
      }
    },
    [draftId, loadSession, sessionId]
  );

  const rejectDraft = useCallback(async () => {
    if (!draftId) return;
    try {
      await projectApi.rejectDraft(draftId);
      toast.info('Borrador rechazado');
      setDraftId(null);
    } catch (error) {
      toast.error('Error al rechazar el borrador');
    }
  }, [draftId]);

  const isConfirmed = phase === 'CONFIRMED';

  return {
    messages,
    inputMessage,
    loading,
    sessionId,
    phase,
    plan,
    draftId,
    isConfirmed,
    attachedFiles,
    sendMessage,
    setInputMessage,
    startNewConversation,
    loadSession,
    confirmDraft,
    rejectDraft,
  };
};
