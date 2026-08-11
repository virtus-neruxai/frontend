import { act, render, screen, waitFor } from '@testing-library/react';
import { NotificationProvider, useNotificationContext } from '../contexts/NotificationContext';

const mocks = vi.hoisted(() => ({
  user: { username: 'demo' },
  getHistory: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user }),
}));

vi.mock('../lib/api', () => ({
  notificationsApi: {
    getHistory: mocks.getHistory,
  },
}));

function historyItem(overrides = {}) {
  return {
    id: 'history-1',
    type: 'NIGHTLY_REVIEW_SUMMARY',
    user_id: 'demo',
    task_title: null,
    context: { summary: 'Cerraste dos tareas.', review_date: '2026-08-10' },
    status: 'unread',
    created_at: '2026-08-10T22:00:00+00:00',
    ...overrides,
  };
}

function Probe() {
  const { notifications, unreadCount, addNotification } = useNotificationContext();
  return (
    <div>
      <span data-testid="unread-count">{unreadCount}</span>
      <ul data-testid="notification-ids">
        {notifications.map((n) => (
          <li key={n.id}>{n.id}</li>
        ))}
      </ul>
      <button type="button" onClick={() => addNotification({
        id: 'live-1',
        history_id: 'history-1',
        type: 'NIGHTLY_REVIEW_SUMMARY',
        user_id: 'demo',
        payload: { review_date: '2026-08-10' },
        timestamp: new Date().toISOString(),
        read: false,
      })}>
        simulate-live-delivery
      </button>
    </div>
  );
}

describe('NotificationProvider — catching up on unread history at load', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.getHistory.mockReset();
  });

  test('a notification that arrived while no tab was open still lands in "En vivo"', async () => {
    mocks.getHistory.mockResolvedValue({
      data: { items: [historyItem()], unread_count: 1, total: 1, limit: 50, offset: 0 },
    });

    render(
      <NotificationProvider>
        <Probe />
      </NotificationProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('unread-count').textContent).toBe('1');
    });
    expect(mocks.getHistory).toHaveBeenCalledWith({ status: 'unread', limit: 50 });
    expect(screen.getByText('history-1')).toBeInTheDocument();
  });

  test('an unsupported notification type is not hydrated into the live list', async () => {
    mocks.getHistory.mockResolvedValue({
      data: {
        items: [historyItem({ id: 'history-2', type: 'GENERAL' })],
        unread_count: 1,
        total: 1,
        limit: 50,
        offset: 0,
      },
    });

    render(
      <NotificationProvider>
        <Probe />
      </NotificationProvider>
    );

    await waitFor(() => expect(mocks.getHistory).toHaveBeenCalled());
    expect(screen.getByTestId('unread-count').textContent).toBe('0');
  });

  test('a notification already delivered live is not duplicated by the catch-up fetch', async () => {
    let resolveHistory;
    mocks.getHistory.mockReturnValue(
      new Promise((resolve) => {
        resolveHistory = resolve;
      })
    );

    render(
      <NotificationProvider>
        <Probe />
      </NotificationProvider>
    );

    // The live WS delivery arrives first (same history_id the fetch will return).
    act(() => {
      screen.getByText('simulate-live-delivery').click();
    });
    expect(screen.getByTestId('notification-ids').children).toHaveLength(1);

    await act(async () => {
      resolveHistory({
        data: { items: [historyItem()], unread_count: 1, total: 1, limit: 50, offset: 0 },
      });
      await Promise.resolve();
    });

    expect(screen.getByTestId('notification-ids').children).toHaveLength(1);
  });

  test('a notification the user already dismissed does not resurface', async () => {
    localStorage.setItem(
      'dismissed_notifications:demo',
      JSON.stringify(['history:history-1'])
    );
    mocks.getHistory.mockResolvedValue({
      data: { items: [historyItem()], unread_count: 1, total: 1, limit: 50, offset: 0 },
    });

    render(
      <NotificationProvider>
        <Probe />
      </NotificationProvider>
    );

    await waitFor(() => expect(mocks.getHistory).toHaveBeenCalled());
    expect(screen.getByTestId('unread-count').textContent).toBe('0');
  });

  test('nothing is fetched before a user is known', () => {
    mocks.user = null;

    render(
      <NotificationProvider>
        <Probe />
      </NotificationProvider>
    );

    expect(mocks.getHistory).not.toHaveBeenCalled();
    mocks.user = { username: 'demo' };
  });
});
