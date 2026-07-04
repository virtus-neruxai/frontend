import { useState, useEffect } from 'react';
import { tasksApi, missionsApi, reflectionsApi } from '../lib/api';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogOverlay,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Trash2, CheckCircle2, Target, AlertTriangle, RotateCcw } from 'lucide-react';
import { TASK_STATUS_COLORS } from '../theme/semanticTokens';
import { PROFILE_THEMES } from '../theme/profileThemes';
import { getProfileName, getProfileEmoji } from '../lib/profileUtils';

const STATUS_OPTIONS = [
  { value: 'todo', label: 'Pendiente', color: TASK_STATUS_COLORS.todo },
  { value: 'in_progress', label: 'En Progreso', color: TASK_STATUS_COLORS.in_progress },
  { value: 'done', label: 'Completada', color: TASK_STATUS_COLORS.done },
  { value: 'blocked', label: 'Bloqueada', color: TASK_STATUS_COLORS.blocked }
  // 'failed' se establece automáticamente (revisión nocturna o misión agotada)
];

const DOMAIN_OPTIONS = [
  'Personal',
  'Propósito',
  'Mental',
  'Hábitos',
  'Salud',
  'Relaciones',
  'Social',
  'Trabajo',
  'Finanzas',
  'Aprendizaje',
  'Hogar',
  'Ocio',
  'Otro'
];


const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];


export default function TaskModal({ open, onClose, task, initialDate, occurrenceDate, onSaved, onDeleted, mode = 'task' }) {
  const isEditing = !!task;
  const isRoutineMode = mode === 'routine';

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    domain: '',
    date_start: '',
    date_end: '',
    progress_percent: 0,
    is_complete: false,
    status: 'todo',
    all_day: false,
    recurrence_type: isRoutineMode ? 'daily' : 'none',
    recurrence_interval: 1,
    recurrence_weekdays: [1, 2, 3, 4, 5],
    recurrence_until: '',
    task_kind: mode,
  });
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [linkedMission, setLinkedMission] = useState(null);
  const [missionActionLoading, setMissionActionLoading] = useState(false);
  const [completionReflection, setCompletionReflection] = useState('');
  const [reflectionSaveFailed, setReflectionSaveFailed] = useState(false);
  const [routineCompletionAt, setRoutineCompletionAt] = useState('');
  const [showRoutineCompleteDialog, setShowRoutineCompleteDialog] = useState(false);
  const [linkedItemReflections, setLinkedItemReflections] = useState([]);
  const [domainError, setDomainError] = useState('');
  const [dateError, setDateError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (task) {
        const loadedTaskKind = task.task_kind || 'task';
        const loadedIsRoutine = loadedTaskKind === 'routine';
        setFormData({
          title: task.title || '',
          description: task.description || '',
          domain: task.domain || '',
          date_start: task.date_start ? formatDateTimeLocal(task.date_start) : '',
          date_end: task.date_end ? formatDateTimeLocal(task.date_end) : '',
          progress_percent: task.progress_percent || 0,
          is_complete: task.is_complete || false,
          status: task.status || 'todo',
          all_day: !!task.all_day,
          recurrence_type: loadedIsRoutine
            ? (task.recurrence_rule?.type === 'weekly' ? 'custom' : 'daily')
            : 'none',
          recurrence_interval: loadedIsRoutine ? Number(task.recurrence_rule?.interval || 1) : 1,
          recurrence_weekdays: loadedIsRoutine && Array.isArray(task.recurrence_rule?.weekdays)
            ? task.recurrence_rule.weekdays
            : [1, 2, 3, 4, 5],
          recurrence_until: loadedIsRoutine && task.recurrence_rule?.until
            ? formatDateTimeLocal(task.recurrence_rule.until)
            : '',
          task_kind: loadedTaskKind,
        });
        
        // Load linked mission info if exists
        if (task.linked_mission_id) {
          try {
            // Buscar misión sin filtrar por estado
            const res = await missionsApi.getAll({});
            const mission = res.data.find(m => m.id === task.linked_mission_id);
            setLinkedMission(mission || null);
          } catch (err) {
            setLinkedMission(null);
          }
        } else {
          setLinkedMission(null);
        }

        try {
          const reflectionRequests = loadedIsRoutine
            ? (() => {
                const params = { reflection_type: 'routine', routine_id: task.id };
                if (occurrenceDate) {
                  const od = new Date(occurrenceDate);
                  params.routine_occurrence_date = `${od.getFullYear()}-${String(od.getMonth() + 1).padStart(2, '0')}-${String(od.getDate()).padStart(2, '0')}`;
                }
                return [reflectionsApi.getAll(params)];
              })()
            : task.linked_mission_id
            ? [
                reflectionsApi.getAll({ reflection_type: 'mission', task_id: task.id }),
                reflectionsApi.getAll({ reflection_type: 'mission', mission_id: task.linked_mission_id }),
              ]
            : [
                reflectionsApi.getAll({ reflection_type: 'task', task_id: task.id }),
              ];
          const reflectionResponses = await Promise.all(reflectionRequests);
          const reflectionMap = new Map();
          reflectionResponses.forEach((response) => {
            (response.data || []).forEach((reflection) => {
              if (reflection?.id) reflectionMap.set(reflection.id, reflection);
            });
          });
          setLinkedItemReflections(
            Array.from(reflectionMap.values())
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          );
        } catch (err) {
          setLinkedItemReflections([]);
        }
      } else if (initialDate) {
        const dateStr = formatDateTimeLocal(initialDate);
        setFormData({
          title: '',
          description: '',
          domain: '',
          date_start: dateStr,
          date_end: '',
          progress_percent: 0,
          is_complete: false,
          status: 'todo',
          all_day: false,
          recurrence_type: isRoutineMode ? 'daily' : 'none',
          recurrence_interval: 1,
          recurrence_weekdays: [1, 2, 3, 4, 5],
          recurrence_until: '',
          task_kind: mode,
        });
        setLinkedMission(null);
        setLinkedItemReflections([]);
      }
      setDeleteConfirm(false);
      setCompletionReflection('');
      setReflectionSaveFailed(false);
      setDomainError('');
      setDateError('');
    };
    
    loadData();
  }, [task, initialDate, open, mode, isRoutineMode, occurrenceDate]);

  const formatDateTimeLocal = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };


  const isRoutine = (formData.task_kind || mode) === 'routine';

  const linkedMissionIsActive = linkedMission?.status === 'active';
  const formatDeadline = (dateValue) => {
    if (!dateValue) return null;
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  const getDateKeyLocal = (date) => {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Apply business rules
      if (field === 'is_complete' && value === true) {
        updated.progress_percent = 100;
        updated.status = 'done';
      } else if (field === 'progress_percent') {
        if (value === 100) {
          updated.is_complete = true;
          updated.status = 'done';
        } else {
          updated.is_complete = false;
        }
      } else if (field === 'status' && value === 'done') {
        updated.is_complete = true;
        updated.progress_percent = 100;
      }
      
      return updated;
    });

    if (field === 'domain') {
      setDomainError('');
    }
    
    // Validar date_end > date_start
    if (field === 'date_start' || field === 'date_end') {
      setDateError('');
    }


    if (field === 'recurrence_type' && value === 'daily') {
      setFormData(prev => ({
        ...prev,
        recurrence_interval: 1,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEditing && !formData.domain) {
      setDomainError('Selecciona un dominio.');
      return;
    }
    
    const hasRecurrence = isRoutine;

    if (isRoutine && formData.recurrence_type === 'custom' && (!formData.recurrence_weekdays || formData.recurrence_weekdays.length === 0)) {
      toast.error('Selecciona al menos un día para la recurrencia semanal');
      return;
    }

    // Validación: date_end > date_start
    if (formData.date_end && formData.date_start) {
      const startDate = new Date(formData.date_start);
      const endDate = new Date(formData.date_end);
      if (endDate <= startDate) {
        setDateError('La fecha fin debe ser posterior a la fecha inicio');
        toast.error('La fecha fin debe ser posterior a la fecha inicio');
        return;
      }
    }

    if (hasRecurrence && !formData.date_end) {
      setDateError('La fecha fin es obligatoria para recurrencias y rutinas');
      toast.error('La fecha fin es obligatoria para recurrencias y rutinas');
      return;
    }


    if (isRoutine && formData.recurrence_until && formData.date_start) {
      const untilDate = new Date(formData.recurrence_until);
      const startDate = new Date(formData.date_start);
      if (untilDate < startDate) {
        setDateError('La fecha fin de recurrencia debe ser posterior al inicio');
        toast.error('La fecha fin de recurrencia debe ser posterior al inicio');
        return;
      }
    }

    if (isRoutine && occurrenceIsFuture && completionReflection.trim()) {
      toast.error('No puedes comentar una ocurrencia futura');
      return;
    }
    
    setLoading(true);

    try {
      const nextStart = new Date(formData.date_start).toISOString();
      const nextEnd = formData.date_end ? new Date(formData.date_end).toISOString() : null;

      const recurrenceRuleBase = isRoutine
        ? (formData.recurrence_type === 'custom'
          ? {
              type: 'weekly',
              interval: Math.max(1, Number(formData.recurrence_interval || 1)),
              weekdays: (formData.recurrence_weekdays || []).map(Number).sort((a, b) => a - b),
            }
          : { type: 'daily', interval: 1 })
        : null;
      const recurrenceRule = recurrenceRuleBase
        ? (formData.recurrence_until
            ? { ...recurrenceRuleBase, until: new Date(formData.recurrence_until).toISOString() }
            : recurrenceRuleBase)
        : null;

      const payload = {
        ...formData,
        date_start: nextStart,
        date_end: nextEnd,
        recurrence_rule: recurrenceRule,
        task_kind: isRoutine ? 'routine' : 'task',
        ...(isRoutine ? { status: 'in_progress', progress_percent: 100, is_complete: false } : {})
      };
      delete payload.recurrence_type;
      delete payload.recurrence_interval;
      delete payload.recurrence_weekdays;
      delete payload.recurrence_until;
      if (isEditing && !formData.domain) {
        delete payload.domain;
      }

      if (isEditing) {
        await tasksApi.patch(task.id, payload);
        if (completionReflection.trim()) {
          const reflectionType = isRoutine
            ? 'routine'
            : (linkedMission || task?.linked_mission_id) ? 'mission' : 'task';
          const reflectionSaved = await saveCompletionReflection(
            reflectionType,
            isRoutine ? { routineOccurrenceDate: occurrenceKey } : {},
          );
          if (!reflectionSaved) return;
        }
        toast.success(isRoutine ? 'Rutina actualizada' : 'Tarea actualizada');
      } else {
        await tasksApi.create(payload);
        toast.success('Tarea creada');
      }
      onSaved();
    } catch (error) {
      toast.error(isEditing ? 'Error al actualizar' : 'Error al crear');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }

    setLoading(true);
    try {
      await tasksApi.delete(task.id);
      toast.success('Tarea eliminada');
      onDeleted();
    } catch (error) {
      toast.error('Error al eliminar');
    } finally {
      setLoading(false);
    }
  };

  const saveCompletionReflection = async (reflectionType, options = {}) => {
    const content = completionReflection.trim();
    if (!content || !task?.id) {
      setReflectionSaveFailed(false);
      return true;
    }

    const isMissionReflection = reflectionType === 'mission';
    const isRoutineReflection = reflectionType === 'routine';
    const sourceTitle = isMissionReflection
      ? (linkedMission?.title || formData.title || task.title)
      : (formData.title || task.title);
    const sourcePrompt = isMissionReflection
      ? (linkedMission?.description || formData.description || task.description || null)
      : (formData.description || task.description || null);

    try {
      const payload = {
        content,
        reflection_type: reflectionType,
        source_item_title: sourceTitle,
        source_prompt: sourcePrompt,
      };
      if (isRoutineReflection) {
        payload.routine_id = task.id;
        payload.routine_occurrence_date = options.routineOccurrenceDate;
      } else {
        payload.task_id = task.id;
        payload.mission_id = isMissionReflection ? (linkedMission?.id || task.linked_mission_id || null) : null;
      }

      const response = await reflectionsApi.create(payload);
      if (response.data?.id) {
        setLinkedItemReflections((prev) => [response.data, ...prev]);
      }
      setCompletionReflection('');
      setReflectionSaveFailed(false);
      return true;
    } catch (error) {
      setReflectionSaveFailed(true);
      toast.warning('Los cambios se guardaron, pero no se pudo guardar la reflexión');
      return false;
    }
  };

  const retrySaveCompletionReflection = async (reflectionTypeOverride = null, options = {}) => {
    if (!completionReflection.trim()) return;
    setLoading(true);
    try {
      const reflectionType = reflectionTypeOverride || (
        isRoutine ? 'routine' : (linkedMission || task?.linked_mission_id) ? 'mission' : 'task'
      );
      const reflectionOptions = reflectionType === 'routine' && !options.routineOccurrenceDate
        ? { ...options, routineOccurrenceDate: occurrenceKey }
        : options;
      const reflectionSaved = await saveCompletionReflection(reflectionType, reflectionOptions);
      if (!reflectionSaved) return;
      toast.success('Reflexión guardada');
      onSaved();
    } finally {
      setLoading(false);
    }
  };

  // For routines, open a small dialog to confirm/edit the completion datetime.
  const openRoutineCompleteDialog = () => {
    setRoutineCompletionAt(formatDateTimeLocal(occurrenceDate ? new Date(occurrenceDate) : new Date()));
    setReflectionSaveFailed(false);
    setShowRoutineCompleteDialog(true);
  };

  const confirmRoutineCompletion = async () => {
    if (!task) return;
    setLoading(true);
    try {
      const completionDate = routineCompletionAt ? new Date(routineCompletionAt) : new Date();
      await tasksApi.markRoutineToday(task.id, {
        date: getDateKeyLocal(completionDate),
        completed_at: completionDate.toISOString(),
      });
      const reflectionSaved = await saveCompletionReflection('routine', {
        routineOccurrenceDate: getDateKeyLocal(completionDate),
      });
      if (!reflectionSaved) return;
      toast.success('Rutina marcada como hecha');
      setShowRoutineCompleteDialog(false);
      onSaved();
    } catch (error) {
      toast.error('Error al completar');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkDone = async () => {
    if (task?.task_kind === 'routine') {
      openRoutineCompleteDialog();
      return;
    }

    setLoading(true);
    try {
      await tasksApi.patch(task.id, {
        is_complete: true,
        progress_percent: 100,
        status: 'done'
      });
      setFormData((prev) => ({
        ...prev,
        is_complete: true,
        progress_percent: 100,
        status: 'done',
      }));
      
      // Problema 3: Si es una tarea de misión, completar también la misión
      if (linkedMission) {
        try {
          await missionsApi.complete(linkedMission.id, { success: true, reflection: null });
          const reflectionSaved = await saveCompletionReflection('mission');
          if (!reflectionSaved) return;
          toast.success('¡Tarea y misión completadas!');
        } catch (missionError) {
          const reflectionSaved = await saveCompletionReflection('mission');
          if (!reflectionSaved) return;
          toast.warning('Tarea completada, pero error al completar misión');
        }
      } else {
        const reflectionSaved = await saveCompletionReflection('task');
        if (!reflectionSaved) return;
        toast.success('¡Tarea completada!');
      }
      
      onSaved();
    } catch (error) {
      toast.error('Error al completar');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteLinkedMission = async () => {
    if (!linkedMission) return;
    setMissionActionLoading(true);
    try {
      await missionsApi.complete(linkedMission.id, { success: true, reflection: null });
      const reflectionSaved = await saveCompletionReflection('mission');
      if (!reflectionSaved) return;
      toast.success('¡Misión completada!');
      onSaved();
    } catch (error) {
      toast.error('Error al completar misión');
    } finally {
      setMissionActionLoading(false);
    }
  };

  // Button visibility depends on the OPENED occurrence (clicked day, or today).
  const occurrenceKey = getDateKeyLocal(occurrenceDate ? new Date(occurrenceDate) : new Date());
  const todayKey = getDateKeyLocal(new Date());
  const occurrenceIsFuture = occurrenceKey > todayKey;
  const occurrenceCompleted = (task?.routine_completed_dates || []).includes(occurrenceKey);
  // Dialog warning/confirm depends on the date currently PICKED in the dialog.
  const selectedCompletionKey = routineCompletionAt ? getDateKeyLocal(new Date(routineCompletionAt)) : occurrenceKey;
  const selectedCompletionIsFuture = selectedCompletionKey > todayKey;
  const selectedDateCompleted = (task?.routine_completed_dates || []).includes(selectedCompletionKey);
  const routineReflectionsForDate = (dateKey) => linkedItemReflections.filter((reflection) => (
    reflection.reflection_type === 'routine'
    && reflection.routine_id === task?.id
    && reflection.routine_occurrence_date === dateKey
  ));
  const selectedRoutineReflections = isRoutine ? routineReflectionsForDate(selectedCompletionKey) : [];
  const taskWasAlreadyComplete = !!(task?.is_complete || task?.status === 'done');
  const canMarkRoutineToday = isRoutine && isEditing && !occurrenceIsFuture;
  const canAddTaskCompletionReflection = !isRoutine && isEditing && !taskWasAlreadyComplete && !linkedMission;
  const canMarkTaskDone = canAddTaskCompletionReflection && !formData.is_complete;
  const canCompleteLinkedMission = linkedMissionIsActive;
  const showCompletionReflection = isEditing && (
    isRoutine
    || canAddTaskCompletionReflection
    || canCompleteLinkedMission
    || reflectionSaveFailed
    || !!completionReflection.trim()
  );


  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg z-50 max-h-[90dvh] overflow-y-auto" data-testid="task-modal">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle
              className="text-xl"
              style={{ fontFamily: 'var(--font-heading)' }}
              data-testid="task-modal-title"
            >
              {isEditing ? (isRoutine ? 'Editar rutina' : 'Editar Tarea') : isRoutine ? 'Nueva rutina' : 'Nueva Tarea'}
            </DialogTitle>
            {(() => {
              const profile = task?.prompt_profile || linkedMission?.prompt_profile;
              if (!profile || !PROFILE_THEMES[profile]) return null;
              return (
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    color: PROFILE_THEMES[profile].primary,
                    backgroundColor: PROFILE_THEMES[profile].soft,
                  }}
                >
                  {getProfileEmoji(profile)} {getProfileName(profile)}
                </span>
              );
            })()}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Linked Mission Info */}
          {linkedMissionIsActive && (
            <div className="p-3 bg-primary/10 border border-primary/25 rounded-lg">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  <span className="text-sm font-medium text-primary">Misión vinculada</span>
                </div>
                {linkedMission?.prompt_profile && PROFILE_THEMES[linkedMission.prompt_profile] && (
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{
                      color: PROFILE_THEMES[linkedMission.prompt_profile].primary,
                      backgroundColor: PROFILE_THEMES[linkedMission.prompt_profile].soft,
                    }}
                  >
                    {getProfileEmoji(linkedMission.prompt_profile)} {getProfileName(linkedMission.prompt_profile)}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Puedes completar la misión directamente aquí para registrar tu progreso.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Fecha límite de la misión: <span className="font-semibold text-foreground">{formatDeadline(linkedMission?.expires_at || task?.date_end) || 'Sin definir'}</span>.
              </p>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Título *
            </Label>
            <Input
              id="title"
              data-testid="task-title-input"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Nombre de la tarea"
              required
              disabled={!!linkedMission}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Descripción
            </Label>
            <Textarea
              id="description"
              data-testid="task-description-input"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Detalles de la tarea..."
              className="min-h-[80px] resize-none"

            />
          </div>

          {/* Domain */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Dominio {!isEditing ? '*' : ''}
            </Label>
            <Select 
              value={formData.domain} 
              onValueChange={(v) => handleChange('domain', v)}

            >
              <SelectTrigger data-testid="task-domain-select">
                <SelectValue placeholder="Selecciona un dominio" />
              </SelectTrigger>
              <SelectContent>
                {DOMAIN_OPTIONS.map((domain) => (
                  <SelectItem key={domain} value={domain}>
                    {domain}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {domainError && (
              <p className="text-xs text-destructive" data-testid="task-domain-error">
                {domainError}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between py-2">
            <Label htmlFor="all_day" className="text-sm font-medium text-muted-foreground">
              Seleccionar todo el día
            </Label>
            <Switch
              id="all_day"
              checked={!!formData.all_day}
              onCheckedChange={(v) => handleChange('all_day', v)}

              data-testid="task-all-day-switch"
            />
          </div>

          {/* Dates - ocultar para tareas de misión */}
          {!linkedMission && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date_start" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Fecha Inicio *
                </Label>
                <Input
                  id="date_start"
                  data-testid="task-date-start-input"
                  type="datetime-local"
                  value={formData.date_start}
                  onChange={(e) => handleChange('date_start', e.target.value)}
                  required
    
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_end" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Fecha Fin
                </Label>
                <Input
                  id="date_end"
                  data-testid="task-date-end-input"
                  type="datetime-local"
                  value={formData.date_end}
                  onChange={(e) => handleChange('date_end', e.target.value)}
    
                />
                {formData.date_start && formData.date_end && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Duración del bloque: {Math.max(0, Math.round((new Date(formData.date_end) - new Date(formData.date_start)) / (1000 * 60)))} min
                  </p>
                )}
              </div>
            </div>
          )}

          {!linkedMission && isRoutine && (
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Recurrencia
              </Label>
              <Select
                value={formData.recurrence_type}
                onValueChange={(v) => handleChange('recurrence_type', v)}
  
              >
                <SelectTrigger data-testid="task-recurrence-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diaria</SelectItem>
                  <SelectItem value="custom">Personalizada</SelectItem>
                </SelectContent>
              </Select>

              {formData.recurrence_type === 'daily' && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Se repetirá cada día hasta.</p>
                  <Input
                    type="datetime-local"
                    value={formData.recurrence_until}
                    onChange={(e) => handleChange('recurrence_until', e.target.value)}
                    placeholder="Fin de recurrencia (opcional)"
                  />
                </div>
              )}

              {formData.recurrence_type === 'custom' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Repetir cada __ semanas</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.recurrence_interval}
                      onChange={(e) => handleChange('recurrence_interval', Number(e.target.value || 1))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Repetir en</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {WEEKDAY_OPTIONS.map((day) => {
                        const checked = formData.recurrence_weekdays.includes(day.value);
                        return (
                          <div key={day.value} className="flex items-center gap-2">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(next) => {
                                const weekdays = next
                                  ? [...formData.recurrence_weekdays, day.value]
                                  : formData.recurrence_weekdays.filter((v) => v !== day.value);
                                handleChange('recurrence_weekdays', weekdays.sort((a, b) => a - b));
                              }}
                            />
                            <Label className="text-sm text-muted-foreground">{day.label}</Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Hasta (fin de recurrencia)</Label>
                    <Input
                      type="datetime-local"
                      value={formData.recurrence_until}
                      onChange={(e) => handleChange('recurrence_until', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Date validation error */}
          {dateError && (
            <p className="text-xs text-destructive" data-testid="task-date-error">
              {dateError}
            </p>
          )}

          {!isRoutine && (
            <>
              {/* Status */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Estado
                </Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(v) => handleChange('status', v)}
    
                >
                  <SelectTrigger data-testid="task-status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS
                      .filter(opt => opt.value !== 'failed')
                      .map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2.5 h-2.5 rounded-full" 
                              style={{ backgroundColor: opt.color }}
                            />
                            {opt.label}
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Progress */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Progreso
                  </Label>
                  <span className="text-sm font-medium text-muted-foreground">{formData.progress_percent}%</span>
                </div>
                <Slider
                  data-testid="task-progress-slider"
                  value={[formData.progress_percent]}
                  onValueChange={([v]) => handleChange('progress_percent', v)}
                  max={100}
                  step={5}
                  className="[&_[role=slider]]:bg-primary"
    
                />
              </div>

              {/* Is Complete */}
              <div className="flex items-center justify-between py-2">
                <Label htmlFor="is_complete" className="text-sm font-medium text-muted-foreground">
                  Marcar como completada
                </Label>
                <Switch
                  id="is_complete"
                  data-testid="task-complete-switch"
                  checked={formData.is_complete}
                  onCheckedChange={(v) => handleChange('is_complete', v)}
    
                  className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted"
                />
              </div>

            </>
          )}

          {showCompletionReflection && (
            <div className="space-y-2">
              <Label htmlFor="completion-reflection" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {isRoutine ? `Comentario o reflexión · ${occurrenceKey}` : 'Comentario o reflexión'}
              </Label>
              <Textarea
                id="completion-reflection"
                data-testid="task-completion-reflection-input"
                value={completionReflection}
                onChange={(e) => setCompletionReflection(e.target.value)}
                placeholder="¿Qué observaste, aprendiste o sentiste al hacer esto?"
                className="min-h-[88px] resize-none"
                disabled={loading || missionActionLoading || (isRoutine && occurrenceIsFuture)}
              />
              {isRoutine && occurrenceIsFuture && (
                <p className="text-xs text-muted-foreground" data-testid="routine-future-reflection-help">
                  Podrás escribir cuando llegue esta fecha.
                </p>
              )}
              {reflectionSaveFailed && (
                <div className="flex flex-col gap-2 rounded-md border border-[hsl(var(--warning))] bg-[hsl(var(--warning-soft))] p-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-foreground">
                    Los cambios se guardaron, pero esta reflexión no.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={retrySaveCompletionReflection}
                    disabled={loading || missionActionLoading || !completionReflection.trim()}
                    className="rounded-full bg-background"
                    data-testid="task-reflection-retry-btn"
                  >
                    Reintentar
                  </Button>
                </div>
              )}
            </div>
          )}

          {linkedItemReflections.length > 0 && (
            <div className="space-y-3 rounded-lg border bg-muted/50 p-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Reflexiones guardadas
                </Label>
                <Badge variant="outline" className="text-xs">
                  {linkedItemReflections.length}
                </Badge>
              </div>
              <div className="space-y-3 max-h-44 overflow-y-auto">
                {linkedItemReflections.map((reflection) => (
                  <div key={reflection.id} className="rounded-md border bg-card p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDeadline(reflection.created_at) || 'Sin fecha'}
                      </span>
                      <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30 text-primary">
                        {reflection.reflection_type === 'mission'
                          ? 'Misión'
                          : reflection.reflection_type === 'routine'
                          ? 'Rutina'
                          : 'Tarea'}
                      </Badge>
                    </div>
                    {reflection.reflection_type === 'routine' && reflection.routine_occurrence_date && (
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        Día de rutina: {new Date(`${reflection.routine_occurrence_date}T00:00:00`).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    )}
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {reflection.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2 pt-4">
                {isEditing && (
              <>
                {canCompleteLinkedMission && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCompleteLinkedMission}
                    disabled={loading || missionActionLoading}
                    className="rounded-full border-[hsl(var(--success))] text-[hsl(var(--success))] hover:bg-[hsl(var(--success-soft))]"
                    data-testid="task-complete-mission-btn"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                    Completar misión
                  </Button>
                )}
                
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDelete}
                  disabled={loading || missionActionLoading}
                  className={`rounded-full ${deleteConfirm ? 'border-destructive text-destructive hover:bg-[hsl(var(--destructive-soft))]' : 'border-input'}`}
                  data-testid="task-delete-btn"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                  {deleteConfirm ? '¿Confirmar?' : 'Eliminar'}
                </Button>
                
                {(canMarkRoutineToday || canMarkTaskDone) && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleMarkDone}
                    disabled={loading || missionActionLoading}
                    className="rounded-full border-[hsl(var(--success))] text-[hsl(var(--success))] hover:bg-[hsl(var(--success-soft))]"
                    data-testid="task-mark-done-btn"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                    {isRoutine ? (occurrenceCompleted ? 'Añadir reflexión' : 'Marcar hecho') : 'Completar'}
                  </Button>
                )}
              </>
            )}
            
            <Button
              type="submit"
              disabled={loading || (!isEditing && !formData.domain)}
              className="rounded-full font-medium ml-auto"
              data-testid="task-save-btn"
            >
              {loading ? 'Guardando...' : isEditing ? 'Guardar cambios' : isRoutine ? 'Crear rutina' : 'Crear tarea'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {/* Routine completion: confirm or edit the completion datetime */}
    <Dialog open={showRoutineCompleteDialog} onOpenChange={setShowRoutineCompleteDialog}>
      <DialogContent className="sm:max-w-md z-50" data-testid="routine-complete-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))]" />
            Marcar rutina como hecha
          </DialogTitle>
          <DialogDescription>
            Por defecto se marca con la fecha y hora de ahora. Si la completaste antes, edítala (p. ej. ayer a las 22:00).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="routine-completion-at" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Fecha y hora del cumplimiento
          </Label>
          <Input
            id="routine-completion-at"
            type="datetime-local"
            value={routineCompletionAt}
            max={formatDateTimeLocal(new Date())}
            onChange={(e) => setRoutineCompletionAt(e.target.value)}
            disabled={loading}
            data-testid="routine-completion-at-input"
          />
          {selectedDateCompleted && (
            <p className="text-xs text-primary">
              Ya está marcada para esa fecha. Puedes añadir otra reflexión.
            </p>
          )}
        </div>

        <div className="space-y-2 py-2">
          <Label htmlFor="routine-completion-reflection" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Comentario o reflexión
          </Label>
          <Textarea
            id="routine-completion-reflection"
            data-testid="routine-completion-reflection-input"
            value={completionReflection}
            onChange={(e) => setCompletionReflection(e.target.value)}
            placeholder="¿Qué observaste sobre este hábito hoy?"
            className="min-h-[88px] resize-none"
            disabled={loading || selectedCompletionIsFuture}
          />
          {selectedRoutineReflections.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Ya hay {selectedRoutineReflections.length} reflexión(es) guardada(s) para esta fecha; esta se añadirá al historial.
            </p>
          )}
          {selectedCompletionIsFuture && (
            <p className="text-xs text-destructive">No puedes registrar una fecha futura.</p>
          )}
          {reflectionSaveFailed && (
            <div className="rounded-md border border-[hsl(var(--warning))] bg-[hsl(var(--warning-soft))] p-3">
              <p className="text-xs text-foreground">
                La rutina ya se marcó, pero esta reflexión no se guardó. Puedes reintentar sin perder el texto.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowRoutineCompleteDialog(false)}
            disabled={loading}
            className="rounded-full"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={confirmRoutineCompletion}
            disabled={loading || !routineCompletionAt || selectedCompletionIsFuture || (selectedDateCompleted && !completionReflection.trim())}
            className="bg-[hsl(var(--success))] text-white hover:bg-[hsl(var(--success)/0.9)] rounded-full"
            data-testid="routine-complete-confirm-btn"
          >
            {loading ? 'Guardando...' : selectedDateCompleted ? 'Guardar reflexión' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
