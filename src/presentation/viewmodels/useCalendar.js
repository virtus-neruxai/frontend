import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tasksApi } from '../../lib/api';
import { toast } from 'sonner';

const VIEW_MAP = {
  month: 'dayGridMonth',
  week: 'timeGridWeek',
  day: 'timeGridDay',
};

const WEEKDAY_LABELS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];


const getCurrentTimeScrollTarget = () => {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}:00`;
};

const parseRule = (raw) => {
  if (!raw || typeof raw !== 'object' || !raw.type) return null;
  return raw;
};



const isOverdue = (task) => {
  if (!task.date_end) return false;
  if (['done', 'completed'].includes(task.status)) return false;
  if (task.linked_mission_id) return false;
  return new Date(task.date_end) < new Date();
};

const getDateKey = (date) => {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getTodayDateKey = () => getDateKey(new Date());

const toStartOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const computeAllDayEnd = (task, startDate) => {
  if (!task.all_day) return task.date_end || undefined;
  if (!task.date_end) return undefined;
  const end = new Date(task.date_end);
  const inclusive = toStartOfDay(end);
  return addDays(inclusive, 1).toISOString();
};

const buildRecurrenceLabel = (rule) => {
  if (!rule) return '';
  if (rule.type === 'daily') {
    return 'Diaria';
  }
  if (rule.type === 'weekly') {
    const days = (rule.weekdays || []).map((d) => WEEKDAY_LABELS[d] || '').filter(Boolean).join(', ');
    return `Cada ${rule.interval || 1} semana(s) (${days || 'sin días'})`;
  }
  return '';
};

const expandRecurringTask = (task, rangeStart, rangeEnd) => {
  const rule = parseRule(task.recurrence_rule);
  if (!rule || !task.date_start) return [];

  const sourceStart = new Date(task.date_start);
  const sourceEnd = task.date_end ? new Date(task.date_end) : null;
  const recurrenceUntil = rule.until ? new Date(rule.until) : null;
  const durationMs = sourceEnd ? sourceEnd.getTime() - sourceStart.getTime() : 0;
  const occurrences = [];

  const pushOccurrence = (startDate, occurrenceIndex) => {
    if (startDate >= rangeEnd || startDate < rangeStart) return;
    if (recurrenceUntil && startDate > recurrenceUntil) return;
    const endDate = sourceEnd ? new Date(startDate.getTime() + durationMs) : null;
    const occurrenceTask = { ...task, date_end: endDate ? endDate.toISOString() : null };
    const overdueOccurrence = isOverdue({ ...occurrenceTask, date_end: endDate ? endDate.toISOString() : null });
    const statusClass = overdueOccurrence ? 'status-failed' : `status-${task.status}`;
    occurrences.push({
      id: `${task.id}__r${occurrenceIndex}`,
      title: task.title,
      start: startDate.toISOString(),
      end: computeAllDayEnd({ ...task, date_end: endDate ? endDate.toISOString() : null }, startDate),
      allDay: !!task.all_day,
      className: task.task_kind === "routine" ? `${statusClass} routine-event` : statusClass,
      extendedProps: {
        status: task.status,
        progress: task.progress_percent,
        description: task.description,
        isRecurring: true,
        recurringParentId: task.id,
        recurrenceLabel: buildRecurrenceLabel(rule),
        taskKind: task.task_kind || "task",
        completedToday: (task.routine_completed_dates || []).includes(getDateKey(startDate)),
      },
    });
  };

  let index = 0;
  if (rule.type === 'daily') {
    const step = Math.max(1, Number(rule.interval || 1));
    for (let d = new Date(sourceStart); d < rangeEnd; d = addDays(d, step)) {
      pushOccurrence(new Date(d), index++);
    }
  }

  if (rule.type === 'weekly') {
    const weekdays = (rule.weekdays || []).map(Number).filter((n) => n >= 0 && n <= 6);
    const intervalWeeks = Math.max(1, Number(rule.interval || 1));
    if (!weekdays.length) return [];
    const sourceStartDay = toStartOfDay(sourceStart);

    for (let d = toStartOfDay(rangeStart); d < rangeEnd; d = addDays(d, 1)) {
      if (d < sourceStartDay) continue;
      if (!weekdays.includes(d.getDay())) continue;
      const diffDays = Math.floor((toStartOfDay(d).getTime() - sourceStartDay.getTime()) / (1000 * 60 * 60 * 24));
      const weekOffset = Math.floor(diffDays / 7);
      if (weekOffset % intervalWeeks !== 0) continue;

      const occurrence = new Date(d);
      occurrence.setHours(sourceStart.getHours(), sourceStart.getMinutes(), sourceStart.getSeconds(), 0);
      pushOccurrence(occurrence, index++);
    }
  }

  if (rule.type === 'monthly') {
    const intervalMonths = Math.max(1, Number(rule.interval || 1));
    const anchorDay = sourceStart.getDate();
    // Walk month-by-month from the source month until we pass the range end.
    let cursor = new Date(sourceStart.getFullYear(), sourceStart.getMonth(), 1);
    let monthOffset = 0;
    while (cursor < rangeEnd) {
      if (monthOffset % intervalMonths === 0) {
        const year = cursor.getFullYear();
        const month = cursor.getMonth();
        const lastDay = new Date(year, month + 1, 0).getDate();
        const day = Math.min(anchorDay, lastDay);
        const occurrence = new Date(year, month, day,
          sourceStart.getHours(), sourceStart.getMinutes(), sourceStart.getSeconds(), 0);
        if (occurrence >= sourceStart) {
          pushOccurrence(occurrence, index++);
        }
      }
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      monthOffset += 1;
    }
  }


  return occurrences;
};

export function useCalendar() {
  const { view = 'day' } = useParams();
  const navigate = useNavigate();
  const calendarRef = useRef(null);

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [occurrenceDate, setOccurrenceDate] = useState(null);
  const [currentTitle, setCurrentTitle] = useState('');
  const [createMode, setCreateMode] = useState('task');
  const [visibleRange, setVisibleRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    end: new Date(new Date().setMonth(new Date().getMonth() + 2)),
  });
  const currentScrollTime = useMemo(() => getCurrentTimeScrollTarget(), []);

  const fetchTasks = useCallback(async () => {
    try {
      const response = await tasksApi.getAll();
      setTasks(response.data);
    } catch (error) {
      toast.error('Error al cargar tareas');
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (loading || !calendarRef.current) return;

    const api = calendarRef.current.getApi();
    const fullCalendarView = VIEW_MAP[view] || 'dayGridMonth';

    api.changeView(fullCalendarView, new Date());

  }, [view, loading]);

  const handleDateClick = useCallback((info) => {
    setCreateMode('task');
    setSelectedTask(null);
    setSelectedDate(info.date);
    setModalOpen(true);
  }, []);

  const handleEventClick = useCallback((info) => {
    const originalTaskId = info.event.extendedProps?.recurringParentId || info.event.id;
    const task = tasks.find(t => t.id === originalTaskId);
    if (task) {
      setCreateMode(task.task_kind || "task");
      setSelectedTask(task);
      setSelectedDate(null);
      // For routines, remember which occurrence was clicked so it can be
      // completed for that exact date (not just "today").
      setOccurrenceDate(
        task.task_kind === "routine" && info.event.start ? info.event.start : null
      );
      setModalOpen(true);
    }
  }, [tasks]);

  const handleEventDrop = useCallback(async (info) => {
    const taskId = info.event.extendedProps?.recurringParentId || info.event.id;
    const newStart = info.event.start;
    const newEnd = info.event.end;

    try {
      await tasksApi.patch(taskId, {
        date_start: newStart.toISOString(),
        date_end: newEnd ? newEnd.toISOString() : null,
      });
      toast.success('Tarea movida');
      fetchTasks();
    } catch (error) {
      toast.error('Error al mover tarea');
      info.revert();
    }
  }, [fetchTasks]);

  const handleEventResize = useCallback(async (info) => {
    const taskId = info.event.extendedProps?.recurringParentId || info.event.id;
    const newEnd = info.event.end;

    try {
      await tasksApi.patch(taskId, {
        date_end: newEnd ? newEnd.toISOString() : null,
      });
      toast.success('Duración actualizada');
      fetchTasks();
    } catch (error) {
      toast.error('Error al actualizar duración');
      info.revert();
    }
  }, [fetchTasks]);

  const handleDatesSet = useCallback((info) => {
    setCurrentTitle(info.view.title);
    setVisibleRange({ start: info.start, end: info.end });
  }, []);

  const handlePrev = useCallback(() => {
    if (calendarRef.current) {
      calendarRef.current.getApi().prev();
    }
  }, []);

  const handleNext = useCallback(() => {
    if (calendarRef.current) {
      calendarRef.current.getApi().next();
    }
  }, []);

  const handleToday = useCallback(() => {
    if (calendarRef.current) {
      calendarRef.current.getApi().today();
    }
  }, []);

  const handleViewChange = useCallback((newView) => {
    navigate(`/calendar/${newView}`);
  }, [navigate]);

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setSelectedTask(null);
    setSelectedDate(null);
    setOccurrenceDate(null);
  }, []);

  const handleTaskSaved = useCallback(() => {
    fetchTasks();
    handleModalClose();
  }, [fetchTasks, handleModalClose]);

  const handleTaskDeleted = useCallback(() => {
    fetchTasks();
    handleModalClose();
  }, [fetchTasks, handleModalClose]);

  const openCreateModal = useCallback(() => {
    setCreateMode('task');
    setSelectedTask(null);
    setSelectedDate(new Date());
    setModalOpen(true);
  }, []);

  const openCreateRoutineModal = useCallback(() => {
    setCreateMode('routine');
    setSelectedTask(null);
    setSelectedDate(new Date());
    setModalOpen(true);
  }, []);

  const calendarEvents = useMemo(() => {
    const base = [];
    const recurring = [];

    tasks.forEach((task) => {
      const rule = parseRule(task.recurrence_rule);
      if (rule) {
        recurring.push(...expandRecurringTask(task, visibleRange.start, visibleRange.end));
      } else {
        const overdue = isOverdue(task);
        const statusClass = overdue ? 'status-failed' : `status-${task.status}`;
        base.push({
          id: task.id,
          title: task.title,
          start: task.date_start,
          end: computeAllDayEnd(task),
          allDay: !!task.all_day,
          className: task.task_kind === "routine" ? `${statusClass} routine-event` : statusClass,
          extendedProps: {
            status: task.status,
            progress: task.progress_percent,
            description: task.description,
            isRecurring: false,
            taskKind: task.task_kind || "task",
            completedToday: (task.routine_completed_dates || []).includes(getTodayDateKey()),
          }
        });
      }
    });

    return [...base, ...recurring];
  }, [tasks, visibleRange]);

  return {
    view,
    tasks,
    loading,
    calendarRef,
    currentTitle,
    calendarEvents,
    modalOpen,
    selectedTask,
    selectedDate,
    occurrenceDate,
    handlePrev,
    handleNext,
    handleToday,
    handleViewChange,
    handleDateClick,
    handleEventClick,
    handleEventDrop,
    handleEventResize,
    handleDatesSet,
    handleModalClose,
    handleTaskSaved,
    handleTaskDeleted,
    openCreateModal,
    openCreateRoutineModal,
    createMode,
    currentScrollTime,
    viewMap: VIEW_MAP,
  };
}
