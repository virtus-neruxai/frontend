import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { NUTRIENT_FIELDS, inputNumber, optionalNumber } from '../../lib/healthRecords';

export default function NutrientFields({ idPrefix, nutrients, basisUnit, onNutrientsChange, onBasisUnitChange }) {
  const [open, setOpen] = useState(false);
  const values = nutrients || {};

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border">
      <CollapsibleTrigger asChild>
        <Button type="button" variant="ghost" className="w-full justify-between px-3">
          Nutrientes por 100 {basisUnit || 'g'} (opcional)
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 px-3 pb-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-basis`}>Base del alimento</Label>
          <Select value={basisUnit || 'g'} onValueChange={onBasisUnitChange}>
            <SelectTrigger id={`${idPrefix}-basis`}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="g">Por 100 g</SelectItem>
              <SelectItem value="ml">Por 100 ml</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {NUTRIENT_FIELDS.map(([field, label, unit]) => (
            <div key={field} className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-${field}`}>{label} ({unit})</Label>
              <Input
                id={`${idPrefix}-${field}`}
                type="number"
                min="0"
                step="any"
                value={inputNumber(values[field])}
                onChange={(event) => onNutrientsChange({
                  ...values,
                  [field]: optionalNumber(event.target.value),
                })}
              />
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

