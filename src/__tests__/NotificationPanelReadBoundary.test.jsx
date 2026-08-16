import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NotificationPanel } from '../components/NotificationPanel';

const mocks = vi.hoisted(() => ({
  getHistory: vi.fn(),
  getAnalytics: vi.fn(),
}));

vi.mock('../contexts/NotificationContext', () => ({
  useNotificationContext: () => ({
    notifications: [
      {
        id: 'live-unread',
        history_id: 'history-live-unread',
        type: 'TASK_DUE_SOON',
        payload: { task_title: 'Notificación en vivo', priority: 'medium' },
        timestamp: '2026-08-16T10:00:00Z',
        read: false,
      },
      {
        id: 'live-read',
        history_id: 'history-live-read',
        type: 'TASK_DUE_SOON',
        payload: { task_title: 'Ya leída', priority: 'medium' },
        timestamp: '2026-08-16T09:00:00Z',
        read: true,
      },
    ],
    unreadCount: 1,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    dismissNotification: vi.fn(),
    clearAll: vi.fn(),
  }),
}));

vi.mock('../lib/api', () => ({
  notificationsApi: {
    getHistory: mocks.getHistory,
    getAnalytics: mocks.getAnalytics,
    markRead: vi.fn(),
  },
}));

describe('NotificationPanel read boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getHistory.mockResolvedValue({
      data: {
        items: [
          {
            id: 'history-read',
            type: 'TASK_DUE_SOON',
            status: 'read',
            task_title: 'Leída del historial',
            priority: 'medium',
            context: {},
            created_at: '2026-08-15T10:00:00Z',
          },
          {
            id: 'history-unread',
            type: 'TASK_DUE_SOON',
            status: 'unread',
            task_title: 'No leída del historial',
            priority: 'medium',
            context: {},
            created_at: '2026-08-15T09:00:00Z',
          },
        ],
      },
    });
    mocks.getAnalytics.mockResolvedValue({ data: { days: 7, by_priority: {} } });
  });

  test('keeps unread notifications in En vivo and renders only read entries in Historial', async () => {
    render(<NotificationPanel onClose={vi.fn()} />);

    expect(screen.getByText('Notificación en vivo')).toBeInTheDocument();
    expect(screen.queryByText('Ya leída')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Historial' }));

    await waitFor(() => {
      expect(mocks.getHistory).toHaveBeenCalledWith({ status: 'read', limit: 50, offset: 0 });
    });
    expect((await screen.findAllByText('Leída del historial')).length).toBeGreaterThan(0);
    expect(screen.queryByText('No leída del historial')).not.toBeInTheDocument();
  });
});
