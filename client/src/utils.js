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
  if (a.deadline && new Date() > new Date(a.deadline)) return '已截止';
  if (a.closed) return '已截止';
  return '征集中';
}

export function statusClass(a) {
  if (a.ended) return 'status-ended';
  if (a.deadline && new Date() > new Date(a.deadline)) return 'status-closed';
  if (a.closed) return 'status-closed';
  return 'status-open';
}

export function mySubmitStatus(activity, submissions, myUserId) {
  if (!myUserId || !Array.isArray(submissions)) return false;
  const s = submissions.find(x => x.userId === myUserId || x.user_id === myUserId);
  if (!s) return false;
  const d = s.data || {};
  if (activity.type === 'fixed') {
    return typeof d.attending === 'boolean';
  }
  const hasFree = Array.isArray(d.freeIntervals) && d.freeIntervals.length > 0;
  const hasBusy = Array.isArray(d.busyIntervals) && d.busyIntervals.length > 0;
  return hasFree || hasBusy;
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
