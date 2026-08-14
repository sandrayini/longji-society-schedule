<template>
  <div>
    <div class="form-group">
      <label class="form-label">添加方式</label>
      <div class="mode-toggle">
        <button class="btn btn-sm" :class="mode==='free' ? 'btn-primary':'btn-secondary'" @click="mode='free'">有空时间段</button>
        <button class="btn btn-sm" :class="mode==='busy' ? 'btn-primary':'btn-secondary'" @click="mode='busy'">没空时间段</button>
      </div>
    </div>

    <div class="intervals">
      <div v-for="(iv, idx) in intervals" :key="idx" class="interval-row">
        <input type="datetime-local" v-model="iv.start" class="input" />
        <span>至</span>
        <input type="datetime-local" v-model="iv.end" class="input" />
        <button class="btn btn-sm btn-danger" @click="intervals.splice(idx,1)">删除</button>
      </div>
      <button class="btn btn-sm btn-secondary" @click="addInterval">+ 添加时间段</button>
    </div>

    <div class="form-group"><label class="form-label">备注</label><input v-model="note" class="input" placeholder="如：下午要开会" /></div>

    <div v-if="mySubmission" class="submitted-label">已提交（截止前可修改）</div>
    <button class="btn btn-primary" style="width:100%" @click="submit" :disabled="loading">
      {{ mySubmission ? '更新提交' : '提交' }}
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import api from '../api.js';
import { useToast } from '../composables.js';
import { toISO, inputDatetimeLocal, nowLocalInput } from '../utils.js';

const props = defineProps({ activity: Object, submissions: Array });
const emit = defineEmits(['saved']);
const { show } = useToast();
const loading = ref(false);
const mode = ref('free');
const note = ref('');
const intervals = ref([]);

const mySubmission = computed(() => props.submissions.find(s => s.userId === props.activity.myUserId));

if (mySubmission.value) {
  const data = mySubmission.value.data || {};
  note.value = data.note || '';
  intervals.value = (data.freeIntervals || []).map(iv => ({ start: inputDatetimeLocal(iv.start), end: inputDatetimeLocal(iv.end) }));
  if (!intervals.value.length && (data.busyIntervals || []).length) {
    mode.value = 'busy';
    intervals.value = (data.busyIntervals || []).map(iv => ({ start: inputDatetimeLocal(iv.start), end: inputDatetimeLocal(iv.end) }));
  }
}
if (intervals.value.length === 0) addInterval();

function addInterval() {
  intervals.value.push({ start: inputDatetimeLocal(props.activity.rangeStart), end: inputDatetimeLocal(props.activity.rangeEnd) });
}

async function submit() {
  const free = intervals.value
    .filter(iv => iv.start && iv.end)
    .map(iv => ({ start: toISO(iv.start), end: toISO(iv.end) }))
    .filter(iv => iv.start && iv.end && new Date(iv.start) < new Date(iv.end));
  const payload = {
    type: 'tentative',
    note: note.value,
    data: mode.value === 'free' ? { freeIntervals: free, busyIntervals: [] } : { freeIntervals: [], busyIntervals: free }
  };
  loading.value = true;
  try {
    await api.post(`/activities/${props.activity.id}/submit`, payload);
    show('提交成功', 'success');
    emit('saved');
  } catch (e) {
    show(e.response?.data?.error || '提交失败', 'error');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.mode-toggle { display: flex; gap: 8px; }
.intervals { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
.interval-row { display: flex; align-items: center; gap: 6px; }
.interval-row .input { flex: 1; font-size: 13px; padding: 8px; }
.submitted-label { text-align: center; color: #7BAE7F; font-size: 13px; margin-bottom: 10px; }
</style>
