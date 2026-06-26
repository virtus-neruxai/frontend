import { Button } from '../../../components/ui/button';

export function StatsDateRangeControls({
  range = '30',
  onRangeChange,
  fromDate = '',
  toDate = '',
  onFromDateChange,
  onToDateChange,
  rangeOptions = [],
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <div className="flex gap-1">
        {rangeOptions.map((option) => (
          <Button
            key={option.value}
            variant={range === option.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onRangeChange && onRangeChange(option.value)}
            className="h-7 px-2 text-xs rounded-full"
          >
            {option.label}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={fromDate}
          onChange={(event) => onFromDateChange && onFromDateChange(event.target.value)}
          className="px-3 py-1.5 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Fecha de inicio"
        />
        <span className="text-xs text-muted-foreground">a</span>
        <input
          type="date"
          value={toDate}
          onChange={(event) => onToDateChange && onToDateChange(event.target.value)}
          className="px-3 py-1.5 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Fecha de fin"
        />
      </div>
    </div>
  );
}
