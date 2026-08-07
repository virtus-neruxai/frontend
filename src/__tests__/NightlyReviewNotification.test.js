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
      proposed_missions: [
        { title: 'Misión nocturna', description: 'Revisar el patrón importante.' },
      ],
      priority: 'low',
    });

    expect(notification.type).toBe('NIGHTLY_REVIEW_SUMMARY');
    expect(notification.history_id).toBe('history-1');
    expect(notification.payload).toMatchObject({
      review_date: '2026-07-05',
      summary: 'Cerraste dos tareas y detectaste un patrón importante.',
      tasks_completed: 2,
      tasks_failed: 1,
      proposed_missions: [
        { title: 'Misión nocturna', description: 'Revisar el patrón importante.' },
      ],
      priority: 'low',
    });
  });

  test('maps a behaviour review as its own notification', () => {
    expect(isSupportedNotificationType('LEARNED_RESPONSE_REVIEW')).toBe(true);

    const notification = buildNotificationFromWsData({
      type: 'LEARNED_RESPONSE_REVIEW',
      user_id: 'demo',
      notification_id: 'behaviour-history-1',
      review_date: '2026-08-09',
      learned_response_reviews: [
        {
          response_key: 'value_conflict:example',
          alternative_response: 'Esperar antes de decidir.',
          question: '¿Has tenido ocasión de probarlo?',
        },
      ],
      priority: 'low',
    });

    expect(notification.type).toBe('LEARNED_RESPONSE_REVIEW');
    expect(notification.history_id).toBe('behaviour-history-1');
    expect(notification.payload).toMatchObject({
      review_date: '2026-08-09',
      learned_response_reviews: [
        expect.objectContaining({ response_key: 'value_conflict:example' }),
      ],
    });
  });
});
