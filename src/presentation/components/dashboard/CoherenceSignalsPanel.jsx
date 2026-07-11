import { useState } from 'react';
import { Badge } from '../../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../components/ui/collapsible';
import { AlertTriangle, Brain, CheckCircle2, ChevronDown, Compass, MessageSquare, Minus, X } from 'lucide-react';

function Skeleton({ className }) {
  return <div className={`animate-pulse bg-muted rounded ${className}`} />;
}

const RANGE_OPTIONS = [
  { value: '7',  label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' },
];

const STATUS_CONFIG = {
  aligned: {
    label: 'Alineado',
    color: 'text-[hsl(var(--success))]',
    bg: 'bg-[hsl(var(--success-soft))]',
    Icon: CheckCircle2,
  },
  drifting: {
    label: 'Deriva',
    color: 'text-[hsl(var(--warning))]',
    bg: 'bg-[hsl(var(--warning-soft))]',
    Icon: Compass,
  },
  contradiction: {
    label: 'Contradicción',
    color: 'text-destructive',
    bg: 'bg-destructive/10',
    Icon: AlertTriangle,
  },
  unknown: {
    label: 'Evidencia insuficiente',
    color: 'text-muted-foreground',
    bg: 'bg-muted',
    Icon: Minus,
  },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.unknown;
  const { label, color, bg, Icon } = cfg;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${color} ${bg}`}>
      <Icon size={11} />
      {label}
    </span>
  );
}

function SummaryRow({ summary }) {
  if (!summary) return null;
  return (
    <div className="flex flex-wrap gap-4 text-sm mb-4">
      {summary.top_signal_label && (
        <div>
          <span className="text-muted-foreground">Señal principal: </span>
          <span className="font-medium">{summary.top_signal_label}</span>
        </div>
      )}
      {summary.strongest_status_label && (
        <div>
          <span className="text-muted-foreground">Estado dominante: </span>
          <span className="font-medium">{summary.strongest_status_label}</span>
        </div>
      )}
      {summary.signal_events > 0 && (
        <div>
          <span className="text-muted-foreground">Señales: </span>
          <span className="font-medium">{summary.signal_events}</span>
        </div>
      )}
      {summary.aligned_events > 0 && (
        <div>
          <span className="text-muted-foreground">Alineadas: </span>
          <span className="font-medium">{summary.aligned_events}</span>
        </div>
      )}
      {summary.is_live && (
        <Badge variant="outline" className="text-xs text-muted-foreground">
          Datos en directo
        </Badge>
      )}
    </div>
  );
}

function SignalChip({ item, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.signal)}
      className={`inline-flex items-center gap-1 text-xs rounded-full px-2.5 py-1.5 font-medium transition-all border cursor-pointer
        ${selected ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/60 text-foreground border-transparent hover:border-border'}`}
      title="Filtrar evidencias por esta señal"
    >
      <span>{item.label}</span>
      <span className={selected ? 'opacity-80' : 'opacity-60'}>×{item.count}</span>
    </button>
  );
}

function TimelineEvent({ event }) {
  return (
    <div className="flex gap-3 py-3 border-b last:border-0">
      <div className="mt-0.5 p-1.5 rounded-md bg-muted text-muted-foreground shrink-0">
        <MessageSquare size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium truncate">{event.label}</span>
          <StatusBadge status={event.status} />
        </div>
        {event.tension && (
          <p className="text-xs text-muted-foreground mt-1">{event.tension}</p>
        )}
        {event.course_correction && (
          <p className="text-xs text-foreground mt-1">
            <span className="font-medium">Rumbo: </span>{event.course_correction}
          </p>
        )}
        {event.excerpt && (
          <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2">
            &ldquo;{event.excerpt}&rdquo;
          </p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">Mentor</span>
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

function buildSignalGroups(timeline = [], bySignal = [], selectedSignal = null) {
  const signalMeta = new Map((bySignal || []).map((item) => [item.signal, item]));
  const groupMap = new Map();

  const ensureGroup = (signalKey, fallbackLabel = null) => {
    if (!signalKey) return null;
    if (!groupMap.has(signalKey)) {
      const meta = signalMeta.get(signalKey);
      groupMap.set(signalKey, {
        key: signalKey,
        meta: meta || {
          signal: signalKey,
          label: fallbackLabel || signalKey,
          count: 0,
          description: '',
          status_counts: {},
        },
        events: [],
      });
    }
    return groupMap.get(signalKey);
  };

  if (selectedSignal) {
    ensureGroup(selectedSignal);
    timeline.forEach((event) => {
      if (event.signals?.includes(selectedSignal)) {
        ensureGroup(selectedSignal, event.label)?.events.push(event);
      }
    });
    return Array.from(groupMap.values()).filter((group) => group.events.length > 0);
  }

  bySignal.forEach((item) => ensureGroup(item.signal));
  timeline.forEach((event) => {
    (event.signals || []).forEach((signal) => {
      ensureGroup(signal, event.label)?.events.push(event);
    });
  });

  return Array.from(groupMap.values())
    .filter((group) => group.events.length > 0 || group.meta.count > 0)
    .sort((a, b) => {
      const countDiff = (b.meta.count || b.events.length) - (a.meta.count || a.events.length);
      if (countDiff !== 0) return countDiff;
      const latestA = a.events[0]?.created_at || '';
      const latestB = b.events[0]?.created_at || '';
      return String(latestB).localeCompare(String(latestA));
    });
}

function SignalEvidenceGroup({ group, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const item = group.meta;
  const eventCount = group.events.length;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-lg border bg-card overflow-hidden"
      data-testid={`coherence-signal-group-${item.signal}`}
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
                <span className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {eventCount} {eventCount === 1 ? 'entrada' : 'entradas'}
                </span>
              </div>
              {item.description && (
                <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
              )}
            </div>
            <ChevronDown size={16} className={`mt-0.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="border-t px-3">
          {group.events.map((event) => (
            <TimelineEvent key={`${group.key}-${event.id}-${event.created_at}`} event={event} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function CoherenceSignalsPanel({ data, loading, range = '7', onRangeChange }) {
  const [selectedSignal, setSelectedSignal] = useState(null);

  const toggleSignal = (signalKey) => {
    setSelectedSignal(prev => prev === signalKey ? null : signalKey);
  };

  if (loading) {
    return (
      <div className="rounded-[8px] border bg-card p-5" data-testid="coherence-signals-panel">
        <Skeleton className="h-5 w-48 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-4" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const timeline = data?.timeline || [];
  const summary = data?.summary || {};
  const bySignal = data?.by_signal || [];
  const filteredTimeline = selectedSignal
    ? timeline.filter(evt => evt.signals?.includes(selectedSignal))
    : timeline;
  const groupedTimeline = buildSignalGroups(filteredTimeline, bySignal, selectedSignal);
  const alignedOnly = timeline.length > 0 && bySignal.length === 0;
  const hasData = timeline.length > 0 || bySignal.length > 0;

  return (
    <div className="rounded-[8px] border bg-card p-5" data-testid="coherence-signals-panel">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Brain size={17} className="text-primary" />
          <h3 className="font-semibold text-base">Señales de coherencia</h3>
        </div>
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
      <p className="text-xs text-muted-foreground mb-4">
        Lectura vital del Mentor: distancia entre identidad, dirección, emociones y conducta reciente. Solo lectura.
      </p>

      {!hasData ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Aún no hay señales de coherencia en este periodo.
        </p>
      ) : (
        <>
          <SummaryRow summary={summary} />

          {bySignal.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {bySignal.map((signal) => (
                <SignalChip
                  key={signal.signal}
                  item={signal}
                  selected={selectedSignal === signal.signal}
                  onSelect={toggleSignal}
                />
              ))}
              {selectedSignal && (
                <button
                  type="button"
                  onClick={() => setSelectedSignal(null)}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted cursor-pointer"
                >
                  <X size={10} /> Ver todos
                </button>
              )}
            </div>
          )}

          {groupedTimeline.length > 0 ? (
            <div className="space-y-3">
              {groupedTimeline.map((group) => (
                <SignalEvidenceGroup
                  key={group.key}
                  group={group}
                  defaultOpen={!!selectedSignal}
                />
              ))}
            </div>
          ) : alignedOnly ? (
            <div className="divide-y divide-border">
              {timeline.map((event) => (
                <TimelineEvent key={`${event.id}-${event.created_at}`} event={event} />
              ))}
            </div>
          ) : timeline.length > 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No hay evidencias de esta señal en el periodo seleccionado.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
