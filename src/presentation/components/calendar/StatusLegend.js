const STATUS_ENTRIES = [
  { key: 'todo',        label: 'Pendiente',    style: { backgroundColor: 'hsl(var(--status-todo))' } },
  { key: 'in_progress', label: 'En Progreso',  style: { backgroundColor: 'hsl(var(--status-in-progress))' } },
  { key: 'done',        label: 'Completada',   style: { backgroundColor: 'color-mix(in srgb, hsl(var(--status-done)) 62%, hsl(var(--card)))' } },
  { key: 'blocked',     label: 'Bloqueada',    style: { backgroundColor: 'hsl(var(--status-blocked))' } },
  { key: 'failed',      label: 'Fallida',      style: { backgroundColor: 'color-mix(in srgb, hsl(var(--status-failed)) 62%, hsl(var(--card)))' } },
  { key: 'routine',     label: 'Rutina',       style: { backgroundColor: 'color-mix(in srgb, hsl(var(--status-in-progress)) 42%, white)' } },
];

export function StatusLegend() {
  return (
    <div className="flex items-center gap-6 mt-4 px-2 flex-wrap">
      {STATUS_ENTRIES.map(({ key, label, style }) => (
        <div key={key} className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={style} />
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}
