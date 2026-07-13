import React, { useEffect, useState } from 'react';
import { X, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useNotificationContext } from '../contexts/NotificationContext';
import { notificationsApi } from '../lib/api';
import {
  buildNightlyReviewHref,
  getNightlyReviewProposalStatus,
  getNightlyReviewProposalStatusLabel,
  storeNightlyReviewPayload,
} from '../lib/nightlyReviewNotification';

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
  const isMissionReminder = notification.type === 'MISSION_REMINDER';
  const isNightlyReview = notification.type === 'NIGHTLY_REVIEW_SUMMARY';
  const isPatternDetected = notification.type === 'PATTERN_DETECTED';
  const isRoutine = !isMissionReminder && !isNightlyReview && !isPatternDetected && payload?.task_kind === 'routine';
  const nightlyReviewHref = buildNightlyReviewHref(payload);
  const nightlyReviewProposalStatus = getNightlyReviewProposalStatus(payload);
  const nightlyReviewProposalStatusLabel = getNightlyReviewProposalStatusLabel(nightlyReviewProposalStatus);

  const handleNightlyReviewOpen = async (event) => {
    event.preventDefault();
    storeNightlyReviewPayload(payload);
    await onDismiss();
    window.location.href = nightlyReviewHref;
  };

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
          <p className="font-semibold text-foreground text-sm">
            {isMissionReminder
              ? '🎯 Recordatorio de misión'
              : isNightlyReview
              ? '🌙 Resumen nocturno'
              : isPatternDetected
              ? `⚠️ Patrón detectado: ${payload.pattern || ''}`
              : isRoutine
              ? '⏰ Rutina a punto de vencer'
              : '⏰ Tarea por empezar'}
          </p>
          {isPatternDetected ? (
            <>
              <p className="text-sm text-foreground mt-1 whitespace-pre-wrap line-clamp-4">
                {payload.detected_text || payload.message}
              </p>
              <a
                href="/mentor"
                className="text-xs text-primary mt-1 hover:underline inline-block"
              >
                Hablar con el mentor →
              </a>
            </>
          ) : isNightlyReview ? (
            <>
              <p className="text-sm text-foreground mt-1 whitespace-pre-wrap line-clamp-4">
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
                href={nightlyReviewHref}
                onClick={handleNightlyReviewOpen}
                className="text-xs text-primary mt-1 hover:underline inline-block"
              >
                {nightlyReviewProposalStatus || (payload.proposed_missions || []).length === 0
                  ? 'Ver revisión →'
                  : 'Abrir propuesta →'}
              </a>
            </>
          ) : isMissionReminder ? (
            <>
              <p className="text-sm text-foreground mt-1 line-clamp-2">
                {payload.message || `Recuerda tu misión: ${payload.mission_title || ''}`}
              </p>
              <a
                href="/character"
                className="text-xs text-primary mt-1 hover:underline inline-block"
              >
                Ver misión →
              </a>
            </>
          ) : (
            <>
              <p className="text-sm text-foreground mt-1 truncate">
                {payload.task_title}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Empieza en {payload.minutes_left} minutos
              </p>
            </>
          )}

          {!isMissionReminder && !isNightlyReview && !isPatternDetected && !isRoutine && payload.task_progress !== undefined && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Progreso</span>
                <span>{payload.task_progress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all"
                  style={{ width: `${payload.task_progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Sprint 2.1: Show next task */}
          {!isMissionReminder && !isNightlyReview && payload.context?.next_task && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <span className="font-medium">Siguiente:</span>
              <span className="truncate">{payload.context.next_task.title}</span>
              <span className="text-muted-foreground">a las {formatNextTaskTime(payload.context.next_task)}</span>
            </p>
          )}

          {!isMissionReminder && !isNightlyReview && payload.task_domain && (
            <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
              {payload.task_domain}
            </span>
          )}
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground p-1 flex-shrink-0"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
