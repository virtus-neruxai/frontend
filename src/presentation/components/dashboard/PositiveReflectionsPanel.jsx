import { useState } from 'react';
import {
  BookOpen,
  CheckSquare,
  ChevronDown,
  Heart,
  MessageCircleHeart,
  RotateCcw,
  Sparkles,
  Target,
} from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import EmotionBadge from '../../../components/EmotionBadge';
import { getProfileEmoji, getProfileName } from '../../../lib/profileUtils';
import { PROFILE_THEMES } from '../../../theme/profileThemes';

const RANGE_OPTIONS = [
  { value: '7', label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' },
];

const SOURCE_CONFIG = {
  journal: { label: 'Diario', Icon: BookOpen },
  task: { label: 'Tarea', Icon: CheckSquare },
  mission: { label: 'Misión', Icon: Target },
  routine: { label: 'Rutina', Icon: RotateCcw },
};

function Skeleton({ className }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />;
}

function formatDate(value) {
  if (!value) return 'Fecha no registrada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no registrada';
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function ProfileBadge({ profile }) {
  const theme = profile ? PROFILE_THEMES[profile] : null;
  if (!theme) {
    return (
      <Badge variant="outline" className="text-xs text-muted-foreground">
        Perfil no registrado
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="text-xs"
      style={{
        color: theme.primary,
        borderColor: theme.primary,
        backgroundColor: theme.soft,
      }}
    >
      {getProfileEmoji(profile)} {getProfileName(profile)}
    </Badge>
  );
}

function MentorAnnotation({ annotation }) {
  const [expanded, setExpanded] = useState(false);
  if (!annotation) return null;
  const hasPreviewOverflow = annotation.length > 180;
  const text = expanded || !hasPreviewOverflow ? annotation : `${annotation.slice(0, 180).trimEnd()}…`;

  return (
    <div className="mt-3 rounded-lg border border-[hsl(var(--success))]/30 bg-[hsl(var(--success-soft))] p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--success))]">
        <MessageCircleHeart size={13} />
        Anotación del Mentor
      </div>
      <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground">{text}</p>
      {hasPreviewOverflow && (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-2 text-xs font-medium text-[hsl(var(--success))] hover:underline"
        >
          {expanded ? 'Ver menos' : 'Ver anotación completa'}
        </button>
      )}
    </div>
  );
}

function ReflectionEntry({ entry }) {
  const source = SOURCE_CONFIG[entry.reflection_type] || SOURCE_CONFIG.journal;
  const SourceIcon = source.Icon;
  return (
    <article className="rounded-lg border bg-background/70 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--success-soft))] text-[hsl(var(--success))]">
            <SourceIcon size={14} />
          </span>
          <span>
            {source.label}
            {entry.source_item_title ? ` · ${entry.source_item_title}` : ''}
          </span>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">{formatDate(entry.created_at)}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <ProfileBadge profile={entry.prompt_profile} />
        <EmotionBadge emotionSnapshot={entry.emotion_snapshot} />
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{entry.content}</p>
      <MentorAnnotation annotation={entry.mentor_annotation} />
    </article>
  );
}

function EmotionGroup({ group, initiallyOpen = false }) {
  const [open, setOpen] = useState(initiallyOpen);
  const countLabel = group.count === 1 ? 'reflexión' : 'reflexiones';
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border bg-card">
      <CollapsibleTrigger asChild>
        <button type="button" className="flex w-full items-center gap-3 p-4 text-left">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--success-soft))] text-lg">
            {group.emoji || '😊'}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">{group.emotion}</span>
            <span className="block text-xs text-muted-foreground">
              {group.count} {countLabel} · intensidad media {Number(group.average_intensity || 0).toFixed(1)} / 5
            </span>
          </span>
          <ChevronDown
            size={16}
            className={`shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-3 border-t px-3 pb-3 pt-3">
          {(group.entries || []).map((entry) => <ReflectionEntry key={entry.id} entry={entry} />)}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function PositiveReflectionsPanel({ data, loading, error, range = '7', onRangeChange, onRetry }) {
  if (loading && !data) {
    return (
      <section className="rounded-[8px] border bg-card p-5" data-testid="positive-reflections-panel">
        <Skeleton className="mb-4 h-6 w-52" />
        <Skeleton className="mb-3 h-4 w-full" />
        <Skeleton className="h-28 w-full" />
      </section>
    );
  }

  const groups = data?.by_emotion || [];
  const summary = data?.summary || {};
  const hasData = groups.length > 0;

  return (
    <section className="rounded-[8px] border bg-card p-5" data-testid="positive-reflections-panel">
      <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--success-soft))] text-[hsl(var(--success))]">
            <Heart size={18} />
          </span>
          <div>
            <h3 className="text-base font-semibold">Reflexiones positivas</h3>
            <p className="text-xs text-muted-foreground">
              Momentos que elegiste reconocer y que merece la pena recordar.
            </p>
          </div>
        </div>
        {onRangeChange && (
          <Select value={range} onValueChange={onRangeChange}>
            <SelectTrigger className="h-8 w-36 rounded-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          <p>{error}</p>
          {onRetry && (
            <button type="button" onClick={onRetry} className="mt-2 text-xs font-medium text-primary hover:underline">
              Reintentar
            </button>
          )}
        </div>
      ) : !hasData ? (
        <div className="py-8 text-center">
          <Sparkles className="mx-auto mb-2 text-[hsl(var(--success))]" size={22} />
          <p className="text-sm text-muted-foreground">
            Aún no has marcado reflexiones positivas en este periodo.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 mt-4 flex flex-wrap gap-2 text-xs">
            <Badge variant="outline" className="border-[hsl(var(--success))]/30 bg-[hsl(var(--success-soft))] text-[hsl(var(--success))]">
              {summary.total_reflections || 0} reflexiones positivas
            </Badge>
            <Badge variant="outline" className="text-muted-foreground">
              {summary.emotion_count || 0} {summary.emotion_count === 1 ? 'emoción' : 'emociones'}
            </Badge>
            <Badge variant="outline" className="text-muted-foreground">
              Intensidad media {Number(summary.average_intensity || 0).toFixed(1)} / 5
            </Badge>
          </div>
          {summary.truncated && (
            <p className="mb-3 text-xs text-muted-foreground">
              Mostrando las 500 reflexiones positivas más recientes del periodo.
            </p>
          )}
          <div className="space-y-3">
            {groups.map((group, index) => (
              <EmotionGroup key={group.emotion} group={group} initiallyOpen={index === 0} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
