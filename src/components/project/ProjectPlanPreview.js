import { Clock, CheckCircle2, AlertTriangle, ArrowRight, PlusCircle } from 'lucide-react';

const PHASE_LABELS = {
  INTAKE: 'Recopilando información',
  REFINEMENT: 'Refinando alcance',
  PLANNING: 'Generando plan',
  REVIEW: 'Revisando plan',
  FINALIZE: 'Finalizando',
  CONFIRMED: 'Proyecto confirmado',
};

const CONFIDENCE_COLORS = {
  low: 'text-orange-500',
  medium: 'text-yellow-500',
  high: 'text-green-500',
};

function formatDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString('es-ES', {
      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return null;
  }
}

export default function ProjectPlanPreview({ plan, phase, onConfirm, onReject, onConfirmPlan, onNewProject, draftId }) {
  if (!plan && !phase) return null;

  const isConfirmed = phase === 'CONFIRMED';
  const tasks = plan?.tasks || [];
  const totalMinutes = plan?.total_estimated_minutes || 0;
  const totalHours = (totalMinutes / 60).toFixed(1);
  const warnings = plan?.validation_warnings || [];
  const hasTasks = tasks.length > 0;
  const hasAssignedDates = tasks.some(t => t.date_start);

  return (
    <div className="flex h-full flex-col">
      {/* Phase indicator */}
      <div className="border-b p-4">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${isConfirmed ? 'bg-green-500' : phase === 'FINALIZE' ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}`} />
          <span className={`text-sm font-medium ${isConfirmed ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
            {PHASE_LABELS[phase] || phase}
          </span>
          {isConfirmed && (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
        </div>
        {tasks.length > 0 && (
          <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
            <span>{tasks.length} tareas</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {totalHours}h estimadas
            </span>
          </div>
        )}
      </div>

      {/* Task list */}
      {tasks.length > 0 && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {tasks.map((task, i) => (
              <div
                key={task.task_index || i}
                className="rounded-lg border bg-card p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                        {task.task_index || i + 1}
                      </span>
                      <h4 className="text-sm font-medium">{task.title}</h4>
                    </div>
                    {task.description && (
                      <p className="mt-1 pl-7 text-xs text-muted-foreground">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-muted-foreground">
                      {task.estimated_minutes} min
                    </span>
                    <span className={`text-xs ${CONFIDENCE_COLORS[task.estimate_confidence] || ''}`}>
                      {task.estimate_confidence}
                    </span>
                  </div>
                </div>

                {/* Assigned date */}
                {task.date_start && (
                  <div className="mt-2 pl-7 text-xs text-blue-600 dark:text-blue-400">
                    {formatDate(task.date_start)}
                    {task.date_end && ` → ${formatDate(task.date_end)}`}
                  </div>
                )}

                {/* Dependencies */}
                {task.dependency_indices?.length > 0 && (
                  <div className="mt-1 flex items-center gap-1 pl-7">
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Depende de: {task.dependency_indices.join(', ')}
                    </span>
                  </div>
                )}

                {/* Domain badge */}
                {task.domain && task.domain !== 'Personal' && (
                  <div className="mt-1 pl-7">
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                      {task.domain}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950/30">
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Avisos</span>
              </div>
              <ul className="mt-2 space-y-1">
                {warnings.map((w, i) => (
                  <li key={i} className="text-xs text-orange-600 dark:text-orange-400">
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {tasks.length === 0 && (
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="text-center text-sm text-muted-foreground">
            El plan de tareas aparecerá aquí cuando el agente lo genere.
          </p>
        </div>
      )}

      {/* Action bar — shown whenever there are tasks */}
      {hasTasks && (
        <div className="border-t p-4 space-y-2">
          {isConfirmed ? (
            <div className="space-y-2">
              <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-3 py-2 text-xs text-green-700 dark:text-green-300">
                Proyecto en calendario — puedes pedir cambios a las tareas existentes en el chat.
              </div>
              <button
                onClick={onNewProject}
                className="w-full rounded-lg border border-dashed px-4 py-2 text-sm text-muted-foreground hover:bg-accent flex items-center justify-center gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                Nuevo Proyecto
              </button>
            </div>
          ) : (
            <>
              {hasAssignedDates && (
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Fechas asignadas según tu productividad horaria
                </p>
              )}
              {draftId ? (
                <div className="flex gap-2">
                  <button
                    onClick={onConfirm}
                    className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    <CheckCircle2 className="mr-1 inline h-4 w-4" />
                    Confirmar en Calendario
                  </button>
                  <button
                    onClick={onReject}
                    className="rounded-lg border px-4 py-2 text-sm text-muted-foreground hover:bg-accent"
                  >
                    Rechazar
                  </button>
                </div>
              ) : (
                <button
                  onClick={onConfirmPlan}
                  className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <CheckCircle2 className="mr-1 inline h-4 w-4" />
                  Crear Proyecto
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
