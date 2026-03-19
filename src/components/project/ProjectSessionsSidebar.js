import { useEffect, useState } from 'react';
import { projectApi } from '../../lib/api';
import { Plus, MessageSquare, CheckCircle2, Clock, Trash2 } from 'lucide-react';

const PHASE_LABELS = {
  INTAKE: 'Recogiendo info',
  REFINEMENT: 'Refinando',
  PLANNING: 'Planificando',
  REVIEW: 'Revisando',
  FINALIZE: 'Finalizando',
  CONFIRMED: 'Confirmado',
};

const PHASE_COLORS = {
  INTAKE: 'text-muted-foreground',
  REFINEMENT: 'text-blue-500',
  PLANNING: 'text-blue-500',
  REVIEW: 'text-yellow-500',
  FINALIZE: 'text-green-500',
  CONFIRMED: 'text-green-600',
};

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

export default function ProjectSessionsSidebar({
  currentSessionId,
  onSelectSession,
  onNewSession,
  onSessionDeleted,
}) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await projectApi.getSessions({ limit: 30 });
        setSessions(res.data || []);
      } catch {
        // silently ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentSessionId]);

  const handleDelete = async (e, sessionId) => {
    e.stopPropagation();
    if (!window.confirm('¿Eliminar esta conversación? Se borrará de todas las bases de datos.')) return;
    setDeletingId(sessionId);
    try {
      await projectApi.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
      if (sessionId === currentSessionId) {
        onSessionDeleted?.();
      }
    } catch {
      // silently ignore
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex w-56 shrink-0 flex-col rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-3 py-3">
        <span className="text-sm font-medium">Proyectos</span>
        <button
          onClick={onNewSession}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
          title="Nueva conversación"
        >
          <Plus className="h-3.5 w-3.5" />
          Nuevo
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {loading && (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">Cargando...</p>
        )}
        {!loading && sessions.length === 0 && (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">
            Sin conversaciones aún
          </p>
        )}
        {sessions.map((s) => {
          const isActive = s.session_id === currentSessionId;
          const isConfirmed = s.phase === 'CONFIRMED';
          const isDeleting = deletingId === s.session_id;
          return (
            <div
              key={s.session_id}
              className={`group relative flex items-start transition-colors hover:bg-accent ${
                isActive ? 'bg-accent' : ''
              }`}
            >
              <button
                onClick={() => onSelectSession(s.session_id)}
                disabled={isDeleting}
                className="flex min-w-0 flex-1 items-start gap-2 px-3 py-2.5 text-left"
              >
                {isConfirmed ? (
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
                ) : (
                  <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium leading-tight">
                    {s.title || 'Sin título'}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className={`text-[10px] ${PHASE_COLORS[s.phase] || 'text-muted-foreground'}`}>
                      {PHASE_LABELS[s.phase] || s.phase}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">·</span>
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/60">
                      <Clock className="h-2.5 w-2.5" />
                      {formatDate(s.updated_at)}
                    </span>
                  </div>
                </div>
              </button>

              {/* Delete button — visible on hover */}
              <button
                onClick={(e) => handleDelete(e, s.session_id)}
                disabled={isDeleting}
                className="mr-1 mt-2 hidden rounded p-1 text-muted-foreground/40 hover:bg-destructive/10 hover:text-destructive group-hover:flex"
                title="Eliminar conversación"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
