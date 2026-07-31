import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { PROFILE_THEMES } from '@/theme/profileThemes';
import {
  applyProfileThemeAttribute,
  cachePromptProfile,
  normalizeProfileId,
  readCachedPromptProfile,
} from '@/theme/profileThemeUtils';
import { ProfileThemeContext } from '@/theme/useProfileTheme';

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function ProfileThemeProvider({ children }) {
  const initialProfile = readCachedPromptProfile();
  const [profileId, setProfileId] = useState(initialProfile);
  const [persistedProfileId, setPersistedProfileId] = useState(initialProfile);
  // initialProfile comes from localStorage (or the default when absent), which
  // may not be the account's real profile. Stays false until ProfileSettingsSync
  // resolves it against the backend so profile-scoped queries never run early.
  const [isProfileSynced, setIsProfileSynced] = useState(false);

  useIsomorphicLayoutEffect(() => {
    applyProfileThemeAttribute(profileId);
  }, [profileId]);

  const previewProfile = useCallback((nextProfileId) => {
    const normalized = normalizeProfileId(nextProfileId);
    setProfileId(normalized);
    applyProfileThemeAttribute(normalized);
    return normalized;
  }, []);

  const persistProfile = useCallback((nextProfileId) => {
    const normalized = cachePromptProfile(nextProfileId);
    setPersistedProfileId(normalized);
    setProfileId(normalized);
    applyProfileThemeAttribute(normalized);
    return normalized;
  }, []);

  const markProfileSynced = useCallback(() => setIsProfileSynced(true), []);

  const syncPersistedProfile = useCallback((nextProfileId) => {
    const normalized = persistProfile(nextProfileId);
    setIsProfileSynced(true);
    return normalized;
  }, [persistProfile]);

  const revertPreview = useCallback(() => {
    setProfileId(persistedProfileId);
    applyProfileThemeAttribute(persistedProfileId);
    return persistedProfileId;
  }, [persistedProfileId]);

  const value = useMemo(() => ({
    profileId,
    persistedProfileId,
    theme: PROFILE_THEMES[profileId],
    persistedTheme: PROFILE_THEMES[persistedProfileId],
    isProfileSynced,
    previewProfile,
    persistProfile,
    syncPersistedProfile,
    markProfileSynced,
    revertPreview,
  }), [
    profileId,
    persistedProfileId,
    isProfileSynced,
    previewProfile,
    persistProfile,
    syncPersistedProfile,
    markProfileSynced,
    revertPreview,
  ]);

  return (
    <ProfileThemeContext.Provider value={value}>
      {children}
    </ProfileThemeContext.Provider>
  );
}
