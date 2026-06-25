import { createContext, useContext } from 'react';
import { DEFAULT_PROFILE_THEME_ID, PROFILE_THEMES } from './profileThemes';

export const ProfileThemeContext = createContext({
  profileId: DEFAULT_PROFILE_THEME_ID,
  persistedProfileId: DEFAULT_PROFILE_THEME_ID,
  theme: PROFILE_THEMES[DEFAULT_PROFILE_THEME_ID],
  persistedTheme: PROFILE_THEMES[DEFAULT_PROFILE_THEME_ID],
  previewProfile: () => {},
  persistProfile: () => DEFAULT_PROFILE_THEME_ID,
  syncPersistedProfile: () => DEFAULT_PROFILE_THEME_ID,
  revertPreview: () => {},
});

export function useProfileTheme() {
  return useContext(ProfileThemeContext);
}
