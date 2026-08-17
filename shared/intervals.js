// 统一按 Asia/Shanghai 时区解析时间字符串，数字毫秒直接透传
function parseTime(v) {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string' || !v) return null;
  // 已是数字字符串也直接转
  if (/^-?\d+$/.test(v.trim())) return Number(v.trim());
  const str = String(v);
  const d = new Date(str);
  if (isNaN(d.getTime())) return null;
  // 带 Z 或显式时区偏移：已是绝对时刻，直接取 UTC 毫秒
  if (/Z$|\.\d+Z?$/.test(str) || /[+-]\d{2}:\d{2}$/.test(str)) {
    return d.getTime();
  }
  // 无后缀的 YYYY-MM-DDTHH:mm 视为 Asia/Shanghai 的本地时间
  const [date, time] = str.split('T');
  if (!date || !time) return null;
  const [y, mo, da] = date.split('-').map(Number);
  const [h, m] = (time || '00:00').split(':').map(Number);
  return Date.UTC(y, mo - 1, da, h - 8, m, 0);
}

function intervalsOverlap(a, b) {
  return a.start < b.end && b.start < a.end;
}

function normalizeIntervals(intervals, options = {}) {
  if (!intervals || intervals.length === 0) return [];
  const { min, max, clip = false } = options;
  let list = intervals
    .map(iv => {
      const s = parseTime(iv.start);
      const e = parseTime(iv.end);
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
  const rangeMs = { start: parseTime(range.start), end: parseTime(range.end) };
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
  const rangeMs = { start: parseTime(range.start), end: parseTime(range.end) };
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

const MS_MIN = 60 * 1000;
const MS_HOUR = 60 * MS_MIN;
const MS_DAY = 24 * MS_HOUR;

function floorToSlot(ms, slotMs) {
  return Math.floor(ms / slotMs) * slotMs;
}

function slotRange(range, slotMs) {
  const start = floorToSlot(range.start, slotMs);
  const end = floorToSlot(range.end, slotMs);
  const slots = [];
  for (let t = start; t < end; t += slotMs) slots.push(t);
  return slots;
}

function countAvailablePerSlot(range, members, slotMs) {
  const slots = slotRange(range, slotMs);
  const counts = slots.map(t => ({
    start: t,
    end: t + slotMs,
    count: 0,
    submittedCount: 0
  }));
  for (const m of members) {
    const free = memberFreeIntervals(range, m);
    if (free.length === 0 && (m.free?.length || m.busy?.length)) {
      for (const c of counts) c.submittedCount++;
      continue;
    }
    const hasAny = m.free?.length || m.busy?.length;
    if (hasAny) {
      for (const c of counts) c.submittedCount++;
    }
    for (const iv of free) {
      for (const c of counts) {
        if (c.start < iv.end && iv.start < c.end) c.count++;
      }
    }
  }
  return counts;
}

function mergeAdjacentSameCount(slots) {
  if (slots.length === 0) return [];
  const result = [{ start: slots[0].start, end: slots[0].end, count: slots[0].count, submittedCount: slots[0].submittedCount }];
  for (let i = 1; i < slots.length; i++) {
    const last = result[result.length - 1];
    const cur = slots[i];
    if (cur.count === last.count && cur.start === last.end) {
      last.end = cur.end;
      last.submittedCount = Math.max(last.submittedCount, cur.submittedCount);
    } else {
      result.push({ start: cur.start, end: cur.end, count: cur.count, submittedCount: cur.submittedCount });
    }
  }
  return result;
}

function topAvailableSlots(range, members, topN = 5) {
  const rangeDays = (range.end - range.start) / MS_DAY;
  const slotMs = rangeDays > 2 ? MS_HOUR : 30 * MS_MIN;
  const counts = countAvailablePerSlot(range, members, slotMs);
  const merged = mergeAdjacentSameCount(counts);
  return merged
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count || a.start - b.start)
    .slice(0, topN)
    .map(c => ({ ...c, slotMs }));
}

module.exports = {
  parseTime,
  normalizeIntervals,
  intervalsOverlap,
  intersectIntervals,
  subtractIntervals,
  memberFreeIntervals,
  computeCommonFree,
  formatIntervals,
  countAvailablePerSlot,
  mergeAdjacentSameCount,
  topAvailableSlots,
  MS_HOUR,
  MS_MIN,
  MS_DAY
};
