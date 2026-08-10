import { useEffect, useRef } from 'react';
import { useNotificationContext } from '../contexts/NotificationContext';
import { buildNightlyReviewHref, storeNightlyReviewPayload } from '../lib/schedulerReview/nightlyReviewNotification';
import {
  buildMentorBehaviorHref,
  getMentorBehaviorBody,
  getMentorBehaviorTitle,
  storeMentorBehaviorPayload,
} from '../lib/schedulerReview/mentorBehaviorNotification';

export const useWebSocket = ({
  url,
  userId,
  reconnectInterval = 5000,
  maxReconnectAttempts = 10,
}) => {
  const { addNotification, setIsConnected, notifications } = useNotificationContext();
  const wsRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef();

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Already connected');
      return;
    }

    try {
      const wsUrl = `${url}?user_id=${encodeURIComponent(userId)}`;
      console.log('[WebSocket] Connecting to:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Connected successfully');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        // Send ping every 30s to keep connection alive
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          } else {
            clearInterval(pingInterval);
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          // Handle pong response (plain text, not JSON)
          if (event.data === 'pong') {
            return;
          }

          const data = JSON.parse(event.data);
          console.log('[WebSocket] Message received:', data);

          // Handle supported notifications
          if (isSupportedNotificationType(data.type)) {
            const clientSettings = getNotificationSettings();
            const notification = buildNotificationFromWsData(data);

            // Always show in-app live notifications if message arrived by WebSocket.
            // Client settings are only applied to sound/browser popups.
            addNotification(notification);

            if (clientSettings.enabled === false) {
              return;
            }

            // Play sound for URGENT/HIGH/MEDIUM priorities (always, even if tab visible)
            if (clientSettings.sound_enabled !== false) {
              playNotificationSound(notification.payload.priority);
            }

            // Show browser notification if supported and tab is hidden
            showBrowserNotification(notification, clientSettings);
          }
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('[WebSocket] Connection closed');
        setIsConnected(false);
        wsRef.current = null;

        // Attempt reconnection
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(
            `[WebSocket] Reconnecting... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else {
          console.error('[WebSocket] Max reconnect attempts reached');
        }
      };
    } catch (error) {
      console.error('[WebSocket] Failed to create connection:', error);
      setIsConnected(false);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  };

  useEffect(() => {
    if (userId) {
      connect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, url]);

  // Update browser title with unread count (Sprint 2.4)
  useEffect(() => {
    const unreadCount = notifications.filter(n => !n.read).length;
    
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) Virtus Calendar`;
    } else {
      document.title = 'Virtus Calendar';
    }
    
    // Optional: Reset title when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden && unreadCount === 0) {
        document.title = 'Virtus Calendar';
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [notifications]);

  return { connect, disconnect };
};

// Helper function to play notification sound
function playNotificationSound(priority) {
  // Don't play sound for LOW priority
  if (priority === 'low') {
    return;
  }

  try {
    // Use a data URI for a simple beep sound (or you can use a file from /public)
    // This is a simple 440Hz tone for 200ms
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Frequency based on priority
    const frequency = priority === 'urgent' ? 880 : priority === 'high' ? 660 : 440;
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    // Volume (0 to 1)
    gainNode.gain.value = 0.3;

    // Play sound
    oscillator.start(audioContext.currentTime);
    
    // Play multiple beeps for urgent
    if (priority === 'urgent') {
      oscillator.stop(audioContext.currentTime + 0.15);
      // Second beep
      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.value = frequency;
        osc2.type = 'sine';
        gain2.gain.value = 0.3;
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.15);
      }, 200);
    } else {
      oscillator.stop(audioContext.currentTime + 0.2);
    }
  } catch (error) {
    console.error('[WebSocket] Failed to play sound:', error);
  }
}

// Helper function for browser notifications
function showBrowserNotification(notification, clientSettings = { enabled: true }) {
  const { payload } = notification;
  if (clientSettings.enabled === false) {
    return;
  }

  // Only show if tab is hidden and LOW priority or above
  if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
    const isMissionReminder = notification.type === 'MISSION_REMINDER';
    const isNightlyReview = notification.type === 'NIGHTLY_REVIEW_SUMMARY';
    const isLearnedResponseReview = notification.type === 'LEARNED_RESPONSE_REVIEW';
    const isMentorBehavior = notification.type === 'MENTOR_BEHAVIOR';
    const isPatternDetected = notification.type === 'PATTERN_DETECTED';

    let title;
    if (isMissionReminder) title = '🎯 Recordatorio de misión';
    else if (isNightlyReview) title = '🌙 Resumen nocturno';
    else if (isLearnedResponseReview) title = '🌱 Conducta en práctica';
    else if (isMentorBehavior) title = `🧭 ${getMentorBehaviorTitle(payload)}`;
    else if (isPatternDetected) title = getPatternNotificationTitle(payload);
    else title = '⏰ Tarea por empezar';

    let body = '';
    if (isMissionReminder) {
      body = payload.message || `Recuerda tu misión: ${payload.mission_title || ''}`;
    } else if (isNightlyReview) {
      body = payload.summary || payload.message || 'Tu resumen nocturno está disponible.';
    } else if (isMentorBehavior) {
      body = getMentorBehaviorBody(payload) || 'El Mentor tiene algo que contarte.';
    } else if (isLearnedResponseReview) {
      body = payload.learned_response_reviews?.[0]?.question || 'Tienes una conducta que revisar.';
    } else if (isPatternDetected) {
      body = payload.detected_text || payload.message || '';
    } else {
      body = `"${payload.task_title}" empieza en ${payload.minutes_left} minutos`;
      if (payload.task_progress !== undefined) {
        body += ` (${payload.task_progress}% completado)`;
      }
    }

    const tag = isMissionReminder
      ? `mission-${payload.mission_id || notification.id}`
      : isNightlyReview
      ? `nightly-review-${payload.review_date || notification.id}`
      : isLearnedResponseReview
      ? `learned-response-review-${notification.history_id || notification.id}`
      : isMentorBehavior
      ? `mentor-behavior-${payload.pattern_date || notification.id}`
      : isPatternDetected
      ? `pattern-${payload.reflection_id || notification.id}`
      : payload.task_id;

    const options = {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag,
      requireInteraction: true,
    };

    if (payload.priority === 'low') {
      options.silent = true;
    }

    if (payload.priority === 'urgent' || payload.priority === 'high') {
      options.vibrate = [200, 100, 200];
    }

    const n = new Notification(title, options);

    n.onclick = () => {
      window.focus();
      if (isNightlyReview) {
        storeNightlyReviewPayload(payload);
        window.location.href = buildNightlyReviewHref(payload);
      } else if (isMentorBehavior) {
        storeMentorBehaviorPayload(payload);
        window.location.href = buildMentorBehaviorHref(payload);
      } else if (isLearnedResponseReview) {
        window.location.href = '/dashboard';
      } else if (isMissionReminder) window.location.href = '/character';
      else if (isPatternDetected) window.location.href = '/mentor';
      else window.location.href = '/calendar';
    };
  }
}

export function getPatternNotificationTitle(payload) {
  if (payload?.kind === 'value_conflict') {
    return `⚠️ Posible conflicto con tus valores (tu valor frágil: ${payload.pattern || ''})`;
  }
  return `⚠️ Patrón detectado: ${payload?.pattern || ''}`;
}

export function isSupportedNotificationType(type) {
  return (
    type === 'TASK_DUE_SOON' ||
    type === 'MISSION_REMINDER' ||
    type === 'NIGHTLY_REVIEW_SUMMARY' ||
    type === 'LEARNED_RESPONSE_REVIEW' ||
    type === 'MENTOR_BEHAVIOR' ||
    type === 'PATTERN_DETECTED'
  );
}

export function buildNotificationFromWsData(data) {
  const isMissionReminder = data.type === 'MISSION_REMINDER';
  const isNightlyReview = data.type === 'NIGHTLY_REVIEW_SUMMARY';
  const isLearnedResponseReview = data.type === 'LEARNED_RESPONSE_REVIEW';
  const isMentorBehavior = data.type === 'MENTOR_BEHAVIOR';
  const isPatternDetected = data.type === 'PATTERN_DETECTED';
  const baseId = isMissionReminder
    ? data.mission_id || data.notification_id
    : isNightlyReview
    ? data.review_date || data.notification_id
    : isLearnedResponseReview
    ? data.notification_id
    : isMentorBehavior
    ? data.pattern_date || data.notification_id
    : isPatternDetected
    ? data.reflection_id || data.notification_id
    : data.task_id;

  let payload;
  if (isMissionReminder) {
    payload = {
      mission_id: data.mission_id,
      mission_title: data.mission_title,
      expires_at: data.expires_at,
      minutes_left: data.minutes_left,
      message: data.message || `Recuerda tu misión: ${data.mission_title || ''}`,
      priority: data.priority || 'medium',
      context: data.context || {},
    };
  } else if (isNightlyReview) {
    payload = {
      review_date: data.review_date,
      summary: data.summary || data.message,
      message: data.message || data.summary,
      tasks_completed: data.tasks_completed || 0,
      tasks_failed: data.tasks_failed || 0,
      proposed_missions: data.proposed_missions || [],
      proposal_status: data.proposal_status || data.context?.proposal_status,
      priority: data.priority || 'low',
      context: data.context || {},
    };
  } else if (isLearnedResponseReview) {
    payload = {
      review_date: data.review_date || data.context?.review_date,
      learned_response_reviews:
        data.learned_response_reviews || data.context?.learned_response_reviews || [],
      priority: data.priority || 'low',
      context: data.context || {},
    };
  } else if (isMentorBehavior) {
    // Flat fields: the event carries no nested `context` (§9) because the JSONB
    // adapter cannot resolve dotted keys.
    payload = {
      pattern_date: data.pattern_date,
      title: data.title,
      body: data.body || data.message,
      message: data.body || data.message,
      focus_type: data.focus_type,
      focus_key: data.focus_key,
      related_item_id: data.related_item_id,
      has_today_context: Boolean(data.has_today_context),
      proposed_missions: data.proposed_missions || [],
      priority: data.priority || 'low',
      context: data.context || {},
    };
  } else if (isPatternDetected) {
    payload = {
      pattern: data.pattern,
      friction: data.friction,
      detected_text: data.detected_text,
      reflection_id: data.reflection_id,
      kind: data.kind || 'pressure_signal',
      message: data.message || `Patrón detectado: ${data.pattern || ''}`,
      priority: data.priority || 'medium',
      context: data.context || {},
    };
  } else {
    payload = {
      task_id: data.task_id,
      task_title: data.task_title || 'Sin título',
      task_domain: data.task_domain,
      task_progress: data.task_progress,
      date_start: data.date_start,
      minutes_left: data.minutes_left,
      message:
        data.summary ||
        data.message ||
        data.context?.summary ||
        data.context?.support_message ||
        null,
      priority: data.priority || 'medium',
      context: data.context || {},
    };
  }

  return {
    id: `${baseId || 'notification'}-${Date.now()}`,
    history_id: data.notification_id,
    type: data.type,
    user_id: data.user_id,
    payload,
    timestamp: new Date().toISOString(),
    server_timestamp: data.server_timestamp,
    read: false,
  };
}

const NOTIFICATION_SETTINGS_KEY = 'notification_settings';

function getNotificationSettings() {
  try {
    const raw = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (!raw) {
      return { enabled: true, sound_enabled: true };
    }
    const parsed = JSON.parse(raw);
    return {
      enabled: parsed?.enabled !== false,
      sound_enabled: parsed?.sound_enabled !== false,
    };
  } catch (error) {
    return { enabled: true, sound_enabled: true };
  }
}

// Mirror the backend notification settings into the local cache that gates
// sound/browser popups. Without a fresh sync on app load, a browser that never
// opened Settings (or where they changed on another device) would fall back to
// the permissive defaults and honk for notifications the user disabled.
export function cacheNotificationSettings(settings = {}) {
  try {
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify({
      enabled: settings.enabled,
      sound_enabled: settings.sound_enabled,
      priority_preferences: settings.priority_preferences,
      do_not_disturb: settings.do_not_disturb,
    }));
  } catch {
    // Visual/gating cache only: a write failure must not block the app.
  }
}
