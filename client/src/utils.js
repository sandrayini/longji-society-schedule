const palette = ['#F0937E', '#E3B04B', '#7BAE7F', '#EFA8B8', '#8FAECC', '#9C8570'];

export function colorOf(id) {
  let hash = 0;
  for (const c of String(id)) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}

export function initial(name) {
  if (!name) return '?';
  // 取第一个中文字符或首字母
  const first = name.trim().charAt(0);
  return first;
}

export function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const Y = d.getFullYear();
  const M = d.getMonth() + 1;
  const D = d.getDate();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${Y}年${M}月${D}日 ${h}:${m}`;
}

export function statusText(a) {
  if (a.ended) return '已结束';
  if (isClosed(a)) return '已截止';
  return '征集中';
}
export function statusClass(a) {
  if (a.ended) return 'status-ended';
  if (isClosed(a)) return 'status-closed';
  return 'status-open';
}
function isClosed(a) {
  if (a.closed) return true;
  if (a.deadline && new Date() > new Date(a.deadline)) return true;
  return false;
}

export function mySubmitStatus(activity, submissions, myUserId) {
  if (!myUserId || !Array.isArray(submissions)) return false;
  const s = submissions.find(x => x.userId === myUserId || x.user_id === myUserId);
  if (!s) return false;
  const d = s.data || {};
  if (activity.type === 'fixed') {
    return typeof d.attending === 'boolean';
  }
  if (activity.type === 'vote') {
    return Array.isArray(d.selected) && d.selected.length > 0;
  }
  const hasFree = Array.isArray(d.freeIntervals) && d.freeIntervals.length > 0;
  const hasBusy = Array.isArray(d.busyIntervals) && d.busyIntervals.length > 0;
  return hasFree || hasBusy;
}

export function formatActivityTime(a) {
  if (a.type === 'tentative') {
    return formatInterval('统计区间', a.rangeStart, a.rangeEnd);
  }
  return formatInterval('活动时间', a.fixedStart, a.fixedEnd);
}

function formatInterval(label, startIso, endIso) {
  if (!startIso || !endIso) return '';
  const start = parseShanghaiParts(startIso);
  const end = parseShanghaiParts(endIso);
  if (!start || !end) return '';
  const sameDay = start.Y === end.Y && start.M === end.M && start.D === end.D;
  const startStr = `${start.Y}年${start.M}月${start.D}日 ${start.h}:${start.m}`;
  if (sameDay) {
    return `${label}：${startStr} 至 ${end.h}:${end.m}`;
  }
  return `${label}：${startStr} 至 ${end.Y}年${end.M}月${end.D}日 ${end.h}:${end.m}`;
}

function parseShanghaiParts(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const fmt = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false
  });
  const parts = fmt.formatToParts(d);
  const get = type => parts.find(p => p.type === type)?.value;
  return {
    Y: get('year'),
    M: get('month'),
    D: get('day'),
    h: get('hour'),
    m: get('minute')
  };
}

export function typeLabel(a) {
  if (a.type === 'tentative') return '时间待定';
  if (a.type === 'fixed') return '时间已定';
  if (a.type === 'vote') return '投票';
  return a.type;
}
export function typeColor(a) {
  if (a.type === 'tentative') return '#8FAECC';
  if (a.type === 'fixed') return '#7BAE7F';
  if (a.type === 'vote') return '#F4A6C3';
  return '#9C8570';
}

export function pad(n) { return String(n).padStart(2, '0'); }

export function inputDatetimeLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toISO(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export function nowLocalInput() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 把 ISO 或 'YYYY-MM-DDTHH:mm' 解析为 Asia/Shanghai 的毫秒时间戳
// 历史数据可能混用两种格式，统一按上海时区解释，避免偏移 8 小时
export function parseShanghaiMs(iso) {
  if (!iso) return null;
  const str = String(iso);
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

// 返回 Asia/Shanghai 下格式化字符串
export function formatShanghai(iso, { showDate = true, showTime = true } = {}) {
  const d = new Date(parseShanghaiMs(iso) || iso);
  if (isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(d);
  const get = type => parts.find(p => p.type === type)?.value;
  if (showDate && showTime) return `${get('year')}年${get('month')}月${get('day')}日 ${get('hour')}:${get('minute')}`;
  if (showDate) return `${get('year')}年${get('month')}月${get('day')}日`;
  return `${get('hour')}:${get('minute')}`;
}

export function shanghaiDateKey(iso) {
  const d = new Date(parseShanghaiMs(iso) || iso);
  if (isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(d);
  const get = type => parts.find(p => p.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function shanghaiStartOfDay(iso) {
  const ms = parseShanghaiMs(iso);
  if (ms == null) return null;
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function shanghaiAddMs(ms, add) {
  return ms + add;
}

export function shanghaiEndOfDay(iso) {
  const ms = parseShanghaiMs(iso);
  if (ms == null) return null;
  const d = new Date(ms);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}
