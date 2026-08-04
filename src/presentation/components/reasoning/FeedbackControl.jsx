import { useState } from 'react';
import { Check, Pencil, ThumbsDown, Undo2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';

/**
 * NRRM F5 — the user's veto over anything the model proposed.
 *
 * Two design rules this component exists to enforce:
 *
 * 1. `targetText` is sent **verbatim**. The suppression key is derived from
 *    those exact words server-side, so paraphrasing here would key to a
 *    different claim and silently do nothing.
 * 2. Undo is always one click away and always visible once feedback exists.
 *    A judgement the user cannot take back is a trap, not a control.
 *
 * Deliberately quiet by default: these controls sit next to sentences about
 * someone's behaviour, and a loud "✗ REJECT" button invites reflexive
 * dismissal rather than a considered "this isn't me".
 */
export default function FeedbackControl({
  targetType,
  targetText = '',
  stage = '',
  evidenceIds = [],
  feedback,
  onSubmit,
  allowCorrection = false,
  rejectLabel = 'Esto no me representa',
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(feedback?.user_correction || '');
  const [busy, setBusy] = useState(false);

  const verdict = feedback?.verdict || null;

  const send = async (payload) => {
    setBusy(true);
    try {
      await onSubmit({ targetType, targetText, stage, evidenceIds, ...payload });
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  if (verdict === 'rejected') {
    return (
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        <span>Marcado como &laquo;no me representa&raquo;. No volverá a proponerse.</span>
        <button
          type="button"
          disabled={busy}
          onClick={() => send({ verdict: null, userCorrection: null })}
          className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground disabled:opacity-50"
        >
          <Undo2 size={11} /> Deshacer
        </button>
      </div>
    );
  }

  if (verdict === 'corrected' && !editing) {
    return (
      <div className="mt-1 space-y-1">
        <p className="rounded-md border-l-2 border-primary/50 bg-muted/40 px-2 py-1 text-xs">
          <span className="text-muted-foreground">Tus palabras: </span>
          {feedback.user_correction}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => { setDraft(feedback.user_correction || ''); setEditing(true); }}
            className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground"
          >
            <Pencil size={11} /> Editar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => send({ verdict: null, userCorrection: null })}
            className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground disabled:opacity-50"
          >
            <Undo2 size={11} /> Deshacer
          </button>
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="mt-2 space-y-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Dilo con tus palabras…"
          rows={2}
          className="text-sm"
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={busy || !draft.trim()}
            onClick={() => send({ verdict: 'corrected', userCorrection: draft.trim() })}
          >
            <Check className="mr-1 h-3.5 w-3.5" /> Guardar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <button
        type="button"
        disabled={busy}
        onClick={() => send({ verdict: 'rejected' })}
        className="inline-flex items-center gap-1 hover:text-foreground disabled:opacity-50"
      >
        <ThumbsDown size={11} /> {rejectLabel}
      </button>
      {allowCorrection && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          <Pencil size={11} /> Corregir
        </button>
      )}
    </div>
  );
}
