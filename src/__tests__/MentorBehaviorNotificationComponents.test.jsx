import { render, screen } from '@testing-library/react';
import { NotificationPanel } from '../components/NotificationPanel';
import { NotificationToast } from '../components/NotificationToast';

const mocks = vi.hoisted(() => ({
  notifications: [
    {
      id: 'mentor-1',
      history_id: 'history-1',
      type: 'MENTOR_BEHAVIOR',
      user_id: 'demo',
      payload: {
        pattern_date: '2026-08-08',
        title: 'Antes de la revisión',
        body: 'Ayer la frustración volvió a aparecer con el proyecto.',
        focus_type: 'emotional_burden',
        focus_key: 'recurrent:frustracion:trabajo',
        proposed_missions: [
          { title: 'Los tres puntos antes de entrar', mentor_behavior_id: 'notice-1' },
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

describe('MENTOR_BEHAVIOR notification CTA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.notifications[0].payload.proposed_missions = [
      { title: 'Los tres puntos antes de entrar', mentor_behavior_id: 'notice-1' },
    ];
  });

  test('toast shows the mentor title and body, and links to Character', () => {
    render(<NotificationToast />);

    expect(screen.getByText(/antes de la revisión/i)).toBeInTheDocument();
    expect(screen.getByText(/la frustración volvió a aparecer/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver la misión propuesta/i })).toHaveAttribute(
      'href',
      '/character?mentor_behavior=1&pattern_date=2026-08-08'
    );
  });

  test('live panel offers the same CTA', () => {
    render(<NotificationPanel onClose={vi.fn()} />);

    expect(screen.getByRole('link', { name: /ver la misión propuesta/i })).toHaveAttribute(
      'href',
      '/character?mentor_behavior=1&pattern_date=2026-08-08'
    );
  });

  test('a notice without a proposed mission still opens Character', () => {
    mocks.notifications[0].payload.proposed_missions = [];

    render(<NotificationToast />);

    expect(screen.queryByRole('link', { name: /ver la misión propuesta/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver en carácter/i })).toHaveAttribute(
      'href',
      '/character?mentor_behavior=1&pattern_date=2026-08-08'
    );
  });
});
