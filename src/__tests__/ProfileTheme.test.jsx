import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SettingsPage from '../pages/SettingsPage';
import { ProfileThemeProvider } from '../presentation/components/profile-theme/ProfileThemeProvider';
import { useProfileTheme } from '../theme/useProfileTheme';
import { normalizeProfileId } from '../theme/profileThemeUtils';
import { notificationsApi, userSettingsApi } from '../lib/api';

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('../lib/api', () => ({
  notificationsApi: {
    getSettings: jest.fn(),
    saveSettings: jest.fn(),
  },
  userSettingsApi: {
    getSettings: jest.fn(),
    saveSettings: jest.fn(),
  },
}));

jest.mock('../components/Layout', () => function MockLayout({ children }) {
  return <div>{children}</div>;
});

jest.mock('../components/NotificationSettings', () => function MockNotificationSettings() {
  return <div data-testid="notification-settings" />;
});

jest.mock('../components/ProactiveSettings', () => function MockProactiveSettings() {
  return <div data-testid="proactive-settings" />;
});

function ThemeProbe() {
  const { profileId, previewProfile, persistProfile } = useProfileTheme();

  return (
    <div>
      <span data-testid="profile-id">{profileId}</span>
      <button type="button" onClick={() => previewProfile('calm')}>preview calm</button>
      <button type="button" onClick={() => persistProfile('student')}>persist student</button>
    </div>
  );
}

describe('profile theme', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    document.documentElement.dataset.profileTheme = 'stoic';
    notificationsApi.getSettings.mockResolvedValue({ data: {} });
    userSettingsApi.getSettings.mockResolvedValue({
      data: {
        prompt_profile: 'stoic',
        resolved_prompt_profile: 'stoic',
        auto_apply_proactive_changes: false,
      },
    });
  });

  test('falls back invalid profiles to stoic', () => {
    expect(normalizeProfileId('unknown')).toBe('stoic');
    expect(normalizeProfileId('calm')).toBe('calm');
  });

  test('provider applies cached profile to data-profile-theme', async () => {
    window.localStorage.setItem('prompt_profile', 'spiritual');

    render(
      <ProfileThemeProvider>
        <ThemeProbe />
      </ProfileThemeProvider>
    );

    expect(screen.getByTestId('profile-id')).toHaveTextContent('spiritual');
    expect(document.documentElement.dataset.profileTheme).toBe('spiritual');

    fireEvent.click(screen.getByText('preview calm'));
    expect(document.documentElement.dataset.profileTheme).toBe('calm');
    expect(window.localStorage.getItem('prompt_profile')).toBe('spiritual');

    fireEvent.click(screen.getByText('persist student'));
    await waitFor(() => {
      expect(window.localStorage.getItem('prompt_profile')).toBe('student');
    });
    expect(document.documentElement.dataset.profileTheme).toBe('student');
  });

  test('settings previews selected profile immediately', async () => {
    render(
      <ProfileThemeProvider>
        <SettingsPage />
      </ProfileThemeProvider>
    );

    const calmOption = await screen.findByTestId('profile-option-calm');
    fireEvent.click(calmOption);

    expect(document.documentElement.dataset.profileTheme).toBe('calm');
    expect(window.localStorage.getItem('prompt_profile')).toBe('stoic');
  });

  test('settings save persists backend profile and visual cache', async () => {
    userSettingsApi.saveSettings.mockResolvedValue({
      data: {
        prompt_profile: 'calm',
        resolved_prompt_profile: 'calm',
      },
    });

    render(
      <ProfileThemeProvider>
        <SettingsPage />
      </ProfileThemeProvider>
    );

    fireEvent.click(await screen.findByTestId('profile-option-calm'));
    fireEvent.click(screen.getByTestId('save-prompt-profile-btn'));

    await waitFor(() => {
      expect(userSettingsApi.saveSettings).toHaveBeenCalledWith({ prompt_profile: 'calm' });
      expect(window.localStorage.getItem('prompt_profile')).toBe('calm');
    });
    expect(document.documentElement.dataset.profileTheme).toBe('calm');
  });

  test('settings save failure reverts preview to persisted backend profile', async () => {
    userSettingsApi.saveSettings.mockRejectedValue(new Error('boom'));

    render(
      <ProfileThemeProvider>
        <SettingsPage />
      </ProfileThemeProvider>
    );

    fireEvent.click(await screen.findByTestId('profile-option-calm'));
    expect(document.documentElement.dataset.profileTheme).toBe('calm');

    fireEvent.click(screen.getByTestId('save-prompt-profile-btn'));

    await waitFor(() => {
      expect(document.documentElement.dataset.profileTheme).toBe('stoic');
    });
    expect(window.localStorage.getItem('prompt_profile')).toBe('stoic');
  });
});
