const STORAGE_KEY = 'nightly_review_notification_payload';

export function buildNightlyReviewHref(payload = {}) {
  const params = new URLSearchParams();
  params.set('nightly_review', '1');
  if (payload.review_date) {
    params.set('review_date', payload.review_date);
  }
  return `/character?${params.toString()}`;
}

export function storeNightlyReviewPayload(payload = {}) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Best effort: the notification still navigates to Character.
  }
}

export function consumeNightlyReviewPayload() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getNightlyReviewProposalStatus(payload = {}) {
  // Backend truth only, scoped to THIS notification. A previous localStorage
  // fallback keyed by review_date leaked a "confirmed" state onto every
  // nightly-review notification for the same day — including drafts the user
  // never acted on (e.g. a manual review confirmed before the scheduled
  // notification even existed, so its backend update matched nothing).
  return payload.proposal_status || payload.context?.proposal_status || null;
}

export function getNightlyReviewProposalStatusLabel(status) {
  if (status === 'confirmed') return 'Esta misión ya ha sido confirmada';
  if (status === 'rejected') return 'Esta propuesta ya fue rechazada';
  return null;
}
