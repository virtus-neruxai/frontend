import { useEffect, useState } from 'react';
import { Pencil, Target, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { useHealthGoal } from '../../presentation/viewmodels/useHealthGoal';

const MAX_STATEMENT_CHARS = 300;

// Mirrors HealthDimension in shared/shared/models/health_guidance.py.
const DIMENSIONS = [
  ['activity', 'Actividad'],
  ['recovery', 'Recuperación'],
  ['nutrition', 'Nutrición'],
  ['composition', 'Composición'],
  ['followup', 'Seguimiento'],
];

/**
 * The health goal, edited where it is measured against.
 *
 * Not in Ajustes: a goal only means anything next to the report that reads
 * coverage against it, and a setting you have to go and find is a setting
 * nobody revisits when their goal changes.
 *
 * The dimensions are the load-bearing part, not the prose. Nothing parses the
 * statement — it reaches the report verbatim — while the checked dimensions
 * decide which missing measurement gets asked for first. Checking none is a
 * valid answer and means "no preference stated".
 */
export default function HealthGoalSettings() {
  const { goal, loading, saving, save, clear } = useHealthGoal();
  const [editing, setEditing] = useState(false);
  const [statement, setStatement] = useState('');
  const [tracked, setTracked] = useState([]);

  useEffect(() => {
    setStatement(goal?.statement || '');
    setTracked(goal?.tracked_dimensions || []);
  }, [goal]);

  const toggle = (dimension) => setTracked((current) => (
    current.includes(dimension)
      ? current.filter((d) => d !== dimension)
      : [...current, dimension]
  ));

  const submit = async () => {
    const trimmed = statement.trim();
    if (!trimmed) return;
    const saved = await save(trimmed, tracked);
    if (saved) setEditing(false);
  };

  const remove = async () => {
    if (await clear()) setEditing(false);
  };

  if (loading) return null;

  if (!editing) {
    return (
      <Card data-testid="health-goal">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" /> Objetivo de salud
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {goal ? (
            <>
              <p className="text-sm text-foreground">{goal.statement}</p>
              <p className="text-xs text-muted-foreground">
                {tracked.length > 0
                  ? `Sigues: ${tracked.map((d) => DIMENSIONS.find(([k]) => k === d)?.[1] || d).join(' · ')}`
                  : 'Sin dimensiones marcadas: el informe prioriza por cobertura.'}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aún no has declarado ninguno. Si lo haces, el informe dirá qué se puede
              valorar con los datos que tienes y qué te falta para valorar el resto.
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)} data-testid="health-goal-edit">
              <Pencil className="mr-2 h-3.5 w-3.5" />
              {goal ? 'Editar' : 'Declarar objetivo'}
            </Button>
            {goal && (
              <Button variant="ghost" size="sm" onClick={remove} disabled={saving} data-testid="health-goal-clear">
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Borrar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="health-goal-form">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4" /> Objetivo de salud
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="health-goal-statement">En una frase, ¿hacia dónde vas?</Label>
          <Textarea
            id="health-goal-statement"
            value={statement}
            maxLength={MAX_STATEMENT_CHARS}
            rows={2}
            placeholder="Reducir grasa corporal conservando masa muscular"
            onChange={(event) => setStatement(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Sin cifras ni fechas: nadie va a puntuar tu avance contra esto.
            {' '}{statement.length}/{MAX_STATEMENT_CHARS}
          </p>
        </div>

        <div className="space-y-2">
          <Label>¿Qué importa para ese objetivo?</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {DIMENSIONS.map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={tracked.includes(key)}
                  onCheckedChange={() => toggle(key)}
                  aria-label={label}
                  data-testid={`health-goal-dimension-${key}`}
                />
                {label}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Lo que marques sube en la lista de «qué aportaría más ahora» del informe.
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={submit} disabled={saving || !statement.trim()} data-testid="health-goal-save">
            Guardar
          </Button>
          <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
