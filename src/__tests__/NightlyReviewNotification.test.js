import {
  buildNotificationFromWsData,
  isSupportedNotificationType,
} from '../hooks/useWebSocket';

describe('NightlyReview frontend notifications', () => {
  test('accepts and maps the scheduled summary payload', () => {
    expect(isSupportedNotificationType('NIGHTLY_REVIEW_SUMMARY')).toBe(true);

    const notification = buildNotificationFromWsData({
      type: 'NIGHTLY_REVIEW_SUMMARY',
      user_id: 'demo',
      notification_id: 'history-1',
      review_date: '2026-07-05',
      summary: 'Cerraste dos tareas y detectaste un patrón importante.',
      tasks_completed: 2,
      tasks_failed: 1,
      priority: 'low',
    });

    expect(notification.type).toBe('NIGHTLY_REVIEW_SUMMARY');
    expect(notification.history_id).toBe('history-1');
    expect(notification.payload).toMatchObject({
      review_date: '2026-07-05',
      summary: 'Cerraste dos tareas y detectaste un patrón importante.',
      tasks_completed: 2,
      tasks_failed: 1,
      priority: 'low',
    });
  });
});
