import { useState } from 'react';
import { Badge } from '../../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../components/ui/collapsible';
import { TrendingUp, TrendingDown, Minus, MessageSquare, BookOpen, CheckSquare, Target, RotateCcw, ChevronDown, CheckCircle2, Pencil, X, Info } from 'lucide-react';
import { EmotionalPatternAcknowledgeDialog } from './EmotionalPatternAcknowledgeDialog';

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

// Weak evidence (signal/weak_signal) always renders as a neutral/informative
// badge, regardless of polarity — there isn't enough sample to claim
// "present" or "active" yet. Only "active" is polarity-aware: a positive
// emotion that's clearly present reads as "Presente" (success), never as a
// destructive "Activo".
const WEAK_STATUS_CONFIG = { label: 'Señal inicial', color: 'text-[hsl(var(--info))]', bg: 'bg-[hsl(var(--info-soft))]', Icon: Minus };
const ACTIVE_POSITIVE_CONFIG = { label: 'Presente', color: 'text-[hsl(var(--success))]', bg: 'bg-[hsl(var(--success-soft))]', Icon: TrendingUp };
const ACTIVE_OTHER_CONFIG = { label: 'Activo', color: 'text-destructive', bg: 'bg-destructive/10', Icon: TrendingDown };
const IMPROVING_CONFIG = { label: 'Mejorando', color: 'text-[hsl(var(--success))]', bg: 'bg-[hsl(var(--success-soft))]', Icon: TrendingUp };

function getStatusConfig(status, polarity) {
  if (status === 'weak_signal' || status === 'signal') return WEAK_STATUS_CONFIG;
  if (status === 'active') return polarity === 'positive' ? ACTIVE_POSITIVE_CONFIG : ACTIVE_OTHER_CONFIG;
  return IMPROVING_CONFIG;
}

// User-driven status labels (override auto-detected pattern_status)
const USER_STATUS_CONFIG = {
  dismissed:  { label: 'Descartado',     color: 'text-muted-foreground', bg: 'bg-muted', Icon: Minus },
  1: { label: 'Apenas reconocido', color: 'text-[hsl(var(--info))]',    bg: 'bg-[hsl(var(--info-soft))]',    Icon: Minus },
  2: { label: 'Entendiendo',       color: 'text-[hsl(var(--info))]',    bg: 'bg-[hsl(var(--info-soft))]',    Icon: Minus },
  3: { label: 'Trabajando',        color: 'text-[hsl(var(--success))]', bg: 'bg-[hsl(var(--success-soft))]', Icon: TrendingUp },
  4: { label: 'Notando mejora',    color: 'text-[hsl(var(--success))]', bg: 'bg-[hsl(var(--success-soft))]', Icon: TrendingUp },
};

function getUserDisplayStatus(item) {
  if (item.user_confirmed === false) return USER_STATUS_CONFIG.dismissed;
  if (item.user_progress != null && item.user_progress < 5) {
    return USER_STATUS_CONFIG[item.user_progress] || null;
  }
  return null;
}

function PatternStatusBadge({ status, polarity }) {
  const { label, color, bg, Icon } = getStatusConfig(status, polarity);
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${color} ${bg}`}>
      <Icon size={11} />
      {label}
    </span>
  );
}

function UserStatusBadge({ item }) {
  const cfg = getUserDisplayStatus(item);
  if (!cfg) return <PatternStatusBadge status={item.pattern_status} polarity={item.polarity} />;
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

function EmotionalPatternChip({ item, onEdit, selected, onSelect }) {
  const isDismissed = item.user_confirmed === false;
  return (
    <div
      className={`inline-flex items-center gap-1 text-xs rounded-full font-medium transition-all border
        ${isDismissed ? 'opacity-40 bg-muted text-muted-foreground border-transparent' : selected ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/60 text-foreground border-transparent hover:border-border'}`}
    >
      <button
        type="button"
        onClick={() => onSelect(item.pattern_key)}
        className="pl-2.5 pr-1.5 py-1.5 cursor-pointer"
        title="Filtrar evidencias por este patrón"
      >
        <span>{item.emoji ? `${item.emoji} ` : ''}{item.label}</span>
        <span className={`ml-1 ${selected ? 'opacity-80' : 'opacity-60'}`}>×{item.count}</span>
        {item.is_weak_signal && (
          <span title={item.sample_warning} className="ml-1 inline-flex align-middle opacity-70">
            <Info size={10} />
          </span>
        )}
        <span className="ml-1.5 inline-flex align-middle"><UserStatusBadge item={item} /></span>
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
            {event.emoji ? `${event.emoji} ` : ''}{event.emotion_label}
            {event.title && (
              <span className="text-muted-foreground font-normal"> · {event.title}</span>
            )}
          </span>
          <span className="shrink-0 text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {event.intensity}/5
          </span>
        </div>
        {event.excerpt && (
          <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2">
            &ldquo;{event.excerpt}&rdquo;
          </p>
        )}
        {event.note_excerpt && (
          <p className="text-xs text-muted-foreground mt-0.5 italic">
            Nota: {event.note_excerpt}
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

function mergeSources(a = {}, b = {}) {
  const merged = { ...(a || {}) };
  Object.entries(b || {}).forEach(([source, count]) => {
    merged[source] = Math.max(merged[source] || 0, count || 0);
  });
  return merged;
}

function buildSourcesFromEvents(events = []) {
  return events.reduce((acc, event) => {
    if (!event.source_type) return acc;
    acc[event.source_type] = (acc[event.source_type] || 0) + 1;
    return acc;
  }, {});
}

function mergePatternMeta(existing, incoming) {
  if (!existing) return { ...incoming };
  return {
    ...existing,
    ...incoming,
    count: Math.max(existing.count || 0, incoming.count || 0),
    sources: mergeSources(existing.sources, incoming.sources),
    related_signals: Array.from(new Set([
      ...(existing.related_signals || []),
      ...(incoming.related_signals || []),
    ])),
    user_confirmed: incoming.user_confirmed ?? existing.user_confirmed,
    user_working: incoming.user_working ?? existing.user_working,
    user_progress: incoming.user_progress ?? existing.user_progress,
    user_notes: incoming.user_notes ?? existing.user_notes,
    resolved_at: incoming.resolved_at ?? existing.resolved_at,
  };
}

function getEventPatternLabel(event, patternKey) {
  if (event.pattern_labels && typeof event.pattern_labels === 'object') {
    return event.pattern_labels[patternKey];
  }
  return event.pattern_label || event.emotion_label || patternKey;
}

function isPrimaryPatternKey(patternKey) {
  return String(patternKey || '').startsWith('recurring_emotion_in_context:');
}

function getVisualPatternKey(event) {
  const keys = event.pattern_keys || [];
  return keys.find(isPrimaryPatternKey) || keys[0] || null;
}

function buildPatternGroups(timeline = [], byPattern = [], selectedPatternKey = null) {
  const patternMeta = new Map();
  (byPattern || []).forEach((item) => {
    if (!item.pattern_key) return;
    patternMeta.set(item.pattern_key, mergePatternMeta(patternMeta.get(item.pattern_key), item));
  });

  const groupMap = new Map();

  const ensureGroup = (patternKey, fallbackLabel = null) => {
    if (!patternKey) return null;
    if (!groupMap.has(patternKey)) {
      const meta = patternMeta.get(patternKey);
      groupMap.set(patternKey, {
        key: patternKey,
        meta: meta || {
          pattern_key: patternKey,
          label: fallbackLabel || patternKey,
          count: 0,
          pattern_status: 'signal',
          sources: {},
          related_signals: [],
        },
        events: [],
        eventIds: new Set(),
      });
    }
    return groupMap.get(patternKey);
  };

  const pushEvent = (patternKey, event) => {
    const group = ensureGroup(patternKey, getEventPatternLabel(event, patternKey));
    if (!group) return;
    const eventKey = `${event.source_type || 'source'}-${event.id || ''}-${event.created_at || ''}-${event.excerpt || ''}`;
    if (group.eventIds.has(eventKey)) return;
    group.eventIds.add(eventKey);
    group.events.push(event);
  };

  if (selectedPatternKey) {
    ensureGroup(selectedPatternKey);
    timeline.forEach((event) => {
      if (event.pattern_keys?.includes(selectedPatternKey)) {
        pushEvent(selectedPatternKey, event);
      }
    });
  } else {
    timeline.forEach((event) => {
      // A single reflection can have several internal pattern keys
      // (recurring emotion, after routine, emotion+friction...). In the
      // default dashboard view it must appear once, under its primary visual
      // pattern, otherwise the same evidence is copied into several cards.
      pushEvent(getVisualPatternKey(event), event);
    });
    patternMeta.forEach((_, patternKey) => {
      if (groupMap.has(patternKey)) return;
      // Keep standalone persisted patterns visible, but avoid creating empty
      // derived groups when their evidence is already represented by the
      // primary recurring_emotion_in_context group.
      if (isPrimaryPatternKey(patternKey) || timeline.length === 0) {
        ensureGroup(patternKey);
      }
    });
  }

  return Array.from(groupMap.values())
    .map((group) => {
      const eventSources = buildSourcesFromEvents(group.events);
      return {
        ...group,
        meta: {
          ...group.meta,
          count: group.meta.count || group.events.length,
          sources: mergeSources(group.meta.sources, eventSources),
        },
      };
    })
    .filter((group) => group.events.length > 0 || group.meta.count > 0)
    .sort((a, b) => {
      const countDiff = (b.meta.count || b.events.length) - (a.meta.count || a.events.length);
      if (countDiff !== 0) return countDiff;
      const latestA = a.events[0]?.created_at || '';
      const latestB = b.events[0]?.created_at || '';
      return String(latestB).localeCompare(String(latestA));
    });
}

function buildUniquePatternList(byPattern = []) {
  const patternMeta = new Map();
  (byPattern || []).forEach((item) => {
    if (!item.pattern_key) return;
    patternMeta.set(item.pattern_key, mergePatternMeta(patternMeta.get(item.pattern_key), item));
  });
  const values = Array.from(patternMeta.values());
  const hasPrimaryForEmotion = new Set(
    values
      .filter((item) => isPrimaryPatternKey(item.pattern_key))
      .map((item) => item.emotion)
      .filter(Boolean)
  );
  return values.filter((item) => (
    isPrimaryPatternKey(item.pattern_key)
    || !item.emotion
    || !hasPrimaryForEmotion.has(item.emotion)
  ));
}

function PatternEvidenceGroup({ group, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = defaultOpen || open;
  const item = group.meta;
  const eventCount = group.events.length;

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setOpen}
      className="rounded-lg border bg-card overflow-hidden"
      data-testid={`emotional-pattern-group-${item.pattern_key}`}
    >
      <div className="flex items-start gap-3 p-3">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex flex-1 items-start justify-between gap-3 text-left"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {item.emoji ? `${item.emoji} ` : ''}{item.label}
                </p>
                <UserStatusBadge item={item} />
                <span className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {eventCount} {eventCount === 1 ? 'entrada' : 'entradas'}
                </span>
                {item.is_weak_signal && (
                  <span title={item.sample_warning} className="inline-flex text-muted-foreground">
                    <Info size={12} />
                  </span>
                )}
              </div>
              <SourceChips sources={item.sources} />
              {item.related_signals?.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.related_signals.join(' · ')}
                </p>
              )}
              {item.user_notes && (
                <p className="mt-1 text-xs text-muted-foreground italic">{item.user_notes}</p>
              )}
            </div>
            <ChevronDown size={16} className={`mt-0.5 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="border-t px-3">
          {group.events.map((event) => (
            <TimelineEvent key={`${group.key}-${event.source_type}-${event.id}-${event.created_at}`} event={event} />
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
      {summary.dominant_emotions?.length > 0 && (
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">Emociones dominantes: </span>
          {summary.dominant_emotions.map((e) => (
            <span key={e.emotion} className="font-medium">
              {e.emoji ? `${e.emoji} ` : ''}{e.emotion_label} ×{e.count}
            </span>
          ))}
        </div>
      )}
      {summary.average_intensity > 0 && (
        <div>
          <span className="text-muted-foreground">Intensidad media: </span>
          <span className="font-medium">{summary.average_intensity.toFixed(1)} / 5</span>
        </div>
      )}
      {summary.pattern_events > 0 && (
        <div>
          <span className="text-muted-foreground">Señales: </span>
          <span className="font-medium">{summary.pattern_events}</span>
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

function ResolvedSection({ resolvedPatterns }) {
  const [open, setOpen] = useState(false);
  if (!resolvedPatterns?.length) return null;

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
              {resolvedPatterns.length}
            </span>
          </span>
          <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-2">
        {resolvedPatterns.map((item) => (
          <div key={item.pattern_key} className="flex items-center justify-between py-2 border-b last:border-0">
            <div>
              <p className="text-sm font-medium text-muted-foreground line-through">
                {item.emoji ? `${item.emoji} ` : ''}{item.label}
              </p>
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

export function EmotionalPatternsPanel({ data, loading, range = '7', onRangeChange, onAcknowledge }) {
  const [dialogState, setDialogState] = useState({ open: false, pattern: null });
  const [selectedPatternKey, setSelectedPatternKey] = useState(null);

  const openDialog = (item) => {
    setDialogState({ open: true, pattern: { ...item, range } });
  };
  const closeDialog = () => setDialogState({ open: false, pattern: null });

  const togglePattern = (patternKey) => {
    setSelectedPatternKey(prev => prev === patternKey ? null : patternKey);
  };

  if (loading) {
    return (
      <div className="rounded-[8px] border bg-card p-5" data-testid="emotional-patterns-panel">
        <Skeleton className="h-5 w-48 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-4" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const timeline = data?.timeline || [];
  const summary = data?.summary || {};
  const byPattern = data?.by_pattern || [];
  const resolvedPatterns = data?.resolved_patterns || [];
  const uniqueByPattern = buildUniquePatternList(byPattern);
  const groupedTimeline = buildPatternGroups(timeline, uniqueByPattern, selectedPatternKey);

  const hasData = timeline.length > 0 || byPattern.length > 0 || resolvedPatterns.length > 0;

  return (
    <div className="rounded-[8px] border bg-card p-5" data-testid="emotional-patterns-panel">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-base">Patrones emocionales</h3>
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
        Emociones recurrentes detectadas en tus reflexiones · Haz clic en un patrón para actualizar tu progreso
      </p>

      {!hasData ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Aún no hay patrones emocionales en este periodo.
        </p>
      ) : (
        <>
          <SummaryRow summary={summary} />

          {/* Pattern chips */}
          {uniqueByPattern.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {uniqueByPattern.map((p) => (
                <EmotionalPatternChip
                  key={p.pattern_key}
                  item={p}
                  onEdit={openDialog}
                  selected={selectedPatternKey === p.pattern_key}
                  onSelect={togglePattern}
                />
              ))}
              {selectedPatternKey && (
                <button
                  type="button"
                  onClick={() => setSelectedPatternKey(null)}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted cursor-pointer"
                >
                  <X size={10} /> Ver todos
                </button>
              )}
            </div>
          )}

          {/* Timeline */}
          {groupedTimeline.length > 0 ? (
            <div className="space-y-3">
              {groupedTimeline.map((group) => (
                <PatternEvidenceGroup
                  key={group.key}
                  group={group}
                  defaultOpen={!!selectedPatternKey}
                />
              ))}
            </div>
          ) : timeline.length > 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No hay evidencias de este patrón en el periodo seleccionado.
            </p>
          ) : null}

          {/* Resolved patterns section */}
          <ResolvedSection resolvedPatterns={resolvedPatterns} />
        </>
      )}

      {/* Acknowledge dialog */}
      {dialogState.open && (
        <EmotionalPatternAcknowledgeDialog
          open={dialogState.open}
          pattern={dialogState.pattern}
          onSave={onAcknowledge}
          onClose={closeDialog}
        />
      )}
    </div>
  );
}
