import { useMemo, useState } from 'react';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../../components/ui/alert-dialog';
import { ChevronDown, CheckCircle2, Trash2, CheckSquare, Repeat, Calendar } from 'lucide-react';
import { ProjectItemRow } from './ProjectItemRow';
import { formatDateRange, statusMeta } from '../../../lib/projectItems';
import { getProfileName, getProfileEmoji } from '../../../lib/profileUtils';
import { PROFILE_THEMES } from '../../../theme/profileThemes';

const clampPct = (n) => Math.max(0, Math.min(100, Number(n) || 0));

export function ProjectCard({ project, busy, onComplete, onDelete, onItemClick }) {
  const [open, setOpen] = useState(false);
  const children = project.children || [];
  const metrics = project.metrics || {};
  const isCompleted = String(project.status || '').toLowerCase() === 'completed';
  const overall = clampPct(metrics.overall_progress);

  const taskCount = children.filter((c) => c.task_kind !== 'routine').length;
  const routineCount = children.filter((c) => c.task_kind === 'routine').length;

  // Group children by phase_label, preserving order (children arrive sorted by
  // date_start, and phases are chronological).
  const phases = useMemo(() => {
    const groups = [];
    const byLabel = new Map();
    children.forEach((c) => {
      const label = c.phase_label || '';
      if (!byLabel.has(label)) {
        const g = { label, items: [] };
        byLabel.set(label, g);
        groups.push(g);
      }
      byLabel.get(label).items.push(c);
    });
    return groups;
  }, [children]);

  const profile = project.prompt_profile;
  const profileTheme = profile && PROFILE_THEMES[profile];
  const statusBadge = isCompleted
    ? { label: 'Finalizado', color: statusMeta('done').color }
    : { label: 'En curso', color: statusMeta('in_progress').color };
  const barColor = isCompleted ? statusMeta('done').color : 'hsl(var(--primary))';

  return (
    <Card className="overflow-hidden">
      {/* ── Header (clickable) ─────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left p-4 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ color: statusBadge.color, backgroundColor: 'color-mix(in srgb, currentColor 14%, transparent)' }}
              >
                {statusBadge.label}
              </span>
              <h3 className="truncate text-base font-bold text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                {project.title}
              </h3>
            </div>
            {project.goal_statement && (
              <p className="mt-1 truncate text-sm text-muted-foreground italic">🎯 {project.goal_statement}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDateRange(project.start_date, project.end_date)}
              </span>
              {project.domain && <Badge variant="outline" className="text-[10px]">{project.domain}</Badge>}
              {profileTheme && (
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                  style={{ color: profileTheme.primary, backgroundColor: profileTheme.soft }}
                >
                  {getProfileEmoji(profile)} {getProfileName(profile)}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="text-lg font-bold text-foreground">{overall.toFixed(0)}%</span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-[width]"
            style={{ width: `${overall}%`, backgroundColor: barColor }}
          />
        </div>

        {/* Composition summary */}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CheckSquare className="h-3.5 w-3.5" style={{ color: statusMeta('todo').color }} />
            {metrics.tasks_done ?? 0}/{metrics.tasks_total ?? taskCount} tareas
          </span>
          <span className="inline-flex items-center gap-1">
            <Repeat className="h-3.5 w-3.5" style={{ color: statusMeta('in_progress').color }} />
            {routineCount} rutina{routineCount === 1 ? '' : 's'}
          </span>
        </div>
      </button>

      {/* ── Expanded: children grouped by phase + actions ──────────────── */}
      {open && (
        <div className="border-t bg-muted/20 px-4 py-4 space-y-4">
          {children.length === 0 && (
            <p className="text-sm text-center text-muted-foreground py-2">
              Este proyecto no tiene elementos.
            </p>
          )}

          {phases.map((phase, idx) => (
            <div key={phase.label || `phase-${idx}`} className="space-y-2">
              {phase.label && (
                <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {phase.label}
                </p>
              )}
              <div className="space-y-2">
                {phase.items.map((child) => (
                  <ProjectItemRow key={child.id} item={child} onClick={() => onItemClick?.(child)} />
                ))}
              </div>
            </div>
          ))}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            {!isCompleted && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={busy}>
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    Finalizar proyecto
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Finalizar este proyecto?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se marcará como finalizado y sus rutinas dejarán de repetirse a partir de hoy.
                      Las tareas pendientes se conservan.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onComplete(project.id)}>Finalizar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={busy}>
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Eliminar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar el proyecto y sus elementos?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esto borra el proyecto <strong>{project.title}</strong> y sus {children.length} tareas/rutinas.
                    Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => onDelete(project.id)}
                  >
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </Card>
  );
}
