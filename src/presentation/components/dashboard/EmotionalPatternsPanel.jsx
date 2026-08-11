import { useState } from 'react';
import { Badge } from '../../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../components/ui/collapsible';
import { TrendingUp, TrendingDown, Minus, MessageSquare, BookOpen, CheckSquare, Target, RotateCcw, ChevronDown, CheckCircle2, Pencil, X, Info, Smile, Frown, Meh } from 'lucide-react';
import { partitionEmotionalGroups } from '../../../lib/patternPartition';
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
// badge, regardless of polarity — there isn't enough sample to claim anything.
//
// Every other status is polarity-aware. The backend only reports a *direction*
// (backend/services/pattern_trend.py) because whether that direction is good
// news depends on the emotion: a fading positive emotion is not "Mejorando",
// and a growing one is not a relapse. Only this layer knows the polarity, so
// only this layer turns direction into judgement.
const WEAK_STATUS_CONFIG = { label: 'Señal inicial', color: 'text-[hsl(var(--info))]', bg: 'bg-[hsl(var(--info-soft))]', Icon: Minus, hint: 'Aún hay pocas evidencias para afirmar nada.' };
const STEADY_CONFIG = { label: 'Estable', color: 'text-[hsl(var(--info))]', bg: 'bg-[hsl(var(--info-soft))]', Icon: Minus, hint: 'Se repite con intensidad suave y sin cambios.' };

const STATUS_BY_POLARITY = {
  active: {
    positive: { label: 'Presente',       color: 'text-[hsl(var(--success))]',  bg: 'bg-[hsl(var(--success-soft))]', Icon: Minus, hint: 'Se repite con fuerza y se mantiene.' },
    other:    { label: 'Activo',         color: 'text-destructive',            bg: 'bg-destructive/10',             Icon: Minus, hint: 'Se repite con fuerza y no está bajando.' },
  },
  easing: {
    positive: { label: 'Se está apagando', color: 'text-[hsl(var(--warning))]', bg: 'bg-[hsl(var(--warning-soft))]', Icon: TrendingDown, hint: 'Esta emoción aparece con menos fuerza que antes.' },
    other:    { label: 'Mejorando',        color: 'text-[hsl(var(--success))]', bg: 'bg-[hsl(var(--success-soft))]', Icon: TrendingDown, hint: 'Esta emoción aparece con menos fuerza que antes.' },
  },
  intensifying: {
    positive: { label: 'Creciendo',      color: 'text-[hsl(var(--success))]',  bg: 'bg-[hsl(var(--success-soft))]', Icon: TrendingUp, hint: 'Esta emoción aparece con más fuerza que antes.' },
    other:    { label: 'Se intensifica', color: 'text-destructive',            bg: 'bg-destructive/10',             Icon: TrendingUp, hint: 'Esta emoción aparece con más fuerza que antes.' },
  },
};

function getStatusConfig(status, polarity) {
  if (status === 'steady') return STEADY_CONFIG;
  const byPolarity = STATUS_BY_POLARITY[status];
  // Unknown status → neutral. Snapshots persist pattern_status, so a cache
  // written before the trend rule landed must not render as a red "Activo".
  if (!byPolarity) return WEAK_STATUS_CONFIG;
  return polarity === 'positive' ? byPolarity.positive : byPolarity.other;
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
  const { label, color, bg, Icon, hint } = getStatusConfig(status, polarity);
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${color} ${bg}`}
      title={hint}
    >
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

const COLUMN_TONES = {
  positive: { text: 'text-[hsl(var(--success))]', bg: 'bg-[hsl(var(--success-soft))]' },
  negative: { text: 'text-destructive', bg: 'bg-destructive/10' },
};

function PatternColumn({ testId, title, description, icon: Icon, tone, count, emptyHint, children }) {
  const { text, bg } = COLUMN_TONES[tone];
  return (
    // min-w-0 is load-bearing: without it a long label refuses to shrink inside
    // its grid track and pushes the column out.
    <section data-testid={testId} className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${bg}`}>
          <Icon size={14} className={text} />
        </span>
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <Badge variant="outline" className="text-xs">{count}</Badge>
      </div>
      <p className="-mt-1 text-xs text-muted-foreground">{description}</p>
      {count > 0 ? (
        <div className="flex flex-col gap-3">{children}</div>
      ) : (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{emptyHint}</p>
      )}
    </section>
  );
}

function NeutralSection({ groups, defaultOpen, divided, onEdit }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!groups.length) return null;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={divided ? 'mt-4 border-t pt-4' : ''}
      data-testid="emotional-neutral-section"
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="flex items-center gap-2">
            <Meh size={14} />
            Neutras
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs font-semibold">
              {groups.length}
            </span>
          </span>
          <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3">
        {/* Worded to cover both a catalogued neutral emotion and a pattern
            whose polarity never resolved — both land here. */}
        <p className="mb-3 text-xs text-muted-foreground">
          Ni suman ni restan, o su tono aún no está claro.
        </p>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {groups.map((group) => (
            <PatternEvidenceGroup key={group.key} group={group} onEdit={onEdit} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
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

function TimelineEvent({ event, positive = false }) {
  const source = SOURCE_LABELS[event.source_type] || { label: event.source_type, icon: BookOpen };
  const SourceIcon = source.icon;
  return (
    <div className={`flex gap-3 py-3 ${positive ? 'my-2 rounded-lg border border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/10 px-3' : 'border-b last:border-0'}`}>
      <div className={`mt-0.5 p-1.5 rounded-md shrink-0 ${positive ? 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]' : 'bg-muted text-muted-foreground'}`}>
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
          <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${positive ? 'bg-[hsl(var(--success))]/15 text-foreground' : 'text-muted-foreground bg-muted'}`}>
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

  // `seed` is the event that first created a group that has no persisted
  // counterpart in by_pattern. Its emoji and polarity have to be carried over:
  // polarity decides which column the card lands in, so a synthesized meta
  // without it would silently drop every timeline-only pattern into «Neutras».
  const ensureGroup = (patternKey, fallbackLabel = null, seed = null) => {
    if (!patternKey) return null;
    if (!groupMap.has(patternKey)) {
      const meta = patternMeta.get(patternKey);
      groupMap.set(patternKey, {
        key: patternKey,
        meta: meta || {
          pattern_key: patternKey,
          label: fallbackLabel || patternKey,
          emoji: seed?.emoji || null,
          polarity: seed?.polarity || null,
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
    const group = ensureGroup(patternKey, getEventPatternLabel(event, patternKey), event);
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

function PatternEvidenceGroup({ group, defaultOpen = false, onEdit }) {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = defaultOpen || open;
  const item = group.meta;
  const eventCount = group.events.length;
  const isPositive = item.polarity === 'positive';

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setOpen}
      className={`rounded-lg border overflow-hidden ${isPositive ? 'border-[hsl(var(--success))]/50 bg-[hsl(var(--success-soft))]' : 'bg-card'}`}
      data-testid={`emotional-pattern-group-${item.pattern_key}`}
    >
      <div className="flex items-start gap-3 p-3">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex flex-1 items-start justify-between gap-3 text-left"
          >
            <div className="flex min-w-0 flex-1 items-start gap-3">
              {/* Rail rather than a text prefix, mirroring the friction panel's
                  icon: the label wraps cleanly and a screen reader no longer
                  announces the emoji before an already-labelled emotion. */}
              <span
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-base leading-none ${isPositive ? 'bg-[hsl(var(--success-soft))] text-[hsl(var(--success))]' : 'bg-muted'}`}
                aria-hidden="true"
              >
                {item.emoji || '·'}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
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
            </div>
            <ChevronDown size={16} className={`mt-0.5 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </CollapsibleTrigger>
        {/* A sibling of the trigger, not nested inside it — a button inside a
            button is invalid HTML and would fire both handlers on one tap.
            Always visible: the chip's pencil is easy to miss entirely. */}
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Pencil size={12} /> Editar
          </button>
        )}
      </div>
      <CollapsibleContent>
        <div className={`border-t px-3 ${isPositive ? 'border-[hsl(var(--success))]/30 bg-[hsl(var(--success-soft))]' : ''}`}>
          {group.events.map((event) => (
            <TimelineEvent
              key={`${group.key}-${event.source_type}-${event.id}-${event.created_at}`}
              event={event}
              positive={isPositive}
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

  const buckets = partitionEmotionalGroups(groupedTimeline);
  const hasPolarised = buckets.positive.length > 0 || buckets.negative.length > 0;

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

          {/* Timeline. Selecting a chip means "only this one", so focus mode
              drops the columns: a two-column grid with a single card in it
              reads as broken. */}
          {selectedPatternKey ? (
            groupedTimeline.length > 0 ? (
              <div className="space-y-3">
                {groupedTimeline.map((group) => (
                  <PatternEvidenceGroup key={group.key} group={group} defaultOpen onEdit={openDialog} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No hay evidencias de este patrón en el periodo seleccionado.
              </p>
            )
          ) : (
            <>
              {hasPolarised && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <PatternColumn
                    testId="emotional-column-positive"
                    title="Te impulsan"
                    description="Aparecen y te dan impulso."
                    icon={Smile}
                    tone="positive"
                    count={buckets.positive.length}
                    emptyHint="Aún no hay emociones positivas recurrentes."
                  >
                    {buckets.positive.map((group) => (
                      <PatternEvidenceGroup key={group.key} group={group} onEdit={openDialog} />
                    ))}
                  </PatternColumn>
                  <PatternColumn
                    testId="emotional-column-negative"
                    title="Te pesan"
                    description="Aparecen y te cuestan."
                    icon={Frown}
                    tone="negative"
                    count={buckets.negative.length}
                    emptyHint="Aún no hay emociones difíciles recurrentes."
                  >
                    {buckets.negative.map((group) => (
                      <PatternEvidenceGroup key={group.key} group={group} onEdit={openDialog} />
                    ))}
                  </PatternColumn>
                </div>
              )}
              {/* With nothing polarised, the columns would be two empty boxes.
                  Degrade to the flat list plus one line of explanation. */}
              <NeutralSection
                groups={buckets.neutral}
                defaultOpen={!hasPolarised}
                divided={hasPolarised}
                onEdit={openDialog}
              />
              {groupedTimeline.length === 0 && timeline.length > 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No hay evidencias de este patrón en el periodo seleccionado.
                </p>
              )}
            </>
          )}

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
