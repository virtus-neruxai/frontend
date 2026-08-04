import { useState } from 'react';
import {
  Heart,
  Info,
  Loader2,
  MessageCircleHeart,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import FeedbackControl from './FeedbackControl';

/**
 * NRRM F4 — "Un mensaje para ti".
 *
 * Lives on the report screen (§13.1) but must never be mistaken for the
 * analytical block: same page, different voice. Hence the softer surface and
 * the explicit "esto es acompañamiento" framing — the user should always know
 * which of the two they are reading.
 *
 * Every psychological reading here is a hypothesis, and the UI says so rather
 * than letting confident prose imply otherwise.
 */

// §9 stage → heading. Emotional validation is a precondition, not a stage, so
// it is rendered above the sequence rather than inside it.
const STAGE_LABELS = {
  old_response: 'La respuesta que aparece',
  protective_function: 'De qué pudo protegerte',
  past_present_distinction: 'Qué era cierto entonces, qué es distinto ahora',
  personal_counterevidence: 'Lo que tus propios registros muestran',
  new_interpretation: 'Otra lectura posible',
  alternative_response: 'Una respuesta distinta que probar',
};

// Stages the user can correct in their own words. Both are formulations *about
// them*, so their wording should win over the model's.
const CORRECTABLE_STAGES = new Set(['old_response', 'past_present_distinction']);

const PRUDENCE_NOTE = {
  reduced_sparse:
    'Todavía no hay suficientes registros tuyos para anclar una reescritura, así que este mensaje se queda en acompañar.',
  reduced_sensitive:
    'He detectado señales sensibles en el periodo, así que este mensaje acompaña y contextualiza, sin reinterpretar nada.',
  containment:
    'Este mensaje solo acompaña. No es momento de interpretar causas ni de proponer conductas.',
};

function ConfidenceNote({ confidence }) {
  const pct = Math.round(Math.max(0, Math.min(1, confidence ?? 0)) * 100);
  const word = pct >= 60 ? 'bastante plausible' : pct >= 40 ? 'posible' : 'poco seguro';
  return (
    <span className="text-xs text-muted-foreground">
      Hipótesis · {word} ({pct}%)
    </span>
  );
}

export default function TransformativeCompanionCard({
  companion,
  loading,
  onGenerate,
  onAdopt,
  adopting,
  adopted,
  onConvertToTask,
  feedbackFor,
  onFeedback,
}) {
  const [showWhy, setShowWhy] = useState(false);

  if (!companion) {
    return (
      <Card className="border-dashed">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <MessageCircleHeart size={15} className="text-primary" /> Un mensaje para ti
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Una lectura personal de este informe, en segunda persona. Leerlo no te compromete
              a nada.
            </p>
          </div>
          <Button onClick={onGenerate} disabled={loading} className="shrink-0">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generar mensaje
          </Button>
        </div>
      </Card>
    );
  }

  const sections = companion.rewrite_sections || [];
  const practices = companion.generic_practices || [];
  const activity = companion.suggested_pleasant_activity;
  const proposal = companion.proposed_alternative_response;
  const prudenceNote = PRUDENCE_NOTE[companion.prudence_level];
  const isGeneric = companion.resource_mode === 'generic_fallback';

  return (
    <Card emphasis className="border-primary/30 bg-primary/[0.03]">
      <div className="space-y-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <MessageCircleHeart size={15} className="text-primary" /> Un mensaje para ti
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Acompañamiento, no análisis. Escrito a partir de este informe.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onGenerate} disabled={loading} className="shrink-0">
            {loading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1 h-3.5 w-3.5" />}
            Regenerar
          </Button>
        </div>

        {companion.emotional_validation && (
          <p className="border-l-2 border-primary/40 pl-3 text-[15px] leading-relaxed">
            {companion.emotional_validation}
          </p>
        )}

        {companion.message && (
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{companion.message}</p>
        )}

        {prudenceNote && (
          <p className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
            <ShieldCheck size={14} className="mt-0.5 shrink-0" /> {prudenceNote}
          </p>
        )}

        {sections.length > 0 && (
          <div className="space-y-4">
            {sections.map((section) => (
              <div key={section.stage}>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {STAGE_LABELS[section.stage] || section.stage}
                </h4>
                <p className="mt-1 text-sm leading-relaxed">{section.text}</p>
                {/* Provenance is explicit: nothing here is presented as fact. */}
                {section.provenance === 'model_hypothesis' && (
                  <div className="mt-1"><ConfidenceNote confidence={section.confidence} /></div>
                )}
                {onFeedback && (
                  <FeedbackControl
                    targetType="companion_section"
                    stage={section.stage}
                    feedback={feedbackFor?.(section.stage)}
                    onSubmit={onFeedback}
                    allowCorrection={CORRECTABLE_STAGES.has(section.stage)}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {practices.length > 0 && (
          <div className="rounded-md border border-dashed p-3">
            {/* §12.2: never presented as personal. The honesty is the point —
                there are no records yet showing what helps *this* user. */}
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info size={14} className="mt-0.5 shrink-0" />
              Todavía no tenemos registros tuyos que muestren qué te ayuda. Esto no sale de tu
              historia: son prácticas generales, por si te sirven de punto de partida.
            </p>
            <ul className="mt-2 space-y-1.5">
              {practices.map((practice) => (
                <li key={practice.practice_id} className="text-sm">— {practice.text}</li>
              ))}
            </ul>
          </div>
        )}

        {activity?.text && (
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-md border bg-background/60 p-3">
            <p className="min-w-0 text-sm">
              <Heart size={13} className="mr-1 inline text-primary" />
              {activity.text}
            </p>
            {onConvertToTask && (
              // Only ever on explicit request: nothing here becomes a task on
              // the system's own initiative.
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={() => onConvertToTask({ title: activity.text, rationale: '' })}
              >
                <PlusCircle className="mr-1 h-4 w-4" /> Convertir en tarea
              </Button>
            )}
          </div>
        )}

        {proposal && (
          <div className="rounded-md border bg-background/60 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Una respuesta distinta que puedes practicar
            </h4>
            <p className="mt-1 text-sm font-medium">{proposal}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {adopted ? (
                <span className="text-xs text-[hsl(var(--success))]">
                  Adoptada. La verás en tus conductas.
                </span>
              ) : (
                <Button size="sm" onClick={onAdopt} disabled={adopting || isGeneric}>
                  {adopting ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                  Adoptar esta respuesta
                </Button>
              )}
              <span className="text-xs text-muted-foreground">
                Adoptarla es solo comprometerte a practicarla. No confirma nada de lo que se dice
                aquí sobre ti.
              </span>
            </div>
          </div>
        )}

        {(companion.refusals || []).length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowWhy((s) => !s)}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              {showWhy ? 'Ocultar' : 'Qué he omitido a propósito'}
            </button>
            {showWhy && (
              <ul className="mt-2 space-y-1">
                {companion.refusals.map((refusal, i) => (
                  <li key={i} className="text-xs text-muted-foreground">— {refusal}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
