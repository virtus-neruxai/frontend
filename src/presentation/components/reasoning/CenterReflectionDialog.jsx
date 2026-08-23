import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import EmotionPicker from '../../../components/EmotionPicker';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Textarea } from '../../../components/ui/textarea';
import { reflectionsApi } from '../../../lib/api';
import { formatMentorResponseText } from '../../../lib/mentorTextFormat';
import { apiErrorMessage } from '../../../lib/quotaError';
import { formatStatLabel } from '../../../lib/statUtils';

const DRAFT_ACTIONS = new Set([
  'SHOW_TASK_CONFIRMATION_MODAL',
  'SHOW_MISSION_CONFIRMATION_MODAL',
]);

export default function CenterReflectionDialog({
  open,
  panel,
  onOpenChange,
  onDraftReady,
}) {
  const [content, setContent] = useState('');
  const [emotion, setEmotion] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (open) return;
    setContent('');
    setEmotion(null);
    setSubmitting(false);
    setError(null);
    setResult(null);
  }, [open]);

  const setOpen = (nextOpen) => {
    if (!nextOpen && submitting) return;
    onOpenChange(nextOpen);
  };

  const submit = async () => {
    const trimmed = content.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        content: trimmed,
        ...(emotion ? { emotion_snapshot: emotion } : {}),
      };
      const { data } = await reflectionsApi.create(payload);
      setResult(data);
      toast.success('Reflexión guardada y analizada');
    } catch (requestError) {
      const message = apiErrorMessage(requestError, 'No se pudo guardar la reflexión. Vuelve a intentarlo.');
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const hasDraft = Boolean(
    result?.draft_id
      && result?.ui_action?.action
      && DRAFT_ACTIONS.has(result.ui_action.action)
  );
  const statChanges = Object.entries(result?.stat_changes || {}).filter(([, value]) => value !== 0);

  const openDraft = () => {
    if (!hasDraft) return;
    onOpenChange(false);
    onDraftReady(result);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Registrar reflexión · {panel?.label || 'Mi centro'}</DialogTitle>
          <DialogDescription className="whitespace-pre-wrap">
            {panel?.question}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4" data-testid="center-reflection-result">
            <div className="rounded-lg border border-primary/25 bg-primary/10 p-4">
              <p className="mb-2 text-sm font-semibold text-primary">Respuesta del Mentor:</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {formatMentorResponseText(result.ai_response || 'Gracias por tu reflexión.')}
              </p>
              {statChanges.length > 0 && (
                <div className="mt-3 border-t border-primary/20 pt-3">
                  <p className="mb-2 text-xs font-semibold text-primary">Cambios de Carácter:</p>
                  <div className="flex flex-wrap gap-2">
                    {statChanges.map(([stat, value]) => (
                      <Badge key={stat} variant="outline">
                        {formatStatLabel(stat)}: {value > 0 ? '+' : ''}{value}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {hasDraft && (
              <p className="text-sm text-muted-foreground">
                Tu Mentor ha preparado una propuesta a partir de esta reflexión.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Textarea
              data-testid="center-reflection-input"
              aria-label="Nueva reflexión"
              placeholder="Escribe tu reflexión…"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              disabled={submitting}
              rows={5}
            />
            <EmotionPicker value={emotion} onChange={setEmotion} disabled={submitting} />
            {error && (
              <p className="text-sm text-destructive" role="alert">{error}</p>
            )}
          </div>
        )}

        <DialogFooter>
          {result ? (
            <>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cerrar
              </Button>
              {hasDraft && (
                <Button type="button" onClick={openDraft}>Abrir propuesta</Button>
              )}
            </>
          ) : (
            <>
              <Button type="button" variant="outline" disabled={submitting} onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" disabled={!content.trim() || submitting} onClick={submit}>
                {submitting && <Loader2 className="mr-1 h-4 w-4 animate-spin motion-reduce:animate-none" />}
                {submitting ? 'Guardando…' : 'Analizar y guardar'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
