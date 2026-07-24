import { Calendar, Repeat, Flame } from 'lucide-react';
import {
  kindMeta,
  statusMeta,
  isDone,
  recurrenceSummary,
  formatItemDatetime,
} from '../../../lib/projectItems';

/**
 * One created project child (task or routine) with its live status.
 *
 * The visual language is deliberately explicit about the three things asked
 * for: (1) task vs routine — icon + colored strip + kind chip; (2) status —
 * a coloured status chip (Pendiente / En progreso / Finalizado…); (3) dates —
 * a single datetime for tasks, weekday recurrence + "hasta" for routines.
 *
 * Clicking the row opens it for editing (onClick), same interaction as
 * ActiveItemsPanel on the Tareas/Calendario page — the caller wires it to
 * TaskModal since project children are plain items under /items.
 */
export function ProjectItemRow({ item, onClick }) {
  const kind = kindMeta(item.task_kind);
  const status = statusMeta(item.status);
  const isRoutine = item.task_kind === 'routine';
  const done = isDone(item);
  const KindIcon = kind.Icon;

  // The left strip carries the status colour — it's the fastest "estado" cue.
  const stripColor = done ? statusMeta('done').color : status.color;

  const completionRate = Number(item.routine_completion_rate ?? item.completion_rate ?? 0);
  const streak = Number(item.routine_streak ?? item.streak ?? 0);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full overflow-hidden rounded-lg border bg-card text-left hover:bg-muted/50 transition-colors"
    >
      <div className="w-1.5 shrink-0" style={{ backgroundColor: stripColor }} />
      <div className="min-w-0 flex-1 p-3">
        <div className="flex items-start gap-2">
          <KindIcon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: kind.color }} />
          <span
            className={`min-w-0 flex-1 text-sm font-medium ${done ? 'text-muted-foreground line-through' : 'text-foreground'}`}
          >
            {item.title}
          </span>
          {/* Status chip — the headline "estado" */}
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ color: status.color, backgroundColor: 'color-mix(in srgb, currentColor 14%, transparent)' }}
          >
            {status.label}
          </span>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 pl-6 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1" style={{ color: kind.color }}>
            {kind.label}
          </span>
          {isRoutine ? (
            <>
              <span className="inline-flex items-center gap-1">
                <Repeat className="h-3 w-3" />
                {recurrenceSummary(item.recurrence_rule)}
              </span>
              <span>{completionRate.toFixed(0)}% cumplida</span>
              {streak > 0 && (
                <span className="inline-flex items-center gap-1 text-[hsl(var(--warning))]">
                  <Flame className="h-3 w-3" />
                  {streak}
                </span>
              )}
            </>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatItemDatetime(item.date_start)}
            </span>
          )}
        </div>

        {/* Routine completion bar — richer than a status chip for recurring work */}
        {isRoutine && (
          <div className="mt-2 ml-6 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-[width]"
              style={{
                width: `${Math.max(0, Math.min(100, completionRate))}%`,
                backgroundColor: kind.color,
              }}
            />
          </div>
        )}

        {item.description && (
          <p className="mt-2 pl-6 text-xs text-muted-foreground line-clamp-2">{item.description}</p>
        )}
      </div>
    </button>
  );
}
