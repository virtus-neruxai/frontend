// Do-Not-Disturb (quiet hours) helpers for scheduling proposals.
//
// The system must never *propose* a task/routine/mission time inside the user's
// active DND window. These helpers snap a proposed local datetime forward to the
// first allowed slot (the DND end hour). They only apply when DND is enabled;
// a user manually picking a DND time is their choice and is not touched here.

export function normalizeDnd(dnd) {
  if (!dnd || !dnd.enabled) return null;
  const start = Number(dnd.start_hour);
  const end = Number(dnd.end_hour);
  // Equal start/end would mean an empty (or full) window — treat as no constraint.
  if (!Number.isInteger(start) || !Number.isInteger(end) || start === end) return null;
  if (start < 0 || start > 23 || end < 0 || end > 23) return null;
  return { start, end };
}

// Is a given local hour (0-23) inside the DND window? Handles windows that wrap
// past midnight (e.g. 22 → 8). The end hour is exclusive.
export function isHourInDnd(hour, dnd) {
  const n = normalizeDnd(dnd);
  if (!n) return false;
  const { start, end } = n;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

// Given a Date, return a new Date snapped out of the DND window (to end_hour:00
// local) when its local hour is inside DND; otherwise return the same Date.
export function snapDateOutOfDnd(date, dnd) {
  const n = normalizeDnd(dnd);
  if (!n) return date;
  const hour = date.getHours();
  if (!isHourInDnd(hour, dnd)) return date;

  const result = new Date(date);
  result.setHours(n.end, 0, 0, 0);
  // Wrapping window (start > end): the late-night side (hour >= start) exits on
  // the *next* day; the early-morning side (hour < end) exits the same day.
  if (n.start > n.end && hour >= n.start) {
    result.setDate(result.getDate() + 1);
  }
  return result;
}

// ── datetime-local string helpers (what the draft modals store) ──────────────

export function formatDatetimeLocal(date) {
  const pad = (v) => String(v).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

// Snap a "YYYY-MM-DDTHH:mm" local string out of DND. Returns the original string
// unchanged when it is not in DND (or DND is off/invalid).
export function snapLocalStringOutOfDnd(localStr, dnd) {
  if (!localStr) return localStr;
  const date = new Date(localStr);
  if (Number.isNaN(date.getTime())) return localStr;
  const snapped = snapDateOutOfDnd(date, dnd);
  return snapped === date ? localStr : formatDatetimeLocal(snapped);
}
