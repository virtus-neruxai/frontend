import {
  AlertTriangle,
  ArrowRightCircle,
  BarChart3,
  BookOpen,
  CheckSquare,
  ChevronDown,
  Flag,
  GitBranch,
  HeartPulse,
  ListChecks,
  MessageSquare,
  PlusCircle,
  Quote,
  RotateCcw,
  Scale,
  Sparkles,
  Target,
  Timer,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../components/ui/collapsible';
import { useState } from 'react';

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

export default function ReasonedReportView({ report, onConvertToTask }) {
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
              <FactList items={detectedPatterns} />
            </Panel>
          )}
          {possibleCauses.length > 0 && (
            <Panel title="Posibles causas" icon={Scale}>
              <ul className="space-y-3">
                {possibleCauses.map((cause, i) => (
                  <li key={i} className="space-y-1.5">
                    <p className="text-sm">{prose(cause.hypothesis)}</p>
                    <ConfidenceBar value={cause.confidence} />
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
