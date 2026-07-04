import { describe, it, expect } from 'vitest';
import { isHourInDnd, snapDateOutOfDnd, snapLocalStringOutOfDnd, normalizeDnd } from '../lib/dnd';

const NIGHT = { enabled: true, start_hour: 22, end_hour: 8 }; // wraps midnight
const MIDDAY = { enabled: true, start_hour: 13, end_hour: 16 }; // non-wrapping

describe('normalizeDnd', () => {
  it('returns null when disabled', () => {
    expect(normalizeDnd({ enabled: false, start_hour: 22, end_hour: 8 })).toBeNull();
  });
  it('returns null when start == end (empty window)', () => {
    expect(normalizeDnd({ enabled: true, start_hour: 8, end_hour: 8 })).toBeNull();
  });
});

describe('isHourInDnd (wrapping 22→8)', () => {
  it.each([22, 23, 0, 3, 7])('%i is inside', (h) => expect(isHourInDnd(h, NIGHT)).toBe(true));
  it.each([8, 12, 17, 21])('%i is outside', (h) => expect(isHourInDnd(h, NIGHT)).toBe(false));
});

describe('isHourInDnd (non-wrapping 13→16)', () => {
  it.each([13, 14, 15])('%i is inside', (h) => expect(isHourInDnd(h, MIDDAY)).toBe(true));
  it.each([12, 16, 17])('%i is outside', (h) => expect(isHourInDnd(h, MIDDAY)).toBe(false));
});

describe('snapDateOutOfDnd', () => {
  it('early-morning DND (03:00) snaps to end_hour same day', () => {
    const out = snapDateOutOfDnd(new Date(2026, 6, 4, 3, 0), NIGHT);
    expect([out.getFullYear(), out.getMonth(), out.getDate(), out.getHours(), out.getMinutes()])
      .toEqual([2026, 6, 4, 8, 0]);
  });
  it('late-night DND (23:00) snaps to end_hour next day', () => {
    const out = snapDateOutOfDnd(new Date(2026, 6, 4, 23, 0), NIGHT);
    expect([out.getMonth(), out.getDate(), out.getHours()]).toEqual([6, 5, 8]);
  });
  it('boundary end_hour (08:00) is allowed, unchanged', () => {
    const d = new Date(2026, 6, 4, 8, 0);
    expect(snapDateOutOfDnd(d, NIGHT)).toBe(d);
  });
  it('a time outside DND is unchanged', () => {
    const d = new Date(2026, 6, 4, 15, 30);
    expect(snapDateOutOfDnd(d, NIGHT)).toBe(d);
  });
  it('does nothing when DND is disabled', () => {
    const d = new Date(2026, 6, 4, 3, 0);
    expect(snapDateOutOfDnd(d, { enabled: false, start_hour: 22, end_hour: 8 })).toBe(d);
  });
  it('non-wrapping window snaps to end_hour same day', () => {
    const out = snapDateOutOfDnd(new Date(2026, 6, 4, 14, 0), MIDDAY);
    expect([out.getDate(), out.getHours()]).toEqual([4, 16]);
  });
});

describe('snapLocalStringOutOfDnd', () => {
  it('snaps a datetime-local string in DND', () => {
    expect(snapLocalStringOutOfDnd('2026-07-04T03:00', NIGHT)).toBe('2026-07-04T08:00');
  });
  it('leaves an allowed string untouched', () => {
    expect(snapLocalStringOutOfDnd('2026-07-04T15:30', NIGHT)).toBe('2026-07-04T15:30');
  });
  it('leaves it untouched when DND disabled', () => {
    expect(snapLocalStringOutOfDnd('2026-07-04T03:00', { enabled: false })).toBe('2026-07-04T03:00');
  });
});
