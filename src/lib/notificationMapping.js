// Pure notification-shape mapping, with no dependency on React or on
// NotificationContext. useWebSocket.js re-exports these for its existing
// consumers, but NotificationContext.js must import them from here directly
// — useWebSocket.js itself imports useNotificationContext, so importing this
// module from useWebSocket.js instead would form a cycle back into the
// context that is defining it.

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

// A notification the backend already persisted — either because it was
// missed live (the tab was closed when the cron fired) or because history is
// simply catching up on app load. One flat payload shape covers every type,
// since each component already branches on `notification.type` and only
// reads the keys it needs; NightlyReview/MENTOR_BEHAVIOR nest their fields
// under `context` here (unlike the flat WS event), same as §9 documents.
export function buildNotificationFromHistoryItem(item) {
  return {
    id: item.id,
    history_id: item.id,
    type: item.type,
    user_id: item.user_id,
    payload: {
      task_title: item.task_title,
      task_domain: item.task_domain,
      task_progress: item.task_progress,
      minutes_left: item.minutes_left,
      priority: item.priority,
      suggestion_type: item.context?.suggestion_type,
      proposal_family: item.context?.proposal_family,
      message:
        item.context?.summary ||
        item.task_title ||
        item.context?.support_message,
      occurred_at: item.context?.occurred_at,
      review_date: item.context?.review_date,
      summary: item.context?.summary,
      tasks_completed: item.context?.tasks_completed,
      tasks_failed: item.context?.tasks_failed,
      proposed_missions: item.context?.proposed_missions || [],
      proposal_status: item.context?.proposal_status,
      learned_response_reviews: item.context?.learned_response_reviews || [],
      pattern_date: item.context?.pattern_date,
      title: item.context?.title,
      body: item.context?.body,
      focus_type: item.context?.focus_type,
      focus_key: item.context?.focus_key,
      related_item_id: item.context?.related_item_id,
      has_today_context: item.context?.has_today_context,
      context: item.context || {},
    },
    read: item.status === 'read',
    timestamp: item.created_at,
  };
}
