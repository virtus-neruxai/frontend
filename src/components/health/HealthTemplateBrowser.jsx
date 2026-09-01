import { useMemo, useState } from 'react';
import { Dumbbell, Pencil, Trash2, Utensils } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import CollapsibleSection from './CollapsibleSection';
import { splitGroups } from '../../lib/healthRecords';

const UNGROUPED = 'Sin grupo';

function templateSummary(template) {
  const details = template.details || {};
  if (details.kind === 'nutrition') return `${details.foods?.length || 0} alimentos`;
  if (details.kind === 'strength') {
    const sets = (details.exercises || []).reduce((total, exercise) => total + (exercise.sets?.length || 0), 0);
    return `${details.exercises?.length || 0} ejercicios · ${sets} series`;
  }
  if (details.kind === 'endurance') return 'Sesión de resistencia';
  return 'Entrada guardada';
}

function TemplateCard({ template, onUse, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [title, setTitle] = useState(template.title || '');
  const [groups, setGroups] = useState(() => splitGroups(template.groups).join(', '));
  const Icon = template.activity_type === 'nutrition' ? Utensils : Dumbbell;

  if (editing) {
    return (
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`template-title-${template.id}`}>Título</Label>
            <Input id={`template-title-${template.id}`} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`template-groups-${template.id}`}>Grupos</Label>
            <Input id={`template-groups-${template.id}`} value={groups} onChange={(e) => setGroups(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
            <Button
              type="button"
              disabled={!title.trim()}
              onClick={async () => {
                const saved = await onUpdate(template.id, { title: title.trim(), groups: splitGroups(groups) });
                if (saved) setEditing(false);
              }}
            >
              Guardar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid={`health-template-${template.id}`}>
      <CardContent className="pt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-muted-foreground" />
            <p className="font-medium text-sm truncate">{template.title}</p>
          </div>
          <p className="text-xs text-muted-foreground">{templateSummary(template)}</p>
          {splitGroups(template.groups).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {splitGroups(template.groups).map((group) => (
                <Badge key={group} variant="secondary" className="font-normal">{group}</Badge>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button type="button" size="sm" onClick={() => onUse(template)}>Usar</Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" title="Editar plantilla" onClick={() => setEditing(true)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className={`h-8 w-8 ${confirmDelete ? 'text-destructive' : ''}`}
            title={confirmDelete ? 'Confirmar eliminación' : 'Eliminar plantilla'}
            onClick={async () => {
              if (!confirmDelete) { setConfirmDelete(true); return; }
              await onRemove(template.id);
            }}
            onBlur={() => setConfirmDelete(false)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HealthTemplateBrowser({ templates, groups, loading, onUse, onUpdate, onRemove }) {
  // A template can carry several groups, so it is listed once per group it
  // belongs to — that is what "browse by group" means. One without any group
  // still needs somewhere to live, hence the trailing bucket.
  const sections = useMemo(() => {
    const byGroup = new Map(groups.map((group) => [group, []]));
    const ungrouped = [];
    templates.forEach((template) => {
      const templateGroups = splitGroups(template.groups);
      if (templateGroups.length === 0) {
        ungrouped.push(template);
        return;
      }
      templateGroups.forEach((group) => {
        if (!byGroup.has(group)) byGroup.set(group, []);
        byGroup.get(group).push(template);
      });
    });
    const result = [...byGroup.entries()].filter(([, items]) => items.length > 0);
    if (ungrouped.length > 0) result.push([UNGROUPED, ungrouped]);
    return result;
  }, [groups, templates]);

  return (
    <CollapsibleSection
      title="Plantillas guardadas"
      description={
        loading
          ? 'Cargando plantillas...'
          : templates.length === 0
            ? 'Aún no has guardado plantillas.'
            : `${templates.length} guardada${templates.length === 1 ? '' : 's'} · elige una para registrarla en otra fecha`
      }
      testId="health-template-browser"
    >
      {loading ? null : sections.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aún no has guardado plantillas.</p>
      ) : (
        <div className="space-y-4">
          {sections.map(([group, items]) => (
            <div key={group} className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</h4>
              <div className="grid gap-2 md:grid-cols-2">
                {items.map((template) => (
                  <TemplateCard
                    key={`${group}-${template.id}`}
                    template={template}
                    onUse={onUse}
                    onUpdate={onUpdate}
                    onRemove={onRemove}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </CollapsibleSection>
  );
}
