<template>
  <div>
    <div v-if="activity.type==='fixed'" class="stats">
      <div class="stat yes"><span class="num">{{ going }}</span>参加</div>
      <div class="stat no"><span class="num">{{ notGoing }}</span>不参加</div>
      <div class="stat pending"><span class="num">{{ notReplied }}</span>未回复</div>
    </div>

    <div v-if="notSubmitted.length" class="pending-list">
      <span class="pending-label">未提交：</span>
      <span v-for="m in notSubmitted" :key="m.id" class="pending-name">{{ m.name }}</span>
    </div>

    <div v-if="submissions.length===0" class="empty">暂无提交</div>
    <div v-for="s in submissions" :key="s.id" class="submission-row">
      <div class="badge" :style="{background: colorOf(s.userId)}">{{ initial(s.name) }}</div>
      <div class="info">
        <div class="name">{{ s.name }} <span class="time">{{ formatTime(s.updatedAt) }}</span></div>
        <div v-if="activity.type==='tentative'" class="detail">
          <div v-if="s.data.freeIntervals?.length">
            <span style="color:#7BAE7F">有空</span>：
            <span v-for="iv in s.data.freeIntervals" :key="iv.start">{{ formatTime(iv.start) }}-{{ formatTime(iv.end) }} </span>
          </div>
          <div v-if="s.data.busyIntervals?.length">
            <span style="color:#EFA8B8">没空</span>：
            <span v-for="iv in s.data.busyIntervals" :key="iv.start">{{ formatTime(iv.start) }}-{{ formatTime(iv.end) }} </span>
          </div>
          <div v-if="s.data.note" class="note">备注：{{ s.data.note }}</div>
        </div>
        <div v-else class="detail">
          <span :style="{color: s.data.attending ? '#7BAE7F':'#EFA8B8'}">{{ s.data.attending ? '参加':'不参加' }}</span>
          <span v-if="s.data.note" class="note">备注：{{ s.data.note }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { colorOf, initial, formatTime } from '../utils.js';

const props = defineProps({ activity: Object, submissions: Array });

const submittedIds = computed(() => props.submissions.map(s => s.userId));
const notSubmitted = computed(() => {
  const all = props.activity.allMembers || [];
  return all.filter(m => !submittedIds.value.includes(m.id) && m.role === 'member');
});

const going = computed(() => props.submissions.filter(s => s.data?.attending).length);
const notGoing = computed(() => props.submissions.filter(s => s.data && !s.data.attending).length);
const notReplied = computed(() => notSubmitted.value.length);

props.submissions.forEach(s => { if (typeof s.data === 'string') s.data = JSON.parse(s.data || '{}'); });
</script>

<style scoped>
.stats { display: flex; justify-content: space-around; margin-bottom: 16px; }
.stat { display: flex; flex-direction: column; align-items: center; font-size: 13px; color: var(--text-light); }
.num { font-size: 22px; font-weight: 700; color: var(--text); }
.stat.yes .num { color: #7BAE7F; }
.stat.no .num { color: #EFA8B8; }
.stat.pending .num { color: #9C8570; }
.pending-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; font-size: 13px; color: var(--text-light); }
.pending-name { background: #F5EFE6; padding: 2px 8px; border-radius: 999px; }
.pending-label { font-weight: 500; }
.submission-row { display: flex; gap: 10px; padding: 10px 0; border-bottom: 1px solid #F5EFE6; }
.info { flex: 1; }
.name { font-weight: 500; font-size: 14px; margin-bottom: 4px; }
.time { font-size: 11px; color: #b8a99a; font-weight: normal; margin-left: 6px; }
.detail { font-size: 13px; color: var(--text-light); line-height: 1.5; }
.note { margin-top: 4px; color: #9C8570; }
</style>
