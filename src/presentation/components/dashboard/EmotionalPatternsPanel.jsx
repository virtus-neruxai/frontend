import { useState } from 'react';
import { Badge } from '../../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../components/ui/collapsible';
import { TrendingUp, TrendingDown, Minus, BookOpen, CheckSquare, Target, RotateCcw, ChevronDown, CheckCircle2, Pencil, X, Info } from 'lucide-react';
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

function RelatedSignalsNote({ byPattern }) {
  const withRelated = (byPattern || []).filter((item) => item.related_signals?.length);
  if (!withRelated.length) return null;
  return (
    <div className="mb-4 space-y-1">
      {withRelated.map((item) => (
        <p key={item.pattern_key} className="text-xs text-muted-foreground">
          <span className="font-medium">{item.emoji ? `${item.emoji} ` : ''}{item.label}:</span>{' '}
          {item.related_signals.join(' · ')}
        </p>
      ))}
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

  const filteredTimeline = selectedPatternKey
    ? timeline.filter(evt => evt.pattern_keys?.includes(selectedPatternKey))
    : timeline;

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
          {byPattern.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {byPattern.map((p) => (
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

          <RelatedSignalsNote byPattern={byPattern} />

          {/* Timeline */}
          {filteredTimeline.length > 0 ? (
            <div className="divide-y divide-border">
              {filteredTimeline.map((evt) => (
                <TimelineEvent key={`${evt.source_type}-${evt.id}-${evt.created_at}`} event={evt} />
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
