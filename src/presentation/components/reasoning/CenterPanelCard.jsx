import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Textarea } from '../../../components/ui/textarea';
import { centerApi } from '../../../lib/api';

const MAX_ANNOTATION_LENGTH = 2000;

/**
 * One of the six fixed panels of "Mi centro" (§6.6). Owns its own note draft,
 * annotation save, and regeneration job polling — a card that finishes
 * regenerating never touches its siblings' local edits, only the parent's
 * panel data via `onReloadCenter` (§6.8: "regenerar Integración no cambia
 * ninguna otra tarjeta").
 */
export default function CenterPanelCard({
  label,
  icon: Icon,
  panel,
  initialJobId = null,
  onAnnotationSaved,
  onReloadCenter,
}) {
  const [annotation, setAnnotation] = useState(panel.user_annotation || '');
  const [expanded, setExpanded] = useState(false);
  const [snippets, setSnippets] = useState({});
  const [loadingSnippets, setLoadingSnippets] = useState(false);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [jobId, setJobId] = useState(initialJobId);

  const dirty = annotation !== (panel.user_annotation || '');
  const regenerating = Boolean(jobId);

  // §6.7: an explicit write, never silent autosave. Returns the fresh
  // revision so a chained regenerate (§6.8) can use it without a re-fetch.
  const saveAnnotation = async () => {
    setSaving(true);
    try {
      const { data } = await centerApi.patchPanel(panel.key, {
        userAnnotation: annotation,
        expectedRevision: panel.revision,
      });
      onAnnotationSaved(data);
      return data.revision;
    } catch (e) {
      const status = e?.response?.status;
      if (status === 409) {
        toast.info('Este panel cambió en otra pestaña. Recargando la versión más reciente.');
        onReloadCenter();
      } else {
        toast.error('No se pudieron guardar las notas. Vuelve a intentarlo.');
      }
      return null;
    } finally {
      setSaving(false);
    }
  };

  const regenerate = async () => {
    if (starting || regenerating) return;
    setStarting(true);
    try {
      let expectedRevision = panel.revision;
      if (dirty) {
        const savedRevision = await saveAnnotation();
        if (savedRevision === null) return;
        expectedRevision = savedRevision;
      }
      const { data } = await centerApi.regeneratePanel(panel.key, expectedRevision);
      setJobId(data.job_id);
    } catch (e) {
      const status = e?.response?.status;
      if (status === 409) {
        toast.info('Este panel cambió en otra pestaña. Recargando la versión más reciente.');
        onReloadCenter();
      } else {
        toast.error('No se pudo regenerar este panel. Vuelve a intentarlo.');
      }
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    if (!jobId) return undefined;

    let disposed = false;
    const finish = () => {
      if (!disposed) setJobId(null);
    };
    const poll = async () => {
      try {
        const { data } = await centerApi.getCenterJob(jobId);
        if (disposed || data.status === 'queued' || data.status === 'running') return;

        finish();
        if (data.status === 'completed') {
          onReloadCenter();
        } else if (data.status === 'blocked') {
          toast.info(data.error || 'No se pudo regenerar este panel con prudencia. Se conserva la versión anterior.');
        } else if (data.status === 'stale') {
          toast.info('Este panel cambió mientras se regeneraba. Se conserva la versión más reciente.');
          onReloadCenter();
        } else {
          toast.error(data.error || 'No se pudo regenerar este panel. Vuelve a intentarlo.');
        }
      } catch (error) {
        if (error?.response?.status === 404) finish();
      }
    };

    poll();
    const intervalId = window.setInterval(poll, 2500);
    return () => {
      disposed = true;
      window.clearInterval(intervalId);
    };
  }, [jobId, onReloadCenter]);

  // §6.6 point 5: the count in the badge must be the same set the expanded
  // list shows — the panel's own citations, not data_quality.sample_size
  // (the whole 30-day window's total, identical across all six panels).
  const evidenceCount = (panel.evidence_refs || []).length;

  // §11.3: evidence_refs never carries source text, so a preview is resolved
  // live, only on demand (first expand), and never written back to the panel.
  const toggleExpanded = async () => {
    const next = !expanded;
    setExpanded(next);
    if (!next || evidenceCount === 0 || Object.keys(snippets).length > 0) return;

    setLoadingSnippets(true);
    try {
      const entries = await Promise.all(
        panel.evidence_refs.map((ref) =>
          centerApi.getEvidenceSnippet(ref.evidence_id)
            .then(({ data }) => [ref.evidence_id, data.snippet])
            .catch(() => [ref.evidence_id, null])
        )
      );
      setSnippets(Object.fromEntries(entries));
    } finally {
      setLoadingSnippets(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          {(panel.generated_at || '').slice(0, 10)}
        </p>

        {regenerating ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Regenerando…
          </p>
        ) : (
          <>
            <p className="text-sm">{panel.reading}</p>
            <p className="text-sm font-medium text-muted-foreground">{panel.reflection_question}</p>
          </>
        )}

        <div>
          <button
            type="button"
            onClick={toggleExpanded}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            {evidenceCount > 0 ? `Basado en ${evidenceCount} registro${evidenceCount === 1 ? '' : 's'}` : 'Ver procedencia'}
          </button>
          {expanded && (
            <ul className="mt-1 space-y-1 text-xs text-muted-foreground" aria-live="polite">
              {evidenceCount === 0 && <li>Sin referencias registradas.</li>}
              {(panel.evidence_refs || []).map((ref) => (
                <li key={ref.evidence_id}>
                  <span>{ref.source} · {(ref.occurred_at || '').slice(0, 10)}</span>
                  {loadingSnippets ? (
                    <span className="block italic">Cargando…</span>
                  ) : snippets[ref.evidence_id] ? (
                    <span className="block italic">«{snippets[ref.evidence_id]}»</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor={`center-note-${panel.key}`} className="text-xs font-medium text-muted-foreground">
            Correcciones y notas para Virtus
          </label>
          <Textarea
            id={`center-note-${panel.key}`}
            value={annotation}
            onChange={(e) => setAnnotation(e.target.value.slice(0, MAX_ANNOTATION_LENGTH))}
            rows={2}
            maxLength={MAX_ANNOTATION_LENGTH}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={saving || !dirty} onClick={saveAnnotation}>
            {saving && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />}
            Guardar notas
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={regenerating || saving || starting}
            aria-label={`Regenerar ${label}`}
            onClick={regenerate}
          >
            {(regenerating || starting)
              ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
              : <RefreshCw className="mr-1 h-3.5 w-3.5" />}
            Regenerar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
