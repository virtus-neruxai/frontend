import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SettingsPage from '../pages/SettingsPage';
import { ProfileEmptyState } from '../presentation/components/profile-theme/ProfileEmptyState';
import { ProfileThemeProvider } from '../presentation/components/profile-theme/ProfileThemeProvider';
import { useProfileTheme } from '../theme/useProfileTheme';
import { normalizeProfileId } from '../theme/profileThemeUtils';
import { VirtusBrand } from '../components/VirtusBrand';
import { notificationsApi, userSettingsApi } from '../lib/api';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('../lib/api', () => ({
  notificationsApi: {
    getSettings: vi.fn(),
    saveSettings: vi.fn(),
  },
  userSettingsApi: {
    getSettings: vi.fn(),
    saveSettings: vi.fn(),
  },
}));

vi.mock('../components/Layout', () => ({
  default: function MockLayout({ children }) {
    return <div>{children}</div>;
  },
}));

vi.mock('../components/NotificationSettings', () => ({
  default: function MockNotificationSettings() {
    return <div data-testid="notification-settings" />;
  },
}));

vi.mock('../components/MentorNotificationSettings', () => ({
  default: function MockMentorNotificationSettings({ enabled, onToggle, onSave }) {
    return (
      <div data-testid="mentor-notification-settings">
        <span data-testid="mentor-notifications-value">{String(enabled)}</span>
        <button type="button" onClick={() => onToggle(!enabled)}>toggle mentor notifications</button>
        <button type="button" onClick={onSave}>save mentor notifications</button>
      </div>
    );
  },
}));

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
    vi.clearAllMocks();
    window.localStorage.clear();
    document.documentElement.dataset.profileTheme = 'stoic';
    notificationsApi.getSettings.mockResolvedValue({ data: {} });
    userSettingsApi.saveSettings.mockResolvedValue({ data: {} });
    userSettingsApi.getSettings.mockResolvedValue({
      data: {
        prompt_profile: 'stoic',
        resolved_prompt_profile: 'stoic',
        mentor_notifications_enabled: true,
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

  test('settings persist the Mentor notification preference', async () => {
    render(
      <ProfileThemeProvider>
        <SettingsPage />
      </ProfileThemeProvider>
    );

    expect(await screen.findByTestId('mentor-notifications-value')).toHaveTextContent('true');
    fireEvent.click(screen.getByText('toggle mentor notifications'));
    expect(screen.getByTestId('mentor-notifications-value')).toHaveTextContent('false');
    fireEvent.click(screen.getByText('save mentor notifications'));

    await waitFor(() => {
      expect(userSettingsApi.saveSettings).toHaveBeenCalledWith({
        mentor_notifications_enabled: false,
      });
    });
  });

  test('profile empty state renders with the active profile context', () => {
    window.localStorage.setItem('prompt_profile', 'performance');

    render(
      <ProfileThemeProvider>
        <ProfileEmptyState
          title="No hay actividad todavía"
          description="Crea o completa tareas para ver movimiento."
          testId="profile-empty-state"
        />
      </ProfileThemeProvider>
    );

    expect(screen.getByTestId('profile-empty-state')).toBeInTheDocument();
    expect(screen.getByText('No hay actividad todavía')).toBeInTheDocument();
    expect(document.documentElement.dataset.profileTheme).toBe('performance');
  });

  test('brand tagline changes with the active profile', () => {
    window.localStorage.setItem('prompt_profile', 'student');

    render(
      <ProfileThemeProvider>
        <VirtusBrand />
      </ProfileThemeProvider>
    );

    expect(screen.getByText('Lectura • Metodo • Futuro')).toBeInTheDocument();
    expect(document.documentElement.dataset.profileTheme).toBe('student');
  });
});
