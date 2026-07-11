import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { AlertCircle, Calendar, Clock, Brain } from 'lucide-react';
import { getProfileName } from '../lib/profileUtils';
import { useProfileTheme } from '../theme/useProfileTheme';
import { useDndSettings } from '../hooks/useDndSettings';
import { snapLocalStringOutOfDnd } from '../lib/dnd';
import { normalizeTaskDomain, TASK_DOMAIN_OPTIONS } from '../lib/taskDomains';

const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

const DIFFICULTY_LABELS = {
  1: 'Muy Fácil',
  2: 'Fácil',
  3: 'Moderado',
  4: 'Difícil',
  5: 'Muy Difícil'
};

const DIFFICULTY_COLORS = {
  1: 'bg-[hsl(var(--success))]',
  2: 'bg-[hsl(var(--info))]',
  3: 'bg-[hsl(var(--warning))]',
  4: 'bg-primary',
  5: 'bg-destructive'
};

const inferDifficulty = (value, durationMinutes) => {
  const raw = Number(value);
  if (Number.isFinite(raw) && raw >= 1 && raw <= 5) return raw;
  const duration = Math.max(5, Number(durationMinutes || 30));
  if (duration <= 20) return 1;
  if (duration <= 45) return 2;
  if (duration <= 90) return 3;
  if (duration <= 150) return 4;
  return 5;
};

function formatDateTimeLocal(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatDisplayDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function calculateDurationMinutes(startRaw, endRaw) {
  if (!startRaw || !endRaw) return null;
  const start = new Date(startRaw);
  const end = new Date(endRaw);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

function computeEndFromDuration(startRaw, durationMinutes) {
  if (!startRaw || !durationMinutes) return '';
  const start = new Date(startRaw);
  if (Number.isNaN(start.getTime())) return '';
  const end = new Date(start.getTime() + durationMinutes * 60000);
  return formatDateTimeLocal(end.toISOString());
}

export default function TaskDraftModal({ isOpen, onClose, draftData, onConfirm, onReject }) {
  const { profileId } = useProfileTheme();
  const dnd = useDndSettings();
  const [editedData, setEditedData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const profileName = getProfileName(profileId);

  useEffect(() => {
    if (draftData?.data) {
      const taskKind = draftData.data.task_kind || 'task';
      const isRoutineDraft = taskKind === 'routine';
      const recurrence = draftData.data.recurrence_rule || null;
      const recurrenceType = isRoutineDraft
        ? (recurrence?.type === 'weekly' ? 'custom' : 'daily')
        : 'none';
      setEditedData({
        task_action: draftData.data.task_action || 'CREATE_DRAFT',
        existing_task_id: draftData.data.existing_task_id || null,
        title: draftData.data.title || '',
        description: draftData.data.description || '',
        date_start: draftData.data.date_start ? formatDateTimeLocal(draftData.data.date_start) : '',
        date_end: draftData.data.date_end
          ? formatDateTimeLocal(draftData.data.date_end)
          : computeEndFromDuration(draftData.data.date_start, draftData.data.estimated_duration_minutes),
        estimated_duration_minutes: draftData.data.estimated_duration_minutes || 30,
        difficulty: inferDifficulty(draftData.data.difficulty, draftData.data.estimated_duration_minutes),
        domain: normalizeTaskDomain(draftData.data.domain, 'Personal'),
        task_kind: taskKind,
        recurrence_type: recurrenceType,
        recurrence_interval: isRoutineDraft ? Number(recurrence?.interval || 1) : 1,
        recurrence_weekdays: isRoutineDraft && Array.isArray(recurrence?.weekdays) ? recurrence.weekdays : [1, 2, 3, 4, 5],
        recurrence_until: isRoutineDraft && recurrence?.until ? formatDateTimeLocal(recurrence.until) : '',
        tags: draftData.data.tags || [],
        notifications_enabled: !!draftData.data.notifications_enabled,
      });
    }
  }, [draftData]);

  // Never keep a *proposed* start time inside the user's DND window; snap it to
  // the first allowed slot. Runs on open and when DND settings resolve. Keyed on
  // draftData (not date_start) so it never fights the user's manual edits after.
  useEffect(() => {
    if (!draftData?.data) return;
    setEditedData((prev) => {
      if (!prev.date_start) return prev;
      const snapped = snapLocalStringOutOfDnd(prev.date_start, dnd);
      if (snapped === prev.date_start) return prev;
      const duration = Math.max(5, Number(prev.estimated_duration_minutes || 30));
      return {
        ...prev,
        date_start: snapped,
        date_end: computeEndFromDuration(snapped, duration) || prev.date_end,
      };
    });
  }, [dnd, draftData]);

  const handleDateStartChange = (value) => {
    setEditedData((prev) => {
      const duration = Math.max(5, Number(prev.estimated_duration_minutes || 30));
      const nextEnd = computeEndFromDuration(value, duration);
      return {
        ...prev,
        date_start: value,
        date_end: nextEnd || prev.date_end,
      };
    });
  };

  const handleDateEndChange = (value) => {
    setEditedData((prev) => {
      const next = { ...prev, date_end: value };
      const computed = calculateDurationMinutes(prev.date_start, value);
      if (computed !== null) {
        next.estimated_duration_minutes = computed;
      }
      return next;
    });
  };

  const handleDurationChange = (valueRaw) => {
    const parsed = Number(valueRaw);
    const duration = Number.isFinite(parsed) ? Math.max(5, Math.min(480, Math.round(parsed))) : 5;
    setEditedData((prev) => ({
      ...prev,
      estimated_duration_minutes: duration,
      date_end: computeEndFromDuration(prev.date_start, duration) || prev.date_end,
    }));
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      // Convert datetime-local to ISO strings
      const payload = {
        ...editedData,
        domain: normalizeTaskDomain(editedData.domain, 'Personal'),
        date_start: editedData.date_start ? new Date(editedData.date_start).toISOString() : null,
        date_end: editedData.date_end ? new Date(editedData.date_end).toISOString() : null,
        estimated_duration_minutes:
          calculateDurationMinutes(editedData.date_start, editedData.date_end)
          ?? editedData.estimated_duration_minutes
          ?? 30,
      };

      const isRoutine = (editedData.task_kind || 'task') === 'routine';
      if (isRoutine) {
        const recurrenceType = editedData.recurrence_type === 'custom' ? 'weekly' : 'daily';
        const recurrenceRule = {
          type: recurrenceType,
          interval: Math.max(1, Number(editedData.recurrence_interval || 1)),
          ...(recurrenceType === 'weekly' ? { weekdays: editedData.recurrence_weekdays || [1, 2, 3, 4, 5] } : {}),
        };
        if (editedData.recurrence_until) {
          recurrenceRule.until = new Date(editedData.recurrence_until).toISOString();
        }
        payload.task_kind = 'routine';
        payload.recurrence_rule = recurrenceRule;
      } else {
        payload.task_kind = 'task';
        payload.recurrence_rule = null;
      }
      delete payload.recurrence_type;
      delete payload.recurrence_interval;
      delete payload.recurrence_weekdays;
      delete payload.recurrence_until;
      
      await onConfirm(payload);
      onClose();
    } catch (error) {
      console.error('Error confirming draft:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      await onReject();
      onClose();
    } catch (error) {
      console.error('Error rejecting draft:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!draftData) return null;

  const metadata = draftData.metadata || {};
  const isRoutine = (editedData.task_kind || 'task') === 'routine';
  const isEditDraft = (editedData.task_action || draftData?.data?.task_action || 'CREATE_DRAFT') === 'EDIT_EXISTING_DRAFT';
  const modalTitle = isRoutine
    ? (isEditDraft ? `Modificación de Rutina Propuesta por el Mentor ${profileName}` : `Rutina Propuesta por el Mentor ${profileName}`)
    : (isEditDraft ? `Modificación de Tarea Propuesta por el Mentor ${profileName}` : `Tarea Propuesta por el Mentor ${profileName}`);
  const confirmLabel = isRoutine
    ? (isEditDraft ? 'Confirmar y Modificar Rutina' : 'Confirmar y Crear Rutina')
    : (isEditDraft ? 'Confirmar y Modificar Tarea' : 'Confirmar y Crear Tarea');
  const submittingLabel = isEditDraft ? 'Modificando...' : 'Creando...';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            {modalTitle}
          </DialogTitle>
          <DialogDescription>
            {isEditDraft
              ? 'Revisa y edita la modificación propuesta antes de confirmarla. El mentor ha considerado tu contexto actual.'
              : 'Revisa y edita la tarea antes de confirmarla. El mentor ha considerado tu contexto actual.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Agent Reasoning */}
          {metadata.agent_reasoning && (
            <div className="p-3 bg-[hsl(var(--warning-soft))] border border-[hsl(var(--warning))] rounded-lg">
              <div className="flex items-start gap-2">
                <Brain className="w-5 h-5 text-[hsl(var(--warning))] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Razonamiento del Mentor</p>
                  <p className="text-sm text-muted-foreground mt-1">{metadata.agent_reasoning}</p>
                </div>
              </div>
            </div>
          )}

          {/* Confidence Score */}
          {metadata.confidence && (
            <div className="flex items-center gap-2">
              <Badge variant={metadata.confidence > 0.7 ? 'default' : 'secondary'}>
                Confianza: {(metadata.confidence * 100).toFixed(0)}%
              </Badge>
              {metadata.expires_in_seconds && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  Expira en {Math.floor(metadata.expires_in_seconds / 60)} min
                </Badge>
              )}
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título de la Tarea *</Label>
            <Input
              id="title"
              value={editedData.title || ''}
              onChange={(e) => setEditedData({ ...editedData, title: e.target.value })}
              placeholder="Ej: Meditar 10 minutos"
              maxLength={60}
            />
            <p className="text-xs text-muted-foreground">{editedData.title?.length || 0}/60 caracteres</p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={editedData.description || ''}
              onChange={(e) => setEditedData({ ...editedData, description: e.target.value })}
              placeholder="Detalles de la tarea..."
              rows={4}
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date_start">Fecha y Hora de Inicio *</Label>
              <Input
                id="date_start"
                type="datetime-local"
                value={editedData.date_start || ''}
                onChange={(e) => handleDateStartChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_end">Fecha y Hora de Fin {isRoutine ? '*' : '(Opcional)'}</Label>
              <Input
                id="date_end"
                type="datetime-local"
                value={editedData.date_end || ''}
                onChange={(e) => handleDateEndChange(e.target.value)}
              />
            </div>
          </div>

          {isRoutine && (
            <div className="space-y-3 p-3 border rounded-lg bg-muted/50">
              <Label className="font-medium">Recurrencia de la Rutina</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="recurrence_type">Frecuencia</Label>
                  <Select
                    value={editedData.recurrence_type || 'daily'}
                    onValueChange={(value) => setEditedData({ ...editedData, recurrence_type: value })}
                  >
                    <SelectTrigger id="recurrence_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diaria</SelectItem>
                      <SelectItem value="custom">Semanal (días específicos)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recurrence_interval">Cada cuánto</Label>
                  <Input
                    id="recurrence_interval"
                    type="number"
                    min="1"
                    max="30"
                    value={editedData.recurrence_interval || 1}
                    onChange={(e) => setEditedData({ ...editedData, recurrence_interval: parseInt(e.target.value || '1', 10) })}
                  />
                </div>
              </div>

              {(editedData.recurrence_type || 'daily') === 'custom' && (
                <div className="space-y-2">
                  <Label>Días de la semana</Label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAY_OPTIONS.map((day) => {
                      const selected = (editedData.recurrence_weekdays || []).includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          className={`px-3 py-1 rounded-md border text-sm ${selected ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input'}`}
                          onClick={() => {
                            const current = editedData.recurrence_weekdays || [];
                            const next = selected
                              ? current.filter((d) => d !== day.value)
                              : [...current, day.value].sort((a, b) => a - b);
                            setEditedData({ ...editedData, recurrence_weekdays: next });
                          }}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="recurrence_until">Fin de recurrencia (opcional)</Label>
                <Input
                  id="recurrence_until"
                  type="datetime-local"
                  value={editedData.recurrence_until || ''}
                  onChange={(e) => setEditedData({ ...editedData, recurrence_until: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Domain and Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="domain">Dominio *</Label>
              <Select
                value={editedData.domain || 'Personal'}
                onValueChange={(value) => setEditedData({ ...editedData, domain: value })}
              >
                <SelectTrigger id="domain">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_DOMAIN_OPTIONS.map(domain => (
                    <SelectItem key={domain} value={domain}>{domain}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duración Estimada (min)</Label>
              <Input
                id="duration"
                type="number"
                min="5"
                max="480"
                value={editedData.estimated_duration_minutes || 30}
                onChange={(e) => handleDurationChange(e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!editedData.notifications_enabled}
              onChange={(e) => setEditedData({ ...editedData, notifications_enabled: e.target.checked })}
              className="h-4 w-4 accent-[hsl(var(--primary))]"
            />
            Habilitar notificación de alertas urgentes
          </label>

          {/* Difficulty */}
          <div className="space-y-2">
            <Label>Dificultad</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(level => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setEditedData({ ...editedData, difficulty: level })}
                  className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all ${
                    editedData.difficulty === level
                      ? `${DIFFICULTY_COLORS[level]} border-foreground/30 text-white`
                      : 'border-input hover:border-primary/50 bg-background'
                  }`}
                >
                  <div className="text-sm font-medium">{level}</div>
                  <div className="text-xs mt-1">{DIFFICULTY_LABELS[level]}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          {editedData.tags && editedData.tags.length > 0 && (
            <div className="space-y-2">
              <Label>Etiquetas</Label>
              <div className="flex flex-wrap gap-2">
                {editedData.tags.map((tag, idx) => (
                  <Badge key={idx} variant="outline">{tag}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleReject}
            disabled={isSubmitting}
          >
            Rechazar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || !editedData.title || !editedData.date_start || !editedData.domain || (isRoutine && !editedData.date_end)}
            className="bg-primary text-primary-foreground hover:bg-[hsl(var(--primary)/0.9)]"
          >
            {isSubmitting ? submittingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
