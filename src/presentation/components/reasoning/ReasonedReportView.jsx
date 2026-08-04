import {
  Activity,
  AlertTriangle,
  ArrowRightCircle,
  BarChart3,
  BookOpen,
  CheckSquare,
  ChevronDown,
  EyeOff,
  Flag,
  Gauge,
  GitBranch,
  HeartPulse,
  ListChecks,
  MessageSquare,
  PlusCircle,
  Quote,
  Repeat,
  RotateCcw,
  Scale,
  Sparkles,
  Sprout,
  Target,
  ThumbsDown,
  TrendingDown,
  TrendingUp,
  Timer,
  Undo2,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../components/ui/collapsible';
import { useState } from 'react';
import FeedbackControl from './FeedbackControl';

// Objective figures (percentages, counts, "×3", plain numbers) are the data the
// reader scans for first — bold them so they pop out of the surrounding prose
// without altering the sentence. One capture group ⇒ split() alternates
// text/number, so odd indices are the matches.
const NUMBER_RE = /(\d+(?:[.,]\d+)?\s?%|×\s?\d+|\d+(?:[.,]\d+)?)/g;

function highlightNumbers(text) {
  if (!text || typeof text !== 'string') return text;
  return text.split(NUMBER_RE).map((part, i) =>
    i % 2 === 1
      ? <strong key={i} className="font-semibold text-foreground">{part}</strong>
      : <span key={i}>{part}</span>,
  );
}

// Evidence ids belong in evidence_ids, not in the sentences a person reads. The
// reasoner used to inline them ("…, respaldado por routine_reflection:0e30…");
// report_agent now strips them at generation, but reports already stored still
// carry them, so clean them here too rather than showing raw uuids in history.
const EVIDENCE_ID_SOURCE =
  '(?:task|task_reflection|routine_reflection|journal_reflection|mission_reflection|' +
  'mentor_conversation|chat_interaction|conversation|reflection|friction)' +
  '\\s*:\\s*[^\\s,;)\\]]+(?:\\s+\\d{2}:\\d{2}:\\d{2}[^\\s,;)\\]]*)?';
const EVIDENCE_ID_TEST = new RegExp(EVIDENCE_ID_SOURCE, 'i');
const EVIDENCE_ID_ALL = new RegExp(EVIDENCE_ID_SOURCE, 'gi');
const BRACKETED_ID_ALL = new RegExp(`\\s*[(\\[][^)\\]]*${EVIDENCE_ID_SOURCE}[^)\\]]*[)\\]]`, 'gi');
const CLAUSE_SPLIT_RE = /(?<=[,;])\s+/;

export function stripEvidenceIds(text) {
  if (typeof text !== 'string' || !text.trim()) return text;
  // A parenthetical citation is dropped whole; a clause that existed only to
  // cite ids is dropped too, so we never leave "…, respaldado por , y .".
  let cleaned = text.replace(BRACKETED_ID_ALL, '');
  if (EVIDENCE_ID_TEST.test(cleaned)) {
    const kept = cleaned.split(CLAUSE_SPLIT_RE).filter((c) => !EVIDENCE_ID_TEST.test(c));
    cleaned = kept.length ? kept.join(' ') : cleaned.replace(EVIDENCE_ID_ALL, '');
  }
  cleaned = cleaned.replace(/\s+([,.;:])/g, '$1').replace(/[ \t]{2,}/g, ' ').trim();
  cleaned = cleaned.replace(/[,;:]+$/, '.');
  if (cleaned && !'.!?'.includes(cleaned.slice(-1))) cleaned += '.';
  return cleaned;
}

// Every user-facing string goes through this: ids out, figures emphasized.
function prose(text) {
  return highlightNumbers(stripEvidenceIds(text));
}

// Evidence source_types → human label + icon, mirroring the dashboard panels.
const SOURCE_LABELS = {
  mentor_conversation: { label: 'Mentor', Icon: MessageSquare },
  chat_interaction:    { label: 'Chat', Icon: MessageSquare },
  task:                { label: 'Tarea', Icon: CheckSquare },
  task_reflection:     { label: 'Reflexión de tarea', Icon: CheckSquare },
  routine_reflection:  { label: 'Rutina', Icon: RotateCcw },
  journal_reflection:  { label: 'Diario', Icon: BookOpen },
  mission_reflection:  { label: 'Misión', Icon: Target },
};

// Friction key → human label, mirroring backend/services/friction_labels.py
// plus the agent-service PrimaryFriction taxonomy. Unknown keys de-slug.
const FRICTION_LABELS = {
  avoidance_loop: 'Evitación inicial',
  rumination_loop: 'Rumiación recurrente',
  low_energy: 'Energía baja',
  reactivity: 'Reactividad',
  unclear_goal: 'Meta poco clara',
  overload: 'Saturación',
  dopamine_escape: 'Escape a estímulos',
  loneliness: 'Soledad',
  value_conflict: 'Conflicto de valores',
};

function frictionLabel(key) {
  if (FRICTION_LABELS[key]) return FRICTION_LABELS[key];
  const spaced = String(key || '').replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// body_checkins derived signal → human label, mirroring
// agent-service/tools/body_checkins/qa.py::_SIGNAL_LABELS.
const BODY_SIGNAL_LABELS = {
  low_sleep: 'Sueño bajo',
  poor_sleep_quality: 'Sueño de mala calidad',
  low_energy: 'Energía baja',
  high_stress: 'Estrés alto',
  high_fatigue: 'Fatiga alta',
  exercise_recorded: 'Ejercicio registrado',
  no_exercise_recorded: 'Sin ejercicio',
};

function bodySignalLabel(key) {
  if (BODY_SIGNAL_LABELS[key]) return BODY_SIGNAL_LABELS[key];
  const spaced = String(key || '').replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

const BODY_TREND_CONFIG = {
  up: { label: 'Al alza', Icon: TrendingUp, className: 'text-[hsl(var(--warning))] bg-[hsl(var(--warning-soft))]' },
  down: { label: 'A la baja', Icon: TrendingDown, className: 'text-[hsl(var(--info))] bg-[hsl(var(--info-soft))]' },
  stable: { label: 'Estable', className: 'text-muted-foreground bg-muted' },
};

const BODY_TREND_METRIC_LABELS = { energy: 'Energía', stress: 'Estrés', sleep: 'Sueño' };

const PATTERN_STATUS_CONFIG = {
  active:          { label: 'Activo', className: 'text-destructive bg-destructive/10' },
  weak_signal:     { label: 'Señal inicial', className: 'text-[hsl(var(--info))] bg-[hsl(var(--info-soft))]' },
  signal:          { label: 'Señal inicial', className: 'text-[hsl(var(--info))] bg-[hsl(var(--info-soft))]' },
  improving:       { label: 'Mejorando', className: 'text-[hsl(var(--success))] bg-[hsl(var(--success-soft))]' },
  resolved_signal: { label: 'Estable', className: 'text-[hsl(var(--info))] bg-[hsl(var(--info-soft))]' },
  relapse_signal:  { label: 'Reaparece', className: 'text-[hsl(var(--virtus-secondary))] bg-secondary' },
};

function Chip({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

// A stat tile: big value on top, muted caption below — the "panel" number look.
const STAT_TONE = {
  primary: 'text-primary',
  success: 'text-[hsl(var(--success))]',
  destructive: 'text-destructive',
};

function Stat({ value, label, tone }) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2 text-center">
      <div className={`text-base font-semibold leading-none tabular-nums ${STAT_TONE[tone] || ''}`}>{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

// Deterministic, code-computed KPIs (report.metrics) — task counts straight
// from get_task_stats and friction frequency over the period. Rendered as
// tiles/chips so the objective figures read at a glance. Absent on reports
// generated before the metrics block existed → the whole panel is skipped.
function MetricsPanel({ metrics }) {
  const tasks = metrics?.tasks || {};
  const frictions = metrics?.top_frictions || [];
  const hasTasks = tasks.total != null && tasks.total > 0;
  if (!hasTasks && frictions.length === 0) return null;

  const overdue = tasks.overdue || 0;
  const tiles = hasTasks ? [
    { label: 'Tasa de completado', value: `${tasks.completion_rate ?? 0}%`, tone: 'primary' },
    { label: 'Completadas', value: tasks.completed ?? 0, tone: 'success' },
    { label: 'En progreso', value: tasks.in_progress ?? 0 },
    { label: 'Pendientes', value: tasks.todo ?? 0 },
    { label: 'Vencidas', value: overdue, tone: overdue > 0 ? 'destructive' : undefined },
    { label: 'Total', value: tasks.total ?? 0 },
  ] : [];

  return (
    <Panel title="Métricas del periodo" icon={BarChart3}>
      {hasTasks && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {tiles.map((t) => <Stat key={t.label} value={t.value} label={t.label} tone={t.tone} />)}
        </div>
      )}
      {frictions.length > 0 && (
        <div className={hasTasks ? 'mt-4' : ''}>
          <div className="mb-2 text-xs font-medium text-muted-foreground">Fricciones más frecuentes</div>
          <div className="flex flex-wrap gap-1.5">
            {frictions.map((f) => (
              <Chip key={f.friction} className="bg-muted/60">
                {frictionLabel(f.friction)} <span className="opacity-60">×{f.count}</span>
              </Chip>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}

// Deterministic, code-computed body_checkins aggregates (report.body_signals)
// — same never-LLM-authored contract as MetricsPanel above. Only rendered
// when there's at least one check-in in the window.
function BodyPanel({ body }) {
  if (!body || body.sample_size <= 0) return null;

  const stats = [
    body.avg_sleep_hours != null && { value: `${body.avg_sleep_hours}h`, label: 'Sueño medio' },
    body.avg_energy != null && { value: `${body.avg_energy}/5`, label: 'Energía media' },
    body.avg_stress != null && { value: `${body.avg_stress}/5`, label: 'Estrés medio' },
    body.avg_fatigue != null && { value: `${body.avg_fatigue}/5`, label: 'Fatiga media' },
    { value: body.sample_size, label: 'Muestra' },
    body.window_days > 0 && { value: `${body.window_days} días`, label: 'Ventana' },
  ].filter(Boolean);

  const topSignals = body.top_signals || [];
  const trends = Object.entries(body.trends || {}).filter(([, value]) => value && value !== 'insufficient');

  return (
    <Panel title="Lectura corporal" icon={Activity}>
      {stats.length > 0 && (
        <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {stats.map((s) => <Stat key={s.label} value={s.value} label={s.label} />)}
        </div>
      )}
      {body.exercise_days > 0 && (
        <p className="mb-3 text-xs text-muted-foreground">
          Días con ejercicio registrado: <strong className="text-foreground">{body.exercise_days}</strong>
        </p>
      )}
      {topSignals.length > 0 && (
        <div className="mb-3">
          <span className="text-xs text-muted-foreground">Señales que más se repiten: </span>
          <span className="inline-flex flex-wrap gap-1.5 align-middle">
            {topSignals.map((s) => (
              <Chip key={s.signal} className="bg-muted/60">
                {bodySignalLabel(s.signal)} <span className="opacity-60">×{s.count}</span>
              </Chip>
            ))}
          </span>
        </div>
      )}
      {trends.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {trends.map(([metric, direction]) => {
            const cfg = BODY_TREND_CONFIG[direction] || BODY_TREND_CONFIG.stable;
            const { Icon: TrendIcon } = cfg;
            return (
              <Chip key={metric} className={cfg.className}>
                {TrendIcon && <TrendIcon size={11} />} {BODY_TREND_METRIC_LABELS[metric] || metric}: {cfg.label}
              </Chip>
            );
          })}
        </div>
      )}
      {body.sample_status === 'isolated' && (
        <p className="mt-3 text-xs text-muted-foreground">
          Solo hay un registro corporal: es un dato aislado, no una tendencia.
        </p>
      )}
    </Panel>
  );
}

function Panel({ title, icon: Icon, tone, action, children, className = '' }) {
  const isWarning = tone === 'warning';
  return (
    <Card className={`${isWarning ? 'border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning-soft))]' : ''} ${className}`}>
      <div className="flex items-center justify-between gap-2 px-5 pb-2 pt-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          {Icon && <Icon size={15} className={isWarning ? 'text-[hsl(var(--warning))]' : 'text-muted-foreground'} />}
          {title}
        </h3>
        {action}
      </div>
      <div className="px-5 pb-4">{children}</div>
    </Card>
  );
}

// Bulleted list where each item can carry highlighted numbers. `render` lets a
// caller override how each item is drawn (used for prose vs. plain labels).
function FactList({ items, render = prose, muted = false }) {
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2 text-sm">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
          <span className={muted ? 'text-muted-foreground' : ''}>{render(it)}</span>
        </li>
      ))}
    </ul>
  );
}

function ConfidenceBar({ value }) {
  const pct = Math.round(Math.max(0, Math.min(1, value ?? 0)) * 100);
  const word = pct >= 60 ? 'Alta' : pct >= 40 ? 'Media' : 'Baja';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{word} · {pct}%</span>
    </div>
  );
}

function CollapsibleSection({ title, icon: Icon, children }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex w-full items-center justify-between px-5 py-4 text-sm font-semibold">
            <span className="flex items-center gap-2">
              {Icon && <Icon size={15} className="text-muted-foreground" />}
              {title}
            </span>
            <ChevronDown size={15} className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 px-5 pb-5">{children}</CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// NRRM F0 — code-computed sample size/coverage. Naming what the reading is
// based on is part of the reading: a confident sentence over three events in
// one day should not look like a confident sentence over a full fortnight.
function DataQualityPanel({ dataQuality }) {
  if (!dataQuality) return null;
  const degraded = dataQuality.degraded_sources || [];
  const sparse = dataQuality.mode === 'sparse_sample';

  return (
    <Panel title="Calidad de la muestra" icon={Gauge} tone={sparse ? 'warning' : undefined}>
      <div className="grid grid-cols-3 gap-2">
        <Stat value={dataQuality.sample_size ?? 0} label="Eventos analizados" />
        <Stat value={dataQuality.coverage_days ?? 0} label="Días con actividad" />
        <Stat value={dataQuality.positive_sample_size ?? 0} label="Recursos positivos" />
      </div>
      {sparse && (
        <p className="mt-3 text-xs text-muted-foreground">
          Muestra escasa: esta lectura describe hechos puntuales y evita afirmar que sean
          recurrentes.
        </p>
      )}
      {degraded.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Fuentes con datos incompletos:{' '}
          {degraded.map((d) => `${d.source} (${d.reason === 'failed' ? 'no disponible' : 'truncada'})`).join(', ')}.
        </p>
      )}
    </Panel>
  );
}

// NRRM F3 — "Lo que tu propia historia también demuestra": counterevidence
// drawn from the user's own records. Every claim here is anchored in real
// resource_ids; the panel exists so it reads as evidence, not encouragement.
function PositiveEvidencePanel({ items, feedbackFor, onFeedback, onResourceFeedback }) {
  if (!items?.length) return null;
  return (
    <Panel title="Lo que tu propia historia también demuestra" icon={Sprout}>
      <div className="divide-y divide-border">
        {items.map((item, i) => (
          <div key={i} className="py-3 first:pt-0 last:pb-0">
            <p className="text-sm">{prose(item.claim)}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {(item.dates || []).map((d) => (
                <Chip key={d} className="bg-muted text-muted-foreground">{d}</Chip>
              ))}
              {(item.source_types || []).map((s) => (
                <Chip key={s} className="border text-muted-foreground">{resourceTypeLabel(s)}</Chip>
              ))}
            </div>
            {onResourceFeedback && (item.resource_ids || []).length > 0 && (
              <ResourceFeedbackRow
                resourceIds={item.resource_ids}
                onResourceFeedback={onResourceFeedback}
              />
            )}
            {onFeedback && (
              <FeedbackControl
                targetType="report_pattern"
                targetText={item.claim}
                evidenceIds={item.evidence_ids || []}
                feedback={feedbackFor?.(item.claim)}
                onSubmit={onFeedback}
                rejectLabel="Esto no fue lo que me ayudó"
              />
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}

// Feedback on the concrete resources a claim cites. "No me ayudó" is a verdict
// on the extraction; "no lo uses más" is only a reuse preference — the record
// itself is never deleted or altered either way.
function ResourceFeedbackRow({ resourceIds, onResourceFeedback }) {
  const [busy, setBusy] = useState(false);
  const send = async (value) => {
    setBusy(true);
    try {
      await Promise.all(resourceIds.map((id) => onResourceFeedback(id, value)));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <button
        type="button" disabled={busy} onClick={() => send('incorrect')}
        className="inline-flex items-center gap-1 hover:text-foreground disabled:opacity-50"
      >
        <ThumbsDown size={11} /> Esto no me ayudó
      </button>
      <button
        type="button" disabled={busy} onClick={() => send('exclude_from_companion')}
        className="inline-flex items-center gap-1 hover:text-foreground disabled:opacity-50"
      >
        <EyeOff size={11} /> No lo uses más
      </button>
      <button
        type="button" disabled={busy} onClick={() => send(null)}
        className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground disabled:opacity-50"
      >
        <Undo2 size={11} /> Deshacer
      </button>
    </div>
  );
}

const RESOURCE_TYPE_LABELS = {
  pleasant_activity: 'Actividad agradable',
  social_connection: 'Conexión social',
  achievement: 'Logro',
  rest: 'Descanso',
  creative_activity: 'Actividad creativa',
  study_method: 'Método de estudio',
  spiritual_practice: 'Práctica personal',
  self_compassion: 'Autocompasión',
};

function resourceTypeLabel(key) {
  if (RESOURCE_TYPE_LABELS[key]) return RESOURCE_TYPE_LABELS[key];
  if (SOURCE_LABELS[key]) return SOURCE_LABELS[key].label;
  const spaced = String(key || '').replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// NRRM F3 — automatic responses detected in the period. Described, never
// diagnosed: what repeats and before which signals. The protective-function
// reading belongs to the companion, not here, and the wording must not turn a
// learned response into a character trait.
function CandidatesPanel({ items, feedbackFor, onFeedback }) {
  if (!items?.length) return null;
  return (
    <Panel title="Respuestas automáticas detectadas" icon={Repeat}>
      <p className="mb-3 text-xs text-muted-foreground">
        Conductas que se repiten en el periodo. Son observaciones, no diagnósticos: si alguna
        no te representa, dilo y no volverá a proponerse.
      </p>
      <ul className="space-y-4">
        {items.map((item, i) => (
          <li key={i}>
            <p className="text-sm">{prose(item.observed_response)}</p>
            {(item.activation_signals || []).length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Se activa ante: {item.activation_signals.join(' · ')}
              </p>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {(item.dates || []).map((d) => (
                <Chip key={d} className="bg-muted text-muted-foreground">{d}</Chip>
              ))}
            </div>
            <div className="mt-2"><ConfidenceBar value={item.confidence} /></div>
            {onFeedback && (
              <FeedbackControl
                targetType="learned_response_candidate"
                targetText={item.observed_response}
                evidenceIds={item.evidence_ids || []}
                feedback={feedbackFor?.(item.observed_response)}
                onSubmit={onFeedback}
              />
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export default function ReasonedReportView({
  report,
  onConvertToTask,
  feedbackFor,
  onFeedback,
  onResourceFeedback,
}) {
  if (!report) return null;

  const causal = report.causal_analysis || {};
  const emotional = report.emotional_analysis || {};
  const action = report.action_today || {};

  const observedFacts = causal.observed_facts || [];
  const detectedPatterns = causal.detected_patterns || [];
  const possibleCauses = causal.possible_causes || [];
  const contradictions = causal.contradictions || [];
  const recommendedFocus = causal.recommended_focus || [];
  const interpretationRisks = causal.risk_of_wrong_interpretation || [];
  const evidence = report.evidence || [];
  const patternRefs = emotional.pattern_refs || [];
  const dominantEmotions = emotional.dominant_emotions || [];
  const emotionalNotes = emotional.recurring_emotional_notes || [];

  const hasEmotional =
    patternRefs.length > 0 ||
    dominantEmotions.length > 0 ||
    emotionalNotes.length > 0 ||
    emotional.sample_size > 0;

  const hasInterpretation =
    report.interpretation ||
    recommendedFocus.length > 0 ||
    contradictions.length > 0 ||
    interpretationRisks.length > 0;

  return (
    <div className="space-y-4">
      {/* Lectura principal */}
      {report.main_reading && (
        <Card emphasis>
          <div className="p-5">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Sparkles size={14} className="text-primary" /> Lectura del periodo
            </div>
            <p className="text-[15px] leading-relaxed">{prose(report.main_reading)}</p>
          </div>
        </Card>
      )}

      {/* Métricas del periodo (KPIs deterministas) */}
      <MetricsPanel metrics={report.metrics} />

      {/* Prioridad + Acción de hoy */}
      {(report.priority || action.instruction) && (
        <Card emphasis>
          <div className="space-y-3 p-5">
            {report.priority && (
              <div>
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Flag size={14} className="text-primary" /> Prioridad
                </div>
                <p className="font-medium">{stripEvidenceIds(report.priority)}</p>
              </div>
            )}
            {action.instruction && (
              <div className="flex items-start justify-between gap-3 rounded-md border bg-secondary/40 p-3">
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <ArrowRightCircle size={14} className="text-primary" /> Acción de hoy
                  </div>
                  <p className="font-medium">{stripEvidenceIds(action.instruction)}</p>
                  {action.rationale && (
                    <p className="mt-1 text-sm text-muted-foreground">{prose(action.rationale)}</p>
                  )}
                  {action.estimated_minutes > 0 && (
                    <Chip className="mt-2 bg-muted text-muted-foreground">
                      <Timer size={11} /> {action.estimated_minutes} min
                    </Chip>
                  )}
                </div>
                {action.suggested_task && onConvertToTask && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => onConvertToTask({
                      title: action.instruction,
                      rationale: action.rationale,
                      suggested_task: action.suggested_task,
                    })}
                  >
                    <PlusCircle className="mr-1 h-4 w-4" /> Convertir en tarea
                  </Button>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Hechos observados + Riesgo operativo */}
      {(observedFacts.length > 0 || report.operational_risk) && (
        <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
          {observedFacts.length > 0 && (
            <Panel title="Hechos observados" icon={ListChecks}>
              <FactList items={observedFacts} />
            </Panel>
          )}
          {report.operational_risk && (
            <Panel title="Riesgo operativo" icon={AlertTriangle} tone="warning">
              <p className="text-sm">{prose(report.operational_risk)}</p>
            </Panel>
          )}
        </div>
      )}

      {/* Patrones detectados + Posibles causas */}
      {(detectedPatterns.length > 0 || possibleCauses.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {detectedPatterns.length > 0 && (
            <Panel title="Patrones detectados" icon={GitBranch}>
              <ul className="space-y-3">
                {detectedPatterns.map((pattern, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                    <div className="min-w-0 flex-1">
                      <span>{prose(pattern)}</span>
                      {onFeedback && (
                        <FeedbackControl
                          targetType="report_pattern"
                          targetText={pattern}
                          feedback={feedbackFor?.(pattern)}
                          onSubmit={onFeedback}
                        />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          {possibleCauses.length > 0 && (
            <Panel title="Posibles causas" icon={Scale}>
              <ul className="space-y-3">
                {possibleCauses.map((cause, i) => (
                  <li key={i} className="space-y-1.5">
                    <p className="text-sm">{prose(cause.hypothesis)}</p>
                    <ConfidenceBar value={cause.confidence} />
                    {onFeedback && (
                      <FeedbackControl
                        targetType="report_cause"
                        targetText={cause.hypothesis}
                        evidenceIds={cause.evidence_ids || []}
                        feedback={feedbackFor?.(cause.hypothesis)}
                        onSubmit={onFeedback}
                        rejectLabel="La causa no es esa"
                      />
                    )}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      )}

      {/* Evidencias */}
      {evidence.length > 0 && (
        <Panel title="Evidencias" icon={Quote}>
          <div className="divide-y divide-border">
            {evidence.map((ev, i) => (
              <div key={i} className="py-3 first:pt-0 last:pb-0">
                <p className="text-sm">{prose(ev.claim)}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {(ev.dates || []).map((d) => (
                    <Chip key={d} className="bg-muted text-muted-foreground">{d}</Chip>
                  ))}
                  {(ev.source_types || []).map((s) => {
                    const cfg = SOURCE_LABELS[s] || { label: s, Icon: BookOpen };
                    const { Icon } = cfg;
                    return (
                      <Chip key={s} className="border text-muted-foreground">
                        <Icon size={11} /> {cfg.label}
                      </Chip>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Lectura emocional */}
      {hasEmotional && (
        <Panel title="Lectura emocional" icon={HeartPulse}>
          {(emotional.window_days > 0 || emotional.sample_size > 0 || emotional.average_intensity > 0) && (
            <div className="mb-4 grid grid-cols-3 gap-2">
              {emotional.average_intensity > 0 && (
                <Stat value={`${emotional.average_intensity.toFixed(1)}/5`} label="Intensidad media" />
              )}
              {emotional.sample_size > 0 && <Stat value={emotional.sample_size} label="Muestra" />}
              {emotional.window_days > 0 && <Stat value={`${emotional.window_days} días`} label="Ventana" />}
            </div>
          )}
          {dominantEmotions.length > 0 && (
            <div className="mb-3">
              <span className="text-xs text-muted-foreground">Emociones dominantes: </span>
              <span className="inline-flex flex-wrap gap-1.5 align-middle">
                {dominantEmotions.map((e) => (
                  <Chip key={e} className="bg-muted/60">{e}</Chip>
                ))}
              </span>
            </div>
          )}

          {patternRefs.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-1.5 pr-2 font-medium">Señal</th>
                    <th className="px-2 py-1.5 font-medium">Estado</th>
                    <th className="px-2 py-1.5 text-right font-medium">Veces</th>
                    <th className="py-1.5 pl-2 text-right font-medium">Intensidad</th>
                  </tr>
                </thead>
                <tbody>
                  {patternRefs.map((p) => {
                    const cfg = PATTERN_STATUS_CONFIG[p.pattern_status] || {
                      label: p.pattern_status || '—', className: 'text-muted-foreground bg-muted',
                    };
                    return (
                      <tr key={p.pattern_key} className="border-b last:border-0">
                        <td className="py-2 pr-2 font-medium">{p.label}</td>
                        <td className="px-2 py-2">
                          <Chip className={cfg.className}>{cfg.label}</Chip>
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">×{p.count}</td>
                        <td className="py-2 pl-2 text-right tabular-nums">
                          {typeof p.avg_intensity === 'number' ? `${p.avg_intensity.toFixed(1)}/5` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {emotionalNotes.length > 0 && (
            <div className="mt-3">
              <FactList items={emotionalNotes} muted />
            </div>
          )}
        </Panel>
      )}

      {/* NRRM: contraevidencia de la propia historia, respuestas automáticas
          detectadas y calidad de la muestra. Ausentes en V2 → no se renderizan. */}
      <PositiveEvidencePanel
        items={report.positive_evidence}
        feedbackFor={feedbackFor}
        onFeedback={onFeedback}
        onResourceFeedback={onResourceFeedback}
      />
      <CandidatesPanel
        items={report.learned_response_candidates}
        feedbackFor={feedbackFor}
        onFeedback={onFeedback}
      />

      {/* Lectura corporal (sueño/energía/estrés/fatiga; solo si hay check-ins) */}
      <BodyPanel body={report.body_signals} />

      <DataQualityPanel dataQuality={report.data_quality} />

      {/* Interpretación y matices (secundario, plegable) */}
      {hasInterpretation && (
        <CollapsibleSection title="Interpretación y matices" icon={Scale}>
          {report.interpretation && (
            <p className="text-sm text-muted-foreground">{prose(report.interpretation)}</p>
          )}
          {recommendedFocus.length > 0 && (
            <div>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">A qué prestar atención</h4>
              <FactList items={recommendedFocus} />
            </div>
          )}
          {contradictions.length > 0 && (
            <div>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contradicciones</h4>
              <FactList items={contradictions} muted />
            </div>
          )}
          {interpretationRisks.length > 0 && (
            <div>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cautelas de lectura</h4>
              <FactList items={interpretationRisks} muted />
            </div>
          )}
        </CollapsibleSection>
      )}
    </div>
  );
}
