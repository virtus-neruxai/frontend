import React, { useEffect, useState } from 'react';
import { X, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useNotificationContext } from '../contexts/NotificationContext';
import { notificationsApi } from '../lib/api';

export const NotificationToast = () => {
  const { notifications, dismissNotification } = useNotificationContext();
  const [visibleToasts, setVisibleToasts] = useState([]);

  useEffect(() => {
    // Show all unread notifications (no time limit)
    // Toasts stay until user manually dismisses them
    const unreadNotifications = notifications.filter((n) => !n.read);
    setVisibleToasts(unreadNotifications);
  }, [notifications]);

  const handleDismiss = async (notification) => {
    try {
      if (notification?.history_id) {
        await notificationsApi.markRead({ ids: [notification.history_id], mark_all: false });
      }
    } catch (error) {
      console.error('Error syncing toast dismiss read state:', error);
    } finally {
      dismissNotification(notification);
    }
  };

  if (visibleToasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {visibleToasts.map((notification) => (
        <Toast
          key={notification.id}
          notification={notification}
          onDismiss={() => handleDismiss(notification)}
        />
      ))}
    </div>
  );
};

const Toast = ({ notification, onDismiss }) => {
  const { payload } = notification;
  const isEmotionNotification = notification.type === 'EMOTION_NEGATIVE_FOLLOWUP_24H';
  const isMissionReminder = notification.type === 'MISSION_REMINDER';
  const isRoutine = !isMissionReminder && payload?.task_kind === 'routine';

  const formatNextTaskTime = (nextTask) => {
    const dateStart = nextTask?.date_start;
    if (dateStart) {
      const parsed = new Date(dateStart);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    }
    // Fallback: backend-provided human-readable time
    return nextTask?.start_time || '--:--';
  };

  // Priority config
  const getPriorityConfig = (priority) => {
    switch (priority) {
      case 'urgent':
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
        };
      case 'high':
        return {
          icon: AlertTriangle,
          color: 'text-orange-600',
          bg: 'bg-orange-50 dark:bg-orange-900/20',
          border: 'border-orange-200 dark:border-orange-800',
        };
      case 'medium':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-600',
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-800',
        };
      case 'low':
        return {
          icon: Info,
          color: 'text-blue-600',
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
        };
      default:
        return {
          icon: Info,
          color: 'text-gray-600',
          bg: 'bg-gray-50 dark:bg-gray-900/20',
          border: 'border-gray-200 dark:border-gray-800',
        };
    }
  };

  const config = getPriorityConfig(payload.priority);
  const Icon = config.icon;

  return (
    <div
      className={`
        ${config.bg} ${config.border} border
        rounded-lg shadow-lg p-4 
        animate-slide-in-right
        hover:shadow-xl transition-shadow
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`p-2 rounded-full ${config.bg} ${config.border} border`}>
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white text-sm">
            {isEmotionNotification
              ? '🫶 Seguimiento emocional'
              : isMissionReminder
              ? '🎯 Recordatorio de misión'
              : isRoutine
              ? '⏰ Rutina a punto de vencer'
              : '⏰ Tarea por empezar'}
          </p>
          {isEmotionNotification ? (
            <>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 truncate">
                {payload.emotion || 'Emoción'}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {payload.message || 'Han pasado casi 24 horas desde tu reflexión con emoción.'}
              </p>
            </>
          ) : isMissionReminder ? (
            <>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 line-clamp-2">
                {payload.message || `Recuerda tu misión: ${payload.mission_title || ''}`}
              </p>
              <a
                href="/character"
                className="text-xs text-blue-600 dark:text-blue-400 mt-1 hover:underline inline-block"
              >
                Ver misión →
              </a>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 truncate">
                {payload.task_title}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Empieza en {payload.minutes_left} minutos
              </p>
            </>
          )}

          {!isEmotionNotification && !isMissionReminder && !isRoutine && payload.task_progress !== undefined && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                <span>Progreso</span>
                <span>{payload.task_progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all"
                  style={{ width: `${payload.task_progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Sprint 2.1: Show next task */}
          {!isEmotionNotification && !isMissionReminder && payload.context?.next_task && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 flex items-center gap-1">
              <span className="font-medium">Siguiente:</span>
              <span className="truncate">{payload.context.next_task.title}</span>
              <span className="text-gray-500">a las {formatNextTaskTime(payload.context.next_task)}</span>
            </p>
          )}

          {!isEmotionNotification && !isMissionReminder && payload.task_domain && (
            <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              {payload.task_domain}
            </span>
          )}
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 flex-shrink-0"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
