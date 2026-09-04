import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { ActiveItemsPanel } from '../../presentation/components/calendar/ActiveItemsPanel';

// Mirrors HealthTaskKind in shared/shared/models/health_guidance.py.
const TASK_KINDS = [
  ['activity', 'Actividad', 'Algo que haces: entrenar, caminar, cocinar'],
  ['followup', 'Seguimiento', 'Algo que gestionas: analítica, cita, revisión'],
];

/**
 * Same task picker as "Activos" on Tareas/Calendario
 * (`presentation/components/calendar/ActiveItemsPanel.jsx`) — same filters
 * (tipo, fechas, límite) and the same per-item date/type/status/perfil badges
 * — reused rather than rebuilt, wrapped in a dialog and pointed at "pick one
 * to link" instead of "open its detail".
 *
 * The kind selector rides along because linking is the moment the person is
 * already thinking about what this task *is*. It is optional: leaving it unset
 * files the task as unclassified, which the report reports as unclassified
 * rather than guessing. Guessing from the title is how a blood test ends up in
 * the same list as a walking routine.
 */
export default function HealthLinkTaskDialog({ open, onClose, activity, tasks, onLinkTask }) {
  const [taskKind, setTaskKind] = useState(null);

  // Already-linked tasks aren't offered again — linking stays one explicit
  // choice of one task per click, never a re-pick of something already tied
  // to a record.
  const linkable = tasks.filter((t) => !t.health_activity_id);

  const close = () => {
    setTaskKind(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="sm:max-w-lg max-h-[80dvh] overflow-y-auto" data-testid="health-link-task-dialog">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'var(--font-heading)' }}>
            Enlazar tarea{activity?.title ? ` a "${activity.title}"` : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Label>¿Qué tipo de compromiso es? (opcional)</Label>
          <div className="flex flex-wrap gap-2">
            {TASK_KINDS.map(([value, label, hint]) => (
              <button
                key={value}
                type="button"
                title={hint}
                onClick={() => setTaskKind(taskKind === value ? null : value)}
                data-testid={`health-task-kind-${value}`}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  taskKind === value
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Separa el entrenamiento de los seguimientos médicos en el informe. Si lo
            dejas en blanco, aparece sin clasificar.
          </p>
        </div>

        <ActiveItemsPanel
          tasks={linkable}
          onItemClick={(item) => {
            onLinkTask(activity, item.id, taskKind);
            close();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
