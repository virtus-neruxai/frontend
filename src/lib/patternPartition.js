/**
 * Splits the Dashboard pattern groups into the columns each panel renders.
 *
 * Both panels group by a different axis, because the two taxonomies differ:
 * a friction is a problem by definition, so it splits by where it is heading;
 * an emotion has polarity, so it splits by that.
 *
 * Neither partition ever drops a group. Anything unrecognised — a null status,
 * a value written by a snapshot from before the trend rule landed, a polarity
 * the catalog doesn't know — lands in the de-emphasised third bucket rather
 * than falling between the two columns.
 *
 * Groups arrive already sorted by buildPatternGroups (count desc, then
 * recency); pushing in iteration order preserves that inside each bucket.
 */

const ATTENTION_STATUSES = new Set(['active', 'relapse_signal']);
const IMPROVING_STATUSES = new Set(['improving', 'resolved_signal']);

export function frictionTrendBucket(status) {
  if (ATTENTION_STATUSES.has(status)) return 'attention';
  if (IMPROVING_STATUSES.has(status)) return 'improving';
  return 'untrended';
}

export function partitionFrictionGroups(groups = []) {
  const buckets = { attention: [], improving: [], untrended: [] };
  groups.forEach((group) => {
    buckets[frictionTrendBucket(group?.meta?.pattern_status)].push(group);
  });
  return buckets;
}

export function emotionalPolarityBucket(polarity) {
  if (polarity === 'positive') return 'positive';
  if (polarity === 'negative') return 'negative';
  return 'neutral';
}

export function partitionEmotionalGroups(groups = []) {
  const buckets = { positive: [], negative: [], neutral: [] };
  groups.forEach((group) => {
    buckets[emotionalPolarityBucket(group?.meta?.polarity)].push(group);
  });
  return buckets;
}
