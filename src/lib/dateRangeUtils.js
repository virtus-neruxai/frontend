export function formatDateInput(value) {
  if (!value) return '';

  if (typeof value === 'string') {
    return value.slice(0, 10);
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function buildRelativeDateRange(days, endDate = new Date()) {
  const safeDays = Math.max(1, parseInt(days, 10) || 1);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  const start = new Date(end);
  start.setDate(start.getDate() - safeDays + 1);

  return {
    fromDate: formatDateInput(start),
    toDate: formatDateInput(end),
  };
}

// Each chart's range filter remembers the user's last choice across visits,
// under its own localStorage key — independent filters must not clobber
// each other. Falls back to 7 days (the shared default) whenever nothing was
// saved yet, or localStorage is unavailable (private browsing, quota full).
export function getPersistedRange(key, fallback = '7') {
  try {
    return window.localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

export function persistRange(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Best-effort only: losing the saved preference is not worth surfacing.
  }
}
