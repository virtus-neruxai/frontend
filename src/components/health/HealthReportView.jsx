import {
  AlertTriangle, Check, HelpCircle, Link2Off, ListChecks, Minus, Search,
  ShieldAlert, Sparkles, Target, TrendingDown, TrendingUp,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import HealthReportQuestions from './HealthReportQuestions';
import HealthCompanionCard from './HealthCompanionCard';
import HealthPracticeCandidates from './HealthPracticeCandidates';
import HealthReportViewV1 from './HealthReportViewV1';

// EvidenceTier → label + style, mirroring shared.models.health_guidance.EVIDENCE_LANGUAGE.
// Order matches the ladder (weakest → strongest); the badge never states a
// confidence the model didn't earn, since the tier itself is code-assigned.
const EVIDENCE_TIER_STYLE = {
  general: { label: 'General', className: 'text-muted-foreground border-border' },
  isolated: { label: 'Puntual', className: 'text-muted-foreground border-border' },
  repeated: { label: 'Repetido', className: 'text-foreground border-input' },
  supported: { label: 'Respaldado', className: 'text-primary border-primary/40 bg-primary/5' },
  user_flagged: { label: 'Confirmado por ti', className: 'text-primary border-primary/40 bg-primary/10' },
};

const DIMENSION_LABELS = {
  activity: 'Actividad',
  recovery: 'Recuperación',
  nutrition: 'Nutrición',
  composition: 'Composición',
  followup: 'Seguimiento',
};

const SIGNAL_LABELS = {
  activity: 'Ejercicio',
  nutrition: 'Nutrición',
  composition: 'Composición',
  followup: 'Tareas',
  sleep: 'Sueño',
  energy: 'Energía',
  stress: 'Estrés',
};

// The six-rung ladder from services/sample_quality.py, rendered as filled dots.
// `filled` is how much of the reading is standing on data — never a percentage,
// because a percentage needs a denominator and the only one available would be
// "days this person owed us a record".
const SAMPLE_STATUS = {
  no_data: { label: 'Sin datos', filled: 0 },
  isolated: { label: 'Un solo registro', filled: 1 },
  initial_signal: { label: 'Señal inicial', filled: 1 },
  trend_weak: { label: 'Datos escasos', filled: 2 },
  weekly_basic: { label: 'Datos suficientes', filled: 3 },
  monthly_reliable: { label: 'Datos amplios', filled: 4 },
};

const CAUTION_PRIORITY = {
  high: { label: 'Prioridad alta', order: 0 },
  review: { label: 'A revisar', order: 1 },
  pending: { label: 'Pendiente', order: 2 },
};

const AVAILABILITY = {
  available: { label: 'Disponible', mark: '✓', className: 'text-primary' },
  partial: { label: 'Parcial', mark: '~', className: 'text-muted-foreground' },
  absent: { label: 'Sin datos', mark: '✕', className: 'text-muted-foreground' },
};

const CLAIM_TYPE_LABEL = { fact: 'Hecho', relation: 'Relación observada' };
const SOURCE_TYPE_LABEL = {
  activity: 'actividad', task: 'tarea', note: 'nota', checkin: 'check-in corporal',
  practice_application: 'práctica realizada',
};

const TASK_KIND_LABEL = {
  activity: 'Actividad',
  followup: 'Seguimiento',
};

const ADHERENCE_STATE = {
  observed: 'Registrado',
  no_record: 'Sin ejecución registrada',
  scheduled_ahead: 'Aún no ha llegado',
};

function formatNumber(value, unit = '', digits = 0) {
  // An absent measurement renders as an em dash, never as 0. On this surface a
  // zero is a reading someone took, and the two must not look alike.
  if (value === null || value === undefined) return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  const rendered = new Intl.NumberFormat('es-ES', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(numeric);
  return unit ? `${rendered} ${unit}` : rendered;
}

function formatMinutes(seconds) {
  if (seconds === null || seconds === undefined) return '—';
  return `${Math.round(Number(seconds) / 60)} min`;
}

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

function SampleDots({ status }) {
  const { label, filled } = SAMPLE_STATUS[status] || SAMPLE_STATUS.no_data;
  return (
    <span className="flex items-center gap-1.5" title={label}>
      <span className="flex gap-0.5" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full ${i < filled ? 'bg-primary' : 'bg-muted-foreground/25'}`}
          />
        ))}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </span>
  );
}

function TrendArrow({ direction }) {
  if (direction === 'up') return <TrendingUp className="h-3.5 w-3.5" aria-label="sube" />;
  if (direction === 'down') return <TrendingDown className="h-3.5 w-3.5" aria-label="baja" />;
  if (direction === 'stable') return <Minus className="h-3.5 w-3.5" aria-label="estable" />;
  return <span className="text-xs text-muted-foreground">muestra insuficiente</span>;
}

function Section({ title, icon: Icon, children, testId }) {
  return (
    <Card data-testid={testId}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4" />} {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ClaimList({ items, testId }) {
  return (
    <div className="space-y-3" data-testid={testId}>
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border border-border p-3 space-y-1.5">
          <p className="text-sm text-foreground">{item.claim}</p>
          <div className="flex flex-wrap items-center gap-2">
            <EvidenceBadge tier={item.evidence_tier} />
            {CLAIM_TYPE_LABEL[item.claim_type] && (
              <Badge variant="outline" className="text-muted-foreground border-border">
                {CLAIM_TYPE_LABEL[item.claim_type]}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {(item.activity_ids?.length || 0) + (item.task_ids?.length || 0)
                + (item.note_ids?.length || 0) + (item.checkin_ids?.length || 0)
                + (item.practice_application_ids?.length || 0)} citas
            </span>
            {(item.source_types || []).length > 0 && (
              <span className="text-xs text-muted-foreground">
                Origen: {item.source_types.map((source) => SOURCE_TYPE_LABEL[source] || source).join(', ')}
              </span>
            )}
            {(item.dates || []).length > 0 && (
              <span className="text-xs text-muted-foreground">Fechas: {item.dates.join(', ')}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Renders `HealthReasonedReport` (reasoning-service/models/health_report.py)
 * field by field — there is no markdown renderer in this repo, and this
 * report has no markdown counterpart to fall back to.
 *
 * Schema 1 reports are handed to `HealthReportViewV1`: history is never
 * migrated, and an old report has to keep opening. The version check is on
 * `schema_version` rather than on which fields happen to be present, so a
 * partially-populated v2 report never falls back to the old renderer.
 *
 * Every figure and every `evidence_tier` comes from the code, not the model;
 * nothing here recomputes them, only displays what the response already
 * carries. No completion percentage is rendered because none exists in the
 * model — a denominator here would turn "no registrado" into a shortfall.
 */
export default function HealthReportView({ report, reportId = null }) {
  if (!report) return null;
  if (String(report.schema_version || '1') !== '2') {
    return <HealthReportViewV1 report={report} />;
  }

  const {
    main_reading: mainReading = '',
    dimension_readings: dimensionReadings = [],
    dimensions = [],
    coverage_matrix: coverage = { dates: [], rows: [] },
    goal = null,
    training_load: training = null,
    nutrition_load: nutrition = null,
    trends = [],
    comparison = null,
    execution = {},
    adherence = [],
    consistency = [],
    positive_signals: positiveSignals = [],
    practice_candidates: practiceCandidates = [],
    observations = [],
    hypotheses = [],
    cautions = [],
    information_gaps: gaps = [],
    next_best_action: nextAction = '',
    data_quality: dataQuality = {},
  } = report;

  const readingFor = (dimension) =>
    dimensionReadings.find((r) => r.dimension === dimension)?.reading;
  const trendsFor = (dimension) => trends.filter((t) => t.dimension === dimension);
  const adherenceOf = (kind) => adherence.filter((row) => (row.task_kind || null) === kind);
  const sortedCautions = [...cautions].sort(
    (a, b) => (CAUTION_PRIORITY[a.priority]?.order ?? 1) - (CAUTION_PRIORITY[b.priority]?.order ?? 1),
  );

  return (
    <div className="space-y-4" data-testid="health-report-view">
      {mainReading && (
        <div className="rounded-lg border border-border bg-muted/30 p-4" data-testid="health-report-main-reading">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Lectura del periodo</p>
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{mainReading}</p>
        </div>
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

      {dimensions.length > 0 && (
        <Section title="Estado por dimensión" testId="health-report-dimensions">
          <ul className="space-y-2">
            {dimensions.map((state) => (
              <li
                key={state.dimension}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2 last:border-0 last:pb-0"
                data-testid={`health-dimension-${state.dimension}`}
              >
                <span className="text-sm text-foreground">{DIMENSION_LABELS[state.dimension] || state.dimension}</span>
                <SampleDots status={state.sample_status} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {goal && (
        <Section title="Objetivo" icon={Target} testId="health-report-goal">
          <p className="text-sm text-foreground mb-3">{goal.statement}</p>
          <p className="text-xs text-muted-foreground mb-2">Indicadores disponibles</p>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {(goal.indicators || []).map((indicator) => {
              const state = AVAILABILITY[indicator.availability] || AVAILABILITY.absent;
              return (
                <li key={indicator.dimension} className="flex items-center gap-2 text-sm">
                  <span className={`w-4 text-center ${state.className}`} aria-hidden="true">{state.mark}</span>
                  <span className="text-foreground">{DIMENSION_LABELS[indicator.dimension] || indicator.dimension}</span>
                  <span className="text-xs text-muted-foreground">{state.label}</span>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {(training || readingFor('activity') || trendsFor('activity').length > 0) && (
        <Section title="Actividad y entrenamiento" testId="health-report-activity">
          {readingFor('activity') && <p className="text-sm text-foreground mb-3">{readingFor('activity')}</p>}
          {training && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
              <StatBlock label="Sesiones" value={training.sessions} />
              <StatBlock label="Duración total" value={formatMinutes(training.duration_seconds)} />
              <StatBlock label="Series" value={formatNumber(training.total_sets)} />
              <StatBlock label="Volumen de carga" value={formatNumber(training.load_volume_kg, 'kg')} />
              <StatBlock label="Distancia" value={formatNumber(training.distance_m, 'm')} />
              <StatBlock label="RPE medio" value={formatNumber(training.avg_perceived_exertion, '', 1)} />
              <StatBlock label="Sesiones con molestia" value={training.sessions_with_pain} />
              <StatBlock label="Sin detalle" value={training.untyped_sessions} />
            </div>
          )}
          {training?.untyped_sessions > 0 && (
            <p className="text-xs text-muted-foreground mb-3">
              {training.untyped_sessions} sesión(es) sin detalle estructurado: por eso
              algunos totales aparecen como «—» en lugar de una suma parcial.
            </p>
          )}
          <TrendList trends={trendsFor('activity')} />
          <AdherenceList rows={adherenceOf('activity')} />
        </Section>
      )}

      {(trendsFor('recovery').length > 0 || readingFor('recovery')) && (
        <Section title="Recuperación" testId="health-report-recovery">
          {readingFor('recovery') && <p className="text-sm text-foreground mb-3">{readingFor('recovery')}</p>}
          <TrendList trends={trendsFor('recovery')} />
        </Section>
      )}

      {(nutrition || readingFor('nutrition')) && (
        <Section title="Nutrición" testId="health-report-nutrition">
          {readingFor('nutrition') && <p className="text-sm text-foreground mb-3">{readingFor('nutrition')}</p>}
          {nutrition && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatBlock label="Comidas" value={nutrition.meals} />
              <StatBlock label="Días con comida" value={nutrition.days_with_meals} />
              <StatBlock label="Energía" value={formatNumber(nutrition.energy_kcal, 'kcal')} />
              <StatBlock label="Proteína" value={formatNumber(nutrition.protein_g, 'g')} />
              <StatBlock label="Carbohidratos" value={formatNumber(nutrition.carbs_g, 'g')} />
              <StatBlock label="Grasas" value={formatNumber(nutrition.fat_g, 'g')} />
              <StatBlock label="Fibra" value={formatNumber(nutrition.fiber_g, 'g')} />
            </div>
          )}
          {nutrition?.incomplete_meals > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              {nutrition.incomplete_meals} comida(s) sin total. Los macros del periodo
              aparecen como «—» en lugar de una suma parcial que mentiría por defecto.
            </p>
          )}
        </Section>
      )}

      {(trendsFor('composition').length > 0 || readingFor('composition')) && (
        <Section title="Composición corporal" testId="health-report-composition">
          {readingFor('composition') && <p className="text-sm text-foreground mb-3">{readingFor('composition')}</p>}
          <TrendList trends={trendsFor('composition')} />
        </Section>
      )}

      {comparison && comparison.rows?.length > 0 && (
        <Section title="Comparativa con el periodo anterior" testId="health-report-comparison">
          {!comparison.comparable && (
            <p className="text-xs text-muted-foreground mb-3">
              El periodo anterior no tiene cobertura suficiente para comparar. Se muestran
              ambas cifras, sin variación: un porcentaje sobre una base no observada diría
              más de lo que hay.
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th className="py-1 text-left font-normal">&nbsp;</th>
                  <th className="py-1 text-right font-normal">Este periodo</th>
                  <th className="py-1 text-right font-normal">Anterior</th>
                  <th className="py-1 pl-3 text-left font-normal">&nbsp;</th>
                </tr>
              </thead>
              <tbody>
                {comparison.rows.map((row) => (
                  <tr key={row.label} className="border-t border-border/60">
                    <td className="py-1.5 pr-3 text-foreground">{row.label}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatNumber(row.current, row.unit, 1)}</td>
                    <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                      {formatNumber(row.previous, row.unit, 1)}
                    </td>
                    <td className="py-1.5 pl-3">
                      {row.comparable ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <TrendArrow direction={row.direction} />
                          {row.change_pct !== null && row.change_pct !== undefined
                            && `${row.change_pct > 0 ? '+' : ''}${formatNumber(row.change_pct, '%', 1)}`}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">sin comparar</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {coverage.dates?.length > 0 && (
        <Section title="Matriz de cobertura" testId="health-report-coverage">
          <p className="text-xs text-muted-foreground mb-3">
            De un vistazo, qué se registró cada día. Los huecos son la respuesta a por qué
            hay preguntas que todavía no se pueden contestar.
          </p>
          <div className="overflow-x-auto">
            <table className="text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-card pr-3 text-left font-normal text-muted-foreground">&nbsp;</th>
                  {coverage.dates.map((date) => (
                    <th key={date} className="px-0.5 pb-1 font-normal text-muted-foreground">
                      {date.slice(8)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {coverage.rows.map((row) => (
                  <tr key={row.signal} data-testid={`health-coverage-${row.signal}`}>
                    <td className="sticky left-0 bg-card pr-3 py-0.5 text-foreground whitespace-nowrap">
                      {SIGNAL_LABELS[row.signal] || row.signal}
                    </td>
                    {row.days.map((present, i) => (
                      <td key={i} className="px-0.5 py-0.5 text-center">
                        <span
                          className={`inline-block h-2.5 w-2.5 rounded-full ${present ? 'bg-primary' : 'bg-muted-foreground/15'}`}
                          aria-label={present ? 'con registro' : 'sin registro'}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {observations.length > 0 && (
        <Section title="Observaciones" icon={ListChecks} testId="health-report-observations">
          <ClaimList items={observations} testId="health-report-observations-list" />
        </Section>
      )}

      {hypotheses.length > 0 && (
        <Section title="Qué merece observarse" icon={Search} testId="health-report-hypotheses">
          <div className="space-y-3">
            {hypotheses.map((hypothesis, i) => (
              <div key={i} className="rounded-lg border border-border p-3 space-y-1.5">
                <p className="text-sm text-foreground">{hypothesis.statement}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Qué lo confirmaría: </span>
                  {hypothesis.what_would_confirm}
                </p>
                <EvidenceBadge tier={hypothesis.evidence_tier} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {(sortedCautions.length > 0 || adherenceOf('followup').length > 0 || adherenceOf(null).length > 0) && (
        <Section title="Seguimientos de salud" icon={ShieldAlert} testId="health-report-followup">
          {sortedCautions.map((caution, i) => (
            <div key={i} className="mb-3 rounded-lg border border-[hsl(var(--warning))] bg-[hsl(var(--warning-soft))] p-3">
              <p className="text-xs font-semibold text-foreground mb-1">
                {CAUTION_PRIORITY[caution.priority]?.label || CAUTION_PRIORITY.review.label}
              </p>
              <p className="text-xs text-muted-foreground leading-snug">{caution.text}</p>
            </div>
          ))}
          <AdherenceList rows={adherenceOf('followup')} />
          <AdherenceList rows={adherenceOf(null)} unclassified />
        </Section>
      )}

      {consistency.length > 0 && (
        <Section title="Consistencia de datos" icon={Link2Off} testId="health-report-consistency">
          <p className="text-xs text-muted-foreground mb-3">
            Tareas marcadas como hechas sin un registro ese día. Son dos gestos distintos:
            marcar la tarea y escribir el registro.
          </p>
          <ul className="space-y-2">
            {consistency.map((finding, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2.5">
                <span className="text-sm text-foreground">
                  {finding.title} <span className="text-muted-foreground">· {finding.date}</span>
                </span>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/health-data?tab=training&date=${finding.date}`}>Registrar</a>
                </Button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {gaps.length > 0 && (
        <Section title="Qué aportaría más ahora" icon={HelpCircle} testId="health-report-gaps">
          <ol className="space-y-2">
            {gaps.map((gap, i) => (
              <li key={gap.dimension} className="flex gap-3">
                <span className="text-sm font-semibold text-muted-foreground tabular-nums">{i + 1}.</span>
                <div>
                  <p className="text-sm text-foreground">
                    {gap.what_to_record || DIMENSION_LABELS[gap.dimension] || gap.dimension}
                  </p>
                  {gap.effort && <p className="text-xs text-muted-foreground">{gap.effort}</p>}
                </div>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {positiveSignals.length > 0 && (
        <Section
          title="Lo que tu propia historia también demuestra"
          icon={Sparkles}
          testId="health-report-positive"
        >
          <ClaimList items={positiveSignals} testId="health-report-positive-list" />
        </Section>
      )}

      <HealthPracticeCandidates reportId={reportId} candidates={practiceCandidates} />

      <HealthCompanionCard reportId={reportId} report={report} />

      <Card>
        <CardHeader><CardTitle className="text-base">Calidad del dato</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatBlock label="Ventana (días)" value={dataQuality.window_days ?? 0} />
            <StatBlock label="Días con algún registro" value={dataQuality.active_days ?? 0} />
            <StatBlock label="Actividades" value={dataQuality.activities ?? 0} />
            <StatBlock label="Check-ins corporales" value={dataQuality.body_checkins ?? 0} />
            <StatBlock label="Notas" value={dataQuality.notes ?? 0} />
            <StatBlock label="Tareas de salud" value={dataQuality.health_tasks ?? 0} />
            <StatBlock label="Prácticas realizadas" value={dataQuality.practice_applications ?? 0} />
            <StatBlock label="Tareas con ejecución" value={execution.tasks_observed ?? 0} />
            <StatBlock label="Registros enlazados" value={execution.linked_activities ?? 0} />
          </div>
          {!dataQuality.previous_window_comparable && (
            <p className="text-xs text-muted-foreground">
              El periodo anterior no da para comparar todavía.
            </p>
          )}
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

      {nextAction && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-4" data-testid="health-report-next-action">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Siguiente mejor acción</p>
          <p className="text-sm text-foreground">{nextAction}</p>
          <HealthReportQuestions reportId={reportId} />
        </div>
      )}
    </div>
  );
}

function TrendList({ trends }) {
  if (!trends?.length) return null;
  return (
    <ul className="space-y-1.5" data-testid="health-report-trends">
      {trends.map((trend, i) => (
        <li key={i} className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-foreground">{trend.metric}</span>
          <span className="flex items-center gap-2 text-muted-foreground">
            <span className="tabular-nums">{formatNumber(trend.value, trend.unit, 1)}</span>
            <TrendArrow direction={trend.direction} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function AdherenceList({ rows, unclassified = false }) {
  if (!rows?.length) return null;
  return (
    <ul className="mt-3 space-y-2" data-testid={unclassified ? 'health-adherence-unclassified' : 'health-adherence'}>
      {unclassified && (
        <li className="text-xs text-muted-foreground">
          Sin clasificar como actividad o seguimiento.
        </li>
      )}
      {rows.map((row) => (
        <li key={row.task_id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-foreground">{row.title}</span>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            {row.kind === 'routine' && (
              <span className="tabular-nums">
                {row.occurrences_observed} de {row.occurrences_expected}
              </span>
            )}
            {row.state === 'observed' && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
            {ADHERENCE_STATE[row.state] || row.state}
            {TASK_KIND_LABEL[row.task_kind] && <Badge variant="secondary">{TASK_KIND_LABEL[row.task_kind]}</Badge>}
          </span>
        </li>
      ))}
    </ul>
  );
}
