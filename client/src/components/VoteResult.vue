<template>
  <div>
    <div class="summary">
      已投票 {{ stats.voted }} / {{ stats.total }} 人
      <span v-if="activity.allowMultiple" class="calc-hint">（多选：百分比按已投票人数计算）</span>
    </div>

    <div v-for="opt in stats.options" :key="opt.id" class="result-row">
      <div class="result-header">
        <span class="option-text">{{ opt.text }}</span>
        <span class="option-count">{{ opt.count }} 票</span>
        <span class="option-percent">{{ percent(opt.count) }}</span>
      </div>
      <div class="bar-bg">
        <div class="bar-fill" :style="{width: barWidth(opt.count), background: colorOf(opt.id)}"></div>
      </div>
      <div v-if="!activity.anonymous && opt.voters.length" class="voters">
        <span class="voter-label">投此选项：</span>
        <span v-for="v in opt.voters" :key="v.userId" class="voter-name">{{ v.name }}</span>
      </div>
    </div>

    <div v-if="stats.notVoted.length" class="pending-list">
      <span class="pending-label">未投票人员：</span>
      <span v-for="m in stats.notVoted" :key="m.id" class="pending-name">{{ m.name }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { colorOf } from '../utils.js';

const props = defineProps({ activity: Object });
const stats = computed(() => props.activity.voteStats || { total: 0, voted: 0, notVoted: [], options: [] });

function percent(count) {
  const base = stats.value.voted || 1;
  const p = (count / base) * 100;
  return Number.isInteger(p) ? `${p}%` : `${p.toFixed(1)}%`;
}
function barWidth(count) {
  const base = stats.value.voted || 1;
  return `${Math.min(100, (count / base) * 100)}%`;
}
</script>

<style scoped>
.summary { font-size: 14px; margin-bottom: 14px; color: var(--text); font-weight: 500; }
.calc-hint { font-size: 12px; color: var(--text-light); font-weight: normal; margin-left: 6px; }
.result-row { margin-bottom: 16px; }
.result-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px; font-size: 14px; }
.option-text { flex: 1; }
.option-count { font-size: 12px; color: var(--text-light); }
.option-percent { font-size: 13px; font-weight: 700; color: var(--text); min-width: 42px; text-align: right; }
.bar-bg { height: 10px; background: #F5EFE6; border-radius: 999px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 999px; transition: width .3s ease; }
.voters { margin-top: 6px; font-size: 12px; color: var(--text-light); }
.voter-label { margin-right: 4px; }
.voter-name { background: #F5EFE6; padding: 2px 8px; border-radius: 999px; margin-right: 4px; }
.pending-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 16px; font-size: 13px; color: var(--text-light); }
.pending-name { background: #F5EFE6; padding: 2px 8px; border-radius: 999px; }
.pending-label { font-weight: 500; }
</style>
