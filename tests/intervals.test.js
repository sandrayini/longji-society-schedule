const { normalizeIntervals, intersectIntervals, subtractIntervals, memberFreeIntervals, computeCommonFree, topAvailableSlots } = require('../shared/intervals');

// 所有字符串字面时间代表 Asia/Shanghai 本地时间，对应 UTC 毫秒用 ts 计算
function ts(shanghaiLiteral) {
  const [date, time] = shanghaiLiteral.split('T');
  const [Y, M, D] = date.split('-').map(Number);
  const [h, m] = time.split(':').map(Number);
  return Date.UTC(Y, M - 1, D, h - 8, m, 0);
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
    expect(r[0].start).toBe(ts('2026-08-20T10:00'));
    expect(r[0].end).toBe(ts('2026-08-20T14:00'));
  });

  test('clips to range', () => {
    const list = [{ start: '2026-08-20T08:00', end: '2026-08-20T22:00' }];
    const r = normalizeIntervals(list, { min: ts('2026-08-20T10:00'), max: ts('2026-08-20T14:00'), clip: true });
    expect(r).toHaveLength(1);
    expect(r[0].start).toBe(ts('2026-08-20T10:00'));
    expect(r[0].end).toBe(ts('2026-08-20T14:00'));
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
  const fullRange = { start: '2026-08-20T08:00', end: '2026-08-20T20:00' };

  test('free only', () => {
    const m = { free: [{ start: '2026-08-20T09:00', end: '2026-08-20T11:00' }], busy: [] };
    const r = memberFreeIntervals(fullRange, m);
    expect(r).toHaveLength(1);
    expect(r[0].start).toBe(ts('2026-08-20T09:00'));
    expect(r[0].end).toBe(ts('2026-08-20T11:00'));
  });

  test('busy only', () => {
    const m = { free: [], busy: [{ start: '2026-08-20T09:00', end: '2026-08-20T11:00' }] };
    const r = memberFreeIntervals(fullRange, m);
    expect(r).toHaveLength(2);
    expect(r[0]).toEqual({ start: ts('2026-08-20T08:00'), end: ts('2026-08-20T09:00') });
    expect(r[1]).toEqual({ start: ts('2026-08-20T11:00'), end: ts('2026-08-20T20:00') });
  });

  test('both free and busy', () => {
    const m = {
      free: [{ start: '2026-08-20T08:00', end: '2026-08-20T18:00' }],
      busy: [{ start: '2026-08-20T12:00', end: '2026-08-20T14:00' }]
    };
    const r = memberFreeIntervals(fullRange, m);
    expect(r).toHaveLength(2);
    expect(r[0]).toEqual({ start: ts('2026-08-20T08:00'), end: ts('2026-08-20T12:00') });
    expect(r[1]).toEqual({ start: ts('2026-08-20T14:00'), end: ts('2026-08-20T18:00') });
  });

  test('conflict yields empty with warning', () => {
    const m = {
      free: [{ start: '2026-08-20T09:00', end: '2026-08-20T11:00' }],
      busy: [{ start: '2026-08-20T08:00', end: '2026-08-20T20:00' }]
    };
    const r = memberFreeIntervals(fullRange, m);
    expect(r).toHaveLength(0);
  });
});

describe('computeCommonFree', () => {
  const fullRange = { start: '2026-08-20T08:00', end: '2026-08-20T20:00' };

  test('finds common free time', () => {
    const members = [
      { userId: '1', name: 'A', free: [{ start: '2026-08-20T09:00', end: '2026-08-20T15:00' }], busy: [] },
      { userId: '2', name: 'B', free: [{ start: '2026-08-20T10:00', end: '2026-08-20T18:00' }], busy: [] }
    ];
    const r = computeCommonFree(fullRange, members);
    expect(r.common).toHaveLength(1);
    expect(r.common[0].start).toBe(ts('2026-08-20T10:00'));
    expect(r.common[0].end).toBe(ts('2026-08-20T15:00'));
  });

  test('fallback when no common', () => {
    const members = [
      { userId: '1', name: 'A', free: [{ start: '2026-08-20T09:00', end: '2026-08-20T11:00' }], busy: [] },
      { userId: '2', name: 'B', free: [{ start: '2026-08-20T13:00', end: '2026-08-20T15:00' }], busy: [] },
      { userId: '3', name: 'C', free: [{ start: '2026-08-20T13:00', end: '2026-08-20T15:00' }], busy: [] }
    ];
    const r = computeCommonFree(fullRange, members);
    expect(r.common).toHaveLength(0);
    expect(r.fallback).toHaveLength(1);
    expect(r.fallback[0].availableCount).toBe(2);
    expect(r.fallback[0].start).toBe(ts('2026-08-20T13:00'));
  });

  test('busy-only members', () => {
    const members = [
      { userId: '1', name: 'A', free: [], busy: [{ start: '2026-08-20T08:00', end: '2026-08-20T10:00' }] },
      { userId: '2', name: 'B', free: [], busy: [{ start: '2026-08-20T14:00', end: '2026-08-20T20:00' }] }
    ];
    const r = computeCommonFree(fullRange, members);
    expect(r.common).toHaveLength(1);
    expect(r.common[0].start).toBe(ts('2026-08-20T10:00'));
    expect(r.common[0].end).toBe(ts('2026-08-20T14:00'));
  });

  test('accepts numeric millisecond range directly', () => {
    const members = [
      { userId: '1', name: 'A', free: [{ start: ts('2026-08-22T09:00'), end: ts('2026-08-22T11:00') }], busy: [] },
      { userId: '2', name: 'B', free: [{ start: ts('2026-08-22T10:00'), end: ts('2026-08-22T12:00') }], busy: [] },
      { userId: '3', name: 'C', free: [], busy: [{ start: ts('2026-08-22T09:00'), end: ts('2026-08-22T10:30') }] }
    ];
    const r = topAvailableSlots(
      { start: ts('2026-08-22T09:00'), end: ts('2026-08-22T12:00') },
      members,
      5
    );
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].count).toBe(3);
    expect(r[0].start).toBe(ts('2026-08-22T10:30'));
    expect(r[0].end).toBe(ts('2026-08-22T11:00'));
  });

  test('parses .000Z UTC string without 8-hour shift', () => {
    // 2026-08-22T01:00:00.000Z = Asia/Shanghai 2026-08-22 09:00
    const utcFree = { start: '2026-08-22T01:00:00.000Z', end: '2026-08-22T03:00:00.000Z' };
    const members = [{ userId: '1', name: 'A', free: [utcFree], busy: [] }];
    const r = memberFreeIntervals(
      { start: '2026-08-22T09:00', end: '2026-08-22T12:00' },
      members[0]
    );
    expect(r).toHaveLength(1);
    expect(r[0].start).toBe(ts('2026-08-22T09:00'));
    expect(r[0].end).toBe(ts('2026-08-22T11:00'));
  });
});
