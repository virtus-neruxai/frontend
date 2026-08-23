import { useEffect, useState } from 'react';
import { Badge } from '../../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../components/ui/collapsible';
import { TrendingUp, TrendingDown, Minus, BookOpen, ChevronDown, CheckCircle2, Pencil, X, AlertTriangle } from 'lucide-react';
import { frictionIcon } from '../../../lib/frictionIcons';
import { partitionFrictionGroups } from '../../../lib/patternPartition';
import { FrictionAcknowledgeDialog } from './FrictionAcknowledgeDialog';
import {
  Skeleton,
  RANGE_OPTIONS,
  SOURCE_LABELS,
  StatusBadge,
  UserStatusBadge as SharedUserStatusBadge,
  PatternColumn,
  ProgressDots,
  SourceChips,
} from './patternPanelShared';

// Trend of the whole pattern: the arrow tracks where its intensity is heading,
// the colour whether that direction is good news. Derived in the backend by
// comparing the recent half of a pattern's evidence against the older half
// (services/friction_labels.py::derive_pattern_status).
const PATTERN_STATUS_CONFIG = {
  active:          { label: 'Activo',        color: 'text-destructive',                    bg: 'bg-destructive/10',             Icon: Minus,        hint: 'Se repite con intensidad alta y no está bajando.' },
  improving:       { label: 'Mejorando',     color: 'text-[hsl(var(--success))]',          bg: 'bg-[hsl(var(--success-soft))]', Icon: TrendingDown, hint: 'Las evidencias recientes son menos intensas que las anteriores.' },
  resolved_signal: { label: 'Estable',       color: 'text-[hsl(var(--info))]',             bg: 'bg-[hsl(var(--info-soft))]',    Icon: Minus,        hint: 'Sigue apareciendo, pero con intensidad baja y sin cambios.' },
  relapse_signal:  { label: 'Reaparece',     color: 'text-[hsl(var(--virtus-secondary))]', bg: 'bg-secondary',                  Icon: TrendingUp,   hint: 'Las evidencias recientes son más intensas que las anteriores.' },
  unknown:         { label: 'Sin tendencia', color: 'text-muted-foreground',               bg: 'bg-muted',                      Icon: Minus,        hint: 'Aún no hay evidencias suficientes para saber hacia dónde va.' },
};

// Intensity of one piece of evidence. A single event has no direction, so it
// never carries a trend label — that would make every row read «Activo».
const SEVERITY_CONFIG = {
  Leve:     'text-muted-foreground bg-muted',
  Moderada: 'text-[hsl(var(--warning))] bg-[hsl(var(--warning-soft))]',
  Intensa:  'text-destructive bg-destructive/10',
};

function displayFrictionLabel(label) {
  return label || 'Patrón sin clasificar';
}

function normalizeFrictionItem(item = {}) {
  const friction = item.friction || item.key || item.pattern_key;
  return {
    ...item,
    friction,
    label: displayFrictionLabel(item.label),
  };
}

function normalizeTimelineEvent(event = {}) {
  return {
    ...event,
    label: displayFrictionLabel(event.label),
    secondary_label: event.secondary_label
      ? displayFrictionLabel(event.secondary_label)
      : null,
  };
}

function normalizeSummary(summary = {}) {
  return {
    ...summary,
    top_pattern_label: displayFrictionLabel(summary.top_pattern_label),
  };
}

function PatternStatusBadge({ status }) {
  return <StatusBadge {...(PATTERN_STATUS_CONFIG[status] || PATTERN_STATUS_CONFIG.unknown)} />;
}

function UntrendedSection({ groups, defaultOpen, divided }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!groups.length) return null;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={divided ? 'mt-4 border-t pt-4' : ''}
      data-testid="friction-untrended-section"
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="flex items-center gap-2">
            <Minus size={14} />
            Sin tendencia
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs font-semibold">
              {groups.length}
            </span>
          </span>
          <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3">
        <p className="mb-3 text-xs text-muted-foreground">
          {PATTERN_STATUS_CONFIG.unknown.hint}
        </p>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {groups.map((group) => (
            <PatternEvidenceGroup key={group.key} group={group} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function SeverityBadge({ label }) {
  if (!label) return null;
  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${SEVERITY_CONFIG[label] || SEVERITY_CONFIG.Leve}`}
      title="Intensidad de esta evidencia"
    >
      {label}
    </span>
  );
}

function UserStatusBadge({ item }) {
  return (
    <SharedUserStatusBadge
      item={item}
      fallback={<PatternStatusBadge status={item.pattern_status} />}
    />
  );
}

function countEventSources(events = []) {
  return events.reduce((sources, event) => {
    if (event.source_type) {
      sources[event.source_type] = (sources[event.source_type] || 0) + 1;
    }
    return sources;
  }, {});
}

function FrictionChip({ item, onEdit, selected, onSelect }) {
  const isDismissed = item.user_confirmed === false;
  const ChipIcon = frictionIcon(item.friction);
  return (
    <div
      className={`inline-flex items-center gap-1 text-xs rounded-full font-medium transition-all border
        ${isDismissed ? 'opacity-40 bg-muted text-muted-foreground border-transparent' : selected ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/60 text-foreground border-transparent hover:border-border'}`}
    >
      <button
        type="button"
        onClick={() => onSelect(item.friction)}
        className="pl-2.5 pr-1.5 py-1.5 cursor-pointer inline-flex items-center gap-1"
        title="Filtrar evidencias por este patrón"
      >
        <ChipIcon size={11} className="shrink-0 opacity-70" aria-hidden="true" />
        <span>{item.label}</span>
        <span className={`ml-1 ${selected ? 'opacity-80' : 'opacity-60'}`}>×{item.count}</span>
        {item.user_progress != null && item.user_progress < 5 && (
          <span className="ml-1"><ProgressDots progress={item.user_progress} /></span>
        )}
      </button>
      <button
        type="button"
        onClick={() => onEdit(item)}
        className={`pr-2 py-1.5 cursor-pointer ${selected ? 'opacity-80 hover:opacity-100' : 'opacity-40 hover:opacity-70'}`}
        title="Actualizar progreso"
      >
        <Pencil size={10} />
      </button>
    </div>
  );
}

function TimelineEvent({ event }) {
  const source = SOURCE_LABELS[event.source_type] || { label: event.source_type, icon: BookOpen };
  const SourceIcon = source.icon;
  return (
    <div className="flex gap-3 py-3 border-b last:border-0">
      <div className="mt-0.5 p-1.5 rounded-md bg-muted text-muted-foreground shrink-0">
        <SourceIcon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium truncate">
            {event.label}
            {event.secondary_label && (
              <span className="text-muted-foreground font-normal"> · {event.secondary_label}</span>
            )}
          </span>
          <SeverityBadge label={event.severity_label} />
        </div>
        {event.excerpt && (
          <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2">
            &ldquo;{event.excerpt}&rdquo;
          </p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">{source.label}</span>
          {event.created_at && (
            <span className="text-xs text-muted-foreground">
              · {new Date(event.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function buildPatternGroups(timeline = [], byFriction = [], selectedFriction = null) {
  const frictionMeta = new Map((byFriction || []).map((item) => [item.friction, item]));
  const groupMap = new Map();
  const eventKey = (event) => [
    event.source_type || '',
    event.id || '',
    event.created_at || '',
    event.excerpt || '',
  ].join('|');

  const ensureGroup = (frictionKey, fallbackLabel = null) => {
    if (!frictionKey) return null;
    if (!groupMap.has(frictionKey)) {
      const meta = frictionMeta.get(frictionKey);
      groupMap.set(frictionKey, {
        key: frictionKey,
        meta: meta || {
          friction: frictionKey,
          label: fallbackLabel || frictionKey,
          count: 0,
          pattern_status: null,
          sources: {},
        },
        events: [],
        eventKeys: new Set(),
      });
    }
    return groupMap.get(frictionKey);
  };

  const pushEvent = (group, event) => {
    if (!group || !event) return;
    const key = eventKey(event);
    if (group.eventKeys.has(key)) return;
    group.eventKeys.add(key);
    group.events.push(event);
  };

  if (selectedFriction) {
    ensureGroup(selectedFriction);
    timeline.forEach((event) => {
      if (event.friction === selectedFriction || event.secondary_friction === selectedFriction) {
        const label = event.friction === selectedFriction ? event.label : event.secondary_label;
        pushEvent(ensureGroup(selectedFriction, label), event);
      }
    });
    return Array.from(groupMap.values()).filter((group) => group.events.length > 0);
  }

  timeline.forEach((event) => {
    // Each pattern has a single entry containing every related evidence,
    // regardless of whether the Observer marked it as primary or secondary.
    pushEvent(ensureGroup(event.friction, event.label), event);
    if (event.secondary_friction && event.secondary_friction !== event.friction) {
      pushEvent(ensureGroup(event.secondary_friction, event.secondary_label), event);
    }
  });

  return Array.from(groupMap.values())
    .filter((group) => group.events.length > 0)
    .sort((a, b) => {
      const countDiff = (b.meta.count || b.events.length) - (a.meta.count || a.events.length);
      if (countDiff !== 0) return countDiff;
      const latestA = a.events[0]?.created_at || '';
      const latestB = b.events[0]?.created_at || '';
      return String(latestB).localeCompare(String(latestA));
    });
}

function PatternEvidenceGroup({ group, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const item = group.meta;
  const evidenceCount = group.events.length;
  const evidenceSources = countEventSources(group.events);
  const GroupIcon = frictionIcon(item.friction);

  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-lg border bg-card overflow-hidden"
      data-testid={`detected-pattern-group-${item.friction}`}
    >
      <div className="flex items-start gap-3 p-3">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex flex-1 items-start justify-between gap-3 text-left"
          >
            <div className="flex min-w-0 flex-1 items-start gap-3">
              {/* Neutral on purpose: the status badge stays the card's only
                  colour signal. */}
              <span
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
                aria-hidden="true"
              >
                <GroupIcon size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <UserStatusBadge item={item} />
                  <span className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    1 entrada · {evidenceCount} {evidenceCount === 1 ? 'evidencia' : 'evidencias'}
                  </span>
                </div>
                <SourceChips sources={evidenceSources} />
                {item.user_notes && (
                  <p className="mt-1 text-xs text-muted-foreground italic">{item.user_notes}</p>
                )}
              </div>
            </div>
            <ChevronDown size={16} className={`mt-0.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="border-t px-3">
          {group.events.map((event) => (
            <TimelineEvent
              key={`${group.key}-${event.source_type}-${event.id}-${event.created_at}`}
              event={event}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function SummaryRow({ summary }) {
  if (!summary) return null;
  return (
    <div className="flex flex-wrap gap-4 text-sm mb-4">
      {summary.top_pattern_label && (
        <div>
          <span className="text-muted-foreground">Patrón principal: </span>
          <span className="font-medium">{summary.top_pattern_label}</span>
        </div>
      )}
      {summary.pattern_events > 0 && (
        <div>
          <span className="text-muted-foreground">Señales: </span>
          <span className="font-medium">{summary.pattern_events}</span>
        </div>
      )}
      {summary.avg_severity > 0 && (
        <div>
          <span className="text-muted-foreground">Intensidad media: </span>
          <span className="font-medium">{summary.avg_severity.toFixed(1)} / 3</span>
        </div>
      )}
      {summary.is_stale && (
        <Badge variant="outline" className="text-xs text-muted-foreground">
          Datos en directo
        </Badge>
      )}
    </div>
  );
}

function ResolvedSection({ resolvedFrictions }) {
  const [open, setOpen] = useState(false);
  if (!resolvedFrictions?.length) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-4 border-t pt-4">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-[hsl(var(--success))]" />
            Patrones superados
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs font-semibold">
              {resolvedFrictions.length}
            </span>
          </span>
          <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-2">
        {resolvedFrictions.map((item) => (
          <div key={item.friction} className="flex items-center justify-between py-2 border-b last:border-0">
            <div>
              <p className="text-sm font-medium text-muted-foreground line-through">{item.label}</p>
              {item.user_notes && (
                <p className="text-xs text-muted-foreground mt-0.5 italic">{item.user_notes}</p>
              )}
            </div>
            <div className="text-right shrink-0 ml-3">
              {item.resolved_at && (
                <p className="text-xs text-muted-foreground">
                  {new Date(item.resolved_at).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                </p>
              )}
              <p className="text-xs text-muted-foreground">×{item.count}</p>
            </div>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function DetectedPatternsPanel({ data, loading, range = '7', onRangeChange, onAcknowledge }) {
  const [dialogState, setDialogState] = useState({ open: false, friction: null });
  const [selectedFriction, setSelectedFriction] = useState(null);

  const openDialog = (item) => {
    setDialogState({ open: true, friction: { ...item, range } });
  };
  const closeDialog = () => setDialogState({ open: false, friction: null });

  const toggleFriction = (frictionKey) => {
    setSelectedFriction(prev => prev === frictionKey ? null : frictionKey);
  };

  if (loading) {
    return (
      <div className="rounded-[8px] border bg-card p-5" data-testid="detected-patterns-panel">
        <Skeleton className="h-5 w-48 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-4" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const timeline = data?.timeline || [];
  const summary = normalizeSummary(data?.summary || {});
  const byFriction = (data?.by_friction || []).map(normalizeFrictionItem);
  const resolvedFrictions = (data?.resolved_frictions || []).map(normalizeFrictionItem);
  const normalizedTimeline = timeline.map(normalizeTimelineEvent);

  const filteredTimeline = selectedFriction
    ? normalizedTimeline.filter(evt => evt.friction === selectedFriction || evt.secondary_friction === selectedFriction)
    : normalizedTimeline;
  const groupedTimeline = buildPatternGroups(filteredTimeline, byFriction, selectedFriction);

  const buckets = partitionFrictionGroups(groupedTimeline);
  const hasTrend = buckets.attention.length > 0 || buckets.improving.length > 0;

  const hasData = timeline.length > 0 || byFriction.length > 0 || resolvedFrictions.length > 0;

  return (
    <div className="rounded-[8px] border bg-card p-5" data-testid="detected-patterns-panel">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-base">Patrones detectados</h3>
        <div className="flex items-center gap-2">
          {summary.last_refreshed_at && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Últ. actualización: {new Date(summary.last_refreshed_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {onRangeChange && (
            <Select value={range} onValueChange={onRangeChange}>
              <SelectTrigger className="h-7 text-xs w-36 rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Señales recurrentes detectadas en tus interacciones y reflexiones · Haz clic en un patrón para actualizar tu progreso
      </p>

      {!hasData ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Aún no hay patrones detectados en este periodo.
        </p>
      ) : (
        <>
          <SummaryRow summary={summary} />

          {/* Friction chips */}
          {byFriction.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {byFriction.map((f) => (
                <FrictionChip
                  key={f.friction}
                  item={f}
                  onEdit={openDialog}
                  selected={selectedFriction === f.friction}
                  onSelect={toggleFriction}
                />
              ))}
              {selectedFriction && (
                <button
                  type="button"
                  onClick={() => setSelectedFriction(null)}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted cursor-pointer"
                >
                  <X size={10} /> Ver todos
                </button>
              )}
            </div>
          )}

          {/* Grouped timeline. Selecting a chip means "only this one", not
              "compare trends", so focus mode drops the columns entirely — a
              two-column grid holding a single card reads as broken. */}
          {selectedFriction ? (
            groupedTimeline.length > 0 ? (
              <div className="space-y-3">
                {groupedTimeline.map((group) => (
                  <PatternEvidenceGroup key={group.key} group={group} defaultOpen />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No hay evidencias de este patrón en el periodo seleccionado.
              </p>
            )
          ) : (
            <>
              {hasTrend && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <PatternColumn
                    testId="friction-column-attention"
                    title="Requieren atención"
                    description="Suben de intensidad o se mantienen altos."
                    icon={AlertTriangle}
                    tone="attention"
                    count={buckets.attention.length}
                    emptyHint="Ahora mismo ningún patrón está subiendo."
                  >
                    {buckets.attention.map((group) => (
                      <PatternEvidenceGroup key={group.key} group={group} />
                    ))}
                  </PatternColumn>
                  <PatternColumn
                    testId="friction-column-improving"
                    title="Van a mejor"
                    description="Bajan de intensidad o se han estabilizado."
                    icon={TrendingDown}
                    tone="improving"
                    count={buckets.improving.length}
                    emptyHint="Todavía ninguno está bajando de intensidad."
                  >
                    {buckets.improving.map((group) => (
                      <PatternEvidenceGroup key={group.key} group={group} />
                    ))}
                  </PatternColumn>
                </div>
              )}
              {/* With nothing trending, the columns would be two empty boxes.
                  Degrade to the flat list plus one line of explanation. */}
              <UntrendedSection
                groups={buckets.untrended}
                defaultOpen={!hasTrend}
                divided={hasTrend}
              />
              {groupedTimeline.length === 0 && timeline.length > 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No hay evidencias de este patrón en el periodo seleccionado.
                </p>
              )}
            </>
          )}

          {/* Resolved frictions section */}
          <ResolvedSection resolvedFrictions={resolvedFrictions} />
        </>
      )}

      {/* Acknowledge dialog */}
      {dialogState.open && (
        <FrictionAcknowledgeDialog
          open={dialogState.open}
          friction={dialogState.friction}
          onSave={onAcknowledge}
          onClose={closeDialog}
        />
      )}
    </div>
  );
}
