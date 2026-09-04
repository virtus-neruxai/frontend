import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Pencil, RotateCcw, Trash2, User } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { healthNotesApi } from '../../lib/api';
import { apiErrorMessage } from '../../lib/quotaError';
import { ACTIVITY_TYPE_LABELS } from './HealthActivityForm';

function formatWhen(iso) {
  if (!iso) return '';
  try {
    return format(new Date(iso), "d MMM, HH:mm", { locale: es });
  } catch {
    return iso;
  }
}

function NoteRow({ note, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(note.content);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const save = async () => {
    const trimmed = content.trim();
    if (!trimmed || trimmed === note.content) { setEditing(false); return; }
    const ok = await onUpdate(note.note_id, trimmed);
    if (ok) setEditing(false);
  };

  return (
    <Card data-testid={`health-note-row-${note.note_id}`}>
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {note.domain && (
              <Badge variant="secondary">{ACTIVITY_TYPE_LABELS[note.domain] || note.domain}</Badge>
            )}
            {note.author === 'user' && (
              <Badge variant="outline" className="gap-1"><User className="w-3 h-3" /> Editada por ti</Badge>
            )}
            <span className="text-xs text-muted-foreground">{formatWhen(note.updated_at || note.created_at)}</span>
          </div>
          {!editing && (
            <div className="flex gap-1 shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setEditing(true)}
                data-testid={`health-note-edit-${note.note_id}`}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className={`h-8 w-8 ${deleteConfirm ? 'text-destructive' : ''}`}
                onClick={() => {
                  if (!deleteConfirm) { setDeleteConfirm(true); return; }
                  onDelete(note.note_id);
                }}
                onBlur={() => setDeleteConfirm(false)}
                title={deleteConfirm ? '¿Confirmar eliminación?' : 'Eliminar'}
                data-testid={`health-note-delete-${note.note_id}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>

        {editing ? (
          <div className="space-y-2">
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => { setContent(note.content); setEditing(false); }}>
                Cancelar
              </Button>
              <Button size="sm" onClick={save}>Guardar</Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * What the Mentor de Salud has retained from conversation — never the
 * transcript, only the short notes the classifier extracted (see
 * agent-service/services/health_note_classifier.py). Editable, removable, and
 * shown regardless of the recall consent set in Ajustes — that toggle only
 * governs whether these are *recovered* in a future conversation, it does not
 * hide from the person what was written about them, so it does not live here
 * too.
 */
export default function HealthNotesPanel() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await healthNotesApi.getAll();
      setNotes(data?.notes || []);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'No se pudieron cargar tus notas de salud.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const updateNote = async (noteId, content) => {
    try {
      const { data } = await healthNotesApi.update(noteId, content);
      setNotes((prev) => prev.map((n) => (n.note_id === noteId ? data : n)));
      return true;
    } catch (e) {
      toast.error(apiErrorMessage(e, 'No se pudo actualizar la nota.'));
      return false;
    }
  };

  const deleteNote = async (noteId) => {
    try {
      await healthNotesApi.remove(noteId);
      setNotes((prev) => prev.filter((n) => n.note_id !== noteId));
    } catch (e) {
      toast.error(apiErrorMessage(e, 'No se pudo eliminar la nota.'));
    }
  };

  // Unlike a single deletion, this clears everything at once — the memory-side
  // twin of "Reiniciar contexto" on the conversation. Each note still goes
  // through its own delete, so each is also purged from
  // virtus_health_rag_index, not just tombstoned locally.
  const resetNotes = async () => {
    if (!resetConfirm) { setResetConfirm(true); return; }
    setResetting(true);
    try {
      const { data } = await healthNotesApi.resetAll();
      setNotes([]);
      toast.success(
        data?.deleted
          ? `${data.deleted} nota${data.deleted === 1 ? '' : 's'} eliminada${data.deleted === 1 ? '' : 's'}, también del índice.`
          : 'No había notas que eliminar.'
      );
    } catch (e) {
      toast.error(apiErrorMessage(e, 'No se pudieron reiniciar las notas.'));
    } finally {
      setResetting(false);
      setResetConfirm(false);
    }
  };

  return (
    <div className="space-y-4" data-testid="health-notes-panel">
      {notes.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className={`text-xs ${resetConfirm ? 'text-destructive' : ''}`}
            onClick={resetNotes}
            onBlur={() => setResetConfirm(false)}
            disabled={resetting}
            title="Elimina todas tus notas de salud, también del índice de búsqueda"
            data-testid="health-notes-reset"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            {resetting ? 'Reiniciando...' : resetConfirm ? '¿Confirmar? Se borran todas' : 'Reiniciar notas'}
          </Button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando tus notas...</p>
      ) : notes.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-sm text-muted-foreground">
          Todavía no hay notas. Aparecen cuando le cuentas algo relevante al Mentor de Salud
          (un objetivo, una restricción, una lesión).
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <NoteRow key={note.note_id} note={note} onUpdate={updateNote} onDelete={deleteNote} />
          ))}
        </div>
      )}
    </div>
  );
}
