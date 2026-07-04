import { useEffect, useState } from 'react';
import { notificationsApi } from '../lib/api';

// Module-level cache: DND settings are stable within a session and shared by every
// draft modal, so we fetch them once. `undefined` = not fetched yet, `null` = off
// or unavailable, otherwise the do_not_disturb object.
let _cache;
let _inflight;

export function prefetchDndSettings() {
  if (_cache !== undefined) return Promise.resolve(_cache);
  if (!_inflight) {
    _inflight = notificationsApi
      .getSettings()
      .then((r) => {
        _cache = r?.data?.do_not_disturb ?? null;
        return _cache;
      })
      .catch(() => {
        _cache = null;
        return null;
      });
  }
  return _inflight;
}

// Returns the user's do_not_disturb settings (or null). Cached across mounts.
export function useDndSettings() {
  const [dnd, setDnd] = useState(_cache ?? null);

  useEffect(() => {
    let alive = true;
    prefetchDndSettings().then((value) => {
      if (alive) setDnd(value);
    });
    return () => {
      alive = false;
    };
  }, []);

  return dnd;
}
