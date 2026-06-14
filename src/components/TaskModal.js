import { useState, useEffect } from 'react';
import { tasksApi, missionsApi } from '../lib/api';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

const STATUS_OPTIONS = [
  { value: 'todo', label: 'Pendiente', color: '#71717A' },
  { value: 'in_progress', label: 'En Progreso', color: '#3B82F6' },
  { value: 'done', label: 'Completada', color: '#22C55E' },
  { value: 'blocked', label: 'Bloqueada', color: '#EF4444' }
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


export default function TaskModal({ open, onClose, task, initialDate, onSaved, onDeleted, mode = 'task' }) {
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
      }
      setDeleteConfirm(false);
      setDomainError('');
      setDateError('');
    };
    
    loadData();
  }, [task, initialDate, open, mode]);

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
  const isMissionLinkedTask = !!(task?.linked_mission_id || linkedMission?.id);
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
    
    setLoading(true);

    try {
      const nextStart = new Date(formData.date_start).toISOString();
      const nextEnd = formData.date_end ? new Date(formData.date_end).toISOString() : null;
      let reason = null;
      
      if (isEditing && task) {
        // Normalizar fechas actuales para comparación
        const currentStart = new Date(task.date_start).toISOString();
        const currentEnd = task.date_end ? new Date(task.date_end).toISOString() : null;
        
        const startDateChanged = currentStart !== nextStart;
        const endDateChanged = currentEnd !== nextEnd;
        
        if (startDateChanged || endDateChanged) {
          reason = window.prompt('Motivo del cambio de fecha');
          if (!reason) {
            setLoading(false);
            return;
          }
        }
      }

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
        ...(isRoutine ? { status: 'in_progress', progress_percent: 100, is_complete: false } : {}),
        ...(reason ? { reason } : {})
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
        toast.success('Tarea actualizada');
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
      const reason = window.prompt('Motivo de eliminación');
      if (!reason) {
        setLoading(false);
        return;
      }
      await tasksApi.delete(task.id, { reason });
      toast.success('Tarea eliminada');
      onDeleted();
    } catch (error) {
      toast.error('Error al eliminar');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkDone = async () => {
    setLoading(true);
    try {
      if (task?.task_kind === 'routine') {
        await tasksApi.markRoutineToday(task.id, {});
        toast.success('Rutina marcada para hoy');
        onSaved();
        return;
      }

      await tasksApi.patch(task.id, {
        is_complete: true,
        progress_percent: 100,
        status: 'done'
      });
      
      // Problema 3: Si es una tarea de misión, completar también la misión
      if (linkedMission) {
        try {
          await missionsApi.complete(linkedMission.id, { success: true, reflection: null });
          toast.success('¡Tarea y misión completadas!');
        } catch (missionError) {
          toast.warning('Tarea completada, pero error al completar misión');
        }
      } else {
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
      toast.success('¡Misión completada!');
      onSaved();
    } catch (error) {
      toast.error('Error al completar misión');
    } finally {
      setMissionActionLoading(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg z-50 max-h-[90dvh] overflow-y-auto" data-testid="task-modal">
        <DialogHeader>
          <DialogTitle 
            className="text-xl" 
            style={{ fontFamily: 'Manrope, sans-serif' }}
            data-testid="task-modal-title"
          >
            {isEditing ? (isRoutine ? 'Editar rutina' : 'Editar Tarea') : isRoutine ? 'Nueva rutina' : 'Nueva Tarea'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Linked Mission Info */}
          {linkedMissionIsActive && (
            <div className="p-3 bg-[#FFF7ED] border border-[#FFEDD5] rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-[#F97316]" strokeWidth={1.5} />
                <span className="text-sm font-medium text-[#F97316]">Misión Estoica Vinculada</span>
              </div>
              <p className="text-xs text-[#71717A] mt-2">
                Puedes completar la misión directamente aquí para registrar tu progreso estoico.
              </p>
              <p className="text-xs text-[#71717A] mt-1">
                Fecha límite de la misión: <span className="font-semibold text-[#18181B]">{formatDeadline(linkedMission?.expires_at || task?.date_end) || 'Sin definir'}</span>.
              </p>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
              Título *
            </Label>
            <Input
              id="title"
              data-testid="task-title-input"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Nombre de la tarea"
              className="border-[#E4E4E7]"
              required
              disabled={!!linkedMission}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
              Descripción
            </Label>
            <Textarea
              id="description"
              data-testid="task-description-input"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Detalles de la tarea..."
              className="border-[#E4E4E7] min-h-[80px] resize-none"

            />
          </div>

          {/* Domain */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
              Dominio {!isEditing ? '*' : ''}
            </Label>
            <Select 
              value={formData.domain} 
              onValueChange={(v) => handleChange('domain', v)}

            >
              <SelectTrigger className="border-[#E4E4E7]" data-testid="task-domain-select">
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
              <p className="text-xs text-[#EF4444]" data-testid="task-domain-error">
                {domainError}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between py-2">
            <Label htmlFor="all_day" className="text-sm font-medium text-[#71717A]">
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
                <Label htmlFor="date_start" className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
                  Fecha Inicio *
                </Label>
                <Input
                  id="date_start"
                  data-testid="task-date-start-input"
                  type="datetime-local"
                  value={formData.date_start}
                  onChange={(e) => handleChange('date_start', e.target.value)}
                  className="border-[#E4E4E7]"
                  required
    
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_end" className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
                  Fecha Fin
                </Label>
                <Input
                  id="date_end"
                  data-testid="task-date-end-input"
                  type="datetime-local"
                  value={formData.date_end}
                  onChange={(e) => handleChange('date_end', e.target.value)}
                  className="border-[#E4E4E7]"
    
                />
                {formData.date_start && formData.date_end && (
                  <p className="text-xs text-[#71717A] mt-1">
                    Duración del bloque: {Math.max(0, Math.round((new Date(formData.date_end) - new Date(formData.date_start)) / (1000 * 60)))} min
                  </p>
                )}
              </div>
            </div>
          )}

          {!linkedMission && isRoutine && (
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
                Recurrencia
              </Label>
              <Select
                value={formData.recurrence_type}
                onValueChange={(v) => handleChange('recurrence_type', v)}
  
              >
                <SelectTrigger className="border-[#E4E4E7]" data-testid="task-recurrence-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diaria</SelectItem>
                  <SelectItem value="custom">Personalizada</SelectItem>
                </SelectContent>
              </Select>

              {formData.recurrence_type === 'daily' && (
                <div className="space-y-2">
                  <p className="text-xs text-[#71717A]">Se repetirá cada día hasta.</p>
                  <Input
                    type="datetime-local"
                    value={formData.recurrence_until}
                    onChange={(e) => handleChange('recurrence_until', e.target.value)}
                    className="border-[#E4E4E7]"
                    placeholder="Fin de recurrencia (opcional)"
                  />
                </div>
              )}

              {formData.recurrence_type === 'custom' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-[#71717A]">Repetir cada __ semanas</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.recurrence_interval}
                      onChange={(e) => handleChange('recurrence_interval', Number(e.target.value || 1))}
                      className="border-[#E4E4E7]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-[#71717A]">Repetir en</Label>
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
                            <Label className="text-sm text-[#71717A]">{day.label}</Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-[#71717A]">Hasta (fin de recurrencia)</Label>
                    <Input
                      type="datetime-local"
                      value={formData.recurrence_until}
                      onChange={(e) => handleChange('recurrence_until', e.target.value)}
                      className="border-[#E4E4E7]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Date validation error */}
          {dateError && (
            <p className="text-xs text-[#EF4444]" data-testid="task-date-error">
              {dateError}
            </p>
          )}

          {!isRoutine && (
            <>
              {/* Status */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
                  Estado
                </Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(v) => handleChange('status', v)}
    
                >
                  <SelectTrigger className="border-[#E4E4E7]" data-testid="task-status-select">
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
                  <Label className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
                    Progreso
                  </Label>
                  <span className="text-sm font-medium text-[#71717A]">{formData.progress_percent}%</span>
                </div>
                <Slider
                  data-testid="task-progress-slider"
                  value={[formData.progress_percent]}
                  onValueChange={([v]) => handleChange('progress_percent', v)}
                  max={100}
                  step={5}
                  className="[&_[role=slider]]:bg-[#F97316]"
    
                />
              </div>

              {/* Is Complete */}
              <div className="flex items-center justify-between py-2">
                <Label htmlFor="is_complete" className="text-sm font-medium text-[#71717A]">
                  Marcar como completada
                </Label>
                <Switch
                  id="is_complete"
                  data-testid="task-complete-switch"
                  checked={formData.is_complete}
                  onCheckedChange={(v) => handleChange('is_complete', v)}
    
                  className="data-[state=checked]:bg-[#F97316] data-[state=unchecked]:bg-zinc-300 dark:data-[state=unchecked]:bg-zinc-700"
                />
              </div>

            </>
          )}

          <DialogFooter className="flex gap-2 pt-4">
                {isEditing && (
              <>
                {linkedMissionIsActive && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCompleteLinkedMission}
                    disabled={loading || missionActionLoading}
                    className="rounded-full border-[#22C55E] text-[#22C55E] hover:bg-[#DCFCE7]"
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
                  className={`rounded-full ${deleteConfirm ? 'border-[#EF4444] text-[#EF4444] hover:bg-[#FEF2F2]' : 'border-[#E4E4E7]'}`}
                  data-testid="task-delete-btn"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                  {deleteConfirm ? '¿Confirmar?' : 'Eliminar'}
                </Button>
                
                {((isRoutine && isEditing && !(task?.routine_completed_dates || []).includes(getDateKeyLocal(new Date()))) || (!isRoutine && !formData.is_complete && !linkedMission)) && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleMarkDone}
                    disabled={loading || missionActionLoading}
                    className="rounded-full border-[#22C55E] text-[#22C55E] hover:bg-[#DCFCE7]"
                    data-testid="task-mark-done-btn"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                    {isRoutine ? 'Marcar hoy' : 'Completar'}
                  </Button>
                )}
              </>
            )}
            
            <Button
              type="submit"
              disabled={loading || (!isEditing && !formData.domain)}
              className="bg-[#F97316] hover:bg-[#EA580C] text-white rounded-full font-medium ml-auto"
              data-testid="task-save-btn"
            >
              {loading ? 'Guardando...' : isEditing ? 'Guardar cambios' : isRoutine ? 'Crear rutina' : 'Crear tarea'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
