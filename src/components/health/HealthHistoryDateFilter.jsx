import { Button } from '../ui/button';
import { Input } from '../ui/input';

// Same pattern as the "Filtrar por fecha" control in el Diario (CharacterPage):
// a single date input, empty means "todas", and a reset button appears only
// once a date is picked.
export default function HealthHistoryDateFilter({ value, onChange, id }) {
  return (
    <div className="flex items-center gap-2">
      <Input
        id={id}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-auto"
        aria-label="Filtrar por fecha"
      />
      {value && (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange('')}>
          Ver todas
        </Button>
      )}
    </div>
  );
}
