import { useEffect, useMemo, useState } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export default function FoodNameInput({ id, value, foods, onChange }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const matches = useMemo(() => {
    const query = String(value || '').trim().toLocaleLowerCase('es');
    if (!query) return foods.slice(0, 6);
    return foods.filter((food) => {
      const names = [food.label, ...(food.aliases || [])];
      return names.some((name) => String(name || '').toLocaleLowerCase('es').includes(query));
    }).slice(0, 6);
  }, [foods, value]);

  useEffect(() => {
    setActiveIndex(0);
  }, [value]);

  const selectFood = (food) => {
    onChange({
      label: food.label,
      food_key: food.food_key || food.id || null,
      nutrients_per_100: food.nutrients_per_100 || null,
      nutrient_basis_unit: food.nutrient_basis_unit || 'g',
      nutrient_source: food.nutrient_source || { source: 'manual' },
      unit: food.default_unit || (food.nutrient_basis_unit === 'ml' ? 'ml' : 'g'),
      household_units: food.household_units || [],
      // Mass belongs to the selected food + portion pair. Keeping a
      // resolved value from the previous suggestion would make the backend
      // (correctly) trust stale grams and skew totals.
      grams: null,
      assumptions: [],
    });
    setOpen(false);
  };

  return (
    <div className="relative space-y-1.5">
      <Label htmlFor={id}>Alimento</Label>
      <Input
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && matches.length > 0}
        aria-controls={`${id}-options`}
        aria-activedescendant={open && matches[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
        value={value}
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
            selectFood(matches[activeIndex]);
          } else if (event.key === 'Escape') {
            setOpen(false);
          }
        }}
        onChange={(event) => {
          setOpen(true);
          onChange({
            label: event.target.value,
            food_key: null,
            nutrients_per_100: null,
            nutrient_source: null,
            nutrient_basis_unit: 'g',
            household_units: [],
            unit: 'g',
            grams: null,
            assumptions: [],
          });
        }}
        placeholder="Ej: yogur natural"
      />
      {open && matches.length > 0 && (
        <div
          id={`${id}-options`}
          role="listbox"
          className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md"
        >
          {matches.map((food) => (
            <button
              key={food.id || food.food_key || food.label}
              id={`${id}-option-${matches.indexOf(food)}`}
              type="button"
              role="option"
              tabIndex={-1}
              aria-selected={matches[activeIndex] === food}
              className={`w-full rounded-sm px-2 py-2 text-left text-sm hover:bg-accent focus:outline-none ${matches[activeIndex] === food ? 'bg-accent' : ''}`}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(matches.indexOf(food))}
              onClick={() => selectFood(food)}
            >
              <span className="font-medium">{food.label}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                usado {food.usage_count || 0} veces
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
