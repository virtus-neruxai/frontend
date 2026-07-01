import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { useState } from 'react';
import { CheckSquare, Repeat, Target } from 'lucide-react';

const INACTIVE_STATUSES = new Set(['done', 'completed', 'failed']);

const TYPE_FILTERS = [
  { key: 'all',     label: 'Todos' },
  { key: 'task',    label: 'Tareas' },
  { key: 'mission', label: 'Misiones' },
  { key: 'routine', label: 'Rutinas' },
];

const LIMITS = [5, 10, 20, null];

const STATUS_LABELS = {
  active:      'Activa',
  todo:        'Pendiente',
  in_progress: 'En progreso',
  blocked:     'Bloqueada',
};

const itemKind = (t) => {
  if (t.task_kind === 'routine') return 'routine';
  if (t.linked_mission_id)      return 'mission';
  return 'task';
};

const typeIcon = (kind) => {
  if (kind === 'mission') return <Target className="w-3.5 h-3.5" />;
  if (kind === 'routine') return <Repeat className="w-3.5 h-3.5" />;
  return <CheckSquare className="w-3.5 h-3.5" />;
};

const typeLabel = (kind) => {
  if (kind === 'mission') return 'Misión';
  if (kind === 'routine') return 'Rutina';
  return 'Tarea';
};

const statusColor = (item) => {
  if (item._kind === 'routine') {
    return 'color-mix(in srgb, hsl(var(--status-in-progress)) 42%, white)';
  }
  return {
    active:      'hsl(var(--status-in-progress))',
    in_progress: 'hsl(var(--status-in-progress))',
    blocked:     'hsl(var(--status-blocked))',
    todo:        'hsl(var(--status-todo))',
  }[item.status] || 'hsl(var(--status-todo))';
};

const formatDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export function ActiveItemsPanel({ tasks = [], onItemClick }) {
  const [typeFilter, setTypeFilter] = useState('all');
  const [limit, setLimit]           = useState(10);

  // All items come from the tasks array — linked tasks get mission icon
  const activeItems = tasks
    .filter((t) => !INACTIVE_STATUSES.has(t.status))
    .map((t) => ({ ...t, _kind: itemKind(t) }))
    .sort((a, b) => {
      const da = a.date_end || a.date_start || '';
      const db = b.date_end || b.date_start || '';
      return db.localeCompare(da);
    });

  const filtered = typeFilter === 'all'
    ? activeItems
    : activeItems.filter((item) => item._kind === typeFilter);

  const visible = limit === null ? filtered : filtered.slice(0, limit);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Activos</p>
        <Badge variant="secondary" className="text-xs">{filtered.length}</Badge>
      </div>

      {/* Type filter */}
      <div className="flex flex-wrap gap-1">
        {TYPE_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTypeFilter(key)}
            className={[
              'px-2 py-0.5 rounded-full text-xs font-medium transition-colors',
              typeFilter === key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/70',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Count limit */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Mostrar:</span>
        {LIMITS.map((n) => (
          <button
            key={n ?? 'all'}
            onClick={() => setLimit(n)}
            className={[
              'px-2 py-0.5 rounded-full text-xs font-medium transition-colors',
              limit === n
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/70',
            ].join(' ')}
          >
            {n ?? 'Todos'}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex flex-col gap-2">
        {visible.length === 0 && (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Sin elementos activos
          </p>
        )}
        {visible.map((item) => (
          <button
            key={`${item._kind}-${item.id}`}
            onClick={() => onItemClick?.(item)}
            className="w-full text-left rounded-lg border bg-card hover:bg-muted/50 transition-colors overflow-hidden"
          >
            <div className="flex">
              <div className="w-1 shrink-0" style={{ backgroundColor: statusColor(item) }} />
              <div className="p-3 min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-muted-foreground shrink-0">{typeIcon(item._kind)}</span>
                  <span className="text-xs font-medium text-foreground truncate">{item.title}</span>
                </div>
                {(item.date_end || item.date_start) && (
                  <p className="text-xs text-muted-foreground mt-0.5 pl-5">
                    {formatDate(item.date_end || item.date_start)}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1 pl-5">
                  <span className="text-[10px] text-muted-foreground">{typeLabel(item._kind)}</span>
                  {STATUS_LABELS[item.status] && (
                    <span className="text-[10px] font-medium" style={{ color: statusColor(item) }}>
                      · {STATUS_LABELS[item.status]}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {limit !== null && filtered.length > limit && (
        <Button variant="ghost" size="sm" className="text-xs w-full" onClick={() => setLimit(null)}>
          Ver todos ({filtered.length})
        </Button>
      )}
    </div>
  );
}
