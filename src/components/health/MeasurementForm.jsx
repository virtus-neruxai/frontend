import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { formatDateTimeLocal, inputNumber, optionalNumber, toObservedAt } from '../../lib/healthRecords';

export default function MeasurementForm({ activity = null, observedAt = null, saving, onSubmit, onCancel }) {
  const details = activity?.details || {};
  const [form, setForm] = useState(() => ({
    category: details.category || '',
    value: details.value ?? null,
    unit: details.unit || '',
    method: details.method || '',
    quality: details.quality || 'unknown',
    note: activity?.note || '',
    observed_at: formatDateTimeLocal(activity?.observed_at || observedAt),
  }));

  const submit = async () => {
    const iso = toObservedAt(form.observed_at);
    if (!form.category.trim() || !form.unit.trim() || form.value == null || form.value <= 0 || !iso) return;
    await onSubmit({
      activity_type: 'composition',
      title: form.category.trim(),
      note: form.note.trim(),
      observed_at: iso,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      details: {
        kind: 'measurement',
        category: form.category.trim(),
        value: Number(form.value),
        unit: form.unit.trim(),
        method: form.method.trim() || null,
        quality: form.quality === 'unknown' ? null : form.quality,
      },
    });
  };

  return (
    <Card data-testid="measurement-form">
      <CardHeader><CardTitle className="text-base">{activity ? 'Editar medida' : 'Registrar medida'}</CardTitle></CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="measurement-category">Categoría</Label>
          <Input id="measurement-category" value={form.category} onChange={(event) => setForm((value) => ({ ...value, category: event.target.value }))} placeholder="Peso, cintura, grasa corporal..." list="measurement-category-options" />
          <datalist id="measurement-category-options"><option value="peso" /><option value="grasa_corporal" /><option value="cintura" /></datalist>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="measurement-when">Fecha y hora</Label>
          <Input id="measurement-when" type="datetime-local" value={form.observed_at} onChange={(event) => setForm((value) => ({ ...value, observed_at: event.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="measurement-value">Valor</Label>
          <Input id="measurement-value" type="number" min="0.01" step="any" value={inputNumber(form.value)} onChange={(event) => setForm((value) => ({ ...value, value: optionalNumber(event.target.value) }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="measurement-unit">Unidad</Label>
          <Input id="measurement-unit" value={form.unit} onChange={(event) => setForm((value) => ({ ...value, unit: event.target.value }))} placeholder="kg, %, cm..." list="measurement-unit-options" />
          <datalist id="measurement-unit-options"><option value="kg" /><option value="%" /><option value="cm" /></datalist>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="measurement-method">Método (opcional)</Label>
          <Input id="measurement-method" value={form.method} onChange={(event) => setForm((value) => ({ ...value, method: event.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="measurement-quality">Calidad del dato</Label>
          <Select value={form.quality} onValueChange={(quality) => setForm((value) => ({ ...value, quality }))}>
            <SelectTrigger id="measurement-quality"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unknown">Sin indicar</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Media</SelectItem>
              <SelectItem value="low">Baja</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="measurement-note">Nota (opcional)</Label>
          <Textarea id="measurement-note" value={form.note} rows={2} onChange={(event) => setForm((value) => ({ ...value, note: event.target.value }))} />
        </div>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="button" onClick={submit} disabled={saving || !form.category.trim() || !form.unit.trim() || form.value == null || form.value <= 0 || !toObservedAt(form.observed_at)}>
          {saving ? 'Guardando...' : activity ? 'Guardar cambios' : 'Guardar medida'}
        </Button>
      </CardFooter>
    </Card>
  );
}
