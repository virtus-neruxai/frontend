const STORAGE_KEY = 'nightly_review_notification_payload';
const PROPOSAL_STATUS_PREFIX = 'nightly_review_proposal_status';

function getReviewDate(payloadOrDate = {}) {
  if (typeof payloadOrDate === 'string') return payloadOrDate;
  return payloadOrDate.review_date || payloadOrDate.context?.review_date || null;
}

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
  const status = payload.proposal_status || payload.context?.proposal_status;
  if (status) return status;

  const reviewDate = getReviewDate(payload);
  if (!reviewDate) return null;

  try {
    return localStorage.getItem(`${PROPOSAL_STATUS_PREFIX}:${reviewDate}`);
  } catch {
    return null;
  }
}

export function markNightlyReviewProposalConsumed(payloadOrDate, status = 'confirmed') {
  const reviewDate = getReviewDate(payloadOrDate);
  if (!reviewDate) return;

  try {
    localStorage.setItem(`${PROPOSAL_STATUS_PREFIX}:${reviewDate}`, status);
  } catch {
    // Best effort: backend status is still attempted by the caller.
  }
}

export function getNightlyReviewProposalStatusLabel(status) {
  if (status === 'confirmed') return 'Esta misión ya ha sido confirmada';
  if (status === 'rejected') return 'Esta propuesta ya fue rechazada';
  return null;
}
