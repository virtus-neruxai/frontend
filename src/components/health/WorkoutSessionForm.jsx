import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import AiCaptureBox from './AiCaptureBox';
import ExerciseNameInput from './ExerciseNameInput';
import ExerciseSetLogger, { isRecordedSet } from './ExerciseSetLogger';
import SaveHealthTemplateFields, { EMPTY_TEMPLATE_CHOICE } from './SaveHealthTemplateFields';
import {
  ENDURANCE_MODALITY_LABELS,
  cloneHealthValue,
  formatDateTimeLocal,
  inputNumber,
  optionalNumber,
  toObservedAt,
} from '../../lib/healthRecords';

function emptyExercise() {
  return {
    exercise_key: null,
    label: '',
    sets: [],
    note: '',
    default_repetitions_unit: 'reps',
    default_load_unit: 'kg',
  };
}

function initialExercise(entry) {
  return {
    ...emptyExercise(),
    ...cloneHealthValue(entry),
    sets: cloneHealthValue(entry.sets || []),
  };
}

function painValue(value) {
  if (value === true) return 'yes';
  if (value === false) return 'no';
  return 'unknown';
}

function painPayload(value) {
  if (value === 'yes') return true;
  if (value === 'no') return false;
  return null;
}

// A value the person corrects stays assisted: the model still wrote it first.
function adjusted(origin) {
  return origin === 'llm_estimated' ? 'user_adjusted' : origin;
}

function positiveNumber(value) {
  const parsed = optionalNumber(value);
  return parsed !== null && parsed > 0 ? parsed : null;
}

function nonNegativeNumber(value) {
  const parsed = optionalNumber(value);
  return parsed !== null && parsed >= 0 ? parsed : null;
}

function boundedInteger(value, minimum, maximum = Number.POSITIVE_INFINITY) {
  const parsed = optionalNumber(value);
  return parsed !== null
    && Number.isInteger(parsed)
    && parsed >= minimum
    && parsed <= maximum
    ? parsed
    : null;
}

export default function WorkoutSessionForm({
  activity = null,
  template = null,
  observedAt = null,
  exercises: libraryExercises = [],
  suggestedGroups = [],
  allowSaveAsTemplate = true,
  saving = false,
  onSubmit,
  onCancel,
}) {
  const initialDetails = activity?.details || template?.details || {};
  const initialKind = initialDetails.kind === 'endurance' ? 'endurance' : 'strength';
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(() => ({
    kind: initialKind,
    title: activity?.title || template?.title || (initialKind === 'strength' ? 'Entrenamiento de fuerza' : 'Entrenamiento de resistencia'),
    note: activity?.note || '',
    observed_at: formatDateTimeLocal(activity?.observed_at || observedAt),
    duration_minutes: initialDetails.duration_seconds != null ? initialDetails.duration_seconds / 60 : null,
    energy_expenditure_kcal: initialDetails.energy_expenditure_kcal ?? null,
    perceived_exertion: initialDetails.perceived_exertion ?? null,
    pain_or_discomfort: painValue(initialDetails.pain_or_discomfort),
    exercises: (initialDetails.exercises || []).map(initialExercise),
    modality: initialDetails.modality || 'running',
    distance_km: initialDetails.distance_m != null ? initialDetails.distance_m / 1000 : null,
    elevation_gain_m: initialDetails.elevation_gain_m ?? null,
    avg_heart_rate: initialDetails.avg_heart_rate ?? null,
    // Who produced the numbers below. A session is reviewed as a whole, so one
    // marker per record — the server derives `capture_method` from it.
    values_origin: initialDetails.values_origin || 'explicit',
  }));
  const [templateChoice, setTemplateChoice] = useState(EMPTY_TEMPLATE_CHOICE);

  const validExercises = useMemo(() => form.exercises.map((exercise) => ({
    ...exercise,
    sets: exercise.sets.filter(isRecordedSet),
  })).filter((exercise) => exercise.label.trim() && exercise.sets.length > 0), [form.exercises]);

  // Named, because `validExercises` silently drops them. Somebody who wrote
  // three exercises, filled the numbers of one and pressed save got one
  // exercise back and no explanation — the two that vanished looked exactly
  // like two they had never typed.
  const droppedExercises = useMemo(() => form.exercises.filter((exercise) => (
    exercise.label.trim() && !exercise.sets.some(isRecordedSet)
  )).map((exercise) => exercise.label.trim()), [form.exercises]);

  const updateExercise = (index, changes) => setForm((current) => ({
    ...current,
    exercises: current.exercises.map((exercise, exerciseIndex) => (
      exerciseIndex === index ? { ...exercise, ...changes } : exercise
    )),
    values_origin: adjusted(current.values_origin),
  }));

  // The draft decides `kind` too: "20 minutos de bici" and "4 series de press"
  // are different shapes, and making the person pick first defeats the point.
  const applyDraft = (draft) => {
    const kind = draft.kind === 'endurance' ? 'endurance' : 'strength';
    setForm((current) => ({
      ...current,
      kind,
      title: draft.title || current.title,
      note: draft.note || current.note,
      observed_at: /^\d{2}:\d{2}$/.test(draft.observed_time || '')
        ? `${current.observed_at.slice(0, 10)}T${draft.observed_time}`
        : current.observed_at,
      duration_minutes: draft.duration_seconds != null ? draft.duration_seconds / 60 : null,
      energy_expenditure_kcal: draft.energy_expenditure_kcal ?? null,
      perceived_exertion: draft.perceived_exertion ?? null,
      pain_or_discomfort: painValue(draft.pain_or_discomfort ?? null),
      exercises: (draft.exercises || []).map(initialExercise),
      modality: draft.modality || current.modality,
      distance_km: draft.distance_m != null ? draft.distance_m / 1000 : null,
      elevation_gain_m: draft.elevation_gain_m ?? null,
      avg_heart_rate: draft.avg_heart_rate ?? null,
      values_origin: 'llm_estimated',
    }));
  };

  const buildDetails = () => {
    const durationMinutes = positiveNumber(form.duration_minutes);
    const shared = {
      duration_seconds: durationMinutes == null
        ? null
        : Math.max(1, Math.round(durationMinutes * 60)),
      energy_expenditure_kcal: nonNegativeNumber(form.energy_expenditure_kcal),
      perceived_exertion: boundedInteger(form.perceived_exertion, 1, 10),
      pain_or_discomfort: painPayload(form.pain_or_discomfort),
      values_origin: form.values_origin || 'explicit',
    };
    if (form.kind === 'endurance') {
      return {
        kind: 'endurance',
        modality: form.modality,
        distance_m: positiveNumber(form.distance_km) == null
          ? null
          : positiveNumber(form.distance_km) * 1000,
        elevation_gain_m: nonNegativeNumber(form.elevation_gain_m),
        avg_heart_rate: boundedInteger(form.avg_heart_rate, 20, 250),
        ...shared,
      };
    }
    return {
      kind: 'strength',
      exercises: validExercises.map((exercise) => ({
        ...(exercise.exercise_key ? { exercise_key: exercise.exercise_key } : {}),
        label: exercise.label.trim(),
        sets: exercise.sets.map((entry) => ({
          repetitions: positiveNumber(entry.repetitions),
          repetitions_unit: entry.repetitions_unit || 'reps',
          load: nonNegativeNumber(entry.load),
          load_unit: entry.load_unit || 'kg',
          rir: boundedInteger(entry.rir, 0, 10),
          rest_seconds: boundedInteger(entry.rest_seconds, 0),
          note: entry.note?.trim() || null,
        })),
        note: exercise.note?.trim() || null,
      })),
      ...shared,
    };
  };

  const submit = async () => {
    const iso = toObservedAt(form.observed_at);
    if (!iso || !form.title.trim() || (form.kind === 'strength' && validExercises.length === 0)) return;
    if (allowSaveAsTemplate && templateChoice.enabled && !templateChoice.title.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        payload: {
          activity_type: 'training',
          title: form.title.trim(),
          note: form.note.trim(),
          observed_at: iso,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          details: buildDetails(),
        },
        templateId: template?.id || null,
        saveAsTemplate: allowSaveAsTemplate && templateChoice.enabled
          ? { title: templateChoice.title, groups: templateChoice.groups }
          : null,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(next) => { if (!next) onCancel(); }}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90dvh] overflow-y-auto"
        data-testid="workout-session-form"
      >
      <DialogHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <DialogTitle className="text-base">
            {activity ? 'Editar entrenamiento' : template ? `Usar plantilla: ${template.title}` : 'Registrar entrenamiento'}
          </DialogTitle>
        </div>
        {template && <DialogDescription>Revisa la fecha, la hora y lo que cambió en esta sesión.</DialogDescription>}
      </DialogHeader>
      <div className="space-y-5">
        {!activity && !template && (
          <AiCaptureBox surface="training" onApply={applyDraft} disabled={saving || submitting} />
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="workout-kind">Tipo</Label>
            <Select value={form.kind} onValueChange={(kind) => setForm((value) => ({ ...value, kind }))}>
              <SelectTrigger id="workout-kind" data-testid="workout-kind"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="strength">Fuerza</SelectItem>
                <SelectItem value="endurance">Resistencia</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="workout-observed-at">Fecha y hora</Label>
            <Input
              id="workout-observed-at"
              type="datetime-local"
              value={form.observed_at}
              onChange={(event) => setForm((value) => ({ ...value, observed_at: event.target.value }))}
              data-testid="workout-observed-at"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="workout-title">Título</Label>
          <Input id="workout-title" value={form.title} maxLength={200} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} />
        </div>

        {form.kind === 'strength' ? (
          <div className="space-y-4">
            {form.exercises.map((exercise, index) => (
              <Card key={`${index}-${exercise.exercise_key || 'manual'}`} className="bg-muted/20">
                <CardContent className="pt-4 space-y-4">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <ExerciseNameInput
                        id={`workout-exercise-${index}`}
                        exercise={exercise}
                        exercises={libraryExercises}
                        onChange={(changes) => updateExercise(index, changes)}
                      />
                    </div>
                    <Button type="button" size="icon" variant="ghost" title="Quitar ejercicio" onClick={() => setForm((value) => ({
                      ...value,
                      exercises: value.exercises.filter((_, exerciseIndex) => exerciseIndex !== index),
                    }))}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <ExerciseSetLogger
                    sets={exercise.sets}
                    idPrefix={`workout-exercise-${index}`}
                    defaultRepetitionsUnit={exercise.default_repetitions_unit}
                    defaultLoadUnit={exercise.default_load_unit}
                    onChange={(sets) => updateExercise(index, { sets })}
                  />
                  <div className="space-y-1.5">
                    <Label htmlFor={`exercise-note-${index}`}>Nota del ejercicio (opcional)</Label>
                    <Textarea
                      id={`exercise-note-${index}`}
                      value={exercise.note || ''}
                      onChange={(event) => updateExercise(index, { note: event.target.value })}
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button type="button" variant="outline" onClick={() => setForm((value) => ({ ...value, exercises: [...value.exercises, emptyExercise()] }))} data-testid="workout-add-exercise">
              <Plus className="w-4 h-4 mr-1" /> Añadir ejercicio
            </Button>
            {form.exercises.length > 0 && validExercises.length === 0 && (
              <p className="text-xs text-destructive">Añade al menos un ejercicio con una serie que tenga repeticiones o carga.</p>
            )}
            {validExercises.length > 0 && droppedExercises.length > 0 && (
              <p className="text-xs text-destructive" data-testid="workout-dropped-exercises">
                {droppedExercises.length === 1
                  ? `«${droppedExercises[0]}» no se guardará: ninguna de sus series tiene repeticiones ni peso.`
                  : `No se guardarán ${droppedExercises.map((label) => `«${label}»`).join(', ')}: ninguna de sus series tiene repeticiones ni peso.`}
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="endurance-modality">Modalidad</Label>
              <Select value={form.modality} onValueChange={(modality) => setForm((value) => ({ ...value, modality }))}>
                <SelectTrigger id="endurance-modality"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ENDURANCE_MODALITY_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endurance-distance">Distancia (km)</Label>
              <Input id="endurance-distance" type="number" min="0.001" step="any" value={inputNumber(form.distance_km)} onChange={(event) => setForm((value) => ({ ...value, distance_km: optionalNumber(event.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endurance-elevation">Desnivel positivo (m)</Label>
              <Input id="endurance-elevation" type="number" min="0" step="any" value={inputNumber(form.elevation_gain_m)} onChange={(event) => setForm((value) => ({ ...value, elevation_gain_m: optionalNumber(event.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endurance-heart-rate">Frecuencia cardiaca media</Label>
              <Input id="endurance-heart-rate" type="number" min="20" max="250" value={inputNumber(form.avg_heart_rate)} onChange={(event) => setForm((value) => ({ ...value, avg_heart_rate: optionalNumber(event.target.value) }))} />
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="workout-duration">Duración (min)</Label>
            <Input id="workout-duration" type="number" min="0.01" step="any" value={inputNumber(form.duration_minutes)} onChange={(event) => setForm((value) => ({ ...value, duration_minutes: optionalNumber(event.target.value) }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="workout-energy">Calorías quemadas</Label>
            <Input id="workout-energy" type="number" min="0" step="any" value={inputNumber(form.energy_expenditure_kcal)} onChange={(event) => setForm((value) => ({ ...value, energy_expenditure_kcal: optionalNumber(event.target.value) }))} />
            <p className="text-[11px] text-muted-foreground">Tu dato medido si lo tienes; si lo rellenó la IA, es una estimación.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="workout-exertion">Esfuerzo percibido (1–10)</Label>
            <Input id="workout-exertion" type="number" min="1" max="10" value={inputNumber(form.perceived_exertion)} onChange={(event) => setForm((value) => ({ ...value, perceived_exertion: optionalNumber(event.target.value) }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="workout-pain">Molestia o dolor</Label>
            <Select value={form.pain_or_discomfort} onValueChange={(pain_or_discomfort) => setForm((value) => ({ ...value, pain_or_discomfort }))}>
              <SelectTrigger id="workout-pain"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unknown">Sin indicar</SelectItem>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="yes">Sí</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="workout-note">Nota (opcional)</Label>
          <Textarea id="workout-note" value={form.note} maxLength={2000} rows={3} onChange={(event) => setForm((value) => ({ ...value, note: event.target.value }))} />
        </div>
        <p className="text-xs text-muted-foreground">El volumen y el ritmo se calcularán al guardar.</p>

        {allowSaveAsTemplate && (
          <SaveHealthTemplateFields
            value={templateChoice}
            suggestedGroups={suggestedGroups}
            onChange={(next) => setTemplateChoice({
              ...next,
              title: next.enabled && !next.title ? form.title : next.title,
            })}
          />
        )}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button
          type="button"
          onClick={submit}
          disabled={saving || submitting || !form.title.trim() || !toObservedAt(form.observed_at) || (form.kind === 'strength' && validExercises.length === 0) || (allowSaveAsTemplate && templateChoice.enabled && !templateChoice.title.trim())}
          data-testid="workout-save"
        >
          {saving || submitting ? 'Guardando...' : activity ? 'Guardar cambios' : 'Guardar entrenamiento'}
        </Button>
      </div>
      </DialogContent>
    </Dialog>
  );
}
