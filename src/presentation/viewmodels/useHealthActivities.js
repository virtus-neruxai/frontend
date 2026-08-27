import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { healthActivitiesApi, tasksApi } from '../../lib/api';
import { apiErrorMessage } from '../../lib/quotaError';
import { localDateKey } from '../../lib/healthRecords';

const WINDOW_DAYS = 30;

/**
 * Recorded health activity: CRUD plus the explicit task link/unlink action.
 *
 * Linking is never inferred (no matching by text, date or similarity — see
 * the plan's "Fase C"): it is always this hook writing `health_activity_id`
 * onto a specific, user-chosen task via `tasksApi.patch`.
 */
function defaultDateRange() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - (WINDOW_DAYS - 1));
  return { fromDate: localDateKey(from), toDate: localDateKey(to) };
}

export const useHealthActivities = ({
  fromDate = null,
  toDate = null,
  activityType = null,
  includeTasks = true,
} = {}) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tasks, setTasks] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const defaults = defaultDateRange();
      const [activitiesRes, tasksRes] = await Promise.all([
        healthActivitiesApi.getAll({
          from_date: fromDate || defaults.fromDate,
          to_date: toDate || defaults.toDate,
          ...(activityType ? { activity_type: activityType } : {}),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
        includeTasks ? tasksApi.getAll({ days_back: WINDOW_DAYS }) : Promise.resolve({ data: [] }),
      ]);
      setActivities(activitiesRes.data || []);
      setTasks(tasksRes.data || []);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'No se pudo cargar tu actividad de salud.'));
    } finally {
      setLoading(false);
    }
  }, [activityType, fromDate, includeTasks, toDate]);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (payload) => {
    setSaving(true);
    try {
      const { data } = await healthActivitiesApi.create(payload);
      setActivities((prev) => [data, ...prev]);
      toast.success('Registro guardado');
      return data;
    } catch (e) {
      toast.error(apiErrorMessage(e, 'No se pudo guardar el registro.'));
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  const update = useCallback(async (activityId, payload) => {
    setSaving(true);
    try {
      const current = activities.find((activity) => activity.id === activityId);
      const updatePayload = payload.expected_revision === undefined && current?.revision != null
        ? { ...payload, expected_revision: current.revision }
        : payload;
      const { data } = await healthActivitiesApi.update(activityId, updatePayload);
      setActivities((prev) => prev.map((a) => (a.id === activityId ? data : a)));
      toast.success('Registro actualizado');
      return data;
    } catch (e) {
      if (e.response?.status === 409) {
        toast.error('El registro cambió en otra sesión. Hemos recargado la versión más reciente.');
        await load();
      } else {
        toast.error(apiErrorMessage(e, 'No se pudo actualizar el registro.'));
      }
      return null;
    } finally {
      setSaving(false);
    }
  }, [activities, load]);

  const remove = useCallback(async (activityId) => {
    try {
      await healthActivitiesApi.remove(activityId);
      setActivities((prev) => prev.filter((a) => a.id !== activityId));
      toast.success('Registro eliminado');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'No se pudo eliminar el registro.'));
    }
  }, []);

  // Linking writes onto the task, not the activity — `linked_task_count` on
  // the activity is computed server-side from this, never denormalized here.
  const linkTask = useCallback(async (activity, taskId) => {
    try {
      const { data } = await tasksApi.patch(taskId, {
        health_activity_id: activity.id,
        health_activity_type: activity.activity_type,
      });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? data : t)));
      setActivities((prev) => prev.map((a) => (
        a.id === activity.id ? { ...a, linked_task_count: (a.linked_task_count || 0) + 1 } : a
      )));
      toast.success('Tarea enlazada');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'No se pudo enlazar la tarea.'));
    }
  }, []);

  const unlinkTask = useCallback(async (task) => {
    try {
      const { data } = await tasksApi.patch(task.id, {
        health_activity_id: null,
        health_activity_type: null,
      });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? data : t)));
      if (task.health_activity_id) {
        setActivities((prev) => prev.map((a) => (
          a.id === task.health_activity_id
            ? { ...a, linked_task_count: Math.max(0, (a.linked_task_count || 0) - 1) }
            : a
        )));
      }
      toast.success('Tarea desenlazada');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'No se pudo desenlazar la tarea.'));
    }
  }, []);

  return {
    activities,
    tasks,
    loading,
    saving,
    reload: load,
    create,
    update,
    remove,
    linkTask,
    unlinkTask,
  };
};
