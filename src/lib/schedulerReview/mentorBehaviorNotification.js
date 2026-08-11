const STORAGE_KEY = 'mentor_behavior_notification_payload';

export function buildMentorBehaviorHref(payload = {}) {
  const params = new URLSearchParams();
  params.set('mentor_behavior', '1');
  if (payload.pattern_date) {
    params.set('pattern_date', payload.pattern_date);
  }
  return `/character?${params.toString()}`;
}

export function storeMentorBehaviorPayload(payload = {}) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Best effort: the notification still navigates to Character.
  }
}

export function consumeMentorBehaviorPayload() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// The title is written by the compositor, so it is never empty in practice —
// but a notice with no text at all must still be openable.
export function getMentorBehaviorTitle(payload = {}) {
  const title = (payload.title || payload.context?.title || '').trim();
  return title || 'Aviso del Mentor';
}

export function getMentorBehaviorBody(payload = {}) {
  return payload.body || payload.context?.body || payload.message || '';
}

// MENTOR_BEHAVIOR has no proposal_status of its own: what measures a notice is
// the `mentor_behavior_id` stamped on the mission it ends in (§8.3), not a flag
// written back onto the notification.
export function getMentorBehaviorProposals(payload = {}) {
  const proposals = payload.proposed_missions || payload.context?.proposed_missions || [];
  return Array.isArray(proposals) ? proposals : [];
}
