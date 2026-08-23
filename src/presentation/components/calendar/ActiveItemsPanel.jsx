import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { useState } from 'react';
import { CheckSquare, Repeat, Target } from 'lucide-react';
import { PROFILE_THEMES } from '../../../theme/profileThemes';
import { getProfileName, getProfileEmoji } from '../../../lib/profileUtils';
import { formatDateInput } from '../../../lib/dateRangeUtils';

const INACTIVE_STATUSES = new Set(['done', 'completed', 'failed']);

const TYPE_FILTERS = [
  { key: 'all',     label: 'Todos' },
  { key: 'task',    label: 'Tareas' },
  { key: 'mission', label: 'Misiones' },
  { key: 'routine', label: 'Rutinas' },
];

const LIMITS = [5, 10, 20, null];

// Active items live in the future, so the presets look forward from today.
const DATE_PRESETS = [
  { key: 'all',   label: 'Todo',    days: null },
  { key: 'today', label: 'Hoy',     days: 1 },
  { key: '7',     label: '7 días',  days: 7 },
  { key: '30',    label: '30 días', days: 30 },
];

const startOfDayFromInput = (value) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
};

const endOfDayFromInput = (value) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
};

const nextDaysRange = (days) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + Math.max(1, days) - 1);
  return { fromDate: formatDateInput(start), toDate: formatDateInput(end) };
};

/** [start, end] the item occupies. A recurring item runs until its `until`
 *  (or forever), not until the end of its first occurrence. */
const itemBounds = (item) => {
  const startIso = item.date_start || item.date_end;
  const endIso = item.date_end || item.date_start;
  if (!startIso) return null;

  const start = new Date(startIso).getTime();
  if (Number.isNaN(start)) return null;

  const rule = item.recurrence_rule;
  if (rule && rule.type) {
    const until = rule.until ? new Date(rule.until).getTime() : Infinity;
    return { start, end: Number.isNaN(until) ? Infinity : Math.max(start, until) };
  }

  const end = new Date(endIso).getTime();
  return { start, end: Number.isNaN(end) ? start : Math.max(start, end) };
};

/** True when the item overlaps the [fromDate, toDate] window (both optional,
 *  `YYYY-MM-DD`). Items without any date never match a window. */
export function isWithinDateRange(item, fromDate, toDate) {
  if (!fromDate && !toDate) return true;

  const bounds = itemBounds(item);
  if (!bounds) return false;

  const from = fromDate ? startOfDayFromInput(fromDate) : -Infinity;
  const to = toDate ? endOfDayFromInput(toDate) : Infinity;
  return bounds.start <= to && bounds.end >= from;
}

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
  const [datePreset, setDatePreset] = useState('all');
  const [fromDate, setFromDate]     = useState('');
  const [toDate, setToDate]         = useState('');

  const applyPreset = (preset) => {
    setDatePreset(preset.key);
    if (preset.days === null) {
      setFromDate('');
      setToDate('');
      return;
    }
    const range = nextDaysRange(preset.days);
    setFromDate(range.fromDate);
    setToDate(range.toDate);
  };

  // Typing a date by hand leaves the presets unselected (custom window).
  const setCustomFrom = (value) => {
    setDatePreset('custom');
    setFromDate(value);
  };

  const setCustomTo = (value) => {
    setDatePreset('custom');
    setToDate(value);
  };

  const dateFilterActive = Boolean(fromDate || toDate);

  // All items come from the tasks array — linked tasks get mission icon
  const activeItems = tasks
    .filter((t) => !INACTIVE_STATUSES.has(t.status))
    .map((t) => ({ ...t, _kind: itemKind(t) }))
    .sort((a, b) => {
      const da = a.date_end || a.date_start || '';
      const db = b.date_end || b.date_start || '';
      return db.localeCompare(da);
    });

  const filtered = activeItems
    .filter((item) => typeFilter === 'all' || item._kind === typeFilter)
    .filter((item) => isWithinDateRange(item, fromDate, toDate));

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

      {/* Date range */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Fechas</span>
          {dateFilterActive && (
            <button
              onClick={() => applyPreset(DATE_PRESETS[0])}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Limpiar
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.key}
              onClick={() => applyPreset(preset)}
              className={[
                'px-2 py-0.5 rounded-full text-xs font-medium transition-colors',
                datePreset === preset.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70',
              ].join(' ')}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-10 shrink-0">Desde</span>
          <input
            type="date"
            value={fromDate}
            onChange={(event) => setCustomFrom(event.target.value)}
            aria-label="Desde"
            className="flex-1 min-w-0 px-2 py-1 text-xs border border-input bg-background rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-10 shrink-0">Hasta</span>
          <input
            type="date"
            value={toDate}
            onChange={(event) => setCustomTo(event.target.value)}
            aria-label="Hasta"
            className="flex-1 min-w-0 px-2 py-1 text-xs border border-input bg-background rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
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
            {dateFilterActive ? 'Sin elementos en ese rango' : 'Sin elementos activos'}
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
                <div className="flex items-center gap-2 mt-1 pl-5 flex-wrap">
                  <span className="text-[10px] text-muted-foreground">{typeLabel(item._kind)}</span>
                  {STATUS_LABELS[item.status] && (
                    <span className="text-[10px] font-medium" style={{ color: statusColor(item) }}>
                      · {STATUS_LABELS[item.status]}
                    </span>
                  )}
                  {item.prompt_profile && PROFILE_THEMES[item.prompt_profile] && (
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                      style={{
                        color: PROFILE_THEMES[item.prompt_profile].primary,
                        backgroundColor: PROFILE_THEMES[item.prompt_profile].soft,
                      }}
                    >
                      {getProfileEmoji(item.prompt_profile)} {getProfileName(item.prompt_profile)}
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
