/**
 * Pieces shared by DetectedPatternsPanel and EmotionalPatternsPanel.
 *
 * Both panels render the same shape — two columns of pattern chips over a
 * timeline of evidence — and differ only in what a "pattern" means: a friction
 * has a direction, an emotion has a direction *and* a polarity that decides
 * whether that direction is good news. Everything below is the part that does
 * not depend on that distinction, so it lives here once.
 *
 * What deliberately stays in each panel: `buildPatternGroups` (the emotional
 * one merges pattern metadata across events and picks a visual key; the
 * friction one does not) and the status-config maps, which are exactly where
 * the polarity judgement lives.
 */
import { Badge } from '../../../components/ui/badge';
import { MessageSquare, BookOpen, CheckSquare, Target, RotateCcw, Minus, TrendingUp } from 'lucide-react';

export function Skeleton({ className }) {
  return <div className={`animate-pulse bg-muted rounded ${className}`} />;
}

export const RANGE_OPTIONS = [
  { value: '7',  label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' },
];

export const SOURCE_LABELS = {
  chat_interaction:   { label: 'Chat',    icon: MessageSquare },
  journal_reflection: { label: 'Diario',  icon: BookOpen },
  task_reflection:    { label: 'Tarea',   icon: CheckSquare },
  mission_reflection: { label: 'Misión',  icon: Target },
  routine_reflection: { label: 'Rutina',  icon: RotateCcw },
};

// User-driven status labels (override auto-detected pattern_status)
export const USER_STATUS_CONFIG = {
  dismissed:  { label: 'Descartado',     color: 'text-muted-foreground', bg: 'bg-muted', Icon: Minus },
  1: { label: 'Apenas reconocido', color: 'text-[hsl(var(--info))]',    bg: 'bg-[hsl(var(--info-soft))]',    Icon: Minus },
  2: { label: 'Entendiendo',       color: 'text-[hsl(var(--info))]',    bg: 'bg-[hsl(var(--info-soft))]',    Icon: Minus },
  3: { label: 'Trabajando',        color: 'text-[hsl(var(--success))]', bg: 'bg-[hsl(var(--success-soft))]', Icon: TrendingUp },
  4: { label: 'Notando mejora',    color: 'text-[hsl(var(--success))]', bg: 'bg-[hsl(var(--success-soft))]', Icon: TrendingUp },
};

export function getUserDisplayStatus(item) {
  if (item.user_confirmed === false) return USER_STATUS_CONFIG.dismissed;
  if (item.user_progress != null && item.user_progress < 5) {
    return USER_STATUS_CONFIG[item.user_progress] || null;
  }
  return null;
}

/**
 * The badge markup both panels use. `hint` is optional: React drops a
 * `title={undefined}`, which is what the user-status variant wants.
 */
export function StatusBadge({ label, color, bg, Icon, hint }) {
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

/**
 * What the user said about the pattern wins over what we detected; when they
 * have said nothing, `fallback` (the panel's own trend badge) shows instead.
 */
export function UserStatusBadge({ item, fallback }) {
  const cfg = getUserDisplayStatus(item);
  if (!cfg) return fallback;
  return <StatusBadge {...cfg} />;
}

const COLUMN_TONES = {
  attention: { text: 'text-destructive', bg: 'bg-destructive/10' },
  improving: { text: 'text-[hsl(var(--success))]', bg: 'bg-[hsl(var(--success-soft))]' },
  negative: { text: 'text-destructive', bg: 'bg-destructive/10' },
  positive: { text: 'text-[hsl(var(--success))]', bg: 'bg-[hsl(var(--success-soft))]' },
};

export function PatternColumn({ testId, title, description, icon: Icon, tone, count, emptyHint, children }) {
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

export function ProgressDots({ progress }) {
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

export function SourceChips({ sources }) {
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
