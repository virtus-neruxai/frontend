import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { ActiveItemsPanel } from '../../presentation/components/calendar/ActiveItemsPanel';

/**
 * Same task picker as "Activos" on Tareas/Calendario
 * (`presentation/components/calendar/ActiveItemsPanel.jsx`) — same filters
 * (tipo, fechas, límite) and the same per-item date/type/status/perfil badges
 * — reused rather than rebuilt, wrapped in a dialog and pointed at "pick one
 * to link" instead of "open its detail".
 */
export default function HealthLinkTaskDialog({ open, onClose, activity, tasks, onLinkTask }) {
  // Already-linked tasks aren't offered again — linking stays one explicit
  // choice of one task per click, never a re-pick of something already tied
  // to a record.
  const linkable = tasks.filter((t) => !t.health_activity_id);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[80dvh] overflow-y-auto" data-testid="health-link-task-dialog">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'var(--font-heading)' }}>
            Enlazar tarea{activity?.title ? ` a "${activity.title}"` : ''}
          </DialogTitle>
        </DialogHeader>
        <ActiveItemsPanel
          tasks={linkable}
          onItemClick={(item) => {
            onLinkTask(activity, item.id);
            onClose();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
