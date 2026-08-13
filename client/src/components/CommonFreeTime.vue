<template>
  <div>
    <div v-if="common.length" class="common-list">
      <div v-for="(iv, idx) in common" :key="idx" class="common-item">
        <span class="dot" style="background:#7BAE7F"></span>
        {{ formatTime(iv.start) }} 至 {{ formatTime(iv.end) }}
      </div>
    </div>
    <div v-else class="empty">
      <p>暂无全员共同空闲时间</p>
      <p v-if="fallback.length" class="fallback-title">放宽条件参考：</p>
      <div v-if="fallback.length" class="fallback-list">
        <div v-for="(f, idx) in fallback" :key="idx" class="fallback-item">
          <span class="dot" style="background:#E3B04B"></span>
          {{ formatTime(f.start) }} 至 {{ formatTime(f.end) }}（{{ f.availableCount }} 人有空）
        </div>
      </div>
    </div>
    <div v-if="warnings.length" class="warnings">
      <div v-for="w in warnings" :key="w" class="warning">⚠️ {{ w }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { formatTime } from '../utils.js';
import { computeCommonFree } from '../shared/intervals.js';

const props = defineProps({ activity: Object, submissions: Array });

const result = computed(() => {
  if (!props.activity || !props.submissions) return { common: [], fallback: [], warnings: [] };
  const range = { start: toLocalISO(props.activity.rangeStart), end: toLocalISO(props.activity.rangeEnd) };
  const memberIntervals = props.submissions.map(s => {
    let data = {};
    try {
      data = typeof s.data === 'string' ? JSON.parse(s.data || '{}') : (s.data || {});
    } catch (err) {
      console.warn('解析提交数据失败', s.data, err);
    }
    const free = (data.freeIntervals || []).map(iv => ({ start: toLocalISO(iv.start), end: toLocalISO(iv.end) }));
    const busy = (data.busyIntervals || []).map(iv => ({ start: toLocalISO(iv.start), end: toLocalISO(iv.end) }));
    return { userId: s.userId, name: s.name, free, busy };
  });
  return computeCommonFree(range, memberIntervals);
});

function toLocalISO(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  // keep local time as ISO-like string without timezone offset
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const common = computed(() => result.value.common);
const fallback = computed(() => result.value.fallback);
const warnings = computed(() => result.value.warnings);
</script>

<style scoped>
.common-list, .fallback-list { display: flex; flex-direction: column; gap: 8px; }
.common-item, .fallback-item { display: flex; align-items: center; gap: 8px; background: #F0F9F2; padding: 10px 12px; border-radius: 14px; font-size: 14px; }
.fallback-item { background: #FDF6E8; }
.dot { width: 8px; height: 8px; border-radius: 50%; }
.empty { color: var(--text-light); text-align: center; padding: 10px 0; }
.fallback-title { font-size: 13px; color: #9C8570; margin: 14px 0 8px; text-align: left; }
.warnings { margin-top: 12px; }
.warning { font-size: 12px; color: #c45b4a; background: #FFF0EE; padding: 8px 12px; border-radius: 12px; margin-bottom: 6px; }
</style>
