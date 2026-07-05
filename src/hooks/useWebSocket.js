import { useEffect, useRef } from 'react';
import { useNotificationContext } from '../contexts/NotificationContext';

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
    const isReflectionFollowup = notification.type === 'REFLECTION_NEGATIVE_FOLLOWUP_24H';
    const isMissionReminder = notification.type === 'MISSION_REMINDER';
    const isNightlyReview = notification.type === 'NIGHTLY_REVIEW_SUMMARY';

    let title;
    if (isReflectionFollowup) title = '🫶 Seguimiento de reflexión';
    else if (isMissionReminder) title = '🎯 Recordatorio de misión';
    else if (isNightlyReview) title = '🌙 Resumen nocturno';
    else title = '⏰ Tarea por empezar';

    let body = '';
    if (isReflectionFollowup) {
      body =
        payload.message ||
        `Hace casi 24 horas escribiste una reflexión marcada como ${String(payload.emotion || 'señal emocional').toLowerCase()}.`;
    } else if (isMissionReminder) {
      body = payload.message || `Recuerda tu misión: ${payload.mission_title || ''}`;
    } else if (isNightlyReview) {
      body = payload.summary || payload.message || 'Tu resumen nocturno está disponible.';
    } else {
      body = `"${payload.task_title}" empieza en ${payload.minutes_left} minutos`;
      if (payload.task_progress !== undefined) {
        body += ` (${payload.task_progress}% completado)`;
      }
    }

    const tag = isReflectionFollowup
      ? `reflection-followup-${payload.reflection_id || notification.id}`
      : isMissionReminder
      ? `mission-${payload.mission_id || notification.id}`
      : isNightlyReview
      ? `nightly-review-${payload.review_date || notification.id}`
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
      if (isReflectionFollowup || isMissionReminder || isNightlyReview) window.location.href = '/character';
      else window.location.href = '/calendar';
    };
  }
}

export function isSupportedNotificationType(type) {
  return (
    type === 'TASK_DUE_SOON' ||
    type === 'REFLECTION_NEGATIVE_FOLLOWUP_24H' ||
    type === 'MISSION_REMINDER' ||
    type === 'NIGHTLY_REVIEW_SUMMARY'
  );
}

export function buildNotificationFromWsData(data) {
  const isReflectionFollowup = data.type === 'REFLECTION_NEGATIVE_FOLLOWUP_24H';
  const isMissionReminder = data.type === 'MISSION_REMINDER';
  const isNightlyReview = data.type === 'NIGHTLY_REVIEW_SUMMARY';
  const baseId = isReflectionFollowup
    ? data.reflection_id || data.notification_id
    : isMissionReminder
    ? data.mission_id || data.notification_id
    : isNightlyReview
    ? data.review_date || data.notification_id
    : data.task_id;

  let payload;
  if (isReflectionFollowup) {
    payload = {
      reflection_id: data.reflection_id,
      emotion: data.emotion || 'Emoción',
      emotion_note: data.emotion_note,
      message: data.message,
      occurred_at: data.occurred_at,
      remind_at: data.remind_at,
      minutes_until_24h: data.minutes_until_24h,
      priority: 'low',
      context: data.context || {},
    };
  } else if (isMissionReminder) {
    payload = {
      mission_id: data.mission_id,
      mission_title: data.mission_title,
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
      priority: data.priority || 'low',
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

function getNotificationSettings() {
  try {
    const raw = localStorage.getItem('notification_settings');
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
