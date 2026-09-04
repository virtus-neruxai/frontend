import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export const EMPTY_TEMPLATE_CHOICE = { enabled: false, title: '', groups: '' };

export default function SaveHealthTemplateFields({ value, onChange, suggestedGroups = [] }) {
  const update = (changes) => onChange({ ...value, ...changes });

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-3" data-testid="save-template-fields">
      <div className="flex items-start gap-2">
        <Checkbox
          id="save-health-template"
          checked={value.enabled}
          onCheckedChange={(checked) => update({ enabled: checked === true })}
        />
        <div className="space-y-0.5">
          <Label htmlFor="save-health-template" className="cursor-pointer">
            Guardar también como plantilla
          </Label>
          <p className="text-xs text-muted-foreground">
            Podrás reutilizar esta entrada otro día sin volver a escribir sus datos.
          </p>
        </div>
      </div>

      {value.enabled && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="health-template-title">Título de la plantilla</Label>
            <Input
              id="health-template-title"
              value={value.title}
              onChange={(event) => update({ title: event.target.value })}
              placeholder="Ej: Desayuno habitual"
              maxLength={200}
              required
              data-testid="health-template-title"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="health-template-groups">Grupos (opcional)</Label>
            <Input
              id="health-template-groups"
              value={value.groups}
              onChange={(event) => update({ groups: event.target.value })}
              placeholder="Desayunos, Sábados"
              list="health-template-group-suggestions"
              data-testid="health-template-groups"
            />
            <datalist id="health-template-group-suggestions">
              {suggestedGroups.map((group) => <option key={group} value={group} />)}
            </datalist>
            <p className="text-xs text-muted-foreground">Separa varios grupos con comas.</p>
          </div>
        </div>
      )}
    </div>
  );
}

