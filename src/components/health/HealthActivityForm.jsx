import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

// Mirrors shared.models.health_guidance.HealthDomain — see backend/routes/health_activities.py.
export const ACTIVITY_TYPE_LABELS = {
  nutrition: 'Alimentación',
  training: 'Entrenamiento',
  recovery: 'Descanso',
  composition: 'Composición corporal',
  mental_wellbeing: 'Bienestar mental',
  general_health: 'Salud general',
  holistic: 'Varias áreas',
};

const TITLE_MAX_CHARS = 200;
const NOTE_MAX_CHARS = 2000;

function formatDateTimeLocal(isoString) {
  const date = isoString ? new Date(isoString) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function emptyForm(activity) {
  return {
    activity_type: activity?.activity_type || 'training',
    title: activity?.title || '',
    note: activity?.note || '',
    observed_at: formatDateTimeLocal(activity?.observed_at),
  };
}

/**
 * One form for every activity type — the type is a selector, not four
 * separate forms. Used both to create a record and, passed an `activity`, to
 * edit one in place.
 */
export default function HealthActivityForm({ activity = null, saving, onSubmit, onCancel, lockActivityType = false }) {
  const [form, setForm] = useState(() => emptyForm(activity));
  const isEdit = Boolean(activity);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSubmit({
      activity_type: form.activity_type,
      title: form.title.trim(),
      note: form.note.trim(),
      observed_at: new Date(form.observed_at).toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  };

  return (
    <Card data-testid="health-activity-form">
      <CardHeader>
        <CardTitle className="text-base">
          {isEdit ? 'Editar registro' : 'Registrar actividad'}
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {!lockActivityType && (
            <div className="space-y-2">
              <Label htmlFor="health-activity-type">Tipo</Label>
              <Select
                value={form.activity_type}
                onValueChange={(value) => setForm((f) => ({ ...f, activity_type: value }))}
              >
                <SelectTrigger id="health-activity-type" data-testid="health-activity-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="health-activity-title">Título</Label>
            <Input
              id="health-activity-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ej: Entreno de pierna, Comida, Sesión de fisio..."
              maxLength={TITLE_MAX_CHARS}
              data-testid="health-activity-title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="health-activity-when">Fecha y hora</Label>
            <Input
              id="health-activity-when"
              type="datetime-local"
              value={form.observed_at}
              onChange={(e) => setForm((f) => ({ ...f, observed_at: e.target.value }))}
              data-testid="health-activity-when"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="health-activity-note">Nota (opcional)</Label>
            <Textarea
              id="health-activity-note"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Cualquier detalle que quieras recordar de este registro..."
              maxLength={NOTE_MAX_CHARS}
              rows={3}
              data-testid="health-activity-note"
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          {isEdit && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={saving || !form.title.trim()} data-testid="health-activity-save">
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Registrar'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
