/**
 * Shared presentation helpers for project items (tasks & routines).
 *
 * Used by both the draft confirmation modal (ProjectDraftModal, items that are
 * not yet persisted) and the projects view (ProjectCard/ProjectItemRow, real
 * children with a live status). Keeping the vocabulary in one place is what
 * makes the visualization consistent between "preview" and "created".
 *
 * Weekday convention matches recurrence_rule.weekdays produced by the backend
 * (JS getDay(): 0=Sunday … 6=Saturday) — same array as the agent-service
 * normalizer (_WEEKDAY_LABELS).
 */
import { CheckSquare, Repeat } from 'lucide-react';

export const WEEKDAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
export const WEEKDAY_LONG = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// ── Task vs routine ──────────────────────────────────────────────────────────

/** Visual metadata to tell tasks apart from routines at a glance. */
export const kindMeta = (taskKind) =>
  taskKind === 'routine'
    ? { key: 'routine', label: 'Rutina', Icon: Repeat, color: 'hsl(var(--status-in-progress))' }
    : { key: 'task', label: 'Tarea', Icon: CheckSquare, color: 'hsl(var(--status-todo))' };

// ── Status (pendiente / en progreso / finalizado…) ───────────────────────────

const STATUS_META = {
  todo:        { label: 'Pendiente',   color: 'hsl(var(--status-todo))' },
  in_progress: { label: 'En progreso', color: 'hsl(var(--status-in-progress))' },
  active:      { label: 'En progreso', color: 'hsl(var(--status-in-progress))' },
  done:        { label: 'Finalizado',  color: 'hsl(var(--status-done))' },
  completed:   { label: 'Finalizado',  color: 'hsl(var(--status-done))' },
  blocked:     { label: 'Bloqueado',   color: 'hsl(var(--status-blocked))' },
  failed:      { label: 'Fallido',     color: 'hsl(var(--status-failed))' },
};

/** Status chip metadata; falls back to "Pendiente" for unknown values. */
export const statusMeta = (status) =>
  STATUS_META[String(status || '').toLowerCase()] || STATUS_META.todo;

/** A routine's live status is really "in_progress"; surface completion instead. */
export const isDone = (item) =>
  Boolean(item?.is_complete) || ['done', 'completed'].includes(String(item?.status || '').toLowerCase());

// ── Recurrence / dates ───────────────────────────────────────────────────────

/** Ordered weekday short labels for a routine, e.g. ['L','X','V']. */
export const weekdayLabelsFor = (rule) => {
  const days = Array.isArray(rule?.weekdays) ? rule.weekdays : [];
  return days
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    .sort((a, b) => a - b)
    .map((d) => WEEKDAY_LABELS[d]);
};

const fmtShortDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/** Human recurrence summary, e.g. "Semanal · L, X, V · hasta 15/09/2026". */
export const recurrenceSummary = (rule) => {
  if (!rule || typeof rule !== 'object') return 'Rutina';
  const days = weekdayLabelsFor(rule);
  const freq = rule.type === 'daily' ? 'Diaria' : 'Semanal';
  const parts = [freq];
  if (rule.type !== 'daily' && days.length) parts.push(days.join(', '));
  if (rule.until) parts.push(`hasta ${fmtShortDate(rule.until)}`);
  return parts.join(' · ');
};

/** Single-line date for a punctual task, e.g. "mar, 15 jul · 09:00". */
export const formatItemDatetime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const day = d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' });
  const time = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${time}`;
};

/** Compact date range for the project header, e.g. "15 jul → 15 sep 2026". */
export const formatDateRange = (startIso, endIso) => {
  const opts = { day: '2-digit', month: 'short' };
  const s = startIso ? new Date(startIso) : null;
  const e = endIso ? new Date(endIso) : null;
  const valid = (x) => x && !Number.isNaN(x.getTime());
  if (!valid(s) && !valid(e)) return '';
  const startTxt = valid(s) ? s.toLocaleDateString('es-ES', opts) : '—';
  const endTxt = valid(e)
    ? e.toLocaleDateString('es-ES', { ...opts, year: 'numeric' })
    : '—';
  return `${startTxt} → ${endTxt}`;
};
