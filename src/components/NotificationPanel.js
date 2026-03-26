import React, { useEffect, useState } from 'react';
import { X, Check, Trash2, AlertCircle, AlertTriangle, Info, Bell, ChevronDown, ChevronRight } from 'lucide-react';
import { useNotificationContext } from '../contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { notificationsApi } from '../lib/api';

function getProactiveNotificationTitle(notification, payload) {
  const suggestionType = payload?.suggestion_type || payload?.context?.suggestion_type;

  if (notification.type === 'PROACTIVE_ACTION_APPLIED') {
    if (suggestionType === 'SPLIT_TASK') return '✅ Tarea dividida';
    if (suggestionType === 'EDIT_TASK') return '✅ Tarea reprogramada';
    return '✅ Cambio aplicado';
  }

  if (suggestionType === 'SPLIT_TASK') return '💡 Sugerencia: dividir tarea';
  if (suggestionType === 'EDIT_TASK') return '💡 Sugerencia: reprogramar tarea';
  if (payload?.context?.proposal_family === 'new_mission') return '💡 Nueva misión sugerida';
  if (payload?.context?.proposal_family === 'new_routine') return '💡 Nueva rutina sugerida';
  return '💡 Nueva sugerencia';
}

function getProactiveNotificationBody(payload) {
  return (
    payload?.message ||
    payload?.context?.summary ||
    payload?.task_title ||
    'El asistente tiene una nueva sugerencia para ti.'
  );
}

function getTaskNotificationBody(payload) {
  return (
    payload?.message ||
    payload?.context?.summary ||
    payload?.context?.support_message ||
    (payload?.minutes_left !== undefined && payload?.minutes_left !== null
      ? `Faltan ${payload.minutes_left} min para empezar`
      : 'Tienes una tarea que requiere atención.')
  );
}

export const NotificationPanel = ({ onClose }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, dismissNotification, clearAll } =
    useNotificationContext();
  const [activeTab, setActiveTab] = useState('live');
  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyUnreadCount, setHistoryUnreadCount] = useState(0);
  const [analytics, setAnalytics] = useState(null);

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await notificationsApi.getHistory({ limit: 50, offset: 0 });
      const items = response?.data?.items || [];
      setHistoryItems(items);
      setHistoryUnreadCount(response?.data?.unread_count || 0);
    } catch (error) {
      console.error('Error loading notification history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await notificationsApi.getAnalytics(7);
      setAnalytics(response?.data || null);
    } catch (error) {
      console.error('Error loading notification analytics:', error);
    }
  };

  const markHistoryAsRead = async (id) => {
    try {
      await notificationsApi.markRead({ ids: [id], mark_all: false });
      setHistoryItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: 'read' } : item))
      );
      setHistoryUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markLiveAsRead = async (notification) => {
    try {
      if (notification?.history_id) {
        await notificationsApi.markRead({ ids: [notification.history_id], mark_all: false });
      }
    } catch (error) {
      console.error('Error syncing live notification read state:', error);
    } finally {
      markAsRead(notification.id);
    }
  };

  const dismissLiveNotification = async (notification) => {
    try {
      if (notification?.history_id) {
        await notificationsApi.markRead({ ids: [notification.history_id], mark_all: false });
      }
    } catch (error) {
      console.error('Error dismissing live notification:', error);
    } finally {
      dismissNotification(notification);
    }
  };

  const markAllLiveAsRead = async () => {
    const unreadHistoryIds = notifications
      .filter((n) => !n.read && n.history_id)
      .map((n) => n.history_id);

    try {
      if (unreadHistoryIds.length > 0) {
        await notificationsApi.markRead({ ids: unreadHistoryIds, mark_all: false });
      }
    } catch (error) {
      console.error('Error syncing live notifications read state:', error);
    } finally {
      markAllAsRead();
    }
  };

  const markAllHistoryAsRead = async () => {
    try {
      await notificationsApi.markRead({ ids: [], mark_all: true });
      setHistoryItems((prev) => prev.map((item) => ({ ...item, status: 'read' })));
      setHistoryUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
      fetchAnalytics();
    }
  }, [activeTab]);

  return (
    <div className="w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Notificaciones {activeTab === 'live' ? (unreadCount > 0 && `(${unreadCount})`) : (historyUnreadCount > 0 && `(${historyUnreadCount})`)}
        </h3>
        <div className="flex items-center gap-2">
          {activeTab === 'live' && unreadCount > 0 && (
            <button
              onClick={markAllLiveAsRead}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
              title="Marcar todas como leídas"
            >
              <Check className="w-4 h-4" />
            </button>
          )}
          {activeTab === 'live' && notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="text-sm text-gray-600 hover:text-gray-700 dark:text-gray-400"
              title="Limpiar todas"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {activeTab === 'history' && historyUnreadCount > 0 && (
            <button
              onClick={markAllHistoryAsRead}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
              title="Marcar historial como leído"
            >
              <Check className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('live')}
          className={`flex-1 px-4 py-2 text-sm ${activeTab === 'live' ? 'font-semibold text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 dark:text-gray-400'}`}
        >
          En vivo
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 px-4 py-2 text-sm ${activeTab === 'history' ? 'font-semibold text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 dark:text-gray-400'}`}
        >
          Historial
        </button>
      </div>

      {/* Notification List */}
      <div className="max-h-96 overflow-y-auto">
        {activeTab === 'live' ? (
          notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No hay notificaciones</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={() => markLiveAsRead(notification)}
                onRemove={() => dismissLiveNotification(notification)}
              />
            ))
          )
        ) : historyLoading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <p>Cargando historial...</p>
          </div>
        ) : (
          <>
            {analytics && (
              <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Últimos {analytics.days} días
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded border border-gray-200 dark:border-gray-700 p-2 bg-white dark:bg-gray-800">
                    <p className="text-gray-500 dark:text-gray-400">Total</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{analytics.total_notifications}</p>
                  </div>
                  <div className="rounded border border-gray-200 dark:border-gray-700 p-2 bg-white dark:bg-gray-800">
                    <p className="text-gray-500 dark:text-gray-400">No leídas</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{analytics.unread_notifications}</p>
                  </div>
                  <div className="rounded border border-gray-200 dark:border-gray-700 p-2 bg-white dark:bg-gray-800">
                    <p className="text-gray-500 dark:text-gray-400">Urgentes</p>
                    <p className="font-semibold text-red-600 dark:text-red-400">{analytics.by_priority?.urgent || 0}</p>
                  </div>
                  <div className="rounded border border-gray-200 dark:border-gray-700 p-2 bg-white dark:bg-gray-800">
                    <p className="text-gray-500 dark:text-gray-400">Altas</p>
                    <p className="font-semibold text-orange-600 dark:text-orange-400">{analytics.by_priority?.high || 0}</p>
                  </div>
                </div>
              </div>
            )}

            {historyItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay historial</p>
              </div>
            ) : (
              historyItems.map((item) => (
                <NotificationItem
                  key={item.id}
                  notification={{
                    id: item.id,
                    type: item.type,
                    payload: {
                      task_title: item.task_title,
                      task_domain: item.task_domain,
                      task_progress: item.task_progress,
                      minutes_left: item.minutes_left,
                      priority:
                        item.type === 'EMOTION_NEGATIVE_FOLLOWUP_24H'
                          ? 'low'
                          : item.priority,
                      suggestion_type: item.context?.suggestion_type,
                      proposal_family: item.context?.proposal_family,
                      emotion_id: item.context?.emotion_id,
                      emotion: item.context?.emotion,
                      emotion_note: item.context?.emotion_note,
                      message:
                        item.context?.summary ||
                        item.task_title ||
                        item.context?.support_message,
                      occurred_at: item.context?.occurred_at,
                      context: item.context || {},
                    },
                    read: item.status === 'read',
                    timestamp: item.created_at,
                  }}
                  onMarkAsRead={() => markHistoryAsRead(item.id)}
                  onRemove={undefined}
                />
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
};

const NotificationItem = ({ notification, onMarkAsRead, onRemove }) => {
  const { payload, read } = notification;
  const [showTodayTasks, setShowTodayTasks] = useState(false);
  const isEmotionNotification = notification.type === 'EMOTION_NEGATIVE_FOLLOWUP_24H';
  const isProactiveNotification =
    notification.type === 'PROACTIVE_TASK_SUGGESTION' ||
    notification.type === 'PROACTIVE_ACTION_APPLIED';

  // Priority colors
  const getPriorityConfig = (priority) => {
    switch (priority) {
      case 'urgent':
        return {
          icon: AlertCircle,
          color: 'text-red-600 dark:text-red-400',
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
        };
      case 'high':
        return {
          icon: AlertTriangle,
          color: 'text-orange-600 dark:text-orange-400',
          bg: 'bg-orange-50 dark:bg-orange-900/20',
          border: 'border-orange-200 dark:border-orange-800',
        };
      case 'medium':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-600 dark:text-yellow-400',
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-800',
        };
      case 'low':
        return {
          icon: Info,
          color: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
        };
      default:
        return {
          icon: Info,
          color: 'text-gray-600 dark:text-gray-400',
          bg: 'bg-gray-50 dark:bg-gray-900/20',
          border: 'border-gray-200 dark:border-gray-800',
        };
    }
  };

  const config = getPriorityConfig(payload.priority);
  const Icon = config.icon;

  const handleClick = () => {
    if (!read) {
      onMarkAsRead(notification.id);
    }
    if (isEmotionNotification) window.location.href = '/emotions';
    else if (isProactiveNotification) window.location.href = '/suggestions';
    else window.location.href = '/calendar';
  };

  return (
    <div
      className={`
        p-4 border-b border-gray-200 dark:border-gray-700 
        ${!read ? 'bg-blue-50 dark:bg-blue-900/10' : ''}
        hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer
        transition-colors
      `}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        {/* Priority Icon */}
        <div className={`p-2 rounded-full ${config.bg} ${config.border} border`}>
          <Icon className={`w-4 h-4 ${config.color}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-gray-900 dark:text-white text-sm leading-snug break-words">
              {isEmotionNotification
                ? `Seguimiento emocional: ${payload.emotion || 'Emoción'}`
                : isProactiveNotification
                ? getProactiveNotificationTitle(notification, payload)
                : payload.task_title}
            </p>
            {!read && (
              <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />
            )}
          </div>

          {isEmotionNotification ? (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap break-words">
              {payload.message || 'Recordatorio de seguimiento emocional a las 24 horas.'}
            </p>
          ) : isProactiveNotification ? (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap break-words">
              {getProactiveNotificationBody(payload)}
            </p>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap break-words">
              {getTaskNotificationBody(payload)}
            </p>
          )}

          {!isEmotionNotification && payload.task_progress !== undefined && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Progreso: {payload.task_progress}%
            </p>
          )}

          {!isEmotionNotification && payload.task_domain && (
            <span className="inline-block mt-2 px-2 py-1 text-xs rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              {payload.task_domain}
            </span>
          )}

          {/* Sprint 2.1: Show tasks today after current task */}
          {!isEmotionNotification &&
            payload.context?.tasks_today_after &&
            payload.context.tasks_today_after.length > 0 && (
            <div className="mt-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTodayTasks(!showTodayTasks);
                }}
                className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                {showTodayTasks ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                <span>
                  {payload.context.tasks_today_after.length} tarea{payload.context.tasks_today_after.length > 1 ? 's' : ''} después hoy
                </span>
              </button>

              {showTodayTasks && (
                <div className="mt-2 space-y-2 pl-4 border-l-2 border-gray-300 dark:border-gray-600">
                  {payload.context.tasks_today_after.map((task, idx) => (
                    <div key={idx} className="text-xs">
                      <p className="font-medium text-gray-700 dark:text-gray-300">{task.title}</p>
                      {task.description && (
                        <p className="text-gray-500 dark:text-gray-500 mt-0.5 line-clamp-1">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-gray-500 dark:text-gray-500">
                        <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">
                          {task.status}
                        </span>
                        <span>{task.progress_percent}% completado</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            {formatDistanceToNow(new Date(notification.timestamp), {
              addSuffix: true,
              locale: es,
            })}
          </p>
        </div>

        {/* Actions */}
        {typeof onRemove === 'function' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(notification.id);
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
            title="Eliminar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
