import { isWithinDateRange } from '../presentation/components/calendar/ActiveItemsPanel';

const item = (overrides = {}) => ({
  id: 'i1',
  title: 'Item',
  status: 'todo',
  date_start: '2026-08-20T09:00:00',
  date_end: '2026-08-20T10:00:00',
  ...overrides,
});

describe('isWithinDateRange', () => {
  test('an empty window keeps every item, dateless ones included', () => {
    expect(isWithinDateRange(item(), '', '')).toBe(true);
    expect(isWithinDateRange(item({ date_start: null, date_end: null }), '', '')).toBe(true);
  });

  test('matches on overlap, not containment', () => {
    const spanning = item({ date_start: '2026-08-18T09:00:00', date_end: '2026-08-25T10:00:00' });
    expect(isWithinDateRange(spanning, '2026-08-20', '2026-08-21')).toBe(true);
  });

  test('window edges are whole days', () => {
    // 09:00 on the first day and 23:30 on the last day are both inside.
    expect(isWithinDateRange(item(), '2026-08-20', '2026-08-20')).toBe(true);
    const lateNight = item({ date_start: '2026-08-21T23:30:00', date_end: '2026-08-21T23:45:00' });
    expect(isWithinDateRange(lateNight, '2026-08-20', '2026-08-21')).toBe(true);
  });

  test('excludes items outside the window on either side', () => {
    expect(isWithinDateRange(item(), '2026-08-21', '2026-08-30')).toBe(false);
    expect(isWithinDateRange(item(), '2026-08-01', '2026-08-19')).toBe(false);
  });

  test('open-ended windows only constrain the side that is set', () => {
    expect(isWithinDateRange(item(), '2026-08-19', '')).toBe(true);
    expect(isWithinDateRange(item(), '2026-08-21', '')).toBe(false);
    expect(isWithinDateRange(item(), '', '2026-08-20')).toBe(true);
    expect(isWithinDateRange(item(), '', '2026-08-19')).toBe(false);
  });

  test('a routine runs until its `until`, not until its first occurrence ends', () => {
    const endless = item({
      task_kind: 'routine',
      recurrence_rule: { type: 'daily', interval: 1 },
    });
    expect(isWithinDateRange(endless, '2026-12-01', '2026-12-31')).toBe(true);

    const bounded = item({
      task_kind: 'routine',
      recurrence_rule: { type: 'daily', interval: 1, until: '2026-09-30T00:00:00' },
    });
    expect(isWithinDateRange(bounded, '2026-09-01', '2026-09-15')).toBe(true);
    expect(isWithinDateRange(bounded, '2026-10-01', '2026-10-31')).toBe(false);
  });

  test('an item with no date never matches a window', () => {
    const dateless = item({ date_start: null, date_end: null });
    expect(isWithinDateRange(dateless, '2026-08-01', '2026-08-31')).toBe(false);
  });

  test('a one-sided item uses the date it has', () => {
    expect(isWithinDateRange(item({ date_start: null }), '2026-08-20', '2026-08-20')).toBe(true);
    expect(isWithinDateRange(item({ date_end: null }), '2026-08-20', '2026-08-20')).toBe(true);
  });
});
