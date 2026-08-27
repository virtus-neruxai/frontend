import { useEffect, useMemo, useState } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export default function ExerciseNameInput({ id, exercise, exercises, onChange }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const matches = useMemo(() => {
    const query = String(exercise.label || '').trim().toLocaleLowerCase('es');
    if (!query) return exercises.slice(0, 6);
    return exercises.filter((entry) => (
      [entry.label, ...(entry.aliases || [])]
        .some((name) => String(name || '').toLocaleLowerCase('es').includes(query))
    )).slice(0, 6);
  }, [exercise.label, exercises]);

  useEffect(() => {
    setActiveIndex(0);
  }, [exercise.label]);

  const selectExercise = (entry) => {
    onChange({
      label: entry.label,
      exercise_key: entry.exercise_key || entry.id,
      default_repetitions_unit: entry.default_repetitions_unit || 'reps',
      default_load_unit: entry.default_load_unit || 'kg',
    });
    setOpen(false);
  };

  return (
    <div className="relative space-y-1.5">
      <Label htmlFor={id}>Ejercicio</Label>
      <Input
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && matches.length > 0}
        aria-controls={`${id}-options`}
        aria-activedescendant={open && matches[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
        value={exercise.label}
        onFocus={() => { setOpen(true); setActiveIndex(0); }}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && matches.length > 0) {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) => Math.min(index + 1, matches.length - 1));
          } else if (event.key === 'ArrowUp' && matches.length > 0) {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) => Math.max(index - 1, 0));
          } else if (event.key === 'Enter' && open && matches[activeIndex]) {
            event.preventDefault();
            selectExercise(matches[activeIndex]);
          } else if (event.key === 'Escape') {
            setOpen(false);
          }
        }}
        onChange={(event) => {
          setOpen(true);
          onChange({
            label: event.target.value,
            exercise_key: null,
            // These defaults came from the previously selected exercise.
            // Existing sets remain intact; only future sets return to neutral
            // units until the person picks another library suggestion.
            default_repetitions_unit: 'reps',
            default_load_unit: 'kg',
          });
        }}
        placeholder="Ej: press de banca"
      />
      {open && matches.length > 0 && (
        <div id={`${id}-options`} role="listbox" className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
          {matches.map((entry, index) => (
            <button
              key={entry.id || entry.exercise_key || entry.label}
              id={`${id}-option-${index}`}
              type="button"
              role="option"
              tabIndex={-1}
              aria-selected={activeIndex === index}
              className={`w-full rounded-sm px-2 py-2 text-left text-sm hover:bg-accent focus:outline-none ${activeIndex === index ? 'bg-accent' : ''}`}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectExercise(entry)}
            >
              <span className="font-medium">{entry.label}</span>
              {entry.muscle_group && <span className="ml-2 text-xs text-muted-foreground">{entry.muscle_group}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
