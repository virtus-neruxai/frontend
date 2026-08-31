import { useState } from 'react';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { healthActivitiesApi } from '../../lib/api';
import { apiErrorMessage } from '../../lib/quotaError';
import { localDateKey } from '../../lib/healthRecords';
import { useFeatureQuota } from '../../presentation/viewmodels/useFeatureQuota';

const PLAN_UPGRADE_HINT = {
  free: 'Disponible en el plan Plus.',
  plus: 'Disponible en el plan Pro.',
};

/**
 * Describe a meal or a session in prose and let the model fill the form.
 *
 * Deliberately a *proposal*: nothing is saved here. What comes back lands in
 * the same fields the person would have typed, and saving still goes through
 * the ordinary create. That is what makes an approximate portion acceptable —
 * it is a starting point sitting in an editable input, not a record.
 *
 * `unresolved` is rendered verbatim under the box. A blank the model explains
 * is the designed outcome, not a failure: it tells the person exactly which
 * two fields need them, instead of hiding a guess among the real values.
 */
export default function AiCaptureBox({ surface, onApply, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const quota = useFeatureQuota('captura_ia');

  const blocked = !quota.available;
  const hint = quota.exhausted
    ? 'Has agotado los rellenados con IA de este ciclo.'
    : PLAN_UPGRADE_HINT[quota.plan] || 'No disponible en tu plan.';

  const send = async () => {
    const body = text.trim();
    if (!body || loading) return;
    setLoading(true);
    try {
      const { data } = await healthActivitiesApi.aiDraft({
        text: body,
        surface,
        local_date: localDateKey(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      const draft = data?.draft || null;
      if (!draft) {
        toast.error('No he podido interpretar el texto.');
        return;
      }
      setResult({
        unresolved: draft.unresolved || [],
        notes: draft.notes || [],
        degraded: data?.degraded || [],
        safetyMode: data?.safety_mode || 'normal',
      });
      onApply(draft);
      // The text has done its job and is not worth keeping around: it is not
      // persisted anywhere, and the fields it produced are now the record.
      setText('');
      quota.refresh();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'No se pudo rellenar el formulario con IA.'));
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          disabled={disabled || blocked || quota.loading}
          title={blocked ? hint : undefined}
          data-testid="ai-capture-open"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Rellenar con IA
        </Button>
        {blocked && !quota.loading && (
          <span className="text-xs text-muted-foreground">{hint}</span>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-3" data-testid="ai-capture-box">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {surface === 'nutrition'
            ? 'Cuenta qué comiste. Las cantidades que no digas las estimo, y las verás marcadas con ≈ para que las ajustes.'
            : 'Cuenta qué entrenaste. Lo que no digas lo estimo, y las verás marcadas con ≈ para que las ajustes.'}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          // Closing drops the text as well as the panel. It is never persisted
          // anywhere, and leaving a description of a meal sitting in memory
          // after the person backed out is not a convenience they asked for.
          onClick={() => { setOpen(false); setResult(null); setText(''); }}
        >
          Cerrar
        </Button>
      </div>

      <div className="flex gap-2">
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
          placeholder={surface === 'nutrition'
            ? 'Ej: desayuné dos tostadas con aguacate y un café con leche'
            : 'Ej: 4 series de press banca con 60 kilos a 8 repeticiones'}
          rows={3}
          maxLength={4000}
          aria-label={surface === 'nutrition' ? 'Describe la comida' : 'Describe el entrenamiento'}
          data-testid="ai-capture-input"
        />
        <Button
          type="button"
          size="icon"
          onClick={send}
          disabled={loading || !text.trim()}
          aria-label="Rellenar el formulario con lo escrito"
          data-testid="ai-capture-send"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>

      {result && (
        <div className="space-y-2 border-t pt-3" aria-live="polite" data-testid="ai-capture-result">
          {result.safetyMode === 'qualitative_only' && (
            <p className="text-xs text-muted-foreground">
              He anotado solo los alimentos, sin cantidades ni calorías. Si te apetece
              hablarlo, el Mentor de Salud está para eso.
            </p>
          )}
          {result.notes.map((note) => (
            <p key={note} className="text-xs text-muted-foreground">{note}</p>
          ))}
          {result.unresolved.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium">Lo que he dejado en blanco</p>
              <ul className="space-y-1">
                {result.unresolved.map((item) => (
                  <li key={`${item.field}-${item.reason}`} className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{item.field}</span>: {item.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.degraded.length > 0 && (
            <p className="text-xs text-muted-foreground">
              No pude consultar tu biblioteca, así que no he reutilizado nada de lo que
              ya tenías guardado.
            </p>
          )}
          {result.unresolved.length === 0 && result.notes.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Revisa las cantidades antes de guardar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
