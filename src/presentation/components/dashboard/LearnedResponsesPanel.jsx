import { useState } from 'react';
import { ArrowRight, Check, Pause, Play, Plus, Sprout, Trash2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../components/ui/collapsible';
import { LearnedResponseApplicationDialog } from './LearnedResponseApplicationDialog';

/**
 * NRRM — conductas adoptadas (§13.2), hermano de fricciones y patrones
 * emocionales.
 *
 * La regla de diseño de §13.2 gobierna todo lo de aquí: **se cuentan
 * aplicaciones, nunca omisiones**. Sin rachas que se rompan, sin porcentajes de
 * cumplimiento y sin estados en rojo — un panel que puntúa la constancia
 * emocional se convierte en una superficie de vergüenza, que es justo el
 * mecanismo que la feature intenta desactivar.
 *
 * De ahí dos consecuencias visibles: un periodo sin aplicaciones se muestra
 * como «sin datos», nunca como retroceso; y el estado derivado
 * (`practicing`/`consolidating`) solo avanza, así que la insignia nunca baja.
 */

function Skeleton({ className }) {
  return <div className={`animate-pulse bg-muted rounded ${className}`} />;
}

// Ningún estado es negativo: la ausencia de aplicaciones no produce un estado
// de fracaso, porque no existe tal estado (§8.5).
const STATUS_CONFIG = {
  active: { label: 'Adoptada', className: 'text-[hsl(var(--info))] bg-[hsl(var(--info-soft))]' },
  practicing: { label: 'En práctica', className: 'text-[hsl(var(--success))] bg-[hsl(var(--success-soft))]' },
  consolidating: { label: 'Consolidando', className: 'text-[hsl(var(--success))] bg-[hsl(var(--success-soft))]' },
  integrated: { label: 'Integrada', className: 'text-muted-foreground bg-muted' },
  paused: { label: 'En pausa', className: 'text-muted-foreground bg-muted' },
  retired: { label: 'Retirada', className: 'text-muted-foreground bg-muted' },
  proposed: { label: 'Propuesta', className: 'text-muted-foreground bg-muted' },
};

const OUTCOME_LABELS = {
  better: 'Mejor que antes',
  same: 'Parecido',
  harder: 'Me costó',
};

// Estados que el usuario decide (§8.5). Los derivados no aparecen aquí porque
// no se pueden fijar a mano.
const USER_ACTIONS = {
  paused: { label: 'Pausar', Icon: Pause },
  integrated: { label: 'Ya es mía', Icon: Check },
  retired: { label: 'Retirar', Icon: Trash2 },
};

const RESUMABLE = new Set(['paused', 'integrated', 'retired']);

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status || '—', className: 'text-muted-foreground bg-muted' };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function formatDate(value) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

/**
 * Los únicos números del panel: cuántas veces, ante cuántos disparadores
 * distintos, y cuándo fue la última. Sin denominador — no hay «de cuántas
 * podrías», porque esa cifra no existe.
 */
function Aggregates({ behavior }) {
  const count = behavior.application_count || 0;
  if (count === 0) {
    return (
      <p className="mt-2 text-xs text-muted-foreground">
        Todavía no has registrado ninguna vez. Cuando pase, la anotas y ya.
      </p>
    );
  }
  const triggers = behavior.distinct_trigger_count || 0;
  const last = formatDate(behavior.last_applied_at);
  return (
    <p className="mt-2 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">
        {count === 1 ? '1 vez' : `${count} veces`}
      </span>
      {triggers > 1 && <> · en {triggers} situaciones distintas</>}
      {last && <> · la última, {last}</>}
    </p>
  );
}

function Timeline({ applications }) {
  if (applications.length === 0) return null;
  return (
    <Collapsible>
      <CollapsibleTrigger className="mt-2 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
        Ver cuándo
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="mt-2 space-y-1.5 border-l border-border pl-3">
          {applications.map((application) => (
            <li key={application.id} className="text-xs text-muted-foreground">
              <span className="text-foreground">{formatDate(application.applied_at)}</span>
              {application.trigger_note && <> · {application.trigger_note}</>}
              {application.outcome && OUTCOME_LABELS[application.outcome] && (
                <> · {OUTCOME_LABELS[application.outcome]}</>
              )}
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function LearnedResponsesPanel({
  data,
  loading,
  onRecordApplication,
  onSetStatus,
}) {
  const [dialogBehavior, setDialogBehavior] = useState(null);

  if (loading) {
    return (
      <div className="rounded-[8px] border bg-card p-5" data-testid="learned-responses-panel">
        <Skeleton className="h-5 w-48 mb-4" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  const behaviors = data?.behaviors || [];
  if (behaviors.length === 0) return null;
  const allApplications = data?.applications || [];

  return (
    <div className="rounded-[8px] border bg-card p-5" data-testid="learned-responses-panel">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <Sprout size={16} className="text-muted-foreground" /> Conductas que estás practicando
        </h3>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Respuestas que decidiste practicar en lugar de la reacción automática. Aquí solo se
        cuenta lo que haces, nunca lo que no.
      </p>

      <div className="divide-y divide-border">
        {behaviors.map((behavior) => {
          const applications = allApplications.filter(
            (application) => application.response_key === behavior.response_key
          );
          const canResume = RESUMABLE.has(behavior.status);
          return (
            <div key={behavior.response_key} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="min-w-0 text-sm font-medium">{behavior.alternative_response}</p>
                <StatusBadge status={behavior.status} />
              </div>

              {behavior.old_response?.value && (
                <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="line-through opacity-70">{behavior.old_response.value}</span>
                  <ArrowRight size={11} className="shrink-0" />
                  <span>{behavior.alternative_response}</span>
                </p>
              )}

              {(behavior.activation_signals || []).length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Se activa ante: {behavior.activation_signals.join(' · ')}
                </p>
              )}

              <Aggregates behavior={behavior} />
              <Timeline applications={applications} />

              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {/* Registrar sigue disponible en pausa: la aplicación es un
                    hecho que el usuario reporta, y guardarla no reanuda nada. */}
                <button
                  type="button"
                  onClick={() => setDialogBehavior(behavior)}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/40 px-2.5 py-1 text-xs text-primary transition-colors hover:bg-primary/10"
                >
                  <Plus size={11} /> Lo he hecho
                </button>

                {canResume ? (
                  <button
                    type="button"
                    onClick={() => onSetStatus?.(behavior.response_key, 'active')}
                    className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
                  >
                    <Play size={11} /> Retomar
                  </button>
                ) : (
                  Object.entries(USER_ACTIONS).map(([status, { label, Icon }]) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => onSetStatus?.(behavior.response_key, status)}
                      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
                    >
                      <Icon size={11} /> {label}
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Pausar o retirar no borra nada de lo que ya registraste.
      </p>

      <LearnedResponseApplicationDialog
        behavior={dialogBehavior}
        open={dialogBehavior !== null}
        onSave={onRecordApplication}
        onClose={() => setDialogBehavior(null)}
      />
    </div>
  );
}
