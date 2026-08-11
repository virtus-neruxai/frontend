import {
  buildNotificationFromWsData,
  isSupportedNotificationType,
} from '../hooks/useWebSocket';
import {
  buildMentorBehaviorHref,
  consumeMentorBehaviorPayload,
  getMentorBehaviorBody,
  getMentorBehaviorProposals,
  getMentorBehaviorTitle,
  storeMentorBehaviorPayload,
} from '../lib/schedulerReview/mentorBehaviorNotification';

describe('MENTOR_BEHAVIOR frontend notifications', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  test('accepts and maps the flat mentor notice payload', () => {
    expect(isSupportedNotificationType('MENTOR_BEHAVIOR')).toBe(true);

    const notification = buildNotificationFromWsData({
      type: 'MENTOR_BEHAVIOR',
      user_id: 'demo',
      notification_id: 'history-1',
      pattern_date: '2026-08-08',
      title: 'Antes de la revisión',
      body: 'Ayer la frustración volvió a aparecer con el proyecto.',
      focus_type: 'emotional_burden',
      focus_key: 'recurrent:frustracion:trabajo',
      related_item_id: 'task-8842',
      has_today_context: true,
      proposed_missions: [
        {
          title: 'Los tres puntos antes de entrar',
          description: 'Déjalos escritos.',
          mentor_behavior_id: 'notice-1',
        },
      ],
      priority: 'low',
    });

    expect(notification.type).toBe('MENTOR_BEHAVIOR');
    expect(notification.history_id).toBe('history-1');
    expect(notification.payload).toMatchObject({
      pattern_date: '2026-08-08',
      title: 'Antes de la revisión',
      body: 'Ayer la frustración volvió a aparecer con el proyecto.',
      focus_type: 'emotional_burden',
      focus_key: 'recurrent:frustracion:trabajo',
      related_item_id: 'task-8842',
      has_today_context: true,
      priority: 'low',
    });
    expect(notification.payload.proposed_missions[0].mentor_behavior_id).toBe('notice-1');
  });

  test('the notice is always low priority, so it never rings', () => {
    const notification = buildNotificationFromWsData({
      type: 'MENTOR_BEHAVIOR',
      user_id: 'demo',
      pattern_date: '2026-08-08',
      title: 'Un aviso',
      body: 'Un cuerpo.',
    });

    expect(notification.payload.priority).toBe('low');
  });

  test('links to Character with the notice date', () => {
    expect(buildMentorBehaviorHref({ pattern_date: '2026-08-08' })).toBe(
      '/character?mentor_behavior=1&pattern_date=2026-08-08'
    );
    expect(buildMentorBehaviorHref({})).toBe('/character?mentor_behavior=1');
  });

  test('stores and consumes the payload exactly once', () => {
    storeMentorBehaviorPayload({ title: 'Antes de la revisión', pattern_date: '2026-08-08' });

    expect(consumeMentorBehaviorPayload()).toMatchObject({ title: 'Antes de la revisión' });
    expect(consumeMentorBehaviorPayload()).toBeNull();
  });

  test('reads title, body and proposals from either the flat event or the history context', () => {
    const flat = {
      title: 'Antes de la revisión',
      body: 'Cuerpo plano.',
      proposed_missions: [{ title: 'Misión' }],
    };
    const fromHistory = {
      context: {
        title: 'Antes de la revisión',
        body: 'Cuerpo del historial.',
        proposed_missions: [{ title: 'Misión' }],
      },
    };

    expect(getMentorBehaviorTitle(flat)).toBe('Antes de la revisión');
    expect(getMentorBehaviorTitle(fromHistory)).toBe('Antes de la revisión');
    expect(getMentorBehaviorBody(flat)).toBe('Cuerpo plano.');
    expect(getMentorBehaviorBody(fromHistory)).toBe('Cuerpo del historial.');
    expect(getMentorBehaviorProposals(flat)).toHaveLength(1);
    expect(getMentorBehaviorProposals(fromHistory)).toHaveLength(1);
  });

  test('falls back to a generic title when the compositor sent none', () => {
    expect(getMentorBehaviorTitle({})).toBe('Aviso del Mentor');
    expect(getMentorBehaviorTitle({ title: '   ' })).toBe('Aviso del Mentor');
    expect(getMentorBehaviorProposals({})).toEqual([]);
  });
});
