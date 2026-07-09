import { render, screen } from '@testing-library/react';
import { NotificationPanel } from '../components/NotificationPanel';
import { NotificationToast } from '../components/NotificationToast';

const mocks = vi.hoisted(() => ({
  notifications: [
    {
      id: 'nightly-1',
      history_id: 'history-1',
      type: 'NIGHTLY_REVIEW_SUMMARY',
      user_id: 'demo',
      payload: {
        review_date: '2026-07-05',
        summary: 'Cerraste dos tareas y detectaste un patrón importante.',
        tasks_completed: 2,
        tasks_failed: 1,
        proposed_missions: [
          { title: 'Misión nocturna', description: 'Revisar el patrón importante.' },
        ],
        priority: 'low',
        context: {},
      },
      timestamp: new Date().toISOString(),
      read: false,
    },
  ],
  markAsRead: vi.fn(),
  dismissNotification: vi.fn(),
  markRead: vi.fn(),
}));

vi.mock('../contexts/NotificationContext', () => ({
  useNotificationContext: () => ({
    notifications: mocks.notifications,
    unreadCount: 1,
    markAsRead: mocks.markAsRead,
    markAllAsRead: vi.fn(),
    dismissNotification: mocks.dismissNotification,
    clearAll: vi.fn(),
  }),
}));

vi.mock('../lib/api', () => ({
  notificationsApi: {
    getHistory: vi.fn(),
    getAnalytics: vi.fn(),
    markRead: mocks.markRead,
  },
}));

describe('NightlyReview notification CTA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.notifications[0].payload.proposal_status = undefined;
    mocks.notifications[0].payload.context = {};
  });

  test('toast links to Character with the scheduled review payload', () => {
    render(<NotificationToast />);

    const link = screen.getByRole('link', { name: /abrir propuesta/i });
    expect(link).toHaveAttribute('href', '/character?nightly_review=1&review_date=2026-07-05');
  });

  test('live panel shows the mission proposal CTA when present', () => {
    render(<NotificationPanel onClose={vi.fn()} />);

    const link = screen.getByRole('link', { name: /abrir propuesta/i });
    expect(link).toHaveAttribute('href', '/character?nightly_review=1&review_date=2026-07-05');
  });

  test('shows confirmed status instead of the proposal CTA', () => {
    mocks.notifications[0].payload.proposal_status = 'confirmed';

    render(<NotificationToast />);

    expect(screen.queryByRole('link', { name: /abrir propuesta/i })).not.toBeInTheDocument();
    expect(screen.getByText(/esta misión ya ha sido confirmada/i)).toBeInTheDocument();
  });
});
