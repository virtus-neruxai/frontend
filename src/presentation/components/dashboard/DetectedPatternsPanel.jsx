import { useEffect, useState } from 'react';
import { Badge } from '../../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../components/ui/collapsible';
import { TrendingUp, TrendingDown, Minus, MessageSquare, BookOpen, CheckSquare, Target, RotateCcw, ChevronDown, CheckCircle2, Pencil, X } from 'lucide-react';
import { FrictionAcknowledgeDialog } from './FrictionAcknowledgeDialog';

function Skeleton({ className }) {
  return <div className={`animate-pulse bg-muted rounded ${className}`} />;
}

const RANGE_OPTIONS = [
  { value: '7',  label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' },
];

const SOURCE_LABELS = {
  chat_interaction:   { label: 'Chat',    icon: MessageSquare },
  journal_reflection: { label: 'Diario',  icon: BookOpen },
  task_reflection:    { label: 'Tarea',   icon: CheckSquare },
  mission_reflection: { label: 'Misión',  icon: Target },
  routine_reflection: { label: 'Rutina',  icon: RotateCcw },
};

const PATTERN_STATUS_CONFIG = {
  active:          { label: 'Activo',      color: 'text-destructive',                bg: 'bg-destructive/10',             Icon: TrendingDown },
  improving:       { label: 'Mejorando',   color: 'text-[hsl(var(--success))]',      bg: 'bg-[hsl(var(--success-soft))]', Icon: TrendingUp },
  resolved_signal: { label: 'Estable',     color: 'text-[hsl(var(--info))]',         bg: 'bg-[hsl(var(--info-soft))]',    Icon: TrendingUp },
  relapse_signal:  { label: 'Reaparece',   color: 'text-[hsl(var(--virtus-secondary))]', bg: 'bg-secondary',              Icon: Minus },
  unknown:         { label: 'Sin tendencia', color: 'text-muted-foreground',          bg: 'bg-muted',                       Icon: Minus },
};

// User-driven status labels (override auto-detected pattern_status)
const USER_STATUS_CONFIG = {
  dismissed:  { label: 'Descartado',     color: 'text-muted-foreground', bg: 'bg-muted', Icon: Minus },
  1: { label: 'Apenas reconocido', color: 'text-[hsl(var(--info))]',    bg: 'bg-[hsl(var(--info-soft))]',    Icon: Minus },
  2: { label: 'Entendiendo',       color: 'text-[hsl(var(--info))]',    bg: 'bg-[hsl(var(--info-soft))]',    Icon: Minus },
  3: { label: 'Trabajando',        color: 'text-[hsl(var(--success))]', bg: 'bg-[hsl(var(--success-soft))]', Icon: TrendingUp },
  4: { label: 'Notando mejora',    color: 'text-[hsl(var(--success))]', bg: 'bg-[hsl(var(--success-soft))]', Icon: TrendingUp },
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

function getUserDisplayStatus(item) {
  if (item.user_confirmed === false) return USER_STATUS_CONFIG.dismissed;
  if (item.user_progress != null && item.user_progress < 5) {
    return USER_STATUS_CONFIG[item.user_progress] || null;
  }
  return null;
}

function PatternStatusBadge({ status }) {
  const cfg = PATTERN_STATUS_CONFIG[status] || PATTERN_STATUS_CONFIG.unknown;
  const { label, color, bg, Icon } = cfg;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${color} ${bg}`}>
      <Icon size={11} />
      {label}
    </span>
  );
}

function UserStatusBadge({ item }) {
  const cfg = getUserDisplayStatus(item);
  if (!cfg) return <PatternStatusBadge status={item.pattern_status} />;
  const { label, color, bg, Icon } = cfg;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${color} ${bg}`}>
      <Icon size={11} />
      {label}
    </span>
  );
}

function ProgressDots({ progress }) {
  return (
    <div className="flex gap-0.5 items-center">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`w-1.5 h-1.5 rounded-full ${n <= progress ? 'bg-primary' : 'bg-muted-foreground/30'}`}
        />
      ))}
    </div>
  );
}

function SourceChips({ sources }) {
  const active = Object.entries(sources || {}).filter(([, count]) => count > 0);
  if (!active.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {active.map(([type, count]) => {
        const cfg = SOURCE_LABELS[type];
        if (!cfg) return null;
        const Icon = cfg.icon;
        return (
          <span key={type} className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            <Icon size={10} />
            {cfg.label} ({count})
          </span>
        );
      })}
    </div>
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
  return (
    <div
      className={`inline-flex items-center gap-1 text-xs rounded-full font-medium transition-all border
        ${isDismissed ? 'opacity-40 bg-muted text-muted-foreground border-transparent' : selected ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/60 text-foreground border-transparent hover:border-border'}`}
    >
      <button
        type="button"
        onClick={() => onSelect(item.friction)}
        className="pl-2.5 pr-1.5 py-1.5 cursor-pointer"
        title="Filtrar evidencias por este patrón"
      >
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
          <PatternStatusBadge status={event.pattern_status} />
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

          {/* Grouped timeline */}
          {groupedTimeline.length > 0 ? (
            <div className="space-y-3">
              {groupedTimeline.map((group) => (
                <PatternEvidenceGroup
                  key={group.key}
                  group={group}
                  defaultOpen={!!selectedFriction}
                />
              ))}
            </div>
          ) : timeline.length > 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No hay evidencias de este patrón en el periodo seleccionado.
            </p>
          ) : null}

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
