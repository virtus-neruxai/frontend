import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { userSettingsApi } from '../lib/api';
import { getStartupRetryDelay, isRetryableStartupError } from '../lib/startupRetry';
import { useProfileTheme } from '../theme/useProfileTheme';

// Resolve the profile from the server before profile-scoped data is queried.
// A cached visual theme is useful for first paint, but it is not authoritative
// after a service restart because it can make a valid history look empty.
export default function ProfileSettingsSync() {
  const { isAuthenticated, loading } = useAuth();
  const { syncPersistedProfile, markProfileSynced, beginProfileSync } = useProfileTheme();
  const retryTimerRef = useRef(null);
  const requestControllerRef = useRef(null);
  const requestInFlightRef = useRef(false);
  const attemptRef = useRef(0);

  const clearScheduledRetry = useCallback(() => {
    if (retryTimerRef.current) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  // Layout effects run before descendant passive effects such as the history
  // fetch. This closes the logout → login gap without showing a stale profile
  // for one request.
  useLayoutEffect(() => {
    if (!loading && isAuthenticated) beginProfileSync();
  }, [isAuthenticated, loading, beginProfileSync]);

  useEffect(() => {
    if (loading) return undefined;

    // Nothing to resolve when signed out: release the gate so profile-scoped
    // views never wait for a request that cannot be authenticated.
    if (!isAuthenticated) {
      clearScheduledRetry();
      requestControllerRef.current?.abort();
      requestControllerRef.current = null;
      requestInFlightRef.current = false;
      attemptRef.current = 0;
      markProfileSynced();
      return undefined;
    }

    let disposed = false;
    let settled = false;

    const syncProfile = async ({ resetAttempt = false } = {}) => {
      if (disposed || settled || requestInFlightRef.current) return;

      if (resetAttempt) {
        attemptRef.current = 0;
        clearScheduledRetry();
      }

      const controller = new AbortController();
      requestControllerRef.current = controller;
      requestInFlightRef.current = true;

      try {
        const response = await userSettingsApi.getSettings({ signal: controller.signal });
        if (disposed || controller.signal.aborted) return;

        const resolved = response?.data?.resolved_prompt_profile || response?.data?.prompt_profile;
        settled = true;
        attemptRef.current = 0;
        if (resolved) {
          syncPersistedProfile(resolved);
        } else {
          markProfileSynced();
        }
      } catch (error) {
        if (disposed || controller.signal.aborted || !isRetryableStartupError(error)) return;

        const delay = getStartupRetryDelay(attemptRef.current);
        attemptRef.current += 1;
        retryTimerRef.current = window.setTimeout(() => {
          retryTimerRef.current = null;
          syncProfile();
        }, delay);
      } finally {
        if (requestControllerRef.current === controller) {
          requestControllerRef.current = null;
          requestInFlightRef.current = false;
        }
      }
    };

    const retryImmediately = () => syncProfile({ resetAttempt: true });
    window.addEventListener('focus', retryImmediately);
    window.addEventListener('online', retryImmediately);
    syncProfile();

    return () => {
      disposed = true;
      clearScheduledRetry();
      requestControllerRef.current?.abort();
      requestControllerRef.current = null;
      requestInFlightRef.current = false;
      window.removeEventListener('focus', retryImmediately);
      window.removeEventListener('online', retryImmediately);
    };
  }, [
    isAuthenticated,
    loading,
    syncPersistedProfile,
    markProfileSynced,
    beginProfileSync,
    clearScheduledRetry,
  ]);

  return null;
}
