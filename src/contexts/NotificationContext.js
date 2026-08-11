import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { notificationsApi } from '../lib/api';
import { buildNotificationFromHistoryItem, isSupportedNotificationType } from '../lib/notificationMapping';

// How many recent unread items to catch up on at load. Matches the page size
// the history tab already uses — anything older than that is still one click
// away in "Historial", it just does not need to interrupt "En vivo".
const UNREAD_CATCHUP_LIMIT = 50;

const NotificationContext = createContext(undefined);

const STORAGE_PREFIX = 'notifications';
const DISMISSED_PREFIX = 'dismissed_notifications';

function buildStorageKey(prefix, userId) {
  return `${prefix}:${userId || 'anonymous'}`;
}

function getNotificationKey(notification) {
  if (!notification) return null;
  if (notification.history_id) return `history:${notification.history_id}`;

  const payload = notification.payload || {};
  if (notification.type === 'MISSION_REMINDER') {
    if (payload.mission_id) return `mission:${payload.mission_id}`;
  }

  if (notification.type === 'NIGHTLY_REVIEW_SUMMARY') {
    if (payload.review_date) return `nightly-review:${payload.review_date}`;
  }

  if (notification.type === 'MENTOR_BEHAVIOR') {
    if (payload.pattern_date) return `mentor-behavior:${payload.pattern_date}`;
  }

  if (notification.type === 'PATTERN_DETECTED') {
    if (payload.reflection_id) return `pattern:${payload.reflection_id}`;
  }

  if (payload.task_id) return `task:${payload.task_id}:${notification.type}`;
  if (notification.user_id && notification.type && notification.timestamp) {
    return `fallback:${notification.user_id}:${notification.type}:${notification.timestamp}`;
  }
  return notification.id || null;
}

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.username || '';
  const notificationsStorageKey = useMemo(() => buildStorageKey(STORAGE_PREFIX, userId), [userId]);
  const dismissedStorageKey = useMemo(() => buildStorageKey(DISMISSED_PREFIX, userId), [userId]);
  const [notifications, setNotifications] = useState([]);
  const [dismissedKeys, setDismissedKeys] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = useCallback((notification) => {
    const notificationKey = getNotificationKey(notification);
    if (!notificationKey) {
      return;
    }

    setNotifications(prev => {
      if (dismissedKeys.includes(notificationKey)) {
        return prev;
      }

      const existingIndex = prev.findIndex((item) => getNotificationKey(item) === notificationKey);
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          ...notification,
          id: next[existingIndex].id,
          read: next[existingIndex].read,
        };
        return next;
      }

      return [notification, ...prev];
    });
  }, [dismissedKeys]);

  const markAsRead = useCallback((id) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const dismissNotification = useCallback((notification) => {
    const notificationKey = getNotificationKey(notification);
    if (notificationKey) {
      setDismissedKeys(prev => (prev.includes(notificationKey) ? prev : [notificationKey, ...prev].slice(0, 500)));
    }
    setNotifications(prev => prev.filter(n => n.id !== notification.id));
  }, []);

  const clearAll = useCallback(() => {
    setDismissedKeys(prev => {
      const next = [...prev];
      notifications.forEach((notification) => {
        const key = getNotificationKey(notification);
        if (key && !next.includes(key)) {
          next.push(key);
        }
      });
      return next.slice(-500);
    });
    setNotifications([]);
  }, [notifications]);

  useEffect(() => {
    const stored = localStorage.getItem(notificationsStorageKey);
    const dismissed = localStorage.getItem(dismissedStorageKey);

    if (dismissed) {
      try {
        setDismissedKeys(JSON.parse(dismissed));
      } catch (e) {
        console.error('Failed to parse dismissed notifications:', e);
        setDismissedKeys([]);
      }
    } else {
      setDismissedKeys([]);
    }

    if (stored) {
      try {
        setNotifications(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse stored notifications:', e);
        setNotifications([]);
      }
    } else {
      setNotifications([]);
    }
  }, [notificationsStorageKey, dismissedStorageKey]);

  useEffect(() => {
    localStorage.setItem(notificationsStorageKey, JSON.stringify(notifications));
  }, [notifications, notificationsStorageKey]);

  useEffect(() => {
    localStorage.setItem(dismissedStorageKey, JSON.stringify(dismissedKeys));
  }, [dismissedKeys, dismissedStorageKey]);

  // Catches up "En vivo" with whatever arrived while nobody had a tab open —
  // a WebSocket has no memory, so a cron notification fired with the browser
  // closed would otherwise exist only in "Historial" and never move the bell.
  // Runs once per login (and again if a dismiss changes what should be
  // filtered out), not on every render: `addNotification` only changes
  // identity when `dismissedKeys` does.
  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;

    notificationsApi
      .getHistory({ status: 'unread', limit: UNREAD_CATCHUP_LIMIT })
      .then((response) => {
        if (cancelled) return;
        const items = response?.data?.items || [];
        items
          .filter((item) => isSupportedNotificationType(item.type))
          .forEach((item) => addNotification(buildNotificationFromHistoryItem(item)));
      })
      .catch((error) => {
        console.error('Error catching up on unread notifications:', error);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, addNotification]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        dismissNotification,
        clearAll,
        isConnected,
        setIsConnected,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
};
