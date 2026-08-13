function parseISO(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.getTime();
}

function intervalsOverlap(a, b) {
  return a.start < b.end && b.start < a.end;
}

function normalizeIntervals(intervals, options = {}) {
  if (!intervals || intervals.length === 0) return [];
  const { min, max, clip = false } = options;
  let list = intervals
    .map(iv => {
      const s = typeof iv.start === 'string' ? parseISO(iv.start) : Number(iv.start);
      const e = typeof iv.end === 'string' ? parseISO(iv.end) : Number(iv.end);
      if (s === null || e === null || s >= e) return null;
      return { start: s, end: e };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  if (clip && min != null && max != null) {
    list = list
      .map(iv => ({
        start: Math.max(iv.start, min),
        end: Math.min(iv.end, max)
      }))
      .filter(iv => iv.start < iv.end);
  }

  const merged = [];
  for (const iv of list) {
    if (merged.length === 0 || iv.start > merged[merged.length - 1].end) {
      merged.push(iv);
    } else {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, iv.end);
    }
  }
  return merged;
}

function intersectIntervals(aList, bList) {
  const result = [];
  let i = 0, j = 0;
  while (i < aList.length && j < bList.length) {
    const a = aList[i], b = bList[j];
    const start = Math.max(a.start, b.start);
    const end = Math.min(a.end, b.end);
    if (start < end) result.push({ start, end });
    if (a.end < b.end) i++; else j++;
  }
  return result;
}

function subtractIntervals(total, toRemove) {
  if (toRemove.length === 0) return [...total];
  let result = [];
  let r = 0;
  for (const iv of total) {
    let cur = { start: iv.start, end: iv.end };
    while (r < toRemove.length && toRemove[r].end <= cur.start) r++;
    while (r < toRemove.length && toRemove[r].start < cur.end) {
      const sub = toRemove[r];
      if (sub.start > cur.start) result.push({ start: cur.start, end: sub.start });
      cur.start = Math.max(cur.start, sub.end);
      if (cur.start >= cur.end) break;
      if (sub.end <= cur.end) r++;
    }
    if (cur.start < cur.end) result.push(cur);
  }
  return result;
}

function memberFreeIntervals(range, member) {
  const { free = [], busy = [] } = member;
  const rangeMs = { start: parseISO(range.start), end: parseISO(range.end) };
  const freeNorm = normalizeIntervals(free, { min: rangeMs.start, max: rangeMs.end, clip: true });
  const busyNorm = normalizeIntervals(busy, { min: rangeMs.start, max: rangeMs.end, clip: true });

  if (free.length && busy.length) {
    return subtractIntervals(freeNorm, busyNorm);
  }
  if (free.length) return freeNorm;
  if (busy.length) {
    return subtractIntervals([rangeMs], busyNorm);
  }
  return [];
}

function computeCommonFree(range, members) {
  const rangeMs = { start: parseISO(range.start), end: parseISO(range.end) };
  const warnings = [];
  const submitted = [];
  for (const m of members) {
    const free = memberFreeIntervals(range, m);
    if (free.length === 0 && (m.free?.length || m.busy?.length)) {
      warnings.push(`${m.name} 的空闲时间为空，请检查其提交`);
    }
    submitted.push({ userId: m.userId, name: m.name, free });
  }

  if (submitted.length === 0) return { common: [], fallback: [], warnings };

  let common = [{ start: rangeMs.start, end: rangeMs.end }];
  for (const s of submitted) {
    common = intersectIntervals(common, s.free);
    if (common.length === 0) break;
  }

  let fallback = [];
  if (common.length === 0 && submitted.length > 1) {
    let best = null;
    for (let i = 0; i < submitted.length; i++) {
      const subset = submitted.filter((_, idx) => idx !== i);
      let inter = [{ start: rangeMs.start, end: rangeMs.end }];
      for (const s of subset) {
        inter = intersectIntervals(inter, s.free);
        if (inter.length === 0) break;
      }
      const duration = inter.reduce((sum, iv) => sum + iv.end - iv.start, 0);
      if (!best || duration > best.duration) {
        best = { removed: submitted[i].name, removedId: submitted[i].userId, duration, intervals: inter, availableCount: submitted.length - 1 };
      }
    }
    if (best && best.duration > 0) fallback = best.intervals.map(iv => ({ ...iv, availableCount: best.availableCount }));
  }

  return { common, fallback, warnings };
}

function formatIntervals(list) {
  return list.map(iv => ({ start: new Date(iv.start).toISOString(), end: new Date(iv.end).toISOString() }));
}

module.exports = {
  parseISO,
  normalizeIntervals,
  intersectIntervals,
  subtractIntervals,
  memberFreeIntervals,
  computeCommonFree,
  formatIntervals
};
