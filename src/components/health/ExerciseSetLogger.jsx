import { useState } from 'react';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import RestTimer from './RestTimer';
import {
  LOAD_UNIT_LABELS,
  REPETITION_UNIT_LABELS,
  cloneHealthValue,
  inputNumber,
  optionalNumber,
} from '../../lib/healthRecords';

export function emptySet(defaultRepetitionsUnit = 'reps', defaultLoadUnit = 'kg') {
  return {
    repetitions: null,
    repetitions_unit: defaultRepetitionsUnit,
    load: null,
    load_unit: defaultLoadUnit,
    rir: null,
    rest_seconds: null,
    note: '',
  };
}

export function isRecordedSet(entry) {
  const repetitions = optionalNumber(entry.repetitions);
  const load = optionalNumber(entry.load);
  return (repetitions !== null && repetitions > 0)
    || (load !== null && load >= 0);
}

function SetRow({ entry, index, idPrefix, onChange, onRemove }) {
  const [open, setOpen] = useState(false);
  const fieldId = (field) => `${idPrefix}-set-${index}-${field}`;
  return (
    <div className="rounded-lg border p-3 space-y-3" data-testid={`${idPrefix}-set-${index}`}>
      <div className="flex items-end gap-2">
        <span className={`mb-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${isRecordedSet(entry) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          {index + 1}
        </span>
        <div className="grid flex-1 gap-2 sm:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor={fieldId('reps')}>Cantidad</Label>
            <Input
              id={fieldId('reps')}
              type="number"
              min="0.01"
              step="any"
              value={inputNumber(entry.repetitions)}
              onChange={(event) => onChange({ repetitions: optionalNumber(event.target.value) })}
              data-testid={`${idPrefix}-set-repetitions-${index}`}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={fieldId('reps-unit')}>Unidad</Label>
            <Select value={entry.repetitions_unit || 'reps'} onValueChange={(repetitions_unit) => onChange({ repetitions_unit })}>
              <SelectTrigger id={fieldId('reps-unit')}><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(REPETITION_UNIT_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor={fieldId('load')}>Carga</Label>
            <Input
              id={fieldId('load')}
              type="number"
              min="0"
              step="any"
              value={inputNumber(entry.load)}
              onChange={(event) => onChange({ load: optionalNumber(event.target.value) })}
              data-testid={`${idPrefix}-set-load-${index}`}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={fieldId('load-unit')}>Unidad carga</Label>
            <Select value={entry.load_unit || 'kg'} onValueChange={(load_unit) => onChange({ load_unit })}>
              <SelectTrigger id={fieldId('load-unit')}><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(LOAD_UNIT_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 mb-0.5" title="Quitar serie" onClick={onRemove}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs">
            RIR, descanso y nota <ChevronDown className={`ml-1 w-3 h-3 ${open ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="grid gap-3 pt-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor={fieldId('rir')}>RIR (0–10)</Label>
            <Input
              id={fieldId('rir')}
              type="number"
              min="0"
              max="10"
              value={inputNumber(entry.rir)}
              onChange={(event) => onChange({ rir: optionalNumber(event.target.value) })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={fieldId('rest')}>Descanso (s)</Label>
            <Input
              id={fieldId('rest')}
              type="number"
              min="0"
              value={inputNumber(entry.rest_seconds)}
              onChange={(event) => onChange({ rest_seconds: optionalNumber(event.target.value) })}
            />
            <RestTimer initialSeconds={entry.rest_seconds ?? 60} />
          </div>
          <div className="space-y-1">
            <Label htmlFor={fieldId('note')}>Nota</Label>
            <Textarea
              id={fieldId('note')}
              value={entry.note || ''}
              maxLength={200}
              rows={2}
              onChange={(event) => onChange({ note: event.target.value })}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
      {!isRecordedSet(entry) && <p className="text-xs text-muted-foreground">Esta serie vacía no se guardará.</p>}
    </div>
  );
}

export default function ExerciseSetLogger({
  sets,
  onChange,
  defaultRepetitionsUnit = 'reps',
  defaultLoadUnit = 'kg',
  idPrefix = 'exercise',
}) {
  const addSet = () => {
    const previous = sets.at(-1);
    onChange([
      ...sets,
      previous ? cloneHealthValue(previous) : emptySet(defaultRepetitionsUnit, defaultLoadUnit),
    ]);
  };

  return (
    <div className="space-y-3">
      {sets.map((entry, index) => (
        <SetRow
          key={index}
          entry={entry}
          index={index}
          idPrefix={idPrefix}
          onChange={(changes) => onChange(sets.map((set, setIndex) => setIndex === index ? { ...set, ...changes } : set))}
          onRemove={() => onChange(sets.filter((_, setIndex) => setIndex !== index))}
        />
      ))}
      <Button type="button" variant="outline" onClick={addSet} data-testid="exercise-add-set">
        <Plus className="w-4 h-4 mr-1" /> Serie
      </Button>
    </div>
  );
}
