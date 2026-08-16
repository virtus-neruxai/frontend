import { createContext, useContext } from 'react';
import { DEFAULT_PROFILE_THEME_ID, PROFILE_THEMES } from './profileThemes';

export const ProfileThemeContext = createContext({
  profileId: DEFAULT_PROFILE_THEME_ID,
  persistedProfileId: DEFAULT_PROFILE_THEME_ID,
  theme: PROFILE_THEMES[DEFAULT_PROFILE_THEME_ID],
  persistedTheme: PROFILE_THEMES[DEFAULT_PROFILE_THEME_ID],
  // False until the backend's resolved_prompt_profile has been applied (or the
  // attempt has failed and we fall back to the cached value). Consumers that
  // query profile-scoped data must wait for this: on a fresh browser context
  // localStorage is empty, so the initial value is the DEFAULT profile — and
  // querying with it silently returns another profile's (usually empty) data.
  isProfileSynced: false,
  beginProfileSync: () => {},
  previewProfile: () => {},
  persistProfile: () => DEFAULT_PROFILE_THEME_ID,
  syncPersistedProfile: () => DEFAULT_PROFILE_THEME_ID,
  markProfileSynced: () => {},
  revertPreview: () => {},
});

export function useProfileTheme() {
  return useContext(ProfileThemeContext);
}
