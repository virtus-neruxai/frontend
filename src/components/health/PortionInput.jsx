import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  inputNumber,
  optionalNumber,
  parsePortionInput,
  resolvePortionBaseAmount,
} from '../../lib/healthRecords';

export default function PortionInput({ id, portion, householdUnits = [], onChange }) {
  const formatted = portion.quantity != null
    ? `${portion.quantity} ${portion.unit || ''}`.trim()
    : '';
  const [text, setText] = useState(formatted);
  const focusedRef = useRef(false);

  // While typing, values such as `1,` are intentionally incomplete. The
  // parent cannot represent that intermediate state, so synchronizing its
  // empty parsed value back immediately would erase decimal input.
  useEffect(() => {
    if (!focusedRef.current) setText(formatted);
  }, [formatted]);

  const baseAmount = useMemo(() => resolvePortionBaseAmount(
    portion.quantity,
    portion.unit,
    portion.nutrient_basis_unit || 'g',
    householdUnits,
  ), [householdUnits, portion.nutrient_basis_unit, portion.quantity, portion.unit]);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Cantidad y unidad</Label>
      <Input
        id={id}
        value={text}
        list={`${id}-units`}
        placeholder="175 g, 250 ml, 2 unidades..."
        onFocus={() => { focusedRef.current = true; }}
        onBlur={() => {
          focusedRef.current = false;
          setText(formatted);
        }}
        onChange={(event) => {
          const nextText = event.target.value;
          setText(nextText);
          if (!nextText.trim()) {
            onChange({ quantity: null, unit: '', grams: null });
            return;
          }
          const parsed = parsePortionInput(nextText);
          // Keep a raw intermediate value (`1,`, `1.`) locally. Only a full
          // quantity+unit is a portion the canonical form can consume.
          if (parsed.quantity == null || !parsed.unit) return;
          const resolved = resolvePortionBaseAmount(
            parsed.quantity,
            parsed.unit,
            portion.nutrient_basis_unit || 'g',
            householdUnits,
          );
          onChange({
            quantity: parsed.quantity,
            unit: parsed.unit,
            // `grams` is mass only. A ml-based snapshot uses quantity+unit;
            // it must never masquerade as grams.
            grams: portion.nutrient_basis_unit === 'g' ? resolved : null,
          });
        }}
      />
      <datalist id={`${id}-units`}>
        <option value="100 g" />
        <option value="100 ml" />
        {householdUnits.map((unit) => <option key={unit.name} value={`1 ${unit.name}`} />)}
      </datalist>
      {portion.quantity != null && portion.unit && (
        <>
          <p className="text-xs text-muted-foreground">
            {baseAmount == null
              ? `Sin conversión automática a base ${portion.nutrient_basis_unit || 'g'}`
              : `Cantidad base: ${baseAmount} ${portion.nutrient_basis_unit || 'g'}`}
          </p>
          {baseAmount == null && portion.nutrient_basis_unit === 'g' && (
            <div className="space-y-1.5 pt-1">
              <Label htmlFor={`${id}-grams`}>Equivale a (g), opcional</Label>
              <Input
                id={`${id}-grams`}
                type="number"
                min="0"
                step="any"
                value={inputNumber(portion.grams)}
                onChange={(event) => onChange({ grams: optionalNumber(event.target.value) })}
                placeholder="No se asume ninguna densidad"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
