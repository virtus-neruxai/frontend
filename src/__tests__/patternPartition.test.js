import {
  emotionalPolarityBucket,
  frictionTrendBucket,
  partitionEmotionalGroups,
  partitionFrictionGroups,
} from '../lib/patternPartition';

const frictionGroup = (pattern_status, key = pattern_status) => ({ key, meta: { pattern_status } });
const emotionalGroup = (polarity, key = String(polarity)) => ({ key, meta: { polarity } });

describe('frictionTrendBucket', () => {
  test('splits the five backend statuses by direction', () => {
    expect(frictionTrendBucket('active')).toBe('attention');
    expect(frictionTrendBucket('relapse_signal')).toBe('attention');
    expect(frictionTrendBucket('improving')).toBe('improving');
    expect(frictionTrendBucket('resolved_signal')).toBe('improving');
    expect(frictionTrendBucket('unknown')).toBe('untrended');
  });

  test('anything unrecognised is untrended rather than lost between columns', () => {
    // A snapshot written before the trend rule can still carry an old status.
    expect(frictionTrendBucket(null)).toBe('untrended');
    expect(frictionTrendBucket(undefined)).toBe('untrended');
    expect(frictionTrendBucket('some_future_status')).toBe('untrended');
  });
});

describe('partitionFrictionGroups', () => {
  test('routes every group and keeps the incoming order inside each bucket', () => {
    const groups = [
      frictionGroup('active', 'a1'),
      frictionGroup('improving', 'i1'),
      frictionGroup('relapse_signal', 'a2'),
      frictionGroup('unknown', 'u1'),
      frictionGroup('resolved_signal', 'i2'),
    ];

    const buckets = partitionFrictionGroups(groups);

    expect(buckets.attention.map((g) => g.key)).toEqual(['a1', 'a2']);
    expect(buckets.improving.map((g) => g.key)).toEqual(['i1', 'i2']);
    expect(buckets.untrended.map((g) => g.key)).toEqual(['u1']);
  });

  test('a group with no meta still lands somewhere', () => {
    const buckets = partitionFrictionGroups([{ key: 'orphan' }]);
    expect(buckets.untrended.map((g) => g.key)).toEqual(['orphan']);
  });

  test('handles no groups at all', () => {
    expect(partitionFrictionGroups()).toEqual({ attention: [], improving: [], untrended: [] });
  });
});

describe('emotionalPolarityBucket', () => {
  test('maps the three catalog polarities', () => {
    expect(emotionalPolarityBucket('positive')).toBe('positive');
    expect(emotionalPolarityBucket('negative')).toBe('negative');
    expect(emotionalPolarityBucket('neutral')).toBe('neutral');
  });

  test('an unresolved polarity defaults to neutral, never to a judged column', () => {
    expect(emotionalPolarityBucket(null)).toBe('neutral');
    expect(emotionalPolarityBucket(undefined)).toBe('neutral');
    expect(emotionalPolarityBucket('mixta')).toBe('neutral');
  });
});

describe('partitionEmotionalGroups', () => {
  test('routes every group and keeps the incoming order inside each bucket', () => {
    const groups = [
      emotionalGroup('negative', 'n1'),
      emotionalGroup('positive', 'p1'),
      emotionalGroup(null, 'x1'),
      emotionalGroup('negative', 'n2'),
      emotionalGroup('neutral', 'x2'),
    ];

    const buckets = partitionEmotionalGroups(groups);

    expect(buckets.positive.map((g) => g.key)).toEqual(['p1']);
    expect(buckets.negative.map((g) => g.key)).toEqual(['n1', 'n2']);
    expect(buckets.neutral.map((g) => g.key)).toEqual(['x1', 'x2']);
  });

  test('handles no groups at all', () => {
    expect(partitionEmotionalGroups()).toEqual({ positive: [], negative: [], neutral: [] });
  });
});
