import { act, render } from '@testing-library/react';
import ProfileSettingsSync from '../components/ProfileSettingsSync';
import { userSettingsApi } from '../lib/api';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, loading: false }),
}));

const profileTheme = {
  syncPersistedProfile: vi.fn(),
  markProfileSynced: vi.fn(),
  beginProfileSync: vi.fn(),
};

vi.mock('../theme/useProfileTheme', () => ({
  useProfileTheme: () => profileTheme,
}));

vi.mock('../lib/api', () => ({
  userSettingsApi: { getSettings: vi.fn() },
}));

describe('ProfileSettingsSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('retries a transient startup failure before releasing the profile gate', async () => {
    userSettingsApi.getSettings
      .mockRejectedValueOnce({ response: { status: 503 } })
      .mockResolvedValueOnce({ data: { resolved_prompt_profile: 'calm' } });

    render(<ProfileSettingsSync />);
    await act(async () => {});

    expect(userSettingsApi.getSettings).toHaveBeenCalledTimes(1);
    expect(profileTheme.beginProfileSync).toHaveBeenCalledTimes(1);
    expect(profileTheme.markProfileSynced).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(userSettingsApi.getSettings).toHaveBeenCalledTimes(2);
    expect(profileTheme.syncPersistedProfile).toHaveBeenCalledWith('calm');
    expect(profileTheme.markProfileSynced).not.toHaveBeenCalled();
  });

  test('does not retry an authentication error', async () => {
    userSettingsApi.getSettings.mockRejectedValue({ response: { status: 401 } });

    render(<ProfileSettingsSync />);
    await act(async () => {});
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(userSettingsApi.getSettings).toHaveBeenCalledTimes(1);
    expect(profileTheme.syncPersistedProfile).not.toHaveBeenCalled();
    expect(profileTheme.markProfileSynced).not.toHaveBeenCalled();
  });

  test('cancels a scheduled retry on unmount', async () => {
    userSettingsApi.getSettings.mockRejectedValue({ response: { status: 503 } });

    const { unmount } = render(<ProfileSettingsSync />);
    await act(async () => {});
    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(userSettingsApi.getSettings).toHaveBeenCalledTimes(1);
  });
});
