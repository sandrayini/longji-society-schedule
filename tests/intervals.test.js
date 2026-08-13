const { normalizeIntervals, intersectIntervals, subtractIntervals, memberFreeIntervals, computeCommonFree } = require('../shared/intervals');

function range(start, end) {
  return { start: new Date(start).toISOString(), end: new Date(end).toISOString() };
}

describe('normalizeIntervals', () => {
  test('merges overlapping and adjacent intervals', () => {
    const list = [
      { start: '2026-08-20T10:00', end: '2026-08-20T12:00' },
      { start: '2026-08-20T11:00', end: '2026-08-20T13:00' },
      { start: '2026-08-20T13:00', end: '2026-08-20T14:00' }
    ];
    const r = normalizeIntervals(list);
    expect(r).toHaveLength(1);
    expect(r[0].start).toBe(new Date('2026-08-20T10:00').getTime());
    expect(r[0].end).toBe(new Date('2026-08-20T14:00').getTime());
  });

  test('clips to range', () => {
    const list = [{ start: '2026-08-20T08:00', end: '2026-08-20T22:00' }];
    const r = normalizeIntervals(list, { min: new Date('2026-08-20T10:00').getTime(), max: new Date('2026-08-20T14:00').getTime(), clip: true });
    expect(r).toHaveLength(1);
    expect(r[0].start).toBe(new Date('2026-08-20T10:00').getTime());
    expect(r[0].end).toBe(new Date('2026-08-20T14:00').getTime());
  });
});

describe('intersectIntervals', () => {
  test('computes intersection of two lists', () => {
    const a = [{ start: 0, end: 100 }, { start: 200, end: 300 }];
    const b = [{ start: 50, end: 150 }, { start: 250, end: 350 }];
    const r = intersectIntervals(a, b);
    expect(r).toEqual([{ start: 50, end: 100 }, { start: 250, end: 300 }]);
  });

  test('returns empty for non-overlapping', () => {
    const a = [{ start: 0, end: 10 }];
    const b = [{ start: 20, end: 30 }];
    expect(intersectIntervals(a, b)).toHaveLength(0);
  });

  test('handles endpoint touching', () => {
    const a = [{ start: 0, end: 10 }];
    const b = [{ start: 10, end: 20 }];
    expect(intersectIntervals(a, b)).toHaveLength(0);
  });
});

describe('subtractIntervals', () => {
  test('removes middle chunk', () => {
    const total = [{ start: 0, end: 100 }];
    const remove = [{ start: 30, end: 70 }];
    const r = subtractIntervals(total, remove);
    expect(r).toEqual([{ start: 0, end: 30 }, { start: 70, end: 100 }]);
  });

  test('removes overlapping nested', () => {
    const total = [{ start: 0, end: 100 }];
    const remove = [{ start: -20, end: 50 }, { start: 40, end: 120 }];
    const r = subtractIntervals(total, remove);
    expect(r).toHaveLength(0);
  });
});

describe('memberFreeIntervals', () => {
  const fullRange = range('2026-08-20T08:00', '2026-08-20T20:00');

  test('free only', () => {
    const m = { free: [range('2026-08-20T09:00', '2026-08-20T11:00')], busy: [] };
    const r = memberFreeIntervals(fullRange, m);
    expect(r).toHaveLength(1);
    expect(r[0].start).toBe(new Date('2026-08-20T09:00').getTime());
    expect(r[0].end).toBe(new Date('2026-08-20T11:00').getTime());
  });

  test('busy only', () => {
    const m = { free: [], busy: [range('2026-08-20T09:00', '2026-08-20T11:00')] };
    const r = memberFreeIntervals(fullRange, m);
    expect(r).toHaveLength(2);
    expect(r[0]).toEqual({ start: new Date('2026-08-20T08:00').getTime(), end: new Date('2026-08-20T09:00').getTime() });
    expect(r[1]).toEqual({ start: new Date('2026-08-20T11:00').getTime(), end: new Date('2026-08-20T20:00').getTime() });
  });

  test('both free and busy', () => {
    const m = {
      free: [range('2026-08-20T08:00', '2026-08-20T18:00')],
      busy: [range('2026-08-20T12:00', '2026-08-20T14:00')]
    };
    const r = memberFreeIntervals(fullRange, m);
    expect(r).toHaveLength(2);
    expect(r[0]).toEqual({ start: new Date('2026-08-20T08:00').getTime(), end: new Date('2026-08-20T12:00').getTime() });
    expect(r[1]).toEqual({ start: new Date('2026-08-20T14:00').getTime(), end: new Date('2026-08-20T18:00').getTime() });
  });

  test('conflict yields empty with warning', () => {
    const m = {
      free: [range('2026-08-20T09:00', '2026-08-20T11:00')],
      busy: [range('2026-08-20T08:00', '2026-08-20T20:00')]
    };
    const r = memberFreeIntervals(fullRange, m);
    expect(r).toHaveLength(0);
  });
});

describe('computeCommonFree', () => {
  const fullRange = range('2026-08-20T08:00', '2026-08-20T20:00');

  test('finds common free time', () => {
    const members = [
      { userId: '1', name: 'A', free: [range('2026-08-20T09:00', '2026-08-20T15:00')], busy: [] },
      { userId: '2', name: 'B', free: [range('2026-08-20T10:00', '2026-08-20T18:00')], busy: [] }
    ];
    const r = computeCommonFree(fullRange, members);
    expect(r.common).toHaveLength(1);
    expect(r.common[0].start).toBe(new Date('2026-08-20T10:00').getTime());
    expect(r.common[0].end).toBe(new Date('2026-08-20T15:00').getTime());
  });

  test('fallback when no common', () => {
    const members = [
      { userId: '1', name: 'A', free: [range('2026-08-20T09:00', '2026-08-20T11:00')], busy: [] },
      { userId: '2', name: 'B', free: [range('2026-08-20T13:00', '2026-08-20T15:00')], busy: [] },
      { userId: '3', name: 'C', free: [range('2026-08-20T13:00', '2026-08-20T15:00')], busy: [] }
    ];
    const r = computeCommonFree(fullRange, members);
    expect(r.common).toHaveLength(0);
    expect(r.fallback).toHaveLength(1);
    expect(r.fallback[0].availableCount).toBe(2);
    expect(r.fallback[0].start).toBe(new Date('2026-08-20T13:00').getTime());
  });

  test('busy-only members', () => {
    const members = [
      { userId: '1', name: 'A', free: [], busy: [range('2026-08-20T08:00', '2026-08-20T10:00')] },
      { userId: '2', name: 'B', free: [], busy: [range('2026-08-20T14:00', '2026-08-20T20:00')] }
    ];
    const r = computeCommonFree(fullRange, members);
    expect(r.common).toHaveLength(1);
    expect(r.common[0].start).toBe(new Date('2026-08-20T10:00').getTime());
    expect(r.common[0].end).toBe(new Date('2026-08-20T14:00').getTime());
  });
});
