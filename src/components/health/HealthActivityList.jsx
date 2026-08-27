import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link2, Pencil, Trash2, Unlink } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import HealthActivityForm, { ACTIVITY_TYPE_LABELS } from './HealthActivityForm';
import HealthLinkTaskDialog from './HealthLinkTaskDialog';

function formatWhen(iso) {
  if (!iso) return '';
  try {
    return format(new Date(iso), "d MMM, HH:mm", { locale: es });
  } catch {
    return iso;
  }
}

function LinkTaskControl({ activity, tasks, onLinkTask }) {
  const [open, setOpen] = useState(false);
  const linkable = tasks.filter((t) => !t.health_activity_id);

  if (!onLinkTask || linkable.length === 0) return null;

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="h-8"
        onClick={() => setOpen(true)}
        data-testid={`health-activity-link-open-${activity.id}`}
      >
        <Link2 className="w-3 h-3 mr-1" /> Enlazar tarea
      </Button>
      <HealthLinkTaskDialog
        open={open}
        onClose={() => setOpen(false)}
        activity={activity}
        tasks={tasks}
        onLinkTask={onLinkTask}
      />
    </>
  );
}

function ActivityRow({
  activity, linkedTasks, tasks, onUpdate, onDelete, onLinkTask, onUnlinkTask,
  saving, renderDetails, renderEditor,
}) {
  const [editing, setEditing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  if (editing) {
    if (renderEditor) {
      return renderEditor({
        activity,
        saving,
        onCancel: () => setEditing(false),
        onSaved: () => setEditing(false),
      });
    }
    return (
      <HealthActivityForm
        activity={activity}
        saving={saving}
        lockActivityType
        onCancel={() => setEditing(false)}
        onSubmit={async (payload) => {
          const updated = await onUpdate(activity.id, payload);
          if (updated) setEditing(false);
        }}
      />
    );
  }

  return (
    <Card data-testid={`health-activity-row-${activity.id}`}>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">{ACTIVITY_TYPE_LABELS[activity.activity_type] || activity.activity_type}</Badge>
              <span className="text-xs text-muted-foreground">{formatWhen(activity.observed_at)}</span>
            </div>
            <p className="font-medium text-sm text-foreground">{activity.title}</p>
            {activity.note && (
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{activity.note}</p>
            )}
            {renderDetails?.(activity)}
          </div>
          <div className="flex gap-1 shrink-0">
            {(onUpdate || renderEditor) && (
              <Button size="icon" variant="ghost" className="h-8 w-8" title="Editar" onClick={() => setEditing(true)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button
                size="icon"
                variant="ghost"
                className={`h-8 w-8 ${deleteConfirm ? 'text-destructive' : ''}`}
                onClick={() => {
                  if (!deleteConfirm) { setDeleteConfirm(true); return; }
                  onDelete(activity.id);
                }}
                onBlur={() => setDeleteConfirm(false)}
                title={deleteConfirm ? '¿Confirmar eliminación?' : 'Eliminar'}
                data-testid={`health-activity-delete-${activity.id}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {linkedTasks.length > 0 && (
          <div className="space-y-1">
            {linkedTasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2 py-1 text-xs">
                <span className="truncate">{t.title}</span>
                <Button size="sm" variant="ghost" className="h-6 shrink-0" onClick={() => onUnlinkTask?.(t)}>
                  <Unlink className="w-3 h-3 mr-1" /> Desenlazar
                </Button>
              </div>
            ))}
          </div>
        )}

        <LinkTaskControl activity={activity} tasks={tasks} onLinkTask={onLinkTask} />
      </CardContent>
    </Card>
  );
}

/**
 * Recent activity: newest first, no zero-filling. A day with no record has
 * no row here, which is correct — see health_activities.py's
 * `list_health_activities` docstring: absence is not the same as a zero.
 */
export default function HealthActivityList({
  activities, tasks, loading, saving, onCreate, onUpdate, onDelete, onLinkTask, onUnlinkTask,
  allowCreate = true, renderDetails = null, renderEditor = null,
  emptyMessage = 'Todavía no has registrado ninguna actividad.',
}) {
  const [showCreate, setShowCreate] = useState(false);

  const tasksByActivity = useMemo(() => {
    const map = new Map();
    tasks.forEach((t) => {
      if (!t.health_activity_id) return;
      const list = map.get(t.health_activity_id) || [];
      list.push(t);
      map.set(t.health_activity_id, list);
    });
    return map;
  }, [tasks]);

  return (
    <div className="space-y-4" data-testid="health-activity-list">
      {allowCreate && (showCreate ? (
        <HealthActivityForm
          saving={saving}
          onSubmit={async (payload) => {
            const created = await onCreate(payload);
            if (created) setShowCreate(false);
          }}
        />
      ) : (
        <Button onClick={() => setShowCreate(true)} data-testid="health-activity-new">
          Registrar actividad
        </Button>
      ))}

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando tu actividad...</p>
      ) : activities.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <ActivityRow
              key={activity.id}
              activity={activity}
              linkedTasks={tasksByActivity.get(activity.id) || []}
              tasks={tasks}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onLinkTask={onLinkTask}
              onUnlinkTask={onUnlinkTask}
              saving={saving}
              renderDetails={renderDetails}
              renderEditor={renderEditor}
            />
          ))}
        </div>
      )}
    </div>
  );
}
