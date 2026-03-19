import React, { useEffect, useState } from 'react';
import { endOfDay, format, startOfDay } from 'date-fns';
import { Button } from '../../../components/ui/button';
import { tasksApi } from '../../../lib/api';

const resolveDayBounds = (occurredAt) => {
  const selectedDate = occurredAt ? new Date(occurredAt) : new Date();
  return {
    start: startOfDay(selectedDate),
    end: endOfDay(selectedDate),
  };
};

const formatTaskWindow = (task) => {
  if (task.all_day) {
    return 'Todo el dia';
  }

  if (!task.date_start) {
    return 'Sin hora';
  }

  try {
    return format(new Date(task.date_start), 'HH:mm');
  } catch (error) {
    return 'Sin hora';
  }
};

export function EmotionTaskLinkSection({
  open,
  occurredAt,
  linkToTask,
  onLinkToTaskChange,
  selectedTaskId,
  onSelectedTaskIdChange,
}) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!open || !linkToTask) {
      setTasks([]);
      setLoading(false);
      setLoadError('');
      return;
    }

    let cancelled = false;

    const loadTasks = async () => {
      setLoading(true);
      setLoadError('');

      try {
        const { start, end } = resolveDayBounds(occurredAt);
        const response = await tasksApi.getAll({
          from_date: start.toISOString(),
          to_date: end.toISOString(),
        });

        if (cancelled) {
          return;
        }

        const nextTasks = Array.isArray(response.data) ? response.data : [];
        setTasks(nextTasks);

        if (selectedTaskId && !nextTasks.some((task) => task.id === selectedTaskId)) {
          onSelectedTaskIdChange('');
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        setTasks([]);
        setLoadError('No se pudieron cargar las tareas de este día.');
        onSelectedTaskIdChange('');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadTasks();

    return () => {
      cancelled = true;
    };
  }, [linkToTask, occurredAt, onSelectedTaskIdChange, open]);

  return (
    <div>
      <p className="text-sm font-medium text-[#18181B] dark:text-white">
        6. Vincular a tarea (opcional)
      </p>
      <div className="mt-2 flex gap-2">
        <Button
          variant={!linkToTask ? 'default' : 'outline'}
          onClick={() => {
            onLinkToTaskChange(false);
            onSelectedTaskIdChange('');
          }}
          type="button"
        >
          No
        </Button>
        <Button
          variant={linkToTask ? 'default' : 'outline'}
          onClick={() => onLinkToTaskChange(true)}
          type="button"
        >
          Si
        </Button>
      </div>

      {linkToTask && (
        <div className="mt-3 space-y-2" data-testid="emotion-task-link-section">
          <p className="text-xs text-[#71717A] dark:text-[#A1A1AA]">
            Elige una de las tareas programadas para ese mismo día.
          </p>

          {loading && (
            <p className="text-sm text-[#71717A] dark:text-[#A1A1AA]">
              Cargando tareas...
            </p>
          )}

          {!loading && loadError && (
            <p className="text-sm text-[#B91C1C] dark:text-[#FCA5A5]">
              {loadError}
            </p>
          )}

          {!loading && !loadError && tasks.length === 0 && (
            <p className="text-sm text-[#71717A] dark:text-[#A1A1AA]">
              No tienes tareas ese día.
            </p>
          )}

          {!loading && !loadError && tasks.length > 0 && (
            <div className="max-h-56 space-y-2 overflow-y-auto">
              {tasks.map((task) => {
                const isSelected = task.id === selectedTaskId;
                return (
                  <button
                    key={task.id}
                    type="button"
                    className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                      isSelected
                        ? 'border-[#18181B] bg-[#18181B] text-white dark:border-white dark:bg-white dark:text-[#18181B]'
                        : 'border-[#E4E4E7] bg-white text-[#18181B] hover:border-[#A1A1AA] dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-white'
                    }`}
                    data-testid={`emotion-task-option-${task.id}`}
                    onClick={() => onSelectedTaskIdChange(task.id)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{task.title}</span>
                      <span className="text-xs opacity-80">{formatTaskWindow(task)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
