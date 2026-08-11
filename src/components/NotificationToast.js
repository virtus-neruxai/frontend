import React, { useEffect, useState } from 'react';
import { X, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useNotificationContext } from '../contexts/NotificationContext';
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
import { getPatternNotificationTitle } from '../hooks/useWebSocket';

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
  const isLearnedResponseReview = notification.type === 'LEARNED_RESPONSE_REVIEW';
  const isMentorBehavior = notification.type === 'MENTOR_BEHAVIOR';
  const isPatternDetected = notification.type === 'PATTERN_DETECTED';
  const isRoutine = !isMissionReminder && !isNightlyReview && !isLearnedResponseReview && !isMentorBehavior && !isPatternDetected && payload?.task_kind === 'routine';
  const nightlyReviewHref = buildNightlyReviewHref(payload);
  const nightlyReviewProposalStatus = getNightlyReviewProposalStatus(payload);
  const nightlyReviewProposalStatusLabel = getNightlyReviewProposalStatusLabel(nightlyReviewProposalStatus);
  const mentorBehaviorHref = buildMentorBehaviorHref(payload);
  const mentorBehaviorProposals = getMentorBehaviorProposals(payload);

  const handleNightlyReviewOpen = async (event) => {
    event.preventDefault();
    storeNightlyReviewPayload(payload);
    await onDismiss();
    window.location.href = nightlyReviewHref;
  };

  const handleMentorBehaviorOpen = async (event) => {
    event.preventDefault();
    storeMentorBehaviorPayload(payload);
    await onDismiss();
    window.location.href = mentorBehaviorHref;
  };

  const handleLearnedResponseReviewOpen = async (event) => {
    event.preventDefault();
    await onDismiss();
    window.location.href = '/dashboard';
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
              : isLearnedResponseReview
              ? '🌱 Conducta en práctica'
              : isMentorBehavior
              ? `🧭 ${getMentorBehaviorTitle(payload)}`
              : isPatternDetected
              ? getPatternNotificationTitle(payload)
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
          ) : isMentorBehavior ? (
            <>
              <p className="text-sm text-foreground mt-1 whitespace-pre-wrap line-clamp-4">
                {getMentorBehaviorBody(payload)}
              </p>
              <a
                href={mentorBehaviorHref}
                onClick={handleMentorBehaviorOpen}
                className="text-xs text-primary mt-1 hover:underline inline-block"
              >
                {mentorBehaviorProposals.length === 0 ? 'Ver en Carácter →' : 'Ver la misión propuesta →'}
              </a>
            </>
          ) : isLearnedResponseReview ? (
            <>
              {(payload.learned_response_reviews || []).map((review) => (
                <div key={review.response_key} className="mt-1">
                  <p className="text-sm text-foreground line-clamp-2">{review.alternative_response}</p>
                  <p className="text-xs text-muted-foreground">{review.question}</p>
                </div>
              ))}
              <a
                href="/dashboard"
                onClick={handleLearnedResponseReviewOpen}
                className="text-xs text-primary mt-1 hover:underline inline-block"
              >
                Ver mis conductas →
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

          {/* Sprint 2.1: Show next task */}
          {!isMissionReminder && !isNightlyReview && !isLearnedResponseReview && !isMentorBehavior && payload.context?.next_task && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <span className="font-medium">Siguiente:</span>
              <span className="truncate">{payload.context.next_task.title}</span>
              <span className="text-muted-foreground">a las {formatNextTaskTime(payload.context.next_task)}</span>
            </p>
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
