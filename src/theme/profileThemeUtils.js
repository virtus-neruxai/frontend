import { DEFAULT_PROFILE_THEME_ID, PROFILE_THEMES } from './profileThemes';

export function normalizeProfileId(profileId) {
  return PROFILE_THEMES[profileId] ? profileId : DEFAULT_PROFILE_THEME_ID;
}

export function getProfileTheme(profileId) {
  return PROFILE_THEMES[normalizeProfileId(profileId)];
}

export function readCachedPromptProfile() {
  if (typeof window === 'undefined') return DEFAULT_PROFILE_THEME_ID;

  try {
    return normalizeProfileId(window.localStorage.getItem('prompt_profile'));
  } catch {
    return DEFAULT_PROFILE_THEME_ID;
  }
}

export function cachePromptProfile(profileId) {
  if (typeof window === 'undefined') return normalizeProfileId(profileId);

  const normalized = normalizeProfileId(profileId);
  try {
    window.localStorage.setItem('prompt_profile', normalized);
  } catch {
    // localStorage is a visual cache only; failing to write it must not block UX.
  }
  return normalized;
}

export function applyProfileThemeAttribute(profileId) {
  if (typeof document === 'undefined') return normalizeProfileId(profileId);

  const normalized = normalizeProfileId(profileId);
  document.documentElement.dataset.profileTheme = normalized;
  return normalized;
}
