import { AlertTriangle, HelpCircle, ListChecks, ShieldAlert } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

// EvidenceTier → label + style, mirroring shared.models.health_guidance.EVIDENCE_LANGUAGE.
const EVIDENCE_TIER_STYLE = {
  general: { label: 'General', className: 'text-muted-foreground border-border' },
  isolated: { label: 'Puntual', className: 'text-muted-foreground border-border' },
  repeated: { label: 'Repetido', className: 'text-foreground border-input' },
  supported: { label: 'Respaldado', className: 'text-primary border-primary/40 bg-primary/5' },
  user_flagged: { label: 'Confirmado por ti', className: 'text-primary border-primary/40 bg-primary/10' },
};

function EvidenceBadge({ tier }) {
  const style = EVIDENCE_TIER_STYLE[tier] || EVIDENCE_TIER_STYLE.general;
  return <Badge variant="outline" className={style.className}>{style.label}</Badge>;
}

function StatBlock({ label, value }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xl font-semibold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>{value}</p>
      <p className="text-xs text-muted-foreground leading-snug">{label}</p>
    </div>
  );
}

/**
 * Schema 1 of `HealthReasonedReport`, kept verbatim.
 *
 * Reports are stored as the JSON they were generated as and are never
 * migrated: a migration would rewrite what a past report said, and a health
 * report is a record of a reading taken on a date. So the old renderer stays,
 * unchanged, for as long as an old report exists — which is forever.
 *
 * Nothing new should be added here. `HealthReportView` renders schema 2 and is
 * where the surface evolves.
 */
export default function HealthReportViewV1({ report }) {
  if (!report) return null;
  const {
    summary = '', observed = [], execution = {}, observations = [],
    open_questions: openQuestions = [], cautions = [], data_quality: dataQuality = {},
  } = report;

  return (
    <div className="space-y-4" data-testid="health-report-view-v1">
      {summary && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-foreground whitespace-pre-wrap">{summary}</p>
          </CardContent>
        </Card>
      )}

      {dataQuality.sparse_sample && (
        <div className="flex gap-3 rounded-lg border border-dashed border-border bg-muted/50 p-3 text-xs">
          <HelpCircle className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" aria-hidden="true" />
          <p className="text-muted-foreground leading-snug">
            Todavía hay poco registrado en esta ventana. Lo que sigue es una lectura
            preliminar, no un patrón confirmado.
          </p>
        </div>
      )}

      {observed.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="w-4 h-4" /> Lo registrado
          </CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm text-foreground list-disc list-inside">
              {observed.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Ejecución</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatBlock label="Tareas observadas" value={execution.tasks_observed ?? 0} />
          <StatBlock label="Tareas no observadas" value={execution.tasks_unobserved ?? 0} />
          <StatBlock label="Tareas programadas más adelante" value={execution.tasks_scheduled_ahead ?? 0} />
          <StatBlock label="Ocurrencias de rutina observadas" value={execution.routine_occurrences_observed ?? 0} />
          <StatBlock label="Ocurrencias de rutina esperadas" value={execution.routine_occurrences_expected ?? 0} />
          <StatBlock label="Ocurrencias de rutina no observadas" value={execution.routine_occurrences_unobserved ?? 0} />
          <StatBlock label="Registros de actividad" value={execution.activities_recorded ?? 0} />
          <StatBlock label="Registros enlazados a una tarea" value={execution.linked_activities ?? 0} />
        </CardContent>
      </Card>

      {observations.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Observaciones</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {observations.map((obs, i) => (
              <div key={i} className="rounded-lg border border-border p-3 space-y-1.5">
                <p className="text-sm text-foreground">{obs.claim}</p>
                <div className="flex items-center gap-2">
                  <EvidenceBadge tier={obs.evidence_tier} />
                  <span className="text-xs text-muted-foreground">
                    {(obs.activity_ids?.length || 0) + (obs.task_ids?.length || 0) + (obs.note_ids?.length || 0)} citas
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {openQuestions.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2">
            <HelpCircle className="w-4 h-4" /> Lo que falta por saber
          </CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm text-foreground list-disc list-inside">
              {openQuestions.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      {cautions.length > 0 && (
        <div className="rounded-lg border border-[hsl(var(--warning))] bg-[hsl(var(--warning-soft))] p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <ShieldAlert className="w-4 h-4 text-foreground" />
            <p className="text-sm font-semibold text-foreground">Precauciones</p>
          </div>
          <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
            {cautions.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Calidad del dato</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatBlock label="Ventana (días)" value={dataQuality.window_days ?? 0} />
            <StatBlock label="Días con algún registro" value={dataQuality.active_days ?? 0} />
            <StatBlock label="Actividades" value={dataQuality.activities ?? 0} />
            <StatBlock label="Notas" value={dataQuality.notes ?? 0} />
          </div>
          {dataQuality.degraded_sources?.length > 0 && (
            <div className="flex gap-3 rounded-lg border border-[hsl(var(--warning))] bg-[hsl(var(--warning-soft))] p-3 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-foreground" aria-hidden="true" />
              <p className="text-muted-foreground leading-snug">
                Alguna fuente no respondió al generar este informe — no es que estuviera
                vacía, es que no se pudo consultar. El informe se apoya solo en lo que sí
                respondió.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
