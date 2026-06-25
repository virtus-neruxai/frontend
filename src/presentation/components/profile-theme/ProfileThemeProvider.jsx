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

  const syncPersistedProfile = useCallback((nextProfileId) => {
    return persistProfile(nextProfileId);
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
    previewProfile,
    persistProfile,
    syncPersistedProfile,
    revertPreview,
  }), [
    profileId,
    persistedProfileId,
    previewProfile,
    persistProfile,
    syncPersistedProfile,
    revertPreview,
  ]);

  return (
    <ProfileThemeContext.Provider value={value}>
      {children}
    </ProfileThemeContext.Provider>
  );
}
