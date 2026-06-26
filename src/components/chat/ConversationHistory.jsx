import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MessageCircle, Trash2, ChevronRight, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { conversationsApi } from '../../lib/api';

const ConversationHistory = forwardRef(({ activeSessionId }, ref) => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, []);

  // Auto-load the active session's messages when it appears in the list
  useEffect(() => {
    if (activeSessionId) {
      fetchConversationDetail(activeSessionId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId]);

  // Expose refresh: reloads list + reloads the active/selected conversation detail
  useImperativeHandle(ref, () => ({
    refresh: async () => {
      await fetchConversations();
      const sessionToLoad = activeSessionId || selectedConversation;
      if (sessionToLoad) {
        await fetchConversationDetail(sessionToLoad);
      }
    }
  }));

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await conversationsApi.getAll();
      const data = response.data;
      setConversations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Error al cargar el historial');
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchConversationDetail = async (sessionId) => {
    try {
      setLoading(true);
      const response = await conversationsApi.getById(sessionId);
      const data = response.data;
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      setSelectedConversation(sessionId);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      toast.error('Error al cargar la conversación');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (sessionId) => {
    if (!window.confirm('¿Seguro que quieres eliminar esta conversación?')) {
      return;
    }

    try {
      await conversationsApi.delete(sessionId);
      toast.success('Conversación eliminada');
      fetchConversations();
      if (selectedConversation === sessionId) {
        setSelectedConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Error al eliminar la conversación');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return format(date, "d 'de' MMMM, HH:mm", { locale: es });
  };

  const getFrictionBadge = (friction) => {
    if (!friction || friction === 'none') return null;

    const colors = {
      avoidance_loop: 'bg-[hsl(var(--warning-soft))] text-[hsl(var(--warning))]',
      rumination_loop: 'bg-primary/10 text-primary',
      low_energy: 'bg-[hsl(var(--info-soft))] text-[hsl(var(--info))]',
      reactivity: 'bg-[hsl(var(--destructive-soft))] text-destructive',
      unclear_goal: 'bg-secondary text-secondary-foreground',
      overload: 'bg-primary/10 text-primary',
    };

    const labels = {
      avoidance_loop: 'Evitación',
      rumination_loop: 'Rumiación',
      low_energy: 'Baja energía',
      reactivity: 'Reactividad',
      unclear_goal: 'Meta poco clara',
      overload: 'Sobrecarga',
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[friction] || 'bg-muted text-muted-foreground'}`}>
        {labels[friction] || friction}
      </span>
    );
  };

  if (loading && conversations.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
        <MessageCircle className="mr-2 h-5 w-5 text-primary" />
        Historial de Conversaciones
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de conversaciones */}
        <div className="space-y-2">
          {conversations.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay conversaciones guardadas</p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.session_id}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  conv.session_id === activeSessionId
                    ? 'border-2 border-primary bg-primary/10'
                    : selectedConversation === conv.session_id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/40 bg-card'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div
                    className="flex-1"
                    onClick={() => fetchConversationDetail(conv.session_id)}
                  >
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      {conv.session_id === activeSessionId && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                          Activo
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
                      {selectedConversation === conv.session_id && (
                        <ChevronRight className="ml-auto h-4 w-4 text-primary" />
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.session_id);
                    }}
                    className="ml-2 p-1 text-muted-foreground hover:text-destructive transition-colors"
                    title="Eliminar conversación"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
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
              {messages.map((msg, idx) => (
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
                        {getFrictionBadge(msg.friction)}
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ConversationHistory.displayName = 'ConversationHistory';

export default ConversationHistory;
