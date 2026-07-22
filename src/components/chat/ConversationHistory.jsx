import React, { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MessageCircle, ChevronRight, Clock, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { conversationsApi, statsApi } from '../../lib/api';
import { useProfileTheme } from '../../theme/useProfileTheme';

// Retry with a tight, near-constant cadence (not exponential backoff): the
// backend is only unavailable during its own startup window, so we want to
// recover within ~2s of it coming up rather than waiting for a widening gap.
const MAX_FETCH_RETRIES = 18;
const RETRY_STEP_MS = 500;
const RETRY_MAX_MS = 2000;

const ConversationHistory = forwardRef(({ activeSessionId, onSelectConversation }, ref) => {
  const { persistedProfileId } = useProfileTheme();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [frictionLabels, setFrictionLabels] = useState({});
  // Start in loading state so the first render shows a spinner instead of a
  // premature "no conversations" flash before the initial fetch resolves.
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  // True while we're retrying after a failed fetch (e.g. the agent service is
  // still starting up right after a deploy) so the UI can reassure the user.
  const [connecting, setConnecting] = useState(false);
  const retryTimerRef = useRef(null);

  // Fetch the conversation list, retrying transient failures with backoff.
  // Right after a deploy the frontend can load before the agent service is
  // accepting connections; without retries the first request fails and the list
  // stays empty until the next profile switch re-triggers it. Retrying (while
  // keeping the spinner up) makes the list self-heal.
  const fetchConversations = useCallback(async (attempt = 0) => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    setLoading(true);
    try {
      const response = await conversationsApi.getAll({ prompt_profile: persistedProfileId });
      const data = response.data;
      setConversations(Array.isArray(data) ? data : []);
      setLoadError(false);
      setConnecting(false);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      if (attempt < MAX_FETCH_RETRIES) {
        const delay = Math.min(RETRY_STEP_MS * (attempt + 1), RETRY_MAX_MS);
        setConnecting(true);
        retryTimerRef.current = setTimeout(() => fetchConversations(attempt + 1), delay);
        // Keep loading=true so the UI shows a spinner, not "no conversations".
      } else {
        setLoadError(true);
        setConnecting(false);
        setConversations([]);
        setLoading(false);
        toast.error('Error al cargar el historial');
      }
    }
  }, [persistedProfileId]);

  // forceSelect: true when the user explicitly clicks a conversation or after
  // sending a message (so the panel always shows); false for auto-loads on
  // activeSessionId change (only selects if the session actually has messages).
  // Note: this does NOT touch `loading` — that state belongs to the list fetch,
  // so loading a (possibly empty) new session never clears the list's spinner.
  const fetchConversationDetail = useCallback(async (sessionId, forceSelect = false) => {
    try {
      const response = await conversationsApi.getById(sessionId, {
        prompt_profile: persistedProfileId,
      });
      const data = response.data;
      const loaded = Array.isArray(data.messages) ? data.messages : [];
      setMessages(loaded);
      if (forceSelect || loaded.length > 0) {
        setSelectedConversation(sessionId);
      }
    } catch (error) {
      console.error('Error fetching conversation:', error);
      setMessages([]);
    }
  }, [persistedProfileId]);

  const fetchFrictionLabels = useCallback(async () => {
    try {
      const response = await statsApi.getFrictionLabels();
      const labels = response.data?.labels;
      setFrictionLabels(labels && typeof labels === 'object' ? labels : {});
    } catch (error) {
      // The history remains available even if the display catalog is briefly
      // unavailable; unknown codes use the generic Spanish fallback below.
      console.error('Error fetching friction labels:', error);
      setFrictionLabels({});
    }
  }, []);

  // The history is profile-scoped server-side; reload it whenever the active
  // profile changes so it always reflects the current profile's conversations.
  useEffect(() => {
    fetchConversations();
  }, [persistedProfileId, fetchConversations]);

  useEffect(() => {
    fetchFrictionLabels();
  }, [fetchFrictionLabels]);

  // Auto-load the active session's messages when activeSessionId changes
  useEffect(() => {
    if (activeSessionId) {
      fetchConversationDetail(activeSessionId);
    }
  }, [activeSessionId, fetchConversationDetail]);

  // Refetch when the tab/window regains focus so the list self-heals after the
  // backend finishes starting or after a transient network error.
  useEffect(() => {
    const onFocus = () => fetchConversations();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchConversations]);

  // Cancel any pending retry timer on unmount.
  useEffect(() => () => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
  }, []);

  // Expose refresh: reloads list + reloads the active/selected conversation detail
  useImperativeHandle(ref, () => ({
    refresh: async () => {
      await fetchConversations();
      const sessionToLoad = activeSessionId || selectedConversation;
      if (sessionToLoad) {
        await fetchConversationDetail(sessionToLoad, true);
      }
    }
  }));

  // When the user clicks a conversation: show its messages AND tell the parent
  // to redirect future messages to that session.
  const handleConversationClick = (conv) => {
    fetchConversationDetail(conv.session_id, true);
    if (onSelectConversation) {
      onSelectConversation(conv.session_id, conv);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return format(date, "d 'de' MMMM, HH:mm", { locale: es });
  };

  const getFrictionBadge = (friction, mode) => {
    if (mode === 'USER_DATA_QA') return null;
    if (!friction || friction === 'none') return null;

    const colors = {
      avoidance_loop: 'bg-[hsl(var(--warning-soft))] text-[hsl(var(--warning))]',
      rumination_loop: 'bg-primary/10 text-primary',
      low_energy: 'bg-[hsl(var(--info-soft))] text-[hsl(var(--info))]',
      reactivity: 'bg-[hsl(var(--destructive-soft))] text-destructive',
      unclear_goal: 'bg-secondary text-secondary-foreground',
      overload: 'bg-primary/10 text-primary',
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[friction] || 'bg-muted text-muted-foreground'}`}>
        {frictionLabels[friction] || 'Patrón detectado'}
      </span>
    );
  };

  if (loading && conversations.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center py-12 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        {connecting && (
          <p className="text-sm text-muted-foreground">Conectando con el mentor…</p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
        <MessageCircle className="mr-2 h-5 w-5 text-primary" />
        Historial de Conversaciones
        <button
          onClick={() => fetchConversations()}
          className="ml-auto p-1.5 text-muted-foreground hover:text-primary transition-colors"
          title="Actualizar historial"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de conversaciones */}
        <div className="space-y-2">
          {loadError && conversations.length === 0 ? (
            <div className="p-4 border border-dashed border-border rounded-lg text-sm text-muted-foreground space-y-2">
              <p>No se pudo cargar el historial.</p>
              <button
                onClick={() => fetchConversations()}
                className="inline-flex items-center gap-1.5 text-primary font-medium hover:opacity-70"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reintentar
              </button>
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-muted-foreground text-sm">No tienes conversaciones con este mentor todavía. Empieza una nueva conversación arriba.</p>
          ) : (
            conversations.map((conv) => {
              const isActive = conv.session_id === activeSessionId;
              const isSelected = conv.session_id === selectedConversation;
              return (
                <div
                  key={conv.session_id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    isActive
                      ? 'border-2 border-primary bg-primary/10'
                      : isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/40 bg-card'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="flex-1"
                      onClick={() => handleConversationClick(conv)}
                    >
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1 flex-wrap">
                        {isActive && (
                          <span className="px-2 py-0.5 text-xs font-semibold bg-primary text-primary-foreground rounded-full">
                            Activa · aquí irán tus mensajes
                          </span>
                        )}
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDate(conv.last_message_at)}
                      </div>
                      <p className="text-sm text-foreground line-clamp-2">
                        {conv.preview}
                      </p>
                      <div className="flex items-center mt-2 text-xs text-muted-foreground">
                        <span>{conv.message_count} mensajes</span>
                        {isSelected && !isActive && (
                          <span className="ml-2 text-primary font-medium">· Seleccionada</span>
                        )}
                        {isSelected && (
                          <ChevronRight className="ml-auto h-4 w-4 text-primary" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detalle de la conversación */}
        <div className="border rounded-lg bg-muted/50">
          {!selectedConversation ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <p>Selecciona una conversación para ver los detalles</p>
            </div>
          ) : (
            <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  <p>Esta conversación aún no tiene mensajes guardados</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`${
                      msg.role === 'user' ? 'text-right' : 'text-left'
                    }`}
                  >
                    <div
                      className={`inline-block max-w-[80%] p-3 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card text-foreground border'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      {msg.friction && (
                        <div className="mt-2">
                          {getFrictionBadge(msg.friction, msg.mode)}
                        </div>
                      )}
                      {msg.mode && (
                        <div className="mt-1 text-xs opacity-75">
                          Modo: {msg.mode}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDate(msg.timestamp)}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ConversationHistory.displayName = 'ConversationHistory';

export default ConversationHistory;
