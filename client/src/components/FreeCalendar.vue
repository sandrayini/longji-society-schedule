<template>
  <div>
    <div v-if="!columns.length" class="empty">暂无统计时间段</div>
    <div v-else class="calendar-wrap">
      <div class="calendar" :style="gridStyle">
        <div class="cell header-corner"></div>
        <div v-for="(col, idx) in columns" :key="idx" class="cell col-header">
          <div class="day-label" v-if="col.showDay">{{ col.dayText }}</div>
          <div class="time-label">{{ col.timeText }}</div>
        </div>

        <template v-for="row in rows" :key="row.userId">
          <div class="cell row-header">
            <span class="badge" :style="{background: colorOf(row.userId)}">{{ initial(row.name) }}</span>
            <span class="row-name">{{ row.name }}</span>
          </div>
          <div v-for="(col, idx) in columns" :key="idx" class="cell slot-cell" :class="statusClass(row, col)" :title="cellTitle(row, col)"></div>
        </template>
      </div>
    </div>

    <div class="legend">
      <span class="legend-item"><span class="dot" style="background:#A8D5BA"></span>有空</span>
      <span class="legend-item"><span class="dot" style="background:#F4B2B2"></span>没空</span>
      <span class="legend-item"><span class="dot" style="background:#E0E0E0"></span>未提交</span>
    </div>

    <div class="ranking">
      <div class="ranking-title">最多人有空时段排行</div>
      <div v-if="!ranking.length" class="empty-ranking">暂无有数据的时段</div>
      <div v-for="(item, idx) in ranking" :key="idx" class="rank-item" :class="{ top: idx === 0 }">
        <span class="rank-num">{{ idx + 1 }}</span>
        <span class="rank-range">{{ formatShanghai(item.start) }} - {{ formatShanghai(item.end, { showDate: false }) }}</span>
        <span class="rank-count">{{ item.count }}人有空</span>
        <span class="rank-submitted">（共{{ item.submittedCount }}人已提交）</span>
      </div>
      <div v-if="notSubmittedCount" class="not-submitted-line">未提交：{{ notSubmittedCount }}人</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { colorOf, initial, parseShanghaiMs, formatShanghai, shanghaiDateKey } from '../utils.js';
import { memberFreeIntervals, topAvailableSlots, MS_HOUR, MS_MIN } from '../shared/intervals.js';

const props = defineProps({ activity: Object, submissions: Array });
const SLOT_MIN = 30;
const SLOT_MS = SLOT_MIN * MS_MIN;

function normalizeMember(s) {
  let data = {};
  try {
    data = typeof s.data === 'string' ? JSON.parse(s.data || '{}') : (s.data || {});
  } catch (err) {
    console.warn('解析提交数据失败', s.data, err);
  }
  const free = (data.freeIntervals || []).map(iv => ({ start: parseShanghaiMs(iv.start), end: parseShanghaiMs(iv.end) }));
  const busy = (data.busyIntervals || []).map(iv => ({ start: parseShanghaiMs(iv.start), end: parseShanghaiMs(iv.end) }));
  return { userId: s.userId, name: s.name, free, busy, submitted: true };
}

const members = computed(() => {
  const submittedIds = new Set((props.submissions || []).map(s => s.userId));
  const submitted = (props.submissions || []).map(normalizeMember);
  const all = (props.activity.allMembers || []).filter(m => m.role === 'member');
  const notSubmitted = all.filter(m => !submittedIds.has(m.id)).map(m => ({ userId: m.id, name: m.name, free: [], busy: [], submitted: false }));
  return [...submitted, ...notSubmitted];
});

const range = computed(() => {
  const start = parseShanghaiMs(props.activity.rangeStart);
  const end = parseShanghaiMs(props.activity.rangeEnd);
  return { start, end };
});

const slotMs = computed(() => {
  if (!range.value.start || !range.value.end) return SLOT_MS;
  const days = (range.value.end - range.value.start) / (24 * 60 * 60 * 1000);
  return days > 2 ? MS_HOUR : SLOT_MS;
});

const columns = computed(() => {
  if (!range.value.start || !range.value.end) return [];
  const cols = [];
  let prevDay = '';
  for (let t = range.value.start; t < range.value.end; t += slotMs.value) {
    const dayKey = shanghaiDateKey(t);
    const showDay = dayKey !== prevDay;
    prevDay = dayKey;
    cols.push({
      start: t,
      end: Math.min(t + slotMs.value, range.value.end),
      dayText: formatShanghai(t, { showTime: false }),
      timeText: formatShanghai(t, { showDate: false }),
      showDay
    });
  }
  return cols;
});

const rows = computed(() => members.value.map(m => {
  const free = m.submitted ? memberFreeIntervals(range.value, m) : [];
  return { ...m, free };
}));

function statusClass(row, col) {
  if (!row.submitted) return 'status-unknown';
  const isFree = row.free.some(iv => iv.start < col.end && col.start < iv.end);
  return isFree ? 'status-free' : 'status-busy';
}

function cellTitle(row, col) {
  const status = statusClass(row, col);
  const label = status === 'status-free' ? '有空' : status === 'status-busy' ? '没空' : '未提交';
  return `${row.name} ${formatShanghai(col.start)}-${formatShanghai(col.end, { showDate: false })} ${label}`;
}

const gridStyle = computed(() => {
  const n = columns.value.length + 1;
  return {
    gridTemplateColumns: `90px repeat(${columns.value.length}, minmax(54px, 1fr))`,
    minWidth: `${90 + columns.value.length * 54}px`
  };
});

const ranking = computed(() => {
  if (!range.value.start || !range.value.end || members.value.length === 0) return [];
  return topAvailableSlots(range.value, members.value, 5);
});

const notSubmittedCount = computed(() => members.value.filter(m => !m.submitted).length);
</script>

<style scoped>
.calendar-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; border: 1px solid #F0E6DA; border-radius: 14px; background: #FDFBF7; }
.calendar { display: grid; gap: 4px; padding: 10px; }
.cell { display: flex; align-items: center; justify-content: center; font-size: 12px; border-radius: 8px; min-height: 34px; }
.header-corner { background: transparent; }
.col-header { flex-direction: column; background: #F5EFE6; color: #9C8570; padding: 4px 2px; }
.day-label { font-size: 11px; white-space: nowrap; }
.time-label { font-size: 12px; font-weight: 500; }
.row-header { justify-content: flex-start; gap: 8px; background: transparent; position: sticky; left: 0; }
.badge { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 12px; flex-shrink: 0; }
.row-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 13px; }
.slot-cell { border-radius: 8px; }
.status-free { background: #A8D5BA; }
.status-busy { background: #F4B2B2; }
.status-unknown { background: #E0E0E0; }
.legend { display: flex; gap: 16px; margin-top: 12px; font-size: 12px; color: var(--text-light); justify-content: center; }
.legend-item { display: flex; align-items: center; gap: 6px; }
.dot { width: 10px; height: 10px; border-radius: 50%; }
.ranking { margin-top: 18px; }
.ranking-title { font-size: 14px; font-weight: 600; margin-bottom: 10px; color: var(--text); }
.rank-item { display: flex; align-items: center; gap: 8px; background: #F0F9F2; padding: 10px 12px; border-radius: 12px; margin-bottom: 8px; font-size: 13px; }
.rank-item.top { background: #E8F5E9; border: 1px solid #A8D5BA; }
.rank-num { width: 20px; height: 20px; border-radius: 50%; background: #7BAE7F; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 11px; }
.rank-range { flex: 1; }
.rank-count { font-weight: 600; color: #7BAE7F; }
.rank-submitted { font-size: 12px; color: #9C8570; }
.empty { color: var(--text-light); text-align: center; padding: 10px 0; font-size: 13px; }
.empty-ranking { color: var(--text-light); font-size: 13px; padding: 8px 0; }
.not-submitted-line { font-size: 13px; color: #9C8570; margin-top: 8px; }
</style>
