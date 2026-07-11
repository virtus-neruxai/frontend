import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Badge } from '../../../components/ui/badge';
import { CheckSquare, Target } from 'lucide-react';
import { TASK_STATUS_COLORS } from '../../../theme/semanticTokens';

const STATUS_LABELS = {
  todo: 'Pendiente',
  in_progress: 'En progreso',
  done: 'Completada',
  blocked: 'Bloqueada',
  failed: 'Fallida',
};

const MISSION_STATUS_LABELS = {
  active: 'Activa',
  in_progress: 'En progreso',
  done: 'Completada',
  completed: 'Completada',
  failed: 'Fallida',
  expired: 'Expirada',
};

const MISSION_OVERDUE_COLOR = 'hsl(var(--destructive))';

const formatDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export function TaskListDialog({ open, onClose, title, tasks = [], onTaskClick }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80dvh] overflow-y-auto" data-testid="dashboard-task-list-dialog">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle style={{ fontFamily: 'var(--font-heading)' }}>{title}</DialogTitle>
            <Badge variant="secondary" className="text-xs">{tasks.length}</Badge>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-2 mt-2">
          {tasks.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Sin elementos para mostrar.
            </p>
          )}
          {tasks.map((task) => {
            const isMission = !!task._isMission;
            const clickable = !isMission || !!task._linkedTaskId;
            const statusColor = isMission
              ? MISSION_OVERDUE_COLOR
              : (TASK_STATUS_COLORS[task.status] || TASK_STATUS_COLORS.todo);
            const statusLabel = isMission ? MISSION_STATUS_LABELS[task.status] : STATUS_LABELS[task.status];

            return (
              <button
                key={task.id}
                onClick={() => clickable && onTaskClick(task)}
                disabled={!clickable}
                className={[
                  'w-full text-left rounded-lg border bg-card transition-colors overflow-hidden',
                  clickable ? 'hover:bg-muted/50' : 'opacity-70 cursor-not-allowed',
                ].join(' ')}
                data-testid={`dashboard-task-list-item-${task.id}`}
              >
                <div className="flex">
                  <div className="w-1 shrink-0" style={{ backgroundColor: statusColor }} />
                  <div className="p-3 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isMission ? (
                        <Target className="w-3.5 h-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
                      ) : (
                        <CheckSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
                      )}
                      <span className="text-sm font-medium text-foreground truncate">{task.title}</span>
                    </div>
                    {(task.date_end || task.date_start) && (
                      <p className="text-xs text-muted-foreground mt-0.5 pl-5">
                        {isMission ? 'Vence: ' : ''}{formatDate(task.date_end || task.date_start)}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1 pl-5 flex-wrap">
                      {isMission && (
                        <span className="text-[10px] text-muted-foreground">Misión</span>
                      )}
                      {task.domain && (
                        <span className="text-[10px] text-muted-foreground">{task.domain}</span>
                      )}
                      {statusLabel && (
                        <span className="text-[11px] font-medium" style={{ color: statusColor }}>
                          {isMission ? '· ' : ''}{statusLabel}
                        </span>
                      )}
                      {isMission && !task._linkedTaskId && (
                        <span className="text-[10px] text-muted-foreground italic">Sin tarea vinculada</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
