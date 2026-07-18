import { useState } from 'react';
import { Button } from '../../../../components/ui/button';
import { Textarea } from '../../../../components/ui/textarea';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';

const SCALE_FIELDS = [
  { key: 'sleep_quality', label: 'Calidad del sueño' },
  { key: 'energy_level', label: 'Energía' },
  { key: 'stress_level', label: 'Estrés' },
  { key: 'fatigue_level', label: 'Fatiga' },
];

const EXERCISE_TYPES = ['caminar', 'fuerza', 'cardio', 'movilidad', 'otro'];

function ScaleSelector({ label, value, onChange, disabled }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="flex gap-1" role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Button
            key={n}
            type="button"
            size="sm"
            variant={value === n ? 'default' : 'outline'}
            disabled={disabled}
            onClick={() => onChange(value === n ? null : n)}
            aria-pressed={value === n}
          >
            {n}
          </Button>
        ))}
      </div>
    </div>
  );
}

/**
 * Formulario del Check-in corporal. Payload propio (nunca `content` de
 * reflection): la nota viaja como `note`. Sin edición ni borrado: una vez
 * guardado, el registro del día queda bloqueado.
 */
export function BodyCheckinForm({ onSubmit, saving = false, disabled = false }) {
  const [form, setForm] = useState({
    sleep_hours: '',
    sleep_quality: null,
    energy_level: null,
    stress_level: null,
    fatigue_level: null,
    exercise_done: null,
    exercise_minutes: '',
    exercise_intensity: null,
    exercise_type: null,
    note: '',
  });

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = () => {
    const payload = {
      sleep_hours: form.sleep_hours === '' ? null : Number(form.sleep_hours),
      sleep_quality: form.sleep_quality,
      energy_level: form.energy_level,
      stress_level: form.stress_level,
      fatigue_level: form.fatigue_level,
      exercise_done: form.exercise_done,
      exercise_minutes:
        form.exercise_done && form.exercise_minutes !== '' ? Number(form.exercise_minutes) : null,
      exercise_intensity: form.exercise_done ? form.exercise_intensity : null,
      exercise_type: form.exercise_done ? form.exercise_type : null,
      note: form.note.trim() || null,
    };
    onSubmit(payload);
  };

  const noteMissing = !form.note.trim();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="body-sleep-hours" className="text-xs uppercase tracking-wider text-muted-foreground">
            Horas de sueño
          </Label>
          <Input
            id="body-sleep-hours"
            type="number"
            min="0"
            max="24"
            step="0.5"
            placeholder="p. ej. 7.5"
            value={form.sleep_hours}
            disabled={disabled}
            onChange={(e) => set('sleep_hours', e.target.value)}
          />
        </div>
        {SCALE_FIELDS.map(({ key, label }) => (
          <ScaleSelector
            key={key}
            label={label}
            value={form[key]}
            disabled={disabled}
            onChange={(value) => set(key, value)}
          />
        ))}
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Ejercicio</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={form.exercise_done === true ? 'default' : 'outline'}
            disabled={disabled}
            onClick={() => set('exercise_done', form.exercise_done === true ? null : true)}
          >
            Sí
          </Button>
          <Button
            type="button"
            size="sm"
            variant={form.exercise_done === false ? 'default' : 'outline'}
            disabled={disabled}
            onClick={() => set('exercise_done', form.exercise_done === false ? null : false)}
          >
            No
          </Button>
          {form.exercise_done && (
            <>
              <Input
                type="number"
                min="0"
                max="600"
                className="w-28"
                placeholder="minutos"
                aria-label="Minutos de ejercicio"
                value={form.exercise_minutes}
                disabled={disabled}
                onChange={(e) => set('exercise_minutes', e.target.value)}
              />
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                aria-label="Tipo de ejercicio"
                value={form.exercise_type || ''}
                disabled={disabled}
                onChange={(e) => set('exercise_type', e.target.value || null)}
              >
                <option value="">Tipo</option>
                {EXERCISE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </>
          )}
        </div>
        {form.exercise_done && (
          <ScaleSelector
            label="Intensidad del ejercicio"
            value={form.exercise_intensity}
            disabled={disabled}
            onChange={(value) => set('exercise_intensity', value)}
          />
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="body-note" className="text-xs uppercase tracking-wider text-muted-foreground">
          Nota corporal
        </Label>
        <Textarea
          id="body-note"
          placeholder="¿Cómo está tu cuerpo hoy? Esta nota puede aportar evolución de stats."
          value={form.note}
          maxLength={2000}
          disabled={disabled}
          onChange={(e) => set('note', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          La nota es obligatoria para que el check-in quede registrado.
        </p>
      </div>

      <Button onClick={handleSubmit} disabled={disabled || saving || noteMissing}>
        {saving ? 'Guardando…' : 'Registrar check-in'}
      </Button>
    </div>
  );
}
