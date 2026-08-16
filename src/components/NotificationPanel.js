import React, { useEffect, useState } from 'react';
import { X, Check, Trash2, AlertCircle, AlertTriangle, Info, Bell, ChevronDown, ChevronRight } from 'lucide-react';
import { useNotificationContext } from '../contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { notificationsApi } from '../lib/api';
import {
  buildNightlyReviewHref,
  getNightlyReviewProposalStatus,
  getNightlyReviewProposalStatusLabel,
  storeNightlyReviewPayload,
} from '../lib/schedulerReview/nightlyReviewNotification';
import {
  buildMentorBehaviorHref,
  getMentorBehaviorBody,
  getMentorBehaviorProposals,
  getMentorBehaviorTitle,
  storeMentorBehaviorPayload,
} from '../lib/schedulerReview/mentorBehaviorNotification';
import { buildNotificationFromHistoryItem, getPatternNotificationTitle } from '../hooks/useWebSocket';


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

/**
 * NRRM F8 — compact behaviour reviews produced by the NightlyReview run
 * (§14.2/§14.3), but delivered separately from the nightly summary.
 *
 * Each item asks whether there was an occasion; none of them says the user
 * should have done anything, and none shows a count. Both the fixed cadence
 * and the contextual detection render identically on purpose: the user never
 * reads "we noticed you were struggling".
 */
export function LearnedResponseReviews({ reviews, onOpenPanel }) {
  const items = reviews || [];
  if (items.length === 0) return null;
  return (
    <div className="mt-3 border-t border-border pt-2" data-testid="learned-response-reviews">
      {items.map((item) => (
        <div key={item.response_key} className="mt-1.5 first:mt-0">
          <p className="text-xs text-foreground">{item.alternative_response}</p>
          <p className="text-xs text-muted-foreground">{item.question}</p>
        </div>
      ))}
      <button
        type="button"
        onClick={async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await onOpenPanel();
        }}
        className="mt-1.5 inline-block text-xs text-primary hover:underline"
      >
        Ver mis conductas →
      </button>
    </div>
  );
}

export const NotificationPanel = ({ onClose }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, dismissNotification, clearAll } =
    useNotificationContext();
  const [activeTab, setActiveTab] = useState('live');
  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  // "En vivo" is the user's inbox. A notification only moves to history
  // after it has been read, never merely because it was persisted server-side.
  const liveNotifications = notifications.filter((notification) => !notification.read);

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await notificationsApi.getHistory({ status: 'read', limit: 50, offset: 0 });
      const items = response?.data?.items || [];
      // Keep the client-side guard as well: a delayed or non-conforming
      // response must not leak an unread entry into Historial.
      setHistoryItems(items.filter((item) => item.status === 'read'));
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

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
      fetchAnalytics();
    }
  }, [activeTab]);

  return (
    <div className="w-96 bg-card rounded-lg shadow-xl border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-foreground">
          Notificaciones {activeTab === 'live' && unreadCount > 0 && `(${unreadCount})`}
        </h3>
        <div className="flex items-center gap-2">
          {activeTab === 'live' && unreadCount > 0 && (
            <button
              onClick={markAllLiveAsRead}
              className="text-sm text-primary hover:opacity-80"
              title="Marcar todas como leídas"
            >
              <Check className="w-4 h-4" />
            </button>
          )}
          {activeTab === 'live' && liveNotifications.length > 0 && (
            <button
              onClick={clearAll}
              className="text-sm text-muted-foreground hover:text-foreground"
              title="Limpiar todas"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('live')}
          className={`flex-1 px-4 py-2 text-sm ${activeTab === 'live' ? 'font-semibold text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
        >
          En vivo
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 px-4 py-2 text-sm ${activeTab === 'history' ? 'font-semibold text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
        >
          Historial
        </button>
      </div>

      {/* Notification List */}
      <div className="max-h-96 overflow-y-auto">
        {activeTab === 'live' ? (
          liveNotifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No hay notificaciones</p>
            </div>
          ) : (
            liveNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={() => markLiveAsRead(notification)}
                onRemove={() => dismissLiveNotification(notification)}
              />
            ))
          )
        ) : historyLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            <p>Cargando historial...</p>
          </div>
        ) : (
          <>
            {analytics && (
              <div className="p-3 border-b bg-muted/50">
                <p className="text-xs font-semibold text-foreground mb-2">
                  Últimos {analytics.days} días
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded border p-2 bg-card">
                    <p className="text-muted-foreground">Total</p>
                    <p className="font-semibold text-foreground">{analytics.total_notifications}</p>
                  </div>
                  <div className="rounded border p-2 bg-card">
                    <p className="text-muted-foreground">No leídas</p>
                    <p className="font-semibold text-foreground">{analytics.unread_notifications}</p>
                  </div>
                  <div className="rounded border p-2 bg-card">
                    <p className="text-muted-foreground">Urgentes</p>
                    <p className="font-semibold text-destructive">{analytics.by_priority?.urgent || 0}</p>
                  </div>
                  <div className="rounded border p-2 bg-card">
                    <p className="text-muted-foreground">Altas</p>
                    <p className="font-semibold text-primary">{analytics.by_priority?.high || 0}</p>
                  </div>
                </div>
              </div>
            )}

            {historyItems.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay historial</p>
              </div>
            ) : (
              historyItems.map((item) => (
                <NotificationItem
                  key={item.id}
                  notification={buildNotificationFromHistoryItem(item)}
                  onMarkAsRead={undefined}
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
  const isMissionReminder = notification.type === 'MISSION_REMINDER';
  const isNightlyReview = notification.type === 'NIGHTLY_REVIEW_SUMMARY';
  const isLearnedResponseReview = notification.type === 'LEARNED_RESPONSE_REVIEW';
  const isMentorBehavior = notification.type === 'MENTOR_BEHAVIOR';
  const isPatternDetected = notification.type === 'PATTERN_DETECTED';
  const nightlyReviewProposalStatus = getNightlyReviewProposalStatus(payload);
  const nightlyReviewProposalStatusLabel = getNightlyReviewProposalStatusLabel(nightlyReviewProposalStatus);
  const mentorBehaviorProposals = getMentorBehaviorProposals(payload);

  // Priority colors
  const getPriorityConfig = (priority) => {
    switch (priority) {
      case 'urgent':
        return {
          icon: AlertCircle,
          color: 'text-destructive',
          bg: 'bg-[hsl(var(--destructive-soft))]',
          border: 'border-destructive/30',
        };
      case 'high':
        return {
          icon: AlertTriangle,
          color: 'text-primary',
          bg: 'bg-primary/10',
          border: 'border-primary/30',
        };
      case 'medium':
        return {
          icon: AlertTriangle,
          color: 'text-[hsl(var(--warning))]',
          bg: 'bg-[hsl(var(--warning-soft))]',
          border: 'border-[hsl(var(--warning))]',
        };
      case 'low':
        return {
          icon: Info,
          color: 'text-[hsl(var(--info))]',
          bg: 'bg-[hsl(var(--info-soft))]',
          border: 'border-[hsl(var(--info))]',
        };
      default:
        return {
          icon: Info,
          color: 'text-muted-foreground',
          bg: 'bg-muted',
          border: 'border-border',
        };
    }
  };

  const config = getPriorityConfig(payload.priority);
  const Icon = config.icon;

  const openNightlyReview = async () => {
    storeNightlyReviewPayload(payload);
    if (onRemove) {
      await onRemove(notification);
    } else if (!read) {
      await onMarkAsRead(notification.id);
    }
    window.location.href = buildNightlyReviewHref(payload);
  };

  // MENTOR_BEHAVIOR §10 — same treatment as the nightly summary: the notice is
  // read here, and its proposed mission is confirmed on Character.
  const openMentorBehavior = async () => {
    storeMentorBehaviorPayload(payload);
    if (onRemove) {
      await onRemove(notification);
    } else if (!read) {
      await onMarkAsRead(notification.id);
    }
    window.location.href = buildMentorBehaviorHref(payload);
  };

  // NRRM F8 §14.3 — the review asks; acting on it happens in the panel, with
  // the behaviour and its history in front of you. Deliberately not a one-tap
  // "register"/"pause" from the notification itself.
  const openBehaviorsPanel = async () => {
    if (onRemove) {
      await onRemove(notification);
    } else if (!read) {
      await onMarkAsRead(notification.id);
    }
    window.location.href = '/dashboard';
  };

  const handleClick = () => {
    if (isNightlyReview) {
      openNightlyReview();
      return;
    }
    if (isMentorBehavior) {
      openMentorBehavior();
      return;
    }
    if (isLearnedResponseReview) {
      openBehaviorsPanel();
      return;
    }
    if (!read) {
      onMarkAsRead(notification.id);
    }
    if (isMissionReminder) window.location.href = '/character';
    else if (isPatternDetected) window.location.href = '/mentor';
    else window.location.href = '/calendar';
  };

  return (
    <div
      className={`
        p-4 border-b 
        ${!read ? 'bg-primary/10' : ''}
        hover:bg-muted/60 cursor-pointer
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
            <p className="font-medium text-foreground text-sm leading-snug break-words">
              {isMissionReminder
                ? `🎯 ${payload.mission_title || 'Recordatorio de misión'}`
                : isNightlyReview
                ? '🌙 Resumen nocturno'
                : isLearnedResponseReview
                ? '🌱 Conducta en práctica'
                : isMentorBehavior
                ? `🧭 ${getMentorBehaviorTitle(payload)}`
                : isPatternDetected
                ? getPatternNotificationTitle(payload)
                : payload.task_title}
            </p>
            {!read && (
              <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" />
            )}
          </div>

          {isNightlyReview ? (
            <>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap break-words">
                {payload.summary || payload.message || 'Tu resumen nocturno está disponible.'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {payload.tasks_completed || 0} completadas · {payload.tasks_failed || 0} fallidas
              </p>
              {nightlyReviewProposalStatusLabel ? (
                <p className="text-xs text-muted-foreground mt-1">
                  {nightlyReviewProposalStatusLabel}
                </p>
              ) : null}
              <a
                href={buildNightlyReviewHref(payload)}
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  await openNightlyReview();
                }}
                className="text-xs text-primary mt-1 hover:underline inline-block"
              >
                {nightlyReviewProposalStatus || (payload.proposed_missions || []).length === 0
                  ? 'Ver revisión →'
                  : 'Abrir propuesta →'}
              </a>
            </>
          ) : isMentorBehavior ? (
            <>
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap break-words">
                {getMentorBehaviorBody(payload)}
              </p>
              <a
                href={buildMentorBehaviorHref(payload)}
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  await openMentorBehavior();
                }}
                className="text-xs text-primary mt-1 hover:underline inline-block"
              >
                {mentorBehaviorProposals.length === 0 ? 'Ver en Carácter →' : 'Ver la misión propuesta →'}
              </a>
            </>
          ) : isLearnedResponseReview ? (
            <LearnedResponseReviews
              reviews={payload.learned_response_reviews}
              onOpenPanel={openBehaviorsPanel}
            />
          ) : isMissionReminder ? (
            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap break-words">
              {payload.message || `Recuerda tu misión: ${payload.mission_title || ''}`}
            </p>
          ) : isPatternDetected ? (
            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap break-words">
              {payload.detected_text || payload.message}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap break-words">
              {getTaskNotificationBody(payload)}
            </p>
          )}

          {/* Sprint 2.1: Show tasks today after current task */}
          {payload.context?.tasks_today_after &&
            payload.context.tasks_today_after.length > 0 && (
            <div className="mt-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTodayTasks(!showTodayTasks);
                }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
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
                <div className="mt-2 space-y-2 pl-4 border-l-2 border-border">
                  {payload.context.tasks_today_after.map((task, idx) => (
                    <div key={idx} className="text-xs">
                      <p className="font-medium text-foreground">{task.title}</p>
                      {task.description && (
                        <p className="text-muted-foreground mt-0.5 line-clamp-1">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                        <span className="px-1.5 py-0.5 bg-muted rounded">
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

          <p className="text-xs text-muted-foreground mt-2">
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
            className="text-muted-foreground hover:text-foreground p-1"
            title="Eliminar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
