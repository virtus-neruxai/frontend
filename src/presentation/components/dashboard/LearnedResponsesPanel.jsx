import { ArrowRight, Sprout } from 'lucide-react';

/**
 * NRRM — conductas adoptadas (§13.2), hermano de fricciones y patrones
 * emocionales.
 *
 * Read-only por ahora: registrar aplicaciones y pausar/retirar llegan con
 * F7/F8. La regla de diseño que sí aplica desde el primer día es la de §13.2:
 * **se cuentan aplicaciones, nunca omisiones**. Sin rachas que se rompan, sin
 * porcentajes de cumplimiento y sin estados en rojo — un panel que puntúa la
 * constancia emocional se convierte en una superficie de vergüenza, que es
 * justo el mecanismo que la feature intenta desactivar.
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

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status || '—', className: 'text-muted-foreground bg-muted' };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

export function LearnedResponsesPanel({ data, loading }) {
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
        {behaviors.map((behavior) => (
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
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        El registro de aplicaciones y la revisión programada llegan pronto.
      </p>
    </div>
  );
}
